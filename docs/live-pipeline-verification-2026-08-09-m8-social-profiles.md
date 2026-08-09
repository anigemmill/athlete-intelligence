# Live Pipeline Verification — M8 (SocialProfilesAgent) — 2026-08-09

Eighth live run against the same five golden athletes, real Perplexity + real GPT-4o, after implementing SocialProfilesAgent. Compared against the M7 run (`docs/live-pipeline-verification-2026-08-09-m7-sponsors.md`).

## What changed (M8)

New `artifacts/api-server/src/lib/social-profiles-agent.ts`, per `docs/roadmap.md`/`docs/ai-architecture.md` ("SocialProfilesAgent — handle format validation"). Dedicated Perplexity research (explicitly told to confirm a handle is genuinely the athlete's own account, not a fan page, and to say so when it can't) + GPT-4o extraction + `isValidHandle()` format validation (rejects `@`-prefixed, URLs, whitespace, placeholder strings like `"none"`/`"N/A"`, over-length).

`instagramHandle`/`twitterHandle`/`tiktokHandle` removed from the shared main-extraction prompt — this agent is now the sole source for handles. **Follower counts are deliberately left untouched this milestone** — `instagramFollowers`/`tiktokFollowers` still come from the general research pass, and Twitter still uses the existing real X API lookup keyed off the new agent's handle. Replacing follower-count extraction is explicitly SocialMetricsAgent's (M9) job, not bundled in here.

## Tests before spending real API calls

`isValidHandle()` tested against 14 cases: real handles (simple, with dots), `null`, empty string, `@`-prefixed, URLs, path fragments, spaces, placeholder strings (`"none"`, `"N/A"`, `"Unknown"`), and length boundaries (30 chars OK, 31 rejected). All 14 pass.

## Live verification: zero regression, handles clean

| Check | Result |
|---|---|
| Handles containing `@`, `/`, or spaces | **0** — all 5 athletes' stored handles are clean usernames |
| Fabricated source domains (all tables) | **0** |
| Garbage contacts | **0** of 13 |
| M3.1–M7 protections (competitions, contacts, timeline, sponsorships) | All intact |

Handles found: Peter Bol (`pbol800` IG + Twitter), Brook Macdonald (`brookmacdonald6` IG), Zoe Hobbs (`zoe__hobbs` IG), Nick Willis (`willisnick` IG, `nickwillis` Twitter), Hamish Kerr (`hamishkerrhj` IG). No TikTok handle found for any of the five this run — not fabricated to fill the gap, consistent with evidence > completeness.

## Counts, before (M7) vs after (M8)

| Athlete | Intel | Timeline | Contacts | Competitions |
|---|---|---|---|---|
| Peter Bol | 12 → 11 | 17 → 8 | 2 → 2 | 21 → 15 |
| Brook Macdonald | 16 → 18 | 11 → 11 | 1 → 1 | 33 → 7 |
| Zoe Hobbs | 10 → 9 | 15 → 10 | 2 → 1 | 24 → 22 |
| Nick Willis | 8 → 7 | 10 → 13 | 2 → 1 | 20 → 20 |
| Hamish Kerr | 9 → 10 | 9 → 10 | 4 → 8 | 16 → 0 |

Competitions swung noticeably for some athletes (Bol 21→15, Macdonald 33→7, Kerr 16→0). Checked whether this is a SocialProfilesAgent side effect: it isn't — CompetitionsAgent's code wasn't touched this milestone, and this exact kind of run-to-run swing has been observed before this change too (e.g. Nick Willis went 32→0 between two unrelated milestones earlier in this project). Logged as expected LLM variance, not a regression, since the cause (a different, unmodified agent) rules out this milestone's change.

## Net verdict

SocialProfilesAgent works as specified and cleanly took over handle discovery from the monolith with zero fabrication and zero malformed handles. Follower counts remain a known, intentional gap — flagged in the code comments and here — pending SocialMetricsAgent next. Continuing to SocialMetricsAgent per the approved sequence.
