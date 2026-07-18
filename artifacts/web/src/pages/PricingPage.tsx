import React, { useState } from "react";
import { Link } from "wouter";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { CheckCircle2, Minus } from "lucide-react";

type Cycle = "monthly" | "annual";

const TIERS = [
  {
    id: "starter",
    name: "Starter",
    tagline: "For single federations and academies just getting started.",
    monthly: 299,
    annual: 249,
    athletes: 50,
    users: 5,
    highlight: false,
    cta: "Start free trial",
    ctaHref: "/contact",
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "For professional organisations with larger rosters and teams.",
    monthly: 799,
    annual: 666,
    athletes: 200,
    users: 15,
    highlight: true,
    badge: "Most popular",
    cta: "Start free trial",
    ctaHref: "/contact",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "For major organisations, broadcasters, and multi-sport bodies.",
    monthly: null,
    annual: null,
    athletes: -1,
    users: -1,
    highlight: false,
    cta: "Contact sales",
    ctaHref: "/contact",
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
  {
    q: "How does the free trial work?",
    a: "We offer a 14-day free trial on Starter and Pro plans with full access to all features. No credit card required to start. At the end of the trial, you can choose to subscribe or your account pauses.",
  },
  {
    q: "Can I change plans later?",
    a: "Yes. You can upgrade or downgrade at any time. Upgrades are immediate and pro-rated. Downgrades take effect at the end of your current billing period.",
  },
  {
    q: "What counts as an 'athlete'?",
    a: "An athlete is any individual you have added to your monitoring roster — regardless of whether they are currently active in competition. Archived athletes do not count against your limit.",
  },
  {
    q: "Is there a setup fee?",
    a: "No setup fees on Starter or Pro. Enterprise contracts may include onboarding and migration support, which is scoped during the sales process.",
  },
  {
    q: "Do you offer academic or non-profit pricing?",
    a: "Yes — universities, national academies, and registered non-profits can apply for discounted pricing. Contact us to discuss your situation.",
  },
  {
    q: "How is data secured?",
    a: "Data is encrypted in transit (TLS 1.3) and at rest (AES-256). We are SOC 2 Type II compliant (in progress). See our Security & Trust page for full details.",
  },
];

function Cell({ value }: { value: boolean | string }) {
  if (value === true) return <CheckCircle2 size={16} className="text-emerald-400 mx-auto" />;
  if (value === false) return <Minus size={14} className="text-white/15 mx-auto" />;
  return <span className="text-[13px] text-white/70 font-medium">{value}</span>;
}

export default function PricingPage() {
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="bg-[#0B0F1E] pt-24 pb-16 text-center relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-[#293055]/30 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-6">
          <div className="text-[12px] font-semibold text-[#E75D50] uppercase tracking-widest mb-3">Pricing</div>
          <h1 className="text-5xl font-bold text-white tracking-tight mb-4">Simple, transparent pricing</h1>
          <p className="text-white/40 text-lg mb-10 max-w-xl mx-auto">No hidden fees. Cancel any time. All plans include a 14-day free trial.</p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-1 bg-[#131929] border border-white/[0.07] rounded-xl p-1">
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
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-semibold">Save 17%</span>
            </button>
          </div>
        </div>
      </section>

      {/* Tier cards */}
      <section className="bg-[#0B0F1E] pb-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-5">
            {TIERS.map((tier) => (
              <div key={tier.id} className={`relative rounded-2xl p-7 border ${tier.highlight ? "bg-gradient-to-b from-[#E75D50]/10 to-[#131929] border-[#E75D50]/40 shadow-[0_0_60px_rgba(231,93,80,0.1)]" : "bg-[#131929] border-white/[0.07]"}`}>
                {tier.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#E75D50] text-white text-[11px] font-semibold shadow-[0_2px_12px_rgba(231,93,80,0.4)]">
                    {tier.badge}
                  </div>
                )}

                <div className="text-[15px] font-semibold text-white/80 mb-2">{tier.name}</div>
                <p className="text-[12px] text-white/35 mb-6 leading-relaxed">{tier.tagline}</p>

                <div className="flex items-end gap-1 mb-2">
                  {tier.monthly !== null ? (
                    <>
                      <span className="text-4xl font-bold text-white">${cycle === "monthly" ? tier.monthly : tier.annual}</span>
                      <span className="text-[13px] text-white/30 mb-1.5">/month</span>
                    </>
                  ) : (
                    <span className="text-4xl font-bold text-white">Custom</span>
                  )}
                </div>
                {tier.monthly !== null && cycle === "annual" && (
                  <p className="text-[11px] text-emerald-400 mb-5">Billed annually — save ${(tier.monthly - (tier.annual ?? 0)) * 12}/yr</p>
                )}
                {(tier.monthly === null || cycle !== "annual") && <div className="mb-5" />}

                <div className="space-y-2 mb-7 text-[13px] text-white/45">
                  <div>{tier.athletes === -1 ? "Unlimited athletes" : `${tier.athletes} athletes`}</div>
                  <div>{tier.users === -1 ? "Unlimited users" : `${tier.users} team seats`}</div>
                  <div>All sports & disciplines</div>
                </div>

                <Link href={tier.ctaHref}>
                  <span className={`block text-center py-3 rounded-xl text-[14px] font-semibold cursor-pointer transition-all ${tier.highlight ? "bg-[#E75D50] hover:bg-[#D04840] text-white shadow-[0_4px_16px_rgba(231,93,80,0.35)]" : "border border-white/15 text-white/70 hover:text-white hover:border-white/30 hover:bg-white/5"}`}>
                    {tier.cta}
                  </span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature comparison table */}
      <section className="bg-[#0D1220] py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-white tracking-tight text-center mb-12">Full feature comparison</h2>
          <div className="rounded-2xl border border-white/[0.07] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.07] bg-[#131929]">
                  <th className="text-left px-6 py-4 text-[12px] font-semibold text-white/30 uppercase tracking-wider w-1/2">Feature</th>
                  {TIERS.map((t) => (
                    <th key={t.id} className={`px-4 py-4 text-[13px] font-semibold text-center w-[16%] ${t.highlight ? "text-[#E75D50]" : "text-white/60"}`}>{t.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((f, i) => (
                  <React.Fragment key={i}>
                    {f.section && (
                      <tr className="border-t border-white/[0.07]">
                        <td colSpan={4} className="px-6 py-3 text-[11px] font-semibold text-white/25 uppercase tracking-widest bg-[#0E1525]">{f.section}</td>
                      </tr>
                    )}
                    <tr className={`border-t border-white/[0.04] hover:bg-white/[0.01] ${f.section ? "" : ""}`}>
                      <td className="px-6 py-3.5 text-[13px] text-white/55">{f.label}</td>
                      <td className="px-4 py-3.5 text-center"><Cell value={f.starter} /></td>
                      <td className="px-4 py-3.5 text-center bg-[#E75D50]/[0.025]"><Cell value={f.pro} /></td>
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
      <section className="bg-[#0B0F1E] py-20">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-white tracking-tight text-center mb-12">Frequently asked questions</h2>
          <div className="space-y-2">
            {FAQ.map((item, i) => (
              <div key={i} className="rounded-xl border border-white/[0.07] bg-[#131929] overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left"
                >
                  <span className="text-[14px] font-medium text-white/80">{item.q}</span>
                  <span className={`text-white/30 transition-transform ${openFaq === i ? "rotate-45" : ""}`}>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </span>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5 text-[13px] text-white/45 leading-relaxed border-t border-white/[0.05] pt-4">{item.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enterprise CTA */}
      <section className="bg-[#0D1220] py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="rounded-2xl bg-gradient-to-br from-[#131929] to-[#0E1525] border border-white/[0.07] p-10 text-center">
            <h2 className="text-2xl font-bold text-white mb-3">Need a custom arrangement?</h2>
            <p className="text-white/40 mb-7 max-w-lg mx-auto text-[14px]">Enterprise plans include unlimited athletes, dedicated CS, SLA, SSO, API access, and custom onboarding. Let's talk.</p>
            <Link href="/contact">
              <span className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#E75D50] hover:bg-[#D04840] text-white font-semibold text-[14px] cursor-pointer transition-all shadow-[0_4px_16px_rgba(231,93,80,0.35)]">
                Contact sales →
              </span>
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
