# Athlete Intelligence — AI Architecture

## Overview

The AI pipeline turns a single athlete name into a structured, evidence-attributed dossier across 5 database tables. Every piece of data has a source domain, optional source URL, and a confidence score (0–100). The pipeline runs in the background after athlete creation and on every scheduled refresh.

---

## Pipeline Flow

```
POST /athletes/discover
        │
        ▼
┌─────────────────────────────────────┐
│  Phase 0: Discovery                  │
│  Model: gpt-4o                       │
│  Input: athlete name (string)        │
│  Output: { sport, event,             │
│            nationality, confidence } │
│  Threshold: ≥70 confidence           │
│  Rejects ambiguous/unknown names     │
└───────────────┬─────────────────────┘
                │ (if ≥70)
                ▼
        athletes row created
        autoPopulateAthlete() fires (background)
                │
        ┌───────▼────────────────────────────┐
        │  Phase 1 (parallel)                 │
        │                                     │
        │  A: researchAthleteWithPerplexity() │
        │     Model: perplexity/sonar         │
        │     Searches live web               │
        │     Returns: research text          │
        │             + citation URL array    │
        │                                     │
        │  B: fetchWikipediaPhoto()           │
        │     Wikipedia API → Perplexity      │
        │     Returns: avatarUrl or null      │
        └───────┬────────────────────────────┘
                │ both complete
                ▼
┌───────────────────────────────────────────┐
│  Phase 2: Structured Extraction            │
│  Model: gpt-4o (json_object mode)          │
│  Input: athlete stub + research text       │
│         + citation URL array               │
│  max_completion_tokens: 8192               │
│  Output: {                                 │
│    athlete_stats,                          │
│    intelligence_items[],                   │
│    timeline_events[],                      │
│    contacts[],                             │
│    competitions[]                          │
│  }                                         │
└───────────────┬───────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────┐
│  Post-processing                           │
│  • Date validation (isValidDate)           │
│  • adjustConfidenceByDomain()              │
│  • Twitter follower live lookup (optional) │
│  • DB writes (5 tables)                    │
└───────────────────────────────────────────┘
```

---

## Services

### Perplexity Sonar (via OpenRouter)

**Package:** `@workspace/integrations-openrouter-ai`  
**Model:** `perplexity/sonar`  
**Purpose:** Live web search for current athlete data

Perplexity returns a research text body plus a `citations` array of URLs at the response top level. The citations array is the authoritative source for `sourceUrl` fields — GPT-4o is instructed to only use these URLs.

Used in:
- `researchAthleteWithPerplexity()` — main research pass
- `result-backfill.ts` — targeted competition result lookups
- `social-extract.ts` — social handle + follower lookup
- `photo-lookup.ts` — fallback photo search (uses `perplexity/sonar`)

**Social lookup uses `perplexity/sonar-pro`** for higher result quality.

### GPT-4o (via OpenAI)

**Package:** `@workspace/integrations-openai-ai-server`  
**Model:** `gpt-4o`  
**Purpose:** Structured data extraction and athlete discovery

Used for:
- `discoverAthleteProfile()` — athlete identity resolution (512 tokens)
- `autoPopulateAthlete()` — full structured extraction (8192 tokens)
- Chat analyst (`POST /api/chat`) — database-first agentic loop with tool use

### GPT-4o-mini (via OpenAI)

**Model:** `gpt-4o-mini`  
**Purpose:** Lightweight extraction tasks

Used for:
- `result-backfill.ts` — parsing Perplexity competition result text into JSON
- `social-extract.ts` — parsing social handle/follower text into JSON
- `photo-lookup.ts` — URL extraction from Perplexity photo search response

---

## Prompts

### Discovery Prompt (`discoverAthleteProfile`)

**System:**
> You are a sports data assistant. Given an athlete's name, identify the specific individual and return a JSON object.

**User:**
> Athlete name: "{name}" → return `{ sport, event, nationality, age, confidence, ambiguous, reason }`

Confidence scale:
- 90–100: Unambiguous, one uniquely identifiable well-known athlete
- 70–89: Confident, real knowledge of this person
- 50–69: Uncertain, name shared by multiple athletes
- 0–49: Cannot identify

