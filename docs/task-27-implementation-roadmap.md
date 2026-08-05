# Task #27 — Implementation Roadmap

**Status:** Planning — implementation not yet started
**Companion document:** `docs/task-27-agentic-pipeline.md` (the architectural specification this roadmap implements)
**Rule for every milestone below:** the existing product — dashboard, dossier pages, chat analyst, scheduler, billing — must work identically after the milestone merges as it did before. Nothing in this roadmap is allowed to require a "flag day."

---

## 0. How Independence and Rollback Work Across Every Milestone

Two mechanics are used repeatedly below, so they're defined once here instead of eleven times.

### 0.1 The `PIPELINE_AGENTS` flag

A single environment variable, `PIPELINE_AGENTS`, holds a comma-separated list of agent names that are live (e.g. `PIPELINE_AGENTS=results,competitions`). The orchestrator (introduced in Milestone 2) checks this list per domain:

- Domain's agent name **in** the list → run the new specialised agent for that domain.
- Domain's agent name **absent** → the orchestrator runs `LegacyMonolithAgent` for that domain instead (a thin wrapper around the current `auto-populate.ts` extraction call, introduced in Milestone 2, retired in Milestone 10).

This means every agent cutover is a **config change, not a code revert**. Rollback for almost every milestone below is "remove the name from `PIPELINE_AGENTS` and redeploy" — no git revert, no data loss, no downtime.

### 0.2 Additive-only schema changes

Every schema change in this roadmap is a new nullable column or a new table, applied via `pnpm --filter @workspace/db run push` (never `push-force`). No milestone drops or renames an existing column. This means a milestone can be rolled back at the *code* level while its schema change remains in place, unused and harmless — schema rollback is never required as part of any rollback strategy below.

### 0.3 New module layout

Introduced incrementally, but defined here as the target shape so each milestone's "files affected" section can reference it precisely:

```
artifacts/api-server/src/lib/pipeline/
  types.ts                 EvidenceRecord, AgentResult, AgentContext (M0)
  confidence.ts            domain-authority tiers, corroboration, recency decay (M0)
  validation.ts            citation-leak guard, URL/date/meetName/handle/PB-SB checks (M0)
  sourceHierarchy.ts       per-domain source tier tables, §6 of the spec (M0)
  legacyMonolithAgent.ts   wraps the existing auto-populate.ts call as an Agent (M2)
  orchestrator.ts          five-phase orchestrator, onCreate/onRefresh (M2)
  agentRuns.ts             writes to the agent_runs table, cadence lookups (M0/M2)
  agents/
    identityAgent.ts       (M2)
    resultsAgent.ts        (M3)
    competitionsAgent.ts   (M4)
    contactsAgent.ts       (M5)
    intelligenceAgent.ts   (M6)
    timelineAgent.ts       (M8)
    sponsorsAgent.ts       (M9)
    socialProfilesAgent.ts (M9)
    socialMetricsAgent.ts  (M9)
    biographyAgent.ts      (M10)
    photoAgent.ts          (M10)
```

---

## Milestone 0 — Pipeline Foundations

### Objectives
Stand up every shared primitive the rest of the roadmap depends on, with **zero behavioural change** to the running product. Nothing created here is called by anything live yet. This milestone also introduces the project's first test runner, since no milestone after this one can satisfy "testing" without one.

### Files affected
- New: `artifacts/api-server/src/lib/pipeline/types.ts`, `confidence.ts`, `validation.ts`, `sourceHierarchy.ts`, `agentRuns.ts`
- New: `lib/db/src/schema/agent-runs.ts` (append-only table: `athleteId`, `agent`, `status`, `ranAt`, `latencyMs`, `tokensUsed`, `retries`, `errorClassification`) — backs cadence tracking (§3.5 of the spec) and monitoring (§10)
- New: `lib/db/src/schema/evidence-log.ts` (append-only audit table per §5 of the spec: `athleteId`, `agent`, `rawResearch`, `rawCitations`, `rawExtraction`, `createdAt`)
- Modified: `lib/db/src/schema/index.ts` (export the two new tables)
- New: `artifacts/api-server/vitest.config.ts`, `package.json` devDependency on `vitest`
- Modified: `artifacts/api-server/package.json` (add `"test": "vitest run"` script)

### Migration strategy
Two new tables, both additive, both empty until Milestone 2 starts writing to them. Apply with `pnpm --filter @workspace/db run push` against dev first, verify with `\dt` in psql, then apply to production. No existing table or column is touched.

### Rollback strategy
Delete the new files; the two new tables remain in the schema, unused and harmless (§0.2). No running code references them yet, so there is nothing to revert in production behaviour — this milestone can be reverted at the code level at any time with no user-visible effect, because nothing user-visible depends on it yet.

### Testing
- Unit tests (new Vitest suite) for `confidence.ts`: every domain tier adjustment, the corroboration boost, the recency-decay curve, in isolation with synthetic inputs — no network, no DB.
- Unit tests for `validation.ts`: the citation-index-leak regexes against real examples from `docs/technical-debt.md` (`"[8]"`, `"source4"`), the PB/SB sport-aware comparator across at least one time-based and one distance-based event, the meet-name quality gate against both a real name and the known bad case ("2024 Competition").
- No integration tests yet — there is nothing running end-to-end to integrate with.

