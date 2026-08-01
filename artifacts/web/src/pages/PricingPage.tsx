import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Helmet } from "react-helmet-async";
import { CheckCircle2, Minus, Loader2 } from "lucide-react";
import { useAuthFetch } from "@/lib/useAuthFetch";

type Cycle = "monthly" | "annual";
type PriceMap = Record<string, { monthly: string | null; annual: string | null }>;

const TIERS = [
  {
    id: "starter",
    name: "Starter",
    tagline: "For a single federation, academy, or agency monitoring a focused roster.",
    monthly: 299,
    annual: 249,
    athletes: 50,
    users: 5,
    highlight: false,
    cta: "Start free trial",
    enterprise: false,
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "For professional organisations with broader rosters and analyst teams.",
    monthly: 799,
    annual: 666,
    athletes: 200,
    users: 15,
    highlight: true,
    badge: "Most popular",
    cta: "Start free trial",
    enterprise: false,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "For major organisations, multi-sport bodies, and national institutes.",
    monthly: null,
    annual: null,
    athletes: -1,
    users: -1,
    highlight: false,
    cta: "Contact sales",
    enterprise: true,
  },
];

type FeatureRow = { label: string; starter: boolean | string; pro: boolean | string; enterprise: boolean | string; section?: string };

const FEATURES: FeatureRow[] = [
  { label: "Athletes monitored", starter: "50", pro: "200", enterprise: "Unlimited", section: "Athletes & Coverage" },
  { label: "Team seats", starter: "5", pro: "15", enterprise: "Unlimited" },
  { label: "Bulk spreadsheet import", starter: true, pro: true, enterprise: true },
  { label: "All sports & disciplines", starter: true, pro: true, enterprise: true },
  { label: "Global coverage (200+ countries)", starter: true, pro: true, enterprise: true },
  { label: "Intelligence Feed", starter: true, pro: true, enterprise: true, section: "Intelligence" },
  { label: "Real-time alerts", starter: true, pro: true, enterprise: true },
  { label: "Results & rankings monitoring", starter: true, pro: true, enterprise: true },
  { label: "Media & social monitoring", starter: true, pro: true, enterprise: true },
  { label: "Sponsorship & commercial tracking", starter: true, pro: true, enterprise: true },
  { label: "Career change detection", starter: true, pro: true, enterprise: true },
  { label: "Source attribution & confidence scores", starter: true, pro: true, enterprise: true },
  { label: "Athlete dossier", starter: true, pro: true, enterprise: true, section: "Analytics & Reports" },
  { label: "Competition schedule", starter: true, pro: true, enterprise: true },
  { label: "Timeline & career history", starter: true, pro: true, enterprise: true },
  { label: "Comparison tool", starter: false, pro: true, enterprise: true },
  { label: "Saved reports", starter: false, pro: true, enterprise: true },
  { label: "PDF / CSV exports", starter: false, pro: true, enterprise: true },
  { label: "AI Chat (natural language queries)", starter: false, pro: true, enterprise: true, section: "AI Features" },
  { label: "Saved searches", starter: false, pro: true, enterprise: true },
  { label: "Intelligence Centre (proactive insights)", starter: false, pro: true, enterprise: true },
  { label: "Custom alert rules", starter: false, pro: true, enterprise: true },
  { label: "Watchlists & collections", starter: false, pro: true, enterprise: true },
  { label: "Slack / Teams integration", starter: false, pro: false, enterprise: true, section: "Integrations & Security" },
  { label: "CRM integration", starter: false, pro: false, enterprise: true },
  { label: "REST API access", starter: false, pro: false, enterprise: true },
  { label: "SSO / SAML", starter: false, pro: false, enterprise: true },
  { label: "Role-based access control", starter: false, pro: true, enterprise: true },
  { label: "Dedicated customer success manager", starter: false, pro: false, enterprise: true, section: "Support" },
  { label: "SLA (99.9% uptime)", starter: false, pro: false, enterprise: true },
  { label: "Priority support", starter: false, pro: true, enterprise: true },
  { label: "Email support", starter: true, pro: true, enterprise: true },
  { label: "Custom onboarding", starter: false, pro: false, enterprise: true },
];

