# Athlete Intelligence — Database Documentation

## Overview

PostgreSQL database managed via **Drizzle ORM**. Schema is defined in TypeScript at `lib/db/src/schema/`. Connection uses a `pg.Pool` with the `DATABASE_URL` environment variable.

All foreign keys use `ON DELETE CASCADE` — deleting an athlete removes all their associated data automatically.

**No migration files exist** — the project uses `drizzle-kit push` to sync schema directly to the database. Run `pnpm --filter @workspace/db run push` to apply schema changes.

---

## Tables

### `athletes`

Core athlete roster. One row per tracked athlete.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | serial | no | auto | Primary key |
| `name` | text | no | — | Full name |
| `sport` | text | no | — | e.g. "Athletics", "Cycling" |
| `event` | text | no | — | e.g. "800m", "MTB Downhill" |
| `nationality` | text | no | — | Country name |
| `age` | integer | yes | — | Approximate age |
| `squad` | text | no | `""` | Squad/team name |
| `world_rank` | integer | yes | — | Current world ranking |
| `world_rank_delta` | integer | no | `0` | Rank change (negative = improved) |
| `national_rank` | integer | yes | — | National ranking |
| `personal_best` | text | yes | — | e.g. "1:43.22" or "8.95m" |
| `season_best` | text | yes | — | Best mark in current season |
| `instagram_handle` | text | yes | — | Without @ symbol |
| `instagram_followers` | integer | no | `0` | |
| `instagram_engagement` | real | no | `0` | Engagement rate |
| `twitter_handle` | text | yes | — | Without @ symbol |
| `twitter_followers` | integer | no | `0` | |
| `tiktok_handle` | text | yes | — | Without @ symbol |
| `tiktok_followers` | integer | no | `0` | |
| `follower_growth_30d` | real | no | `0` | 30-day follower growth % |
| `avg_engagement` | real | no | `0` | Cross-platform average |
| `agent_status` | text | no | `"active"` | `active` \| `paused` \| `archived` |
| `last_crawled_at` | timestamp(tz) | yes | — | NULL = never successfully crawled |
| `intelligence_count` | integer | no | `0` | Cached count of intelligence items |
| `has_new_intelligence` | boolean | no | `false` | Unread indicator |
| `avatar_url` | text | yes | — | Profile photo URL (Wikipedia/federation) |
| `ai_summary` | text | yes | — | Cached AI narrative briefing |
| `ai_summary_generated_at` | timestamp(tz) | yes | — | When summary was last generated |
| `created_at` | timestamp(tz) | no | `now()` | |
| `updated_at` | timestamp(tz) | no | `now()` | Auto-updates on row change |

**Important:** `last_crawled_at = NULL` means the athlete was created but the pipeline has never completed successfully. The scheduler prioritises NULL athletes first (ordering by `lastCrawledAt ASC NULLS FIRST`).

---

### `intelligence_items`

Atomic pieces of intelligence about an athlete — results, news, sponsorships, career changes.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | serial | no | auto | Primary key |
| `athlete_id` | integer | no | — | FK → `athletes.id` CASCADE |
| `athlete_name` | text | no | — | Denormalised for query convenience |
| `category` | text | no | — | `results_rankings` \| `media_interviews` \| `sponsorships` \| `career_changes` |
| `title` | text | no | — | Short headline |
| `summary` | text | yes | — | 2–3 sentence detail |
| `source_domain` | text | no | — | e.g. `worldathletics.org` |
| `source_url` | text | yes | — | Full URL to source (may be null) |
| `confidence` | integer | no | `80` | 0–100 confidence score |
| `published_at` | timestamp(tz) | yes | — | Date of original publication |
| `discovered_at` | timestamp(tz) | no | `now()` | When we recorded this item |

**Indexes:** `athlete_id`, `discovered_at`

**Known issue:** `source_domain` may contain placeholder values like `source4` or `unknown` for some athletes. `source_url` may contain citation index strings like `[8]` rather than real URLs. See `docs/technical-debt.md`.

---

### `competitions`

Competition history and upcoming calendar for each athlete.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | serial | no | auto | Primary key |
| `athlete_id` | integer | no | — | FK → `athletes.id` CASCADE |
| `athlete_name` | text | no | — | Denormalised |
| `meet_name` | text | no | — | Competition name |
| `event` | text | no | — | Event within the meet |
| `location` | text | yes | — | City, Country |
| `date` | date | no | — | Competition date (YYYY-MM-DD) |
| `tier` | text | no | `"B"` | `A` (Worlds/Olympics/DL) \| `B` (continental/national) \| `C` (domestic) |
| `status` | text | no | `"upcoming"` | `upcoming` \| `completed` \| `cancelled` |
| `result` | text | yes | — | e.g. `"1st (1:43.64)"` or `"3rd"` |
| `created_at` | timestamp(tz) | no | `now()` | |

