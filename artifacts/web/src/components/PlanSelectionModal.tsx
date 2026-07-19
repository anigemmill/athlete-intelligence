/**
 * PlanSelectionModal — shown to users who don't have an active subscription.
 * Non-dismissible: the only exit is starting a Stripe checkout (trial) or
 * contacting sales. Founders bypass this entirely via AppLayout.
 */

import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";

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

// Key stored in localStorage after a successful Stripe checkout redirect
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

  return (
    <div
      className={`relative flex flex-col rounded-2xl p-6 transition-all ${
        plan.highlight
          ? "bg-[#293055] border-2 border-[#E75D50] shadow-[0_8px_32px_rgba(231,93,80,0.2)]"
          : "bg-white border border-[#DCE2EF]"
      }`}
    >
      {plan.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#E75D50] text-white shadow-sm">
          {plan.badge}
        </div>
      )}

      <div className="mb-4">
        <h3 className={`text-[17px] font-bold mb-1 ${plan.highlight ? "text-white" : "text-[#1C1F3A]"}`}>
          {plan.name}
        </h3>
        <p className={`text-[12px] leading-relaxed ${plan.highlight ? "text-white/55" : "text-[#6B7080]"}`}>
          {plan.tagline}
        </p>
      </div>

      <div className="mb-5">
        <div className="flex items-baseline gap-1">
          <span className={`text-[32px] font-bold tracking-tight ${plan.highlight ? "text-white" : "text-[#1C1F3A]"}`}>
            ${displayPrice}
          </span>
          <span className={`text-[13px] ${plan.highlight ? "text-white/40" : "text-[#9097B0]"}`}>/mo</span>
        </div>
        {cycle === "annual" && (
          <p className={`text-[11px] mt-0.5 ${plan.highlight ? "text-emerald-400" : "text-emerald-600"}`}>
            Billed annually — save ~17%
          </p>
        )}
      </div>

      <ul className="space-y-2 mb-6 flex-1">
        {plan.features.map((f) => (
          <li key={f} className="flex items-center gap-2">
            <CheckCircle2
              size={14}
              className={plan.highlight ? "text-[#E75D50] shrink-0" : "text-emerald-500 shrink-0"}
            />
            <span className={`text-[12px] ${plan.highlight ? "text-white/70" : "text-[#4A5068]"}`}>{f}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={handleCheckout}
        disabled={loading || !priceId}
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
          plan.highlight
            ? "bg-[#E75D50] hover:bg-[#D04840] text-white shadow-[0_4px_14px_rgba(231,93,80,0.35)]"
            : "border border-[#293055] text-[#293055] hover:bg-[#293055] hover:text-white"
        }`}
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
        {loading
          ? "Redirecting…"
          : !priceId && prices !== null
          ? "Coming soon"
          : "Start 3-day free trial"}
      </button>

      {error && (
        <p className="text-[11px] text-red-500 text-center mt-2">{error}</p>
      )}
    </div>
  );
}

export default function PlanSelectionModal({ userEmail }: { userEmail: string | null }) {
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const [prices, setPrices] = useState<PriceMap | null>(null);
  const [priceError, setPriceError] = useState(false);

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

  useEffect(() => {
    loadPrices();
  }, []);

  return (
    /* Backdrop — pointer-events on backdrop are disabled so clicking outside does nothing */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onMouseDown={(e) => e.preventDefault()}
    >
      <div
        className="relative w-full max-w-2xl bg-[#FCFAFA] rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.35)] overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header — no X button */}
        <div className="px-8 pt-8 pb-6 border-b border-[#DCE2EF]">
          <h2 id="plan-modal-title" className="text-[22px] font-bold text-[#1C1F3A] tracking-tight">
            Choose your plan to continue
          </h2>
          <p className="text-[14px] text-[#6B7080] mt-1">
            Start with a{" "}
            <span className="font-semibold text-[#293055]">3-day free trial</span> — no charge
            until it ends. Cancel any time before the trial ends.
          </p>

          {/* Billing cycle toggle */}
          <div className="flex items-center gap-1 mt-5 self-start w-fit bg-[#F0F2F8] rounded-lg p-1">
            {(["monthly", "annual"] as Cycle[]).map((c) => (
              <button
                key={c}
                onClick={() => setCycle(c)}
                className={`px-4 py-1.5 rounded-md text-[13px] font-medium transition-all ${
                  cycle === c
                    ? "bg-white text-[#1C1F3A] shadow-sm"
                    : "text-[#6B7080] hover:text-[#1C1F3A]"
                }`}
              >
                {c === "monthly" ? "Monthly" : "Annual"}
                {c === "annual" && (
                  <span className="ml-1.5 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
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
              <p className="text-[14px] text-[#6B7080]">
                Couldn't load pricing. Check your connection and try again.
              </p>
              <button
                onClick={loadPrices}
                className="px-4 py-2 rounded-lg text-[13px] font-semibold bg-[#E75D50] text-white hover:bg-[#D04840] transition-colors"
              >
                Retry
              </button>
            </div>
          ) : (
            PLANS.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                cycle={cycle}
                prices={prices}
                userEmail={userEmail}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-8 pb-7 space-y-3">
          {/* Enterprise */}
          <div className="flex items-center justify-between rounded-xl border border-[#DCE2EF] px-5 py-3.5 bg-white">
            <div>
              <span className="text-[14px] font-semibold text-[#1C1F3A]">Enterprise</span>
              <span className="text-[12px] text-[#9097B0] ml-2">
                — Unlimited athletes, SSO, API access, dedicated CSM
              </span>
            </div>
            <Link href="/contact">
              <span className="text-[13px] font-semibold text-[#E75D50] hover:text-[#D04840] transition-colors cursor-pointer whitespace-nowrap">
                Contact sales →
              </span>
            </Link>
          </div>

          {/* Legal */}
          <p className="text-[11px] text-[#9097B0] text-center leading-relaxed px-4">
            By starting a trial you agree to our{" "}
            <Link href="/terms">
              <span className="underline text-[#6B7080] hover:text-[#1C1F3A] cursor-pointer transition-colors">
                Terms of Service
              </span>
            </Link>{" "}
            and{" "}
            <Link href="/security">
              <span className="underline text-[#6B7080] hover:text-[#1C1F3A] cursor-pointer transition-colors">
                Privacy Policy
              </span>
            </Link>
            . After the 3-day free trial your payment method will be charged at the rate shown
            above. You can cancel any time before the trial ends.
          </p>
        </div>
      </div>
    </div>
  );
}
