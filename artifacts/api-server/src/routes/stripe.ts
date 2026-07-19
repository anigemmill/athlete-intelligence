/**
 * stripe.ts — Protected Stripe routes (require auth).
 *
 * Public routes (prices, checkout) live in stripe-public.ts.
 *
 * POST /api/stripe/portal       — create a Customer Portal session
 * GET  /api/stripe/subscription — fetch subscription status for a customer
 */

import { Router, type IRouter } from "express";
import { stripeStorage } from "../lib/stripeStorage.js";
import { getUncachableStripeClient } from "../lib/stripeClient.js";

const router: IRouter = Router();

// POST /api/stripe/portal
router.post("/stripe/portal", async (req, res): Promise<void> => {
  const { email, returnUrl } = req.body;
  if (!email || !returnUrl) {
    res.status(400).json({ error: "email and returnUrl are required" });
    return;
  }
  try {
    const customer = await stripeStorage.getCustomerByEmail(email);
    if (!customer) {
      res.status(404).json({ error: "No Stripe customer found for this email" });
      return;
    }
    const stripe = await getUncachableStripeClient();
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id as string,
      return_url: returnUrl,
    });
    res.json({ url: session.url });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Portal session failed" });
  }
});

// GET /api/stripe/subscription?email=...
router.get("/stripe/subscription", async (req, res): Promise<void> => {
  const { email } = req.query;
  if (!email || typeof email !== "string") {
    res.status(400).json({ error: "email query param required" });
    return;
  }
  try {
    const customer = await stripeStorage.getCustomerByEmail(email);
    if (!customer) { res.json({ subscription: null }); return; }
    const subscription = await stripeStorage.getSubscriptionByCustomer(customer.id as string);
    res.json({ subscription: subscription ?? null });
  } catch (err) {
    res.status(500).json({ error: "Failed to load subscription" });
  }
});

export default router;
