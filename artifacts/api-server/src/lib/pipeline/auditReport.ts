/**
 * Intelligence Audit report engine.
 *
 * Builds a full, per-athlete quality report from whatever is actually
 * stored in the database after a real production repopulation — plus two
 * genuinely live checks (source-URL liveness, profile-image liveness) that
 * this module performs itself over the network. Nothing here is mocked,
 * hand-corrected, or guessed: every field is either a stored value, a
 * deterministic computation over stored values, or the result of an actual
 * HTTP request made at report-build time.
 *
 * Scope, stated honestly: this module can rigorously audit *data quality*
 * (format validity, staleness, completeness, internal consistency, live
 * link/image resolution) because all of that is checkable from the data
 * itself. It cannot verify that a stored fact is *true* in the real world
 * (e.g. "is 45 really Peter Bol's current world rank?") without either a
 * human reading the report or a second independent research call — this
 * version does neither, and says so explicitly in each section that would
 * otherwise imply automated fact-checking it doesn't do.
 *
 * Deliberately free of any runtime dependency on @workspace/db: everything
 * here is a pure function of already-fetched rows (or, for images/sources,
 * a live network call this module makes itself). The one function that
 * actually fetches from the database — buildAthleteAuditReport — lives in
 * ./auditReportRunner.ts instead, specifically so this file can be unit
 * tested without a database being reachable at all. Importing the DB
 * client's *value* here (even just to re-export it) would defeat that,
 * since @workspace/db throws at import time if DATABASE_URL isn't set.
 */

import type { AthleteRawData } from "./collectAthleteData.js";
import type { Athlete, IntelligenceItem, TimelineEvent, Contact, Competition } from "@workspace/db";
import { computeIQS, buildIQSInputFromRawData, type IQSResult } from "./iqs.js";
import {
  isCitationIndexUrl,
  isCitationIndexDomain,
  isQualityMeetName,
  isSeasonBestBetterThanPersonalBest,
  isValidHandle,
  sanitizeSourceUrl,
} from "./validation.js";
import { EMISSION_CONFIDENCE_FLOOR } from "./confidence.js";
import {
  getSourceTier,
  mapIntelligenceCategoryToFactDomain,
  mapTimelineCategoryToFactDomain,
  type FactDomain,
} from "./sourceHierarchy.js";
import { checkUrlsConcurrently, type LinkCheckResult } from "./deadLinkCheck.js";
import { checkImage, type ImageCheckResult } from "./imageCheck.js";

// ── Section types ─────────────────────────────────────────────────────────────

export interface IdentitySection {
  name: string;
  nationality: string;
  sport: string;
  event: string;
  hasProfileImage: boolean;
  fieldsPresent: { name: boolean; nationality: boolean; sport: boolean; event: boolean };
  notes: string[];
}

export interface ResultsSection {
  personalBest: string | null;
  seasonBest: string | null;
  worldRank: number | null;
  nationalRank: number | null;
  pbSbInverted: boolean | null;
  lastCrawledAt: string | null;
  daysSinceCrawl: number | null;
}

export interface CompetitionsSection {
  total: number;
  upcoming: number;
  completed: number;
  pastWithResult: number;
  pastWithoutResult: number;
  resultCompletenessPct: number;
  genericMeetNames: string[];
  duplicates: Array<{ meetName: string; date: string; count: number }>;
  staleUpcoming: Array<{ id: number; meetName: string; date: string }>;
}

export interface TimelineSection {
  total: number;
  earliestDate: string | null;
  latestDate: string | null;
  duplicates: Array<{ date: string; title: string; count: number }>;
  largestGapDays: number | null;
  sparseFlag: boolean;
}

export interface IntelligenceSection {
  total: number;
  byCategory: Record<string, number>;
  zeroCategories: string[];
  averageConfidence: number | null;
  lowConfidenceCount: number;
}

export interface ContactsSection {
  total: number;
  byCategory: Record<string, number>;
  hasCoach: boolean;
  hasManagerOrAgent: boolean;
  hasSponsorContact: boolean;
  sponsorMentionsInIntelligence: number;
  perContact: Array<{ name: string; role: string; category: string; confidence: number; sourceDomain: string; sourceExcerpt: string | null }>;
  notes: string[];
}

export interface SocialPlatformStatus {
  handle: string | null;
  followers: number;
  validFormat: boolean | null;
}

export interface SocialSection {
  instagram: SocialPlatformStatus;
  twitter: SocialPlatformStatus;
  tiktok: SocialPlatformStatus;
  followerGrowth30d: number;
  avgEngagement: number;
  notes: string[];
}

export interface ImagesSection {
  avatarUrl: string | null;
  live: ImageCheckResult | null;
  freshnessBasisIso: string | null;
  licensingNote: string;
}

