# Fresh Full-Pipeline Quality Audit — M14 (post-fix) — 2026-08-09

Follow-up to the M13 audit (`docs/quality-audit-2026-08-09-m13-fresh-baseline.md`), after implementing the two blocking fixes it identified. Same method: a fresh, real, unmocked run of the full pipeline against the same 5 golden athletes, same 15-dimension rubric and weights as M13, for a direct like-for-like comparison.

## What changed since M13

**Fix 1 — competition status is now deterministic from the date, never from GPT.** New shared helper `competition-status.ts`'s `deriveCompetitionStatus(date, today)` is the single source of truth (`date <= today` → `completed`, else `upcoming`). `competitions-agent.ts` no longer reads or stores the model's own `status` claim at all — it wasn't just deprioritized, the field was removed from the extraction schema entirely. The three other consumers that read competition status independently of the already-corrected `/competitions` API route — `routes/summary.ts` (feeds the AI-generated narrative) and `routes/chat.ts` (the analyst's `get_athlete_competitions` tool) — were also fixed to use the same shared helper, since both read the raw table directly and would otherwise have kept surfacing stale statuses in AI-generated text even after the write-path fix. `routes/competitions.ts`'s existing read-time correction was refactored to call the same shared helper rather than duplicating the comparison logic a third time.

