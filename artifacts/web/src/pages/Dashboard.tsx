import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { Plus, Activity, Bell, Users, Search, ArrowUpRight, Clock, FileText, MoveRight, ChevronRight, Sparkles, MessageSquare } from "lucide-react";
import { useGetDashboard, useListAthletes, useListIntelligence } from "@workspace/api-client-react";
import { useUser } from "@clerk/react";

const ONBOARDING_KEY = "ai_onboarding_dismissed";
const CATEGORY_LABELS: Record<string, string> = {
  results_rankings: "Results",
  media_interviews: "Media",
  sponsorships: "Sponsorship",
  career_changes: "Career",
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 2) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Yesterday";
  return `${d} days ago`;
}

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { user } = useUser();
  const { data: dashboard } = useGetDashboard();
  const { data: athletesData } = useListAthletes();
  const { data: rawFeed } = useListIntelligence();
  const [onboardingDismissed, setOnboardingDismissed] = useState(
    () => localStorage.getItem(ONBOARDING_KEY) === "1"
  );

  const athletes = (athletesData ?? []) as any[];
  const feedItems = ((Array.isArray(rawFeed) ? rawFeed : (rawFeed as any)?.items ?? []) as any[]).slice(0, 8);

  const isLoading = dashboard === undefined && athletesData === undefined;
  const isEmptyRoster = athletesData !== undefined && athletes.length === 0;
  const showOnboarding = isEmptyRoster && !onboardingDismissed;

  const dismissOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, "1");
    setOnboardingDismissed(true);
  };

  const stats = {
    totalMonitored: dashboard?.totalAthletes ?? athletes.length,
    newItemsToday: dashboard?.newIntelligence ?? feedItems.length,
    unreadAlerts: dashboard?.priorityAlerts ?? 0,
    agentsActivePercent: dashboard ? Math.round((dashboard.activeAgents / Math.max(dashboard.totalAthletes, 1)) * 100) : (athletes.length > 0 ? 100 : 0),
  };

  return (
    <AppLayout activePage="dashboard">
      <div className="flex flex-col h-full" style={{ background: "#0D1C0B" }}>

        {/* Header */}
        <header className="flex-shrink-0 flex items-center justify-between px-8 pt-8 pb-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">Overview</h1>
            <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
              {athletes.length > 0
                ? `Monitoring ${stats.totalMonitored} athlete${stats.totalMonitored === 1 ? "" : "s"} across your roster.`
                : "Welcome to Athlete Intelligence — let's get started."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(255,255,255,0.35)" }} />
              <input
                type="text"
                aria-label="Search athletes"
                placeholder="Search athletes..."
                className="pl-9 pr-4 py-2 text-sm rounded-lg w-64 focus:outline-none transition-all"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  color: "rgba(255,255,255,0.85)",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#B9FF4A"; e.currentTarget.style.boxShadow = "0 0 0 2px rgba(185,255,74,0.12)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"; e.currentTarget.style.boxShadow = "none"; }}
              />
            </div>
            <Link href="/athletes/new" className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors" style={{ background: "#B9FF4A", color: "#0D1C0B" }}>
              <Plus className="w-4 h-4" />
              Add Athlete
            </Link>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 hide-scrollbar">

          {/* Onboarding */}
          {showOnboarding && (
            <div className="mb-8 rounded-2xl p-8 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #180D2D 0%, #0D1C0B 100%)", border: "1px solid rgba(200,189,255,0.20)" }}>
              <div className="absolute inset-0 opacity-15" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, #B9FF4A 0%, transparent 40%), radial-gradient(circle at 20% 80%, #C8BDFF 0%, transparent 40%)" }} />
              <button onClick={dismissOnboarding} className="absolute top-4 right-4 transition-colors text-lg font-light" style={{ color: "rgba(255,255,255,0.35)" }}>✕</button>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={18} style={{ color: "#B9FF4A" }} />
                  <span className="text-[12px] font-medium uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.50)" }}>Getting started</span>
                </div>
                <h2 className="text-[22px] font-bold text-white mb-1">Welcome to Athlete Intelligence</h2>
                <p className="text-[13px] mb-8 max-w-xl" style={{ color: "rgba(255,255,255,0.55)" }}>
                  Your AI-powered intelligence platform for tracking and analysing athletes across all sports.
                </p>
                <div className="grid grid-cols-4 gap-4 mb-8">
                  {[
                    { step: 1, label: "Add an athlete", desc: "Search by name — AI populates the full dossier automatically.", action: () => navigate("/athletes/new"), cta: "Add athlete", icon: <Users size={16} /> },
                    { step: 2, label: "Review the dossier", desc: "Intelligence, rankings, career timeline, contacts and source evidence.", action: null, cta: null, icon: <Activity size={16} /> },
                    { step: 3, label: "Generate AI summary", desc: "Get a full career briefing powered by AI — regenerate any time.", action: null, cta: null, icon: <Sparkles size={16} /> },
                    { step: 4, label: "Ask AI anything", desc: "Chat with your full roster using natural language.", action: () => navigate("/chat"), cta: "Open chat", icon: <MessageSquare size={16} /> },
                  ].map(({ step, label, desc, action, cta, icon }) => (
                    <div key={step} className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold" style={{ background: "#B9FF4A", color: "#0D1C0B" }}>{step}</span>
                        <span style={{ color: "rgba(255,255,255,0.40)" }}>{icon}</span>
                      </div>
                      <h4 className="text-[13px] font-semibold text-white mb-1">{label}</h4>
                      <p className="text-[11px] leading-relaxed mb-3" style={{ color: "rgba(255,255,255,0.50)" }}>{desc}</p>
                      {action && cta && (
                        <button onClick={action} className="text-[11px] font-medium flex items-center gap-1 transition-colors" style={{ color: "#B9FF4A" }}>
                          {cta} <ChevronRight size={11} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-4">
                  <Link href="/athletes/new">
                    <span className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-[13px] font-bold cursor-pointer" style={{ background: "#B9FF4A", color: "#0D1C0B" }}>
                      <Plus size={14} /> Add your first athlete
                    </span>
                  </Link>
                  <button onClick={dismissOnboarding} className="text-[12px] transition-colors" style={{ color: "rgba(255,255,255,0.40)" }}>
                    Skip for now
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Summary Stats */}
          {isLoading ? (
            <div className="grid grid-cols-4 gap-4 mb-8" aria-busy="true">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="rounded-xl p-5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="h-4 w-28 rounded animate-pulse mb-3" style={{ background: "rgba(255,255,255,0.08)" }} />
                  <div className="h-8 w-12 rounded animate-pulse mb-2" style={{ background: "rgba(255,255,255,0.06)" }} />
                  <div className="h-3 w-36 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.05)" }} />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="rounded-xl p-5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.50)" }}>Total Monitored</div>
                  <Users className="w-4 h-4" style={{ color: "rgba(255,255,255,0.30)" }} />
                </div>
                <div className="text-2xl font-semibold text-white">{stats.totalMonitored}</div>
                <div className="text-xs mt-2 flex items-center gap-1" style={{ color: "rgba(255,255,255,0.35)" }}>
                  <span className="text-emerald-400 flex items-center"><ArrowUpRight className="w-3 h-3" /> 3</span>
                  <span>since last month</span>
                </div>
              </div>
              <div className="rounded-xl p-5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.50)" }}>New Items Today</div>
                  <Activity className="w-4 h-4" style={{ color: "#B9FF4A" }} />
                </div>
                <div className="text-2xl font-semibold text-white">{stats.newItemsToday}</div>
                <div className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.35)" }}>Across 12 different sources</div>
              </div>
              <div className="rounded-xl p-5 relative overflow-hidden group cursor-pointer transition-all" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="flex items-start justify-between mb-3 relative z-10">
                  <div className="text-sm font-medium transition-colors" style={{ color: "rgba(255,255,255,0.50)" }}>Unread Alerts</div>
                  <Bell className="w-4 h-4" style={{ color: "#B9FF4A" }} />
                </div>
                <div className="text-2xl font-semibold text-white relative z-10">{stats.unreadAlerts}</div>
                <div className="text-xs mt-2 flex items-center gap-1 relative z-10 font-medium" style={{ color: "#B9FF4A" }}>
                  Review required <MoveRight className="w-3 h-3" />
                </div>
              </div>
              <div className="rounded-xl p-5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.50)" }}>Agents Active</div>
                  <div className="w-2 h-2 rounded-full mt-1" style={{ background: "#4ade80", boxShadow: "0 0 8px rgba(74,222,128,0.6)" }}></div>
                </div>
                <div className="text-2xl font-semibold text-white">{stats.agentsActivePercent}%</div>
                <div className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.35)" }}>All core scrapers functional</div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-6">

            {/* Athlete roster */}
            <div className="col-span-2 rounded-xl flex flex-col min-h-[400px]" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="p-5 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <h2 className="text-sm font-medium text-white">Priority Targets</h2>
                <button className="text-xs font-medium transition-colors" style={{ color: "rgba(255,255,255,0.40)" }}>View All</button>
              </div>

              <div className="flex-1">
                <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr] px-5 py-3 text-xs font-medium uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.30)", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                  <div>Athlete</div>
                  <div>Status / PB</div>
                  <div>Last Update</div>
                  <div className="text-right">Action</div>
                </div>

                <div className="flex flex-col">
                  {athletes.map((athlete: any, i: number) => (
                    <div key={i} className="grid grid-cols-[2fr_1.5fr_1fr_1fr] items-center px-5 py-4 cursor-pointer group transition-colors" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-8 h-8 rounded flex items-center justify-center text-[10px] font-bold text-white" style={{ background: athlete.status === "paused" ? "rgba(255,255,255,0.08)" : "rgba(185,255,74,0.15)", color: athlete.status === "paused" ? "rgba(255,255,255,0.30)" : "#B9FF4A" }}>
                            {athlete.avatar || athlete.name.split(" ").map((n: string) => n[0]).join("").substring(0, 2)}
                          </div>
                          {athlete.alert && (
                            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2" style={{ background: "#B9FF4A", borderColor: "#0D1C0B" }}></div>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium flex items-center gap-2" style={{ color: athlete.status === "paused" ? "rgba(255,255,255,0.30)" : "rgba(255,255,255,0.90)" }}>
                            {athlete.name}
                            {athlete.unread > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-sm font-semibold" style={{ background: "rgba(185,255,74,0.12)", color: "#B9FF4A", border: "1px solid rgba(185,255,74,0.20)" }}>
                                {athlete.unread} new
                              </span>
                            )}
                          </div>
                          <div className="text-xs mt-0.5 flex items-center gap-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                            <span>{athlete.country}</span>
                            <span className="w-1 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.20)" }}></span>
                            <span>{athlete.sport}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="text-xs" style={{ color: "rgba(255,255,255,0.60)" }}>{athlete.rank || "National Squad"}</div>
                        <div className="text-xs mt-0.5 font-mono" style={{ color: "rgba(255,255,255,0.35)" }}>PB: {athlete.pb || "—"}</div>
                      </div>

                      <div className="text-xs flex items-center gap-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                        <Clock size={12} />
                        {athlete.lastUpdate || "Recently"}
                      </div>

                      <div className="flex justify-end">
                        <Link href={`/athletes/${athlete.id}`} className="text-xs px-3 py-1.5 rounded-md transition-colors opacity-0 group-hover:opacity-100" style={{ color: "rgba(255,255,255,0.70)", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)" }}>
                          Profile
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Intelligence Feed */}
            <div className="rounded-xl flex flex-col" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="p-5 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <h2 className="text-sm font-medium text-white flex items-center gap-2">
                  <Activity size={14} style={{ color: "#B9FF4A" }} />
                  Live Intelligence
                </h2>
                <Link href="/intelligence">
                  <span className="text-xs font-medium transition-colors cursor-pointer flex items-center gap-1" style={{ color: "rgba(255,255,255,0.40)" }}>
                    View all <ChevronRight size={11} />
                  </span>
                </Link>
              </div>

              <div className="p-5 flex-1 overflow-y-auto hide-scrollbar relative">
                {feedItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                    <Activity size={16} style={{ color: "rgba(255,255,255,0.20)" }} />
                    <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.35)" }}>No intelligence yet — add athletes to begin monitoring.</p>
                    <Link href="/athletes/new">
                      <span className="text-[11px] cursor-pointer" style={{ color: "#B9FF4A" }}>Add first athlete →</span>
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="absolute" style={{ left: 29, top: 20, bottom: 20, width: 1, background: "rgba(255,255,255,0.07)" }}></div>
                    <div className="flex flex-col gap-5 relative z-10">
                      {feedItems.map((item: any, i: number) => (
                        <div key={item.id} className="relative pl-8">
                          <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full border-2" style={{ background: i < 2 ? "#B9FF4A" : "rgba(255,255,255,0.15)", borderColor: "#0D1C0B" }}></div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-white">{item.athleteName}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: "rgba(255,255,255,0.45)", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                              {CATEGORY_LABELS[item.category] ?? item.category}
                            </span>
                            <span className="text-[10px] ml-auto" style={{ color: "rgba(255,255,255,0.28)" }}>{timeAgo(item.discoveredAt)}</span>
                          </div>
                          <p className="text-xs leading-relaxed mb-1.5" style={{ color: "rgba(255,255,255,0.65)" }}>{item.title}</p>
                          <div className="flex items-center gap-1.5 p-1.5 rounded" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                            <FileText size={11} style={{ color: "rgba(255,255,255,0.25)" }} />
                            <span className="text-[10px] font-mono truncate" style={{ color: "rgba(255,255,255,0.35)" }}>{item.sourceDomain}</span>
                            <span className="text-[10px] ml-auto" style={{ color: "rgba(185,255,74,0.70)" }}>{item.confidence}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </AppLayout>
  );
}
