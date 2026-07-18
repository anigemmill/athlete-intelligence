import React, { useState } from "react";
import { AppLayout } from "./_shared/AppLayout";
import "./_group.css";
import {
  Trophy, Newspaper, Award, Briefcase, Star, ChevronRight,
  ShieldCheck, ExternalLink, Filter, Clock, MapPin, TrendingUp,
  Flag, Users, Activity,
} from "lucide-react";

// ─── Types & data ─────────────────────────────────────────────────────────────

type EventCategory = "result" | "ranking" | "career" | "sponsorship" | "media" | "award" | "selection";

interface TimelineEvent {
  id: string;
  date: string;
  dateISO: string;
  year: number;
  category: EventCategory;
  title: string;
  description: string;
  location?: string;
  source: string;
  sourceDomain: string;
  confidence: number;
  significant: boolean;
}

const eventConfig: Record<EventCategory, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  result:      { label: "Competition Result",  color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.25)",  icon: <Trophy size={12} /> },
  ranking:     { label: "Ranking Update",      color: "#344F9F", bg: "rgba(52,79,159,0.10)",   border: "rgba(52,79,159,0.22)",   icon: <TrendingUp size={12} /> },
  career:      { label: "Career Change",       color: "#ec4899", bg: "rgba(236,72,153,0.10)",  border: "rgba(236,72,153,0.22)",  icon: <Briefcase size={12} /> },
  sponsorship: { label: "Sponsorship",         color: "#10b981", bg: "rgba(16,185,129,0.10)",  border: "rgba(16,185,129,0.22)",  icon: <Award size={12} /> },
  media:       { label: "Media Appearance",    color: "#a855f7", bg: "rgba(168,85,247,0.10)",  border: "rgba(168,85,247,0.22)",  icon: <Newspaper size={12} /> },
  award:       { label: "Award",               color: "#E75D50", bg: "rgba(231,93,80,0.10)",   border: "rgba(231,93,80,0.22)",   icon: <Star size={12} /> },
  selection:   { label: "Selection",           color: "#0ea5e9", bg: "rgba(14,165,233,0.10)",  border: "rgba(14,165,233,0.22)",  icon: <Users size={12} /> },
};

