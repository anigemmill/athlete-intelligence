/**
 * auto-populate.ts
 *
 * After an athlete is created, this module fires in the background.
 * It calls OpenAI to generate realistic, source-attributed intelligence
 * for the athlete and inserts it across all related tables.
 *
 * Profile photos are sourced from the real Wikipedia API — not AI-generated
 * URLs which are unreliable. If no Wikipedia image exists, avatarUrl is null.
 *
 * The POST /athletes route responds immediately — this runs after the
 * response is sent so the user never waits on it.
 */

import { openai } from "@workspace/integrations-openai-ai-server";
import { openrouter } from "@workspace/integrations-openrouter-ai";
import { db } from "@workspace/db";
import { logger } from "./logger.js";
import { fetchWikipediaPhoto } from "./photo-lookup.js";
import { resolveSourceAttribution, sanitizeStandaloneDomain, isUsableContact } from "./source-validation.js";
import { crossValidatePerformanceMarks } from "./performance-marks.js";
import {
  athletesTable,
  intelligenceItemsTable,
  timelineEventsTable,
  contactsTable,
  competitionsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";

interface AthleteStub {
  id: number;
  name: string;
  sport: string;
  event: string;
  nationality: string;
  age?: number | null;
}

/**
 * Thrown when the Perplexity research stage fails.
 * Caught separately in autoPopulateAthlete so we can distinguish
 * "no verified data available — nothing written" from other pipeline errors.
 */
class PerplexityResearchError extends Error {
  constructor(cause: unknown) {
    super("Perplexity research failed — no verified data available");
    this.name = "PerplexityResearchError";
    this.cause = cause;
  }
}

// ── Twitter/X real follower lookup ──────────────────────────────────────────
// Uses the X API v2 with a Bearer token to fetch real follower counts for any
// public account. Requires TWITTER_BEARER_TOKEN environment secret.
// Returns null silently if the token is missing or the request fails.

async function fetchTwitterFollowers(handle: string): Promise<number | null> {
  const token = process.env.TWITTER_BEARER_TOKEN;
  if (!token) return null;
  try {
    const resp = await fetch(
      `https://api.twitter.com/2/users/by/username/${encodeURIComponent(handle)}?user.fields=public_metrics`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(6000),
      },
    );
    if (!resp.ok) return null;
    const data = await resp.json() as any;
    const count = data?.data?.public_metrics?.followers_count;
    return typeof count === "number" ? count : null;
  } catch {
    return null;
  }
}

// Wikipedia photo lookup is now in ./photo-lookup.ts (shared with admin backfill)

// ── Phase 1: Perplexity Sonar Pro — live web research ────────────────────────
// Searches the web for real, current information about the athlete.
// Returns a detailed research summary with cited sources.

async function researchAthleteWithPerplexity(
  athlete: AthleteStub,
): Promise<{ research: string; citations: string[] }> {
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const currentYear = new Date().getFullYear();
  try {
    const response = await openrouter.chat.completions.create({
      model: "perplexity/sonar",
      max_tokens: 4096,
      messages: [
        {
          role: "system",
          content: `You are an elite sports intelligence researcher. Search the web thoroughly and return accurate, current, cited information. Today's date is ${today}. Be specific — include exact dates, exact results, exact team names. Never fabricate information.`,
        },
        {
          role: "user",
          content: `Research ${athlete.name} (${athlete.sport} — ${athlete.event}, ${athlete.nationality}) comprehensively. Cover ALL of the following:

1. CURRENT STATUS (as of ${today}): What team/squad are they on RIGHT NOW? Current sponsors? Are they still actively competing?
2. RECENT RESULTS (${currentYear - 2}, ${currentYear - 1}, ${currentYear} seasons): List every race/competition result you can find with exact date, event name, location, and finishing position or time/score.
3. HISTORICAL RESULTS (2016–2023): Major career results, championship medals, personal bests with dates.
4. CAREER TIMELINE: Debut year, team changes, major sponsorship deals, injuries, major career milestones with exact dates.
5. RANKINGS: Current world ranking, national ranking, and how these have changed over the past year.
6. PERFORMANCE MARKS: Personal best and season best times/marks (with the date each was set). For DH MTB this is a race finishing time like "4:31.18", not a placement. Look for actual timed results.
7. SOCIAL MEDIA: Their real Instagram handle, X/Twitter handle, TikTok handle. For each platform find the most recent follower count you can — from profile directories, sports media articles, influencer databases, or any web source. Give the number and the source/date it came from. Even a number from a 6-month-old article is better than nothing.
8. KEY CONTACTS: Head coach (name and organisation), manager or agent (name and organisation), any known medical/physio staff.
9. INTELLIGENCE: Recent interviews, media features, sponsorship announcements, controversy, career changes — anything newsworthy from the past 3 years.

Cite your sources where possible. Be as specific and accurate as possible.`,
        },
      ],
    });
    const message = response.choices[0]?.message as any;
    const research = message?.content ?? "";
    // Perplexity's real citation URLs live under message.annotations[].url_citation.url —
    // NOT a top-level `citations` field, which OpenRouter never populates for this model.
    const citations: string[] = Array.isArray(message?.annotations)
      ? message.annotations
          .filter((a: any) => a?.type === "url_citation" && typeof a?.url_citation?.url === "string")
          .map((a: any) => a.url_citation.url as string)
      : [];
    logger.info(
      { athleteId: athlete.id, name: athlete.name, length: research.length, citationCount: citations.length },
      "auto-populate: Perplexity research complete",
    );
    return { research, citations };
  } catch (err) {
    logger.warn(
      { err, athleteId: athlete.id, name: athlete.name },
      "auto-populate: Perplexity research failed — aborting pipeline to prevent fabricated data",
    );
    throw new PerplexityResearchError(err);
  }
}

