/**
 * Evidence persistence (docs/task-27-agentic-pipeline.md §5.1,
 * docs/task-27-milestones-3-6-shared-architecture-review.md §1.3).
 *
 * `evidence_log` (lib/db/src/schema/evidence-log.ts) is a raw-blob-per-invocation
 * table, not a per-claim structured one — see §5.1 for why. This helper
 * serialises an agent's EvidenceRecord[] as JSON into the existing
 * `raw_extraction` text column, so every agent has exactly one place to
 * write its evidence trail through, rather than each agent inventing its
 * own serialisation. It is the *only* fact-level evidence trail for agents
 * whose owned columns/tables carry no source/confidence columns of their
 * own (ResultsAgent today; CompetitionsAgent in the future, per the shared
 * architecture review); for agents whose target rows already carry their
 * own source/confidence columns (ContactsAgent, IntelligenceAgent), this is
 * a supplementary raw trace, not the only record.
 */

import { db } from "@workspace/db";
import { evidenceLogTable } from "@workspace/db";
import { logger } from "../logger.js";
import type { EvidenceRecord } from "./types.js";

export async function persistAgentEvidence(
  athleteId: number,
  agent: string,
  facts: EvidenceRecord[],
): Promise<void> {
  if (facts.length === 0) return;

  await db
    .insert(evidenceLogTable)
    .values({
      athleteId,
      agent,
      rawExtraction: JSON.stringify(facts),
    })
    .catch((err) =>
      logger.warn({ err, athleteId, agent }, "evidenceLog: failed to persist agent evidence (non-fatal)"),
    );
}
