import {
  pgTable,
  text,
  serial,
  integer,
  real,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const athletesTable = pgTable("athletes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sport: text("sport").notNull(),
  event: text("event").notNull(),
  nationality: text("nationality").notNull(),
  age: integer("age"),
  squad: text("squad").notNull().default(""),
  worldRank: integer("world_rank"),
  worldRankDelta: integer("world_rank_delta").notNull().default(0),
  nationalRank: integer("national_rank"),
  personalBest: text("personal_best"),
  seasonBest: text("season_best"),
  instagramHandle: text("instagram_handle"),
  // Nullable: null means "not verified this run" (SocialMetricsAgent found
  // no confirmed count), distinct from a genuine 0 followers. See M14 fix
  // for the M13 audit's Problem #2 -- a NOT NULL DEFAULT 0 column cannot
  // represent "unknown", so unverified counts were silently displayed as 0.
  instagramFollowers: integer("instagram_followers"),
  instagramEngagement: real("instagram_engagement").notNull().default(0),
  twitterHandle: text("twitter_handle"),
  twitterFollowers: integer("twitter_followers"),
  tiktokHandle: text("tiktok_handle"),
  tiktokFollowers: integer("tiktok_followers"),
  followerGrowth30d: real("follower_growth_30d").notNull().default(0),
  avgEngagement: real("avg_engagement").notNull().default(0),
  agentStatus: text("agent_status").notNull().default("active"),
  lastCrawledAt: timestamp("last_crawled_at", { withTimezone: true }),
  intelligenceCount: integer("intelligence_count").notNull().default(0),
  hasNewIntelligence: boolean("has_new_intelligence").notNull().default(false),
  avatarUrl: text("avatar_url"),
  aiSummary: text("ai_summary"),
  aiSummaryGeneratedAt: timestamp("ai_summary_generated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertAthleteSchema = createInsertSchema(athletesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAthlete = z.infer<typeof insertAthleteSchema>;
export type Athlete = typeof athletesTable.$inferSelect;