### Acceptance criteria
- `pnpm --filter @workspace/api-server run test` runs and passes with no test files outside `pipeline/`.
- `pnpm run typecheck` passes with the new files included.
- `pnpm --filter @workspace/db run push` completes cleanly against a scratch database with the two new tables visible and empty.
- No existing route, page, or scheduled job changes behaviour — verified by running the existing manual smoke path (create an athlete via `POST /athletes/discover`, confirm the dossier populates exactly as it does today).

### Estimated complexity
**S** — pure new code, no integration surface, no agent logic yet. The bulk of the effort is porting the validation/confidence rules already fully specified in `docs/task-27-agentic-pipeline.md` §7–8 into testable functions.

### Risks
- Low. The only real risk is scope creep — it's tempting to start wiring these into `auto-populate.ts` immediately. That wiring is deliberately deferred to Milestone 1 so this milestone stays trivially safe to ship.

---

## Milestone 1 — Confidence & Validation Retrofit Into the Current Pipeline

### Objectives
Get real user-facing value out of Milestone 0's work immediately, without waiting for the agent split. Wire `confidence.ts` and `validation.ts` into the *existing* monolithic `auto-populate.ts` write path. This single milestone fixes three of the top five items in `docs/technical-debt.md` — Priority 1 (citation-index leak), Priority 2 (PB/SB inversion), and Priority 7 (URL format validation) — using code that already exists after Milestone 0, before a single agent has been split out.

### Files affected
- Modified: `artifacts/api-server/src/lib/auto-populate.ts` — the intelligence-item, timeline-event, contact, and athlete-stat write blocks now call `validation.ts` and `confidence.ts` instead of the current inline `String(x)` coercion and the never-called `adjustConfidenceByDomain`
- Removed: `adjustConfidenceByDomain` and its two domain sets from `auto-populate.ts` (now superseded by `sourceHierarchy.ts` + `confidence.ts`, which are actually invoked)

### Migration strategy
No schema change. This is a pure logic swap inside an existing function. Deploy behind nothing special — it changes what gets written, not how the pipeline is invoked, so there's no flag needed; it ships to 100% of traffic on merge.

### Rollback strategy
Standard git revert of the single commit touching `auto-populate.ts`. Because the change is purely additive validation (it can only turn a bad value into `null` or a lower confidence score — it never turns a good value bad), the blast radius of a bug here is "some fields that were previously wrong are now null," not data corruption. If a revert is needed, no data cleanup is required.

### Testing
- Unit: extend Milestone 0's `validation.ts`/`confidence.ts` tests with the exact real-world bad values from `docs/technical-debt.md` (Nick Willis's `"[8]"` source URLs, Hamish Kerr's `"source4"` domains, Peter Bol's SB/PB inversion) as regression fixtures.
- Integration: run `repopulateAthlete()` against one real athlete already in the dev database (e.g. Peter Bol) and confirm by direct query that `personal_best` and `season_best` are no longer inconsistent, and that no `source_url`/`source_domain` in the refreshed rows matches the leak patterns.
- Manual: trigger `POST /athletes/:id/repopulate` for 2–3 athletes via the admin panel, inspect the dossier page for any regression in what's displayed (fewer items appearing because they were correctly nulled-and-rejected is expected and fine; anything crashing or rendering blank is not).

### Acceptance criteria
- Re-running the pipeline against the five sample athletes named in `docs/technical-debt.md` produces zero `source_url` values matching `^\[\d+\]$` and zero `source_domain` values matching `^source\d+$`.
- No athlete can have `season_best` numerically better than `personal_best` after a fresh crawl.
- Dossier pages for existing athletes render without error after a repopulate using the new code path.
- Platform quality score (informal, from `docs/technical-debt.md`) measured against the same 5 athletes improves — this is the first milestone with a directly measurable quality delta.

### Estimated complexity
**S** — the hard design work is already done in Milestones 0's functions; this is wiring, not invention.

### Risks
- The current pipeline's inline coercions (`String(item.sourceUrl ?? "unknown")` etc.) are permissive — anything that currently "works" because it's never validated could now be nulled where before it silently stored garbage. This is the intended effect, but it means some athletes' dossiers will visibly get *sparser* immediately after this ships (bad data removed, not replaced yet). Worth a one-line heads-up in the deploy notes so it isn't mistaken for a regression.

---

## Milestone 2 — Orchestrator Skeleton + `IdentityAgent` + `LegacyMonolithAgent`

### Objectives
Introduce the orchestrator and exercise its full five-phase flow in production — Phase 0 through Phase 5 — before splitting a single real retrieval agent out. This is the highest-leverage risk-reduction step in the whole roadmap: it proves the orchestrator, the `PIPELINE_AGENTS` flag mechanism, and the `agent_runs`/monitoring wiring all work correctly while the actual data-fetching logic is still the same, already-trusted monolithic call — just wrapped as an agent instead of invoked directly.

