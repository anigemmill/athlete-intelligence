# Milestone 3 Proposal — `ResultsAgent`

**Status: proposal — awaiting review and approval. No implementation code has been written.**

This document is the implementation proposal for `ResultsAgent`, the first real specialised
retrieval agent in the Task #27 pipeline (`docs/task-27-agentic-pipeline.md` §4.1,
`docs/task-27-implementation-roadmap.md` Milestone 3, `docs/task-27-success-metrics.md`
Milestone 3). It is a design document only. Implementation begins after this proposal is
approved, following the same discipline used for Milestones 0–2: explain before coding,
typecheck, run the full test suite with and without a database, generate `docs/metrics/m3.json`,
compare against `m2.json`, update the roadmap/success-metrics status markers, commit and push.

---

## 1. Problem Statement

`ResultsAgent` exists to fix five specific, already-documented failures in the current
monolithic pipeline (`artifacts/api-server/src/lib/auto-populate.ts`), all traceable to
`docs/technical-debt.md`:

1. **PB/SB inversion (Priority 2).** Peter Bol's stored `personal_best` ("1:45.14") is 1.5
   seconds *slower* than his stored `season_best` ("1:43.64") — logically impossible, since a
   personal best is by definition the athlete's best mark ever. Milestone 1 added a
   post-extraction correction (`isSeasonBestBetterThanPersonalBest` in `validation.ts`) to the
   monolith's output, but that is a retrofit: the monolith's single general-purpose research
   pass was never designed to distinguish "current-season form" from "career-best mark" at the
   point of retrieval, so the correction can only ever repair damage after the fact, not prevent
   the LLM from conflating the two fields during extraction.
