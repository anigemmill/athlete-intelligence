/**
 * Milestone 1 demonstration (docs/task-27-implementation-roadmap.md).
 *
 * Feeds the *exact* documented bad-data shapes from docs/technical-debt.md
 * — Nick Willis's citation-index source URLs, Hamish Kerr's citation-index
 * source domains, Peter Bol's inverted PB/SB pair, plus a malformed-URL
 * case for Priority 7 — through the real, unmodified `autoPopulateAthlete`
 * write path, against a real database. This is not a unit test of
 * validation.ts in isolation (that's confidence.test.ts / validation.test.ts
 * from Milestone 0) — it proves the *wiring*: that auto-populate.ts itself,
 * as it exists after Milestone 1, actually calls that sanitisation before
 * a row reaches the database.
 *
 * Requires a real DATABASE_URL (skipped otherwise — this is an integration
 * test, not a unit test, and CI/local runs without a provisioned database
 * should not fail because of it). The OpenAI/OpenRouter clients and the
 * Wikipedia photo lookup are mocked — this test is about what
 * auto-populate.ts does with a model's response, not about the model
 * itself or live network calls.
 */

import { describe, it, expect, vi } from "vitest";

const hasDb = !!process.env.DATABASE_URL;

function mockExtractionResponse(data: Record<string, unknown>) {
  return { choices: [{ message: { content: JSON.stringify(data) } }] };
}

function mockResearchResponse(research = "Placeholder research text.", citations: string[] = []) {
  return { choices: [{ message: { content: research } }], citations };
}

