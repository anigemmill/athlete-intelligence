/**
 * Per-fact-domain source hierarchies (docs/task-27-agentic-pipeline.md §6).
 *
 * Replaces the flat, two-bucket HIGH_AUTHORITY_DOMAINS/LOW_AUTHORITY_DOMAINS
 * lists in artifacts/api-server/src/lib/auto-populate.ts. That flat list
 * cannot express that the same domain deserves different trust depending on
 * what it's being used to source: wikipedia.org is a reasonable tier for a
 * birth date or a profile photo, but a weak one for a competition result;
 * instagram.com is the *most* authoritative source for an Instagram handle,
 * but one of the least authoritative for a news claim.
 *
 * This module is not wired into auto-populate.ts yet — that swap is
 * Milestone 1. Nothing here changes pipeline behaviour in Milestone 0.
 *
 * Each fact domain collapses the conceptual multi-level hierarchy described
 * in §6 into the 4 confidence tiers scored in §7.2:
 *   tier 1 (+5)   the domain's primary authority for this kind of fact
 *   tier 2 (+2)   secondary but still reliable sources
 *   tier 3 (±0)   unlisted — the default for anything not named below
 *   tier 4 (-10)  known low-authority or easily-spoofed sources
 */

export type FactDomain =
  | "identity_biography"
  | "results_rankings"
  | "photo"
  | "social"
  | "contacts"
  | "sponsorship_media";

export type SourceTier = 1 | 2 | 3 | 4;

interface DomainTierSet {
  tier1: Set<string>;
  tier2: Set<string>;
  tier4: Set<string>;
}

// Governing bodies / federations — tier 1 across every fact domain that
// benefits from official-body authority (identity, results, photo, contacts).
const GOVERNING_BODIES = [
  "worldathletics.org", "olympics.com", "uci.org", "fis-ski.com", "iaaf.org",
  "worldrowing.com", "worldsailing.org", "fina.org", "worldarchery.org",
];

// Major verified media — tier 2 for facts where third-party reporting is
// meaningful corroboration (identity, results, sponsorship/media).
const VERIFIED_MEDIA = [
  "bbc.co.uk", "bbc.com", "reuters.com", "apnews.com", "theguardian.com",
  "espn.com", "si.com", "athleticsweekly.com", "insidethegames.biz",
  "cyclingnews.com", "velonews.com", "runnersworld.com", "swimswam.com",
  "trackandfielddailynews.com", "lequipe.fr", "redbull.com",
];

// Social platforms — tier 4 (easily spoofed, hardest to verify) for almost
// every fact domain EXCEPT "social" itself, where a platform's own profile
// page is the ground truth for its own handle/follower data.
const SOCIAL_PLATFORMS = [
  "twitter.com", "x.com", "facebook.com", "instagram.com", "tiktok.com",
  "youtube.com", "reddit.com",
];

export const SOURCE_TIERS: Record<FactDomain, DomainTierSet> = {
  identity_biography: {
    tier1: new Set(GOVERNING_BODIES),
    tier2: new Set(VERIFIED_MEDIA),
    tier4: new Set(SOCIAL_PLATFORMS),
  },
  results_rankings: {
    tier1: new Set(GOVERNING_BODIES),
    tier2: new Set(VERIFIED_MEDIA),
    // wikipedia.org is a weak source for a competition result or a ranking —
    // unlike identity_biography/photo, it gets no tier-3 pass here.
    tier4: new Set([...SOCIAL_PLATFORMS, "wikipedia.org"]),
  },
  photo: {
    // A federation's own athlete-profile image and an NOC media library are
    // both proxied here by the governing-body/olympics domain set (§6.3).
    tier1: new Set(GOVERNING_BODIES),
    tier2: new Set(["wikipedia.org"]),
    tier4: new Set(SOCIAL_PLATFORMS),
  },
  social: {
    // For social handle/follower facts, the platform's own page IS the
    // primary source (§6.4) — the inverse of every other fact domain.
    tier1: new Set(["instagram.com", "twitter.com", "x.com", "tiktok.com", "youtube.com"]),
    tier2: new Set(),
    tier4: new Set(["reddit.com"]),
  },
  contacts: {
    // Federation/team staff pages reuse the governing-body set (§6.5).
    tier1: new Set(GOVERNING_BODIES),
    tier2: new Set(VERIFIED_MEDIA),
    tier4: new Set(SOCIAL_PLATFORMS),
  },
  sponsorship_media: {
    // No enumerable "official press release" domain set exists — official
    // releases are scored via corroboration (§7.3) rather than a fixed tier
    // 1 list. Verified sports business/general media is tier 2 (§6.6).
    tier1: new Set(),
    tier2: new Set(VERIFIED_MEDIA),
    tier4: new Set(SOCIAL_PLATFORMS),
  },
};

function normaliseDomain(domain: string): string {
  return domain.toLowerCase().replace(/^www\./, "");
}

/**
 * Resolve a source domain's tier (1-4) for a given fact domain. "unknown"
 * and empty/unresolvable domains are always tier 4 — there is no fact
 * domain for which an unidentified source deserves a passing grade.
 */
export function getSourceTier(factDomain: FactDomain, sourceDomain: string): SourceTier {
  const domain = normaliseDomain(sourceDomain);
  if (!domain || domain === "unknown" || !domain.includes(".")) return 4;

  const tiers = SOURCE_TIERS[factDomain];
  if (tiers.tier1.has(domain)) return 1;
  if (tiers.tier2.has(domain)) return 2;
  if (tiers.tier4.has(domain)) return 4;
  return 3;
}

/**
 * Milestone 1 (docs/task-27-implementation-roadmap.md) wires getSourceTier
 * into auto-populate.ts, but that pipeline stuffs four unrelated kinds of
 * fact into one `intelligence_items` table and five into one
 * `timeline_events` table via a single extraction call. These two mapping
 * functions are a temporary adapter for that, shared here (rather than
 * duplicated in auto-populate.ts and the Intelligence Audit feature) so
 * there is exactly one place that knows how a legacy category maps to a
 * fact domain. Once IntelligenceAgent, SponsorsAgent, and TimelineAgent
 * (Milestones 6, 8, 9) each own their own single FactDomain, this adapter
 * has no more callers and should be deleted along with the rest of the
 * monolithic write path (see Milestone 10's monolith-retirement step).
 */
export function mapIntelligenceCategoryToFactDomain(category: unknown): FactDomain {
  switch (category) {
    case "sponsorships":
    case "media_interviews":
      return "sponsorship_media";
    case "career_changes":
      return "identity_biography";
    case "results_rankings":
    default:
      return "results_rankings";
  }
}

export function mapTimelineCategoryToFactDomain(category: unknown): FactDomain {
  switch (category) {
    case "media":
    case "sponsorship":
      return "sponsorship_media";
    case "career":
    case "personal":
      return "identity_biography";
    case "competition":
    default:
      return "results_rankings";
  }
}
