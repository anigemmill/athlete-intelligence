/**
 * PlanSelectionModal — shown to users who don't have an active subscription.
 * Non-dismissible: the only exit is starting a Stripe checkout (trial) or
 * contacting sales. Founders bypass this entirely via AppLayout.
 */

import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { useClerk } from "@clerk/react";

type Cycle = "monthly" | "annual";
type PriceMap = Record<string, { monthly: string | null; annual: string | null }>;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    tagline: "A single federation, academy, or agency — up to 50 athletes.",
    monthly: 299,
    annual: 249,
    highlight: false,
    features: [
      "50 athletes monitored",
      "5 team seats",
      "Intelligence feed & alerts",
      "Athlete dossiers",
      "All sports & countries",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    badge: "Most popular",
    tagline: "Professional organisations with broader rosters and analyst teams.",
    monthly: 799,
    annual: 666,
    highlight: true,
    features: [
      "200 athletes monitored",
      "15 team seats",
      "Everything in Starter",
      "AI Chat & saved reports",
      "PDF / CSV exports",
      "Comparison tool",
    ],
  },
];

export const PLAN_SELECTED_KEY = "ai_plan_selected";

function PlanCard({
  plan,
  cycle,
  prices,
  userEmail,
}: {
  plan: (typeof PLANS)[0];
  cycle: Cycle;
  prices: PriceMap | null;
  userEmail: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const priceId = prices?.[plan.id]?.[cycle] ?? null;
  const displayPrice = cycle === "monthly" ? plan.monthly : plan.annual;

  const handleCheckout = async () => {
    if (!priceId) return;
    setLoading(true);
    setError(null);
    try {
      const origin = window.location.origin;
      const resp = await fetch(`${basePath}/api/stripe/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId,
          email: userEmail ?? undefined,
          trialDays: 3,
          successUrl: `${origin}${basePath}/billing/success`,
          cancelUrl: `${origin}${basePath}/dashboard`,
        }),
      });
      const data = await resp.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? "Could not start checkout. Try again.");
        setLoading(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const cardStyle: React.CSSProperties = plan.highlight
    ? { background: "rgba(185,255,74,0.07)", border: "2px solid rgba(185,255,74,0.35)", borderRadius: 16, boxShadow: "0 8px 32px rgba(185,255,74,0.10)" }
    : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 16 };

  return (
    <div className="relative flex flex-col p-6 transition-all" style={cardStyle}>
      {plan.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-semibold shadow-sm"
          style={{ background: "#B9FF4A", color: "#0D1C0B" }}>
          {plan.badge}
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-[17px] font-bold mb-1 text-white">{plan.name}</h3>
        <p className="text-[12px] leading-relaxed" style={{ color: "rgba(255,255,255,0.50)" }}>{plan.tagline}</p>
      </div>

      <div className="mb-5">
        <div className="flex items-baseline gap-1">
          <span className="text-[32px] font-bold tracking-tight text-white">${displayPrice}</span>
          <span className="text-[13px]" style={{ color: "rgba(255,255,255,0.35)" }}>/mo</span>
        </div>
        {cycle === "annual" && (
          <p className="text-[11px] mt-0.5" style={{ color: "#4ade80" }}>Billed annually — save ~17%</p>
        )}
      </div>

      <ul className="space-y-2 mb-6 flex-1">
        {plan.features.map((f) => (
          <li key={f} className="flex items-center gap-2">
            <CheckCircle2 size={14} style={{ color: plan.highlight ? "#B9FF4A" : "#4ade80" }} className="shrink-0" />
            <span className="text-[12px]" style={{ color: "rgba(255,255,255,0.70)" }}>{f}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={handleCheckout}
        disabled={loading || !priceId}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        style={plan.highlight
          ? { background: "#B9FF4A", color: "#0D1C0B", boxShadow: "0 4px 14px rgba(185,255,74,0.25)" }
          : { border: "1px solid rgba(255,255,255,0.15)", color: "white", background: "rgba(255,255,255,0.06)" }
        }
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
        {loading ? "Redirecting…" : !priceId && prices !== null ? "Coming soon" : "Start 3-day free trial"}
      </button>

      {error && (
        <p className="text-[11px] text-center mt-2" style={{ color: "#f87171" }}>{error}</p>
      )}
    </div>
  );
}

export default function PlanSelectionModal({ userEmail }: { userEmail: string | null }) {
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const [prices, setPrices] = useState<PriceMap | null>(null);
  const [priceError, setPriceError] = useState(false);
  const { signOut } = useClerk();

  const loadPrices = () => {
    setPriceError(false);
    fetch(`${basePath}/api/stripe/prices`)
      .then((r) => r.json())
      .then((d) => {
        if (d.prices) setPrices(d.prices);
        else setPriceError(true);
      })
      .catch(() => setPriceError(true));
  };

  useEffect(() => { loadPrices(); }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.60)]"
        style={{ background: "#0D1C0B", border: "1px solid rgba(255,255,255,0.10)" }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 pt-8 pb-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.09)" }}>
          <h2 id="plan-modal-title" className="text-[22px] font-bold text-white tracking-tight">
            Choose your plan to continue
          </h2>
          <p className="text-[14px] mt-1" style={{ color: "rgba(255,255,255,0.55)" }}>
            Start with a{" "}
            <span className="font-semibold" style={{ color: "#B9FF4A" }}>3-day free trial</span>
            {" "}— no charge until it ends. Cancel any time before the trial ends.
          </p>

          {/* Billing cycle toggle */}
          <div className="flex items-center gap-1 mt-5 self-start w-fit rounded-lg p-1"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}>
            {(["monthly", "annual"] as Cycle[]).map((c) => (
              <button
                key={c}
                onClick={() => setCycle(c)}
                className="px-4 py-1.5 rounded-md text-[13px] font-medium transition-all"
                style={{
                  background: cycle === c ? "rgba(255,255,255,0.10)" : "transparent",
                  color: cycle === c ? "white" : "rgba(255,255,255,0.45)",
                  boxShadow: cycle === c ? "0 1px 3px rgba(0,0,0,0.30)" : "none",
                }}
              >
                {c === "monthly" ? "Monthly" : "Annual"}
                {c === "annual" && (
                  <span className="ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{ background: "rgba(74,222,128,0.15)", color: "#4ade80" }}>
                    Save 17%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Plan cards */}
        <div className="px-8 py-6 grid grid-cols-2 gap-4">
          {priceError ? (
            <div className="col-span-2 flex flex-col items-center justify-center py-10 gap-3 text-center">
              <p className="text-[14px]" style={{ color: "rgba(255,255,255,0.55)" }}>
                Couldn't load pricing. Check your connection and try again.
              </p>
              <button onClick={loadPrices}
                className="px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors"
                style={{ background: "#B9FF4A", color: "#0D1C0B" }}>
                Retry
              </button>
            </div>
          ) : (
            PLANS.map((plan) => (
              <PlanCard key={plan.id} plan={plan} cycle={cycle} prices={prices} userEmail={userEmail} />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-8 pb-7 space-y-3">
          {/* Enterprise */}
          <div className="flex items-center justify-between rounded-xl px-5 py-3.5"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }}>
            <div>
              <span className="text-[14px] font-semibold text-white">Enterprise</span>
              <span className="text-[12px] ml-2" style={{ color: "rgba(255,255,255,0.40)" }}>
                — Unlimited athletes, SSO, API access, dedicated CSM
              </span>
            </div>
            <Link href="/contact">
              <span className="text-[13px] font-semibold transition-colors cursor-pointer whitespace-nowrap" style={{ color: "#B9FF4A" }}>
                Contact sales →
              </span>
            </Link>
          </div>

          {/* Legal */}
          <p className="text-[11px] text-center leading-relaxed px-4" style={{ color: "rgba(255,255,255,0.30)" }}>
            By starting a trial you agree to our{" "}
            <Link href="/terms">
              <span className="underline cursor-pointer transition-colors hover:text-white" style={{ color: "rgba(255,255,255,0.45)" }}>
                Terms of Service
              </span>
            </Link>{" "}
            and{" "}
            <Link href="/security">
              <span className="underline cursor-pointer transition-colors hover:text-white" style={{ color: "rgba(255,255,255,0.45)" }}>
                Privacy Policy
              </span>
            </Link>
            . After the 3-day free trial your payment method will be charged at the rate shown above. You can cancel any time before the trial ends.
          </p>

          {/* Escape hatch */}
          <div className="pt-1 pb-2 text-center">
            <button
              onClick={() => signOut({ redirectUrl: `${basePath}/sign-in` })}
              className="text-[11px] transition-colors underline underline-offset-2"
              style={{ color: "rgba(255,255,255,0.25)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}
            >
              Wrong account? Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
