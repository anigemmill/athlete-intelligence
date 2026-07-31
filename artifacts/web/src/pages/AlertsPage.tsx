import React, { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Bell, CheckCheck, Archive, Filter, ChevronRight, ShieldCheck, Globe } from "lucide-react";
import { Link } from "wouter";
import { useListIntelligence, useListAthletes } from "@workspace/api-client-react";

type AlertFilter = "all" | "unread" | "results_rankings" | "media_interviews" | "sponsorships" | "career_changes";

const TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  results_rankings: { bg: "rgba(107,143,224,0.15)", text: "#6B8FE0", label: "Results" },
  media_interviews: { bg: "rgba(200,189,255,0.15)", text: "#C8BDFF", label: "Media" },
  sponsorships:     { bg: "rgba(74,222,128,0.15)",  text: "#4ade80", label: "Sponsorship" },
  career_changes:   { bg: "rgba(251,191,36,0.15)",  text: "#fbbf24", label: "Career" },
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
      <div className="flex flex-col h-full" style={{ background: "#0D1C0B" }}>

        {/* Header */}
        <header className="flex-shrink-0 flex items-center justify-between px-8 pt-8 pb-6"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.09)" }}>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
              Alerts
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[12px] font-semibold"
                  style={{ background: "#B9FF4A", color: "#0D1C0B" }}>
                  {unreadCount}
                </span>
              )}
            </h1>
            <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.55)" }}>
              Intelligence updates across your monitored athletes — {items.length} items discovered.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAll}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all"
                style={{ border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.55)", background: "rgba(255,255,255,0.04)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
              >
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
          </div>
        </header>

        {/* Filter tabs */}
        <div className="flex-shrink-0 px-8 pt-4 pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-1 flex-wrap">
            {FILTER_TABS.map((tab) => {
              const count = categoryCount(tab.id);
              const isActive = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
                  style={{
                    background: isActive ? "rgba(185,255,74,0.12)" : "transparent",
                    color: isActive ? "#B9FF4A" : "rgba(255,255,255,0.55)",
                  }}
                >
                  {tab.label}
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
                    style={{
                      background: isActive ? "rgba(185,255,74,0.20)" : "rgba(255,255,255,0.08)",
                      color: isActive ? "#B9FF4A" : "rgba(255,255,255,0.40)",
                    }}>
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
              <div className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.06)" }}>
                <Bell size={20} style={{ color: "rgba(255,255,255,0.35)" }} />
              </div>
              <p className="text-[14px] font-medium text-white">No alerts yet</p>
              <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.40)" }}>
                Add athletes to your roster and intelligence updates will appear here as agents discover new information.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <Bell size={16} style={{ color: "rgba(255,255,255,0.25)" }} />
              <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.40)" }}>
                No {filter === "unread" ? "unread alerts" : "alerts in this category"}
              </p>
            </div>
          ) : (
            <div>
              {filtered.map((alert) => {
                const colors = TYPE_COLORS[alert.category] ?? TYPE_COLORS.results_rankings;
                const isUnread = !readIds.has(alert.id);
                const ath = initials(alert.athleteName ?? "?");
                return (
                  <div
                    key={alert.id}
                    className="flex items-start gap-4 px-8 py-4 cursor-pointer group transition-colors"
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                      background: isUnread ? "rgba(185,255,74,0.025)" : "transparent",
                    }}
                    onClick={() => markRead(alert.id)}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                    onMouseLeave={e => (e.currentTarget.style.background = isUnread ? "rgba(185,255,74,0.025)" : "transparent")}
                  >
                    {/* Unread dot */}
                    <div className="w-2 shrink-0 flex items-start justify-center pt-2.5">
                      {isUnread && <div className="w-2 h-2 rounded-full" style={{ background: "#B9FF4A" }} />}
                    </div>

                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5"
                      style={{ background: "linear-gradient(135deg, rgba(185,255,74,0.25), rgba(185,255,74,0.10))", color: "#B9FF4A", border: "1px solid rgba(185,255,74,0.25)" }}>
                      {ath}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[13px] font-semibold text-white">{alert.athleteName}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                          style={{ background: colors.bg, color: colors.text }}>
                          {colors.label}
                        </span>
                      </div>
                      <p className="text-[13px] font-medium mb-1 leading-snug" style={{ color: "rgba(255,255,255,0.85)" }}>
                        {alert.title}
                      </p>
                      {alert.summary && (
                        <p className="text-[12px] leading-relaxed mb-2" style={{ color: "rgba(255,255,255,0.55)" }}>
                          {alert.summary}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
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
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: "rgba(255,255,255,0.35)", background: "transparent" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(255,255,255,0.70)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.35)"; }}
                        title="Mark read"
                      >
                        <Archive size={13} />
                      </button>
                      <Link href={`/athletes/${alert.athleteId}`}>
                        <span className="p-1.5 rounded-lg transition-colors block"
                          style={{ color: "rgba(255,255,255,0.35)" }}
                          title="View athlete">
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
