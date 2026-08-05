import { pgTable, text, serial, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { athletesTable } from "./athletes";

/**
 * Append-only execution log for the agentic pipeline (Task #27).
 * One row per agent invocation, per athlete, per pipeline run. Nothing in
 * Milestone 0 writes to this table yet — the orchestrator introduced in
 * Milestone 2 is the first caller. It exists now so every later milestone's
 * per-agent cadence checks and monitoring (docs/task-27-agentic-pipeline.md
 * §3.5, §10) have a stable place to read from and write to from day one.
 */
export const agentRunsTable = pgTable("agent_runs", {
  id: serial("id").primaryKey(),
  athleteId: integer("athlete_id")
    .notNull()
    .references(() => athletesTable.id, { onDelete: "cascade" }),
  agent: text("agent").notNull(), // e.g. "identity" | "results" | "competitions" | "legacy_monolith" ...
  status: text("status").notNull(), // "ok" | "empty" | "error"
  ranAt: timestamp("ran_at", { withTimezone: true }).notNull().defaultNow(),
  latencyMs: integer("latency_ms"),
  tokensUsed: integer("tokens_used"),
  retries: integer("retries").notNull().default(0),
  errorClassification: text("error_classification"), // "transient" | "malformed_output" | null
}, (table) => [
  index("idx_agent_runs_athlete_id").on(table.athleteId),
  index("idx_agent_runs_agent").on(table.agent),
  index("idx_agent_runs_ran_at").on(table.ranAt),
]);

export const insertAgentRunSchema = createInsertSchema(agentRunsTable).omit({
  id: true,
  ranAt: true,
});
export type InsertAgentRun = z.infer<typeof insertAgentRunSchema>;
export type AgentRun = typeof agentRunsTable.$inferSelect;
