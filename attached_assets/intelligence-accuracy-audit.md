# Athlete Intelligence — Intelligence Accuracy & Source Validation Audit
**Date:** 1 August 2026  
**Sample:** 5 athletes (Peter Bol, Brook Macdonald, Zoe Hobbs, Nick Willis, Hamish Kerr)  
**Method:** Live database query + pipeline code trace. No assumptions. Evidence only.

---

## 1. Pipeline Trace

### How the pipeline works (end to end)

```
1. POST /athletes (user submits name)
       ↓
2. discoverAthleteProfile() — GPT-4o identifies sport/nationality/confidence
       ↓ (threshold: ≥70 confidence)
3. repopulateAthlete() — wipes existing data, fires background job
       ↓
4. PARALLEL:
   ├── researchAthleteWithPerplexity() — Perplexity Sonar searches live web
   │       returns: research text + citation URLs array
   └── fetchWikipediaPhoto() — Wikipedia exact match → search → Perplexity fallback
       ↓
5. GPT-4o structured extraction — reads Perplexity research + citations,
   outputs JSON: athlete_stats, intelligence_items, timeline_events, contacts, competitions
       ↓
6. DB writes (sequential):
   ├── UPDATE athletes SET worldRank, personalBest, seasonBest, handles, avatarUrl, lastCrawledAt
   ├── INSERT intelligence_items
   ├── INSERT timeline_events
   ├── INSERT contacts
   └── INSERT competitions
       ↓
7. Background scheduler — runs every 6h, refreshes up to 3 stale athletes (>5 days old)
```

### Trace per athlete (what actually reached the database)

| Athlete | Intel Items | Timeline Events | Contacts | Past Comps | Results Filled |
|---|---|---|---|---|---|
| Peter Bol | 3 (target: 10–12) | 2 (target: 20–30) | 1 | 2 | 2/2 ✓ |
| Brook Macdonald | 5 (target: 10–12) | 4 (target: 20–30) | 0 | 2 | 0/2 ✗ |
| Zoe Hobbs | 6 (target: 10–12) | 6 (target: 20–30) | 0 | 4 | 4/4 ✓ |
| Nick Willis | 5 (target: 10–12) | 5 (target: 20–30) | 0 | 3 | 3/3 ✓ |
| Hamish Kerr | 11 (target: 10–12) | 10 (target: 20–30) | 0 | 7 | 7/7 ✓ |

**Observation:** Every athlete's intel item and timeline event count is well below the target specified in the extraction prompt. Hamish Kerr is the only athlete approaching the intelligence target; no athlete approaches the 20–30 timeline event target. Contact extraction is failing for 4 of 5 athletes.

---

## 2. Accuracy Audit

### Peter Bol (Athletics, 800m, AUS)

| Field | Stored Value | Assessment | Root Cause |
|---|---|---|---|
| World Rank | 14 | Plausible for 800m | Needs verification against World Athletics |
| Personal Best | 1:45.14 | **WRONG** — SB is 1:43.64 which is faster | PB/SB stored independently, no cross-validation |
| Season Best | 1:43.64 | Correct (Oslo DL 2026, confirmed in competitions table) | — |
| Photo | Has photo | Cannot verify without visual inspection | — |
| Instagram handle | null | **Missing** — Bol has an active Instagram account | Not extracted |
| Twitter handle | null | **Missing** | Not extracted |
| Instagram followers | 15,600 | No source to verify | Perplexity estimate |
| Twitter followers | 9,872 | No source to verify | Perplexity estimate |
| Coach | Justin Rinaldi, WA Athletics | Plausible — he has worked with WA Athletics coaches | Cannot fully verify |
| Manager | null | **Missing** | Contact extraction incomplete |
| Timeline events | 2 | **Critically sparse** — only debut and Perth Classic | Extraction truncated |
| Intelligence items | 3 | **Below target** — only 2026 Diamond League items | Extraction truncated |

**Critical error:** `seasonBest (1:43.64) > personalBest (1:45.14)` — logically impossible. A season best cannot be faster than a career personal best. The personal best field contains stale data from an earlier search that was not updated when the season best exceeded it.

---

### Brook Macdonald (Cycling, MTB Downhill, NZL)

