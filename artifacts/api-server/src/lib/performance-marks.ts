/**
 * performance-marks.ts
 *
 * Sport-aware parsing and cross-validation for personalBest/seasonBest.
 * GPT-4o extracts both fields independently from the same research text
 * with no guarantee they're consistent. docs/technical-debt.md Priority 2
 * specified the fix; this implements it rather than assuming a clean run
 * means the underlying gap is closed.
 */

import { logger } from "./logger.js";

type MarkKind = "time" | "distance" | "weight";

interface ParsedMark {
  value: number;
  kind: MarkKind;
}

/** True if `a` is a strictly better mark than `b` for the given kind. */
function isBetter(kind: MarkKind, a: number, b: number): boolean {
  return kind === "time" ? a < b : a > b;
}

/**
 * Parses a performance mark string into a comparable numeric value.
 * Supports the formats the extraction prompt asks GPT-4o to produce:
 * mm:ss(.xx) / h:mm:ss(.xx) times, bare seconds ("9.87s"), metres ("8.95m"),
 * and kg ("148kg snatch"). Returns null for anything else — callers should
 * treat an unparseable mark as untrustworthy rather than storing it as-is.
 */
export function parsePerformanceMark(raw: string): ParsedMark | null {
  const s = raw.trim();

  const timeMatch = s.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?(\.\d+)?$/);
  if (timeMatch) {
    const [, a, b, c, frac] = timeMatch;
    const fracVal = frac ? parseFloat(frac) : 0;
    const seconds =
      c !== undefined
        ? parseInt(a, 10) * 3600 + parseInt(b, 10) * 60 + parseInt(c, 10) + fracVal // h:mm:ss(.xx)
        : parseInt(a, 10) * 60 + parseInt(b, 10) + fracVal; // mm:ss(.xx)
    return { value: seconds, kind: "time" };
  }

  const secMatch = s.match(/^(\d+(?:\.\d+)?)\s*s$/i);
  if (secMatch) return { value: parseFloat(secMatch[1]), kind: "time" };

  const distMatch = s.match(/^(\d+(?:\.\d+)?)\s*m$/i);
  if (distMatch) return { value: parseFloat(distMatch[1]), kind: "distance" };

  const weightMatch = s.match(/^(\d+(?:\.\d+)?)\s*kg/i);
  if (weightMatch) return { value: parseFloat(weightMatch[1]), kind: "weight" };

  return null;
}

/**
 * Cross-validates a personal-best/season-best pair before it's written.
 * Nulls out either value if it doesn't parse as a real performance mark,
 * nulls both if they parse as different kinds of mark (nonsensical for one
 * athlete/event), and — if both parse as the same kind and the season best
 * is objectively better than the personal best (a logical impossibility) —
 * corrects personalBest to match seasonBest.
 */
export function crossValidatePerformanceMarks(
  personalBestRaw: string | null,
  seasonBestRaw: string | null,
  context: { athleteId: number; name: string },
): { personalBest: string | null; seasonBest: string | null } {
  let personalBest = personalBestRaw;
  let seasonBest = seasonBestRaw;

  const pb = personalBest ? parsePerformanceMark(personalBest) : null;
  const sb = seasonBest ? parsePerformanceMark(seasonBest) : null;

  if (personalBest && !pb) {
    logger.warn(
      { ...context, personalBest },
      "auto-populate: personalBest did not parse as a real mark — nulling",
    );
    personalBest = null;
  }
  if (seasonBest && !sb) {
    logger.warn(
      { ...context, seasonBest },
      "auto-populate: seasonBest did not parse as a real mark — nulling",
    );
    seasonBest = null;
  }

  if (pb && sb) {
    if (pb.kind !== sb.kind) {
      logger.warn(
        { ...context, personalBest, seasonBest, pbKind: pb.kind, sbKind: sb.kind },
        "auto-populate: personalBest and seasonBest are different kinds of mark — nulling both",
      );
      return { personalBest: null, seasonBest: null };
    }
    if (isBetter(sb.kind, sb.value, pb.value)) {
      logger.warn(
        { ...context, personalBest, seasonBest },
        "auto-populate: seasonBest is better than personalBest — correcting personalBest to match seasonBest",
      );
      personalBest = seasonBest;
    }
  }

  return { personalBest, seasonBest };
}
