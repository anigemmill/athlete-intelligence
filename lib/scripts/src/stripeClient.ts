import Stripe from "stripe";

async function getStripeCredentials(): Promise<{ secretKey: string }> {
  // Fast path: direct secret env var
  if (process.env.STRIPE_SECRET_KEY) return { secretKey: process.env.STRIPE_SECRET_KEY };

  // Fallback: Replit connector API
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (!hostname || !xReplitToken) throw new Error("Set STRIPE_SECRET_KEY in Replit Secrets.");

  const resp = await fetch(
    `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=stripe`,
    { headers: { Accept: "application/json", X_REPLIT_TOKEN: xReplitToken } },
  );
  if (!resp.ok) throw new Error(`Failed to fetch Stripe credentials: ${resp.status}`);

  const data = await resp.json();
  const secretKey = data.items?.[0]?.settings?.secret_key;
  if (!secretKey) throw new Error("Set STRIPE_SECRET_KEY in Replit Secrets.");
  return { secretKey };
}

export async function getUncachableStripeClient(): Promise<Stripe> {
  const { secretKey } = await getStripeCredentials();
  return new Stripe(secretKey);
}