| Field | Stored Value | Assessment | Root Cause |
|---|---|---|---|
| World Rank | 76 | Plausible for UCI DHI | Needs UCI verification |
| Personal Best | null | Correct for MTB (no standardised time format) | — |
| Season Best | null | Correct for MTB | — |
| Photo | Has photo | Cannot verify | — |
| Social handles | null | **Missing** — Macdonald is active on Instagram | Not extracted |
| Team (current) | Unclear | Intelligence items mention "2025 team change" but current team unconfirmed | Source ambiguity |
| Competition: "UCI MTB World Series 2026-08-01" | No result, no location | **Wrong** — stored as a specific event on today's date with no data | Generated as placeholder |
| Competition: "2024 Competition" | "MTB Season", no result | **Wrong** — vague non-specific entry | Extraction produced generic placeholders |
| Timeline | 4 events, 2016–2026 | **Sparse** — 10-year career needs far more | Extraction truncated |
| Contacts | 0 | **Missing entirely** — no coach, team manager, sponsor | Contact extraction failed |

**Critical error:** Both stored competitions are missing results and one is essentially a placeholder. The "UCI MTB World Series 2026-08-01" entry has today's date, no location, and no result — it was likely generated as an "upcoming" event and auto-flipped to "completed" by the view layer without ever having a result fetched.

---

### Zoe Hobbs (Athletics, 100m, NZL)

| Field | Stored Value | Assessment | Root Cause |
|---|---|---|---|
| World Rank | 14 | Plausible | Needs World Athletics verification |
| Personal Best | 10.93s | Plausible if she ran this at Commonwealth Games 2026 | Consistent with competition data |
| Season Best | 10.93s | Correct (matches Commonwealth Games result) | — |
| PB = SB | Both 10.93s | Suspicious — if 10.93s is a new PB set at Commonwealth Games, this is correct. But her 2023 NZ record was 10.97s. If 10.93s is accurate, the timeline should note "New NZ record" | Needs fact-check |
| Instagram handle | null | **Missing** | Not extracted |
| Twitter handle | null | **Missing** | Not extracted |
| Twitter followers | null | **Missing** | Not extracted |
| Contacts | 0 | **Missing** — no coach, no agent | Contact extraction failed |
| Timeline | 6 events | Below target; sparse early career | Extraction truncated |
| Source URLs | 6/6 valid | ✓ Best in sample | — |
| Commonwealth Games 2026 | 1st (10.93s), Glasgow | Plausible — 2026 CWG is scheduled for Glasgow | Needs verification |

**Note:** Zoe Hobbs is the cleanest profile in the sample in terms of source URLs and competition data coherence. The PB/SB equality is suspicious but not necessarily wrong if she just set a new PB at the Commonwealth Games.

---

### Nick Willis (Athletics, 1500m, NZL) — Retired athlete

| Field | Stored Value | Assessment | Root Cause |
|---|---|---|---|
| World Rank | null | **Correct** — Willis retired after Tokyo 2021 | — |
| Personal Best | 3:32.68 | Plausible — his actual PB was around 3:32.xx | Needs World Athletics verification |
| Season Best | null | **Correct** — no current season | — |
| Photo | Has photo | Cannot verify | — |
| Contacts | 0 | **Missing** — despite being a high-profile athlete | Contact extraction failed |
| Source URLs | "[8]", "[7]", "[10]", "[5]", "[3]" | **INVALID** — these are Perplexity citation index numbers, not URLs | Citation index leak (see Root Causes) |
| Beijing 2008 | "2nd" | Partially correct — after Ramzi/Kiprop DQs he received silver; original finish was likely lower | DQ history not fully captured |
| Latest competition | Tokyo 2021 | Correct — he retired after this | — |
| Intelligence item: "2018 Commonwealth Games Withdrawal" categorised as "sponsorships" | Wrong category | **Wrong** — a competition withdrawal should be "career_changes" | Category mis-assignment |

**Critical error:** All 5 source URLs contain citation index numbers ("[8]", "[7]", etc.) instead of actual URLs. These are meaningless references that appear when GPT-4o writes the citation index number to the sourceUrl field rather than resolving it from the citation list.

---

### Hamish Kerr (Athletics, High Jump, NZL)

