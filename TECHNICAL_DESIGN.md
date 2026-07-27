# Athlete Intelligence — Technical Design: Accuracy-First Architecture

> **Document type:** Technical Design Specification  
> **Status:** Awaiting approval — no code has been changed  
> **Purpose:** Redesign of the intelligence engine to support permanent athlete identities, verified evidence, and continuous monitoring from high school through international level

---

## Table of Contents

1. [Design Principles](#1-design-principles)
2. [Identity Engine](#2-identity-engine)
3. [Source Engine](#3-source-engine)
4. [Evidence Engine](#4-evidence-engine)
5. [Timeline Engine](#5-timeline-engine)
6. [Continuous Monitoring Engine](#6-continuous-monitoring-engine)
7. [Social Media Engine](#7-social-media-engine)
8. [AI Layer](#8-ai-layer)
9. [Gap Analysis — Current vs Proposed](#9-gap-analysis)
10. [Migration Path](#10-migration-path)

---

## 1. Design Principles

Before the technical detail, nine principles govern every decision in this design:

| # | Principle | Meaning |
|---|---|---|
| P1 | **Evidence-first** | No fact is stored without a source. No AI claim is made without a cited DB row. |
| P2 | **Append-only** | History is never overwritten. Every change creates a new record. |
| P3 | **Source hierarchy** | Higher-authority sources always win, explicitly, with a documented reason. |
| P4 | **Identity permanence** | One athlete = one identity forever, from first known result to retirement. |
| P5 | **Explicit uncertainty** | Estimated values are labelled as estimates. Unknown values are null, not guessed. |
| P6 | **Verified before stored** | AI extraction is a hypothesis. It is only promoted to verified when cross-checked against a second source or a human confirms. |
| P7 | **Auditability** | Every stored fact must be traceable to: who found it, when, from where, and with what confidence. |
| P8 | **Graceful degradation** | If a data source is unavailable, the system stores nothing rather than a guess. |
| P9 | **Separation of concerns** | Collection, verification, storage, and presentation are separate layers. A bug in presentation must never affect stored data. |

---

## 2. Identity Engine

### 2.1 The Problem

A name is not an identity. "James Wilson" might be a high school javelin thrower in Christchurch and an Olympic triathlete from Australia simultaneously. "Brook Macdonald" is unique today, but once the platform covers 100,000 athletes, collisions will occur. The current implementation stores a single name string and relies on Perplexity to "find the right person" — which it demonstrably fails to do.

### 2.2 Athlete Identity Record

Each athlete gets a single canonical identity record that is created once and never destroyed. The identity record is separate from the profile data, which changes over time.

#### `athlete_identities` table

```sql
CREATE TABLE athlete_identities (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by    TEXT NOT NULL,           -- 'system' | clerk user id

  -- Core immutable identifiers (set at creation, never overwritten)
  canonical_name        TEXT NOT NULL,   -- Full name as first confirmed
  canonical_sport       TEXT NOT NULL,   -- Primary sport
  canonical_nationality TEXT NOT NULL,   -- IOC nationality code (e.g. NZL)
  birth_year            INTEGER,         -- Not full DOB — birth year sufficient for disambiguation
  gender                TEXT,            -- 'male' | 'female' | 'non-binary' | null

  -- External federation IDs (authoritative, immutable once verified)
  world_athletics_id    TEXT UNIQUE,     -- World Athletics competitor ID
  uci_id                TEXT UNIQUE,     -- UCI cycling ID
  fis_id                TEXT UNIQUE,     -- FIS skiing ID
  fina_id               TEXT UNIQUE,     -- World Aquatics
  itf_id                TEXT UNIQUE,     -- ITF tennis
  world_rugby_id        TEXT UNIQUE,
  fifa_id               TEXT UNIQUE,
  custom_federation_ids JSONB,           -- { "federation_code": "athlete_id", ... }

  -- Disambiguation fingerprint (computed, used for dedup check)
  identity_fingerprint  TEXT GENERATED ALWAYS AS (
    lower(canonical_name) || '|' || canonical_nationality || '|' || canonical_sport
  ) STORED,

  -- Status
  status          TEXT NOT NULL DEFAULT 'active',   -- 'active' | 'retired' | 'merged' | 'deceased'
  merged_into_id  UUID REFERENCES athlete_identities(id), -- if this was a duplicate
  identity_confidence INTEGER NOT NULL DEFAULT 70,  -- 0-100: how confident we are this is a unique person

  -- Human verification
  verified_by     TEXT,     -- clerk user id who confirmed identity
  verified_at     TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_identity_fingerprint ON athlete_identities(identity_fingerprint);
CREATE INDEX idx_identity_name ON athlete_identities(lower(canonical_name));
CREATE INDEX idx_identity_sport_nationality ON athlete_identities(canonical_sport, canonical_nationality);
```

#### Design decisions:

**UUID not serial integer.** UUIDs allow identities to be created in any environment (local dev, different services) without collision. They also cannot be guessed or enumerated by a user.

**Fingerprint uniqueness.** `name|nationality|sport` as a unique index prevents duplicate creation of the same person. If two creation attempts match the same fingerprint, the second returns the existing identity.

**Federation IDs are the gold standard.** A World Athletics competitor ID uniquely identifies a person in that sport globally. Once confirmed, no two athletes can share one. The system should populate these during identity creation or verification.

**Birth year, not full DOB.** We will encounter athletes who have never publicised their full date of birth (particularly school-age athletes). Birth year alone is sufficient to distinguish two "James Wilson" athletes in the same sport and nationality.

**Merged identities.** If a duplicate identity is created for the same person (before the dedup check was in place, or because the fingerprint differed), the older record is merged into the canonical one. The merged record is not deleted — it points to `merged_into_id`. All child records (evidence, timeline, social) are re-pointed to the canonical identity.

---

### 2.3 Identity Confirmation Process

Creating an athlete identity is a two-phase process:

**Phase 1 — Candidate creation** (automated)

```
User submits: "Brook Macdonald, Downhill Cycling, New Zealand"
  │
  ├─► Check fingerprint index: does this identity already exist?
  │     If yes → return existing identity (no duplicate created)
  │
  ├─► Check name similarity: are there identities with similar names
  │   in the same sport/nationality? (Levenshtein distance < 2)
  │     If yes → flag for human confirmation before proceeding
  │
  ├─► AI discovery pass (GPT-4o, structured output):
  │     Input: name, sport, nationality
  │     Output: { birth_year, known_federation_ids, known_aliases,
  │               disambiguation_notes, confidence_score }
  │     Note: GPT is ONLY used to hypothesise — nothing is stored yet
  │
  └─► Create identity_candidate (not yet an athlete_identity)
        Status: 'pending_confirmation'
```

**Phase 2 — Confirmation** (can be automated or human)

```
For automated confirmation:
  ├─► Query at least ONE authoritative source for this identity:
  │     - World Athletics API → match competitor ID
  │     - UCI API → match competitor ID
  │     - Wikipedia exact title match
  │     Any single authoritative source → identity confirmed
  │
  └─► If no authoritative source found:
        - Identity created with confidence = 50, status = 'unverified'
        - No intelligence pipeline runs yet
        - Admin is notified: "Unverified identity needs review"
        - User sees: "Finding this athlete..." until confirmed
```

---

### 2.4 Handling Athletes with Identical Names

Three-layer disambiguation:

**Layer 1: Fingerprint.** `name|nationality|sport` uniqueness means two athletes with the same name but different sports/nationalities are stored as separate identities correctly.

**Layer 2: Birth year.** If name, nationality, and sport all match, birth year differentiates them (e.g., two New Zealand high jumpers named James Wilson born in 2002 and 2008).

**Layer 3: Federation ID.** Once a federation ID is attached, it overrides all other disambiguation. Two athletes cannot share a World Athletics ID.

**Collision UI.** When a user adds an athlete and the fingerprint matches an existing identity, the UI shows: "We already have [Name], [Sport], [Nationality]. Is this the same person?" with options: "Yes, use existing" | "No, this is a different athlete" (which triggers birth year capture).

---

## 3. Source Engine

### 3.1 Source Hierarchy

Sources are ranked in seven tiers. A higher-tier source always supersedes a lower-tier source for the same fact, unless the higher-tier source is more than 12 months older.

```
TIER 1 — Official Governing Body (authoritative, machine-readable)
  World Athletics (worldathletics.org) — result databases, rankings, bios
  UCI (uci.org) — cycling results, rankings
  FIS (fis-ski.com) — alpine/freestyle/ski results
  World Aquatics (aquatics.sport) — swimming/diving/water polo
  World Rugby (world.rugby) — match results
  ITF / ATP / WTA — tennis rankings and results
  FIFA / UEFA — football results
  National federation APIs (Athletics NZ, Cycling NZ, etc.)

TIER 2 — Official Athlete Pages
  athlete.com / athlete personal website
  Official club/academy page managed by the athlete

TIER 3 — Official Team / Club Pages
  Club website (verified as official)
  National team selection announcements

TIER 4 — Verified Result Databases
  Tilastopaja (athletics stats)
  Power of 10 (UK athletics)
  SwimRankings.net
  FirstCycling.com
  ProCyclingStats.com
  Race-specific official results pages (e.g. nyrr.org, ironman.com)

TIER 5 — Education & Development
  School sports association results (NZSSSA, etc.)
  University sports association results
  State/provincial sports bodies

TIER 6 — Verified News & Media
  Reuters Sport, AP Sport, BBC Sport, NZ Herald Sport
  Named sports journalists with track record on this sport
  Official press release content

TIER 7 — Social & AI-Estimated
  Official social media accounts (athlete-verified)
  Unofficial social media
  AI-estimated data from Perplexity research
  Wikipedia
```

### 3.2 Source Registry

Every source the system has ever used is registered in a `sources` table. This is the single source of truth for domain authority.

```sql
CREATE TABLE sources (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain        TEXT NOT NULL UNIQUE,       -- e.g. 'worldathletics.org'
  display_name  TEXT NOT NULL,              -- 'World Athletics'
  tier          INTEGER NOT NULL CHECK (tier BETWEEN 1 AND 7),
  source_type   TEXT NOT NULL,              -- 'api' | 'web' | 'social' | 'ai_estimated'
  sport_scope   TEXT[],                     -- null = all sports; ['athletics', 'cycling'] = specific
  is_official   BOOLEAN NOT NULL DEFAULT false,
  api_available BOOLEAN NOT NULL DEFAULT false,
  api_base_url  TEXT,
  rate_limit_rpm INTEGER,                   -- requests per minute, null = unknown
  requires_auth BOOLEAN NOT NULL DEFAULT false,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_verified TIMESTAMPTZ
);
```

### 3.3 Source Override Rules

When two sources conflict (e.g., World Athletics says a PB is 2.33m, a newspaper says 2.35m):

```
Rule 1: Higher tier wins unconditionally if retrieved within 12 months.
Rule 2: If the higher-tier source is >12 months old, lower-tier may override
         only if it provides an event date that post-dates the higher-tier retrieval.
Rule 3: If tiers are equal, the source with a more specific event citation wins.
         (e.g., a source citing "Diamond League, Zurich, Aug 22 2024" > "estimated")
Rule 4: Never silently overwrite. Store both facts. Flag the conflict.
         The system stores: current_value, previous_value, conflict_reason.
Rule 5: An AI-estimated value (Tier 7) can NEVER override a Tier 1-4 value,
         regardless of date. It can only fill a null.
```

---

## 4. Evidence Engine

### 4.1 Core Concept

Every fact stored in the system is an **evidence-backed claim**. There is no "profile data" that can be silently overwritten. Instead, there is a log of claims, each pointing to a source, each with a confidence score and a retrieval timestamp. The currently-believed value for any field is derived by querying which evidence claim is highest-tier, most recent, and uncontradicted.

### 4.2 Schema

#### `evidence_items` table

This is the central table of the entire redesigned system.

```sql
CREATE TABLE evidence_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_identity_id UUID NOT NULL REFERENCES athlete_identities(id),

  -- What this evidence is about
  fact_type           TEXT NOT NULL,
  -- Controlled vocabulary:
  -- 'competition_result' | 'ranking' | 'personal_best' | 'season_best'
  -- 'sponsorship' | 'team_affiliation' | 'coach' | 'agent' | 'club'
  -- 'social_handle' | 'social_followers' | 'social_engagement'
  -- 'biography_detail' | 'education' | 'nationality' | 'age'
  -- 'media_appearance' | 'award' | 'injury' | 'career_transition'
  -- 'photo_url' | 'profile_url' | 'contact_detail'

  -- The claimed value
  fact_value          TEXT NOT NULL,       -- human-readable value ("2.36m", "45,200 followers")
  fact_value_numeric  NUMERIC,             -- machine-comparable (for rankings, times, counts)
  fact_unit           TEXT,                -- 'm' | 'followers' | 'seconds' | 'rank' | etc.
  fact_date           DATE,                -- the date this fact was true (event date, not retrieval)
  fact_date_precision TEXT DEFAULT 'day',  -- 'day' | 'month' | 'year' | 'approximate'

  -- Source provenance
  source_id           UUID NOT NULL REFERENCES sources(id),
  source_url          TEXT,                -- exact URL of the page/API response
  source_title        TEXT,                -- page/article title
  evidence_text       TEXT,                -- verbatim excerpt or quote from the source
  evidence_context    TEXT,                -- surrounding paragraph for disambiguation

  -- Retrieval metadata
  retrieved_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  retrieved_by        TEXT NOT NULL,       -- 'pipeline_auto' | 'admin_manual' | clerk_user_id
  retrieval_method    TEXT NOT NULL,       -- 'api' | 'perplexity_search' | 'wikipedia' | 'human'

  -- Confidence
  confidence          INTEGER NOT NULL CHECK (confidence BETWEEN 0 AND 100),
  confidence_basis    TEXT,
  -- 'federation_api'          → 95-100
  -- 'official_results_page'   → 85-95
  -- 'verified_news'           → 70-85
  -- 'ai_extracted_with_cite'  → 50-70
  -- 'ai_estimated'            → 10-49

  -- Verification lifecycle
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  -- 'unverified'    → stored but not cross-checked
  -- 'corroborated'  → confirmed by ≥1 independent source of equal/higher tier
  -- 'verified'      → confirmed by human or Tier 1-2 API
  -- 'disputed'      → contradicted by another source, needs resolution
  -- 'superseded'    → a newer, higher-confidence claim for the same fact exists
  -- 'rejected'      → determined to be wrong

  corroborated_by     UUID[],              -- array of other evidence_item IDs that agree
  disputed_by         UUID[],              -- array of evidence_item IDs that contradict
  superseded_by       UUID REFERENCES evidence_items(id),

  last_verified_at    TIMESTAMPTZ,
  verified_by         TEXT,                -- clerk user id or 'system'

  -- AI extraction metadata
  ai_model_used       TEXT,               -- exact model string used to extract this
  ai_prompt_version   TEXT,               -- version hash of the extraction prompt
  raw_ai_output       TEXT,               -- full JSON response (for debugging)

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_evidence_athlete ON evidence_items(athlete_identity_id);
CREATE INDEX idx_evidence_fact_type ON evidence_items(athlete_identity_id, fact_type);
CREATE INDEX idx_evidence_fact_date ON evidence_items(athlete_identity_id, fact_date DESC);
CREATE INDEX idx_evidence_status ON evidence_items(verification_status);
CREATE INDEX idx_evidence_source ON evidence_items(source_id);
CREATE INDEX idx_evidence_retrieved ON evidence_items(retrieved_at DESC);
```

#### `evidence_supporting_sources` table

For when multiple sources support the same fact (corroboration):

```sql
CREATE TABLE evidence_supporting_sources (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_item_id  UUID NOT NULL REFERENCES evidence_items(id) ON DELETE CASCADE,
  source_id         UUID NOT NULL REFERENCES sources(id),
  source_url        TEXT,
  evidence_text     TEXT,
  retrieved_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 4.3 How "Current Value" Is Derived

There is no single `personal_best` column. Instead, the current PB is the answer to:

```sql
SELECT fact_value
FROM evidence_items
WHERE athlete_identity_id = $1
  AND fact_type = 'personal_best'
  AND verification_status NOT IN ('rejected', 'disputed')
ORDER BY
  (SELECT tier FROM sources WHERE id = source_id) ASC,   -- lower tier number = higher authority
  confidence DESC,
  fact_date DESC NULLS LAST,
  retrieved_at DESC
LIMIT 1;
```

This query always returns the most authoritative, most recent, highest-confidence non-rejected value for any field. The system never needs to "update a profile" — it just stores new evidence and the query automatically surfaces the best known value.

### 4.4 Confidence Score Framework

| Value | Basis | Examples |
|---|---|---|
| 95–100 | Federation API, machine-readable | World Athletics API result, UCI points table |
| 85–94 | Official results page, no AI involved | Ironman official results PDF, NZOC selection list |
| 70–84 | Verified news outlet, named journalist | BBC Sport article with event citation |
| 55–69 | AI extraction from cited Perplexity source | Perplexity found the page, GPT extracted the value, URL verified |
| 40–54 | AI extraction, source cited but unverifiable | Perplexity cited a URL that returns 404 |
| 20–39 | AI estimated, no specific source | GPT training knowledge |
| 0–19 | Contradicted or speculative | Disputed by higher-authority source |

---

## 5. Timeline Engine

### 5.1 Design Concept

A profile is a snapshot. A timeline is the truth. Every meaningful event in an athlete's career is an immutable event on their timeline. Nothing is ever deleted or overwritten — events are added, and corrections create new events that reference and supersede old ones.

### 5.2 Schema

#### `timeline_events` (redesigned)

```sql
CREATE TABLE timeline_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_identity_id UUID NOT NULL REFERENCES athlete_identities(id),

  -- Event classification
  event_type          TEXT NOT NULL,
  -- Controlled vocabulary:
  -- COMPETITION: 'competition_result' | 'competition_dnf' | 'competition_dns' | 'competition_dq'
  -- RANKING: 'world_ranking' | 'national_ranking' | 'seeding'
  -- CAREER: 'team_joined' | 'team_left' | 'coach_appointed' | 'coach_departed'
  --         'sponsorship_signed' | 'sponsorship_ended' | 'turned_professional'
  --         'retired' | 'returned_from_retirement' | 'nationality_change'
  -- EDUCATION: 'school_enrollment' | 'school_graduation' | 'university_enrollment'
  --            'university_graduation' | 'scholarship_awarded'
  -- ACHIEVEMENT: 'personal_best' | 'national_record' | 'continental_record' | 'world_record'
  --              'award' | 'selection_announcement' | 'hall_of_fame'
  -- HEALTH: 'injury' | 'surgery' | 'return_from_injury'
  -- MEDIA: 'interview' | 'documentary' | 'endorsement_announcement'
  -- SOCIAL: 'social_milestone' (e.g. "reached 100K followers")
  -- SYSTEM: 'profile_created' | 'identity_verified' | 'identity_merged'

  -- Timing
  event_date          DATE NOT NULL,
  event_date_precision TEXT NOT NULL DEFAULT 'day',  -- 'day' | 'month' | 'year' | 'approximate'
  event_date_display  TEXT,       -- human-friendly: "August 2019" | "circa 2018" | "Summer 2024"
  event_end_date      DATE,       -- for ongoing events (sponsorships, team memberships)
  is_ongoing          BOOLEAN NOT NULL DEFAULT false,

  -- Content
  title               TEXT NOT NULL,
  description         TEXT,
  location            TEXT,
  location_country    TEXT,   -- ISO country code

  -- Competition-specific
  competition_name    TEXT,
  competition_tier    TEXT,   -- 'olympics' | 'worlds' | 'continental' | 'national' | 'regional' | 'local'
  event_discipline    TEXT,   -- 'High Jump' | 'Downhill' | '100m Freestyle'
  result_value        TEXT,   -- '2.36m' | '01:23.45' | '1st'
  result_numeric      NUMERIC,
  result_unit         TEXT,
  result_rank         INTEGER,
  total_competitors   INTEGER,

  -- Significance
  significance        INTEGER NOT NULL DEFAULT 3,  -- 1 (minor) to 5 (career-defining)
  is_pb               BOOLEAN NOT NULL DEFAULT false,
  is_national_record  BOOLEAN NOT NULL DEFAULT false,
  is_continental_record BOOLEAN NOT NULL DEFAULT false,
  is_world_record     BOOLEAN NOT NULL DEFAULT false,

  -- Evidence linkage (every event MUST have at least one evidence item)
  primary_evidence_id UUID NOT NULL REFERENCES evidence_items(id),
  additional_evidence_ids UUID[],   -- corroborating evidence

  -- Lifecycle
  superseded_by       UUID REFERENCES timeline_events(id),   -- correction creates new event
  is_superseded       BOOLEAN NOT NULL DEFAULT false,
  notes               TEXT,   -- curator notes

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by          TEXT NOT NULL
);

-- Indexes
CREATE INDEX idx_timeline_athlete ON timeline_events(athlete_identity_id);
CREATE INDEX idx_timeline_date ON timeline_events(athlete_identity_id, event_date DESC);
CREATE INDEX idx_timeline_type ON timeline_events(athlete_identity_id, event_type);
CREATE INDEX idx_timeline_significance ON timeline_events(athlete_identity_id, significance DESC);
CREATE INDEX idx_timeline_active ON timeline_events(athlete_identity_id, event_date DESC)
  WHERE is_superseded = false;
```

### 5.3 Correction Model

When a fact is found to be wrong:

```
Old event: PB = 2.33m, source = newspaper article, confidence = 60
New event: PB = 2.36m, source = World Athletics API, confidence = 98

Action:
  1. Insert new timeline_event (PB = 2.36m)
  2. Set old_event.superseded_by = new_event.id
  3. Set old_event.is_superseded = true
  4. Log in evidence_items: old evidence status → 'superseded'
  5. The timeline view shows only non-superseded events by default
  6. Admin can toggle "show corrections" to see the full history

The old data is NEVER deleted. It is auditable forever.
```

---

## 6. Continuous Monitoring Engine

### 6.1 Architecture

Continuous monitoring requires a proper job queue — not a detached background promise. The design uses a database-backed job queue (no external infrastructure required — just a PostgreSQL table).

#### `crawl_jobs` table

```sql
CREATE TABLE crawl_jobs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_identity_id UUID NOT NULL REFERENCES athlete_identities(id),

  -- Job specification
  job_type            TEXT NOT NULL,
  -- 'full_populate'        → new athlete, run everything
  -- 'results_check'        → check for new competition results
  -- 'rankings_check'       → check current world/national rankings
  -- 'social_snapshot'      → collect social media metrics
  -- 'sponsor_check'        → check for sponsorship changes
  -- 'news_scan'            → scan for news mentions
  -- 'photo_refresh'        → update profile photo
  -- 'identity_verify'      → confirm federation IDs

  -- Scheduling
  priority            INTEGER NOT NULL DEFAULT 5,  -- 1 (urgent) to 10 (low)
  scheduled_for       TIMESTAMPTZ NOT NULL DEFAULT now(),
  run_after           TIMESTAMPTZ,   -- earliest start time (rate limiting)

  -- Execution
  status              TEXT NOT NULL DEFAULT 'queued',
  -- 'queued' | 'running' | 'complete' | 'failed' | 'cancelled'
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  worker_id           TEXT,          -- which server instance picked this up
  attempt_count       INTEGER NOT NULL DEFAULT 0,
  max_attempts        INTEGER NOT NULL DEFAULT 3,
  last_error          TEXT,

  -- Results
  items_found         INTEGER,
  items_new           INTEGER,
  items_updated       INTEGER,
  summary             TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_crawl_queue ON crawl_jobs(status, priority, scheduled_for)
  WHERE status = 'queued';
CREATE INDEX idx_crawl_athlete ON crawl_jobs(athlete_identity_id, job_type, created_at DESC);
```

### 6.2 Job Scheduling Model

Different data types have different freshness requirements. The scheduler uses a priority × staleness score:

| Data type | Job type | Frequency (active athlete) | Frequency (retired) |
|---|---|---|---|
| Competition results | `results_check` | Within 24h of known event date; weekly otherwise | Monthly |
| World rankings | `rankings_check` | Weekly (most rankings publish weekly) | Monthly |
| National rankings | `rankings_check` | Weekly | Quarterly |
| Social metrics | `social_snapshot` | Daily | Weekly |
| News mentions | `news_scan` | Daily | Weekly |
| Sponsorships | `sponsor_check` | Weekly | Monthly |
| Team affiliation | `sponsor_check` | Monthly | Quarterly |
| Photo | `photo_refresh` | Monthly | Quarterly |
| Education | `full_populate` | On initial populate only; manual trigger thereafter | N/A |

**Priority scoring:**
```
priority = base_priority
         + recency_bonus (higher if athlete competed in last 30 days)
         + user_interest_bonus (higher if athlete is in an active dossier)
         + competition_proximity (higher in week before known event)
```

### 6.3 Change Detection

Before writing any new evidence, the system checks whether the value has actually changed:

```
For numeric facts (rankings, PBs, follower counts):
  new_value != current_best_evidence.fact_value_numeric → write new evidence_item

For text facts (team name, coach, sponsor):
  normalise(new_value) != normalise(current_best_evidence.fact_value) → write new evidence_item

For competition results:
  (competition_name + event_date + result_value) not already in evidence_items → write new

If nothing changed:
  Update existing evidence_item.last_verified_at = now()
  Do NOT create a new evidence_item (avoids noise)
```

### 6.4 What Is Monitored and How

| Signal | How detected | Source used |
|---|---|---|
| New competition results | Perplexity search "athlete_name results site:federation.org" | Tier 1–4 sources |
| Ranking changes | Federation API or weekly ranking page scrape | Tier 1 API preferred |
| Sponsorship changes | Perplexity news search + athlete social posts | Tier 6–7 |
| Team changes | Official team announcement pages | Tier 3 |
| Social growth | Platform APIs (Twitter); Perplexity for Instagram/TikTok estimate | See §7 |
| News mentions | Perplexity news search | Tier 6 |
| Awards | Federation announcements + news | Tier 1–2 + Tier 6 |
| Education | Manual entry or Perplexity + school sports results | Tier 5 |
| Publicly visible milestones | Perplexity + Wikipedia edits | Tier 6–7 |
| Injury/return | News scan (Perplexity) | Tier 6 |
| Retirement / return | Official federation + news | Tier 1 + Tier 6 |

---

## 7. Social Media Engine

### 7.1 What Is Actually Possible (Compliance Reality)

| Platform | Official public API | What's available | Rate limits |
|---|---|---|---|
| X (Twitter) | ✅ v2 API | Follower count, following, tweet count, bio | Free: 500K reads/month |
| YouTube | ✅ Data API v3 | Subscriber count, video count, view count | 10,000 units/day |
| Facebook | ❌ Public page data removed | Page follower count only with Page access | Not available public |
| Instagram | ❌ No public follower count API | Nothing without the user's own token | Not available public |
| TikTok | ❌ No public follower count API | Nothing without Creator Market API approval | Not available public |
| LinkedIn | ❌ | Nothing useful for athletes | Not available public |

**Consequence:** Instagram and TikTok follower counts will always be estimates unless the athlete themselves authorises access. The system must be honest about this.

### 7.2 Schema

#### `social_handles` table — verified handle registry

```sql
CREATE TABLE social_handles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_identity_id UUID NOT NULL REFERENCES athlete_identities(id),
  platform            TEXT NOT NULL,   -- 'twitter' | 'instagram' | 'tiktok' | 'youtube' | 'facebook'
  handle              TEXT NOT NULL,   -- without @ symbol
  profile_url         TEXT,
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  -- 'unverified'   → AI found this handle, not confirmed
  -- 'confirmed'    → verified by cross-referencing: bio contains athlete name + sport
  -- 'athlete_confirmed' → athlete themselves confirmed it (future: via OAuth)
  -- 'disputed'     → another source claims a different handle
  -- 'inactive'     → account no longer active
  evidence_id         UUID REFERENCES evidence_items(id),
  confirmed_at        TIMESTAMPTZ,
  is_primary          BOOLEAN NOT NULL DEFAULT false,   -- primary account for this platform
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_social_handle_unique ON social_handles(platform, handle);
CREATE INDEX idx_social_athlete ON social_handles(athlete_identity_id);
```

#### `social_snapshots` table — historical metric tracking

```sql
CREATE TABLE social_snapshots (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  social_handle_id    UUID NOT NULL REFERENCES social_handles(id),
  athlete_identity_id UUID NOT NULL REFERENCES athlete_identities(id),
  platform            TEXT NOT NULL,

  -- The metrics
  follower_count      BIGINT,
  following_count     BIGINT,
  post_count          BIGINT,
  engagement_rate     NUMERIC(6,4),   -- computed where possible
  subscriber_count    BIGINT,         -- YouTube
  view_count          BIGINT,         -- YouTube

  -- Data quality
  data_source         TEXT NOT NULL,
  -- 'twitter_api'         → verified, live
  -- 'youtube_api'         → verified, live
  -- 'perplexity_estimate' → estimated, AI
  -- 'manual_entry'        → human entered
  is_verified         BOOLEAN NOT NULL DEFAULT false,   -- true only if from official API
  confidence          INTEGER NOT NULL,                 -- follows same 0-100 scale as evidence

  -- Source traceability
  source_url          TEXT,
  retrieved_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  retrieved_by        TEXT NOT NULL

  -- Growth (computed at insert time)
  follower_delta_7d   BIGINT,   -- change from snapshot 7 days ago
  follower_delta_30d  BIGINT,   -- change from snapshot 30 days ago
);

CREATE INDEX idx_social_snapshot_athlete ON social_snapshots(athlete_identity_id, platform, retrieved_at DESC);
CREATE INDEX idx_social_snapshot_handle ON social_snapshots(social_handle_id, retrieved_at DESC);
```

### 7.3 Handle Verification Process

Before a social handle is shown as confirmed, the system runs a three-step verification:

```
Step 1 — Name check:
  Fetch the account's bio/display name via the platform's API or Perplexity.
  Require: athlete's first AND last name appears in the bio OR display name.
  (prevents assigning a fan account or namesake)

Step 2 — Sport signal check:
  Bio or recent posts contain the athlete's sport keyword or federation handle.
  (e.g., bio says "🚴‍♂️ @UCI_cycling" or "World Athletics ambassador")

Step 3 — Cross-reference check:
  At least one Tier 1–4 source references this exact handle for this athlete.
  (e.g., World Athletics athlete profile links to @handle)

All three → status: 'confirmed'
Steps 1+2 only → status: 'unverified' (shown with ⚠ in UI)
Step 3 only → status: 'unverified'
None → not stored (discarded)
```

### 7.4 Presenting Estimated vs Verified Data

Every follower count shown in the UI must have a clear label:

| Data source | UI label | Indicator |
|---|---|---|
| Official API (Twitter, YouTube) | "45,200 followers" | ✅ green checkmark |
| Perplexity estimate, handle confirmed | "≈ 45K followers (estimated)" | 🔶 amber |
| Perplexity estimate, handle unverified | "≈ 45K followers (unverified)" | ⚠ grey |
| No data | "—" | — |

The date of the last snapshot is always shown ("as of Jun 2025").

---

## 8. AI Layer

### 8.1 Core Rule: AI is an Extraction Tool, Not a Knowledge Source

Under this design, the AI has one job: **read a piece of source text and convert it into structured data**. It does not decide what is true. It does not fill in gaps from training knowledge. It does not invent facts when sources are unclear.

The knowledge hierarchy is:

```
1. Tier 1 Federation API → stored directly, no AI involved
2. Tier 2-4 Structured pages → parsed directly where possible; AI used only for unstructured text
3. Tier 5-6 News / media → AI extracts claims, each claim must cite a specific sentence
4. Tier 7 Perplexity summary → AI extracts claims with explicit low confidence; marked as estimates
5. AI training knowledge → NEVER used for any stored fact
```

### 8.2 Evidence-Grounded Extraction Prompt Pattern

Every AI extraction call must follow this contract:

```
INPUT to AI:
  1. Source text (verbatim, from a specific URL)
  2. Source URL and retrieval timestamp
  3. Athlete identity (name, sport, nationality) for disambiguation
  4. Extraction target: "Extract only competition results from this text"
  5. Explicit prohibition: "If you cannot find [X] in this text, return null for that field.
     Do not use your training knowledge. Do not guess."

OUTPUT from AI:
  A JSON array of claims, each containing:
  {
    "fact_type": "competition_result",
    "fact_value": "2.36m",
    "fact_date": "2024-08-22",
    "evidence_text": "[verbatim sentence from source that supports this]",
    "confidence": 88,
    "confidence_basis": "direct_statement"  // vs "inferred" vs "estimated"
  }

VALIDATION before storing:
  - evidence_text must be a substring of the source text (exact match check)
  - If evidence_text does not appear in source text → reject the claim
  - confidence must be <= tier_ceiling (Tier 7 max = 49; Tier 6 max = 84)
  - fact_date must be parseable to a valid ISO date (no "Summer 2019")
  - If any required field is null → store nothing for that field (not a default)
```

### 8.3 AI Summary Generation

Dossier summaries are generated **only from stored evidence_items and timeline_events**, not from a fresh Perplexity call.

```
Process:
  1. Query: SELECT all evidence_items WHERE athlete_identity_id = $id
             AND verification_status IN ('verified', 'corroborated', 'unverified')
             AND confidence >= 40
             ORDER BY confidence DESC, fact_date DESC

  2. Group by fact_type. For each type, take the highest-confidence item.

  3. Build a structured context block for the AI:
     """
     VERIFIED FACTS (cite these freely):
     - Personal Best: 2.36m [Source: World Athletics, Aug 2024, confidence: 98]
     - World Ranking: #3 [Source: World Athletics, Jun 2025, confidence: 97]
     ...

     AI-ESTIMATED FACTS (use with qualifier "reportedly" or "estimated"):
     - Instagram followers: ~45K [Source: Perplexity estimate, Mar 2025, confidence: 35]

     UNVERIFIED FACTS (do not include in summary):
     [list omitted from prompt]
     """

  4. System prompt:
     "You are a sports intelligence analyst. Write a factual dossier summary.
      You MUST cite only facts provided in the VERIFIED FACTS section above.
      You MAY reference AI-ESTIMATED FACTS with an explicit qualifier ('reportedly', 'estimated').
      You MUST NOT include any fact not provided above.
      You MUST NOT use your training knowledge.
      If the verified facts are insufficient to write a meaningful summary, say so explicitly."

  5. Post-generation validation:
     - Parse all numeric values from the generated text
     - Check each against the provided fact values (within ±5% tolerance)
     - Any value that does not match a provided fact → flag for human review
     - Confidence score for the summary = average of contributing evidence confidence scores
```

### 8.4 AI Chat Responses

Chat follows the same evidence-first principle:

```
On user question received:
  1. Classify the question (which athletes, which fact types, what time period)
  2. Pre-fetch ALL relevant evidence_items and timeline_events for those athletes
  3. Build a grounded context block (same format as §8.3)
  4. Send to GPT-4o with system prompt:
     "Answer the question using ONLY the data provided below.
      For every claim you make, append the evidence ID in brackets: [ev-uuid].
      If the data does not contain the answer, say 'I don't have verified data on that.'
      Do not use your training knowledge."
  5. Parse the response. Extract all [ev-uuid] references.
  6. Validate: every referenced ID must exist in the pre-fetched evidence set.
  7. Return response with evidence citations embedded (clickable in UI → opens evidence detail)
```

### 8.5 Model Selection

| Task | Model | Why |
|---|---|---|
| Athlete identity discovery | `gpt-4o` | Needs broad knowledge to identify sport/nationality |
| Identity confirmation | `gpt-4o-mini` | Simple yes/no + brief explanation |
| Structured data extraction from source text | `gpt-4o` | High accuracy JSON generation, large context |
| Social handle extraction | `gpt-4o-mini` | Simple pattern matching |
| Photo URL extraction | `gpt-4o-mini` | Simple URL extraction from short text |
| Dossier summary generation | `gpt-4o` | Quality writing, grounded generation |
| Chat responses | `gpt-4o` | Tool-calling, multi-step reasoning |
| Web research (live search) | `perplexity/sonar-pro` | Only sonar-pro for all paths (not sonar) |

All models are accessed via the Replit AI Integrations proxy. No model aliases — only documented model strings.

---

## 9. Gap Analysis

### 9.1 What Exists Now vs What the Vision Requires

| Capability | Current State | Vision State | Gap |
|---|---|---|---|
| Athlete identity | `athletes.name` text column | UUID identity with federation IDs, fingerprint, disambiguation | Complete rebuild |
| Source tracking | `source_domain` text per item | `sources` registry with tier, `evidence_items` with full provenance | Complete rebuild |
| Evidence model | Flat columns on `athletes` table; overwritten on repopulate | Append-only `evidence_items` with confidence, status, verification | Complete rebuild |
| Timeline | `timeline_events` table (partial) | Redesigned with event types, significance, evidence FK, correction model | Major extension |
| Continuous monitoring | Manual repopulate only | Database job queue, scheduled crawls, change detection | New build |
| Social data | Flat columns (`instagram_followers`) overwritten | `social_handles` + `social_snapshots` with verification status | Major extension |
| Social verification | None | 3-step handle verification | New build |
| Source hierarchy | None | 7-tier registry with override rules | New build |
| AI grounding | AI invents from training data | Evidence-only extraction with verbatim cite validation | Complete rebuild |
| Identity disambiguation | None | Fingerprint index, birth year, federation IDs, collision UI | New build |
| High school/school athletes | Not considered | `education` event types, school sports federation sources | Schema extension |
| Historical data | Overwritten on repopulate | Append-only, superseded not deleted | Requires migration |
| Conflict resolution | Not considered | `disputed` status, curator tools | New build |
| Job queue | Detached promise, lost on restart | PostgreSQL-backed crawl_jobs table | New build |

### 9.2 Components That Can Be Retained

| Component | Retain? | Notes |
|---|---|---|
| Clerk authentication | ✅ Fully retained | No change |
| Stripe billing | ✅ Fully retained | No change |
| React frontend shell | ✅ Largely retained | New pages for evidence/timeline detail needed |
| Perplexity integration | ✅ Retained | Upgrade to sonar-pro everywhere; change role to research only |
| OpenAI integration | ✅ Retained | Model strings corrected; prompts redesigned |
| Admin panel | ✅ Extended | New job queue monitoring; evidence review tools |
| `contact_enquiries` | ✅ Retained | Unaffected |
| `conversations`/`messages` | ✅ Retained (and activated) | Wire up to chat persistence |

### 9.3 Components That Must Be Replaced

| Component | Replacement |
|---|---|
| `athletes` table (as a profile store) | `athlete_identities` (identity) + `evidence_items` (facts) |
| `intelligence_items` | Folded into `evidence_items` with `fact_type = 'media_*' | 'competition_*'` |
| `timeline_events` (current) | Redesigned `timeline_events` with evidence FK |
| `contacts` | Folded into `evidence_items` with `fact_type = 'coach' | 'agent' | 'sponsor'` |
| `competitions` | Folded into `timeline_events` with `event_type = 'competition_result'` |
| `auto-populate.ts` (current) | New extraction pipeline per §8.2 |
| `photo-lookup.ts` (current) | New photo evidence workflow |
| Social columns on `athletes` | `social_handles` + `social_snapshots` |

### 9.4 Estimated Effort

| Phase | Description | Estimated effort |
|---|---|---|
| Phase 1 — Schema design | Write and review all migrations; Drizzle schema files | 1–2 weeks |
| Phase 2 — Identity engine | Discovery, fingerprint, disambiguation, confirmation flow | 1 week |
| Phase 3 — Evidence engine | New extraction pipeline, validation, confidence scoring | 2 weeks |
| Phase 4 — Source registry | Populate `sources` table; tier rules; override logic | 3–4 days |
| Phase 5 — Timeline rebuild | New schema, correction model, evidence FK | 1 week |
| Phase 6 — Social engine | Handle verification, snapshot collection, display labels | 1 week |
| Phase 7 — Job queue | `crawl_jobs` table, worker loop, scheduler | 1 week |
| Phase 8 — AI layer redesign | Grounded prompts, verbatim validation, chat citation | 1–2 weeks |
| Phase 9 — Frontend updates | Evidence viewer, timeline redesign, verification UI | 2 weeks |
| Phase 10 — Data migration | Port existing athlete data to new schema | 3–4 days |
| **Total** | | **~12–14 weeks (one engineer)** |

---

## 10. Migration Path

Rather than a big-bang rewrite, migration can be done in parallel with the running system using a strangler-fig pattern:

```
Week 1–2:   New schema tables created alongside existing tables.
            Existing system continues to run unchanged.

Week 3–4:   Identity engine deployed. New athletes use new schema.
            Existing athletes remain in old schema temporarily.

Week 5–8:   Evidence engine, source registry, new extraction pipeline deployed.
            New athletes fully on new system. Old athletes begin background migration.

Week 9–10:  Social engine, job queue deployed.
            All monitoring switches to job queue.

Week 11–12: Frontend updated to read from new schema.
            Old schema deprecated (kept read-only for 30 days).

Week 13–14: Old schema tables dropped. Migration complete.
```

This approach means the platform remains fully functional throughout the rebuild. Users see improved data quality progressively rather than a downtime event.

---

*End of technical design document. No code has been changed. Awaiting approval before implementation begins.*
