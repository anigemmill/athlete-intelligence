import { pgTable, text, serial, integer, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { athletesTable } from "./athletes";

/**
 * Append-only audit trail of raw agent output (docs/task-27-agentic-pipeline.md
 * §5). Deliberately separate from the clean, validated product tables — this
 * is not user-facing and nothing filters or validates it. It exists so a
 * value that looks wrong in a clean table (e.g. the historical citation-index
 * leak, docs/technical-debt.md Priority 1) can be traced back to exactly what
 * the model saw and said, which the current pipeline has no way to do once a
 * bad value has already overwritten the citation list it came from.
 *
 * Nothing in Milestone 0 writes to this table yet.
 */
export const evidenceLogTable = pgTable("evidence_log", {
  id: serial("id").primaryKey(),
  athleteId: integer("athlete_id")
    .notNull()
    .references(() => athletesTable.id, { onDelete: "cascade" }),
  agent: text("agent").notNull(),
  rawResearch: text("raw_research"),
  rawCitations: jsonb("raw_citations").$type<string[]>(),
  rawExtraction: text("raw_extraction"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_evidence_log_athlete_id").on(table.athleteId),
  index("idx_evidence_log_agent").on(table.agent),
]);

export const insertEvidenceLogSchema = createInsertSchema(evidenceLogTable).omit({
  id: true,
  createdAt: true,
});
export type InsertEvidenceLog = z.infer<typeof insertEvidenceLogSchema>;
export type EvidenceLog = typeof evidenceLogTable.$inferSelect;
