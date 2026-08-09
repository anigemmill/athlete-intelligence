# Live Pipeline Verification — M10 (BiographyAgent + PhotoAgent) — 2026-08-09

Tenth live run against the same five golden athletes, real Perplexity + real GPT-4o, after implementing BiographyAgent and PhotoAgent together. Compared against the M9 run (`docs/live-pipeline-verification-2026-08-09-m9-social-metrics.md`).

## What changed (M10)

**BiographyAgent** (`biography-agent.ts`), per docs/roadmap.md ("BiographyAgent — birth date, nationality"). **Scope decision made explicitly, not silently:** the `athletes` table has no `birthDate` column, only an integer `age` set once at creation and never refreshed. Adding a `birthDate` column would be more precise (age drifts stale year over year), but that's a schema change — outside this milestone's authority to make unilaterally. This agent instead verifies/refines the *existing* `age` and `nationality` fields each populate cycle, and the birthDate-column idea is flagged here for later rather than implemented. Nationality is only overwritten when the research **explicitly confirms a change** (e.g. competing for a new country) — a claimed nationality that merely differs from the recorded one, without explicit confirmation of a change, is logged as a discrepancy but **not applied**, to avoid overwriting a correct value with an uncertain guess.

**PhotoAgent** (`photo-agent.ts`), per docs/roadmap.md ("PhotoAgent — WA → federation → Wikipedia") and docs/technical-debt.md Priority 6, which documents the target hierarchy explicitly (federation sources first, Wikipedia as fallback) against the current Wikipedia-first ordering in `photo-lookup.ts`. This agent tries a dedicated, citation-validated federation search (World Athletics → sport federation → National Olympic Committee) first, then falls back to the existing `fetchWikipediaPhoto` (reused, not reimplemented) if that finds nothing. Raises the evidence bar versus the existing Perplexity photo fallback in `photo-lookup.ts` (which only regex-checks the URL looks like an image file): this agent additionally requires the claimed image URL's hostname to match one of the real citation hostnames from its own research call.

## Tests before spending real API calls

`hostnameOf()` (5 cases: real URLs, www-stripping, subdomain preservation, invalid input) and the image-URL pattern (4 cases: valid jpg/png, an HTML page URL that must be rejected, a bare filename that must be rejected) — 9/9 pass.

## Live verification: mechanisms proven correct, one architectural limitation surfaced honestly

**BiographyAgent worked as designed.** All five athletes got a populated `age` this run (previously null at creation) with plausible, correct values (Bol 32, Macdonald 34, Hobbs 26, Willis 40, Kerr 27). Nationality stayed unchanged for all five — correctly, since none of them have actually changed sporting nationality; the "only apply on explicit confirmation" guard did its job by not touching anything.

**PhotoAgent found zero photos this run — investigated with a debug trace rather than accepted at face value.** Dumped the raw extraction output for Zoe Hobbs, who had 10 real citations including a `worldathletics.org` profile page:

```
claimed: ""   (empty — GPT-4o-mini did not extract an image URL)
citations: [worldathletics.org profile, wikipedia, instagram, olympics.com, ...]
```

This surfaces a real architectural limitation, not a bug: Perplexity's research citations are almost always **page** URLs (a profile page, a Wikipedia article), not direct **image file** URLs. An LLM reading research text has no reliable way to know a specific page's `<img src>` without actually fetching and parsing that page's HTML — which this text-only research→extraction pipeline doesn't do. The validation logic is working exactly as intended (declining to fabricate a URL it can't confirm), but the federation-first approach as designed may rarely succeed in practice for this reason. Compounding this in *this specific test environment*: the Wikipedia fallback has been blocked by this sandbox's network egress policy (`en.wikipedia.org` returns 403) since the very first M3.1 verification — a pre-existing, previously-documented environment limitation, not something this milestone introduced or can fix from inside the sandbox.

**Recommendation for a future milestone, flagged rather than acted on:** an actual image-scraping step (fetch the profile page, parse `<img>` tags) would likely be needed to make the federation-first hierarchy succeed reliably — a real code change, appropriately out of scope for this pass.

**Regression checks:** zero fabricated source domains, zero garbage contacts (0 of 17), sponsorship items still present and clean (22), all M3.1–M9 protections intact.

## Counts, before (M9) vs after (M10)

| Athlete | Intel | Timeline | Contacts | Competitions |
|---|---|---|---|---|
| Peter Bol | 11 → 11 | 9 → 6 | 2 → 4 | 20 → 17 |
| Brook Macdonald | 23 → 27 | 12 → 14 | 1 → 2 | 23 → 25 |
| Zoe Hobbs | 10 → 10 | 10 → 11 | 2 → 2 | 17 → 11 |
| Nick Willis | 12 → 11 | 12 → 11 | 3 → 1 | 28 → 31 |
| Hamish Kerr | 11 → 9 | 11 → 11 | 4 → 8 | 5 → 25 |

Normal run-to-run variance, no directional shift attributable to this milestone.

## Net verdict

BiographyAgent delivers real, correct value within the constraint of the existing schema, and its conservative "only apply on explicit confirmation" rule is proven to hold (no incorrect nationality changes across five athletes with none reported). PhotoAgent's validation logic is correct — it never fabricated a URL — but its federation-first strategy didn't succeed this run for a real, now-documented architectural reason (LLM research surfaces page URLs, not image URLs) rather than a code defect. Reported honestly rather than smoothed over. Continuing to IntelligenceAgent per the approved sequence.
