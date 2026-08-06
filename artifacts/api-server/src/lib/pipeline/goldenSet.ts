/**
 * The Golden Athlete Set (docs/task-27-success-metrics.md §2).
 *
 * This file is pulled forward from Task #27 Milestone 7's planned file list
 * (docs/task-27-implementation-roadmap.md names `pipeline/goldenSet.ts`
 * explicitly) because the Intelligence Audit admin feature needs a single
 * source of truth for "the golden set" now, ahead of Milestone 7. When
 * Milestone 7 is implemented, it should extend this file rather than
 * creating a second one — `scripts/audit-iqs.ts` already imports from here
 * instead of keeping its own copy.
 */

import { db } from "@workspace/db";
import { athletesTable } from "@workspace/db";
import { inArray } from "drizzle-orm";

export const GOLDEN_ATHLETE_NAMES = [
  "Peter Bol",
  "Zoe Hobbs",
  "Nick Willis",
  "Hamish Kerr",
  "Brook Macdonald",
];

/**
 * Resolves the golden set's names to whatever athlete IDs currently exist
 * for them in the target database. Names with no matching row are reported
 * in `missing` rather than silently dropped, since "the golden athlete
 * doesn't exist here" is itself a fact worth surfacing, not hiding.
 */
export async function resolveGoldenSetAthleteIds(): Promise<{ ids: number[]; missing: string[] }> {
  const rows = await db
    .select({ id: athletesTable.id, name: athletesTable.name })
    .from(athletesTable)
    .where(inArray(athletesTable.name, GOLDEN_ATHLETE_NAMES));

  const missing = GOLDEN_ATHLETE_NAMES.filter((n) => !rows.some((r) => r.name === n));
  return { ids: rows.map((r) => r.id), missing };
}
