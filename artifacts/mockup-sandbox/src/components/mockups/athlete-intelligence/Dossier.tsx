import React, { useState } from "react";
import { AppLayout } from "./_shared/AppLayout";
import "./_group.css";
import {
  MapPin,
  Trophy,
  Bell,
  Newspaper,
  Award,
  Briefcase,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  Activity,
  TrendingUp,
  TrendingDown,
  Users,
  Globe,
  Star,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  BarChart2,
  Link2,
  Timer,
  Calendar,
  Download,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type DossierTab = "overview" | "performance" | "relationships" | "media" | "timeline" | "contacts";

// ─── Data ────────────────────────────────────────────────────────────────────

const socialPlatforms = [
  {
    name: "Instagram",
    handle: "@lolaanderson_nz",
    followers: "12,400",
    followersRaw: 12400,
    engagement: "4.2%",
    engagementGood: true,
    change: "+8.3%",
    changePositive: true,
    changeLabel: "30-day growth",
    sparkline: [60, 62, 65, 63, 70, 74, 72, 78, 80, 83, 85, 100],
    color: "#E75D50",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
      </svg>
    ),
  },
  {
    name: "X",
    handle: "@lola_anderson",
    followers: "3,200",
    followersRaw: 3200,
    engagement: "1.8%",
    engagementGood: false,
    change: "+2.1%",
    changePositive: true,
    changeLabel: "30-day growth",
    sparkline: [80, 78, 82, 79, 83, 85, 84, 86, 85, 88, 90, 100],
    color: "#344F9F",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
  },
  {
    name: "TikTok",
    handle: "@lolasprints",
    followers: "8,900",
    followersRaw: 8900,
    engagement: "6.7%",
    engagementGood: true,
    change: "+23.4%",
    changePositive: true,
    changeLabel: "30-day growth",
    sparkline: [30, 35, 40, 45, 50, 58, 65, 72, 80, 88, 95, 100],
    color: "#10b981",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.73a4.84 4.84 0 01-1.01-.04z"/>
      </svg>
    ),
  },
];

const verifiedContacts = [
  {
    role: "Athlete Manager",
    name: "James Whitfield",
    org: "Elite Sport Management NZ",
    source: "athleticsNZ.co.nz",
    verified: "12 Mar 2024",
    confidence: 97,
    status: "verified",
    link: true,
  },
  {
    role: "National Sporting Organisation",
    name: "Athletics New Zealand",
    org: "High Performance Programme",
    source: "athletics.org.nz",
    verified: "01 Mar 2024",
    confidence: 100,
    status: "verified",
    link: true,
  },
  {
    role: "Primary Sponsor Contact",
    name: "Puma Athletics Oceania",
    org: "Commercial Partnerships",
    source: "sportsbusinessjournal.com",
    verified: "06 Mar 2024",
    confidence: 88,
    status: "unconfirmed",
    link: false,
  },
];

const recentIntelligence = [
  {
    category: "result",
    label: "Results & Rankings",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.10)",
    summary: "1st place, 100m final — Sir Graeme Douglas International (11.28s, +1.2m/s)",
    timestamp: "2 hours ago",
    confidence: 99,
    source: "athletics.org.nz",
  },
  {
    category: "media",
    label: "Media & Interviews",
    color: "#a855f7",
    bg: "rgba(168,85,247,0.10)",
    summary: "Featured in NZ Herald exclusive on Olympic qualification pathways.",
    timestamp: "1 day ago",
    confidence: 95,
    source: "nzherald.co.nz",
  },
  {
    category: "sponsorship",
    label: "Sponsorships",
    color: "#10b981",
    bg: "rgba(16,185,129,0.10)",
    summary: "2-year regional ambassadorship confirmed with Puma Athletics Oceania.",
    timestamp: "1 week ago",
    confidence: 88,
    source: "sportsbusinessjournal.com",
  },
];

