# Task #27 — Specialised Retrieval Agents: Architectural Specification

**Status:** Canonical design — not yet implemented
**Supersedes:** the monolithic pipeline in `artifacts/api-server/src/lib/auto-populate.ts`
**Author's note:** This document did not previously exist in the repository. It was referenced by `CLAUDE.md`, `docs/ai-architecture.md`, and `docs/roadmap.md` as living at `.local/tasks/agentic-pipeline-redesign.md` — but `.local/` is gitignored repo-wide, so that path was never trackable and the file never actually existed in version control. It now lives here, in `docs/`, alongside the rest of the project's tracked documentation, and it is written from first principles against the current codebase, not reconstructed from assumption. Where it resolves an ambiguity in the existing docs (notably the agent count), that resolution is called out explicitly.

This is the master architecture. All implementation work on the Athlete Intelligence Engine should conform to it. Where implementation reveals that a decision here is wrong, this document should be updated in the same change — it must not silently drift out of sync with the code the way the previous informal plan did.

---

## 1. Overall Philosophy

The current pipeline's biggest structural flaw is not any single bug — it's that **one model call is responsible for everything**. A single `gpt-4o` completion extracts stats, ten-plus intelligence items, thirty timeline events, contacts, and competitions from one research pass, under one token budget, with one failure mode. When it succeeds, everything succeeds. When it's short on tokens, everything is short. When it misreads a citation index, every source in the batch is suspect. There is no way to retry "just contacts" or trust "results" more than "contacts" for the same athlete.

The redesign is built on five principles:

1. **Decompose by data domain, not by model call.** Each kind of fact (results, contacts, sponsorships, photos...) gets its own retrieval agent with its own prompt, its own query strategy, its own validation rules, and its own failure mode. A bad day for `ContactsAgent` has zero effect on `ResultsAgent`.

2. **Never store a fact without an evidence trail.** Every value written to the database — whether a table row or a scalar column on `athletes` — must be traceable to a specific agent run, a specific source, and a specific confidence computation. "We don't know" is always an acceptable output. "We guessed and didn't say so" is never acceptable.

3. **Partial success is the normal case, not an error state.** At any given moment, some agents will succeed, some will find nothing, and some will fail transiently. The orchestrator's job is to make that safe and visible — not to treat it as a pipeline failure requiring an all-or-nothing retry.