describe("auto-populate.ts Milestone 1 — historical bug regression (integration)", () => {
  it.skipIf(!hasDb)(
    "prevents the documented Nick Willis citation-index leak and a malformed URL (Priorities 1 & 7)",
    async () => {
      vi.resetModules();
      vi.doMock("@workspace/integrations-openai-ai-server", () => ({
        openai: {
          chat: {
            completions: {
              create: vi.fn().mockResolvedValue(
                mockExtractionResponse({
                  athlete_stats: {},
                  intelligence_items: [
                    { category: "results_rankings", title: "Item A", sourceDomain: "stuff.co.nz", sourceUrl: "[8]", confidence: 85, publishedAt: "2024-01-01" },
                    { category: "results_rankings", title: "Item B", sourceDomain: "stuff.co.nz", sourceUrl: "[7]", confidence: 85, publishedAt: "2024-02-01" },
                    { category: "media_interviews", title: "Item C", sourceDomain: "stuff.co.nz", sourceUrl: "[10]", confidence: 85, publishedAt: "2024-03-01" },
                    { category: "career_changes", title: "Item D", sourceDomain: "stuff.co.nz", sourceUrl: "[5]", confidence: 85, publishedAt: "2024-04-01" },
                    // Priority 7 case: not a citation-index leak, just not a real URL at all.
                    { category: "results_rankings", title: "Item E", sourceDomain: "stuff.co.nz", sourceUrl: "www.stuff.co.nz/article-without-scheme", confidence: 85, publishedAt: "2024-05-01" },
                  ],
                  timeline_events: [],
                  contacts: [],
                  competitions: [],
                }),
              ),
            },
          },
        },
      }));
      vi.doMock("@workspace/integrations-openrouter-ai", () => ({
        openrouter: { chat: { completions: { create: vi.fn().mockResolvedValue(mockResearchResponse()) } } },
      }));
      vi.doMock("./photo-lookup.js", () => ({ fetchWikipediaPhoto: vi.fn().mockResolvedValue(null) }));

      const { autoPopulateAthlete } = await import("./auto-populate.js");
      const { db, athletesTable, intelligenceItemsTable } = await import("@workspace/db");
      const { eq } = await import("drizzle-orm");

      const [athlete] = await db.select().from(athletesTable).where(eq(athletesTable.name, "Nick Willis"));
      expect(athlete, "Nick Willis must already exist in the target database").toBeDefined();

      // Mirror repopulateAthlete's wipe step so this run's rows are the only
      // ones present for the assertion below — deterministic, not timing-dependent.
      await db.delete(intelligenceItemsTable).where(eq(intelligenceItemsTable.athleteId, athlete.id));

      await autoPopulateAthlete({
        id: athlete.id,
        name: athlete.name,
        sport: athlete.sport,
        event: athlete.event,
        nationality: athlete.nationality,
        age: athlete.age,
      });

      const rows = await db.select().from(intelligenceItemsTable).where(eq(intelligenceItemsTable.athleteId, athlete.id));
      expect(rows.length).toBe(5);

      for (const row of rows) {
        // A citation-index leak or a malformed URL is nulled, not stored —
        // so the only valid states here are "no URL at all" or "a real
        // https(s) URL". Either way, nothing citation-index-shaped survives.
        if (row.sourceUrl !== null) {
          expect(row.sourceUrl).not.toMatch(/^\[\d+\]$/); // Priority 1
          expect(row.sourceUrl).toMatch(/^https?:\/\//); // Priority 7
        }
      }
      // Item E's malformed URL specifically must have been nulled, not stored.
      const itemE = rows.find((r) => r.title === "Item E");
      expect(itemE?.sourceUrl).toBeNull();
    },
  );

  it.skipIf(!hasDb)(
    "prevents the documented Hamish Kerr citation-index domain leak (Priority 1)",
    async () => {
      vi.resetModules();
      vi.doMock("@workspace/integrations-openai-ai-server", () => ({
        openai: {
          chat: {
            completions: {
              create: vi.fn().mockResolvedValue(
                mockExtractionResponse({
                  athlete_stats: {},
                  intelligence_items: Array.from({ length: 11 }, (_, i) => ({
                    category: "results_rankings",
                    title: `Item ${i + 1}`,
                    sourceDomain: ["source4", "source6", "source9"][i % 3],
                    sourceUrl: null,
                    confidence: 85,
                    publishedAt: "2024-01-01",
                  })),
                  timeline_events: [],
                  contacts: [],
                  competitions: [],
                }),
              ),
            },
          },
        },
      }));
      vi.doMock("@workspace/integrations-openrouter-ai", () => ({
        openrouter: { chat: { completions: { create: vi.fn().mockResolvedValue(mockResearchResponse()) } } },
      }));
      vi.doMock("./photo-lookup.js", () => ({ fetchWikipediaPhoto: vi.fn().mockResolvedValue(null) }));

      const { autoPopulateAthlete } = await import("./auto-populate.js");
      const { db, athletesTable, intelligenceItemsTable } = await import("@workspace/db");
      const { eq } = await import("drizzle-orm");

      const [athlete] = await db.select().from(athletesTable).where(eq(athletesTable.name, "Hamish Kerr"));
      expect(athlete, "Hamish Kerr must already exist in the target database").toBeDefined();

      await db.delete(intelligenceItemsTable).where(eq(intelligenceItemsTable.athleteId, athlete.id));

      await autoPopulateAthlete({
        id: athlete.id,
        name: athlete.name,
        sport: athlete.sport,
        event: athlete.event,
        nationality: athlete.nationality,
        age: athlete.age,
      });

      const rows = await db.select().from(intelligenceItemsTable).where(eq(intelligenceItemsTable.athleteId, athlete.id));
      expect(rows.length).toBe(11);

      for (const row of rows) {
        expect(row.sourceDomain).not.toMatch(/^source\d+$/);
        // Every stored domain is either a real dotted domain or the honest "unknown" sentinel.
        expect(row.sourceDomain === "unknown" || row.sourceDomain.includes(".")).toBe(true);
        // A leaked domain is tier 4 -> -10 penalty (plus -5 for no URL) from the base confidence of 85.
        expect(row.confidence).toBeLessThanOrEqual(85 - 10 - 5);
      }
    },
  );

  it.skipIf(!hasDb)(
    "prevents the documented Peter Bol PB/SB inversion (Priority 2)",
    async () => {
      vi.resetModules();
      vi.doMock("@workspace/integrations-openai-ai-server", () => ({
        openai: {
          chat: {
            completions: {
              create: vi.fn().mockResolvedValue(
                mockExtractionResponse({
                  athlete_stats: {
                    worldRank: 45,
                    worldRankDelta: 0,
                    nationalRank: 3,
                    personalBest: "1:45.14",
                    seasonBest: "1:43.64",
                  },
                  intelligence_items: [],
                  timeline_events: [],
                  contacts: [],
                  competitions: [],
                }),
              ),
            },
          },
        },
      }));
      vi.doMock("@workspace/integrations-openrouter-ai", () => ({
        openrouter: { chat: { completions: { create: vi.fn().mockResolvedValue(mockResearchResponse()) } } },
      }));
      vi.doMock("./photo-lookup.js", () => ({ fetchWikipediaPhoto: vi.fn().mockResolvedValue(null) }));

      const { autoPopulateAthlete } = await import("./auto-populate.js");
      const { db, athletesTable } = await import("@workspace/db");
      const { eq } = await import("drizzle-orm");

      const [athlete] = await db.select().from(athletesTable).where(eq(athletesTable.name, "Peter Bol"));
      expect(athlete, "Peter Bol must already exist in the target database").toBeDefined();

      await autoPopulateAthlete({
        id: athlete.id,
        name: athlete.name,
        sport: athlete.sport,
        event: athlete.event,
        nationality: athlete.nationality,
        age: athlete.age,
      });

      const [updated] = await db.select().from(athletesTable).where(eq(athletesTable.id, athlete.id));
      expect(updated.personalBest).toBe("1:43.64");
      expect(updated.seasonBest).toBe("1:43.64");
      expect(updated.personalBest).toBe(updated.seasonBest); // no inversion remains
    },
  );
});
