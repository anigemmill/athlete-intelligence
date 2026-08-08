# Milestone 3 — Live Pipeline Verification Plan

**Status:** Plan only — no live verification has been run yet. Per the user's explicit gate:
Milestone 4 does not begin until this plan has been executed and has shown `ResultsAgent`
consistently retrieves accurate live data. This document defines what "consistently" and
"accurate" mean, precisely enough to be checked rather than asserted, and closes with the one
open decision (§6) that determines how execution actually happens.

**Purpose, restated to avoid scope drift:** this is not an architecture review. Nothing here
should change `resultsAgent.ts`, `resultsAgentLogic.ts`, `validation.ts`, or `confidence.ts`. If
the live run surfaces a real defect, the fix is a separate, explicitly-scoped change made
*after* this plan's findings are reviewed — not folded into the verification itself.

---

## 1. Live APIs and Sources

Two different things are worth keeping separate here, because conflating them overstates what
the architecture actually controls: the **APIs `ResultsAgent` calls directly** (two), and the
**web sources those APIs might cite** (a static allowlist we score, but never query directly or
have any SLA with).

### 1.1 APIs called directly

| | OpenRouter → Perplexity Sonar (research) | OpenAI → GPT-4o (extraction) |
|---|---|---|
| **Role in ResultsAgent** | `researchResults()` — one live web-search-augmented completion, prompted narrowly for rank/PB/SB | `extractResultsFields()` — turns that research text into the structured `{worldRank, nationalRank, personalBest, seasonBest}` JSON `resultsAgentLogic.ts` validates |
| **Reliability** | Commercial API; web-search-backed, so answer quality varies by how well-covered the athlete is online — this is a data-availability risk, not an uptime risk. Perplexity itself has historically had higher latency variance than a pure-LLM endpoint. | Mature, high-uptime commercial API. Main real failure mode observed elsewhere in this codebase is occasional malformed JSON despite `response_format: json_object` — `resultsAgent.ts` already retries once for exactly this. |
| **Rate limits** | Governed by the OpenRouter account's own tier — not yet confirmed against the actual account this environment/production will use. Must be checked before a multi-athlete live run, since 5 golden athletes × 1 research call each is trivial volume, but production's 6-hourly, 3-athletes-per-cycle scheduler adds up over time. | Same caveat — governed by the OpenAI account's tier (RPM/TPM). 5 athletes × 1 extraction call (+ up to 1 retry) is trivial for this test specifically. |
| **Authentication** | `OPENROUTER_API_KEY` env var, read by `@workspace/integrations-openrouter-ai`. **Not set in this sandbox** — standing constraint disclosed since Milestone 1. | `OPENAI_API_KEY` env var, read by `@workspace/integrations-openai-ai-server`. **Not set in this sandbox.** |
| **Expected latency** | Perplexity Sonar completions typically run a few seconds; `ResultsAgent`'s prompt is narrower than the legacy monolith's 9-topic prompt (one focused ask vs. everything), so it should land at the faster end of that range, not the slower end — this is a prediction to confirm during the live run, not a measured fact yet. | GPT-4o on a small (~1KB) JSON response is typically low single-digit seconds. |

### 1.2 Web sources these APIs might cite (not APIs we call — a scoring allowlist)

`sourceHierarchy.ts`'s `results_rankings` domain tiers, restated here as what "Tier 1" actually
means in practice for each golden athlete's sport:

| Athlete | Sport | The Tier-1 domain that actually applies | Does that body expose a real public API? |
|---|---|---|---|
| Peter Bol | 800m (Athletics) | worldathletics.org | No — worldathletics.org has no general-purpose public API for athlete profiles/rankings. Perplexity can only cite whatever page it has crawled. |
| Zoe Hobbs | Sprints (Athletics) | worldathletics.org | Same. |
| Nick Willis | Middle distance (Athletics) | worldathletics.org | Same. |
| Hamish Kerr | High Jump (Athletics), 2024 Olympic gold medalist | worldathletics.org, olympics.com | Neither has a public API. |
| Brook Macdonald | Downhill MTB | uci.org | No public API. |

**This is an honest limitation worth stating plainly, not smoothing over:** the entire Tier 1/2
scoring system assumes Perplexity's web index happens to have crawled a current page from one of
these domains for a given athlete at query time. There is no integration, no authentication, no
rate limit, and no SLA with World Athletics, the IOC, or the UCI — "Tier 1" describes *how much
we'd trust the page if Perplexity finds one*, not a guaranteed data channel. If Perplexity's index
is stale or thin for a given athlete, Tier 1 corroboration may simply be unavailable no matter how
correct the validation logic is — that would be a **source quality** failure (§4), not a code bug.

---

## 2. Test Athletes — Comparison Structure

Same five golden athletes used throughout this engagement (`docs/task-27-success-metrics.md`
§2), for the same reason: they're the only athletes with citable, specific documented defects to
compare against.

