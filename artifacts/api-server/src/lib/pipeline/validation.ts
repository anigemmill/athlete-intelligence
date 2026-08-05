/**
 * Centralised validation rules (docs/task-27-agentic-pipeline.md §8).
 *
 * Every check here targets a specific, documented defect in
 * docs/technical-debt.md rather than a hypothetical one:
 *   - citation-index leak (Priority 1)  -> isCitationIndexUrl / isCitationIndexDomain
 *   - PB/SB inversion (Priority 2)      -> isSeasonBestBetterThanPersonalBest
 *   - no URL format validation (Pri. 7) -> sanitizeSourceUrl
 *   - generic meet names (Priority 5)   -> isQualityMeetName
 *
 * Nothing here is wired into a live write path yet — auto-populate.ts is
 * untouched until Milestone 1.
 *
 * NOTE on the meet-name quality gate: the architecture spec
 * (docs/task-27-agentic-pipeline.md §4.2) states the gate rejects a meet
 * name that is "under 8 characters or contains neither a 4-digit year nor a
 * recognisable named event." Taken literally, that rule does not reject its
 * own worked bad example — "2024 Competition" is 16 characters and does
 * contain a year. isQualityMeetName below additionally rejects the case
 * where, once any year token is stripped, nothing but a generic filler word
 * remains — that is what actually distinguishes "2024 Competition" (reject)
 * from "UCI Mountain Bike World Cup Round 2" (accept). This is a precision
 * fix to match the rule's documented intent, not a change to the rule's
 * purpose.
 */

// ── Citation-index leak (Priority 1) ─────────────────────────────────────────

/** Matches the exact failure mode documented for Nick Willis: source URLs
 * stored as raw citation index shorthand, e.g. "[8]". */
export function isCitationIndexUrl(value: string): boolean {
  return /^\[\d+\]$/.test(value.trim());
}

/** Matches the exact failure mode documented for Hamish Kerr: source
 * domains stored as "source4", "source6", etc., or any value with no dot
 * at all (and therefore not a real domain). */
export function isCitationIndexDomain(value: string): boolean {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return true;
  if (/^source\d+$/.test(trimmed)) return true;
  return !trimmed.includes(".");
}

// ── URL / domain sanitisation (Priority 7) ───────────────────────────────────

/** Returns a clean https(s) URL, or null if the value is missing, a
 * citation-index leak, or not a URL at all. Never throws. */
export function sanitizeSourceUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (isCitationIndexUrl(trimmed)) return null;
  if (!/^https?:\/\//i.test(trimmed)) return null;
  return trimmed;
}

/** Returns a clean, lowercased, "www."-stripped domain, or null if the
 * value is missing, "unknown", or a citation-index leak. Never throws. */
export function sanitizeSourceDomain(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.toLowerCase() === "unknown") return null;
  if (isCitationIndexDomain(trimmed)) return null;
  return trimmed.toLowerCase().replace(/^www\./, "");
}

// ── Date validation (ported unchanged from auto-populate.ts) ────────────────

/** Returns true if `value` is a string in YYYY-MM-DD format representing a
 * calendar-valid date. Identical logic to the existing isValidDate in
 * auto-populate.ts — ported here so validation.ts is the single home for
 * every validation rule, current pipeline included, once Milestone 1 wires
 * it in. */
export function isValidDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value);
  return !isNaN(d.getTime());
}

// ── PB/SB sport-aware comparator (Priority 2) ────────────────────────────────

export type MarkDirection = "lower-better" | "higher-better";

export interface ParsedMark {
  comparableValue: number;
  direction: MarkDirection;
}

/**
 * Parses a performance mark into a comparable numeric value and a
 * direction. Only formats that unambiguously declare their unit are
 * accepted — a bare number with no unit (e.g. "8.95" without "m") is
 * deliberately treated as unparseable rather than guessed, consistent with
 * the project's accuracy-first philosophy (docs/CLAUDE.md, "AI philosophy").
 *
 * Supported formats (matching the examples already used in
 * auto-populate.ts's own extraction prompt):
 *   "4:31.18", "1:43.22"   mm:ss(.ms)            -> seconds, lower-better
 *   "2:08:15"              h:mm:ss(.ms)          -> seconds, lower-better
 *   "9.87s"                bare seconds          -> seconds, lower-better
 *   "8.95m"                metres                -> metres, higher-better
 *   "148kg", "148kg snatch" kilograms            -> kg, higher-better
 */
