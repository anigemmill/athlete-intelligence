/**
 * Per-domain specialised-agent registry
 * (docs/task-27-milestones-3-6-shared-architecture-review.md §1.1, §1.5).
 *
 * The orchestrator's fan-out (orchestrator.ts's runFanOut) iterates this
 * array generically: any entry whose flagName is in PIPELINE_AGENTS runs
 * instead of the legacy monolith for that domain; anything not yet listed
 * here is untouched and keeps flowing through the monolith exactly as
 * today. Milestones 4-6 each add exactly one entry here — no further edits
 * to orchestrator.ts itself are needed to wire a new specialised agent in.
 */

import { runResultsAgent } from "./resultsAgent.js";
import type { DomainOwnership } from "../agentOwnership.js";
import type { AgentContext, AgentResult } from "../types.js";

export interface RegisteredAgent extends DomainOwnership {
  run: (context: AgentContext) => Promise<AgentResult>;
}

export const REGISTERED_AGENTS: RegisteredAgent[] = [
  {
    flagName: "results",
    legacySkipKey: "results",
    ownedColumns: [
      "athletes.world_rank",
      "athletes.world_rank_delta",
      "athletes.national_rank",
      "athletes.personal_best",
      "athletes.season_best",
    ],
    run: runResultsAgent,
  },
  // Milestone 4 adds a "competitions" entry (ownedColumns: ["competitions"]).
  // Milestone 5 adds a "contacts" entry (ownedColumns: ["contacts"]).
  // Milestone 6 adds an "intelligence" entry (ownedColumns: ["intelligence_items"]).
];
