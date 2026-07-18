/**
 * seed-products.ts
 *
 * Creates the three Athlete Intelligence subscription tiers in Stripe.
 * Safe to run multiple times — checks for existing products first.
 *
 * Run with:
 *   pnpm --filter @workspace/scripts run seed-products
 */

import { getUncachableStripeClient } from "./stripeClient.js";

const PLANS = [
  {
    name: "Starter",
    description: "Up to 20 athletes monitored. Ideal for small academies and emerging clubs.",
    monthlyAmount: 29900, // $299.00
    metadata: { tier: "starter", athlete_limit: "20", user_limit: "5" },
  },
  {
    name: "Pro",
    description: "Up to 100 athletes monitored. For national sport organisations and professional clubs.",
    monthlyAmount: 79900, // $799.00
    metadata: { tier: "pro", athlete_limit: "100", user_limit: "20" },
  },
  {
    name: "Enterprise",
    description: "Unlimited athletes. Custom integrations, dedicated support, and SLA guarantees.",
    monthlyAmount: 0, // Custom — handled offline
    metadata: { tier: "enterprise", athlete_limit: "unlimited", user_limit: "unlimited" },
  },
];

async function seedProducts() {
  const stripe = await getUncachableStripeClient();
  console.log("🔌 Connected to Stripe\n");

  for (const plan of PLANS) {
    // Check if product already exists
    const existing = await stripe.products.search({
      query: `name:'${plan.name}' AND active:'true'`,
    });

    if (existing.data.length > 0) {
      const prod = existing.data[0];
      console.log(`✓ ${plan.name} already exists (${prod.id})`);

      // Check if price exists
      const prices = await stripe.prices.list({ product: prod.id, active: true });
      if (prices.data.length > 0) {
        console.log(`  └─ Price: $${(prices.data[0].unit_amount ?? 0) / 100}/mo (${prices.data[0].id})\n`);
      }
      continue;
    }

    // Create product
    const product = await stripe.products.create({
      name: plan.name,
      description: plan.description,
      metadata: plan.metadata,
    });
    console.log(`✅ Created product: ${product.name} (${product.id})`);

    // Create monthly price (skip Enterprise — priced offline)
    if (plan.monthlyAmount > 0) {
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.monthlyAmount,
        currency: "usd",
        recurring: { interval: "month" },
        metadata: { tier: plan.metadata.tier },
      });
      console.log(`  └─ Price: $${plan.monthlyAmount / 100}/mo (${price.id})\n`);
    } else {
      console.log(`  └─ Enterprise: contact sales for pricing\n`);
    }
  }

  console.log("🎉 Done! Webhooks will sync products to your database automatically.");
}

seedProducts().catch((err) => {
  console.error("❌ Seed failed:", err.message);
  process.exit(1);
});