### Files affected
- New: `artifacts/api-server/src/lib/pipeline/orchestrator.ts`, `agents/identityAgent.ts`, `legacyMonolithAgent.ts`
- Modified: `artifacts/api-server/src/routes/athletes.ts` (`POST /athletes/discover` now calls `orchestrator.onCreate()` instead of calling `discoverAthleteProfile()` + `autoPopulateAthlete()` directly)
- Modified: `artifacts/api-server/src/lib/auto-populate.ts` (`repopulateAthlete()` now calls `orchestrator.onRefresh()`; `discoverAthleteProfile()` and `autoPopulateAthlete()` remain in place, now only called *from* `identityAgent.ts` / `legacyMonolithAgent.ts` respectively — not deleted yet)
- Modified: `artifacts/api-server/src/index.ts` (scheduler's `runRefreshCycle()` now calls `orchestrator.onRefresh()`)

### Migration strategy
`PIPELINE_AGENTS` starts unset (or empty) in every environment. With no agent names in the list, the orchestrator's Phase 1 fan-out runs exactly one agent — `LegacyMonolithAgent` — which internally calls the same `autoPopulateAthlete()` function that runs today. Behaviourally, this milestone should be invisible in production: same model calls, same prompts, same writes, just routed through the new five-phase envelope instead of called directly from the route handler.

### Rollback strategy
Revert `athletes.ts`, `auto-populate.ts`'s two call sites, and `index.ts` to call `discoverAthleteProfile()`/`autoPopulateAthlete()` directly again. Because `LegacyMonolithAgent` is a thin wrapper with no logic of its own, this rollback is mechanical and low-risk. The orchestrator, `identityAgent.ts`, and the flag mechanism can stay in the codebase unused — they cause no harm sitting idle (§0.2's additive principle extended to code, not just schema).

### Testing
- Integration: with `PIPELINE_AGENTS` unset, run the full `POST /athletes/discover` → dossier-populates flow end-to-end against a fresh athlete name in dev, and diff the resulting database rows against a baseline run of the *current* (pre-Milestone-2) code for the same athlete name. They should match exactly modulo nondeterministic model output (same shape, same tables written, same confidence ranges) — this is the regression check that proves the wrapper introduces no behavioural drift.
- Unit: `orchestrator.ts`'s phase sequencing — mock two fake agents (one `"ok"`, one `"error"`) and assert Phase 4 persistence still runs for the `"ok"` agent and Phase 5 (health recompute, `lastCrawledAt` stamp) still runs regardless of the `"error"` agent's outcome. This is the first real test of the `Promise.allSettled` partial-failure contract from the spec.
- Manual: confirm rows are now appearing in `agent_runs` for every pipeline execution, with `agent: "legacy_monolith"` and correct `status`/`latencyMs`.

### Acceptance criteria
- With `PIPELINE_AGENTS` unset, athlete creation, repopulation, and the scheduled refresh cycle all produce output indistinguishable in structure and quality from the pre-milestone code.
- `agent_runs` rows are written for every pipeline execution across all three entry points (create, manual repopulate, scheduled refresh).
- The `422` discovery-rejection path (confidence < 70) still returns identically — this is the one behaviour that must be byte-for-byte unchanged, since it's directly user-visible in the "add athlete" flow.

### Estimated complexity
**M** — no new AI/data logic, but this touches three call sites (route, scheduler, repopulate function) that must all be individually verified not to have shifted behaviour, and the orchestrator's phase-sequencing logic needs to be genuinely correct before anything is built on top of it.

### Risks
- This is the milestone most likely to introduce a subtle timing or error-handling regression, precisely because it touches every entry point at once. Mitigated by the exact-diff integration test above — if that test passes, the risk is contained.
- If `Promise.allSettled` phase-aggregation logic has a bug, it would currently be invisible (only one agent exists), and could surface later as a confusing failure once real parallel agents are added in Milestone 3+. Worth deliberately unit-testing the multi-agent-failure case now (as specified in Testing above) even though production only runs one agent at this point.

---

## Milestone 3 — `ResultsAgent`

### Objectives
Ship the first real specialised agent. `ResultsAgent` takes over `athletes.world_rank`, `world_rank_delta`, `national_rank`, `personal_best`, `season_best` — with the sport-aware PB/SB comparator from Milestone 0 now driving an agent's own research query, not just retrofitted validation on the monolith's output.

### Files affected
- New: `artifacts/api-server/src/lib/pipeline/agents/resultsAgent.ts`
- Modified: `artifacts/api-server/src/lib/pipeline/legacyMonolithAgent.ts` (stops writing the five stat columns once `results` is in `PIPELINE_AGENTS`, to enforce single-writer-per-column from §11.1 of the spec)

### Migration strategy
Add `results` to `PIPELINE_AGENTS` in dev first. Run against the same 5 sample athletes from `docs/technical-debt.md`, compare `ResultsAgent`'s output to the current stored values and to a fresh `LegacyMonolithAgent` run for the same athletes. Once confidence and correctness look at least as good, add `results` to the production flag list. No schema change.

### Rollback strategy
Remove `results` from `PIPELINE_AGENTS`. `LegacyMonolithAgent` resumes writing those five columns on the very next pipeline run — no data migration, no code revert needed. This is the first milestone that exercises the flag mechanism's rollback path for real.

### Testing
- Unit: `resultsAgent.ts`'s output-shaping logic against fixture research text (including a fixture engineered to contain a faster SB than PB, to confirm the correction rule fires and logs).
- Integration: shadow comparison — run `ResultsAgent` and `LegacyMonolithAgent` against the same 5 athletes in dev, log both outputs side by side (not a formal shadow-write table, just a comparison script run manually for this milestone), confirm `ResultsAgent`'s confidence-adjusted values are sane.
- Manual: with `results` flagged on in dev, trigger repopulate for Hamish Kerr specifically (the worst-scoring athlete in the tech-debt audit) and manually verify the world-rank/PB/SB fields against a live web search.

