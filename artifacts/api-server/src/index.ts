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
// Every 6 hours, find the single most-stale active athlete and repopulate it.
// Staggered one-at-a-time so Perplexity + OpenAI rate limits are respected.
// Athletes crawled within the last 7 days are skipped — only genuinely stale
// profiles (or never-crawled profiles) get refreshed automatically.

async function runRefreshCycle() {
  try {
    const staleCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Pick the one athlete crawled longest ago (or never crawled) that is active
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
      .limit(1);

    if (staleAthletes.length === 0) {
      logger.info("Auto-refresh: no stale athletes found");
      return;
    }

    const target = staleAthletes[0];
    logger.info({ athleteId: target.id, name: target.name }, "Auto-refresh: repopulating stale athlete");
    await repopulateAthlete(target.id);
    logger.info({ athleteId: target.id }, "Auto-refresh: repopulation complete");
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
