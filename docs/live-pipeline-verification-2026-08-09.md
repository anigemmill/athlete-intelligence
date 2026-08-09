# Live Pipeline Verification — 2026-08-09

**What this is:** a live, end-to-end run of the actual intelligence pipeline (`artifacts/api-server/src/lib/auto-populate.ts`, unmodified) against real Perplexity Sonar (via OpenRouter) and real GPT-4o (via OpenAI) for the five "golden" athletes used in the prior accuracy audit — Peter Bol, Brook Macdonald, Zoe Hobbs, Nick Willis, Hamish Kerr. No mocking, no synthetic research text; every row below came from a real API call and a real database write.

**Scope note:** there is no `ResultsAgent` or snapshot/restore mechanism in this codebase today — those are part of the *proposed* Task #27 agentic redesign (`docs/roadmap.md`), not yet built. This run exercises the current monolithic pipeline exactly as it runs in production. Test data was isolated to a disposable local Postgres instance and the pipeline source was not touched.

**Method:** for each athlete, a stub row (`name`, `sport`, `event`, `nationality`) was inserted and `autoPopulateAthlete()` was called directly — the same function the `/athletes` and `/admin/repopulate/:id` routes call. All five completed (`auto-populate: completed successfully`, no `PerplexityResearchError`).

---

## Headline finding — not in the existing tech-debt list

### The Perplexity citation list is silently discarded on every single run

`auto-populate.ts:116`:
```ts
// Perplexity returns real citation URLs at the top level of the response
const citations: string[] = (response as any).citations ?? [];
```

This is wrong for the actual OpenRouter/Perplexity Sonar response shape. Verified directly against the live API:

```
top-level keys: ['id', 'object', 'created', 'model', 'provider', 'system_fingerprint', 'service_tier', 'choices', 'usage']
has top-level citations key: False
message keys: ['role', 'content', 'refusal', 'reasoning', 'annotations']
annotation count: 10
 - https://worldathletics.org/athletes/australia/peter-bol-14456885
 - https://worldathletics.org/world-rankings/800m/men
 - https://worldathletics.org/world-rankings/800m/men?regionType=countries&region=aus&page=1
```

Perplexity *does* return real, specific citation URLs — but under `choices[0].message.annotations[].url_citation.url`, not a top-level `citations` array. Because the code reads a field that doesn't exist, `citations` is `[]` on every call. This was confirmed in every one of the five live runs:

| Athlete | Research length | citationCount logged |
|---|---|---|
| Peter Bol | 5,558 chars | **0** |
| Brook Macdonald | 3,993 chars | **0** |
| Zoe Hobbs | 6,615 chars | **0** |
| Nick Willis | 4,905 chars | **0** |
| Hamish Kerr | 5,216 chars | **0** |

**Downstream consequence:** because `citations.length > 0` is false every time, the "VERIFIED CITATION URLs" allow-list block in the GPT-4o prompt (`USER_PROMPT`, `auto-populate.ts:164-168`) is never included. GPT-4o extracts every `sourceUrl`/`sourceDomain` from its own judgment of the research text (or, per the system prompt, its own background knowledge when research is thin) — never from a real, checkable citation. This is the actual root cause behind most of the evidence-quality problems documented below and in `docs/technical-debt.md` Priority 1 and Priority 7. It's a one-line fix (`response.choices[0].message.annotations?.filter(a => a.type === "url_citation").map(a => a.url_citation.url) ?? []`), and it's higher-impact than any of the five existing priorities because it silently defeats the "every data point needs evidence" guarantee the whole product is built on.

---

## Per-athlete results

| Athlete | Intel items | Timeline events | Contacts | Competitions | World Rank | PB | SB |
|---|---|---|---|---|---|---|---|
| Peter Bol | 10 | 3 | 1 | 3 | 14 | *null* | 1:43.64 |
| Brook Macdonald | 4 | 3 | 1 | 0 | *null* | *null* | *null* |
| Zoe Hobbs | 10 | 10 | 0 | 4 | 14 | 10.93s | 10.93s |
| Nick Willis | 5 | 6 | 0 | 4 | *null* | 3:29.66 | *null* |
| Hamish Kerr | 8 | 9 | 2 | 7 | 1 | 2.36m | 2.28m |

Target from `docs/technical-debt.md` Priority 4: 10–12 intel items, 20–30 timeline events. **Nobody hit the timeline target** — best result (Zoe Hobbs) is 10, a third of the low end of target. Intel items are closer: 3 of 5 athletes land near target (8–10), Brook Macdonald and Nick Willis fall well short (4, 5).

---

## Comparison against `docs/technical-debt.md`

### Priority 1 — Citation index leak (`source4`, `[8]`, etc.)

**Not reproduced as originally described** — no `sourceN` or `[N]` values appeared. But a related and arguably worse failure showed up instead, caused by the citation-extraction bug above:

- **Brook Macdonald**: 3 of 4 intelligence items cite `source_domain: "example.com"` — the RFC 2606 reserved placeholder domain. Not a real source at all.
- **Nick Willis**: 4 of 5 items cite `source_domain: "example.org"`, and one item goes further — a fully invented URL, `http://tracksmith.example.org/joesarun`, attached to a claim about him joining Tracksmith. The system prompt explicitly says "NEVER invent, guess, or construct a URL" and GPT-4o did it anyway, almost certainly because the real citation list it should have had was empty (see headline finding).
- **Hamish Kerr**: source domains are stored as human-readable labels (`"World Athletics"`, `"Olympics"`, `"RNZ News"`, `"Newswire"`) rather than actual domains — inconsistent with Peter Bol/Zoe Hobbs, which used real domain strings (`worldathletics.org`, `olympics.com`).