For each athlete, the report (§5) fills in one row per field, three columns wide:

| Column | What goes here |
|---|---|
| **Legacy pipeline** | Whatever is currently stored in the `athletes` row today (the monolith's last write) |
| **ResultsAgent (live)** | What `ResultsAgent` writes after a real, credentialed run |
| **Ground truth** | Independently verified against the actual governing-body page for that athlete, checked manually at execution time — not sourced from the pipeline at all |

Fields compared per athlete, matching the user's list exactly: world rank, personal best, season
best, latest result, latest competition, and every source URL attached to a stored fact.

**Note on "latest result" / "latest competition":** these are not `ResultsAgent`-owned fields —
they belong to `CompetitionsAgent` (Milestone 4, not yet built). Until that agent exists, "latest
result/competition" in this report is sourced from the legacy monolith (as it already is today)
and from ground truth, with a `ResultsAgent` column of "not applicable — out of this agent's
scope." Listing it anyway, rather than silently dropping it, is deliberate: it gives an honest
before/after even for the parts Milestone 3 doesn't touch, and sets up a like-for-like comparison
once Milestone 4 ships.

---

## 3. Success Criteria

Adapted from the user's examples into checkable, specific thresholds:

| # | Criterion | Threshold |
|---|---|---|
| S1 | No placeholder/citation-index source | Zero tolerance — any stored fact with a `sourceDomain`/`sourceUrl` that `sanitizeSourceDomain`/`sanitizeSourceUrl` would reject is an automatic fail, full stop (this is the exact Priority 1 defect) |
| S2 | Personal best matches ground truth | Exact match after unit normalisation (e.g. "1:43.22" vs "1:43.2" count as equal); a mismatch outside normal rounding is a fail |
| S3 | Season best matches ground truth | Same precision rule as S2. Season bests move during a live season — ground truth is checked same-day as the live run, not from a cached memory of "the season best as of some earlier date" |
| S4 | World rank matches ground truth | Within ±1 position, or matches the most recently published ranking if two ranking bodies disagree (`docs/truth-verification-layer.md` §3 already documents that ranking systems genuinely disagree by source — an exact match is not always possible even in principle) |
| S5 | Evidence attached | Every stored fact has a non-null `sourceDomain` **or** `sourceUrl` (matches `resultsAgentLogic.ts`'s existing drop rule) — checked structurally, not just spot-checked |
| S6 | No PB/SB inversion | Season best is never numerically superior to personal best in what's stored (carries forward R3/R5 from the regression ledger) |
| S7 | Coverage | At least 4 of 5 golden athletes get a non-empty world rank **and** personal best from the live run (mirrors Milestone 3's own approved acceptance bar — 100% is not required, since real-world coverage varies per athlete, per `docs/task-27-implementation-roadmap.md` Milestone 5's identical reasoning about data scarcity) |
| S8 | Confidence sanity | Every accepted fact's stored (adjusted) confidence is ≥ 65 (the emission floor) and its source tier matches what `getSourceTier("results_rankings", ...)` would compute for real for that domain — checked mechanically, not by eyeballing |

**Overall pass bar:** S1, S5, S6 must be 100% (these are safety properties, not accuracy
targets — any violation is a real bug, not a data-availability question). S2–S4, S7 are scored
per-athlete and the milestone is considered verified if at least 4 of 5 athletes pass all of
S2–S4 for every field that has ground truth available, and S7 holds. A field with no ground
truth available at all (nothing published anywhere) is excluded from that athlete's score, not
counted as a failure.

---

## 4. Failure Analysis — Root-Cause Taxonomy

Every miss the report finds gets attributed to exactly one of these five categories, with the
specific evidence for why — "it didn't work" is not an acceptable entry in the report's failure
column:

1. **Prompt** — the research or extraction prompt didn't ask for the right thing, or asked
   ambiguously, and the information was actually available online. Evidence required: show the
   research text returned and point to what a differently-worded prompt would need to ask for.
2. **API** — OpenRouter/Perplexity or OpenAI returned an error, timeout, empty completion, or was
   rate-limited. Evidence required: the actual error/status code and latency observed.
3. **Parsing** — the extraction response was not valid JSON, or didn't match the expected shape,
   even after `resultsAgent.ts`'s one built-in retry. Evidence required: the raw model output that
   failed to parse.
4. **Validation** — `buildResultsFacts()` correctly rejected a candidate. This is **working as
   intended, not a defect** — logged in the report distinctly from the other four categories so it
   is never miscounted as a failure. Evidence required: which specific rule fired (citation leak,
   unparseable mark, event/direction mismatch, PB/SB inversion, Tier 3 new-PB withholding,
   emission-confidence floor) and the exact input that triggered it.
5. **Source quality** — Perplexity's web index simply has no current, authoritative information
   for this athlete/field at all. This is a data-availability limitation of the live web, not a
   pipeline defect. Evidence required: confirm via a separate, manual check (e.g. a direct search
   for the athlete's name plus the specific fact) that the information genuinely isn't readily
   findable, rather than assuming absence.

A gap that could plausibly be more than one category (e.g. a bad prompt *and* a source that
doesn't cover it) is attributed to the earliest point in the pipeline the fix would actually need
to land — prompt before parsing, parsing before validation, validation before source quality —
so root-causing stays consistent across athletes rather than picked ad hoc per case.

---

## 5. Output Report

One section per golden athlete, each following the same flow the user specified:

```
Legacy pipeline
      ↓
ResultsAgent (live)
      ↓
Ground truth
```

For each of the six compared fields (world rank, PB, SB, latest result, latest competition, source
URLs), the report shows all three values side by side, a pass/fail against §3's criteria, and —
for anything that fails or is empty — a root cause from §4's taxonomy with supporting evidence
(the actual research text, the actual model output, or the actual validation-drop reason, not a
paraphrase). A summary table at the top rolls every athlete's S1–S8 results into one pass/fail
grid, and a closing section states plainly whether the milestone's gate is met — the same
disclosure discipline used for every `docs/metrics/m<N>.json` snapshot so far.

---

## 6. The One Open Decision: How Execution Actually Happens

This plan can be fully executed only with working `OPENROUTER_API_KEY` and `OPENAI_API_KEY`
credentials — the standing constraint disclosed since the Milestone 1 real-world-accuracy-audit
request still holds, and it is the one thing this document cannot plan around, only name plainly.
There are three real ways forward, and which one to take is the user's call, not something to
assume:

**A. Provide real credentials in this environment.** The only way to test the actual, complete
system — `ResultsAgent`'s real prompts, the real Perplexity/GPT-4o round trip, real latency, real
rate-limit behaviour — exactly as it will run in production. Everything in §1–§5 is written to
support this path directly.

**B. Claude independently verifies ground truth via live web search/fetch, and stands in for the
research + extraction steps using what it actually finds.** This sandbox does not give
`ResultsAgent` internet access, but Claude Code's own tools may have it. Done this way, §2's
"Ground truth" column would be genuinely live and independently sourced, and the validation/
confidence/evidence layer (`resultsAgentLogic.ts`, the part that actually enforces every safety
property in §3) would run for real against that real data. What this path does **not** prove:
Perplexity's own real-world success rate at finding the athlete, the actual prompt's real-world
performance, or GPT-4o's actual extraction reliability — those three specifically require A.
**This is a genuine partial substitute, not equivalent to A, and the report would need to say so
explicitly rather than blur the distinction.**

**C. Defer this plan's execution** until real credentials exist in a deployed environment (e.g.
Replit), and run it there instead of in this sandbox.

I'm not choosing between these — it changes what "verified" will actually mean in the resulting
report, and that's exactly the kind of call that should be made explicitly rather than defaulted
into.

---

## 7. Attempt Log — Option A, First Attempt

The user chose Option A (real credentials) and configured all four required environment
variables (`AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`,
`AI_INTEGRATIONS_OPENROUTER_API_KEY`, `AI_INTEGRATIONS_OPENROUTER_BASE_URL`) via this session's
own environment settings — presence confirmed without reading values.

**Method:** a temporary, uncommitted harness called the real `runResultsAgent()` for each of the
5 golden athletes, with two temporary `logger.info` calls added to `resultsAgent.ts` to capture
the raw research/extraction stages for the report (reverted immediately after, `git diff` clean).
Each athlete's row was snapshotted before the run and restored immediately after, regardless of
outcome — no golden-set data was left modified.

**Result: 5/5 athletes failed at the network layer, before any research or extraction occurred.**
Both external hosts `ResultsAgent` depends on are blocked by this session's network egress
policy:

```
403 Host not in allowlist: openrouter.ai
403 Host not in allowlist: api.openai.com
```

**Root cause, per §4's taxonomy: category 2 (API) — but at the network layer, not the API
layer.** This is not a credentials problem (the request never reached OpenAI/OpenRouter's own
servers to test the key at all — it was rejected by this session's outbound-proxy allowlist
before that), not a code problem (`resultsAgent.ts`'s error handling behaved exactly as designed:
`status: "error"`, `classification: "transient"`, one `agent_runs` row per athlete, zero database
writes), and not a data-quality problem. Per this environment's own proxy documentation
(`/root/.ccr/README.md`): "The destination host is not allowed by your organization's egress
policy for this session. Do not retry or route around it — report the blocked host." That
instruction was followed — no retries, no workaround attempted.

**What this means for the milestone gate:** zero real live data was retrieved. This attempt
cannot serve as the report the user asked to review before Milestone 4 — there is nothing to
compare, because the live call never happened for any athlete, any field. The three ways forward
from §6 still stand; (A) now additionally requires the network egress allowlist for this session/
environment to include `api.openai.com` and `openrouter.ai` before a credentialed run can produce
anything, which is a different configuration surface than the environment variables already set.
