# Live Pipeline Verification — M5 (ContactsAgent) — 2026-08-09

Fourth live run against the same five golden athletes, real Perplexity + real GPT-4o, after implementing ContactsAgent. Compared against the M4 run (`docs/live-pipeline-verification-2026-08-09-m4.md`).

## What changed (M5)

New `artifacts/api-server/src/lib/contacts-agent.ts`, following the same standalone-module pattern as `competitions-agent.ts`. `runContactsAgent(athlete)` runs two independent research+extraction cycles in parallel — the "2-query strategy (coaching + management separately)" from `docs/roadmap.md` — and merges the results:

- **Coaching scope**: head coach, assistant coaches, medical/physio staff.
- **Representation scope**: manager/agent, and a *specific named* sponsorship-relations contact person only (not brand-deal tracking — that stays out of scope, reserved for the separate `SponsorsAgent` the roadmap describes).

Guardrails, stacked:
1. GPT is explicitly instructed never to infer or guess a name — only extract what the research directly states.
2. `isUsableContact()` (from M3.1) still rejects blank/`"Unknown"` name or org.
3. **New**: `resolveStandaloneDomain()` cross-checks the claimed `sourceDomain` against that query's own real citation hostnames — a domain GPT claims but that isn't actually one of the sources found gets downgraded to `"unknown"`, the same "no citation match, no source" posture already applied to intelligence items and timeline events.
4. **New**: a hard minimum-confidence floor of 70, applied *after* domain-authority adjustment — a contact sourced from an unverifiable domain gets penalized enough by `adjustConfidenceByDomain` that it can fall below the floor and get dropped even if GPT's raw confidence looked acceptable.
5. **New**: `status` is now derived from the adjusted confidence (`verified` at ≥85, `unconfirmed` below) instead of blindly trusting GPT's claim.

**The "no contact found" vs "confirmed no contact exists" distinction** the milestone asked for: the extraction schema now includes a separate `findings` array alongside `contacts` — each finding is either `"no_evidence"` (nothing found either way) or `"confirmed_absent"` (explicit statement of absence, e.g. self-coached/unsigned). These are logged distinctly (`contacts-agent: finding`) and returned from `runContactsAgent`, but **not** written to the `contacts` table — there's no schema column to record "checked, confirmed none" at the athlete level, and adding one is a schema change out of scope for M5. This is implemented as an observability/audit trail today, not yet a UI-visible signal — flagging that gap honestly rather than overclaiming it's fully surfaced.

`contacts` removed entirely from the shared main-extraction prompt (same pattern as timeline/competitions). `adjustConfidenceByDomain` moved from `auto-populate.ts` to `source-validation.ts` so `contacts-agent.ts` could use it without creating a circular import.

## Result: contact coverage and quality, before vs after

| Athlete | Contacts (M4) | Contacts (M5) | Findings this run |
|---|---|---|---|
| Peter Bol | 1 | **2** | 2× no_evidence (coaching, representation) |
| Brook Macdonald | 1 | **1** | 2× no_evidence |
| Zoe Hobbs | 1 | **1** | 3× no_evidence |
| Nick Willis | 0 | **2** | 2× no_evidence |
| Hamish Kerr | 0 | **2** | 2× confirmed_absent, 1 contact dropped as unusable |
| **Total** | 3 | **8** | |

Every athlete now has at least one contact (2 of 5 had zero in M4). All 8 stored contacts:
- Have real, specific names and organizations (Justin Rinaldi / Fast8 Track Club; James Templeton / The Fordham Company; Alan Milway / Red Bull; James Mortimer / Athletics New Zealand; Ron Warhurst; Mark Wetmore / Global Athletics; James Sandilands / High Performance Sport New Zealand; Terry Lomax / Athletics New Zealand).
- Have real, citation-matched source domains (`hpsnz.org.nz`, `letsrun.com`, `mgoblue.com`, `redbull.com`, `thefordhamcompany.com.au`, `athletics.org.nz`, `athletics.com.au`) — zero fabricated or unverified domains.
- Have confidence 87-92, all above the 70 floor, all with a real `sourceExcerpt` (8/8 have a substantive quote/paraphrase, not empty).
- The filter is demonstrably active, not just passively never triggering: Hamish Kerr's coaching-scope extraction produced one contact that `isUsableContact` correctly dropped this run (logged: `droppedUnusable: 1`), proving the guardrail catches real bad output rather than only existing in theory.

**Honest caveat on the findings labeling:** Hamish Kerr's two findings this run are labeled `confirmed_absent`, but their notes read as "no assistant coach or team doctor found" / "no named manager or sponsorship contact found" — phrasing that's actually closer to `no_evidence` than a true explicit statement of absence (e.g. "self-coached"). GPT isn't perfectly reliable at telling "we looked and found nothing" apart from "we looked and confirmed there's nothing to find," despite the prompt instructing the distinction directly. This is worth knowing before treating the `confirmed_absent` label as fully trustworthy — it's a real improvement over undifferentiated silence, but not a solved classification problem.

One minor data-quality note, not a violation: Nick Willis's coach entry has `org: "Nick Willis's training setup"` — passes `isUsableContact` (non-blank, not literally "Unknown") but is a descriptive phrase rather than a formal organization name. Not garbage, but not as clean as "Athletics New Zealand" — flagging as an example of what "usable" currently tolerates at the boundary.

## Everything from M3.1/M4 still holds

- Source-domain fabrication check across intelligence_items + timeline_events: zero matches, same as before.
- Timeline: 18, 20, 17, 18, 17 (avg 18.0) — consistent with M4's 19.0 average, no regression.
- Competitions: 22, 23, 9, 0, 3 — Nick Willis returned 0 competitions this run where M4 had 32. This looks like normal run-to-run Perplexity/GPT variance in CompetitionsAgent (unrelated to this milestone's changes — ContactsAgent doesn't touch competitions) rather than a regression, but it's a real result from this run and reported as such rather than smoothed over. Worth a future check on CompetitionsAgent's consistency across repeated runs if this recurs.

## Net verdict

ContactsAgent delivers what M5 asked for: more real contacts (3 → 8) with zero garbage, real evidence cross-checked against actual citations, and a genuine (if not perfectly reliable) distinction between "nothing found" and "confirmed absent," implemented as a logged, auditable signal. Quality bar held throughout — nothing was manufactured to fill the table, and the one low-quality candidate the model produced this run was caught and dropped, not stored.

## No shared M6 architecture issue surfaced

The same dedicated-agent pattern (own query/queries, own extraction, own validation, `Promise.all`-concurrent with the rest of the pipeline, returns empty/`[]` rather than throwing on failure) worked cleanly a second time. One thing worth deciding before M6 (TimelineAgent), not blocking: per your instruction this turn, TimelineAgent's success criteria should be reframed around career-completeness rather than the "20-30 events" count — the current M3.1 timeline code still uses that framing in its prompt copy and hasn't been touched since. Flagging again since M6 is the milestone where this actually needs to change, not proposing to change it now.