const events: TimelineEvent[] = [
  // 2024
  { id: "e1", date: "14 Mar 2024", dateISO: "2024-03-14", year: 2024, category: "result",
    title: "1st — 100m Final, Sir Graeme Douglas International",
    description: "Season-opening victory in 11.28s (+1.2m/s). Dominant from the blocks; clearest indicator of improved explosive phase from the Liti-coached programme.",
    location: "Auckland, NZ", source: "athletics.org.nz", sourceDomain: "athletics.org.nz", confidence: 99, significant: true },
  { id: "e2", date: "12 Mar 2024", dateISO: "2024-03-12", year: 2024, category: "media",
    title: "NZ Herald exclusive interview — Olympic qualification pathway",
    description: "Feature interview discussing the move to AUT Millennium, biomechanical analysis investment, and qualification targets for the 2026 Games.",
    source: "nzherald.co.nz", sourceDomain: "nzherald.co.nz", confidence: 95, significant: false },
  { id: "e3", date: "05 Mar 2024", dateISO: "2024-03-05", year: 2024, category: "sponsorship",
    title: "Puma Athletics Oceania — 2-year ambassadorship",
    description: "Signed a regional ambassadorship with Puma covering the Oceania market. First major commercial agreement. Contract length 2 years.",
    source: "sportsbusinessjournal.com", sourceDomain: "sportsbusinessjournal.com", confidence: 88, significant: true },
  { id: "e4", date: "28 Feb 2024", dateISO: "2024-02-28", year: 2024, category: "career",
    title: "Coaching change — joined David Liti, AUT Millennium",
    description: "Official registration confirmed the transfer to David Liti's elite sprint programme at AUT Millennium. Former national sprint coach; produced three Oceania medallists.",
    source: "athletics.org.nz", sourceDomain: "athletics.org.nz", confidence: 100, significant: true },
  { id: "e5", date: "15 Jan 2024", dateISO: "2024-01-15", year: 2024, category: "selection",
    title: "Named in Athletics NZ High Performance Squad 2024",
    description: "Selected as part of the national HP sprint squad for the 2024 season — first inclusion at this level.",
    source: "athletics.org.nz", sourceDomain: "athletics.org.nz", confidence: 100, significant: true },
  // 2023
  { id: "e6", date: "20 Feb 2024", dateISO: "2024-02-20", year: 2024, category: "result",
    title: "3rd — 200m, Sydney Track Classic",
    description: "Bronze finish in 23.15s against a strong international field including Australia's top sprinters. Established international credibility outside NZ.",
    location: "Sydney, AUS", source: "athletics.com.au", sourceDomain: "athletics.com.au", confidence: 98, significant: false },
  { id: "e7", date: "28 Nov 2023", dateISO: "2023-11-28", year: 2023, category: "result",
    title: "Personal Best — 11.24s, NZ Track & Field Championships",
    description: "New personal best in the 100m final. First sub-11.25s performance. Ranked her 3rd nationally and moved her to #156 on the World Athletics list.",
    location: "Wellington, NZ", source: "athletics.org.nz", sourceDomain: "athletics.org.nz", confidence: 100, significant: true },
  { id: "e8", date: "Oct 2023", dateISO: "2023-10-01", year: 2023, category: "ranking",
    title: "Moved to World Rank #156 — 100m Women",
    description: "World Athletics ranking update following the NZ championships. First appearance in the World Athletics rankings top-200.",
    source: "worldathletics.org", sourceDomain: "worldathletics.org", confidence: 99, significant: false },
  { id: "e9", date: "Aug 2023", dateISO: "2023-08-01", year: 2023, category: "result",
    title: "Silver — 100m, Oceania Athletics Championships",
    description: "First major international podium. 11.31s on a day with unfavourable conditions (−0.3m/s). Established as a regional medal contender.",
    location: "Suva, FJI", source: "oceansathletics.org", sourceDomain: "oceansathletics.org", confidence: 96, significant: true },
  { id: "e10", date: "Jun 2023", dateISO: "2023-06-01", year: 2023, category: "sponsorship",
    title: "Nike Oceania kit deal — commenced",
    description: "Equipment and apparel partnership with Nike Oceania confirmed. Relationship ran until December 2023.",
    source: "athleticsweekly.com", sourceDomain: "athleticsweekly.com", confidence: 82, significant: false },
  { id: "e11", date: "Mar 2023", dateISO: "2023-03-01", year: 2023, category: "career",
    title: "Joined Elite Sport Management NZ",
    description: "Management representation formalised with Elite Sport Management NZ. James Whitfield confirmed as primary manager.",
    source: "athletics.org.nz", sourceDomain: "athletics.org.nz", confidence: 97, significant: false },
  // 2022
  { id: "e12", date: "Nov 2022", dateISO: "2022-11-01", year: 2022, category: "award",
    title: "Athletics NZ — Emerging Athlete of the Year (shortlisted)",
    description: "Shortlisted for the ANZ Emerging Athlete of the Year award. Did not win but acknowledged as a prospect at national level for the first time.",
    source: "athletics.org.nz", sourceDomain: "athletics.org.nz", confidence: 94, significant: false },
  { id: "e13", date: "Sep 2022", dateISO: "2022-09-01", year: 2022, category: "result",
    title: "1st — 100m, NZ Junior Championships",
    description: "Dominant junior national title win in 11.48s. First national championship gold. Prompted first national HP squad consideration.",
    location: "Christchurch, NZ", source: "athletics.org.nz", sourceDomain: "athletics.org.nz", confidence: 100, significant: true },
  { id: "e14", date: "Mar 2022", dateISO: "2022-03-01", year: 2022, category: "selection",
    title: "Selected for NZ Junior squad — Pacific Games preparation",
    description: "First national representative selection. Junior squad for Pacific Games preparation programme.",
    source: "athletics.org.nz", sourceDomain: "athletics.org.nz", confidence: 98, significant: false },
];

const categoryFilters: { id: EventCategory | "all"; label: string }[] = [
  { id: "all", label: "All Events" },
  { id: "result", label: "Results" },
  { id: "ranking", label: "Rankings" },
  { id: "career", label: "Career" },
  { id: "sponsorship", label: "Sponsorships" },
  { id: "media", label: "Media" },
  { id: "award", label: "Awards" },
  { id: "selection", label: "Selections" },
];

// ─── Main component ───────────────────────────────────────────────────────────

