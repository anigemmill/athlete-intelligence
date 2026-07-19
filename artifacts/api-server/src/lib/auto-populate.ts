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

// ── Wikipedia photo lookup ───────────────────────────────────────────────────
// Uses the real Wikipedia API to find verified profile photos.
// Returns the thumbnail URL, or null if no image found or request fails.

async function fetchWikipediaPhoto(athleteName: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      action: "query",
      titles: athleteName,
      prop: "pageimages",
      format: "json",
      pithumbsize: "400",
      redirects: "1",
    });
    const resp = await fetch(`https://en.wikipedia.org/w/api.php?${params}`, {
      headers: { "User-Agent": "AthleteIntelligence/1.0 (sports-intelligence-platform)" },
      signal: AbortSignal.timeout(6000),
    });
    if (!resp.ok) return null;
    const data = await resp.json() as any;
    const pages = data?.query?.pages;
    if (!pages) return null;
    const page = Object.values(pages)[0] as any;
    // page.missing means the article does not exist
    if ("missing" in page || !page?.thumbnail?.source) return null;
    return String(page.thumbnail.source);
  } catch {
    return null;
  }
}

// ── Phase 1: Perplexity Sonar Pro — live web research ────────────────────────
// Searches the web for real, current information about the athlete.
// Returns a detailed research summary with cited sources.

async function researchAthleteWithPerplexity(athlete: AthleteStub): Promise<string> {
  try {
    const response = await openrouter.chat.completions.create({
      model: "perplexity/sonar-pro",
      max_tokens: 8192,
      messages: [
        {
          role: "system",
          content: `You are an elite sports intelligence researcher. Search the web thoroughly and return accurate, current, cited information. Today's date is July 2026. Be specific — include exact dates, exact results, exact team names. Never fabricate information.`,
        },
        {
          role: "user",
          content: `Research ${athlete.name} (${athlete.sport} — ${athlete.event}, ${athlete.nationality}) comprehensively. Cover ALL of the following:

1. CURRENT STATUS (as of mid-2026): What team/squad are they on RIGHT NOW? Current sponsors? Are they still actively competing?
2. RECENT RESULTS (2024, 2025, 2026 seasons): List every race/competition result you can find with exact date, event name, location, and finishing position or time/score.
3. HISTORICAL RESULTS (2016–2023): Major career results, championship medals, personal bests with dates.
4. CAREER TIMELINE: Debut year, team changes, major sponsorship deals, injuries, major career milestones with exact dates.
5. RANKINGS: Current world ranking, national ranking, and how these have changed over the past year.
6. PERFORMANCE MARKS: Personal best and season best (with the date each was set).
7. SOCIAL MEDIA: Their real Instagram handle, X/Twitter handle, TikTok handle. For each platform find the most recent follower count you can — from profile directories, sports media articles, influencer databases, or any web source. Give the number and the source/date it came from. Even a number from a 6-month-old article is better than nothing.
8. KEY CONTACTS: Head coach (name and organisation), manager or agent (name and organisation), any known medical/physio staff.
9. INTELLIGENCE: Recent interviews, media features, sponsorship announcements, controversy, career changes — anything newsworthy from the past 3 years.

Cite your sources where possible. Be as specific and accurate as possible.`,
        },
      ],
    });
    const research = response.choices[0]?.message?.content ?? "";
    logger.info({ athleteId: athlete.id, name: athlete.name, length: research.length }, "auto-populate: Perplexity research complete");
    return research;
  } catch (err) {
    logger.warn({ err, athleteId: athlete.id }, "auto-populate: Perplexity research failed, falling back to training knowledge");
    return ""; // Graceful fallback — extraction step will use its own knowledge
  }
}

// ── Phase 2: Structured data extraction ──────────────────────────────────────
// gpt-5.6-luna reads the real Perplexity research and extracts structured JSON.
// When research is available, it uses that as the source of truth.
// When research is empty (fallback), it uses its own training knowledge.

const SYSTEM_PROMPT = `You are a sports intelligence data engine for Athlete Intelligence, a B2B SaaS platform used by national sport organisations, professional clubs, and talent agencies.

You will be given verified web research about an athlete. Extract and structure this into accurate JSON. Return ONLY valid JSON — no markdown, no explanation.

Rules:
- ACCURACY FIRST: Use the provided research as your primary source of truth. Do not contradict it.
- If the research states a specific team, result, date, or fact — use it exactly as stated.
- If the research does not cover something, use your own knowledge to fill gaps — but mark lower confidence (65–75) for inferred data.
- Source domains must be real, sport-appropriate news/media sites.
- Dates must be ISO-8601 strings reflecting when events actually occurred.
- Confidence scores: 85–97 for data from research, 65–80 for inferred data.
- Categories: intelligence_items use one of: results_rankings | media_interviews | sponsorships | career_changes
- Timeline categories: competition | media | sponsorship | career | personal
- Contact categories: management | coaching | medical | media | sponsorship
- Competition tiers: A | B | C. Status: upcoming | completed`;

