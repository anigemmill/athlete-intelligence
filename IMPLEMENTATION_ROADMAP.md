# Athlete Intelligence — Incremental Migration Roadmap

> **Document type:** Implementation Roadmap  
> **Status:** Awaiting approval — no code written  
> **Strategy:** Strangler-fig iterative migration. The application remains fully functional after every milestone. New systems run alongside old until proven stable. Nothing is deleted until its replacement has operated correctly for at least one complete cycle.

---

## How to Read This Document

Each milestone entry contains:

- **What changes** — exact files and tables touched
- **What stays the same** — what the existing system continues to do
- **Dependencies** — which prior milestones must be complete first
- **DB migration risk** — rated None / Low / Medium / High, with explanation
- **Existing data** — how current athlete data is preserved
- **Rollback plan** — exact steps to undo if something goes wrong
- **Effort** — realistic estimate for a single engineer
- **Test gate** — what must pass before moving to the next milestone

---

## Phase Overview

| Phase | Name | Milestones | Total effort | Risk level |
|---|---|---|---|---|
| 1 | Critical Code Fixes | M1.1 – M1.7 | 2 days | None |
| 2 | Database Foundations | M2.1 – M2.3 | 1 day | Low |
| 3 | Source Registry | M3.1 – M3.3 | 2 days | Low |
| 4 | Population Status Tracking | M4.1 – M4.3 | 1 day | Low |
| 5 | Evidence Foundation | M5.1 – M5.4 | 5 days | Medium |
| 6 | Identity Engine | M6.1 – M6.4 | 4 days | Medium |
| 7 | Social Engine | M7.1 – M7.5 | 5 days | Medium |
| 8 | Job Queue | M8.1 – M8.4 | 5 days | Medium |
| 9 | Timeline Rebuild | M9.1 – M9.4 | 4 days | Medium |
| 10 | AI Layer Redesign | M10.1 – M10.4 | 10 days | High |
| 11 | Cutover & Cleanup | M11.1 – M11.3 | 5 days | Medium |
| **Total** | | **30 milestones** | **~44 days** | |

---

## Data Preservation Guarantee

The following rule applies to every milestone in this roadmap:

> **No existing table is dropped, no existing column is removed, and no existing row is deleted until its replacement has been running in production for a minimum of 30 days and has been verified to contain equivalent or superior data.**

Every schema change in Phases 1–9 is either:
- **Additive** (new table, new nullable column) — zero risk to existing data
- **Backfill** (populate new structure from existing data) — existing data unchanged, new structure populated in parallel

The cutover in Phase 11 is the only point at which old tables are deprecated, and only after a 30-day parallel-running period.

---

## Phase 1 — Critical Code Fixes

*Pure code changes. Zero schema changes. Zero migration risk. The application must be in better shape before any schema work begins.*

---

### M1.1 — Replace undocumented model alias `gpt-5.6-luna`

**What changes:**
- `artifacts/api-server/src/lib/auto-populate.ts`: Change model from `gpt-5.6-luna` to `gpt-4o` for both the discovery call and the structured extraction call
- `artifacts/api-server/src/lib/photo-lookup.ts`: Change model from `gpt-5.6-luna` to `gpt-4o-mini`; remove `reasoning_effort: "none"` parameter entirely
- `artifacts/api-server/src/routes/summary.ts`: Change model from `gpt-5.6-luna` to `gpt-4o`

**What stays the same:** All routes, schema, prompts, and logic are unchanged. Only the model string changes.

**Dependencies:** None. First milestone.

**DB migration risk:** None. No schema changes.

**Existing data:** Unaffected.

**Rollback plan:** Revert the three files to previous model strings. Single git revert.

**Effort:** 2 hours

**Test gate:**
1. Add a new test athlete via the UI. Confirm the dossier populates within 90 seconds.
2. Open the dossier Summary tab. Confirm the AI summary generates and streams.
3. Check server logs. Confirm no "model not found" or "unknown parameter" errors.
4. Check that `gpt-5.6-luna` no longer appears anywhere in the codebase (`grep -r "gpt-5.6-luna"`).

---

### M1.2 — Fix hardcoded date in research prompt

**What changes:**
- `artifacts/api-server/src/lib/auto-populate.ts`: Replace the hardcoded string `"Today's date is July 29, 2026."` with a dynamic expression that evaluates at call time: `` `Today's date is ${new Date().toISOString().split('T')[0]}.` ``

**What stays the same:** Everything else in the prompt and pipeline.

**Dependencies:** None (can run in parallel with M1.1).

**DB migration risk:** None.

**Existing data:** Unaffected. Next populate run will use the correct date.

**Rollback plan:** Revert one line.

**Effort:** 30 minutes

**Test gate:**
1. Trigger a repopulate from admin Crawl tab.
2. Inspect the Perplexity call in server logs. Confirm the date matches today.
3. Confirm no future competition events appear in the past, and no past events appear as "upcoming".

---

### M1.3 — Abort pipeline on Perplexity failure instead of falling back to GPT training data

**What changes:**
- `artifacts/api-server/src/lib/auto-populate.ts`: In the Perplexity catch block, instead of continuing with empty `researchText`, throw an error that causes `autoPopulateAthlete` to exit early. Set `lastCrawledAt` to remain null. Log the failure clearly with athlete ID and error message.

**What stays the same:** All other pipeline stages. If Perplexity succeeds, behaviour is identical to before.

**Dependencies:** M1.1 (ensures pipeline uses known-good models before adding error handling logic).

**DB migration risk:** None.

**Existing data:** Unaffected. Athletes that were populated with fabricated data are not changed by this milestone — that requires a repopulate, which will use the new pipeline.

**Rollback plan:** Revert the catch block to its previous form.

**Effort:** 2 hours

**Test gate:**
1. Temporarily point the Perplexity base URL to an invalid endpoint in a test run.
2. Trigger a populate. Confirm the athlete has `lastCrawledAt = null` (not a timestamp), `intelligenceCount = 0`, and no intelligence items are written.
3. Confirm server logs show the Perplexity failure message and the pipeline abort.
4. Restore the correct base URL. Confirm a subsequent populate succeeds.

---

### M1.4 — Reject athlete creation if discovery cannot identify sport and nationality

**What changes:**
- `artifacts/api-server/src/lib/auto-populate.ts`: In `discoverAthleteProfile`, if the response returns `sport: ""`, `sport: "Athletics"` (the fallback), or `nationality: ""`, do not silently accept defaults. Return `{ confidence: "low", requiresManualInput: true }`.
- `artifacts/api-server/src/routes/athletes.ts`: In `POST /athletes/discover`, if discovery returns `requiresManualInput: true`, respond 422 with a user-friendly message: `"Could not automatically identify [name] as a known athlete. Please provide their sport and nationality."`

