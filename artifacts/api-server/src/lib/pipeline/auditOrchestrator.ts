/**
 * Intelligence Audit orchestrator.
 *
 * Runs the real production pipeline (via repopulateAthleteAwaited) for each
 * selected athlete, sequentially, then builds and stores the full audit
 * report. This is the only place that writes to audit_runs beyond its
 * initial creation (done by the route handler) — progress is updated as
 * each athlete completes, so polling clients see real-time status instead
 * of an opaque "running" for the whole run.
 *
 * Athletes are processed sequentially, not concurrently: each one already
 * makes real Perplexity + GPT-4o + Wikipedia + X API calls with real
 * network latency, which provides natural spacing between requests without
 * an artificial delay — unlike the 6-hourly scheduler (index.ts), this is a
 * small, admin-triggered, infrequent batch, so no additional throttling is
 * needed here.
 */

import { db } from "@workspace/db";
import { auditRunsTable } from "@workspace/db";
import { and, desc, eq, lt } from "drizzle-orm";
import { repopulateAthleteAwaited } from "../auto-populate.js";
import { buildOverallAssessment, type AthleteAuditReport, type AuditRunReport } from "./auditReport.js";
import { buildAthleteAuditReport } from "./auditReportRunner.js";
import { logger } from "../logger.js";

async function getPreviousCompletedRun(currentRunId: number): Promise<{ id: number; overallIqs: number } | null> {
  const [row] = await db
    .select({ id: auditRunsTable.id, overallIqs: auditRunsTable.overallIqs })
    .from(auditRunsTable)
    .where(and(eq(auditRunsTable.status, "completed"), lt(auditRunsTable.id, currentRunId)))
    .orderBy(desc(auditRunsTable.id))
    .limit(1);

  if (!row || row.overallIqs === null) return null;
  return { id: row.id, overallIqs: row.overallIqs };
}

export async function runIntelligenceAudit(auditRunId: number, athleteIds: number[]): Promise<void> {
  try {
    const athleteReports: AthleteAuditReport[] = [];

    for (const athleteId of athleteIds) {
      logger.info({ auditRunId, athleteId }, "intelligence-audit: repopulating athlete via real pipeline");
      await repopulateAthleteAwaited(athleteId);

      const report = await buildAthleteAuditReport(athleteId);
      if (report) athleteReports.push(report);
      else logger.warn({ auditRunId, athleteId }, "intelligence-audit: athlete disappeared mid-run; skipping");

      await db
        .update(auditRunsTable)
        .set({ progressCompleted: athleteReports.length })
        .where(eq(auditRunsTable.id, auditRunId));
    }

    if (athleteReports.length === 0) {
      await db
        .update(auditRunsTable)
        .set({ status: "failed", errorMessage: "No athletes could be audited — all selected athletes were missing.", completedAt: new Date() })
        .where(eq(auditRunsTable.id, auditRunId));
      return;
    }

    const previousRun = await getPreviousCompletedRun(auditRunId);
    const overall = buildOverallAssessment(athleteReports, previousRun);
    const report: AuditRunReport = { athletes: athleteReports, overall };

    await db
      .update(auditRunsTable)
      .set({
        status: "completed",
        completedAt: new Date(),
        overallIqs: overall.overallIqs,
        report,
        progressCompleted: athleteReports.length,
      })
      .where(eq(auditRunsTable.id, auditRunId));

    logger.info({ auditRunId, overallIqs: overall.overallIqs, athletes: athleteReports.length }, "intelligence-audit: run complete");
  } catch (err) {
    logger.error({ err, auditRunId }, "intelligence-audit: run failed");
    await db
      .update(auditRunsTable)
      .set({ status: "failed", errorMessage: err instanceof Error ? err.message : String(err), completedAt: new Date() })
      .where(eq(auditRunsTable.id, auditRunId))
      .catch(() => {});
  }
}
