/**
 * stripe.ts — Protected Stripe routes (require auth).
 *
 * SECURITY: Both routes derive the customer email from the authenticated
 * Clerk session — never from the request body or query params — so a
 * user cannot access another user's billing data.
 *
 * POST /api/stripe/portal       — create a Customer Portal session
 * GET  /api/stripe/subscription — fetch subscription status for the caller
 */

import { Router, type IRouter } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import { stripeStorage } from "../lib/stripeStorage.js";
import { getUncachableStripeClient } from "../lib/stripeClient.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

/** Resolve the primary email address for the authenticated user. */
async function getCallerEmail(req: any): Promise<string | null> {
  const auth = getAuth(req);
  const userId = auth?.userId ?? req.userId;
  if (!userId) return null;
  const user = await clerkClient.users.getUser(userId);
  const primary = user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId);
  return primary?.emailAddress ?? null;
}

// POST /api/stripe/portal
router.post("/stripe/portal", async (req, res): Promise<void> => {
  const { returnUrl } = req.body;
  if (!returnUrl) {
    res.status(400).json({ error: "returnUrl is required" });
    return;
  }

  let email: string | null;
  try {
    email = await getCallerEmail(req);
  } catch (err) {
    logger.error({ err }, "Failed to resolve caller email for portal");
    res.status(500).json({ error: "Could not determine authenticated user" });
    return;
  }

  if (!email) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const customer = await stripeStorage.getCustomerByEmail(email);
    if (!customer) {
      res.status(404).json({ error: "No Stripe customer found for your account" });
      return;
    }
    const stripe = await getUncachableStripeClient();
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id as string,
      return_url: returnUrl,
    });
    res.json({ url: session.url });
  } catch (err) {
    logger.error({ err }, "Portal session creation failed");
    res.status(500).json({ error: "Portal session failed" });
  }
});

// GET /api/stripe/subscription
router.get("/stripe/subscription", async (req, res): Promise<void> => {
  let email: string | null;
  try {
    email = await getCallerEmail(req);
  } catch (err) {
    logger.error({ err }, "Failed to resolve caller email for subscription");
    res.status(500).json({ error: "Could not determine authenticated user" });
    return;
  }

  if (!email) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const customer = await stripeStorage.getCustomerByEmail(email);
    if (!customer) {
      res.json({ subscription: null });
      return;
    }
    const subscription = await stripeStorage.getSubscriptionByCustomer(customer.id as string);
    res.json({ subscription: subscription ?? null });
  } catch (err) {
    logger.error({ err }, "Failed to load subscription");
    res.status(500).json({ error: "Failed to load subscription" });
  }
});

export default router;
