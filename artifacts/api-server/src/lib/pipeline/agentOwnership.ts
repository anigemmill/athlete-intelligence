/**
 * Per-domain agent ownership (docs/task-27-milestones-3-6-shared-architecture-review.md §1.1, §1.5).
 *
 * Deliberately DB-free — following the same pattern as fanOutReconciliation.ts
 * (split out from orchestrator.ts for exactly this reason) — so the overlap
 * assertion below is unit-testable without DATABASE_URL, and so
 * `pipeline/agents/registry.ts` (which does import DB-touching agent files)
 * can depend on this module's types without pulling anything DB-related in.
 *
 * `legacySkipKey` matches the shape of the `skip` object accepted by
 * `autoPopulateAthlete` (auto-populate.ts) and threaded through
 * `runLegacyMonolithAgent` — see LegacyMonolithSkip below.
 */

/**
 * The write-domains `auto-populate.ts`'s five sequential blocks can be told
 * to skip. "results" only ever omits the five columns a `results`-flagged
 * agent owns from the stats block's update — it does not skip that whole
 * block, because the block also writes social handles/avatarUrl/
 * lastCrawledAt, which no agent claims until Milestones 9-10. The other
 * three keys gate their whole (single-purpose) block.
 */
export type LegacyWriteDomain = "results" | "competitions" | "contacts" | "intelligence";

export type LegacyMonolithSkip = Partial<Record<LegacyWriteDomain, boolean>>;

export interface DomainOwnership {
  /** Matches a PIPELINE_AGENTS entry, e.g. "results". */
  flagName: string;
  legacySkipKey: LegacyWriteDomain;
  /** "table.column" for scalar-column owners, or just "table" for a whole-table owner. Used only for the overlap assertion and for documentation — not read at runtime by anything else. */
  ownedColumns: string[];
}

/**
 * Throws if two registered domains claim the same column/table. Called once
 * at orchestrator module load against the live REGISTERED_AGENTS array
 * (pipeline/agents/registry.ts) — a misconfigured registry entry fails
 * immediately and loudly, rather than silently double-writing a column at
 * runtime depending on Promise.allSettled ordering.
 */
export function assertNoOwnershipOverlap(entries: DomainOwnership[]): void {
  const owners = new Map<string, string>();
  for (const entry of entries) {
    for (const column of entry.ownedColumns) {
      const existingOwner = owners.get(column);
      if (existingOwner && existingOwner !== entry.flagName) {
        throw new Error(
          `agentOwnership: "${column}" is claimed by both "${existingOwner}" and "${entry.flagName}" — two agents must never own the same column/table.`,
        );
      }
      owners.set(column, entry.flagName);
    }
  }
}
