/**
 * stripe-public.ts — Stripe routes that do NOT require authentication.
 *
 * These are called from public-facing pages (Pricing page) where the visitor
 * may not be signed in yet.
 *
 * GET  /api/stripe/prices           — fetch live price IDs for the pricing page
 * GET  /api/stripe/products-with-prices — full product catalogue
 * POST /api/stripe/checkout         — create a Checkout Session (starts trial)
 */

import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import { stripeStorage } from "../lib/stripeStorage.js";
import { getUncachableStripeClient } from "../lib/stripeClient.js";

const router: IRouter = Router();

// 10 checkout attempts per IP per hour — prevents Stripe session spam
const checkoutLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => String(req.ip ?? "anon").replace(/[^a-zA-Z0-9._-]/g, "_"),
  validate: false,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many checkout attempts. Please try again later." },
});

// GET /api/stripe/prices
router.get("/stripe/prices", async (_req, res): Promise<void> => {
  try {
    const stripe = await getUncachableStripeClient();
    const products = await stripe.products.list({ active: true, limit: 20 });
    const prices = await stripe.prices.list({ active: true, limit: 50, expand: ["data.product"] });

    const result: Record<string, { monthly: string | null; annual: string | null }> = {};
    for (const product of products.data) {
      const tier = (product.metadata as any)?.tier as string | undefined;
      if (!tier) continue;
      result[tier] = { monthly: null, annual: null };
    }
    for (const price of prices.data) {
      const prod = typeof price.product === "string" ? null : (price.product as any);
      if (!prod || prod.deleted) continue;
      const tier = prod.metadata?.tier as string | undefined;
      if (!tier || !result[tier]) continue;
      if (price.recurring?.interval === "month") result[tier].monthly = price.id;
      if (price.recurring?.interval === "year") result[tier].annual = price.id;
    }
    res.json({ prices: result });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load prices" });
  }
});

// GET /api/stripe/products-with-prices
router.get("/stripe/products-with-prices", async (_req, res): Promise<void> => {
  try {
    const rows = await stripeStorage.listProductsWithPrices();
    const map = new Map<string, any>();
    for (const row of rows) {
      if (!map.has(row.product_id as string)) {
        map.set(row.product_id as string, {
          id: row.product_id,
          name: row.product_name,
          description: row.product_description,
          metadata: row.product_metadata ?? {},
          prices: [],
        });
      }
      if (row.price_id) {
        map.get(row.product_id as string).prices.push({
          id: row.price_id,
          unitAmount: row.unit_amount,
          currency: row.currency,
          recurring: row.recurring,
        });
      }
    }
    res.json({ products: Array.from(map.values()) });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load products" });
  }
});

// POST /api/stripe/checkout
router.post("/stripe/checkout", checkoutLimiter, async (req, res): Promise<void> => {
  const { priceId, email, successUrl, cancelUrl, trialDays } = req.body;
  if (!priceId || !successUrl || !cancelUrl) {
    res.status(400).json({ error: "priceId, successUrl, and cancelUrl are required" });
    return;
  }
  try {
    const stripe = await getUncachableStripeClient();
    let customerId: string | undefined;
    if (email) {
      const existing = await stripeStorage.getCustomerByEmail(email);
      customerId = existing ? (existing.id as string) : (await stripe.customers.create({ email })).id;
    }
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : (email || undefined),
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      allow_promotion_codes: true,
      subscription_data: trialDays ? { trial_period_days: Number(trialDays) } : undefined,
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
    res.json({ url: session.url });
  } catch (err: any) {
    // Log full error server-side; never expose Stripe internals to the client
    console.error("[stripe/checkout] session creation failed:", err?.message);
    res.status(500).json({ error: "Unable to start checkout. Please try again or contact support." });
  }
});

export default router;
