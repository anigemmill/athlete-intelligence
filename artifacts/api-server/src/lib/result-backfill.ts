/**
 * result-backfill.ts
 *
 * Targeted pass to fill competition results for completed competitions
 * that still have result = NULL. This happens when:
 *   - A competition was stored as "upcoming" at crawl time and the date has
 *     since passed (the view-layer flips status but never writes a result)
 *   - The initial population only had partial data
 *
 * Called:
 *   - After each auto-populate cycle (for the just-refreshed athlete)
 *   - Via admin route POST /api/admin/backfill-results
 */

import { db } from "@workspace/db";
import { competitionsTable, athletesTable } from "@workspace/db";
import { eq, and, isNull, lte } from "drizzle-orm";
import { openrouter } from "@workspace/integrations-openrouter-ai";
import { openai } from "@workspace/integrations-openai-ai-server";
import { logger } from "./logger.js";

/**
 * For a given athlete, find all competitions with:
 *   - date <= today
 *   - result IS NULL
 *
 * and attempt to fill the result via a targeted Perplexity search.
 * Returns the count of results successfully filled.
 */
export async function backfillCompetitionResults(athleteId: number): Promise<number> {
  const today = new Date().toISOString().split("T")[0];

  // Fetch athlete name for the query
  const [athlete] = await db
    .select({ name: athletesTable.name, sport: athletesTable.sport, event: athletesTable.event })
    .from(athletesTable)
    .where(eq(athletesTable.id, athleteId));

  if (!athlete) return 0;

  // Find competitions that need results
  const missing = await db
    .select()
    .from(competitionsTable)
    .where(
      and(
        eq(competitionsTable.athleteId, athleteId),
        lte(competitionsTable.date, today),
        isNull(competitionsTable.result),
      ),
    )
    .orderBy(competitionsTable.date);

  if (missing.length === 0) return 0;

  // Limit to 10 at a time to avoid token overload
  const toFill = missing.slice(0, 10);

  logger.info(
    { athleteId, name: athlete.name, count: toFill.length },
    "result-backfill: fetching missing competition results",
  );

  try {
    // Build a targeted query listing the specific competitions
    const competitionList = toFill
      .map((c) => `- ${c.meetName} (${c.event}, ${c.date}, ${c.location ?? "unknown location"})`)
      .join("\n");

    const research = await openrouter.chat.completions.create({
      model: "perplexity/sonar",
      max_tokens: 2048,
      messages: [
        {
          role: "system",
          content: `You are a sports results researcher. Find exact competition results for a specific athlete. Return only factual, verified results. Today is ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.`,
        },
        {
          role: "user",
          content: `Find the exact results for ${athlete.name} (${athlete.sport} — ${athlete.event}) at the following competitions:\n\n${competitionList}\n\nFor each competition, provide the finishing position and/or time/score. Format as: "Competition Name: result" (e.g. "2025 World Championships: 2nd (1:44.81)" or "Paris Diamond League: 4th (9.98s)" or "DNF/DNS if applicable").`,
        },
      ],
    });

    const raw = research.choices[0]?.message?.content ?? "";
    if (!raw) return 0;

    // Use GPT-4o-mini to parse the results into structured JSON
    const parsed = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 1024,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Extract competition results from the research text. Return JSON with a "results" array. Each item: { "meetName": string, "result": string | null }. If a result was not found, set result to null. Do not invent results.`,
        },
        {
          role: "user",
          content: `Research:\n${raw}\n\nCompetitions to match:\n${toFill.map((c) => c.meetName).join(", ")}`,
        },
      ],
    });

    const parsedData = JSON.parse(parsed.choices[0]?.message?.content ?? "{}");
    const results: { meetName: string; result: string | null }[] = parsedData?.results ?? [];

    let filled = 0;
    for (const r of results) {
      if (!r.result || r.result === "null") continue;

      // Find the matching competition by meetName (fuzzy — normalize case)
      const match = toFill.find(
        (c) => c.meetName.toLowerCase().includes(r.meetName.toLowerCase().slice(0, 15)) ||
               r.meetName.toLowerCase().includes(c.meetName.toLowerCase().slice(0, 15)),
      );

      if (!match) continue;

      await db
        .update(competitionsTable)
        .set({ status: "completed", result: r.result })
        .where(eq(competitionsTable.id, match.id));

      filled++;
    }

    logger.info(
      { athleteId, name: athlete.name, filled, total: toFill.length },
      "result-backfill: complete",
    );
    return filled;
  } catch (err) {
    logger.warn({ err, athleteId }, "result-backfill: failed");
    return 0;
  }
}

/**
 * Flush all stale "upcoming" competitions to "completed" in the database.
 * This is a fast DB-only operation — no external API calls.
 * Use when you want to fix the view-layer inconsistency permanently.
 */
export async function flushStaleCompetitionStatuses(): Promise<number> {
  const today = new Date().toISOString().split("T")[0];

  const stale = await db
    .select({ id: competitionsTable.id })
    .from(competitionsTable)
    .where(
      and(
        eq(competitionsTable.status, "upcoming"),
        lte(competitionsTable.date, today),
      ),
    );

  if (stale.length === 0) return 0;

  await db
    .update(competitionsTable)
    .set({ status: "completed" })
    .where(
      and(
        eq(competitionsTable.status, "upcoming"),
        lte(competitionsTable.date, today),
      ),
    );

  logger.info({ count: stale.length }, "result-backfill: flushed stale competition statuses to completed");
  return stale.length;
}
