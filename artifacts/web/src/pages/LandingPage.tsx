import React from "react";
import { Link } from "wouter";
import { PublicLayout } from "@/components/layout/PublicLayout";

const FEATURES = [
  {
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
    ),
    title: "Persistent AI Agents",
    desc: "One agent per athlete, running continuously. No manual searches, no missed signals — the intelligence comes to you.",
  },
  {
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "Real-Time Intelligence",
    desc: "Results, rankings, media coverage, sponsorship deals, and career changes — surfaced within hours, not weeks.",
  },
  {
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    title: "Source-Attributed",
    desc: "Every intelligence item carries its source, timestamp, and confidence score. Know exactly where it came from.",
  },
  {
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
      </svg>
    ),
    title: "Global Coverage",
    desc: "Any athlete, any sport, any country. Over 200 sports, 200+ national federations, and all major global competitions.",
  },
  {
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
    title: "Team Collaboration",
    desc: "Roles, shared watchlists, and collections. Every analyst on your team works from the same intelligence layer.",
  },
  {
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
      </svg>
    ),
    title: "AI Chat",
    desc: "Ask anything. Compare two athletes, summarise a career, find sponsorship trends. Natural language, instant answers.",
  },
];

const STEPS = [
  { n: "01", title: "Add athletes", desc: "Search our database or upload your existing roster via spreadsheet. One click to start monitoring." },
  { n: "02", title: "Agents go to work", desc: "Persistent AI agents continuously scan results feeds, media, social platforms, and federation databases." },
  { n: "03", title: "Intelligence arrives", desc: "Structured, source-attributed updates flow into your feed, alerts, and reports — in real time." },
];

const FEED_ITEMS = [
  { type: "Rankings", color: "#344F9F", bg: "rgba(52,79,159,0.15)", text: "Zoe Hobbs moved from 14th → 9th in world 100m rankings following Doha Diamond League." },
  { type: "Sponsorship", color: "#059669", bg: "rgba(5,150,105,0.12)", text: "Peter Bol signed a 2-year performance deal with Asics Pacific. Announced via Athletes Media Group." },
  { type: "Career", color: "#E75D50", bg: "rgba(231,93,80,0.12)", text: "Hamish Kerr confirmed coaching change — now working with Ross Jeffs at High Performance Sport NZ." },
  { type: "Media", color: "#D97706", bg: "rgba(217,119,6,0.12)", text: "Catriona Bisset featured in Athletics Australia's pre-season squad narrative. 3 new media mentions." },
];

