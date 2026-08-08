import { describe, expect, it } from "vitest";
import { buildResultsFacts, type CurrentAthleteStats, type RawResultsExtraction } from "./resultsAgentLogic.js";
import type { AgentContext } from "../types.js";

const athlete: AgentContext = { athleteId: 1, name: "Test Athlete", sport: "Athletics", event: "800m", nationality: "Australia" };

const emptyCurrent: CurrentAthleteStats = { worldRank: null, nationalRank: null, personalBest: null, seasonBest: null, lastCrawledAt: null };

function candidate(overrides: Partial<{ value: unknown; sourceDomain: unknown; sourceUrl: unknown; confidence: unknown; publishedAt: unknown; rawExcerpt: unknown }> = {}) {
  return {
    value: null,
    sourceDomain: "worldathletics.org",
    sourceUrl: "https://worldathletics.org/x",
    confidence: 90,
    publishedAt: null,
    rawExcerpt: "the passage",
    ...overrides,
  };
}

const now = new Date("2026-08-08T00:00:00Z");

describe("buildResultsFacts", () => {
  it("stores a clean world rank with a tier-1 source", () => {
    const extraction: RawResultsExtraction = { worldRank: candidate({ value: 12 }) };
    const result = buildResultsFacts(extraction, athlete, emptyCurrent, now);
    expect(result.columnUpdates.worldRank).toBe(12);
    expect(result.facts).toHaveLength(1);
    expect(result.facts[0].claim).toBe("worldRank");
    expect(result.droppedFields).toHaveLength(0);
  });

  it("drops both PB and SB when SB is faster than PB — the engineered inversion fixture (Peter Bol's exact documented bug)", () => {
    const extraction: RawResultsExtraction = {
      personalBest: candidate({ value: "1:45.14" }),
      seasonBest: candidate({ value: "1:43.64" }),
    };
    const result = buildResultsFacts(extraction, athlete, emptyCurrent, now);
    expect(result.columnUpdates.personalBest).toBeUndefined();
    expect(result.columnUpdates.seasonBest).toBeUndefined();
    expect(result.facts).toHaveLength(0);
    expect(result.droppedFields.some((d) => d.reason.includes("logically superior"))).toBe(true);
  });

  it("stores a consistent PB/SB pair", () => {
    const extraction: RawResultsExtraction = {
      personalBest: candidate({ value: "1:43.00" }),
      seasonBest: candidate({ value: "1:43.64" }),
    };
    const result = buildResultsFacts(extraction, athlete, emptyCurrent, now);
    expect(result.columnUpdates.personalBest).toBe("1:43.00");
    expect(result.columnUpdates.seasonBest).toBe("1:43.64");
  });

  it("drops a citation-index-leak source (Nick Willis's exact documented bug)", () => {
    const extraction: RawResultsExtraction = { worldRank: candidate({ value: 5, sourceDomain: "unknown", sourceUrl: "[8]" }) };
    const result = buildResultsFacts(extraction, athlete, emptyCurrent, now);
    expect(result.columnUpdates.worldRank).toBeUndefined();
    expect(result.droppedFields[0].reason).toMatch(/no traceable source/);
  });

  it("drops a citation-index-leak domain (Hamish Kerr's exact documented bug)", () => {
    const extraction: RawResultsExtraction = { nationalRank: candidate({ value: 3, sourceDomain: "source4", sourceUrl: null }) };
    const result = buildResultsFacts(extraction, athlete, emptyCurrent, now);
    expect(result.columnUpdates.nationalRank).toBeUndefined();
  });

  it("drops a bare unit-less mark rather than guessing its unit", () => {
    const extraction: RawResultsExtraction = { personalBest: candidate({ value: "8.95" }) };
    const result = buildResultsFacts(extraction, athlete, emptyCurrent, now);
    expect(result.columnUpdates.personalBest).toBeUndefined();
    expect(result.droppedFields[0].reason).toMatch(/does not parse/);
  });

  it("drops a mark whose direction is inconsistent with the athlete's declared event", () => {
    const jumper: AgentContext = { ...athlete, event: "Long Jump" };
    const extraction: RawResultsExtraction = { personalBest: candidate({ value: "1:43.00" }) }; // a time, for a jumper
    const result = buildResultsFacts(extraction, jumper, emptyCurrent, now);
    expect(result.columnUpdates.personalBest).toBeUndefined();
    expect(result.droppedFields[0].reason).toMatch(/inconsistent with the athlete's declared event/);
  });

  it("does not guess when the event string is too generic to check direction", () => {
    const generic: AgentContext = { ...athlete, event: "" };
    const extraction: RawResultsExtraction = { personalBest: candidate({ value: "8.95m" }) };
    const result = buildResultsFacts(extraction, generic, emptyCurrent, now);
    expect(result.columnUpdates.personalBest).toBe("8.95m");
  });

  it("drops a candidate below the emission confidence floor", () => {
    const extraction: RawResultsExtraction = { worldRank: candidate({ value: 12, confidence: 50 }) };
    const result = buildResultsFacts(extraction, athlete, emptyCurrent, now);
    expect(result.columnUpdates.worldRank).toBeUndefined();
    expect(result.droppedFields[0].reason).toMatch(/emission floor/);
  });

  it("withholds a new, uncorroborated PB that is numerically better than the current stored PB (Tier 3 gate)", () => {
    const current: CurrentAthleteStats = { ...emptyCurrent, personalBest: "1:44.00" };
    const extraction: RawResultsExtraction = { personalBest: candidate({ value: "1:43.50" }) }; // faster = new PB
    const result = buildResultsFacts(extraction, athlete, current, now);
    expect(result.columnUpdates.personalBest).toBeUndefined();
    expect(result.droppedFields[0].reason).toMatch(/Tier 3/);
  });

  it("stores a restated PB that matches (or is not better than) the current stored PB", () => {
    const current: CurrentAthleteStats = { ...emptyCurrent, personalBest: "1:44.00" };
    const extraction: RawResultsExtraction = { personalBest: candidate({ value: "1:44.00" }) };
    const result = buildResultsFacts(extraction, athlete, current, now);
    expect(result.columnUpdates.personalBest).toBe("1:44.00");
  });

  it("treats a first-ever discovery (no current PB on file) as storable, not a withheld new-PB claim", () => {
    const extraction: RawResultsExtraction = { personalBest: candidate({ value: "1:43.50" }) };
    const result = buildResultsFacts(extraction, athlete, emptyCurrent, now);
    expect(result.columnUpdates.personalBest).toBe("1:43.50");
  });

  it("computes worldRankDelta as previous minus new (positive = improved), matching the frontend's rendering convention", () => {
    const current: CurrentAthleteStats = { ...emptyCurrent, worldRank: 10 };
    const extraction: RawResultsExtraction = { worldRank: candidate({ value: 4 }) };
    const result = buildResultsFacts(extraction, athlete, current, now);
    expect(result.worldRankDelta).toBe(6);
  });

  it("defaults worldRankDelta to 0 when there is no previous value to compare against", () => {
    const extraction: RawResultsExtraction = { worldRank: candidate({ value: 4 }) };
    const result = buildResultsFacts(extraction, athlete, emptyCurrent, now);
    expect(result.worldRankDelta).toBe(0);
  });

  it("returns nothing when the extraction is entirely empty", () => {
    const result = buildResultsFacts({}, athlete, emptyCurrent, now);
    expect(result.facts).toHaveLength(0);
    expect(Object.keys(result.columnUpdates)).toHaveLength(0);
    expect(result.worldRankDelta).toBe(0);
  });
});
