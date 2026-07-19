/**
 * seed-products.ts
 *
 * Creates the three Athlete Intelligence subscription tiers in Stripe,
 * with both monthly and annual prices. Safe to run multiple times —
 * checks for existing products and prices before creating.
 *
 * Run with:
 *   pnpm --filter @workspace/scripts run seed-products
 */

import { getUncachableStripeClient } from "./stripeClient.js";

const PLANS = [
  {
    name: "Starter",
    description: "Up to 50 athletes monitored. Ideal for small academies, emerging clubs, and single-sport federations.",
    monthlyAmount: 29900,   // $299.00/month
    annualAmount: 298800,   // $249.00/month billed annually = $2,988/year
    metadata: { tier: "starter", athlete_limit: "50", user_limit: "5" },
  },
  {
    name: "Pro",
    description: "Up to 200 athletes monitored. For national sport organisations, professional clubs, and multi-discipline agencies.",
    monthlyAmount: 79900,   // $799.00/month
    annualAmount: 799200,   // $666.00/month billed annually = $7,992/year
    metadata: { tier: "pro", athlete_limit: "200", user_limit: "15" },
  },
  {
    name: "Enterprise",
    description: "Unlimited athletes. Custom integrations, dedicated support, and SLA guarantees.",
    monthlyAmount: 0,       // Custom — handled offline
    annualAmount: 0,
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

    let productId: string;

    if (existing.data.length > 0) {
      productId = existing.data[0].id;
      console.log(`✓ Product "${plan.name}" already exists (${productId})`);
    } else {
      const product = await stripe.products.create({
        name: plan.name,
        description: plan.description,
        metadata: plan.metadata,
      });
      productId = product.id;
      console.log(`✅ Created product: ${plan.name} (${productId})`);
    }

    // Skip pricing for Enterprise
    if (plan.monthlyAmount === 0) {
      console.log(`  └─ Enterprise: contact sales for pricing\n`);
      continue;
    }

    // Check existing prices
    const prices = await stripe.prices.list({ product: productId, active: true, limit: 10 });
    const hasMonthly = prices.data.some((p) => p.recurring?.interval === "month");
    const hasAnnual = prices.data.some((p) => p.recurring?.interval === "year");

    if (hasMonthly) {
      const mp = prices.data.find((p) => p.recurring?.interval === "month")!;
      console.log(`  ✓ Monthly price already exists: $${(mp.unit_amount ?? 0) / 100}/mo (${mp.id})`);
    } else {
      const mp = await stripe.prices.create({
        product: productId,
        unit_amount: plan.monthlyAmount,
        currency: "usd",
        recurring: { interval: "month" },
        metadata: { tier: plan.metadata.tier, billing_cycle: "monthly" },
      });
      console.log(`  ✅ Created monthly price: $${plan.monthlyAmount / 100}/mo (${mp.id})`);
    }

    if (hasAnnual) {
      const ap = prices.data.find((p) => p.recurring?.interval === "year")!;
      console.log(`  ✓ Annual price already exists: $${(ap.unit_amount ?? 0) / 100}/yr (${ap.id})`);
    } else {
      const ap = await stripe.prices.create({
        product: productId,
        unit_amount: plan.annualAmount,
        currency: "usd",
        recurring: { interval: "year" },
        metadata: { tier: plan.metadata.tier, billing_cycle: "annual" },
      });
      console.log(`  ✅ Created annual price: $${plan.annualAmount / 100}/yr (${ap.id})`);
    }

    console.log();
  }

  console.log("🎉 Done! Products and prices are live in Stripe.");
}

seedProducts().catch((err) => {
  console.error("❌ Seed failed:", err.message);
  process.exit(1);
});
