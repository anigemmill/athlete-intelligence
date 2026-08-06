import { describe, expect, it } from "vitest";
import {
  buildIdentitySection,
  buildResultsSection,
  buildCompetitionsSection,
  buildTimelineSection,
  buildIntelligenceSection,
  buildContactsSection,
  buildSocialSection,
  deriveAthleteAssessment,
  buildOverallAssessment,
  renderMarkdownReport,
  type AthleteAuditReport,
} from "./auditReport.js";
import type { Athlete, IntelligenceItem, TimelineEvent, Contact, Competition } from "@workspace/db";

function makeAthlete(overrides: Partial<Athlete> = {}): Athlete {
  return {
    id: 1, name: "Test Athlete", sport: "Athletics", event: "800m", nationality: "New Zealand",
    age: 28, squad: "", worldRank: null, worldRankDelta: 0, nationalRank: null,
    personalBest: null, seasonBest: null,
    instagramHandle: null, instagramFollowers: 0, instagramEngagement: 0,
    twitterHandle: null, twitterFollowers: 0,
    tiktokHandle: null, tiktokFollowers: 0,
    followerGrowth30d: 0, avgEngagement: 0,
    agentStatus: "active", lastCrawledAt: null, intelligenceCount: 0, hasNewIntelligence: false,
    avatarUrl: null, aiSummary: null, aiSummaryGeneratedAt: null,
    createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  } as Athlete;
}

function makeIntelItem(overrides: Partial<IntelligenceItem> = {}): IntelligenceItem {
  return {
    id: 1, athleteId: 1, athleteName: "Test Athlete", category: "results_rankings",
    title: "Item", summary: null, sourceDomain: "stuff.co.nz", sourceUrl: null,
    confidence: 80, publishedAt: new Date(), discoveredAt: new Date(),
    ...overrides,
  } as IntelligenceItem;
}

function makeTimelineEvent(overrides: Partial<TimelineEvent> = {}): TimelineEvent {
  return {
    id: 1, athleteId: 1, date: "2024-01-01", category: "competition", title: "Event",
    description: null, location: null, sourceDomain: "stuff.co.nz", sourceUrl: null,
    confidence: 85, significant: false,
    ...overrides,
  } as TimelineEvent;
}

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: 1, athleteId: 1, role: "Head Coach", category: "coaching", name: "A Coach", org: "A Federation",
    orgType: null, status: "verified", confidence: 80, publicEmail: null, website: null, note: null,
    lastVerified: "2024-01-01", dateDiscovered: "2024-01-01", sourceDomain: "stuff.co.nz", sourceExcerpt: null,
    ...overrides,
  } as Contact;
}

function makeCompetition(overrides: Partial<Competition> = {}): Competition {
  return {
    id: 1, athleteId: 1, athleteName: "Test Athlete", meetName: "World Championships",
    event: "800m", location: null, date: "2024-01-01", tier: "A", status: "completed",
    result: "1st", createdAt: new Date(),
    ...overrides,
  } as Competition;
}

describe("buildIdentitySection", () => {
  it("reports presence for every identity field and flags the discovery-confidence gap", () => {
    const section = buildIdentitySection(makeAthlete());
    expect(section.fieldsPresent).toEqual({ name: true, nationality: true, sport: true, event: true });
    expect(section.notes.some((n) => n.includes("Discovery confidence"))).toBe(true);
  });
});

describe("buildResultsSection", () => {
  it("flags the documented Peter Bol inversion", () => {
    const section = buildResultsSection(makeAthlete({ personalBest: "1:45.14", seasonBest: "1:43.64" }));
    expect(section.pbSbInverted).toBe(true);
  });

  it("returns null when either mark is missing, not a false negative", () => {
    const section = buildResultsSection(makeAthlete({ personalBest: null, seasonBest: "1:43.64" }));
    expect(section.pbSbInverted).toBeNull();
  });
});

