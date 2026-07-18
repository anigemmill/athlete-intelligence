import {
  pgTable,
  text,
  serial,
  integer,
  date,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { athletesTable } from "./athletes";

export const competitionsTable = pgTable("competitions", {
  id: serial("id").primaryKey(),
  athleteId: integer("athlete_id")
    .notNull()
    .references(() => athletesTable.id, { onDelete: "cascade" }),
  athleteName: text("athlete_name").notNull(),
  meetName: text("meet_name").notNull(),
  event: text("event").notNull(),
  location: text("location"),
  date: date("date", { mode: "string" }).notNull(),
  tier: text("tier").notNull().default("B"), // A | B | C
  status: text("status").notNull().default("upcoming"), // upcoming | completed | cancelled
  result: text("result"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertCompetitionSchema = createInsertSchema(
  competitionsTable,
).omit({ id: true, createdAt: true });
export type InsertCompetition = z.infer<typeof insertCompetitionSchema>;
export type Competition = typeof competitionsTable.$inferSelect;