const FAQ = [
  { q: "How does the free trial work?", a: "You get 3 days free — no charge until the trial ends. We'll set up your account with athletes from your actual roster so the first thing you see is real intelligence, not sample data. Cancel any time before the trial ends and you won't be charged." },
  { q: "Can I change plans later?", a: "Yes. You can upgrade at any time — changes are immediate and pro-rated to your billing cycle. Downgrades take effect at the end of your current period. No lock-in." },
  { q: "What counts as an 'athlete'?", a: "An athlete is any individual added to your monitoring roster. Athletes you've archived no longer count against your limit, so you can rotate your roster as your focus changes." },
  { q: "Is there a setup fee or onboarding cost?", a: "No setup fees on Starter or Pro. Enterprise contracts can include structured onboarding and bulk roster import — this is scoped during the sales conversation at no extra cost." },
  { q: "Do you offer discounted pricing for academies or non-profits?", a: "Yes. National academies, university programmes, and registered non-profit sporting bodies can apply for adjusted pricing. Get in touch and we'll discuss what makes sense." },
  { q: "How is my data handled and secured?", a: "All data is encrypted in transit (TLS 1.3) and at rest (AES-256). We only ingest publicly available information about athletes — no private data, no data broker purchases. See our Security & Trust page for the full picture." },
];

function Cell({ value }: { value: boolean | string }) {
  if (value === true) return <CheckCircle2 size={16} className="text-[#B9FF4A] mx-auto" />;
  if (value === false) return <Minus size={14} className="text-white/15 mx-auto" />;
  return <span className="text-[13px] text-white/70 font-medium">{value}</span>;
}

function CheckoutButton({ tierId, cycle, prices, highlight, cta }: { tierId: string; cycle: Cycle; prices: PriceMap | null; highlight: boolean; cta: string }) {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const authFetch = useAuthFetch();

  const priceId = prices?.[tierId]?.[cycle === "monthly" ? "monthly" : "annual"] ?? null;

  const handleClick = async () => {
    if (!priceId) return;
    setLoading(true);
    setError(null);
    try {
      const origin = window.location.origin;
      const resp = await authFetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, trialDays: 3, successUrl: `${origin}/billing/success`, cancelUrl: `${origin}/pricing` }),
      });
      const data = await resp.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? "Could not start checkout");
        setLoading(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const baseClass = "w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-black transition-all";
  const activeClass = highlight
    ? "bg-[#B9FF4A] hover:bg-[#CBFF6A] text-[#0D1C0B] shadow-[0_4px_16px_rgba(185,255,74,0.35)]"
    : "border border-white/15 text-white/70 hover:text-white hover:border-white/30 hover:bg-white/5";
  const disabledClass = "opacity-60 cursor-not-allowed";

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading || !priceId}
        className={`${baseClass} ${priceId ? activeClass : disabledClass} ${loading ? "opacity-70" : ""}`}
      >
        {loading ? <Loader2 size={15} className="animate-spin" /> : null}
        {loading ? "Redirecting…" : !priceId && prices !== null ? "Coming soon" : cta}
      </button>
      {error && <p className="text-[11px] text-red-400 text-center mt-2">{error}</p>}
    </div>
  );
}

