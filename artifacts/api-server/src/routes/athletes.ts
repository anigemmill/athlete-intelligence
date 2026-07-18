import { Router, type IRouter } from "express";
import { eq, inArray } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  athletesTable,
  alertConfigsTable,
  type Athlete,
} from "@workspace/db";
import { autoPopulateAthlete } from "../lib/auto-populate.js";
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
      });
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
  });
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
