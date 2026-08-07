import { describe, expect, it, vi } from "vitest";
// Deliberately imported from fanOutReconciliation.js, not orchestrator.js —
// orchestrator.ts imports @workspace/db at its top level, which throws at
// import time (not just query time) if DATABASE_URL is unset. These first
// tests are pure and must not require a database at all; see
// fanOutReconciliation.ts's header for the full reasoning.
import { reconcileFanOutResults } from "./fanOutReconciliation.js";
import type { AgentResult } from "./types.js";

function ok(agent: string): AgentResult {
  return { agent, status: "ok", facts: [], meta: { latencyMs: 10, retries: 0 } };
}

describe("reconcileFanOutResults (Promise.allSettled partial-failure contract)", () => {
  it("passes through a fulfilled 'ok' result unchanged", () => {
    const settled: PromiseSettledResult<AgentResult>[] = [{ status: "fulfilled", value: ok("results") }];
    const reconciled = reconcileFanOutResults(["results"], settled, 1);
    expect(reconciled).toEqual([ok("results")]);
  });

  it("passes through a fulfilled 'error' AgentResult unchanged — a well-behaved agent that caught its own failure", () => {
    const errorResult: AgentResult = { agent: "results", status: "error", facts: [], meta: { latencyMs: 5, retries: 0 }, error: { classification: "transient", message: "timeout" } };
    const settled: PromiseSettledResult<AgentResult>[] = [{ status: "fulfilled", value: errorResult }];
    const reconciled = reconcileFanOutResults(["results"], settled, 1);
    expect(reconciled).toEqual([errorResult]);
  });

  it("substitutes a synthetic error result for an agent that threw instead of returning an AgentResult", () => {
    const settled: PromiseSettledResult<AgentResult>[] = [{ status: "rejected", reason: new Error("agent crashed") }];
    const reconciled = reconcileFanOutResults(["results"], settled, 1);
    expect(reconciled).toHaveLength(1);
    expect(reconciled[0].status).toBe("error");
    expect(reconciled[0].agent).toBe("results");
  });

  it("the exact roadmap scenario: one 'ok' agent and one that threw — both are represented, neither is dropped", () => {
    const settled: PromiseSettledResult<AgentResult>[] = [
      { status: "fulfilled", value: ok("results") },
      { status: "rejected", reason: new Error("contacts agent crashed") },
    ];
    const reconciled = reconcileFanOutResults(["results", "contacts"], settled, 1);

    expect(reconciled).toHaveLength(2);
    expect(reconciled.find((r) => r.agent === "results")?.status).toBe("ok");
    expect(reconciled.find((r) => r.agent === "contacts")?.status).toBe("error");
  });

  it("logs but does not throw when reconciling a rejected outcome", () => {
    const settled: PromiseSettledResult<AgentResult>[] = [{ status: "rejected", reason: "boom" }];
    expect(() => reconcileFanOutResults(["x"], settled, 1)).not.toThrow();
  });
});

const hasDb = !!process.env.DATABASE_URL;

function mockExtractionResponse(data: Record<string, unknown>) {
  return { choices: [{ message: { content: JSON.stringify(data) } }] };
}

function mockIdentityResponse(data: Record<string, unknown>) {
  return { choices: [{ message: { content: JSON.stringify(data) } }] };
}

function mockResearchResponse() {
  return { choices: [{ message: { content: "Placeholder research." } }], citations: [] };
}

