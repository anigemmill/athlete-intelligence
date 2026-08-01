import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Plus, Activity, Bell, Users, Search, ChevronRight, Sparkles,
  MessageSquare, ArrowUpRight, Clock, FileText, Zap,
} from "lucide-react";
import { useGetDashboard, useListAthletes, useListIntelligence } from "@workspace/api-client-react";
import { useUser } from "@clerk/react";
import { TiltCard } from "@/components/3d/TiltCard";
import { T, CATEGORY_TOKENS, freshnessColor } from "@/lib/tokens";
import { DsMetric, DsBadge, DsStatusDot, DsEmptyState, DsLoadingSkeleton, DsCard, DsCardHeader } from "@/components/ui/ds";

const ONBOARDING_KEY = "ai_onboarding_dismissed";

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

/** Narrow confidence bar — inline visualization */
function ConfBar({ pct }: { pct: number }) {
  const color = pct >= 90 ? T.statusFresh : pct >= 70 ? T.statusAging : T.lavender;
  return (
    <div className="flex items-center gap-1.5 min-w-[52px]">
      <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: T.bgElevated }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[10px] tabular-nums shrink-0" style={{ color: T.t40 }}>{pct}%</span>
    </div>
  );
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
    .slice(0, 10);

  const isLoading = dashboard === undefined && athletesData === undefined;
  const isEmptyRoster = athletesData !== undefined && athletes.length === 0;
  const showOnboarding = isEmptyRoster && !onboardingDismissed;

  const dismissOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, "1");
    setOnboardingDismissed(true);
  };

  const stats = {
    totalMonitored:      dashboard?.totalAthletes ?? athletes.length,
    newItemsToday:       dashboard?.newIntelligence ?? feedItems.length,
    unreadAlerts:        dashboard?.priorityAlerts ?? 0,
    agentsActivePercent: dashboard
      ? Math.round((dashboard.activeAgents / Math.max(dashboard.totalAthletes, 1)) * 100)
      : athletes.length > 0 ? 100 : 0,
  };

  return (
    <AppLayout activePage="dashboard">
      <div className="flex flex-col h-full" style={{ background: T.bgPage }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header
          className="flex-shrink-0 flex items-center justify-between px-8 pt-7 pb-5"
          style={{ borderBottom: `1px solid ${T.borderDefault}` }}
        >
          <div>
            <h1 className="text-[22px] font-bold tracking-tight" style={{ color: T.t92 }}>
              Overview
            </h1>
            <p className="text-[13px] mt-0.5" style={{ color: T.t55 }}>
              {athletes.length > 0
                ? `Monitoring ${stats.totalMonitored} athlete${stats.totalMonitored === 1 ? "" : "s"} — ${new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}`
                : "Welcome to Athlete Intelligence — let's get your first athlete monitored."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: T.t40 }} />
              <input
                type="text"
                aria-label="Search athletes"
                placeholder="Search athletes…"
                className="pl-9 pr-4 py-2 text-[13px] rounded-lg outline-none w-56 transition-colors"
                style={{
                  background: T.bgInput,
                  border: `1px solid ${T.borderDefault}`,
                  color: T.t70,
                }}
                onFocus={e => (e.currentTarget.style.borderColor = T.borderStrong)}
                onBlur={e  => (e.currentTarget.style.borderColor = T.borderDefault)}
              />
            </div>
            <Link href="/athletes/new">
              <span
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer transition-opacity hover:opacity-90"
                style={{ background: T.lime, color: T.limeFg }}
              >
                <Plus className="w-4 h-4" />
                Add Athlete
              </span>
            </Link>
          </div>
        </header>

        {/* ── Scrollable content ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto hide-scrollbar p-8">

          {/* ── Onboarding ──────────────────────────────────────────────── */}
          {showOnboarding && (
            <div
              className="mb-8 rounded-2xl p-8 relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, rgba(185,255,74,0.12) 0%, rgba(200,189,255,0.08) 100%)",
                border: `1px solid ${T.borderLime}`,
              }}
            >
              <div className="absolute inset-0 opacity-5 pointer-events-none"
                style={{ backgroundImage: "radial-gradient(circle at 80% 20%, #B9FF4A 0%, transparent 50%), radial-gradient(circle at 20% 80%, #C8BDFF 0%, transparent 50%)" }} />
              <button
                onClick={dismissOnboarding}
                className="absolute top-4 right-4 text-lg font-light transition-colors"
                style={{ color: T.t40 }}
                onMouseEnter={e => (e.currentTarget.style.color = T.t70)}
                onMouseLeave={e => (e.currentTarget.style.color = T.t40)}
              >✕</button>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={16} style={{ color: T.lime }} />
                  <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: T.t40 }}>Getting started</span>
                </div>
                <h2 className="text-[20px] font-bold mb-1" style={{ color: T.t92 }}>Welcome to Athlete Intelligence</h2>
                <p className="text-[13px] mb-8 max-w-xl leading-relaxed" style={{ color: T.t55 }}>
                  Your AI-powered intelligence platform for tracking and analysing athletes. Follow these steps to get your first dossier live.
                </p>
                <div className="grid grid-cols-4 gap-4 mb-8">
                  {[
                    { step: 1, label: "Add an athlete",       desc: "Search by name — AI identifies and populates the full dossier automatically.", action: () => navigate("/athletes/new"), cta: "Add athlete",   icon: <Users size={14} /> },
                    { step: 2, label: "Review the dossier",   desc: "Intelligence, rankings, career timeline, contacts and evidence — all in one place.",  action: null,                      cta: null,           icon: <Activity size={14} /> },
                    { step: 3, label: "Generate AI summary",  desc: "Get a full career briefing powered by AI — regenerate any time.",                     action: null,                      cta: null,           icon: <Sparkles size={14} /> },
                    { step: 4, label: "Ask AI anything",      desc: "Chat with your full roster using natural language to extract intelligence fast.",      action: () => navigate("/chat"),   cta: "Open chat",   icon: <MessageSquare size={14} /> },
                  ].map(({ step, label, desc, action, cta, icon }) => (
                    <div
                      key={step}
                      className="rounded-xl p-4"
                      style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${T.borderDefault}` }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                          style={{ background: T.lime, color: T.limeFg }}
                        >{step}</span>
                        <span style={{ color: T.t40 }}>{icon}</span>
                      </div>
                      <h4 className="text-[13px] font-semibold mb-1" style={{ color: T.t92 }}>{label}</h4>
                      <p className="text-[11px] leading-relaxed mb-3" style={{ color: T.t55 }}>{desc}</p>
                      {action && cta && (
                        <button onClick={action} className="text-[11px] font-semibold flex items-center gap-1 transition-opacity hover:opacity-80" style={{ color: T.lime }}>
                          {cta} <ChevronRight size={11} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-4">
                  <Link href="/athletes/new">
                    <span
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-semibold cursor-pointer transition-opacity hover:opacity-90"
                      style={{ background: T.lime, color: T.limeFg }}
                    >
                      <Plus size={14} /> Add your first athlete
                    </span>
                  </Link>
                  <button onClick={dismissOnboarding} className="text-[12px] transition-colors" style={{ color: T.t40 }}
                    onMouseEnter={e => (e.currentTarget.style.color = T.t70)}
                    onMouseLeave={e => (e.currentTarget.style.color = T.t40)}>
                    Skip for now
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Stat cards ──────────────────────────────────────────────── */}
          {isLoading ? (
            <div className="grid grid-cols-4 gap-4 mb-8">
              {[0,1,2,3].map((i) => (
                <div key={i} className="rounded-xl p-5 animate-pulse" style={{ background: T.bgCard, border: `1px solid ${T.borderDefault}` }}>
                  <div className="h-3 w-24 rounded mb-4" style={{ background: T.bgElevated }} />
                  <div className="h-8 w-14 rounded mb-2" style={{ background: T.bgElevated }} />
                  <div className="h-2.5 w-32 rounded" style={{ background: T.bgCard }} />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4 mb-8">
              <DsMetric
                label="Today's Activity"
                value={stats.newItemsToday}
                sub={<><ArrowUpRight size={11} style={{ color: T.statusFresh }} /><span style={{ color: T.statusFresh }}>intelligence items discovered</span></>}
                icon={<Activity size={14} />}
                accent="lime"
              />
              <DsMetric
                label="Monitored Athletes"
                value={stats.totalMonitored}
                sub={<><Users size={11} /><span>across your active roster</span></>}
                icon={<Users size={14} />}
                accent="none"
              />
              <DsMetric
                label="Unread Alerts"
                value={stats.unreadAlerts}
                sub={stats.unreadAlerts > 0
                  ? <><span style={{ color: T.statusAlert }}>requires attention</span></>
                  : <><span style={{ color: T.statusFresh }}>all clear</span></>}
                icon={<Bell size={14} />}
                accent={stats.unreadAlerts > 0 ? "amber" : "none"}
                onClick={() => navigate("/alerts")}
              />
              <DsMetric
                label="Agents Active"
                value={`${stats.agentsActivePercent}%`}
                sub={<><DsStatusDot color={T.statusActive} pulse /><span>all scrapers functional</span></>}
                icon={<Zap size={14} />}
                accent="none"
              />
            </div>
          )}

          {/* ── Main grid ───────────────────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-6">

            {/* ── Athletes roster ───────────────────────────────────────── */}
            <div className="col-span-2 flex flex-col" style={{ minHeight: 420 }}>
              <DsCard padded={false} className="flex-1 flex flex-col overflow-hidden">
                <DsCardHeader>
                  <span className="text-[13px] font-semibold" style={{ color: T.t92 }}>Priority Targets</span>
                  <Link href="/athletes">
                    <span className="text-[12px] transition-colors cursor-pointer flex items-center gap-1" style={{ color: T.t40 }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = T.t70)}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = T.t40)}>
                      View all <ChevronRight size={11} />
                    </span>
                  </Link>
                </DsCardHeader>

                {/* Column headers */}
                <div
                  className="grid grid-cols-[2fr_1.5fr_1fr_80px] px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: T.t40, borderBottom: `1px solid ${T.borderSubtle}`, background: T.bgCard }}
                >
                  <div>Athlete</div>
                  <div>Status / Rank</div>
                  <div>Data Freshness</div>
                  <div className="text-right">Action</div>
                </div>

                <div className="flex-1 flex flex-col">
                  {isLoading ? (
                    <div className="p-5"><DsLoadingSkeleton rows={5} /></div>
                  ) : athletes.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center p-8">
                      <DsEmptyState
                        icon={<Users size={22} />}
                        title="No athletes yet"
                        description="Add your first athlete and the intelligence engine will start monitoring immediately."
                        action={
                          <Link href="/athletes/new">
                            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold cursor-pointer"
                              style={{ background: T.lime, color: T.limeFg }}>
                              <Plus size={13} /> Add athlete
                            </span>
                          </Link>
                        }
                      />
                    </div>
                  ) : (
                    athletes.map((athlete: any, i: number) => {
                      const freshColor = freshnessColor(athlete.lastCrawledAt);
                      const catKey = athlete.latestCategory as string | undefined;
                      return (
                        <div
                          key={athlete.id ?? i}
                          className="group"
                          style={{ borderBottom: `1px solid ${T.borderSubtle}` }}
                          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = T.bgCardHover)}
                          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                        >
                        <TiltCard
                          intensity={3}
                          className="grid grid-cols-[2fr_1.5fr_1fr_80px] items-center px-5 py-3.5 cursor-pointer"
                        >
                          {/* Athlete identity */}
                          <div className="flex items-center gap-3">
                            <div className="relative shrink-0">
                              {athlete.photoUrl ? (
                                <img
                                  src={athlete.photoUrl}
                                  alt={athlete.name}
                                  className="w-8 h-8 rounded object-cover"
                                  style={{ border: `1px solid ${T.borderDefault}` }}
                                />
                              ) : (
                                <div
                                  className="w-8 h-8 rounded flex items-center justify-center text-[10px] font-bold"
                                  style={{ background: T.bgHighlight, color: T.lime }}
                                >
                                  {athlete.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                                </div>
                              )}
                              {athlete.alert && (
                                <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full" style={{ background: T.statusAlert, border: `2px solid ${T.bgPage}` }} />
                              )}
                            </div>
                            <div>
                              <div className="text-[13px] font-semibold flex items-center gap-2" style={{ color: athlete.agentStatus === "paused" ? T.t40 : T.t92 }}>
                                {athlete.name}
                                {(athlete.unread ?? 0) > 0 && (
                                  <DsBadge variant="lime">{athlete.unread} new</DsBadge>
                                )}
                              </div>
                              <div className="text-[11px] mt-0.5 flex items-center gap-1.5" style={{ color: T.t40 }}>
                                <span>{athlete.country}</span>
                                <span className="w-0.5 h-0.5 rounded-full" style={{ background: T.borderStrong }} />
                                <span>{athlete.sport}</span>
                              </div>
                            </div>
                          </div>

                          {/* Rank / status */}
                          <div>
                            <div className="text-[12px]" style={{ color: athlete.agentStatus === "paused" ? T.t40 : T.t70 }}>
                              {athlete.rank || "National Squad"}
                            </div>
                            {catKey && CATEGORY_TOKENS[catKey] && (
                              <div className="mt-0.5">
                                <DsBadge category={catKey}>{CATEGORY_TOKENS[catKey].label}</DsBadge>
                              </div>
                            )}
                          </div>

                          {/* Data freshness */}
                          <div className="flex items-center gap-2">
                            <DsStatusDot color={freshColor} />
                            <span className="text-[11px]" style={{ color: T.t40 }}>
                              {athlete.lastCrawledAt
                                ? timeAgo(athlete.lastCrawledAt)
                                : "Never"}
                            </span>
                          </div>

                          {/* Action */}
                          <div className="flex justify-end">
                            <Link href={`/athletes/${athlete.id}`}>
                              <span
                                className="text-[11px] px-2.5 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                                style={{ background: T.bgElevated, color: T.t70, border: `1px solid ${T.borderDefault}` }}
                              >
                                Profile
                              </span>
                            </Link>
                          </div>
                        </TiltCard>
                        </div>
                      );
                    })
                  )}
                </div>
              </DsCard>
            </div>

            {/* ── Live intelligence feed ─────────────────────────────────── */}
            <div className="flex flex-col">
              <DsCard padded={false} className="flex-1 flex flex-col overflow-hidden">
                <DsCardHeader>
                  <span className="text-[13px] font-semibold flex items-center gap-2" style={{ color: T.t92 }}>
                    <Activity size={13} style={{ color: T.lime }} />
                    Live Intelligence
                  </span>
                  <Link href="/intelligence">
                    <span className="text-[12px] transition-colors cursor-pointer flex items-center gap-1" style={{ color: T.t40 }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = T.t70)}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = T.t40)}>
                      View all <ChevronRight size={11} />
                    </span>
                  </Link>
                </DsCardHeader>

                <div className="flex-1 overflow-y-auto hide-scrollbar p-5 relative">
                  {isLoading ? (
                    <DsLoadingSkeleton rows={5} />
                  ) : feedItems.length === 0 ? (
                    <DsEmptyState
                      icon={<Activity size={20} />}
                      title="No intelligence yet"
                      description="Add athletes to begin monitoring."
                      action={
                        <Link href="/athletes/new">
                          <span className="text-[12px] cursor-pointer" style={{ color: T.lime }}>Add first athlete →</span>
                        </Link>
                      }
                    />
                  ) : (
                    <>
                      {/* Vertical timeline line */}
                      <div className="absolute left-[29px] top-5 bottom-5 w-px" style={{ background: T.borderSubtle }} />
                      <div className="flex flex-col gap-5 relative z-10">
                        {feedItems.map((item: any, i: number) => {
                          const cat = CATEGORY_TOKENS[item.category];
                          const conf = item.confidence ?? 75;
                          return (
                            <div key={item.id} className="relative pl-8">
                              {/* Timeline dot */}
                              <div
                                className="absolute left-0 top-1.5 w-2 h-2 rounded-full"
                                style={{
                                  background: i < 3 ? T.lime : T.borderStrong,
                                  border: `2px solid ${T.bgPage}`,
                                }}
                              />
                              {/* Header row */}
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[12px] font-semibold" style={{ color: T.t92 }}>{item.athleteName}</span>
                                {cat && <DsBadge category={item.category}>{cat.label}</DsBadge>}
                                <span className="text-[10px] ml-auto shrink-0" style={{ color: T.t40 }}>{timeAgo(item.discoveredAt)}</span>
                              </div>
                              {/* Title */}
                              <p className="text-[12px] leading-relaxed mb-1.5" style={{ color: T.t55 }}>{item.title}</p>
                              {/* Source + confidence */}
                              <div className="flex items-center gap-2 rounded-lg px-2 py-1.5" style={{ background: T.bgCard, border: `1px solid ${T.borderSubtle}` }}>
                                <FileText size={10} style={{ color: T.t40, flexShrink: 0 }} />
                                <span className="text-[10px] font-mono truncate flex-1" style={{ color: T.t40 }}>{item.sourceDomain}</span>
                                <ConfBar pct={conf} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </DsCard>
            </div>

          </div>
        </div>
      </div>
    </AppLayout>
  );
}