export interface SourcesSection {
  totalEvidenceRecords: number;
  citationIndexLeaksFound: number;
  placeholderDomainsFound: number;
  distinctDomains: number;
  duplicateDomainConcentration: Array<{ domain: string; count: number }>;
  deadLinks: LinkCheckResult[];
  liveLinksChecked: number;
}

export interface ConfidenceItemExplanation {
  table: "intelligence_items" | "timeline_events" | "contacts";
  id: number;
  title: string;
  storedConfidence: number;
  sourceDomain: string;
  sourceTier: number;
  hasSourceUrl: boolean;
  explanation: string;
}

export interface ConfidenceSection {
  distribution: { under65: number; from65to79: number; from80to89: number; from90to97: number };
  average: number | null;
  lowestConfidenceItems: ConfidenceItemExplanation[];
}

export interface AthleteAuditReport {
  athleteId: number;
  name: string;
  identity: IdentitySection;
  results: ResultsSection;
  competitions: CompetitionsSection;
  timeline: TimelineSection;
  intelligence: IntelligenceSection;
  contacts: ContactsSection;
  social: SocialSection;
  images: ImagesSection;
  sources: SourcesSection;
  confidence: ConfidenceSection;
  iqs: IQSResult;
  strengths: string[];
  weaknesses: string[];
  improvementNotes: string[];
}

export interface OverallAssessment {
  overallIqs: number;
  previousRunComparison: { previousAuditRunId: number; previousOverallIqs: number; delta: number } | null;
  biggestMilestone1Impacts: string[];
  remainingIssues: string[];
  milestone2FixableIssues: string[];
  architectureLevelIssues: string[];
}

export interface AuditRunReport {
  athletes: AthleteAuditReport[];
  overall: OverallAssessment;
}

// ── Section builders ──────────────────────────────────────────────────────────

export function buildIdentitySection(athlete: Athlete): IdentitySection {
  return {
    name: athlete.name,
    nationality: athlete.nationality,
    sport: athlete.sport,
    event: athlete.event,
    hasProfileImage: !!athlete.avatarUrl,
    fieldsPresent: {
      name: !!athlete.name,
      nationality: !!athlete.nationality,
      sport: !!athlete.sport,
      event: !!athlete.event,
    },
    notes: [
      "Discovery confidence (the score that gated this athlete's creation via discoverAthleteProfile) is not persisted on the athletes row, so identity accuracy cannot be retroactively audited here — only checked once, at creation time.",
      "Whether name/nationality/sport/event are factually correct for this real person cannot be automatically verified by this tool — it checks presence and internal consistency, not ground truth. A human should spot-check identity against a source the admin trusts.",
    ],
  };
}

export function buildResultsSection(athlete: Athlete): ResultsSection {
  const pbSbInverted =
    athlete.personalBest && athlete.seasonBest
      ? isSeasonBestBetterThanPersonalBest(athlete.personalBest, athlete.seasonBest)
      : null;
  const daysSinceCrawl = athlete.lastCrawledAt
    ? Math.floor((Date.now() - new Date(athlete.lastCrawledAt).getTime()) / 86_400_000)
    : null;

  return {
    personalBest: athlete.personalBest,
    seasonBest: athlete.seasonBest,
    worldRank: athlete.worldRank,
    nationalRank: athlete.nationalRank,
    pbSbInverted,
    lastCrawledAt: athlete.lastCrawledAt ? new Date(athlete.lastCrawledAt).toISOString() : null,
    daysSinceCrawl,
  };
}

export function buildCompetitionsSection(competitions: Competition[], today: string): CompetitionsSection {
  const upcoming = competitions.filter((c) => c.status === "upcoming").length;
  const completed = competitions.filter((c) => c.status === "completed").length;
  const past = competitions.filter((c) => c.date <= today);
  const pastWithResult = past.filter((c) => c.result !== null).length;
  const pastWithoutResult = past.length - pastWithResult;
  const resultCompletenessPct = past.length > 0 ? Math.round((pastWithResult / past.length) * 100) : 0;
  const genericMeetNames = competitions.filter((c) => !isQualityMeetName(c.meetName)).map((c) => c.meetName);

  const counts = new Map<string, { meetName: string; date: string; count: number }>();
  for (const c of competitions) {
    const key = `${c.meetName}::${c.date}`;
    const existing = counts.get(key);
    if (existing) existing.count++;
    else counts.set(key, { meetName: c.meetName, date: c.date, count: 1 });
  }
  const duplicates = [...counts.values()].filter((d) => d.count > 1);

  const staleUpcoming = competitions
    .filter((c) => c.status === "upcoming" && c.date <= today)
    .map((c) => ({ id: c.id, meetName: c.meetName, date: c.date }));

  return { total: competitions.length, upcoming, completed, pastWithResult, pastWithoutResult, resultCompletenessPct, genericMeetNames, duplicates, staleUpcoming };
}

