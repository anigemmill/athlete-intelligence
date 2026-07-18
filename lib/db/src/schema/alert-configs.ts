import { pgTable, text, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { athletesTable } from "./athletes";

export const alertConfigsTable = pgTable("alert_configs", {
  athleteId: integer("athlete_id")
    .primaryKey()
    .references(() => athletesTable.id, { onDelete: "cascade" }),
  resultsEnabled: boolean("results_enabled").notNull().default(true),
  resultsFrequency: text("results_frequency").notNull().default("immediate"),
  mediaEnabled: boolean("media_enabled").notNull().default(true),
  mediaFrequency: text("media_frequency").notNull().default("daily"),
  sponsorshipsEnabled: boolean("sponsorships_enabled").notNull().default(true),
  sponsorshipsFrequency: text("sponsorships_frequency")
    .notNull()
    .default("daily"),
  careerEnabled: boolean("career_enabled").notNull().default(true),
  careerFrequency: text("career_frequency").notNull().default("immediate"),
});

export const insertAlertConfigSchema = createInsertSchema(alertConfigsTable);
export type InsertAlertConfig = z.infer<typeof insertAlertConfigSchema>;
export type AlertConfig = typeof alertConfigsTable.$inferSelect;
