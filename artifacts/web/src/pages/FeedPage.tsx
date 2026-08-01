import React, { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Link } from "wouter";
import {
  Activity,
  Trophy,
  Newspaper,
  Award,
  Briefcase,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  Globe,
  Sparkles,
  Clock,
} from "lucide-react";
import { useListIntelligence } from "@workspace/api-client-react";
import { T } from "@/lib/tokens";
import { DsBadge, DsEmptyState } from "@/components/ui/ds";

const categoryConfig: Record<string, { label: string; icon: any; color: string; bg: string; filterKey: string }> = {
  results_rankings: {
    label: "Results & Rankings", icon: Trophy,
    color: "#6B8FE0", bg: "rgba(107,143,224,0.15)", filterKey: "results_rankings",
  },
  media_interviews: {
    label: "Media & Interviews", icon: Newspaper,
    color: "#C8BDFF", bg: "rgba(200,189,255,0.15)", filterKey: "media_interviews",
  },
  sponsorships: {
    label: "Sponsorships", icon: Award,
    color: "#4ade80", bg: "rgba(74,222,128,0.15)", filterKey: "sponsorships",
  },
  career_changes: {
    label: "Career Changes", icon: Briefcase,
    color: "#fbbf24", bg: "rgba(251,191,36,0.15)", filterKey: "career_changes",
  },
};

const defaultCfg = { label: "General", icon: Activity, color: "#6B8FE0", bg: "rgba(107,143,224,0.15)", filterKey: "" };

type TabFilter = "all" | string;

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 2) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d} days ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

const tabs = [
  { id: "all",              label: "All Intelligence" },
  { id: "results_rankings", label: "Results & Rankings" },
  { id: "media_interviews", label: "Media & Interviews" },
  { id: "sponsorships",     label: "Sponsorships" },
  { id: "career_changes",   label: "Career Changes" },
];