export function buildTimelineSection(events: TimelineEvent[]): TimelineSection {
  if (events.length === 0) {
    return { total: 0, earliestDate: null, latestDate: null, duplicates: [], largestGapDays: null, sparseFlag: true };
  }

  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));
  const earliestDate = sorted[0].date;
  const latestDate = sorted[sorted.length - 1].date;

  const counts = new Map<string, { date: string; title: string; count: number }>();
  for (const e of events) {
    const key = `${e.date}::${e.title}`;
    const existing = counts.get(key);
    if (existing) existing.count++;
    else counts.set(key, { date: e.date, title: e.title, count: 1 });
  }
  const duplicates = [...counts.values()].filter((d) => d.count > 1);

  let largestGapDays: number | null = null;
  for (let i = 1; i < sorted.length; i++) {
    const gap = Math.round((new Date(sorted[i].date).getTime() - new Date(sorted[i - 1].date).getTime()) / 86_400_000);
    if (largestGapDays === null || gap > largestGapDays) largestGapDays = gap;
  }

  return { total: events.length, earliestDate, latestDate, duplicates, largestGapDays, sparseFlag: events.length < 5 };
}

const INTEL_CATEGORIES = ["results_rankings", "media_interviews", "sponsorships", "career_changes"];

export function buildIntelligenceSection(items: IntelligenceItem[]): IntelligenceSection {
  const byCategory: Record<string, number> = {};
  for (const cat of INTEL_CATEGORIES) byCategory[cat] = 0;
  for (const item of items) byCategory[item.category] = (byCategory[item.category] ?? 0) + 1;
  const zeroCategories = INTEL_CATEGORIES.filter((cat) => (byCategory[cat] ?? 0) === 0);
  const averageConfidence = items.length > 0 ? Math.round((items.reduce((s, i) => s + i.confidence, 0) / items.length) * 10) / 10 : null;
  const lowConfidenceCount = items.filter((i) => i.confidence < EMISSION_CONFIDENCE_FLOOR).length;

  return { total: items.length, byCategory, zeroCategories, averageConfidence, lowConfidenceCount };
}

export function buildContactsSection(contacts: Contact[], intelItems: IntelligenceItem[]): ContactsSection {
  const byCategory: Record<string, number> = {};
  for (const c of contacts) byCategory[c.category] = (byCategory[c.category] ?? 0) + 1;

  const hasCoach = contacts.some((c) => c.category === "coaching");
  const hasManagerOrAgent = contacts.some((c) => c.category === "management");
  const hasSponsorContact = contacts.some((c) => c.category === "sponsorship");
  const sponsorMentionsInIntelligence = intelItems.filter((i) => i.category === "sponsorships").length;

  const perContact = contacts.map((c) => ({
    name: c.name,
    role: c.role,
    category: c.category,
    confidence: c.confidence,
    sourceDomain: c.sourceDomain,
    sourceExcerpt: c.sourceExcerpt,
  }));

  const notes: string[] = [];
  if (!hasSponsorContact && sponsorMentionsInIntelligence === 0) {
    notes.push(
      "No sponsor coverage found in either the contacts table (category 'sponsorship') or intelligence_items (category 'sponsorships') — note the trailing-'s' naming inconsistency between the two tables' category enums, itself worth fixing independent of this gap.",
    );
  } else if (!hasSponsorContact && sponsorMentionsInIntelligence > 0) {
    notes.push(`Sponsor activity is covered in the intelligence feed (${sponsorMentionsInIntelligence} item(s)) but no dedicated sponsor contact exists.`);
  }
  if (contacts.length === 0) {
    notes.push("Zero contacts on file — matches docs/technical-debt.md Priority 3 (contact extraction relies on the general research pass, which rarely surfaces personnel names).");
  }

  return { total: contacts.length, byCategory, hasCoach, hasManagerOrAgent, hasSponsorContact, sponsorMentionsInIntelligence, perContact, notes };
}

export function buildSocialSection(athlete: Athlete): SocialSection {
  const platform = (handle: string | null, followers: number, kind: "instagram" | "twitter" | "tiktok"): SocialPlatformStatus => ({
    handle,
    followers,
    validFormat: handle ? isValidHandle(handle, kind) : null,
  });

  const notes = [
    "Facebook, LinkedIn, and YouTube are not tracked by the current schema (no corresponding columns on the athletes table) — they cannot be audited here, only Instagram, X/Twitter, and TikTok are.",
  ];
  if (athlete.followerGrowth30d === 0) {
    notes.push(
      "follower_growth_30d is 0 — expected pre-Milestone-9 (docs/technical-debt.md Priority 10): the current pipeline never computes this field, so 0 means 'never measured', not 'no growth'.",
    );
  }

  return {
    instagram: platform(athlete.instagramHandle, athlete.instagramFollowers, "instagram"),
    twitter: platform(athlete.twitterHandle, athlete.twitterFollowers, "twitter"),
    tiktok: platform(athlete.tiktokHandle, athlete.tiktokFollowers, "tiktok"),
    followerGrowth30d: athlete.followerGrowth30d,
    avgEngagement: athlete.avgEngagement,
    notes,
  };
}

