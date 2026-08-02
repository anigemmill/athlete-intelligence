# Athlete Intelligence — Known Technical Debt

Issues ranked by impact on platform value. Each entry includes root cause, evidence, and the recommended fix.

---

## Priority 1 — Citation index leak corrupts source attribution

**Impact:** HIGH — makes source attribution meaningless for a subset of athletes

**Description:** When Perplexity returns research with numbered citations ([1], [2], [3]…), GPT-4o sometimes writes the citation index number to the `source_url` field (e.g., `"[8]"`) or abbreviates the domain as `source4` / `source9` instead of resolving the real URL or domain name.

**Evidence:** Nick Willis — all 5 source URLs are `"[8]"`, `"[7]"`, `"[10]"`, `"[5]"`, `"[3]"`. Hamish Kerr — all 11 source domains are `"source4"`, `"source6"`, `"source9"`.

**Root cause:** GPT-4o misreads the citation list instruction and stores the index shorthand rather than resolving the actual URL from the numbered list.

**Fix:**
- Post-extraction validation: null out any `source_url` matching `^\[\d+\]$` and any `source_domain` matching `^source\d+$` or not containing `.`
- System prompt addition: "Never write citation index numbers like [1] or source4. If you cannot determine the real URL or domain, write null."
- Affects: `artifacts/api-server/src/lib/auto-populate.ts`