const USER_PROMPT = (a: AthleteStub, research: string) => `
Athlete profile:
- Name: ${a.name}
- Sport: ${a.sport}
- Event/Position: ${a.event}
- Nationality: ${a.nationality}
- Age: ${a.age ?? "unknown"}

${research
  ? `VERIFIED WEB RESEARCH (use this as your primary source of truth — do not contradict it):
\`\`\`
${research}
\`\`\``
  : `Note: No live research available. Use your training knowledge, keeping confidence scores at 65–80.`}

Extract and structure the above into the following JSON object:

{
  "athlete_stats": {
    "worldRank": <integer or null>,
    "worldRankDelta": <integer, negative = improved>,
    "nationalRank": <integer or null>,
    "personalBest": <string or null, e.g. "1:43.22" or "148kg snatch">,
    "seasonBest": <string or null>,
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
      "sourceUrl": <string>,
      "confidence": <integer 65-97>,
      "publishedAt": <ISO-8601 date string>
    }
    // 10-12 items total, mix of categories, spread across the last 10 years (2016–2026).
    // Distribute dates realistically: 2-3 items from 2016-2019 (early career),
    // 3-4 items from 2020-2022 (mid career), 3-5 items from 2023-2026 (recent).
    // Include a genuine mix: results, media coverage, sponsorships, career moves.
  ],
  "timeline_events": [
    {
      "date": <YYYY-MM-DD>,
      "category": "competition",
      "title": <string>,
      "description": <string>,
      "location": <string or null>,
      "sourceDomain": <string>,
      "sourceUrl": <string or null>,
      "confidence": <integer>,
      "significant": <boolean>
    }
    // IMPORTANT: Generate 20-30 events spanning the athlete's FULL career — from their earliest
    // known season (junior career, debut, or first senior season) right up to July 2026.
    // Events must be in chronological order, oldest first.
    // Include: debut/first competition, major milestone seasons, podiums, personal bests, sponsorships,
    // coaching changes, injuries, and recent events. Mark truly pivotal moments as significant: true.
    // Cover all career phases: junior → emerging → peak → current (up to July 2026).
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
    // Start from their first notable season and work forward chronologically to July 2026.
    // Include: early career meets, breakthrough competitions, major championships (Olympics, Worlds,
    // continental championships), domestic competitions, and recent results up to mid-2026.
    // For completed competitions: always include a result string (position + performance, e.g. "2nd (1:44.81)").
    // For upcoming (future dates only, i.e. after July 2026): set status "upcoming" and result null.
    // Use realistic tiers: A = World Championships / Olympics / Diamond League finals,
    //   B = Continental championships / national championships / major invitationals,
    //   C = domestic / club / lower-tier meets.
    // Spread results realistically: early career = lower placements, peak years = podiums/wins.
  ]
}
`;

/**
 * Given only an athlete's name, call OpenAI to identify their sport, event,
 * nationality, and approximate age. Used by the "discover from web" flow on
 * the Compare page so users don't have to pre-add athletes.
 */
export async function discoverAthleteProfile(name: string): Promise<{
  sport: string;
  event: string;
  nationality: string;
  age: number | null;
}> {
  const response = await openai.chat.completions.create({
    model: "gpt-5.6-luna",
    max_completion_tokens: 256,
    messages: [
      {
        role: "system",
        content:
          "You are a sports data assistant. Given an athlete's name, return a JSON object with their primary sport, specific event or position, nationality (country name), and approximate age. Return ONLY valid JSON, no markdown.",
      },
      {
        role: "user",
        content: `Athlete name: "${name}"\n\nReturn: { "sport": string, "event": string, "nationality": string, "age": integer or null }`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error("Empty response from OpenAI");

  const data = JSON.parse(raw);
  return {
    sport: typeof data.sport === "string" ? data.sport : "Athletics",
    event: typeof data.event === "string" ? data.event : "",
    nationality: typeof data.nationality === "string" ? data.nationality : "",
    age: typeof data.age === "number" ? data.age : null,
  };
}

export async function autoPopulateAthlete(athlete: AthleteStub): Promise<void> {
  try {
    // Phase 1: Perplexity web research + Wikipedia photo run in parallel
    // Perplexity searches the live web; Wikipedia fetches the real profile photo.
    const [research, avatarUrl] = await Promise.all([
      researchAthleteWithPerplexity(athlete),
      fetchWikipediaPhoto(athlete.name),
    ]);

    // Phase 2: Structured JSON extraction — gpt-5.6-luna reads the real
    // Perplexity research as its source of truth and outputs the DB schema.
    const response = await openai.chat.completions.create({
      model: "gpt-5.6-luna",
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: USER_PROMPT(athlete, research) },
      ],
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) throw new Error("Empty OpenAI response");

    const data = JSON.parse(raw) as {
      athlete_stats?: Record<string, unknown>;
      intelligence_items?: any[];
      timeline_events?: any[];
      contacts?: any[];
      competitions?: any[];
    };

    // ── 1. Update athlete stats + verified photo + real Twitter followers ────
    if (data.athlete_stats) {
      const s = data.athlete_stats;
      const aiTwitterHandle = typeof s.twitterHandle === "string" ? s.twitterHandle : null;

      // Fetch real Twitter follower count if we have a handle (runs in parallel with nothing else)
      const realTwitterFollowers = aiTwitterHandle
        ? await fetchTwitterFollowers(aiTwitterHandle)
        : null;

      await db
        .update(athletesTable)
        .set({
          worldRank: typeof s.worldRank === "number" ? s.worldRank : null,
          worldRankDelta: typeof s.worldRankDelta === "number" ? s.worldRankDelta : 0,
          nationalRank: typeof s.nationalRank === "number" ? s.nationalRank : null,
          personalBest: typeof s.personalBest === "string" ? s.personalBest : null,
          seasonBest: typeof s.seasonBest === "string" ? s.seasonBest : null,
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
      const rows = data.intelligence_items.map((item: any) => ({
        athleteId: athlete.id,
        athleteName: athlete.name,
        category: item.category ?? "results_rankings",
        title: String(item.title ?? ""),
        summary: item.summary ? String(item.summary) : null,
        sourceDomain: String(item.sourceDomain ?? "unknown"),
        sourceUrl: item.sourceUrl ? String(item.sourceUrl) : null,
        confidence: typeof item.confidence === "number" ? item.confidence : 80,
        publishedAt: item.publishedAt ? new Date(item.publishedAt) : new Date(),
      }));
      await db.insert(intelligenceItemsTable).values(rows);
      await db
        .update(athletesTable)
        .set({ intelligenceCount: rows.length, hasNewIntelligence: true })
        .where(eq(athletesTable.id, athlete.id));
    }

    // ── 3. Timeline events ───────────────────────────────────────────────────
    if (Array.isArray(data.timeline_events) && data.timeline_events.length > 0) {
      const rows = data.timeline_events.map((ev: any) => ({
        athleteId: athlete.id,
        date: String(ev.date ?? new Date().toISOString().split("T")[0]),
        category: ev.category ?? "competition",
        title: String(ev.title ?? ""),
        description: ev.description ? String(ev.description) : null,
        location: ev.location ? String(ev.location) : null,
        sourceDomain: String(ev.sourceDomain ?? "unknown"),
        sourceUrl: ev.sourceUrl ? String(ev.sourceUrl) : null,
        confidence: typeof ev.confidence === "number" ? ev.confidence : 85,
        significant: Boolean(ev.significant),
      }));
      await db.insert(timelineEventsTable).values(rows);
    }

    // ── 4. Contacts ──────────────────────────────────────────────────────────
    if (Array.isArray(data.contacts) && data.contacts.length > 0) {
      const today = new Date().toISOString().split("T")[0];
      const rows = data.contacts.map((c: any) => ({
        athleteId: athlete.id,
        role: String(c.role ?? "Unknown"),
        category: c.category ?? "management",
        name: String(c.name ?? ""),
        org: String(c.org ?? ""),
        orgType: c.orgType ? String(c.orgType) : null,
        status: c.status ?? "verified",
        confidence: typeof c.confidence === "number" ? c.confidence : 80,
        publicEmail: c.publicEmail ? String(c.publicEmail) : null,
        website: c.website ? String(c.website) : null,
        note: c.note ? String(c.note) : null,
        lastVerified: String(c.lastVerified ?? today),
        dateDiscovered: String(c.dateDiscovered ?? today),
        sourceDomain: String(c.sourceDomain ?? "unknown"),
        sourceExcerpt: c.sourceExcerpt ? String(c.sourceExcerpt) : null,
      }));
      await db.insert(contactsTable).values(rows);
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
    // Non-fatal — athlete was created, population failed silently
    logger.error({ err, athleteId: athlete.id, name: athlete.name }, "auto-populate: failed");
  }
}