export default function LandingPage() {
  return (
    <PublicLayout>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#0B0F1E] pt-24 pb-32">
        {/* Background gradients */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-[#293055]/40 rounded-full blur-[120px]" />
          <div className="absolute top-20 right-0 w-[400px] h-[400px] bg-[#E75D50]/8 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#344F9F]/10 rounded-full blur-[100px]" />
          {/* Grid lines */}
          <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E75D50]/10 border border-[#E75D50]/25 text-[12px] text-[#E75D50] font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E75D50] animate-pulse" />
            Now in private beta — 5 pilot organisations
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight leading-[1.05] mb-6 max-w-4xl mx-auto">
            Know more about every
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E75D50] to-[#FF8C7A]">athlete</span> than anyone else.
          </h1>

          <p className="text-lg text-white/45 max-w-2xl mx-auto mb-10 leading-relaxed">
            Persistent AI agents that continuously surface structured, source-attributed intelligence about athletes — for national federations, professional clubs, academies, and talent agencies.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-20">
            <Link href="/contact">
              <span className="px-6 py-3.5 rounded-xl bg-[#E75D50] hover:bg-[#D04840] text-white font-semibold text-[15px] cursor-pointer transition-all shadow-[0_4px_20px_rgba(231,93,80,0.4)] hover:shadow-[0_4px_30px_rgba(231,93,80,0.55)]">
                Request a demo
              </span>
            </Link>
            <Link href="/pricing">
              <span className="px-6 py-3.5 rounded-xl border border-white/15 text-white/70 hover:text-white hover:border-white/30 font-medium text-[15px] cursor-pointer transition-all hover:bg-white/5">
                View pricing →
              </span>
            </Link>
          </div>

          {/* Intelligence feed preview */}
          <div className="relative max-w-2xl mx-auto">
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-white/10 to-transparent" />
            <div className="relative rounded-2xl bg-[#131929] border border-white/[0.08] overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.5)]">
              {/* Window chrome */}
              <div className="flex items-center gap-1.5 px-4 h-9 border-b border-white/[0.06] bg-[#0E1525]">
                <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
                <div className="ml-auto text-[10px] text-white/20 font-mono">Intelligence Feed — Live</div>
              </div>
              {/* Feed items */}
              <div className="p-4 space-y-2.5">
                {FEED_ITEMS.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.05] text-left">
                    <span className="shrink-0 mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ color: item.color, background: item.bg }}>
                      {item.type}
                    </span>
                    <p className="text-[12px] text-white/60 leading-relaxed">{item.text}</p>
                    <span className="shrink-0 text-[10px] text-white/20 mt-0.5">just now</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trusted by ───────────────────────────────────────────────────── */}
      <section className="bg-[#0D1220] border-y border-white/[0.05] py-10">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-[12px] text-white/25 uppercase tracking-widest mb-6">Designed for professional sports organisations</p>
          <div className="flex flex-wrap items-center justify-center gap-8">
            {["National Federations", "Professional Clubs", "National Academies", "Talent Agencies", "Broadcast & Media"].map((org) => (
              <span key={org} className="text-[13px] font-medium text-white/20">{org}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section id="features" className="bg-[#0B0F1E] py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="text-[12px] font-semibold text-[#E75D50] uppercase tracking-widest mb-3">Platform</div>
            <h2 className="text-4xl font-bold text-white tracking-tight mb-4">Intelligence infrastructure<br />for professional sport</h2>
            <p className="text-white/40 text-lg max-w-xl mx-auto">Everything your organisation needs to stay ahead — without the manual research overhead.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div key={i} className="group p-6 rounded-2xl bg-[#131929] border border-white/[0.06] hover:border-white/[0.12] hover:bg-[#161e30] transition-all">
                <div className="w-10 h-10 rounded-xl bg-[#E75D50]/10 flex items-center justify-center text-[#E75D50] mb-4 group-hover:bg-[#E75D50]/15 transition-colors">
                  {f.icon}
                </div>
                <h3 className="text-[15px] font-semibold text-white/90 mb-2">{f.title}</h3>
                <p className="text-[13px] text-white/40 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="bg-[#0D1220] py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="text-[12px] font-semibold text-[#E75D50] uppercase tracking-widest mb-3">How it works</div>
            <h2 className="text-4xl font-bold text-white tracking-tight mb-4">Up and running in minutes</h2>
            <p className="text-white/40 text-lg max-w-xl mx-auto">No integration required. Upload your roster and the agents start working immediately.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((s, i) => (
              <div key={i} className="relative">
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-white/10 to-transparent z-10" />
                )}
                <div className="text-5xl font-bold text-white/5 mb-4 font-mono">{s.n}</div>
                <h3 className="text-[17px] font-semibold text-white/90 mb-3">{s.title}</h3>
                <p className="text-[13px] text-white/40 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Intelligence Centre promo ─────────────────────────────────────── */}
      <section className="bg-[#0B0F1E] py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="rounded-3xl bg-gradient-to-br from-[#131929] to-[#0E1525] border border-white/[0.07] overflow-hidden">
            <div className="grid md:grid-cols-2 gap-0">
              <div className="p-12">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#344F9F]/15 border border-[#344F9F]/30 text-[11px] text-[#6B8FFF] font-semibold uppercase tracking-wider mb-6">
                  Intelligence Centre
                </div>
                <h2 className="text-3xl font-bold text-white tracking-tight mb-5 leading-tight">
                  The platform finds opportunities.<br />You act on them.
                </h2>
                <p className="text-[14px] text-white/45 leading-relaxed mb-8">
                  Instead of searching, the platform proactively surfaces emerging athletes, sponsorship opportunities, fastest-improving performers, and unusual media attention — before your competitors see it.
                </p>
                <Link href="/contact">
                  <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#344F9F] hover:bg-[#2d4491] text-white text-[13px] font-medium cursor-pointer transition-colors">
                    See it in action →
                  </span>
                </Link>
              </div>
              <div className="p-8 border-l border-white/[0.05] flex flex-col gap-3">
                {[
                  { emoji: "↑", label: "Rankings jump", text: "Sarah Smith moved 18th → 11th in world rankings." },
                  { emoji: "🤝", label: "Sponsorship", text: "Trek-Segafredo announced deal with Alex Brown." },
                  { emoji: "📣", label: "Media surge", text: "3× increase in media mentions over 7 days." },
                  { emoji: "🔄", label: "Career change", text: "Athlete joined national squad. Coaching staff updated." },
                  { emoji: "📊", label: "Emerging talent", text: "Under-23 athlete in top 15% for performance trajectory." },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <span className="text-lg">{item.emoji}</span>
                    <div>
                      <span className="text-[11px] font-semibold text-white/30 uppercase tracking-wider">{item.label}</span>
                      <p className="text-[12px] text-white/55 mt-0.5">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing teaser ───────────────────────────────────────────────── */}
      <section className="bg-[#0D1220] py-28">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="text-[12px] font-semibold text-[#E75D50] uppercase tracking-widest mb-3">Pricing</div>
          <h2 className="text-4xl font-bold text-white tracking-tight mb-4">Simple, transparent tiers</h2>
          <p className="text-white/40 text-lg mb-12">From single federations to enterprise organisations.</p>

          <div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto mb-10">
            {[
              { name: "Starter", price: "$299", period: "/month", athletes: "50 athletes", users: "5 users", highlight: false },
              { name: "Pro", price: "$799", period: "/month", athletes: "200 athletes", users: "15 users", highlight: true },
              { name: "Enterprise", price: "Custom", period: "", athletes: "Unlimited athletes", users: "Unlimited users", highlight: false },
            ].map((tier) => (
              <div key={tier.name} className={`rounded-2xl p-6 text-left border ${tier.highlight ? "bg-[#E75D50]/8 border-[#E75D50]/30" : "bg-[#131929] border-white/[0.07]"}`}>
                <div className="text-[13px] font-semibold text-white/60 mb-3">{tier.name}</div>
                <div className="flex items-end gap-1 mb-5">
                  <span className="text-3xl font-bold text-white">{tier.price}</span>
                  <span className="text-[13px] text-white/35 mb-1">{tier.period}</span>
                </div>
                <div className="space-y-2 mb-5">
                  <div className="text-[13px] text-white/50">{tier.athletes}</div>
                  <div className="text-[13px] text-white/50">{tier.users}</div>
                </div>
                <Link href="/pricing">
                  <span className={`block text-center py-2 rounded-lg text-[13px] font-medium cursor-pointer transition-colors ${tier.highlight ? "bg-[#E75D50] hover:bg-[#D04840] text-white" : "border border-white/15 text-white/60 hover:text-white hover:border-white/30"}`}>
                    {tier.name === "Enterprise" ? "Contact sales" : "Get started"}
                  </span>
                </Link>
              </div>
            ))}
          </div>

          <Link href="/pricing">
            <span className="text-[13px] text-white/35 hover:text-white/60 cursor-pointer transition-colors">See full feature comparison →</span>
          </Link>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section className="bg-[#0B0F1E] py-28">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-4xl font-bold text-white tracking-tight mb-5">Ready to see it in action?</h2>
            <p className="text-white/40 text-lg mb-10">We offer a personalised demo using athletes from your current roster.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/contact">
                <span className="px-8 py-4 rounded-xl bg-[#E75D50] hover:bg-[#D04840] text-white font-semibold text-[15px] cursor-pointer transition-all shadow-[0_4px_20px_rgba(231,93,80,0.4)]">
                  Book a demo
                </span>
              </Link>
              <Link href="/pricing">
                <span className="px-8 py-4 rounded-xl border border-white/15 text-white/60 hover:text-white hover:border-white/25 font-medium text-[15px] cursor-pointer transition-all">
                  View pricing
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