**Indexes:** `athlete_id`, `date`

**Important:** The `status` field is set by the pipeline at insertion time. The view layer flips `upcoming → completed` for past dates, but this does NOT update the database row. Run `flushStaleCompetitionStatuses()` or the scheduler to persist the flip.

**Known issue:** Competitions stored without a `result` despite having passed their date — the backfill mechanism fails on generic meet names. See `docs/technical-debt.md`.

---

### `timeline_events`

Chronological career milestones for each athlete.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | serial | no | auto | Primary key |
| `athlete_id` | integer | no | — | FK → `athletes.id` CASCADE |
| `date` | date | no | — | YYYY-MM-DD |
| `category` | text | no | — | `competition` \| `media` \| `sponsorship` \| `career` \| `personal` |
| `title` | text | no | — | Short event title |
| `description` | text | yes | — | Additional context |
| `location` | text | yes | — | |
| `source_domain` | text | no | — | |
| `source_url` | text | yes | — | |
| `confidence` | integer | no | `85` | 0–100 |
| `significant` | boolean | no | `false` | True for career-defining events |

**Indexes:** `athlete_id`, `date`

**Target count:** 20–30 events per athlete. Most athletes currently have 2–10. See `docs/technical-debt.md`.

---

### `contacts`

Known contacts in each athlete's network — coaches, agents, sponsors, medical staff.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | serial | no | auto | Primary key |
| `athlete_id` | integer | no | — | FK → `athletes.id` CASCADE |
| `role` | text | no | — | e.g. "Head Coach", "Agent" |
| `category` | text | no | — | `management` \| `coaching` \| `medical` \| `media` \| `sponsorship` |
| `name` | text | no | — | Contact's full name |
| `org` | text | no | — | Organisation name |
| `org_type` | text | yes | — | e.g. "National Federation" |
| `status` | text | no | `"verified"` | `verified` \| `unconfirmed` \| `historical` |
| `confidence` | integer | no | `80` | 0–100 |
| `public_email` | text | yes | — | Publicly available only |
| `website` | text | yes | — | |
| `note` | text | yes | — | Additional context |
| `last_verified` | date | no | — | YYYY-MM-DD |
| `date_discovered` | date | no | — | YYYY-MM-DD |
| `source_domain` | text | no | — | |
| `source_excerpt` | text | yes | — | Relevant quote from source |

**Indexes:** `athlete_id`

**Known issue:** 4 of 5 athletes have zero contacts. Contact extraction relies on the general Perplexity research pass which rarely surfaces coach/agent names explicitly. See `docs/technical-debt.md`.

---

### `alert_configs`

Per-athlete notification preferences. One row per athlete (primary key is `athlete_id`).

| Column | Type | Default | Notes |
|---|---|---|---|
| `athlete_id` | integer | — | PK + FK → `athletes.id` CASCADE |
| `results_enabled` | boolean | `true` | |
| `results_frequency` | text | `"immediate"` | `immediate` \| `daily` \| `weekly` |
| `media_enabled` | boolean | `true` | |
| `media_frequency` | text | `"daily"` | |
| `sponsorships_enabled` | boolean | `true` | |
| `sponsorships_frequency` | text | `"daily"` | |
| `career_enabled` | boolean | `true` | |
| `career_frequency` | text | `"immediate"` | |

---

### `contact_enquiries`

Lead capture from the public contact form (`/contact` page).

| Column | Type | Default | Notes |
|---|---|---|---|
| `id` | serial | auto | Primary key |
| `type` | text | `"general"` | `demo` \| `sales` \| `general` |
| `name` | text | — | Submitter name |
| `org` | text | — | Organisation |
| `email` | text | — | Contact email |
| `role` | text (nullable) | — | Job title |
| `athletes` | text (nullable) | — | Roster size (demo enquiries) |
| `message` | text (nullable) | — | Free-form message |
| `status` | text | `"new"` | `new` \| `read` \| `replied` |
| `created_at` | timestamp(tz) | `now()` | |

---

### `conversations` / `messages`

Persistent chat history for the AI analyst feature.

**`conversations`:** `id`, `title`, `created_at`  
**`messages`:** `id`, `conversation_id` (FK), `role` (`user`|`assistant`), `content`, `created_at`

---

### `agent_runs`