### Acceptance criteria
- With `results` enabled, no athlete in the dev database has an SB better than PB after a fresh crawl.
- `agent_runs` shows `resultsAgent` entries with `status: "ok"` for at least 4 of the 5 sample athletes on a clean run.
- Removing `results` from the flag and re-running produces the old `LegacyMonolithAgent` behaviour with no errors — proving the rollback path works, not just that it exists on paper.

### Estimated complexity
**M** — the agent logic itself is a narrower version of work already done in the monolith; the complexity is in correctly enforcing single-writer ownership (making sure `LegacyMonolithAgent` cleanly stops touching these columns without a race).

### Risks
- If `LegacyMonolithAgent` and `ResultsAgent` are ever both enabled for the same column set due to a flag-list mistake, both would write the same columns in the same cycle — order-dependent and silently wrong. Mitigate by having the orchestrator assert at startup that no two agents claim the same table/column ownership, rather than relying on operators to configure the flag correctly by hand.

---

## Milestone 4 — `CompetitionsAgent`

### Objectives
Ship `CompetitionsAgent`, sole owner of the `competitions` table, with the meet-name quality gate from the spec (§4.2) enforced at write time — directly targets Priority 5 of the tech-debt list (generic meet names breaking result backfill) at the source, rather than continuing to patch it after the fact in `result-backfill.ts`.