**Proposed solution:** Part of the specialised agent redesign (Task #27, `ContactsAgent` and `IntelligenceAgent` include per-item URL validation).

---

## Priority 2 — PB/SB cross-validation missing

**Impact:** HIGH — immediately visible data error that destroys user trust

**Description:** `personal_best` and `season_best` are populated independently from the same Perplexity research text with no cross-validation. A season best faster than a personal best (logically impossible) can be stored.

**Evidence:** Peter Bol — `personal_best: "1:45.14"`, `season_best: "1:43.64"`. The season best is 1.5 seconds faster than the personal best, which means the personal best field contains stale data.

**Root cause:** Both fields are extracted by GPT-4o from the same research text in a single pass. If Perplexity mentions an old PB from one paragraph and a new season result from another, there is no check that they are consistent.

**Fix:**
- After extraction, parse both strings into comparable numeric values using a sport-aware parser (strip `s` suffix for times, parse `m:ss.xx`, bare number for field events)
- If parsed SB is better than parsed PB (lower for time, higher for distance/weight), set `personal_best = season_best` and log a warning
- If either cannot be parsed, set to null rather than storing an unvalidated string
- Affects: `artifacts/api-server/src/lib/auto-populate.ts`

---

## Priority 3 — Contact extraction failing for most athletes

**Impact:** HIGH — contacts are a core platform value; empty contact tabs undermine trust

**Description:** 4 of 5 athletes have zero contacts on file. The contact extraction relies on the general Perplexity research pass mentioning coach/agent names explicitly. When Perplexity summarises results without naming personnel, GPT-4o has nothing to extract.

**Evidence:** Only Peter Bol has a contact (1 coach). Zoe Hobbs, Nick Willis, Brook Macdonald, and Hamish Kerr have zero contacts despite all being professionally managed elite athletes.

**Root cause:** Single general research prompt cannot reliably surface contacts. The prompt asks for contacts in item #8 of 9, which may receive less attention in the model's output.

**Fix:**
- Add a dedicated second Perplexity query specifically for contacts: `"{name} head coach agent manager {sport} {nationality} {currentYear}"`
- Run in parallel with the main research pass
- Minimum confidence threshold of 70 before storing any contact
- Affects: `artifacts/api-server/src/lib/auto-populate.ts`

**Proposed solution:** `ContactsAgent` in the specialised agent redesign (Task #27).

---

## Priority 4 — Intelligence item and timeline event counts below target

**Impact:** MEDIUM-HIGH — sparse timelines look empty; few intel items reduce feed value

**Description:** The extraction prompt asks for 10–12 intelligence items and 20–30 timeline events. Most athletes have 3–6 items and 2–10 events.

**Evidence:**
| Athlete | Intel items | Timeline events |
|---|---|---|
| Peter Bol | 3 | 2 |
| Brook Macdonald | 5 | 4 |
| Zoe Hobbs | 6 | 6 |
| Nick Willis | 5 | 5 |
| Hamish Kerr | 11 | 10 |

**Root cause:** The GPT-4o call has `max_completion_tokens: 8192`. For the full JSON output (athlete stats + 12 intel items + 30 timeline events + 5 contacts + 30 competitions), 8192 tokens is insufficient. The model truncates output to stay within the limit.

**Fix:**
- Increase `max_completion_tokens` from 8,192 to 16,384 (GPT-4o supports this)
- Add post-extraction count check: if `intel_items.length < 8`, queue a supplementary pass
- Affects: `artifacts/api-server/src/lib/auto-populate.ts`

---

## Priority 5 — Competition result backfill fails on generic meet names

**Impact:** MEDIUM — past competitions show no results

**Description:** `backfillCompetitionResults` matches competitions by fuzzy string match (first 15 characters of meet name). This fails for generic names like "UCI MTB World Series" or "2024 Competition".

**Evidence:** Brook Macdonald has 2 past competitions, both with null results. Both have generic meet names that don't match Perplexity's specific result output.

**Root cause:** Generic meet names were stored at initial population time. The fuzzy matcher cannot find a match because the Perplexity backfill query returns specific names ("UCI Mountain Bike World Cup Round 2") that don't match the stored generic names.

**Fix:**
- Use athlete + sport + approximate year as the search key for backfill queries rather than the stored meet name
- Validate at insertion time: meet names must be ≥8 characters and contain either a year or a named event (rejects "2024 Competition")
- Affects: `artifacts/api-server/src/lib/result-backfill.ts`, `artifacts/api-server/src/lib/auto-populate.ts`

---

## Priority 6 — Photos only update on full repopulate

**Impact:** MEDIUM — photo quality degrades over time without a targeted refresh path

**Description:** Photos are fetched once at crawl time via Wikipedia. Wikipedia profile photos are editorial choices that may be 3–5 years old. There is no mechanism to refresh photos independently of a full data wipe.

**Current hierarchy:** Wikipedia exact match → Wikipedia search → Perplexity fallback

**Better hierarchy:** World Athletics athlete profile → sport federation (UCI, etc.) → national Olympic committee → Wikipedia

**Fix:**
- Add `POST /api/athletes/:id/refresh-photo` endpoint
- Enhance `photo-lookup.ts` to query World Athletics profile first
- Admin backfill endpoint already exists (`POST /admin/backfill-photos`) — update it to use the new hierarchy

---

## Priority 7 — No source URL format validation

**Impact:** MEDIUM — invalid URLs reach the database and break frontend source links

**Description:** The only validation on `source_url` is `String(value)`. Citation indices (`"[8]"`), relative paths, and placeholder text all pass through.

**Fix:**
- Validate that `source_url` starts with `https?://` before storing
- Any non-URL value → set to null
- Apply to `intelligence_items`, `timeline_events`, and `contacts` insertion code
- Affects: `artifacts/api-server/src/lib/auto-populate.ts`

**Note:** This is also partially addressed by the citation index leak fix (Priority 1).

---

## Priority 8 — No migration history

**Impact:** MEDIUM — schema changes can't be tracked or safely rolled back

**Description:** The project uses `drizzle-kit push` to sync schema directly, with no generated migration files. There is no audit trail of what changed when.

**Consequence:** Schema changes to production must be applied by running `push` against the production DATABASE_URL. If a `push-force` is accidentally run, column data can be lost with no rollback path.

**Fix:**
- Switch from `drizzle-kit push` to `drizzle-kit generate` + `drizzle-kit migrate`
- Add a `migrations/` directory
- This is a low-urgency quality improvement — the current approach is workable at 5 athletes

---

## Priority 9 — Scheduler capacity limits

**Impact:** LOW-MEDIUM — platform doesn't scale beyond ~50 athletes without stale data

**Description:** The scheduler processes 3 athletes per 6-hour cycle = max 12 per day. With 90 seconds between athletes per cycle, a roster of 50 athletes would take ~4 days to fully refresh.

**Current config:**
- `STALE_DAYS = 5` — refresh athletes older than 5 days
- `MAX_PER_CYCLE = 3` — max athletes per cycle
- `INTER_ATHLETE_DELAY = 90s` — gap between athletes

**Fix for scale:**
- Increase `MAX_PER_CYCLE` to 5–10 as the roster grows
- Reduce `INTER_ATHLETE_DELAY` once confident in rate limit headroom
- Consider moving to a proper job queue (Bull/BullMQ) rather than an in-process scheduler

---

## Priority 10 — Follower growth metrics are never computed

**Impact:** LOW — dashboard shows static follower counts, no trend data

**Description:** `follower_growth_30d` and `avg_engagement` columns exist in the `athletes` table but are always `0`. The pipeline stores point-in-time follower counts but never computes growth rates.

**Fix:**
- Store previous follower count with timestamp before each update
- Compute 30-day delta on each refresh cycle
- This is a dashboard enhancement, not a correctness issue

---

## Priority 11 — Duplicate middleware directories

**Impact:** LOW — confusing folder structure

**Description:** Two middleware directories exist: `src/middleware/` (contains `requireAuth.ts`) and `src/middlewares/` (contains `clerkProxyMiddleware.ts`). The inconsistent naming is confusing.

**Fix:** Consolidate into `src/middleware/` and move `clerkProxyMiddleware.ts` there. Low risk — purely a rename.

---

## Platform Quality Score (as of August 2026)

Average across 5 sample athletes: **59/100**

| Athlete | Score | Biggest gap |
|---|---|---|
| Zoe Hobbs | 74/100 | No contacts; sparse timeline |
| Peter Bol | 65/100 | PB/SB inversion; 2 timeline events |
| Nick Willis | 57/100 | Invalid source URLs |
| Hamish Kerr | 52/100 | All source domains invalid |
| Brook Macdonald | 47/100 | No results; no contacts |

Fixing issues 1–4 above is estimated to raise this to **76–80/100**.
