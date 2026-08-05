import { describe, expect, it } from "vitest";
import { computeIQS, type IQSInput } from "./iqs.js";

function baseInput(overrides: Partial<IQSInput> = {}): IQSInput {
  return {
    athleteId: 1,
    name: "Test Athlete",
    evidenceRecords: [],
    personalBest: null,
    seasonBest: null,
    contactCategories: [],
    intelItemCount: 0,
    timelineEventCount: 0,
    pastCompetitionsTotal: 0,
    pastCompetitionsWithResult: 0,
    hasPhoto: false,
    hasValidSocialHandle: false,
    ...overrides,
  };
}

describe("computeIQS", () => {
  it("scores a fully clean, well-populated athlete near the top of the range", () => {
    const result = computeIQS(
      baseInput({
        evidenceRecords: Array.from({ length: 10 }, () => ({
          sourceDomain: "worldathletics.org",
          sourceUrl: "https://worldathletics.org/athlete/1",
          confidence: 90,
        })),
        personalBest: "1:43.22",
        seasonBest: "1:44.50",
        contactCategories: ["coaching", "management"],
        intelItemCount: 10,
        timelineEventCount: 22,
        pastCompetitionsTotal: 5,
        pastCompetitionsWithResult: 5,
        hasPhoto: true,
        hasValidSocialHandle: true,
      }),
    );

    expect(result.subScores.evidenceValidity).toBe(25);
    expect(result.subScores.pbSbConsistency).toBe(10);
    expect(result.subScores.contactCoverage).toBe(15);
    expect(result.subScores.contentDensity).toBe(15);
    expect(result.subScores.competitionCompleteness).toBe(10);
    expect(result.subScores.presence).toBe(5);
    expect(result.total).toBeGreaterThan(90);
  });

  it("zeroes the PB/SB sub-score for the documented Peter Bol inversion", () => {
    const result = computeIQS(
      baseInput({ personalBest: "1:45.14", seasonBest: "1:43.64" }),
    );
    expect(result.subScores.pbSbConsistency).toBe(0);
    expect(result.detail.pbSbInverted).toBe(true);
  });

  it("scores evidence validity at 0 when every record is a citation-index leak", () => {
    const result = computeIQS(
      baseInput({
        evidenceRecords: [
          { sourceDomain: "source4", sourceUrl: null, confidence: 80 },
          { sourceDomain: "source6", sourceUrl: null, confidence: 80 },
        ],
      }),
    );
    expect(result.subScores.evidenceValidity).toBe(0);
    expect(result.detail.validEvidenceRecords).toBe(0);
    expect(result.detail.totalEvidenceRecords).toBe(2);
  });

  it("does not penalise validity when there is simply no evidence yet", () => {
    const result = computeIQS(baseInput());
    expect(result.subScores.evidenceValidity).toBe(25);
    expect(result.subScores.confidence).toBe(0);
  });

  it("caps contact coverage at 15 even with more than the two baseline categories", () => {
    const result = computeIQS(
      baseInput({ contactCategories: ["coaching", "management", "medical", "media"] }),
    );
    expect(result.subScores.contactCoverage).toBe(15);
  });

  it("gives 0% competition completeness for the documented Brook Macdonald case", () => {
    const result = computeIQS(
      baseInput({ pastCompetitionsTotal: 2, pastCompetitionsWithResult: 0 }),
    );
    expect(result.subScores.competitionCompleteness).toBe(0);
  });

  it("always returns a total between 0 and 100", () => {
    const worst = computeIQS(baseInput());
    const best = computeIQS(
      baseInput({
        evidenceRecords: Array.from({ length: 20 }, () => ({
          sourceDomain: "worldathletics.org",
          sourceUrl: "https://worldathletics.org/athlete/1",
          confidence: 97,
        })),
        personalBest: "1:43.22",
        seasonBest: "1:44.50",
        contactCategories: ["coaching", "management"],
        intelItemCount: 20,
        timelineEventCount: 30,
        pastCompetitionsTotal: 10,
        pastCompetitionsWithResult: 10,
        hasPhoto: true,
        hasValidSocialHandle: true,
      }),
    );
    expect(worst.total).toBeGreaterThanOrEqual(0);
    expect(best.total).toBeLessThanOrEqual(100);
  });
});
