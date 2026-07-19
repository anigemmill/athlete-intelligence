import { Router, type IRouter } from "express";
import { stripeStorage } from "../lib/stripeStorage.js";
import { getUncachableStripeClient } from "../lib/stripeClient.js";

const router: IRouter = Router();

// GET /api/stripe/prices — fetch live prices directly from Stripe API
// Used by PricingPage to get real priceIds without depending on webhook sync.
router.get("/stripe/prices", async (_req, res): Promise<void> => {
  try {
    const stripe = await getUncachableStripeClient();

    // Fetch all active products
    const products = await stripe.products.list({ active: true, limit: 20 });
    // Fetch all active prices
    const prices = await stripe.prices.list({ active: true, limit: 50, expand: ["data.product"] });

    const result: Record<string, { monthly: string | null; annual: string | null }> = {};

    for (const product of products.data) {
      const tier = (product.metadata as any)?.tier as string | undefined;
      if (!tier) continue;
      result[tier] = { monthly: null, annual: null };
    }

    for (const price of prices.data) {
      const prod = typeof price.product === "string" ? null : price.product as any;
      if (!prod || prod.deleted) continue;
      const tier = prod.metadata?.tier as string | undefined;
      if (!tier || !result[tier]) continue;
      if (price.recurring?.interval === "month") result[tier].monthly = price.id;
      if (price.recurring?.interval === "year") result[tier].annual = price.id;
    }

    res.json({ prices: result });
  } catch (err: any) {
    console.error("[stripe] prices error:", err);
    res.status(500).json({ error: err.message ?? "Failed to load prices" });
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
  } catch (err) {
    console.error("[stripe] products error:", err);
    res.status(500).json({ error: "Failed to load products" });
  }
});

// POST /api/stripe/checkout — create a Stripe Checkout session
router.post("/stripe/checkout", async (req, res): Promise<void> => {
  const { priceId, email, successUrl, cancelUrl } = req.body;
  if (!priceId || !successUrl || !cancelUrl) {
    res.status(400).json({ error: "priceId, successUrl, and cancelUrl are required" });
    return;
  }

  try {
    const stripe = await getUncachableStripeClient();

    // Find or create customer
    let customerId: string | undefined;
    if (email) {
      const existing = await stripeStorage.getCustomerByEmail(email);
      if (existing) {
        customerId = existing.id as string;
      } else {
        const customer = await stripe.customers.create({ email });
        customerId = customer.id;
      }
    }

    const { trialDays } = req.body;

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
    console.error("[stripe] checkout error:", err);
    res.status(500).json({ error: err.message ?? "Checkout failed" });
  }
});

// POST /api/stripe/portal — create a customer portal session
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
    console.error("[stripe] portal error:", err);
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
    if (!customer) {
      res.json({ subscription: null });
      return;
    }
    const subscription = await stripeStorage.getSubscriptionByCustomer(customer.id as string);
    res.json({ subscription: subscription ?? null });
  } catch (err) {
    console.error("[stripe] subscription error:", err);
    res.status(500).json({ error: "Failed to load subscription" });
  }
});

export default router;