export async function buildImagesSection(athlete: Athlete): Promise<ImagesSection> {
  const live = athlete.avatarUrl ? await checkImage(athlete.avatarUrl) : null;
  return {
    avatarUrl: athlete.avatarUrl,
    live,
    freshnessBasisIso: athlete.lastCrawledAt ? new Date(athlete.lastCrawledAt).toISOString() : null,
    licensingNote:
      "Not tracked by the current pipeline — photo-lookup.ts captures no licensing metadata from Wikipedia or Perplexity's image search, so licensing cannot be audited; this would require a pipeline change, not a validation rule.",
  };
}

export async function buildSourcesSection(raw: AthleteRawData): Promise<SourcesSection> {
  const evidence: Array<{ sourceDomain: string; sourceUrl: string | null }> = [
    ...raw.intelItems.map((i) => ({ sourceDomain: i.sourceDomain, sourceUrl: i.sourceUrl })),
    ...raw.timelineEvents.map((t) => ({ sourceDomain: t.sourceDomain, sourceUrl: t.sourceUrl })),
    ...raw.contacts.map((c) => ({ sourceDomain: c.sourceDomain, sourceUrl: null as string | null })),
  ];

  const citationIndexLeaksFound = evidence.filter(
    (e) => isCitationIndexDomain(e.sourceDomain) || (e.sourceUrl !== null && isCitationIndexUrl(e.sourceUrl)),
  ).length;
  const placeholderDomainsFound = evidence.filter((e) => e.sourceDomain.toLowerCase() === "unknown").length;

  const domainCounts = new Map<string, number>();
  for (const e of evidence) {
    const d = e.sourceDomain.toLowerCase();
    domainCounts.set(d, (domainCounts.get(d) ?? 0) + 1);
  }
  const duplicateDomainConcentration = [...domainCounts.entries()]
    .filter(([, count]) => count >= 3)
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count);

  const urls = evidence.map((e) => e.sourceUrl).filter((u): u is string => u !== null && sanitizeSourceUrl(u) !== null);
  const linkResults = await checkUrlsConcurrently(urls);
  const deadLinks = linkResults.filter((r) => !r.ok);

  return {
    totalEvidenceRecords: evidence.length,
    citationIndexLeaksFound,
    placeholderDomainsFound,
    distinctDomains: domainCounts.size,
    duplicateDomainConcentration,
    deadLinks,
    liveLinksChecked: linkResults.length,
  };
}

export function explainConfidence(storedConfidence: number, tier: number, hasSourceUrl: boolean): string {
  const parts: string[] = [];
  if (tier === 1) parts.push("tier-1 (governing-body) domain, +5 expected");
  else if (tier === 2) parts.push("tier-2 (verified media) domain, +2 expected");
  else if (tier === 4) parts.push("tier-4 (low-authority/unattributed) domain, -10 expected");
  else parts.push("unlisted (tier-3) domain, no adjustment expected");
  if (!hasSourceUrl) parts.push("no source URL, additional -5 expected");
  return `Confidence ${storedConfidence}: ${parts.join("; ")}.`;
}

export function buildConfidenceSection(raw: AthleteRawData): ConfidenceSection {
  interface Row {
    table: ConfidenceItemExplanation["table"];
    id: number;
    title: string;
    confidence: number;
    sourceDomain: string;
    hasSourceUrl: boolean;
    factDomain: FactDomain;
  }

  const rows: Row[] = [
    ...raw.intelItems.map((i) => ({
      table: "intelligence_items" as const,
      id: i.id,
      title: i.title,
      confidence: i.confidence,
      sourceDomain: i.sourceDomain,
      hasSourceUrl: i.sourceUrl !== null,
      factDomain: mapIntelligenceCategoryToFactDomain(i.category),
    })),
    ...raw.timelineEvents.map((t) => ({
      table: "timeline_events" as const,
      id: t.id,
      title: t.title,
      confidence: t.confidence,
      sourceDomain: t.sourceDomain,
      hasSourceUrl: t.sourceUrl !== null,
      factDomain: mapTimelineCategoryToFactDomain(t.category),
    })),
    ...raw.contacts.map((c) => ({
      table: "contacts" as const,
      id: c.id,
      title: `${c.role} — ${c.name}`,
      confidence: c.confidence,
      sourceDomain: c.sourceDomain,
      hasSourceUrl: true, // contacts has no source_url column — see confidence.ts's write-path comment
      factDomain: "contacts" as FactDomain,
    })),
  ];

  const distribution = { under65: 0, from65to79: 0, from80to89: 0, from90to97: 0 };
  for (const r of rows) {
    if (r.confidence < 65) distribution.under65++;
    else if (r.confidence < 80) distribution.from65to79++;
    else if (r.confidence < 90) distribution.from80to89++;
    else distribution.from90to97++;
  }
  const average = rows.length > 0 ? Math.round((rows.reduce((s, r) => s + r.confidence, 0) / rows.length) * 10) / 10 : null;

  const lowestConfidenceItems = [...rows]
    .sort((a, b) => a.confidence - b.confidence)
    .slice(0, 10)
    .map((r) => {
      const tier = getSourceTier(r.factDomain, r.sourceDomain);
      return {
        table: r.table,
        id: r.id,
        title: r.title,
        storedConfidence: r.confidence,
        sourceDomain: r.sourceDomain,
        sourceTier: tier,
        hasSourceUrl: r.hasSourceUrl,
        explanation: explainConfidence(r.confidence, tier, r.hasSourceUrl),
      };
    });

  return { distribution, average, lowestConfidenceItems };
}

