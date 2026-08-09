/**
 * aiRateLimit.test.ts
 *
 * Proves createAiRateLimit() actually throttles: N requests from the same
 * authenticated user succeed, request N+1 within the same window gets 429,
 * and a different user gets their own independent quota. Run with:
 *
 *   ../../scripts/node_modules/.bin/tsx --test src/middleware/aiRateLimit.test.ts
 *   (or `pnpm run test` from this package)
 *
 * Spins up a real Express server on an ephemeral port with the actual
 * createAiRateLimit() factory mounted on a dummy route -- this exercises
 * the real middleware, not a reimplementation of it.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import type { Server } from "node:http";
import { createAiRateLimit } from "./aiRateLimit.js";

function startTestServer(max: number, windowMs: number): Promise<{ server: Server; baseUrl: string }> {
  const app = express();
  // Simulates requireAuth.ts setting req.userId before the limiter runs.
  app.use((req, _res, next) => {
    (req as express.Request & { userId?: string }).userId = req.header("x-test-user") ?? undefined;
    next();
  });
  app.get("/dummy", createAiRateLimit({ windowMs, max, message: "rate limited" }), (_req, res) => {
    res.status(200).json({ ok: true });
  });

  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

test("allows up to `max` requests, then throttles the same user with 429", async () => {
  const { server, baseUrl } = await startTestServer(3, 60_000);
  try {
    const statuses: number[] = [];
    for (let i = 0; i < 5; i++) {
      const res = await fetch(`${baseUrl}/dummy`, { headers: { "x-test-user": "user-a" } });
      statuses.push(res.status);
    }
    assert.deepEqual(statuses, [200, 200, 200, 429, 429], "requests 1-3 succeed, 4 and 5 are throttled");
  } finally {
    server.close();
  }
});

test("a 429 response includes the configured error message", async () => {
  const { server, baseUrl } = await startTestServer(1, 60_000);
  try {
    await fetch(`${baseUrl}/dummy`, { headers: { "x-test-user": "user-b" } });
    const res = await fetch(`${baseUrl}/dummy`, { headers: { "x-test-user": "user-b" } });
    const body = (await res.json()) as { error?: string };
    assert.equal(res.status, 429);
    assert.equal(body.error, "rate limited");
  } finally {
    server.close();
  }
});

test("different users get independent quotas (per-user key, not global)", async () => {
  const { server, baseUrl } = await startTestServer(1, 60_000);
  try {
    const resA = await fetch(`${baseUrl}/dummy`, { headers: { "x-test-user": "user-c" } });
    const resB = await fetch(`${baseUrl}/dummy`, { headers: { "x-test-user": "user-d" } });
    assert.equal(resA.status, 200, "user-c's first request succeeds");
    assert.equal(resB.status, 200, "user-d's first request succeeds independently of user-c's quota");

    const resAAgain = await fetch(`${baseUrl}/dummy`, { headers: { "x-test-user": "user-c" } });
    assert.equal(resAAgain.status, 429, "user-c's second request is throttled (their own quota, not user-d's)");
  } finally {
    server.close();
  }
});

test("requests recover after the window elapses", async () => {
  const { server, baseUrl } = await startTestServer(1, 300);
  try {
    const first = await fetch(`${baseUrl}/dummy`, { headers: { "x-test-user": "user-e" } });
    const second = await fetch(`${baseUrl}/dummy`, { headers: { "x-test-user": "user-e" } });
    assert.equal(first.status, 200);
    assert.equal(second.status, 429);

    await new Promise((r) => setTimeout(r, 400));

    const third = await fetch(`${baseUrl}/dummy`, { headers: { "x-test-user": "user-e" } });
    assert.equal(third.status, 200, "quota resets once the window has elapsed");
  } finally {
    server.close();
  }
});
