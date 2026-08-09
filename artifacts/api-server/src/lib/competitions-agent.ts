/**
 * competitions-agent.ts
 *
 * CompetitionsAgent (M4) — the first specialised retrieval agent pulled out
 * of the auto-populate.ts monolith, per the Task #27 orchestrator design in
 * docs/roadmap.md ("CompetitionsAgent — career history, rejects generic
 * meet names"). Runs its own Perplexity research pass and its own GPT-4o
 * extraction pass for an athlete's competition history, and rejects
 * generic meet names ("2024 Competition") before they ever reach the
 * database — docs/technical-debt.md Priority 5 identified these as the
 * reason result-backfill's fuzzy meet-name matcher fails.
 *
 * Self-contained and side-effect-free: it does not touch the database.
 * The caller (auto-populate.ts) decides what to do with the returned rows.
 * A failure here returns [] rather than throwing — missing competition
 * history for one run is preferable to blocking everything else the
 * pipeline already fetched (same posture as researchCareerTimeline).
 */

import { openai } from "@workspace/integrations-openai-ai-server";
import { logger } from "./logger.js";
import { callPerplexity } from "./perplexity-client.js";
import { withAiConcurrencyLimit } from "./ai-concurrency.js";
import { withRetry } from "./retry.js";
import { isValidDate } from "./validation.js";
import type { AthleteStub } from "./athlete-stub.js";

export interface CompetitionRow {
  meetName: string;
  event: string;
  location: string | null;
  date: string;
  tier: "A" | "B" | "C";
  status: "upcoming" | "completed";
  result: string | null;
}

const GENERIC_MEET_WORDS = new Set([
  "competition", "competitions", "event", "events", "meet", "meeting",
  "race", "championship", "championships", "tournament", "match", "fixture",
  "round", "session", "games",
]);

/**
 * True if a meet name is too vague to be a real, identifiable competition
 * (e.g. "2024 Competition", "Competition"). Strips any 4-digit year and
 * checks whether every remaining word is generic filler. Real names ("UCI
 * Mountain Bike World Cup", "Perth Diamond League") always survive because
 * they contain at least one proper noun the generic-word set doesn't cover.
 */
export function isGenericMeetName(rawName: unknown): boolean {
  if (typeof rawName !== "string") return true;
  const name = rawName.trim();
  if (name.length < 8) return true;

  const withoutYear = name.replace(/\b(19|20)\d{2}\b/g, "").replace(/\s+/g, " ").trim();
  if (!withoutYear) return true; // was literally just a year

  const words = withoutYear.toLowerCase().split(/\s+/).filter(Boolean);
  return words.length > 0 && words.every((w) => GENERIC_MEET_WORDS.has(w));
}

async function researchCompetitionHistory(
  athlete: AthleteStub,
): Promise<{ research: string; citations: string[] }> {
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  try {
    const { research, citations } = await callPerplexity({
      label: "competitions-agent research",
      maxTokens: 4096,
      systemPrompt: `You are a sports results researcher. Find the SPECIFIC, NAMED competitions an athlete has competed in — never a generic placeholder like "2024 Competition". Today's date is ${today}. Never fabricate information.`,
      userPrompt: `List every specific, named competition ${athlete.name} (${athlete.sport} — ${athlete.event}, ${athlete.nationality}) has competed in across their career, from their earliest notable result to ${today}.

For EACH competition give: the exact, specific event name (e.g. "UCI Mountain Bike World Cup — Fort William", "Perth Diamond League", "World Athletics Indoor Championships" — never a vague label like "Competition" or "Event"), the date, the location, the tier (Olympics/World Championships/Diamond League final = top tier; continental/national championships = mid tier; domestic/club meets = lower tier), and the result (finishing position and/or time/mark, or DNF/DNS if applicable).

Include major championships, continental/national championships, and notable domestic meets. Cite your sources.`,
    });
    logger.info(
      { athleteId: athlete.id, name: athlete.name, length: research.length, citationCount: citations.length },
      "competitions-agent: research complete",
    );
    return { research, citations };
  } catch (err) {
    logger.warn(
      { err, athleteId: athlete.id, name: athlete.name },
      "competitions-agent: research failed — skipping competition history this run",
    );
    return { research: "", citations: [] };
  }
}

