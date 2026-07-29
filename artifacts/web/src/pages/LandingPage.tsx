import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Helmet } from "react-helmet-async";

// ── Live dashboard mock data ──────────────────────────────────────────────────

const LIVE_UPDATES = [
  { type: "Rankings",    color: "#2F80ED", bg: "rgba(47,128,237,0.12)",  text: "Zoe Hobbs moved 14th → 9th in 100m world rankings following Doha Diamond League" },
  { type: "Sponsorship", color: "#18A999", bg: "rgba(24,169,153,0.12)",  text: "Peter Bol — 2-year performance deal signed with Asics Pacific via Athletes Media Group" },
  { type: "Media",       color: "#F2994A", bg: "rgba(242,153,74,0.12)",  text: "Catriona Bisset featured in 3 new media mentions — Athletics Australia pre-season coverage" },
  { type: "Career",      color: "#8B9FFF", bg: "rgba(139,159,255,0.12)", text: "Hamish Kerr — coaching change confirmed, now working with Ross Jeffs at HPSNZ" },
  { type: "Alert",       color: "#18A999", bg: "rgba(24,169,153,0.12)",  text: "Emerging U23 athlete in top 12% of performance trajectory across discipline" },
];

const ATHLETES = [
  { name: "Zoe Hobbs",   sport: "Athletics · 100m Sprint", nat: "NZL", score: 94, delta: "+3", active: true },
  { name: "Peter Bol",   sport: "Athletics · 800m",        nat: "AUS", score: 87, delta: "+1", active: true },
  { name: "Hamish Kerr", sport: "Athletics · High Jump",   nat: "NZL", score: 91, delta: "—",  active: false },
];

const STATS = [
  { value: "12,400+", label: "Athletes Monitored" },
  { value: "68",      label: "Countries" },
  { value: "1.8M",    label: "Data Points Processed" },
  { value: "24 / 7",  label: "Real-Time Monitoring" },
];

const FEATURES = [
  {
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
      </svg>
    ),
    title: "Results",
    desc: "Automatically tracks race and competition results worldwide — every event, every split, every final position — the moment they are published.",
  },
  {
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
      </svg>
    ),
    title: "Media",
    desc: "Monitor every interview, article and media mention in real time. Surface sentiment shifts, emerging narratives and unexpected coverage before they become significant.",
  },
  {
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    ),
    title: "Relationships",
    desc: "Understand connections between athletes, managers, sponsors, coaches and federations. Map the network that shapes every athlete's commercial and competitive trajectory.",
  },
  {
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
      </svg>
    ),
    title: "AI Intelligence",
    desc: "Daily summaries, predictive insights, career intelligence and important alerts generated automatically — so your team makes faster, better-informed decisions.",
  },
];

const STEPS = [
  { n: "01", title: "Add your athletes", desc: "Type a name — the platform identifies the athlete, builds the full dossier, and starts monitoring. Live within 60 seconds." },
  { n: "02", title: "Agents go to work", desc: "Dedicated AI agents continuously scan competition results, media outlets, federation announcements, and social platforms around the clock." },
  { n: "03", title: "Intelligence comes to you", desc: "Structured, source-attributed updates flow into your feed, dossiers, and alerts. No searching. No aggregating. Just decisions." },
];

// ── Animated dashboard preview ────────────────────────────────────────────────

