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
  Filter,
} from "lucide-react";
import { useListIntelligence } from "@workspace/api-client-react";

const CATEGORY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  results_rankings: { label: "Results & Rankings", color: "#344F9F", bg: "rgba(52,79,159,0.10)" },
  media_interviews: { label: "Media & Interviews", color: "#7C3AED", bg: "rgba(124,58,237,0.10)" },
  sponsorships:     { label: "Sponsorships",        color: "#059669", bg: "rgba(5,150,105,0.10)" },
  career_changes:   { label: "Career Changes",      color: "#D97706", bg: "rgba(217,119,6,0.10)" },
};

const CONFIDENCE_TIERS = [
  { label: "Verified (90%+)",  min: 90, color: "#059669" },
  { label: "High (80–89%)",    min: 80, color: "#344F9F" },
  { label: "Moderate (70–79%)", min: 70, color: "#D97706" },
  { label: "Low (<70%)",        min: 0,  color: "#9097B0" },
];

function confidenceColor(score: number) {
  if (score >= 90) return "#059669";
  if (score >= 80) return "#344F9F";
  if (score >= 70) return "#D97706";
  return "#9097B0";
}

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

  // Domain summary stats
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
      <div className="flex flex-col h-full bg-[#FCFAFA]">

        {/* Header */}
        <div className="h-14 border-b border-[#DCE2EF] flex items-center px-6 shrink-0 bg-[#FCFAFA]">
          <div className="flex items-center gap-2 text-[13px] font-medium text-[#8A90A8]">
            <Link href="/dashboard"><span className="hover:text-[#3D426A] cursor-pointer transition-colors">Overview</span></Link>
            <ChevronRight size={14} className="text-[#C0C8DC]" />
            <span className="text-[#293055]">Source Explorer</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto hide-scrollbar">
          <div className="max-w-6xl mx-auto px-8 py-6">

            {/* Page title + stats */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-[22px] font-semibold tracking-tight text-[#1C1F3A] flex items-center gap-2.5">
                  <ShieldCheck size={20} className="text-[#344F9F]" />
                  Source Explorer
                </h1>
                <p className="text-[13px] mt-1 text-[#6B7080]">
                  Every piece of intelligence traced back to its evidence. Full audit trail.
                </p>
              </div>
            </div>

            {/* Trust stats row */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl border border-[#DCE2EF] p-4 shadow-sm">
                <div className="text-[11px] text-[#9097B0] font-medium mb-1">Total Sources</div>
                <div className="text-[24px] font-bold text-[#1C1F3A]">{items.length}</div>
                <div className="text-[11px] text-[#A0A8C0] mt-0.5">intelligence citations</div>
              </div>
              <div className="bg-white rounded-xl border border-[#DCE2EF] p-4 shadow-sm">
                <div className="text-[11px] text-[#9097B0] font-medium mb-1">Avg Confidence</div>
                <div className="text-[24px] font-bold" style={{ color: confidenceColor(avgConfidence) }}>{avgConfidence}%</div>
                <div className="text-[11px] text-[#A0A8C0] mt-0.5">across all items</div>
              </div>
              <div className="bg-white rounded-xl border border-[#DCE2EF] p-4 shadow-sm">
                <div className="text-[11px] text-[#9097B0] font-medium mb-1">Unique Domains</div>
                <div className="text-[24px] font-bold text-[#1C1F3A]">
                  {new Set(items.map((i) => i.sourceDomain).filter(Boolean)).size}
                </div>
                <div className="text-[11px] text-[#A0A8C0] mt-0.5">distinct sources</div>
              </div>
              <div className="bg-white rounded-xl border border-[#DCE2EF] p-4 shadow-sm">
                <div className="text-[11px] text-[#9097B0] font-medium mb-1">Verified (90%+)</div>
                <div className="text-[24px] font-bold text-[#059669]">
                  {items.filter((i) => (i.confidence ?? 0) >= 90).length}
                </div>
                <div className="text-[11px] text-[#A0A8C0] mt-0.5">high-confidence items</div>
              </div>
            </div>

            <div className="grid grid-cols-[1fr_220px] gap-6">

              {/* Main list */}
              <div>
                {/* Filters bar */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative flex-1">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A0A8C0]" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search athlete, title, or source…"
                      className="w-full pl-8 pr-3 py-2 text-[13px] bg-white border border-[#DCE2EF] rounded-lg focus:outline-none focus:border-[#344F9F] text-[#1C1F3A] placeholder:text-[#A0A8C0]"
                    />
                  </div>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-3 py-2 text-[12px] bg-white border border-[#DCE2EF] rounded-lg focus:outline-none text-[#1C1F3A]"
                  >
                    <option value="all">All categories</option>
                    {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                  <select
                    value={confidenceFilter}
                    onChange={(e) => setConfidenceFilter(e.target.value)}
                    className="px-3 py-2 text-[12px] bg-white border border-[#DCE2EF] rounded-lg focus:outline-none text-[#1C1F3A]"
                  >
                    <option value="all">All confidence</option>
                    {CONFIDENCE_TIERS.map((t) => (
                      <option key={t.label} value={t.label}>{t.label}</option>
                    ))}
                  </select>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-3 py-2 text-[12px] bg-white border border-[#DCE2EF] rounded-lg focus:outline-none text-[#1C1F3A]"
                  >
                    <option value="date">Sort: Latest</option>
                    <option value="confidence">Sort: Confidence</option>
                    <option value="athlete">Sort: Athlete</option>
                  </select>
                </div>

                <div className="text-[11px] text-[#9097B0] mb-3 font-medium">
                  {filtered.length} of {items.length} sources
                </div>

                {/* Source cards */}
                <div className="space-y-3">
                  {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 border border-dashed border-[#DCE2EF] rounded-xl">
                      <Globe size={20} className="text-[#A0A8C0] mb-3" />
                      <p className="text-[13px] text-[#8A90A8]">No sources match your filters</p>
                    </div>
                  ) : (
                    filtered.map((item) => {
                      const cfg = CATEGORY_CONFIG[item.category] ?? { label: item.category, color: "#8A90A8", bg: "rgba(138,144,168,0.10)" };
                      const conf = item.confidence ?? 80;
                      return (
                        <div key={item.id} className="bg-white rounded-xl border border-[#DCE2EF] p-4 shadow-sm hover:border-[#C8D0E8] transition-colors">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              {/* Top row */}
                              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded" style={{ background: cfg.bg, color: cfg.color }}>
                                  {cfg.label}
                                </span>
                                <Link href={`/athletes/${item.athleteId}`}>
                                  <span className="text-[12px] font-semibold text-[#293055] hover:underline cursor-pointer">
                                    {item.athleteName}
                                  </span>
                                </Link>
                                {item.publishedAt && (
                                  <span className="text-[11px] text-[#A0A8C0] flex items-center gap-1 ml-auto shrink-0">
                                    <Calendar size={10} />
                                    {new Date(item.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                  </span>
                                )}
                              </div>

                              {/* Title */}
                              <h4 className="text-[13px] font-semibold text-[#1C1F3A] mb-1 leading-snug">{item.title}</h4>
                              {item.summary && (
                                <p className="text-[12px] text-[#6B7080] leading-relaxed mb-2">{item.summary}</p>
                              )}

                              {/* Source attribution */}
                              <div className="flex items-center gap-3 pt-2 border-t border-[#F0F2F8]">
                                <div className="flex items-center gap-1.5 text-[11px] text-[#8A90A8]">
                                  <Globe size={11} className="text-[#A0A8C0]" />
                                  <span className="font-medium">{item.sourceDomain}</span>
                                </div>
                                {item.sourceUrl && (
                                  <a
                                    href={item.sourceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-[11px] text-[#344F9F] hover:underline"
                                  >
                                    <ExternalLink size={10} />
                                    View source
                                  </a>
                                )}
                                <div className="ml-auto flex items-center gap-2">
                                  {/* Confidence bar */}
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-20 h-1.5 bg-[#EEF0F8] rounded-full overflow-hidden">
                                      <div
                                        className="h-full rounded-full"
                                        style={{ width: `${conf}%`, background: confidenceColor(conf) }}
                                      />
                                    </div>
                                    <span className="text-[11px] font-semibold" style={{ color: confidenceColor(conf) }}>
                                      {conf}%
                                    </span>
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
                <div className="bg-white rounded-xl border border-[#DCE2EF] p-4 shadow-sm">
                  <h3 className="text-[12px] font-semibold text-[#1C1F3A] mb-3 flex items-center gap-1.5">
                    <Globe size={13} className="text-[#344F9F]" />
                    Top Sources
                  </h3>
                  <div className="space-y-2.5">
                    {domainCounts.map(([domain, count]) => (
                      <div key={domain} className="flex items-center justify-between gap-2">
                        <span className="text-[12px] text-[#3D426A] font-medium truncate">{domain}</span>
                        <span className="text-[11px] text-[#9097B0] shrink-0">{count} items</span>
                      </div>
                    ))}
                    {domainCounts.length === 0 && (
                      <p className="text-[12px] text-[#A0A8C0]">No sources yet</p>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-[#DCE2EF] p-4 shadow-sm">
                  <h3 className="text-[12px] font-semibold text-[#1C1F3A] mb-3 flex items-center gap-1.5">
                    <ShieldCheck size={13} className="text-[#059669]" />
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
                            <span className="text-[11px] text-[#9097B0]">{count}</span>
                          </div>
                          <div className="h-1 bg-[#EEF0F8] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: items.length ? `${(count / items.length) * 100}%` : "0%",
                                background: tier.color,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-[#DCE2EF] p-4 shadow-sm">
                  <h3 className="text-[12px] font-semibold text-[#1C1F3A] mb-3">Categories</h3>
                  <div className="space-y-2">
                    {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => {
                      const count = items.filter((i) => i.category === key).length;
                      return (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-[11px] font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
                          <span className="text-[11px] text-[#9097B0]">{count}</span>
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
