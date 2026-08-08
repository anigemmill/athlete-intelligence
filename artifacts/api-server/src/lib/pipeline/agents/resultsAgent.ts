/**
 * ResultsAgent (Milestone 3, docs/task-27-milestone-3-resultsagent-proposal.md).
 *
 * Sole owner of `athletes.world_rank`, `world_rank_delta`, `national_rank`,
 * `personal_best`, `season_best`. Runs its own dedicated research +
 * extraction pass — narrower than the monolith's single do-everything call —
 * so this agent's failures, retries, and confidence are specific to results/
 * rankings rather than shared with nine unrelated topics.
 *
 * Validation and fact-building are pure and live in resultsAgentLogic.ts;
 * this file is the DB/network-touching shell around that logic, following
 * the same split used for fanOutReconciliation.ts/orchestrator.ts and
 * auditReportRunner.ts/auditReport.ts.
 */

import { openai } from "@workspace/integrations-openai-ai-server";
import { openrouter } from "@workspace/integrations-openrouter-ai";
import { db } from "@workspace/db";
import { athletesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../../logger.js";
import { recordAgentRun } from "../agentRuns.js";
import { persistAgentEvidence } from "../evidenceLog.js";
import { buildResultsFacts, RESULTS_AGENT_NAME, type CurrentAthleteStats, type RawResultsExtraction } from "./resultsAgentLogic.js";
import type { AgentContext, AgentResult } from "../types.js";

const RESEARCH_MODEL = "perplexity/sonar";
const EXTRACTION_MODEL = "gpt-4o";
const MAX_EXTRACTION_ATTEMPTS = 2; // one retry, per the proposal's malformed-output path

async function researchResults(athlete: AgentContext): Promise<{ research: string; citations: string[] }> {
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const response = await openrouter.chat.completions.create({
    model: RESEARCH_MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: "system",
        content: `You are a sports results/rankings researcher. Search the web and return accurate, current, cited information. Today's date is ${today}. Never fabricate a rank or a mark — if you cannot find one, say so.`,
      },
      {
        role: "user",
        content: `For ${athlete.name} (${athlete.sport} — ${athlete.event}, ${athlete.nationality}), find ONLY: current world ranking, current national ranking, personal best mark (with the date/meet it was set, if stated), and current season best mark. Prefer the governing body's own results/ranking system as a source. Cite your sources.`,
      },
    ],
  });
  const research = response.choices[0]?.message?.content ?? "";
  const citations: string[] = (response as any).citations ?? [];
  return { research, citations };
}

const EXTRACTION_SYSTEM_PROMPT = `You are a sports results/rankings data extractor. Return ONLY valid JSON, no markdown.

For each of worldRank, nationalRank, personalBest, seasonBest, return an object with:
- value: the rank (integer) or mark (string, e.g. "1:43.22", "9.87s", "8.95m", "148kg") — null if the research does not state it
- sourceDomain: the domain the value came from, or null
- sourceUrl: MUST be chosen from the provided citation list, or null — never invent a URL
- confidence: integer 0-100, your confidence this specific value is correct
- publishedAt: ISO-8601 date the value was current as of, if stated, else null
- rawExcerpt: the specific sentence/passage the value is drawn from, if available, else null

If the research does not mention a field at all, set its value to null. Never guess a value that is not supported by the research text.`;

function extractionUserPrompt(athlete: AgentContext, research: string, citations: string[], correction?: string): string {
  return `Athlete: ${athlete.name} (${athlete.sport} — ${athlete.event}, ${athlete.nationality})

${citations.length > 0 ? `CITATION URLs:\n${citations.map((c, i) => `${i + 1}. ${c}`).join("\n")}\n` : ""}
RESEARCH:
\`\`\`
${research || "No research available."}
\`\`\`
${correction ? `\nCORRECTION NEEDED: ${correction}\n` : ""}
Return: { "worldRank": {...}, "nationalRank": {...}, "personalBest": {...}, "seasonBest": {...} }`;
}