**Threshold:** Requests with confidence < 70 are rejected with HTTP 422.

---

### Perplexity Research Prompt

**System:**
> You are an elite sports intelligence researcher. Search the web thoroughly and return accurate, current, cited information. Today's date is {today}. Be specific — include exact dates, exact results, exact team names. Never fabricate information.

**User:**  
Research covers 9 sections:
1. Current status (team, sponsors, active/retired)
2. Recent results ({year-2}, {year-1}, {year})
3. Historical results (2016–2023)
4. Career timeline with exact dates
5. Rankings (world + national)
6. Performance marks (PB and SB with dates)
7. Social media handles + follower counts
8. Key contacts (coach, agent, medical)
9. Intelligence items (interviews, sponsorships, career changes)

---

### GPT-4o Extraction System Prompt

```
You are a sports intelligence data engine for Athlete Intelligence, a B2B SaaS platform used by national sport organisations, professional clubs, and talent agencies.

Rules:
- ACCURACY FIRST: Use the provided research as your primary source of truth.
- sourceUrl MUST be chosen from the provided CITATION URLs list. If no citation is relevant, set sourceUrl to null. NEVER invent, guess, or construct a URL.
- sourceDomain must match the domain of the chosen sourceUrl.
- Dates must be ISO-8601 strings.
- Confidence: 85–97 for data from research, 65–80 for inferred data.
```

**Output schema:**
```typescript
{
  athlete_stats: {
    worldRank: integer | null,
    worldRankDelta: integer,
    nationalRank: integer | null,
    personalBest: string | null,   // "1:43.22" or "8.95m" — never a placement
    seasonBest: string | null,
    instagramHandle: string | null,
    instagramFollowers: integer | null,
    twitterHandle: string | null,
    tiktokHandle: string | null,
    tiktokFollowers: integer | null
  },
  intelligence_items: Array<{
    category: "results_rankings" | "media_interviews" | "sponsorships" | "career_changes",
    title: string,
    summary: string,    // 2-3 sentences with specific details
    sourceDomain: string,
    sourceUrl: string | null,   // MUST be from citation list
    confidence: integer,
    publishedAt: ISO-8601
  }>,                // 10-12 items, spread across 10 years
  timeline_events: Array<{
    date: YYYY-MM-DD,
    category: "competition" | "media" | "sponsorship" | "career" | "personal",
    title, description, location, sourceDomain, sourceUrl, confidence,
    significant: boolean
  }>,                // 20-30 events, full career
  contacts: Array<{
    role, category, name, org, orgType, status,
    confidence, publicEmail, website, note,
    lastVerified, dateDiscovered, sourceDomain, sourceExcerpt
  }>,                // 3-5 contacts
  competitions: Array<{
    meetName, event, location, date, tier: "A"|"B"|"C",
    status: "upcoming"|"completed", result: string | null
  }>                 // 20-30 entries, full career
}
```

---

### Chat Analyst Prompt (`POST /api/chat`)

The chat route implements a **database-first agentic loop** using GPT-4o with tool use.

**System prompt:**
```
You are an AI Sports Intelligence Analyst for Athlete Intelligence. You have access to structured, real-world data about athletes through database tools.

Core rules:
1. ALWAYS call at least one tool before answering questions about athletes
2. Base ALL answers on data returned by tools — never answer from LLM knowledge alone
3. When quoting data, cite the source_domain and confidence score
4. Be concise and direct. This is a professional B2B platform.
```

**Available tools:**
| Tool | Purpose |
|---|---|
| `get_athlete_profile` | Full profile, stats, rankings, social |
| `get_athlete_intelligence` | All intelligence items |
| `get_athlete_competitions` | Competition history and upcoming |
| `get_athlete_contacts` | Relationship network |
| `get_athlete_timeline` | Career milestones |
| `search_athletes` | Find athletes by name/sport/nationality |
| `get_roster_overview` | All athletes with summary stats |
| `compare_athletes` | Side-by-side comparison |

The agentic loop: parse request → call tool(s) → receive data → generate sourced response → stream via SSE.