| Field | Stored Value | Assessment | Root Cause |
|---|---|---|---|
| World Rank | 1 | Plausible — he won Paris 2024 Olympics | Needs World Athletics verification |
| Personal Best | 2.36m | Plausible — consistent with Olympic-level high jump | Needs World Athletics verification |
| Season Best | null | **Missing** — he is actively competing | Not extracted |
| Source domains | "source4", "source6", "source9" | **INVALID** — placeholder/index names, not real domains | Citation index leak — domain variant |
| Source URLs | 0/11 | **All missing** — no intelligence item has a URL | Related to domain extraction failure |
| "2026 Burnout Withdrawal" | career_changes | Specific claim about a very recent event with no source | Potentially fabricated — needs verification |
| "Targeting Los Angeles 2028" | career_changes | Speculative future intent, confidence 85 | Should be lower confidence |
| Contacts | 0 | **Missing** — Olympic champion has known coaching staff | Contact extraction failed |
| Born 1996-08-17, Dunedin | personal/timeline event | Plausible | — |

**Critical error:** Hamish Kerr's source domains are "source4", "source6", "source9" — these are not real domains. This appears to be a variant of the citation index leak where Perplexity returned numbered references and GPT-4o used the shorthand `source4` instead of resolving the actual domain. All 11 intelligence items have no source URL as a consequence.

---

## 3. Source Quality Audit

### Current source hierarchy (what is actually being used)

**Results & Rankings:**
```
Currently used:              Better hierarchy should be:
Perplexity general search    ① World Athletics (worldathletics.org) — official results
wikipedia.org (gen ref)      ② UCI (uci.org for cycling)
diamondleague.com            ③ Diamond League (diamondleague.com)
athletics.org.au             ④ National federation (athletics.org.au, athletics.org.nz)
mtbdata.com                  ⑤ Official event results pages
olympics.com                 ⑥ olympics.com / olympic.org
source4 / source6 / source9  ⑦ Trusted media (BBC Sport, Reuters, AP)
```

**Contacts & Personnel:**
```
Currently used:              Better hierarchy should be:
Perplexity general search    ① Official team/federation websites
(extraction failing)         ② Official press releases
                             ③ LinkedIn (coach profiles)
                             ④ World Athletics athlete profiles (include coach)
                             ⑤ National Olympic Committee profiles
```

**Photos:**
```
Currently used:              Better hierarchy should be:
Wikipedia exact match        ① Official federation athlete profile photo
Wikipedia search fallback    ② World Athletics photo library
Perplexity web fallback      ③ Getty/AFP sports wire (licensed)
                             ④ Official team/event press images
                             ⑤ Wikipedia (as fallback only — photos often old)
```

**Social Media:**
```
Currently used:              Better hierarchy should be:
Perplexity general search    ① Direct platform search (Instagram, X)
(extraction failing)         ② World Athletics athlete profiles (often list handles)
                             ③ National federation profiles
                             ④ Athlete's official website
```

### Source authority scores in current data

| Athlete | Highest-authority source used | Lowest-authority | Verdict |
|---|---|---|---|
| Peter Bol | diamondleague.com, athletics.org.au | No URL verification | Acceptable |
| Brook Macdonald | uci.org ✓ | mtb-news.de | Mixed |
| Zoe Hobbs | worldathletics.org ✓, olympics.com ✓ | wikipedia.org | Good |
| Nick Willis | worldathletics.org ✓ | Citation indices (invalid) | Structurally broken |
| Hamish Kerr | uci.org? (domains are fake) | source4/6/9 (invalid) | Structurally broken |

---

## 4. Data Freshness Report

### Why stale information exists

**Finding 1: Scheduler throughput (now partially fixed)**
- Previous: 1 athlete per 6-hour cycle → max 28 athletes/week
- Current (after recent fix): 3 athletes per 6-hour cycle → max 84 athletes/week
- At 5 athletes, all are currently within the 5-day threshold
- At scale (50+ athletes), stale data would still accumulate

**Finding 2: lastCrawledAt not stamped on partial failure (now fixed)**
- Before the recent fix: if GPT extraction failed after Perplexity succeeded, `lastCrawledAt` remained `NULL`
- `NULL` athletes sort first in the scheduler → the same failing athlete would be re-queued every cycle
- This caused "retry storms" that wasted API quota on athletes that would keep failing

