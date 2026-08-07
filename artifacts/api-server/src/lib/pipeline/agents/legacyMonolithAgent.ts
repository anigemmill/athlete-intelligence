/**
 * LegacyMonolithAgent (docs/task-27-implementation-roadmap.md Milestone 2).
 *
 * Wraps autoPopulateAthlete() as an agent so the orchestrator's Phase 1
 * fan-out has something to run before any real retrieval agent exists.
 * With `PIPELINE_AGENTS` unset (every environment, as of this milestone),
 * this is the *only* agent Phase 1 ever runs — the exact same model calls,
 * prompts, and writes as before, just reached through the orchestrator
 * instead of called directly from a route handler.
 *
 * Status inference is a deliberate compromise, not an oversight:
 * autoPopulateAthlete() catches every internal failure itself and always
 * resolves (see its own try/catch) — it was never designed to report
 * success/failure to a caller, and Milestone 2 does not change that
 * (retiring/rewriting it is Milestone 10's job). So this wrapper infers
 * status from the outside, by checking whether `lastCrawledAt` was
 * genuinely stamped during this call's window:
 *   - stamped to "now" (within the call)            -> "ok"
 *   - stamped to ~6 days in the past (the extraction/DB-failure retry
 *     punt already inside autoPopulateAthlete)        -> "error"
 *   - left unchanged (the Perplexity-abort path, which
 *     deliberately writes nothing)                     -> "error"
 * This is a black-box heuristic over an unmodified function's side
 * effects, not a real return value — it will stop being necessary once
 * autoPopulateAthlete is retired (Milestone 10) or split into agents that
 * report their own status directly.
 */

import { db } from "@workspace/db";
import { athletesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { autoPopulateAthlete } from "../../auto-populate.js";
import { recordAgentRun } from "../agentRuns.js";
import { logger } from "../../logger.js";
import type { AgentContext, AgentResult } from "../types.js";

const AGENT_NAME = "legacy_monolith";

export async function runLegacyMonolithAgent(context: AgentContext): Promise<AgentResult> {
  const start = Date.now();

  await autoPopulateAthlete({
    id: context.athleteId,
    name: context.name,
    sport: context.sport,
    event: context.event,
    nationality: context.nationality,
    age: context.age,
  });

  const latencyMs = Date.now() - start;

  const [after] = await db
    .select({ lastCrawledAt: athletesTable.lastCrawledAt })
    .from(athletesTable)
    .where(eq(athletesTable.id, context.athleteId));

  const afterCrawledAtMs = after?.lastCrawledAt ? new Date(after.lastCrawledAt).getTime() : null;
  const stampedDuringThisCall = afterCrawledAtMs !== null && afterCrawledAtMs >= start;

  const status = stampedDuringThisCall ? "ok" : "error";
  const result: AgentResult = {
    agent: AGENT_NAME,
    status,
    facts: [], // autoPopulateAthlete writes directly to the DB itself — it does not surface EvidenceRecords to hand to a persistence phase
    meta: { latencyMs, retries: 0, model: "gpt-4o" },
    ...(status === "error" ? { error: { classification: "transient" as const, message: "autoPopulateAthlete did not stamp lastCrawledAt during this call — see this file's header for why that's the failure signal" } } : {}),
  };

  await recordAgentRun({
    athleteId: context.athleteId,
    agent: AGENT_NAME,
    status,
    latencyMs,
    retries: 0,
    errorClassification: status === "error" ? "transient" : null,
  }).catch((err) => logger.warn({ err, athleteId: context.athleteId }, "legacyMonolithAgent: failed to record agent_runs row (non-fatal)"));

  return result;
}
