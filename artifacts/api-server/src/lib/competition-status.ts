/**
 * competition-status.ts
 *
 * Single source of truth for whether a competition is "upcoming" or
 * "completed". Per the M13 quality audit (docs/quality-audit-2026-08-09-m13-fresh-baseline.md,
 * Problem #1), the status was previously trusted from GPT-4o's own
 * extraction output with no check against the row's own date, which
 * produced real Olympic results stored/displayed as "upcoming" on 25-33%
 * of competition rows for 3 of 5 golden athletes.
 *
 * Status is deterministic from the date alone: a competition whose date
 * has passed is always "completed", regardless of what any upstream
 * source (a model, a stale DB row) claims. This is intentionally the
 * only place that comparison is implemented — every write path and read
 * path that needs an effective status calls this function rather than
 * re-deriving the same logic.
 */

/** date <= today is "completed" (matches the boundary already used by result-backfill.ts's stale-status flush). */
export function deriveCompetitionStatus(
  date: string,
  today: string = new Date().toISOString().slice(0, 10),
): "upcoming" | "completed" {
  return date <= today ? "completed" : "upcoming";
}
