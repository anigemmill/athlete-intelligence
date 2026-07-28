import { Router, type IRouter } from "express";
import { eq, inArray } from "drizzle-orm";
import { db } from "@workspace/db";
import { logger } from "../lib/logger.js";
import {
  athletesTable,
  alertConfigsTable,
  intelligenceItemsTable,
  timelineEventsTable,
  contactsTable,
  competitionsTable,
  type Athlete,
} from "@workspace/db";
import { autoPopulateAthlete, discoverAthleteProfile, DISCOVERY_CONFIDENCE_THRESHOLD } from "../lib/auto-populate.js";
import { openrouter } from "@workspace/integrations-openrouter-ai";
import { openai } from "@workspace/integrations-openai-ai-server";
import {
  GetAthleteParams,
  UpdateAthleteParams,
  DeleteAthleteParams,
  CreateAthleteBody,
  UpdateAthleteBody,
  CompareAthletesQueryParams,
  ListAthletesResponse,
  GetAthleteResponse,
  CreateAthleteResponse,
  UpdateAthleteResponse,
  CompareAthletesResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function toApiAthlete(a: Athlete) {
  return {
    id: a.id,
    name: a.name,
    sport: a.sport,
    event: a.event,
    nationality: a.nationality,
    age: a.age ?? null,
    squad: a.squad,
    worldRank: a.worldRank ?? null,
    worldRankDelta: a.worldRankDelta,
    nationalRank: a.nationalRank ?? null,
    personalBest: a.personalBest ?? null,
    seasonBest: a.seasonBest ?? null,
    instagramHandle: a.instagramHandle ?? null,
    instagramFollowers: a.instagramFollowers,
    instagramEngagement: a.instagramEngagement,
    twitterHandle: a.twitterHandle ?? null,
    twitterFollowers: a.twitterFollowers,
    tiktokHandle: a.tiktokHandle ?? null,
    tiktokFollowers: a.tiktokFollowers,
    followerGrowth30d: a.followerGrowth30d,
    avgEngagement: a.avgEngagement,
    agentStatus: a.agentStatus,
    lastCrawledAt: a.lastCrawledAt?.toISOString() ?? null,
    intelligenceCount: a.intelligenceCount,
    hasNewIntelligence: a.hasNewIntelligence,
    avatarUrl: a.avatarUrl ?? null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

// POST /athletes/discover — create an athlete by name only; AI identifies sport/event/nationality
router.post("/athletes/discover", async (req, res): Promise<void> => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  if (!name) {
    res.status(400).json({ error: "name is required" });
    return;
  }

  // Check if athlete already exists by name (case-insensitive)
  const existing = await db
    .select()
    .from(athletesTable)
    .where(eq(athletesTable.name, name));

  if (existing.length > 0) {
    res.status(200).json({ athlete: toApiAthlete(existing[0]), created: false });
    return;
  }

  // Ask AI to identify the athlete's profile.
  // Throws on OpenAI failure (surfaced as 500 by the unhandled rejection handler).
  const profile = await discoverAthleteProfile(name);

  // Reject if the name cannot be uniquely and confidently mapped to a single
  // individual, or if sport / nationality are missing (required by the research
  // pipeline to produce a meaningful Perplexity query).
  if (
    profile.confidence < DISCOVERY_CONFIDENCE_THRESHOLD ||
    !profile.sport ||
    !profile.nationality
  ) {
    logger.warn(
      { name, confidence: profile.confidence, ambiguous: profile.ambiguous, reason: profile.reason },
      "discover: rejected — athlete not identifiable",
    );
    res.status(422).json({
      error: "athlete_not_identifiable",
      message: `Cannot uniquely identify "${name}" as a specific athlete. Please provide their sport and nationality directly, or use a more specific name.`,
      confidence: profile.confidence,
      threshold: DISCOVERY_CONFIDENCE_THRESHOLD,
      ambiguous: profile.ambiguous,
      reason: profile.reason,
    });
    return;
  }

  // At this point profile.sport and profile.nationality are guaranteed non-null
  // by the 422 gate above; the non-null assertions (!!) make this explicit to TypeScript.
  const sport = profile.sport!;
  const nationality = profile.nationality!;
  const event = profile.event ?? "";

  const [athlete] = await db
    .insert(athletesTable)
    .values({
      name,
      sport,
      event,
      nationality,
      age: profile.age,
      squad: "",
      agentStatus: "active",
    })
    .returning();

  await db.insert(alertConfigsTable).values({ athleteId: athlete.id }).onConflictDoNothing();

  // Fire-and-forget full population (errors logged, not surfaced)
  autoPopulateAthlete({
    id: athlete.id,
    name: athlete.name,
    sport,
    event,
    nationality,
    age: profile.age,
  }).catch((err) => logger.error({ err, athleteId: athlete.id }, "autoPopulateAthlete failed"));

  res.status(201).json({ athlete: toApiAthlete(athlete), created: true });
});

// POST /athletes/bulk — must come BEFORE /:id
router.post("/athletes/bulk", async (req, res): Promise<void> => {
  if (!Array.isArray(req.body?.athletes)) {
    res.status(400).json({ error: "Expected { athletes: [...] }" });
    return;
  }

  const results: Array<{ success: boolean; name: string; id?: number; error?: string }> = [];

  for (const raw of req.body.athletes) {
    const parsed = CreateAthleteBody.safeParse(raw);
    if (!parsed.success) {
      results.push({ success: false, name: raw?.name ?? "Unknown", error: parsed.error.message });
      continue;
    }
    try {
      const [athlete] = await db
        .insert(athletesTable)
        .values({
          name: parsed.data.name,
          sport: parsed.data.sport ?? "",
          event: parsed.data.event ?? "",
          nationality: parsed.data.nationality ?? "",
          age: parsed.data.age ?? null,
          squad: parsed.data.squad ?? "",
          agentStatus: "active",
          lastCrawledAt: new Date(),
        })
        .returning();
      await db.insert(alertConfigsTable).values({ athleteId: athlete.id }).onConflictDoNothing();
      results.push({ success: true, name: athlete.name, id: athlete.id });
      // Fire-and-forget population for each imported athlete
      autoPopulateAthlete({
        id: athlete.id,
        name: athlete.name,
        sport: parsed.data.sport ?? "",
        event: parsed.data.event ?? "",
        nationality: parsed.data.nationality ?? "",
        age: parsed.data.age ?? null,
      }).catch((err) => logger.error({ err, athleteId: athlete.id }, "autoPopulateAthlete failed (bulk)"));
    } catch (err: unknown) {
      results.push({ success: false, name: raw?.name ?? "Unknown", error: String(err) });
    }
  }

  const imported = results.filter((r) => r.success).length;
  res.status(201).json({ imported, total: results.length, results });
});

// GET /athletes/compare — must come BEFORE /:id
router.get("/athletes/compare", async (req, res): Promise<void> => {
  const parsed = CompareAthletesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const ids = (parsed.data.ids as string)
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n));

  if (ids.length === 0) {
    res.status(400).json({ error: "No valid IDs provided" });
    return;
  }

  const athletes = await db
    .select()
    .from(athletesTable)
    .where(inArray(athletesTable.id, ids));

  res.json(CompareAthletesResponse.parse(athletes.map(toApiAthlete)));
});

