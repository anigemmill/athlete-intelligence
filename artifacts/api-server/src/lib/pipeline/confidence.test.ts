import { describe, expect, it } from "vitest";
import {
  adjustForSourceTier,
  applyCorroborationBoost,
  applyRecencyDecay,
  computeAdjustedConfidence,
  isPerishableField,
  CONFIDENCE_FLOOR,
  CONFIDENCE_CEILING,
} from "./confidence.js";

describe("adjustForSourceTier", () => {
  it("boosts tier 1 sources by 5, capped at the ceiling", () => {
    expect(adjustForSourceTier(90, 1, true)).toBe(95);
    expect(adjustForSourceTier(95, 1, true)).toBe(CONFIDENCE_CEILING);
  });

  it("boosts tier 2 sources by 2", () => {
    expect(adjustForSourceTier(80, 2, true)).toBe(82);
  });

  it("leaves tier 3 sources unadjusted", () => {
    expect(adjustForSourceTier(80, 3, true)).toBe(80);
  });

  it("penalises tier 4 sources by 10, floored at the confidence floor", () => {
    expect(adjustForSourceTier(80, 4, true)).toBe(70);
    expect(adjustForSourceTier(45, 4, true)).toBe(CONFIDENCE_FLOOR);
  });

  it("applies an additional -5 when there is no source URL at all", () => {
    expect(adjustForSourceTier(80, 3, false)).toBe(75);
    expect(adjustForSourceTier(80, 1, false)).toBe(80); // +5 tier1, -5 no-url
  });
});

describe("applyCorroborationBoost", () => {
  it("adds 3 points when corroborated, capped at the ceiling", () => {
    expect(applyCorroborationBoost(80, true)).toBe(83);
    expect(applyCorroborationBoost(96, true)).toBe(CONFIDENCE_CEILING);
  });

  it("leaves confidence unchanged when not corroborated", () => {
    expect(applyCorroborationBoost(80, false)).toBe(80);
  });
});

describe("applyRecencyDecay", () => {
  it("does not decay non-perishable fields regardless of age", () => {
    expect(applyRecencyDecay(90, 100, false)).toBe(90);
  });

  it("does not decay perishable fields within the 14-day grace window", () => {
    expect(applyRecencyDecay(90, 14, true)).toBe(90);
    expect(applyRecencyDecay(90, 0, true)).toBe(90);
  });

  it("decays perishable fields by 1 point per day past the grace window", () => {
    expect(applyRecencyDecay(90, 15, true)).toBe(89);
    expect(applyRecencyDecay(90, 24, true)).toBe(80);
  });

  it("floors decay at the confidence floor", () => {
    expect(applyRecencyDecay(45, 60, true)).toBe(CONFIDENCE_FLOOR);
  });
});

describe("isPerishableField", () => {
  it("identifies the documented perishable fields", () => {
    expect(isPerishableField("worldRank")).toBe(true);
    expect(isPerishableField("seasonBest")).toBe(true);
    expect(isPerishableField("instagramFollowers")).toBe(true);
  });

  it("does not treat stable fields as perishable", () => {
    expect(isPerishableField("nationality")).toBe(false);
    expect(isPerishableField("personalBest")).toBe(false);
  });
});

describe("computeAdjustedConfidence", () => {
  it("chains tier adjustment, corroboration, and recency decay in order", () => {
    const result = computeAdjustedConfidence({
      baseConfidence: 85,
      tier: 1,
      hasSourceUrl: true,
      corroborated: true,
      fieldName: "worldRank",
      daysSinceLastRefresh: 20,
    });
    // 85 +5 (tier1) = 90, +3 (corroborated) = 93, -6 (6 days past the 14-day grace) = 87
    expect(result).toBe(87);
  });

  it("skips recency decay when no field name / refresh age is given", () => {
    const result = computeAdjustedConfidence({
      baseConfidence: 85,
      tier: 3,
      hasSourceUrl: true,
    });
    expect(result).toBe(85);
  });
});
