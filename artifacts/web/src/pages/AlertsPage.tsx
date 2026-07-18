import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Bell, CheckCheck, Archive, Filter, ChevronRight } from "lucide-react";
import { Link } from "wouter";

type AlertFilter = "all" | "unread" | "results" | "media" | "sponsorships" | "career";

const MOCK_ALERTS = [
  { id: 1, athleteId: 1, athlete: "Zoe Hobbs", avatar: "ZH", type: "results", tag: "Rankings", title: "World ranking update", body: "Zoe moved from 14th to 9th in the world 100m rankings following her Doha Diamond League result.", time: "2 hours ago", unread: true, source: "World Athletics" },
  { id: 2, athleteId: 2, athlete: "Hamish Kerr", avatar: "HK", type: "career", tag: "Career", title: "Coaching change confirmed", body: "Hamish Kerr confirmed a new coaching arrangement with Ross Jeffs at High Performance Sport NZ, effective immediately.", time: "5 hours ago", unread: true, source: "HPSNZ Press Release" },
  { id: 3, athleteId: 4, athlete: "Catriona Bisset", avatar: "CB", type: "sponsorships", tag: "Sponsorship", title: "New brand partnership", body: "Catriona Bisset announced a 2-year partnership with Mizuno Australia via her management agency Athletes Media Group.", time: "Yesterday", unread: true, source: "Athletes Media Group" },
  { id: 4, athleteId: 3, athlete: "Nick Willis", avatar: "NW", type: "media", tag: "Media", title: "Featured in Runner's World", body: "Nick Willis featured in a long-form Runner's World profile on longevity in elite middle-distance running.", time: "2 days ago", unread: false, source: "Runner's World" },
  { id: 5, athleteId: 5, athlete: "Peter Bol", avatar: "PB", type: "results", tag: "Results", title: "Season-best 800m", body: "Peter Bol ran a season-best 1:43.92 in the Oslo Diamond League — his fastest since 2022.", time: "3 days ago", unread: false, source: "World Athletics Live Results" },
  { id: 6, athleteId: 1, athlete: "Zoe Hobbs", avatar: "ZH", type: "media", tag: "Media", title: "TV interview published", body: "Zoe Hobbs interviewed on TVNZ Breakfast following her Diamond League appearance. 4 additional social media mentions.", time: "4 days ago", unread: false, source: "TVNZ / Social Monitor" },
  { id: 7, athleteId: 2, athlete: "Hamish Kerr", avatar: "HK", type: "results", tag: "Results", title: "Competition result", body: "Hamish Kerr cleared 2.28m in the Prefontaine Classic High Jump, finishing 3rd in a world-class field.", time: "5 days ago", unread: false, source: "World Athletics" },
];

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  results: { bg: "rgba(52,79,159,0.12)", text: "#344F9F" },
  media: { bg: "rgba(217,119,6,0.12)", text: "#D97706" },
  sponsorships: { bg: "rgba(5,150,105,0.12)", text: "#059669" },
  career: { bg: "rgba(231,93,80,0.12)", text: "#E75D50" },
};

const FILTER_TABS: { id: AlertFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "results", label: "Results" },
  { id: "media", label: "Media" },
  { id: "sponsorships", label: "Sponsorships" },
  { id: "career", label: "Career" },
];

export default function AlertsPage() {
  const [filter, setFilter] = useState<AlertFilter>("all");
  const [alerts, setAlerts] = useState(MOCK_ALERTS);

  const filtered = alerts.filter((a) => {
    if (filter === "unread") return a.unread;
    if (filter === "all") return true;
    return a.type === filter;
  });

  const unreadCount = alerts.filter((a) => a.unread).length;

  const markAllRead = () => setAlerts((prev) => prev.map((a) => ({ ...a, unread: false })));
  const markRead = (id: number) => setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, unread: false } : a));

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
            <p className="text-sm mt-1 text-[#6B7080]">Intelligence updates across your monitored athletes.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={markAllRead} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#DCE2EF] text-[12px] font-medium text-[#6B7080] hover:bg-white hover:shadow-sm transition-all">
              <CheckCheck size={13} />Mark all read
            </button>
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#DCE2EF] text-[12px] font-medium text-[#6B7080] hover:bg-white hover:shadow-sm transition-all">
              <Filter size={13} />Filter
            </button>
          </div>
        </header>

        {/* Filter tabs */}
        <div className="flex-shrink-0 px-8 pt-4 pb-3 border-b border-[#DCE2EF]">
          <div className="flex items-center gap-1">
            {FILTER_TABS.map((tab) => {
              const count = tab.id === "unread" ? unreadCount : tab.id === "all" ? alerts.length : alerts.filter((a) => a.type === tab.id).length;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${filter === tab.id ? "bg-[rgba(41,48,85,0.08)] text-[#293055]" : "text-[#6B7080] hover:text-[#1C1F3A] hover:bg-[#F0F2F8]"}`}
                >
                  {tab.label}
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${filter === tab.id ? "bg-[#293055] text-white" : "bg-[#EEF0F8] text-[#8A90A8]"}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Alert list */}
        <div className="flex-1 overflow-y-auto hide-scrollbar">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <div className="w-12 h-12 rounded-full bg-[#EEF0F8] flex items-center justify-center">
                <Bell size={20} className="text-[#A0A8C0]" />
              </div>
              <p className="text-[14px] font-medium text-[#6B7080]">No alerts in this category</p>
              <p className="text-[12px] text-[#A0A8C0]">Intelligence updates will appear here as agents find new information.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#F0F2F8]">
              {filtered.map((alert) => {
                const colors = TYPE_COLORS[alert.type] ?? TYPE_COLORS.results;
                return (
                  <div
                    key={alert.id}
                    className={`flex items-start gap-4 px-8 py-4 hover:bg-white transition-colors cursor-pointer group ${alert.unread ? "bg-[rgba(231,93,80,0.025)]" : ""}`}
                    onClick={() => markRead(alert.id)}
                  >
                    {/* Unread dot */}
                    <div className="w-2 shrink-0 flex items-center justify-center mt-2.5">
                      {alert.unread && <div className="w-2 h-2 rounded-full bg-[#E75D50]" />}
                    </div>

                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#293055] to-[#344F9F] flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                      {alert.avatar}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[13px] font-semibold text-[#1C1F3A]">{alert.athlete}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: colors.bg, color: colors.text }}>{alert.tag}</span>
                        <span className="text-[12px] font-medium text-[#1C1F3A]">{alert.title}</span>
                      </div>
                      <p className="text-[12px] text-[#6B7080] leading-relaxed mb-1.5">{alert.body}</p>
                      <div className="flex items-center gap-3 text-[11px] text-[#A0A8C0]">
                        <span>{alert.source}</span>
                        <span>·</span>
                        <span>{alert.time}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="shrink-0 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 rounded-lg text-[#A0A8C0] hover:text-[#6B7080] hover:bg-[#F0F2F8] transition-colors" title="Archive">
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