4. **Confidence is computed once, in one place, and it is never bypassed.** The current pipeline has a well-designed confidence adjustment function (`adjustConfidenceByDomain`) that is *never actually called* from the write path — it is dead code. That class of bug (a rule that exists but isn't wired in) is the single most dangerous failure mode for a trust-based product, and the architecture below closes it by making confidence finalisation a mandatory pipeline stage, not an optional post-processing step agents may or may not call.

5. **Accuracy over completeness, always.** If an agent cannot verify a fact to its minimum confidence threshold, it must return nothing rather than a plausible-sounding guess. A sparse dossier that is entirely true is more valuable than a dense one with fabricated entries — this was already the philosophy behind `PerplexityResearchError`, and it now applies uniformly across every agent, not just the original research call.

---

## 2. Resolving the Agent Count: 11 Agents, Not 10

`docs/ai-architecture.md` and `docs/roadmap.md` both list 10 named agents under "Proposed Architecture." `CLAUDE.md` says "11 domain-specific agents." Neither reconciles the discrepancy.

The resolution: **Identity resolution is itself an agent**, and it was already implicitly treated as separate — the existing `discoverAthleteProfile()` function is a self-contained, gated, single-purpose retrieval step that runs *before* everything else and determines whether the pipeline proceeds at all. Formalising it as `IdentityAgent` gives the correct count of 11, and — more importantly — gives it the same structural treatment (evidence, confidence, monitoring) as every other agent, instead of leaving it as a bespoke one-off at the top of the file.

| # | Agent | Runs when |
|---|---|---|
| 0 | `IdentityAgent` | Athlete creation only — gates the entire pipeline |
| 1 | `ResultsAgent` | Creation + every refresh |
| 2 | `CompetitionsAgent` | Creation + every refresh |
| 3 | `ContactsAgent` | Creation + every refresh |
| 4 | `SponsorsAgent` | Creation + every refresh |
| 5 | `SocialProfilesAgent` | Creation + every refresh |
| 6 | `SocialMetricsAgent` | Creation + every refresh |
| 7 | `BiographyAgent` | Creation, then low frequency (biography rarely changes) |
| 8 | `PhotoAgent` | Creation, then only on explicit refresh-photo request or long staleness |
| 9 | `TimelineAgent` | Creation + every refresh, plus supplementary pass (see §4.9) |
| 10 | `IntelligenceAgent` | Creation + every refresh |

`IdentityAgent` is the only agent that is *blocking* — nothing else runs until it clears the confidence gate. All 10 retrieval agents (1–10) are *non-blocking and independent of each other*: they run concurrently and none of their failures affects any other.

---

## 3. Orchestrator

### 3.1 Two entry points

- **`onCreate(athleteId)`** — runs `IdentityAgent` first (blocking). On confidence ≥ 70, proceeds to the full fan-out of agents 1–10. On confidence < 70, aborts before creating any downstream data — matches today's `422` rejection behaviour, now formalised as an agent rather than a bespoke pre-check.
- **`onRefresh(athleteId)`** — skips `IdentityAgent` entirely (identity does not need re-resolving on every 6-hour cycle) and runs agents 1–10 directly against the existing athlete row. `BiographyAgent` and `PhotoAgent` are throttled independently (§3.5) since their underlying facts change far less often than rankings or social metrics.

Both entry points converge on the same five-phase flow.

### 3.2 The five phases

```
Phase 0  Identity          (onCreate only, blocking, confidence-gated)
Phase 1  Fan-out           Promise.allSettled across all applicable agents
Phase 2  Cross-validation  Compare outputs across agents for internal consistency
Phase 3  Confidence        Single, mandatory scoring pass over every candidate fact
Phase 4  Persistence       Per-agent transactional upsert, each agent owns its own tables
Phase 5  Post-write        Recompute health, stamp lastCrawledAt, emit monitoring event
```

Phase 1 is the core departure from today's pipeline. Every applicable agent is dispatched concurrently via `Promise.allSettled` (never `Promise.all` — one agent throwing must never cancel the others). Each agent returns a typed envelope regardless of outcome:

```
AgentResult {
  agent: string
  status: "ok" | "empty" | "error"
  facts: EvidenceRecord[]      // see §5 — empty array is valid
  meta: { latencyMs, tokensUsed, retries, model }
  error?: { classification, message }   // only present on status: "error"
}
```

`"empty"` (agent ran successfully but found nothing to report) and `"error"` (agent could not complete) are distinct outcomes and must never be conflated. An empty `ContactsAgent` result is a known gap to surface in the health panel. An errored `ContactsAgent` result is an operational issue to retry and monitor. Today's pipeline has no equivalent distinction — a failure anywhere collapses into the same catch block.

### 3.3 Cross-validation (Phase 2)

Individual agents validate their own output (§6). Phase 2 exists for checks that require *comparing two agents' outputs*, which no single agent can do on its own:

- `ResultsAgent`'s reported season/career timeframe should be broadly consistent with `BiographyAgent`'s birth date (a 15-year-old cannot have a 2016 senior debut).
- `CompetitionsAgent`'s most recent completed result and `ResultsAgent`'s season best should not materially disagree in the same field/time class.
- `IntelligenceAgent` and `SponsorsAgent` frequently surface the same sponsorship from different angles — when they agree, this feeds the corroboration boost (§7.3); when they actively contradict (different sponsor, same date range), both are flagged rather than either being trusted.

Cross-validation findings are not silent — they are attached to the affected facts as a `validationFlag` and lower the fact's confidence rather than blocking the write outright, except for hard-impossible cases (SB better than PB, which forces `personalBest = seasonBest`, exactly as `docs/technical-debt.md` Priority 2 specifies).

### 3.4 Timeouts

Every agent call carries a hard timeout (default 25s for a single-model-call agent, 45s for agents that chain two calls like `ContactsAgent`'s two-query strategy or `SocialMetricsAgent`'s API-then-fallback path). A timeout is treated as a transient error (§9), not a data-absence signal — it must not be recorded as "no contacts found," only as "could not determine within this cycle."

### 3.5 Differential refresh cadence

Not every fact decays at the same rate. Running `BiographyAgent` every 6 hours to re-check a birth date is waste with no upside. The orchestrator tracks a per-agent "last successful run" independent of the athlete's overall `lastCrawledAt`:

| Agent | Refresh cadence |
|---|---|
| `ResultsAgent`, `CompetitionsAgent`, `SocialMetricsAgent`, `IntelligenceAgent` | Every cycle (staleness-gated, as today) |
| `ContactsAgent`, `SponsorsAgent`, `SocialProfilesAgent`, `TimelineAgent` | Every cycle, but tolerant of longer staleness before re-attempting after repeated empties |
| `BiographyAgent` | Every 30 days, or on explicit request |
| `PhotoAgent` | Every 90 days, or on explicit `POST /athletes/:id/refresh-photo` (Priority 6 fix) |

This directly addresses `docs/technical-debt.md` Priority 6 (photos only updating on a full wipe) without needing a special-case endpoint that bypasses the pipeline — `PhotoAgent` simply has a longer natural cadence and can also be invoked on demand.

---

## 4. Specialised Agents

Each agent is defined by: purpose, primary query strategy, source hierarchy tier used (§6), and its specific validation rules beyond the global rules in §7.

### 4.0 `IdentityAgent`

**Purpose:** Resolve an athlete name to sport, event, nationality, and age; gate pipeline entry.
**Model:** `gpt-4o`, single call, no external search (uses model knowledge only — this is a disambiguation task, not a research task).
**Confidence gate:** < 70 → reject with `422`, no athlete row created, no other agent runs.
**Note:** This is the *only* agent permitted to answer from model knowledge without a live search, because its job is disambiguation ("which Peter Bol") rather than fact retrieval. Every other agent must be grounded in a live search result.

### 4.1 `ResultsAgent`

**Purpose:** World/national ranking, personal best, season best.
**Source hierarchy tier:** Results/Rankings (§6.2).
**Validation:** Sport-aware numeric parsing (time vs. distance vs. weight vs. points) with directional comparison — for time-based events, PB must be ≤ SB is backwards; the actual rule is *season best cannot be superior to personal best*, where "superior" means numerically lower for timed events and numerically higher for distance/weight events. A sport-aware parser must know which direction "better" points in per event type before it can compare two marks at all — the current pipeline has neither the parser nor the comparison. Values that cannot be parsed into a comparable numeric form are stored as-is but flagged `unverifiedFormat` rather than silently trusted.
**This is the direct fix for `docs/technical-debt.md` Priority 2.**

### 4.2 `CompetitionsAgent`

**Purpose:** Full competition history and upcoming calendar.
**Source hierarchy tier:** Results/Rankings.
**Validation:** Meet-name quality gate — a competition entry is rejected outright (not stored with a null result, just not stored) if `meetName` is under 8 characters or contains neither a 4-digit year nor a recognisable named event. This is a stricter version of the fix proposed in Priority 5: rather than trying to backfill a bad name later, refuse to write a bad name in the first place.
**Ownership:** Sole writer of the `competitions` table.

### 4.3 `ContactsAgent`

**Purpose:** Coach, agent/manager, medical staff.
**Source hierarchy tier:** Contacts (§6.5).
**Query strategy:** Two independent queries run in parallel, not one general pass — `"{name} head coach {sport} {nationality} {year}"` and `"{name} agent manager representation {sport} {year}"`. This is the direct fix for Priority 3 (contact extraction relying on a research pass where contacts are item 8 of 9 and get little attention).
**Validation:** Minimum confidence 70 to store any contact at all — an uncertain contact is worse than an absent one, since a wrong coach name actively damages trust.

### 4.4 `SponsorsAgent`

**Purpose:** Sponsorship and brand-deal intelligence.
**Source hierarchy tier:** Sponsorship/Media (§6.6).
**Validation:** Confidence decay applied at write time for deals with no corroborating date within the last 18 months — an old sponsorship mentioned once in a 2021 article should not carry the same confidence as one confirmed by a 2026 press release, even before the general recency decay in §7.4 applies.

### 4.5 `SocialProfilesAgent`

**Purpose:** Discover Instagram/X/TikTok handles.
**Source hierarchy tier:** Social (§6.4).
**Validation:** Per-platform handle format regex (Instagram/TikTok usernames, X handles) — a value that doesn't match the platform's actual username grammar is discarded rather than stored, closing a class of bug where a sentence fragment gets stored as a "handle."

### 4.6 `SocialMetricsAgent`

**Purpose:** Follower counts and growth.
**Source hierarchy tier:** Social, but with a strict internal order: official platform API (X API v2, as already implemented) → Perplexity live search fallback only if the API is unavailable or the platform has no public API (Instagram, TikTok).
**This agent is the one that finally computes `follower_growth_30d` and `avg_engagement`** (Priority 10) — it stores a timestamped snapshot of follower counts on every run and computes the trailing 30-day delta from prior snapshots, rather than leaving those columns permanently at their default of 0.

### 4.7 `BiographyAgent`

**Purpose:** Birth date, birthplace, confirmed nationality, physical attributes where sport-relevant (height/weight for combat and weight-class sports).
**Source hierarchy tier:** Identity/Biography (§6.1).
**Cadence:** 30 days (§3.5) — this is deliberately the slowest-refreshing agent.

### 4.8 `PhotoAgent`

**Purpose:** Profile photo.
**Source hierarchy tier:** Photo (§6.3) — federation profile → national Olympic/Commonwealth committee → Wikipedia → Perplexity image search, in that order, stopping at the first hit. This directly implements the "better hierarchy" already proposed in Priority 6, formalised as the agent's actual behaviour instead of an aspiration.
**Cadence:** 90 days or on-demand (§3.5).

### 4.9 `TimelineAgent`

**Purpose:** Chronological career milestones, full career span.
**Source hierarchy tier:** Uses whichever tier is relevant to the specific event (a sponsorship milestone uses the Sponsorship tier's sourcing, a competition milestone uses the Results tier's sourcing) — this agent is a synthesiser across the other domains' evidence as much as an independent researcher.
**Supplementary pass:** If the primary pass returns fewer than 12 events, the orchestrator automatically issues a second, narrower query focused specifically on the athlete's early/junior career (the phase most commonly under-represented) before accepting the result. This directly targets Priority 4's timeline sparsity, in combination with §4.10's token-budget fix.

### 4.10 `IntelligenceAgent`

**Purpose:** Interviews, sponsorships-as-news, career changes, controversy — the general "what's newsworthy" feed.
**Query strategy:** Three parallel category queries (results/media coverage, sponsorship announcements, career changes) rather than one combined prompt — each query gets its own token budget, so no single category starves the others the way "item 8 of 9" starves contacts today.
**Minimum threshold:** If the combined total across all three queries is under 8 items, this is recorded as a known gap (`sparse intelligence coverage`), not silently accepted as complete.

### 4.11 Why per-agent token budgets fix Priority 4 structurally

The current single-call extraction has one 8192-token budget shared across athlete stats, 10-12 intelligence items, 20-30 timeline events, 3-5 contacts, and 20-30 competitions simultaneously — it is mathematically guaranteed to truncate under load. Splitting into agents doesn't just organise the code better: **each agent gets its own full token budget for its own domain**, so a large timeline no longer competes with a large intelligence feed for the same 8192 tokens. This is a structural fix, not a tuning knob — raising the shared budget to 16,384 (as Priority 4 currently proposes) is a stopgap; per-agent budgets are the actual solution.

---

## 5. Evidence Layer

Every fact the pipeline is willing to store must exist, at the moment it is produced by an agent, as an **Evidence Record**:

```
EvidenceRecord {
  claim:          string        // what this record asserts, e.g. "personalBest"
  value:          unknown       // the actual value
  agent:          string        // which agent produced it
  sourceDomain:   string | null
  sourceUrl:      string | null
  retrievedAt:    timestamp     // when the agent fetched this
  publishedAt:    timestamp | null  // when the underlying fact/article was published
  rawExcerpt:     string | null // the specific sentence/passage the claim is drawn from
  confidenceBase: number        // agent's own pre-adjustment confidence (§7.1)
}
```

This is not a new database table by necessity — for facts that map directly onto existing columns/rows (an intelligence item, a timeline event, a contact), the record's fields largely *are* the row's fields, and no new storage is needed. What changes is that **every write path is required to produce a full Evidence Record before persistence**, and the confidence-finalisation stage (Phase 3, §7) operates on Evidence Records uniformly rather than on ad-hoc per-agent shapes.

Where the evidence layer does need new storage is for **audit and debugging**: a lightweight, append-only log of every agent run's raw output (the full research text, full citation list, full extracted JSON, before any validation or confidence adjustment) keyed by athlete + agent + run timestamp. This is deliberately kept separate from the clean product tables — it is not user-facing, it is not filtered or validated, and it exists purely so that when a value looks wrong in production, there is a way to trace it back to exactly what the model saw and said, rather than only being able to inspect the final (possibly already-cleaned) row. This closes the debugging gap that makes the current citation-index-leak bug (Priority 1) hard to diagnose after the fact — today, once `source_url` is stored as `"[8]"`, there's no record of what citation `[8]` actually was.

`rawExcerpt` on every Evidence Record is deliberately mandatory wherever the agent's source model returns quotable text — it is the single most effective tool for a human reviewer to spot-check whether a stored fact is actually supported, and it costs nothing extra to capture since the model already has the passage in context when it extracts the claim.

---

## 6. Source Hierarchy

The current pipeline has one flat two-bucket domain list (`HIGH_AUTHORITY_DOMAINS`, `LOW_AUTHORITY_DOMAINS`) applied uniformly regardless of what kind of fact is being sourced. A federation results page is the right authority for a competition result; it is not a meaningful authority for a sponsorship announcement. The redesign uses **per-domain-of-fact hierarchies**, each agent querying and weighting sources according to what's actually authoritative for its domain:

### 6.1 Identity / Biography
1. National sport federation athlete profile
2. Olympic / Commonwealth / continental games committee profile
3. Wikipedia
4. General sports news

### 6.2 Results / Rankings
1. Sport governing body's official results/ranking system (World Athletics, UCI, FIS, World Rowing, etc.)
2. Official competition organiser results (Olympics.com, championship-specific sites)
3. National federation
4. Verified sports media (BBC, Reuters, AP, The Guardian, ESPN, sport-specific trade press)
5. General web

### 6.3 Photo
1. Sport federation athlete profile image
2. National Olympic/Commonwealth committee media library
3. Wikipedia
4. Perplexity live image search (last resort — least verifiable)

### 6.4 Social Profiles / Metrics
1. The platform's own public profile page (verified by the returned handle actually resolving)
2. Official platform API (X API v2 — already implemented for follower counts)
3. Sports-influencer or athlete-marketing databases
4. General web mentions

### 6.5 Contacts
1. Federation/team official staff pages
2. Verified management/agency company site
3. Sports business trade media (SportBusiness, Sportcal, etc.)
4. General web

### 6.6 Sponsorship / Media Intelligence
1. Official athlete or brand press release
2. Verified sports business media
3. General sports news
4. Social media posts (lowest tier — easily spoofed, hardest to verify)

Within each hierarchy, an agent should prefer the first tier that returns a usable result, but is not required to *only* use tier 1 — the tier a source falls into feeds directly into the confidence computation (§7.2) rather than acting as a hard gate. A tier-4 source is not forbidden, it simply cannot produce a high-confidence fact on its own.

---

## 7. Confidence

### 7.1 Base confidence (per agent, unchanged in spirit from today)

- 85–97: explicitly stated in the agent's retrieved research
- 65–84: inferred from research context but not explicitly stated
- < 65: discarded before it ever becomes a candidate Evidence Record — agents must not emit facts below this floor

### 7.2 Domain-authority adjustment (now mandatory, not optional)

This is the fix for the dead-code bug. Domain-authority adjustment is **not a function agents may call** — it is a stage every Evidence Record passes through in Phase 3, regardless of which agent produced it. No write path can bypass it, because no write path has direct database access; only Phase 4 (persistence) does, and Phase 4 only accepts already-adjusted records.

Tiered by the source hierarchies in §6 rather than a flat two-bucket list:
- Tier 1 source: +5 (cap 97)
- Tier 2 source: +2
- Tier 3 source: no adjustment
- Tier 4 source or unresolvable domain: −10 (floor 40)
- No source URL at all: additional −5

### 7.3 Corroboration boost

New in this design, not present today: when two *independent* agents (not two facts from the same agent) surface the same underlying fact — e.g. `SponsorsAgent` and `IntelligenceAgent` both report the same brand deal — the second-confirmed instance receives a +3 boost (cap 97), and the fact is marked `corroborated: true`. This rewards the cases where the redesign's parallelism naturally produces independent confirmation, which the current single-call pipeline structurally cannot do (there's only ever one pass, so nothing can corroborate anything).