const performanceStats = [
  { label: "World Rank", value: "#127", sub: "100m Women", delta: "+4", deltaUp: true },
  { label: "NZ Rank", value: "#3", sub: "100m Women", delta: "↑1 this season", deltaUp: true },
  { label: "100m PB", value: "11.24s", sub: "+1.2m/s conditions", delta: "Season best", deltaUp: false },
  { label: "200m SB", value: "23.15s", sub: "Sydney Track Classic", delta: "Season best", deltaUp: false },
];

const Sparkline = ({ data, color }: { data: number[]; color: string }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 28;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <polyline points={pts} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={w} cy={h - ((data[data.length - 1] - min) / range) * h} r="2.5" fill={color} />
    </svg>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

export function Dossier() {
  const [activeTab, setActiveTab] = useState<DossierTab>("overview");

  const tabs: { id: DossierTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "performance", label: "Performance" },
    { id: "relationships", label: "Relationships" },
    { id: "media", label: "Media" },
    { id: "timeline", label: "Timeline" },
    { id: "contacts", label: "Contacts" },
  ];

  return (
    <AppLayout activePage="feed">
      <div className="athlete-intelligence-root h-full flex flex-col bg-[#FCFAFA] overflow-hidden">
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

        {/* ── Breadcrumb ── */}
        <div className="h-14 border-b border-[rgba(41,48,85,0.10)] flex items-center px-6 shrink-0 bg-[#FCFAFA]">
          <div className="flex items-center gap-2 text-[13px] font-medium text-[#8A90A8]">
            <span className="hover:text-[#3D426A] cursor-pointer transition-colors">Athletics NZ</span>
            <ChevronRight size={14} className="text-[#C0C8DC]" />
            <span className="hover:text-[#3D426A] cursor-pointer transition-colors">Monitored Athletes</span>
            <ChevronRight size={14} className="text-[#C0C8DC]" />
            <span className="text-[#293055]">Lola Anderson</span>
            <ChevronRight size={14} className="text-[#C0C8DC]" />
            <span className="text-[#E75D50] font-semibold">Intelligence Dossier</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto hide-scrollbar">

          {/* ── Hero ── */}
          <div className="px-8 py-7 border-b border-[rgba(41,48,85,0.10)] bg-gradient-to-b from-[#F5F0F0] to-[#FCFAFA] shrink-0">
            <div className="max-w-6xl mx-auto flex items-start justify-between gap-6">

              {/* Left: athlete identity */}
              <div className="flex gap-5">
                <div className="w-20 h-20 rounded-2xl overflow-hidden border border-[rgba(41,48,85,0.15)] shadow-xl shrink-0 bg-[#E8E0E0]">
                  <img src="/__mockup/images/lola-anderson.jpg" className="w-full h-full object-cover" alt="Lola Anderson" />
                </div>
                <div className="flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-1.5">
                    <h1 className="text-[24px] font-semibold text-[#1C1F3A] tracking-tight leading-none">Lola Anderson</h1>
                    <span className="px-2 py-0.5 rounded-md bg-[rgba(231,93,80,0.10)] text-[#344F9F] text-[11px] font-semibold tracking-wide border border-[rgba(231,93,80,0.18)]">
                      National Squad
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-[rgba(16,185,129,0.10)] text-[#059669] text-[11px] font-semibold border border-[rgba(16,185,129,0.20)]">
                      Olympic Pathway
                    </span>
                  </div>
                  <div className="text-[13px] text-[#7A8090] mb-3 flex items-center gap-2 font-medium">
                    <span>100m / 200m Sprint</span>
                    <span className="w-1 h-1 rounded-full bg-[#C0C8DC]" />
                    <MapPin size={12} className="text-[#9097B0]" />
                    <span>New Zealand · Age 22</span>
                    <span className="w-1 h-1 rounded-full bg-[#C0C8DC]" />
                    <span>Athletics NZ</span>
                  </div>
                  {/* Inline perf stats */}
                  <div className="flex items-center gap-5">
                    {performanceStats.map((s) => (
                      <div key={s.label} className="flex flex-col">
                        <span className="text-[11px] text-[#9097B0] font-medium">{s.label}</span>
                        <span className="text-[16px] font-bold text-[#1C1F3A] leading-tight">{s.value}</span>
                        <span className="text-[10px] text-[#9097B0]">{s.sub}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: actions + agent status */}
              <div className="flex flex-col items-end gap-3 shrink-0">
                <div className="flex items-center gap-2 text-[11px] text-[#8A90A8] font-medium border border-[rgba(41,48,85,0.10)] rounded-full px-3 py-1 bg-white">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                  Agent Active · Last crawled 12m ago
                </div>
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[rgba(41,48,85,0.08)] border border-[rgba(41,48,85,0.12)] text-[#293055] text-[13px] font-medium shadow-sm">
                    <Download size={13} className="text-[#7A8090]" />
                    Export Dossier
                  </button>
                  <button className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#E75D50] text-white text-[13px] font-medium shadow-sm">
                    <Bell size={13} />
                    Configure Alerts
                  </button>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-[#8A90A8]">
                  <Sparkles size={11} className="text-[#A0A8C0]" />
                  Dossier generated from <span className="text-[#293055] font-semibold">47 sources</span> · Updated 12m ago
                </div>
              </div>
            </div>
          </div>

          {/* ── Tab bar ── */}
          <div className="border-b border-[rgba(41,48,85,0.10)] px-8 bg-[#FCFAFA] shrink-0">
            <div className="max-w-6xl mx-auto flex items-center gap-6">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`pb-3 pt-3 text-[13px] font-medium transition-colors relative ${
                      isActive ? "text-[#293055]" : "text-[#8A90A8] hover:text-[#6B7080]"
                    }`}
                  >
                    {tab.label}
                    {isActive && <div className="tab-active-indicator" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Overview tab content ── */}
          {activeTab === "overview" && (
            <div className="max-w-6xl mx-auto w-full px-8 py-6">
              <div className="grid grid-cols-3 gap-5">

                {/* ── Left column (2/3) ── */}
                <div className="col-span-2 space-y-5">

                  {/* AI Intelligence Summary */}
                  <div
                    className="rounded-xl p-5"
                    style={{ background: "linear-gradient(135deg, #293055 0%, #1e2440 100%)" }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "rgba(231,93,80,0.20)" }}>
                        <Sparkles size={12} style={{ color: "#E75D50" }} />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "#E75D50" }}>
                        AI Intelligence Summary
                      </span>
                      <span className="ml-auto text-[10px]" style={{ color: "rgba(252,250,250,0.35)" }}>
                        Generated from 47 sources · 12m ago
                      </span>
                    </div>
                    <p className="text-[14px] leading-relaxed mb-4" style={{ color: "rgba(252,250,250,0.85)" }}>
                      Lola Anderson is a 22-year-old New Zealand sprinter currently ranked 3rd nationally in the 100m. She is on an accelerating performance trajectory, having posted a personal best of 11.24s in March 2024 and demonstrated consistent sub-11.30s form throughout the domestic season. She recently transferred her primary coaching relationship to David Liti at AUT Millennium — a move that signals intent to enter a structured Olympic pathway programme.
                    </p>
                    <p className="text-[14px] leading-relaxed mb-4" style={{ color: "rgba(252,250,250,0.70)" }}>
                      Commercial activity has increased significantly: a 2-year Puma Oceania ambassadorship was confirmed in early March. Growing media presence — including an NZ Herald exclusive — suggests a deliberate strategy to build public profile ahead of the 2026 Oceania Athletics Championships.
                    </p>
                    <div className="flex items-center gap-4 pt-3 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                      <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "rgba(252,250,250,0.40)" }}>
                        <ShieldCheck size={12} style={{ color: "#10b981" }} />
                        <span>High confidence — corroborated across 12 domains</span>
                      </div>
                      <button className="ml-auto text-[11px] font-medium flex items-center gap-1" style={{ color: "#E75D50" }}>
                        <ExternalLink size={11} /> View all sources
                      </button>
                    </div>
                  </div>

                  {/* Recent Intelligence */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-[13px] font-semibold text-[#1C1F3A]">Recent Intelligence</h3>
                      <button className="text-[12px] text-[#E75D50] font-medium">View full feed →</button>
                    </div>
                    <div className="space-y-3">
                      {recentIntelligence.map((item, i) => (
                        <div key={i} className="rounded-xl border border-[rgba(41,48,85,0.09)] bg-white p-4 flex items-start gap-3">
                          <div
                            className="px-2 py-1 rounded text-[10px] font-semibold shrink-0 mt-0.5"
                            style={{ background: item.bg, color: item.color }}
                          >
                            {item.label}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-[#293055] leading-snug">{item.summary}</p>
                            <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[#8A90A8]">
                              <span>{item.timestamp}</span>
                              <span className="text-[#C0C8DC]">·</span>
                              <ExternalLink size={10} />
                              <span>{item.source}</span>
                              <span className="text-[#C0C8DC]">·</span>
                              <ShieldCheck size={10} className={item.confidence >= 95 ? "text-[#E75D50]" : "text-[#10b981]"} />
                              <span>{item.confidence}%</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Performance Snapshot */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-[13px] font-semibold text-[#1C1F3A]">Performance Snapshot</h3>
                      <button className="text-[12px] text-[#E75D50] font-medium">Full analysis →</button>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      {performanceStats.map((s) => (
                        <div key={s.label} className="rounded-xl border border-[rgba(41,48,85,0.09)] bg-white p-4">
                          <div className="text-[11px] text-[#9097B0] font-medium mb-1">{s.label}</div>
                          <div className="text-[22px] font-bold text-[#1C1F3A] leading-tight mb-0.5">{s.value}</div>
                          <div className="text-[10px] text-[#A0A8C0]">{s.sub}</div>
                          <div className={`text-[10px] font-semibold mt-1.5 flex items-center gap-1 ${s.deltaUp ? "text-[#E75D50]" : "text-[#8A90A8]"}`}>
                            {s.deltaUp && <TrendingUp size={10} />}
                            {s.delta}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── Right column (1/3) ── */}
                <div className="space-y-5">

                  {/* Social Media */}
                  <div className="rounded-xl border border-[rgba(41,48,85,0.09)] bg-white p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Users size={13} className="text-[#9097B0]" />
                      <h3 className="text-[13px] font-semibold text-[#1C1F3A]">Social Media</h3>
                      <span className="ml-auto text-[10px] text-[#A0A8C0]">Public data only</span>
                    </div>
                    <div className="space-y-4">
                      {socialPlatforms.map((p) => (
                        <div key={p.name} className="pb-4 border-b border-[rgba(41,48,85,0.07)] last:border-0 last:pb-0">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: p.color + "18", color: p.color }}>
                                {p.icon}
                              </div>
                              <div>
                                <div className="text-[12px] font-semibold text-[#1C1F3A]">{p.name}</div>
                                <div className="text-[10px] text-[#9097B0]">{p.handle}</div>
                              </div>
                            </div>
                            <Sparkline data={p.sparkline} color={p.color} />
                          </div>
                          <div className="grid grid-cols-3 gap-2 mt-2">
                            <div>
                              <div className="text-[10px] text-[#9097B0]">Followers</div>
                              <div className="text-[14px] font-bold text-[#1C1F3A]">{p.followers}</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-[#9097B0]">Engagement</div>
                              <div className={`text-[14px] font-bold ${p.engagementGood ? "text-[#059669]" : "text-[#8A90A8]"}`}>{p.engagement}</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-[#9097B0]">30d Growth</div>
                              <div className={`text-[14px] font-bold flex items-center gap-0.5 ${p.changePositive ? "text-[#E75D50]" : "text-[#ef4444]"}`}>
                                {p.changePositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                                {p.change}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Verified Contacts */}
                  <div className="rounded-xl border border-[rgba(41,48,85,0.09)] bg-white p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Link2 size={13} className="text-[#9097B0]" />
                        <h3 className="text-[13px] font-semibold text-[#1C1F3A]">Verified Contacts</h3>
                      </div>
                      <button className="text-[11px] text-[#E75D50] font-medium">View all →</button>
                    </div>

                    {/* AI Contact Summary */}
                    <div className="rounded-lg p-3 mb-4 text-[12px] leading-relaxed text-[#6B7080]"
                      style={{ background: "rgba(41,48,85,0.04)", border: "1px solid rgba(41,48,85,0.07)" }}>
                      <div className="flex items-start gap-2">
                        <Sparkles size={11} className="text-[#E75D50] mt-0.5 shrink-0" />
                        <span>This athlete is represented by <strong className="text-[#293055]">Elite Sport Management NZ</strong>. Commercial and sponsorship enquiries should go through the agency. Competition matters should be directed to Athletics NZ.</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {verifiedContacts.map((c, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${c.status === "verified" ? "bg-[rgba(16,185,129,0.12)]" : "bg-[rgba(245,158,11,0.12)]"}`}>
                            {c.status === "verified"
                              ? <CheckCircle2 size={12} className="text-[#059669]" />
                              : <AlertCircle size={12} className="text-[#d97706]" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] text-[#9097B0] font-medium">{c.role}</div>
                            <div className="text-[12px] font-semibold text-[#1C1F3A] truncate">{c.name}</div>
                            <div className="text-[11px] text-[#8A90A8] truncate">{c.org}</div>
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-[#A0A8C0]">
                              <Clock size={9} />
                              <span>Verified {c.verified}</span>
                              <span className="text-[#C0C8DC]">·</span>
                              <ShieldCheck size={9} className={c.confidence >= 95 ? "text-[#10b981]" : "text-[#d97706]"} />
                              <span>{c.confidence}%</span>
                            </div>
                          </div>
                          {c.link && (
                            <button className="shrink-0 mt-0.5 text-[#9097B0] hover:text-[#E75D50] transition-colors">
                              <ExternalLink size={12} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Next Competition (compact) */}
                  <div
                    className="rounded-xl p-4"
                    style={{ background: "linear-gradient(135deg, #293055 0%, #202740 100%)" }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Timer size={12} style={{ color: "#E75D50" }} />
                      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#E75D50" }}>Next Race</span>
                    </div>
                    <div className="text-[13px] font-semibold mb-1 leading-tight" style={{ color: "rgba(252,250,250,0.92)" }}>
                      NZ Track & Field Championships
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] mb-3" style={{ color: "rgba(252,250,250,0.45)" }}>
                      <Calendar size={10} />
                      <span>28 Jul 2026 · 09:30 · Wellington</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] font-medium" style={{ color: "rgba(252,250,250,0.55)" }}>
                      <span className="text-2xl font-bold tabular-nums" style={{ color: "#FEEEEE" }}>10</span>
                      <span className="text-[10px] mt-1">d</span>
                      <span className="mx-1" style={{ color: "rgba(252,250,250,0.25)" }}>:</span>
                      <span className="text-2xl font-bold tabular-nums" style={{ color: "#FEEEEE" }}>04</span>
                      <span className="text-[10px] mt-1">h</span>
                      <span className="mx-1" style={{ color: "rgba(252,250,250,0.25)" }}>:</span>
                      <span className="text-2xl font-bold tabular-nums" style={{ color: "#FEEEEE" }}>22</span>
                      <span className="text-[10px] mt-1">m</span>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* ── Placeholder tabs ── */}
          {activeTab !== "overview" && (
            <div className="max-w-6xl mx-auto px-8 py-16 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full bg-[rgba(41,48,85,0.06)] flex items-center justify-center mb-3">
                {activeTab === "performance" && <BarChart2 size={20} className="text-[#9097B0]" />}
                {activeTab === "relationships" && <Users size={20} className="text-[#9097B0]" />}
                {activeTab === "media" && <Newspaper size={20} className="text-[#9097B0]" />}
                {activeTab === "timeline" && <Activity size={20} className="text-[#9097B0]" />}
                {activeTab === "contacts" && <Link2 size={20} className="text-[#9097B0]" />}
              </div>
              <h3 className="text-[14px] font-semibold text-[#293055] mb-1 capitalize">{activeTab}</h3>
              <p className="text-[13px] text-[#8A90A8]">This section is being designed next.</p>
            </div>
          )}

        </div>
      </div>
    </AppLayout>
  );
}
