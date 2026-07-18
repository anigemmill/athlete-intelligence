import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import { intelligenceItemsTable } from "@workspace/db";
import {
  ListAthleteIntelligenceParams,
  ListIntelligenceResponse,
  ListAthleteIntelligenceResponse,
} from "@workspace/api-zod";
import type { IntelligenceItem } from "@workspace/db";

const router: IRouter = Router();

function toApiItem(item: IntelligenceItem) {
  return {
    id: item.id,
    athleteId: item.athleteId,
    athleteName: item.athleteName,
    category: item.category,
    title: item.title,
    summary: item.summary ?? null,
    sourceDomain: item.sourceDomain,
    sourceUrl: item.sourceUrl ?? null,
    confidence: item.confidence,
    publishedAt: item.publishedAt?.toISOString() ?? null,
    discoveredAt: item.discoveredAt.toISOString(),
  };
}

// GET /intelligence
router.get("/intelligence", async (_req, res): Promise<void> => {
  const items = await db
    .select()
    .from(intelligenceItemsTable)
    .orderBy(desc(intelligenceItemsTable.discoveredAt))
    .limit(50);

  res.json(ListIntelligenceResponse.parse(items.map(toApiItem)));
});

// GET /athletes/:id/intelligence
router.get("/athletes/:id/intelligence", async (req, res): Promise<void> => {
  const params = ListAthleteIntelligenceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const items = await db
    .select()
    .from(intelligenceItemsTable)
    .where(eq(intelligenceItemsTable.athleteId, params.data.id))
    .orderBy(desc(intelligenceItemsTable.discoveredAt));

  res.json(ListAthleteIntelligenceResponse.parse(items.map(toApiItem)));
});

export default router;