function LiveDashboard() {
  const [feedIndex, setFeedIndex] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [confidence, setConfidence] = useState(87);

  // Cycle the top feed item every 3.5 s
  useEffect(() => {
    const t = setInterval(() => {
      setExiting(true);
      setTimeout(() => {
        setFeedIndex((i) => (i + 1) % LIVE_UPDATES.length);
        setExiting(false);
      }, 320);
    }, 3500);
    return () => clearInterval(t);
  }, []);

  // Count confidence score up on mount
  useEffect(() => {
    let n = 87;
    const t = setInterval(() => {
      n += 1;
      setConfidence(n);
      if (n >= 94) clearInterval(t);
    }, 90);
    return () => clearInterval(t);
  }, []);

  const visibleItems = Array.from({ length: 4 }, (_, i) =>
    LIVE_UPDATES[(feedIndex + i) % LIVE_UPDATES.length],
  );

  return (
    <div className="relative rounded-2xl overflow-hidden border border-white/[0.08] bg-[#080D18] shadow-[0_60px_120px_rgba(0,0,0,0.7)]">
      {/* Window chrome */}
      <div className="flex items-center justify-between px-5 h-11 border-b border-white/[0.06] bg-[#060A14]">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]/70" />
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#18A999] animate-pulse" />
          <span className="text-[10px] text-white/25 font-mono tracking-wider">LIVE · 7 athletes monitored</span>
        </div>
        <div className="text-[10px] text-white/15 font-mono">athlete intelligence</div>
      </div>

      <div className="grid grid-cols-5">
        {/* Left panel — athlete roster */}
        <div className="col-span-2 border-r border-white/[0.05] p-4 space-y-2.5">
          <div className="text-[10px] text-white/25 uppercase tracking-widest mb-3 font-medium">Roster</div>
          {ATHLETES.map((a, i) => (
            <div
              key={a.name}
              className={`p-3 rounded-xl border transition-colors ${i === 0 ? "bg-[#2F80ED]/8 border-[#2F80ED]/20" : "bg-white/[0.025] border-white/[0.05]"}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] font-semibold text-white/90">{a.name}</span>
                <span className="text-[10px] font-mono text-white/25">{a.nat}</span>
              </div>
              <div className="text-[10px] text-white/35 mb-2">{a.sport}</div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="text-[10px] text-white/25">Confidence</div>
                  <div className="text-[11px] font-semibold text-[#2F80ED]">
                    {i === 0 ? confidence : a.score}
                  </div>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${a.delta !== "—" ? "text-[#18A999] bg-[#18A999]/10" : "text-white/25 bg-white/5"}`}>
                  {a.delta}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Right panel — live intelligence feed */}
        <div className="col-span-3 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] text-white/25 uppercase tracking-widest font-medium">Live Intelligence Feed</div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#2F80ED]/10 border border-[#2F80ED]/20">
              <span className="w-1 h-1 rounded-full bg-[#2F80ED] animate-pulse" />
              <span className="text-[9px] text-[#2F80ED] font-semibold tracking-wider">LIVE</span>
            </div>
          </div>
          <div className="space-y-2">
            {visibleItems.map((item, i) => (
              <div
                key={`${feedIndex}-${i}`}
                className={`flex items-start gap-3 p-3 rounded-xl border border-white/[0.05] bg-white/[0.025] transition-all duration-300 ${i === 0 && exiting ? "opacity-0 -translate-y-1" : "opacity-100 translate-y-0"}`}
                style={{ transitionDelay: i === 0 ? "0ms" : `${i * 30}ms`, opacity: 1 - i * 0.18 }}
              >
                <span
                  className="shrink-0 mt-px px-1.5 py-0.5 rounded-full text-[9px] font-bold tracking-wide uppercase"
                  style={{ color: item.color, background: item.bg }}
                >
                  {item.type}
                </span>
                <p className="text-[11px] text-white/55 leading-relaxed flex-1">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <>
      <Helmet>
        <title>Athlete Intelligence — The intelligence platform for elite sport</title>
        <meta name="description" content="Persistent AI agents continuously monitor every athlete on your roster, surfacing the insights that matter most — from results and rankings to media coverage, sponsorship activity and career changes." />
        <meta property="og:title" content="Athlete Intelligence — The intelligence platform for elite sport" />
        <meta property="og:description" content="Every athlete has data. We create intelligence. Built for national federations, professional clubs, academies, and agencies." />
        <meta property="og:image" content="https://athleteintelligence.ai/og-image.png" />
        <meta property="og:url" content="https://athleteintelligence.ai/" />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://athleteintelligence.ai/" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "Athlete Intelligence",
          "description": "AI-powered athlete intelligence platform for national federations, professional clubs, academies, and agencies.",
          "operatingSystem": "Web",
          "applicationCategory": "BusinessApplication",
          "url": "https://athleteintelligence.ai",
        })}</script>
      </Helmet>

      <PublicLayout>

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-[#0E1423] pt-32 pb-28">
          {/* Ambient backgrounds */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Radial glow — behind headline */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] rounded-full bg-[#2F80ED]/[0.09] blur-[130px]" />
            {/* Edge glows */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-[#112240]/60 blur-[120px]" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-[#0E1F3D]/40 blur-[100px]" />
            {/* Subtle grid — texture only */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)",
                backgroundSize: "72px 72px",
              }}
            />
          </div>

          <div className="relative max-w-5xl mx-auto px-6 text-center">
            {/* Credibility badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[12px] text-white/50 font-medium mb-10 tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-[#18A999] animate-pulse" />
              Trusted by 5 pilot organisations · Private Beta
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-[72px] lg:text-[80px] font-bold text-white tracking-tight leading-[1.04] mb-7 max-w-4xl mx-auto">
              The intelligence platform<br />for elite sport.
            </h1>

            {/* Supporting copy */}
            <p className="text-lg md:text-xl text-white/45 max-w-2xl mx-auto mb-12 leading-relaxed font-normal">
              Every athlete has data. We create intelligence. Persistent AI agents continuously monitor every athlete on your roster, surfacing the insights that matter most — from results and rankings to media coverage, sponsorship activity and career changes — in one intelligent platform.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/contact">
                <span className="px-7 py-3.5 rounded-xl bg-[#2F80ED] hover:bg-[#1E72DE] text-white font-semibold text-[15px] cursor-pointer transition-all shadow-[0_4px_24px_rgba(47,128,237,0.4)] hover:shadow-[0_4px_32px_rgba(47,128,237,0.55)]">
                  Request a demo
                </span>
              </Link>
              <Link href="/about">
                <span className="px-7 py-3.5 rounded-xl border border-white/[0.12] text-white/60 hover:text-white hover:border-white/25 font-medium text-[15px] cursor-pointer transition-all hover:bg-white/[0.04]">
                  Explore the platform →
                </span>
              </Link>
            </div>
          </div>
        </section>

        {/* ── Trust metrics ────────────────────────────────────────────────── */}
        <section className="bg-[#0A0E1A] border-y border-white/[0.05] py-12">
          <div className="max-w-5xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {STATS.map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-1.5">{s.value}</div>
                  <div className="text-[12px] text-white/30 font-medium tracking-wide">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Dashboard preview ────────────────────────────────────────────── */}
        <section className="bg-[#0E1423] py-24">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-12">
              <p className="text-[11px] font-semibold text-[#2F80ED] uppercase tracking-widest mb-3">Platform</p>
              <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">
                Intelligence, live and structured
              </h2>
              <p className="text-white/40 text-base max-w-lg mx-auto leading-relaxed">
                Every update your team needs — sourced, scored, and surfaced automatically.
              </p>
            </div>
            {/* Outer glow frame */}
            <div className="relative">
              <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-white/[0.07] to-transparent pointer-events-none" />
              <LiveDashboard />
            </div>
          </div>
        </section>

        {/* ── Features ─────────────────────────────────────────────────────── */}
        <section className="bg-[#0A0E1A] py-24">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-14">
              <p className="text-[11px] font-semibold text-[#2F80ED] uppercase tracking-widest mb-3">What we track</p>
              <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">
                Four pillars of athlete intelligence
              </h2>
              <p className="text-white/40 text-base max-w-lg mx-auto leading-relaxed">
                One platform. Every signal that matters in modern professional sport.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="group p-7 rounded-2xl bg-[#0C1120] border border-white/[0.06] hover:border-[#2F80ED]/25 hover:bg-[#0E1525] transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#2F80ED]/10 flex items-center justify-center text-[#2F80ED] mb-5 group-hover:bg-[#2F80ED]/18 transition-colors">
                    {f.icon}
                  </div>
                  <h3 className="text-[16px] font-semibold text-white/90 mb-2.5">{f.title}</h3>
                  <p className="text-[13px] text-white/40 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────────────────── */}
        <section className="bg-[#0E1423] py-24">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-14">
              <p className="text-[11px] font-semibold text-[#2F80ED] uppercase tracking-widest mb-3">How it works</p>
              <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">Up and running in minutes</h2>
              <p className="text-white/40 text-base max-w-lg mx-auto leading-relaxed">
                No integrations. No data migration. No IT project. Add your first athlete and the agents start working immediately.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-10">
              {STEPS.map((s, i) => (
                <div key={i} className="relative">
                  {i < STEPS.length - 1 && (
                    <div className="hidden md:block absolute top-6 left-full w-full h-px bg-gradient-to-r from-white/[0.08] to-transparent z-10" />
                  )}
                  <div className="text-[52px] font-bold text-white/[0.04] mb-4 font-mono leading-none">{s.n}</div>
                  <h3 className="text-[16px] font-semibold text-white/90 mb-3">{s.title}</h3>
                  <p className="text-[13px] text-white/40 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Final CTA ────────────────────────────────────────────────────── */}
        <section className="bg-[#0A0E1A] py-28">
          <div className="max-w-5xl mx-auto px-6 text-center">
            {/* Subtle glow */}
            <div className="relative inline-block">
              <div className="absolute inset-0 -m-16 rounded-full bg-[#2F80ED]/[0.06] blur-[80px] pointer-events-none" />
              <div className="relative max-w-xl mx-auto">
                <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-5 leading-tight">
                  Ready to see it<br />in action?
                </h2>
                <p className="text-white/40 text-lg mb-10 leading-relaxed">
                  We run personalised demos built around athletes you actually work with — so you see real intelligence, not a rehearsed walkthrough.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link href="/contact">
                    <span className="px-8 py-4 rounded-xl bg-[#2F80ED] hover:bg-[#1E72DE] text-white font-semibold text-[15px] cursor-pointer transition-all shadow-[0_4px_24px_rgba(47,128,237,0.4)] hover:shadow-[0_4px_36px_rgba(47,128,237,0.55)]">
                      Book a demo
                    </span>
                  </Link>
                  <Link href="/about">
                    <span className="px-8 py-4 rounded-xl border border-white/[0.12] text-white/55 hover:text-white hover:border-white/25 font-medium text-[15px] cursor-pointer transition-all hover:bg-white/[0.04]">
                      Learn more
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

      </PublicLayout>
    </>
  );
}