export function CareerTimeline() {
  const [filter, setFilter] = useState<EventCategory | "all">("all");
  const [selectedId, setSelectedId] = useState("e1");

  const selected = events.find((e) => e.id === selectedId) || events[0];
  const selectedConfig = eventConfig[selected.category];

  const filtered = filter === "all" ? events : events.filter((e) => e.category === filter);

  const years = Array.from(new Set(filtered.map((e) => e.year))).sort((a, b) => b - a);

  return (
    <AppLayout activePage="feed">
      <div className="athlete-intelligence-root h-full flex flex-col bg-[#FCFAFA] overflow-hidden">
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

        {/* ── Breadcrumb ── */}
        <div className="h-14 border-b border-[rgba(41,48,85,0.10)] flex items-center px-6 shrink-0 bg-[#FCFAFA]">
          <div className="flex items-center gap-2 text-[13px] font-medium text-[#8A90A8]">
            <span className="hover:text-[#3D426A] cursor-pointer transition-colors">Lola Anderson</span>
            <ChevronRight size={14} className="text-[#C0C8DC]" />
            <span className="text-[#293055]">Career Timeline</span>
          </div>
          <div className="ml-auto flex items-center gap-2 text-[11px] text-[#A0A8C0]">
            <Activity size={12} />
            <span><strong className="text-[#293055]">{events.length}</strong> events · sourced from <strong className="text-[#293055]">12</strong> domains</span>
          </div>
        </div>

        {/* ── Profile strip + filter ── */}
        <div className="px-6 py-3 border-b border-[rgba(41,48,85,0.08)] bg-gradient-to-r from-[#F5F0F0] to-[#FCFAFA] shrink-0">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-[rgba(41,48,85,0.12)] shadow shrink-0 bg-[#E8E0E0]">
              <img src="/__mockup/images/lola-anderson.jpg" className="w-full h-full object-cover" alt="Lola Anderson" />
            </div>
            <div>
              <div className="text-[14px] font-semibold text-[#1C1F3A]">Lola Anderson</div>
              <div className="text-[11px] text-[#8A90A8]">100m / 200m Sprint · Athletics NZ · Career from 2022</div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {[
                { cat: "result", count: events.filter(e => e.category === "result").length, color: "#f59e0b" },
                { cat: "career", count: events.filter(e => e.category === "career").length, color: "#ec4899" },
                { cat: "sponsorship", count: events.filter(e => e.category === "sponsorship").length, color: "#10b981" },
              ].map(({ cat, count, color }) => (
                <div key={cat} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-[rgba(41,48,85,0.09)] text-[11px]">
                  <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                  <span className="font-semibold text-[#293055]">{count}</span>
                  <span className="text-[#9097B0] capitalize">{cat}s</span>
                </div>
              ))}
            </div>
          </div>

          {/* Category filter chips */}
          <div className="flex items-center gap-2 flex-wrap">
            {categoryFilters.map(({ id, label }) => {
              const isActive = filter === id;
              const config = id !== "all" ? eventConfig[id as EventCategory] : null;
              return (
                <button
                  key={id}
                  onClick={() => setFilter(id as EventCategory | "all")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border ${
                    isActive
                      ? "border-[#293055] bg-[#293055] text-white"
                      : "border-[rgba(41,48,85,0.12)] bg-white text-[#6B7080] hover:border-[rgba(41,48,85,0.25)]"
                  }`}
                >
                  {config && <span style={{ color: isActive ? "white" : config.color }}>{config.icon}</span>}
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Main content ── */}
        <div className="flex-1 flex overflow-hidden">

          {/* Left: Timeline */}
          <div className="flex flex-col border-r border-[rgba(41,48,85,0.10)] overflow-y-auto hide-scrollbar" style={{ width: 500 }}>
            <div className="px-6 py-4">
              {years.map((year) => {
                const yearEvents = filtered.filter((e) => e.year === year);
                return (
                  <div key={year} className="mb-8">
                    {/* Year marker */}
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className="px-3 py-1 rounded-full text-[12px] font-bold text-white"
                        style={{ background: "#293055" }}
                      >
                        {year}
                      </div>
                      <div className="flex-1 h-px bg-[rgba(41,48,85,0.10)]" />
                      <span className="text-[11px] text-[#A0A8C0]">{yearEvents.length} event{yearEvents.length !== 1 ? "s" : ""}</span>
                    </div>

                    {/* Events for this year */}
                    <div className="relative ml-2">
                      {/* Vertical line */}
                      <div className="absolute left-3 top-2 bottom-2 w-px bg-[rgba(41,48,85,0.10)]" />

                      <div className="space-y-3">
                        {yearEvents.map((ev) => {
                          const cfg = eventConfig[ev.category];
                          const isSelected = ev.id === selectedId;
                          return (
                            <button
                              key={ev.id}
                              onClick={() => setSelectedId(ev.id)}
                              className={`relative w-full text-left pl-10 pr-4 py-3.5 rounded-xl border transition-all ${
                                isSelected
                                  ? "bg-[#FEEEEE] border-[rgba(231,93,80,0.22)]"
                                  : "bg-white border-[rgba(41,48,85,0.08)] hover:border-[rgba(41,48,85,0.18)]"
                              }`}
                            >
                              {/* Dot */}
                              <div
                                className="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center border-2 border-[#FCFAFA] z-10"
                                style={{ background: ev.significant ? cfg.color : cfg.bg, color: ev.significant ? "white" : cfg.color }}
                              >
                                {cfg.icon}
                              </div>

                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                    <span
                                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                                      style={{ background: cfg.bg, color: cfg.color }}
                                    >
                                      {cfg.label}
                                    </span>
                                    {ev.significant && (
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[rgba(231,93,80,0.10)] text-[#E75D50]">
                                        Key milestone
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[12px] font-semibold text-[#1C1F3A] leading-snug mt-0.5">{ev.title}</div>
                                  <div className="flex items-center gap-1.5 mt-1 text-[10px] text-[#9097B0]">
                                    <Clock size={9} />
                                    <span>{ev.date}</span>
                                    {ev.location && <>
                                      <span className="text-[#C0C8DC]">·</span>
                                      <MapPin size={9} />
                                      <span>{ev.location}</span>
                                    </>}
                                  </div>
                                </div>
                                <div className="shrink-0 flex items-center gap-1 text-[10px] text-[#A0A8C0]">
                                  <ShieldCheck size={9} />
                                  {ev.confidence}%
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Selected event detail */}
          <div className="flex-1 overflow-y-auto hide-scrollbar px-8 py-6">

            <div className="flex items-center gap-2 mb-2">
              <span
                className="flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded border"
                style={{ background: selectedConfig.bg, color: selectedConfig.color, borderColor: selectedConfig.border }}
              >
                {selectedConfig.icon}
                {selectedConfig.label}
              </span>
              {selected.significant && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[rgba(231,93,80,0.10)] text-[#E75D50] border border-[rgba(231,93,80,0.20)]">
                  Key milestone
                </span>
              )}
            </div>

            <h2 className="text-[20px] font-semibold text-[#1C1F3A] leading-tight mb-1">{selected.title}</h2>

            <div className="flex items-center gap-3 text-[12px] text-[#8A90A8] mb-5">
              <div className="flex items-center gap-1"><Clock size={12} />{selected.date}</div>
              {selected.location && <><span className="text-[#C0C8DC]">·</span><div className="flex items-center gap-1"><MapPin size={12} />{selected.location}</div></>}
            </div>

            {/* Confidence metadata */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: "Confidence Score", value: `${selected.confidence}%`, sub: selected.confidence >= 95 ? "High confidence" : "Moderate confidence" },
                { label: "Source Domain", value: selected.sourceDomain, sub: "Primary source" },
                { label: "Verification", value: selected.confidence >= 95 ? "Verified" : "Unconfirmed", sub: selected.date },
              ].map((m) => (
                <div key={m.label} className="rounded-xl border border-[rgba(41,48,85,0.09)] bg-white p-4">
                  <div className="text-[10px] text-[#9097B0] font-medium mb-1">{m.label}</div>
                  <div className="text-[14px] font-bold text-[#1C1F3A]">{m.value}</div>
                  <div className="text-[10px] text-[#A0A8C0] mt-0.5">{m.sub}</div>
                </div>
              ))}
            </div>

            {/* Description */}
            <div className="rounded-xl border border-[rgba(41,48,85,0.09)] bg-white p-5 mb-4">
              <div className="text-[11px] font-bold uppercase tracking-widest text-[#A0A8C0] mb-2">Event Summary</div>
              <p className="text-[14px] text-[#3D426A] leading-relaxed">{selected.description}</p>
            </div>

            {/* Source */}
            <div className="rounded-xl border border-[rgba(41,48,85,0.09)] bg-white p-5 mb-4">
              <div className="text-[11px] font-bold uppercase tracking-widest text-[#A0A8C0] mb-3">Supporting Evidence</div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-6 h-6 rounded flex items-center justify-center bg-[rgba(41,48,85,0.06)]">
                  <ExternalLink size={11} className="text-[#9097B0]" />
                </div>
                <span className="text-[13px] font-semibold text-[#344F9F]">{selected.sourceDomain}</span>
                <span className="ml-auto text-[11px] text-[#A0A8C0]">{selected.date}</span>
              </div>
              <p className="text-[12px] text-[#7A8090] leading-relaxed border-l-2 border-[#DCE2EF] pl-3 italic">
                "{selected.source} — result and details confirmed at the time of event completion. All data sourced from publicly available records."
              </p>
              <a href="#" className="mt-2 inline-flex items-center gap-1 text-[11px] text-[#9097B0] hover:text-[#E75D50] transition-colors">
                <ExternalLink size={10} /> View original source
              </a>
            </div>

            {/* Disclaimer */}
            <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: "rgba(41,48,85,0.04)", border: "1px solid rgba(41,48,85,0.08)" }}>
              <Flag size={13} className="text-[#9097B0] mt-0.5 shrink-0" />
              <p className="text-[12px] text-[#8A90A8] leading-relaxed">
                Every timeline event is supported by at least one publicly available source. No events are inferred without evidence. <button className="text-[#E75D50] font-medium">Report an inaccuracy →</button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