const SYSTEM_PROMPT = `You are a sports intelligence data engine extracting competition history. Return ONLY valid JSON — no markdown, no explanation.

Rules:
- ACCURACY FIRST: use the provided research as your primary source of truth.
- meetName MUST be the specific, real name of the competition — NEVER a generic placeholder like "Competition", "Event", "2024 Competition", or "Race". If you don't know the specific name, omit that entry entirely rather than inventing a vague one.
- Dates must be ISO-8601 strings reflecting when the competition actually occurred (or will occur, for upcoming events).
- Tier: A = World Championships / Olympics / Diamond League finals. B = continental/national championships / major invitationals. C = domestic/club/lower-tier meets.
- Status: "upcoming" for future dates, "completed" for past dates.
- For completed competitions, always include a result string when known (e.g. "2nd (1:44.81)", "DNF").`;

const USER_PROMPT = (a: AthleteStub, research: string, citations: string[]): string => {
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  return `
Athlete: ${a.name} (${a.sport} — ${a.event}, ${a.nationality})

${citations.length > 0
  ? `VERIFIED CITATION URLs (for your reference — do not invent facts beyond what these and the research below support):
${citations.map((c, i) => `${i + 1}. ${c}`).join("\n")}

`
  : ""}${research
  ? `VERIFIED COMPETITION RESEARCH:
\`\`\`
${research}
\`\`\``
  : `ABORT: No verified research is available. Return { "competitions": [] }.`}

Extract the competition history as JSON:

{
  "competitions": [
    {
      "meetName": <string — the SPECIFIC real name, never generic>,
      "event": <string>,
      "location": <string or null>,
      "date": <YYYY-MM-DD>,
      "tier": "A" | "B" | "C",
      "status": "upcoming" | "completed",
      "result": <string or null>
    }
    // As many real, specific, dated competitions as the research genuinely supports,
    // spanning the athlete's career through ${today}, chronological, oldest first.
    // Do not pad with vague or duplicate entries to hit a count.
  ]
}
`;
};

/**
 * Runs the CompetitionsAgent: dedicated research + extraction for an
 * athlete's competition history, with generic meet names and unparseable
 * dates rejected before they ever reach the caller.
 */
export async function runCompetitionsAgent(athlete: AthleteStub): Promise<CompetitionRow[]> {
  const { research, citations } = await researchCompetitionHistory(athlete);
  if (!research) return [];

  try {
    const response = await withAiConcurrencyLimit(() =>
      withRetry(
        () =>
          openai.chat.completions.create({
            model: "gpt-4o",
            max_completion_tokens: 8192,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: USER_PROMPT(athlete, research, citations) },
            ],
            response_format: { type: "json_object" },
          }),
        { label: "competitions-agent extraction" },
      ),
    );
    const raw = response.choices[0]?.message?.content;
    if (!raw) return [];

    const data = JSON.parse(raw) as { competitions?: any[] };
    const rawCompetitions = Array.isArray(data.competitions) ? data.competitions : [];

    const rows: CompetitionRow[] = [];
    let droppedGeneric = 0;
    let droppedBadDate = 0;
    for (const comp of rawCompetitions) {
      if (isGenericMeetName(comp?.meetName)) {
        droppedGeneric++;
        continue;
      }
      if (!isValidDate(comp?.date)) {
        droppedBadDate++;
        continue;
      }
      rows.push({
        meetName: String(comp.meetName).trim(),
        event: comp.event ? String(comp.event) : athlete.event,
        location: comp.location ? String(comp.location) : null,
        date: comp.date,
        tier: comp.tier === "A" || comp.tier === "B" || comp.tier === "C" ? comp.tier : "B",
        status: comp.status === "upcoming" ? "upcoming" : "completed",
        result: comp.result ? String(comp.result) : null,
      });
    }

    if (droppedGeneric > 0 || droppedBadDate > 0) {
      logger.warn(
        { athleteId: athlete.id, name: athlete.name, droppedGeneric, droppedBadDate, kept: rows.length },
        "competitions-agent: dropped invalid competition entries",
      );
    }

    return rows;
  } catch (err) {
    logger.warn(
      { err, athleteId: athlete.id, name: athlete.name },
      "competitions-agent: extraction failed — skipping competition history this run",
    );
    return [];
  }
}