export function deriveAthleteAssessment(
  identity: IdentitySection,
  results: ResultsSection,
  competitions: CompetitionsSection,
  timeline: TimelineSection,
  intelligence: IntelligenceSection,
  contacts: ContactsSection,
  images: ImagesSection,
  sources: SourcesSection,
  iqs: IQSResult,
): { strengths: string[]; weaknesses: string[]; improvementNotes: string[] } {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const improvementNotes: string[] = [];
  const s = iqs.subScores;

  if (s.evidenceValidity >= 20) {
    strengths.push(`Evidence validity is strong (${s.evidenceValidity}/25) — no meaningful citation-leak or placeholder-domain contamination found.`);
  } else {
    weaknesses.push(
      `Evidence validity is weak (${s.evidenceValidity}/25) — ${sources.citationIndexLeaksFound} citation-index leak(s) and ${sources.placeholderDomainsFound} placeholder-domain record(s) found.`,
    );
  }

  if (results.pbSbInverted === true) {
    weaknesses.push("Season best is logically superior to personal best. This is unexpected after Milestone 1 — the pipeline's correction should prevent this from ever being written; if it's present, the correction did not fire and is worth investigating directly.");
  }

  if (!contacts.hasCoach || !contacts.hasManagerOrAgent) {
    const missing = [!contacts.hasCoach && "coach", !contacts.hasManagerOrAgent && "manager/agent"].filter(Boolean).join(" and ");
    weaknesses.push(`Contact coverage incomplete (${s.contactCoverage}/15) — missing ${missing}.`);
    improvementNotes.push("Missing baseline contacts — Milestone 5 (ContactsAgent)'s two-query strategy (separate coaching and management searches) targets exactly this gap.");
  } else {
    strengths.push("Full baseline contact coverage (coach + manager/agent) on file.");
  }

  if (intelligence.total < 8 || timeline.sparseFlag) {
    weaknesses.push(`Content density is thin (${s.contentDensity}/15) — ${intelligence.total} intelligence items, ${timeline.total} timeline events.`);
    improvementNotes.push("Sparse intelligence/timeline — Milestone 6 (IntelligenceAgent) and Milestone 8 (TimelineAgent) target this directly, including TimelineAgent's supplementary pass for under-12-event results.");
  }

  if (sources.deadLinks.length > 0) {
    weaknesses.push(`${sources.deadLinks.length} of ${sources.liveLinksChecked} checked source URL(s) did not resolve live.`);
    improvementNotes.push("Dead source links — no milestone in the current roadmap re-checks link liveness after initial write; this is a gap in the roadmap itself, not just the data (see architecture-level issues).");
  } else if (sources.liveLinksChecked > 0) {
    strengths.push(`All ${sources.liveLinksChecked} checked source URL(s) resolved live.`);
  }

  if (competitions.staleUpcoming.length > 0) {
    weaknesses.push(`${competitions.staleUpcoming.length} competition(s) still marked "upcoming" despite the date having passed (docs/technical-debt.md's known view-layer gap — flushStaleCompetitionStatuses was not run for this athlete after the date passed).`);
  }
  if (competitions.genericMeetNames.length > 0) {
    weaknesses.push(`${competitions.genericMeetNames.length} competition(s) have a generic meet name that would fail Milestone 4's quality gate if it existed today: ${competitions.genericMeetNames.slice(0, 3).join(", ")}${competitions.genericMeetNames.length > 3 ? ", …" : ""}.`);
    improvementNotes.push("Generic meet names — Milestone 4 (CompetitionsAgent) rejects these at write time; until then they can only be flagged, not prevented, since Milestone 1 did not touch the competitions write path.");
  }

  if (images.live && !images.live.ok) {
    weaknesses.push("Profile image URL did not resolve live.");
  } else if (!identity.hasProfileImage) {
    weaknesses.push("No profile image on file.");
  }

  if (!contacts.hasSponsorContact && contacts.sponsorMentionsInIntelligence === 0) {
    improvementNotes.push("No sponsor coverage anywhere — Milestone 9 (SponsorsAgent) targets this directly.");
  }

  return { strengths, weaknesses, improvementNotes };
}