### 7.4 Recency decay

Also new: certain fields are perishable independent of whether the pipeline has run recently. World ranking, season best, "current team," and follower counts should not retain their original confidence indefinitely if the pipeline has failed to refresh them. Applied only to these designated perishable fields:

- 0–14 days since last successful refresh of that specific fact: no decay
- 15+ days: −1 confidence per additional day, floor 40

This is distinct from the freshness tile in the health panel (which reports *days since crawl*) — recency decay actually lowers the stored confidence score, so a stale world ranking is flagged as less trustworthy, not just "old," even if nothing about the pipeline itself is currently failing.

### 7.5 Hard validation failures bypass scoring entirely

A small number of checks are not confidence adjustments — they are outright rejections, because the alternative is storing something known to be false: season-best-better-than-personal-best (forces correction, not just a lower score), citation-index leak pattern (`^\[\d+\]$`, `^source\d+$` — nulled, not down-scored), malformed URLs (nulled), meet names failing the quality gate (not stored at all). These are listed in full in §8.

---

## 8. Validation

Validation happens at two points: **per-agent** (an agent should not even emit an invalid candidate) and **centrally in Phase 2/3** (a safety net, because relying on every agent to individually remember every rule is exactly how the current dead-code bug happened). The centralised checks are the source of truth; per-agent validation is an optimisation, not a substitute.

