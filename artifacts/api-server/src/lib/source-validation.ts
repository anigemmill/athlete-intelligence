/**
 * source-validation.ts
 *
 * Post-extraction guardrails against fabricated source attribution. GPT-4o
 * is instructed not to invent URLs, but instructions alone don't stop it —
 * the 2026-08-09 live pipeline verification caught GPT-4o citing
 * "example.com"/"example.org" as sourceDomain and inventing a URL outright
 * for Nick Willis. These checks run in code, after extraction, so a bad
 * model response can't bypass them the way a prompt instruction can.
 */

const RESERVED_EXAMPLE_DOMAINS = new Set([
  "example.com",
  "example.org",
  "example.net",
  "example.edu",
]);

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function normalizeForCompare(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

/** True only for a well-formed http(s) URL whose hostname isn't a reserved placeholder. */
export function isRealUrl(url: unknown): url is string {
  if (typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return false;
  const host = hostnameOf(trimmed);
  if (!host) return false;
  if (RESERVED_EXAMPLE_DOMAINS.has(host)) return false;
  if (/^source\d+$/i.test(host)) return false;
  return true;
}

/**
 * Resolves the sourceUrl/sourceDomain pair for one extracted item.
 *
 * Strict by design: a source is only kept if it is a real, well-formed URL
 * AND it exactly matches (modulo a trailing slash) one of the citation URLs
 * Perplexity actually returned. GPT's own sourceDomain claim is never
 * trusted directly — the domain is always derived from the matched
 * citation's real hostname. If there are zero real citations at all, every
 * item's source is nulled regardless of what GPT wrote, because there is
 * nothing to verify it against.
 */
export function resolveSourceAttribution(
  claimedUrl: unknown,
  citations: readonly string[],
): { sourceDomain: string; sourceUrl: string | null } {
  if (citations.length === 0) return { sourceDomain: "unknown", sourceUrl: null };

  const claimed = typeof claimedUrl === "string" ? claimedUrl.trim() : "";
  if (!claimed) return { sourceDomain: "unknown", sourceUrl: null };

  const match = citations.find((c) => normalizeForCompare(c) === normalizeForCompare(claimed));
  if (match && isRealUrl(match)) {
    return { sourceDomain: hostnameOf(match) ?? "unknown", sourceUrl: match };
  }
  return { sourceDomain: "unknown", sourceUrl: null };
}

/**
 * For rows with no URL field to cross-check (contacts) — rejects the same
 * fabricated/placeholder patterns without a citation match, since there's
 * nothing to verify a bare domain string against.
 */
export function sanitizeStandaloneDomain(rawDomain: unknown): string {
  if (typeof rawDomain !== "string") return "unknown";
  const domain = rawDomain.trim().toLowerCase().replace(/^www\./, "");
  if (!domain) return "unknown";
  if (RESERVED_EXAMPLE_DOMAINS.has(domain)) return "unknown";
  if (/^source\d+$/i.test(domain)) return "unknown";
  if (/^\[\d+\]$/.test(domain)) return "unknown";
  return domain;
}

/**
 * Cross-checks a claimed domain against real citation hostnames for rows
 * (like contacts) that have no URL field of their own to validate a
 * sourceUrl against directly. Returns the sanitized domain only if it
 * matches the hostname of one of the citations from that same research
 * call; otherwise "unknown" — the same "no citation match, no source"
 * posture as resolveSourceAttribution, adapted for domain-only evidence.
 */
export function resolveStandaloneDomain(
  claimedDomain: unknown,
  citations: readonly string[],
): string {
  const sanitized = sanitizeStandaloneDomain(claimedDomain);
  if (sanitized === "unknown" || citations.length === 0) return "unknown";

  const citationHosts = new Set(
    citations
      .map((c) => hostnameOf(c))
      .filter((h): h is string => h !== null),
  );
  return citationHosts.has(sanitized) ? sanitized : "unknown";
}

/** True if a contact has enough real identifying information to be worth storing. */
export function isUsableContact(name: unknown, org: unknown): boolean {
  const n = typeof name === "string" ? name.trim() : "";
  const o = typeof org === "string" ? org.trim() : "";
  if (!n || /^unknown$/i.test(n)) return false;
  if (!o || /^unknown$/i.test(o)) return false;
  return true;
}

// ── Domain-authority confidence adjuster ─────────────────────────────────────
// Post-processes GPT-assigned confidence scores with a domain quality modifier.
// Authoritative sports domains get a small boost; unknown/generic domains get a
// small penalty. Applied to intelligence items, timeline events, and contacts
// before they are inserted.

const HIGH_AUTHORITY_DOMAINS = new Set([
  "worldathletics.org", "olympics.com", "uci.org", "fis-ski.com", "iaaf.org",
  "worldrowing.com", "worldsailing.org", "fina.org", "worldarchery.org",
  "redbull.com", "bbc.co.uk", "bbc.com", "reuters.com", "apnews.com",
  "theguardian.com", "espn.com", "si.com", "athleticsweekly.com",
  "insidethegames.biz", "cyclingnews.com", "velonews.com", "runnersworld.com",
  "swimswam.com", "trackandfielddailynews.com", "lequipe.fr",
]);

const LOW_AUTHORITY_DOMAINS = new Set([
  "unknown", "reddit.com", "twitter.com", "x.com", "facebook.com",
  "instagram.com", "tiktok.com", "youtube.com", "wikipedia.org",
]);

export function adjustConfidenceByDomain(
  confidence: number,
  sourceDomain: string,
  hasSourceUrl: boolean,
): number {
  const domain = sourceDomain.toLowerCase().replace(/^www\./, "");
  let adjusted = confidence;

  if (HIGH_AUTHORITY_DOMAINS.has(domain)) {
    adjusted = Math.min(97, adjusted + 5); // authoritative source boost
  } else if (LOW_AUTHORITY_DOMAINS.has(domain)) {
    adjusted = Math.max(40, adjusted - 10); // low-authority penalty
  }

  // Items with no source URL lose 5 points — harder to verify
  if (!hasSourceUrl) adjusted = Math.max(40, adjusted - 5);

  return Math.round(adjusted);
}

/**
 * Applies the minimum-confidence-floor pattern ContactsAgent (M5) and
 * TimelineAgent (M6) previously each hand-rolled separately with the same
 * floor (70): clamp the model's raw confidence up to at least `floor`
 * before domain adjustment (so a missing or unusually low value doesn't
 * get an unfairly harsh adjustment baseline), adjust by domain authority,
 * then report whether the result still clears the floor. Callers still
 * own their own named floor constant (e.g. MIN_CONTACT_CONFIDENCE) for
 * readability at the call site — this centralises the *rule*, not the
 * naming.
 */
export function applyConfidenceFloor(
  rawConfidence: unknown,
  sourceDomain: string,
  hasSourceUrl: boolean,
  floor: number,
): { confidence: number; passesFloor: boolean } {
  const base = typeof rawConfidence === "number" ? Math.max(floor, rawConfidence) : floor;
  const confidence = adjustConfidenceByDomain(base, sourceDomain, hasSourceUrl);
  return { confidence, passesFloor: confidence >= floor };
}
