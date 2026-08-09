# Live Pipeline Verification — M6 (TimelineAgent) — 2026-08-09

Fifth live run against the same five golden athletes, real Perplexity + real GPT-4o, after implementing TimelineAgent. Compared against the M5 run (`docs/live-pipeline-verification-2026-08-09-m5.md`).

## What changed (M6)

New `artifacts/api-server/src/lib/timeline-agent.ts`, replacing the M3.1 inline `researchCareerTimeline`/`extractCareerTimeline` functions in `auto-populate.ts` with a standalone module — same pattern as CompetitionsAgent (M4) and ContactsAgent (M5).

**The core change is a reframing, not a new filter.** The M3.1 prompt explicitly asked for "20-30 events... aim for as many distinct, real, dated events as the record genuinely supports" — a target framing, even with the "genuinely supports" hedge. The M6 prompt removes the count target entirely:

- System prompt now opens with the stated guiding principle directly: *"quality over quantity, evidence over completeness, unknown over invented... you are not trying to hit a target number of events."*
- Research query asks for career-phase progression (junior/development → breakthrough → peak → current) and explicitly: *"If a period of their career has no documented events, say so rather than inventing filler."*
- Extraction prompt: *"A long, richly documented career may need far more than 30 events; a short or sparsely documented one may genuinely only support a handful. Do not pad toward any particular count in either direction."*
- The old 20-30 figure survives only as `INVESTIGATIVE_DEPTH_BENCHMARK = 12` — a code-level constant that triggers an **info-level log**, not a rejection or retry, when the validated result falls below it. It's a "might be worth a look" signal, never enforced.

**New code-level guardrails**, consistent with the M4/M5 pattern:
- Exact-duplicate rejection: events with the same date and the same normalized title are dropped — "do not pad with duplicate events" enforced in code, not left to the prompt alone.
- A minimum-confidence floor of 70 after domain-authority adjustment (same as ContactsAgent's M5 floor) — an event sourced from an unverifiable domain can now be dropped outright rather than stored at a low score.
- `sourceUrl`/`sourceDomain` still cross-checked against real citations via `resolveSourceAttribution` (unchanged from M3.1).

## Result: timeline counts, before vs after

| Athlete | Timeline events (M5) | Timeline events (M6) | Below investigative-depth benchmark (12)? |
|---|---|---|---|
| Peter Bol | 18 | **7** | Yes — logged, not treated as an error |
| Brook Macdonald | 20 | **13** | No |
| Zoe Hobbs | 17 | **17** | No |
| Nick Willis | 18 | **10** | Yes — logged, not treated as an error |
| Hamish Kerr | 17 | **13** | No |
| **Average** | **18.0** | **12.0** | |

**The count dropped — this is the expected result of the reframing, not a regression.** Critically, the drop is *not* primarily driven by more aggressive rejection: across all five runs, only one (an earlier diagnostic run for Nick Willis, discussed below) triggered the "dropped invalid/duplicate/low-confidence" warning. In the reported runs, GPT itself is simply returning fewer, more selective events under the new instructions — the model is doing less padding, not being filtered down after the fact.

**Qualitative check, not just counting rows** — Peter Bol's 7 events, in full:

| Date | Title | Category | Significant |
|---|---|---|---|
| 2012 | Inter-School Athletics Carnival | competition | yes |
| 2013 | Australian Junior Championships | competition | yes |
| 2015 | Relocation for Training | career | yes |
| 2016 | Rio 2016 Olympic Games | competition | yes |
| 2020 | Tokyo 2020 Olympic Games | competition | yes |
| 2021 | Australian 800m Record | competition | yes |
| 2024 | Profile Feature on Motivation | media | no |

This is a coherent 12-year career arc — junior competition → junior championship → a genuine career decision (relocating for training) → two Olympic appearances → a national record → a recent media feature — not a truncated or padded list. Exactly the "career completeness for this individual athlete" outcome the milestone asked for, not a number.

## Diagnostic aside: one run demonstrated the guardrails catching real bad output

Before the reported run, an earlier Nick Willis run produced 13 raw events from GPT-4o, of which **11 were dropped as invalid** (bad date or empty title) and only 2 were kept. Dumping the raw model output confirmed this wasn't an over-strict validator — GPT genuinely returned malformed data for most entries in that specific run (LLM non-determinism; a second run for the same athlete produced 10 clean events, all 10 with dates in valid ISO-8601 format and all 10 `sourceUrl` values exactly matching real Perplexity citations). This is reported as evidence the validation layer does real work, not just theoretical protection — same posture as M5's Hamish Kerr `droppedUnusable: 1` finding.

## Everything from M3.1/M4/M5 still holds

- Source-domain fabrication check across intelligence_items + timeline_events: zero matches.
- Timeline event confidence: 75-97 (avg 90.6) across the reported run — all above the new 70 floor.
- No duplicate (date, title) pairs within any athlete's timeline — verified independently via SQL, not just trusting the in-process dedup.
- Contacts (M5) and competitions (M4) protections unaffected: fabrication-free, garbage-filtered, evidence-checked.

## Net verdict

TimelineAgent now optimizes for the thing the milestone actually asked for — a timeline that fits the athlete, not a row count. The lower average (18.0 → 12.0) is the intended signature of that change, and the qualitative check (Peter Bol's 7-event arc) supports that the drop reflects real selectivity rather than lost coverage. Quality > quantity, evidence > completeness, unknown > invented — held throughout, including in the one run that stress-tested it with genuinely bad model output.

## Stopping here, per instruction

Not proceeding beyond M6. All five agents implemented so far (ResultsAgent-equivalent logic remains inline in `auto-populate.ts`'s athlete_stats block; CompetitionsAgent, ContactsAgent, and TimelineAgent are now standalone modules) are committed and verified live. Awaiting review before any further milestone.