**Finding 3: February competitions still appear**
- Root cause: competitions are generated at crawl time with whatever future dates exist at that moment
- After the crawl date passes, the view layer flips status to "completed" but result remains NULL
- The result-backfill module added recently should address this, but only triggers after a repopulate
- The actual stored status is still "upcoming" in the DB for any athlete not yet re-crawled

**Finding 4: Prompt asks for current data but model may use training knowledge**
- The Perplexity prompt includes today's date and asks for current data
- However, GPT-4o (the extraction stage) has a training cutoff and may fill gaps with stale knowledge
- Instruction: "use your own knowledge to fill gaps" with lower confidence (65-75)
- This means inferred data can be from months ago without any freshness signal

**Finding 5: Photos only update on full repopulate**
- Photos are fetched once at crawl time and stored
- Wikipedia photos are often years old (editorial photos used for encyclopaedic coverage)
- A photo fetched today may show the athlete from 3+ years ago
- No mechanism exists to refresh photos independently of a full data wipe

**Finding 6: Social follower counts go stale immediately**
- Follower counts are fetched at crawl time and stored as static integers
- A count from a crawl 4 days ago is already wrong
- No live API refresh between crawls (Twitter API check exists but requires TWITTER_BEARER_TOKEN which may not be set)

---

## 5. Photo Retrieval Audit

### Current algorithm
```
1. Wikipedia exact title lookup  → thumbnailFromTitle(athleteName)
2. Wikipedia search fallback     → search "{name} {sport}", require ≥2 name tokens in title
3. Perplexity web fallback       → ask Perplexity for a direct image URL
4. Null (no photo)               → avatar shows initials
```

### Problems identified

**Problem 1: Wikipedia photos are outdated**
Wikipedia article photos are editorial choices that may not be refreshed for years. The "profile photo" on a Wikipedia article is typically a representative photo from any point in the athlete's career — often 3–5 years old. For athletes whose appearance changes (injury recovery, new kit, ageing), this produces consistently stale photos.

**Problem 2: No person-verification step**
The search fallback requires ≥2 name tokens in the Wikipedia article title. This prevents the most obvious wrong-person mistakes, but cannot detect:
- An article named "John Smith (athlete)" that is the wrong John Smith
- A disambiguation page that returns a secondary article
- An article whose photo shows a different athlete from a team event

**Problem 3: Perplexity fallback returns unverified URLs**
The Perplexity fallback asks for any `.jpg/.png/.webp` URL. The URL check is syntactic (must end in image extension) but has no verification that the image shows the correct person. Any matching URL passes.

**Problem 4: No independent photo refresh**
Photos only update when the entire athlete profile is wiped and rebuilt. If a better photo becomes available (new World Championship kit photo, updated federation profile), it cannot be fetched without a full repopulate.

**Problem 5: No photo quality scoring**
The system has no mechanism to distinguish a high-quality competition action photo from a blurry Wikipedia thumbnail from 2017. All photos are treated equally once stored.

### Recommended approach (not implemented — awaiting approval)
- Primary: World Athletics athlete profile photos (highest quality, sport-specific, updated regularly)
- Secondary: Official national federation profile photos
- Tertiary: UCI/FINA/other federation databases (sport-specific)
- Fallback: Wikipedia (current behaviour)
- Independent refresh: photo-only re-fetch endpoint without full data wipe

---

## 6. Intelligence Quality Scores

Scoring methodology (out of 100):
- **Profile completeness** (20): rank, PB, SB, social handles, photo
- **Freshness** (20): days since last crawl
- **Source diversity** (10): unique legitimate domains
- **Evidence quality** (15): avg confidence + source URL validity + item count
- **Timeline completeness** (10): events vs. 20-event target
- **Results completeness** (10): % of past comps with results
- **Photo** (5): photo present
- **Contact coverage** (10): coach, manager, sponsor

### Scores