describe("orchestrator.onCreate / onRefresh (integration)", () => {
  it.skipIf(!hasDb)("rejects a low-confidence identity without creating an athlete row", async () => {
    vi.resetModules();
    vi.doMock("@workspace/integrations-openai-ai-server", () => ({
      openai: { chat: { completions: { create: vi.fn().mockResolvedValue(mockIdentityResponse({ sport: null, event: null, nationality: null, age: null, confidence: 10, ambiguous: true, reason: "Too common a name." })) } } },
    }));
    vi.doMock("@workspace/integrations-openrouter-ai", () => ({
      openrouter: { chat: { completions: { create: vi.fn().mockResolvedValue(mockResearchResponse()) } } },
    }));
    vi.doMock("../photo-lookup.js", () => ({ fetchWikipediaPhoto: vi.fn().mockResolvedValue(null) }));

    const { onCreate } = await import("./orchestrator.js");
    const { db, athletesTable } = await import("@workspace/db");
    const { eq } = await import("drizzle-orm");

    const uniqueName = `Test Rejected Athlete ${Date.now()}`;
    const result = await onCreate(uniqueName);

    expect(result.accepted).toBe(false);
    if (!result.accepted) {
      expect(result.confidence).toBe(10);
    }

    const rows = await db.select().from(athletesTable).where(eq(athletesTable.name, uniqueName));
    expect(rows).toHaveLength(0);
  });

  it.skipIf(!hasDb)("accepts a high-confidence identity, creates the athlete row, and records the identity agent_runs row", async () => {
    vi.resetModules();
    vi.doMock("@workspace/integrations-openai-ai-server", () => ({
      openai: {
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue(
              mockIdentityResponse({ sport: "Athletics", event: "800m", nationality: "Australia", age: 30, confidence: 90, ambiguous: false, reason: "Well-known athlete." }),
            ),
          },
        },
      },
    }));
    vi.doMock("@workspace/integrations-openrouter-ai", () => ({
      openrouter: { chat: { completions: { create: vi.fn().mockResolvedValue(mockResearchResponse()) } } },
    }));
    vi.doMock("../photo-lookup.js", () => ({ fetchWikipediaPhoto: vi.fn().mockResolvedValue(null) }));

    const { onCreate } = await import("./orchestrator.js");
    const { db, athletesTable, agentRunsTable, alertConfigsTable } = await import("@workspace/db");
    const { eq, and } = await import("drizzle-orm");

    const uniqueName = `Test Accepted Athlete ${Date.now()}`;
    const result = await onCreate(uniqueName);

    expect(result.accepted).toBe(true);
    if (!result.accepted) return;

    expect(result.athlete.sport).toBe("Athletics");
    expect(result.athlete.nationality).toBe("Australia");

    const alertRows = await db.select().from(alertConfigsTable).where(eq(alertConfigsTable.athleteId, result.athlete.id));
    expect(alertRows).toHaveLength(1);

    const identityRuns = await db
      .select()
      .from(agentRunsTable)
      .where(and(eq(agentRunsTable.athleteId, result.athlete.id), eq(agentRunsTable.agent, "identity")));
    expect(identityRuns).toHaveLength(1);
    expect(identityRuns[0].status).toBe("ok");
  });

  it.skipIf(!hasDb)("onRefresh completes and records a legacy_monolith agent_runs row for an existing athlete", async () => {
    vi.resetModules();
    vi.doMock("@workspace/integrations-openai-ai-server", () => ({
      openai: {
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue(
              mockExtractionResponse({ athlete_stats: {}, intelligence_items: [], timeline_events: [], contacts: [], competitions: [] }),
            ),
          },
        },
      },
    }));
    vi.doMock("@workspace/integrations-openrouter-ai", () => ({
      openrouter: { chat: { completions: { create: vi.fn().mockResolvedValue(mockResearchResponse()) } } },
    }));
    vi.doMock("../photo-lookup.js", () => ({ fetchWikipediaPhoto: vi.fn().mockResolvedValue(null) }));

    const { onRefresh } = await import("./orchestrator.js");
    const { db, athletesTable, agentRunsTable } = await import("@workspace/db");
    const { eq, and, desc } = await import("drizzle-orm");

    const [athlete] = await db.select().from(athletesTable).where(eq(athletesTable.name, "Zoe Hobbs"));
    expect(athlete, "Zoe Hobbs must already exist in the target database").toBeDefined();

    await onRefresh(athlete.id);

    const runs = await db
      .select()
      .from(agentRunsTable)
      .where(and(eq(agentRunsTable.athleteId, athlete.id), eq(agentRunsTable.agent, "legacy_monolith")))
      .orderBy(desc(agentRunsTable.ranAt))
      .limit(1);
    expect(runs).toHaveLength(1);
    expect(runs[0].status).toBe("ok");
  });

  it.skipIf(!hasDb)("onRefresh resolves cleanly (never throws) even when the underlying pipeline aborts, and records status:error", async () => {
    vi.resetModules();
    vi.doMock("@workspace/integrations-openai-ai-server", () => ({
      openai: { chat: { completions: { create: vi.fn() } } },
    }));
    vi.doMock("@workspace/integrations-openrouter-ai", () => ({
      // Simulate a Perplexity research failure — the exact case
      // PerplexityResearchError exists for inside autoPopulateAthlete.
      openrouter: { chat: { completions: { create: vi.fn().mockRejectedValue(new Error("Perplexity unavailable")) } } },
    }));
    vi.doMock("../photo-lookup.js", () => ({ fetchWikipediaPhoto: vi.fn().mockResolvedValue(null) }));

    const { onRefresh } = await import("./orchestrator.js");
    const { db, athletesTable, agentRunsTable } = await import("@workspace/db");
    const { eq, and, desc } = await import("drizzle-orm");

    const [athlete] = await db.select().from(athletesTable).where(eq(athletesTable.name, "Zoe Hobbs"));
    expect(athlete).toBeDefined();

    await expect(onRefresh(athlete.id)).resolves.toBeUndefined();

    const runs = await db
      .select()
      .from(agentRunsTable)
      .where(and(eq(agentRunsTable.athleteId, athlete.id), eq(agentRunsTable.agent, "legacy_monolith")))
      .orderBy(desc(agentRunsTable.ranAt))
      .limit(1);
    expect(runs).toHaveLength(1);
    expect(runs[0].status).toBe("error");
  });
});
