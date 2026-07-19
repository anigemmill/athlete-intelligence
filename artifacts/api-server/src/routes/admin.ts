/**
 * admin.ts — Founder-only admin endpoints
 *
 * All routes require the caller's Clerk email to be the founder email.
 * Enforced via the requireAdmin middleware below.
 *
 * GET /api/admin/customers   — Clerk users joined with Stripe subscriptions
 * GET /api/admin/enquiries   — Contact form submissions
 * PUT /api/admin/enquiries/:id — Update enquiry status
 */

import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { desc, eq, isNull } from "drizzle-orm";
import { db } from "@workspace/db";
import { contactEnquiriesTable, athletesTable } from "@workspace/db";
import { clerkClient } from "@clerk/express";
import { getUncachableStripeClient } from "../lib/stripeClient.js";
import { logger } from "../lib/logger.js";
import { fetchWikipediaPhoto } from "../lib/photo-lookup.js";

const router: IRouter = Router();

const FOUNDER_EMAIL = "anigemmill@theoutsidein.nz";

// ── Admin gate middleware ─────────────────────────────────────────────────────

async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const auth = (req as any).auth;
    if (!auth?.userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const user = await clerkClient.users.getUser(auth.userId);
    const primaryEmail = user.emailAddresses.find(
      (e) => e.id === user.primaryEmailAddressId,
    )?.emailAddress;

    if (primaryEmail?.toLowerCase() !== FOUNDER_EMAIL) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    next();
  } catch (err) {
    logger.error({ err }, "Admin auth check failed");
    res.status(403).json({ error: "Forbidden" });
  }
}

// ── GET /api/admin/customers ──────────────────────────────────────────────────

router.get("/admin/customers", requireAdmin, async (_req, res): Promise<void> => {
  try {
    // Fetch all Clerk users (up to 200)
    const clerkUsers = await clerkClient.users.getUserList({ limit: 200, orderBy: "-created_at" });

    // Fetch Stripe customers and their active subscriptions
    const stripe = await getUncachableStripeClient();
    const stripeCustomers = await stripe.customers.list({ limit: 200, expand: ["data.subscriptions"] });

    // Build email → stripe map
    const stripeByEmail = new Map<string, { plan: string; status: string; mrr: number; trialEnd: number | null }>();
    for (const customer of stripeCustomers.data) {
      const email = customer.email?.toLowerCase();
      if (!email) continue;
      const sub = (customer as any).subscriptions?.data?.[0];
      if (!sub) {
        stripeByEmail.set(email, { plan: "None", status: "none", mrr: 0, trialEnd: null });
        continue;
      }
      const price = sub.items?.data?.[0]?.price;
      const amount = price?.unit_amount ?? 0;
      const interval = price?.recurring?.interval ?? "month";
      const mrr = interval === "year" ? Math.round(amount / 12) : amount;
      const tier = price?.metadata?.tier ?? "unknown";
      const planName = tier === "starter" ? "Starter" : tier === "pro" ? "Pro" : tier === "enterprise" ? "Enterprise" : "Unknown";
      stripeByEmail.set(email, {
        plan: planName,
        status: sub.status,                   // active | trialing | canceled | etc.
        mrr: Math.round(mrr / 100),           // in dollars
        trialEnd: sub.trial_end ?? null,      // unix timestamp
      });
    }

    // Merge
    const customers = clerkUsers.data.map((u) => {
      const email = u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId)?.emailAddress ?? "";
      const stripe = stripeByEmail.get(email.toLowerCase()) ?? { plan: "None", status: "none", mrr: 0, trialEnd: null };
      return {
        id: u.id,
        name: [u.firstName, u.lastName].filter(Boolean).join(" ") || "—",
        email,
        plan: stripe.plan,
        subscriptionStatus: stripe.status,
        mrr: stripe.mrr,
        trialEnd: stripe.trialEnd,
        signedUpAt: new Date(u.createdAt).toISOString(),
        lastActiveAt: u.lastActiveAt ? new Date(u.lastActiveAt).toISOString() : null,
        imageUrl: u.imageUrl,
      };
    });

    res.json({ customers });
  } catch (err: any) {
    logger.error({ err }, "Failed to load admin customers");
    res.status(500).json({ error: "Failed to load customers" });
  }
});

// ── GET /api/admin/enquiries ──────────────────────────────────────────────────

router.get("/admin/enquiries", requireAdmin, async (_req, res): Promise<void> => {
  try {
    const rows = await db
      .select()
      .from(contactEnquiriesTable)
      .orderBy(desc(contactEnquiriesTable.createdAt));
    res.json({ enquiries: rows });
  } catch (err: any) {
    logger.error({ err }, "Failed to load enquiries");
    res.status(500).json({ error: "Failed to load enquiries" });
  }
});

// ── PUT /api/admin/enquiries/:id ──────────────────────────────────────────────

router.put("/admin/enquiries/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { status } = req.body ?? {};
  if (!id || !status) { res.status(400).json({ error: "id and status required" }); return; }

  try {
    await db
      .update(contactEnquiriesTable)
      .set({ status })
      .where(eq(contactEnquiriesTable.id, id));
    res.json({ ok: true });
  } catch (err: any) {
    logger.error({ err }, "Failed to update enquiry");
    res.status(500).json({ error: "Failed to update enquiry" });
  }
});

// ── POST /api/admin/backfill-photos ──────────────────────────────────────────
// Runs Wikipedia photo lookup on all athletes missing an avatar URL.
// Safe to run multiple times — skips athletes that already have a photo.

router.post("/admin/backfill-photos", requireAdmin, async (_req, res): Promise<void> => {
  try {
    const athletes = await db
      .select({ id: athletesTable.id, name: athletesTable.name, sport: athletesTable.sport })
      .from(athletesTable)
      .where(isNull(athletesTable.avatarUrl));

    let found = 0;
    let skipped = 0;

    for (const athlete of athletes) {
      const url = await fetchWikipediaPhoto(athlete.name, athlete.sport ?? undefined);
      if (url) {
        await db
          .update(athletesTable)
          .set({ avatarUrl: url })
          .where(eq(athletesTable.id, athlete.id));
        found++;
        logger.info({ athleteId: athlete.id, name: athlete.name, url }, "backfill-photos: saved photo");
      } else {
        skipped++;
        logger.info({ athleteId: athlete.id, name: athlete.name }, "backfill-photos: no photo found");
      }
      // Small delay to avoid hammering Wikipedia's API
      await new Promise((r) => setTimeout(r, 300));
    }

    res.json({ ok: true, total: athletes.length, found, skipped });
  } catch (err: any) {
    logger.error({ err }, "backfill-photos: failed");
    res.status(500).json({ error: "Backfill failed" });
  }
});

export default router;