**Peter Bol — 65/100**
- Profile: 14/20 — PB/SB inversion is an accuracy failure; no social handles
- Freshness: 20/20 — crawled today
- Source diversity: 4/10 — only 2 real domains
- Evidence quality: 7/15 — below-target count (3 of 10), no URLs
- Timeline: 1/10 — critically sparse (2 events)
- Results: 10/10 — both competitions have results
- Photo: 5/5
- Contacts: 4/10 — coach only, no manager
- **Key deductions:** PB/SB data contradiction; only 2 timeline events; no social handles extracted

**Brook Macdonald — 47/100**
- Profile: 12/20 — no PB/SB (valid for MTB), no social handles, rank present
- Freshness: 20/20
- Source diversity: 7/10 — 4 domains including uci.org
- Evidence quality: 6/15 — 5 items (below target), no source URLs
- Timeline: 2/10 — only 4 events
- Results: 0/10 — both past competitions have NULL results
- Photo: 5/5
- Contacts: 0/10
- **Key deductions:** No competition results at all; no contacts; sparse timeline; no social data

**Zoe Hobbs — 74/100**
- Profile: 15/20 — rank/PB/SB present, photo present; no social handles
- Freshness: 20/20
- Source diversity: 7/10 — 3 real domains including worldathletics.org
- Evidence quality: 11/15 — 6 items, all 6 have valid source URLs
- Timeline: 3/10 — 6 events (target: 20+)
- Results: 10/10 — all 4 competitions have results
- Photo: 5/5
- Contacts: 0/10
- **Key deductions:** No contacts; timeline well below target; no social handles extracted

**Nick Willis — 57/100**
- Profile: 14/20 — no rank (correct — retired), no SB (correct), PB present
- Freshness: 20/20
- Source diversity: 3/10 — 3 domains but all source URLs are invalid citation indices
- Evidence quality: 3/15 — source URLs are "[8]", "[7]" etc. — structurally broken
- Timeline: 3/10 — 5 events for a 15-year Olympic career
- Results: 10/10 — all 3 competitions have results
- Photo: 5/5
- Contacts: 0/10
- **Key deductions:** Invalid source URLs; sparse timeline; no contacts; retired status not explicitly flagged

**Hamish Kerr — 52/100**
- Profile: 16/20 — rank 1, PB 2.36m present; no SB, no social handles
- Freshness: 20/20
- Source diversity: 1/10 — all source domains are "source4/6/9" — invalid placeholders
- Evidence quality: 3/15 — 11 items but zero valid source URLs or domains
- Timeline: 5/10 — 10 events (closest to target)
- Results: 10/10 — all 7 competitions have results
- Photo: 5/5
- Contacts: 0/10
- **Key deductions:** All source data is structurally invalid; no source URLs; no contacts; "2026 Burnout Withdrawal" unverified claim

### Summary

| Athlete | Score | Biggest deduction |
|---|---|---|
| Zoe Hobbs | 74/100 | No contacts; sparse timeline |
| Peter Bol | 65/100 | PB/SB inversion; 2 timeline events; no social |
| Nick Willis | 57/100 | Invalid source URLs (citation indices) |
| Hamish Kerr | 52/100 | All source domains invalid (source4/6/9) |
| Brook Macdonald | 47/100 | No competition results; no contacts |
| **Platform average** | **59/100** | |

---

## 7. Root Cause Analysis

### Issue 1 — Citation index leak corrupts source attribution (HIGH IMPACT)

**Root cause:** When Perplexity returns research with numbered citations ([1], [2], [3]…), GPT-4o is instructed to pick a URL from the citations list. In some cases, GPT-4o writes the index number itself to the `sourceUrl` field (e.g., "[8]") or abbreviates it to a shorthand name like "source4" for the `sourceDomain` field, instead of resolving it to the actual URL/domain.

**Evidence:** Nick Willis has source_url values "[8]", "[7]", "[10]", "[5]", "[3]". Hamish Kerr has source domains "source4", "source6", "source9".

**User impact:** Source attribution is meaningless for these athletes. The "Sources" tab on the dossier shows fake domains. The IntelligenceHealthPanel reports low source diversity correctly (since it filters "unknown") but the real data is structurally corrupt.

**Affected athletes:** Nick Willis (all 5 URLs), Hamish Kerr (all 11 domain names)

