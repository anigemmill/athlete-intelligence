import { Router, type IRouter } from "express";
import { eq, gte } from "drizzle-orm";
import { db } from "@workspace/db";
import { competitionsTable } from "@workspace/db";
import {
  ListAthleteCompetitionsParams,
  ListCompetitionsResponse,
  ListAthleteCompetitionsResponse,
} from "@workspace/api-zod";
import type { Competition } from "@workspace/db";

const router: IRouter = Router();

function toApiCompetition(c: Competition) {
  const today = new Date().toISOString().split("T")[0];
  const daysAway =
    c.status === "upcoming"
      ? Math.ceil(
          (new Date(c.date).getTime() - new Date(today).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : null;
  return {
    id: c.id,
    athleteId: c.athleteId,
    athleteName: c.athleteName,
    meetName: c.meetName,
    event: c.event,
    location: c.location ?? null,
    date: c.date,
    tier: c.tier,
    status: c.status,
    result: c.result ?? null,
    daysAway,
  };
}

// GET /competitions
router.get("/competitions", async (_req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];
  const competitions = await db
    .select()
    .from(competitionsTable)
    .where(gte(competitionsTable.date, today))
    .orderBy(competitionsTable.date);

  res.json(
    ListCompetitionsResponse.parse(competitions.map(toApiCompetition)),
  );
});

// GET /athletes/:id/competitions
router.get("/athletes/:id/competitions", async (req, res): Promise<void> => {
  const params = ListAthleteCompetitionsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const competitions = await db
    .select()
    .from(competitionsTable)
    .where(eq(competitionsTable.athleteId, params.data.id))
    .orderBy(competitionsTable.date);

  res.json(
    ListAthleteCompetitionsResponse.parse(competitions.map(toApiCompetition)),
  );
});

export default router;