// ── Phase 2: Structured data extraction ──────────────────────────────────────
// gpt-4o reads the Perplexity research and citation URLs and extracts structured JSON.
// This stage is only reached when Perplexity succeeded; if research is empty the
// pipeline aborts before this point (see PerplexityResearchError above).

const SYSTEM_PROMPT = `You are a sports intelligence data engine for Athlete Intelligence, a B2B SaaS platform used by national sport organisations, professional clubs, and talent agencies.

You will be given verified web research about an athlete. Extract and structure this into accurate JSON. Return ONLY valid JSON — no markdown, no explanation.

Rules:
- ACCURACY FIRST: Use the provided research as your primary source of truth. Do not contradict it.
- If the research states a specific team, result, date, or fact — use it exactly as stated.
- If the research does not cover something, use your own knowledge to fill gaps — but mark lower confidence (65–75) for inferred data.
- sourceUrl MUST be chosen from the provided CITATION URLs list. If no citation is relevant, set sourceUrl to null. NEVER invent, guess, or construct a URL — fabricated URLs cause 404 errors for users.
- sourceDomain must match the domain of the chosen sourceUrl, or be the most relevant real domain from the research if sourceUrl is null.
- Dates must be ISO-8601 strings reflecting when events actually occurred.
- Confidence scores: 85–97 for data from research, 65–80 for inferred data.
- Categories: intelligence_items use one of: results_rankings | media_interviews | sponsorships | career_changes
- Contact categories: management | coaching | medical | media | sponsorship
- Competition tiers: A | B | C. Status: upcoming | completed`;

const USER_PROMPT = (a: AthleteStub, research: string, citations: string[]): string => {
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const currentYear = new Date().getFullYear();
  return `
Athlete profile:
- Name: ${a.name}
- Sport: ${a.sport}
- Event/Position: ${a.event}
- Nationality: ${a.nationality}
- Age: ${a.age ?? "unknown"}

${citations.length > 0
  ? `VERIFIED CITATION URLs — use ONLY these for sourceUrl fields. Pick the most topically relevant one per item, or set sourceUrl to null if none apply. Do NOT invent URLs.
${citations.map((c, i) => `${i + 1}. ${c}`).join("\n")}

`
  : ""}${research
  ? `VERIFIED WEB RESEARCH (use this as your primary source of truth — do not contradict it):
\`\`\`
${research}
\`\`\``
  : `ABORT: No verified research is available. Return an empty JSON object: {}. Do not generate, infer, or fabricate any athlete data.`}

Extract and structure the above into the following JSON object:

{
  "athlete_stats": {
    "worldRank": <integer or null>,
    "worldRankDelta": <integer, negative = improved>,
    "nationalRank": <integer or null>,
    "personalBest": <string or null — CRITICAL: this must be an actual measured performance mark ONLY, never a race placement or event name. Format examples by sport: DH MTB = "4:31.18" (race time), Sprint = "9.87s", 800m = "1:43.22", Long jump = "8.95m", Weightlifting = "148kg snatch", Cycling power = "6.8 W/kg". If the athlete's sport uses times, give the time. If unknown, return null.>,
    "seasonBest": <string or null — same format as personalBest. The athlete's best mark in the current season only, same short format. Null if unknown.>,
    "instagramHandle": <string or null — real username without @, null if not found in research>,
    "instagramFollowers": <integer or null — ONLY if research mentions a specific number, otherwise null. Never guess.>,
    "twitterHandle": <string or null — real username without @, null if not found in research>,
    "tiktokHandle": <string or null — real username without @, null if not found in research>,
    "tiktokFollowers": <integer or null — ONLY if research mentions a specific number, otherwise null. Never guess.>
  },
  "intelligence_items": [
    {
      "category": "results_rankings",
      "title": <string>,
      "summary": <string, 2-3 sentences with specific details>,
      "sourceDomain": <string>,
      "sourceUrl": <string or null — MUST be from the citation list above, or null>,
      "confidence": <integer 65-97>,
      "publishedAt": <ISO-8601 date string>
    }
    // 10-12 items total, mix of categories, spread across the last 10 years (${currentYear - 10}–${currentYear}).
    // Distribute dates realistically: 2-3 items from ${currentYear - 10}–${currentYear - 7} (early career),
    // 3-4 items from ${currentYear - 6}–${currentYear - 4} (mid career), 3-5 items from ${currentYear - 3}–${currentYear} (recent).
    // Include a genuine mix: results, media coverage, sponsorships, career moves.
  ],
  "contacts": [
    {
      "role": <string, e.g. "Head Coach">,
      "category": "coaching",
      "name": <string>,
      "org": <string>,
      "orgType": <string or null>,
      "status": "verified",
      "confidence": <integer>,
      "publicEmail": <string or null>,
      "website": <string or null>,
      "note": <string or null>,
      "lastVerified": <YYYY-MM-DD>,
      "dateDiscovered": <YYYY-MM-DD>,
      "sourceDomain": <string>,
      "sourceExcerpt": <string or null>
    }
    // 3-5 contacts: coach, manager/agent, and 1-2 others relevant to sport
  ],
  "competitions": [
    {
      "meetName": <string>,
      "event": <string>,
      "location": <string or null>,
      "date": <YYYY-MM-DD>,
      "tier": "A",
      "status": "completed",
      "result": <string or null, e.g. "1st (9.87s)" or "3rd (147kg snatch)" or "DNF">
    }
    // IMPORTANT: Generate 20-30 competition entries spanning the athlete's FULL career.
    // Start from their first notable season and work forward chronologically to ${today}.
    // Include: early career meets, breakthrough competitions, major championships (Olympics, Worlds,
    // continental championships), domestic competitions, and recent results up to ${today}.
    // For completed competitions: always include a result string (position + performance, e.g. "2nd (1:44.81)").
    // For upcoming (future dates only, i.e. after ${today}): set status "upcoming" and result null.
    // Use realistic tiers: A = World Championships / Olympics / Diamond League finals,
    //   B = Continental championships / national championships / major invitationals,
    //   C = domestic / club / lower-tier meets.
    // Spread results realistically: early career = lower placements, peak years = podiums/wins.
  ]
}
`;
};

// ── Phase 1b: Dedicated career-timeline research ──────────────────────────────
// The general research pass + general extraction call were only producing
// 3-10 timeline events against a 20-30 target — timeline_events was one of
// five arrays competing for a single ~8K-token extraction budget, sourced
// from research that was never asked to be chronologically exhaustive. This
// is a retrieval-strategy fix, not a bigger number in a prompt: a second,
// focused Perplexity query plus a dedicated extraction call with its own
// budget. A failure here does not abort the pipeline — it only means no
// timeline events get added this run; core intelligence/competitions/
// contacts data (already fetched) is still worth keeping.

async function researchCareerTimeline(
  athlete: AthleteStub,
): Promise<{ research: string; citations: string[] }> {
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  try {
    const response = await openrouter.chat.completions.create({
      model: "perplexity/sonar",
      max_tokens: 4096,
      messages: [
        {
          role: "system",
          content: `You are a sports historian building a complete competitive career timeline. Today's date is ${today}. Be exhaustive and chronological. Never fabricate information.`,
        },
        {
          role: "user",
          content: `Build a complete, chronological career history for ${athlete.name} (${athlete.sport} — ${athlete.event}, ${athlete.nationality}), from their EARLIEST known competitive results (junior career, youth championships, or first senior season — whichever is earliest) all the way to ${today}.

For EACH season or career phase, list: the year, what happened (results, team changes, injuries, sponsorship deals, coaching changes, milestone competitions), and where you found it. Do not skip years just because they were quiet. Try to find at least one dated event per year of their competitive career. Elite careers typically have 20-30+ notable dated moments — aim for as many distinct, real, dated events as the record genuinely supports.

Cite your sources.`,
        },
      ],
    });
    const message = response.choices[0]?.message as any;
    const research = message?.content ?? "";
    const citations: string[] = Array.isArray(message?.annotations)
      ? message.annotations
          .filter((a: any) => a?.type === "url_citation" && typeof a?.url_citation?.url === "string")
          .map((a: any) => a.url_citation.url as string)
      : [];
    logger.info(
      { athleteId: athlete.id, name: athlete.name, length: research.length, citationCount: citations.length },
      "auto-populate: career timeline research complete",
    );
    return { research, citations };
  } catch (err) {
    logger.warn(
      { err, athleteId: athlete.id, name: athlete.name },
      "auto-populate: career timeline research failed — skipping timeline events this run",
    );
    return { research: "", citations: [] };
  }
}

