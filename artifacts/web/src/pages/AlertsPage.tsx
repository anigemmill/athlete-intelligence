import React, { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Bell, CheckCheck, Archive, Filter, ChevronRight, ShieldCheck, Globe } from "lucide-react";
import { Link } from "wouter";
import { useListIntelligence, useListAthletes } from "@workspace/api-client-react";

type AlertFilter = "all" | "unread" | "results_rankings" | "media_interviews" | "sponsorships" | "career_changes";

const TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  results_rankings: { bg: "rgba(52,79,159,0.12)",   text: "#344F9F", label: "Results" },
  media_interviews: { bg: "rgba(217,119,6,0.12)",    text: "#D97706", label: "Media" },
  sponsorships:     { bg: "rgba(5,150,105,0.12)",    text: "#059669", label: "Sponsorship" },
  career_changes:   { bg: "rgba(231,93,80,0.12)",    text: "#E75D50", label: "Career" },
};

const FILTER_TABS: { id: AlertFilter; label: string }[] = [
  { id: "all",              label: "All" },
  { id: "unread",           label: "Unread" },
  { id: "results_rankings", label: "Results" },
  { id: "media_interviews", label: "Media" },
  { id: "sponsorships",     label: "Sponsorships" },
  { id: "career_changes",   label: "Career" },
];

const READ_KEY = "ai_read_intel_ids";

function getReadIds(): Set<number> {
  try { return new Set(JSON.parse(localStorage.getItem(READ_KEY) ?? "[]")); } catch { return new Set(); }
}
function markReadId(id: number) {
  const ids = getReadIds(); ids.add(id);
  localStorage.setItem(READ_KEY, JSON.stringify([...ids]));
}
function markAllReadIds(ids: number[]) {
  localStorage.setItem(READ_KEY, JSON.stringify(ids));
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d} days ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function AlertsPage() {
  const { data: rawIntel } = useListIntelligence();
  const items: any[] = useMemo(() => {
    const raw = Array.isArray(rawIntel) ? rawIntel : (rawIntel as any)?.items ?? [];
    return raw.sort((a: any, b: any) => new Date(b.discoveredAt ?? 0).getTime() - new Date(a.discoveredAt ?? 0).getTime());
  }, [rawIntel]);

  const [filter, setFilter] = useState<AlertFilter>("all");
  const [readIds, setReadIds] = useState<Set<number>>(() => getReadIds());

  const filtered = useMemo(() => {
    let list = items;
    if (filter === "unread") list = list.filter((a) => !readIds.has(a.id));
    else if (filter !== "all") list = list.filter((a) => a.category === filter);
    return list;
  }, [items, filter, readIds]);

  const unreadCount = items.filter((a) => !readIds.has(a.id)).length;

  const markRead = (id: number) => {
    markReadId(id);
    setReadIds(new Set([...readIds, id]));
  };

  const markAll = () => {
    const allIds = items.map((a) => a.id);
    markAllReadIds(allIds);
    setReadIds(new Set(allIds));
  };

  const categoryCount = (cat: AlertFilter) => {
    if (cat === "unread") return unreadCount;
    if (cat === "all") return items.length;
    return items.filter((a) => a.category === cat).length;
  };

  return (
    <AppLayout activePage="alerts">
      <div className="flex flex-col h-full bg-[#FCFAFA]">

        {/* Header */}
        <header className="flex-shrink-0 flex items-center justify-between px-8 pt-8 pb-6 border-b border-[#DCE2EF]">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#1C1F3A] flex items-center gap-2">
              Alerts
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[#E75D50] text-white text-[12px] font-semibold">{unreadCount}</span>
              )}
            </h1>
            <p className="text-sm mt-1 text-[#6B7080]">
              Intelligence updates across your monitored athletes — {items.length} items discovered.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAll}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#DCE2EF] text-[12px] font-medium text-[#6B7080] hover:bg-white hover:shadow-sm transition-all"
              >
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
          </div>
        </header>

        {/* Filter tabs */}
        <div className="flex-shrink-0 px-8 pt-4 pb-3 border-b border-[#DCE2EF]">
          <div className="flex items-center gap-1 flex-wrap">
            {FILTER_TABS.map((tab) => {
              const count = categoryCount(tab.id);
              const isActive = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${isActive ? "bg-[rgba(41,48,85,0.08)] text-[#293055]" : "text-[#6B7080] hover:text-[#1C1F3A] hover:bg-[#F0F2F8]"}`}
                >
                  {tab.label}
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${isActive ? "bg-[#293055] text-white" : "bg-[#EEF0F8] text-[#8A90A8]"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Alert list */}
        <div className="flex-1 overflow-y-auto hide-scrollbar">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-center px-8">
              <div className="w-12 h-12 rounded-full bg-[#EEF0F8] flex items-center justify-center">
                <Bell size={20} className="text-[#A0A8C0]" />
              </div>
              <p className="text-[14px] font-medium text-[#6B7080]">No alerts yet</p>
              <p className="text-[12px] text-[#A0A8C0]">Add athletes to your roster and intelligence updates will appear here as agents discover new information.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <Bell size={16} className="text-[#C0C8DC]" />
              <p className="text-[13px] text-[#8A90A8]">No {filter === "unread" ? "unread alerts" : "alerts in this category"}</p>
            </div>
          ) : (
            <div className="divide-y divide-[#F0F2F8]">
              {filtered.map((alert) => {
                const colors = TYPE_COLORS[alert.category] ?? TYPE_COLORS.results_rankings;
                const isUnread = !readIds.has(alert.id);
                const ath = initials(alert.athleteName ?? "?");
                return (
                  <div
                    key={alert.id}
                    className={`flex items-start gap-4 px-8 py-4 hover:bg-white transition-colors cursor-pointer group ${isUnread ? "bg-[rgba(231,93,80,0.025)]" : ""}`}
                    onClick={() => markRead(alert.id)}
                  >
                    {/* Unread dot */}
                    <div className="w-2 shrink-0 flex items-start justify-center pt-2.5">
                      {isUnread && <div className="w-2 h-2 rounded-full bg-[#E75D50]" />}
                    </div>

                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#293055] to-[#344F9F] flex items-center justify-center text-white text-[11px] font-bold shrink-0 mt-0.5">
                      {ath}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[13px] font-semibold text-[#1C1F3A]">{alert.athleteName}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: colors.bg, color: colors.text }}>
                          {colors.label}
                        </span>
                      </div>
                      <p className="text-[13px] font-medium text-[#293055] mb-1 leading-snug">{alert.title}</p>
                      {alert.summary && (
                        <p className="text-[12px] text-[#6B7080] leading-relaxed mb-2">{alert.summary}</p>
                      )}
                      <div className="flex items-center gap-3 text-[11px] text-[#A0A8C0]">
                        <span className="flex items-center gap-1">
                          <Globe size={10} />
                          {alert.sourceDomain}
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <ShieldCheck size={10} />
                          {alert.confidence}% confidence
                        </span>
                        <span>·</span>
                        <span>{timeAgo(alert.discoveredAt)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="shrink-0 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); markRead(alert.id); }}
                        className="p-1.5 rounded-lg text-[#A0A8C0] hover:text-[#6B7080] hover:bg-[#F0F2F8] transition-colors"
                        title="Mark read"
                      >
                        <Archive size={13} />
                      </button>
                      <Link href={`/athletes/${alert.athleteId}`}>
                        <span className="p-1.5 rounded-lg text-[#A0A8C0] hover:text-[#6B7080] hover:bg-[#F0F2F8] transition-colors block" title="View athlete">
                          <ChevronRight size={13} />
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
    </AppLayout>
  );
}
