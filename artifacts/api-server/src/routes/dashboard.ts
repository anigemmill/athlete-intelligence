import { Router, type IRouter } from "express";
import { desc, gte } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  athletesTable,
  intelligenceItemsTable,
  competitionsTable,
} from "@workspace/db";
import { GetDashboardResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard", async (_req, res): Promise<void> => {
  const [allAthletes, recentIntelligence, upcomingCompetitions] =
    await Promise.all([
      db.select().from(athletesTable).orderBy(athletesTable.name),
      db
        .select()
        .from(intelligenceItemsTable)
        .orderBy(desc(intelligenceItemsTable.discoveredAt))
        .limit(10),
      db
        .select()
        .from(competitionsTable)
        .where(
          gte(competitionsTable.date, new Date().toISOString().split("T")[0]),
        )
        .orderBy(competitionsTable.date)
        .limit(20),
    ]);

  const activeAgents = allAthletes.filter(
    (a) => a.agentStatus === "active",
  ).length;
  const newIntelligence = allAthletes.reduce(
    (sum, a) => sum + (a.hasNewIntelligence ? 1 : 0),
    0,
  );

  // Priority athletes: those with new intelligence or upcoming competitions
  const priorityIds = new Set([
    ...allAthletes
      .filter((a) => a.hasNewIntelligence)
      .slice(0, 3)
      .map((a) => a.id),
    ...upcomingCompetitions.slice(0, 3).map((c) => c.athleteId),
  ]);
  const priorityAthletes = allAthletes
    .filter((a) => priorityIds.has(a.id))
    .slice(0, 5);

  const dashboard = {
    totalAthletes: allAthletes.length,
    activeAgents,
    newIntelligence,
    upcomingCompetitions: upcomingCompetitions.length,
    priorityAlerts: newIntelligence,
    recentIntelligence: recentIntelligence.map((item) => ({
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
    })),
    priorityAthletes: priorityAthletes.map((a) => ({
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
    })),
  };

  res.json(GetDashboardResponse.parse(dashboard));
});

export default router;
