import React, { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Link } from "wouter";
import {
  ShieldCheck,
  ExternalLink,
  Search,
  ChevronRight,
  Globe,
  Calendar,
} from "lucide-react";
import { useListIntelligence } from "@workspace/api-client-react";

const CATEGORY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  results_rankings: { label: "Results & Rankings", color: "#6B8FE0", bg: "rgba(107,143,224,0.15)" },
  media_interviews: { label: "Media & Interviews", color: "#C8BDFF", bg: "rgba(200,189,255,0.15)" },
  sponsorships:     { label: "Sponsorships",        color: "#4ade80", bg: "rgba(74,222,128,0.15)" },
  career_changes:   { label: "Career Changes",      color: "#fbbf24", bg: "rgba(251,191,36,0.15)" },
};

const CONFIDENCE_TIERS = [
  { label: "Verified (90%+)",   min: 90, color: "#4ade80" },
  { label: "High (80–89%)",     min: 80, color: "#6B8FE0" },
  { label: "Moderate (70–79%)", min: 70, color: "#fbbf24" },
  { label: "Low (<70%)",         min: 0,  color: "rgba(255,255,255,0.35)" },
];

function confidenceColor(score: number) {
  if (score >= 90) return "#4ade80";
  if (score >= 80) return "#6B8FE0";
  if (score >= 70) return "#fbbf24";
  return "rgba(255,255,255,0.35)";
}

const card: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: 12,
};

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.07)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 8,
  color: "white",
  fontSize: 13,
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  padding: "8px 12px",
};

