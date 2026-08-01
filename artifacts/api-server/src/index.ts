import app from "./app";
import { logger } from "./lib/logger";
import { runMigrations } from "stripe-replit-sync";
import { getStripeSync } from "./lib/stripeClient.js";
import { db } from "@workspace/db";
import { athletesTable } from "@workspace/db";
import { lt, isNull, or, eq } from "drizzle-orm";
import { repopulateAthlete } from "./lib/auto-populate.js";

// ── Stripe init ───────────────────────────────────────────────────────────────
async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) { logger.warn("DATABASE_URL not set — skipping Stripe init"); return; }
  try {
    await runMigrations({ databaseUrl, schema: "stripe" });
    const stripeSync = await getStripeSync();
    const webhookBaseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;
    await stripeSync.findOrCreateManagedWebhook(`${webhookBaseUrl}/api/stripe/webhook`);
    stripeSync.syncBackfill().catch((err: unknown) => logger.error({ err }, "Stripe backfill error"));
    logger.info("Stripe initialised");
  } catch (err) {
    logger.error({ err }, "Stripe init failed — continuing without billing");
  }
}

await initStripe();

// ── Background auto-refresh scheduler ─────────────────────────────────────────
// Every 6 hours, refresh up to 3 of the most stale active athletes.
// Athletes are processed sequentially with a 90s gap between them to respect
// Perplexity + OpenAI rate limits. Staleness threshold: 5 days (was 7).
//
// After each repopulation, the result-backfill pass runs to fill any competition
// results that were missing from the initial crawl.

import { backfillCompetitionResults, flushStaleCompetitionStatuses } from "./lib/result-backfill.js";

const STALE_DAYS            = 5;   // refresh athletes not crawled within N days
const MAX_PER_CYCLE         = 3;   // max athletes to refresh per 6-hour cycle
const INTER_ATHLETE_DELAY   = 90;  // seconds between athletes in the same cycle

async function runRefreshCycle() {
  try {
    // Flush any competition statuses that passed their date since the last crawl
    await flushStaleCompetitionStatuses();

    const staleCutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000);

    const staleAthletes = await db
      .select({ id: athletesTable.id, name: athletesTable.name, lastCrawledAt: athletesTable.lastCrawledAt })
      .from(athletesTable)
      .where(
        or(
          isNull(athletesTable.lastCrawledAt),
          lt(athletesTable.lastCrawledAt, staleCutoff),
        ),
      )
      .orderBy(athletesTable.lastCrawledAt)
      .limit(MAX_PER_CYCLE);

    if (staleAthletes.length === 0) {
      logger.info("Auto-refresh: no stale athletes found");
      return;
    }

    for (let i = 0; i < staleAthletes.length; i++) {
      const target = staleAthletes[i];

      // Stagger: wait between athletes (except before the first one)
      if (i > 0) {
        await new Promise((resolve) => setTimeout(resolve, INTER_ATHLETE_DELAY * 1000));
      }

      logger.info({ athleteId: target.id, name: target.name, slot: i + 1 }, "Auto-refresh: repopulating stale athlete");
      await repopulateAthlete(target.id);

      // After repopulate, backfill any competition results still missing
      try {
        const filled = await backfillCompetitionResults(target.id);
        if (filled > 0) {
          logger.info({ athleteId: target.id, filled }, "Auto-refresh: backfilled competition results");
        }
      } catch (backfillErr) {
        logger.warn({ backfillErr, athleteId: target.id }, "Auto-refresh: result backfill failed (non-fatal)");
      }

      logger.info({ athleteId: target.id, slot: i + 1 }, "Auto-refresh: athlete complete");
    }

    logger.info({ count: staleAthletes.length }, "Auto-refresh: cycle complete");
  } catch (err) {
    logger.error({ err }, "Auto-refresh cycle failed");
  }
}

// Wait 2 min after boot before first run (lets server warm up / Stripe init finish),
// then run every 6 hours.
setTimeout(() => {
  runRefreshCycle();
  setInterval(runRefreshCycle, 6 * 60 * 60 * 1000);
}, 2 * 60 * 1000);

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
// Gives in-flight requests time to finish before the process exits.
const shutdown = (signal: string) => {
  logger.info({ signal }, "Shutdown signal received — draining connections");
  server.close(() => {
    logger.info("HTTP server closed — exiting");
    process.exit(0);
  });
  // Hard-kill after 10 s if connections are still open
  setTimeout(() => {
    logger.warn("Graceful shutdown timeout — forcing exit");
    process.exit(1);
  }, 10_000).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));
