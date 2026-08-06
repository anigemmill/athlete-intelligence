/**
 * Baseline IQS audit script (docs/task-27-success-metrics.md §3).
 *
 * Computes the Intelligence Quality Score for the golden athlete set
 * (docs/task-27-success-metrics.md §2) against whatever database
 * DATABASE_URL currently points at, and writes the result to
 * docs/metrics/m<N>.json.
 *
 * Run: DATABASE_URL=... tsx scripts/audit-iqs.ts <milestone-number> <provenance> [baselineType]
 *
 * This script does not fabricate anything — it reads whatever is actually
 * in the target database. Whether that database holds real production
 * data or a reconstruction, and what that reconstruction was built from,
 * is a fact about the environment the script is run in, not something the
 * script itself decides — the caller states it via the provenance/
 * baselineType arguments. See the run's accompanying commit/PR description
 * for that context.
 *
 * baselineType defaults to "development" — a snapshot is only ever labelled
 * "production" if the caller explicitly says so, never implicitly. Every
 * "development" snapshot carries a todoBeforeProductionRelease note in its
 * output: it must be regenerated against the live production database
 * before the platform's first production release.
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { db } from "@workspace/db";
import {
  athletesTable,
  intelligenceItemsTable,
  timelineEventsTable,
  contactsTable,
  competitionsTable,
} from "@workspace/db";
import { eq, inArray, lte } from "drizzle-orm";
import { computeIQS, type IQSEvidenceRecord } from "../src/lib/pipeline/iqs.js";
import { isValidHandle } from "../src/lib/pipeline/validation.js";

const GOLDEN_ATHLETE_NAMES = [
  "Peter Bol",
  "Zoe Hobbs",
  "Nick Willis",
  "Hamish Kerr",
  "Brook Macdonald",
];

async function main() {
  const milestone = process.argv[2] ?? "0";
  const dataProvenance = process.argv[3] ?? "unspecified — pass a provenance string as the 2nd CLI argument";
  const baselineType = process.argv[4] === "production" ? "production" : "development";

  const athletes = await db
    .select()
    .from(athletesTable)
    .where(inArray(athletesTable.name, GOLDEN_ATHLETE_NAMES));

  if (athletes.length === 0) {
    throw new Error(
      "No golden-set athletes found in the target database. Refusing to write an empty/fabricated baseline.",
    );
  }

  const today = new Date().toISOString().split("T")[0];
  const results = [];

  for (const athlete of athletes) {
    const [intelItems, timelineEvents, contacts, pastCompetitions] = await Promise.all([
      db.select().from(intelligenceItemsTable).where(eq(intelligenceItemsTable.athleteId, athlete.id)),
      db.select().from(timelineEventsTable).where(eq(timelineEventsTable.athleteId, athlete.id)),
      db.select().from(contactsTable).where(eq(contactsTable.athleteId, athlete.id)),
      db
        .select()
        .from(competitionsTable)
        .where(eq(competitionsTable.athleteId, athlete.id))
        .then((rows) => rows.filter((r) => r.date <= today)),
    ]);

    const evidenceRecords: IQSEvidenceRecord[] = [
      ...intelItems.map((i) => ({ sourceDomain: i.sourceDomain, sourceUrl: i.sourceUrl, confidence: i.confidence })),
      ...timelineEvents.map((t) => ({ sourceDomain: t.sourceDomain, sourceUrl: t.sourceUrl, confidence: t.confidence })),
      ...contacts.map((c) => ({ sourceDomain: c.sourceDomain, sourceUrl: null, confidence: c.confidence })),
    ];

    const hasValidSocialHandle =
      (!!athlete.instagramHandle && isValidHandle(athlete.instagramHandle, "instagram")) ||
      (!!athlete.twitterHandle && isValidHandle(athlete.twitterHandle, "twitter")) ||
      (!!athlete.tiktokHandle && isValidHandle(athlete.tiktokHandle, "tiktok"));

    const result = computeIQS({
      athleteId: athlete.id,
      name: athlete.name,
      evidenceRecords,
      personalBest: athlete.personalBest,
      seasonBest: athlete.seasonBest,
      contactCategories: [...new Set(contacts.map((c) => c.category))],
      intelItemCount: intelItems.length,
      timelineEventCount: timelineEvents.length,
      pastCompetitionsTotal: pastCompetitions.length,
      pastCompetitionsWithResult: pastCompetitions.filter((c) => c.result !== null).length,
      hasPhoto: !!athlete.avatarUrl,
      hasValidSocialHandle,
    });

    results.push(result);
  }

  const missing = GOLDEN_ATHLETE_NAMES.filter((n) => !athletes.some((a) => a.name === n));

  const snapshot = {
    milestone: `m${milestone}`,
    generatedAt: new Date().toISOString(),
    baselineType,
    dataProvenance,
    ...(baselineType === "development"
      ? {
          todoBeforeProductionRelease:
            "Regenerate this snapshot by running scripts/audit-iqs.ts against the live production database before the platform's first production release. Every number in this file is a development baseline, not a claim about production data quality.",
        }
      : {}),
    goldenAthleteNames: GOLDEN_ATHLETE_NAMES,
    missingFromDatabase: missing,
    averageIQS: Math.round(results.reduce((sum, r) => sum + r.total, 0) / results.length),
    athletes: results,
  };

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const outDir = path.resolve(scriptDir, "../../../docs/metrics");
  const outPath = path.join(outDir, `m${milestone}.json`);
  writeFileSync(outPath, JSON.stringify(snapshot, null, 2) + "\n");

  console.log(`Wrote ${outPath}`);
  console.log(JSON.stringify(snapshot, null, 2));

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
