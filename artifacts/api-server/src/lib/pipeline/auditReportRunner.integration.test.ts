/**
 * Exercises buildAthleteAuditReport against real, already-stored rows —
 * proving the full report-building path (every section builder, the live
 * dead-link/image checks, IQS) works end to end against a real database,
 * not just against synthetic fixtures (see auditReport.test.ts for those).
 *
 * Deliberately does not call repopulateAthleteAwaited here — that would
 * require real OpenAI/OpenRouter credentials, which auto-populate.milestone1.test.ts
 * already covers with mocked clients. This test's job is the other half:
 * given whatever is actually in the database, does the audit report
 * engine itself produce correct, well-formed output.
 *
 * Requires a real DATABASE_URL (skipped otherwise, same convention as
 * auto-populate.milestone1.test.ts).
 */

import { describe, it, expect } from "vitest";

const hasDb = !!process.env.DATABASE_URL;

describe("buildAthleteAuditReport (integration)", () => {
  it.skipIf(!hasDb)("builds a complete, well-formed report for a real seeded athlete", async () => {
    const { buildAthleteAuditReport } = await import("./auditReportRunner.js");
    const { db, athletesTable } = await import("@workspace/db");
    const { eq } = await import("drizzle-orm");

    const [athlete] = await db.select().from(athletesTable).where(eq(athletesTable.name, "Peter Bol"));
    expect(athlete, "Peter Bol must already exist in the target database").toBeDefined();

    const report = await buildAthleteAuditReport(athlete.id);
    expect(report).not.toBeNull();
    if (!report) return;

    // Structural completeness — every section is present.
    for (const key of ["identity", "results", "competitions", "timeline", "intelligence", "contacts", "social", "images", "sources", "confidence", "iqs"] as const) {
      expect(report[key]).toBeDefined();
    }

    // Real correctness against what Milestone 1 fixed for this exact athlete.
    expect(report.results.pbSbInverted).toBe(false);
    expect(report.sources.citationIndexLeaksFound).toBe(0);
    expect(report.iqs.total).toBeGreaterThan(0);
    expect(report.iqs.total).toBeLessThanOrEqual(100);
  });

  it.skipIf(!hasDb)("returns null for an athlete that does not exist, rather than throwing", async () => {
    const { buildAthleteAuditReport } = await import("./auditReportRunner.js");
    const report = await buildAthleteAuditReport(999_999_999);
    expect(report).toBeNull();
  });

  it.skipIf(!hasDb)("produces a platform assessment that never credits Milestone 2 with fixing anything", async () => {
    const { buildAthleteAuditReport } = await import("./auditReportRunner.js");
    const { buildOverallAssessment } = await import("./auditReport.js");
    const { db, athletesTable } = await import("@workspace/db");
    const { inArray } = await import("drizzle-orm");

    const names = ["Peter Bol", "Zoe Hobbs"];
    const rows = await db.select().from(athletesTable).where(inArray(athletesTable.name, names));
    const reports = (await Promise.all(rows.map((r) => buildAthleteAuditReport(r.id)))).filter((r): r is NonNullable<typeof r> => r !== null);
    expect(reports.length).toBe(2);

    const overall = buildOverallAssessment(reports, null);
    expect(overall.milestone2FixableIssues[0]).toContain("None of the remaining issues above are fixed by Milestone 2 itself");
  });
});