export function parseMark(raw: string): ParsedMark | null {
  const value = raw.trim();

  const timeColonMatch = value.match(/^(\d+):([0-5]?\d)(?::([0-5]?\d))?(?:\.(\d+))?$/);
  if (timeColonMatch) {
    const [, a, b, c, frac] = timeColonMatch;
    let totalSeconds: number;
    if (c !== undefined) {
      totalSeconds = Number(a) * 3600 + Number(b) * 60 + Number(c);
    } else {
      totalSeconds = Number(a) * 60 + Number(b);
    }
    if (frac) totalSeconds += Number(`0.${frac}`);
    return { comparableValue: totalSeconds, direction: "lower-better" };
  }

  const bareSecondsMatch = value.match(/^(\d+(?:\.\d+)?)\s*s$/i);
  if (bareSecondsMatch) {
    return { comparableValue: Number(bareSecondsMatch[1]), direction: "lower-better" };
  }

  const distanceMatch = value.match(/^(\d+(?:\.\d+)?)\s*m$/i);
  if (distanceMatch) {
    return { comparableValue: Number(distanceMatch[1]), direction: "higher-better" };
  }

  const weightMatch = value.match(/^(\d+(?:\.\d+)?)\s*kg\b/i);
  if (weightMatch) {
    return { comparableValue: Number(weightMatch[1]), direction: "higher-better" };
  }

  return null;
}

/**
 * Returns true if `seasonBest` is logically superior to `personalBest`
 * (impossible — a personal best is, by definition, the best mark ever
 * recorded). Returns null if either value can't be parsed, or the two
 * parse to incompatible directions, since a value that can't be safely
 * compared must never be treated as if it were invalid.
 *
 * This is the exact fix for docs/technical-debt.md Priority 2 — Peter Bol's
 * personal_best "1:45.14" vs season_best "1:43.64" (1.5s faster) is the
 * canonical example this function must catch.
 */
export function isSeasonBestBetterThanPersonalBest(
  personalBest: string,
  seasonBest: string,
): boolean | null {
  const pb = parseMark(personalBest);
  const sb = parseMark(seasonBest);
  if (!pb || !sb) return null;
  if (pb.direction !== sb.direction) return null;

  return pb.direction === "lower-better"
    ? sb.comparableValue < pb.comparableValue
    : sb.comparableValue > pb.comparableValue;
}

// ── Meet-name quality gate (Priority 5) ──────────────────────────────────────

const GENERIC_MEET_NAME_ONLY = /^(the\s+)?(competition|event|meet|race|tournament|contest|match|games?)$/i;

const NAMED_EVENT_KEYWORDS = /(championships?|cup|league|series|olympics?|grand prix|invitational|trials?|finals?|open|classic|diamond|world|national|regional|round|masters)/i;

/**
 * Returns true if `meetName` is specific enough to store. Rejects the
 * documented failure mode ("2024 Competition") while accepting genuinely
 * specific names ("UCI Mountain Bike World Cup Round 2") — see the file
 * header for why this needed to be more than "has 8 characters and a year."
 */
export function isQualityMeetName(meetName: string): boolean {
  const trimmed = meetName.trim();
  if (trimmed.length < 8) return false;

  const withoutYear = trimmed.replace(/\b(19|20)\d{2}\b/g, "").replace(/\s+/g, " ").trim();
  if (withoutYear.length === 0 || GENERIC_MEET_NAME_ONLY.test(withoutYear)) return false;

  const hasYear = /\b(19|20)\d{2}\b/.test(trimmed);
  const hasNamedEventKeyword = NAMED_EVENT_KEYWORDS.test(trimmed);
  const hasMultipleSpecificWords = withoutYear.split(" ").filter(Boolean).length >= 2;

  return hasYear || hasNamedEventKeyword || hasMultipleSpecificWords;
}

// ── Social handle format (used from Milestone 9 onward) ─────────────────────

export type SocialPlatform = "instagram" | "twitter" | "tiktok";

/**
 * Returns true if `handle` matches the real username grammar for the given
 * platform. A value that doesn't match is a sentence fragment or otherwise
 * garbage, not a handle — it should be discarded, not stored.
 */
export function isValidHandle(handle: string, platform: SocialPlatform): boolean {
  const trimmed = handle.trim().replace(/^@/, "");
  if (!trimmed) return false;

  if (platform === "twitter") {
    return /^[A-Za-z0-9_]{1,15}$/.test(trimmed);
  }

  // Instagram and TikTok share the same grammar: letters, numbers,
  // underscore, period; no leading/trailing period; no consecutive periods.
  if (!/^[A-Za-z0-9_.]{1,30}$/.test(trimmed)) return false;
  if (trimmed.startsWith(".") || trimmed.endsWith(".")) return false;
  if (trimmed.includes("..")) return false;
  return true;
}
