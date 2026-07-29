import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Helmet } from "react-helmet-async";

// ── Palette ───────────────────────────────────────────────────────────────────
// Green bg  : #0D1C0B   Deep forest green
// Purple bg : #180D2D   Deep purple
// Lime      : #B9FF4A   Neon lime (primary accent)
// Lavender  : #C8BDFF   Soft lavender (accent on purple sections)

// ── Dashboard mock data ───────────────────────────────────────────────────────

const LIVE_UPDATES = [
  { type: "Rankings",    color: "#B9FF4A", bg: "rgba(185,255,74,0.12)",   text: "Zoe Hobbs moved 14th → 9th in 100m world rankings following Doha Diamond League" },
  { type: "Sponsorship", color: "#C8BDFF", bg: "rgba(200,189,255,0.12)",  text: "Peter Bol — 2-year performance deal signed with Asics Pacific via Athletes Media Group" },
  { type: "Media",       color: "#F2994A", bg: "rgba(242,153,74,0.12)",   text: "Catriona Bisset featured in 3 new media mentions — Athletics Australia pre-season coverage" },
  { type: "Career",      color: "#C8BDFF", bg: "rgba(200,189,255,0.12)",  text: "Hamish Kerr — coaching change confirmed, now working with Ross Jeffs at HPSNZ" },
  { type: "Alert",       color: "#B9FF4A", bg: "rgba(185,255,74,0.12)",   text: "Emerging U23 athlete in top 12% of performance trajectory across discipline" },
];

const ATHLETES = [
  { name: "Zoe Hobbs",   sport: "Athletics · 100m Sprint", nat: "NZL", score: 94, delta: "+3", active: true },
  { name: "Peter Bol",   sport: "Athletics · 800m",        nat: "AUS", score: 87, delta: "+1", active: false },
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
    style: "lime", // lime bg card
    title: "Results.",
    desc: "Automatically tracks race and competition results worldwide — every event, every split, every final position — the moment they are published.",
  },
  {
    style: "dark",
    title: "Media.",
    desc: "Monitor every interview, article and media mention in real time. Surface sentiment shifts, emerging narratives and unexpected coverage before they become significant.",
  },
  {
    style: "dark",
    title: "Relationships.",
    desc: "Understand connections between athletes, managers, sponsors, coaches and federations. Map the network that shapes every career.",
  },
  {
    style: "lavender", // lavender bg card
    title: "AI Intelligence.",
    desc: "Daily summaries, predictive insights, career intelligence and important alerts generated automatically — so your team makes faster, better-informed decisions.",
  },
];

// ── Decorative elements ───────────────────────────────────────────────────────