// Note: buildAthleteAuditReport (the function that actually fetches from the
// database and assembles everything above into one AthleteAuditReport) lives
// in ./auditReportRunner.ts, not here — see this file's header for why.

// ── Overall platform assessment ──────────────────────────────────────────────

export function buildOverallAssessment(
  athletes: AthleteAuditReport[],
  previousRun: { id: number; overallIqs: number } | null,
): OverallAssessment {
  const overallIqs = Math.round(athletes.reduce((s, a) => s + a.iqs.total, 0) / athletes.length);

  const totalLeaks = athletes.reduce((s, a) => s + a.sources.citationIndexLeaksFound, 0);
  const invertedCount = athletes.filter((a) => a.results.pbSbInverted === true).length;
  const totalDeadLinks = athletes.reduce((s, a) => s + a.sources.deadLinks.length, 0);
  const missingContacts = athletes.filter((a) => !a.contacts.hasCoach || !a.contacts.hasManagerOrAgent).length;
  const sparseIntel = athletes.filter((a) => a.intelligence.total < 8).length;
  const sparseTimeline = athletes.filter((a) => a.timeline.sparseFlag).length;
  const missingSponsors = athletes.filter((a) => !a.contacts.hasSponsorContact && a.contacts.sponsorMentionsInIntelligence === 0).length;
  const staleCompetitions = athletes.filter((a) => a.competitions.staleUpcoming.length > 0).length;

  const biggestMilestone1Impacts: string[] = [];
  if (totalLeaks === 0) {
    biggestMilestone1Impacts.push(`Zero citation-index leaks found across all ${athletes.length} freshly-repopulated athletes — Milestone 1's sanitisation is holding under live production conditions, not just the seeded test cases it originally shipped against.`);
  } else {
    biggestMilestone1Impacts.push(`${totalLeaks} citation-index leak(s) still found despite Milestone 1 — worth investigating directly, since this specific defect should be structurally prevented now.`);
  }
  if (invertedCount === 0) {
    biggestMilestone1Impacts.push("No PB/SB inversions found — Milestone 1's correction is firing correctly against live extraction output, not just the historical bad-data fixtures used to build it.");
  } else {
    biggestMilestone1Impacts.push(`${invertedCount} athlete(s) still show a PB/SB inversion — unexpected post-Milestone-1, worth investigating directly.`);
  }

  const remainingIssues: string[] = [];
  if (missingContacts > 0) remainingIssues.push(`${missingContacts}/${athletes.length} athletes are missing a coach or manager/agent contact.`);
  if (sparseIntel > 0) remainingIssues.push(`${sparseIntel}/${athletes.length} athletes have fewer than 8 intelligence items.`);
  if (sparseTimeline > 0) remainingIssues.push(`${sparseTimeline}/${athletes.length} athletes have a sparse timeline (fewer than 5 events).`);
  if (missingSponsors > 0) remainingIssues.push(`${missingSponsors}/${athletes.length} athletes have no sponsor coverage anywhere.`);
  if (totalDeadLinks > 0) remainingIssues.push(`${totalDeadLinks} stored source URL(s) across the roster did not resolve live.`);
  if (staleCompetitions > 0) remainingIssues.push(`${staleCompetitions}/${athletes.length} athletes have a competition still marked "upcoming" after its date passed.`);

  // Literal Milestone 2 (orchestrator + IdentityAgent + LegacyMonolithAgent)
  // is scaffolding by design — it changes no data-quality logic
  // (docs/task-27-implementation-roadmap.md's own acceptance criteria
  // require its IQS delta to be ~0). None of the remaining issues above are
  // fixed by Milestone 2 itself; they are fixed by the specific *later*
  // agent milestones named below, which this section states honestly
  // rather than crediting Milestone 2 with work it doesn't do.
  const milestone2FixableIssues: string[] = [
    "None of the remaining issues above are fixed by Milestone 2 itself — it is orchestrator scaffolding with no data-quality changes by design (its own roadmap entry targets an IQS delta of ~0). The issues below are fixed by later agent milestones, not Milestone 2:",
  ];
  if (missingContacts > 0) milestone2FixableIssues.push("Missing contacts → Milestone 5 (ContactsAgent).");
  if (sparseIntel > 0) milestone2FixableIssues.push("Sparse intelligence → Milestone 6 (IntelligenceAgent).");
  if (sparseTimeline > 0) milestone2FixableIssues.push("Sparse timeline → Milestone 8 (TimelineAgent).");
  if (missingSponsors > 0) milestone2FixableIssues.push("Missing sponsor coverage → Milestone 9 (SponsorsAgent).");
  if (staleCompetitions > 0) milestone2FixableIssues.push("Stale \"upcoming\" competitions → partially addressed by the scheduler's flushStaleCompetitionStatuses today; full ownership moves to Milestone 4 (CompetitionsAgent).");

  const architectureLevelIssues: string[] = [
    "Facebook, LinkedIn, and YouTube have no corresponding columns in the athletes schema — covering them requires a schema change, not a new validation rule.",
    "Sponsor coverage is split across two inconsistently-named category enums ('sponsorship' on contacts, 'sponsorships' on intelligence_items) — a naming/schema issue, not fixable by validation alone.",
    "Discovery confidence (the identity-resolution score) is not persisted on the athletes row, so identity accuracy cannot be retroactively audited — only checked once, at creation time.",
    "No milestone in the current roadmap re-verifies source-link liveness after initial write — a URL that was live at crawl time and later goes dead has no detection path until this audit tool checks it. Worth a dedicated periodic job, not just a one-off admin-triggered audit.",
    "This tool cannot verify that a stored fact is true in the real world (only that it is well-formed, internally consistent, and — for URLs/images — currently reachable). Closing that gap requires either human review or a second independent research call, which this version deliberately does not make (see this module's file header).",
  ];

  return {
    overallIqs,
    previousRunComparison: previousRun ? { previousAuditRunId: previousRun.id, previousOverallIqs: previousRun.overallIqs, delta: overallIqs - previousRun.overallIqs } : null,
    biggestMilestone1Impacts,
    remainingIssues,
    milestone2FixableIssues,
    architectureLevelIssues,
  };
}

