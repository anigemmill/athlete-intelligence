import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  date,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { athletesTable } from "./athletes";

export const timelineEventsTable = pgTable("timeline_events", {
  id: serial("id").primaryKey(),
  athleteId: integer("athlete_id")
    .notNull()
    .references(() => athletesTable.id, { onDelete: "cascade" }),
  date: date("date", { mode: "string" }).notNull(),
  category: text("category").notNull(), // competition | media | sponsorship | career | personal
  title: text("title").notNull(),
  description: text("description"),
  location: text("location"),
  sourceDomain: text("source_domain").notNull(),
  sourceUrl: text("source_url"),
  confidence: integer("confidence").notNull().default(85),
  significant: boolean("significant").notNull().default(false),
});

export const insertTimelineEventSchema = createInsertSchema(
  timelineEventsTable,
).omit({ id: true });
export type InsertTimelineEvent = z.infer<typeof insertTimelineEventSchema>;
export type TimelineEvent = typeof timelineEventsTable.$inferSelect;
