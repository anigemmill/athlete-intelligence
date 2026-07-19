/**
 * chat.ts — Phase 2 AI Intelligence Engine
 *
 * POST /api/chat
 *   Streams SSE. Implements a database-first agentic loop:
 *   1. Understand request
 *   2. Call tools to retrieve structured platform data
 *   3. Generate a sourced, confidence-scored analyst response
 *   4. Never hallucinate. Never answer from LLM knowledge alone.
 */

import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import { eq, desc, ilike, and, or, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  athletesTable,
  intelligenceItemsTable,
  timelineEventsTable,
  contactsTable,
  competitionsTable,
} from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

// ── Tool definitions ──────────────────────────────────────────────────────────

const TOOLS: any[] = [
  {
    type: "function",
    function: {
      name: "get_athlete_profile",
      description:
        "Retrieve full profile, stats, rankings, and social data for a specific athlete by their database ID. Use this first when asked about a specific athlete.",
      parameters: {
        type: "object",
        properties: {
          athlete_id: { type: "number", description: "The athlete's database ID from the roster" },
        },
        required: ["athlete_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_athlete_intelligence",
      description:
        "Retrieve all intelligence items (results, rankings, media, sponsorships, career changes) for a specific athlete. Always use this when asked about recent news, changes, or activity.",
      parameters: {
        type: "object",
        properties: {
          athlete_id: { type: "number", description: "The athlete's database ID" },
        },
        required: ["athlete_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_athlete_competitions",
      description:
        "Retrieve all competition results and upcoming meets for a specific athlete. Use when asked about results, race history, or upcoming schedule.",
      parameters: {
        type: "object",
        properties: {
          athlete_id: { type: "number", description: "The athlete's database ID" },
        },
        required: ["athlete_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_athlete_contacts",
      description:
        "Retrieve the known contact network for a specific athlete — coaches, agents, managers, sponsors, medical staff. Use for relationship or network questions.",
      parameters: {
        type: "object",
        properties: {
          athlete_id: { type: "number", description: "The athlete's database ID" },
        },
        required: ["athlete_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_athlete_timeline",
      description:
        "Retrieve the career timeline events for a specific athlete — milestones, career changes, achievements. Use for career arc or history questions.",
      parameters: {
        type: "object",
        properties: {
          athlete_id: { type: "number", description: "The athlete's database ID" },
        },
        required: ["athlete_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_roster",
      description:
        "Search and filter athletes across the entire roster by sport, nationality, age range, or keyword. Use for discovery questions like 'show me NZ cyclists under 23' or 'find sprinters in the roster'.",
      parameters: {
        type: "object",
        properties: {
          sport: { type: "string", description: "Filter by sport name (partial match)" },
          nationality: { type: "string", description: "Filter by nationality/country code (partial match)" },
          min_age: { type: "number", description: "Minimum age filter" },
          max_age: { type: "number", description: "Maximum age filter" },
          keyword: { type: "string", description: "Search across name, sport, event, nationality" },
          limit: { type: "number", description: "Max results to return (default 20)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_contacts_network",
      description:
        "Search the contact network across ALL athletes to find shared coaches, agents, sponsors, or organisations. Use for relationship intelligence questions like 'which athletes share the same coach?' or 'who is represented by Agency X?'.",
      parameters: {
        type: "object",
        properties: {
          keyword: { type: "string", description: "Search term — name of a coach, agency, sponsor, or organisation" },
          category: { type: "string", description: "Filter by contact category: coaching | management | medical | media | sponsorship" },
          role: { type: "string", description: "Filter by specific role (e.g. 'head coach', 'agent')" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_cross_roster_intelligence",
      description:
        "Retrieve intelligence items across ALL athletes in the roster, optionally filtered by category or keyword. Use for trend questions, roster-wide sponsorship analysis, media summaries, or 'what changed recently?' questions.",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description: "Filter by category: results_rankings | media_interviews | sponsorships | career_changes",
          },
          keyword: { type: "string", description: "Search within titles and summaries" },
          limit: { type: "number", description: "Max results to return (default 20, max 50)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_roster_rankings_overview",
      description:
        "Get a sorted overview of ranked athletes in the roster — world rank, national rank, personal bests. Use for questions about who is highest ranked, fastest improving, or performance comparison.",
      parameters: {
        type: "object",
        properties: {
          sort_by: {
            type: "string",
            description: "Sort field: world_rank | national_rank | intelligence_count. Default: world_rank",
          },
          sport: { type: "string", description: "Filter by sport (optional)" },
        },
        required: [],
      },
    },
  },
];

// ── Tool phase labels (for streaming status) ──────────────────────────────────

const TOOL_PHASES: Record<string, string> = {
  get_athlete_profile: "Retrieving athlete profile…",
  get_athlete_intelligence: "Retrieving intelligence data…",
  get_athlete_competitions: "Loading competition results…",
  get_athlete_contacts: "Searching contact network…",
  get_athlete_timeline: "Loading career timeline…",
  search_roster: "Searching roster…",
  search_contacts_network: "Searching relationships…",
  get_cross_roster_intelligence: "Scanning intelligence feed…",
  get_roster_rankings_overview: "Analysing rankings…",
};

// ── Tool execution ────────────────────────────────────────────────────────────

async function executeTool(name: string, args: any): Promise<string> {
  try {
    switch (name) {
      case "get_athlete_profile": {
        const id = Number(args.athlete_id);
        if (!id) return JSON.stringify({ error: "Invalid athlete_id" });
        const [a] = await db.select().from(athletesTable).where(eq(athletesTable.id, id));
        if (!a) return JSON.stringify({ error: "Athlete not found" });
        return JSON.stringify({
          id: a.id, name: a.name, sport: a.sport, event: a.event,
          nationality: a.nationality, age: a.age,
          worldRank: a.worldRank, worldRankDelta: a.worldRankDelta,
          nationalRank: a.nationalRank, personalBest: a.personalBest,
          seasonBest: a.seasonBest,
          instagramFollowers: a.instagramFollowers, twitterFollowers: a.twitterFollowers,
          followerGrowth30d: a.followerGrowth30d, avgEngagement: a.avgEngagement,
          intelligenceCount: a.intelligenceCount, agentStatus: a.agentStatus,
          lastCrawledAt: a.lastCrawledAt,
        });
      }

      case "get_athlete_intelligence": {
        const id = Number(args.athlete_id);
        if (!id) return JSON.stringify({ error: "Invalid athlete_id" });
        const rows = await db
          .select()
          .from(intelligenceItemsTable)
          .where(eq(intelligenceItemsTable.athleteId, id))
          .orderBy(desc(intelligenceItemsTable.discoveredAt));
        return JSON.stringify(rows.map((r) => ({
          category: r.category, title: r.title, summary: r.summary,
          sourceDomain: r.sourceDomain, sourceUrl: r.sourceUrl,
          confidence: r.confidence, publishedAt: r.publishedAt,
          discoveredAt: r.discoveredAt,
        })));
      }

      case "get_athlete_competitions": {
        const id = Number(args.athlete_id);
        if (!id) return JSON.stringify({ error: "Invalid athlete_id" });
        const rows = await db
          .select()
          .from(competitionsTable)
          .where(eq(competitionsTable.athleteId, id))
          .orderBy(desc(competitionsTable.date));
        return JSON.stringify(rows.map((r) => ({
          meetName: r.meetName, event: r.event, location: r.location,
          date: r.date, tier: r.tier, status: r.status, result: r.result,
        })));
      }

      case "get_athlete_contacts": {
        const id = Number(args.athlete_id);
        if (!id) return JSON.stringify({ error: "Invalid athlete_id" });
        const rows = await db
          .select()
          .from(contactsTable)
          .where(eq(contactsTable.athleteId, id));
        return JSON.stringify(rows.map((r) => ({
          name: r.name, role: r.role, org: r.org,
          category: r.category, status: r.status, confidence: r.confidence,
        })));
      }

      case "get_athlete_timeline": {
        const id = Number(args.athlete_id);
        if (!id) return JSON.stringify({ error: "Invalid athlete_id" });
        const rows = await db
          .select()
          .from(timelineEventsTable)
          .where(eq(timelineEventsTable.athleteId, id))
          .orderBy(desc(timelineEventsTable.date));
        return JSON.stringify(rows.map((r) => ({
          date: r.date, title: r.title, category: r.category,
          description: r.description, location: r.location, significant: r.significant,
        })));
      }

      case "search_roster": {
        const { sport, nationality, min_age, max_age, keyword, limit = 20 } = args;
        let query = db.select().from(athletesTable);
        const conditions: any[] = [];
        if (sport) conditions.push(ilike(athletesTable.sport, `%${sport}%`));
        if (nationality) conditions.push(ilike(athletesTable.nationality, `%${nationality}%`));
        if (keyword) conditions.push(
          or(
            ilike(athletesTable.name, `%${keyword}%`),
            ilike(athletesTable.sport, `%${keyword}%`),
            ilike(athletesTable.event, `%${keyword}%`),
            ilike(athletesTable.nationality, `%${keyword}%`),
          )
        );
        if (min_age !== undefined) conditions.push(sql`${athletesTable.age} >= ${min_age}`);
        if (max_age !== undefined) conditions.push(sql`${athletesTable.age} <= ${max_age}`);

        const q = conditions.length > 0
          ? db.select().from(athletesTable).where(and(...conditions)).limit(Number(limit))
          : db.select().from(athletesTable).limit(Number(limit));
        const rows = await q;
        return JSON.stringify(rows.map((a) => ({
          id: a.id, name: a.name, sport: a.sport, event: a.event,
          nationality: a.nationality, age: a.age,
          worldRank: a.worldRank, personalBest: a.personalBest,
          intelligenceCount: a.intelligenceCount,
        })));
      }

      case "search_contacts_network": {
        const { keyword, category, role } = args;
        const conditions: any[] = [];
        if (keyword) conditions.push(
          or(
            ilike(contactsTable.name, `%${keyword}%`),
            ilike(contactsTable.org, `%${keyword}%`),
            ilike(contactsTable.role, `%${keyword}%`),
          )
        );
        if (category) conditions.push(ilike(contactsTable.category, `%${category}%`));
        if (role) conditions.push(ilike(contactsTable.role, `%${role}%`));

        const rows = conditions.length > 0
          ? await db.select({
              contactName: contactsTable.name,
              contactRole: contactsTable.role,
              contactOrg: contactsTable.org,
              contactCategory: contactsTable.category,
              athleteId: contactsTable.athleteId,
              athleteName: athletesTable.name,
            })
              .from(contactsTable)
              .innerJoin(athletesTable, eq(contactsTable.athleteId, athletesTable.id))
              .where(and(...conditions))
              .limit(30)
          : await db.select({
              contactName: contactsTable.name,
              contactRole: contactsTable.role,
              contactOrg: contactsTable.org,
              contactCategory: contactsTable.category,
              athleteId: contactsTable.athleteId,
              athleteName: athletesTable.name,
            })
              .from(contactsTable)
              .innerJoin(athletesTable, eq(contactsTable.athleteId, athletesTable.id))
              .limit(30);

        return JSON.stringify(rows);
      }

      case "get_cross_roster_intelligence": {
        const { category, keyword, limit = 20 } = args;
        const conditions: any[] = [];
        if (category) conditions.push(eq(intelligenceItemsTable.category, category));
        if (keyword) conditions.push(
          or(
            ilike(intelligenceItemsTable.title, `%${keyword}%`),
            ilike(intelligenceItemsTable.summary, `%${keyword}%`),
          )
        );

        const rows = conditions.length > 0
          ? await db.select().from(intelligenceItemsTable)
              .where(and(...conditions))
              .orderBy(desc(intelligenceItemsTable.discoveredAt))
              .limit(Math.min(Number(limit), 50))
          : await db.select().from(intelligenceItemsTable)
              .orderBy(desc(intelligenceItemsTable.discoveredAt))
              .limit(Math.min(Number(limit), 50));

        return JSON.stringify(rows.map((r) => ({
          athleteId: r.athleteId, athleteName: r.athleteName,
          category: r.category, title: r.title, summary: r.summary,
          sourceDomain: r.sourceDomain, confidence: r.confidence,
          publishedAt: r.publishedAt, discoveredAt: r.discoveredAt,
        })));
      }

      case "get_roster_rankings_overview": {
        const { sort_by = "world_rank", sport } = args;
        const conditions: any[] = [sql`${athletesTable.worldRank} IS NOT NULL`];
        if (sport) conditions.push(ilike(athletesTable.sport, `%${sport}%`));

        const rows = await db.select().from(athletesTable)
          .where(and(...conditions))
          .orderBy(athletesTable.worldRank)
          .limit(30);

        return JSON.stringify(rows.map((a) => ({
          id: a.id, name: a.name, sport: a.sport, event: a.event,
          nationality: a.nationality, age: a.age,
          worldRank: a.worldRank, worldRankDelta: a.worldRankDelta,
          nationalRank: a.nationalRank, personalBest: a.personalBest,
          seasonBest: a.seasonBest, intelligenceCount: a.intelligenceCount,
        })));
      }

      default:
        return JSON.stringify({ error: "Unknown tool" });
    }
  } catch (err) {
    logger.error({ err, name }, "Tool execution error");
    return JSON.stringify({ error: "Tool query failed" });
  }
}

// ── System prompt ─────────────────────────────────────────────────────────────

function buildSystemPrompt(roster: string, athleteCount: number): string {
  return `You are the Athlete Intelligence analyst — an expert sports intelligence officer embedded in a B2B platform used by national sport organisations, professional clubs, academies, and talent agencies.

You have access to structured, continuously updated intelligence on every athlete in this organisation's monitored roster. Your role is to answer questions like an experienced analyst who has instant access to that data.

━━━ CRITICAL RULES (never break these) ━━━

1. DATABASE FIRST. Always use your tools to retrieve platform data before answering any factual question. Never answer from your own training knowledge when platform data exists.

2. NEVER HALLUCINATE. Never invent rankings, results, contacts, sponsorships, relationships, or personal bests. If data is not in the platform, say so clearly.

3. CITE EVERYTHING. Every factual claim must state where it came from (which athlete record, which intelligence item, which tool). Use phrases like "According to platform data...", "The intelligence database shows...", "Platform records indicate...".

4. HONEST CONFIDENCE. If data is limited or conflicting, flag this. Use language like "with moderate confidence", "based on available intelligence".

5. STRUCTURED RESPONSES. Always use the response format below for substantive answers.

━━━ CAPABILITIES ━━━

You can help with:
• Athlete research — full profiles, recent changes, career arcs, strengths
• Comparison — side-by-side analysis of 2+ athletes across results, rankings, sponsorships, media, relationships
• Discovery — filter roster by sport, nationality, age, agency, coach, performance level
• Relationship intelligence — shared coaches, sponsors, agencies, competition connections
• Organisation intelligence — teams, sponsors, agencies, NSOs, competitions
• Trend analysis — fastest improving, declining rankings, media spikes, recent career changes
• Report generation — athlete briefings, competition summaries, sponsorship analysis

━━━ RESPONSE FORMAT ━━━

For substantive answers, structure your response like this:

## [Direct answer headline]

[2-3 sentence summary of the answer]

### Evidence
[Bullet points of key data points retrieved from tools, with source attribution]

### Key Relationships
[Relevant coaches, agents, sponsors, or connections — only if data exists]

### Sources
[List of data sources — sourceDomain values from intelligence items]

**Overall confidence:** [High / Moderate / Low] — [one-line reason]

---
FOLLOW_UP: [Question 1]|[Question 2]|[Question 3]

━━━ TOOL STRATEGY ━━━

- For questions about a specific athlete: use get_athlete_profile first, then get_athlete_intelligence, then other tools as needed
- For "what changed recently?" / "what's new?": use get_cross_roster_intelligence
- For discovery queries ("show NZ cyclists"): use search_roster
- For relationship queries ("who shares the same coach?"): use search_contacts_network
- For ranking comparisons: use get_roster_rankings_overview
- For detailed profile questions: chain multiple tools about the same athlete
- Always retrieve data before generating your answer — do not guess

Today's date: 2026-07-29

━━━ MONITORED ROSTER (${athleteCount} athletes) ━━━
${roster || "No athletes in roster yet. Tell the user to add athletes via the roster page."}

When using tools for specific athletes, use their [ID:N] from the roster above.`;
}

// ── POST /api/chat ─────────────────────────────────────────────────────────────

// 60 messages per user per 15 minutes — prevents OpenAI credit abuse
const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  keyGenerator: (req) => {
    const key = (req as any).userId ?? req.ip ?? "anon";
    // Normalize IPv6 and other special chars to avoid ERR_ERL_KEY_GEN_IPV6
    return String(key).replace(/[^a-zA-Z0-9._-]/g, "_");
  },
  validate: false,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many messages. Please slow down." },
});

router.post("/chat", chatLimiter, async (req, res): Promise<void> => {
  const { message, history = [] } = req.body ?? {};

  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "message is required" });
    return;
  }
  if (message.length > 10_000) {
    res.status(400).json({ error: "Message too long (max 10,000 characters)" });
    return;
  }

  // Load full roster for system context
  let rosterContext = "";
  let athleteCount = 0;
  try {
    const athletes = await db.select().from(athletesTable);
    athleteCount = athletes.length;
    rosterContext = athletes
      .map(
        (a) =>
          `• [ID:${a.id}] ${a.name} — ${a.sport} | ${a.event} | ${a.nationality}` +
          (a.age ? ` | Age ${a.age}` : "") +
          (a.worldRank ? ` | World #${a.worldRank}` : "") +
          (a.personalBest ? ` | PB: ${a.personalBest}` : "") +
          (a.agentStatus === "active" ? " | ✓ Active" : ""),
      )
      .join("\n");
  } catch (err) {
    logger.warn({ err }, "Failed to load roster for chat context");
  }

  const systemPrompt = buildSystemPrompt(rosterContext, athleteCount);

  const messages: any[] = [
    { role: "system", content: systemPrompt },
    ...history.map((m: any) => ({ role: m.role, content: m.content })),
    { role: "user", content: message },
  ];

  // SSE setup
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const send = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    let iteration = 0;
    const MAX_ITERATIONS = 6;
    let hasCalledAnyTool = false;

    while (iteration < MAX_ITERATIONS) {
      iteration++;
      const isLastIteration = iteration >= MAX_ITERATIONS;

      const completion = await openai.chat.completions.create({
        model: "gpt-5.6-luna",
        messages,
        tools: isLastIteration ? undefined : TOOLS,
        tool_choice: isLastIteration ? undefined : "auto",
        stream: true,
        max_completion_tokens: 3000,
        // reasoning_effort must be 'none' to use function tools on this model
        reasoning_effort: "none",
      } as any);

      let fullContent = "";
      const toolCalls: Record<string, { name: string; arguments: string }> = {};

      for await (const chunk of completion) {
        const delta = chunk.choices[0]?.delta;

        if (delta?.content) {
          fullContent += delta.content;
          send({ token: delta.content });
        }

        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = String(tc.index ?? 0);
            if (!toolCalls[idx]) toolCalls[idx] = { name: "", arguments: "" };
            if (tc.function?.name) toolCalls[idx].name += tc.function.name;
            if (tc.function?.arguments) toolCalls[idx].arguments += tc.function.arguments;
          }
        }
      }

      const hasCalls = Object.keys(toolCalls).length > 0;

      if (!hasCalls) {
        messages.push({ role: "assistant", content: fullContent });
        break;
      }

      // Execute tool calls
      const assistantToolCalls = Object.entries(toolCalls).map(([idx, tc]) => ({
        id: `call_${idx}`,
        type: "function" as const,
        function: { name: tc.name, arguments: tc.arguments },
      }));

      messages.push({
        role: "assistant",
        content: fullContent || null,
        tool_calls: assistantToolCalls,
      });

      // Stream phase label for each tool
      const phases = [...new Set(assistantToolCalls.map((tc) => TOOL_PHASES[tc.function.name]).filter(Boolean))];
      if (phases.length) send({ phase: phases[0] });
      hasCalledAnyTool = true;

      // Execute all tool calls
      for (const tc of assistantToolCalls) {
        let args: any = {};
        try { args = JSON.parse(tc.function.arguments); } catch {}
        const result = await executeTool(tc.function.name, args);
        messages.push({ role: "tool", tool_call_id: tc.id, content: result });
      }

      // If this wasn't the last iteration and we've retrieved data, 
      // add a final instruction to generate the structured response
      if (!isLastIteration && hasCalledAnyTool) {
        send({ phase: "Generating analysis…" });
      }
    }

    send({ done: true });
    res.end();
  } catch (err: any) {
    logger.error({ err }, "Chat streaming error");
    send({ error: err.message ?? "Something went wrong" });
    res.end();
  }
});

export default router;