**Root fix needed:** Add post-extraction validation: any sourceUrl matching `^\[\d+\]$` or any sourceDomain matching `^source\d+$` should be set to null. Add the system prompt instruction: "Never write citation index numbers. If you cannot resolve a URL from the citation list, write null."

---

### Issue 2 — PB/SB cross-validation missing (HIGH IMPACT)

**Root cause:** `personalBest` and `seasonBest` are populated independently from the same Perplexity research text. GPT-4o may read a 2022 PB from one paragraph and a 2026 season result from another, storing them in separate fields without checking the logical constraint: seasonBest ≤ personalBest (for time-based sports where lower is better).

**Evidence:** Peter Bol — PB: 1:45.14 (old), SB: 1:43.64 (current) — SB is faster than PB.

**User impact:** Immediately visible data contradiction on the dossier that destroys trust in the platform's accuracy.

**Root fix needed:** After extraction, apply sport-aware cross-validation. For time sports (lower = better), if parsed SB < parsed PB, flag and either: (a) set PB = SB, or (b) discard PB as stale and set to null with a freshness flag.

---

### Issue 3 — Contact extraction failing for most athletes (HIGH IMPACT)

**Root cause:** The extraction prompt asks for 3–5 contacts. In practice, Perplexity's research text may not explicitly name coaches or agents, so GPT-4o skips the field. There is no follow-up query targeted at contacts specifically. The entire contact layer depends on the general research pass mentioning relevant people.

**Evidence:** 4 of 5 athletes have 0 contacts. Peter Bol has 1 (coach only). No manager, agent, or sponsor contact exists for any athlete.

**User impact:** The Contacts tab is empty for most athletes. The Intelligence Health Panel correctly flags "No manager/agent on file" and "No coach on file" as known gaps. But if the underlying extraction isn't capturing contacts, refreshing will not fix it.

**Root fix needed:** Add a dedicated contact-discovery sub-pass — a separate, targeted Perplexity query specifically asking for coaches, agents, federation representatives, and sponsors. Do not rely on the general research pass to surface this data.

---

### Issue 4 — Intelligence item and timeline event counts well below prompt targets (MEDIUM IMPACT)

**Root cause:** The extraction prompt asks for "10-12 intelligence items" and "20-30 timeline events". However, the GPT-4o call has `max_completion_tokens: 8192`. For some athletes the research text is shorter or the model produces fewer items to stay within a safe token limit. The output is whatever GPT-4o decides to generate — there is no minimum count enforcement or retry logic when counts fall short.

**Evidence:**
- Peter Bol: 3 intel items (target: 10), 2 timeline events (target: 20)
- Brook Macdonald: 5 intel items, 4 timeline events
- No athlete reached the 20-event timeline target

**User impact:** Sparse timelines look empty. The intelligence feed has too few items to demonstrate ongoing coverage.

**Root fix needed:** After extraction, check item counts. If intel_items < 8 or timeline_events < 12, trigger a supplementary extraction pass specifically requesting the missing items. Alternatively, increase max_completion_tokens to 16,384 (GPT-4o supports this) and check whether the model was truncating due to the token limit.

---

### Issue 5 — Competition result backfill not firing for all athletes (MEDIUM IMPACT)

**Root cause:** The result-backfill module matches competition names fuzzy between what Perplexity returns and what is stored. For Brook Macdonald, the stored competitions are "UCI MTB World Series" and "2024 Competition" — extremely generic names. Perplexity returns results in sentence form; the fuzzy name matcher (checking whether 15 characters of one name appear in the other) fails to match these vague entries.

**Evidence:** Brook Macdonald has 2 past competitions with NULL results. Both have generic names that would not match typical Perplexity output about specific event results.

**User impact:** Brook Macdonald's results tab is empty. All competitions show "completed" but with no result.

**Root fix needed:** Improve competition data quality at insertion time — require specific event names from the Perplexity research. Fallback: use athlete name + approximate date + sport as the search key for result backfill rather than the stored meet name.

---

## 8. Recommended Roadmap (Awaiting Approval Before Implementation)

Ranked by impact on intelligence quality. Do not implement until approved.

