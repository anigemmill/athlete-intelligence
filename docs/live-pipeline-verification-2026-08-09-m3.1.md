# Live Pipeline Verification — M3.1 Correction — 2026-08-09

Second live run of `auto-populate.ts` against the same five golden athletes (Peter Bol, Brook Macdonald, Zoe Hobbs, Nick Willis, Hamish Kerr), real Perplexity + real GPT-4o, after the M3.1 fixes below. Compared directly against `docs/live-pipeline-verification-2026-08-09.md` (the pre-fix run).

## What changed (M3.1)

1. **Citation extraction fixed** — `researchAthleteWithPerplexity()` and the new `researchCareerTimeline()` now read `message.annotations[].url_citation.url` instead of the nonexistent top-level `citations` field.
2. **Unbypassable source validation** — new `source-validation.ts`. `resolveSourceAttribution()` only keeps a `sourceUrl` if it exactly matches (mod trailing slash) a real citation URL from that call's own Perplexity response, and derives `sourceDomain` from that URL's real hostname — never from GPT's separate claim. Zero citations → source forced to `null`/`"unknown"`, no exceptions. `sanitizeStandaloneDomain()` applies the same fabrication rejection to contacts, which have no URL field to cross-check.
3. **`adjustConfidenceByDomain()` wired in** — now called for every intelligence item, timeline event, and contact before insert.
4. **Contacts filtered** — `isUsableContact()` drops any contact with a blank or literal `"Unknown"` name/org before insert.
5. **Dedicated timeline retrieval** — new `researchCareerTimeline()` (a second, focused Perplexity query) + `extractCareerTimeline()` (a dedicated GPT-4o call with its own 8192-token budget), replacing the old approach where `timeline_events` was one of five arrays sharing a single extraction call's budget.
6. **PB/SB cross-validation implemented** — new `performance-marks.ts`. `crossValidatePerformanceMarks()` parses both marks, nulls anything unparseable or mismatched in kind, and corrects `personalBest = seasonBest` when season-best is objectively better.

No schema changes, no route changes, no agentic redesign — same scope as proposed.

## Headline result: the citation bug is fixed and verified live

| Athlete | Pass | citationCount (before) | citationCount (after) |
|---|---|---|---|
| Peter Bol | main / timeline | 0 | **8 / 10** |
| Brook Macdonald | main / timeline | 0 | **8 / 8** |
| Zoe Hobbs | main / timeline | 0 | **10 / 10** |
| Nick Willis | main / timeline | 0 | **10 / 9** |
| Hamish Kerr | main / timeline | 0 | **9 / 8** |

Every run now receives real citations on both Perplexity calls. Confirmed downstream: across all 126 intelligence-item + timeline-event rows written this run, **124 have a real, citation-verified `sourceUrl`** (up from a small minority before), and **zero rows have a fabricated domain** — no `example.com`, no `example.org`, no `sourceN`, no `[N]`, no invented URLs. The only `source_domain: "unknown"` cases (2 of 126) are Zoe Hobbs items where GPT's claimed URL didn't match any real citation and was correctly nulled rather than trusted.

## Confidence adjustment — proof it's active

| Domain tier | Rows | Avg confidence | Range |
|---|---|---|---|
| High-authority (worldathletics.org, olympics.com, reuters.com) | 20 | **95.3** | 90–97 |
| Low-authority (youtube.com, facebook.com) | 5 | **80.4** | 75–85 |
| Unresolved (`unknown` — source rejected) | 2 | **57.5** | 55–60 |
| Other real domains | 99 | 91.3 | 85–97 |

Unverifiable items now land 30+ points below high-authority-sourced items. Before this fix, every score was raw, unadjusted GPT output regardless of source quality.

## Contacts — garbage filtering confirmed

All 3 contacts stored this run have complete, real `name` and `org` values (Justin Rinaldi / Peter Bol Training Group; Ivan Mennim / Red Bull; James Mortimer / Athletics New Zealand). Zero contacts with blank or `"Unknown"` fields were written — no `dropped contacts` log lines fired this run because GPT didn't produce any garbage this time, but the filter is in place and unit-testable independent of model behavior. Nick Willis and Hamish Kerr still returned zero contacts (extraction gap, not a filtering failure) — this is the known Priority 3 issue, explicitly out of scope for M3.1 per the plan (real fix is `ContactsAgent`).

## PB/SB

No inversion occurred in either run, so cross-validation didn't need to correct anything this time — but the mechanism now actually exists and runs on every call, rather than being assumed-safe because one run happened not to reproduce the bug. Peter Bol got a real PB this run (`1:42.55`, SB `1:43.70`, correctly PB faster than SB) where the pre-fix run had left PB null.

## Timeline — retrieval strategy change, measured result

| Athlete | Before | After | Target |
|---|---|---|---|
| Peter Bol | 3 | **13** | 20–30 |
| Brook Macdonald | 3 | **20** | 20–30 |
| Zoe Hobbs | 10 | **19** | 20–30 |
| Nick Willis | 6 | **16** | 20–30 |
| Hamish Kerr | 9 | **15** | 20–30 |
| **Average** | **6.2** | **16.6** | 20–30 |

2.7x improvement, and Brook Macdonald now lands inside the target range. Nobody regressed. Still short of 20–30 for 4 of 5 athletes — the dedicated query and budget helped substantially but didn't fully close the gap; the remaining shortfall looks like a genuine research-depth ceiling (how much dated, citable history Perplexity Sonar actually surfaces per query) rather than a token-budget ceiling anymore, since the dedicated call has 8192 tokens to itself and none of the five used anywhere near that for 13-20 events. Brook Macdonald's competitions count also jumped to 28 (from 0) — the dedicated timeline query appears to have pulled in a lot of real competition history that the general pass had missed entirely.

## Net verdict

This is a materially different, more trustworthy pipeline than the one verified on 2026-08-09, not just a pipeline that happens to pass the same five test cases:

- The core evidence-integrity bug (citations never reaching extraction) is fixed and reproducible — verified live across 10 separate Perplexity calls (2 per athlete × 5).
- Fabrication that occurred in the first run (fake domains, an invented URL, "Unknown" contacts) did not recur, and can't recur silently now — the validation layer would strip it even if a future model response tried it again, since it doesn't rely on the model behaving.
- Confidence scores now carry real signal about source quality.
- Timeline coverage improved substantially (2.7x) though not fully to target — flagging this honestly rather than declaring it solved, per the standing instruction not to just make the test pass.

Recommended before M4: none of these are blocking — Priority 3 (contacts) and full timeline-target coverage remain open and are reasonable to carry into the Task #27 agentic redesign (`ContactsAgent`, dedicated per-year retrieval) rather than pushed further here.
