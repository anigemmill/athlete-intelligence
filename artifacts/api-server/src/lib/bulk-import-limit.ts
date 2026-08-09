/**
 * bulk-import-limit.ts
 *
 * Caps how many athletes a single POST /athletes/bulk request can import.
 * Per the MVP pilot readiness checklist's one remaining AI/API-cost gap:
 * rate limiting (aiRateLimit.ts) caps how *often* the endpoint can be
 * hit, but not how large a single request can be -- each row in a bulk
 * import fires the full 8-agent pipeline, so an unbounded array is an
 * unbounded cost multiplier per request. Kept as a tiny pure function,
 * same pattern as isGenericMeetName()/deriveCompetitionStatus(): cheap
 * to test in isolation, no DB or AI call involved in the check itself.
 */

/** Private-pilot ceiling, not a theoretical maximum -- see docs/mvp-pilot-readiness-checklist-2026-08-09.md. */
export const MAX_BULK_ATHLETES = 10;

export function exceedsBulkImportLimit(count: number): boolean {
  return count > MAX_BULK_ATHLETES;
}