**What stays the same:** If discovery succeeds with real data, the flow is identical. The UI error handling already exists for non-200 responses.

**Dependencies:** M1.1, M1.3.

**DB migration risk:** None. No athlete stub row is created if discovery fails.

**Rollback plan:** Remove the confidence check and revert to the original fallback defaults.

**Effort:** 1.5 hours

**Test gate:**
1. Attempt to add an athlete with a very common name and no sport context (e.g., "John Smith"). Confirm a 422 is returned and no athlete row is created.
2. Attempt to add a well-known athlete (e.g., "Hamish Kerr, High Jump, New Zealand"). Confirm discovery succeeds and pipeline runs normally.

---

### M1.5 — Fix timeline date fallback (stop defaulting to today)

**What changes:**
- `artifacts/api-server/src/lib/auto-populate.ts`: In the timeline event mapping, change the date handling from:
  ```
  date: item.date ? new Date(item.date).toISOString().split("T")[0] : today
  ```
  to: if `item.date` is absent, unparseable, or resolves to an invalid date, **skip that timeline event entirely** rather than inserting today's date.

**What stays the same:** Timeline events with valid dates are written exactly as before.

**Dependencies:** M1.1.

**DB migration risk:** None. New behaviour only affects new populate runs.

**Existing data:** Existing timeline events with incorrect dates (set to the populate date) are not automatically fixed — but they will not increase in number from this point forward.

**Rollback plan:** Revert the date handling logic.

**Effort:** 1 hour

**Test gate:**
1. Trigger a repopulate for an athlete with sparse public data.
2. Open the Timeline tab. Confirm no events show today's date unless the athlete genuinely has an event today.
3. Confirm total timeline event count is similar to before (some events may now be skipped — this is correct behaviour, not a regression).

---

### M1.6 — Consolidate duplicate repopulate endpoints

**What changes:**
- `artifacts/api-server/src/routes/athletes.ts` and `artifacts/api-server/src/routes/admin.ts`: Extract the shared repopulate logic into a new service function `repopulateAthlete(athleteId: number)` in a new file `artifacts/api-server/src/lib/repopulate.ts`. Both routes call this function. No behaviour change.

**What stays the same:** Both API endpoints remain. Their request/response contracts are unchanged. The admin endpoint still has stricter auth. The only change is that the implementation is in one place.

**Dependencies:** M1.3.

**DB migration risk:** None.

**Rollback plan:** Inline the function back into both route files.

**Effort:** 2 hours

**Test gate:**
1. Trigger repopulate from Admin Crawl tab. Confirm it works.
2. Trigger repopulate from Dossier page (if exposed). Confirm it works.
3. Confirm `grep -n "DELETE FROM"` in both route files returns zero results (logic has moved to the service).

---

### M1.7 — Standardise social extraction across all code paths

**What changes:**
- `artifacts/api-server/src/lib/auto-populate.ts`: Change social extraction from `perplexity/sonar` → `perplexity/sonar-pro` and from `gpt-5.6-luna` → `gpt-4o-mini`.
- `artifacts/api-server/src/lib/social-extract.ts` (new file): Extract the shared Perplexity + GPT-4o-mini social extraction logic into a single reusable function. All three paths (auto-populate, admin backfill, dossier refresh) call this function.

**What stays the same:** Route signatures, response shapes, and DB write logic are unchanged.

**Dependencies:** M1.1, M1.6 (pattern established by shared service extraction).

**DB migration risk:** None.

**Rollback plan:** Revert to inline code in each file.

**Effort:** 2 hours

**Test gate:**
1. Run "Backfill Social" from admin. Confirm handles and follower counts are returned.
2. Click "Refresh from Web" on a dossier. Confirm social data updates.
3. Add a new athlete. Confirm social data is populated as part of the initial populate.
4. Confirm `perplexity/sonar` (non-pro) no longer appears in any social-related code path.

---

### Phase 1 Completion Gate

Before moving to Phase 2, confirm all of the following:
- [ ] `gpt-5.6-luna` does not appear anywhere in the codebase
- [ ] `reasoning_effort` does not appear anywhere in the codebase
- [ ] Research prompt generates today's date dynamically
- [ ] Perplexity failure does not create intelligence items
- [ ] Unknown athletes return a 422 rather than defaulting to "Athletics"
- [ ] Timeline events no longer default to today's date
- [ ] Social extraction uses a single shared function and sonar-pro everywhere

---

## Phase 2 — Database Foundations

*All schema changes in this phase are additive (new indexes, new nullable columns). Zero risk to existing data. Indexes can be created and dropped without affecting application logic.*

---

### M2.1 — Add missing indexes on foreign key columns

**What changes:**
- `lib/db/src/schema/intelligence-items.ts`: Add index on `athleteId`, add index on `discoveredAt`
- `lib/db/src/schema/timeline-events.ts`: Add index on `athleteId`
- `lib/db/src/schema/contacts.ts`: Add index on `athleteId`
- `lib/db/src/schema/competitions.ts`: Add index on `athleteId`, add index on `date`
- Run `pnpm --filter @workspace/db run db:push`

**What stays the same:** All queries, all routes, all data. Indexes are invisible to application code.

**Dependencies:** Phase 1 complete.

**DB migration risk:** Low. Creating indexes on existing tables locks them briefly (milliseconds on a small table). For a table with fewer than 10,000 rows, this is imperceptible. No data is changed.

**Existing data:** Fully preserved.

**Rollback plan:** Drop the indexes. `DROP INDEX CONCURRENTLY idx_name;` — zero data impact.

**Effort:** 1 hour

**Test gate:**
1. Open a dossier page. Confirm all tabs still load correctly.
2. Check `EXPLAIN ANALYZE` on `SELECT * FROM intelligence_items WHERE athlete_id = $1` — confirm it shows `Index Scan` not `Seq Scan`.
3. Confirm `pnpm --filter @workspace/db run db:push` reports no destructive changes.

---

### M2.2 — Add unique constraint on athlete name (case-insensitive)

**What changes:**
- `lib/db/src/schema/athletes.ts`: Add `uniqueIndex('idx_athletes_name_unique').on(sql`lower(name)`)` 
- Run `pnpm --filter @workspace/db run db:push`

**What stays the same:** All existing data. The unique index is created only if no duplicates exist. If duplicates are found, they must be resolved manually first (check with: `SELECT lower(name), COUNT(*) FROM athletes GROUP BY lower(name) HAVING COUNT(*) > 1`).

**Dependencies:** M2.1.

**DB migration risk:** Low–Medium. If duplicate athlete names exist in the database, the migration will fail. Pre-check must be run before applying. If duplicates exist, the admin must merge or delete them first via the admin panel.

