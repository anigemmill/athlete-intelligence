import React from "react";
import { Link } from "wouter";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Helmet } from "react-helmet-async";

const VALUES = [
  { title: "Intelligence, not data", desc: "Raw data is noise. We build systems that transform public signals into structured, actionable intelligence. Every item is categorised, sourced, and scored before it reaches your team." },
  { title: "Transparency is non-negotiable", desc: "Every intelligence item carries its source URL, publication date, and confidence score. Our AI never presents a claim without a traceable origin. You always know exactly where information came from — and what weight to give it." },
  { title: "Speed is a competitive edge", desc: "In professional sport, the window between information and opportunity closes fast. Our agents surface intelligence within hours of an event — not days, not 'whenever someone checks'." },
  { title: "Designed for trust", desc: "We build for analysts, high performance directors, and federation executives who will immediately discard a tool that doesn't earn their trust. Accuracy, source quality, and honest confidence scoring are non-negotiable." },
];

export default function AboutPage() {
  return (
    <>
      <Helmet>
        <title>About — Athlete Intelligence</title>
        <meta name="description" content="Athlete Intelligence was built on the belief that professional sport decisions should be driven by timely, traceable intelligence — not gut feel or slow manual research." />
        <meta property="og:title" content="About Athlete Intelligence" />
        <meta property="og:description" content="Built on the belief that professional sport decisions should be driven by timely, traceable intelligence." />
        <meta property="og:image" content="https://athleteintelligence.ai/og-image.png" />
        <meta property="og:url" content="https://athleteintelligence.ai/about" />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://athleteintelligence.ai/about" />
      </Helmet>
      <PublicLayout>
      {/* Hero */}
      <section className="bg-[#0B0F1E] pt-24 pb-20 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-[#293055]/30 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <div className="text-[12px] font-semibold text-[#E75D50] uppercase tracking-widest mb-3">About</div>
          <h1 className="text-5xl font-bold text-white tracking-tight mb-6">Professional sport deserves professional intelligence.</h1>
          <p className="text-white/40 text-lg leading-relaxed max-w-2xl mx-auto">
            Athlete Intelligence was built after watching high-performing sports organisations make major decisions — selection, investment, partnerships — on incomplete, delayed, and often anecdotal information. That gap is now closeable.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="bg-[#0D1220] py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="text-[12px] font-semibold text-[#E75D50] uppercase tracking-widest mb-3">Mission</div>
              <h2 className="text-3xl font-bold text-white tracking-tight mb-5">Give every sports organisation access to world-class athlete intelligence.</h2>
              <p className="text-white/40 text-[14px] leading-relaxed">
                The best-resourced organisations in professional sport spend millions on scouts, analysts, and research operations. We're building the infrastructure that makes that same intelligence capacity accessible to any organisation — regardless of budget or headcount.
              </p>
            </div>
            <div className="space-y-4">
              {[
                { n: "58",     label: "Sports & disciplines covered" },
                { n: "200+",  label: "Nationality codes supported" },
                { n: "24/7",  label: "Agents running continuously" },
                { n: "< 4h",  label: "Average intelligence latency" },
              ].map((s) => (
                <div key={s.n} className="flex items-center gap-5 p-4 rounded-xl bg-[#131929] border border-white/[0.06]">
                  <div className="text-2xl font-bold text-[#E75D50] w-24 shrink-0">{s.n}</div>
                  <div className="text-[13px] text-white/50">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="bg-[#0B0F1E] py-20">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-[12px] font-semibold text-[#E75D50] uppercase tracking-widest mb-3 text-center">Our story</div>
          <h2 className="text-3xl font-bold text-white tracking-tight mb-10 text-center">Why we built this</h2>
          <div className="space-y-5 text-[15px] text-white/45 leading-relaxed">
            <p>
              The idea took shape watching a national federation miss a significant sponsorship opportunity — not because the information didn't exist, but because they simply didn't know. An athlete had changed management six weeks earlier. It was publicly announced. No one had caught it.
            </p>
            <p>
              The federation had a full-time research team. Talented people. The problem wasn't effort — it was the impossible scale of the task. One team cannot continuously monitor hundreds of athletes across dozens of competitions, media outlets, social platforms, and federation databases simultaneously. No human team can do that reliably.
            </p>
            <p>
              AI can. Persistent agents don't sleep, don't miss an update, and don't skip sources when they're busy. They surface exactly what your team needs — structured, attributed, confidence-scored, and ready to act on.
            </p>
            <p>
              We launched with a focus on track and field, where results and career data are richest, and have since expanded to 58 sports globally. The goal is the same across all of them: give every professional sports organisation the intelligence layer they've always needed but never had the resources to build.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-[#0D1220] py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-[12px] font-semibold text-[#E75D50] uppercase tracking-widest mb-3 text-center">Values</div>
          <h2 className="text-3xl font-bold text-white tracking-tight mb-12 text-center">How we think</h2>
          <div className="grid md:grid-cols-2 gap-5">
            {VALUES.map((v) => (
              <div key={v.title} className="p-6 rounded-2xl bg-[#131929] border border-white/[0.06]">
                <h3 className="text-[15px] font-semibold text-white/90 mb-3">{v.title}</h3>
                <p className="text-[13px] text-white/40 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Vision */}
      <section className="bg-[#0B0F1E] py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="text-[12px] font-semibold text-[#E75D50] uppercase tracking-widest mb-3">Vision</div>
          <h2 className="text-3xl font-bold text-white tracking-tight mb-6">Where we're headed</h2>
          <p className="text-white/40 text-[15px] leading-relaxed mb-10">
            The research teams of tomorrow will spend almost no time gathering information — and almost all their time interpreting it. Athlete Intelligence is the platform that makes that transition possible. We're building the intelligence infrastructure that professional sport has needed for decades, and making it available to every organisation that competes seriously.
          </p>
          <Link href="/contact">
            <span className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#E75D50] hover:bg-[#D04840] text-white font-semibold text-[14px] cursor-pointer transition-all shadow-[0_4px_16px_rgba(231,93,80,0.35)]">
              Book a demo →
            </span>
          </Link>
        </div>
      </section>
    </PublicLayout>
    </>
  );
}