### Files affected
- New: `artifacts/api-server/src/lib/pipeline/agents/competitionsAgent.ts`
- Modified: `artifacts/api-server/src/lib/pipeline/legacyMonolithAgent.ts` (stops writing `competitions` once `competitions` is flagged on)
- Modified: `artifacts/api-server/src/lib/result-backfill.ts` (its fuzzy `slice(0,15)` matcher becomes unnecessary for *newly written* competitions since bad names are rejected at source — left in place for now to keep backfilling pre-existing legacy rows until Milestone 10's cleanup)

### Migration strategy
Same as Milestone 3: dev-first flag, compare against the 5 sample athletes (Brook Macdonald specifically, since their two null-result competitions are the tech-debt example), then production.

### Rollback strategy
Remove `competitions` from `PIPELINE_AGENTS`. Identical mechanics to Milestone 3.

### Testing
- Unit: the meet-name quality gate against the exact failing case from the tech-debt doc ("2024 Competition") and a passing case ("UCI Mountain Bike World Cup Round 2").
- Integration: upsert-key collision test — run `CompetitionsAgent` twice in a row against the same athlete and confirm the second run doesn't duplicate rows (validates the `(athleteId, meetName, date)` natural key from §11.2 of the spec, which this is the first milestone to actually implement rather than describe).
- Manual: repopulate Brook Macdonald, confirm competitions now have plausible, specific meet names and that the existing `result-backfill.ts` admin endpoint can subsequently fill in results against them.

### Acceptance criteria
- No newly written competition row has a `meet_name` under 8 characters or lacking a year/named event.
- Running `CompetitionsAgent` twice for the same athlete does not create duplicate competition rows.
- Brook Macdonald's competitions, after a fresh crawl, are specific enough that `POST /admin/backfill-results` succeeds in filling at least one previously-null result.

### Estimated complexity
**M** — same shape as Milestone 3, plus the added complexity of being the first milestone to implement real upsert-on-natural-key logic instead of insert-only.

### Risks
- The upsert key `(athleteId, meetName, date)` assumes meet names are stable across re-crawls of the same real-world competition. If the agent's phrasing of a meet name varies slightly between runs (e.g. "World Championships" vs "World Athletics Championships"), upserts could silently create duplicates instead of updating. Mitigate by normalising meet names (lowercase, strip punctuation) before using them as part of the upsert key, and cover this specifically in the integration test above.

---

## Milestone 5 — `ContactsAgent`

### Objectives
Ship `ContactsAgent` with the two-parallel-query strategy from §4.3 of the spec (coaching query + management query, run independently). This is the single highest-impact milestone for perceived platform quality — it directly targets Priority 3, where 4 of 5 sample athletes currently have zero contacts.

### Files affected
- New: `artifacts/api-server/src/lib/pipeline/agents/contactsAgent.ts`
- Modified: `artifacts/api-server/src/lib/pipeline/legacyMonolithAgent.ts` (stops writing `contacts` once flagged on)

### Migration strategy
Dev-first flag as before. Given this is the highest-value milestone, run it against all 5 sample athletes (not a subset) before promoting to production, and specifically check the 4 athletes currently at zero contacts.

### Rollback strategy
Remove `contacts` from `PIPELINE_AGENTS`. Identical mechanics to Milestones 3–4.

### Testing
- Unit: the minimum-confidence-70 threshold for storing any contact — fixture a low-confidence coach mention and confirm it's discarded, not stored with a caveat.
- Integration: confirm the two queries (coaching, management) genuinely run concurrently, not sequentially — assert on wall-clock time in a mocked-latency test rather than trusting the `Promise.all`/`allSettled` call site by inspection alone.
- Manual: repopulate Zoe Hobbs, Nick Willis, Brook Macdonald, and Hamish Kerr (the four zero-contact athletes) and confirm at least a coach or manager now appears for a majority of them — full success (contacts for all four) is not required for this milestone to be accepted, since real-world data availability varies per athlete, but the *mechanism* must be shown working for at least some of them.

### Acceptance criteria
- At least 3 of the 4 previously zero-contact sample athletes have at least one contact after a fresh crawl.
- No contact is stored with confidence below 70.
- `agent_runs` shows both the coaching and management sub-queries logged distinctly enough to debug which one succeeded/failed per athlete (this can be two `agent_runs` rows tagged `contacts_coaching`/`contacts_management`, or one `contacts` row with sub-query detail in its metadata — implementer's choice, but the distinction must be inspectable).

### Estimated complexity
**M** — the two-query fan-out is a small increment over Milestones 3–4's single-query shape, but this is the first agent where "found nothing" is expected to happen often and must be handled as a clean `"empty"` result, not treated as a near-failure.

### Risks
- Real-world data scarcity, not code risk, is the dominant risk here: some athletes' coaches/agents genuinely aren't published anywhere searchable, and no prompt engineering fixes that. The acceptance criteria above are written to account for this (majority improvement, not 100%) — expectations should be set accordingly before this milestone starts, not discovered as a surprise at review time.

---

## Milestone 6 — `IntelligenceAgent`

### Objectives
Ship `IntelligenceAgent` with the three-parallel-category-query strategy from §4.10 (results/media, sponsorships, career changes each getting an independent token budget), plus the 8-item minimum-threshold gap flag. This is the other half of Priority 4 (sparse intelligence feeds), alongside Milestone 8's timeline fix.

### Files affected
- New: `artifacts/api-server/src/lib/pipeline/agents/intelligenceAgent.ts`
- Modified: `artifacts/api-server/src/lib/pipeline/legacyMonolithAgent.ts` (stops writing `intelligence_items` once flagged on — note `SponsorsAgent` in Milestone 9 will later claim the `sponsorships` category subset specifically; until then `IntelligenceAgent` covers all four categories)

### Migration strategy
Same dev-first flag pattern. Compare item counts per athlete before/after against the exact numbers in the tech-debt table (Peter Bol: 3, Brook Macdonald: 5, etc.) to get a direct, measurable before/after.

### Rollback strategy
Remove `intelligence` from `PIPELINE_AGENTS`. Identical mechanics to prior milestones.

### Testing
- Unit: the 8-item minimum-threshold check — confirm it correctly flags (not silently accepts) a combined result under 8 items as a known gap.
- Integration: token-budget isolation test — confirm that a deliberately large fixture for one category (e.g. a research fixture with unusually verbose media coverage) does not reduce the item count returned for the other two categories, which is the specific failure mode this agent exists to eliminate.
- Manual: repopulate all 5 sample athletes, compare new intelligence-item counts against the tech-debt baseline table.

### Acceptance criteria
- Average intelligence-item count across the 5 sample athletes increases from the tech-debt baseline (avg ~6) without any athlete's count *decreasing*.
- No single category (results/media, sponsorships, career changes) starves another within the same run — verified via the token-budget isolation test.
- Athletes falling under the 8-item combined minimum show a `"sparse intelligence coverage"` gap in their health panel, not a silent shortfall.

### Estimated complexity
**M** — three parallel queries instead of one is a moderate increase in orchestration complexity within the agent, but the underlying extraction logic is well-understood from the monolith it replaces.

### Risks
- Running three queries instead of one triples this agent's OpenAI/OpenRouter call volume per athlete per cycle. This is the first milestone where per-agent cost and rate-limit impact becomes materially visible — worth measuring actual token/request cost during the dev-flag phase before production promotion, since the spec's shared rate-limit budget (§13) isn't built until Milestone 11.

---

## Milestone 7 — Monitoring Dashboard & Golden-Athlete Regression Set

### Objectives
By this point, `identity`, `results`, `competitions`, `contacts`, and `intelligence` are all live as real agents with `agent_runs` history to analyse. This milestone turns that raw data into the observability the spec calls for in §10: per-agent rolling health, a formalised Platform Quality Score, and a fixed regression set to catch prompt drift before it spreads across the roster.

### Files affected
- New: `artifacts/api-server/src/lib/pipeline/qualityScore.ts` (extends `athlete-health.ts`'s existing computation with per-agent success/corroboration/validation-flag weighting)
- Modified: `artifacts/api-server/src/routes/admin.ts` (`GET /admin/data-health` extended with per-agent rolling success/error/empty rates, sourced from `agent_runs`)
- New: `artifacts/api-server/src/lib/pipeline/goldenSet.ts` (the fixed 5–10 athlete list + expected-profile fixtures) and a corresponding admin-triggerable job (`POST /admin/run-golden-set`) rather than a new user-facing page
- Modified: `artifacts/web/src/pages/AdminPage.tsx` (surfaces the new per-agent health metrics — additive UI, existing admin sections unchanged)

### Migration strategy
No schema change beyond what Milestone 0 already added (`agent_runs` is the data source). This is a read-only/reporting milestone — nothing about the write path changes, so there's no cutover sequencing to manage.

### Rollback strategy
Revert the admin route and page additions. Since this milestone doesn't touch the pipeline's write path at all, rollback has zero effect on data or on any in-flight crawl.

### Testing
- Unit: `qualityScore.ts`'s weighting logic against synthetic `agent_runs` history (a mix of ok/empty/error rows) to confirm the rolling rate calculation is correct.
- Manual: run `POST /admin/run-golden-set` against the fixed athlete list, confirm the admin dashboard renders per-agent success rates that match what's actually in `agent_runs` for those athletes.

### Acceptance criteria
- `GET /admin/data-health` returns a per-agent breakdown (success/empty/error rate over the trailing window) for every agent currently enabled in `PIPELINE_AGENTS`.
- The golden-athlete set is checked into the codebase (not just run ad hoc) so it's re-runnable by anyone, and running it twice in a row without any pipeline change produces stable results (no false-positive drift signal from nondeterminism alone).
- Admin page renders the new metrics without disrupting any existing admin section (customers, enquiries, backfill triggers).

### Estimated complexity
**S–M** — mostly reporting/aggregation over data that already exists by this point; the golden-set fixtures require some one-time curation effort but no new pipeline mechanics.

### Risks
- LLM output is inherently non-deterministic; the golden-set comparison needs fuzzy matching (e.g. "is the reported world rank within a plausible range" rather than exact string equality) or it will flag false positives constantly and get ignored. This should be designed deliberately rather than defaulting to naive equality checks.

---

## Milestone 8 — `TimelineAgent`

### Objectives
Ship `TimelineAgent` with the supplementary-pass logic from §4.9 — if the primary pass returns under 12 events, automatically issue a second, narrower query targeting the athlete's early/junior career before accepting the result. This closes the timeline half of Priority 4.

### Files affected
- New: `artifacts/api-server/src/lib/pipeline/agents/timelineAgent.ts`
- Modified: `artifacts/api-server/src/lib/pipeline/legacyMonolithAgent.ts` (stops writing `timeline_events` once flagged on)

### Migration strategy
Same dev-first flag pattern, measured against the tech-debt baseline timeline-event counts (Peter Bol: 2, Brook Macdonald: 4, etc.).

### Rollback strategy
Remove `timeline` from `PIPELINE_AGENTS`. Identical mechanics to prior agent milestones.

### Testing
- Unit: the "fewer than 12 events triggers a supplementary pass" branch, with a fixture engineered to return exactly 11 events on the first pass.
- Integration: upsert-key behaviour for `(athleteId, date, title)`, mirroring Milestone 4's duplicate-prevention test.
- Manual: repopulate all 5 sample athletes, compare event counts against the tech-debt baseline (target: meaningfully closer to the 20–30 target range, not necessarily hitting it exactly).

### Acceptance criteria
- Average timeline-event count across the 5 sample athletes increases materially from the baseline (avg ~5).
- The supplementary pass demonstrably fires when needed (visible in `agent_runs` as two sub-calls for a single athlete's timeline refresh) and does not fire when the primary pass already clears 12 events (avoiding unnecessary extra API calls).

### Estimated complexity
**M** — the conditional supplementary-pass logic is the one piece of real novelty; everything else follows the established agent pattern from Milestones 3–4.

### Risks
- Same cost/rate-limit consideration as Milestone 6 — a supplementary pass means some athletes cost two model calls instead of one for this domain. Low risk at current roster size (5 athletes), worth remeasuring once Milestone 11's shared rate-limit budget exists.

---

## Milestone 9 — `SponsorsAgent`, `SocialProfilesAgent`, `SocialMetricsAgent`

### Objectives
Ship the three remaining "every-cycle" agents together, since each is a smaller, lower-individual-risk unit of work than Milestones 3–8, and they share very little logic overlap that would justify sequencing them separately. Each still ships behind its **own** independent flag entry (`sponsors`, `socialProfiles`, `socialMetrics`) — batching them into one milestone is a scheduling convenience, not a coupling of their rollback paths.

`SocialMetricsAgent` is also the milestone that finally makes `follower_growth_30d` and `avg_engagement` real (Priority 10) — it stores a timestamped follower-count snapshot on every run and computes the trailing 30-day delta from prior snapshots.

### Files affected
- New: `artifacts/api-server/src/lib/pipeline/agents/sponsorsAgent.ts`, `socialProfilesAgent.ts`, `socialMetricsAgent.ts`
- Modified: `artifacts/api-server/src/lib/pipeline/legacyMonolithAgent.ts` (stops writing the `sponsorships` intelligence-item subset, the handle columns, and the follower/growth columns as each is individually flagged on)
- New: `lib/db/src/schema/follower-snapshots.ts` (additive table: `athleteId`, `platform`, `followerCount`, `capturedAt` — the history `SocialMetricsAgent` needs to compute a real 30-day delta, since the current schema only stores a point-in-time count)
- Modified: `lib/db/src/schema/index.ts` (export the new table)

### Migration strategy
Three independent dev-first flag rollouts, sequenced in whatever order is convenient (no dependency between them). `follower-snapshots` is additive and applied via `drizzle-kit push` before `socialMetrics` is flagged on anywhere.

### Rollback strategy
Remove any one (or all three) of `sponsors`/`socialProfiles`/`socialMetrics` from `PIPELINE_AGENTS` independently. `follower-snapshots` stays in place unused if `socialMetrics` is rolled back — additive-schema rollback safety again applies.

### Testing
- Unit: per-platform handle-format regex tests for `SocialProfilesAgent` (Instagram/TikTok/X grammar).
- Unit: `SocialMetricsAgent`'s 30-day-delta computation against a fixture snapshot history (at least 3 synthetic snapshots spanning >30 days).
- Integration: confirm `SocialMetricsAgent` prefers the X API path when a bearer token is configured and falls back to Perplexity only when it isn't or the platform has no public API (Instagram/TikTok) — this is existing logic in the monolith today and must not regress.
- Manual: repopulate an athlete with a known-active Instagram/X presence, confirm `follower_growth_30d` is non-zero after two crawls spaced enough apart to have distinct snapshots (can be simulated in dev by manually inserting an older snapshot row).

### Acceptance criteria
- `follower_growth_30d` and `avg_engagement` are non-zero for at least one athlete in the dev database after two snapshot-generating crawls — the first time these columns have ever held a real computed value.
- No social handle is stored that fails its platform's format check.
- Each of the three agents can be independently disabled via its own flag entry without affecting the other two.

### Estimated complexity
**M** (combined) — individually each agent is **S**, but the new `follower-snapshots` table and the delta-computation logic add real (if contained) complexity to `SocialMetricsAgent` specifically.

### Risks
- `follower-snapshots` will grow unboundedly if never pruned (one row per athlete per platform per crawl cycle, forever). Not urgent at 5 athletes / 12 crawls per day, but worth a retention policy note for Milestone 11 (scalability) rather than solving it now.

---

## Milestone 10 — `BiographyAgent`, `PhotoAgent` + Monolith Retirement

### Objectives
Ship the two lowest-frequency agents, introduce the differential-cadence mechanism from §3.5 (30-day throttle for biography, 90-day/on-demand for photo), add the `POST /athletes/:id/refresh-photo` endpoint from Priority 6, and — since every domain now has a real agent — delete `auto-populate.ts`'s monolithic extraction call and `legacyMonolithAgent.ts` entirely. This is the milestone where the migration from the old pipeline formally completes.

### Files affected
- New: `artifacts/api-server/src/lib/pipeline/agents/biographyAgent.ts`, `photoAgent.ts`
- Modified: `artifacts/api-server/src/lib/pipeline/agentRuns.ts` (adds the cadence-check helper: "has this agent run for this athlete within its refresh window" — used by the orchestrator to skip biography/photo on most cycles)
- Modified: `artifacts/api-server/src/routes/athletes.ts` (new `POST /athletes/:id/refresh-photo` route, calling `photoAgent.ts` directly, outside the normal cadence check)
- Deleted: the `SYSTEM_PROMPT`/`USER_PROMPT`/extraction-call portion of `artifacts/api-server/src/lib/auto-populate.ts` and `artifacts/api-server/src/lib/pipeline/legacyMonolithAgent.ts` — `discoverAthleteProfile()` remains (it's `identityAgent.ts`'s implementation, still in active use, just no longer inside a file named for the monolith it used to anchor)
- Modified: `artifacts/api-server/src/lib/photo-lookup.ts` (its Wikipedia-first hierarchy is superseded by `photoAgent.ts`'s federation → NOC → Wikipedia → Perplexity order from §6.3; the existing Wikipedia-lookup functions are reused as one tier within the new hierarchy rather than rewritten)

### Migration strategy
`biography` and `photo` flagged on in dev first, as with every prior agent. Deletion of the monolith is the sequencing-sensitive part: it only happens once `PIPELINE_AGENTS` contains **all ten** retrieval-agent names in production and has been stable for a verification window (recommend at least one full week of scheduled-refresh cycles with no `legacy_monolith` rows appearing in `agent_runs`) — proving nothing is still falling back to it before the code is deleted.

### Rollback strategy
For `biography`/`photo` individually: same flag-removal mechanics as every prior agent milestone. For the monolith deletion specifically: this is the one rollback in the entire roadmap that **is** a git revert rather than a flag flip, because the code is being deleted, not just deprioritised. Mitigated by sequencing the deletion as its own commit, separate from the two new agents, so it can be reverted independently if something unexpected still depended on `LegacyMonolithAgent`.

### Testing
- Unit: cadence-check logic — confirm an athlete crawled 10 days ago does *not* get a fresh `BiographyAgent` run (inside the 30-day window), and one crawled 35 days ago does.
- Integration: `POST /athletes/:id/refresh-photo` bypasses the cadence check and runs `PhotoAgent` immediately regardless of throttle state.
- Full regression: with all ten agents flagged on, run the complete `onCreate` and `onRefresh` flows end-to-end for a new athlete and confirm every table is populated by its correct owning agent (cross-check against `agent_runs`), with zero fallback to `legacy_monolith`.
- Manual: verify `docs/technical-debt.md` Priority 6's actual fix — trigger a photo refresh for an athlete with a known outdated Wikipedia photo and confirm the federation-hierarchy lookup is attempted first.

### Acceptance criteria
- `agent_runs` shows zero `legacy_monolith` entries across a full week of production scheduled-refresh cycles before the deletion commit merges.
- `POST /athletes/:id/refresh-photo` returns success and updates `avatar_url` independent of the athlete's normal crawl cadence.
- After the monolith is deleted, `pnpm run typecheck` and `pnpm --filter @workspace/api-server run test` both pass with no dangling references to the removed code.
- Every one of the 11 agents (including `identity`) has at least one successful `agent_runs` entry for every athlete in the roster.

### Estimated complexity
**L** — not because any single agent here is complex (both are simpler than Milestones 3–6), but because monolith deletion is the point where the roadmap's safety net (falling back to trusted old code) goes away, and that transition deserves real care and a verification window, not just a code change.

### Risks
- Deleting the monolith removes the "known-good fallback" the entire roadmap has leaned on for 9 milestones. If a not-yet-discovered edge case only the monolith handled correctly surfaces after deletion, there's no flag to flip back to it — only a code revert. This is why the migration strategy above insists on a full week of zero-fallback production data before deletion, rather than deleting as soon as all ten flags are technically on.

---

## Milestone 11 — Scheduler Migration to `pg-boss`

### Objectives
Replace the in-process `setTimeout`/`setInterval` scheduler in `index.ts` with a `pg-boss` (Postgres-backed) job queue, per §13 of the spec. This is deliberately the last milestone — it's an infrastructure change orthogonal to the agent architecture, and coupling it to the agent rollout would have made 10 milestones harder to debug for no benefit. By this point the orchestrator and all 11 agents are proven in production under the old scheduler, so this milestone isolates just the scheduling mechanism as the variable under test.

### Files affected
- New: `artifacts/api-server/src/lib/pipeline/queue.ts` (pg-boss setup, job definitions: `refresh-athlete`, with priority tiers for never-crawled/manual-repopulate vs. routine refresh)
- Modified: `artifacts/api-server/src/index.ts` (removes the `setTimeout`/`setInterval` loop; boots the pg-boss worker instead)
- Modified: `artifacts/api-server/src/routes/athletes.ts` (`POST /athletes/discover` and `POST /athletes/:id/repopulate` enqueue a high-priority job instead of firing the pipeline inline in the background)
- New dependency: `pg-boss` added to `artifacts/api-server/package.json`

### Migration strategy
Run `pg-boss` alongside the existing scheduler behind a flag (`SCHEDULER_MODE=legacy|queue`) for a verification window in production — both mechanisms can coexist harmlessly as long as only one is actually enqueuing/running refresh cycles at a time (`SCHEDULER_MODE` gates which one is active, not which one is compiled in). Once `queue` mode has run cleanly for a comparable window to Milestone 10's monolith-retirement check, remove the legacy scheduler code.

### Rollback strategy
Flip `SCHEDULER_MODE` back to `legacy` and redeploy — no data loss, since `pg-boss`'s job table is separate from the athlete/intelligence schema entirely and simply stops being consulted. Full mechanical rollback, no revert needed, as long as the legacy scheduler code hasn't been deleted yet (mirrors Milestone 10's two-stage approach: flag-gated coexistence first, code deletion only after a verified stable window).

### Testing
- Integration: enqueue a `refresh-athlete` job, kill the worker process mid-job, restart it, confirm `pg-boss`'s built-in retry picks the job back up — this is the specific failure mode (process restart mid-cycle) that the legacy scheduler could never recover from cleanly.
- Integration: enqueue jobs for more athletes than the old `MAX_PER_CYCLE = 3` limit and confirm priority ordering (never-crawled and manual-repopulate jobs process before routine 6-hourly refreshes).
- Load: with the roster artificially padded to ~50 synthetic athletes in a scratch dev database, confirm the queue drains without manual tuning of `INTER_ATHLETE_DELAY`-equivalent constants — the specific scaling ceiling described in Priority 9 of the tech-debt doc.

### Acceptance criteria
- A worker process restart mid-cycle results in the interrupted job resuming or safely retrying, not silently dropping — a strict improvement over the current scheduler's behaviour.
- Priority ordering is observably correct: a manually triggered repopulate request processes ahead of a queued routine refresh created earlier.
- Running two API server instances simultaneously (both pointed at the same database) does not cause duplicate processing of the same athlete in the same cycle — the first real test of horizontal-scaling safety the spec promises in §13.

### Estimated complexity
**L** — new infrastructure dependency, and the coexistence/cutover discipline from Milestone 10 applies again here for the same reasons.

### Risks
- `pg-boss` requires its own schema/tables in Postgres (managed by its own migration mechanism, separate from Drizzle) — this needs to be reconciled with the project's existing `drizzle-kit push` workflow so `pg-boss`'s bootstrap doesn't get accidentally wiped by a future `push-force`, or vice versa. Worth an explicit note in `docs/database.md` once this ships, flagging pg-boss's schema as a third managed schema alongside the app's public schema and Stripe's `stripe.*` schema.
- This milestone is the first to require running two server processes/roles conceptually (API server + queue worker), even if they're deployed as the same process today — worth designing the worker bootstrap so it can be split into its own deployable later without another redesign, even though splitting it is out of scope for this milestone.

---

## Summary Table

| # | Milestone | Complexity | Flag | New tables |
|---|---|---|---|---|
| 0 | Pipeline foundations + test runner | S | — | `agent_runs`, `evidence_log` |
| 1 | Confidence/validation retrofit into monolith | S | — | — |
| 2 | Orchestrator + IdentityAgent + LegacyMonolithAgent | M | — | — |
| 3 | ResultsAgent | M | `results` | — |
| 4 | CompetitionsAgent | M | `competitions` | — |
| 5 | ContactsAgent | M | `contacts` | — |
| 6 | IntelligenceAgent | M | `intelligence` | — |
| 7 | Monitoring dashboard + golden set | S–M | — | — |
| 8 | TimelineAgent | M | `timeline` | — |
| 9 | SponsorsAgent + SocialProfilesAgent + SocialMetricsAgent | M | `sponsors`, `socialProfiles`, `socialMetrics` | `follower_snapshots` |
| 10 | BiographyAgent + PhotoAgent + monolith retirement | L | `biography`, `photo` | — |
| 11 | Scheduler migration to pg-boss | L | `SCHEDULER_MODE` | pg-boss internal |

Twelve milestones, each independently deployable, each with a rollback path that doesn't require a data migration to undo (schema changes are additive throughout; only Milestones 10 and 11's *code deletions* require a git revert rather than a flag flip, and both are deliberately sequenced after a verification window specifically because of that).