// GET /athletes
router.get("/athletes", async (_req, res): Promise<void> => {
  const athletes = await db
    .select()
    .from(athletesTable)
    .orderBy(athletesTable.name);

  res.json(ListAthletesResponse.parse(athletes.map(toApiAthlete)));
});

// POST /athletes
router.post("/athletes", async (req, res): Promise<void> => {
  const parsed = CreateAthleteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [athlete] = await db
    .insert(athletesTable)
    .values({
      name: parsed.data.name,
      sport: parsed.data.sport,
      event: parsed.data.event,
      nationality: parsed.data.nationality,
      age: parsed.data.age ?? null,
      squad: parsed.data.squad ?? "",
      agentStatus: "active",
      lastCrawledAt: new Date(),
    })
    .returning();

  // Create default alert config for new athlete
  await db
    .insert(alertConfigsTable)
    .values({ athleteId: athlete.id })
    .onConflictDoNothing();

  res.status(201).json(CreateAthleteResponse.parse(toApiAthlete(athlete)));

  // Fire-and-forget: populate intelligence, timeline, contacts, competitions via AI
  autoPopulateAthlete({
    id: athlete.id,
    name: athlete.name,
    sport: athlete.sport,
    event: athlete.event ?? "",
    nationality: athlete.nationality ?? "",
    age: athlete.age,
  }).catch((err) => logger.error({ err, athleteId: athlete.id }, "autoPopulateAthlete failed (POST)"));
});

