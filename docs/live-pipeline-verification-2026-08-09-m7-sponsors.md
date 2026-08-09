# Live Pipeline Verification — M7 (SponsorsAgent) — 2026-08-09

Seventh live run against the same five golden athletes, real Perplexity + real GPT-4o, after implementing SponsorsAgent. Compared against the M6.1 run (`docs/live-pipeline-verification-2026-08-09-m6.1-refactor.md`).

## What changed (M7)

New `artifacts/api-server/src/lib/sponsors-agent.ts`, per `docs/roadmap.md`/`docs/ai-architecture.md` ("SponsorsAgent — brand deals + confidence decay"). Same standalone-module pattern as Competitions/Contacts/Timeline, built entirely on M6.1's shared infrastructure (`callPerplexity`, `withAiConcurrencyLimit`, `withRetry`, `isValidDate`, `resolveSourceAttribution`, `applyConfidenceFloor`) — no duplicated boilerplate, confirming the M6.1 investment paid off immediately.

**Scope boundary** (set in ContactsAgent's M5 docstring, held here): SponsorsAgent tracks brand **deals** (what sponsorship exists, when reported) — not brand-relations **contact people**, which remain ContactsAgent's narrow "representation" scope. No overlap, no double-counting.

**Schema decision, made rather than deferred:** "brand deal confidence decay" could have meant a new schema (deal start/end dates, a scheduled decay job). Checked the schema first — `intelligence_items` already has `publishedAt` and `confidence`, both sufficient. Decay is computed **once, at extraction time**, as a function of how old the reported date is (0/5/10/15-point penalty at 6/18/36-month buckets), not a background job that continuously ages stored values. No schema change, no new infrastructure decision needed — this stayed within approved scope.

**"sponsorships" removed from the shared main-extraction prompt**, same pattern as pulling timeline/competitions/contacts out of the monolith — SponsorsAgent is now the sole source for that category, avoiding double-writes.

## Tests before spending real API calls

`decayPenaltyForAge()` tested in isolation against 8 boundary cases (recent, exactly-6mo, just-past-6mo, exactly-18mo, etc.). First run caught a real bug — a day-count month approximation (`30.44 days/month`) drifted at the 36-month boundary, landing one bucket early. Fixed with calendar-month arithmetic instead of a fixed-day average; all 8 cases pass.

## Live verification: zero regression, SponsorsAgent working as designed

| Check | Result |
|---|---|
| Fabricated source domains (sponsorships + everything else) | **0** |
| Sponsorship items with confidence below the 70 floor | **0** — min observed was exactly 70 |
| Sponsorship items with an invented brand or vague placeholder | **0** — all 10 name a real, specific brand (Adidas, Red Bull, Shimano, Tracksmith, Reebok, etc.) |
| Decay applied correctly | Yes — a Jan-2026-reported Red Bull deal kept full confidence (0 penalty, <6mo old); older 2020-2022 deals show real penalties |
| M3.1-M6.1 protections (competitions, contacts, timeline) | All intact, checked independently |

10 sponsorship items landed across 3 of 5 athletes (Brook Macdonald 6, Nick Willis 3, Peter Bol 1); Zoe Hobbs and Hamish Kerr got **zero** — no sponsorship deals were fabricated to fill a gap for them, consistent with evidence > completeness.

**One data-quality nuance worth flagging, not hiding:** several `publishedAt` values land on the 1st of a month/year (`2022-01-01`, `2020-05-01`) — GPT approximating "reported sometime in this year/month" to a specific day. This satisfies the ISO-8601 requirement and doesn't block decay (which operates at month granularity anyway), but it's not literally day-precise. Not a fabrication — the exact day genuinely may not be in the source — just noting the shape of the data for anyone consuming `publishedAt` expecting real precision.

## Counts, before (M6.1) vs after (M7)

| Athlete | Intel (M6.1→M7) | Timeline | Contacts | Competitions | Sponsorship items |
|---|---|---|---|---|---|
| Peter Bol | 10 → 12 | 17 | 2 | 21 | 1 |
| Brook Macdonald | 10 → 16 | 11 | 1 | 33 | 6 |
| Zoe Hobbs | 10 → 10 | 15 | 2 | 24 | 0 |
| Nick Willis | 7 → 8 | 10 | 2 | 20 | 3 |
| Hamish Kerr | 10 → 9 | 9 | 4 | 16 | 0 |

Intel count rose where real sponsorship deals existed (Bol, Macdonald, Willis) and stayed flat where none were found (Hobbs, Kerr) — the count moved with evidence, not with a target.

## Net verdict

SponsorsAgent works as specified, reused 100% of the M6.1 shared infrastructure with no new duplication, and made a real (if small) schema/scope decision — reusing existing `publishedAt`/`confidence` columns for decay rather than requesting new infrastructure — that stayed inside the approved scope rather than escalating. Continuing to SocialProfilesAgent next per the approved sequence.