2. **Stale rankings.** `world_rank` and `national_rank` are perishable facts
   (`confidence.ts`'s `PERISHABLE_FIELDS` already lists `worldRank`) that the monolith refreshes
   only as a side effect of a general research pass every ~6 hours per athlete (scheduler picks
   3 stale athletes per cycle — Priority 9), with no query specifically aimed at "what is this
   athlete's rank *right now*."
3. **Missing/unmatched competition results.** Brook Macdonald's competitions carry `result:
   null` because generic meet names defeat `result-backfill.ts`'s fuzzy matcher — a downstream
   symptom of a research pass that surfaces a rank/PB/SB claim without a query structured to also
   pin down which specific competition produced it.
4. **Poor source validation for stat claims.** The monolith's single extraction prompt does not
   distinguish "a governing body's own results system said this" from "a Wikipedia infobox said
   this" for the results/rankings fact domain specifically — `sourceHierarchy.ts`'s
   `results_rankings` tier set already encodes that distinction (governing bodies tier 1,
   verified media tier 2, **Wikipedia and social platforms tier 4** — a deliberately harsher
   treatment of Wikipedia than for `identity_biography` or `photo`), but nothing calls
   `getSourceTier("results_rankings", ...)` from a query built to actually elicit a tier-1
   source.
5. **Confidence not reflecting any of the above.** Because stat facts are extracted inside the
   same generic pass as everything else, their confidence score cannot reflect source authority,
   corroboration, or recency in a way specific to how volatile and disputable rank/PB/SB claims
   actually are (`docs/truth-verification-layer.md` §3 already classifies rank and restated
   PB/SB as **Tier 2** — "requires corroboration for full confidence" — which the monolith has no
   mechanism to apply at all).

`ResultsAgent` is a narrowly-scoped, single-purpose agent whose only job is retrieving and
validating these five fields, so each failure above is fixed at the point of retrieval rather
than patched afterward.

---

## 2. Responsibilities

### Exclusive write ownership

Per `docs/task-27-agentic-pipeline.md` §11.1 (single-writer principle) and
`docs/task-27-implementation-roadmap.md` Milestone 3, `ResultsAgent` becomes the **sole** writer
of five columns on `athletes` (`lib/db/src/schema/athletes.ts`):

| Column | Type | Notes |
|---|---|---|
| `world_rank` | `integer`, nullable | perishable |
| `world_rank_delta` | `integer`, default `0`, not null | derived — computed from the previous stored `world_rank`, not independently retrieved (see below) |
| `national_rank` | `integer`, nullable | perishable |
| `personal_best` | `text`, nullable | Tier 2 fact when restating an already-established mark (truth-verification-layer.md §3) |
| `season_best` | `text`, nullable | perishable, Tier 2 |

No other agent — including `LegacyMonolithAgent` once `results` is added to `PIPELINE_AGENTS` —
may write these five columns. `legacyMonolithAgent.ts` will be modified to skip them entirely
(not write nulls over them, simply omit them from its update) once `results` is enabled, exactly
as the roadmap specifies.

**`world_rank_delta` is explicitly out of scope for retrieval.** No source states "your rank
changed by N" as a primary fact — this column is arithmetic over two observations of the same
underlying fact (previous stored `world_rank` vs. this run's retrieved `world_rank`), which
`docs/truth-verification-layer.md` §"Explicitly not covered by this layer" already carves out as
a derived field that "inherit\[s\] whatever tier \[its\] inputs were verified at." `ResultsAgent`
computes it as `newRank !== null && previousRank !== null ? previousRank - newRank : 0` (positive
= improved) immediately before persistence, using the athlete's currently-stored `world_rank` as
`previousRank`. This preserves it as a derived quantity rather than a second, independently
sourced fact.

### What `ResultsAgent` does NOT own

- The `competitions` table (Milestone 4, `CompetitionsAgent`) — `ResultsAgent` may reference a
  specific competition in its research (e.g. "PB set at the 2024 National Championships") to
  strengthen an `EvidenceRecord`'s `rawExcerpt`, but it never writes a `competitions` row.
- `intelligence_items` / `timeline_events` rows about results (Milestones 6/9) — a historic PB
  announcement covered as a media story is `IntelligenceAgent`'s/`TimelineAgent`'s territory,
  not `ResultsAgent`'s.
- Anything not in the five-column list above (biography, contacts, sponsors, social, photo).

---

## 3. Data Sources

`ResultsAgent` queries Perplexity Sonar (via OpenRouter, same transport as today) with a prompt
built specifically to elicit rank/PB/SB claims and, wherever possible, name the specific
governing-body or results-system page the claim came from — not a general "tell me about this
athlete" prompt.

### Ranked trust list for this fact domain

This is `sourceHierarchy.ts`'s existing `results_rankings` `SOURCE_TIERS` entry, reused verbatim
rather than re-specified:

1. **Tier 1 (+5 confidence)** — governing body / official results system: `worldathletics.org`,
   `olympics.com`, `uci.org`, `fis-ski.com`, `iaaf.org`, `worldrowing.com`, `worldsailing.org`,
   `fina.org`, `worldarchery.org`. A sport-specific governing body not yet in this static list
   (e.g. a national federation site) still passes through `getSourceTier`, which returns tier 3
   for anything unlisted — it is not penalised, but it does not get the tier-1 bonus either. The
   static list is deliberately a *known-good* allowlist, not a *complete* one.
2. **Tier 2 (+2)** — verified sports media: `bbc.co.uk`/`bbc.com`, `reuters.com`, `apnews.com`,
   `theguardian.com`, `espn.com`, `si.com`, `athleticsweekly.com`, `insidethegames.biz`,
   `cyclingnews.com`, `velonews.com`, `runnersworld.com`, `swimswam.com`,
   `trackandfielddailynews.com`, `lequipe.fr`, `redbull.com`.
3. **Tier 3 (±0)** — anything unlisted, including an athlete's own official website and national
   federations not in the tier-1 set. Treated as plausible but unweighted.
4. **Tier 4 (−10)** — `wikipedia.org` and all social platforms (`twitter.com`, `x.com`,
   `facebook.com`, `instagram.com`, `tiktok.com`, `youtube.com`, `reddit.com`). This is the
   `results_rankings`-specific harsher treatment of Wikipedia already encoded in
   `sourceHierarchy.ts` — unlike `identity_biography` or `photo`, Wikipedia is not a reliable
   primary for a live rank or a current-season mark, since infoboxes lag and are
   crowd-editable.

No new domain lists are introduced by this proposal; `ResultsAgent` calls
`getSourceTier("results_rankings", sourceDomain)` exactly as written today.

### Conflict resolution

When the research response surfaces disagreeing values for the same field (e.g. one passage
states rank #4, another #6):

1. **Prefer the higher-tier source.** If one candidate's source resolves to a strictly lower
   `SourceTier` number (better) than the other, take that one and discard the other — this is
   the existing tier ordering (1 best, 4 worst), just used as a tie-breaker rather than only as a
   confidence adjustment.
2. **If tiers are equal, prefer the more recent claim**, using `publishedAt` on the
   `EvidenceRecord` when available, falling back to `retrievedAt` when the source has no
   discoverable publish date.
3. **If tiers are equal and no date can distinguish them, treat the field as `unresolved` for
   this run** — do not guess. `ResultsAgent` emits an `AgentResult` with `status: "empty"` for
   that specific field (see §7) rather than writing either candidate; a field that already has a
   stored value is left untouched (Phase 4 persistence is an upsert of only the facts this run
   actually resolved, never a wipe of fields it didn't).
4. **PB and SB are cross-checked against each other, not just individually validated**, using
   `isSeasonBestBetterThanPersonalBest` from `validation.ts` (see §4) — this is a same-run
   internal-consistency check, not a corroboration source, and does not by itself satisfy the
   Tier 2 corroboration requirement described in §5/§6.

---

## 4. Validation

Every rule below is enforced before a candidate fact is allowed to become an `EvidenceRecord` at
all — a rule that fails causes `ResultsAgent` to drop that specific candidate (not the whole
run) and log why.

| Rule | Mechanism | Rationale / documented defect |
|---|---|---|
| PB cannot be logically worse than SB | `isSeasonBestBetterThanPersonalBest(pb, sb)` from `validation.ts`, called with the candidate PB/SB pair. If it returns `true`, the pair is rejected and re-queried once (see §7); if it returns `null` (unparseable or incompatible units/directions), both marks are still stored but flagged `unverified_pair` in the evidence's context so a human reviewer can spot-check the raw excerpt. | Priority 2 — the canonical Peter Bol case. |
| Marks must parse to a known, unit-declared format | `parseMark(raw)` from `validation.ts`. A bare unit-less number (e.g. "8.95") is rejected outright — never guessed — consistent with the project's "never store fabricated data" philosophy (`CLAUDE.md`, AI philosophy). | `validation.ts`'s own documented design constraint. |
| Source domain/URL must be real, not a citation-index leak | `sanitizeSourceDomain` / `sanitizeSourceUrl` from `validation.ts`, applied to every candidate before it is allowed to become an `EvidenceRecord`. A candidate whose only source sanitises to `null` for **both** domain and URL is dropped entirely — `ResultsAgent` never emits a fact with no traceable source at all. | Priority 1 — Nick Willis's `"[8]"`-style URLs, Hamish Kerr's `"source4"`-style domains. |
| Results must belong to the correct athlete | The research query is built with the athlete's full name **and** `sport` **and** `event` from `AgentContext` (never name alone), and any candidate whose surrounding text names a different sport/event than the context's is rejected. This directly targets ambiguous-name collisions (the same failure mode `IdentityAgent`'s confidence gate exists to prevent at the identity stage — `ResultsAgent` re-checks it locally because a research pass can still drift onto a same-named athlete in a different sport mid-answer even after identity was correctly resolved). | New rule, not previously documented as a technical-debt item, but required by "results must belong to the correct athlete" per the user's proposal brief. |
| Dates must be calendar-valid | `isValidDate` from `validation.ts`, applied to any `publishedAt` the research response supplies. An invalid or missing date does not reject the fact — it only disables recency decay for that instance (see §5) and is recorded as `publishedAt: null` on the `EvidenceRecord`, consistent with the field's documented optionality in `types.ts`. | Existing rule, reused. |
| Distances/events must match the athlete's declared event | For sports where the mark's implied event can be checked against `AgentContext.event` (e.g. a "100m" mark for a sprinter, a "high jump" mark in metres for a jumper), a mark whose parsed unit direction (`parseMark`'s `higher-better`/`lower-better`) is inconsistent with the athlete's declared event is rejected — e.g. a `higher-better` (metres) mark returned for a middle-distance runner whose event is a `lower-better` (time) event. Where the athlete's `event` string is too generic to check (e.g. "Athletics" with no specific event), this rule is skipped rather than guessed. | New rule, targets the same "results must belong to the correct athlete" class of defect at the field level rather than just the person level. |
| Ranking claims must include a source | Enforced structurally: a rank candidate with `sanitizeSourceDomain` and `sanitizeSourceUrl` both `null` never becomes an `EvidenceRecord` (same mechanism as the domain/URL rule above, called out separately here because the proposal brief explicitly asked for "rankings must include a source" as its own line item). | New rule, restates the domain/URL rule for rankings specifically. |

---

## 5. Confidence

`ResultsAgent` calls the existing `computeAdjustedConfidence` from `confidence.ts` — no new
confidence logic is introduced — but is the first agent to feed it fields the Truth Verification
Layer classifies as Tier 2, so the *sequencing* around that call is new:

1. **Base confidence** (`confidenceBase` on the `EvidenceRecord`) comes from the research
   response itself — the same "how sure is the model" signal the monolith already extracts
   today, unchanged.
2. **Source-tier adjustment**: `adjustForSourceTier(base, tier, hasSourceUrl)` where `tier =
   getSourceTier("results_rankings", sourceDomain)`. Tier 1 governing-body sources: `+5`. Tier 2
   verified media: `+2`. Tier 3 unlisted: `+0`. Tier 4 (Wikipedia/social): `−10`. No source URL
   at all: additional `−5`.
3. **Corroboration boost / gate** (`applyCorroborationBoost`, `+3`) — this is where Tier 2
   classification (`docs/truth-verification-layer.md` §3: rank, and PB/SB when restating an
   already-established mark) changes `ResultsAgent`'s behaviour relative to every prior
   milestone:
   - If the same fact (same field, same value within the comparator's tolerance) is
     independently corroborated — a second, differently-sourced passage in the same research
     response, or agreement with the already-stored value from the athlete's last successful
     `ResultsAgent` run **at a different source domain** — the `+3` boost applies and the fact is
     stored at full adjusted confidence.
   - If **not** corroborated, the fact is still stored (Tier 2 is "storable provisionally at
     reduced confidence if uncorroborated," per the Truth Verification Layer — not a hard gate
     like Tier 3), but is written with an explicit `single_source` verification status
     (`docs/truth-verification-layer.md` §"verification status") rather than silently treated as
     equal-strength to a corroborated fact. Milestone 3 stores this status as metadata on the
     `EvidenceRecord`/`agent_runs` context; a dedicated `verificationStatus` column on
     `evidence_log` is **not** part of this milestone's scope (see §10, Risks) — the Truth
     Verification Layer remains design-only per the user's Phase H/I instructions, and this
     milestone does not silently begin implementing it early.
   - **New PB/record claims are Tier 3, not Tier 2** (`docs/truth-verification-layer.md` §3):
     if the candidate PB is a *new* mark (i.e. numerically superior to the athlete's
     currently-stored `personal_best`, not merely a restatement of the known one) and it has
     **not** been independently corroborated, `ResultsAgent` does **not** store it this run.
     It is dropped with `status: "empty"` for that field and logged, exactly like an unresolved
     conflict (§3, item 3) — the existing stored PB is left untouched. This is the one place in
     Milestone 3 where the Truth Verification Layer's Tier 3 "never stored without two
     independent sources" rule is actually enforced as a hard gate, because the fixture case is
     unambiguous and cheap to implement correctly, unlike the broader Tier 2/3 storage-state
     machinery in §10.
4. **Recency decay** (`applyRecencyDecay`) — applied to `worldRank` and `seasonBest`
   specifically, since both are in `confidence.ts`'s `PERISHABLE_FIELDS` set already
   (`personalBest`, `nationalRank`, and `worldRankDelta` are not, and do not decay). Days since
   last refresh is computed from the athlete's `lastCrawledAt` at the time this run started.

`EMISSION_CONFIDENCE_FLOOR` (65) still governs whether `ResultsAgent` emits a candidate fact at
all *before* any of the above adjustments — a candidate whose raw base confidence never clears
65 is not emitted as a fact, exactly as `confidence.ts`'s existing doc comment specifies for
every future agent.

---

## 6. Evidence

Every one of the five owned fields is attached to exactly one `EvidenceRecord` per write
(`types.ts`), reusing the existing shape with no new fields:

- `claim`: the field name (`"worldRank"`, `"worldRankDelta"`, `"nationalRank"`,
  `"personalBest"`, `"seasonBest"`).
- `value`: the validated, parsed value (for PB/SB, the original mark string as it will be
  stored in the `text` column — `parseMark`'s numeric form is used only for comparison, never
  persisted in place of the human-readable mark).
- `agent`: `"results"` (matching the `PIPELINE_AGENTS` flag name and the `agent_runs.agent`
  value convention already used by `"identity"` and `"legacy_monolith"`).
- `sourceDomain` / `sourceUrl`: sanitised outputs of `sanitizeSourceDomain`/`sanitizeSourceUrl`.
- `retrievedAt`: timestamp of this run.
- `publishedAt`: parsed via `isValidDate`, `null` if absent or invalid.
- `rawExcerpt`: **mandatory whenever the research response supplies quotable text** — per
  `types.ts`'s existing doc comment calling this "the cheapest, most effective tool for a human
  reviewer to spot-check a stored fact," and especially important for a Tier 2 fact domain where
  a reviewer needs to be able to check *why* a rank or mark was accepted without re-running the
  research query.
- `confidenceBase`: the model's own pre-adjustment confidence (§5, step 1).

`world_rank_delta` (the one derived field ResultsAgent owns) still gets its own
`EvidenceRecord` with `claim: "worldRankDelta"`, `sourceDomain`/`sourceUrl`: `null` (it has no
independent source — it is arithmetic, per §2), and `rawExcerpt`: a short synthetic note
(`"derived: previous world_rank <N> vs. this run's <M>"`) so its provenance is still
inspectable even though it is not sourced from the web. `confidenceBase` for this record is
fixed at the *lower* of the two `world_rank` observations' post-adjustment confidence — a delta
cannot be more trustworthy than the least-trustworthy of the two numbers it's computed from.

**Correction made during review (see the architecture doc's new §5.1):** on closer reading of
`evidence-log.ts`, `evidence_log` is not a per-claim structured table — it is an append-only log
of raw blobs (`raw_research`, `raw_citations`, `raw_extraction`) keyed one row per agent
invocation, and nothing in the codebase writes to it yet. `ResultsAgent`'s five owned fields are
scalar columns on `athletes`, not rows in a fact table, so — unlike `ContactsAgent`'s or
`TimelineAgent`'s future facts, which map onto rows that already carry their own
`source_domain`/`confidence` columns — there is no existing row for a `personal_best` or
`world_rank` Evidence Record to live as. This milestone resolves that by serialising the run's
full `EvidenceRecord[]` as JSON into the existing `raw_extraction` text column: **no schema
migration**, but also not yet queryable per-claim by a future UI. See
`docs/task-27-agentic-pipeline.md` §5.1 for the full reasoning and the deferred, dedicated
per-claim table (`fact_evidence`) that a later milestone would introduce to make this queryable.

---

## 7. Failure Handling

`ResultsAgent` follows the retry/error-classification contract already defined in `types.ts` and
`docs/task-27-agentic-pipeline.md` §9 — no new failure taxonomy is introduced.

- **Transient failures** (network error, OpenRouter/Perplexity 5xx, timeout): retried once with
  the same prompt before the agent gives up for this run and returns `status: "error"`,
  `error.classification: "transient"`. This matches the per-agent circuit breaker already
  described in the architecture doc; `ResultsAgent` does not implement its own separate retry
  budget beyond that shared policy.
- **Malformed output** (response doesn't parse as the expected shape, or every candidate fact
  fails validation in §4): retried once with a stricter re-prompt (explicitly asking for
  unit-declared marks and a named source per claim) before returning `status: "error"`,
  `error.classification: "malformed_output"`. This is the path Milestone 3's engineered
  "SB faster than PB" fixture (roadmap §Testing) exercises — the correction rule fires by
  causing exactly this retry, not by silently swapping the two values.
- **Partial failure per field, not per run.** If, say, `personal_best` and `season_best` both
  validate cleanly but `world_rank` fails validation (no parseable source) or is
  Tier-3-blocked-as-a-new-PB-claim (§5, item 3), `ResultsAgent` still returns `status: "ok"` with
  `facts` containing only the fields that resolved. A single field's failure never blanks the
  whole result — this mirrors the orchestrator's own `Promise.allSettled` partial-failure
  contract (`fanOutReconciliation.ts`) at the field level within one agent.
- **Empty response** (the research query returns no usable rank/PB/SB content at all — a
  plausible outcome for an athlete with genuinely little public results coverage): `status:
  "empty"`, `facts: []`. This is not an error — per `types.ts`'s existing distinction, an empty
  result is a known gap, not an operational failure, and must not trigger the same alerting path
  as `status: "error"`.
- **Conflicting sources with no way to resolve them** (§3, item 3): handled per-field exactly
  like an empty result for that field — `status: "ok"` overall if other fields resolved,
  `status: "empty"` if none did — never a guess, and never an error, since nothing actually
  failed; the pipeline correctly detected an unresolvable conflict.
- **`agent_runs` recording**: exactly one `agent_runs` row per invocation with `agent:
  "results"`, `status` matching the `AgentResult.status` above, following the same pattern
  `legacyMonolithAgent.ts` and the orchestrator already use for `"legacy_monolith"` and
  `"identity"`.

---

## 8. Testing

- **Unit — validation wiring**: fixtures feeding `resultsAgent.ts`'s output-shaping logic
  engineered research-response text, confirming: (a) a faster-SB-than-PB pair triggers the
  malformed-output retry path rather than silently storing the inversion; (b) a citation-index
  URL (`"[8]"`) or domain (`"source4"`) causes that specific candidate to be dropped, not the
  whole result; (c) a bare unit-less mark is rejected by `parseMark` and never stored; (d) a
  wrong-sport/wrong-event candidate is rejected; (e) a new (numerically superior) PB with no
  corroboration is withheld (Tier 3 gate) while a restated PB with one source is stored at
  reduced/`single_source` confidence (Tier 2).
- **Unit — confidence**: fixtures confirming `computeAdjustedConfidence` is called with the
  correct `tier` for each of the four `results_rankings` tier buckets, and that `worldRank`/
  `seasonBest` (but not `personalBest`/`nationalRank`/`worldRankDelta`) receive recency decay
  when stale.
- **Unit — evidence shape**: confirms every emitted `EvidenceRecord` has a non-null
  `sourceDomain` or `sourceUrl` (never both null), and that `worldRankDelta`'s synthetic
  `rawExcerpt` is present even though it has no web source.
- **Integration (DB-gated, `it.skipIf(!hasDb)`, following the established pattern from
  `orchestrator.test.ts`)**:
  - `ResultsAgent` run against a seeded athlete writes exactly the five owned columns and no
    others.
  - Running `ResultsAgent` twice in a row for the same athlete does not create duplicate
    `evidence_log` rows for facts that didn't change (idempotent re-run).
  - With `results` in `PIPELINE_AGENTS`, `legacyMonolithAgent.ts` no longer overwrites these
    five columns — a run that sets a distinctive `world_rank` via `ResultsAgent` and then
    triggers `onRefresh` again confirms the value survives a legacy-agent-adjacent run untouched
    (guards against the exact dual-write race in §10).
  - Removing `results` from `PIPELINE_AGENTS` and re-running restores the pre-Milestone-3
    behaviour (rollback proof, per the roadmap's explicit "not just that it exists on paper"
    acceptance criterion).
- **Golden athlete verification**: shadow-comparison script (manual, per the roadmap — not a
  formal shadow-write table this milestone) run against all 5 golden athletes, logging
  `ResultsAgent`'s output next to a fresh `LegacyMonolithAgent` run for the same athletes side by
  side. Hamish Kerr specifically gets a manual live-web spot-check of `world_rank`/`personal_best`
  /`season_best` against public sources, per the roadmap's Testing section — this is the one step
  in this milestone that requires real API credentials and a live web check, disclosed here as a
  dependency the same way the earlier real-world-accuracy-audit blocker was disclosed.
- **Regression ledger**: adds **R5** — "no athlete has SB numerically superior to PB after a
  `ResultsAgent`-sourced crawl" (`docs/task-27-success-metrics.md`, already defined) — and
  carries forward R0–R4 unchanged. All regression tests from Milestones 0–2 continue running
  against the full suite; none are expected to need modification since `ResultsAgent` is
  additive to the fan-out, not a change to the identity/legacy-monolith paths those tests cover.

---

## 9. Success Metrics

Per `docs/task-27-success-metrics.md` Milestone 3 (already approved):

- **Expected improvement**: stat-field confidence (world rank, PB, SB) holds steady or improves
  across all 5 golden athletes, since the query is now narrowly targeted rather than sharing a
  general pass with nine unrelated topics. Peter Bol's PB/SB pair should now be *sourced*
  correctly by a dedicated query, not merely corrected after the fact as it is post-Milestone-1.
- **Measurement**: `docs/metrics/m3.json` generated by the same `scripts/audit-iqs.ts` used for
  m0–m2, diffed against `m2.json` (average IQS 56; Peter Bol 61, Zoe Hobbs 58, Nick Willis 57,
  Hamish Kerr 46, Brook Macdonald 56).
- **Acceptance bar** (already approved, restated here for traceability): no golden athlete's
  stat-field confidence may decrease; at least 2 of 5 must show a measurable increase for this
  milestone to count as a net improvement rather than a lateral refactor. `agent_runs` must show
  `status: "ok"` for `resultsAgent` on at least 4 of 5 sample athletes on a clean run. No athlete
  in the dev database may have SB better than PB after a fresh crawl. Removing `results` from
  `PIPELINE_AGENTS` must be proven — not just asserted — to restore the prior monolith behaviour.
- **Non-regression check specific to this milestone**: Hamish Kerr's and Zoe Hobbs's currently
  populated `world_rank` values must not be accidentally nulled by the new agent's stricter
  validation (an explicit named risk in the success-metrics doc) — the shadow comparison in §8
  is the mechanism that catches this before the flag is ever enabled outside dev.
- Given the standing constraint that this sandbox has no production `DATABASE_URL` or AI API
  keys, `m3.json` will again carry `baselineType: "development"` and a
  `todoBeforeProductionRelease` marker, consistent with every prior milestone's snapshot — this
  is not a new limitation introduced by this proposal.

---

## 10. Risks

1. **Dual-write race** (already named in the roadmap): if a configuration mistake ever enables
   both `LegacyMonolithAgent` and `ResultsAgent` for the results columns simultaneously, both
   would write the same five columns in the same cycle, producing order-dependent, silently
   wrong data. Mitigation: the orchestrator should assert at startup that no two agents claim
   overlapping table/column ownership, rather than relying on the `PIPELINE_AGENTS` flag being
   configured correctly by hand — this assertion is in scope for this milestone's implementation,
   not deferred.
2. **`world_rank_delta` correctness depends on read-before-write ordering.** Computing the delta
   requires reading the athlete's *pre-this-run* `world_rank` before persisting the new one. If
   `ResultsAgent` and any other concurrent write to the same athlete row race, the delta could be
   computed against a value that is itself about to be overwritten by something else. Given the
   single-writer principle (§2), this should not occur in practice once the ownership assertion
   in risk 1 is in place — flagged here because it is the one place this agent reads a column it
   doesn't own before writing one it does.
3. **Tier 3 new-PB gate could suppress a real, correctly-reported new PB indefinitely** if
   corroboration never actually arrives (e.g. a lesser-covered athlete whose PB is only ever
   reported by one outlet). This is the Truth Verification Layer's designed trade-off, not a bug
   — but it means a genuinely true new PB can sit un-stored across many refresh cycles. The
   layer's `contested`/retry-with-TTL mechanics (`docs/truth-verification-layer.md` §"retry/TTL
   policy") are not implemented in this milestone (see risk 4) — until they are, a withheld new
   PB simply gets re-attempted every 6 hours by the scheduler like any other stale fact, with no
   explicit "still withheld, N attempts so far" visibility. Acceptable for Milestone 3 in
   isolation, but worth flagging before it's mistaken for the layer's full behaviour.
4. **Scope boundary with the Truth Verification Layer.** This proposal implements only the two
   pieces of the Truth Verification Layer that are cheap and unambiguous to build now: the Tier 2
   uncorroborated-but-storable path (as a metadata flag, not a schema change) and the Tier 3
   new-PB hard gate. It deliberately does **not** implement the layer's full `verificationStatus`
   state machine, the `contested` state, or the unpublished-candidate holding area described in
   that document — those remain design-only per the user's explicit Phase H/I framing ("Design
   this layer without implementing it" / "these documents are now part of the permanent
   architecture"). Implementing more of that layer than described here would be a silent
   architecture change and is out of scope unless separately approved.
5. **Shadow comparison is manual, not automated**, per the roadmap's own scoping ("not a formal
   shadow-write table this milestone"). This means the golden-athlete comparison in §8 catches
   regressions only at the moment it's run, not continuously — acceptable for a single milestone
   rollout, but a gap if `ResultsAgent` is later modified without re-running that comparison.
6. **No production credentials in this sandbox** (standing constraint, not new to this
   milestone): the shadow comparison, the Hamish Kerr live-web spot-check, and the "no accidental
   nulling" non-regression check can only be run in this session against the local development
   database seeded from documented facts, not against real Perplexity/OpenAI responses or a
   production database. `m3.json` will be marked accordingly, exactly as `m0`–`m2` were.

---

## 11. If We Were Designing This From Scratch Today

The user asked directly: if `ResultsAgent` were designed today with no legacy constraints, would
it be built exactly this way? No — honestly, not quite. Two things would be different, and the
review that produced §5.1 above (the `evidence_log` gap) is exactly what surfaced them.

**What I would change.** The current design keeps `athletes.world_rank` /
`athletes.personal_best` / `athletes.season_best` etc. as the source of truth — a scalar column
holding the single current value, with no structural home for *why* it's believed or *what else*
was found and discarded to arrive at it. A from-scratch design, with no existing `athletes` table
to stay compatible with, would instead make a per-claim fact ledger the source of truth: one row
per (athlete, field, value) with every corroborating Evidence Record linked to it — not just the
winning source — plus a `verificationStatus` and a stored confidence *breakdown* (base, tier
adjustment, corroboration boost, recency decay), not just the final collapsed number. The scalar
`athletes` columns would become a cached projection of "the ledger's current best answer for this
field," read-optimised for the dashboard, rather than the thing agents write to directly. That
shape is what actually makes Addition 1 (show the checkmarked source list) and Addition 2 (count
facts by verification status) *cheap* — they become a query against the ledger, not a bespoke
JSON-parsing exercise against an append-only debug log.

**Why I am not changing it now.** Three reasons, not one:
1. **Blast radius.** `athletes`'s scalar columns are read directly today by the frontend
   dashboard, `athlete-health.ts`, the chat analyst's DB tool, the Intelligence Audit engine, and
   Stripe-adjacent billing logic that is out of scope for this engagement entirely. Turning them
   from source-of-truth into a cached projection is a change to *every one* of those readers'
   contract, not a change scoped to `ResultsAgent`. Milestone 3, as approved, touches exactly one
   new file and one existing agent's write path — a fact-ledger redesign is a different, much
   larger unit of work than "ship the first specialised agent."
2. **We don't yet know the right shape.** `ResultsAgent` is the *first* specialised agent with
   real fields. Designing the fact-ledger's schema well requires seeing what `CompetitionsAgent`,
   `ContactsAgent`, and `SponsorsAgent` actually need too (their facts aren't scalar columns —
   they're table rows, which is a materially different shape to unify with rank/PB/SB). Building
   the ledger now, based on one agent's needs, risks exactly the kind of premature abstraction
   this project's own engineering standards warn against — guessing a general shape before enough
   concrete cases exist to know it's the right one.
3. **It duplicates a decision that's already pending, and shouldn't be made twice.**
   `docs/truth-verification-layer.md` is explicitly "design only... nothing in this document
   should be built without a separate, explicit decision to proceed." A fact ledger's schema is
   inseparable from that document's `verificationStatus`/`contested`/unpublished-candidate
   design — building storage for one without the other would mean redesigning the storage layer
   twice. Better to make one decision, once, when both are ready to be implemented together.

**Where these ideas belong.** A future, explicitly separate milestone — not a revision to
Milestone 3, and not smuggled in as scope creep on this proposal. `docs/task-27-agentic-pipeline.md`
§5.1 now names it tentatively as "Evidence Ledger & Verification Surfacing" and places it after
enough retrieval agents exist to design the ledger's shape from real cases rather than one. This
proposal's Milestone 3 scope is unchanged by this answer: it is the pragmatic, legacy-compatible
version, not the ideal one, and that gap is now written down rather than left implicit.

## Approval

This proposal is submitted for review. No `resultsAgent.ts` code, no schema change, and no
modification to `legacyMonolithAgent.ts` has been written. Implementation of Milestone 3 begins
only after this document is approved, and will follow the same process used for Milestones 0–2.
