import React from "react";
import { Link } from "wouter";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Helmet } from "react-helmet-async";

const PILLARS = [
  {
    icon: "🔒",
    title: "Data encryption",
    items: ["TLS 1.3 for all data in transit", "AES-256 encryption at rest", "Encrypted database backups", "Key management via HSM"],
  },
  {
    icon: "🏗️",
    title: "Infrastructure",
    items: ["SOC 2 Type II (in progress)", "99.9% uptime SLA (Enterprise)", "Automated failover", "Daily encrypted backups"],
  },
  {
    icon: "👤",
    title: "Access control",
    items: ["Role-based access (Owner / Admin / Analyst / Viewer)", "SSO / SAML 2.0 (Enterprise)", "Session management and audit logs", "Principle of least privilege"],
  },
  {
    icon: "🤖",
    title: "AI & data principles",
    items: ["No athlete PII stored without necessity", "Intelligence sourced only from public data", "Confidence scoring on all AI outputs", "Human-in-the-loop for sensitive items"],
  },
];

const AI_PRINCIPLES = [
  { title: "Source attribution on everything", desc: "Every intelligence item shows its source domain, URL, and publication date. We never surface an AI-generated claim without a traceable primary source behind it. If we can't source it, we don't show it." },
  { title: "Public information only", desc: "Our agents crawl only publicly available data — competition results, federation announcements, accredited sports media, and official social accounts. We do not access private communications, purchase data broker lists, or ingest leaked information." },
  { title: "Honest confidence scoring", desc: "Every insight carries a confidence score from 65–97%. Low-confidence items are clearly marked. We'd rather surface fewer items with high reliability than more items you can't trust. Transparency about uncertainty is a feature, not a weakness." },
  { title: "No inferred personal profiling", desc: "We do not build psychological profiles, health assessments, or lifestyle inferences about athletes. Our intelligence is limited to professional and public-domain information — performance, career, commercial, and media activity." },
];

export default function SecurityPage() {
  return (
    <>
      <Helmet>
        <title>Security & Trust — Athlete Intelligence</title>
        <meta name="description" content="Athlete Intelligence is built on a foundation of enterprise-grade security: TLS 1.3, AES-256 encryption at rest, SOC 2-aligned controls, and strict data minimisation principles." />
        <meta property="og:title" content="Security & Trust — Athlete Intelligence" />
        <meta property="og:description" content="Enterprise-grade security: TLS 1.3, AES-256 at rest, SOC 2-aligned controls, and strict data minimisation." />
      </Helmet>
      <PublicLayout>
      <section className="bg-[#0B0F1E] pt-24 pb-16 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[250px] bg-[#293055]/30 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <div className="text-[12px] font-semibold text-[#E75D50] uppercase tracking-widest mb-3">Security & Trust</div>
          <h1 className="text-4xl font-bold text-white tracking-tight mb-4">Security, privacy, and responsible AI</h1>
          <p className="text-white/40 text-lg max-w-2xl mx-auto">We handle intelligence data for professional sports organisations — trust is the product. Here is exactly how we protect your data and how our AI systems work.</p>
          <div className="mt-8 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[12px] text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            All systems operational
          </div>
        </div>
      </section>

      {/* Security pillars */}
      <section className="bg-[#0D1220] py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-white tracking-tight mb-10">Security architecture</h2>
          <div className="grid md:grid-cols-2 gap-5">
            {PILLARS.map((p) => (
              <div key={p.title} className="p-6 rounded-2xl bg-[#131929] border border-white/[0.06]">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">{p.icon}</span>
                  <h3 className="text-[15px] font-semibold text-white/90">{p.title}</h3>
                </div>
                <ul className="space-y-2">
                  {p.items.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-[13px] text-white/45">
                      <span className="w-1 h-1 rounded-full bg-[#E75D50] shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Principles */}
      <section className="bg-[#0B0F1E] py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="mb-10">
            <div className="text-[12px] font-semibold text-[#E75D50] uppercase tracking-widest mb-2">AI Principles</div>
            <h2 className="text-2xl font-bold text-white tracking-tight">How our AI works — and what it won't do</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {AI_PRINCIPLES.map((p) => (
              <div key={p.title} className="p-6 rounded-2xl bg-[#131929] border border-white/[0.06]">
                <h3 className="text-[14px] font-semibold text-white/90 mb-2">{p.title}</h3>
                <p className="text-[13px] text-white/40 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Data sources */}
      <section className="bg-[#0D1220] py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-white tracking-tight mb-4">Data sources</h2>
          <p className="text-white/40 text-[14px] mb-8 max-w-2xl">Our agents crawl a curated set of trusted sources. We maintain quality scores and blacklists for every domain.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {["World Athletics", "World Aquatics", "UCI Cycling", "FIFA / UEFA", "National Federations", "Official Results Feeds", "Accredited News Media", "Social Media (public)", "Competition Databases", "Athlete Official Sites", "Sports Analytics APIs", "Government Sports Bodies"].map((s) => (
              <div key={s} className="px-4 py-3 rounded-xl bg-[#131929] border border-white/[0.06] text-[12px] text-white/45">{s}</div>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance */}
      <section className="bg-[#0B0F1E] py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-white tracking-tight mb-8">Compliance & privacy</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { title: "GDPR / UK GDPR", status: "Compliant", desc: "Data processing agreements available for EU and UK customers. Right to erasure, data portability, and lawful basis documentation respected." },
              { title: "NZ Privacy Act 2020 / CCPA", status: "Compliant", desc: "Information privacy principles followed for NZ and AU customers. CCPA rights (opt-out, deletion, disclosure) honoured for California-based users." },
              { title: "SOC 2 Type II", status: "In progress", desc: "Audit underway. Report expected Q4 2026. Security, availability, and confidentiality controls are in place now." },
            ].map((c) => (
              <div key={c.title} className="p-6 rounded-2xl bg-[#131929] border border-white/[0.06]">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[15px] font-semibold text-white/90">{c.title}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${c.status === "Compliant" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>{c.status}</span>
                </div>
                <p className="text-[12px] text-white/35 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 p-6 rounded-2xl bg-[#131929] border border-white/[0.06]">
            <h3 className="text-[14px] font-semibold text-white/80 mb-2">Questions about security or compliance?</h3>
            <p className="text-[13px] text-white/40 mb-4">For vulnerability disclosures, data processing agreement requests, GDPR queries, or any compliance question — reach out directly. We respond within one business day.</p>
            <Link href="/contact">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#E75D50]/10 border border-[#E75D50]/25 text-[13px] text-[#E75D50] font-medium cursor-pointer hover:bg-[#E75D50]/15 transition-colors">
                Contact security team →
              </span>
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
    </>
  );
}
