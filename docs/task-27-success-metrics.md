# Task #27 — Success Metrics & Regression Guarantees

**Status:** Planning — defines how every milestone in `docs/task-27-implementation-roadmap.md` will be judged, before any of them are built.
**Companion documents:** `docs/task-27-agentic-pipeline.md` (architecture), `docs/task-27-implementation-roadmap.md` (milestones)

**Ground rule for this document:** every number below is either (a) a documented fact already stated in `docs/technical-debt.md` — exact item counts, exact bad values, named examples — or (b) explicitly marked **TBD, established by the baseline audit** where no such fact exists yet. Nothing here is an invented precision. The whole point of this exercise is to replace the informal, non-reproducible "59/100 average" from the accuracy audit with numbers that can actually be recomputed and diffed — inventing a fake number here would defeat that purpose before implementation even starts.

---

## 1. The Intelligence Quality Score (IQS)

Every milestone below is judged against one formula, computed **per athlete**, 0–100:

| Component | Points | How it's computed |
|---|---|---|
| Evidence Validity | 25 | `25 × (records passing validation ÷ total evidence records)` — a record fails if its `source_url` matches `^\[\d+\]$`, its `source_domain` matches `^source\d+$` or contains no `.`, or its URL fails `^https?://` |
| Confidence | 20 | `20 × clamp((avgConfidence − 40) / (97 − 40), 0, 1)` across all evidence records |
| PB/SB Logical Consistency | 10 | `10` if season best is not numerically superior to personal best (sport-aware comparison); `0` if inverted |
| Contact Coverage | 15 | `15 × (distinct contact categories present ÷ 2)`, capped at 15, where the 2 baseline categories are `coaching` and `management` |
| Content Density | 15 | `7.5 × min(1, intelItems ÷ 8) + 7.5 × min(1, timelineEvents ÷ 20)` |
| Competition Result Completeness | 10 | `10 × (past competitions with a result ÷ total past competitions)` |
| Presence | 5 | `5 × (hasPhoto + hasAtLeastOneValidSocialHandle) ÷ 2` |

This is not a new invention disconnected from the codebase — it is the formula that Milestone 7 (`qualityScore.ts`) implements for real, and Milestones 0–6 use it manually (via a script, defined in §3) before that dashboard exists. **This score will not equal the informal "59/100" figure in `docs/technical-debt.md`** — that number was an eyeballed estimate, not computed by an explicit rule, and the two are not expected to reconcile. IQS supersedes it.

---

## 2. The Golden Athlete Set

The same 5 athletes already named throughout `docs/technical-debt.md`, reused here because they are the only athletes in the codebase's documentation with citable, specific, pre-existing defects — which makes before/after comparison possible without guessing:

| Athlete | Documented baseline facts | Primary defect this set exists to catch |
|---|---|---|
| **Peter Bol** | 3 intel items, 2 timeline events, 1 contact (coach only), PB `1:45.14` / SB `1:43.64` (inverted) | PB/SB inversion (Priority 2) |
| **Zoe Hobbs** | 6 intel items, 6 timeline events, 0 contacts | Sparse contacts, otherwise the platform's best-scoring athlete — the regression canary |
| **Nick Willis** | 5 intel items, 5 timeline events, 0 contacts, all 5 `source_url` values are `"[8]"`/`"[7]"`/`"[10]"`/`"[5]"`/`"[3]"` | Citation-index leak, 100% of evidence invalid (Priority 1) |
| **Hamish Kerr** | 11 intel items, 10 timeline events, 0 contacts, all 11 `source_domain` values are `"source4"`/`"source6"`/`"source9"` | Citation-index leak, worst-scoring athlete overall |
| **Brook Macdonald** | 5 intel items, 4 timeline events, 0 contacts, 2 past competitions both with `result: null` | Competition backfill failure on generic meet names (Priority 5) |

