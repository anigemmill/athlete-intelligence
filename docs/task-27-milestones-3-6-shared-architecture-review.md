# Milestones 3–6 Shared-Architecture Review

**Status:** Review complete. Implementation proceeds on Milestone 3 only, using the shared
scaffolding identified below. Milestones 4–6 remain separate, future, independently-approved
milestones — this document reduces their future implementation cost, it does not implement them.

**Why this review exists:** the user asked to optimise for faster delivery without increasing
deployment risk — by designing shared pieces once, across Milestones 3 (`ResultsAgent`), 4
(`CompetitionsAgent`), 5 (`ContactsAgent`), and 6 (`IntelligenceAgent`), rather than re-deriving
the same plumbing four times.

---

## 1. Shared Abstractions to Design Once

Reading M3–M6 side by side against the actual current code (not just the roadmap prose) surfaces
five real, concrete reuse opportunities — and one already-good piece of existing design worth
confirming rather than re-deriving.

### 1.1 A generic per-domain agent registry (new)

Today `orchestrator.ts`'s `runFanOut` hardcodes exactly one agent
(`["legacy_monolith"]`). Each of M3–M6 individually would otherwise need to hand-edit that
function to add its own `if (enabled.has("x")) push MyAgent` branch — four near-identical edits
to the same function, in the same file, over four milestones.

