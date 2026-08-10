/**
 * athletes.owner.test.ts
 *
 * M7 (multi-tenancy schema foundation): HTTP-level contract test proving
 * every athlete-creation route stamps the creating user's id onto
 * owner_id, against the REAL athletes router and a real database --
 * same approach as athletes.bulk.test.ts, requires DATABASE_URL and the
 * owner_id column already present (run scripts/backfill-owner-id.ts once
 * against a fresh DB before this suite, same as any other schema change).
 *
 * POST /athletes/discover is deliberately not covered here: unlike the
 * other two creation routes, it awaits a real OpenAI call before the
 * insert happens, and this project's existing test suite already
 * establishes the convention of not firing real AI calls from automated
 * tests (see athletes.bulk.test.ts's docstring). Its insert uses the
 * identical `ownerId: ownerIdOf(req)` pattern verified here for the
 * other two routes -- confirmed by code review, not a separate risk.
 *
 * Two distinct simulated users (test-user-a / test-user-b) are used to
 * additionally prove the value isn't a hardcoded/shared constant -- it
 * actually varies with whoever made the request.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import type { Server } from "node:http";
import { eq } from "drizzle-orm";
import { db, athletesTable } from "@workspace/db";
import athletesRouter from "./athletes.js";

function startTestServer(userId: string): Promise<{ server: Server; baseUrl: string }> {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => { req.userId = userId; next(); });
  app.use("/api", athletesRouter);

  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({ server, baseUrl: `http://127.0.0.1:${port}/api` });
    });
  });
}

async function cleanupByName(name: string) {
  await db.delete(athletesTable).where(eq(athletesTable.name, name));
}

test("POST /athletes stamps owner_id from the authenticated request", async () => {
  const name = `M7 Owner Test Single ${Date.now()}`;
  const { server, baseUrl } = await startTestServer("test-user-a");
  try {
    const res = await fetch(`${baseUrl}/athletes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, sport: "Athletics", event: "100m", nationality: "NZL" }),
    });
    assert.equal(res.status, 201);
    const body = (await res.json()) as { id: number };

    const [row] = await db.select().from(athletesTable).where(eq(athletesTable.id, body.id));
    assert.equal(row.ownerId, "test-user-a");
  } finally {
    server.close();
    await cleanupByName(name);
  }
});

test("POST /athletes/bulk stamps owner_id on every imported row", async () => {
  const nameA = `M7 Owner Test Bulk A ${Date.now()}`;
  const nameB = `M7 Owner Test Bulk B ${Date.now()}`;
  const { server, baseUrl } = await startTestServer("test-user-b");
  try {
    const res = await fetch(`${baseUrl}/athletes/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        athletes: [
          { name: nameA, sport: "Athletics", event: "100m", nationality: "NZL" },
          { name: nameB, sport: "Athletics", event: "200m", nationality: "NZL" },
        ],
      }),
    });
    assert.equal(res.status, 201);
    const body = (await res.json()) as { imported: number };
    assert.equal(body.imported, 2);

    const rows = await db.select().from(athletesTable);
    const created = rows.filter((r) => r.name === nameA || r.name === nameB);
    assert.equal(created.length, 2);
    for (const row of created) {
      assert.equal(row.ownerId, "test-user-b");
    }
  } finally {
    server.close();
    await cleanupByName(nameA);
    await cleanupByName(nameB);
  }
});

test("two different requesting users get two different owner_id values on their own athletes", async () => {
  const nameA = `M7 Owner Test Distinct A ${Date.now()}`;
  const nameB = `M7 Owner Test Distinct B ${Date.now()}`;

  const serverA = await startTestServer("test-user-distinct-a");
  const serverB = await startTestServer("test-user-distinct-b");
  try {
    const [resA, resB] = await Promise.all([
      fetch(`${serverA.baseUrl}/athletes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameA, sport: "Athletics", event: "100m", nationality: "NZL" }),
      }),
      fetch(`${serverB.baseUrl}/athletes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameB, sport: "Athletics", event: "100m", nationality: "NZL" }),
      }),
    ]);
    assert.equal(resA.status, 201);
    assert.equal(resB.status, 201);

    const rows = await db.select().from(athletesTable);
    const rowA = rows.find((r) => r.name === nameA);
    const rowB = rows.find((r) => r.name === nameB);
    assert.equal(rowA?.ownerId, "test-user-distinct-a");
    assert.equal(rowB?.ownerId, "test-user-distinct-b");
    assert.notEqual(rowA?.ownerId, rowB?.ownerId);
  } finally {
    serverA.server.close();
    serverB.server.close();
    await cleanupByName(nameA);
    await cleanupByName(nameB);
  }
});
