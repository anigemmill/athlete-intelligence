import React, { useState } from "react";
import { AppLayout } from "./_shared/AppLayout";
import "./_group.css";
import {
  Trophy, TrendingUp, TrendingDown, Users, Activity,
  Sparkles, ShieldCheck, ExternalLink, MapPin, Timer,
  Calendar, Plus, X, ChevronRight, Star, BarChart2,
  Newspaper, Award, Briefcase,
} from "lucide-react";

// ─── Athlete data ─────────────────────────────────────────────────────────────

interface AthleteData {
  id: string;
  name: string;
  initials: string;
  color: string;
  sport: string;
  event: string;
  nationality: string;
  age: number;
  squad: string;
  image: string;
  agentStatus: "active" | "paused";
  lastCrawled: string;
  // Performance
  worldRank: number | null;
  worldRankDelta: number;
  nationalRank: number;
  pb: string;
  pbRaw: number;       // normalised 0-100 for bar display
  sb: string | null;
  sbRaw: number;
  // Social
  instagram: number;
  instagramEngagement: number;
  twitter: number;
  tiktok: number;
  totalFollowers: number;
  avgEngagement: number;
  growth30d: number;
  // Intelligence
  intelligenceCount: number;
  lastActivity: string;
  activityLevel: "high" | "medium" | "low";
  // Next competition
  nextMeet: string;
  nextEvent: string;
  nextDate: string;
  nextDaysAway: number;
  nextTier: "A" | "B" | "C";
  // Recent intel
  recentIntel: { cat: string; color: string; text: string; source: string }[];
}