**Existing data:** No data is changed. The constraint only prevents future duplicates.

**Rollback plan:** `DROP INDEX idx_athletes_name_unique;` — zero data impact.

**Effort:** 1 hour (plus time to resolve any pre-existing duplicates)

**Pre-check SQL:**
```sql
SELECT lower(name), COUNT(*), array_agg(id) AS ids
FROM athletes
GROUP BY lower(name)
HAVING COUNT(*) > 1;
```
If this returns rows, resolve them before applying the index.

**Test gate:**
1. Attempt to add an athlete that already exists (same name, different capitalisation). Confirm the system returns the existing athlete rather than creating a duplicate.
2. Confirm the pre-check SQL returns zero rows after the migration.

---

### M2.3 — Add `avatar_url_locked` column to athletes

**What changes:**
- `lib/db/src/schema/athletes.ts`: Add `avatarUrlLocked boolean default false`
- `artifacts/api-server/src/routes/admin.ts`: In the photo backfill route, add `WHERE avatar_url_locked = false` to the athlete selection query
- Run `pnpm --filter @workspace/db run db:push`

**What stays the same:** All existing photos. No existing `avatarUrl` values are changed. `avatarUrlLocked` defaults to `false`, so existing behaviour is unchanged.

**Dependencies:** M2.1.

**DB migration risk:** None. Adding a nullable/defaulted column to an existing table is the safest possible schema change in PostgreSQL.

**Existing data:** All existing `avatarUrl` values preserved exactly. All athletes default to `avatarUrlLocked = false`.

**Rollback plan:** `ALTER TABLE athletes DROP COLUMN avatar_url_locked;` — zero data impact.

**Effort:** 1 hour

**Test gate:**
1. Manually set `avatar_url_locked = true` for one athlete directly in the DB.
2. Run "Backfill Photos" from admin. Confirm the locked athlete's photo is not changed.
3. Confirm unlocked athletes are still processed by the backfill.

---

### Phase 2 Completion Gate

- [ ] All FK columns have indexes (verify with `\d tablename` in psql)
- [ ] `EXPLAIN ANALYZE` on any `WHERE athlete_id = $1` query shows index scan
- [ ] Duplicate athlete names produce a dedup result, not a new row
- [ ] Photo backfill skips locked athletes

---

## Phase 3 — Source Registry

*Creates the `sources` table — a new table with no connections to existing tables yet. Purely additive. The existing system is completely unaffected.*

---

### M3.1 — Create `sources` registry table and seed it

**What changes:**
- New file: `lib/db/src/schema/sources.ts` — defines the `sources` table (domain, display_name, tier, source_type, sport_scope, is_official, notes, created_at, last_verified)
- New file: `lib/db/src/seeds/sources.ts` — inserts the initial 30–40 known sources (World Athletics, UCI, Wikipedia, etc.) with their tier assignments
- `lib/db/src/schema/index.ts`: Export the new table
- Run `pnpm --filter @workspace/db run db:push`
- Run the seed script

**What stays the same:** Every existing table and route. Nothing reads from `sources` yet.

**Dependencies:** Phase 2 complete.

**DB migration risk:** None. New table, no connections.

**Existing data:** Unaffected.

**Rollback plan:** `DROP TABLE sources;` — zero impact on existing system.

**Effort:** 1 day (schema: 1 hour; seed data research and entry: 6 hours)

**Initial sources to seed (sample):**

| Domain | Display name | Tier | Type |
|---|---|---|---|
| worldathletics.org | World Athletics | 1 | api |
| uci.org | UCI | 1 | api |
| fis-ski.com | FIS | 1 | web |
| aquatics.sport | World Aquatics | 1 | api |
| olympics.com | International Olympic Committee | 1 | web |
| athleticsnz.org.nz | Athletics New Zealand | 1 | web |
| cyclingnewzealand.nz | Cycling New Zealand | 1 | web |
| firstcycling.com | First Cycling | 4 | web |
| procyclingstats.com | ProCyclingStats | 4 | web |
| tilastopaja.eu | Tilastopaja | 4 | web |
| swimrankings.net | SwimRankings | 4 | web |
| bbc.com/sport | BBC Sport | 6 | web |
| reuters.com | Reuters | 6 | web |
| wikipedia.org | Wikipedia | 7 | web |
| perplexity.ai | Perplexity (AI estimate) | 7 | ai_estimated |
| twitter.com | X (Twitter) | 7 | social |
| instagram.com | Instagram | 7 | social |
| tiktok.com | TikTok | 7 | social |
| youtube.com | YouTube | 7 | social |

**Test gate:**
1. `SELECT COUNT(*) FROM sources;` — confirm seed data is present
2. `SELECT * FROM sources WHERE tier = 1;` — confirm all Tier 1 sources are present
3. Confirm the application still loads and all dossiers still display correctly

---

### M3.2 — Add nullable `source_id` FK to `intelligence_items`

**What changes:**
- `lib/db/src/schema/intelligence-items.ts`: Add `sourceId uuid references sources(id)` — nullable, no default
- `artifacts/api-server/src/lib/auto-populate.ts`: When writing intelligence items, attempt to match `sourceDomain` against the `sources` table. If a match is found, populate `sourceId`. If no match, leave null. **The pipeline does not fail if source is not found.**
- Run `pnpm --filter @workspace/db run db:push`

**What stays the same:** The existing `sourceDomain` text column remains. The new `sourceId` column is supplementary and nullable. All existing queries continue to work.

**Dependencies:** M3.1.

**DB migration risk:** None. Adding a nullable FK column. Existing rows get `sourceId = null`. The FK constraint only applies to new writes.

**Existing data:** All existing intelligence items retain their `sourceDomain` text value. `sourceId` defaults to null for all existing rows.

**Rollback plan:** `ALTER TABLE intelligence_items DROP COLUMN source_id;`

**Effort:** 2 hours

**Test gate:**
1. Add a new athlete. Confirm intelligence items are created.
2. `SELECT source_id, source_domain FROM intelligence_items WHERE source_id IS NOT NULL LIMIT 5;` — confirm some items now have source_id populated
3. Confirm the dossier Intelligence tab still loads and displays all items correctly

---

### M3.3 — Add nullable `source_id` FK to `timeline_events`, `contacts`, `competitions`

**What changes:**
- Same pattern as M3.2 applied to the remaining three tables.
- Run `pnpm --filter @workspace/db run db:push`

**Dependencies:** M3.2.

**DB migration risk:** None. Identical pattern to M3.2.

**Existing data:** Preserved. All existing rows get `sourceId = null`.

**Rollback plan:** Drop the three columns individually.

**Effort:** 2 hours

**Test gate:**
- Same pattern as M3.2 for each table
- Confirm Timeline, Contacts, and Competitions tabs all load correctly

