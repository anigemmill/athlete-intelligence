/**
 * Pure Promise.allSettled reconciliation logic for the orchestrator's Phase 1
 * fan-out, split into its own file — with zero @workspace/db dependency —
 * specifically so it's unit-testable with synthetic fake agents without
 * DATABASE_URL being set at all. orchestrator.ts imports @workspace/db at
 * its top level (for the athletes/alertConfigs/agentRuns tables), and that
 * throws at import time (not just query time) if DATABASE_URL is missing —
 * importing this logic from orchestrator.ts directly would force every
 * test of it to require a live database for no reason.
 */

import { logger } from "../logger.js";
import type { AgentResult } from "./types.js";

/**
 * Turns a Promise.allSettled array into AgentResult[], substituting a
 * synthetic status:"error" result for any agent that threw instead of
 * returning one. This is the partial-failure contract from
 * docs/task-27-agentic-pipeline.md §3.2: Phase 4/5 must proceed for the
 * agents that succeeded, regardless of how many others failed.
 */
export function reconcileFanOutResults(
  agentNames: string[],
  settled: PromiseSettledResult<AgentResult>[],
  athleteId: number,
): AgentResult[] {
  return settled.map((outcome, i): AgentResult => {
    if (outcome.status === "fulfilled") return outcome.value;

    // The agent's own wrapper is expected to catch its own errors and
    // return a status:"error" AgentResult rather than throw — this branch
    // exists as a safety net for a bug in the wrapper itself, not as the
    // expected path.
    logger.error({ err: outcome.reason, athleteId }, "orchestrator: agent threw instead of returning an AgentResult");
    return {
      agent: agentNames[i] ?? `unknown_${i}`,
      status: "error",
      facts: [],
      meta: { latencyMs: 0, retries: 0 },
      error: { classification: "transient", message: String(outcome.reason) },
    };
  });
}
