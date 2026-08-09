/**
 * validation.ts
 *
 * Small, generic field-level validators shared across research agents.
 * Distinct from source-validation.ts, which is specifically about source
 * attribution (URLs/domains/citations) — this is for validating extracted
 * field values on their own terms.
 */

/**
 * True if `value` is a string in YYYY-MM-DD format that represents a
 * calendar-valid date (e.g. "2019-13-45" is rejected even though it
 * matches the pattern). Used to filter out unparseable or fabricated
 * dates from GPT responses before they reach the database.
 */
export function isValidDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value);
  return !isNaN(d.getTime());
}
