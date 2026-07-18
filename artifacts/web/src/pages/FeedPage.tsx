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
  Filter,
  Globe,
  Sparkles,
} from "lucide-react";
import { useListIntelligence } from "@workspace/api-client-react";

// Map DB category keys → display config
const categoryConfig: Record<string, { label: string; icon: any; color: string; bg: string; filterKey: string }> = {
  results_rankings: {
    label: "Results & Rankings", icon: Trophy,
    color: "#344F9F", bg: "rgba(52,79,159,0.10)", filterKey: "results_rankings",
  },
  media_interviews: {
    label: "Media & Interviews", icon: Newspaper,
    color: "#7C3AED", bg: "rgba(124,58,237,0.10)", filterKey: "media_interviews",
  },
  sponsorships: {
    label: "Sponsorships", icon: Award,
    color: "#059669", bg: "rgba(5,150,105,0.10)", filterKey: "sponsorships",
  },
  career_changes: {
    label: "Career Changes", icon: Briefcase,
    color: "#D97706", bg: "rgba(217,119,6,0.10)", filterKey: "career_changes",
  },
};

const defaultCfg = { label: "General", icon: Activity, color: "#344F9F", bg: "rgba(52,79,159,0.10)", filterKey: "" };

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
      <div className="flex flex-col relative w-full h-full overflow-hidden bg-[#FCFAFA]">

        {/* Breadcrumb */}
        <div className="h-14 border-b border-[#DCE2EF] flex items-center px-6 shrink-0 bg-[#FCFAFA]">
          <div className="flex items-center gap-2 text-[13px] font-medium text-[#8A90A8]">
            <Link href="/dashboard"><span className="hover:text-[#3D426A] cursor-pointer transition-colors">Overview</span></Link>
            <ChevronRight size={14} className="text-[#C0C8DC]" />
            <span className="text-[#293055]">Intelligence Feed</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto hide-scrollbar pb-20 px-8 py-6">
          <div className="max-w-5xl mx-auto w-full">

            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-[22px] font-semibold tracking-tight text-[#1C1F3A] flex items-center gap-2.5">
                  <Sparkles size={20} className="text-[#E75D50]" />
                  Intelligence Feed
                </h1>
                <p className="text-[13px] mt-1 text-[#6B7080]">
                  {feedData.length} intelligence items across your monitored roster — sorted by most recent.
                </p>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center justify-between border-b border-[#DCE2EF] mb-6">
              <div className="flex gap-6 overflow-x-auto hide-scrollbar">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  const count = getCount(tab.id);
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`relative pb-3 text-[13px] font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                        isActive ? "text-[#293055]" : "text-[#8A90A8] hover:text-[#6B7080]"
                      }`}
                    >
                      {tab.label}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        isActive ? "bg-[rgba(41,48,85,0.15)] text-[#293055]" : "bg-[rgba(41,48,85,0.08)] text-[#9097B0]"
                      }`}>
                        {count}
                      </span>
                      {isActive && (
                        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#E75D50] rounded-t-full" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Feed items */}
            {feedData.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-center border border-dashed border-[#DCE2EF] rounded-xl">
                <div className="w-14 h-14 rounded-full bg-[rgba(41,48,85,0.04)] flex items-center justify-center mb-4">
                  <Activity size={22} className="text-[#9097B0]" />
                </div>
                <h3 className="text-[14px] font-semibold text-[#293055] mb-2">No intelligence yet</h3>
                <p className="text-[13px] text-[#8A90A8] max-w-sm">
                  Add athletes to your roster and the intelligence engine will start surfacing updates automatically.
                </p>
                <Link href="/athletes/new">
                  <span className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#E75D50] text-white text-[13px] font-medium hover:bg-[#D04840] transition-colors cursor-pointer">
                    Add first athlete
                  </span>
                </Link>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-center border border-dashed border-[#DCE2EF] rounded-xl">
                <Activity size={20} className="text-[#9097B0] mb-3" />
                <p className="text-[13px] text-[#8A90A8]">No items in this category yet</p>
              </div>
            ) : (
              <div className="flex flex-col space-y-4">
                {filtered.map((item: any) => {
                  const cfg = categoryConfig[item.category] ?? defaultCfg;
                  const Icon = cfg.icon;
                  return (
                    <div key={item.id} className="border border-[#DCE2EF] rounded-xl bg-white p-5 relative overflow-hidden group shadow-sm hover:border-[#C8D0E8] transition-colors">
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
                            <span className="text-[12px] font-semibold text-[#293055] hover:underline cursor-pointer">
                              {item.athleteName}
                            </span>
                          </Link>
                        </div>
                        <div className="text-[12px] text-[#9097B0]">{timeAgo(item.discoveredAt)}</div>
                      </div>

                      {/* Title */}
                      <h3 className="text-[14px] font-semibold text-[#1C1F3A] leading-snug mb-2">{item.title}</h3>

                      {/* Summary */}
                      {item.summary && (
                        <p className="text-[13px] text-[#6B7080] leading-relaxed mb-4">{item.summary}</p>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-3 border-t border-[#F0F2F8]">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5 text-[12px] text-[#8A90A8]">
                            <Globe size={11} className="text-[#A0A8C0]" />
                            {item.sourceDomain}
                          </div>
                          {item.sourceUrl && (
                            <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-[11px] text-[#344F9F] hover:underline">
                              <ExternalLink size={10} /> View source
                            </a>
                          )}
                          <div className="flex items-center gap-1.5 text-[12px] text-[#6B7080]">
                            <ShieldCheck size={13} className={(item.confidence ?? 0) >= 90 ? "text-[#059669]" : "text-[#344F9F]"} />
                            {item.confidence ?? 80}% confidence
                          </div>
                        </div>
                        <Link href={`/athletes/${item.athleteId}`}>
                          <span className="text-[11px] text-[#8A90A8] hover:text-[#293055] transition-colors cursor-pointer flex items-center gap-1">
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