| Check | Rule | Failure action |
|---|---|---|
| Citation index leak | `sourceUrl` matches `^\[\d+\]$`; `sourceDomain` matches `^source\d+$` or contains no `.` | Null out the field, do not reject the whole record |
| URL format | `sourceUrl` must match `^https?:\/\//` | Null the field |
| Date validity | YYYY-MM-DD, calendar-valid (existing `isValidDate` logic, reused) | Drop the record |
| PB/SB inversion | Sport-aware directional comparison (§4.1) | Correct (`personalBest = seasonBest`) and log |
| Meet name quality | ≥ 8 characters, contains a year or a named event | Do not store the competition at all |
| Social handle format | Per-platform regex | Null the field |
| Confidence floor | < 65 at emission | Discard before Evidence Record is created |
| Numeric plausibility | Sport/event-specific bounds (e.g. no 800m time under 90s) | Discard the value, flag `implausible` |

---

## 9. Retry Strategy

Failures are classified before any retry decision is made:

- **Transient** (network timeout, rate limit, 5xx from OpenAI/OpenRouter): retry up to 2 times within the same cycle, exponential backoff (5s, 20s). If still failing, the agent's result for this cycle is `status: "error"`, not `"empty"` — the athlete's health panel should distinguish "we don't know" from "we couldn't check."
- **Malformed output** (JSON parse failure, schema mismatch): one repair attempt — re-prompt the same model with its own broken output and an instruction to fix the format — before giving up. This is cheap and resolves a meaningful fraction of extraction failures without a full re-query.
- **No verified data found** (agent ran cleanly, found nothing): not a failure at all. `status: "empty"`, contributes to `knownGaps`, no retry.

