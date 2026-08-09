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
import { resolveSourceAttribution, adjustConfidenceByDomain } from "./source-validation.js";
import { crossValidatePerformanceMarks } from "./performance-marks.js";
import { runCompetitionsAgent } from "./competitions-agent.js";
import { runContactsAgent } from "./contacts-agent.js";
import { runTimelineAgent } from "./timeline-agent.js";
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
- Categories: intelligence_items use one of: results_rankings | media_interviews | sponsorships | career_changes`;

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
  ]
}
`;
};

/**
 * Minimum confidence score (0–100) required to accept a discovery result.
 * Below this threshold the athlete cannot be uniquely identified from their
 * name alone and the creation request is rejected with HTTP 422.
 */
export const DISCOVERY_CONFIDENCE_THRESHOLD = 70;

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
    // Phase 1: general Perplexity web research + Wikipedia photo, run
    // alongside the three standalone retrieval agents (CompetitionsAgent
    // M4, ContactsAgent M5, TimelineAgent M6), each of which owns its own
    // full research+extraction+validation cycle and overlaps with
    // everything else here rather than running after the main extraction.
    const [{ research, citations }, avatarUrl, competitionRows, contactsResult, timelineRows] = await Promise.all([
      researchAthleteWithPerplexity(athlete),
      fetchWikipediaPhoto(athlete.name, athlete.sport),
      runCompetitionsAgent(athlete),
      runContactsAgent(athlete),
      runTimelineAgent(athlete),
    ]);

    // Phase 2: Structured JSON extraction — gpt-4o reads the real
    // Perplexity research and citation URLs as its source of truth.
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
    };

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

    // ── 3. Timeline events (from TimelineAgent — dates, duplicates, and
    //      source attribution already validated before this point) ─────────
    if (timelineRows.length > 0) {
      const rows = timelineRows.map((ev) => ({
        athleteId: athlete.id,
        date: ev.date,
        category: ev.category,
        title: ev.title,
        description: ev.description,
        location: ev.location,
        sourceDomain: ev.sourceDomain,
        sourceUrl: ev.sourceUrl,
        confidence: ev.confidence,
        significant: ev.significant,
      }));
      await db.insert(timelineEventsTable).values(rows);
    }

    // ── 4. Contacts (from ContactsAgent — garbage already filtered, evidence
    //      already cross-checked against real citations before this point) ──
    if (contactsResult.contacts.length > 0) {
      const rows = contactsResult.contacts.map((c) => ({
        athleteId: athlete.id,
        role: c.role,
        category: c.category,
        name: c.name,
        org: c.org,
        orgType: c.orgType,
        status: c.status,
        confidence: c.confidence,
        publicEmail: c.publicEmail,
        website: c.website,
        note: c.note,
        lastVerified: c.lastVerified,
        dateDiscovered: c.dateDiscovered,
        sourceDomain: c.sourceDomain,
        sourceExcerpt: c.sourceExcerpt,
      }));
      await db.insert(contactsTable).values(rows);
    }

    // ── 5. Competitions (from CompetitionsAgent — generic meet names already
    //      filtered out before this point) ───────────────────────────────────
    if (competitionRows.length > 0) {
      const rows = competitionRows.map((comp) => ({
        athleteId: athlete.id,
        athleteName: athlete.name,
        meetName: comp.meetName,
        event: comp.event,
        location: comp.location,
        date: comp.date,
        tier: comp.tier,
        status: comp.status,
        result: comp.result,
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

// adjustConfidenceByDomain moved to source-validation.ts (M5) so agent
// modules like contacts-agent.ts can use it without importing this file
// and creating a circular dependency. Re-exported here for compatibility.
export { adjustConfidenceByDomain };

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
