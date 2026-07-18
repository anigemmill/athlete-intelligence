/**
 * chat.ts — Real AI-powered streaming chat
 *
 * POST /api/chat
 *   Streams a server-sent-events response. Loads the full roster as context,
 *   then uses OpenAI tool-calling to fetch per-athlete detail on demand.
 *   The frontend reads the SSE stream and appends tokens in real time.
 */

import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
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

// ── Tool definitions ─────────────────────────────────────────────────────────
const TOOLS: any[] = [
  {
    type: "function",
    function: {
      name: "get_athlete_intelligence",
      description: "Fetch the full intelligence items (news, results, sponsorships, career events) for a specific athlete by their database ID.",
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
      description: "Fetch all competition results and upcoming meets for a specific athlete.",
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
      description: "Fetch the known contacts (coaches, agents, sponsors) for a specific athlete.",
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
      description: "Fetch the career timeline events for a specific athlete.",
      parameters: {
        type: "object",
        properties: {
          athlete_id: { type: "number", description: "The athlete's database ID" },
        },
        required: ["athlete_id"],
      },
    },
  },
];

// ── Tool execution ────────────────────────────────────────────────────────────
async function executeTool(name: string, args: any): Promise<string> {
  const id = Number(args.athlete_id);
  if (!id) return JSON.stringify({ error: "Invalid athlete_id" });

  try {
    switch (name) {
      case "get_athlete_intelligence": {
        const rows = await db.select().from(intelligenceItemsTable).where(eq(intelligenceItemsTable.athleteId, id));
        return JSON.stringify(rows.map((r) => ({
          title: r.title, category: r.category, summary: r.summary,
          source: r.sourceDomain, confidence: r.confidence,
          publishedAt: r.publishedAt,
        })));
      }
      case "get_athlete_competitions": {
        const rows = await db.select().from(competitionsTable).where(eq(competitionsTable.athleteId, id));
        return JSON.stringify(rows.map((r) => ({
          meet: r.meetName, event: r.event, location: r.location,
          date: r.date, tier: r.tier, status: r.status, result: r.result,
        })));
      }
      case "get_athlete_contacts": {
        const rows = await db.select().from(contactsTable).where(eq(contactsTable.athleteId, id));
        return JSON.stringify(rows.map((r) => ({
          name: r.name, role: r.role, org: r.org,
          category: r.category, status: r.status, confidence: r.confidence,
        })));
      }
      case "get_athlete_timeline": {
        const rows = await db.select().from(timelineEventsTable).where(eq(timelineEventsTable.athleteId, id));
        return JSON.stringify(rows.map((r) => ({
          date: r.date, title: r.title, category: r.category,
          description: r.description, location: r.location, significant: r.significant,
        })));
      }
      default:
        return JSON.stringify({ error: "Unknown tool" });
    }
  } catch (err) {
    logger.error({ err, name }, "Tool execution error");
    return JSON.stringify({ error: "Tool failed" });
  }
}

// ── POST /api/chat ────────────────────────────────────────────────────────────
router.post("/chat", async (req, res): Promise<void> => {
  const { message, history = [] } = req.body ?? {};

  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "message is required" });
    return;
  }

  // Load full roster for system context
  let rosterContext = "";
  try {
    const athletes = await db.select().from(athletesTable);
    const lines = athletes.map((a) =>
      `• [ID:${a.id}] ${a.name} — ${a.sport}, ${a.event}, ${a.nationality}` +
      (a.worldRank ? ` | World #${a.worldRank}` : "") +
      (a.personalBest ? ` | PB: ${a.personalBest}` : "") +
      (a.intelligenceCount ? ` | ${a.intelligenceCount} intel items` : ""),
    );
    rosterContext = lines.join("\n");
  } catch (err) {
    logger.warn({ err }, "Failed to load roster for chat context");
  }

  const systemPrompt = `You are the Athlete Intelligence assistant — an expert AI embedded in a B2B sports intelligence platform used by national sport organisations, professional clubs, and talent agencies.

You have access to real-time data on every athlete in this organisation's monitored roster. Use the provided tools to look up detailed intelligence, competition results, career timeline, and contacts for specific athletes when needed.

Always be specific and data-driven. Cite athlete names, dates, and statistics when they are available. If data is limited, say so clearly rather than speculating.

Today's date: ${new Date().toISOString().split("T")[0]}

MONITORED ROSTER (${rosterContext.split("\n").filter(Boolean).length} athletes):
${rosterContext || "No athletes in roster yet."}

When referring to an athlete in your tools, use their ID from the roster above (shown as [ID:N]).`;

  // Build message history for OpenAI
  const messages: any[] = [
    { role: "system", content: systemPrompt },
    ...history.map((m: any) => ({ role: m.role, content: m.content })),
    { role: "user", content: message },
  ];

  // Set up SSE stream
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
    // Agentic loop — handle tool calls until a final text response
    let iteration = 0;
    const MAX_ITERATIONS = 5;

    while (iteration < MAX_ITERATIONS) {
      iteration++;

      const isLastIteration = iteration >= MAX_ITERATIONS;

      if (isLastIteration) {
        // Force text response on last iteration
        const completion = await openai.chat.completions.create({
          model: "gpt-5.6-luna",
          messages,
          stream: true,
          max_completion_tokens: 1024,
        });

        let fullContent = "";
        for await (const chunk of completion) {
          const token = chunk.choices[0]?.delta?.content ?? "";
          if (token) {
            fullContent += token;
            send({ token });
          }
        }
        messages.push({ role: "assistant", content: fullContent });
        break;
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-5.6-luna",
        messages,
        tools: TOOLS,
        tool_choice: "auto",
        stream: true,
        max_completion_tokens: 1024,
      });

      // Accumulate streamed response (may include tool calls)
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
        // Final text response — done
        messages.push({ role: "assistant", content: fullContent });
        break;
      }

      // Execute tool calls
      const assistantToolCalls = Object.entries(toolCalls).map(([idx, tc]) => ({
        id: `call_${idx}`,
        type: "function" as const,
        function: { name: tc.name, arguments: tc.arguments },
      }));
      messages.push({ role: "assistant", content: fullContent || null, tool_calls: assistantToolCalls });

      send({ toolCall: assistantToolCalls.map((tc) => tc.function.name) });

      for (const tc of assistantToolCalls) {
        let args: any = {};
        try { args = JSON.parse(tc.function.arguments); } catch {}
        const result = await executeTool(tc.function.name, args);
        messages.push({ role: "tool", tool_call_id: tc.id, content: result });
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