// ── Markdown rendering ────────────────────────────────────────────────────────

export function renderMarkdownReport(report: AuditRunReport, triggeredAtIso: string): string {
  const lines: string[] = [];
  lines.push(`# Intelligence Audit Report`, "", `Generated from a live run of the production pipeline. Triggered at ${triggeredAtIso}.`, "");

  lines.push(`## Platform Assessment`, "", `**Overall IQS: ${report.overall.overallIqs}/100**`, "");
  if (report.overall.previousRunComparison) {
    const c = report.overall.previousRunComparison;
    lines.push(`Compared to audit run #${c.previousAuditRunId}: ${c.previousOverallIqs} → ${report.overall.overallIqs} (${c.delta >= 0 ? "+" : ""}${c.delta}).`, "");
  } else {
    lines.push("No previous audit run to compare against.", "");
  }
  lines.push("### Biggest Milestone 1 impacts", ...report.overall.biggestMilestone1Impacts.map((s) => `- ${s}`), "");
  lines.push("### Remaining issues", ...(report.overall.remainingIssues.length ? report.overall.remainingIssues.map((s) => `- ${s}`) : ["- None found."]), "");
  lines.push("### Which issues Milestone 2 will fix", ...report.overall.milestone2FixableIssues.map((s) => `- ${s}`), "");
  lines.push("### Architecture-level issues (not fixable by validation alone)", ...report.overall.architectureLevelIssues.map((s) => `- ${s}`), "");

  for (const a of report.athletes) {
    lines.push("", `## ${a.name} — IQS ${a.iqs.total}/100`, "");
    lines.push("### Strengths", ...(a.strengths.length ? a.strengths.map((s) => `- ${s}`) : ["- None identified."]), "");
    lines.push("### Weaknesses", ...(a.weaknesses.length ? a.weaknesses.map((s) => `- ${s}`) : ["- None identified."]), "");
    lines.push("### What still needs improving", ...(a.improvementNotes.length ? a.improvementNotes.map((s) => `- ${s}`) : ["- Nothing further identified."]), "");

    lines.push(
      "### Identity",
      `- Name: ${a.identity.name} | Nationality: ${a.identity.nationality} | Sport: ${a.identity.sport} | Event: ${a.identity.event}`,
      `- Profile image on file: ${a.identity.hasProfileImage ? "yes" : "no"}`,
      ...a.identity.notes.map((n) => `- Note: ${n}`),
      "",
    );

    lines.push(
      "### Results",
      `- PB: ${a.results.personalBest ?? "—"} | SB: ${a.results.seasonBest ?? "—"} | PB/SB inverted: ${a.results.pbSbInverted === null ? "n/a" : a.results.pbSbInverted}`,
      `- World rank: ${a.results.worldRank ?? "—"} | National rank: ${a.results.nationalRank ?? "—"}`,
      `- Last crawled: ${a.results.lastCrawledAt ?? "never"} (${a.results.daysSinceCrawl ?? "—"} days ago)`,
      "",
    );

    lines.push(
      "### Competitions",
      `- Total: ${a.competitions.total} | Upcoming: ${a.competitions.upcoming} | Completed: ${a.competitions.completed}`,
      `- Result completeness: ${a.competitions.resultCompletenessPct}% (${a.competitions.pastWithResult}/${a.competitions.pastWithResult + a.competitions.pastWithoutResult} past competitions)`,
      `- Generic meet names: ${a.competitions.genericMeetNames.length}`,
      `- Duplicate competitions: ${a.competitions.duplicates.length}`,
      `- Stale "upcoming" status: ${a.competitions.staleUpcoming.length}`,
      "",
    );

    lines.push(
      "### Timeline",
      `- Total events: ${a.timeline.total} | Earliest: ${a.timeline.earliestDate ?? "—"} | Latest: ${a.timeline.latestDate ?? "—"}`,
      `- Duplicate events: ${a.timeline.duplicates.length} | Largest date gap: ${a.timeline.largestGapDays ?? "—"} days | Sparse: ${a.timeline.sparseFlag}`,
      "",
    );

    lines.push(
      "### Intelligence",
      `- Total items: ${a.intelligence.total} | Average confidence: ${a.intelligence.averageConfidence ?? "—"} | Below emission floor: ${a.intelligence.lowConfidenceCount}`,
      `- By category: ${Object.entries(a.intelligence.byCategory).map(([k, v]) => `${k}=${v}`).join(", ")}`,
      `- Zero-coverage categories: ${a.intelligence.zeroCategories.join(", ") || "none"}`,
      "",
    );

    lines.push(
      "### Contacts",
      `- Total: ${a.contacts.total} | Coach: ${a.contacts.hasCoach} | Manager/agent: ${a.contacts.hasManagerOrAgent} | Sponsor contact: ${a.contacts.hasSponsorContact}`,
      ...a.contacts.perContact.map((c) => `  - ${c.role} — ${c.name} (${c.category}, confidence ${c.confidence}, source: ${c.sourceDomain})`),
      ...a.contacts.notes.map((n) => `- Note: ${n}`),
      "",
    );

    lines.push(
      "### Social",
      `- Instagram: ${a.social.instagram.handle ?? "—"} (${a.social.instagram.followers} followers, valid format: ${a.social.instagram.validFormat ?? "n/a"})`,
      `- X/Twitter: ${a.social.twitter.handle ?? "—"} (${a.social.twitter.followers} followers, valid format: ${a.social.twitter.validFormat ?? "n/a"})`,
      `- TikTok: ${a.social.tiktok.handle ?? "—"} (${a.social.tiktok.followers} followers, valid format: ${a.social.tiktok.validFormat ?? "n/a"})`,
      ...a.social.notes.map((n) => `- Note: ${n}`),
      "",
    );

    lines.push(
      "### Images",
      `- Avatar URL: ${a.images.avatarUrl ?? "—"}`,
      `- Live check: ${a.images.live ? `${a.images.live.ok ? "resolves" : "does not resolve"} (status ${a.images.live.status ?? "n/a"}, ${a.images.live.widthPx ?? "?"}x${a.images.live.heightPx ?? "?"}px)` : "no image to check"}`,
      `- Licensing: ${a.images.licensingNote}`,
      "",
    );

    lines.push(
      "### Sources",
      `- Total evidence records: ${a.sources.totalEvidenceRecords} | Distinct domains: ${a.sources.distinctDomains}`,
      `- Citation-index leaks found: ${a.sources.citationIndexLeaksFound} | Placeholder domains found: ${a.sources.placeholderDomainsFound}`,
      `- Live links checked: ${a.sources.liveLinksChecked} | Dead links: ${a.sources.deadLinks.length}`,
      ...a.sources.deadLinks.map((d) => `  - DEAD: ${d.url} (status ${d.status ?? "n/a"}${d.error ? `, ${d.error}` : ""})`),
      "",
    );

    lines.push(
      "### Confidence",
      `- Distribution: <65=${a.confidence.distribution.under65}, 65-79=${a.confidence.distribution.from65to79}, 80-89=${a.confidence.distribution.from80to89}, 90-97=${a.confidence.distribution.from90to97}`,
      `- Average: ${a.confidence.average ?? "—"}`,
      "- Lowest-confidence items:",
      ...a.confidence.lowestConfidenceItems.map((i) => `  - [${i.table}#${i.id}] ${i.title} — ${i.explanation}`),
      "",
    );

    lines.push("### IQS breakdown", ...Object.entries(a.iqs.subScores).map(([k, v]) => `- ${k}: ${v}`), "");
  }

  return lines.join("\n");
}
