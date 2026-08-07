/**
 * IdentityAgent (docs/task-27-agentic-pipeline.md §4.0, §2's Agent #0).
 *
 * Wraps discoverAthleteProfile() — the identity-resolution logic itself is
 * unchanged and stays in auto-populate.ts (Milestone 2 does not touch it).
 * What's new here is treating it as a first-class agent with a typed
 * status, instead of being a bespoke pre-check the route handler ran
 * directly.
 *
 * IdentityAgent is the one agent that answers from model knowledge without
 * a live search (§4.0) — its job is disambiguation ("which Peter Bol"),
 * not fact retrieval — and the one agent that runs before any athlete row
 * exists, so it does not fit the AgentContext/AgentResult shape the other
 * ten retrieval agents will use (Milestones 3+): there is no athleteId yet,
 * and "confidence in an identity match" isn't an EvidenceRecord in the same
 * sense a fact is. This is intentional, not an oversight — see §2 of the
 * architecture spec for why Identity gets special treatment.
 *
 * NOTE on agent_runs: this agent deliberately does NOT write its own
 * agent_runs row. `agent_runs.athlete_id` is NOT NULL with a foreign key —
 * there is no valid id to attach to until an athlete row actually exists,
 * which only happens for the accepted case, and only after this function
 * returns. The orchestrator (pipeline/orchestrator.ts) records the
 * successful case itself, using the real athleteId, once the row has been
 * created. A rejected or errored identity check therefore has no agent_runs
 * row at all — it remains visible via the structured logger only. Giving
 * rejected checks a real monitoring row would require a schema change
 * (a nullable athlete_id), which is out of scope for this milestone.
 */

import { discoverAthleteProfile, DISCOVERY_CONFIDENCE_THRESHOLD } from "../../auto-populate.js";
import { logger } from "../../logger.js";
import type { AgentStatus } from "../types.js";

export interface IdentityAgentResult {
  status: AgentStatus;
  latencyMs: number;
  profile: {
    sport: string | null;
    event: string | null;
    nationality: string | null;
    age: number | null;
    confidence: number;
    ambiguous: boolean;
    reason: string;
  };
}

/**
 * Resolves `name` to a sport/event/nationality/age guess and a confidence
 * score. Does not write to the database — the orchestrator decides what to
 * do with the result (create the athlete row, or reject).
 */
export async function runIdentityAgent(name: string): Promise<IdentityAgentResult> {
  const start = Date.now();

  try {
    const profile = await discoverAthleteProfile(name);
    const latencyMs = Date.now() - start;

    // Sub-threshold confidence, or missing sport/nationality, is a clean
    // "could not identify" outcome — not a failure. The research pipeline
    // needs both fields to produce a meaningful query, so either missing
    // is treated the same as low confidence (matches the existing 422 gate).
    const status: AgentStatus =
      profile.confidence >= DISCOVERY_CONFIDENCE_THRESHOLD && profile.sport && profile.nationality
        ? "ok"
        : "empty";

    return { status, latencyMs, profile };
  } catch (err) {
    const latencyMs = Date.now() - start;
    logger.error({ err, name }, "identityAgent: discoverAthleteProfile threw");

    return {
      status: "error",
      latencyMs,
      profile: { sport: null, event: null, nationality: null, age: null, confidence: 0, ambiguous: true, reason: "Identity resolution failed." },
    };
  }
}
