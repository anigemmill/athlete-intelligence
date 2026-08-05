/**
 * Typed access helpers for the `agent_runs` table (lib/db/src/schema/agent-runs.ts).
 *
 * Nothing in Milestone 0 calls these — the orchestrator introduced in
 * Milestone 2 is the first writer, and the per-agent cadence checks
 * (docs/task-27-agentic-pipeline.md §3.5) introduced in Milestone 10 are the
 * first reader. Defining them now, ahead of any caller, means Milestone 2
 * only has to wire the orchestrator up to an already-tested interface
 * instead of designing the data-access layer at the same time.
 */

import { db } from "@workspace/db";
import { agentRunsTable, type AgentRun, type InsertAgentRun } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";

export async function recordAgentRun(run: InsertAgentRun): Promise<void> {
  await db.insert(agentRunsTable).values(run);
}

/**
 * Most recent successful ("ok") run of `agent` for `athleteId`, or null if
 * it has never succeeded. Used by the differential refresh cadence
 * mechanism (§3.5) to decide whether a low-frequency agent (biography,
 * photo) is due to run again.
 */
export async function getLastSuccessfulRun(
  athleteId: number,
  agent: string,
): Promise<AgentRun | null> {
  const [row] = await db
    .select()
    .from(agentRunsTable)
    .where(and(eq(agentRunsTable.athleteId, athleteId), eq(agentRunsTable.agent, agent), eq(agentRunsTable.status, "ok")))
    .orderBy(desc(agentRunsTable.ranAt))
    .limit(1);

  return row ?? null;
}