### 9.1 Per-agent circuit breaker

The current pipeline's only backoff mechanism is global and crude: any extraction/DB failure punts the *entire athlete* 6 days into the future for the *entire pipeline*. This means one flaky agent degrades everything else for that athlete for a week.

The redesign tracks consecutive failure counts **per agent per athlete**. After 3 consecutive `"error"` outcomes for the same agent on the same athlete, that specific agent is skipped for that specific athlete for the next 3 cycles (roughly 18 hours), while every other agent continues running normally. This is logged as a degraded-agent state, visible in monitoring (§10), and automatically resets the moment the agent succeeds once.

---

## 10. Error Handling

The guiding rule, generalised from the existing `PerplexityResearchError` pattern: **an agent that cannot verify data must produce no data, not fabricated data** — and the orchestrator must never let one agent's failure mode leak into another agent's write.

- Every agent's failure is caught at the agent boundary, never allowed to propagate into `Promise.allSettled`'s rejection in a way that stops other agents (this is what `allSettled` buys over `all`, but it must be paired with each agent internally catching its own errors so the *orchestrator's* aggregation logic never throws either).
- An agent's error never triggers a write. If `ResultsAgent` fails, nothing in the `athletes` stat columns is touched that cycle — the previous values remain, stale but not wrong. This is a deliberate improvement over "wipe then repopulate," which briefly leaves the athlete with *no* data at all during a repopulate (today's `repopulateAthlete` deletes first, populates after — a failure mid-cycle can leave an athlete emptier than before the refresh started).
- The global error handler in `app.ts` remains the last line of defence for anything genuinely unexpected at the HTTP layer, but the pipeline itself should essentially never reach it — every anticipated failure mode is handled inside the orchestrator.