---

## Phase 4 — Population Status Tracking

*Adds real pipeline status visibility. This directly unblocks the frontend polling problem identified in the audit (M6 from audit). Small, safe, high-value.*

---

### M4.1 — Add `population_status` column to athletes

**What changes:**
- `lib/db/src/schema/athletes.ts`: Add `populationStatus text default 'idle'`
  - Valid values: `'idle'` | `'queued'` | `'researching'` | `'extracting'` | `'complete'` | `'failed'`
- Run `pnpm --filter @workspace/db run db:push`

**Dependencies:** Phase 3 complete.

**DB migration risk:** None. Additive column with default.

**Existing data:** All existing athletes get `populationStatus = 'idle'`.

**Rollback plan:** `ALTER TABLE athletes DROP COLUMN population_status;`

**Effort:** 30 minutes

---

### M4.2 — Wire pipeline to update `population_status` at each stage

**What changes:**
- `artifacts/api-server/src/lib/repopulate.ts` (from M1.6): Add status updates at each pipeline stage:
  - On job start: set `populationStatus = 'queued'`
  - On Perplexity call start: set `populationStatus = 'researching'`
  - On GPT extraction start: set `populationStatus = 'extracting'`
  - On success: set `populationStatus = 'complete'`
  - On failure: set `populationStatus = 'failed'`

**Dependencies:** M4.1, M1.6.

**DB migration risk:** None.

**Effort:** 2 hours

---

### M4.3 — Update frontend polling to use `population_status`

**What changes:**
- `artifacts/web/src/pages/DossierPage.tsx`: Change the polling termination condition from time-based (60s timeout) to status-based: terminate when `populationStatus === 'complete'` or `populationStatus === 'failed'`. Show a progress label based on the current status value.
- `artifacts/web/src/pages/AdminPage.tsx`: Show `populationStatus` in the Crawl tab athlete table.

**Dependencies:** M4.2.

**DB migration risk:** None.

**Effort:** 2 hours

**Phase 4 test gate:**
1. Add a new athlete. Watch the dossier page. Confirm the status label progresses through "Queued → Researching → Extracting → Complete" rather than just spinning for 60s.
2. Temporarily break the API URL. Add a new athlete. Confirm the dossier shows "Failed" rather than "No data found" after a timeout.
3. In admin Crawl tab, confirm each athlete shows their population status.

---

## Phase 5 — Evidence Foundation

*This is the first significant architectural milestone. New tables are created and the pipeline begins writing to them in parallel with existing tables. Existing tables are completely untouched. This is purely additive.*

---

### M5.1 — Create `evidence_items` table

**What changes:**
- New file: `lib/db/src/schema/evidence-items.ts` — full schema as defined in the Technical Design document
- `lib/db/src/schema/index.ts`: Export it
- Run `pnpm --filter @workspace/db run db:push`

**Dependencies:** Phase 4 complete. M3.1 (requires sources table).

**DB migration risk:** None. New table.

**Existing data:** Unaffected.

**Rollback plan:** `DROP TABLE evidence_items;`

**Effort:** 3 hours (schema definition + indexes)

---

### M5.2 — Create `evidence_supporting_sources` table

**What changes:**
- New file: `lib/db/src/schema/evidence-supporting-sources.ts`
- Export it
- Run `pnpm --filter @workspace/db run db:push`

**Dependencies:** M5.1.

**DB migration risk:** None.

**Effort:** 30 minutes

---

### M5.3 — Dual-write: pipeline writes to `evidence_items` alongside existing tables

**What changes:**
- `artifacts/api-server/src/lib/auto-populate.ts` (and `repopulate.ts`): After each DB insert to `intelligence_items`, `timeline_events`, `contacts`, `competitions`, also insert a corresponding row into `evidence_items`. The two writes happen in the same DB transaction where possible.
- The existing tables continue to receive writes as before. Nothing is removed.
- A failed `evidence_items` write logs a warning but does NOT roll back the existing table write. **The existing system must never be degraded by the new system.**

**Key mapping:**
| Existing table | evidence_items fact_type |
|---|---|
| `intelligence_items` (category: results_rankings) | `competition_result` |
| `intelligence_items` (category: media_interviews) | `media_appearance` |
| `intelligence_items` (category: sponsorships) | `sponsorship` |
| `intelligence_items` (category: career_changes) | `career_transition` |
| `timeline_events` | `timeline_event` |
| `contacts` (category: coaching) | `coach` |
| `contacts` (category: management) | `agent` |
| `contacts` (category: sponsorship) | `sponsor_contact` |
| `competitions` | `competition_result` (with result_value) |

**Dependencies:** M5.2, M3.2.

**DB migration risk:** Low. New writes added. Existing writes unchanged. If the evidence write fails, a warning is logged.

**Existing data:** Unaffected.

**Rollback plan:** Remove the dual-write code from the pipeline. Evidence items written so far are left in place (harmless) or truncated with `TRUNCATE evidence_items;`.

**Effort:** 3 days

**Test gate:**
1. Add a new athlete. Confirm:
   - `intelligence_items` is populated (as before)
   - `evidence_items` is also populated with corresponding rows
   - The dossier page displays correctly (reads from existing tables)
2. `SELECT COUNT(*) FROM evidence_items WHERE athlete_identity_id IS NULL;` — confirm all evidence items have athlete linkage
3. Confirm zero errors in server logs related to evidence writes

---

### M5.4 — Backfill existing `intelligence_items` → `evidence_items`

**What changes:**
- New one-off script: `artifacts/api-server/scripts/backfill-evidence.ts`
- Script reads all existing `intelligence_items`, `timeline_events`, `contacts`, `competitions` and creates corresponding `evidence_items` rows. Uses Perplexity AI estimate as the source (Tier 7) since no better provenance exists for legacy data.
- Script is idempotent: if run twice, it does not create duplicates (checks for existing evidence item with matching athlete + fact_type + fact_value + fact_date before inserting).
- Run once from admin shell after verifying M5.3 is stable.

**Note on legacy data quality:** The backfilled evidence items will have `confidence` set to 35 (AI estimate) and `verification_status = 'unverified'`. This is honest — legacy data came from an AI pipeline with no source verification. Future repopulates will create higher-confidence evidence items for the same athletes.

**Dependencies:** M5.3 running stably for at least 3 new athlete populates.

**DB migration risk:** Low. The script only inserts into the new `evidence_items` table. No existing data is changed. If the script fails mid-run, simply re-run it (idempotent).

**Existing data:** Preserved exactly. The backfill reads from existing tables, does not modify them.

**Rollback plan:** `TRUNCATE evidence_items;` — removes all evidence items. The existing system continues to work from its own tables. Only the new evidence layer is affected.