Added in Task #27 Milestone 0 (see `docs/task-27-agentic-pipeline.md` §3.5, §10). Append-only execution log for the agentic pipeline — one row per agent invocation, per athlete, per pipeline run.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | serial | no | auto | Primary key |
| `athlete_id` | integer | no | — | FK → `athletes.id` CASCADE |
| `agent` | text | no | — | e.g. `identity` \| `results` \| `competitions` \| `legacy_monolith` |
| `status` | text | no | — | `ok` \| `empty` \| `error` |
| `ran_at` | timestamp(tz) | no | `now()` | |
| `latency_ms` | integer | yes | — | |
| `tokens_used` | integer | yes | — | |
| `retries` | integer | no | `0` | |
| `error_classification` | text | yes | — | `transient` \| `malformed_output` \| null |

**Indexes:** `athlete_id`, `agent`, `ran_at`

**Not yet written to.** The orchestrator introduced in Milestone 2 is the first caller — as of Milestone 0 this table exists, empty, ahead of any consumer.

---

### `evidence_log`

Also added in Milestone 0 (see `docs/task-27-agentic-pipeline.md` §5). Append-only audit trail of raw agent output, deliberately separate from the clean, validated tables above — nothing filters or validates this table's contents. Exists so a value that looks wrong in a clean table can be traced back to exactly what the source model saw and said.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | serial | no | auto | Primary key |
| `athlete_id` | integer | no | — | FK → `athletes.id` CASCADE |
| `agent` | text | no | — | |
| `raw_research` | text | yes | — | Full research text as returned by the source model |
| `raw_citations` | jsonb | yes | — | Array of citation URLs as returned |
| `raw_extraction` | text | yes | — | Full extracted JSON string, before validation |
| `created_at` | timestamp(tz) | no | `now()` | |

**Indexes:** `athlete_id`, `agent`

**Not yet written to**, for the same reason as `agent_runs`.

---

### `audit_runs`

Added alongside the Intelligence Audit admin feature — **not** part of Task #27's pipeline redesign, and unlike `agent_runs`/`evidence_log` above, this table is live and written to from the moment the feature ships. One row per audit run.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | serial | no | auto | Primary key |
| `status` | text | no | `"running"` | `running` \| `completed` \| `failed` |
| `athlete_ids` | jsonb | no | — | Array of athlete IDs included in this run |
| `triggered_at` | timestamp(tz) | no | `now()` | |
| `completed_at` | timestamp(tz) | yes | — | |
| `progress_completed` | integer | no | `0` | Updated as each athlete finishes, for live polling |
| `progress_total` | integer | no | — | |
| `overall_iqs` | integer | yes | — | Set once `status` is `completed` |
| `report` | jsonb | yes | — | The full `AuditRunReport` — see `artifacts/api-server/src/lib/pipeline/auditReport.ts` |
| `error_message` | text | yes | — | Set only if `status` is `failed` |

No foreign key to `athletes` — `athlete_ids` is a snapshot array, since an audit run should remain readable even if an audited athlete is later deleted.

---

### Stripe Schema (`stripe.*`)

Managed automatically by `stripe-replit-sync`. Provisioned in a separate PostgreSQL schema via `runMigrations({ schema: "stripe" })` on server startup. Do not modify manually.

---

## Relationships

```
athletes (1)
  ├── intelligence_items (many)   ON DELETE CASCADE
  ├── competitions (many)         ON DELETE CASCADE
  ├── timeline_events (many)      ON DELETE CASCADE
  ├── contacts (many)             ON DELETE CASCADE
  ├── alert_configs (1:1)        ON DELETE CASCADE
  ├── agent_runs (many)           ON DELETE CASCADE  [Task #27, unused until M2]
  └── evidence_log (many)         ON DELETE CASCADE  [Task #27, unused until M2]

audit_runs                        (standalone — athlete_ids is a snapshot array, no FK)
contact_enquiries                 (standalone — no FK)
conversations (1)
  └── messages (many)            ON DELETE CASCADE
```

---

## Migrations

Drizzle does not generate migration files in this project — it uses `drizzle-kit push` to apply the current TypeScript schema directly.

**To apply schema changes:**
```bash
pnpm --filter @workspace/db run push
```

**To apply schema changes with force (drops/recreates columns):**
```bash
pnpm --filter @workspace/db run push-force
```

**Warning:** `push-force` can destroy data. Only use it in development or on empty tables.

**Production:** Run `push` (not `push-force`) against the production `DATABASE_URL` before deploying code that depends on new columns.

---

## Current Limitations

1. No migration history — schema changes can't be rolled back safely
2. `athlete_name` is denormalised in `intelligence_items` and `competitions` — can drift from `athletes.name` if the athlete is renamed
3. No full-text search index — athlete search uses `ilike` pattern matching
4. No soft-delete — deleting an athlete is permanent and cascades immediately
5. `follower_growth_30d` and `avg_engagement` are stored but never currently computed by the pipeline (always 0)
6. Chat `conversations`/`messages` schema exists but the frontend currently uses session-only state (messages are not persisted between sessions in the current UI)
