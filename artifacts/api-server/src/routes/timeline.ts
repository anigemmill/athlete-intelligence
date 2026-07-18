import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import { timelineEventsTable } from "@workspace/db";
import {
  ListAthleteTimelineParams,
  ListAthleteTimelineResponse,
} from "@workspace/api-zod";
import type { TimelineEvent } from "@workspace/db";

const router: IRouter = Router();

function toApiEvent(e: TimelineEvent) {
  return {
    id: e.id,
    athleteId: e.athleteId,
    date: e.date,
    category: e.category,
    title: e.title,
    description: e.description ?? null,
    location: e.location ?? null,
    sourceDomain: e.sourceDomain,
    sourceUrl: e.sourceUrl ?? null,
    confidence: e.confidence,
    significant: e.significant,
  };
}

// GET /athletes/:id/timeline
router.get("/athletes/:id/timeline", async (req, res): Promise<void> => {
  const params = ListAthleteTimelineParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const events = await db
    .select()
    .from(timelineEventsTable)
    .where(eq(timelineEventsTable.athleteId, params.data.id))
    .orderBy(desc(timelineEventsTable.date));

  res.json(ListAthleteTimelineResponse.parse(events.map(toApiEvent)));
});

export default router;