function Asterisk({ size = 32, color = "#B9FF4A", className = "" }: { size?: number; color?: string; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} className={className}>
      <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93 4.93 19.07" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function ArrowRight({ size = 20, color = "#B9FF4A" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

// ── Animated dashboard ────────────────────────────────────────────────────────

function LiveDashboard() {
  const [feedIndex, setFeedIndex] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [confidence, setConfidence] = useState(87);

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
    <div className="relative rounded-2xl overflow-hidden border border-white/[0.08] bg-[#07100A] shadow-[0_60px_120px_rgba(0,0,0,0.6)]">
      {/* Window chrome */}
      <div className="flex items-center justify-between px-5 h-11 border-b border-white/[0.06] bg-[#050D07]">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]/70" />
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#B9FF4A] animate-pulse" />
          <span className="text-[10px] text-white/25 font-mono tracking-wider">LIVE · 7 athletes monitored</span>
        </div>
        <div className="text-[10px] text-white/15 font-mono">athlete intelligence</div>
      </div>

      <div className="grid grid-cols-5">
        {/* Left — roster */}
        <div className="col-span-2 border-r border-white/[0.05] p-4 space-y-2.5">
          <div className="text-[10px] text-white/25 uppercase tracking-widest mb-3 font-medium">Roster</div>
          {ATHLETES.map((a, i) => (
            <div
              key={a.name}
              className={`p-3 rounded-xl border transition-colors ${i === 0 ? "bg-[#B9FF4A]/8 border-[#B9FF4A]/25" : "bg-white/[0.025] border-white/[0.05]"}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] font-semibold text-white/90">{a.name}</span>
                <span className="text-[10px] font-mono text-white/25">{a.nat}</span>
              </div>
              <div className="text-[10px] text-white/35 mb-2">{a.sport}</div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="text-[10px] text-white/25">Confidence</div>
                  <div className="text-[11px] font-semibold text-[#B9FF4A]">
                    {i === 0 ? confidence : a.score}
                  </div>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${a.delta !== "—" ? "text-[#B9FF4A] bg-[#B9FF4A]/10" : "text-white/25 bg-white/5"}`}>
                  {a.delta}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Right — feed */}
        <div className="col-span-3 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] text-white/25 uppercase tracking-widest font-medium">Live Intelligence Feed</div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#B9FF4A]/10 border border-[#B9FF4A]/20">
              <span className="w-1 h-1 rounded-full bg-[#B9FF4A] animate-pulse" />
              <span className="text-[9px] text-[#B9FF4A] font-bold tracking-wider">LIVE</span>
            </div>
          </div>
          <div className="space-y-2">
            {visibleItems.map((item, i) => (
              <div
                key={`${feedIndex}-${i}`}
                className="flex items-start gap-3 p-3 rounded-xl border border-white/[0.05] bg-white/[0.025] transition-all duration-300"
                style={{
                  opacity: i === 0 && exiting ? 0 : 1 - i * 0.18,
                  transform: i === 0 && exiting ? "translateY(-4px)" : "translateY(0)",
                  transitionDelay: `${i * 30}ms`,
                }}
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
      </Helmet>

      <PublicLayout>

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-[#0D1C0B] pt-32 pb-28">
          {/* Subtle grid texture */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(rgba(185,255,74,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(185,255,74,0.025) 1px, transparent 1px)",
              backgroundSize: "72px 72px",
            }}
          />
          {/* Decorative asterisks */}
          <div className="absolute top-20 right-16 opacity-15">
            <Asterisk size={64} color="#B9FF4A" />
          </div>
          <div className="absolute bottom-24 left-12 opacity-10">
            <Asterisk size={40} color="#B9FF4A" />
          </div>

          <div className="relative max-w-5xl mx-auto px-6 text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#B9FF4A]/10 border border-[#B9FF4A]/20 text-[12px] text-[#B9FF4A] font-semibold mb-10 tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-[#B9FF4A] animate-pulse" />
              Trusted by 5 pilot organisations · Private Beta
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-[72px] lg:text-[80px] font-black text-white tracking-tight leading-[1.02] mb-7 max-w-4xl mx-auto">
              The intelligence platform<br />
              for <span className="text-[#B9FF4A]">elite sport.</span>
            </h1>

            {/* Subhead */}
            <p className="text-lg md:text-xl text-white/45 max-w-2xl mx-auto mb-12 leading-relaxed font-normal">
              Every athlete has data. We create intelligence. Persistent AI agents continuously monitor every athlete on your roster, surfacing the insights that matter most — from results and rankings to media coverage, sponsorship activity and career changes — in one intelligent platform.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/contact">
                <span className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-[#B9FF4A] hover:bg-[#CBFF6A] text-[#0D1C0B] font-black text-[15px] cursor-pointer transition-all shadow-[0_4px_24px_rgba(185,255,74,0.35)] hover:shadow-[0_4px_36px_rgba(185,255,74,0.5)]">
                  Request a demo
                  <ArrowRight size={16} color="#0D1C0B" />
                </span>
              </Link>
              <Link href="/about">
                <span className="px-7 py-3.5 rounded-xl border border-white/[0.12] text-white/55 hover:text-white hover:border-white/25 font-medium text-[15px] cursor-pointer transition-all hover:bg-white/[0.04]">
                  Explore the platform →
                </span>
              </Link>
            </div>
          </div>
        </section>

        {/* ── Trust metrics ────────────────────────────────────────────────── */}
        <section className="bg-[#180D2D] border-y border-white/[0.05] py-14">
          <div className="max-w-5xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {STATS.map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-4xl md:text-5xl font-black text-[#C8BDFF] tracking-tight mb-2">{s.value}</div>
                  <div className="text-[12px] text-white/30 font-medium tracking-wide">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Dashboard preview ────────────────────────────────────────────── */}
        <section className="bg-[#0D1C0B] py-24">
          <div className="max-w-5xl mx-auto px-6">
            <div className="flex items-start justify-between mb-12 flex-col md:flex-row gap-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Asterisk size={14} color="#B9FF4A" />
                  <span className="text-[11px] font-bold text-[#B9FF4A] uppercase tracking-widest">Platform</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
                  Intelligence, live<br />and structured.
                </h2>
              </div>
              <p className="text-white/40 text-base max-w-xs leading-relaxed md:text-right">
                Every update your team needs — sourced, scored, and surfaced automatically.
              </p>
            </div>
            <div className="relative">
              <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-[#B9FF4A]/[0.06] to-transparent pointer-events-none" />
              <LiveDashboard />
            </div>
          </div>
        </section>

        {/* ── Features ─────────────────────────────────────────────────────── */}
        <section className="bg-[#180D2D] py-24" id="features">
          <div className="max-w-5xl mx-auto px-6">
            <div className="flex items-start justify-between mb-14 flex-col md:flex-row gap-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Asterisk size={14} color="#C8BDFF" />
                  <span className="text-[11px] font-bold text-[#C8BDFF] uppercase tracking-widest">What we track</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
                  Four pillars of<br />athlete intelligence.
                </h2>
              </div>
              <p className="text-white/40 text-base max-w-xs leading-relaxed md:text-right">
                One platform. Every signal that matters in modern professional sport.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              {FEATURES.map((f) => {
                if (f.style === "lime") {
                  return (
                    <div key={f.title} className="p-8 rounded-2xl bg-[#B9FF4A] relative overflow-hidden">
                      <div className="absolute top-5 right-5 opacity-20">
                        <Asterisk size={48} color="#0D1C0B" />
                      </div>
                      <h3 className="text-2xl font-black text-[#0D1C0B] mb-3 relative">{f.title}</h3>
                      <p className="text-[#0D1C0B]/60 text-[13px] leading-relaxed relative max-w-xs">{f.desc}</p>
                    </div>
                  );
                }
                if (f.style === "lavender") {
                  return (
                    <div key={f.title} className="p-8 rounded-2xl bg-[#C8BDFF] relative overflow-hidden">
                      <div className="absolute top-5 right-5 opacity-20">
                        <Asterisk size={48} color="#180D2D" />
                      </div>
                      <h3 className="text-2xl font-black text-[#180D2D] mb-3 relative">{f.title}</h3>
                      <p className="text-[#180D2D]/60 text-[13px] leading-relaxed relative max-w-xs">{f.desc}</p>
                    </div>
                  );
                }
                return (
                  <div key={f.title} className="group p-8 rounded-2xl bg-white/[0.04] border border-white/[0.07] hover:border-[#C8BDFF]/25 hover:bg-white/[0.06] transition-all relative overflow-hidden">
                    <div className="absolute top-5 right-5 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Asterisk size={48} color="#C8BDFF" />
                    </div>
                    <h3 className="text-2xl font-black text-white mb-3 relative">{f.title}</h3>
                    <p className="text-white/40 text-[13px] leading-relaxed relative max-w-xs">{f.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────────────────── */}
        <section className="bg-[#0D1C0B] py-24 relative overflow-hidden">
          <div className="absolute bottom-0 right-0 opacity-5">
            <Asterisk size={200} color="#B9FF4A" />
          </div>
          <div className="max-w-5xl mx-auto px-6 relative">
            <div className="flex items-start justify-between mb-14 flex-col md:flex-row gap-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Asterisk size={14} color="#B9FF4A" />
                  <span className="text-[11px] font-bold text-[#B9FF4A] uppercase tracking-widest">How it works</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
                  Up and running<br />in minutes.
                </h2>
              </div>
              <p className="text-white/40 text-base max-w-xs leading-relaxed md:text-right">
                No integrations. No data migration. No IT project. Add your first athlete and the agents start immediately.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                { n: "01", title: "Add your athletes", desc: "Type a name — the platform identifies the athlete, builds the full dossier, and starts monitoring. Live within 60 seconds." },
                { n: "02", title: "Agents go to work", desc: "Dedicated AI agents continuously scan competition results, media outlets, federation announcements, and social platforms around the clock." },
                { n: "03", title: "Intelligence comes to you", desc: "Structured, source-attributed updates flow into your feed, dossiers, and alerts. No searching. No aggregating. Just decisions." },
              ].map((s, i) => (
                <div key={i} className="relative">
                  {i < 2 && (
                    <div className="hidden md:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-[#B9FF4A]/20 to-transparent z-10" />
                  )}
                  <div className="text-[56px] font-black text-[#B9FF4A]/15 mb-4 leading-none font-mono">{s.n}</div>
                  <h3 className="text-[17px] font-black text-white mb-3">{s.title}</h3>
                  <p className="text-[13px] text-white/40 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Final CTA ────────────────────────────────────────────────────── */}
        <section className="bg-[#B9FF4A] py-28 relative overflow-hidden">
          {/* Decorative asterisks */}
          <div className="absolute top-8 left-12 opacity-15">
            <Asterisk size={56} color="#0D1C0B" />
          </div>
          <div className="absolute bottom-8 right-16 opacity-15">
            <Asterisk size={80} color="#0D1C0B" />
          </div>
          <div className="absolute top-1/2 right-8 -translate-y-1/2 opacity-8">
            <Asterisk size={120} color="#0D1C0B" />
          </div>

          <div className="relative max-w-5xl mx-auto px-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-6">
              <Asterisk size={14} color="#0D1C0B" />
              <span className="text-[11px] font-bold text-[#0D1C0B]/60 uppercase tracking-widest">Book a demo</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-black text-[#0D1C0B] tracking-tight mb-6 leading-tight max-w-2xl mx-auto">
              Ready to see it in action?
            </h2>
            <p className="text-[#0D1C0B]/55 text-lg mb-10 leading-relaxed max-w-lg mx-auto">
              We run personalised demos built around athletes you actually work with — so you see real intelligence, not a rehearsed walkthrough.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/contact">
                <span className="inline-flex items-center gap-2.5 px-8 py-4 rounded-xl bg-[#0D1C0B] hover:bg-[#162E14] text-[#B9FF4A] font-black text-[15px] cursor-pointer transition-all shadow-[0_4px_24px_rgba(13,28,11,0.3)]">
                  Book a demo
                  <ArrowRight size={16} color="#B9FF4A" />
                </span>
              </Link>
              <Link href="/about">
                <span className="px-8 py-4 rounded-xl border-2 border-[#0D1C0B]/20 text-[#0D1C0B]/65 hover:text-[#0D1C0B] hover:border-[#0D1C0B]/40 font-bold text-[15px] cursor-pointer transition-all">
                  Learn more
                </span>
              </Link>
            </div>
          </div>
        </section>

      </PublicLayout>
    </>
  );
}