**Design once (in M3):** a `REGISTERED_AGENTS` array — one entry per specialised agent, each
carrying its `PIPELINE_AGENTS` flag name, the columns/table it owns, and its `run` function.
`runFanOut` iterates the array generically: any entry whose flag is enabled runs instead of the
legacy monolith; anything not yet in the array (M4–M6's domains, until each ships) is untouched
and keeps flowing through the monolith exactly as today. **M4–M6 then reduce to "add one array
entry"** — no further edits to `orchestrator.ts` itself.

### 1.2 A single legacy-monolith "skip" mechanism (new)

Each of M3–M6 is specified as "`legacyMonolithAgent.ts` stops writing `<table/columns>` once
`<flag>` is in `PIPELINE_AGENTS`." Today that behaviour lives inside `autoPopulateAthlete`'s five
sequential write blocks (stats, intelligence, timeline, contacts, competitions) in
`auto-populate.ts`. Left unaddressed, four milestones would each perform their own bit of surgery
on that function's control flow.

**Design once (in M3):** a single optional `{ skip: { results?, competitions?, contacts?,
intelligence? } }` parameter threaded through `autoPopulateAthlete` and `legacyMonolithAgent`,
with every block's write gated behind its own flag now — even though only `results` is ever
actually set to `true` until M4/M5/M6 ship. Every flag defaults to unset, so behaviour is
byte-for-byte unchanged until a milestone's registry entry actually exists. **This is the one
place this review recommends doing slightly more work in M3 than M3 strictly needs**, in
exchange for M4–M6 each needing a one-line change (flip their own flag to `true` when building
their registry entry) instead of re-opening `auto-populate.ts`'s control flow a third and fourth
time.

**One correctness note surfaced by this exercise, not obvious from the roadmap prose alone:** the
"stats" write block in `auto-populate.ts` is not purely `ResultsAgent`'s five columns — it also
sets `instagramHandle`, `instagramFollowers`, `twitterHandle`/`twitterFollowers`, `tiktokHandle`/
`tiktokFollowers`, `avatarUrl`, `hasNewIntelligence`, and `lastCrawledAt` in the same
`.update()` call, none of which any agent through Milestone 9/10 has claimed yet. The skip flag
for `results` must omit only the five owned fields from that call, not the whole block — the
social/photo/status fields keep being written by the monolith regardless of the `results` flag,
until `SocialProfilesAgent`/`SocialMetricsAgent`/`PhotoAgent` (Milestones 9–10) exist to claim
them. `competitions`, `contacts`, and `intelligence_items` are, by contrast, single-purpose blocks
already exclusively owned by their respective future agent — for those three, skipping the whole
block is correct as written in the roadmap.

### 1.3 An evidence-persistence helper, reused by every agent (new)

Milestone 3's own proposal review (`docs/task-27-agentic-pipeline.md` §5.1) already found that
`evidence_log` is a raw-blob-per-invocation table with zero existing writers, and that
`ResultsAgent`'s fields — scalar columns on `athletes` — have no row to carry per-fact evidence
the way a `contacts`/`intelligence_items` row can. That finding generalises directly to
`CompetitionsAgent` (M4): the `competitions` table (checked while writing this review) has **no**
`source_domain`, `source_url`, or `confidence` columns at all, so it has exactly the same gap as
`athletes`' scalar columns. `ContactsAgent` (M5) and `IntelligenceAgent` (M6), by contrast, write
to `contacts` and `intelligence_items` — both of which already carry their own source/confidence
columns per row.

**Design once (in M3):** a single `persistAgentEvidence(athleteId, agent, facts)` helper
(`pipeline/evidenceLog.ts`) that serialises an agent's `EvidenceRecord[]` as JSON into
`evidence_log.raw_extraction` — one row per invocation. `ResultsAgent` and (later)
`CompetitionsAgent` depend on this as their *only* fact-level evidence trail; `ContactsAgent` and
`IntelligenceAgent` don't strictly need it for correctness (their rows are already
self-describing) but should still call the same helper for the same raw-trace debugging benefit
already designed into the architecture (§5's "trace back to what the model saw" principle) —
one shared call site, not two different evidence-writing conventions across four agents.

### 1.4 A shared `AgentResult.meta.subQueries` field (new, tiny, additive)

M5 (`ContactsAgent`) runs two parallel sub-queries (coaching, management); M6 (`IntelligenceAgent`)
runs three (results/media, sponsorships, career changes). The M5 roadmap entry explicitly leaves
open how a caller should be able to tell which sub-query succeeded ("two `agent_runs` rows... or
one row with sub-query detail in its metadata — implementer's choice"). Leaving that choice open
per-milestone means M5 and M6 could each independently invent a different convention.

**Design once (in M3, even though `ResultsAgent` itself has only one query and won't populate
it):** add one optional field, `meta.subQueries?: Record<string, AgentStatus>`, to the existing
`AgentResult` shape in `types.ts`. This is a zero-risk, purely additive type change (optional
field, no existing reader or writer touches it) that settles the open question once, in the one
shared file every agent already imports, rather than leaving M5 and M6 to each decide — and
potentially disagree — later.

### 1.5 A generic ownership-conflict assertion (new)

M3's own proposal already named "orchestrator asserts at startup that no two agents claim
overlapping table/column ownership" as the mitigation for the dual-write race risk. Built as a
one-off check against `ResultsAgent`'s five columns specifically, it would need re-deriving for
each of M4–M6's own ownership claims.

**Design once (in M3):** the same `REGISTERED_AGENTS` array from §1.1 carries each agent's owned
columns/table, and a pure, DB-free function (`assertNoOwnershipOverlap`, `pipeline/agentOwnership.ts`)
checks the whole array for overlaps once, at orchestrator module load. M4–M6 get this check for
free the moment they add their registry entry — they do not re-implement or re-verify it.

### 1.6 Already good, confirmed rather than redesigned: source-domain tiering

Worth stating explicitly since it's a real point of reuse that already works, not a gap: `M4`
(`CompetitionsAgent`) needs no new `FactDomain` — a competition result is already covered by the
existing `results_rankings` tier set in `sourceHierarchy.ts` (the same one `ResultsAgent` uses).
`M6` (`IntelligenceAgent`) needs no new mapping logic either — `mapIntelligenceCategoryToFactDomain`
already exists, keyed exactly on the three categories (`results_rankings`/media, `sponsorships`,
`career_changes`) that `IntelligenceAgent`'s three parallel sub-queries will produce. Only `M5`
(`ContactsAgent`) is genuinely new here, and it maps onto the `contacts` `FactDomain` that already
exists too. **No changes to `sourceHierarchy.ts` are required by any of M3–M6.**

### 1.7 Not shared, and deliberately left per-milestone

`isQualityMeetName` (M4), the minimum-confidence-70 contact gate (M5), and the 8-item
intelligence-coverage minimum (M6) are each single-consumer rules. They will each be added to
`validation.ts` at their own milestone, following the established pattern (one home for every
validation rule) — but there is no cross-milestone reuse to design ahead of time for
single-consumer rules, and adding them speculatively now would be exactly the premature-abstraction
risk this project's own standards warn against. Same reasoning for the shadow-comparison script
mentioned in the roadmap's Testing sections: it is written ad hoc for M3 in this pass; if M4's
implementation finds itself reusing the same structure verbatim, generalising it into a small
parameterised script at that point is cheap and evidence-based, rather than guessed now.

---

## 2. Recommended Roadmap Changes

- **M3's file list gains three new shared files** beyond what `docs/task-27-implementation-roadmap.md`
  currently states: `pipeline/agentOwnership.ts`, `pipeline/evidenceLog.ts`, and
  `pipeline/agents/registry.ts`. `auto-populate.ts`'s skip-gating is added to all four relevant
  blocks now (stats/competitions/contacts/intelligence), not just the stats block M3 itself needs —
  see §1.2. `types.ts` gains the additive `meta.subQueries` field from §1.4.
- **M4, M5, M6's roadmap entries are simplified, not changed in scope.** Each one's "Files
  affected" becomes: one new `agents/<name>Agent.ts` file, one new entry in
  `pipeline/agents/registry.ts`, and (for M4/M5/M6 specifically) flipping that domain's flag to
  `true` inside `auto-populate.ts`'s already-present skip-gating from M3 — no further edits to
  `orchestrator.ts` or the ownership-assertion mechanism. This is the concrete "reduced duplicated
  work" the user asked for: three of the four milestones' plumbing cost drops to nearly zero.
- **No milestone's acceptance criteria, rollback strategy, or testing scope changes.** The shared
  scaffolding is additive infrastructure, not a reinterpretation of what each milestone must prove.

---

## 3. Independent Implementability and Rollback — Confirmed

Each milestone still ships and rolls back on its own:

- **Flags stay independent.** `results`, `competitions`, `contacts`, `intelligence` are four
  separate `PIPELINE_AGENTS` entries. Enabling or disabling one does not require any of the
  others to be enabled — the registry's per-entry lookup and the skip object's per-key flags are
  both keyed independently.
- **Ownership stays disjoint.** `ResultsAgent` (5 `athletes` columns), `CompetitionsAgent`
  (`competitions` table), `ContactsAgent` (`contacts` table), `IntelligenceAgent`
  (`intelligence_items` table) claim non-overlapping storage. `assertNoOwnershipOverlap` (§1.5)
  makes this a build-time-checked fact, not just an intention.
  **Note on the shared "stats" block ownership check (see §1.2):** because `ResultsAgent` owns
  only 5 of the ~14 fields written by that block, the ownership registry's `ownedColumns` entry
  for `results` lists exactly those 5 columns, not the whole block — the assertion is precise at
  the column level, not the block level, so a future agent that legitimately claims
  `instagramHandle` (Milestone 9) will not spuriously conflict with `ResultsAgent`'s entry.
- **Rollback is per-milestone and unchanged from what the roadmap already specifies:** remove
  that milestone's flag from `PIPELINE_AGENTS`. Because the registry array is the only thing that
  changes between milestones (one entry added), removing a flag makes `runFanOut` fall back to the
  legacy monolith for exactly that domain, with no interaction with any other milestone's flag —
  this was true before this review and remains true after it; the shared scaffolding makes the
  fallback path uniform and tested once (§1.1) rather than weakening it.
- **The shared pieces themselves are safe to ship ahead of need.** §1.2's unused skip flags and
  §1.4's unused `subQueries` field are inert until a later milestone's registry entry sets them —
  they carry no runtime behaviour change for M3 by themselves, verified the same way every prior
  milestone's additive change was: the existing test suite must still pass unmodified for any
  code path that doesn't yet opt in.

---

## 4. Recommended Implementation Order

**Unchanged from the existing roadmap: M3 → M4 → M5 → M6.** The reasoning, made explicit rather
than assumed:

1. **M3 pays the shared-scaffolding cost while there is only one real agent to design it against.**
   Building the registry, the skip mechanism, the evidence helper, and the ownership assertion
   against a single concrete case (`ResultsAgent`) keeps that design honest — it is verified
   against real requirements, not guessed for four agents at once.
2. **M4 is the cheapest possible second use of every shared piece**, and should follow
   immediately: `CompetitionsAgent` reuses the *same* `results_rankings` `FactDomain` (§1.6) and
   the *same* Group-A evidence pattern (§1.3, no source columns on its target table) as
   `ResultsAgent` — zero new shared-design work, only a new agent file and one registry entry.
   Doing it right after M3, while that pattern is still fresh, is the fastest way to prove the
   scaffolding actually generalises before building on top of it further.
3. **M5 is where genuine novelty returns** — the first multi-sub-query agent, and the first agent
   for which "found nothing" is the expected common case rather than a near-failure. This is
   exactly the pattern §1.4's `meta.subQueries` field and the roadmap's own "empty is not an
   error" handling were anticipated for. Better to introduce that one new pattern once here.
4. **M6 immediately reuses M5's new pattern** rather than introducing a second one: three parallel
   sub-queries instead of two, using the same `meta.subQueries` field, and the already-existing
   `mapIntelligenceCategoryToFactDomain` adapter (§1.6) for its per-category source tiering — no
   new shared design, just one more consumer of what M5 just proved.

This ordering front-loads the two cheap, low-novelty milestones (M3, M4) to prove the shared
scaffolding, then lands the one genuinely new pattern (multi-sub-query agents) once in M5 and
reuses it immediately in M6 — rather than, for example, interleaving M5's novelty before M4 has
proven the scaffolding twice.

---

## Proceeding

Per the user's instruction, implementation now proceeds on **Milestone 3 only**, using the shared
architecture identified in §1. Milestones 4–6 are not implemented by this change and remain
separate, future, independently-approved work.