describe("buildCompetitionsSection", () => {
  const today = "2024-06-01";

  it("computes result completeness only over past competitions", () => {
    const comps = [
      makeCompetition({ id: 1, date: "2024-01-01", status: "completed", result: "1st" }),
      makeCompetition({ id: 2, date: "2024-02-01", status: "completed", result: null }),
      makeCompetition({ id: 3, date: "2024-12-01", status: "upcoming", result: null }), // future, excluded
    ];
    const section = buildCompetitionsSection(comps, today);
    expect(section.pastWithResult).toBe(1);
    expect(section.pastWithoutResult).toBe(1);
    expect(section.resultCompletenessPct).toBe(50);
  });

  it("flags a generic meet name and accepts a specific one", () => {
    const comps = [
      makeCompetition({ id: 1, meetName: "2024 Competition" }),
      makeCompetition({ id: 2, meetName: "UCI Mountain Bike World Cup Round 2" }),
    ];
    const section = buildCompetitionsSection(comps, today);
    expect(section.genericMeetNames).toEqual(["2024 Competition"]);
  });

  it("detects duplicate competitions by meetName+date", () => {
    const comps = [
      makeCompetition({ id: 1, meetName: "World Championships", date: "2024-01-01" }),
      makeCompetition({ id: 2, meetName: "World Championships", date: "2024-01-01" }),
    ];
    const section = buildCompetitionsSection(comps, today);
    expect(section.duplicates).toHaveLength(1);
    expect(section.duplicates[0].count).toBe(2);
  });

  it("flags a competition still marked upcoming after its date has passed", () => {
    const comps = [makeCompetition({ id: 1, date: "2024-01-01", status: "upcoming" })];
    const section = buildCompetitionsSection(comps, today);
    expect(section.staleUpcoming).toHaveLength(1);
  });
});

describe("buildTimelineSection", () => {
  it("reports sparse for fewer than 5 events, including zero", () => {
    expect(buildTimelineSection([]).sparseFlag).toBe(true);
    expect(buildTimelineSection([makeTimelineEvent()]).sparseFlag).toBe(true);
  });

  it("finds earliest/latest and the largest gap across sorted events", () => {
    const events = [
      makeTimelineEvent({ id: 1, date: "2020-01-01", title: "A" }),
      makeTimelineEvent({ id: 2, date: "2020-01-10", title: "B" }),
      makeTimelineEvent({ id: 3, date: "2024-01-01", title: "C" }),
    ];
    const section = buildTimelineSection(events);
    expect(section.earliestDate).toBe("2020-01-01");
    expect(section.latestDate).toBe("2024-01-01");
    expect(section.largestGapDays).toBeGreaterThan(1000);
  });

  it("detects duplicate events by date+title", () => {
    const events = [
      makeTimelineEvent({ id: 1, date: "2024-01-01", title: "Debut" }),
      makeTimelineEvent({ id: 2, date: "2024-01-01", title: "Debut" }),
    ];
    expect(buildTimelineSection(events).duplicates).toHaveLength(1);
  });
});

describe("buildIntelligenceSection", () => {
  it("lists every documented category as zero-coverage when there are no items", () => {
    const section = buildIntelligenceSection([]);
    expect(section.zeroCategories.sort()).toEqual(["career_changes", "media_interviews", "results_rankings", "sponsorships"].sort());
  });

  it("counts items below the emission confidence floor", () => {
    const items = [makeIntelItem({ confidence: 90 }), makeIntelItem({ id: 2, confidence: 50 })];
    expect(buildIntelligenceSection(items).lowConfidenceCount).toBe(1);
  });
});

describe("buildContactsSection", () => {
  it("detects coach and manager presence independently", () => {
    const contacts = [makeContact({ category: "coaching" })];
    const section = buildContactsSection(contacts, []);
    expect(section.hasCoach).toBe(true);
    expect(section.hasManagerOrAgent).toBe(false);
  });

  it("flags the naming-inconsistency gap when sponsor coverage is entirely absent", () => {
    const section = buildContactsSection([], []);
    expect(section.notes.some((n) => n.includes("naming inconsistency"))).toBe(true);
  });

  it("credits sponsor coverage found via the intelligence feed even without a sponsor contact", () => {
    const section = buildContactsSection([], [makeIntelItem({ category: "sponsorships" })]);
    expect(section.hasSponsorContact).toBe(false);
    expect(section.sponsorMentionsInIntelligence).toBe(1);
    expect(section.notes.some((n) => n.includes("intelligence feed"))).toBe(true);
  });
});

describe("buildSocialSection", () => {
  it("flags Facebook/LinkedIn/YouTube as structurally unauditable", () => {
    const section = buildSocialSection(makeAthlete());
    expect(section.notes.some((n) => n.includes("Facebook, LinkedIn, and YouTube"))).toBe(true);
  });

  it("checks handle format per platform", () => {
    const section = buildSocialSection(makeAthlete({ instagramHandle: "valid.handle", twitterHandle: "this handle has spaces" }));
    expect(section.instagram.validFormat).toBe(true);
    expect(section.twitter.validFormat).toBe(false);
  });
});

