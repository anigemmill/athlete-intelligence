# Athlete Intelligence — AI Architecture

## Overview

The AI pipeline turns a single athlete name into a structured, evidence-attributed dossier across 5 database tables. Every piece of data has a source domain, optional source URL, and a confidence score (0–100). The pipeline runs in the background after athlete creation and on every scheduled refresh.

**As of the M3.1–M12 pipeline redesign (August 2026, `docs/live-pipeline-verification-2026-08-09-m12-results.md` and the full report series it links back through), the single monolithic research+extraction prompt described in earlier versions of this document no longer exists.** Every field the platform stores is now produced by its own dedicated retrieval agent — a self-contained research (Perplexity) + extraction (GPT-4o) + validation cycle that never throws and degrades to an empty/default result on failure rather than fabricating data or blocking the rest of the pipeline. This was originally proposed as Task #27 in `docs/roadmap.md`; it is now built and live-verified. See "Retrieval Agents" below for the current architecture.

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
        ┌───────▼─────────────────────────────────────────────┐
        │  Phase 1 — 8 retrieval agents run in parallel        │
        │  (Promise.all; every agent catches its own failures  │
        │  and returns a safe default, so nothing here can     │
        │  reject and no single agent's failure discards       │
        │  another agent's already-validated results)          │
        │                                                       │
        │  ResultsAgent · CompetitionsAgent · ContactsAgent     │
        │  TimelineAgent · SponsorsAgent · SocialProfilesAgent  │
        │  BiographyAgent · PhotoAgent · IntelligenceAgent      │
        └───────┬───────────────────────────────────────────────┘
                │ SocialProfilesAgent's handles feed →
                ▼
┌───────────────────────────────────────────┐
│  Phase 2                                   │
│  SocialMetricsAgent(handles)               │
│  X API v2 for Twitter, handle-matched      │
│  Perplexity fallback for IG/TikTok         │
└───────────────┬───────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────┐
│  DB writes                                 │
│  • athletes (stats, bio, social, photo)    │
│  • intelligence_items (Intelligence+       │
│    Sponsors agent rows merged)             │
│  • timeline_events                         │
│  • contacts                                │
│  • competitions                            │
└───────────────────────────────────────────┘
```

See "Retrieval Agents" below for what each agent owns and how it validates its own output.

---

## Retrieval Agents

Each agent lives in its own file (`artifacts/api-server/src/lib/*-agent.ts`) and follows the same shape: a dedicated `callPerplexity()` research call, a dedicated GPT-4o (or GPT-4o-mini) extraction call, local validation, and a **never-throws contract** — a failure at any stage is caught, logged, and returns an empty array / null / default object rather than propagating. All agents share `perplexity-client.ts` (`callPerplexity`), `retry.ts` (`withRetry` — retries only transient HTTP 429/5xx/network errors, never validation failures), `ai-concurrency.ts` (`withAiConcurrencyLimit`, cap 6 concurrent AI calls process-wide), `athlete-stub.ts` (`AthleteStub` type), `validation.ts` (`isValidDate`), and `source-validation.ts` (`resolveSourceAttribution`, `applyConfidenceFloor`, `adjustConfidenceByDomain`).

| Agent | File | Owns | Confidence floor |
|---|---|---|---|
| ResultsAgent | `results-agent.ts` | `worldRank`, `worldRankDelta`, `nationalRank`, `personalBest`, `seasonBest` — PB/SB cross-validated via `crossValidatePerformanceMarks()` (`performance-marks.ts`) so a season best can never be stored faster than a personal best | n/a (numeric/mark fields, not confidence-scored items) |
| CompetitionsAgent | `competitions-agent.ts` | Competition history; rejects generic meet names (`isGenericMeetName()`) | n/a |
| ContactsAgent | `contacts-agent.ts` | Two parallel scopes — "coaching" and "representation" (management/agents, excludes sponsor deals, ContactsAgent's job is people not deals) — distinguishes "no evidence found" from "confirmed absent" rather than guessing | 70 |
| TimelineAgent | `timeline-agent.ts` | Career timeline events; "20–30 events" is an investigative-depth benchmark logged when under, never a padding target | 70 |
| SponsorsAgent | `sponsors-agent.ts` | Brand-deal items (writes to `intelligence_items`, category `sponsorships`) with recency-based confidence decay — a deal reported >36 months ago can decay to as low as 40, deliberately, since decay lowers confidence but never drops a real historical deal outright | 70 (before decay) |
| SocialProfilesAgent | `social-profiles-agent.ts` | Instagram/X/TikTok **handles** only (format-validated, `isValidHandle()`) | n/a |
| SocialMetricsAgent | `social-metrics-agent.ts` | Follower **counts** — real X API v2 for Twitter, `social-extract.ts`-wrapped Perplexity fallback for Instagram/TikTok, only trusted if the discovered handle matches the already-validated one | n/a |
| BiographyAgent | `biography-agent.ts` | `age`, `nationality` — nationality only overwritten on **explicit** confirmation of a change, never on a merely-different claimed value | 80 |
| PhotoAgent | `photo-agent.ts` | `avatarUrl` — tries a federation-first search (World Athletics → federation → NOC) with citation-hostname validation, falls back to the existing Wikipedia-first hierarchy (`photo-lookup.ts`) if nothing validates | n/a (hostname-match gated, not confidence-scored) |
| IntelligenceAgent | `intelligence-agent.ts` | General `intelligence_items` in 3 categories (`results_rankings`, `media_interviews`, `career_changes`) run as parallel queries; "8 items" per category is an investigative-depth benchmark, never a padding target | 70 |

`intelligence_items` is the one table two agents write to (IntelligenceAgent's 3 general categories + SponsorsAgent's `sponsorships` category) — both fully validate their own rows before the orchestrator merges them into a single insert.

---

## Services

### Perplexity Sonar (via OpenRouter)

**Package:** `@workspace/integrations-openrouter-ai`  
**Model:** `perplexity/sonar`  
**Purpose:** Live web search for current athlete data

Perplexity's real citations live at `response.choices[0].message.annotations[].url_citation.url` — **not** a top-level `citations` field (the original pipeline read the wrong field; this was the root-cause bug fixed in the M3.1 verification, see `docs/live-pipeline-verification-2026-08-09-m3.1.md`). `perplexity-client.ts`'s shared `callPerplexity()` is the single place that parses this correctly; every agent below calls it rather than the OpenRouter client directly.

Used in:
- Every `*-agent.ts` retrieval agent's own research call (see "Retrieval Agents" above)
- `result-backfill.ts` — targeted competition result lookups
- `social-extract.ts` — social handle + follower lookup (wrapped by SocialMetricsAgent)
- `photo-lookup.ts` — Wikipedia-first fallback photo search (wrapped by PhotoAgent)

**Social lookup uses `perplexity/sonar-pro`** for higher result quality.

### GPT-4o (via OpenAI)

**Package:** `@workspace/integrations-openai-ai-server`  
**Model:** `gpt-4o`  
**Purpose:** Structured data extraction and athlete discovery

Used for:
- `discoverAthleteProfile()` — athlete identity resolution (512 tokens)
- Each retrieval agent's own extraction call (see "Retrieval Agents" above) — 512–2048 tokens depending on the agent, versus the original single 8192-token combined extraction
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

### Retrieval Agent Prompts (current)

Each agent's research and extraction prompts are specific to the one data domain it owns, following the same shape: system prompt sets "quality over quantity, evidence over completeness, unknown over invented" as the guiding principle, user prompt supplies the athlete profile plus (for extraction) the verified citation URL list and research text. Rather than duplicate all 8 prompts here, see each agent's own file — `artifacts/api-server/src/lib/*-agent.ts` — where the prompt lives next to the validation logic it feeds.

**The single combined research prompt and 8192-token combined extraction schema previously documented here (9-section research covering current status, results, rankings, marks, social, contacts, and intelligence in one pass; one JSON object with `athlete_stats` + `intelligence_items` + `timeline_events` + `contacts` + `competitions`) no longer exists.** It was replaced field-by-field across M3.1–M12; see "Retrieval Agents" above for what replaced it.

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

Now wrapped by `SocialMetricsAgent` (`social-metrics-agent.ts`), which additionally only trusts a follower count if the handle it was found under matches the handle `SocialProfilesAgent` already validated, and uses the real X API v2 for Twitter rather than this Perplexity path.

---

### Photo Lookup Strategy

```
1. Wikipedia exact title lookup    (Wikipedia API /w/api.php)
2. Wikipedia search fallback       (requires ≥2 name tokens in title)
3. Perplexity web fallback         (ask for direct image URL ending in .jpg/.png/.webp)
   → GPT-4o-mini URL extraction   (validate https:// + image extension)
4. Return null
```

This hierarchy is now `PhotoAgent`'s fallback path — `PhotoAgent` (`photo-agent.ts`) tries a federation-first search (World Athletics → sport federation → National Olympic Committee, with citation-hostname validation) first, per docs/technical-debt.md's Priority 6 recommendation, and only falls back to the sequence above if that finds nothing.

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

### URL validation
`resolveSourceAttribution()` (`source-validation.ts`) requires `sourceUrl` to exactly match one of the real citation URLs returned by that agent's own Perplexity call; a citation index like `"[8]"` or a non-matching URL resolves to `sourceUrl: null` rather than being stored as-is. Fixed in M3.1 — this was the original citation-index-leak bug (see below).

### PB/SB validation
`crossValidatePerformanceMarks()` (`performance-marks.ts`, called from `results-agent.ts`) parses both marks and rejects a season best that is numerically faster than the personal best, logging the conflict rather than storing an impossible value. Fixed in M3.1.

---

## Resolved Weaknesses (fixed M3.1–M12)

These were the structural issues identified in the original accuracy audit and are now fixed; the fuller historical writeup is in `docs/technical-debt.md`, but that document predates this pipeline redesign and should be read as history, not current state:

1. **Citation index leak** — GPT-4o's citations were being read from a top-level `citations` field OpenRouter never populates; real citations live at `message.annotations[].url_citation.url`. Fixed in M3.1 (`perplexity-client.ts`).
2. **PB/SB inversion** — fixed in M3.1 via `crossValidatePerformanceMarks()`, now called from `results-agent.ts` (M12).
3. **Contact extraction failure** — fixed in M5 (`contacts-agent.ts`): two parallel scopes (coaching, representation), each distinguishing "no evidence found" from "confirmed absent," never storing blank/inferred contacts.
4. **Below-target item counts** — addressed in M6 (TimelineAgent) and M11 (IntelligenceAgent) by giving each category its own dedicated research+extraction call instead of sharing one token budget; the target counts (20–30 timeline events, 8 items/intelligence category) are treated as investigative-depth benchmarks logged when under, never as padding targets — see `docs/live-pipeline-verification-2026-08-09-m6.md` for why a hard target was explicitly rejected.
5. **Competition result backfill generic meet names** — `CompetitionsAgent` (M4) rejects generic meet names at extraction time (`isGenericMeetName()`) rather than relying on downstream fuzzy matching to cope with them; `result-backfill.ts`'s matching weakness for pre-existing rows is unchanged and still applies to data written before M4.

### Current Architecture (Task #27 — complete)

The monolithic pipeline was replaced with 8 specialised retrieval agents, each responsible for one data domain — see "Retrieval Agents" above for the full breakdown, and `docs/roadmap.md` / `.local/tasks/agentic-pipeline-redesign.md` for the original plan.