function Asterisk({ size = 14, color = "#B9FF4A", className = "" }: { size?: number; color?: string; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93 4.93 19.07" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export default function PricingPage() {
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [prices, setPrices] = useState<PriceMap | null>(null);

  useEffect(() => {
    fetch("/api/stripe/prices")
      .then((r) => r.json())
      .then((d) => setPrices(d.prices ?? null))
      .catch(() => setPrices(null));
  }, []);

  return (
    <>
      <Helmet>
        <title>Pricing — Athlete Intelligence</title>
        <meta name="description" content="Simple, transparent pricing for national federations, professional clubs, academies, and agencies. Start with a 3-day free trial — no card required until it ends." />
        <meta property="og:title" content="Pricing — Athlete Intelligence" />
        <meta property="og:description" content="Simple pricing for federations, clubs, academies, and agencies. Starter from $249/month. Start with a 3-day free trial." />
        <meta property="og:image" content="https://athleteintelligence.ai/og-image.png" />
        <meta property="og:url" content="https://athleteintelligence.ai/pricing" />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://athleteintelligence.ai/pricing" />
      </Helmet>
      <PublicLayout>

        {/* Hero */}
        <section className="bg-[#0D1C0B] pt-24 pb-16 text-center relative overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: "linear-gradient(rgba(185,255,74,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(185,255,74,0.02) 1px, transparent 1px)",
              backgroundSize: "72px 72px",
            }}
          />
          <div className="absolute top-16 right-20 opacity-10"><Asterisk size={64} color="#B9FF4A" /></div>
          <div className="relative max-w-6xl mx-auto px-6">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Asterisk size={14} color="#B9FF4A" />
              <span className="text-[11px] font-bold text-[#B9FF4A] uppercase tracking-widest">Pricing</span>
            </div>
            <h1 className="text-5xl font-black text-white tracking-tight mb-4">Simple, transparent pricing.</h1>
            <p className="text-white/70 text-lg mb-3 max-w-xl mx-auto">Three tiers. No hidden fees. No long-term lock-in. 3-day free trial on all plans.</p>
            <p className="text-white/40 text-[13px] mb-10">No credit card required to start your trial.</p>

            {/* Billing toggle */}
            <div className="inline-flex items-center gap-1 bg-white/[0.04] border border-white/[0.09] rounded-xl p-1">
              <button
                onClick={() => setCycle("monthly")}
                className={`px-5 py-2 rounded-lg text-[13px] font-medium transition-all ${cycle === "monthly" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setCycle("annual")}
                className={`px-5 py-2 rounded-lg text-[13px] font-medium transition-all flex items-center gap-2 ${cycle === "annual" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"}`}
              >
                Annual
                <span className="px-1.5 py-0.5 rounded-full bg-[#B9FF4A]/15 text-[#B9FF4A] text-[10px] font-semibold">Save 17%</span>
              </button>
            </div>
          </div>
        </section>

        {/* Tier cards */}
        <section className="bg-[#0D1C0B] pb-20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid md:grid-cols-3 gap-5">
              {TIERS.map((tier) => (
                <div
                  key={tier.id}
                  className={`relative rounded-2xl p-7 border ${
                    tier.highlight
                      ? "bg-[#B9FF4A]/[0.06] border-[#B9FF4A]/30 shadow-[0_0_60px_rgba(185,255,74,0.07)]"
                      : "bg-white/[0.04] border-white/[0.07]"
                  }`}
                >
                  {tier.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#B9FF4A] text-[#0D1C0B] text-[11px] font-black shadow-[0_2px_12px_rgba(185,255,74,0.4)]">
                      {tier.badge}
                    </div>
                  )}

                  <div className="text-[15px] font-black text-white/90 mb-2">{tier.name}</div>
                  <p className="text-[12px] text-white/55 mb-6 leading-relaxed">{tier.tagline}</p>

                  <div className="flex items-end gap-1 mb-2">
                    {tier.monthly !== null ? (
                      <>
                        <span className="text-4xl font-black text-white">
                          ${cycle === "monthly" ? tier.monthly : tier.annual}
                        </span>
                        <span className="text-[13px] text-white/55 mb-1.5">/month</span>
                      </>
                    ) : (
                      <span className="text-4xl font-black text-white">Custom</span>
                    )}
                  </div>
                  {tier.monthly !== null && cycle === "annual" && (
                    <p className="text-[11px] text-[#B9FF4A] mb-5">
                      Billed annually — save ${(tier.monthly - (tier.annual ?? 0)) * 12}/yr
                    </p>
                  )}
                  {(tier.monthly === null || cycle !== "annual") && <div className="mb-5" />}

                  <div className="space-y-2 mb-7 text-[13px] text-white/70">
                    <div>{tier.athletes === -1 ? "Unlimited athletes" : `${tier.athletes} athletes`}</div>
                    <div>{tier.users === -1 ? "Unlimited users" : `${tier.users} team seats`}</div>
                    <div>All sports & disciplines</div>
                    {!tier.enterprise && (
                      <div className="text-[#B9FF4A]/70 text-[12px]">3-day free trial included</div>
                    )}
                  </div>

                  {tier.enterprise ? (
                    <Link href="/contact">
                      <span className="block text-center py-3 rounded-xl text-[14px] font-black cursor-pointer transition-all border border-white/15 text-white/70 hover:text-white hover:border-white/30 hover:bg-white/5">
                        {tier.cta}
                      </span>
                    </Link>
                  ) : (
                    <CheckoutButton tierId={tier.id} cycle={cycle} prices={prices} highlight={tier.highlight} cta={tier.cta} />
                  )}
                </div>
              ))}
            </div>

            <p className="text-center text-white/40 text-[12px] mt-6">
              Prices in USD. Annual plans billed as a single payment. Cancel any time.
            </p>
          </div>
        </section>

        {/* Feature comparison table */}
        <section className="bg-[#180D2D] py-20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex items-center gap-2 mb-12 justify-center">
              <Asterisk size={14} color="#C8BDFF" />
              <h2 className="text-2xl font-black text-white tracking-tight">Full feature comparison</h2>
            </div>
            <div className="rounded-2xl border border-white/[0.09] overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.09] bg-white/[0.04]">
                    <th className="text-left px-6 py-4 text-[12px] font-semibold text-white/55 uppercase tracking-wider w-1/2">Feature</th>
                    {TIERS.map((t) => (
                      <th
                        key={t.id}
                        className={`px-4 py-4 text-[13px] font-black text-center w-[16%] ${t.highlight ? "text-[#B9FF4A]" : "text-white/60"}`}
                      >
                        {t.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FEATURES.map((f, i) => (
                    <React.Fragment key={i}>
                      {f.section && (
                        <tr className="border-t border-white/[0.09]">
                          <td colSpan={4} className="px-6 py-3 text-[11px] font-semibold text-white/40 uppercase tracking-widest bg-white/[0.02]">
                            {f.section}
                          </td>
                        </tr>
                      )}
                      <tr className="border-t border-white/[0.07] hover:bg-white/[0.02]">
                        <td className="px-6 py-3.5 text-[13px] text-white/70">{f.label}</td>
                        <td className="px-4 py-3.5 text-center"><Cell value={f.starter} /></td>
                        <td className="px-4 py-3.5 text-center bg-[#B9FF4A]/[0.03]"><Cell value={f.pro} /></td>
                        <td className="px-4 py-3.5 text-center"><Cell value={f.enterprise} /></td>
                      </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-[#0D1C0B] py-20">
          <div className="max-w-3xl mx-auto px-6">
            <div className="flex items-center justify-center gap-2 mb-12">
              <Asterisk size={14} color="#B9FF4A" />
              <h2 className="text-2xl font-black text-white tracking-tight">Frequently asked questions</h2>
            </div>
            <div className="space-y-2">
              {FAQ.map((item, i) => (
                <div key={i} className="rounded-xl border border-white/[0.09] bg-white/[0.04] overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between px-6 py-4 text-left"
                  >
                    <span className="text-[14px] font-medium text-white/90">{item.q}</span>
                    <span className={`text-white/40 transition-transform ${openFaq === i ? "rotate-45" : ""}`}>
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                    </span>
                  </button>
                  {openFaq === i && (
                    <div className="px-6 pb-5 text-[13px] text-white/70 leading-relaxed border-t border-white/[0.08] pt-4">
                      {item.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Enterprise CTA */}
        <section className="bg-[#B9FF4A] py-20 relative overflow-hidden">
          <div className="absolute top-6 right-12 opacity-10"><Asterisk size={80} color="#0D1C0B" /></div>
          <div className="absolute bottom-6 left-12 opacity-10"><Asterisk size={56} color="#0D1C0B" /></div>
          <div className="max-w-6xl mx-auto px-6 text-center relative">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Asterisk size={14} color="#0D1C0B" />
              <span className="text-[11px] font-bold text-[#0D1C0B]/60 uppercase tracking-widest">Enterprise</span>
            </div>
            <h2 className="text-2xl font-black text-[#0D1C0B] mb-3">Running a major programme?</h2>
            <p className="text-[#0D1C0B]/55 mb-7 max-w-lg mx-auto text-[14px]">
              Enterprise plans are scoped to your organisation — unlimited athletes, dedicated customer success, SLA, SSO, API access, and structured onboarding. Let's have a conversation.
            </p>
            <Link href="/contact">
              <span className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0D1C0B] hover:bg-[#162E14] text-[#B9FF4A] font-black text-[14px] cursor-pointer transition-all shadow-[0_4px_16px_rgba(13,28,11,0.3)]">
                Contact sales →
              </span>
            </Link>
          </div>
        </section>

      </PublicLayout>
    </>
  );
}