const roster: AthleteData[] = [
  {
    id: "lola",
    name: "Lola Anderson",
    initials: "LA",
    color: "#E75D50",
    sport: "Athletics",
    event: "100m / 200m Sprint",
    nationality: "NZL",
    age: 22,
    squad: "National Squad",
    image: "/__mockup/images/lola-anderson.jpg",
    agentStatus: "active",
    lastCrawled: "12m ago",
    worldRank: 127,
    worldRankDelta: 4,
    nationalRank: 3,
    pb: "11.24s",
    pbRaw: 94,
    sb: "11.28s",
    sbRaw: 92,
    instagram: 12400,
    instagramEngagement: 4.2,
    twitter: 3200,
    tiktok: 8900,
    totalFollowers: 24500,
    avgEngagement: 5.4,
    growth30d: 14.8,
    intelligenceCount: 6,
    lastActivity: "2 hours ago",
    activityLevel: "high",
    nextMeet: "NZ Track & Field Championships",
    nextEvent: "100m Final",
    nextDate: "28 Jul 2026",
    nextDaysAway: 10,
    nextTier: "A",
    recentIntel: [
      { cat: "Results", color: "#f59e0b", text: "1st — 100m, Sir Graeme Douglas Int'l (11.28s)", source: "athletics.org.nz" },
      { cat: "Sponsorship", color: "#10b981", text: "Puma Oceania 2-year ambassadorship confirmed", source: "sportsbusinessjournal.com" },
    ],
  },
  {
    id: "priya",
    name: "Priya Nair",
    initials: "PN",
    color: "#344F9F",
    sport: "Athletics",
    event: "5000m / 10000m",
    nationality: "NZL",
    age: 26,
    squad: "Development Squad",
    image: "",
    agentStatus: "active",
    lastCrawled: "3d ago",
    worldRank: 241,
    worldRankDelta: -2,
    nationalRank: 8,
    pb: "15:12.4",
    pbRaw: 71,
    sb: "15:18.2",
    sbRaw: 68,
    instagram: 5600,
    instagramEngagement: 2.8,
    twitter: 1800,
    tiktok: 700,
    totalFollowers: 8100,
    avgEngagement: 2.8,
    growth30d: 6.3,
    intelligenceCount: 3,
    lastActivity: "3 days ago",
    activityLevel: "medium",
    nextMeet: "World Athletics Continental Tour",
    nextEvent: "5000m Elite",
    nextDate: "4 Sep 2026",
    nextDaysAway: 48,
    nextTier: "A",
    recentIntel: [
      { cat: "Results", color: "#f59e0b", text: "Season best 15:12.4 at NZ Road Mile", source: "athletics.org.nz" },
      { cat: "Media", color: "#a855f7", text: "Featured in Athletics Weekly distance preview", source: "athleticsweekly.com" },
    ],
  },
  {
    id: "sophie",
    name: "Sophie Chen",
    initials: "SC",
    color: "#10b981",
    sport: "Athletics",
    event: "400m Hurdles",
    nationality: "NZL",
    age: 24,
    squad: "Emerging",
    image: "",
    agentStatus: "paused",
    lastCrawled: "2w ago",
    worldRank: null,
    worldRankDelta: 0,
    nationalRank: 12,
    pb: "57.42s",
    pbRaw: 62,
    sb: null,
    sbRaw: 0,
    instagram: 1800,
    instagramEngagement: 1.4,
    twitter: 400,
    tiktok: 100,
    totalFollowers: 2300,
    avgEngagement: 1.4,
    growth30d: 1.2,
    intelligenceCount: 1,
    lastActivity: "2 weeks ago",
    activityLevel: "low",
    nextMeet: "Auckland Invitational",
    nextEvent: "400m Hurdles",
    nextDate: "12 Sep 2026",
    nextDaysAway: 56,
    nextTier: "C",
    recentIntel: [
      { cat: "Career", color: "#ec4899", text: "Returning from 8-week hamstring injury absence", source: "athletics.org.nz" },
    ],
  },
  {
    id: "james",
    name: "James Kowalski",
    initials: "JK",
    color: "#7C6FA0",
    sport: "Athletics",
    event: "High Jump",
    nationality: "GBR",
    age: 23,
    squad: "National Squad",
    image: "",
    agentStatus: "active",
    lastCrawled: "1d ago",
    worldRank: 42,
    worldRankDelta: 3,
    nationalRank: 5,
    pb: "2.24m",
    pbRaw: 88,
    sb: "2.21m",
    sbRaw: 84,
    instagram: 9100,
    instagramEngagement: 3.6,
    twitter: 4400,
    tiktok: 3200,
    totalFollowers: 16700,
    avgEngagement: 3.6,
    growth30d: 4.2,
    intelligenceCount: 4,
    lastActivity: "1 day ago",
    activityLevel: "medium",
    nextMeet: "British Athletics League",
    nextEvent: "High Jump",
    nextDate: "22 Aug 2026",
    nextDaysAway: 35,
    nextTier: "B",
    recentIntel: [
      { cat: "Results", color: "#f59e0b", text: "2.21m season best at UK Athletics Open Series", source: "britishathletics.org.uk" },
      { cat: "Career", color: "#ec4899", text: "Targeting 2.26m World Champs qualifying standard", source: "athleticsweekly.com" },
    ],
  },
  {
    id: "marcus",
    name: "Marcus Webb",
    initials: "MW",
    color: "#6366f1",
    sport: "Athletics",
    event: "Decathlon",
    nationality: "AUS",
    age: 27,
    squad: "Elite",
    image: "",
    agentStatus: "active",
    lastCrawled: "6h ago",
    worldRank: 89,
    worldRankDelta: -1,
    nationalRank: 2,
    pb: "7,814 pts",
    pbRaw: 78,
    sb: "7,640 pts",
    sbRaw: 72,
    instagram: 6800,
    instagramEngagement: 2.2,
    twitter: 2100,
    tiktok: 1400,
    totalFollowers: 10300,
    avgEngagement: 2.2,
    growth30d: 3.1,
    intelligenceCount: 5,
    lastActivity: "6 hours ago",
    activityLevel: "high",
    nextMeet: "Trans-Tasman Athletics Classic",
    nextEvent: "Decathlon",
    nextDate: "3 Aug 2026",
    nextDaysAway: 16,
    nextTier: "B",
    recentIntel: [
      { cat: "Media", color: "#a855f7", text: "Interviewed on coaching change and 2026 goals", source: "athletics.com.au" },
      { cat: "Results", color: "#f59e0b", text: "7,640 pts at AUS National Open — season opener", source: "athletics.com.au" },
    ],
  },
];

const tierConfig = {
  A: { label: "Major", bg: "rgba(231,93,80,0.10)", color: "#E75D50" },
  B: { label: "Standard", bg: "rgba(52,79,159,0.10)", color: "#344F9F" },
  C: { label: "Developmental", bg: "rgba(138,144,168,0.10)", color: "#6B7080" },
};

const activityConfig = {
  high:   { label: "High", color: "#059669", bg: "rgba(16,185,129,0.10)" },
  medium: { label: "Medium", color: "#d97706", bg: "rgba(245,158,11,0.10)" },
  low:    { label: "Low", color: "#8A90A8", bg: "rgba(138,144,168,0.10)" },
};

// ─── Helper: find best in column ─────────────────────────────────────────────

