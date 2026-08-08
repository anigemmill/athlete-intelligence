import { describe, expect, it } from "vitest";
import { assertNoOwnershipOverlap, type DomainOwnership } from "./agentOwnership.js";

function entry(flagName: string, ownedColumns: string[]): DomainOwnership {
  return { flagName, legacySkipKey: "results", ownedColumns };
}

describe("assertNoOwnershipOverlap", () => {
  it("does not throw for disjoint ownership", () => {
    expect(() =>
      assertNoOwnershipOverlap([
        entry("results", ["athletes.world_rank", "athletes.personal_best"]),
        entry("competitions", ["competitions"]),
      ]),
    ).not.toThrow();
  });

  it("does not throw for an empty registry", () => {
    expect(() => assertNoOwnershipOverlap([])).not.toThrow();
  });

  it("throws when two different agents claim the same column", () => {
    expect(() =>
      assertNoOwnershipOverlap([
        entry("results", ["athletes.world_rank"]),
        entry("legacy_results_typo", ["athletes.world_rank"]),
      ]),
    ).toThrow(/claimed by both/);
  });

  it("does not throw when the same agent lists a column more than once", () => {
    expect(() =>
      assertNoOwnershipOverlap([entry("results", ["athletes.world_rank", "athletes.world_rank"])]),
    ).not.toThrow();
  });
});