// GET /athletes/:id
router.get("/athletes/:id", async (req, res): Promise<void> => {
  const params = GetAthleteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [athlete] = await db
    .select()
    .from(athletesTable)
    .where(eq(athletesTable.id, params.data.id));

  if (!athlete) {
    res.status(404).json({ error: "Athlete not found" });
    return;
  }

  res.json(GetAthleteResponse.parse(toApiAthlete(athlete)));
});

// PATCH /athletes/:id
router.patch("/athletes/:id", async (req, res): Promise<void> => {
  const params = UpdateAthleteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateAthleteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Partial<typeof athletesTable.$inferInsert> = {};
  if (parsed.data.squad !== undefined) updates.squad = parsed.data.squad;
  if (parsed.data.agentStatus !== undefined) updates.agentStatus = parsed.data.agentStatus;
  if (parsed.data.avatarUrl !== undefined) updates.avatarUrl = parsed.data.avatarUrl ?? null;
  if (parsed.data.instagramHandle !== undefined) updates.instagramHandle = parsed.data.instagramHandle ?? null;
  if (parsed.data.instagramFollowers !== undefined) updates.instagramFollowers = parsed.data.instagramFollowers;
  if (parsed.data.twitterHandle !== undefined) updates.twitterHandle = parsed.data.twitterHandle ?? null;
  if (parsed.data.twitterFollowers !== undefined) updates.twitterFollowers = parsed.data.twitterFollowers;
  if (parsed.data.tiktokHandle !== undefined) updates.tiktokHandle = parsed.data.tiktokHandle ?? null;
  if (parsed.data.tiktokFollowers !== undefined) updates.tiktokFollowers = parsed.data.tiktokFollowers;

  const [updated] = await db
    .update(athletesTable)
    .set(updates)
    .where(eq(athletesTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Athlete not found" });
    return;
  }

  res.json(UpdateAthleteResponse.parse(toApiAthlete(updated)));
});

// POST /athletes/:id/repopulate — wipes all intelligence data and re-runs auto-populate
router.post("/athletes/:id/repopulate", async (req, res): Promise<void> => {
  const params = GetAthleteParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [athlete] = await db.select().from(athletesTable).where(eq(athletesTable.id, params.data.id));
  if (!athlete) { res.status(404).json({ error: "Athlete not found" }); return; }

  // Clear all existing intelligence data in parallel
  await Promise.all([
    db.delete(intelligenceItemsTable).where(eq(intelligenceItemsTable.athleteId, athlete.id)),
    db.delete(timelineEventsTable).where(eq(timelineEventsTable.athleteId, athlete.id)),
    db.delete(contactsTable).where(eq(contactsTable.athleteId, athlete.id)),
    db.delete(competitionsTable).where(eq(competitionsTable.athleteId, athlete.id)),
  ]);

  // Reset crawl marker so the dossier page shows "populating" state
  await db.update(athletesTable)
    .set({ intelligenceCount: 0, hasNewIntelligence: false, lastCrawledAt: null })
    .where(eq(athletesTable.id, athlete.id));

  // Re-populate in background — do not await
  autoPopulateAthlete({
    id: athlete.id,
    name: athlete.name,
    sport: athlete.sport,
    event: athlete.event,
    nationality: athlete.nationality,
    age: athlete.age,
  }).catch((err) => logger.error({ err, athleteId: athlete.id }, "repopulate: background populate failed"));

  res.status(202).json({ message: "Re-population started" });
});

// POST /athletes/:id/refresh-social — live Perplexity lookup for one athlete's social accounts
router.post("/athletes/:id/refresh-social", async (req, res): Promise<void> => {
  const params = GetAthleteParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [athlete] = await db
    .select({ id: athletesTable.id, name: athletesTable.name, sport: athletesTable.sport, nationality: athletesTable.nationality })
    .from(athletesTable)
    .where(eq(athletesTable.id, params.data.id));
  if (!athlete) { res.status(404).json({ error: "Athlete not found" }); return; }

  try {
    // Phase 1: Perplexity sonar-pro — live web search
    const research = await openrouter.chat.completions.create({
      model: "perplexity/sonar-pro",
      max_tokens: 1024,
      messages: [
        {
          role: "system",
          content: "You are a sports social media researcher with live web access. Return exact, verified figures — never estimate unless the source explicitly says so.",
        },
        {
          role: "user",
          content: `Search the web RIGHT NOW for the official social media accounts of ${athlete.name} (${athlete.sport ?? "athlete"}${athlete.nationality ? `, ${athlete.nationality}` : ""}).

Look up their profiles directly on Instagram, X/Twitter, and TikTok. Report:
1. Instagram: exact handle (no @) and current follower count shown on the profile page
2. X/Twitter: exact handle and current follower count
3. TikTok: exact handle and current follower count

Use the athlete's official or verified account. If multiple accounts exist, choose the one with the most followers that is clearly the athlete (not a fan page). State the source URL for each figure.`,
        },
      ],
    });

    const researchText = research.choices[0]?.message?.content ?? "";
    if (!researchText) {
      res.status(422).json({ error: "No social data found for this athlete" });
      return;
    }

    // Phase 2: OpenAI extracts structured JSON
    const extraction = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 512,
      messages: [
        {
          role: "system",
          content: `Extract social media data from the research text. Return ONLY valid JSON, no markdown.
Rules:
- handles: real username without @ symbol, null if not found
- followers: integer (round to nearest whole number), null if no specific verified number — NEVER invent a number
- Convert shorthand: "250k" → 250000, "1.2M" → 1200000`,
        },
        {
          role: "user",
          content: `Research about ${athlete.name}:\n${researchText}\n\nExtract into JSON:\n{"instagramHandle":null,"instagramFollowers":null,"twitterHandle":null,"twitterFollowers":null,"tiktokHandle":null,"tiktokFollowers":null}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const raw = extraction.choices[0]?.message?.content;
    if (!raw) { res.status(422).json({ error: "Could not extract social data" }); return; }

    const s = JSON.parse(raw);
    const patch: Record<string, any> = {};
    if (typeof s.instagramHandle === "string") patch.instagramHandle = s.instagramHandle;
    if (typeof s.instagramFollowers === "number") patch.instagramFollowers = s.instagramFollowers;
    if (typeof s.twitterHandle === "string") patch.twitterHandle = s.twitterHandle;
    if (typeof s.twitterFollowers === "number") patch.twitterFollowers = s.twitterFollowers;
    if (typeof s.tiktokHandle === "string") patch.tiktokHandle = s.tiktokHandle;
    if (typeof s.tiktokFollowers === "number") patch.tiktokFollowers = s.tiktokFollowers;

    if (Object.keys(patch).length > 0) {
      await db.update(athletesTable).set(patch).where(eq(athletesTable.id, athlete.id));
      logger.info({ athleteId: athlete.id, name: athlete.name, patch }, "refresh-social: updated");
    }

    res.json({ ok: true, updated: Object.keys(patch).length > 0, data: s, researchSummary: researchText.slice(0, 500) });
  } catch (err: any) {
    logger.error({ err, athleteId: athlete.id }, "refresh-social: failed");
    res.status(500).json({ error: "Social refresh failed" });
  }
});

// DELETE /athletes/:id
router.delete("/athletes/:id", async (req, res): Promise<void> => {
  const params = DeleteAthleteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(athletesTable)
    .where(eq(athletesTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Athlete not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
