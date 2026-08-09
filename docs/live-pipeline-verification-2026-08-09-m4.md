# Live Pipeline Verification — M4 (CompetitionsAgent) — 2026-08-09

Third live run against the same five golden athletes, real Perplexity + real GPT-4o, after implementing CompetitionsAgent. Compared against the M3.1 run (`docs/live-pipeline-verification-2026-08-09-m3.1.md`).

## What changed (M4)

New `artifacts/api-server/src/lib/competitions-agent.ts` — the first genuinely separate retrieval agent (not just a second function pair inlined into `auto-populate.ts`, unlike the M3.1 timeline split). `runCompetitionsAgent(athlete)` owns its full research → extraction → validation lifecycle and returns clean rows; `auto-populate.ts` just calls it and inserts the result. It runs concurrently with the other three parallel calls (general research, timeline research, Wikipedia photo) rather than after the main GPT-4o extraction.

- **Dedicated Perplexity query** asking specifically for named, identifiable competitions (not a generic career narrative).
- **Dedicated GPT-4o extraction**, own 8192-token budget, `competitions` removed entirely from the shared main-extraction prompt (same pattern as pulling `timeline_events` out in M3.1).
- **`isGenericMeetName()`** — rejects meet names under 8 characters, or names that reduce to nothing but generic filler words ("Competition", "Event", "Race"...) after stripping a year. "2024 Competition" → strips to "Competition" → rejected. "UCI Mountain Bike World Cup" → survives, since "UCI"/"Mountain"/"Bike"/"World"/"Cup" aren't filler words.
- Invalid dates are also dropped, same as the timeline agent.
- Runs are logged (`dropped invalid competition entries`) whenever anything gets filtered, so this is auditable — not silently permissive.

**Not in scope for M4, left alone:** `result-backfill.ts`'s separate 15-character fuzzy meet-name matcher (Priority 5's other root cause) — that module still exists and still has the same fuzzy-match logic. CompetitionsAgent producing better meet names at initial-population time should reduce how often backfill needs to run and how often its matcher fails, but the matcher itself wasn't touched.

## Result: competition coverage and quality, before vs after

| Athlete | Competitions (M3.1) | Competitions (M4) | Sample of stored meet names |
|---|---|---|---|
| Peter Bol | 5 | **24** | (not re-inspected in detail — see Brook Macdonald below for representative quality) |
| Brook Macdonald | 26 | **26** | "Junior World Championships", "UCI World Cup — Fort William", "iXS European Downhill Cup #2, Todtnau", "Mercedes-Benz UCI Downhill Mountain Bike World Cup — Val d'Isère", "Crankworx Rotorua" |
| Zoe Hobbs | 7 | **36** | — |
| Nick Willis | 13 | **32** | — |
| Hamish Kerr | 6 | **14** | — |
| **Total** | 57 | **132** | |

Zero generic meet names made it into the database this run — verified two ways: (1) the agent's own drop-counter logged nothing to drop (GPT complied with the dedicated, single-purpose prompt), and (2) an independent SQL sanity check re-ran the same generic-name pattern against every stored row after the fact and found nothing that should have been rejected. Every sampled name (see Brook Macdonald above) is a specific, real, identifiable competition — exactly the failure mode Priority 5 documented ("2024 Competition", "UCI MTB World Series") does not reproduce here.

**Caveat, stated plainly:** row count isn't the same as distinct-event count. Brook Macdonald's 26 rows are only 23 distinct meet names; Zoe Hobbs's 36 rows are only 16 distinct names (e.g. "Diamond League" recurs across different years). That's not fabrication — Diamond League genuinely is a real, recurring series an athlete competes in multiple times — but it does mean some of the count increase is legitimate repeat appearances at the same named series rather than 26-36 unique competitions. Worth knowing before treating the raw count as a quality score.

## Everything from M3.1 still holds

- Source-domain fabrication check (intelligence_items + timeline_events): **zero** `sourceN`/`example.com`/`example.org` matches, same as M3.1.
- CompetitionsAgent's own Perplexity calls: 10/10/10/10/10 real citations across all five athletes (citation fix from M3.1 applies here too, since it's the same underlying `openrouter` client pattern).
- Timeline events: 16, 27, 16, 20, 16 (avg 19.0) — not regressed by the parallelization change, slightly better than M3.1's 16.6 average.
- Contacts: unaffected (still 1/5 athletes with a contact this run — Priority 3 remains open, as expected; out of scope for M4).

## Net verdict

CompetitionsAgent measurably fixes what it was built to fix: competition coverage more than doubled (57 → 132 rows across the five athletes) and the specific failure mode in Priority 5 — generic, unusable meet names reaching the database — did not occur in this run, with both agent-side and independent verification confirming it. This is the same "verify, don't assume" standard applied in M3.1: the improvement is measured against real API output, not asserted from the code change alone.

## No shared M5/M6 architecture issue surfaced

Nothing about implementing CompetitionsAgent as a standalone module exposed a problem that would block or reshape ContactsAgent (M5) or TimelineAgent (M6, if planned next). The pattern — dedicated research query, dedicated extraction call, dedicated validation, called from a `Promise.all` in `auto-populate.ts`, returns `[]` on failure rather than throwing — worked cleanly and should generalize directly to the remaining agents. One thing worth deciding before M6 specifically (not blocking, just flagging per your instruction): the current `TimelineAgent`-equivalent code from M3.1 still targets a "20-30 events" framing in its prompt copy. Per your refinement this turn, that should be rewritten around career-completeness rather than a count target before M6 formalizes it — noted for that milestone, not something this M4 change touches.