---

### Result Backfill Prompt

**Perplexity query:**
> Find the exact results for {name} ({sport} — {event}) at the following competitions: [list]. For each, provide the finishing position and/or time/score.

**GPT-4o-mini parsing:**
> Extract competition results into JSON. Each item: `{ meetName: string, result: string | null }`. Do not invent results.

Matching strategy: fuzzy string match (first 15 characters of meet name). **Known weakness:** fails for generic meet names like "2024 Competition".

---

### Social Extract Prompt

**Phase 1 (perplexity/sonar-pro):**
> Search the web RIGHT NOW for the official social media accounts of {name}. Report Instagram, X/Twitter, and TikTok handles and current follower counts. State the source URL for each figure.

**Phase 2 (gpt-4o-mini):**
> Extract into JSON: `{ instagramHandle, instagramFollowers, twitterHandle, twitterFollowers, tiktokHandle, tiktokFollowers }`. Followers: integer or null — NEVER invent a number.

---

### Photo Lookup Strategy

```
1. Wikipedia exact title lookup    (Wikipedia API /w/api.php)
2. Wikipedia search fallback       (requires ≥2 name tokens in title)
3. Perplexity web fallback         (ask for direct image URL ending in .jpg/.png/.webp)
   → GPT-4o-mini URL extraction   (validate https:// + image extension)
4. Return null
```

---

## Confidence Scoring

### Base scoring (GPT-assigned)
- 85–97: Data explicitly stated in Perplexity research
- 65–84: Inferred or partially supported by research
- < 65: Should not be stored (pipeline discards)

### Post-extraction adjustment (`adjustConfidenceByDomain`)

```typescript
HIGH_AUTHORITY (+5 max):
  worldathletics.org, olympics.com, uci.org, fis-ski.com, iaaf.org,
  worldrowing.com, bbc.co.uk, reuters.com, apnews.com, theguardian.com,
  espn.com, si.com, cyclingnews.com, runnersworld.com, swimswam.com

LOW_AUTHORITY (-10 min 40):
  unknown, reddit.com, twitter.com, x.com, facebook.com,
  instagram.com, tiktok.com, youtube.com, wikipedia.org

No source URL (-5):  harder to verify independently
```

---

## Validation

### Date validation
`isValidDate(value)` — checks YYYY-MM-DD format and that the date is calendar-valid. Timeline events with invalid dates are silently dropped.

### URL validation *(current weakness)*
Only `String(value)` is applied — citation indices like `"[8]"` pass through. See `docs/technical-debt.md`, Issue #1.

### PB/SB validation *(current weakness)*
No cross-check between personalBest and seasonBest. A SB faster than PB (logically impossible) can be stored. See `docs/technical-debt.md`, Issue #2.

---

## Known Weaknesses & Roadmap

The full list is in `docs/technical-debt.md`. The key structural issues:

1. **Citation index leak** — GPT-4o sometimes writes `source4` or `[8]` as source identifiers
2. **PB/SB inversion** — no cross-validation; impossible values can be stored
3. **Contact extraction failure** — 80% of athletes have zero contacts
4. **Below-target item counts** — 8192 token budget too tight for 20–30 timeline events
5. **Competition result backfill** — fails on generic meet names

### Proposed Architecture (Task #27)

Replace the monolithic pipeline with 11 specialised retrieval agents, each responsible for one data domain. See `docs/roadmap.md` and the full task plan in `.local/tasks/agentic-pipeline-redesign.md`.

```
Orchestrator
├── ResultsAgent        (rank, PB, SB — with PB≤SB validation)
├── CompetitionsAgent   (career history — rejects generic meet names)
├── ContactsAgent       (2 parallel queries: coaching + management)
├── SponsorsAgent       (brand deals + confidence decay)
├── SocialProfilesAgent (handle format validation)
├── SocialMetricsAgent  (wraps social-extract.ts)
├── BiographyAgent      (birth date, nationality)
├── PhotoAgent          (WA → federation → Wikipedia)
├── TimelineAgent       (supplementary pass if count < 12)
└── IntelligenceAgent   (3 category queries, 8-item minimum)
```