export default function SourcesPage() {
  const { data: rawData } = useListIntelligence();
  const items: any[] = Array.isArray(rawData) ? rawData : (rawData as any)?.items ?? [];

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [confidenceFilter, setConfidenceFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"date" | "confidence" | "athlete">("date");

  const filtered = useMemo(() => {
    let list = [...items];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.athleteName?.toLowerCase().includes(q) ||
          i.title?.toLowerCase().includes(q) ||
          i.sourceDomain?.toLowerCase().includes(q),
      );
    }
    if (categoryFilter !== "all") list = list.filter((i) => i.category === categoryFilter);
    if (confidenceFilter !== "all") {
      const tier = CONFIDENCE_TIERS.find((t) => t.label === confidenceFilter);
      if (tier) {
        const nextTier = CONFIDENCE_TIERS[CONFIDENCE_TIERS.indexOf(tier) - 1];
        list = list.filter(
          (i) => i.confidence >= tier.min && (!nextTier || i.confidence < nextTier.min),
        );
      }
    }
    list.sort((a, b) => {
      if (sortBy === "confidence") return (b.confidence ?? 0) - (a.confidence ?? 0);
      if (sortBy === "athlete") return (a.athleteName ?? "").localeCompare(b.athleteName ?? "");
      return new Date(b.discoveredAt ?? 0).getTime() - new Date(a.discoveredAt ?? 0).getTime();
    });
    return list;
  }, [items, search, categoryFilter, confidenceFilter, sortBy]);

  const domainCounts = useMemo(() => {
    const map: Record<string, number> = {};
    items.forEach((i) => { if (i.sourceDomain) map[i.sourceDomain] = (map[i.sourceDomain] ?? 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [items]);

  const avgConfidence = items.length
    ? Math.round(items.reduce((s, i) => s + (i.confidence ?? 0), 0) / items.length)
    : 0;

  return (
    <AppLayout activePage="sources">
      <div className="flex flex-col h-full" style={{ background: "#0D1C0B" }}>

        {/* Breadcrumb */}
        <div className="h-14 flex items-center px-6 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.09)" }}>
          <div className="flex items-center gap-2 text-[13px] font-medium" style={{ color: "rgba(255,255,255,0.40)" }}>
            <Link href="/dashboard"><span className="cursor-pointer hover:text-white transition-colors">Overview</span></Link>
            <ChevronRight size={14} style={{ color: "rgba(255,255,255,0.25)" }} />
            <span style={{ color: "rgba(255,255,255,0.85)" }}>Source Explorer</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto hide-scrollbar">
          <div className="max-w-6xl mx-auto px-8 py-6">

            {/* Page title + stats */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-[22px] font-semibold tracking-tight text-white flex items-center gap-2.5">
                  <ShieldCheck size={20} style={{ color: "#B9FF4A" }} />
                  Source Explorer
                </h1>
                <p className="text-[13px] mt-1" style={{ color: "rgba(255,255,255,0.55)" }}>
                  Every piece of intelligence traced back to its evidence. Full audit trail.
                </p>
              </div>
            </div>

            {/* Trust stats row */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[
                { label: "Total Sources", value: items.length, sub: "intelligence citations", valueColor: "white" },
                { label: "Avg Confidence", value: `${avgConfidence}%`, sub: "across all items", valueColor: confidenceColor(avgConfidence) },
                { label: "Unique Domains", value: new Set(items.map((i) => i.sourceDomain).filter(Boolean)).size, sub: "distinct sources", valueColor: "white" },
                { label: "Verified (90%+)", value: items.filter((i) => (i.confidence ?? 0) >= 90).length, sub: "high-confidence items", valueColor: "#4ade80" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl p-4" style={card}>
                  <div className="text-[11px] font-medium mb-1 uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.40)" }}>{s.label}</div>
                  <div className="text-[24px] font-bold" style={{ color: s.valueColor }}>{s.value}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.30)" }}>{s.sub}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-[1fr_220px] gap-6">

              {/* Main list */}
              <div>
                {/* Filters bar */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative flex-1">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.35)" }} />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search athlete, title, or source…"
                      className="w-full pl-8 pr-3 py-2 rounded-lg focus:outline-none placeholder:text-[rgba(255,255,255,0.30)]"
                      style={{ ...inputStyle, fontSize: 13 }}
                    />
                  </div>
                  <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
                    className="rounded-lg focus:outline-none" style={selectStyle}>
                    <option value="all">All categories</option>
                    {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                  <select value={confidenceFilter} onChange={(e) => setConfidenceFilter(e.target.value)}
                    className="rounded-lg focus:outline-none" style={selectStyle}>
                    <option value="all">All confidence</option>
                    {CONFIDENCE_TIERS.map((t) => (
                      <option key={t.label} value={t.label}>{t.label}</option>
                    ))}
                  </select>
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}
                    className="rounded-lg focus:outline-none" style={selectStyle}>
                    <option value="date">Sort: Latest</option>
                    <option value="confidence">Sort: Confidence</option>
                    <option value="athlete">Sort: Athlete</option>
                  </select>
                </div>

                <div className="text-[11px] mb-3 font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>
                  {filtered.length} of {items.length} sources
                </div>

                {/* Source cards */}
                <div className="space-y-3">
                  {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 rounded-xl"
                      style={{ border: "1px dashed rgba(255,255,255,0.12)" }}>
                      <Globe size={20} style={{ color: "rgba(255,255,255,0.25)" }} className="mb-3" />
                      <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.40)" }}>No sources match your filters</p>
                    </div>
                  ) : (
                    filtered.map((item) => {
                      const cfg = CATEGORY_CONFIG[item.category] ?? { label: item.category, color: "rgba(255,255,255,0.55)", bg: "rgba(255,255,255,0.08)" };
                      const conf = item.confidence ?? 80;
                      return (
                        <div key={item.id} className="rounded-xl p-4 transition-colors"
                          style={card}
                          onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)")}
                          onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)")}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded"
                                  style={{ background: cfg.bg, color: cfg.color }}>
                                  {cfg.label}
                                </span>
                                <Link href={`/athletes/${item.athleteId}`}>
                                  <span className="text-[12px] font-semibold hover:underline cursor-pointer" style={{ color: "#B9FF4A" }}>
                                    {item.athleteName}
                                  </span>
                                </Link>
                                {item.publishedAt && (
                                  <span className="text-[11px] flex items-center gap-1 ml-auto shrink-0"
                                    style={{ color: "rgba(255,255,255,0.35)" }}>
                                    <Calendar size={10} />
                                    {new Date(item.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                  </span>
                                )}
                              </div>

                              <h4 className="text-[13px] font-semibold text-white mb-1 leading-snug">{item.title}</h4>
                              {item.summary && (
                                <p className="text-[12px] leading-relaxed mb-2" style={{ color: "rgba(255,255,255,0.55)" }}>{item.summary}</p>
                              )}

                              <div className="flex items-center gap-3 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                                <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "rgba(255,255,255,0.40)" }}>
                                  <Globe size={11} style={{ color: "rgba(255,255,255,0.30)" }} />
                                  <span className="font-medium">{item.sourceDomain}</span>
                                </div>
                                {item.sourceUrl && (
                                  <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-[11px] hover:underline" style={{ color: "#C8BDFF" }}>
                                    <ExternalLink size={10} />
                                    View source
                                  </a>
                                )}
                                <div className="ml-auto flex items-center gap-2">
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.10)" }}>
                                      <div className="h-full rounded-full" style={{ width: `${conf}%`, background: confidenceColor(conf) }} />
                                    </div>
                                    <span className="text-[11px] font-semibold" style={{ color: confidenceColor(conf) }}>{conf}%</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right panel — top domains */}
              <div className="space-y-4">
                <div className="rounded-xl p-4" style={card}>
                  <h3 className="text-[12px] font-semibold text-white mb-3 flex items-center gap-1.5">
                    <Globe size={13} style={{ color: "#B9FF4A" }} />
                    Top Sources
                  </h3>
                  <div className="space-y-2.5">
                    {domainCounts.map(([domain, count]) => (
                      <div key={domain} className="flex items-center justify-between gap-2">
                        <span className="text-[12px] font-medium truncate" style={{ color: "rgba(255,255,255,0.70)" }}>{domain}</span>
                        <span className="text-[11px] shrink-0" style={{ color: "rgba(255,255,255,0.35)" }}>{count} items</span>
                      </div>
                    ))}
                    {domainCounts.length === 0 && (
                      <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.30)" }}>No sources yet</p>
                    )}
                  </div>
                </div>

                <div className="rounded-xl p-4" style={card}>
                  <h3 className="text-[12px] font-semibold text-white mb-3 flex items-center gap-1.5">
                    <ShieldCheck size={13} style={{ color: "#4ade80" }} />
                    Confidence Breakdown
                  </h3>
                  <div className="space-y-2.5">
                    {CONFIDENCE_TIERS.map((tier) => {
                      const nextTier = CONFIDENCE_TIERS[CONFIDENCE_TIERS.indexOf(tier) - 1];
                      const count = items.filter(
                        (i) => (i.confidence ?? 0) >= tier.min && (!nextTier || (i.confidence ?? 0) < nextTier.min),
                      ).length;
                      return (
                        <div key={tier.label}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px]" style={{ color: tier.color }}>{tier.label}</span>
                            <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>{count}</span>
                          </div>
                          <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.10)" }}>
                            <div className="h-full rounded-full" style={{
                              width: items.length ? `${(count / items.length) * 100}%` : "0%",
                              background: tier.color,
                            }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-xl p-4" style={card}>
                  <h3 className="text-[12px] font-semibold text-white mb-3">Categories</h3>
                  <div className="space-y-2">
                    {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => {
                      const count = items.filter((i) => i.category === key).length;
                      return (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-[11px] font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
                          <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