**Effort:** 1 day

**Test gate:**
1. `SELECT COUNT(*) FROM evidence_items;` should be roughly equal to `SELECT COUNT(*) FROM intelligence_items` + `SELECT COUNT(*) FROM timeline_events` + `SELECT COUNT(*) FROM contacts` + `SELECT COUNT(*) FROM competitions`
2. Run the backfill script a second time. Confirm the count does not increase (idempotency check).
3. All dossier pages continue to work normally.

---

### Phase 5 Completion Gate

- [ ] All new athletes have evidence_items populated by the pipeline
- [ ] All existing athletes have evidence_items backfilled
- [ ] No existing functionality is broken
- [ ] Evidence items have correct source linkage where domain matches the sources registry
- [ ] Dual-write failure does not break the main populate pipeline

---

## Phase 6 — Identity Engine

*Creates permanent athlete identities. Initially runs alongside the existing `athletes` table. Neither table is removed at this stage.*

---

### M6.1 — Create `athlete_identities` table

**What changes:**
- New file: `lib/db/src/schema/athlete-identities.ts` — full schema as in Technical Design
- Export it
- Run `pnpm --filter @workspace/db run db:push`
- Add `athlete_identity_id uuid references athlete_identities(id)` nullable column to `athletes` table (the bridge column that links old and new systems)

**Dependencies:** Phase 5 complete.

**DB migration risk:** None. New table plus nullable FK column on `athletes`.

**Existing data:** All existing `athletes` rows get `athleteIdentityId = null`. This is correct — they have not been linked to an identity record yet (that happens in M6.3).

**Rollback plan:** Drop `athlete_identities` table and `athlete_identity_id` column from `athletes`.

**Effort:** 3 hours

---

### M6.2 — New athletes create an identity record (dual-write)

**What changes:**
- `artifacts/api-server/src/routes/athletes.ts` (`POST /athletes/discover`): After confirming the athlete is new, create an `athlete_identities` record before inserting the `athletes` row. Set `athletes.athleteIdentityId` to the new identity UUID.
- The fingerprint uniqueness check runs against `athlete_identities` first. If the fingerprint already exists, the identity's `id` is reused.

**What stays the same:** The `athletes` table continues to receive all writes. The `athlete_identities` record is additional, not a replacement.

**Dependencies:** M6.1.

**DB migration risk:** Low. One additional insert per new athlete.

**Rollback plan:** Remove the identity creation code. Future athletes will have `athleteIdentityId = null`.

**Effort:** 1 day

**Test gate:**
1. Add a new athlete. Confirm a corresponding row exists in `athlete_identities`.
2. Attempt to add the same athlete again (same name/sport/nationality). Confirm the existing identity is returned and no duplicate is created in either table.
3. All existing athletes continue to work normally (their `athleteIdentityId` is null — that is expected at this stage).

---

### M6.3 — Backfill existing athletes with identity records

**What changes:**
- New script: `artifacts/api-server/scripts/backfill-identities.ts`
- For each existing `athletes` row where `athleteIdentityId IS NULL`:
  - Create an `athlete_identities` record from the athlete's name, sport, nationality
  - Set `athletes.athleteIdentityId = new_identity_id`
- Script is idempotent.
- After running, update `evidence_items.athlete_identity_id` to point to the new identity UUIDs (currently `null` for backfilled items).

**Dependencies:** M6.2 running stably, M5.4 complete.

**DB migration risk:** Medium. This script updates `athletes.athleteIdentityId` for existing rows. If interrupted, some rows are updated and others are not — but the script is idempotent, so re-running it is safe.

**Rollback plan:**
```sql
UPDATE athletes SET athlete_identity_id = null;
UPDATE evidence_items SET athlete_identity_id = null;
DELETE FROM athlete_identities;
```
Zero data loss. The system falls back to operating with null identity IDs, which is the state before this script ran.

**Effort:** 1 day

**Test gate:**
1. `SELECT COUNT(*) FROM athletes WHERE athlete_identity_id IS NULL;` — should return 0 after the script
2. `SELECT COUNT(*) FROM evidence_items WHERE athlete_identity_id IS NULL;` — should return 0 after the script
3. Confirm athlete identity fingerprint uniqueness: `SELECT identity_fingerprint, COUNT(*) FROM athlete_identities GROUP BY identity_fingerprint HAVING COUNT(*) > 1;` — should return zero rows

---

### M6.4 — Add identity deduplication to the discovery flow

**What changes:**
- `artifacts/api-server/src/routes/athletes.ts`: Before the current duplicate check (`SELECT * FROM athletes WHERE name = $1`), add a fingerprint check against `athlete_identities`. Show a UI warning if a name-similar identity already exists.
- Add a birth year field to the new athlete creation form (optional, for disambiguation).

**Dependencies:** M6.3.

**DB migration risk:** None.

**Effort:** 1 day

**Phase 6 test gate:**
- [ ] Every athlete row has a corresponding identity record
- [ ] Every evidence item has an athlete_identity_id
- [ ] Creating a duplicate athlete (same fingerprint) returns existing identity
- [ ] Dossier pages, admin panel, and all existing features work normally

---

## Phase 7 — Social Engine

*Replaces flat social columns with a proper handle registry and snapshot history. The existing columns remain in place and continue to be used by the frontend until Phase 11.*

---

### M7.1 — Create `social_handles` and `social_snapshots` tables

**What changes:**
- New files: `lib/db/src/schema/social-handles.ts`, `lib/db/src/schema/social-snapshots.ts`
- Export them
- Run `pnpm --filter @workspace/db run db:push`

**Dependencies:** Phase 6 complete.

**DB migration risk:** None. New tables.

**Effort:** 2 hours

---

### M7.2 — Backfill existing social data into new tables

**What changes:**
- New script: `artifacts/api-server/scripts/backfill-social.ts`
- For each athlete with non-null social handles/followers, create:
  - `social_handles` rows for each known platform
  - One `social_snapshots` row per platform using the current values (as a historical baseline)
- Set `verification_status = 'unverified'` for all backfilled handles (they were AI-discovered, not verified)
- Set `data_source = 'legacy_backfill'` for all backfilled snapshots
- Script is idempotent

**Dependencies:** M7.1, M6.3 (identity records needed for FK).

**DB migration risk:** Low. New tables only. Existing `athletes` columns unchanged.

**Rollback plan:** `TRUNCATE social_handles, social_snapshots;`

**Effort:** 1 day

---

### M7.3 — New social collection writes to `social_snapshots`

**What changes:**
- `artifacts/api-server/src/lib/social-extract.ts` (from M1.7): After writing social data to the existing `athletes` columns (as before), also write to `social_handles` and `social_snapshots`. Compute 7-day and 30-day deltas from the most recent previous snapshot.