async function extractResultsFields(
  athlete: AgentContext,
  research: string,
  citations: string[],
  correction?: string,
): Promise<RawResultsExtraction | null> {
  const response = await openai.chat.completions.create({
    model: EXTRACTION_MODEL,
    max_completion_tokens: 1024,
    messages: [
      { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
      { role: "user", content: extractionUserPrompt(athlete, research, citations, correction) },
    ],
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) return null;

  try {
    return JSON.parse(raw) as RawResultsExtraction;
  } catch {
    return null;
  }
}

async function fetchCurrentStats(athleteId: number): Promise<CurrentAthleteStats> {
  const [row] = await db
    .select({
      worldRank: athletesTable.worldRank,
      nationalRank: athletesTable.nationalRank,
      personalBest: athletesTable.personalBest,
      seasonBest: athletesTable.seasonBest,
      lastCrawledAt: athletesTable.lastCrawledAt,
    })
    .from(athletesTable)
    .where(eq(athletesTable.id, athleteId));

  return row ?? { worldRank: null, nationalRank: null, personalBest: null, seasonBest: null, lastCrawledAt: null };
}

export async function runResultsAgent(context: AgentContext): Promise<AgentResult> {
  const start = Date.now();
  let retries = 0;

  try {
    const current = await fetchCurrentStats(context.athleteId);
    const { research, citations } = await researchResults(context);

    let extraction = await extractResultsFields(context, research, citations);
    if (!extraction) {
      retries += 1;
      extraction = await extractResultsFields(
        context,
        research,
        citations,
        "Your previous response was not valid JSON. Return ONLY the JSON object described, with unit-declared marks and a real source per field.",
      );
    }

    if (!extraction) {
      const result: AgentResult = {
        agent: RESULTS_AGENT_NAME,
        status: "error",
        facts: [],
        meta: { latencyMs: Date.now() - start, retries, model: EXTRACTION_MODEL },
        error: { classification: "malformed_output", message: "Extraction did not return parseable JSON after retry." },
      };
      await recordRun(context.athleteId, result);
      return result;
    }

    let built = buildResultsFacts(extraction, context, current, new Date());

    const invertedPair = built.droppedFields.some((d) => d.reason.includes("logically superior"));
    if (invertedPair) {
      retries += 1;
      const reExtraction = await extractResultsFields(
        context,
        research,
        citations,
        "Your previous response had a season best that was numerically better than the personal best, which is impossible — a personal best is by definition the best mark ever recorded. Look again and correct whichever field is actually wrong, or return null for both if you cannot resolve it.",
      );
      if (reExtraction) {
        built = buildResultsFacts(reExtraction, context, current, new Date());
      }
    }

    await persistAgentEvidence(context.athleteId, RESULTS_AGENT_NAME, built.facts);

    // worldRankDelta is only meaningful (and only written) alongside a fresh
    // worldRank observation this run — if this run found no new worldRank,
    // leave the column untouched rather than zeroing out a delta computed
    // by a previous run against data we haven't re-checked.
    const hasNewWorldRank = built.columnUpdates.worldRank !== undefined;
    if (Object.keys(built.columnUpdates).length > 0) {
      await db
        .update(athletesTable)
        .set({ ...built.columnUpdates, ...(hasNewWorldRank ? { worldRankDelta: built.worldRankDelta } : {}) })
        .where(eq(athletesTable.id, context.athleteId));
    }

    const status = built.facts.length > 0 ? "ok" : "empty";
    const result: AgentResult = {
      agent: RESULTS_AGENT_NAME,
      status,
      facts: built.facts,
      meta: { latencyMs: Date.now() - start, retries, model: EXTRACTION_MODEL },
    };

    if (built.droppedFields.length > 0) {
      logger.info(
        { athleteId: context.athleteId, dropped: built.droppedFields },
        "resultsAgent: one or more candidate fields dropped by validation",
      );
    }

    await recordRun(context.athleteId, result);
    return result;
  } catch (err) {
    logger.error({ err, athleteId: context.athleteId }, "resultsAgent: unhandled failure");
    const result: AgentResult = {
      agent: RESULTS_AGENT_NAME,
      status: "error",
      facts: [],
      meta: { latencyMs: Date.now() - start, retries, model: EXTRACTION_MODEL },
      error: { classification: "transient", message: String(err) },
    };
    await recordRun(context.athleteId, result);
    return result;
  }
}

async function recordRun(athleteId: number, result: AgentResult): Promise<void> {
  await recordAgentRun({
    athleteId,
    agent: result.agent,
    status: result.status,
    latencyMs: result.meta.latencyMs,
    retries: result.meta.retries,
    errorClassification: result.error?.classification ?? null,
  }).catch((err) => logger.warn({ err, athleteId }, "resultsAgent: failed to record agent_runs row (non-fatal)"));
}