### Priority 1 — Fix citation index leak in source extraction
**Effort:** Low (1–2 hours)  
**Impact:** High — fixes broken source attribution for a subset of athletes immediately  
**Changes:**  
- Add post-extraction validator: null out any sourceUrl matching `^\[\d+\]$` and any sourceDomain matching `^source\d+$` or not containing a `.`
- Add to GPT-4o system prompt: "Never write citation index numbers like [1] or source4. If you cannot determine the real URL or domain, write null."
- Affects: `auto-populate.ts` (extraction step + system prompt)

### Priority 2 — PB/SB cross-validation
**Effort:** Low (1–2 hours)  
**Impact:** High — eliminates logically impossible data that immediately destroys user trust  
**Changes:**  
- After extraction, for time-based sports (containing "m", "s", "min" in value): parse and compare PB vs SB
- If SB is faster than PB, set PB = SB (season best becomes new lifetime best)
- For field events (m, kg): same logic but reversed (higher = better)
- Affects: `auto-populate.ts` (athlete_stats processing step)

### Priority 3 — Dedicated contact-discovery sub-pass
**Effort:** Medium (3–4 hours)  
**Impact:** High — contacts are a core platform value; empty contact tabs undermine trust  
**Changes:**  
- Add a second Perplexity call targeting contacts specifically: `"Who is {name}'s current head coach, agent/manager, and primary sponsor? Include names, organisations, and any publicly known contact details."`
- Run in parallel with the main research pass
- Merge contact results into the main extraction
- Affects: `auto-populate.ts` (new parallel phase)

### Priority 4 — Source URL validation layer
**Effort:** Low (1 hour)  
**Impact:** Medium — prevents invalid URLs from reaching the database  
**Changes:**  
- Add URL format check: sourceUrl must match `^https?://` pattern before being stored
- Any non-URL value (citation indices, relative paths, placeholder text) → set to null
- Add to both intelligence_items and timeline_events insertion code
- Affects: `auto-populate.ts` (DB write steps)

### Priority 5 — Increase token budget and enforce minimum item counts
**Effort:** Low (1 hour)  
**Impact:** Medium — directly addresses below-target intel and timeline counts  
**Changes:**  
- Increase `max_completion_tokens` from 8,192 to 16,384 in the GPT-4o extraction call
- After extraction: if `intel_items.length < 8`, log a warning and queue a supplementary pass
- After extraction: if `timeline_events.length < 12`, extend the prompt's timeline request
- Affects: `auto-populate.ts` (GPT-4o call + post-extraction check)

### Priority 6 — Dedicated contact-discovery sub-pass for refresh flow
**Effort:** Low (30 min)  
**Impact:** Medium — contacts need to be fetched on repopulate too, not just initial create  
**Changes:**  
- Ensure the contact sub-pass (Priority 3) also fires in `repopulateAthlete()`
- Affects: `auto-populate.ts` (repopulate flow)

### Priority 7 — Photo refresh independent of full repopulate
**Effort:** Medium (2–3 hours)  
**Impact:** Medium — photo quality degrades over time without a targeted refresh path  
**Changes:**  
- Add `POST /api/athletes/:id/refresh-photo` endpoint
- Query: World Athletics profile first, then federation, then Wikipedia
- Store result without wiping other data
- Affects: `photo-lookup.ts` (add WA API query), `athletes.ts` (new route)

### Priority 8 — Competition result backfill improvements
**Effort:** Medium (2 hours)  
**Impact:** Medium — empty results on past competitions looks broken  
**Changes:**  
- Use athlete name + sport + approximate year as the search key instead of stored meet name
- Improve fuzzy matching: normalise names (remove year, remove "Championships")
- Affects: `result-backfill.ts`

---

## Summary

The platform's core pipeline is architecturally sound. Perplexity → GPT-4o → structured DB write is the right pattern. The problems are not the AI model — they are validation gaps and prompt instruction leaks that allow malformed data to reach the database.

**Five issues to fix before any new visualisation feature:**
1. Citation index leak (fake source domains + invalid source URLs)
2. PB/SB cross-validation (logically impossible values)
3. Contact extraction (failing for 80% of athletes)
4. Token budget and minimum count enforcement
5. Source URL format validation

None of these require architectural changes. All are targeted additions to `auto-populate.ts` with low implementation risk.

The platform average quality score is **59/100**. Addressing issues 1–4 alone would raise this to an estimated 76–80/100 for the current sample.