---

## 11. Database Interactions

Two structural changes from today's pipeline, both aimed at making partial failure safe:

### 11.1 Per-agent table ownership

Each agent is the **sole writer** of its corresponding table(s):

| Agent | Owns |
|---|---|
| `ResultsAgent` | `athletes` (rank/PB/SB columns only) |
| `CompetitionsAgent` | `competitions` |
| `ContactsAgent` | `contacts` |
| `SponsorsAgent` | subset of `intelligence_items` (category `sponsorships`) |
| `SocialProfilesAgent` | `athletes` (handle columns only) |
| `SocialMetricsAgent` | `athletes` (follower/growth columns only) |
| `BiographyAgent` | `athletes` (age/bio columns only) |
| `PhotoAgent` | `athletes` (`avatar_url` only) |
| `TimelineAgent` | `timeline_events` |
| `IntelligenceAgent` | `intelligence_items` (remaining categories) |

No agent ever writes outside its own ownership. This means a `ContactsAgent` failure cannot corrupt or block a `CompetitionsAgent` write, and — just as importantly — makes it trivial to reason about which agent to blame when a specific table's data looks wrong.

### 11.2 Upsert, not wipe-and-recreate

`repopulateAthlete` today deletes all rows across four tables before re-running the pipeline. This is destructive by design and means a failed refresh can leave an athlete with strictly less data than before. The redesign upserts per natural key instead:

- `competitions`: keyed on `(athleteId, meetName, date)`
- `timeline_events`: keyed on `(athleteId, date, title)`
- `contacts`: keyed on `(athleteId, name, role)`
- `intelligence_items`: keyed on `(athleteId, title, publishedAt)` — intelligence items are closer to an append-only feed than a replaceable set, so new items are added and old ones are only pruned if they exceed a retention window, not wiped on every cycle

Each agent's write batch is wrapped in a single transaction, so a partial insert failure within one agent's batch cannot leave that table half-updated.

This is an additive change to the existing schema — no destructive migration is required to adopt it. The existing `athlete_id` foreign keys and cascade-delete behaviour are unchanged; only the *write pattern* changes, from delete-then-insert to upsert-on-natural-key.

The manual "wipe everything and start over" behaviour that `repopulateAthlete` currently provides is still valuable as an explicit escape hatch (e.g. an athlete whose identity was wrong and needs a clean slate) — it should remain available, just as a distinct, deliberately-invoked operation rather than the *only* way to refresh data.

---

## 12. Monitoring

Today's pipeline logs individual events via Pino but has no structured notion of "is this pipeline healthy." The redesign treats monitoring as a first-class output of every orchestrator run, not something bolted on afterward:

- **Per-agent, per-run metrics:** status, latency, tokens used, retry count — logged with structured fields (`athleteId`, `agent`, `status`, `latencyMs`, `tokensUsed`) on every run, success or failure.
- **Rolling per-agent health:** success/empty/error rate over a trailing window (e.g. last 50 runs) per agent, independent of any single athlete. If `ContactsAgent`'s error rate across the whole roster spikes, that's a prompt-drift or upstream-API signal worth surfacing in the admin dashboard (`GET /admin/data-health` is the natural extension point) — distinct from any single athlete having a bad day.
- **Platform Quality Score, formalised:** the existing informal "59/100 across 5 athletes" becomes a real computed metric — the athlete-health computation (`athlete-health.ts`) already produces most of the needed inputs; it should be extended to weight in per-agent corroboration and validation-flag counts, and the roster-wide average exposed via the admin endpoint rather than living only in a one-off audit document.
- **Golden-athlete regression set:** a small, fixed set of well-known athletes (5–10) with a human-verified expected profile, re-run periodically (e.g. weekly) through the full pipeline. Comparing output against the known-good baseline is the earliest possible signal of prompt drift or a broken agent, well before it's visible in the general roster's quality score.
- **Circuit-breaker visibility:** any agent currently skipped for a specific athlete due to repeated failure (§9.1) shows up explicitly in that athlete's health panel gaps, not as a silent absence.

---

## 13. Scalability

