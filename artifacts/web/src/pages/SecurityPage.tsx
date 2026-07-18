import React from "react";
import { Link } from "wouter";
import { PublicLayout } from "@/components/layout/PublicLayout";

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
  { title: "Source attribution always", desc: "Every intelligence item displays its source, URL, and timestamp. We never present AI-generated claims as facts without a primary source." },
  { title: "Public data only", desc: "Our agents only crawl publicly available information — results databases, federation sites, news, social media, and official announcements. We do not access private communications or purchase data brokers." },
  { title: "Confidence scoring", desc: "Every insight carries a confidence score. Low-confidence items are flagged prominently. We'd rather show you less and be right than show you more and be wrong." },
  { title: "No profiling without consent", desc: "We do not build inferred psychological profiles or health assessments on athletes. Intelligence is limited to professional and public-domain information." },
];

export default function SecurityPage() {
  return (
    <PublicLayout>
      <section className="bg-[#0B0F1E] pt-24 pb-16 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[250px] bg-[#293055]/30 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <div className="text-[12px] font-semibold text-[#E75D50] uppercase tracking-widest mb-3">Security & Trust</div>
          <h1 className="text-4xl font-bold text-white tracking-tight mb-4">Security, privacy, and AI principles</h1>
          <p className="text-white/40 text-lg max-w-2xl mx-auto">Enterprise buyers care about security. So do we. Here's exactly how we handle your data and our AI systems.</p>
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
              { title: "GDPR", status: "Compliant", desc: "Data processing agreements available for EU customers. Right to erasure respected." },
              { title: "Australian Privacy Act", status: "Compliant", desc: "APP-aligned practices for AU customers, including data localisation options." },
              { title: "SOC 2 Type II", status: "In progress", desc: "Audit underway. Report expected Q4 2026. Controls in place now." },
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
            <h3 className="text-[14px] font-semibold text-white/80 mb-2">Have a security question?</h3>
            <p className="text-[13px] text-white/40 mb-4">For security disclosures, DPA requests, or compliance questions, contact our team directly.</p>
            <Link href="/contact">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#E75D50]/10 border border-[#E75D50]/25 text-[13px] text-[#E75D50] font-medium cursor-pointer hover:bg-[#E75D50]/15 transition-colors">
                Contact security team →
              </span>
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
