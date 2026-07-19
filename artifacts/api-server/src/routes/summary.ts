/**
 * summary.ts
 *
 * POST /api/athletes/:id/summary
 *   Generates a structured AI narrative for an athlete using all available data.
 *   Streams the response via SSE and caches the result in the athletes table.
 *
 * GET /api/athletes/:id/summary
 *   Returns the cached summary (null if not yet generated).
 */

import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  athletesTable,
  intelligenceItemsTable,
  timelineEventsTable,
  contactsTable,
  competitionsTable,
} from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

// GET /api/athletes/:id/summary
router.get("/athletes/:id/summary", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid athlete ID" }); return; }

  const [athlete] = await db.select().from(athletesTable).where(eq(athletesTable.id, id));
  if (!athlete) { res.status(404).json({ error: "Athlete not found" }); return; }

  res.json({
    summary: athlete.aiSummary ?? null,
    generatedAt: athlete.aiSummaryGeneratedAt?.toISOString() ?? null,
  });
});

// POST /api/athletes/:id/summary  — generates and streams, then caches
router.post("/athletes/:id/summary", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid athlete ID" }); return; }

  // Load all athlete data in parallel
  const [athleteRows, intelRows, timelineRows, contactRows, compRows] = await Promise.all([
    db.select().from(athletesTable).where(eq(athletesTable.id, id)),
    db.select().from(intelligenceItemsTable).where(eq(intelligenceItemsTable.athleteId, id)),
    db.select().from(timelineEventsTable).where(eq(timelineEventsTable.athleteId, id)),
    db.select().from(contactsTable).where(eq(contactsTable.athleteId, id)),
    db.select().from(competitionsTable).where(eq(competitionsTable.athleteId, id)),
  ]);

  const athlete = athleteRows[0];
  if (!athlete) { res.status(404).json({ error: "Athlete not found" }); return; }

  const completedComps = compRows.filter((c) => c.status === "completed");
  const upcomingComps = compRows.filter((c) => c.status === "upcoming");
  const wins = completedComps.filter((c) => /^(1st|gold|win)/i.test(c.result ?? "")).length;
  const podiums = completedComps.filter((c) => /^(1st|2nd|3rd|gold|silver|bronze)/i.test(c.result ?? "")).length;

  const prompt = `You are an expert sports analyst writing an intelligence briefing for a professional sports organisation.

Write a comprehensive intelligence summary for the following athlete. Structure it in four clear sections with markdown headers. Be specific, data-driven, and professional. Use the actual data provided.

ATHLETE PROFILE:
- Name: ${athlete.name}
- Sport: ${athlete.sport} | Event: ${athlete.event}
- Nationality: ${athlete.nationality}${athlete.age ? ` | Age: ${athlete.age}` : ""}
- World Rank: ${athlete.worldRank ? `#${athlete.worldRank}` : "Not ranked"}${athlete.worldRankDelta ? ` (${athlete.worldRankDelta > 0 ? "▲" : "▼"}${Math.abs(athlete.worldRankDelta)} places)` : ""}
- Personal Best: ${athlete.personalBest ?? "Not recorded"}
- Season Best: ${athlete.seasonBest ?? "Not recorded"}
- National Rank: ${athlete.nationalRank ? `#${athlete.nationalRank}` : "Not ranked"}

COMPETITION RECORD (${completedComps.length} completed, ${upcomingComps.length} upcoming):
- Wins: ${wins} | Podiums: ${podiums}
${completedComps.slice(0, 8).map((c) => `  • ${c.date} — ${c.meetName} (${c.event}): ${c.result ?? "DNS"}`).join("\n")}
${upcomingComps.slice(0, 4).map((c) => `  • UPCOMING: ${c.date} — ${c.meetName} (${c.event})`).join("\n")}

KEY CONTACTS (${contactRows.length} total):
${contactRows.slice(0, 6).map((c) => `  • ${c.name} — ${c.role} at ${c.org} [${c.category}]`).join("\n")}

INTELLIGENCE ITEMS (${intelRows.length} total):
${intelRows.slice(0, 10).map((i) => `  • [${i.category}] ${i.title} — ${i.summary?.slice(0, 120) ?? ""} (Source: ${i.sourceDomain}, ${i.confidence}% confidence)`).join("\n")}

CAREER TIMELINE HIGHLIGHTS:
${timelineRows.filter((t) => t.significant).slice(0, 6).map((t) => `  • ${t.date}: ${t.title}`).join("\n")}

Write the four-section briefing now:

## Career Overview
[2-3 paragraphs on career arc, background, key achievements, trajectory]

## Current Form & Rankings
[1-2 paragraphs on current ranking, recent results, season performance, upcoming competitions]

## Key Relationships & Network
[1-2 paragraphs on coaching team, management, sponsors, institutional affiliations]

## Intelligence Assessment
[1-2 paragraphs synthesising all intel — notable trends, risks, opportunities, confidence in data quality]`;

  // SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-5.6-luna",
      messages: [{ role: "user", content: prompt }],
      stream: true,
      max_completion_tokens: 3000,
    });

    let full = "";
    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content ?? "";
      if (token) {
        full += token;
        send({ token });
      }
    }

    // Cache in DB
    await db
      .update(athletesTable)
      .set({ aiSummary: full, aiSummaryGeneratedAt: new Date() })
      .where(eq(athletesTable.id, id));

    send({ done: true });
    res.end();
  } catch (err: any) {
    logger.error({ err }, "Summary generation error");
    send({ error: "Summary generation failed" });
    res.end();
  }
});

export default router;
