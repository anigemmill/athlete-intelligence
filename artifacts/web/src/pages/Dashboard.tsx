import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { Plus, Activity, Bell, Users, Search, ArrowUpRight, Clock, FileText, Database, ShieldAlert, BarChart3, Medal, MoveRight, ChevronRight, Sparkles, MessageSquare } from "lucide-react";
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
  const feedItems = ((Array.isArray(rawFeed) ? rawFeed : (rawFeed as any)?.items ?? []) as any[])
    .slice(0, 8);

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
      <div className="flex flex-col h-full bg-[#FCFAFA]">
        
        {/* Header */}
        <header className="flex-shrink-0 flex items-center justify-between px-8 pt-8 pb-6 border-b border-[#DCE2EF]">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#1C1F3A]">Overview</h1>
            <p className="text-sm mt-1 text-[#6B7080]">
              {athletes.length > 0
                ? `Monitoring ${stats.totalMonitored} athlete${stats.totalMonitored === 1 ? "" : "s"} across your roster.`
                : "Welcome to Athlete Intelligence — let's get started."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A90A8] w-4 h-4" />
              <input 
                type="text"
                aria-label="Search athletes"
                placeholder="Search athletes..." 
                className="bg-[#FFFFFF] border border-[#DCE2EF] rounded-lg pl-9 pr-4 py-2 text-sm text-[#1C1F3A] placeholder:text-[#9097B0] focus:outline-none focus:border-[#E75D50] focus:ring-1 focus:ring-[#E75D50] transition-all w-64 shadow-sm"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-60">
                <kbd className="bg-[rgba(41,48,85,0.06)] rounded px-1.5 py-0.5 text-[10px] font-mono text-[#6B7080] border border-[#DCE2EF]">⌘</kbd>
                <kbd className="bg-[rgba(41,48,85,0.06)] rounded px-1.5 py-0.5 text-[10px] font-mono text-[#6B7080] border border-[#DCE2EF]">K</kbd>
              </div>
            </div>
            <Link href="/athletes/new" className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#E75D50] hover:bg-[#D04840] text-white shadow-sm transition-colors">
              <Plus className="w-4 h-4" />
              Add Athlete
            </Link>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 hide-scrollbar">
          
          {/* Onboarding — shown only when roster is empty */}
          {showOnboarding && (
            <div className="mb-8 rounded-2xl border border-[#DCE2EF] bg-gradient-to-br from-[#293055] to-[#344F9F] p-8 shadow-lg relative overflow-hidden">
              {/* Background texture */}
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, #E75D50 0%, transparent 40%), radial-gradient(circle at 20% 80%, #FFFFFF 0%, transparent 40%)" }} />
              <button onClick={dismissOnboarding} className="absolute top-4 right-4 text-white/40 hover:text-white/80 transition-colors text-lg font-light">✕</button>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={18} className="text-[#E75D50]" />
                  <span className="text-white/70 text-[12px] font-medium uppercase tracking-wider">Getting started</span>
                </div>
                <h2 className="text-[22px] font-bold text-white mb-1">Welcome to Athlete Intelligence</h2>
                <p className="text-white/70 text-[13px] mb-8 max-w-xl">
                  Your AI-powered intelligence platform for tracking and analysing athletes across all sports. Follow these steps to get your first dossier live.
                </p>
                <div className="grid grid-cols-4 gap-4 mb-8">
                  {[
                    { step: 1, label: "Add an athlete", desc: "Search by name — our AI identifies and populates the full dossier automatically.", action: () => navigate("/athletes/new"), cta: "Add athlete", icon: <Users size={16} /> },
                    { step: 2, label: "Review the dossier", desc: "Intelligence, rankings, career timeline, contacts and source evidence — all in one place.", action: null, cta: null, icon: <Activity size={16} /> },
                    { step: 3, label: "Generate AI summary", desc: "Get a full career briefing powered by AI — regenerate any time.", action: null, cta: null, icon: <Sparkles size={16} /> },
                    { step: 4, label: "Ask AI anything", desc: "Chat with your full roster using natural language to extract intelligence fast.", action: () => navigate("/chat"), cta: "Open chat", icon: <MessageSquare size={16} /> },
                  ].map(({ step, label, desc, action, cta, icon }) => (
                    <div key={step} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/15">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-6 h-6 rounded-full bg-[#E75D50] flex items-center justify-center text-[11px] font-bold text-white">{step}</span>
                        <span className="text-white/60">{icon}</span>
                      </div>
                      <h4 className="text-[13px] font-semibold text-white mb-1">{label}</h4>
                      <p className="text-[11px] text-white/60 leading-relaxed mb-3">{desc}</p>
                      {action && cta && (
                        <button onClick={action} className="text-[11px] font-medium text-[#E75D50] hover:text-white transition-colors flex items-center gap-1">
                          {cta} <ChevronRight size={11} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-4">
                  <Link href="/athletes/new">
                    <span className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#E75D50] hover:bg-[#D04840] text-white text-[13px] font-semibold transition-colors cursor-pointer shadow-lg">
                      <Plus size={14} /> Add your first athlete
                    </span>
                  </Link>
                  <button onClick={dismissOnboarding} className="text-white/50 hover:text-white/80 text-[12px] transition-colors">
                    Skip for now
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Summary Stats */}
          {isLoading ? (
            <div className="grid grid-cols-4 gap-4 mb-8" aria-busy="true" aria-label="Loading statistics">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="bg-white border border-[#DCE2EF] rounded-xl p-5 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-4 w-28 bg-[#DCE2EF] rounded animate-pulse" />
                    <div className="h-4 w-4 bg-[#DCE2EF] rounded animate-pulse" />
                  </div>
                  <div className="h-8 w-12 bg-[#DCE2EF] rounded animate-pulse mb-2" />
                  <div className="h-3 w-36 bg-[#F0F2F7] rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="bg-white border border-[#DCE2EF] rounded-xl p-5 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div className="text-sm font-medium text-[#6B7080]">Total Monitored</div>
                  <Users className="w-4 h-4 text-[#8A90A8]" />
                </div>
                <div className="text-2xl font-semibold text-[#1C1F3A]">{stats.totalMonitored}</div>
                <div className="text-xs text-[#8A90A8] mt-2 flex items-center gap-1">
                  <span className="text-emerald-500 flex items-center"><ArrowUpRight className="w-3 h-3" /> 3</span>
                  <span>since last month</span>
                </div>
              </div>
              <div className="bg-white border border-[#DCE2EF] rounded-xl p-5 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div className="text-sm font-medium text-[#6B7080]">New Items Today</div>
                  <Activity className="w-4 h-4 text-[#E75D50]" />
                </div>
                <div className="text-2xl font-semibold text-[#1C1F3A]">{stats.newItemsToday}</div>
                <div className="text-xs text-[#8A90A8] mt-2 flex items-center gap-1">
                  <span>Across 12 different sources</span>
                </div>
              </div>
              <div className="bg-white border border-[#DCE2EF] rounded-xl p-5 shadow-sm relative overflow-hidden group cursor-pointer transition-colors hover:border-[#E75D50]">
                <div className="absolute inset-0 bg-[#E75D50]/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="flex items-start justify-between mb-3 relative z-10">
                  <div className="text-sm font-medium text-[#6B7080] group-hover:text-[#1C1F3A] transition-colors">Unread Alerts</div>
                  <Bell className="w-4 h-4 text-[#E75D50]" />
                </div>
                <div className="text-2xl font-semibold text-[#1C1F3A] relative z-10">{stats.unreadAlerts}</div>
                <div className="text-xs text-[#E75D50] mt-2 flex items-center gap-1 relative z-10 font-medium">
                  Review required <MoveRight className="w-3 h-3" />
                </div>
              </div>
              <div className="bg-white border border-[#DCE2EF] rounded-xl p-5 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div className="text-sm font-medium text-[#6B7080]">Agents Active</div>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                </div>
                <div className="text-2xl font-semibold text-[#1C1F3A]">{stats.agentsActivePercent}%</div>
                <div className="text-xs text-[#8A90A8] mt-2 flex items-center gap-1">
                  <span>All core scrapers functional</span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-6">
            
            {/* Primary Section: Monitored Athletes */}
            <div className="col-span-2 bg-white border border-[#DCE2EF] rounded-xl shadow-sm flex flex-col min-h-[400px]">
              <div className="p-5 border-b border-[#DCE2EF] flex items-center justify-between">
                <h2 className="text-sm font-medium text-[#1C1F3A]">Priority Targets</h2>
                <button className="text-xs text-[#6B7080] hover:text-[#E75D50] font-medium transition-colors">View All</button>
              </div>
              
              <div className="flex-1">
                <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr] px-5 py-3 text-xs font-medium text-[#8A90A8] border-b border-[#DCE2EF] uppercase tracking-wider bg-[#FCFAFA]">
                  <div>Athlete</div>
                  <div>Status / PB</div>
                  <div>Last Update</div>
                  <div className="text-right">Action</div>
                </div>
                
                <div className="flex flex-col">
                  {athletes.map((athlete: any, i: number) => (
                    <div key={i} className="grid grid-cols-[2fr_1.5fr_1fr_1fr] items-center px-5 py-4 border-b border-[#DCE2EF] last:border-0 hover:bg-[#FCFAFA] cursor-pointer group transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className={`w-8 h-8 rounded bg-gradient-to-br flex items-center justify-center text-[10px] font-bold text-white shadow-inner
                            ${athlete.status === 'paused' ? 'from-zinc-400 to-zinc-500' : 'from-[#E75D50] to-[#C84840]'}
                          `}>
                            {athlete.avatar || athlete.name.split(' ').map((n: string) => n[0]).join('').substring(0,2)}
                          </div>
                          {athlete.alert && (
                            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#E75D50] border-2 border-white"></div>
                          )}
                        </div>
                        <div>
                          <div className={`text-sm font-medium flex items-center gap-2 ${athlete.status === 'paused' ? 'text-[#8A90A8]' : 'text-[#1C1F3A]'}`}>
                            {athlete.name}
                            {athlete.unread > 0 && (
                              <span className="bg-[rgba(231,93,80,0.1)] text-[#E75D50] text-[10px] px-1.5 py-0.5 rounded-sm font-semibold border border-[rgba(231,93,80,0.2)]">
                                {athlete.unread} new
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-[#8A90A8] mt-0.5 flex items-center gap-1.5">
                            <span className="opacity-80">{athlete.country}</span>
                            <span className="w-1 h-1 rounded-full bg-[#DCE2EF]"></span>
                            <span>{athlete.sport}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <div className={`text-xs ${athlete.status === 'paused' ? 'text-[#9097B0]' : 'text-[#3D426A]'}`}>
                          {athlete.rank || "National Squad"}
                        </div>
                        <div className="text-xs text-[#8A90A8] mt-0.5 font-mono">
                          PB: {athlete.pb || "-"}
                        </div>
                      </div>
                      
                      <div className="text-xs text-[#8A90A8] flex items-center gap-1.5">
                        <Clock size={12} />
                        {athlete.lastUpdate || "Recently"}
                      </div>
                      
                      <div className="flex justify-end">
                        <Link href={`/athletes/${athlete.id}`} className="text-xs text-[#6B7080] group-hover:text-[#1C1F3A] px-3 py-1.5 rounded-md hover:bg-white transition-colors border border-transparent group-hover:border-[#DCE2EF] shadow-sm opacity-0 group-hover:opacity-100">
                          Profile
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Secondary Section: Intelligence Feed */}
            <div className="bg-white border border-[#DCE2EF] rounded-xl shadow-sm flex flex-col">
              <div className="p-5 border-b border-[#DCE2EF] flex items-center justify-between">
                <h2 className="text-sm font-medium text-[#1C1F3A] flex items-center gap-2">
                  <Activity size={14} className="text-[#E75D50]" />
                  Live Intelligence
                </h2>
                <Link href="/intelligence">
                  <span className="text-xs text-[#6B7080] hover:text-[#E75D50] font-medium transition-colors cursor-pointer flex items-center gap-1">
                    View all <ChevronRight size={11} />
                  </span>
                </Link>
              </div>
              
              <div className="p-5 flex-1 overflow-y-auto hide-scrollbar relative">
                {feedItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                    <Activity size={16} className="text-[#C0C8DC]" />
                    <p className="text-[12px] text-[#8A90A8]">No intelligence yet — add athletes to begin monitoring.</p>
                    <Link href="/athletes/new">
                      <span className="text-[11px] text-[#344F9F] hover:underline cursor-pointer">Add first athlete →</span>
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="absolute left-[29px] top-5 bottom-5 w-px bg-[#DCE2EF]"></div>
                    <div className="flex flex-col gap-5 relative z-10">
                      {feedItems.map((item: any, i: number) => (
                        <div key={item.id} className="relative pl-8">
                          <div className={`absolute left-0 top-1.5 w-2 h-2 rounded-full border-2 border-white ${i < 2 ? 'bg-[#E75D50]' : 'bg-[#C0C8DC] shadow-sm'}`}></div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-[#1C1F3A]">{item.athleteName}</span>
                            <span className="text-[10px] text-[#8A90A8] px-1.5 py-0.5 rounded bg-[#FCFAFA] border border-[#DCE2EF]">
                              {CATEGORY_LABELS[item.category] ?? item.category}
                            </span>
                            <span className="text-[10px] text-[#A0A8C0] ml-auto">{timeAgo(item.discoveredAt)}</span>
                          </div>
                          <p className="text-xs leading-relaxed text-[#3D426A] mb-1.5">{item.title}</p>
                          <div className="flex items-center gap-1.5 bg-[#FCFAFA] p-1.5 rounded border border-[#DCE2EF]">
                            <FileText size={11} className="text-[#A0A8C0]" />
                            <span className="text-[10px] font-mono text-[#8A90A8] truncate">{item.sourceDomain}</span>
                            <span className="text-[10px] text-[#A0A8C0] ml-auto">{item.confidence}%</span>
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