export default function FeedPage() {
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const { data: rawData } = useListIntelligence();

  const feedData: any[] = useMemo(() => {
    const raw = Array.isArray(rawData) ? rawData : (rawData as any)?.items ?? [];
    return raw.sort((a: any, b: any) =>
      new Date(b.discoveredAt ?? 0).getTime() - new Date(a.discoveredAt ?? 0).getTime()
    );
  }, [rawData]);

  const filtered = activeTab === "all" ? feedData : feedData.filter((i: any) => i.category === activeTab);
  const getCount = (tab: TabFilter) =>
    tab === "all" ? feedData.length : feedData.filter((i: any) => i.category === tab).length;

  return (
    <AppLayout activePage="intelligence">
      <div className="flex flex-col relative w-full h-full overflow-hidden" style={{ background: "#0D1C0B" }}>

        {/* Breadcrumb */}
        <div className="h-14 flex items-center px-6 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.09)" }}>
          <div className="flex items-center gap-2 text-[13px] font-medium" style={{ color: "rgba(255,255,255,0.40)" }}>
            <Link href="/dashboard">
              <span className="cursor-pointer transition-colors hover:text-white">Overview</span>
            </Link>
            <ChevronRight size={14} style={{ color: "rgba(255,255,255,0.25)" }} />
            <span style={{ color: "rgba(255,255,255,0.85)" }}>Intelligence Feed</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto hide-scrollbar pb-20 px-8 py-6">
          <div className="max-w-5xl mx-auto w-full">

            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-[22px] font-semibold tracking-tight text-white flex items-center gap-2.5">
                  <Sparkles size={20} style={{ color: "#B9FF4A" }} />
                  Intelligence Feed
                </h1>
                <p className="text-[13px] mt-1" style={{ color: "rgba(255,255,255,0.55)" }}>
                  {feedData.length} intelligence items across your monitored roster — sorted by most recent.
                </p>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center justify-between mb-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.09)" }}>
              <div className="flex gap-6 overflow-x-auto hide-scrollbar">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  const count = getCount(tab.id);
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className="relative pb-3 text-[13px] font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
                      style={{ color: isActive ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.40)" }}
                    >
                      {tab.label}
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                        style={{
                          background: isActive ? "rgba(185,255,74,0.15)" : "rgba(255,255,255,0.07)",
                          color: isActive ? "#B9FF4A" : "rgba(255,255,255,0.35)",
                        }}>
                        {count}
                      </span>
                      {isActive && (
                        <div className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-full" style={{ background: "#B9FF4A" }} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Feed items */}
            {feedData.length === 0 ? (
              <DsEmptyState
                icon={<Activity size={22} />}
                title="No intelligence yet"
                description="Add athletes to your roster and the intelligence engine will start surfacing updates automatically."
                action={
                  <Link href="/athletes/new">
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium cursor-pointer"
                      style={{ background: T.lime, color: T.limeFg }}>
                      Add first athlete
                    </span>
                  </Link>
                }
              />
            ) : filtered.length === 0 ? (
              <DsEmptyState
                icon={<Activity size={18} />}
                title="No items in this category"
                description="Try a different filter or wait for the intelligence engine to surface new updates."
              />
            ) : (
              <div className="flex flex-col space-y-3">
                {filtered.map((item: any) => {
                  const cfg = categoryConfig[item.category] ?? defaultCfg;
                  const Icon = cfg.icon;
                  return (
                    <div key={item.id} className="rounded-xl p-5 relative overflow-hidden group transition-colors"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)")}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)")}
                    >
                      {/* Top row */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex items-center gap-1.5 px-2 py-1 rounded border text-[11px] font-semibold"
                            style={{ background: cfg.bg, borderColor: `${cfg.color}30`, color: cfg.color }}
                          >
                            <Icon size={11} strokeWidth={2.5} />
                            {cfg.label}
                          </div>
                          <Link href={`/athletes/${item.athleteId}`}>
                            <span className="text-[12px] font-semibold cursor-pointer hover:underline" style={{ color: "#B9FF4A" }}>
                              {item.athleteName}
                            </span>
                          </Link>
                        </div>
                        <div className="text-[12px]" style={{ color: "rgba(255,255,255,0.35)" }}>{timeAgo(item.discoveredAt)}</div>
                      </div>

                      {/* Title */}
                      <h3 className="text-[14px] font-semibold text-white leading-snug mb-2">{item.title}</h3>

                      {/* Summary */}
                      {item.summary && (
                        <p className="text-[13px] leading-relaxed mb-4" style={{ color: "rgba(255,255,255,0.55)" }}>{item.summary}</p>
                      )}

                      {/* Footer — source + confidence visualisation */}
                      <div className="flex items-center justify-between pt-3" style={{ borderTop: `1px solid ${T.borderSubtle}` }}>
                        <div className="flex items-center gap-5">
                          {/* Source domain */}
                          <div className="flex items-center gap-1.5 text-[12px]" style={{ color: T.t40 }}>
                            <Globe size={11} style={{ color: T.t28 }} />
                            {item.sourceDomain}
                          </div>
                          {item.sourceUrl && (
                            <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-[11px] hover:underline" style={{ color: T.lavender }}>
                              <ExternalLink size={10} /> Source
                            </a>
                          )}
                          {/* Confidence bar */}
                          <div className="flex items-center gap-2">
                            <ShieldCheck size={12} style={{ color: (item.confidence ?? 0) >= 90 ? T.statusFresh : T.lavender, flexShrink: 0 }} />
                            <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: T.bgElevated }}>
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${item.confidence ?? 75}%`,
                                  background: (item.confidence ?? 0) >= 90
                                    ? T.statusFresh
                                    : (item.confidence ?? 0) >= 70
                                    ? T.statusAging
                                    : T.lavender,
                                }}
                              />
                            </div>
                            <span className="text-[11px] tabular-nums" style={{ color: T.t40 }}>
                              {item.confidence ?? 75}%
                            </span>
                          </div>
                          {/* Freshness */}
                          <div className="flex items-center gap-1 text-[11px]" style={{ color: T.t40 }}>
                            <Clock size={11} style={{ color: T.t28 }} />
                            {timeAgo(item.discoveredAt)}
                          </div>
                        </div>
                        <Link href={`/athletes/${item.athleteId}`}>
                          <span className="text-[11px] transition-colors cursor-pointer flex items-center gap-1"
                            style={{ color: T.t40 }}
                            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = T.t70)}
                            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = T.t40)}>
                            View dossier <ChevronRight size={11} />
                          </span>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
