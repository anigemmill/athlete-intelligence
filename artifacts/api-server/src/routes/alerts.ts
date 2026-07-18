import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { alertConfigsTable } from "@workspace/db";
import {
  GetAthleteAlertsParams,
  UpdateAthleteAlertsParams,
  UpdateAthleteAlertsBody,
  GetAthleteAlertsResponse,
  UpdateAthleteAlertsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// GET /athletes/:id/alerts
router.get("/athletes/:id/alerts", async (req, res): Promise<void> => {
  const params = GetAthleteAlertsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  let [config] = await db
    .select()
    .from(alertConfigsTable)
    .where(eq(alertConfigsTable.athleteId, params.data.id));

  if (!config) {
    // Auto-create default config if missing
    [config] = await db
      .insert(alertConfigsTable)
      .values({ athleteId: params.data.id })
      .returning();
  }

  res.json(GetAthleteAlertsResponse.parse(config));
});

// PUT /athletes/:id/alerts
router.put("/athletes/:id/alerts", async (req, res): Promise<void> => {
  const params = UpdateAthleteAlertsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateAthleteAlertsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [updated] = await db
    .insert(alertConfigsTable)
    .values({ athleteId: params.data.id, ...parsed.data })
    .onConflictDoUpdate({
      target: alertConfigsTable.athleteId,
      set: parsed.data,
    })
    .returning();

  res.json(UpdateAthleteAlertsResponse.parse(updated));
});

export default router;