The current scheduler is a single `setTimeout`/`setInterval` in the API server process, refreshing 3 athletes per 6-hour cycle sequentially with a fixed 90-second gap. This has three compounding problems: it doesn't survive a process restart mid-cycle cleanly, it can't scale horizontally (there's no coordination if you ran two API server instances), and the fixed delay is a blunt instrument against rate limits that doesn't adapt to actual load.

The redesign moves to a **queue-based model**, without introducing new infrastructure the project doesn't already have:

- **`pg-boss`** (Postgres-backed job queue) is the recommended choice over BullMQ/Redis specifically because the project already depends on Postgres and has none of the Redis infrastructure BullMQ would require — this keeps the operational footprint unchanged while solving the actual problem.
- **One orchestrator job per athlete per cycle.** The scheduler's only job is to enqueue "refresh athlete N" jobs for stale athletes; the queue handles retry, backoff, and distribution. Within a single athlete's job, the 10 agents still run concurrently in-process (fanning each agent out as its own queue job would be 10x the coordination overhead for no real benefit at this scale).
- **A shared rate-limit budget**, tracked centrally (e.g. a simple token-bucket counter in Postgres or in-process if single-instance) across all concurrent agent calls to the same upstream provider (OpenAI, OpenRouter), replacing the current fixed 90-second inter-athlete delay with an actual backpressure mechanism that adapts to real headroom instead of guessing a safe constant.
- **Priority tiers:** never-crawled athletes and explicit user-triggered repopulate requests jump ahead of routine 6-hourly refreshes in the queue.
- **Horizontal scaling becomes possible, not required.** Because coordination state lives in Postgres (via the queue) rather than in the API server process's memory, running multiple worker instances is safe without any additional design work — this directly addresses `docs/technical-debt.md` Priority 9's roadmap ("Consider moving to a proper job queue") without requiring it to be exercised at 5 athletes; it simply stops being a wall the platform would hit later.

---

## 14. Migration From the Current Pipeline

The migration is deliberately incremental and per-agent, because per-agent table ownership (§11.1) makes that safe — this is not a big-bang cutover.

**Phase 0 — Shadow mode.** Build the orchestrator and `IdentityAgent` + `ResultsAgent` + `CompetitionsAgent` first. Run them in parallel with the existing monolithic `autoPopulateAthlete` for a subset of athletes, writing to a staging comparison path rather than the live tables. Compare output quality against the current pipeline's output for the same athletes before trusting the new agents with real writes.

**Phase 1 — Partial cutover.** Cut `ResultsAgent` and `CompetitionsAgent` over to real writes (they own `athletes` stat columns and `competitions` respectively). The monolithic pipeline continues to own contacts, intelligence, timeline, social, photo, biography, and sponsors for the time being — this hybrid state is safe specifically because the new agents and the old monolithic call never write to the same table simultaneously once cutover happens per-table.

**Phase 2 — Highest-impact agents.** Ship `ContactsAgent` and `IntelligenceAgent` next, since they resolve Priorities 3 and 4 — the two tech-debt items with the largest visible impact on perceived platform quality. Retire the monolithic pipeline's contact and intelligence-item extraction once these are live.

**Phase 3 — Remaining agents.** Ship `SponsorsAgent`, `SocialProfilesAgent`, `SocialMetricsAgent`, `BiographyAgent`, `PhotoAgent`, `TimelineAgent`. At the end of this phase, `auto-populate.ts`'s monolithic extraction call has no remaining callers and can be deleted, not just deprecated.

**Phase 4 — Scheduler migration.** Only after the agent architecture is proven does the scheduler itself move from the in-process `setTimeout` loop to the `pg-boss` queue design in §13. This is deliberately last — it's an orthogonal infrastructure change and coupling it to the agent rollout would make both harder to debug if something goes wrong.

**Backfill.** Once all 11 agents are live, re-run the full pipeline against every existing athlete so historical data benefits from the new validation and evidence rules retroactively, rather than only new data being trustworthy.

**Rollback.** Because each agent owns its own tables independently, rollback is per-agent — disabling `ContactsAgent` and reverting to no contact extraction (rather than the old monolithic version, which will have already been deleted by Phase 3) is a contained, low-risk action. There is no scenario in this design where a single agent's regression requires rolling back the entire pipeline.

**What does not change during migration:** the database schema's foreign keys, cascade-delete behaviour, and existing table shapes remain as they are — every change described in this document (upsert keys, ownership boundaries, evidence tracking) is additive to the current schema, not a breaking migration. The manual repopulate escape hatch (§11.2) remains available throughout every phase.