Verdict: the specific `source4`/`[8]` pattern from the original audit wasn't seen, but source attribution is still broken — just via domain fabrication and inconsistent formatting instead of citation-index leakage.

### Priority 2 — PB/SB cross-validation missing

**Not reproduced this run — no inversion.** Peter Bol's `season_best` is `1:43.64` and `personal_best` is `null` (rather than the previously-documented inverted `1:45.14`/`1:43.64`). This is a safer failure mode (missing beats wrong), but it's not evidence the cross-validation described in the fix was actually implemented — GPT-4o simply chose not to guess a PB this time. The underlying gap (no code-level cross-validation between the two fields) is still present; a future run could still produce an inversion.

### Priority 3 — Contact extraction failing for most athletes

**Reproduced, in a worse form.** 3 of 5 athletes still have zero contacts (Zoe Hobbs, Nick Willis — Brook Macdonald has one but see below). Where contacts *were* returned, two are effectively empty:

- Brook Macdonald's one contact: `role: "Manager"`, `name: "Unknown"`, `org: "Unknown"`, `source_domain: "example.com"` — GPT-4o wrote the literal string `"Unknown"` into required fields instead of returning `null` or omitting the contact.
- Hamish Kerr's two contacts (Head Coach, Manager) both have **blank `name` and `org` fields** — a category label with no identifying information at all. This is arguably worse than zero contacts: the UI will render a contact card with no name.

### Priority 4 — Intelligence/timeline counts below target

**Reproduced, and timeline is worse than the original audit's worst case.** Original audit range was 2–10 timeline events; this run's best case is 10, same ceiling, and the average (3, 3, 10, 6, 9 = 6.2) is barely better than the original average of 5.4. `max_completion_tokens: 8192` is still the likely constraint (Priority 4's proposed fix — raising it to 16,384 — has not been applied).

### Priority 5 — Competition result backfill fails on generic meet names

**Partially observed; not a like-for-like test.** This run only exercises `autoPopulateAthlete`, not the separate `result-backfill.ts` path, so the specific fuzzy-match bug wasn't directly triggered. But one adjacent gap showed up: Nick Willis's 2021 Olympic Games entry is `status: "completed"` with `result: null` — a competition marked complete with no result, straight out of initial population, before backfill even runs.

---

## Other findings from this run

**`adjustConfidenceByDomain()` is dead code.** Defined at `auto-populate.ts:569`, described in `CLAUDE.md` as applied ("Domain authority adjustments are applied post-extraction"), but grep confirms it is never called anywhere in the codebase. Confidence scores in the DB are the raw, unadjusted GPT-4o output. Every score across all five athletes fell inside GPT's own instructed range (65–97 for intel, 70–97 observed for timeline) — consistent with no post-processing being applied at all.

**Wikipedia photo lookup could not be tested here** — this sandbox's network policy blocks `en.wikipedia.org` (`403` at the egress proxy), unrelated to the pipeline itself. All five athletes have `avatar_url: null` as a result. Not a pipeline defect; flagging so it isn't misread as one.

---

## Recommended priority order

1. **Fix the citation-extraction bug** (`auto-populate.ts:116`) — one line, and it's the root cause feeding fabricated `example.com`/`example.org` domains and invented URLs into the DB. This should be Priority 0, ahead of the existing Priority 1–5 list, since several of those symptoms trace back to it.
2. Re-run this same verification after the fix to see how much of Priority 1/7 evidence quality improves for free.
3. Keep Priority 3 (contacts) and Priority 4 (counts) on the roadmap — this run shows both are still live, and contacts now has a new bad pattern (non-null placeholder text / blank required fields) worth adding to the fix spec: reject contacts where `name` is blank or literally `"Unknown"`.
4. Either wire up `adjustConfidenceByDomain()` into the insertion path or remove it — right now it's aspirational code that CLAUDE.md describes as active.

---

## Appendix — raw counts

```
Peter Bol        intel=10 timeline=3  contacts=1 competitions=3  worldRank=14 pb=null    sb=1:43.64
Brook Macdonald  intel=4  timeline=3  contacts=1 competitions=0  worldRank=null pb=null  sb=null
Zoe Hobbs        intel=10 timeline=10 contacts=0 competitions=4  worldRank=14 pb=10.93s  sb=10.93s
Nick Willis      intel=5  timeline=6  contacts=0 competitions=4  worldRank=null pb=3:29.66 sb=null
Hamish Kerr      intel=8  timeline=9  contacts=2 competitions=7  worldRank=1  pb=2.36m   sb=2.28m
```

Distinct `source_domain` values seen across all intelligence items this run:
```
Newswire, Olympics, RNZ News, World Athletics,           <- non-domain-format labels (Hamish Kerr)
athletics.com.au, athletics.org, athleticstrack.com,
diamondleague.com, mtb-news.de, olympics.com,
sportsfinance.com, thepost.com, worldathletics.org,       <- real domain format (Bol, Hobbs)
example.com, example.org                                  <- fabricated placeholder domains (Macdonald, Willis)
```