**Dependencies:** M7.2.

**DB migration risk:** None. Additional writes.

**Effort:** 1.5 days

---

### M7.4 — Frontend: show verified vs estimated labels on social data

**What changes:**
- `artifacts/web/src/pages/DossierPage.tsx` (Social Media tab): Add a new API call to `GET /api/athletes/:id/social-handles` (new endpoint). Show the appropriate label (✅ verified / ≈ estimated / ⚠ unverified) alongside each follower count. Show the snapshot date ("as of Jun 2025").
- `artifacts/api-server/src/routes/athletes.ts`: Add `GET /athletes/:id/social-handles` endpoint that returns social handles and their most recent snapshot.

**What stays the same:** The existing flat columns (`instagramFollowers` etc.) continue to power this UI as the fallback. The new endpoint data overlays on top. If the new endpoint returns no data, the existing display is shown unchanged.

**Dependencies:** M7.3.

**DB migration risk:** None. New read endpoint only.

**Effort:** 1.5 days

**Test gate for M7.4:**
1. Confirmed athlete has social handles. Open Dossier → Social Media tab. Confirm follower counts show with appropriate verified/estimated labels.
2. Confirm "as of [date]" timestamp is shown.
3. Confirm the tab still works correctly if `social_handles` has no data (falls back to existing display).

---

### M7.5 — Wire up Twitter API for verified follower counts

**What changes:**
- Set `TWITTER_BEARER_TOKEN` environment secret (must be obtained — audit finding H2 noted it is not currently set)
- `artifacts/api-server/src/lib/social-extract.ts`: For athletes with a Twitter handle, call the X API v2 directly to get the authoritative follower count. Store as `data_source = 'twitter_api'`, `is_verified = true`, `confidence = 95`.

**Note:** This milestone is conditional on `TWITTER_BEARER_TOKEN` being available. If not available, skip and mark M7.5 as blocked.

**Dependencies:** M7.4.

**DB migration risk:** None.

**Effort:** 1 day (if token available)

**Phase 7 test gate:**
- [ ] All existing athletes have social_handles rows
- [ ] At least one social_snapshots row exists per athlete per platform
- [ ] Social Media tab shows verification labels
- [ ] Running "Backfill Social" creates new social_snapshots rows (not just updates existing athletes columns)
- [ ] The athletes table social columns still have correct values (dual-write confirmed)

---

## Phase 8 — Job Queue

*Replaces the detached background promise with a durable, recoverable job queue backed by PostgreSQL. No external infrastructure required.*

---

### M8.1 — Create `crawl_jobs` table

**What changes:**
- New file: `lib/db/src/schema/crawl-jobs.ts` — full schema as in Technical Design
- Export it
- Run `pnpm --filter @workspace/db run db:push`

**Dependencies:** Phase 7 complete.

**DB migration risk:** None.

**Effort:** 2 hours

---

### M8.2 — Wrap `autoPopulateAthlete` in the job queue

**What changes:**
- `artifacts/api-server/src/lib/repopulate.ts`: Instead of directly calling `autoPopulateAthlete`, insert a `crawl_jobs` row with `job_type = 'full_populate'`, `status = 'queued'`.
- New file: `artifacts/api-server/src/lib/job-worker.ts`: A worker that polls `crawl_jobs WHERE status = 'queued' ORDER BY priority, scheduled_for` every 5 seconds. Picks up one job at a time, sets `status = 'running'`, executes it, then sets `status = 'complete'` or `status = 'failed'` with `last_error`.
- `artifacts/api-server/src/index.ts`: Start the job worker on server startup.

**What stays the same:** API route response times are unchanged (the route still returns 202 immediately). The populate still runs in the background. The difference is it now survives server restarts.

**Dependencies:** M8.1.

**DB migration risk:** Low. One new background process. If it fails, it logs an error and stops — the queue entry remains with `status = 'failed'` for inspection.

**Rollback plan:** Disable the job worker on startup. Revert the repopulate function to call `autoPopulateAthlete` directly. In-flight queue entries remain in the `crawl_jobs` table (harmless).

**Effort:** 2.5 days

**Test gate:**
1. Add a new athlete. Confirm a `crawl_jobs` row is created.
2. Restart the API server while a job is running. Confirm the job is picked up again after restart (from `status = 'running'` → re-queued on startup).
3. Confirm the dossier populates correctly — same quality as before.
4. `SELECT status, COUNT(*) FROM crawl_jobs GROUP BY status;` — confirm no jobs are stuck in `'running'` state after the server has been running for 5 minutes.

---

### M8.3 — Recovery of interrupted jobs on server startup

**What changes:**
- `artifacts/api-server/src/index.ts` (server startup): On startup, query for any jobs with `status = 'running'` and reset them to `status = 'queued'` with `attempt_count + 1`. If `attempt_count >= max_attempts`, set `status = 'failed'`.

**Dependencies:** M8.2.

**DB migration risk:** None.

**Effort:** 1 hour

---

### M8.4 — Scheduled crawl triggers (basic implementation)

**What changes:**
- `artifacts/api-server/src/lib/job-scheduler.ts` (new file): A scheduler that runs every hour. Queries for athletes whose `lastCrawledAt` is older than 7 days (or null). Creates `crawl_jobs` of type `results_check` for each. Priority weighted by: active status, recent competition dates, user interest signals.
- Initially schedules only `results_check` jobs. Other job types (`rankings_check`, `news_scan`, `social_snapshot`) are added in subsequent iterations.

**What stays the same:** Manual repopulate from admin still works and takes priority.

**Dependencies:** M8.3.

**DB migration risk:** None.

**Effort:** 1.5 days

**Phase 8 test gate:**
- [ ] All repopulate triggers (admin, dossier, new athlete) create job queue entries
- [ ] Server restart does not lose queued or in-progress jobs
- [ ] Admin panel shows job queue status (new column in Crawl tab)
- [ ] Scheduler creates jobs for stale athletes on a regular interval
- [ ] No duplicate jobs created for the same athlete (check unique constraint)

---

## Phase 9 — Timeline Rebuild

*Extends the existing `timeline_events` table with new columns rather than replacing it. New columns are nullable initially, allowing the old pipeline to continue writing partial data while the new pipeline writes full data.*

---

### M9.1 — Add new columns to `timeline_events` (additive, nullable)

