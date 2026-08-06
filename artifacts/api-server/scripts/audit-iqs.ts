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
import { athletesTable } from "@workspace/db";
import { inArray } from "drizzle-orm";
import { computeIQS, buildIQSInputFromRawData } from "../src/lib/pipeline/iqs.js";
import { GOLDEN_ATHLETE_NAMES } from "../src/lib/pipeline/goldenSet.js";
import { collectAthleteRawData } from "../src/lib/pipeline/collectAthleteData.js";

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
    const raw = await collectAthleteRawData(athlete.id);
    if (!raw) continue; // can't happen — athlete came from the query above
    results.push(computeIQS(buildIQSInputFromRawData(raw, today)));
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
