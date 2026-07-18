import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { athletesTable } from "./athletes";

export const intelligenceItemsTable = pgTable("intelligence_items", {
  id: serial("id").primaryKey(),
  athleteId: integer("athlete_id")
    .notNull()
    .references(() => athletesTable.id, { onDelete: "cascade" }),
  athleteName: text("athlete_name").notNull(),
  category: text("category").notNull(), // results_rankings | media_interviews | sponsorships | career_changes
  title: text("title").notNull(),
  summary: text("summary"),
  sourceDomain: text("source_domain").notNull(),
  sourceUrl: text("source_url"),
  confidence: integer("confidence").notNull().default(80),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  discoveredAt: timestamp("discovered_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertIntelligenceItemSchema = createInsertSchema(
  intelligenceItemsTable,
).omit({ id: true, discoveredAt: true });
export type InsertIntelligenceItem = z.infer<
  typeof insertIntelligenceItemSchema
>;
export type IntelligenceItem = typeof intelligenceItemsTable.$inferSelect;