**What changes:**
- `lib/db/src/schema/timeline-events.ts`: Add the following nullable columns:
  - `eventType text` (new controlled vocabulary — maps from existing `category`)
  - `eventDatePrecision text default 'day'`
  - `eventDateDisplay text` (human-readable imprecise dates)
  - `eventEndDate date`
  - `isOngoing boolean default false`
  - `competitionName text`
  - `competitionTier text`
  - `resultValue text`
  - `resultNumeric numeric`
  - `resultRank integer`
  - `significance integer default 3`
  - `isPb boolean default false`
  - `isNationalRecord boolean default false`
  - `isWorldRecord boolean default false`
  - `primaryEvidenceId uuid references evidence_items(id)` — nullable FK
  - `supersededBy uuid references timeline_events(id)` — nullable self-FK
  - `isSuperseded boolean default false`
  - `createdBy text default 'system'`
- Run `pnpm --filter @workspace/db run db:push`

**All new columns are nullable or have defaults.** Existing rows are unaffected. The old pipeline continues to work (it doesn't write these columns, which is fine).

**Dependencies:** Phase 8 complete, M5.4 complete (evidence items needed for FK).

**DB migration risk:** Low. All additive nullable columns. PostgreSQL handles this without a table rewrite.

**Rollback plan:** Drop the new columns individually.

**Effort:** 2 hours

---

### M9.2 — New pipeline writes timeline events with full schema

**What changes:**
- `artifacts/api-server/src/lib/auto-populate.ts`: When creating timeline events, populate all new columns in addition to the existing ones. Map the existing `category` field to the new `eventType` vocabulary. Set `primaryEvidenceId` to the corresponding evidence item created in M5.3.

**Dependencies:** M9.1.

**DB migration risk:** None. Additional column values. Existing pipeline writes are unaffected.

**Effort:** 1 day

---

### M9.3 — Backfill existing timeline events to the new schema

**What changes:**
- New script: `artifacts/api-server/scripts/backfill-timeline.ts`
- For each existing timeline event with null `eventType`, derive `eventType` from `category`. Set `significance = 3` (default). Leave `primaryEvidenceId` null if no corresponding evidence item can be matched.

**Dependencies:** M9.2.

**DB migration risk:** Low. Updates existing rows but only fills previously-null columns.

**Rollback plan:**
```sql
UPDATE timeline_events SET event_type = null, significance = null,
  is_pb = null, is_superseded = false, superseded_by = null;
```

**Effort:** 1 day

---

### M9.4 — Activate the correction model

**What changes:**
- `artifacts/api-server/src/routes/athletes.ts`: Add `PATCH /athletes/:id/timeline/:eventId` endpoint that allows updating a timeline event. Instead of modifying the existing row, it creates a new event and sets `supersededBy` and `isSuperseded = true` on the old one.
- The admin panel (and eventually the dossier) can use this to correct timeline errors without losing the history.

**Dependencies:** M9.3.

**DB migration risk:** None.

**Effort:** 1 day

**Phase 9 test gate:**
- [ ] New populate runs create timeline events with all new columns populated
- [ ] Existing timeline events have been backfilled with `event_type`
- [ ] Timeline tab continues to load correctly
- [ ] Correcting a timeline event creates a new event and marks the old one as superseded
- [ ] The timeline view shows only non-superseded events by default

---

## Phase 10 — AI Layer Redesign

*The most significant code change in the entire migration. The extraction pipeline is redesigned to be evidence-grounded. This is the last phase before cutover.*

> **Risk note:** Phase 10 changes the quality of data being written to the database. It must be validated thoroughly on a small set of athletes before being applied to the full roster. A feature flag (`USE_GROUNDED_EXTRACTION`) gates the new pipeline — the old pipeline remains as fallback.

---

### M10.1 — Evidence-grounded extraction prompts

**What changes:**
- `artifacts/api-server/src/lib/auto-populate.ts`: Redesign the GPT extraction prompt to require:
  - Verbatim quote (`evidence_text`) from the Perplexity research for every extracted claim
  - Confidence capped at 49 for any item without a verbatim quote
  - After extraction, validate that each `evidence_text` is a substring of the Perplexity research text. Items that fail this check are assigned confidence ≤ 30 and flagged as `'ai_estimated'`.
- New feature flag `GROUNDED_EXTRACTION=true` in environment. When false, old pipeline runs.

**Dependencies:** Phase 9 complete, Phase 5 complete (evidence_items writes in place).

**DB migration risk:** None. Code change only. Feature-flagged.

**Rollback plan:** Set `GROUNDED_EXTRACTION=false` in environment. Old pipeline resumes immediately without a deployment.

**Effort:** 3 days

**Test gate:**
1. Enable grounded extraction. Repopulate two athletes (one well-known, one obscure).
2. Check evidence_items: `SELECT fact_value, evidence_text, confidence FROM evidence_items WHERE athlete_identity_id = $id;`
3. Confirm `evidence_text` is non-null for items with confidence > 50
4. Confirm confidence scores are lower for estimated items
5. Confirm the dossier pages still display correctly

---

### M10.2 — Citation validation after extraction

**What changes:**
- `artifacts/api-server/src/lib/auto-populate.ts`: Add post-extraction validation step. For each extracted `sourceUrl`, verify it appears in the Perplexity citations list. Items with an unverifiable `sourceUrl` are not discarded but have their confidence reduced to 30 and `confidence_basis = 'unverifiable_citation'`.

**Dependencies:** M10.1.

**DB migration risk:** None.

**Effort:** 1.5 days

---

### M10.3 — Evidence-grounded summary generation

**What changes:**
- `artifacts/api-server/src/routes/summary.ts`: Before calling GPT, query `evidence_items` for the athlete and build a structured context block (verified facts, estimated facts, omit unverified). Pass this context block to GPT instead of making a fresh Perplexity call. The system prompt explicitly prohibits using training knowledge.

**Dependencies:** M10.1, M5.4 (evidence items must be populated for summaries to have data).

**DB migration risk:** None.

**Rollback plan:** Revert `summary.ts` to previous implementation.

**Effort:** 2 days

**Test gate:**
1. Open a dossier. Generate the AI summary. Confirm it streams correctly.
2. Verify the summary contains only facts present in the evidence_items table for that athlete. (Check 3 specific claims manually.)
3. For an athlete with minimal evidence, confirm the summary says "insufficient verified data" rather than inventing claims.

---

### M10.4 — Chat citation system

**What changes:**
- `artifacts/api-server/src/routes/chat.ts`: Before each chat response, pre-fetch all evidence_items for the relevant athletes. Pass them as a structured context block. Instruct the model to append `[ev-UUID]` citations for every claim. Parse the response to extract citation IDs. Return citations alongside the response.
- `artifacts/web/src/pages/ChatPage.tsx`: Render citation IDs as footnote indicators. Clicking a citation opens a panel showing the evidence item (source URL, retrieval date, confidence, evidence text).

**Dependencies:** M10.3.

**DB migration risk:** None.

**Effort:** 3 days

**Phase 10 test gate:**
- [ ] Grounded extraction produces evidence_text for >80% of extracted intelligence items
- [ ] Confidence scores correctly reflect source quality
- [ ] AI summary does not contain claims absent from evidence_items
- [ ] Chat responses include citation IDs for claims
- [ ] Clicking a citation shows the source evidence
- [ ] Old pipeline still works when `GROUNDED_EXTRACTION=false`

---

## Phase 11 — Cutover and Cleanup

*Only reached after Phase 10 has run in production for 30 days with no data quality regressions. At this point, the new system has proven itself and the old structures can be deprecated.*

---

### M11.1 — Frontend reads from new schema

**What changes:**
The dossier page progressively migrates to reading from the new tables:
- Intelligence tab → reads from `evidence_items` instead of `intelligence_items`
- Timeline tab → reads from redesigned `timeline_events` (new columns)
- Social Media tab → reads from `social_snapshots` instead of `athletes.instagramFollowers` etc.
- Contacts tab → reads from `evidence_items` where `fact_type IN ('coach', 'agent', 'sponsor_contact')` instead of `contacts`
- Competitions tab → reads from `timeline_events` where `event_type = 'competition_result'` instead of `competitions`

**What stays the same during migration:** The old backend routes remain. A feature flag per section controls which data source is active. Sections switch over one at a time.

**Dependencies:** Phase 10 complete and stable for 30 days.

**DB migration risk:** Low. No schema changes. Read queries only.

**Rollback plan:** Revert feature flags to point to old tables.

**Effort:** 1 week

---

### M11.2 — Deprecate old tables (read-only for 30 days)

**What changes:**
- Revoke `INSERT` and `UPDATE` privileges on `intelligence_items`, `contacts`, `competitions`, and the social columns on `athletes`. The tables remain readable.
- Any code paths still writing to these tables will throw an error and must be fixed before this milestone.
- Monitor for any errors for 30 days.

**Dependencies:** M11.1 complete and stable.

**DB migration risk:** Medium. This is the irreversible step. Ensure all write paths have been migrated first.

**Rollback plan:** Re-grant write privileges. The tables still contain data.

**Effort:** 1 day

---

### M11.3 — Drop deprecated tables and old columns

**What changes:**
After 30 days of read-only operation with zero errors:
- `DROP TABLE intelligence_items;`
- `DROP TABLE contacts;`
- `DROP TABLE competitions;`
- `ALTER TABLE athletes DROP COLUMN instagram_handle, instagram_followers, instagram_engagement, twitter_handle, twitter_followers, tiktok_handle, tiktok_followers, follower_growth_30d, avg_engagement, ai_summary, ai_summary_generated_at;`
- Remove the corresponding Drizzle schema definitions.

**Note:** The `athletes` table itself is not dropped — it remains as the primary athlete record but now holds only identity-bridging and status information. The identity layer (`athlete_identities`) is the canonical source of truth for immutable facts.

**Dependencies:** M11.2 complete for 30 days.

**DB migration risk:** High (this is final — no rollback). Data must be verified in new tables before this step. Full database backup required before executing.

**Rollback plan:** There is no code rollback for a DROP. This is why the 30-day read-only period exists. Restore from the pre-drop backup if anything is wrong.

**Effort:** 1 day (mostly verification, not coding)

---

## Dependency Graph

```
Phase 1 (M1.1–M1.7)  ─────────────────────────────────────────────────┐
                                                                         │
Phase 2 (M2.1–M2.3) depends on: Phase 1                                 │
                                                                         │
Phase 3 (M3.1–M3.3) depends on: Phase 2                                 │
                                                                         │
Phase 4 (M4.1–M4.3) depends on: Phase 3                                 │
                                                                         │
Phase 5 (M5.1–M5.4) depends on: Phase 4, M3.1                          │
                                                                         │
Phase 6 (M6.1–M6.4) depends on: Phase 5                                 │
                                                                         │
Phase 7 (M7.1–M7.5) depends on: Phase 6                                 │
                                                                         ▼
Phase 8 (M8.1–M8.4) depends on: Phase 7          All phases depend on ──► Phase 1
                                                                         
Phase 9 (M9.1–M9.4) depends on: Phase 8, Phase 5
                                                                         
Phase 10 (M10.1–M10.4) depends on: Phase 9
                                                                         
Phase 11 (M11.1–M11.3) depends on: Phase 10 (30 days stable)
```

Phases 3 and 4 can proceed in parallel.
Within Phase 1, milestones M1.1–M1.5 can proceed in parallel; M1.6 and M1.7 depend on M1.1.

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Perplexity returns insufficient data for a specific athlete | High | Medium | Pipeline aborts cleanly (M1.3); athlete marked `population_status = 'failed'`; admin notified |
| DB migration fails mid-run (e.g. network drop) | Low | Low | All migrations are additive with idempotent scripts; re-run safely |
| GPT returns malformed JSON in grounded extraction | Medium | Low | Existing JSON parse error handling retained; evidence item not written; warning logged |
| Backfill script creates wrong evidence items | Medium | Medium | Backfill items have `confidence = 35, verification_status = 'unverified'`; clearly labelled; can be truncated and re-run |
| Duplicate athlete_identities created before fingerprint index | Low | Low | Idempotent design; identity merge function handles post-hoc cleanup |
| Phase 10 degrades data quality vs current pipeline | Medium | High | Feature flag; old pipeline available; 30-athlete test run before enabling broadly |
| Old tables dropped before new tables fully validated | Low | High | 30-day read-only period; mandatory backup before any DROP |
| Twitter API rate limit hit during social snapshot | Medium | Low | Snapshot writes to queue; retry logic in job worker; falls back to Perplexity estimate |

---

## What Existing Athletes Experience at Each Phase

| Phase | Effect on existing athlete dossiers |
|---|---|
| Phase 1 | Better data quality on next repopulate. Nothing visible changes immediately. |
| Phase 2 | Faster page loads (queries use indexes). Nothing visible changes. |
| Phase 3 | Source registry populated. Intelligence items begin showing source tiers on hover. |
| Phase 4 | Progress labels during populate ("Researching…", "Extracting…") instead of silent spinner. |
| Phase 5 | Evidence layer running silently in background. No visible change. |
| Phase 6 | New athletes get permanent identities. Existing athletes backfilled. No visible change. |
| Phase 7 | Social data shows verified/estimated labels and "as of [date]" timestamp. |
| Phase 8 | Populate jobs survive server restarts. No visible change to users. |
| Phase 9 | Timeline events show competition tier, significance, and correction history. |
| Phase 10 | Intelligence items show higher confidence for verified claims. Summaries and chat are more accurate. |
| Phase 11 | UI reads from new schema. If migration is correct, zero visible difference. |

---

*End of roadmap. No code has been written. Awaiting approval to begin Phase 1.*