describe("buildOverallAssessment", () => {
  function makeFullReport(overrides: Partial<AthleteAuditReport> = {}): AthleteAuditReport {
    return {
      athleteId: 1, name: "Test",
      identity: buildIdentitySection(makeAthlete()),
      results: buildResultsSection(makeAthlete()),
      competitions: buildCompetitionsSection([], "2024-01-01"),
      timeline: buildTimelineSection([]),
      intelligence: buildIntelligenceSection([]),
      contacts: buildContactsSection([], []),
      social: buildSocialSection(makeAthlete()),
      images: { avatarUrl: null, live: null, freshnessBasisIso: null, licensingNote: "n/a" },
      sources: { totalEvidenceRecords: 0, citationIndexLeaksFound: 0, placeholderDomainsFound: 0, distinctDomains: 0, duplicateDomainConcentration: [], deadLinks: [], liveLinksChecked: 0 },
      confidence: { distribution: { under65: 0, from65to79: 0, from80to89: 0, from90to97: 0 }, average: null, lowestConfidenceItems: [] },
      iqs: { athleteId: 1, name: "Test", total: 50, subScores: { evidenceValidity: 25, confidence: 0, pbSbConsistency: 10, contactCoverage: 0, contentDensity: 0, competitionCompleteness: 0, presence: 0 }, detail: { totalEvidenceRecords: 0, validEvidenceRecords: 0, averageConfidence: null, pbSbInverted: null } },
      strengths: [], weaknesses: [], improvementNotes: [],
      ...overrides,
    };
  }

  it("attributes remaining issues to specific future milestones, never to Milestone 2 itself", () => {
    const athletes = [makeFullReport()]; // zero contacts, zero intel -> triggers gaps
    const overall = buildOverallAssessment(athletes, null);
    expect(overall.remainingIssues.length).toBeGreaterThan(0);
    expect(overall.milestone2FixableIssues[0]).toContain("None of the remaining issues above are fixed by Milestone 2 itself");
    expect(overall.milestone2FixableIssues.some((s) => s.includes("Milestone 5"))).toBe(true);
  });

  it("computes a delta against a previous run when one is supplied", () => {
    const overall = buildOverallAssessment([makeFullReport()], { id: 3, overallIqs: 40 });
    expect(overall.previousRunComparison?.delta).toBe(overall.overallIqs - 40);
  });
});

describe("renderMarkdownReport", () => {
  it("produces non-empty markdown containing the athlete name and IQS", () => {
    const athlete: AthleteAuditReport = {
      athleteId: 1, name: "Zoe Hobbs",
      identity: buildIdentitySection(makeAthlete({ name: "Zoe Hobbs" })),
      results: buildResultsSection(makeAthlete()),
      competitions: buildCompetitionsSection([], "2024-01-01"),
      timeline: buildTimelineSection([]),
      intelligence: buildIntelligenceSection([]),
      contacts: buildContactsSection([], []),
      social: buildSocialSection(makeAthlete()),
      images: { avatarUrl: null, live: null, freshnessBasisIso: null, licensingNote: "n/a" },
      sources: { totalEvidenceRecords: 0, citationIndexLeaksFound: 0, placeholderDomainsFound: 0, distinctDomains: 0, duplicateDomainConcentration: [], deadLinks: [], liveLinksChecked: 0 },
      confidence: { distribution: { under65: 0, from65to79: 0, from80to89: 0, from90to97: 0 }, average: null, lowestConfidenceItems: [] },
      iqs: { athleteId: 1, name: "Zoe Hobbs", total: 58, subScores: { evidenceValidity: 25, confidence: 15, pbSbConsistency: 10, contactCoverage: 0, contentDensity: 8, competitionCompleteness: 0, presence: 0 }, detail: { totalEvidenceRecords: 0, validEvidenceRecords: 0, averageConfidence: null, pbSbInverted: null } },
      strengths: [], weaknesses: [], improvementNotes: [],
    };
    const overall = buildOverallAssessment([athlete], null);
    const markdown = renderMarkdownReport({ athletes: [athlete], overall }, "2024-01-01T00:00:00.000Z");
    expect(markdown).toContain("Zoe Hobbs");
    expect(markdown).toContain("IQS 58/100");
    expect(markdown).toContain("# Intelligence Audit Report");
  });
});
