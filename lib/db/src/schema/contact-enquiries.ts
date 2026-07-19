import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const contactEnquiriesTable = pgTable("contact_enquiries", {
  id: serial("id").primaryKey(),
  type: text("type").notNull().default("general"), // demo | sales | general
  name: text("name").notNull(),
  org: text("org").notNull(),
  email: text("email").notNull(),
  role: text("role"),
  athletes: text("athletes"),       // roster size estimate (demo enquiries)
  message: text("message"),
  status: text("status").notNull().default("new"), // new | read | replied
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
