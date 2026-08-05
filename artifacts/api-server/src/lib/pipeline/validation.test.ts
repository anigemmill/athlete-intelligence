import { describe, expect, it } from "vitest";
import {
  isCitationIndexUrl,
  isCitationIndexDomain,
  sanitizeSourceUrl,
  sanitizeSourceDomain,
  isValidDate,
  parseMark,
  isSeasonBestBetterThanPersonalBest,
  isQualityMeetName,
  isValidHandle,
} from "./validation.js";

describe("citation-index leak detection (docs/technical-debt.md Priority 1)", () => {
  it("flags Nick Willis's real documented source_url values", () => {
    for (const bad of ["[8]", "[7]", "[10]", "[5]", "[3]"]) {
      expect(isCitationIndexUrl(bad)).toBe(true);
    }
  });

  it("flags Hamish Kerr's real documented source_domain values", () => {
    for (const bad of ["source4", "source6", "source9"]) {
      expect(isCitationIndexDomain(bad)).toBe(true);
    }
  });

  it("does not flag a real URL or domain", () => {
    expect(isCitationIndexUrl("https://worldathletics.org/athlete/123")).toBe(false);
    expect(isCitationIndexDomain("worldathletics.org")).toBe(false);
  });

  it("flags a domain with no dot at all", () => {
    expect(isCitationIndexDomain("espn")).toBe(true);
  });
});

describe("sanitizeSourceUrl", () => {
  it("nulls out citation-index leaks", () => {
    expect(sanitizeSourceUrl("[8]")).toBeNull();
  });

  it("nulls out non-URL strings", () => {
    expect(sanitizeSourceUrl("not a url")).toBeNull();
    expect(sanitizeSourceUrl("")).toBeNull();
  });

  it("nulls out non-string values without throwing", () => {
    expect(sanitizeSourceUrl(undefined)).toBeNull();
    expect(sanitizeSourceUrl(42)).toBeNull();
  });

  it("keeps a well-formed https URL", () => {
    expect(sanitizeSourceUrl("https://bbc.co.uk/sport/article")).toBe("https://bbc.co.uk/sport/article");
  });
});

describe("sanitizeSourceDomain", () => {
  it("nulls out 'unknown' and citation-index leaks", () => {
    expect(sanitizeSourceDomain("unknown")).toBeNull();
    expect(sanitizeSourceDomain("source4")).toBeNull();
  });

  it("lowercases and strips a leading www.", () => {
    expect(sanitizeSourceDomain("WWW.BBC.co.uk")).toBe("bbc.co.uk");
  });
});

describe("isValidDate", () => {
  it("accepts a calendar-valid ISO date", () => {
    expect(isValidDate("2024-03-15")).toBe(true);
  });

  it("rejects a calendar-invalid date matching the pattern", () => {
    expect(isValidDate("2019-13-45")).toBe(false);
  });

  it("rejects non-string and malformed values", () => {
    expect(isValidDate(20240315)).toBe(false);
    expect(isValidDate("15/03/2024")).toBe(false);
  });
});

describe("parseMark", () => {
  it("parses an mm:ss.xx time as seconds, lower-better", () => {
    expect(parseMark("1:43.22")).toEqual({ comparableValue: 103.22, direction: "lower-better" });
  });

  it("parses bare seconds with an 's' suffix, lower-better", () => {
    expect(parseMark("9.87s")).toEqual({ comparableValue: 9.87, direction: "lower-better" });
  });

  it("parses a metres distance, higher-better", () => {
    expect(parseMark("8.95m")).toEqual({ comparableValue: 8.95, direction: "higher-better" });
  });

  it("parses a kg weight (with trailing text), higher-better", () => {
    expect(parseMark("148kg snatch")).toEqual({ comparableValue: 148, direction: "higher-better" });
  });

  it("refuses to guess a unit-less bare number", () => {
    expect(parseMark("8.95")).toBeNull();
  });

  it("returns null for nonsense input", () => {
    expect(parseMark("DNF")).toBeNull();
  });
});

describe("isSeasonBestBetterThanPersonalBest (docs/technical-debt.md Priority 2)", () => {
  it("catches the documented Peter Bol inversion (time-based event)", () => {
    // personal_best "1:45.14", season_best "1:43.64" — SB is 1.5s faster,
    // i.e. numerically lower, i.e. logically superior for an 800m time.
    expect(isSeasonBestBetterThanPersonalBest("1:45.14", "1:43.64")).toBe(true);
  });

  it("does not flag a consistent time-based pair", () => {
    expect(isSeasonBestBetterThanPersonalBest("1:43.22", "1:44.50")).toBe(false);
  });

  it("catches an inverted distance-based pair (higher-better)", () => {
    expect(isSeasonBestBetterThanPersonalBest("8.50m", "8.95m")).toBe(true);
  });

  it("does not flag a consistent distance-based pair", () => {
    expect(isSeasonBestBetterThanPersonalBest("8.95m", "8.50m")).toBe(false);
  });

  it("returns null when either value can't be parsed", () => {
    expect(isSeasonBestBetterThanPersonalBest("unknown", "9.87s")).toBeNull();
  });

  it("returns null when the two values use incompatible formats", () => {
    expect(isSeasonBestBetterThanPersonalBest("1:43.22", "8.95m")).toBeNull();
  });
});

describe("isQualityMeetName (docs/technical-debt.md Priority 5)", () => {
  it("rejects the documented failing case: a year plus generic filler only", () => {
    expect(isQualityMeetName("2024 Competition")).toBe(false);
  });

  it("rejects other generic-filler-only names, with or without a year", () => {
    expect(isQualityMeetName("The Competition")).toBe(false);
    expect(isQualityMeetName("2025 Race")).toBe(false);
  });

  it("accepts a genuinely specific name", () => {
    expect(isQualityMeetName("UCI Mountain Bike World Cup Round 2")).toBe(true);
  });

  it("accepts a named championship without needing a year", () => {
    expect(isQualityMeetName("World Championships")).toBe(true);
  });

  it("rejects names under 8 characters", () => {
    expect(isQualityMeetName("2024 5k")).toBe(false);
  });
});

describe("isValidHandle", () => {
  it("accepts a well-formed instagram handle, with or without a leading @", () => {
    expect(isValidHandle("zoe.hobbs", "instagram")).toBe(true);
    expect(isValidHandle("@zoe.hobbs", "instagram")).toBe(true);
  });

  it("rejects a handle with a leading or trailing period", () => {
    expect(isValidHandle(".zoehobbs", "instagram")).toBe(false);
    expect(isValidHandle("zoehobbs.", "instagram")).toBe(false);
  });

  it("enforces the shorter X/Twitter length limit", () => {
    expect(isValidHandle("a".repeat(15), "twitter")).toBe(true);
    expect(isValidHandle("a".repeat(16), "twitter")).toBe(false);
  });

  it("rejects a value that is actually a sentence fragment", () => {
    expect(isValidHandle("the athlete's official page", "instagram")).toBe(false);
  });
});