function bestIdx(values: (number | null)[], higherIsBetter = true): number {
  let best = -1;
  let bestVal: number | null = null;
  values.forEach((v, i) => {
    if (v === null) return;
    if (bestVal === null || (higherIsBetter ? v > bestVal : v < bestVal)) {
      bestVal = v;
      best = i;
    }
  });
  return best;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <tr>
      <td colSpan={100} className="pt-5 pb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[#9097B0]">{icon}</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#A0A8C0]">{label}</span>
          <div className="flex-1 h-px bg-[rgba(41,48,85,0.08)]" />
        </div>
      </td>
    </tr>
  );
}

function MetricRow({
  label,
  cells,
  bestIndex = -1,
  sub,
}: {
  label: string;
  cells: React.ReactNode[];
  bestIndex?: number;
  sub?: string;
}) {
  return (
    <tr className="group">
      <td className="py-2.5 pr-4 align-middle" style={{ width: 160, minWidth: 160 }}>
        <div className="text-[12px] font-medium text-[#6B7080]">{label}</div>
        {sub && <div className="text-[10px] text-[#A0A8C0] mt-0.5">{sub}</div>}
      </td>
      {cells.map((cell, i) => (
        <td
          key={i}
          className="py-2.5 px-3 align-middle rounded-lg transition-colors"
          style={{
            background: i === bestIndex ? "rgba(16,185,129,0.06)" : undefined,
            borderLeft: i === bestIndex ? "2px solid rgba(16,185,129,0.30)" : "2px solid transparent",
          }}
        >
          <div className="flex items-center gap-1.5">
            {cell}
            {i === bestIndex && (
              <Star size={10} className="text-[#10b981] fill-current shrink-0" />
            )}
          </div>
        </td>
      ))}
    </tr>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AthleteCompare() {
  const defaultIds = ["lola", "priya", "sophie"];
  const [selectedIds, setSelectedIds] = useState<string[]>(defaultIds);
  const [showAdd, setShowAdd] = useState(false);

  const selected = selectedIds.map((id) => roster.find((a) => a.id === id)!).filter(Boolean);
  const available = roster.filter((a) => !selectedIds.includes(a.id));

  const remove = (id: string) => {
    if (selectedIds.length <= 2) return;
    setSelectedIds((prev) => prev.filter((x) => x !== id));
  };

  const add = (id: string) => {
    if (selectedIds.length >= 4) return;
    setSelectedIds((prev) => [...prev, id]);
    setShowAdd(false);
  };

  const colWidth = Math.floor((1040 - 160 - 48) / selected.length);

  return (
    <AppLayout activePage="dashboard">
      <div className="athlete-intelligence-root h-full flex flex-col bg-[#FCFAFA] overflow-hidden">
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

        {/* ── Top bar ── */}
        <div className="h-14 border-b border-[rgba(41,48,85,0.10)] flex items-center px-6 shrink-0 bg-[#FCFAFA]">
          <div className="flex items-center gap-2 text-[13px] font-medium text-[#8A90A8]">
            <BarChart2 size={14} className="text-[#9097B0]" />
            <ChevronRight size={14} className="text-[#C0C8DC]" />
            <span className="text-[#293055] font-semibold">Compare Athletes</span>
          </div>
          <div className="ml-auto text-[11px] text-[#A0A8C0]">
            Comparing <strong className="text-[#293055]">{selected.length}</strong> athletes · Public data only
          </div>
        </div>

        {/* ── Athlete selector ── */}
        <div className="px-6 py-3 border-b border-[rgba(41,48,85,0.08)] bg-[#FCFAFA] shrink-0 flex items-center gap-2 flex-wrap">
          {selected.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-2 pl-2 pr-1.5 py-1.5 rounded-xl border text-[12px] font-semibold"
              style={{ background: a.color + "12", borderColor: a.color + "30", color: a.color }}
            >
              {a.image ? (
                <img src={a.image} className="w-5 h-5 rounded-full object-cover" alt={a.name} />
              ) : (
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: a.color + "25" }}>
                  {a.initials}
                </div>
              )}
              {a.name}
              {selectedIds.length > 2 && (
                <button onClick={() => remove(a.id)} className="ml-1 opacity-50 hover:opacity-100 transition-opacity">
                  <X size={11} />
                </button>
              )}
            </div>
          ))}

          {selected.length < 4 && (
            <div className="relative">
              <button
                onClick={() => setShowAdd(!showAdd)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-[rgba(41,48,85,0.20)] text-[12px] text-[#8A90A8] hover:border-[rgba(41,48,85,0.40)] hover:text-[#293055] transition-all bg-white"
              >
                <Plus size={12} /> Add athlete
              </button>
              {showAdd && (
                <div className="absolute top-full left-0 mt-1 bg-white rounded-xl border border-[rgba(41,48,85,0.12)] shadow-xl z-50 py-2 min-w-[180px]">
                  {available.length === 0 ? (
                    <div className="px-4 py-2 text-[12px] text-[#8A90A8]">No more athletes to add</div>
                  ) : available.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => add(a.id)}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-[rgba(41,48,85,0.04)] transition-colors text-left"
                    >
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: a.color }}>
                        {a.initials}
                      </div>
                      <div>
                        <div className="text-[12px] font-semibold text-[#1C1F3A]">{a.name}</div>
                        <div className="text-[10px] text-[#9097B0]">{a.event}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto hide-scrollbar px-6 py-5">

          {/* ── AI Comparison Summary ── */}
          <div
            className="rounded-xl p-5 mb-6"
            style={{ background: "linear-gradient(135deg, #293055 0%, #1e2440 100%)" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: "rgba(231,93,80,0.20)" }}>
                <Sparkles size={12} style={{ color: "#E75D50" }} />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "#E75D50" }}>AI Comparison Summary</span>
              <span className="ml-auto text-[10px]" style={{ color: "rgba(252,250,250,0.35)" }}>Based on all available intelligence</span>
            </div>

            {selected.length === 3 && selected.map(a => a.id).sort().join() === ["lola","priya","sophie"].sort().join() ? (
              <p className="text-[13px] leading-relaxed" style={{ color: "rgba(252,250,250,0.82)" }}>
                <strong style={{ color: "#FEEEEE" }}>Lola Anderson</strong> leads this group on performance trajectory, social profile, and intelligence activity — she is the highest-ranked athlete internationally (#127) and shows the strongest commercial momentum with a confirmed Puma partnership and TikTok growth of +23.4% in 30 days. <strong style={{ color: "#FEEEEE" }}>Priya Nair</strong> is the most experienced competitor and has secured a World Athletics Continental Tour appearance, which Anderson has not yet achieved — worth monitoring for ranking impact. <strong style={{ color: "#FEEEEE" }}>Sophie Chen</strong> is currently paused due to injury and shows minimal recent intelligence activity; the Auckland Invitational in September will be the first meaningful indicator of her return to form.
              </p>
            ) : (
              <p className="text-[13px] leading-relaxed" style={{ color: "rgba(252,250,250,0.82)" }}>
                Comparing {selected.map(a => <strong key={a.id} style={{ color: "#FEEEEE" }}>{a.name}</strong>).reduce((acc, el, i) => i === 0 ? [el] : [...acc, <span key={`sep-${i}`} style={{ color: "rgba(252,250,250,0.50)" }}>{i === selected.length - 1 ? " and " : ", "}</span>, el], [] as React.ReactNode[])}. {
                  (() => {
                    const best = [...selected].sort((a, b) => (a.worldRank ?? 999) - (b.worldRank ?? 999))[0];
                    const mostFollowers = [...selected].sort((a, b) => b.totalFollowers - a.totalFollowers)[0];
                    return `${best.name} holds the strongest current world ranking. ${mostFollowers.name} leads on social reach with ${mostFollowers.totalFollowers.toLocaleString()} total followers. All intelligence is sourced from publicly available records and confidence-scored.`;
                  })()
                }
              </p>
            )}

            <div className="flex items-center gap-4 pt-3 mt-3 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
              <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "rgba(252,250,250,0.40)" }}>
                <ShieldCheck size={11} style={{ color: "#10b981" }} />
                All claims sourced and confidence-scored
              </div>
              <button className="ml-auto text-[11px] font-medium flex items-center gap-1" style={{ color: "#E75D50" }}>
                <ExternalLink size={10} /> View sources
              </button>
            </div>
          </div>

          {/* ── Comparison table ── */}
          <div className="rounded-xl border border-[rgba(41,48,85,0.09)] bg-white overflow-hidden">

            {/* Athlete header row */}
            <div className="grid border-b border-[rgba(41,48,85,0.08)]" style={{ gridTemplateColumns: `160px repeat(${selected.length}, 1fr)` }}>
              <div className="p-4 border-r border-[rgba(41,48,85,0.06)]">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#A0A8C0]">Athlete</div>
              </div>
              {selected.map((a) => (
                <div key={a.id} className="p-4 border-r border-[rgba(41,48,85,0.06)] last:border-0">
                  <div className="flex items-center gap-2.5 mb-2">
                    {a.image ? (
                      <img src={a.image} className="w-9 h-9 rounded-xl object-cover border border-[rgba(41,48,85,0.12)]" alt={a.name} />
                    ) : (
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[12px] font-bold text-white shrink-0" style={{ background: a.color }}>
                        {a.initials}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-[#1C1F3A] truncate">{a.name}</div>
                      <div className="text-[10px] text-[#8A90A8] truncate">{a.event}</div>
                    </div>
                  </div>
                  <div className="flex items-center flex-wrap gap-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: a.color + "15", color: a.color }}>{a.nationality}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(41,48,85,0.06)] text-[#6B7080]">Age {a.age}</span>
                    <span className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${a.agentStatus === "active" ? "bg-[rgba(16,185,129,0.10)] text-[#059669]" : "bg-[rgba(138,144,168,0.10)] text-[#8A90A8]"}`}>
                      <div className={`w-1 h-1 rounded-full ${a.agentStatus === "active" ? "bg-[#10b981]" : "bg-[#8A90A8]"}`} />
                      {a.agentStatus === "active" ? `Active · ${a.lastCrawled}` : "Paused"}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Table body */}
            <div className="px-4">
              <table className="w-full border-collapse">
                <tbody>

                  {/* ── PERFORMANCE ── */}
                  <SectionHeader icon={<Trophy size={13} />} label="Performance" />

                  <MetricRow
                    label="World Rank"
                    bestIndex={bestIdx(selected.map(a => a.worldRank ? -a.worldRank : null), true)}
                    cells={selected.map((a) => (
                      <div key={a.id}>
                        {a.worldRank ? (
                          <div>
                            <span className="text-[15px] font-bold text-[#1C1F3A]">#{a.worldRank}</span>
                            {a.worldRankDelta !== 0 && (
                              <span className={`ml-1.5 text-[10px] font-semibold flex items-center gap-0.5 inline-flex ${a.worldRankDelta > 0 ? "text-[#059669]" : "text-[#ef4444]"}`}>
                                {a.worldRankDelta > 0 ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                                {Math.abs(a.worldRankDelta)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[13px] text-[#C0C8DC]">—</span>
                        )}
                      </div>
                    ))}
                  />

                  <MetricRow
                    label="National Rank"
                    bestIndex={bestIdx(selected.map(a => -a.nationalRank), true)}
                    cells={selected.map((a) => (
                      <span key={a.id} className="text-[15px] font-bold text-[#1C1F3A]">#{a.nationalRank}</span>
                    ))}
                  />

                  <MetricRow
                    label="Personal Best"
                    bestIndex={bestIdx(selected.map(a => a.pbRaw), true)}
                    cells={selected.map((a) => (
                      <div key={a.id} className="w-full">
                        <div className="text-[14px] font-bold text-[#1C1F3A] mb-1">{a.pb}</div>
                        <div className="h-1.5 rounded-full bg-[rgba(41,48,85,0.08)] w-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${a.pbRaw}%`, background: a.color }} />
                        </div>
                      </div>
                    ))}
                  />

                  <MetricRow
                    label="Season Best"
                    bestIndex={bestIdx(selected.map(a => a.sbRaw || null), true)}
                    cells={selected.map((a) => (
                      a.sb
                        ? <span key={a.id} className="text-[14px] font-bold text-[#1C1F3A]">{a.sb}</span>
                        : <span key={a.id} className="text-[12px] text-[#C0C8DC]">Not yet set</span>
                    ))}
                  />

                  {/* ── SOCIAL MEDIA ── */}
                  <SectionHeader icon={<Users size={13} />} label="Social Media" />

                  <MetricRow
                    label="Total Followers"
                    bestIndex={bestIdx(selected.map(a => a.totalFollowers))}
                    cells={selected.map((a) => (
                      <div key={a.id}>
                        <span className="text-[15px] font-bold text-[#1C1F3A]">{(a.totalFollowers / 1000).toFixed(1)}K</span>
                        <div className="text-[10px] text-[#A0A8C0] mt-0.5">IG · X · TikTok</div>
                      </div>
                    ))}
                  />

                  <MetricRow
                    label="Avg Engagement"
                    sub="Across platforms"
                    bestIndex={bestIdx(selected.map(a => a.avgEngagement))}
                    cells={selected.map((a) => (
                      <span key={a.id} className={`text-[15px] font-bold ${a.avgEngagement >= 4 ? "text-[#059669]" : a.avgEngagement >= 2.5 ? "text-[#d97706]" : "text-[#8A90A8]"}`}>
                        {a.avgEngagement}%
                      </span>
                    ))}
                  />

                  <MetricRow
                    label="30-day Growth"
                    bestIndex={bestIdx(selected.map(a => a.growth30d))}
                    cells={selected.map((a) => (
                      <div key={a.id} className="flex items-center gap-1">
                        {a.growth30d > 0 ? <TrendingUp size={12} className="text-[#E75D50]" /> : <TrendingDown size={12} className="text-[#ef4444]" />}
                        <span className={`text-[15px] font-bold ${a.growth30d >= 10 ? "text-[#E75D50]" : a.growth30d >= 5 ? "text-[#d97706]" : "text-[#8A90A8]"}`}>
                          +{a.growth30d}%
                        </span>
                      </div>
                    ))}
                  />

                  {/* ── INTELLIGENCE ── */}
                  <SectionHeader icon={<Activity size={13} />} label="Intelligence Activity" />

                  <MetricRow
                    label="Items (30 days)"
                    bestIndex={bestIdx(selected.map(a => a.intelligenceCount))}
                    cells={selected.map((a) => (
                      <span key={a.id} className="text-[15px] font-bold text-[#1C1F3A]">{a.intelligenceCount}</span>
                    ))}
                  />

                  <MetricRow
                    label="Activity Level"
                    cells={selected.map((a) => {
                      const cfg = activityConfig[a.activityLevel];
                      return (
                        <span key={a.id} className="text-[11px] font-semibold px-2 py-0.5 rounded" style={{ background: cfg.bg, color: cfg.color }}>
                          {cfg.label}
                        </span>
                      );
                    })}
                  />

                  <MetricRow
                    label="Latest Update"
                    cells={selected.map((a) => (
                      <span key={a.id} className="text-[12px] text-[#6B7080]">{a.lastActivity}</span>
                    ))}
                  />

                  {/* Recent intel per athlete */}
                  <tr>
                    <td className="py-2.5 pr-4 align-top" style={{ width: 160 }}>
                      <div className="text-[12px] font-medium text-[#6B7080]">Recent Intel</div>
                    </td>
                    {selected.map((a) => (
                      <td key={a.id} className="py-2.5 px-3 align-top">
                        <div className="space-y-1.5">
                          {a.recentIntel.map((item, i) => (
                            <div key={i} className="text-[11px] text-[#6B7080] leading-snug">
                              <span className="font-semibold" style={{ color: item.color }}>{item.cat} · </span>
                              {item.text}
                            </div>
                          ))}
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* ── NEXT COMPETITION ── */}
                  <SectionHeader icon={<Calendar size={13} />} label="Next Competition" />

                  <MetricRow
                    label="Event"
                    cells={selected.map((a) => (
                      <div key={a.id}>
                        <div className="text-[12px] font-semibold text-[#1C1F3A] leading-tight">{a.nextMeet}</div>
                        <div className="text-[10px] text-[#8A90A8] mt-0.5">{a.nextEvent}</div>
                      </div>
                    ))}
                  />

                  <MetricRow
                    label="Date"
                    bestIndex={bestIdx(selected.map(a => -a.nextDaysAway))}
                    cells={selected.map((a) => (
                      <div key={a.id}>
                        <div className="text-[13px] font-bold text-[#1C1F3A]">{a.nextDate}</div>
                        <div className="text-[10px] text-[#8A90A8]">in {a.nextDaysAway} days</div>
                      </div>
                    ))}
                  />

                  <MetricRow
                    label="Competition Tier"
                    cells={selected.map((a) => {
                      const t = tierConfig[a.nextTier];
                      return (
                        <span key={a.id} className="text-[11px] font-semibold px-2 py-0.5 rounded" style={{ background: t.bg, color: t.color }}>
                          {t.label}
                        </span>
                      );
                    })}
                  />

                  <tr><td colSpan={100} className="pb-4" /></tr>

                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom disclaimer */}
          <div className="mt-4 flex items-center gap-2 text-[11px] text-[#A0A8C0]">
            <ShieldCheck size={12} />
            <span>All data sourced from publicly available records only. <Star size={9} className="inline text-[#10b981] fill-current mx-0.5" /> indicates best-in-group for each metric.</span>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