**Fix 2 — follower counts preserve null/unknown instead of collapsing to 0.** `instagram_followers`/`twitter_followers`/`tiktok_followers` changed from `integer NOT NULL DEFAULT 0` to nullable integer columns (schema, OpenAPI spec, and regenerated `api-zod`/`api-client-react` all updated together — `pnpm --filter @workspace/api-spec run codegen` then `pnpm --filter @workspace/db run push`). `auto-populate.ts` now writes exactly what `SocialMetricsAgent` found this run (a number or `null`) instead of skipping the field when null (which previously left a fresh row at its schema-default 0). `DossierPage.tsx`'s follower display was changed from a truthy check (`p.followers ? ... : "Add follower count"`, which could never distinguish a real 0 from unknown) to an explicit `!= null` check, so a genuine 0 would display as "0" and an unverified count shows "Not verified — add follower count" instead. The manual social-edit form's save handler was also fixed to send `null` instead of `0` for a blank input (this turned out to be currently inert — see caveat below — but was fixed for consistency since it's directly adjacent code already being changed). While making typecheck pass after the schema change, a genuine pre-existing spec/implementation drift was found and fixed: `routes/athletes.ts`'s PATCH handler already read `avatarUrl`/`instagramFollowers`/etc. from the request body, but the OpenAPI spec's `AthleteUpdate` schema never declared those fields, so they were silently stripped by validation before reaching the handler — the manual social-edit UI's "Save" button has likely never actually worked. Added the missing fields to the spec to match the handler's actual (and evidently long-intended) behavior; this is a byproduct of restoring spec/implementation consistency, not new scope.

**No pipeline research/extraction logic was touched.** No new intelligence agent, no expanded scope — exactly the two fixes requested.

## Direct verification of both fixes

**Fix 1:** `SELECT * FROM competitions WHERE status='upcoming' AND date < today` → **0 rows** (previously 14 rows across 3 athletes in M13). `SELECT * FROM competitions WHERE status='upcoming' AND result IS NOT NULL` → **0 rows**. Every one of the 100 competition rows written this run has `status` fully consistent with its own `date`.

**Fix 2:** All 5 athletes' follower columns are `NULL` in the database this run (SocialMetricsAgent found no verifiable count for any of them — same underlying research outcome as M13, honestly represented this time as `NULL` instead of `0`). Confirmed at the schema level (`\d athletes` shows all three columns nullable, no default) and at the row level.

## Regression checks (explicit re-verification per your request)

- **All 5 original pre-redesign defects remain fixed:** zero citation index leaks, zero PB/SB inversions (Bol 1:42.55/1:43.60 correctly ordered; Kerr 2.36m/2.28m correctly ordered for a height event), all 5 athletes have ≥1 contact, zero generic meet names, healthy per-category intelligence/timeline counts.
- **Zero fabricated sources** across `intelligence_items`, `timeline_events`, `contacts` (source-domain/URL regex checks, all 3 tables, all 5 athletes).
- **Evidence/citation matching:** zero `source_domain`/`source_url` host mismatches across all rows with a URL.
- **PB/SB consistency:** zero violations across all 5 athletes.
- **Contacts integrity:** 12 contacts across 5 athletes (0 with blank/placeholder names), confidence 80–92, real source domains, honest status differentiation preserved (Kerr's Simeon Joplin still correctly marked "unconfirmed").
- **Timeline integrity:** zero duplicate (date+title) events, confidence 75–97, career span up to 19 years (Willis).
- **Confidence floors:** all categories ≥70 except `sponsorships` (60–82) — the same pre-existing, documented M7 decay-below-floor design confirmed again, not a regression.

## Updated per-dimension scores (same rubric and weights as M13)

| Dimension | Weight | Bol | Macdonald | Hobbs | Willis | Kerr |
|---|---|---|---|---|---|---|
| Evidence/source validity | 10% | 97 | 98 | 98 | 98 | 98 |
| Citation matching | 7% | 95 | 95 | 95 | 95 | 95 |
| Confidence quality | 7% | 91 | 92 | 90 | 92 | 91 |
| PB/SB consistency | 5% | 100 | 100 | 100 | 100 | 100 |
| Ranking validity | 5% | 75 | 75 | 75 | 75 | 75 |
| **Competition completeness/specificity** | 7% | **90** | **92** | **92** | **88** | **85** |
| Timeline quality/completeness | 7% | 75 | 85 | 72 | 70 | 78 |
| Contact quality/evidence | 6% | 85 | 75 | 65 | 88 | 92 |
| Sponsorship quality/freshness | 5% | 78 | 82 | 35 | 80 | 35 |
| Social profile accuracy | 4% | 85 | 70 | 65 | 85 | 65 |
| **Social metric accuracy/freshness** | 4% | **78** | **78** | **78** | **78** | **78** |
| Biography accuracy | 4% | 90 | 90 | 70 | 90 | 90 |
| Intelligence/news quality | 13% | 90 | 82 | 85 | 90 | 85 |
| Duplicate/fabricated/placeholder | 12% | 98 | 98 | 98 | 98 | 98 |
| **Data freshness** | 4% | **92** | **92** | **92** | **92** | **92** |
| **Weighted IQS** | | **89** | **88** | **84** | **89** | **86** |

(Bold rows are the three dimensions the two fixes directly targeted.)

## Overall IQS: M13 → M14

# **82 → 87 / 100** (+5)

| Athlete | M13 | M14 | Δ |
|---|---|---|---|
| Peter Bol | 83 | 89 | +6 |
| Brook Macdonald | 83 | 88 | +5 |
| Zoe Hobbs | 82 | 84 | +2 |
| Nick Willis | 83 | 89 | +6 |
| Hamish Kerr | 81 | 86 | +5 |

The gain is concentrated almost entirely in the three dimensions the fixes targeted (competition completeness/specificity, social metric accuracy/freshness, data freshness), exactly as expected — this was a targeted correctness fix, not a general quality improvement, and the rest of the rubric moved only within the normal run-to-run variance range already documented throughout this project (a few points either direction per dimension, no new pattern). Zoe Hobbs's smaller gain is consistent with her having had zero status/date contradictions in M13 already — she had less headroom in the two fixed dimensions to begin with.

## What's still open (unchanged from M13, correctly not touched this milestone)

- **Sponsorship coverage for Zoe Hobbs and Hamish Kerr is zero again this run** — the second consecutive run with zero sponsorship items for both. Two data points is still not proof of a systemic defect, but it's no longer a single-run anomaly either; if a third run reproduces it, that would move this from "flagged as possibly variance" to "confirmed defect" and warrant its own scoped fix. Not addressed here, correctly, since it's outside the two approved fixes.
- **National ranking remains mostly empty** (2/5 this run vs 0/5 in M13 — within normal variance, still not resolved).
- **The one future-dated `publishedAt` value from M13 did not reproduce this run** — consistent with it being a low-frequency edge case rather than a systemic one; still worth a narrow validation fix at some point, not urgent.

No new problems were introduced by either fix — both are narrow, single-purpose changes and the full regression sweep above confirms nothing else moved for the worse.

## Net verdict

Both blocking fixes verified working, both isolated-tested before and confirmed live after, zero regressions across every dimension checked. The measured IQS moves from 82 to 87, consistent with a targeted correctness fix rather than a broad quality change. Per your instruction, pipeline engineering stops here — no further pipeline changes are recommended before the MVP readiness assessment.
