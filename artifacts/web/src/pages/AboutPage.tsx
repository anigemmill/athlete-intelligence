import React from "react";
import { Link } from "wouter";
import { PublicLayout } from "@/components/layout/PublicLayout";

const VALUES = [
  { title: "Intelligence over data", desc: "Raw data is noise. We build systems that transform it into decisions. Every insight is structured, sourced, and scored for confidence." },
  { title: "Transparency by design", desc: "Every intelligence item carries its source and timestamp. Our AI explains its reasoning. You always know where information came from." },
  { title: "Speed as a feature", desc: "In professional sport, timing matters. Our agents surface intelligence within hours — not days, not weeks." },
  { title: "Built for professionals", desc: "We design for analysts, performance directors, and federation chiefs who have no time for tools that don't immediately earn their trust." },
];

export default function AboutPage() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="bg-[#0B0F1E] pt-24 pb-20 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-[#293055]/30 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <div className="text-[12px] font-semibold text-[#E75D50] uppercase tracking-widest mb-3">About</div>
          <h1 className="text-5xl font-bold text-white tracking-tight mb-6">People buy B2B software from people.</h1>
          <p className="text-white/40 text-lg leading-relaxed max-w-2xl mx-auto">
            Athlete Intelligence was built by someone who spent years watching sports organisations make major talent decisions with incomplete, slow, and often anecdotal information. We think that's a solvable problem.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="bg-[#0D1220] py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="text-[12px] font-semibold text-[#E75D50] uppercase tracking-widest mb-3">Mission</div>
              <h2 className="text-3xl font-bold text-white tracking-tight mb-5">Give every sports organisation an unfair advantage in athlete intelligence.</h2>
              <p className="text-white/40 text-[14px] leading-relaxed">
                The biggest sports organisations in the world spend millions on scouts, analysts, and research teams. We're building the infrastructure that makes that level of insight accessible to any organisation — regardless of budget or staff size.
              </p>
            </div>
            <div className="space-y-4">
              {[
                { n: "200+", label: "Sports & disciplines supported" },
                { n: "200+", label: "Countries & territories covered" },
                { n: "24/7", label: "Agents running continuously" },
                { n: "< 4 hrs", label: "Average intelligence latency" },
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
              The idea came from watching a national federation miss a sponsorship opportunity because they didn't know an athlete had changed management — a fact that had been public for six weeks.
            </p>
            <p>
              The same federation had a full-time research team. The information was out there. The problem wasn't effort — it was scale. One team can't monitor hundreds of athletes across dozens of competitions, media outlets, and social platforms simultaneously. No human team can.
            </p>
            <p>
              AI can. And that's the core insight behind Athlete Intelligence. Persistent agents don't sleep, don't miss updates, and don't forget to check a source. They surface exactly what your team needs — structured, attributed, and ready to act on.
            </p>
            <p>
              We started in athletics — the Olympic sport where results, rankings, and career data are richest. We're now expanding to every major sport, building the intelligence layer that professional sport has always needed but never had.
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
            In five years, we believe every professional sports organisation in the world will run on an intelligence layer like this. Today's research teams will spend less time searching and more time deciding. Athlete Intelligence will be the platform that makes that possible.
          </p>
          <Link href="/contact">
            <span className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#E75D50] hover:bg-[#D04840] text-white font-semibold text-[14px] cursor-pointer transition-all shadow-[0_4px_16px_rgba(231,93,80,0.35)]">
              Start the conversation →
            </span>
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}
