# Athlete Intelligence — Complete Project Documentation

> **Last updated:** July 2026  
> **Purpose:** Comprehensive reference enabling any engineer or AI assistant to understand, maintain, and extend this platform without prior context.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Requirements](#2-product-requirements)
3. [User Roles & Permissions](#3-user-roles--permissions)
4. [User Flows](#4-user-flows)
5. [Database Schema](#5-database-schema)
6. [API Reference](#6-api-reference)
7. [AI Architecture](#7-ai-architecture)
8. [Authentication & Security](#8-authentication--security)
9. [Admin System](#9-admin-system)
10. [Frontend](#10-frontend)
11. [Third-Party Integrations](#11-third-party-integrations)
12. [Deployment](#12-deployment)
13. [Known Issues & Technical Debt](#13-known-issues--technical-debt)
14. [Future Roadmap](#14-future-roadmap)
15. [Architecture Diagram](#15-architecture-diagram)
16. [Folder Structure](#16-folder-structure)
17. [Development Notes](#17-development-notes)
18. [README — Running Locally](#18-readme--running-locally)

---

## 1. Executive Summary

### Purpose
Athlete Intelligence is a B2B SaaS platform that gives sports agencies, sponsors, and national federations a real-time intelligence layer on their managed athletes. Rather than manually trawling sports media, social networks, and federation results pages, users add athletes by name and the platform's AI pipeline automatically researches, structures, and continuously surfaces intelligence across five categories: results & rankings, media & interviews, sponsorships, career changes, and competitive schedule.

### Target Users
- **Sports management agencies** managing rosters of 5–50+ athletes
- **Brand/sponsorship teams** evaluating athletes for partnership or monitoring existing relationships
- **National sporting federations** tracking their high-performance athletes
- **Individual athlete managers** who need a professional intelligence layer

### Core Value Proposition
Add an athlete by name — the platform does the rest. Within 60 seconds of creation, AI researchers (Perplexity Sonar Pro + GPT-4o) populate a complete dossier: biography, career timeline, competition history, sponsor relationships, management contacts, social media metrics, and a ranked intelligence feed. An AI chat assistant lets users ask natural-language questions across their full roster, grounded in the platform's database rather than LLM hallucination.

### Business Goals
- Monthly recurring revenue via Starter / Pro / Enterprise subscription tiers (Stripe)
- Sales-led growth: demo enquiries via a contact form flow into an admin CRM
- Founder-managed operations in the early stage — no team-facing admin interfaces required yet beyond the founder's admin panel

---

## 2. Product Requirements

### Implemented Features

| Feature | Status | Notes |
|---|---|---|
| Athlete roster management (CRUD) | ✅ Complete | Add by name; AI auto-identifies sport/event/nationality |
| AI auto-populate pipeline | ✅ Complete | Perplexity → GPT-4o; populates all 5 related tables |
| Intelligence feed per athlete | ✅ Complete | Categorised, confidence-scored, source-attributed |
| Timeline of career events | ✅ Complete | Auto-populated; editable |
| Competition history & schedule | ✅ Complete | Past results + upcoming events |
| Contact/network mapping | ✅ Complete | Management, coaching, sponsorship contacts |
| Social media metrics | ✅ Complete | Handles + followers for Instagram, Twitter/X, TikTok |
| Per-athlete profile photo | ✅ Complete | Wikipedia lookup with Perplexity fallback |
| AI-generated dossier summary | ✅ Complete | Streamed SSE; cached in DB |
| AI chat assistant | ✅ Complete | Tool-calling agentic loop; database-grounded |
| Athlete comparison | ✅ Complete | Side-by-side stats for any two athletes |
| Alert configuration | ✅ Complete | Per-athlete, per-category notification preferences |
| Stripe billing (3 tiers) | ✅ Complete | Checkout, portal, webhook sync |
| Pricing page | ✅ Complete | Live prices from Stripe |
| Contact/demo enquiry form | ✅ Complete | Rate-limited; stored in DB |
| Admin: customer list | ✅ Complete | Clerk users × Stripe subscriptions |
| Admin: enquiry CRM | ✅ Complete | Read, status updates |
| Admin: bulk photo backfill | ✅ Complete | Wikipedia + Perplexity per athlete |
| Admin: bulk social backfill | ✅ Complete | Perplexity sonar-pro; 3 parallel |
| Admin: per-athlete repopulate | ✅ Complete | Wipe + re-run full pipeline |
| Per-athlete social media refresh | ✅ Complete | Single athlete live lookup |
| Health check endpoint | ✅ Complete | DB ping |
| Landing page | ✅ Complete | Public marketing page |
| About / Security / Terms pages | ✅ Complete | Public legal/marketing pages |
| Sign in / Sign up flow | ✅ Complete | Clerk-managed |
| Settings page | ✅ Complete | User preferences UI |
| Sources page | ✅ Complete | Documents the AI's intelligence sources |
| Billing success page | ✅ Complete | Post-checkout confirmation |

### Partially Implemented Features

| Feature | Status | Notes |
|---|---|---|
| Feed page | ⚠️ Partial | UI exists; real-time push not connected |
| Schedule page | ⚠️ Partial | UI exists; not linked to live calendar data |
| Alerts delivery | ⚠️ Partial | Config stored; no email/push delivery implemented |
| New agent page | ⚠️ Partial | Athlete creation wizard exists; onboarding flow incomplete |
| AI usage tracking | ⚠️ Partial | Admin tab exists; no usage metering wired |
| Licence management | ⚠️ Partial | Admin tab exists; not functional |
| Feature flags | ⚠️ Partial | Admin tab exists; no flag system implemented |

### Planned / Deferred Features

- Real-time crawl monitoring (live agent queue depth, latency telemetry)
- Email/push delivery for alert notifications
- Background continuous crawl job (cron that re-runs auto-populate for all athletes)
- AI usage metering + per-user credit limits
- Team/multi-user accounts (currently single-user per subscription)
- CSV / Excel export of athlete dossiers
- Custom athlete tags and portfolio groupings
- Webhook outbound delivery for intelligence events

---

## 3. User Roles & Permissions

### Visitor (unauthenticated)
- Can access: Landing page, Pricing page, About, Contact, Security, Terms, Sign In / Sign Up
- Cannot access: any `/app/*` routes, any protected API endpoints
- Rate-limited on: `POST /api/contact` (10/hour per IP), `POST /api/stripe/checkout` (10/hour per IP)

### Standard User (authenticated Clerk session)
- Can access: all app pages — Dashboard, Feed, Dossier, Compare, Chat, Alerts, Schedule, Settings, Sources, Billing
- Can call: all protected API endpoints (requireAuth gate)
- Cannot access: Admin page, any `/api/admin/*` endpoints
- Note: Currently no per-user data isolation — all users see the same athlete roster. This is appropriate for the agency use-case (shared roster) but would need changing for multi-tenant SaaS.

### Administrator (Founder)
- Identified by: Clerk primary email matching `anigemmill@theoutsidein.nz` (hardcoded in 5 places — see §13)
- Can access: Admin page at `/admin`, all `/api/admin/*` endpoints
- Admin capabilities: see §9

### No Other Roles
There is currently no team/manager hierarchy, no read-only viewer role, and no per-athlete access control.

---

## 4. User Flows

### 4.1 Sign Up
1. Visitor clicks "Get Started" or navigates to `/sign-up`
2. Clerk-hosted sign-up modal (email + password, or Google OAuth)
3. On completion, Clerk calls its webhook; the user is redirected to `/app/dashboard`
4. No onboarding wizard — user lands directly on Dashboard

### 4.2 Sign In
1. User navigates to `/sign-in`
2. Clerk-hosted sign-in modal
3. On success, Clerk issues a session token; the React app's `ClerkAuthSync` component registers `getToken` with `setAuthTokenGetter` and `registerTokenGetter`
4. All subsequent API calls from React Query hooks and manual `authFetch` calls include `Authorization: Bearer <clerk-jwt>`

### 4.3 Add an Athlete
1. User clicks "+ Add Athlete" in the sidebar or Dashboard
2. `NewAgentPage` shown; user types athlete name and submits
3. Frontend calls `POST /api/athletes/discover` with `{ name }`
4. Server: checks for duplicate → calls `discoverAthleteProfile` (OpenAI GPT-4o) to identify sport/event/nationality → inserts into `athletes` table → fires `autoPopulateAthlete` in the background → responds with athlete stub (201)
5. Frontend navigates to the new athlete's dossier page
6. Auto-populate runs asynchronously (~30–60s): Perplexity research → GPT-4o extraction → inserts intelligence, timeline, contacts, competitions, photo, social metrics
7. Dossier page polls/refreshes showing data as it appears

### 4.4 View Athlete Dossier
1. User clicks an athlete in the sidebar or Dashboard
2. Navigates to `/app/dossier/:id`
3. Page fires 7 parallel API calls: `GET /athletes/:id`, `/athletes/:id/intelligence`, `/athletes/:id/timeline`, `/athletes/:id/contacts`, `/athletes/:id/competitions`, `/athletes/:id/summary`, `/athletes/:id/alerts`
4. Data renders across tabs: Overview, Intelligence, Timeline, Competitions, Contacts, Social Media, Alerts
5. AI Summary streams from `GET /athletes/:id/summary` (SSE); cached in DB after first generation

### 4.5 AI Chat
1. User navigates to `/app/chat`
2. Types a question about any athlete(s) on the roster
3. Frontend calls `POST /api/chat` — SSE stream
4. Backend: agentic tool-calling loop — up to 5 iterations:
   - Tool calls executed: `get_athlete_profile`, `get_athlete_intelligence`, `get_athlete_competitions`, `get_athlete_contacts`, `search_athletes`
   - Phase labels streamed back: "Searching athletes…", "Loading intelligence…", etc.
5. Final analyst response streamed back token-by-token
6. Sources are cited from database; no LLM hallucination policy enforced via system prompt

### 4.6 Compare Athletes
1. User navigates to `/app/compare`
2. Selects two athletes from dropdowns
3. Frontend calls `GET /api/athletes/compare?ids=1,2`
4. Side-by-side stats rendered: rankings, PBs, social metrics, intelligence count

### 4.7 Configure Alerts
1. User opens athlete dossier → Alerts tab
2. Per-category toggles (results, media, sponsorships, career) with frequency options (immediate, daily, weekly)
3. Frontend calls `PUT /api/athletes/:id/alerts`
4. Config saved to `alert_configs` table
5. ⚠️ No delivery mechanism is currently implemented — config is stored but never actioned

### 4.8 Stripe Checkout (Subscribe)
1. User navigates to Pricing page
2. Clicks a plan — frontend calls `POST /api/stripe/checkout` with `{ priceId, email, successUrl, cancelUrl, trialDays }`
3. Server creates/finds Stripe customer by email, creates Checkout Session
4. User redirected to Stripe-hosted checkout
5. On completion: redirected to `/billing-success` page
6. Stripe sends webhook → `WebhookHandlers.processWebhook` → `stripe-replit-sync` writes subscription data into `stripe.*` schema tables
7. `GET /api/stripe/subscription` now returns active subscription

### 4.9 Access Billing Portal
1. Authenticated user navigates to Settings → Billing
2. Frontend calls `POST /api/stripe/portal` with `{ returnUrl }`
3. Server looks up Stripe customer by email → creates billing portal session
4. User redirected to Stripe portal (cancel, upgrade, update payment)

### 4.10 Admin — Customer Review
1. Founder navigates to `/admin`
2. Customers tab: calls `GET /api/admin/customers` — merges Clerk user list with Stripe subscription data
3. Enquiries tab: calls `GET /api/admin/enquiries` — shows all contact form submissions with status
4. Can mark enquiries as read/replied via `PUT /api/admin/enquiries/:id`

### 4.11 Admin — Intelligence Repopulate
1. Founder navigates to `/admin` → Crawl tab
2. "Repopulate athlete intelligence" panel shows all athletes with item counts and last crawl date
3. Athlete with 0 items shown with red count
4. Clicking "Repopulate" calls `POST /api/admin/repopulate/:id` — clears all existing data, fires `autoPopulateAthlete` in background, returns 202
5. Panel polls `GET /api/athletes/:id` every 4s until `lastCrawledAt` is set, then shows "Done — N items"

---

## 5. Database Schema

All tables use PostgreSQL via Drizzle ORM. Connection: `DATABASE_URL` environment variable (PostgreSQL connection string). The `stripe.*` schema is a separate Stripe-synced schema managed by the `stripe-replit-sync` integration.

---

### `athletes`
Core athlete profiles. One row per tracked athlete.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | serial (PK) | No | auto | Primary key |
| `name` | text | No | — | Full name |
| `sport` | text | No | — | Sport category (e.g. "Athletics", "Cycling") |
| `event` | text | No | — | Specific event (e.g. "High Jump", "Downhill") |
| `nationality` | text | No | — | Country name |
| `age` | integer | Yes | null | Age in years |
| `squad` | text | No | `""` | Current squad/team |
| `world_rank` | integer | Yes | null | Current world ranking |
| `world_rank_delta` | integer | No | `0` | Change in world rank (positive = improved) |
| `national_rank` | integer | Yes | null | National ranking |
| `personal_best` | text | Yes | null | Personal best result string |
| `season_best` | text | Yes | null | Season best result string |
| `instagram_handle` | text | Yes | null | Instagram username (no @) |
| `instagram_followers` | integer | No | `0` | Instagram follower count |
| `instagram_engagement` | real | No | `0` | Engagement rate (%) |
| `twitter_handle` | text | Yes | null | Twitter/X username (no @) |
| `twitter_followers` | integer | No | `0` | Twitter follower count |
| `tiktok_handle` | text | Yes | null | TikTok username (no @) |
| `tiktok_followers` | integer | No | `0` | TikTok follower count |
| `follower_growth_30d` | real | No | `0` | 30-day follower growth % |
| `avg_engagement` | real | No | `0` | Average engagement rate across platforms |
| `agent_status` | text | No | `"active"` | Monitoring status: `active` \| `paused` \| `archived` |
| `last_crawled_at` | timestamptz | Yes | null | Last auto-populate completion time |
| `intelligence_count` | integer | No | `0` | Cached count of intelligence items |
| `has_new_intelligence` | boolean | No | `false` | Flag for unread new intelligence |
| `avatar_url` | text | Yes | null | Profile photo URL (Wikipedia or Perplexity) |
| `ai_summary` | text | Yes | null | Cached AI-generated dossier summary |
| `ai_summary_generated_at` | timestamptz | Yes | null | When the cached summary was generated |
| `created_at` | timestamptz | No | `now()` | Creation timestamp |
| `updated_at` | timestamptz | No | `now()` | Last update timestamp (auto-updated) |

**Indexes:** Primary key on `id`.  
**Relationships:** Parent to `intelligence_items`, `timeline_events`, `contacts`, `competitions`, `alert_configs` (all cascade delete).

---

### `intelligence_items`
Structured intelligence derived from the AI research pipeline. One row per discrete intelligence item.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | serial (PK) | No | auto | Primary key |
| `athlete_id` | integer (FK) | No | — | → `athletes.id` (cascade delete) |
| `athlete_name` | text | No | — | Denormalised name for display |
| `category` | text | No | — | `results_rankings` \| `media_interviews` \| `sponsorships` \| `career_changes` |
| `title` | text | No | — | Short headline |
| `summary` | text | Yes | null | 1–3 sentence summary |
| `source_domain` | text | No | — | Source domain (e.g. `worldathletics.org`) |
| `source_url` | text | Yes | null | Full source URL if known |
| `confidence` | integer | No | `80` | AI confidence score 0–100 |
| `published_at` | timestamptz | Yes | null | When the event/article was published |
| `discovered_at` | timestamptz | No | `now()` | When the platform discovered it |

---

### `timeline_events`
Career milestone events for each athlete.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | serial (PK) | No | auto | Primary key |
| `athlete_id` | integer (FK) | No | — | → `athletes.id` (cascade delete) |
| `date` | date | No | — | Event date (YYYY-MM-DD string) |
| `category` | text | No | — | `competition` \| `media` \| `sponsorship` \| `career` \| `personal` |
| `title` | text | No | — | Short event name |
| `description` | text | Yes | null | Longer description |
| `location` | text | Yes | null | Venue / city |
| `source_domain` | text | No | — | Source domain |
| `source_url` | text | Yes | null | Full source URL |
| `confidence` | integer | No | `85` | AI confidence score 0–100 |
| `significant` | boolean | No | `false` | Whether this is a major milestone |

---

### `competitions`
Historical results and upcoming competition schedule.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | serial (PK) | No | auto | Primary key |
| `athlete_id` | integer (FK) | No | — | → `athletes.id` (cascade delete) |
| `athlete_name` | text | No | — | Denormalised name |
| `meet_name` | text | No | — | Competition name |
| `event` | text | No | — | Specific event competed (e.g. "100m", "Downhill") |
| `location` | text | Yes | null | Venue / city |
| `date` | date | No | — | Competition date (YYYY-MM-DD string) |
| `tier` | text | No | `"B"` | Competition tier: `A` (World Champs/Olympics) \| `B` (Continental/Major) \| `C` (Domestic) |
| `status` | text | No | `"upcoming"` | `upcoming` \| `completed` \| `cancelled` |
| `result` | text | Yes | null | Result string (e.g. "1st, 2.36m", "DNF") |
| `created_at` | timestamptz | No | `now()` | Creation timestamp |

---

### `contacts`
Known contacts in an athlete's professional network.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | serial (PK) | No | auto | Primary key |
| `athlete_id` | integer (FK) | No | — | → `athletes.id` (cascade delete) |
| `role` | text | No | — | Job title / role (e.g. "Head Coach", "Agent") |
| `category` | text | No | — | `management` \| `coaching` \| `medical` \| `media` \| `sponsorship` |
| `name` | text | No | — | Full name |
| `org` | text | No | — | Organisation name |
| `org_type` | text | Yes | null | Organisation type |
| `status` | text | No | `"verified"` | `verified` \| `unconfirmed` \| `historical` |
| `confidence` | integer | No | `80` | AI confidence 0–100 |
| `public_email` | text | Yes | null | Publicly available email |
| `website` | text | Yes | null | Organisation or personal website |
| `note` | text | Yes | null | Contextual note |
| `last_verified` | date | No | — | Last verification date |
| `date_discovered` | date | No | — | When first found |
| `source_domain` | text | No | — | Source domain |
| `source_excerpt` | text | Yes | null | Quote from the source mentioning this contact |

---

### `alert_configs`
Per-athlete notification preferences. One row per athlete (1:1 with `athletes`).

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `athlete_id` | integer (PK, FK) | No | — | → `athletes.id` (cascade delete); also the PK |
| `results_enabled` | boolean | No | `true` | Results & rankings alerts on/off |
| `results_frequency` | text | No | `"immediate"` | `immediate` \| `daily` \| `weekly` |
| `media_enabled` | boolean | No | `true` | Media alerts on/off |
| `media_frequency` | text | No | `"daily"` | `immediate` \| `daily` \| `weekly` |
| `sponsorships_enabled` | boolean | No | `true` | Sponsorship alerts on/off |
| `sponsorships_frequency` | text | No | `"daily"` | `immediate` \| `daily` \| `weekly` |
| `career_enabled` | boolean | No | `true` | Career change alerts on/off |
| `career_frequency` | text | No | `"immediate"` | `immediate` \| `daily` \| `weekly` |

---

### `contact_enquiries`
Demo / sales / general enquiries from the public contact form.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | serial (PK) | No | auto | Primary key |
| `type` | text | No | `"general"` | `demo` \| `sales` \| `general` |
| `name` | text | No | — | Submitter's full name |
| `org` | text | No | — | Organisation |
| `email` | text | No | — | Contact email (stored lowercase) |
| `role` | text | Yes | null | Job title |
| `athletes` | text | Yes | null | Roster size estimate (for demo enquiries) |
| `message` | text | Yes | null | Free-text message |
| `status` | text | No | `"new"` | `new` \| `read` \| `replied` |
| `created_at` | timestamptz | No | `now()` | Submission timestamp |

---

### `conversations`
AI chat conversation sessions.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | serial (PK) | No | auto | Primary key |
| `title` | text | No | — | Conversation title |
| `created_at` | timestamptz | No | `now()` | Creation timestamp |

---

### `messages`
Individual messages within a chat conversation.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | serial (PK) | No | auto | Primary key |
| `conversation_id` | integer (FK) | No | — | → `conversations.id` (cascade delete) |
| `role` | text | No | — | `user` \| `assistant` \| `tool` |
| `content` | text | No | — | Message content |
| `created_at` | timestamptz | No | `now()` | Message timestamp |

---

### `stripe.*` schema (managed by stripe-replit-sync)
The Stripe integration maintains a shadow schema called `stripe` containing synced tables: `stripe.products`, `stripe.prices`, `stripe.customers`, `stripe.subscriptions`. These are queried directly via raw SQL in `stripeStorage.ts`. They are **not managed by Drizzle migrations** — they are created and updated by the `stripe-replit-sync` package's webhook handler.

---

## 6. API Reference

**Base URL:** `/api`  
**Authentication:** All protected routes require `Authorization: Bearer <clerk-jwt>` header. The token is obtained via `useAuth().getToken()` from `@clerk/react`.

---

### Public Endpoints (no auth required)

#### `GET /api/healthz`
Health check. Verifies database connectivity.
- **Response 200:** `{ "status": "ok" }`
- **Response 503:** `{ "status": "error", "reason": "database unavailable" }`

#### `POST /api/contact`
Submit a contact/demo enquiry.
- **Rate limit:** 10 requests per IP per hour
- **Body:** `{ type, name*, org*, email*, role, athletes, message }` (* = required)
- **Response 200:** `{ "ok": true, "id": <enquiry_id> }`
- **Response 400:** `{ "error": "name, org, and email are required" }`

#### `GET /api/stripe/prices`
Fetch active Stripe price IDs (for the pricing page).
- **Response 200:** `{ "prices": { "starter": <priceId>, "pro": <priceId>, "enterprise": <priceId> } }`

#### `GET /api/stripe/products-with-prices`
Full product catalogue with prices.
- **Response 200:** `{ "products": [{ "id", "name", "description", "prices": [...] }] }`

#### `POST /api/stripe/checkout`
Create a Stripe Checkout Session.
- **Rate limit:** 10 requests per IP per hour
- **Body:** `{ priceId*, successUrl*, cancelUrl*, email, trialDays }` (* = required)
- **Response 200:** `{ "url": "<stripe checkout url>" }`
- **Response 400:** `{ "error": "priceId, successUrl, and cancelUrl are required" }`

#### `POST /api/stripe/webhook`
Stripe webhook receiver. Receives raw Buffer — must be registered before `express.json()`.
- **Header required:** `stripe-signature`
- **Response 200:** `{ "received": true }`

---

### Protected Endpoints (require Clerk Bearer token)

#### Dashboard

##### `GET /api/dashboard`
Returns overview stats and priority athlete data.
- **Response 200:**
  ```json
  {
    "totalAthletes": 5,
    "activeAgents": 5,
    "newIntelligence": 2,
    "upcomingCompetitions": 3,
    "priorityAlerts": 2,
    "recentIntelligence": [...],
    "priorityAthletes": [...]
  }
  ```

#### Athletes

##### `GET /api/athletes`
List all athletes ordered by name.
- **Response 200:** Array of athlete objects

##### `POST /api/athletes/discover`
Create an athlete by name; AI auto-identifies profile.
- **Body:** `{ "name": "Brook Macdonald" }`
- **Response 201:** `{ "athlete": {...}, "created": true }` (or 200 with `"created": false` if exists)
- **Side effect:** Fires `autoPopulateAthlete` in background

##### `POST /api/athletes/bulk`
Create multiple athletes in one call.
- **Body:** `{ "athletes": [{ "name", "sport", "event", "nationality" }, ...] }`
- **Response 201:** Array of created athletes

##### `GET /api/athletes/compare`
Compare two athletes by ID.
- **Query params:** `ids=1,2`
- **Response 200:** `{ "athletes": [...two athlete objects...] }`

##### `GET /api/athletes/:id`
Fetch a single athlete.
- **Response 200:** Athlete object
- **Response 404:** `{ "error": "Athlete not found" }`

##### `PATCH /api/athletes/:id`
Update athlete fields.
- **Body:** Partial athlete object (any updatable fields)
- **Response 200:** Updated athlete object

##### `DELETE /api/athletes/:id`
Delete an athlete and all related data (cascade).
- **Response 204:** No content
- **Response 404:** `{ "error": "Athlete not found" }`

##### `POST /api/athletes/:id/repopulate`
Wipe and re-run the full intelligence pipeline for one athlete.
- **Response 202:** `{ "message": "Re-population started for <name>" }`
- **Side effect:** Clears all related tables, fires `autoPopulateAthlete` in background

##### `POST /api/athletes/:id/refresh-social`
Run a live Perplexity social media lookup for one athlete and update the DB.
- **Response 200:** `{ "ok": true, "updated": true, "data": {...}, "researchSummary": "..." }`

#### Intelligence

##### `GET /api/athletes/:id/intelligence`
Get all intelligence items for an athlete, ordered newest first.
- **Response 200:** `{ "items": [...] }`

##### `GET /api/intelligence`
Get intelligence across all athletes (used for Feed page).
- **Response 200:** Array of intelligence items with athlete info

#### Competitions

##### `GET /api/athletes/:id/competitions`
Get competition history for an athlete.
- **Response 200:** `{ "competitions": [...] }`

#### Timeline

##### `GET /api/athletes/:id/timeline`
Get timeline events for an athlete.
- **Response 200:** `{ "events": [...] }`

#### Contacts

##### `GET /api/athletes/:id/contacts`
Get network contacts for an athlete.
- **Response 200:** `{ "contacts": [...] }`

#### Alerts

##### `GET /api/athletes/:id/alerts`
Get alert config for an athlete. Auto-creates default config if missing.
- **Response 200:** AlertConfig object

##### `PUT /api/athletes/:id/alerts`
Update alert config.
- **Body:** Partial AlertConfig (any fields)
- **Response 200:** Updated AlertConfig

#### AI Features

##### `GET /api/athletes/:id/summary`
Stream an AI-generated dossier summary via SSE.
- **Response:** `text/event-stream`
- **SSE events:** `{ "token": "..." }` (streaming), `{ "done": true }` (complete), `{ "error": "..." }` (failure)
- **Caching:** Result stored in `athletes.ai_summary`; re-generated if older than 24h

##### `POST /api/chat`
Stream an AI analyst response via SSE.
- **Rate limit:** 20 requests per 15 minutes per user
- **Body:** `{ "messages": [{ "role": "user"|"assistant", "content": "..." }], "athleteIds"?: [...] }`
- **Response:** `text/event-stream`
- **SSE events:** `{ "phase": "..." }` (progress), `{ "token": "..." }` (streaming), `{ "done": true }`, `{ "error": "..." }`

#### Stripe (Protected)

##### `POST /api/stripe/portal`
Create a Stripe Customer Portal session.
- **Body:** `{ "returnUrl": "https://..." }`
- **Response 200:** `{ "url": "<stripe portal url>" }`

##### `GET /api/stripe/subscription`
Get the current user's subscription status.
- **Response 200:** `{ "subscription": <Stripe subscription object or null> }`

---

### Admin Endpoints (require Clerk Bearer + founder email)

All admin endpoints use the same auth flow as protected endpoints, plus an additional email check against `FOUNDER_EMAIL = "anigemmill@theoutsidein.nz"`.

##### `GET /api/admin/customers`
List all Clerk users merged with their Stripe subscription data.
- **Response 200:** `{ "customers": [{ "id", "name", "email", "plan", "subscriptionStatus", "mrr", "trialEnd", "signedUpAt", "lastActiveAt", "imageUrl" }] }`

##### `GET /api/admin/enquiries`
List all contact enquiries ordered newest first.
- **Response 200:** `{ "enquiries": [...] }`

##### `PUT /api/admin/enquiries/:id`
Update an enquiry's status.
- **Body:** `{ "status": "new" | "read" | "replied" }`
- **Response 200:** Updated enquiry

##### `POST /api/admin/backfill-photos`
Run Wikipedia/Perplexity photo lookup for all athletes missing a photo.
- **Response 200:** `{ "ok": true, "total": N, "found": N, "skipped": N }`

##### `POST /api/admin/backfill-social`
Run live Perplexity social media lookup for all athletes (3 in parallel).
- **Response 200:** `{ "ok": true, "total": N, "updated": N, "notFound": N, "results": [...] }`
- **Note:** `res.setTimeout(0)` is called at the start of this handler to disable the global 30-second timeout

##### `POST /api/admin/repopulate/:id`
Wipe and re-run the full intelligence pipeline for one athlete (admin-triggered).
- **Response 202:** `{ "message": "Re-population started for <name>" }`

---

## 7. AI Architecture

### Overview
The AI layer uses a two-provider strategy:
- **Perplexity Sonar Pro** (via OpenRouter) for live web search — used whenever real-time verified data is needed
- **OpenAI GPT-4o / GPT-4o-mini** (via Replit AI Integrations proxy) for structured extraction, summarisation, and chat — used when reasoning over retrieved data

Both providers are accessed via Replit's AI Integrations proxy (`localhost:1106/modelfarm/*`), so no API keys are needed in application code — the proxy handles authentication.

---

### Auto-Populate Pipeline (`auto-populate.ts`)

Triggered by: `POST /athletes/discover`, `POST /athletes/bulk`, `POST /athletes/:id/repopulate`, `POST /admin/repopulate/:id`

**Phase 1 — Perplexity web research**
- Model: `perplexity/sonar` via OpenRouter
- Input: Athlete name, sport, event, nationality
- Prompt: Comprehensive research covering current status, results 2016–2026, career timeline, rankings, social media, contacts, sponsors, injury history
- Output: Free-text research summary with cited sources

**Phase 2 — Twitter/X follower enrichment**
- Model: X API v2 (`/2/users/by/username/:handle?user.fields=public_metrics`)
- Condition: Only runs if `TWITTER_BEARER_TOKEN` env var is set
- Extracts: Real-time follower count for any discovered Twitter handle

**Phase 3 — Photo lookup**
- Calls `fetchWikipediaPhoto(name, sport)` from `photo-lookup.ts`
- Tries: exact Wikipedia page → Wikipedia search (name-matched) → Perplexity image search
- Name-match guard: Wikipedia search results must contain athlete first AND last name in the title to be accepted (prevents wrong-person matches)

**Phase 4 — OpenAI structured extraction**
- Model: `gpt-4o` via OpenAI Integration
- Input: The full Perplexity research text
- Prompt: Instructs extraction of a structured JSON object with keys:
  - `athlete` — rankings, PBs, social handles/followers, squad
  - `intelligenceItems` — array of 5–15 intelligence items
  - `timelineEvents` — array of career events
  - `contacts` — array of network contacts
  - `competitions` — array of historical/upcoming competitions
- Response format: `json_object`
- Validation: Each array element validated before DB insert; malformed entries skipped with a warning

**Phase 5 — DB writes**
- All 5 tables updated: `athletes` (patch), `intelligence_items`, `timeline_events`, `contacts`, `competitions`
- Athlete's `lastCrawledAt` updated; `intelligenceCount` set to count of inserted items

**Error handling:** Entire pipeline is wrapped in try/catch. Failure is non-fatal — athlete row already exists; error is logged. Auto-populate never surfaces errors to the API caller.

---

### Chat Pipeline (`chat.ts`)

**Model:** `gpt-4o` via OpenAI Integration  
**Transport:** SSE (Server-Sent Events)  
**Pattern:** Agentic tool-calling loop (up to 5 iterations)

**Tools available:**
| Tool name | What it does |
|---|---|
| `get_athlete_profile` | Full athlete row by ID |
| `get_athlete_intelligence` | All intelligence items for athlete |
| `get_athlete_competitions` | Competition history for athlete |
| `get_athlete_contacts` | Contact network for athlete |
| `search_athletes` | Search roster by name |
| `get_all_athletes` | Full roster (for queries spanning multiple athletes) |

**Loop:** System prompt grounds the model in database-first analysis. The model calls tools, the server executes them (direct DB queries), results are fed back. After tools return, the model writes the final analyst response.

**Anti-hallucination:** System prompt explicitly states: "Never answer from LLM knowledge alone. If you cannot find the data in the tools, say so explicitly."

**Streaming:** Phase labels (`{ "phase": "Searching athletes…" }`) are emitted as SSE events before tool execution to give the user live progress feedback.

---

### Dossier Summary (`summary.ts`)
- Model: `gpt-5.6-luna` (an internal model alias) via OpenAI Integration
- Transport: SSE streaming
- Cached: Yes — stored in `athletes.ai_summary`; re-used if present until manually regenerated
- Prompt: Structured markdown report covering career, media narrative, contact network, intelligence assessment

---

### Social Media Backfill (`admin.ts`, `athletes.ts`)
- **Bulk backfill:** Perplexity `sonar-pro` for research → GPT-4o-mini for extraction, 3 athletes in parallel
- **Single athlete refresh:** Same two-stage pipeline, single athlete

---

### Photo Lookup (`photo-lookup.ts`)
```
1. Wikipedia exact title API (fastest, most accurate)
2. Wikipedia search API with name-token matching guard
3. Perplexity sonar → URL extraction via GPT-4o-mini
4. Return null if all fail
```

---

### AI Provider Configuration
| Provider | Package | Base URL | Auth |
|---|---|---|---|
| OpenAI | `@workspace/integrations-openai-ai-server` | `http://localhost:1106/modelfarm/openai` | Proxy (no user key needed) |
| OpenRouter (Perplexity) | `@workspace/integrations-openrouter-ai` | `http://localhost:1106/modelfarm/openrouter` | Proxy (no user key needed) |

The environment secrets `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENROUTER_API_KEY` are set to `_DUMMY_API_KEY_` — actual authentication is handled by the Replit proxy at localhost:1106.

---

## 8. Authentication & Security

### Authentication Provider
**Clerk** (Replit-managed tenant)  
- Frontend: `@clerk/react` v6
- Backend: `@clerk/express` v2
- Publishable key resolved at runtime via `publishableKeyFromHost()` to support Clerk custom domain

### Token Flow
Because the app runs behind Replit's path-based proxy, session cookies are not reliably forwarded. All API authentication uses **Bearer tokens**:

1. After sign-in, `ClerkAuthSync` component (in `App.tsx`) calls `setAuthTokenGetter(getToken)` and `registerTokenGetter(getToken)` — registers the Clerk `getToken` function globally
2. All React Query hooks (from `@workspace/api-client-react`) call `setAuthTokenGetter` before each request
3. All manual `fetch()` calls in admin components use `authFetch` — a closure wrapping `useAuth().getToken()`
4. The API server's `requireAuth` middleware calls `getAuth(req)` from `@clerk/express` to extract `userId` from the Bearer token

### `requireAuth` Middleware
Located at `artifacts/api-server/src/middleware/requireAuth.ts`.
- Calls `getAuth(req)` (not `req.auth` directly — this caused bugs with Bearer tokens)
- If `userId` is falsy → 401 `{ "error": "Unauthorized" }`
- Sets `req.userId` for downstream route handlers

### `requireAdmin` Middleware
Defined inline in `admin.ts`.
- Calls `getAuth(req)` → resolves `userId` → calls Clerk SDK to get user email
- Checks email against `FOUNDER_EMAIL = "anigemmill@theoutsidein.nz"`
- If not founder → 403 `{ "error": "Forbidden" }`

### Clerk Proxy
A `clerkProxyMiddleware` (from `artifacts/api-server/src/middlewares/clerkProxyMiddleware.ts`) proxies Clerk frontend API calls through the server — required for Replit's path-based routing where the frontend and API share the same origin.

### Security Headers (Helmet)
Applied globally via `helmet()`:
- **CSP:** Restricts scripts to self + Clerk domains; no external frame embeds
- **CORS:** Only allows `*.replit.app`, `*.replit.dev`, and localhost origins
- **Body limit:** 1 MB max request body
- **Request timeout:** 30-second global timeout via `res.setTimeout(30_000)` — individual routes that legitimately take longer call `res.setTimeout(0)` at the start (e.g. `backfill-social`)
- **Rate limiting:** Contact form (10/hr), Checkout (10/hr), Chat (20/15min)

### Environment Variables Required
| Variable | Used by | Description |
|---|---|---|
| `DATABASE_URL` | API server, DB package | PostgreSQL connection string |
| `CLERK_SECRET_KEY` | API server | Clerk server-side SDK |
| `CLERK_PUBLISHABLE_KEY` | API server | Clerk publishable key |
| `VITE_CLERK_PUBLISHABLE_KEY` | Frontend | Clerk publishable key for browser |
| `STRIPE_SECRET_KEY` | API server | Stripe API |
| `STRIPE_WEBHOOK_SECRET` | API server | Stripe webhook signature verification |
| `SESSION_SECRET` | API server | Express session secret |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | API server | Set to `_DUMMY_API_KEY_` (proxy handles auth) |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | API server | Replit AI proxy URL |
| `AI_INTEGRATIONS_OPENROUTER_API_KEY` | API server | Set to `_DUMMY_API_KEY_` (proxy handles auth) |
| `AI_INTEGRATIONS_OPENROUTER_BASE_URL` | API server | Replit AI proxy URL |
| `TWITTER_BEARER_TOKEN` | API server | Optional — X API v2 for real follower counts |
| `LOG_LEVEL` | API server | Pino log level (default: `info`) |
| `NODE_ENV` | Both | `development` \| `production` |

---

## 9. Admin System

Accessible at `/admin`. Only shown in the sidebar when the signed-in user's primary email matches `anigemmill@theoutsidein.nz`. All API calls use `authFetch` (Bearer token) passed as a prop from `AdminPage` to sub-components.

### Tab: Customers
- Calls `GET /api/admin/customers`
- Shows all Clerk-registered users merged with their Stripe subscription data
- Displays: name, email, subscription plan, status, MRR, trial end, sign-up date, last active
- Shows aggregate stats: total sign-ups, active subscribers, trialling

### Tab: Enquiries
- Calls `GET /api/admin/enquiries`
- Shows all contact form submissions with status badges
- Can mark as read/replied via `PUT /api/admin/enquiries/:id`
- Shows: submitter name, org, email, role, message excerpt, timestamp

### Tab: Licences
- Admin tab exists in UI; no backend functionality yet

### Tab: AI Usage
- Admin tab exists in UI; no backend functionality yet

### Tab: Crawl
Three sub-sections:

1. **Crawl Monitor** — placeholder text; no live queue/telemetry connected yet

2. **Backfill athlete photos** — runs Wikipedia → Perplexity photo lookup for all athletes without a photo. Safe to run repeatedly (skips athletes that already have a photo). Reports: N found, N skipped.

3. **Backfill social media stats** — runs Perplexity sonar-pro lookup for all athletes in parallel batches of 3. Overwrites existing social handles and follower counts. Shows results table with updated handles.

4. **Repopulate athlete intelligence** — lists all athletes with their intelligence item count (red if zero) and last crawl date. Per-athlete "Repopulate" button calls `POST /api/admin/repopulate/:id`, which wipes all existing intelligence data and re-runs the full pipeline. Polls every 4s and shows "Done — N items" when complete.

### Tab: Health
- Calls `GET /api/healthz`
- Shows API and database status
- DB and Stripe health are inferred from API server startup logs

### Tab: Flags
- Admin tab exists in UI; no backend functionality yet

### Hardcoded Founder Email
The founder email `anigemmill@theoutsidein.nz` is hardcoded in **5 places** that must be kept in sync:
1. `artifacts/web/src/App.tsx` — sidebar admin link visibility
2. `artifacts/web/src/pages/AdminPage.tsx` — admin page guard
3. `artifacts/web/src/components/layout/Sidebar.tsx` — admin nav item
4. `artifacts/api-server/src/routes/admin.ts` — `requireAdmin` middleware
5. `artifacts/api-server/src/routes/stripe.ts` — `FOUNDER_EMAIL` constant

> **TODO:** Move to an environment variable `FOUNDER_EMAIL`.

---

## 10. Frontend

**Framework:** React 19 + Vite 7  
**Routing:** Wouter v3  
**State:** TanStack React Query v5 (server state); React local state (UI state)  
**Styling:** Tailwind CSS v4 + Radix UI + shadcn/ui components  
**Auth:** `@clerk/react` v6  

All pages are **lazy-loaded** via `React.lazy()` + `<Suspense>` with a full-page spinner fallback.

---

### Pages

#### Public Pages (no auth required)

| Page | Route | File | Description |
|---|---|---|---|
| Landing | `/` | `LandingPage.tsx` | Marketing homepage |
| Pricing | `/pricing` | `PricingPage.tsx` | Subscription tier cards; fetches live prices from Stripe |
| About | `/about` | `AboutPage.tsx` | Company/product info |
| Contact | `/contact` | `ContactPage.tsx` | Demo/enquiry form → `POST /api/contact` |
| Security | `/security` | `SecurityPage.tsx` | Security practices |
| Terms | `/terms` | `TermsPage.tsx` | Terms of service |
| Sign In | `/sign-in/*` | `SignInPage.tsx` | Clerk SignIn component |
| Sign Up | `/sign-up/*` | Inline in App.tsx | Clerk SignUp component |

#### App Pages (require auth)

| Page | Route | File | Lines | Description |
|---|---|---|---|---|
| Dashboard | `/app/dashboard` | `Dashboard.tsx` | 338 | Overview stats, priority athletes, recent intelligence |
| Feed | `/app/feed` | `FeedPage.tsx` | 225 | Intelligence feed across all athletes |
| New Athlete | `/app/new-agent` | `NewAgentPage.tsx` | 870 | Athlete creation wizard; auto-populates via AI |
| Dossier | `/app/dossier/:id` | `DossierPage.tsx` | 1317 | Full athlete profile with tabbed sections |
| Compare | `/app/compare` | `ComparePage.tsx` | 524 | Side-by-side athlete comparison |
| Chat | `/app/chat` | `ChatPage.tsx` | 577 | AI chat assistant with SSE streaming |
| Schedule | `/app/schedule` | `SchedulePage.tsx` | 434 | Competition schedule view |
| Alerts | `/app/alerts` | `AlertsPage.tsx` | 229 | Alert management UI |
| Settings | `/app/settings` | `SettingsPage.tsx` | 481 | User preferences, billing link |
| Sources | `/app/sources` | `SourcesPage.tsx` | 345 | Documents the AI intelligence sources |
| Billing Success | `/billing-success` | `BillingSuccessPage.tsx` | 59 | Post-checkout confirmation |
| Admin | `/admin` | `AdminPage.tsx` | 746 | Founder-only admin panel (7 tabs) |

#### DossierPage Tabs
The largest and most complex page (1,317 lines). Tabs:
- **Overview** — headline stats, rankings, PBs, AI summary (streamed)
- **Intelligence** — filtered intelligence feed with category tabs
- **Timeline** — chronological career events
- **Competitions** — historical results + upcoming schedule
- **Contacts** — management/coaching/sponsor network
- **Social Media** — handles, follower counts, "Refresh from web" button
- **Alerts** — per-category alert config

---

### Navigation

**Sidebar** (`Sidebar.tsx`) — visible on all app pages, hidden on public pages.
- Top section: App logo + global athlete search
- Athlete roster: Scrollable list of all athletes with avatar and sport
- Main nav: Dashboard, Feed, Compare, Chat, Schedule, Alerts
- Bottom nav: Sources, Settings, Admin (founder only), Sign out
- User footer: Avatar initials, full name, plan label, sign-out button

**AppLayout** (`AppLayout.tsx`) — wraps all app pages. Contains the sidebar + main content area.

**PublicLayout** (`PublicLayout.tsx`) — wraps public pages. Minimal header with nav links.

---

### State Management
- **Server state:** TanStack React Query. All API calls via generated hooks from `@workspace/api-client-react` or manual `fetch` with `authFetch`
- **Auth tokens:** Module-level singleton in `getAuthToken.ts` (`registerTokenGetter` / `getAuthToken`); used by React Query hooks. Admin components use `useCallback`-wrapped `authFetch` prop to avoid hook ordering issues
- **UI state:** Component-level `useState` — no global store (Zustand/Redux/Context) used
- **Cache invalidation:** `ClerkQueryClientCacheInvalidator` component calls `queryClient.clear()` on Clerk user-change events

---

### Key Frontend Libraries

| Library | Purpose |
|---|---|
| `@tanstack/react-query` v5 | Server state, caching, request deduplication |
| `wouter` v3 | Lightweight client-side routing |
| `@clerk/react` v6 | Auth components and hooks |
| `lucide-react` | Icon library |
| `recharts` | Charts (used in comparison and dashboard) |
| `framer-motion` | Animations |
| `radix-ui/*` | Headless accessible UI primitives |
| `react-helmet-async` | Document `<head>` management |
| `react-hook-form` | Form state management |
| `date-fns` | Date formatting |
| `xlsx` | Excel export (planned feature) |
| `sonner` | Toast notifications |

---

### Responsive Behaviour
- Sidebar collapses on mobile (implementation varies per component — not fully standardised)
- Tailwind breakpoints used throughout: `sm:`, `md:`, `lg:`
- No dedicated mobile navigation implemented yet

---

## 11. Third-Party Integrations

### Clerk (Authentication)
- **Provider:** Replit-managed Clerk tenant
- **Purpose:** User authentication, session management
- **Frontend:** `@clerk/react` — `ClerkProvider`, `useAuth`, `useUser`, `SignIn`, `SignUp`
- **Backend:** `@clerk/express` — `clerkMiddleware()`, `getAuth(req)`, `clerkClient`
- **Special:** `publishableKeyFromHost()` resolves the correct key based on hostname — required for Clerk custom domain support
- **Proxy:** Clerk API calls are proxied through the API server at `/clerk-proxy/*` via `clerkProxyMiddleware`
- **No webhooks** are currently set up for Clerk events (user.created, etc.)

### Stripe (Payments)
- **Provider:** Replit Stripe integration (`stripe-replit-sync`)
- **Purpose:** Subscription billing (Starter / Pro / Enterprise)
- **Frontend:** No Stripe.js — redirects to Stripe-hosted Checkout and Customer Portal
- **Backend:** `stripe` npm package; `STRIPE_SECRET_KEY` env var
- **Webhook:** `POST /api/stripe/webhook` → `WebhookHandlers.processWebhook()` → `stripe-replit-sync` package which maintains the `stripe.*` DB schema
- **Key design:** Stripe data (customers, subscriptions, products, prices) is queried from `stripe.*` schema tables via raw SQL — not via Stripe API calls — for performance
- **Tiers:** Starter, Pro, Enterprise — price IDs fetched live from Stripe DB

### OpenAI (AI extraction, chat, summaries)
- **Provider:** Replit AI Integrations proxy
- **Package:** `@workspace/integrations-openai-ai-server`
- **Models used:** `gpt-4o` (extraction, chat), `gpt-4o-mini` (social backfill extraction), `gpt-5.6-luna` (dossier summaries — internal model alias)
- **No API key in application code** — proxy authenticates via `AI_INTEGRATIONS_OPENAI_API_KEY = _DUMMY_API_KEY_`

### OpenRouter / Perplexity (Live web research)
- **Provider:** Replit AI Integrations proxy → OpenRouter → Perplexity
- **Package:** `@workspace/integrations-openrouter-ai`
- **Models used:** `perplexity/sonar` (auto-populate research), `perplexity/sonar-pro` (social backfill, refresh-social — higher quality, slower)
- **No API key in application code** — proxy authenticates via `AI_INTEGRATIONS_OPENROUTER_API_KEY = _DUMMY_API_KEY_`

### Wikipedia API
- **Purpose:** Profile photo lookup
- **Direct REST API** — no SDK, no key required
- **User-Agent:** `AthleteIntelligence/1.0 (sports-intelligence-platform)`
- **Endpoints used:** `action=query&prop=pageimages` (thumbnail), `action=query&list=search` (name search)

### X (Twitter) API v2
- **Purpose:** Real-time Twitter follower counts
- **Auth:** Bearer token via `TWITTER_BEARER_TOKEN` env var
- **Optional:** If `TWITTER_BEARER_TOKEN` is not set, the system falls back to Perplexity-estimated counts
- **Endpoint:** `GET /2/users/by/username/:handle?user.fields=public_metrics`

### No Email Integration
There is currently no email delivery integration. Transactional email (welcome, alert delivery, billing receipts) is not implemented. Stripe handles billing emails automatically.

### No Analytics Integration
No product analytics, error monitoring (Sentry), or session replay tool is integrated.

---

## 12. Deployment

### Platform
Replit (cloud workspace) with path-based routing and managed workflows.

### Build Process

**API Server:**
```bash
pnpm --filter @workspace/api-server run dev
# → export NODE_ENV=development && pnpm run build && pnpm run start
# → node ./build.mjs   (esbuild bundles to dist/index.mjs ~4MB)
# → node --enable-source-maps ./dist/index.mjs
```

**Frontend:**
```bash
pnpm --filter @workspace/web run dev
# → vite --config vite.config.ts --host 0.0.0.0
# Reads PORT and BASE_PATH env vars (injected by Replit artifact system)
```

### Workflows (Replit)
| Workflow | Command | Port |
|---|---|---|
| `artifacts/api-server: API Server` | `pnpm --filter @workspace/api-server run dev` | 8080 |
| `artifacts/web: web` | `pnpm --filter @workspace/web run dev` | Assigned by Replit via `$PORT` |
| `artifacts/mockup-sandbox: Component Preview Server` | `pnpm --filter @workspace/mockup-sandbox run dev` | Assigned by Replit |

### Production Deployment
Deploy via Replit's "Publish" feature. Replit handles:
- SSL termination
- Path-based routing (`/` → frontend, `/api` → API server)
- Environment variable injection (same secrets, different values if needed)
- Health monitoring

### Required Services for Production
1. **PostgreSQL database** — provisioned via Replit database integration
2. **Clerk** — Replit-managed tenant; configure custom domain in Clerk dashboard if using a custom domain
3. **Stripe** — live mode keys; configure webhook endpoint to `https://<prod-domain>/api/stripe/webhook`
4. **Replit AI Integrations** — OpenAI and OpenRouter enabled in the Replit workspace

### Database Migrations
Managed by Drizzle ORM. To apply schema changes:
```bash
pnpm --filter @workspace/db run db:push    # push schema to connected DB
pnpm --filter @workspace/db run db:studio  # open Drizzle Studio UI
```

The `stripe.*` schema is managed automatically by `stripe-replit-sync` via webhooks — do not hand-edit it.

---

## 13. Known Issues & Technical Debt

### Bugs

1. **Backfill Photos button overwrites manually corrected photos.** If an admin manually patches `avatar_url` for an athlete and then clicks "Backfill Photos", the manual value is overwritten. The name-matching guard in `photo-lookup.ts` reduces (but doesn't eliminate) wrong-person matches. **Fix needed:** Add an `avatar_url_locked` boolean flag to `athletes` table; skip locked athletes in backfill.

2. **Social follower counts not refreshed automatically.** Counts are only updated via manual admin backfill or the "Refresh from web" button on the dossier. There is no scheduled refresh.

3. **`gpt-5.6-luna` model alias used in dossier summary.** This is an undocumented internal model alias in `summary.ts`. If the model alias changes or is deprecated, summaries will fail. **Fix:** Use `gpt-4o` explicitly.

4. **Alert delivery not implemented.** `alert_configs` stores preferences but no delivery mechanism (email, push, webhook) exists.

5. **No real-time Clerk webhook.** When a new user signs up, no action is taken server-side (e.g. welcome email, Stripe customer creation). Stripe customer is only created at checkout time.

### Technical Debt

1. **Founder email hardcoded in 5 places.** Must be kept in sync manually. Should be extracted to `FOUNDER_EMAIL` environment variable.

2. **No per-user data isolation.** All users see the same athlete roster. The platform implicitly assumes a single-agency deployment. Multi-tenant support would require a `user_id` or `org_id` FK on `athletes`.

3. **`intelligence_count` is a cached denormalized counter.** It is manually kept in sync in multiple places (auto-populate, admin repopulate). A DB trigger or a `COUNT(*)` subquery would be more reliable.

4. **No test suite.** Zero automated tests — unit, integration, or E2E.

5. **No error monitoring.** Errors are logged to Pino stdout but not surfaced to any alerting system (Sentry, etc.).

6. **No rate limiting on most endpoints.** Only `/api/contact`, `/api/stripe/checkout`, and `/api/chat` are rate-limited. Admin repopulate could be abused.

7. **`@workspace/api-client-react` generated hooks** use a `setAuthTokenGetter` pattern that requires `ClerkAuthSync` to run before any hook fires. Timing edge cases could cause unauthenticated API calls.

8. **Vite proxy not configured for dev API calls.** API calls go to the Replit path-based proxy, not a local proxy. This means development requires the API server to be running simultaneously.

9. **`conversations` and `messages` tables exist but the chat page does not persist conversations.** Chat history is held in component state only.

10. **`BASE_PATH` and `PORT` must be injected by the Replit artifact system.** Running the frontend outside of Replit requires these env vars to be set manually.

---

## 14. Future Roadmap

Priority order (highest first):

1. **Alert delivery** — Email via Resend or SendGrid triggered by scheduled DB polling of `alert_configs`. Send when new intelligence items match an athlete's configured categories.

2. **Continuous crawl background job** — Scheduled task (cron or Replit scheduled deployment) that re-runs `autoPopulateAthlete` for every athlete on a configurable interval (default: weekly).

3. **Fix photo backfill overwrite bug** — Add `avatar_url_locked` column; skip locked athletes in bulk backfill.

4. **Multi-tenant isolation** — Add `org_id` to `athletes`; enforce RLS or query-level filtering so each agency sees only their roster.

5. **Clerk webhook integration** — On `user.created`, create a Stripe customer, send welcome email, optionally create trial subscription.

6. **Founder email to env var** — Extract `FOUNDER_EMAIL` to a Replit secret.

7. **Test suite** — Playwright E2E tests for critical flows (add athlete, view dossier, chat, checkout).

8. **Error monitoring** — Integrate Sentry for error alerting and performance monitoring.

9. **Usage metering** — Track AI API calls per user; enforce per-plan limits; surface usage in admin AI Usage tab.

10. **Real-time crawl monitor** — Emit telemetry from auto-populate jobs; display live queue depth and latency in admin Crawl tab.

11. **CSV/Excel export** — Export dossier data from DossierPage; uses `xlsx` package which is already installed.

12. **Athlete tagging and grouping** — Allow users to tag athletes (e.g. "Sprint", "Prospects", "Current Clients") and filter the roster by tag.

---

## 15. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                       Replit Proxy                          │
│              (path-based routing, SSL, mTLS)                │
└──────────────────────┬──────────────────────────────────────┘
                       │
          ┌────────────┴────────────┐
          │                         │
          ▼                         ▼
┌──────────────────┐     ┌──────────────────────┐
│  Frontend (Vite) │     │  API Server (Express) │
│  React 19        │     │  Node.js / TypeScript │
│  Port: $PORT     │◄───►│  Port: 8080           │
│  Base: $BASE_PATH│     │                       │
└──────────────────┘     └──────┬───────┬────────┘
         │                      │       │
         │ Clerk Bearer tokens  │       │
         │                      │       │
         ▼                      ▼       ▼
┌──────────────┐    ┌───────────────┐ ┌─────────────────────┐
│ Clerk (Auth) │    │  PostgreSQL   │ │  Replit AI Proxy    │
│ Dev tenant   │    │  (Replit DB)  │ │  localhost:1106     │
│              │    │               │ │                     │
│ - Sessions   │    │ ┌───────────┐ │ │  ┌──────────────┐  │
│ - User store │    │ │  app.*    │ │ │  │ OpenAI GPT   │  │
│              │    │ │  schema   │ │ │  │ (gpt-4o etc) │  │
└──────────────┘    │ │  (Drizzle)│ │ │  └──────────────┘  │
                    │ └───────────┘ │ │                     │
                    │ ┌───────────┐ │ │  ┌──────────────┐  │
┌──────────────┐    │ │  stripe.* │ │ │  │ OpenRouter   │  │
│   Stripe     │    │ │  schema   │ │ │  │ (Perplexity) │  │
│              │◄──►│ │  (synced) │ │ │  └──────────────┘  │
│ - Checkout   │    │ └───────────┘ │ └─────────────────────┘
│ - Portal     │    └───────────────┘
│ - Webhooks   │
└──────────────┘         ▲
                         │ stripe-replit-sync
                         │ (webhook handler)
                         │
              ┌──────────┴──────────┐
              │   External APIs     │
              │ - Wikipedia REST    │
              │ - X API v2          │
              └─────────────────────┘
```

**Request flow (authenticated page load):**
1. Browser → Replit Proxy → Vite dev server (serves React app)
2. React app → Clerk (resolves session token)
3. React Query hook → Replit Proxy → API Server (`Authorization: Bearer <jwt>`)
4. API Server → `requireAuth` → DB query → response
5. For AI features: API Server → Replit AI Proxy → OpenAI/Perplexity → response streamed back

---

## 16. Folder Structure

```
workspace/
├── artifacts/
│   ├── api-server/              # Express API server
│   │   ├── src/
│   │   │   ├── app.ts           # Express app setup (middleware, routes, error handler)
│   │   │   ├── index.ts         # Server entry point (listen on $PORT)
│   │   │   ├── lib/
│   │   │   │   ├── auto-populate.ts      # AI pipeline: Perplexity + GPT-4o → DB
│   │   │   │   ├── photo-lookup.ts       # Wikipedia + Perplexity photo search
│   │   │   │   ├── logger.ts             # Pino logger instance
│   │   │   │   ├── stripeClient.ts       # Stripe SDK initialisation
│   │   │   │   ├── stripeStorage.ts      # Query stripe.* schema via Drizzle raw SQL
│   │   │   │   └── webhookHandlers.ts    # Routes Stripe webhooks to stripe-replit-sync
│   │   │   ├── middleware/
│   │   │   │   └── requireAuth.ts        # Clerk Bearer token validation
│   │   │   ├── middlewares/
│   │   │   │   └── clerkProxyMiddleware.ts  # Proxies /clerk-proxy/* to Clerk API
│   │   │   └── routes/
│   │   │       ├── index.ts             # Mounts all routers; applies requireAuth gate
│   │   │       ├── admin.ts             # Admin endpoints (requireAdmin)
│   │   │       ├── alerts.ts            # GET/PUT /athletes/:id/alerts
│   │   │       ├── athletes.ts          # Athlete CRUD + discover + repopulate + refresh-social
│   │   │       ├── chat.ts              # POST /chat — agentic SSE
│   │   │       ├── competitions.ts      # GET /athletes/:id/competitions
│   │   │       ├── contact.ts           # POST /contact (public)
│   │   │       ├── contacts.ts          # GET /athletes/:id/contacts
│   │   │       ├── dashboard.ts         # GET /dashboard
│   │   │       ├── health.ts            # GET /healthz (public)
│   │   │       ├── intelligence.ts      # GET /athletes/:id/intelligence, GET /intelligence
│   │   │       ├── stripe.ts            # POST /stripe/portal, GET /stripe/subscription
│   │   │       ├── stripe-public.ts     # GET /stripe/prices, POST /stripe/checkout (public)
│   │   │       ├── summary.ts           # GET /athletes/:id/summary — SSE
│   │   │       └── timeline.ts          # GET /athletes/:id/timeline
│   │   ├── scripts/
│   │   │   └── repopulate-athletes.ts   # One-off manual repopulate script
│   │   ├── build.mjs                    # esbuild config (bundles to dist/index.mjs)
│   │   ├── artifact.toml                # Replit artifact config (kind: api)
│   │   └── package.json
│   │
│   ├── web/                     # React frontend
│   │   ├── src/
│   │   │   ├── App.tsx                  # Root: routes, Clerk provider, lazy pages
│   │   │   ├── main.tsx                 # React DOM entry point
│   │   │   ├── index.css                # Tailwind base styles + theme tokens
│   │   │   ├── components/
│   │   │   │   ├── layout/
│   │   │   │   │   ├── AppLayout.tsx    # Sidebar + main content shell
│   │   │   │   │   ├── Sidebar.tsx      # Navigation sidebar with athlete list
│   │   │   │   │   └── PublicLayout.tsx # Public page header/footer
│   │   │   │   ├── PlanSelectionModal.tsx  # Subscription plan picker modal
│   │   │   │   ├── ErrorBoundary.tsx    # React error boundary
│   │   │   │   └── ui/                  # shadcn/ui components (40+ files)
│   │   │   ├── lib/
│   │   │   │   ├── getAuthToken.ts      # Module-level token store (registerTokenGetter)
│   │   │   │   ├── useAuthFetch.ts      # Hook returning authFetch (Bearer-injected fetch)
│   │   │   │   └── utils.ts             # Tailwind class merging utility (cn)
│   │   │   └── pages/                   # All page components (see §10)
│   │   ├── vite.config.ts               # Vite config (reads PORT, BASE_PATH env vars)
│   │   ├── artifact.toml                # Replit artifact config (kind: web)
│   │   └── package.json
│   │
│   └── mockup-sandbox/          # Component preview server (design tooling only)
│
├── lib/
│   ├── db/                      # Drizzle ORM database package
│   │   ├── src/
│   │   │   ├── index.ts         # DB client (pg Pool + drizzle); exports all schema
│   │   │   └── schema/
│   │   │       ├── athletes.ts
│   │   │       ├── intelligence-items.ts
│   │   │       ├── timeline-events.ts
│   │   │       ├── competitions.ts
│   │   │       ├── contacts.ts
│   │   │       ├── alert-configs.ts
│   │   │       ├── conversations.ts
│   │   │       ├── messages.ts
│   │   │       ├── contact-enquiries.ts
│   │   │       └── index.ts     # Re-exports all schema
│   │   └── package.json
│   │
│   ├── api-zod/                 # Zod schemas for API request/response validation
│   ├── api-spec/                # OpenAPI spec (source of truth for generated client)
│   ├── api-client-react/        # Generated TanStack Query hooks for the frontend
│   ├── integrations/
│   │   ├── integrations-openai-ai-server/     # OpenAI SDK configured for server use
│   │   ├── integrations-openai-ai-react/      # OpenAI SDK configured for browser use
│   │   └── integrations-openrouter-ai/        # OpenRouter SDK (Perplexity access)
│   └── scripts/                 # Workspace-level utility scripts
│
├── attached_assets/             # User-uploaded files (PRDs, screenshots)
├── pnpm-workspace.yaml          # pnpm workspace config + catalog versions
├── package.json                 # Root package.json
├── DOCUMENTATION.md             # This file
└── replit.md                    # Project overview + user preferences
```

---

## 17. Development Notes

### Why Bearer tokens instead of cookies?
Replit's path-based proxy does not reliably forward session cookies between the frontend origin and the API server origin. All API authentication was migrated to `Authorization: Bearer <clerk-jwt>` headers, which pass through the proxy correctly.

### Why `getAuth(req)` instead of `req.auth`?
Clerk's `clerkMiddleware()` populates `req.auth` lazily, but when using Bearer tokens (as opposed to cookies), `req.auth` is not reliably set. `getAuth(req)` from `@clerk/express` correctly handles Bearer token extraction and must be used in all middleware that needs the authenticated user.

### Why `authFetch` as a prop in AdminPage?
Admin sub-components (`CustomersTab`, `EnquiriesTab`, `CrawlTab`) need to make authenticated API calls. Using module-level hooks or context caused hook-ordering errors. The solution: `AdminPage` calls `useAuth().getToken()` via `useCallback`, builds an `authFetch` closure, and passes it as a prop to sub-components. This is deterministic and avoids timing issues.

### Why Perplexity before GPT-4o in the pipeline?
GPT-4o's training data has a knowledge cutoff. For a sports intelligence product, current rankings, recent race results, and live social media stats are critical. Perplexity Sonar Pro searches the live web, then GPT-4o extracts structured data from the research text. This two-stage approach gives: (1) real current data from Perplexity, (2) reliable JSON structure from GPT-4o.

### Why store Stripe data in a `stripe.*` schema?
The `stripe-replit-sync` integration maintains a live replica of Stripe data in the PostgreSQL database. This avoids Stripe API rate limits, enables JOIN queries against application data, and makes the Pricing page load instantly (no Stripe API call needed).

### Why Drizzle ORM instead of Prisma?
Drizzle was chosen for its lightweight footprint, TypeScript-first schema definition (schema is code, not a separate `.prisma` file), and excellent performance. The schema-as-code approach also means the `@workspace/db` package can be imported directly by both the API server and any future services.

### Wikipedia name-match guard
The Wikipedia search fallback (used when an athlete has no exact Wikipedia page) initially caused wrong-person photo assignments (e.g. searching "Brook Macdonald cycling" returned a different athlete's page). A guard was added: search results are only accepted if the result page title contains at least 2 tokens from the athlete's name (first + last name both present). This prevents cross-athlete photo contamination.

### Global 30-second timeout with per-route override
`app.ts` applies a 30-second response timeout globally to prevent hanging connections. Long-running admin endpoints (e.g. `backfill-social` which runs Perplexity searches for all athletes) call `res.setTimeout(0)` at the start of their handler to disable the timeout for that specific request.

### pnpm workspace with version catalog
All shared dependency versions are pinned in `pnpm-workspace.yaml` under `catalog:`. This ensures every package in the monorepo uses identical versions of React, Vite, Tailwind, etc. When upgrading a library, update the catalog version once rather than in every `package.json`.

---

## 18. README — Running Locally

### Prerequisites
- Node.js 20+
- pnpm 9+
- A PostgreSQL database (local or Replit-provisioned)
- A Clerk development account
- A Stripe account (test mode)
- Replit AI Integrations enabled (for AI features — or substitute real OpenAI/OpenRouter keys)

### 1. Clone and install

```bash
git clone <repo-url>
cd workspace
pnpm install
```

### 2. Set environment variables

Create a `.env` file in the repo root (or set these as shell environment variables):

```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/athlete_intelligence

# Clerk
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Session
SESSION_SECRET=your-random-secret-string

# AI (Replit proxy — use real keys if running outside Replit)
AI_INTEGRATIONS_OPENAI_API_KEY=sk-...       # or _DUMMY_API_KEY_ if using Replit proxy
AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1
AI_INTEGRATIONS_OPENROUTER_API_KEY=sk-or-...
AI_INTEGRATIONS_OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# Optional
TWITTER_BEARER_TOKEN=AAAA...
LOG_LEVEL=info
NODE_ENV=development
```

> **On Replit:** All of the above are injected automatically. The `AI_INTEGRATIONS_*` variables are handled by the AI Integrations proxy — the `_DUMMY_API_KEY_` values work as-is.

### 3. Set up the database

```bash
# Push schema to your database
pnpm --filter @workspace/db run db:push

# (Optional) Seed the Stripe schema if not using stripe-replit-sync webhook
# Run the webhook locally via Stripe CLI:
stripe listen --forward-to localhost:8080/api/stripe/webhook
```

### 4. Start the API server

```bash
pnpm --filter @workspace/api-server run dev
# Builds with esbuild then starts on port 8080
```

### 5. Start the frontend

```bash
# PORT and BASE_PATH must be set
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/web run dev
# Opens at http://localhost:3000
```

### 6. Configure Clerk

1. Create a Clerk application at https://clerk.com
2. Set the `CLERK_SECRET_KEY` and `CLERK_PUBLISHABLE_KEY` / `VITE_CLERK_PUBLISHABLE_KEY` from your Clerk dashboard
3. In Clerk dashboard → JWT templates → ensure the default session token is configured
4. If running locally, set `VITE_CLERK_PROXY_URL=""` (empty string)

### 7. Configure Stripe

1. Create products in Stripe dashboard with metadata `tier: starter`, `tier: pro`, `tier: enterprise`
2. Install the Stripe CLI and forward webhooks:
   ```bash
   stripe listen --forward-to localhost:8080/api/stripe/webhook
   ```
3. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

### 8. Verify everything is running

```bash
curl http://localhost:8080/api/healthz
# → {"status":"ok"}
```

Visit `http://localhost:3000` and sign up for an account.

### Common Issues

| Issue | Fix |
|---|---|
| `PORT environment variable is required` | Set `PORT=3000` before running the frontend |
| `BASE_PATH environment variable is required` | Set `BASE_PATH=/` before running the frontend |
| `DATABASE_URL must be set` | Ensure `DATABASE_URL` is in your environment |
| Admin page shows 403 | Your Clerk email doesn't match `FOUNDER_EMAIL` in `admin.ts` |
| AI features return errors | Check `AI_INTEGRATIONS_*` env vars point to valid endpoints |
| Photo backfill returns wrong person | Click "Repopulate" for the athlete instead — uses better search strategy |

### Running typecheck

```bash
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/web run typecheck
```

### Database management

```bash
# Open Drizzle Studio (DB browser)
pnpm --filter @workspace/db run db:studio

# Push schema changes
pnpm --filter @workspace/db run db:push
```
