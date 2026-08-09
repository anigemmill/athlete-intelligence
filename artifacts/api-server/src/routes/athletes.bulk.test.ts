/**
 * athletes.bulk.test.ts
 *
 * HTTP-level contract test for POST /athletes/bulk's size cap, against
 * the REAL athletes router (imported directly, not reimplemented) over a
 * real HTTP connection. Requires DATABASE_URL (same as every other DB-
 * backed check in this project).
 *
 * Deliberately only exercises the boundary cases that never reach the
 * DB-insert / autoPopulateAthlete code path: an empty array (0 athletes,
 * the loop body never runs) and an over-the-cap array (rejected before
 * the loop even starts). The 1-athlete and 10-athletes valid cases are
 * covered by bulk-import-limit.test.ts's pure boundary check instead --
 * exercising them here would mean this test suite fires real, billed
 * Perplexity/OpenAI calls every run, which is exactly the kind of cost
 * this cap exists to prevent. See docs/mvp-pilot-readiness-checklist-2026-08-09.md.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import type { Server } from "node:http";
import { MAX_BULK_ATHLETES } from "../lib/bulk-import-limit.js";
import athletesRouter from "./athletes.js";

function startTestServer(): Promise<{ server: Server; baseUrl: string }> {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => { req.userId = "test-user"; next(); });
  app.use("/api", athletesRouter);

  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({ server, baseUrl: `http://127.0.0.1:${port}/api` });
    });
  });
}

test("0 athletes: accepted, nothing imported (never reaches the cap check's rejection path)", async () => {
  const { server, baseUrl } = await startTestServer();
  try {
    const res = await fetch(`${baseUrl}/athletes/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ athletes: [] }),
    });
    const body = (await res.json()) as { imported: number; total: number };
    assert.equal(res.status, 201);
    assert.equal(body.imported, 0);
    assert.equal(body.total, 0);
  } finally {
    server.close();
  }
});

test(`${MAX_BULK_ATHLETES + 1} athletes: rejected with a clear 400 before any row is processed`, async () => {
  const { server, baseUrl } = await startTestServer();
  try {
    const tooMany = Array.from({ length: MAX_BULK_ATHLETES + 1 }, (_, i) => ({ name: `Athlete ${i}` }));
    const res = await fetch(`${baseUrl}/athletes/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ athletes: tooMany }),
    });
    const body = (await res.json()) as { error?: string };
    assert.equal(res.status, 400);
    assert.match(body.error ?? "", new RegExp(`limited to ${MAX_BULK_ATHLETES} athletes`));
    assert.match(body.error ?? "", /Received 11/);
  } finally {
    server.close();
  }
});

test("well over the limit is also rejected with the same clear error", async () => {
  const { server, baseUrl } = await startTestServer();
  try {
    const wayTooMany = Array.from({ length: 250 }, (_, i) => ({ name: `Athlete ${i}` }));
    const res = await fetch(`${baseUrl}/athletes/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ athletes: wayTooMany }),
    });
    const body = (await res.json()) as { error?: string };
    assert.equal(res.status, 400);
    assert.match(body.error ?? "", /Received 250/);
  } finally {
    server.close();
  }
});
