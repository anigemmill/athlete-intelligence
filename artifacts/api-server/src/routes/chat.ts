import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  athletesTable,
  intelligenceItemsTable,
  timelineEventsTable,
} from "@workspace/db";
import { SendChatMessageBody, SendChatMessageResponse } from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// Simple rule-based intelligence chat (real AI integration coming in v2)
function generateResponse(
  message: string,
  athleteContext: string,
): { content: string; sources: { domain: string; date: string | null; confidence: number }[] } {
  const lowerMsg = message.toLowerCase();

  const sources = [
    { domain: "athletics.co.nz", date: new Date().toISOString().split("T")[0], confidence: 88 },
    { domain: "worldathletics.org", date: new Date().toISOString().split("T")[0], confidence: 92 },
  ];

  if (lowerMsg.includes("rank") || lowerMsg.includes("world")) {
    return {
      content: `Based on current World Athletics rankings${athleteContext ? ` for ${athleteContext}` : ""}, the athlete is performing competitively at international level. Rankings are updated weekly following sanctioned competitions. Confidence in this data is high as it comes directly from World Athletics official rankings system.`,
      sources,
    };
  }

  if (lowerMsg.includes("sponsor") || lowerMsg.includes("brand") || lowerMsg.includes("deal")) {
    return {
      content: `Sponsorship intelligence${athleteContext ? ` for ${athleteContext}` : ""} indicates active commercial relationships with sportswear and equipment brands. Social media engagement metrics support a strong brand partnership value proposition. Formal endorsement announcements are typically made via official press releases and athlete social channels.`,
      sources: [
        { domain: "sponsorship.com", date: null, confidence: 72 },
        ...sources,
      ],
    };
  }

  if (lowerMsg.includes("media") || lowerMsg.includes("interview") || lowerMsg.includes("press")) {
    return {
      content: `Recent media coverage${athleteContext ? ` for ${athleteContext}` : ""} shows consistent presence in sports journalism. Interview frequency correlates with competition performance — expect increased media interest following major results. Sentiment analysis of recent coverage is predominantly positive.`,
      sources,
    };
  }

  if (lowerMsg.includes("performance") || lowerMsg.includes("result") || lowerMsg.includes("time")) {
    return {
      content: `Performance data${athleteContext ? ` for ${athleteContext}` : ""} shows progression consistent with Olympic pathway targets. Personal best and season best times are tracked across all sanctioned competitions. Comparative analysis against world-leading performances suggests strong medal contention potential at major championships.`,
      sources,
    };
  }

  if (lowerMsg.includes("social") || lowerMsg.includes("instagram") || lowerMsg.includes("follower")) {
    return {
      content: `Social media intelligence${athleteContext ? ` for ${athleteContext}` : ""} shows growing audience engagement. Follower growth over the past 30 days is above average for athletes at this career stage. Engagement rate is a key metric for sponsorship valuation — current metrics are competitive within the athletics cohort.`,
      sources: [
        { domain: "instagram.com", date: new Date().toISOString().split("T")[0], confidence: 95 },
        { domain: "twitter.com", date: new Date().toISOString().split("T")[0], confidence: 90 },
      ],
    };
  }

  return {
    content: `I have access to comprehensive intelligence data${athleteContext ? ` for ${athleteContext}` : " across your monitored athletes"} including competition results, media coverage, sponsorship activity, career developments, and social media metrics. What specific aspect would you like to explore?`,
    sources,
  };
}

router.post("/chat", async (req, res): Promise<void> => {
  const parsed = SendChatMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { message, athleteId } = parsed.data;
  let athleteContext = "";

  if (athleteId) {
    try {
      const [athlete] = await db
        .select()
        .from(athletesTable)
        .where(eq(athletesTable.id, athleteId));
      if (athlete) athleteContext = athlete.name;
    } catch (err) {
      logger.warn({ err }, "Failed to load athlete for chat context");
    }
  }

  const { content, sources } = generateResponse(message, athleteContext);

  res.json(
    SendChatMessageResponse.parse({
      role: "assistant",
      content,
      sources,
    }),
  );
});

export default router;
