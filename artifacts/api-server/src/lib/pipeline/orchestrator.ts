/**
 * Orchestrator (docs/task-27-agentic-pipeline.md §3, Milestone 2).
 *
 * Two entry points, matching §3.1:
 *   - onCreate(name)     — blocking IdentityAgent gate, then creates the
 *                          athlete row on success and fires Phase 1 in
 *                          the background.
 *   - onRefresh(athleteId) — skips IdentityAgent entirely (identity is not
 *                          re-resolved on every refresh); runs Phase 1
 *                          against the athlete's already-stored fields.
 *
 * Milestone 2 exercises the full five-phase envelope from §3.2 — Identity,
 * Fan-out, Cross-validation, Confidence, Persistence, Post-write — but
 * Phases 2-4 (cross-validation, confidence adjustment, persistence) are
 * currently no-ops in substance: with `PIPELINE_AGENTS` unset, Phase 1
 * fans out to exactly one agent (LegacyMonolithAgent), which already does
 * its own persistence internally via autoPopulateAthlete. There is nothing
 * to cross-validate against with only one agent, and Milestone 1 already
 * wired real confidence adjustment into that agent's write path. Phases 2-4
 * become real once Milestone 3+ adds a second concurrent agent.
 */

import { db } from "@workspace/db";
import { athletesTable, alertConfigsTable, type Athlete } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../logger.js";
import { recordAgentRun } from "./agentRuns.js";
import { runIdentityAgent } from "./agents/identityAgent.js";
import { runLegacyMonolithAgent } from "./agents/legacyMonolithAgent.js";
import { REGISTERED_AGENTS } from "./agents/registry.js";
import { assertNoOwnershipOverlap, type LegacyMonolithSkip } from "./agentOwnership.js";
import { reconcileFanOutResults } from "./fanOutReconciliation.js";
import type { AgentContext, AgentResult } from "./types.js";

export { reconcileFanOutResults };

// Fails fast at module load if two registry entries ever claim the same
// column/table (docs/task-27-milestones-3-6-shared-architecture-review.md
// §1.5) — a misconfigured registry is a startup error, not a runtime race.
assertNoOwnershipOverlap(REGISTERED_AGENTS);

/**
 * Comma-separated agent names, e.g. "results,competitions". Unset (or
 * empty) in every environment as of Milestone 3 — the "results" entry now
 * exists in REGISTERED_AGENTS, but no environment has opted into it yet, so
 * Phase 1 still falls back to LegacyMonolithAgent for every domain until an
 * operator adds a flag.
 */
function getEnabledAgentNames(): Set<string> {
  return new Set(
    (process.env.PIPELINE_AGENTS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

/**
 * Phase 1: fan-out. Always Promise.allSettled, never Promise.all — one
 * agent throwing must never cancel the others (§3.2).
 *
 * Generalised in Milestone 3
 * (docs/task-27-milestones-3-6-shared-architecture-review.md §1.1): any
 * REGISTERED_AGENTS entry whose flag is enabled runs instead of the legacy
 * monolith for that domain; the monolith always still runs, told (via
 * `skip`) which domains it should no longer touch. Milestones 4-6 add one
 * array entry each in registry.ts — this function does not change again.
 */
async function runFanOut(context: AgentContext): Promise<AgentResult[]> {
  const enabled = getEnabledAgentNames();
  const activeSpecialised = REGISTERED_AGENTS.filter((a) => enabled.has(a.flagName));

  const skip: LegacyMonolithSkip = {};
  for (const a of activeSpecialised) skip[a.legacySkipKey] = true;

  const agentNames = [...activeSpecialised.map((a) => a.flagName), "legacy_monolith"];
  const settled = await Promise.allSettled([
    ...activeSpecialised.map((a) => a.run(context)),
    runLegacyMonolithAgent(context, skip),
  ]);
  return reconcileFanOutResults(agentNames, settled, context.athleteId);
}

export type OnCreateResult =
  | { accepted: true; athlete: Athlete }
  | { accepted: false; confidence: number; ambiguous: boolean; reason: string };

/**
 * Phase 0 (blocking) through Phase 1 (background) for a brand-new athlete.
 * Resolves as soon as the accept/reject decision is made and (on accept)
 * the row exists — Phase 1's fan-out continues in the background, exactly
 * matching today's "the response doesn't wait for population" behaviour.
 */
export async function onCreate(name: string): Promise<OnCreateResult> {
  const identity = await runIdentityAgent(name);

  if (identity.status !== "ok") {
    return {
      accepted: false,
      confidence: identity.profile.confidence,
      ambiguous: identity.profile.ambiguous,
      reason: identity.profile.reason,
    };
  }

  // identity.status === "ok" guarantees sport and nationality are non-null
  // (see identityAgent.ts's status classification) — the assertions below
  // make that explicit to TypeScript, mirroring the pre-Milestone-2 route.
  const sport = identity.profile.sport!;
  const nationality = identity.profile.nationality!;
  const event = identity.profile.event ?? "";
  const age = identity.profile.age;

  const [athlete] = await db
    .insert(athletesTable)
    .values({ name, sport, event, nationality, age, squad: "", agentStatus: "active" })
    .returning();

  await db.insert(alertConfigsTable).values({ athleteId: athlete.id }).onConflictDoNothing();

  // Now that a real athleteId exists, record IdentityAgent's successful
  // run — see identityAgent.ts's header for why this couldn't happen
  // inside that agent itself.
  await recordAgentRun({ athleteId: athlete.id, agent: "identity", status: "ok", latencyMs: identity.latencyMs, retries: 0 }).catch((err) =>
    logger.warn({ err, athleteId: athlete.id }, "orchestrator: failed to record identity agent_runs row (non-fatal)"),
  );

  // Phase 1 fires in the background — callers get the created row immediately.
  runFanOut({ athleteId: athlete.id, name: athlete.name, sport, event, nationality, age }).catch((err) =>
    logger.error({ err, athleteId: athlete.id }, "orchestrator: onCreate fan-out failed"),
  );

  return { accepted: true, athlete };
}

/**
 * Phase 1 for an athlete that already exists. Identity is not re-resolved
 * (§3.1) — callers are responsible for having already wiped/reset the
 * athlete's existing data first (see auto-populate.ts's
 * wipeAndResetAthlete, shared by repopulateAthlete and
 * repopulateAthleteAwaited) before calling this.
 *
 * Resolves once Phase 1 has genuinely finished — this is the completion
 * signal repopulateAthleteAwaited (and the Intelligence Audit feature that
 * depends on it) needs, and it never rejects, matching
 * autoPopulateAthlete's existing contract.
 */
export async function onRefresh(athleteId: number): Promise<void> {
  const [athlete] = await db.select().from(athletesTable).where(eq(athletesTable.id, athleteId));
  if (!athlete) {
    logger.error({ athleteId }, "orchestrator: onRefresh — athlete not found");
    return;
  }

  await runFanOut({
    athleteId: athlete.id,
    name: athlete.name,
    sport: athlete.sport ?? "",
    event: athlete.event ?? "",
    nationality: athlete.nationality ?? "",
    age: athlete.age,
  });
}
