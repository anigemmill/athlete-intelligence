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

describe("orchestrator.onRefresh — Milestone 3 results-agent flag (integration)", () => {
  // One combined mock response satisfies both LegacyMonolithAgent's
  // extraction shape (athlete_stats/intelligence_items/...) and
  // ResultsAgent's extraction shape (worldRank/nationalRank/...) — both
  // agents JSON.parse the same content string and read only their own keys.
  // athlete_stats.worldRank is deliberately a different value (999) from
  // the results-shaped worldRank.value (7) so a test can tell which agent's
  // write actually won.
  function combinedMockContent() {
    return JSON.stringify({
      athlete_stats: { worldRank: 999, worldRankDelta: 0, nationalRank: 999, personalBest: null, seasonBest: null },
      intelligence_items: [],
      timeline_events: [],
      contacts: [],
      competitions: [],
      worldRank: { value: 7, sourceDomain: "worldathletics.org", sourceUrl: "https://worldathletics.org/rankings", confidence: 90, publishedAt: null, rawExcerpt: "ranked 7th" },
      nationalRank: null,
      personalBest: null,
      seasonBest: null,
    });
  }

  function mockOpenAiAndOpenRouter() {
    vi.doMock("@workspace/integrations-openai-ai-server", () => ({
      openai: { chat: { completions: { create: vi.fn().mockResolvedValue({ choices: [{ message: { content: combinedMockContent() } }] }) } } },
    }));
    vi.doMock("@workspace/integrations-openrouter-ai", () => ({
      openrouter: { chat: { completions: { create: vi.fn().mockResolvedValue({ choices: [{ message: { content: "Placeholder research." } }], citations: [] }) } } },
    }));
    vi.doMock("../photo-lookup.js", () => ({ fetchWikipediaPhoto: vi.fn().mockResolvedValue(null) }));
  }

  // These tests create their own disposable athlete rather than reusing a
  // golden-set athlete (Zoe Hobbs etc.) — unlike the read-mostly checks
  // above, these deliberately write into world_rank/national_rank, and the
  // golden set must stay pristine for docs/metrics/m<N>.json's audit
  // baseline.
  async function createDisposableAthlete(name: string) {
    const { db, athletesTable } = await import("@workspace/db");
    const [athlete] = await db
      .insert(athletesTable)
      .values({ name, sport: "Athletics", event: "800m", nationality: "Australia", squad: "", agentStatus: "active" })
      .returning();
    return athlete;
  }

  it.skipIf(!hasDb)("with PIPELINE_AGENTS=results, ResultsAgent's value wins and legacy_monolith's would-be write is suppressed", async () => {
    vi.resetModules();
    mockOpenAiAndOpenRouter();
    const previousFlag = process.env.PIPELINE_AGENTS;
    process.env.PIPELINE_AGENTS = "results";

    try {
      const { onRefresh } = await import("./orchestrator.js");
      const { db, athletesTable, agentRunsTable } = await import("@workspace/db");
      const { eq, and, desc } = await import("drizzle-orm");

      const athlete = await createDisposableAthlete(`Test Results-Flag Athlete ${Date.now()}`);

      await onRefresh(athlete.id);

      const [after] = await db.select().from(athletesTable).where(eq(athletesTable.id, athlete.id));
      // ResultsAgent's value (7), not the legacy monolith's would-be value
      // (999) — proves the skip mechanism actually suppressed that write,
      // not just that ResultsAgent ran.
      expect(after.worldRank).toBe(7);

      const resultsRuns = await db.select().from(agentRunsTable).where(and(eq(agentRunsTable.athleteId, athlete.id), eq(agentRunsTable.agent, "results"))).orderBy(desc(agentRunsTable.ranAt)).limit(1);
      expect(resultsRuns).toHaveLength(1);
      expect(resultsRuns[0].status).toBe("ok");

      const legacyRuns = await db.select().from(agentRunsTable).where(and(eq(agentRunsTable.athleteId, athlete.id), eq(agentRunsTable.agent, "legacy_monolith"))).orderBy(desc(agentRunsTable.ranAt)).limit(1);
      expect(legacyRuns).toHaveLength(1);
      expect(legacyRuns[0].status).toBe("ok");
    } finally {
      if (previousFlag === undefined) delete process.env.PIPELINE_AGENTS;
      else process.env.PIPELINE_AGENTS = previousFlag;
    }
  });

  it.skipIf(!hasDb)("removing results from PIPELINE_AGENTS restores legacy-monolith-writes-everything behaviour (rollback proof)", async () => {
    vi.resetModules();
    mockOpenAiAndOpenRouter();
    const previousFlag = process.env.PIPELINE_AGENTS;
    delete process.env.PIPELINE_AGENTS; // rollback: no specialised agents enabled

    try {
      const { onRefresh } = await import("./orchestrator.js");
      const { db, athletesTable } = await import("@workspace/db");
      const { eq } = await import("drizzle-orm");

      const athlete = await createDisposableAthlete(`Test Results-Rollback Athlete ${Date.now()}`);

      await onRefresh(athlete.id);

      const [after] = await db.select().from(athletesTable).where(eq(athletesTable.id, athlete.id));
      // With the flag removed, the legacy monolith is once again the sole
      // writer of the stats block — its value (999) must win, exactly the
      // pre-Milestone-3 behaviour.
      expect(after.worldRank).toBe(999);
    } finally {
      if (previousFlag === undefined) delete process.env.PIPELINE_AGENTS;
      else process.env.PIPELINE_AGENTS = previousFlag;
    }
  });
});
