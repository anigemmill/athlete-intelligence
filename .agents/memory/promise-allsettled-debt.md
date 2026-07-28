---
name: Promise.allSettled enrichment improvement
description: Technical debt — independent enrichment tasks (photo, research) should use allSettled so partial success is preserved.
---

# Promise.allSettled for independent enrichment

## Rule
Replace `Promise.all([researchAthleteWithPerplexity(), fetchWikipediaPhoto()])` with
`Promise.allSettled()` so that if research fails, a successfully fetched Wikipedia photo
can still be saved to the athlete record.

**Why:** Currently, when Perplexity throws a `PerplexityResearchError`, the `Promise.all`
rejects and the photo result is discarded — even if Wikipedia found a valid image.
Photo lookup is independent of research and should not be gated on it.

**How to apply:** In `artifacts/api-server/src/lib/auto-populate.ts`,
`autoPopulateAthlete()`: switch to `Promise.allSettled`, then check each result's
`status` field individually before using the value. Keep the Perplexity abort logic
for the research result but allow a fulfilled photo result to be written regardless.

**When:** Phase 4 or alongside M4.1 (population status tracking), since that milestone
already touches the populate flow.
