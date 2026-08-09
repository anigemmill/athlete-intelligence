# Live Pipeline Verification — M9 (SocialMetricsAgent) — 2026-08-09

Ninth live run against the same five golden athletes, real Perplexity + real GPT-4o, after implementing SocialMetricsAgent. Compared against the M8 run (`docs/live-pipeline-verification-2026-08-09-m8-social-profiles.md`).

## What changed (M9)

New `artifacts/api-server/src/lib/social-metrics-agent.ts`, per `docs/roadmap.md` ("SocialMetricsAgent — X API v2 + Perplexity fallback") and `docs/ai-architecture.md` ("wraps social-extract.ts"). Takes SocialProfilesAgent's (M8) already-validated handles as input rather than re-discovering them.

- **Twitter/X**: `fetchTwitterFollowers` (moved here unchanged from `auto-populate.ts`) — the real X API v2, used as the sole source when a handle is present and `TWITTER_BEARER_TOKEN` is configured. Deliberately does **not** fall back to a Perplexity guess for Twitter specifically — a wrong number presented as verified is worse than no number, on a platform where a real authoritative API exists.
- **Instagram/TikTok**: no equivalent free API, so these go through the existing `social-extract.ts`'s `lookupSocialData` — literally wrapped, not reimplemented, per the architecture doc's phrasing. **Not blindly trusted**: a follower count is only kept if the handle `lookupSocialData` discovers matches (case-insensitively, `@`-stripped) the handle SocialProfilesAgent already validated. A mismatch discards the count rather than attaching a possibly-wrong number to the validated handle.

`instagramFollowers`/`tiktokFollowers` removed from the shared main-extraction prompt; `fetchTwitterFollowers` removed from `auto-populate.ts` entirely (moved here). This closes the gap M8 explicitly left open.

## Tests before spending real API calls

`normalizeHandle()` tested against 6 cases: exact match, case-insensitivity, `@`-prefix on one/both sides, genuinely different handles, and a substring-but-not-equal handle that must NOT match. All 6 pass.

## Live verification: mechanism proven correct, one real limitation surfaced honestly

`TWITTER_BEARER_TOKEN` is not configured in this environment (documented as optional in `.env.example`), so Twitter follower counts were `null` for all five athletes this run — expected, not a bug, and exactly the designed behavior when the real API is unavailable (no Perplexity-guess fallback for Twitter).

Instagram/TikTok also came back `null` for all five. This looked suspicious enough to verify directly rather than accept at face value — added temporary debug instrumentation and inspected Nick Willis's raw `lookupSocialData` output:

```
handles: { instagramHandle: "willisnick", twitterHandle: "nickwillis", tiktokHandle: null }
perplexityMetrics: {
  instagramHandle: "willisnick",   // exact match to the validated handle
  instagramFollowers: null,        // Perplexity's own research text: "do not include a visible
                                    // current follower count... can't verify the exact numbers"
  ...
}
```

This confirms the mechanism works correctly end to end — the handle-matching found the exact right account — but `perplexity/sonar-pro`'s search results didn't surface a specific follower count this run, and `lookupSocialData`'s own extraction prompt correctly refused to guess one (`"NEVER invent a number"`). This is the system doing exactly what it's supposed to do under evidence > completeness: a genuinely unavailable number stays `null` rather than becoming a fabricated estimate. Debug instrumentation removed before finalizing.

**Regression checks:** zero fabricated source domains, zero garbage contacts (0 of 7), sponsorship items still present and clean (3), all handle formats still valid — checked via SQL against the athletes remaining in the database after this run.

**Honesty note on verification scope:** partway through this milestone's live run, the local database was cleared to get a clean trace for the Instagram-follower debugging above — this cascade-deleted 3 of the 5 athletes' rows (Bol, Macdonald, Hobbs) before a final full-table SQL check could run against all five. Each of those three athletes' pipeline runs completed successfully with reasonable, logged counts (captured before the deletion), but the final SQL-level fabrication/format check in this report only directly covers the two athletes still in the database (Nick Willis, Hamish Kerr) plus the explicit raw-data trace above. Flagging this rather than implying full five-athlete SQL coverage that didn't happen.

## Counts, before (M8) vs after (M9)

| Athlete | Intel | Timeline | Contacts | Competitions |
|---|---|---|---|---|
| Peter Bol | 11 → 11 | 8 → 9 | 2 → 2 | 15 → 20 |
| Brook Macdonald | 18 → 23 | 11 → 12 | 1 → 1 | 7 → 23 |
| Zoe Hobbs | 9 → 10 | 10 → 10 | 1 → 2 | 22 → 17 |
| Nick Willis | 7 → 12 | 13 → 12 | 1 → 3 | 20 → 28 |
| Hamish Kerr | 10 → 11 | 10 → 11 | 8 → 4 | 0 → 5 |

Normal run-to-run variance, no directional shift attributable to this milestone (SocialMetricsAgent doesn't touch competitions/contacts/intel/timeline generation).

## Net verdict

SocialMetricsAgent implements the specified "X API v2 + Perplexity fallback wraps social-extract.ts" design faithfully, and the handle-matching safeguard is proven correct via direct inspection, not assumed. The practical result this run — all follower counts null — is a real, honestly-reported limitation of this specific test environment (no Twitter API token) and of `perplexity/sonar-pro`'s search results not always surfacing an exact follower figure, not a defect in the matching or extraction logic. Continuing to BiographyAgent + PhotoAgent per the approved sequence.