const TIMELINE_SYSTEM_PROMPT = `You are a sports intelligence data engine for Athlete Intelligence. You will be given verified chronological career research about an athlete. Extract it into accurate JSON. Return ONLY valid JSON — no markdown, no explanation.

Rules:
- ACCURACY FIRST: use the provided research as your primary source of truth.
- sourceUrl MUST be chosen from the provided CITATION URLs list. If no citation is relevant, set sourceUrl to null. NEVER invent, guess, or construct a URL.
- sourceDomain must match the domain of the chosen sourceUrl, or be the most relevant real domain from the research if sourceUrl is null.
- Dates must be ISO-8601 strings reflecting when events actually occurred.
- Confidence scores: 85–97 for data from research, 65–80 for inferred data.
- Categories: competition | media | sponsorship | career | personal`;

const TIMELINE_USER_PROMPT = (a: AthleteStub, research: string, citations: string[]): string => {
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  return `
Athlete: ${a.name} (${a.sport} — ${a.event}, ${a.nationality})

${citations.length > 0
  ? `VERIFIED CITATION URLs — use ONLY these for sourceUrl fields. Do NOT invent URLs.
${citations.map((c, i) => `${i + 1}. ${c}`).join("\n")}

`
  : ""}${research
  ? `VERIFIED CAREER RESEARCH:
\`\`\`
${research}
\`\`\``
  : `ABORT: No verified research is available. Return { "timeline_events": [] }.`}

Extract a full career timeline as JSON:

{
  "timeline_events": [
    {
      "date": <YYYY-MM-DD>,
      "category": "competition",
      "title": <string>,
      "description": <string>,
      "location": <string or null>,
      "sourceDomain": <string>,
      "sourceUrl": <string or null — MUST be from the citation list above, or null>,
      "confidence": <integer>,
      "significant": <boolean>
    }
    // Generate as many distinct, dated events as the research genuinely supports —
    // target 20-30 for a full career, spanning the athlete's earliest known season
    // through ${today}, in chronological order, oldest first. Do not pad with
    // duplicate or vague entries just to hit a count; every event needs a real
    // date and a real claim grounded in the research above.
  ]
}
`;
};

async function extractCareerTimeline(
  athlete: AthleteStub,
  research: string,
  citations: string[],
): Promise<any[]> {
  if (!research) return [];
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: TIMELINE_SYSTEM_PROMPT },
        { role: "user", content: TIMELINE_USER_PROMPT(athlete, research, citations) },
      ],
      response_format: { type: "json_object" },
    });
    const raw = response.choices[0]?.message?.content;
    if (!raw) return [];
    const data = JSON.parse(raw) as { timeline_events?: any[] };
    return Array.isArray(data.timeline_events) ? data.timeline_events : [];
  } catch (err) {
    logger.warn(
      { err, athleteId: athlete.id, name: athlete.name },
      "auto-populate: career timeline extraction failed — skipping timeline events this run",
    );
    return [];
  }
}

/**
 * Minimum confidence score (0–100) required to accept a discovery result.
 * Below this threshold the athlete cannot be uniquely identified from their
 * name alone and the creation request is rejected with HTTP 422.
 */
export const DISCOVERY_CONFIDENCE_THRESHOLD = 70;

/**
 * Returns true if `value` is a string in YYYY-MM-DD format that represents a
 * calendar-valid date (e.g. "2019-13-45" is rejected even though it matches
 * the pattern).  Used to filter out unparseable or fabricated dates from GPT
 * responses before they reach the database.
 */
function isValidDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value);
  return !isNaN(d.getTime());
}

/**
 * Given only an athlete's name, call OpenAI to identify their sport, event,
 * nationality, approximate age, and — critically — how confidently this name
 * maps to a single identifiable individual.
 *
 * Confidence scale:
 *   90–100  Unambiguous: one uniquely identifiable well-known athlete
 *   70–89   Confident: not a common name, GPT has meaningful knowledge of this person
 *   50–69   Uncertain: multiple athletes share this name, or athlete is obscure
 *   < 50    No identification possible: very common name or completely unknown
 *
 * Returns null for sport/nationality when they cannot be determined, so the
 * caller can detect and reject an incomplete identity rather than silently
 * defaulting to "Athletics" / "".
 */
export async function discoverAthleteProfile(name: string): Promise<{
  sport: string | null;
  event: string | null;
  nationality: string | null;
  age: number | null;
  confidence: number;
  ambiguous: boolean;
  reason: string;
}> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_completion_tokens: 512,
    messages: [
      {
        role: "system",
        content: `You are a sports data assistant. Given an athlete's name, identify the specific individual and return a JSON object.

Return ONLY valid JSON, no markdown. Fields:
- sport: their primary sport as a string, or null if you cannot determine it
- event: their specific event or position, or null if unknown
- nationality: their country name, or null if you cannot determine it
- age: approximate age as an integer, or null if unknown
- confidence: integer 0-100 — how confident you are that this name maps to ONE specific identifiable athlete:
    90-100: unambiguous, one uniquely identifiable well-known athlete
    70-89:  confident, not a very common name and you have real knowledge of this person
    50-69:  uncertain, multiple athletes share this name or this person is not well-known
    0-49:   cannot identify, very common name or no sports association found
