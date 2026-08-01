/**
 * athlete-health.ts
 *
 * Computes the Intelligence Health metrics for a single athlete.
 * Used by GET /api/athletes/:id/health to power the IntelligenceHealthPanel.
 *
 * Metrics:
 *   - overallConfidence    avg confidence across all intelligence items
 *   - evidenceCount        total intelligence items
 *   - sourceDiversity      unique source domains across all intelligence
 *   - lastCrawledAt        ISO string or null
 *   - freshness            "excellent" | "good" | "aging" | "stale" | "never"
 *   - freshnessLabel       human-readable label
 *   - daysSinceLastCrawl   integer or null
 *   - competitionTotal     total past competitions
 *   - competitionWithResult past competitions that have a result
 *   - resultCompleteness   % of past competitions with result (0–100)
 *   - timelineEventCount   total timeline events
 *   - hasPhoto             whether avatarUrl is set
 *   - knownGaps            array of gap strings (missing coach, missing agent, etc.)
 */

import { db } from "@workspace/db";
import {
  athletesTable,
  intelligenceItemsTable,
  timelineEventsTable,
  contactsTable,
  competitionsTable,
} from "@workspace/db";
import { eq, and, lte, isNotNull, isNull, count, avg } from "drizzle-orm";

export interface AthleteHealthMetrics {
  athleteId:             number;
  overallConfidence:     number | null;   // 0–100
  evidenceCount:         number;
  sourceDiversity:       number;          // unique domains
  lastCrawledAt:         string | null;   // ISO string
  freshness:             "excellent" | "good" | "aging" | "stale" | "never";
  freshnessLabel:        string;
  daysSinceLastCrawl:    number | null;
  competitionTotal:      number;          // past competitions
  competitionWithResult: number;
  resultCompleteness:    number;          // 0–100 percentage
  timelineEventCount:    number;
  hasPhoto:              boolean;
  knownGaps:             string[];
}

function freshnessFromDays(days: number | null): {
  freshness: AthleteHealthMetrics["freshness"];
  label: string;
} {
  if (days === null) return { freshness: "never",    label: "Never crawled" };
  if (days < 3)      return { freshness: "excellent", label: "Excellent — updated recently" };
  if (days < 7)      return { freshness: "good",      label: "Good — within a week" };
  if (days < 14)     return { freshness: "aging",     label: "Aging — over a week old" };
  return              { freshness: "stale",    label: "Stale — needs refresh" };
}

export async function computeAthleteHealth(athleteId: number): Promise<AthleteHealthMetrics | null> {
  const today = new Date().toISOString().split("T")[0];

  // Fetch all data concurrently
  const [
    athleteRows,
    intelRows,
    timelineRows,
    contactRows,
    pastCompsTotal,
    pastCompsWithResult,
  ] = await Promise.all([
    db
      .select({
        lastCrawledAt: athletesTable.lastCrawledAt,
        avatarUrl:     athletesTable.avatarUrl,
        worldRank:     athletesTable.worldRank,
        personalBest:  athletesTable.personalBest,
      })
      .from(athletesTable)
      .where(eq(athletesTable.id, athleteId)),

    db
      .select({
        confidence:   intelligenceItemsTable.confidence,
        sourceDomain: intelligenceItemsTable.sourceDomain,
      })
      .from(intelligenceItemsTable)
      .where(eq(intelligenceItemsTable.athleteId, athleteId)),

    db
      .select({ id: timelineEventsTable.id })
      .from(timelineEventsTable)
      .where(eq(timelineEventsTable.athleteId, athleteId)),

    db
      .select({ category: contactsTable.category })
      .from(contactsTable)
      .where(eq(contactsTable.athleteId, athleteId)),

    // Past competitions (date <= today)
    db
      .select({ id: competitionsTable.id })
      .from(competitionsTable)
      .where(
        and(
          eq(competitionsTable.athleteId, athleteId),
          lte(competitionsTable.date, today),
        ),
      ),

    // Past competitions WITH a non-null result
    db
      .select({ id: competitionsTable.id })
      .from(competitionsTable)
      .where(
        and(
          eq(competitionsTable.athleteId, athleteId),
          lte(competitionsTable.date, today),
          isNotNull(competitionsTable.result),
        ),
      ),
  ]);

  if (athleteRows.length === 0) return null;
  const athlete = athleteRows[0];

  // Days since last crawl
  const daysSinceLastCrawl = athlete.lastCrawledAt
    ? Math.floor((Date.now() - new Date(athlete.lastCrawledAt).getTime()) / 86_400_000)
    : null;

  const { freshness, label: freshnessLabel } = freshnessFromDays(daysSinceLastCrawl);

  // Intelligence stats
  const evidenceCount  = intelRows.length;
  const uniqueDomains  = new Set(intelRows.map((r) => r.sourceDomain?.toLowerCase().replace(/^www\./, "") ?? "unknown"));
  uniqueDomains.delete("unknown");
  const sourceDiversity = uniqueDomains.size;
  const overallConfidence = evidenceCount > 0
    ? Math.round(intelRows.reduce((sum, r) => sum + (r.confidence ?? 80), 0) / evidenceCount)
    : null;

  // Timeline
  const timelineEventCount = timelineRows.length;

  // Competitions
  const competitionTotal      = pastCompsTotal.length;
  const competitionWithResult = pastCompsWithResult.length;
  const resultCompleteness    = competitionTotal > 0
    ? Math.round((competitionWithResult / competitionTotal) * 100)
    : 0;

  // Known gaps — structural data that is clearly missing
  const contactCategories = new Set(contactRows.map((c) => c.category));
  const knownGaps: string[] = [];

  if (!contactCategories.has("coaching"))    knownGaps.push("No coach on file");
  if (!contactCategories.has("management"))  knownGaps.push("No manager / agent on file");
  if (!athlete.worldRank)                    knownGaps.push("World ranking unknown");
  if (!athlete.personalBest)                 knownGaps.push("Personal best not recorded");
  if (!athlete.avatarUrl)                    knownGaps.push("No profile photo");
  if (timelineEventCount < 5)                knownGaps.push("Career timeline sparse (< 5 events)");
  if (resultCompleteness < 50 && competitionTotal >= 3) knownGaps.push(`${100 - resultCompleteness}% of past competitions missing results`);
  if (sourceDiversity < 3 && evidenceCount > 0) knownGaps.push("Low source diversity — fewer than 3 domains");

  return {
    athleteId,
    overallConfidence,
    evidenceCount,
    sourceDiversity,
    lastCrawledAt:         athlete.lastCrawledAt ? new Date(athlete.lastCrawledAt).toISOString() : null,
    freshness,
    freshnessLabel,
    daysSinceLastCrawl,
    competitionTotal,
    competitionWithResult,
    resultCompleteness,
    timelineEventCount,
    hasPhoto:   !!athlete.avatarUrl,
    knownGaps,
  };
}