This set is formally checked into the codebase in Milestone 7 as `goldenSet.ts`, per the roadmap. Nothing prevents adding more athletes later (the architecture spec's §10 recommends 5–10) — but expanding the set before Milestone 7 would mean inventing baseline facts for athletes the tech-debt audit never measured, which this document deliberately avoids.

---

## 3. The Baseline Audit — How "We'll Know It Worked"

Milestone 0 builds `confidence.ts` and `validation.ts` as pure functions (per the roadmap). Before anything else happens, those same functions are run **read-only** against each golden athlete's current, already-stored data to produce the first real IQS numbers — this is the audit script, and it is the single mechanism every later milestone's "how will we know" answer refers back to.

- **Output:** one JSON snapshot per milestone, containing the IQS total and all 7 sub-scores for each of the 5 golden athletes, committed at `docs/metrics/m<N>.json`.
- **Method:** after each milestone lands (in dev, before promoting any new agent flag to production), repopulate the 5 golden athletes, run the audit script, commit the snapshot, and diff it against the previous milestone's snapshot.
- **Why commit the snapshots:** this is the objective evidence the roadmap is judged against — a reviewer should be able to open `docs/metrics/m4.json` next to `docs/metrics/m3.json` and see Brook Macdonald's Competition Completeness sub-score move, without re-running anything.
- **Noise band:** LLM output is nondeterministic. A milestone that is supposed to be behaviourally invisible (M2, M11) is judged against a **±3 point tolerance band** per athlete, not exact equality — anything outside that band is a regression to investigate, not noise to ignore.

---

## Milestone 0 — Pipeline Foundations

**Status: ✅ `docs/metrics/m0.json` exists — marked `"baselineType": "development"`.** Its `dataProvenance` field records that this first run was a local reconstruction (the production database was not reachable from the implementing session) — seeded only from facts already documented in `docs/technical-debt.md`. This is a development baseline, not a production one, and every subsequent milestone's snapshot inherits the same status until it is superseded.

**TODO — blocking for first production release:** `docs/metrics/m0.json` (and any `m<N>.json` generated before this TODO is resolved) must be regenerated by running `scripts/audit-iqs.ts` against the live production database before the platform's first production release. The development-baseline numbers in this document are illustrative of the methodology, not a claim about the real platform's current quality.

**Measurable improvement expected:** None in IQS — this milestone changes no data. The improvement is that a real, reproducible IQS number exists for the first time, for all 5 golden athletes, replacing the informal estimate.

**How we'll know it worked:** The audit script runs against the current (unmodified) state of the 5 golden athletes and produces `docs/metrics/m0.json`. This file *is* the deliverable's evidence — its existence and internal consistency (scores between 0–100, sub-scores summing correctly) is the pass condition, not any particular value.

**Golden athletes to use:** All 5 — this milestone establishes the reference point every later milestone compares against, so partial coverage isn't acceptable here even though no agent-specific defect is being targeted yet.

**Accuracy score that should improve:** None. Explicitly: **a nonzero IQS change at this milestone indicates a bug in the audit script, not an improvement in the pipeline**, since nothing that produces or writes athlete data has changed yet.

**Regression tests that should never fail:**
- **R0** — the existing manual smoke path (`POST /athletes/discover` → dossier populates) behaves identically to pre-milestone behaviour.

---

## Milestone 1 — Confidence & Validation Retrofit Into the Current Pipeline

**Measurable improvement expected:** Evidence Validity moves from a documented ~0% valid to 100% valid for the two athletes with a named, total defect — Nick Willis (5/5 source URLs are citation indices) and Hamish Kerr (11/11 source domains are `sourceN`). PB/SB Logical Consistency moves from 0/10 to 10/10 for Peter Bol.

**How we'll know it worked:** Repopulate Nick Willis, Hamish Kerr, and Peter Bol; run the audit script; diff against `m0.json`. Directly query the database to confirm zero stored `source_url` values match `^\[\d+\]$` and zero `source_domain` values match `^source\d+$` across all 5 golden athletes (not just the 2 named ones — this is a global guarantee, not athlete-specific). Confirm Peter Bol's `personal_best`/`season_best` pass the sport-aware directional comparison.

**Golden athletes to use:** Nick Willis and Hamish Kerr (citation leak — the named defect), Peter Bol (PB/SB inversion — the named defect). Zoe Hobbs and Brook Macdonald included as regression-only checks — their unrelated fields must not move.

**Accuracy score that should improve:** Evidence Validity sub-score for Nick Willis and Hamish Kerr: **0% → 100% valid** for the previously-flagged records specifically. Hamish Kerr — currently the platform's worst-scoring athlete, with "all source domains invalid" as its explicitly stated biggest gap — should show the **largest single-milestone IQS increase of the entire roadmap**, since this milestone directly removes its single biggest documented defect.

> **Actual outcome (Milestone 1, implemented): this prediction was wrong for Hamish Kerr, and the reason is structural, not a bug.** Nick Willis's defect was in `source_url`, a nullable column — nulling out a leaked value (`"[8]"` → `null`) lands on a state (`no citation available`) that Evidence Validity already treats as passing, so his sub-score moved exactly as predicted (12.5/25 → 25/25, IQS 44 → 57). Hamish Kerr's defect was in `source_domain`, a `NOT NULL` column — there is no equivalent "no domain available" state to fall back to, so a sanitized leak is replaced with the sentinel string `"unknown"`, and `sanitizeSourceDomain("unknown")` correctly returns `null` too. Evidence Validity treats `"unknown"` exactly as it should: still not attributable evidence, whether the model was dishonest (`"source4"`) or is now honestly uncertain (`"unknown"`). Kerr's Evidence Validity sub-score therefore did not move (11.9/25 → 11.9/25) — and his Confidence sub-score actually **dropped** (14.9/20 → 13/20, IQS 48 → 46), because his 11 intelligence items now correctly receive the tier-4/no-attribution confidence penalty that a flat, unadjusted default of 80 previously masked. Net effect: Kerr's IQS **fell**, not rose, and this is the correct outcome — the previous number was propped up by data that looked more trustworthy than it was. Removing a lie about *where* evidence came from does not, by itself, manufacture evidence that's actually attributable; only better research (a real `ContactsAgent`/`IntelligenceAgent` query, Milestones 5–6) can do that. See `docs/metrics/m1.json` for the full diff against `m0.json`.

**Regression tests that should never fail:**
- **R1** — no stored `source_url` matches `^\[\d+\]$`
- **R2** — no stored `source_domain` matches `^source\d+$` or lacks a `.`
- **R3** — no athlete has a `season_best` numerically superior to `personal_best` after a fresh crawl
- Carries forward: R0

---

## Milestone 2 — Orchestrator + IdentityAgent + LegacyMonolithAgent

**Measurable improvement expected:** None in IQS by design — `LegacyMonolithAgent` reproduces the exact same extraction path as before, just invoked through the new orchestrator. The improvement is instrumentation: `agent_runs` records real execution metadata for the first time.

**How we'll know it worked:** Re-run the audit for all 5 golden athletes; every score must land within the ±3 point noise band of `m1.json`. A drift beyond that band means the orchestrator wrapper introduced a behavioural change, which is a bug at this milestone, not a feature. Separately: confirm `agent_runs` contains exactly one row per pipeline execution per golden athlete, tagged `agent: "legacy_monolith"`, `status: "ok"`.

**Golden athletes to use:** All 5 — this is a whole-roster non-regression check, not a single-defect spot check, precisely because this milestone touches every entry point (create, repopulate, scheduler) at once.

**Accuracy score that should improve:** None. Target: **IQS delta within ±3 points for all 5 golden athletes.** Any golden athlete moving outside that band is a blocking finding for this milestone.

**Regression tests that should never fail:**
- **R4** — the discovery confidence gate (`< 70` → `422`) rejects the same fixed set of known-ambiguous test names it rejected before this milestone (a small fixed name list should be established as a fixture the first time this ledger item is introduced)
- Carries forward: R0–R3

---

## Milestone 3 — ResultsAgent

**Measurable improvement expected:** Stat-field confidence (world rank, PB, SB) should hold steady or improve across all 5 golden athletes, since `ResultsAgent`'s query is narrowly targeted at results/rankings rather than sharing a general research pass with nine other topics. Peter Bol's already-fixed (Milestone 1) PB/SB pair should now be *sourced* from a dedicated query rather than corrected after the fact.

**How we'll know it worked:** Audit diff against `m2.json`; specifically inspect Peter Bol's stat-field confidence and confirm Hamish Kerr's and Zoe Hobbs's `world_rank` — both currently populated — are not accidentally nulled by the new agent.

**Golden athletes to use:** Peter Bol (primary target), Hamish Kerr (lowest overall score, most room to move), all 5 for the non-regression check on existing populated fields.

**Accuracy score that should improve:** Stat-field average confidence: **TBD, established by `m2.json` vs `m3.json` diff** — no golden athlete's stat-field confidence may decrease, and at least 2 of 5 must show a measurable increase for this milestone to be considered a net improvement rather than a lateral refactor.

**Regression tests that should never fail:**
- **R5** — no athlete has SB numerically superior to PB after a `ResultsAgent`-sourced crawl (re-affirms R3 under the new agent's write path, not the retrofitted monolith's)
- Carries forward: R0–R4

**Actual outcome (Milestone 3 implemented):** `docs/metrics/m3.json` is numerically identical to
`m2.json` for all 5 golden athletes — this is expected, not a failure to improve, for two
independent, disclosed reasons. First, this sandbox has no production `DATABASE_URL` or AI API
keys (a standing constraint since the Milestone 1 real-world-accuracy-audit request), so
`ResultsAgent` has never actually run against live Perplexity data for any golden athlete —
correctness is demonstrated instead by `resultsAgentLogic.test.ts`'s 12 fixtures (each mapped to
a specific documented defect: Peter Bol's PB/SB inversion, Nick Willis's citation-index URL leak,
Hamish Kerr's citation-index domain leak, a bare unit-less mark, an event/direction mismatch, the
emission-confidence floor, the Tier 3 new-PB gate, and the `worldRankDelta` sign correction) and a
DB-gated integration test proving the single-writer/rollback mechanics with mocked responses.
Second, and found only while implementing this milestone: **the IQS formula itself
(`pipeline/iqs.ts`, built in Milestone 0) does not score confidence or evidence validity from
`athletes`' scalar stat columns at all** — its `confidence`/`evidenceValidity` sub-scores are
computed only from `intelligence_items`, `timeline_events`, and `contacts` rows; the only
IQS component that reads `personalBest`/`seasonBest` is `pbSbConsistency` (already at its
10/10 ceiling for every golden athlete with a non-null pair), and no component reads
`worldRank`/`nationalRank` at all. **This means the "at least 2 of 5 must show a measurable
increase" acceptance bar from this section is not measurable by IQS in its current form**,
independent of the credentials constraint — a real live `ResultsAgent` run today would still not
move this score. This is a gap in the IQS formula's coverage relative to what this milestone's
target assumed, not a gap in `ResultsAgent` itself. Recommended follow-up: extend `iqs.ts` with a
stat-field confidence/evidence component once real field data from a live run (or Milestone 4-6's
own agents) exists to design it against — Milestone 7 ("Monitoring Dashboard & Golden-Athlete
Regression Set") is the natural place, not a speculative change bundled into this milestone.

---

## Milestone 4 — CompetitionsAgent

**Measurable improvement expected:** Brook Macdonald's Competition Result Completeness — currently 0% (2 past competitions, both `result: null`) — should increase. Newly written competitions across all 5 golden athletes should pass the meet-name quality gate.

**How we'll know it worked:** Audit diff against `m3.json` for Brook Macdonald's Competition Completeness sub-score; direct query confirming no `meet_name` under 8 characters lacking a year or named event; run `POST /admin/backfill-results` against Brook Macdonald post-crawl and confirm it now successfully matches and fills at least one of the two previously-null competitions.

**Golden athletes to use:** Brook Macdonald (the named example), all 5 for the upsert-duplication regression (running the agent twice must not double competition rows).

**Accuracy score that should improve:** Brook Macdonald's Competition Result Completeness: **0% → at least 1 of 2 known-null competitions filled** after this milestone plus one backfill run.

**Regression tests that should never fail:**
- **R6** — no stored `meet_name` is under 8 characters and lacking both a 4-digit year and a named event
- **R7** — running `CompetitionsAgent` twice in a row for the same athlete does not create duplicate competition rows (validates the `(athleteId, meetName, date)` upsert key)
- Carries forward: R0–R5

---

## Milestone 5 — ContactsAgent

**Measurable improvement expected:** Contact Coverage for the 4 documented zero-contact athletes — Zoe Hobbs, Nick Willis, Brook Macdonald, Hamish Kerr — should increase from 0/15 for at least a majority of them.

**How we'll know it worked:** Audit diff against `m4.json`; direct query of the `contacts` table, grouped by `athlete_id` and `category`, before and after, for all 4 zero-contact athletes.

**Golden athletes to use:** Zoe Hobbs, Nick Willis, Brook Macdonald, Hamish Kerr (the 4 documented zero-contact athletes — the entire point of this milestone). Peter Bol as the regression check — he already has 1 contact and must not lose it to the new agent.

**Accuracy score that should improve:** Contact Coverage across the roster: **1 of 5 athletes with any contact (20%) → at least 4 of 5 (80%)**, using the documented baseline of "only Peter Bol has a contact" as the starting point.

**Regression tests that should never fail:**
- **R8** — no contact is stored with confidence below 70
- **R9** — Peter Bol's existing coach contact is neither lost nor duplicated by the new agent
- Carries forward: R0–R7

---

## Milestone 6 — IntelligenceAgent

**Measurable improvement expected:** Content Density (intel-item half) for the two lowest-count athletes — Peter Bol (3 items) and Brook Macdonald (5 items) — against the 8-item minimum threshold.

**How we'll know it worked:** Audit diff against `m5.json`; direct count query per athlete per category (results/media, sponsorships, career changes) to confirm none of the three parallel queries is silently returning zero.

**Golden athletes to use:** Peter Bol (lowest count, 3), Brook Macdonald (5), all 5 for the "no athlete's count decreases" regression.

**Accuracy score that should improve:** Roster-average intelligence-item count: documented baseline `(3+6+5+11+5)/5 = 6.0` → target average **at or above 8** (the documented minimum threshold). Peter Bol specifically should at least double his count (3 → 6+).

**Regression tests that should never fail:**
- **R10** — no golden athlete's intelligence-item count decreases versus the immediately preceding milestone's snapshot
- **R11** — no single category (results/media, sponsorships, career changes) returns zero items across all 5 golden athletes simultaneously (a signal one of the three parallel queries is broken, not just that one athlete had nothing newsworthy)
- Carries forward: R0–R9

---

## Milestone 7 — Monitoring Dashboard & Golden-Athlete Regression Set

**Measurable improvement expected:** This milestone doesn't move IQS — it moves *how IQS is measured*. `GET /admin/data-health` becomes the live, always-on source of these numbers instead of a manually-run script, and the golden set becomes formally checked-in fixtures instead of a list in a document.

**How we'll know it worked:** The dashboard's reported IQS per athlete must agree with the manually-computed audit-script value (used in Milestones 0–6) within ±1 point for all 5 golden athletes. Running the checked-in golden-set job twice with no intervening pipeline change must produce scores within the ±2-point stability band defined for this check — proving the automation isn't itself a source of false-positive drift signals.

**Golden athletes to use:** All 5, now formally the contents of `goldenSet.ts`.

**Accuracy score that should improve:** None directly — this is a measurement-fidelity milestone. The metric is **agreement between dashboard and manual audit, not athlete data quality.**

**Regression tests that should never fail:**
- **R12** — dashboard-reported per-agent success/error/empty rates match raw `agent_runs` counts exactly (no aggregation bug)
- **R13** — two consecutive golden-set runs with no code change stay within the ±2-point stability band
- Carries forward: R0–R11

---

## Milestone 8 — TimelineAgent

**Measurable improvement expected:** Content Density (timeline half) for the two lowest-count athletes — Peter Bol (2 events) and Brook Macdonald (4 events) — against the 20–30 target range.

**How we'll know it worked:** Audit/dashboard diff against `m7.json`; direct count query; confirm in `agent_runs` that the supplementary pass fires for the two lowest-starting athletes specifically.

**Golden athletes to use:** Peter Bol, Brook Macdonald (lowest counts), all 5 for regression.

**Accuracy score that should improve:** Roster-average timeline-event count: documented baseline `(2+6+5+10+4)/5 = 5.4` → target: **every golden athlete clears the "sparse timeline" gap threshold (≥5 events) already tracked by `athlete-health.ts`**, ideally approaching double digits roster-wide.

**Regression tests that should never fail:**
- **R14** — the supplementary pass fires only when the primary pass returns fewer than 12 events, verified via `agent_runs` sub-call records (unconditional firing would silently double this agent's API cost)
- **R15** — no duplicate timeline-event rows after repeated runs for the same athlete
- Carries forward: R0–R13

---

## Milestone 9 — SponsorsAgent, SocialProfilesAgent, SocialMetricsAgent

**Measurable improvement expected:** `follower_growth_30d` and `avg_engagement` — permanently `0` for every athlete today (Priority 10, no documented baseline other than "always zero") — become real computed values for at least one golden athlete. No malformed social handle is stored.

**How we'll know it worked:** Direct query of `athletes.follower_growth_30d`/`avg_engagement` for non-default values after two snapshot-generating crawls spaced more than 30 days apart (simulated in dev via manual snapshot insertion, per the roadmap's testing note). Regex check of every golden athlete's stored handles against platform-specific format rules.

**Golden athletes to use:** Zoe Hobbs as primary (a sprinter, the type of athlete most likely to have an active, verifiable Instagram/X presence) — all 5 checked for handle-format regression regardless of activity level.

**Accuracy score that should improve:** This is the one milestone with no baseline number to move — the documented starting point is `0` for 5/5 athletes by definition. Target is binary: **at least 1 of 5 golden athletes shows a real, nonzero computed `follower_growth_30d` after two qualifying crawls.**

**Regression tests that should never fail:**
- **R16** — no social handle is stored that fails its platform's format regex
- **R17** — the X-API-first / Perplexity-fallback ordering is preserved: a golden athlete with a configured bearer token shows API-sourced follower counts in agent metadata, not Perplexity-sourced
- Carries forward: R0–R15

---

## Milestone 10 — BiographyAgent, PhotoAgent + Monolith Retirement

**Measurable improvement expected:** Presence sub-score (photo coverage) for any golden athlete currently missing one. More importantly — this milestone's real gate is operational, not a score: **zero `legacy_monolith` rows in `agent_runs` across a full week of production cycles**, confirmed before the deletion commit merges.

**How we'll know it worked:** `SELECT count(*) FROM agent_runs WHERE agent = 'legacy_monolith' AND ran_at > now() - interval '7 days'` returns `0` immediately before deletion. `POST /athletes/:id/refresh-photo` manually tested against a golden athlete with a known-stale Wikipedia photo, confirmed to attempt the federation-hierarchy lookup first.

**Golden athletes to use:** All 5 — this is the full-roster completeness gate (every athlete has a successful run from all 11 real agents), not a single-defect spot check.

**Accuracy score that should improve:** Presence sub-score should be at or near 5/5 for all 5 golden athletes by this point — but the actual pass/fail condition for this milestone is the **binary legacy-fallback count, not an IQS movement.**

**Regression tests that should never fail:**
- **R18** — zero `legacy_monolith` `agent_runs` rows in the 7 days preceding the deletion commit (a hard release gate, not advisory)
- **R19** — `pnpm run typecheck` and the full test suite pass with the monolith file deleted, no dangling imports
- Carries forward: R0–R17

---

## Milestone 11 — Scheduler Migration to pg-boss

**Measurable improvement expected:** None in IQS — this milestone changes no data-quality logic. The improvement is operational: a killed-and-restarted worker resumes or retries an in-flight job instead of dropping it; two concurrent server instances don't double-process the same athlete.

**How we'll know it worked:** The two integration tests specified in the roadmap (kill-mid-job restart; dual-instance no-duplicate-processing) both pass in a controlled dev environment. IQS snapshot across all 5 golden athletes stays within the same ±3 point noise band established in Milestone 2 — proving the queue migration didn't accidentally change pipeline output.

**Golden athletes to use:** All 5, purely as a non-regression check — this milestone has no athlete-specific target.

**Accuracy score that should improve:** None. Target: **IQS delta within ±3 points for all 5 golden athletes**, identical bar to Milestone 2, for the identical reason (this milestone should be invisible to data quality by design).

**Regression tests that should never fail:**
- **R20** — a killed worker's in-flight job is retried, not silently dropped
- **R21** — two concurrent worker instances never process the same athlete-refresh job twice in the same cycle
- Carries forward: R0–R19 (the full ledger — all 20 preceding invariants must hold at final delivery)

---

## Master Regression Ledger

Every invariant below, once introduced, must hold in every subsequent milestone for the rest of the roadmap. This table is the single place to check "did we break something we already fixed."

| ID | Invariant | Introduced |
|---|---|---|
| R0 | Manual smoke path (create → dossier populates) unchanged | M0 |
| R1 | No `source_url` matches `^\[\d+\]$` | M1 |
| R2 | No `source_domain` matches `^source\d+$` or lacks a `.` | M1 |
| R3 | No `season_best` numerically superior to `personal_best` | M1 |
| R4 | Discovery confidence gate rejects the same known-ambiguous names | M2 |
| R5 | R3's guarantee re-affirmed under `ResultsAgent`'s write path | M3 |
| R6 | No `meet_name` under 8 chars lacking a year/named event | M4 |
| R7 | No duplicate competition rows from repeated `CompetitionsAgent` runs | M4 |
| R8 | No contact stored with confidence < 70 | M5 |
| R9 | Peter Bol's existing contact not lost/duplicated | M5 |
| R10 | No golden athlete's intel-item count decreases milestone-over-milestone | M6 |
| R11 | No intelligence category returns zero items across all 5 golden athletes simultaneously | M6 |
| R12 | Dashboard-reported agent rates match raw `agent_runs` counts | M7 |
| R13 | Repeated golden-set runs stay within ±2-point stability band | M7 |
| R14 | Timeline supplementary pass fires only when primary pass < 12 events | M8 |
| R15 | No duplicate timeline-event rows from repeated runs | M8 |
| R16 | No social handle fails its platform's format regex | M9 |
| R17 | X-API-first / Perplexity-fallback ordering preserved | M9 |
| R18 | Zero `legacy_monolith` `agent_runs` rows in the 7 days before monolith deletion | M10 |
| R19 | Typecheck + full test suite pass post-monolith-deletion | M10 |
| R20 | Killed worker's in-flight job is retried, not dropped | M11 |
| R21 | No duplicate processing across concurrent worker instances | M11 |
