/**
 * Shared contracts for the agentic pipeline (Task #27).
 *
 * Nothing in Milestone 0 constructs or consumes these outside of tests —
 * they exist so the confidence/validation engines in this milestone, and
 * every agent introduced from Milestone 2 onward, share one vocabulary
 * instead of each inventing its own shape.
 *
 * See docs/task-27-agentic-pipeline.md §5 (Evidence Layer) and §3.2 (the
 * orchestrator's five-phase flow) for the design this mirrors.
 */

/** One agent's status for a single invocation. "empty" (ran cleanly, found
 * nothing) and "error" (could not complete) are distinct outcomes and must
 * never be conflated — an empty ContactsAgent result is a known gap; an
 * errored one is an operational issue to retry and monitor. */
export type AgentStatus = "ok" | "empty" | "error";

/** Why an agent failed, used to decide whether a retry is warranted
 * (docs/task-27-agentic-pipeline.md §9). "no_data" is not a failure at all —
 * it should be represented as AgentStatus "empty", not this classification. */
export type ErrorClassification = "transient" | "malformed_output";

/**
 * The atomic unit of anything the pipeline is willing to store. Every fact
 * written to the database — a table row or a scalar column on `athletes` —
 * must be traceable back to one of these before it reaches Phase 4
 * (persistence). See docs/task-27-agentic-pipeline.md §5.
 */
export interface EvidenceRecord {
  /** What this record asserts, e.g. "personalBest", "worldRank", or a table
   * name for record-shaped facts like a single competition. */
  claim: string;
  value: unknown;
  /** Which agent produced this record. */
  agent: string;
  sourceDomain: string | null;
  sourceUrl: string | null;
  /** When the agent fetched this. */
  retrievedAt: Date;
  /** When the underlying fact/article was published, if known. */
  publishedAt: Date | null;
  /** The specific sentence/passage the claim is drawn from, if the source
   * model returned quotable text. Mandatory wherever available — it is the
   * cheapest, most effective tool for a human reviewer to spot-check a
   * stored fact. */
  rawExcerpt: string | null;
  /** The agent's own pre-adjustment confidence (0-100), before the
   * centralised confidence engine in confidence.ts is applied. */
  confidenceBase: number;
}

/** What one agent invocation returns to the orchestrator, regardless of
 * outcome. Dispatched via Promise.allSettled so one agent throwing never
 * cancels the others (docs/task-27-agentic-pipeline.md §3.2). */
export interface AgentResult {
  agent: string;
  status: AgentStatus;
  /** Candidate facts this agent found. Empty array is a valid, expected
   * value when status is "empty" — it is not an error state. */
  facts: EvidenceRecord[];
  meta: {
    latencyMs: number;
    tokensUsed?: number;
    retries: number;
    model?: string;
  };
  /** Present only when status is "error". */
  error?: {
    classification: ErrorClassification;
    message: string;
  };
}

/** The input every agent receives. Intentionally minimal in Milestone 0 —
 * no agent implementation exists yet, so this only needs to describe the
 * athlete stub already used by discoverAthleteProfile/autoPopulateAthlete
 * in artifacts/api-server/src/lib/auto-populate.ts, so that porting those
 * call sites onto this contract later (Milestone 2+) is a straight fit. */
export interface AgentContext {
  athleteId: number;
  name: string;
  sport: string;
  event: string;
  nationality: string;
  age?: number | null;
}
