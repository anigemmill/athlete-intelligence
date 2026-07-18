import { pgTable, text, serial, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { athletesTable } from "./athletes";

export const contactsTable = pgTable("contacts", {
  id: serial("id").primaryKey(),
  athleteId: integer("athlete_id")
    .notNull()
    .references(() => athletesTable.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  category: text("category").notNull(), // management | coaching | medical | media | sponsorship
  name: text("name").notNull(),
  org: text("org").notNull(),
  orgType: text("org_type"),
  status: text("status").notNull().default("verified"), // verified | unconfirmed | historical
  confidence: integer("confidence").notNull().default(80),
  publicEmail: text("public_email"),
  website: text("website"),
  note: text("note"),
  lastVerified: date("last_verified", { mode: "string" }).notNull(),
  dateDiscovered: date("date_discovered", { mode: "string" }).notNull(),
  sourceDomain: text("source_domain").notNull(),
  sourceExcerpt: text("source_excerpt"),
});

export const insertContactSchema = createInsertSchema(contactsTable).omit({
  id: true,
});
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = typeof contactsTable.$inferSelect;
