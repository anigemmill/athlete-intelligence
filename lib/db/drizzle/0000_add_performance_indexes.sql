CREATE TABLE "athletes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sport" text NOT NULL,
	"event" text NOT NULL,
	"nationality" text NOT NULL,
	"age" integer,
	"squad" text DEFAULT '' NOT NULL,
	"world_rank" integer,
	"world_rank_delta" integer DEFAULT 0 NOT NULL,
	"national_rank" integer,
	"personal_best" text,
	"season_best" text,
	"instagram_handle" text,
	"instagram_followers" integer DEFAULT 0 NOT NULL,
	"instagram_engagement" real DEFAULT 0 NOT NULL,
	"twitter_handle" text,
	"twitter_followers" integer DEFAULT 0 NOT NULL,
	"tiktok_handle" text,
	"tiktok_followers" integer DEFAULT 0 NOT NULL,
	"follower_growth_30d" real DEFAULT 0 NOT NULL,
	"avg_engagement" real DEFAULT 0 NOT NULL,
	"agent_status" text DEFAULT 'active' NOT NULL,
	"last_crawled_at" timestamp with time zone,
	"intelligence_count" integer DEFAULT 0 NOT NULL,
	"has_new_intelligence" boolean DEFAULT false NOT NULL,
	"avatar_url" text,
	"ai_summary" text,
	"ai_summary_generated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intelligence_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"athlete_id" integer NOT NULL,
	"athlete_name" text NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"source_domain" text NOT NULL,
	"source_url" text,
	"confidence" integer DEFAULT 80 NOT NULL,
	"published_at" timestamp with time zone,
	"discovered_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alert_configs" (
	"athlete_id" integer PRIMARY KEY NOT NULL,
	"results_enabled" boolean DEFAULT true NOT NULL,
	"results_frequency" text DEFAULT 'immediate' NOT NULL,
	"media_enabled" boolean DEFAULT true NOT NULL,
	"media_frequency" text DEFAULT 'daily' NOT NULL,
	"sponsorships_enabled" boolean DEFAULT true NOT NULL,
	"sponsorships_frequency" text DEFAULT 'daily' NOT NULL,
	"career_enabled" boolean DEFAULT true NOT NULL,
	"career_frequency" text DEFAULT 'immediate' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "competitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"athlete_id" integer NOT NULL,
	"athlete_name" text NOT NULL,
	"meet_name" text NOT NULL,
	"event" text NOT NULL,
	"location" text,
	"date" date NOT NULL,
	"tier" text DEFAULT 'B' NOT NULL,
	"status" text DEFAULT 'upcoming' NOT NULL,
	"result" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"athlete_id" integer NOT NULL,
	"role" text NOT NULL,
	"category" text NOT NULL,
	"name" text NOT NULL,
	"org" text NOT NULL,
	"org_type" text,
	"status" text DEFAULT 'verified' NOT NULL,
	"confidence" integer DEFAULT 80 NOT NULL,
	"public_email" text,
	"website" text,
	"note" text,
	"last_verified" date NOT NULL,
	"date_discovered" date NOT NULL,
	"source_domain" text NOT NULL,
	"source_excerpt" text
);
--> statement-breakpoint
CREATE TABLE "timeline_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"athlete_id" integer NOT NULL,
	"date" date NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"location" text,
	"source_domain" text NOT NULL,
	"source_url" text,
	"confidence" integer DEFAULT 85 NOT NULL,
	"significant" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_enquiries" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text DEFAULT 'general' NOT NULL,
	"name" text NOT NULL,
	"org" text NOT NULL,
	"email" text NOT NULL,
	"role" text,
	"athletes" text,
	"message" text,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "intelligence_items" ADD CONSTRAINT "intelligence_items_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_configs" ADD CONSTRAINT "alert_configs_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitions" ADD CONSTRAINT "competitions_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_intelligence_items_athlete_id" ON "intelligence_items" USING btree ("athlete_id");--> statement-breakpoint
CREATE INDEX "idx_intelligence_items_discovered_at" ON "intelligence_items" USING btree ("discovered_at");--> statement-breakpoint
CREATE INDEX "idx_competitions_athlete_id" ON "competitions" USING btree ("athlete_id");--> statement-breakpoint
CREATE INDEX "idx_competitions_date" ON "competitions" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_contacts_athlete_id" ON "contacts" USING btree ("athlete_id");--> statement-breakpoint
CREATE INDEX "idx_timeline_events_athlete_id" ON "timeline_events" USING btree ("athlete_id");--> statement-breakpoint
CREATE INDEX "idx_timeline_events_date" ON "timeline_events" USING btree ("date");