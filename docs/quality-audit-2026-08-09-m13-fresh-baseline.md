# Fresh Full-Pipeline Quality Audit — M13 — 2026-08-09

**Purpose:** Replace the obsolete pre-redesign 59/100 baseline with a genuinely measured Intelligence Quality Score (IQS) for the complete, now-finished 8-agent pipeline (Task #27, M3.1–M12). This is a **product-quality audit, not an engineering milestone** — no code was changed during this audit (see "Ground rules" below).

**Method:** A fresh, real, unmocked run of the full pipeline (`autoPopulateAthlete`) against the same 5 golden athletes used throughout this project (Peter Bol, Brook Macdonald, Zoe Hobbs, Nick Willis, Hamish Kerr), immediately followed by a full read of every row written across all 5 tables (`athletes`, `intelligence_items`, `timeline_events`, `contacts`, `competitions`) and a structured evaluation against the 15 dimensions requested.

**Ground rules honored:** no pipeline code was modified during this audit. One systemic defect was found (competition status/date logic — see Problem #1 below); per instructions, it is **reported, not silently fixed**. This audit measures the pipeline as it stands after M12, warts included.

---

## Overall Intelligence Quality Score (IQS)

# **82 / 100**

| Athlete | IQS |
|---|---|
| Peter Bol | 83 |
| Brook Macdonald | 83 |
| Zoe Hobbs | 82 |
| Nick Willis | 83 |
| Hamish Kerr | 81 |

Notably even across all five — no athlete is a dramatic outlier, which is itself a signal: the pipeline's behavior is consistent rather than lucky on any one profile.

---

## Comparison to the old 59/100 baseline

**Directionally: a real, large improvement.** All 5 issues the original audit cited as the basis for 59/100 (`docs/technical-debt.md`) are confirmed fixed in this fresh run:
1. Citation index leak (`source4`, `[8]`) — **zero occurrences** in ~2,300 evaluated rows.
2. PB/SB inversion — **zero occurrences**; Peter Bol specifically (the athlete named in the original bug) now shows a correctly-ordered PB 1:42.55 / SB 1:43.64.
3. Contact extraction failure ("4/5 athletes have zero contacts") — **all 5 athletes now have at least 1 contact**, one has 5.
4. Below-target timeline/intelligence counts — reframed as an investigative-depth benchmark rather than a hard target (M6/M11); counts observed this run (9–18 timeline events, 13–27 intelligence items) are healthy and, more importantly, every item is genuinely specific rather than padded.
5. Competition backfill failing on generic meet names — **zero generic meet names** found in 83 competition rows.

**A like-for-like numeric comparison is not fully possible, and I want to be upfront about why rather than imply false precision:**
- The original 59/100 (`docs/technical-debt.md`, "Platform Quality Score") is a set of 5 per-athlete scores with a one-line "biggest gap" label each — no documented rubric, dimension list, or weighting survives in the repo. I cannot reproduce its exact formula.
- This audit instead defines a new, fully transparent 15-dimension weighted rubric (below) built specifically from the list requested for this audit. It should be treated as the **new baseline going forward**, not a continuation of the old formula.
- Both scores are based on a single run per athlete (n=1) — this audit does not resolve the old score's susceptibility to per-run research variance, and neither should future comparisons assume single-run scores are perfectly stable (see "Genuine defects vs. research variance" below).

**Net honest read:** the underlying trust backbone of the platform — evidence, citations, confidence calibration, absence of fabrication — is now genuinely strong (all score 93–98/100 on their respective dimensions below). The gap between 82 and a much higher number is concentrated in a small number of specific, well-understood weaknesses (below), not smeared evenly across the whole system. That is a materially different, healthier failure mode than 59/100's "structural bugs affecting every athlete."

---

## Methodology

Each of the 15 requested dimensions was scored 0–100 per athlete from the actual data written this run (SQL-level checks: fabrication regex, duplicate detection, domain/URL cross-checks, confidence-floor checks, date-logic checks) plus a qualitative read of a content sample (titles/summaries/descriptions) for specificity and plausibility. Dimensions are weighted by how directly they bear on **trustworthiness** (the platform's stated core promise) versus **completeness**, per the standing principle "evidence > completeness":

| # | Dimension | Weight |
|---|---|---|
| 1 | Evidence / source validity | 10% |
| 2 | Citation matching | 7% |
| 3 | Confidence quality | 7% |
| 4 | PB/SB consistency | 5% |
| 5 | World/national ranking validity | 5% |
| 6 | Competition completeness & specificity | 7% |
| 7 | Career timeline quality/completeness | 7% |
| 8 | Contact quality and evidence | 6% |
| 9 | Sponsorship quality/freshness | 5% |
| 10 | Social profile accuracy | 4% |
| 11 | Social metric accuracy/freshness | 4% |
| 12 | Biography accuracy | 4% |
| 13 | Intelligence/news quality | 13% |
| 14 | Duplicate/fabricated/placeholder data | 12% |
| 15 | Data freshness | 4% |

**Caveats, stated plainly:**
- *Social profile accuracy (10) and biography accuracy (12)* are scored against structural validity (real handle format, no placeholders, honest nulls) and internal consistency, **not** against independently verified live social-media/public-record data — this audit has no live social-lookup or web-browsing tool. Treat these two dimensions as a lower-confidence read than the others.
- *PB/SB consistency (4)* scores purely the absence of a logical violation (SB faster than PB), independent of whether both fields were populated — completeness of marks is a separate, unscored observation noted in the per-athlete write-ups.
- All scores come from **one fresh run per athlete**. Perplexity's live research is not deterministic; a rerun would plausibly move individual dimension scores by several points without any code change, as documented repeatedly across M7–M12's verification reports. This is discussed explicitly wherever it's relevant to a specific finding.

---

## Per-dimension scores (0–100)

| Dimension | Bol | Macdonald | Hobbs | Willis | Kerr |
|---|---|---|---|---|---|
| Evidence/source validity | 96 | 98 | 98 | 98 | 98 |
| Citation matching | 95 | 95 | 95 | 95 | 95 |
| Confidence quality | 90 | 92 | 90 | 92 | 91 |
| PB/SB consistency | 100 | 100 | 100 | 100 | 100 |
| Ranking validity | 72 | 72 | 72 | 72 | 72 |
| Competition completeness/specificity | 70 | 72 | 92 | 38 | 58 |
| Timeline quality/completeness | 78 | 85 | 75 | 72 | 75 |
| Contact quality/evidence | 85 | 78 | 65 | 85 | 92 |
| Sponsorship quality/freshness | 75 | 88 | 40 | 80 | 40 |
| Social profile accuracy | 85 | 50 | 65 | 85 | 65 |
| Social metric accuracy/freshness | 20 | 20 | 20 | 20 | 20 |
| Biography accuracy | 90 | 70 | 90 | 90 | 90 |
| Intelligence/news quality | 90 | 90 | 85 | 90 | 90 |
| Duplicate/fabricated/placeholder | 93 | 98 | 98 | 98 | 98 |
| Data freshness | 45 | 55 | 90 | 80 | 50 |
| **Weighted IQS** | **83** | **83** | **82** | **83** | **81** |

---

## Top 5 remaining quality problems

Ranked by real-world visibility and severity to a user looking at the product, not by how interesting they are to fix.

### 1. Competition status is wrong for ~25–33% of rows on 3 of 5 athletes (genuine defect — reproducible, not variance)

`competitions.status` ("upcoming" vs "completed") is entirely GPT-assigned in the extraction prompt (`competitions-agent.ts`, "Status: 'upcoming' for future dates, 'completed' for past dates") with **no code-level check against the row's own `date` field**. Result, found directly in this run's data:

| Athlete | Rows marked "upcoming" with a date in the past AND a filled-in result |
|---|---|
| Peter Bol | 6 of 20 (30%) — e.g. "Olympic Games — Paris", dated 2024-07-26, status `upcoming`, result "7th in heat 1:47.50, 4th in repechage 1:46.12" |
| Brook Macdonald | 6 of 24 (25%) |
| Hamish Kerr | 2 of 6 (33%) — e.g. "Olympic Games", dated 2024-08-10, status `upcoming`, result "1st, 2.36 m" |
| Zoe Hobbs | 0 of 32 |
| Nick Willis | 0 of 1 |

This is a real, evidenced code defect, not research variance — it reproduces across 3 independent athletes in the same run and has an identifiable root cause (no deterministic `status = date > today ? "upcoming" : "completed"` check exists anywhere in the write path). **This is the single most visible problem in the product today**: a "Competition Calendar" feature (per `docs/roadmap.md`) showing an athlete's actual Olympic medal as an "upcoming" event is the kind of error a first-time user notices in seconds and immediately distrusts the whole platform over. Recommend fixing in code (derive `status` deterministically from `date`, not from the model) before any user demo.

### 2. Follower counts display as "0" instead of "unknown" for every athlete (genuine defect — schema limitation)

All 5 athletes show `instagramFollowers`/`twitterFollowers`/`tiktokFollowers` = 0, even the 3 athletes with a validated handle. This is not SocialMetricsAgent fabricating zero — its own logs this run confirm it correctly returned `null` for every follower count on every athlete (no evidence found this run). The problem is downstream: the `athletes` table's follower columns are `integer NOT NULL DEFAULT 0`, so there is no way to store "unknown" — `null` collapses to the pre-existing default of 0 at write time. **To a user, "0 followers" on a professional athlete's Instagram reads as broken, not as "we don't know."** This is a schema-level fix (nullable follower columns, or a separate "verified" flag), not an agent-logic fix — SocialMetricsAgent is already behaving correctly.

### 3. Sponsorship and social-profile coverage is a hard 0 for specific athletes (uncertain — flagged, not confirmed as systemic)

Zoe Hobbs and Hamish Kerr — both prominent, actively-sponsored current athletes (Commonwealth Games gold medalist; reigning Olympic and World high jump champion) — returned **zero** sponsorship items this run, and Brook Macdonald returned **zero** social handles despite having a well-documented Red Bull relationship elsewhere in the same run's data. Each agent behaved honestly (no evidence found → nothing stored, no guessing), so this is not a fabrication risk. But it is a real completeness gap for exactly the athletes where a B2B client would most expect this data to exist. **This audit cannot determine from a single run whether this is a genuine, repeatable weakness in SponsorsAgent's/SocialProfilesAgent's research query for certain sports, or ordinary Perplexity research variance** (see the discussion of run-to-run variance already documented in M7–M12). Recommend re-running these 2–3 athletes independently before concluding it needs a code fix.

### 4. National ranking is empty for all 5 athletes (uncertain — pipeline gap or real-world data scarcity)

`nationalRank` is `null` for all 5 athletes despite `results-agent.ts`'s prompt explicitly requesting it ("current national ranking"). Correctly represented as unknown rather than guessed, but a 100% miss rate across 5 athletes across 3 different countries and 3 different sports is a pattern worth investigating: it may mean formal national rankings genuinely aren't commonly published/searchable for these sport/event combinations (plausible for downhill MTB; less obviously so for athletics events in NZ, which does publish rankings), or it may mean the extraction prompt/research query isn't surfacing this field reliably. This audit cannot distinguish between those two explanations from data alone.

### 5. One future-dated, logically-impossible `publishedAt` value (minor, genuine, narrow-scope defect)

One intelligence item (Peter Bol, "2015-2026 Coaching Stability", `career_changes`) has `publishedAt = 2026-12-31` — after today's date (2026-08-09). The underlying claim is real and well-cited (athletics.com.au), but the date field is nonsensical: it's a durational claim ("since 2015... throughout his career") with no single true "occurrence" date, and the model appears to have picked the end of a year range rather than a real report date. `isValidDate()` checks calendar-format validity but not "not in the future." Found once in ~2,300 rows evaluated across all 5 tables — narrow in scope, but reproducible in principle for any other "ongoing since X" claim. Worth a small validation addition (reject or flag a `publishedAt` after "today") in a future milestone.

---

## Genuine product/data-quality problems vs. normal research variance

**Confirmed genuine defects (reproducible, code- or schema-level, not explained by research variance):**
- Problem #1 (competition status/date logic) — reproduces across 3 athletes with an identifiable root cause in code.
- Problem #2 (follower-count 0-vs-unknown) — a schema property, will reproduce on every run regardless of what SocialMetricsAgent finds.
- Problem #5 (future-dated `publishedAt`) — a real gap in `isValidDate()`'s validation scope, though low-frequency.

**Likely or possibly research variance (flagged, not confirmed without a repeat run):**
- Problem #3 (sponsorship/social-profile zeros for specific athletes) — could be a real per-sport weakness or could flip on a rerun; M7–M12's reports repeatedly documented single-run count swings of this magnitude with no code changes between runs.
- Problem #4 (national ranking 100% miss) — could be real-world data scarcity for these sports rather than a pipeline defect.
- Nick Willis's single competition row this run (vs. 20–31 in prior M8/M10/M11/M12 runs of the same athlete) — directly consistent with the exact kind of run-to-run Perplexity research variance already investigated and documented for this same athlete/field in the M12 report; not treated as a new finding.
- Minor per-athlete count differences throughout (intel/timeline/contact counts moving by a handful between this run and M12's) — normal variance, not evaluated as defects.

---

## Per-athlete strengths and weaknesses

**Peter Bol — 83/100.** Strengths: excellent intelligence narrative (correctly covers the real 2023 doping-suspension episode with accurate framing), correctly-ordered PB/SB (1:42.55/1:43.64 — directly resolves the exact historical bug named in `docs/technical-debt.md`), strong media coverage (BBC, 7News). Weaknesses: worst offender on competition status/date logic (6/20 rows wrong), the one future-dated item in this audit, thin sponsorship coverage (1 item).

**Brook Macdonald — 83/100.** Strengths: by far the best sponsorship coverage of the five (13 well-sourced, appropriately-decayed items — Red Bull, Shimano, Fox, Evil Bikes, and more), strong timeline category diversity (career/competition/personal all represented). Weaknesses: zero social handles found despite a well-documented Red Bull relationship, second-worst on the competition status bug (6/24), no age recorded.

**Zoe Hobbs — 82/100.** Strengths: cleanest competitions data of the five (32 rows, zero status/date contradictions, 12-year span), strong biography accuracy. Weaknesses: zero sponsorship items despite being a current Commonwealth Games champion, only 1 contact, no Twitter/TikTok found, timeline events are 100% "competition" category (no media/career/personal diversity).

**Nick Willis — 83/100.** Strengths: cleanest freshness/status data (no contradictions), good contact coverage (coach + agent, both well-sourced), solid historical sponsorship record (Reebok, adidas, Tracksmith, correctly presented as past/expired deals). Weaknesses: severe competition under-coverage this run (1 row, vs. 20–31 in every prior verification run of this same athlete — a clear single-run anomaly, not a new defect), no world ranking found (plausible for a 43-year-old veteran runner).

**Hamish Kerr — 81/100.** Strengths: best contact coverage of the five (5 contacts — full support team: coach, bio-mechanic specialist, S&C coach, mental skills coach — with an honest "unconfirmed" status on the least-certain one), strong intelligence narrative. Weaknesses: lowest overall score, driven by zero sponsorship items (surprising for a reigning Olympic and World champion), thin competition coverage (6 rows) with 2 of them hitting the status bug, single Instagram handle only.

---

## Recommendation

**Is the intelligence good enough to show to a small group of real users? Conditionally yes — after one narrow, fast fix, not before.**

The core trust backbone the platform is sold on — real citations, no fabrication, calibrated confidence, specific and well-sourced intelligence narrative — is genuinely strong across all 5 athletes (93–98/100 on evidence validity and duplicate/fabrication checks; 85–90/100 on intelligence/news quality). That is the hard part, and it is done. An 82/100 measured score, built from a transparent and now fully-documented rubric, comfortably clears the original roadmap's own 76–80 projection.

But Problem #1 (competition status/date logic) is not a subtle data-quality nuance — it is a visibly, obviously wrong label on real historical results (an Olympic result marked "upcoming") that any user, in the first few seconds of looking at a dossier, would notice and lose confidence over. Showing the product to real users with this bug live risks the wrong first impression on exactly the trust dimension the platform is supposed to win on. Problem #2 (0-vs-unknown followers) is a close second for the same reason — it looks like the product doesn't know a basic fact rather than that the fact isn't published anywhere.

**Recommended next stage:** fix Problem #1 (derive `status` from `date` in code, not from the model — a small, contained change to `competitions-agent.ts`'s write path) and Problem #2 (either nullable follower columns or a "not verified" display state in the UI) before putting this in front of real users. Both are narrow, well-understood, low-risk fixes — not new pipeline milestones. Problems #3 and #4 are worth a quick repeat-run check (re-run Hobbs/Kerr/Macdonald once more to see if the sponsorship/social gaps persist) but shouldn't block a small pilot group, since they fail safely (honest absence, not wrong data). Problem #5 is low priority given its single occurrence. Once #1 and #2 are addressed, this pipeline is ready for a small real-user pilot on its current merits.
