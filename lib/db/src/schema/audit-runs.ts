import { pgTable, text, serial, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * One row per Intelligence Audit run (the permanent Admin QA tool — not part
 * of Task #27's pipeline redesign; a separate, immediately-live feature).
 *
 * Unlike agent_runs/evidence_log (Task #27, dormant until Milestone 2), this
 * table is written to from the moment this feature ships: an admin selects
 * athletes, the run starts here as "running", and progress/report/status are
 * updated in place as the real production pipeline processes each athlete.
 */
export const auditRunsTable = pgTable("audit_runs", {
  id: serial("id").primaryKey(),
  status: text("status").notNull().default("running"), // running | completed | failed
  athleteIds: jsonb("athlete_ids").$type<number[]>().notNull(),
  triggeredAt: timestamp("triggered_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  progressCompleted: integer("progress_completed").notNull().default(0),
  progressTotal: integer("progress_total").notNull(),
  overallIqs: integer("overall_iqs"),
  report: jsonb("report"), // full AuditRunReport once status is "completed"
  errorMessage: text("error_message"),
});

export const insertAuditRunSchema = createInsertSchema(auditRunsTable).omit({
  id: true,
  triggeredAt: true,
});
export type InsertAuditRun = z.infer<typeof insertAuditRunSchema>;
export type AuditRun = typeof auditRunsTable.$inferSelect;