- ambiguous: boolean — true if multiple athletes share this name across different sports or countries
- reason: one sentence explaining your confidence assessment`,
      },
      {
        role: "user",
        content: `Athlete name: "${name}"\n\nReturn: { "sport": string|null, "event": string|null, "nationality": string|null, "age": integer|null, "confidence": integer, "ambiguous": boolean, "reason": string }`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error("Empty response from OpenAI");

  const data = JSON.parse(raw);
  return {
    sport:       typeof data.sport       === "string"  ? data.sport       : null,
    event:       typeof data.event       === "string"  ? data.event       : null,
    nationality: typeof data.nationality === "string"  ? data.nationality : null,
    age:         typeof data.age         === "number"  ? data.age         : null,
    confidence:  typeof data.confidence  === "number"  ? Math.min(100, Math.max(0, Math.round(data.confidence))) : 0,
    ambiguous:   typeof data.ambiguous   === "boolean" ? data.ambiguous   : true,
    reason:      typeof data.reason      === "string"  ? data.reason      : "Could not assess confidence.",
  };
}

export async function autoPopulateAthlete(athlete: AthleteStub): Promise<void> {
  try {
    // Phase 1: Perplexity web research (general + dedicated career-timeline
    // query) + Wikipedia photo all run in parallel.
    const [{ research, citations }, timelineResearch, avatarUrl] = await Promise.all([
      researchAthleteWithPerplexity(athlete),
      researchCareerTimeline(athlete),
      fetchWikipediaPhoto(athlete.name, athlete.sport),
    ]);

    // Phase 2: Structured JSON extraction — gpt-4o reads the real
    // Perplexity research and citation URLs as its source of truth.
    // Timeline events are extracted separately (see Phase 2b below) so they
    // get their own token budget instead of competing with everything else.
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: USER_PROMPT(athlete, research, citations) },
      ],
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) throw new Error("Empty OpenAI response");

    const data = JSON.parse(raw) as {
      athlete_stats?: Record<string, unknown>;
      intelligence_items?: any[];
      contacts?: any[];
      competitions?: any[];
    };

    // Phase 2b: dedicated career-timeline extraction, with its own citations.
    const timelineEventsRaw = await extractCareerTimeline(
      athlete,
      timelineResearch.research,
      timelineResearch.citations,
    );

    // ── 1. Update athlete stats + verified photo + real Twitter followers ────
    if (data.athlete_stats) {
      const s = data.athlete_stats;
      const aiTwitterHandle = typeof s.twitterHandle === "string" ? s.twitterHandle : null;

      // Fetch real Twitter follower count if we have a handle (runs in parallel with nothing else)
      const realTwitterFollowers = aiTwitterHandle
        ? await fetchTwitterFollowers(aiTwitterHandle)
        : null;

      // Cross-validate personal-best/season-best rather than trusting GPT's
      // two independently-extracted fields to already be consistent.
      const { personalBest, seasonBest } = crossValidatePerformanceMarks(
        typeof s.personalBest === "string" ? s.personalBest : null,
        typeof s.seasonBest === "string" ? s.seasonBest : null,
        { athleteId: athlete.id, name: athlete.name },
      );

      await db
        .update(athletesTable)
        .set({
          worldRank: typeof s.worldRank === "number" ? s.worldRank : null,
          worldRankDelta: typeof s.worldRankDelta === "number" ? s.worldRankDelta : 0,
          nationalRank: typeof s.nationalRank === "number" ? s.nationalRank : null,
          personalBest,
          seasonBest,
          // Handles and follower counts sourced from Perplexity web research
          instagramHandle: typeof s.instagramHandle === "string" ? s.instagramHandle : null,
          instagramFollowers: typeof s.instagramFollowers === "number" ? s.instagramFollowers : undefined,
          twitterHandle: aiTwitterHandle,
          tiktokHandle: typeof s.tiktokHandle === "string" ? s.tiktokHandle : null,
          tiktokFollowers: typeof s.tiktokFollowers === "number" ? s.tiktokFollowers : undefined,
          // Twitter followers: X API v2 real-time count overrides Perplexity if available
          twitterFollowers: realTwitterFollowers ?? (typeof s.twitterFollowers === "number" ? s.twitterFollowers : undefined),
          // avatarUrl: pulled from Wikipedia API — not AI-generated
          avatarUrl: avatarUrl ?? null,
          hasNewIntelligence: true,
          lastCrawledAt: new Date(),
        })
        .where(eq(athletesTable.id, athlete.id));

      if (realTwitterFollowers !== null) {
        logger.info(
          { athleteId: athlete.id, handle: aiTwitterHandle, followers: realTwitterFollowers },
          "auto-populate: fetched real Twitter follower count",
        );
      }
    }

    // ── 2. Intelligence items ────────────────────────────────────────────────
    if (Array.isArray(data.intelligence_items) && data.intelligence_items.length > 0) {
      const rows = data.intelligence_items.map((item: any) => {
        // sourceUrl is only trusted if it exactly matches a real Perplexity
        // citation; sourceDomain is derived from that match, never from
        // GPT's own (potentially fabricated) claim.
        const { sourceDomain, sourceUrl } = resolveSourceAttribution(item.sourceUrl, citations);
        const baseConfidence = typeof item.confidence === "number" ? item.confidence : 80;
        return {
          athleteId: athlete.id,
          athleteName: athlete.name,
          category: item.category ?? "results_rankings",
          title: String(item.title ?? ""),
          summary: item.summary ? String(item.summary) : null,
          sourceDomain,
          sourceUrl,
          confidence: adjustConfidenceByDomain(baseConfidence, sourceDomain, sourceUrl !== null),
          publishedAt: item.publishedAt ? new Date(item.publishedAt) : new Date(),
        };
      });
      await db.insert(intelligenceItemsTable).values(rows);
      await db
        .update(athletesTable)
        .set({ intelligenceCount: rows.length, hasNewIntelligence: true })
        .where(eq(athletesTable.id, athlete.id));
    }

    // ── 3. Timeline events (from the dedicated career-timeline pass) ─────────
    if (Array.isArray(timelineEventsRaw) && timelineEventsRaw.length > 0) {
      const validEvents = timelineEventsRaw.filter((ev: any) => {
        if (isValidDate(ev.date)) return true;
        logger.warn(
          { athleteId: athlete.id, title: ev.title, date: ev.date },
          "auto-populate: skipping timeline event — unparseable or missing date",
        );
        return false;
      });
      if (validEvents.length > 0) {
        const rows = validEvents.map((ev: any) => {
          const { sourceDomain, sourceUrl } = resolveSourceAttribution(ev.sourceUrl, timelineResearch.citations);
          const baseConfidence = typeof ev.confidence === "number" ? ev.confidence : 85;
          return {
            athleteId: athlete.id,
            date: ev.date as string, // validated above — no fallback required
            category: ev.category ?? "competition",
            title: String(ev.title ?? ""),
            description: ev.description ? String(ev.description) : null,
            location: ev.location ? String(ev.location) : null,
            sourceDomain,
            sourceUrl,
            confidence: adjustConfidenceByDomain(baseConfidence, sourceDomain, sourceUrl !== null),
            significant: Boolean(ev.significant),
          };
        });
        await db.insert(timelineEventsTable).values(rows);
      }
    }

    // ── 4. Contacts ──────────────────────────────────────────────────────────
    if (Array.isArray(data.contacts) && data.contacts.length > 0) {
      const today = new Date().toISOString().split("T")[0];
      // Drop contacts with no real identifying information — a category
      // label with a blank or literal "Unknown" name/org is worse than no
      // contact at all, since it renders as an empty-looking card in the UI.
      const usableContacts = data.contacts.filter((c: any) => isUsableContact(c.name, c.org));
      const droppedCount = data.contacts.length - usableContacts.length;
      if (droppedCount > 0) {
        logger.warn(
          { athleteId: athlete.id, name: athlete.name, droppedCount },
          "auto-populate: dropped contacts with blank or Unknown name/org",
        );
      }
      const rows = usableContacts.map((c: any) => {
        const sourceDomain = sanitizeStandaloneDomain(c.sourceDomain);
        const baseConfidence = typeof c.confidence === "number" ? c.confidence : 80;
        return {
          athleteId: athlete.id,
          role: String(c.role ?? "Unknown"),
          category: c.category ?? "management",
          name: String(c.name).trim(),
          org: String(c.org).trim(),
          orgType: c.orgType ? String(c.orgType) : null,
          status: c.status ?? "verified",
          confidence: adjustConfidenceByDomain(baseConfidence, sourceDomain, false),
          publicEmail: c.publicEmail ? String(c.publicEmail) : null,
          website: c.website ? String(c.website) : null,
          note: c.note ? String(c.note) : null,
          lastVerified: String(c.lastVerified ?? today),
          dateDiscovered: String(c.dateDiscovered ?? today),
          sourceDomain,
          sourceExcerpt: c.sourceExcerpt ? String(c.sourceExcerpt) : null,
        };
      });
      if (rows.length > 0) {
        await db.insert(contactsTable).values(rows);
      }
    }

    // ── 5. Competitions ──────────────────────────────────────────────────────
    if (Array.isArray(data.competitions) && data.competitions.length > 0) {
      const rows = data.competitions.map((comp: any) => ({
        athleteId: athlete.id,
        athleteName: athlete.name,
        meetName: String(comp.meetName ?? ""),
        event: String(comp.event ?? athlete.event ?? ""),
        location: comp.location ? String(comp.location) : null,
        date: String(comp.date ?? new Date().toISOString().split("T")[0]),
        tier: comp.tier ?? "B",
        status: comp.status ?? "upcoming",
        result: comp.result ? String(comp.result) : null,
      }));
      await db.insert(competitionsTable).values(rows);
    }

    logger.info(
      { athleteId: athlete.id, name: athlete.name, hasPhoto: !!avatarUrl },
      "auto-populate: completed successfully",
    );
  } catch (err) {
    if (err instanceof PerplexityResearchError) {
      // Perplexity failed before any DB writes occurred.
      // Athlete row exists (created by POST /athletes) but has no intelligence data.
      // lastCrawledAt remains null — signals "never successfully populated, safe to retry".
      logger.error(
        { cause: err.cause, athleteId: athlete.id, name: athlete.name },
        "auto-populate: aborted — Perplexity research failed; no intelligence data written to database",
      );
    } else {
      // GPT extraction or database write failed after research succeeded.
      // Partial data may have been written; admin retry will overwrite with fresh data.
      // IMPORTANT: stamp lastCrawledAt so the scheduler doesn't immediately re-queue
      // this athlete on the next cycle — give it 24 hours before retrying.
      try {
        await db
          .update(athletesTable)
          .set({ lastCrawledAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) }) // 6 days ago → retries in ~1 day
          .where(eq(athletesTable.id, athlete.id));
      } catch {
        // ignore — best-effort
      }
      logger.error(
        { err, athleteId: athlete.id, name: athlete.name },
        "auto-populate: failed during extraction or database write",
      );
    }
  }
}

// ── Domain-authority confidence adjuster ─────────────────────────────────────
// Post-processes GPT-assigned confidence scores with a domain quality modifier.
// Authoritative sports domains get a small boost; unknown/generic domains get a
// small penalty. Applied to intelligence items before they are inserted.

const HIGH_AUTHORITY_DOMAINS = new Set([
  "worldathletics.org", "olympics.com", "uci.org", "fis-ski.com", "iaaf.org",
  "worldrowing.com", "worldsailing.org", "fina.org", "worldarchery.org",
  "redbull.com", "bbc.co.uk", "bbc.com", "reuters.com", "apnews.com",
  "theguardian.com", "espn.com", "si.com", "athleticsweekly.com",
  "insidethegames.biz", "cyclingnews.com", "velonews.com", "runnersworld.com",
  "swimswam.com", "trackandfielddailynews.com", "lequipe.fr",
]);

const LOW_AUTHORITY_DOMAINS = new Set([
  "unknown", "reddit.com", "twitter.com", "x.com", "facebook.com",
  "instagram.com", "tiktok.com", "youtube.com", "wikipedia.org",
]);

export function adjustConfidenceByDomain(
  confidence: number,
  sourceDomain: string,
  hasSourceUrl: boolean,
): number {
  const domain = sourceDomain.toLowerCase().replace(/^www\./, "");
  let adjusted = confidence;

  if (HIGH_AUTHORITY_DOMAINS.has(domain)) {
    adjusted = Math.min(97, adjusted + 5); // authoritative source boost
  } else if (LOW_AUTHORITY_DOMAINS.has(domain)) {
    adjusted = Math.max(40, adjusted - 10); // low-authority penalty
  }

  // Items with no source URL lose 5 points — harder to verify
  if (!hasSourceUrl) adjusted = Math.max(40, adjusted - 5);

  return Math.round(adjusted);
}

/**
 * Wipes all existing intelligence data for an athlete, resets their crawl
 * marker, and fires a fresh auto-populate run in the background.
 *
 * This is the single authoritative implementation of the repopulate workflow.
 * Both POST /athletes/:id/repopulate and POST /admin/repopulate/:id delegate
 * here, ensuring identical behaviour regardless of which surface triggered
 * the crawl.
 *
 * The function always fetches the full athlete row itself so that every field
 * (including event and age) is available to the research pipeline — callers
 * should not need to pass athlete data.
 *
 * If the athlete no longer exists by the time this runs (race condition after
 * a 404 check passes), the function logs and returns cleanly; the 202 was
 * already sent to the caller.
 */
export async function repopulateAthlete(athleteId: number): Promise<void> {
  // Fetch the full athlete row so the research pipeline has every field
  // (event, age, etc.). This also guards against race-condition deletions.
  const [athlete] = await db
    .select()
    .from(athletesTable)
    .where(eq(athletesTable.id, athleteId));

  if (!athlete) {
    logger.error({ athleteId }, "repopulate: athlete not found; skipping");
    return;
  }

  // Wipe all existing intelligence data in parallel
  await Promise.all([
    db.delete(intelligenceItemsTable).where(eq(intelligenceItemsTable.athleteId, athleteId)),
    db.delete(timelineEventsTable).where(eq(timelineEventsTable.athleteId, athleteId)),
    db.delete(contactsTable).where(eq(contactsTable.athleteId, athleteId)),
    db.delete(competitionsTable).where(eq(competitionsTable.athleteId, athleteId)),
  ]);

  // Reset crawl marker so the dossier page shows "populating" state
  await db
    .update(athletesTable)
    .set({ intelligenceCount: 0, hasNewIntelligence: false, lastCrawledAt: null })
    .where(eq(athletesTable.id, athleteId));

  // Fire the research pipeline in the background — do not await
  autoPopulateAthlete({
    id:          athlete.id,
    name:        athlete.name,
    sport:       athlete.sport       ?? "",
    event:       athlete.event       ?? "",
    nationality: athlete.nationality ?? "",
    age:         athlete.age,
  }).catch((err) =>
    logger.error({ err, athleteId }, "repopulate: background populate failed"),
  );
}
