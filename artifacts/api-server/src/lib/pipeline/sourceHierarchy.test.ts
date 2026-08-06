import { describe, expect, it } from "vitest";
import { getSourceTier, mapIntelligenceCategoryToFactDomain, mapTimelineCategoryToFactDomain } from "./sourceHierarchy.js";

describe("getSourceTier", () => {
  it("resolves governing bodies as tier 1 for results_rankings", () => {
    expect(getSourceTier("results_rankings", "worldathletics.org")).toBe(1);
  });

  it("resolves verified media as tier 2 for results_rankings", () => {
    expect(getSourceTier("results_rankings", "bbc.co.uk")).toBe(2);
  });

  it("resolves an unlisted domain as tier 3", () => {
    expect(getSourceTier("results_rankings", "stuff.co.nz")).toBe(3);
  });

  it("resolves social platforms as tier 4 for results_rankings", () => {
    expect(getSourceTier("results_rankings", "instagram.com")).toBe(4);
  });

  it("resolves 'unknown' as tier 4 for any fact domain", () => {
    expect(getSourceTier("results_rankings", "unknown")).toBe(4);
    expect(getSourceTier("social", "unknown")).toBe(4);
  });

  it("resolves a domain with no dot as tier 4", () => {
    expect(getSourceTier("contacts", "espn")).toBe(4);
  });

  it("inverts for the social fact domain — a platform's own page is tier 1, not tier 4", () => {
    expect(getSourceTier("social", "instagram.com")).toBe(1);
    // Instagram is tier 4 for a results claim but tier 1 for a social claim —
    // this is the entire reason per-fact-domain tables exist (§6).
    expect(getSourceTier("results_rankings", "instagram.com")).toBe(4);
  });

  it("treats wikipedia.org differently across fact domains", () => {
    expect(getSourceTier("photo", "wikipedia.org")).toBe(2);
    expect(getSourceTier("results_rankings", "wikipedia.org")).toBe(4);
    expect(getSourceTier("identity_biography", "wikipedia.org")).toBe(3); // unlisted -> no adjustment
  });

  it("normalises a leading www. and mixed case before lookup", () => {
    expect(getSourceTier("results_rankings", "WWW.BBC.co.uk")).toBe(2);
  });
});

describe("mapIntelligenceCategoryToFactDomain", () => {
  it("maps every documented category", () => {
    expect(mapIntelligenceCategoryToFactDomain("results_rankings")).toBe("results_rankings");
    expect(mapIntelligenceCategoryToFactDomain("media_interviews")).toBe("sponsorship_media");
    expect(mapIntelligenceCategoryToFactDomain("sponsorships")).toBe("sponsorship_media");
    expect(mapIntelligenceCategoryToFactDomain("career_changes")).toBe("identity_biography");
  });

  it("falls back to results_rankings for an unrecognised category", () => {
    expect(mapIntelligenceCategoryToFactDomain("something_else")).toBe("results_rankings");
  });
});

describe("mapTimelineCategoryToFactDomain", () => {
  it("maps every documented category", () => {
    expect(mapTimelineCategoryToFactDomain("competition")).toBe("results_rankings");
    expect(mapTimelineCategoryToFactDomain("media")).toBe("sponsorship_media");
    expect(mapTimelineCategoryToFactDomain("sponsorship")).toBe("sponsorship_media");
    expect(mapTimelineCategoryToFactDomain("career")).toBe("identity_biography");
    expect(mapTimelineCategoryToFactDomain("personal")).toBe("identity_biography");
  });

  it("falls back to results_rankings for an unrecognised category", () => {
    expect(mapTimelineCategoryToFactDomain("something_else")).toBe("results_rankings");
  });
});
