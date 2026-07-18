import React, { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Link, useParams } from "wouter";
import {
  MapPin,
  Bell,
  Download,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Users,
  Sparkles,
  BarChart2,
  Calendar,
  Globe,
  Mail,
  ShieldCheck,
  Clock,
  AlertCircle,
  Trophy,
} from "lucide-react";
import {
  useGetAthlete,
  useListAthleteIntelligence,
  useListAthleteContacts,
  useListAthleteTimeline,
  useListAthleteCompetitions,
} from "@workspace/api-client-react";

const Sparkline = ({ data, color }: { data: number[]; color: string }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 28;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <polyline points={pts} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={(data.length - 1) / (data.length - 1) * w} cy={h - ((data[data.length - 1] - min) / range) * h} r="2.5" fill={color} />
    </svg>
  );
};

const categoryColors: Record<string, string> = {
  results_rankings: "#344F9F",
  media_interviews: "#059669",
  sponsorships: "#D97706",
  career_changes: "#7C3AED",
};
const categoryLabel: Record<string, string> = {
  results_rankings: "Results",
  media_interviews: "Media",
  sponsorships: "Sponsorship",
  career_changes: "Career",
};

const statusColor: Record<string, string> = {
  verified: "#059669",
  unconfirmed: "#D97706",
  historical: "#6B7080",
};

export default function DossierPage() {
  const params = useParams<{ id: string }>();
  const athleteId = parseInt(params.id ?? "0");
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Auto-poll while the AI populates freshly-created athletes.
  // We poll every 3 s for up to 60 s, then back off.
  const [isPopulating, setIsPopulating] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: athleteData, isLoading: athleteLoading, refetch: refetchAthlete } = useGetAthlete(athleteId, {
    query: { enabled: !!athleteId },
  });
  const { data: intelData, refetch: refetchIntel } = useListAthleteIntelligence(athleteId, {
    query: { enabled: !!athleteId },
  });
  const { data: contactsData, refetch: refetchContacts } = useListAthleteContacts(athleteId, {
    query: { enabled: !!athleteId },
  });
  const { data: timelineData, refetch: refetchTimeline } = useListAthleteTimeline(athleteId, {
    query: { enabled: !!athleteId },
  });
  const { data: competitionsData, refetch: refetchCompetitions } = useListAthleteCompetitions(athleteId, {
    query: { enabled: !!athleteId },
  });

  const athlete = (athleteData as any)?.athlete ?? (athleteData as any);
  const intel: any[] = (intelData as any)?.items ?? (intelData as any) ?? [];
  const contacts: any[] = (contactsData as any)?.contacts ?? (contactsData as any) ?? [];
  const timeline: any[] = (timelineData as any)?.events ?? (timelineData as any) ?? [];
  const competitions: any[] = (competitionsData as any)?.competitions ?? (competitionsData as any) ?? [];

  // Start polling when athlete loads with no intel, stop when data arrives or timeout
  useEffect(() => {
    if (!athlete) return;
    const hasData = intel.length > 0 || contacts.length > 0 || (athlete.worldRank != null);
    if (hasData) {
      setIsPopulating(false);
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
      return;
    }
    // No data yet — start polling
    if (pollingRef.current) return; // already polling
    setIsPopulating(true);
    pollingRef.current = setInterval(async () => {
      setPollCount((c) => {
        if (c >= 20) {
          // 20 polls × 3 s = 60 s max
          setIsPopulating(false);
          if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
          return c;
        }
        return c + 1;
      });
      await Promise.all([refetchAthlete(), refetchIntel(), refetchContacts(), refetchTimeline(), refetchCompetitions()]);
    }, 3000);
    return () => {
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [athlete?.id, intel.length, contacts.length, athlete?.worldRank]);

  const completedComps = competitions.filter((c: any) => c.status === "completed");
  const upcomingComps = competitions.filter((c: any) => c.status === "upcoming");

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "intelligence", label: "Intelligence" },
    { id: "results", label: "Results", count: completedComps.length },
    { id: "contacts", label: "Contacts" },
    { id: "timeline", label: "Timeline" },
    { id: "schedule", label: "Schedule", count: upcomingComps.length },
  ];

  const initials = athlete?.name
    ? athlete.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : "??";

  if (athleteLoading) {
    return (
      <AppLayout activePage="athletes">
        <div className="h-full flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!athlete) {
    return (
      <AppLayout activePage="athletes">
        <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-8">
          <AlertCircle className="w-10 h-10 text-muted-foreground" />
          <div>
            <h3 className="text-base font-semibold text-foreground mb-1">Athlete not found</h3>
            <p className="text-sm text-muted-foreground">No athlete exists with this ID.</p>
          </div>
          <Link href="/dashboard">
            <span className="text-sm text-primary hover:underline cursor-pointer">Back to dashboard</span>
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activePage="athletes">
      <div className="h-full flex flex-col bg-[#FCFAFA] overflow-hidden">

        {/* Breadcrumb */}
        <div className="h-14 border-b border-[#DCE2EF] flex items-center px-6 shrink-0 bg-[#FCFAFA]">
          <div className="flex items-center gap-2 text-[13px] font-medium text-[#8A90A8]">
            <Link href="/athletes">
              <span className="hover:text-[#3D426A] cursor-pointer transition-colors">Athletes</span>
            </Link>
            <ChevronRight size={14} className="text-[#C0C8DC]" />
            <span className="text-[#293055]">{athlete.name}</span>
            <ChevronRight size={14} className="text-[#C0C8DC]" />
            <span className="text-[#E75D50] font-semibold">Intelligence Dossier</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Hero */}
          <div className="px-8 py-7 border-b border-[#DCE2EF] bg-gradient-to-b from-[#FDF8F8] to-[#FCFAFA] shrink-0">
            <div className="max-w-6xl mx-auto flex items-start justify-between gap-6">
              <div className="flex gap-5">
                <div className="w-20 h-20 rounded-2xl overflow-hidden border border-[#DCE2EF] shadow-md shrink-0 flex items-center justify-center text-2xl font-bold text-white bg-gradient-to-br from-[#E75D50] to-[#C84840]">
                  {initials}
                </div>
                <div className="flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-1.5">
                    <h1 className="text-[24px] font-semibold text-[#1C1F3A] tracking-tight leading-none">{athlete.name}</h1>
                    {athlete.squad && (
                      <span className="px-2 py-0.5 rounded-md bg-[rgba(52,79,159,0.10)] text-[#344F9F] text-[11px] font-semibold tracking-wide border border-[rgba(52,79,159,0.18)]">
                        {athlete.squad}
                      </span>
                    )}
                  </div>
                  <div className="text-[13px] text-[#7A8090] mb-3 flex items-center gap-2 font-medium">
                    <span>{athlete.event}</span>
                    <span className="w-1 h-1 rounded-full bg-[#C0C8DC]" />
                    <MapPin size={12} className="text-[#9097B0]" />
                    <span>{athlete.nationality}{athlete.age ? ` · Age ${athlete.age}` : ""}</span>
                  </div>
                  <div className="flex items-center gap-5">
                    {athlete.worldRank && (
                      <div className="flex flex-col">
                        <span className="text-[11px] text-[#9097B0] font-medium">World Rank</span>
                        <div className="flex items-center gap-1">
                          <span className="text-[16px] font-bold text-[#1C1F3A] leading-tight">#{athlete.worldRank}</span>
                          {athlete.worldRankDelta != null && athlete.worldRankDelta !== 0 && (
                            <span className={`text-[11px] font-semibold flex items-center gap-0.5 ${athlete.worldRankDelta > 0 ? "text-[#059669]" : "text-[#E75D50]"}`}>
                              {athlete.worldRankDelta > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                              {Math.abs(athlete.worldRankDelta)}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {athlete.personalBest && (
                      <div className="flex flex-col">
                        <span className="text-[11px] text-[#9097B0] font-medium">Personal Best</span>
                        <span className="text-[16px] font-bold text-[#1C1F3A] leading-tight">{athlete.personalBest}</span>
                      </div>
                    )}
                    {athlete.seasonBest && (
                      <div className="flex flex-col">
                        <span className="text-[11px] text-[#9097B0] font-medium">Season Best</span>
                        <span className="text-[16px] font-bold text-[#1C1F3A] leading-tight">{athlete.seasonBest}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-3 shrink-0">
                <div className="flex items-center gap-2 text-[11px] text-[#8A90A8] font-medium border border-[#DCE2EF] rounded-full px-3 py-1 bg-white shadow-sm">
                  <div className={`w-1.5 h-1.5 rounded-full ${athlete.agentStatus === "active" ? "bg-[#10b981]" : "bg-[#9097B0]"}`} />
                  Agent {athlete.agentStatus === "active" ? "Active" : "Paused"}
                </div>
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-white border border-[#DCE2EF] text-[#293055] text-[13px] font-medium shadow-sm hover:bg-[#FCFAFA] transition-colors">
                    <Download size={13} className="text-[#7A8090]" />
                    Export
                  </button>
                  <Link href={`/athletes/compare?ids=${athleteId}`}>
                    <button className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-white border border-[#344F9F] text-[#344F9F] text-[13px] font-medium shadow-sm hover:bg-[rgba(52,79,159,0.05)] transition-colors">
                      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                      Compare
                    </button>
                  </Link>
                  <Link href="/alerts">
                    <button className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#E75D50] text-white text-[13px] font-medium shadow-sm hover:bg-[#D04840] transition-colors">
                      <Bell size={13} />
                      Configure Alerts
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Tab bar */}
          <div className="border-b border-[#DCE2EF] px-8 bg-[#FCFAFA] shrink-0">
            <div className="max-w-6xl mx-auto flex items-center gap-6">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`pb-3 pt-3 text-[13px] font-medium transition-colors relative flex items-center gap-1.5 ${
                      isActive ? "text-[#293055]" : "text-[#8A90A8] hover:text-[#6B7080]"
                    }`}
                  >
                    {tab.label}
                    {"count" in tab && (tab as any).count > 0 && (
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${isActive ? "bg-[rgba(231,93,80,0.12)] text-[#E75D50]" : "bg-[rgba(160,168,192,0.15)] text-[#9097B0]"}`}>
                        {(tab as any).count}
                      </span>
                    )}
                    {isActive && (
                      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#E75D50] rounded-t-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Overview */}
          {activeTab === "overview" && (
            <div className="max-w-6xl mx-auto w-full px-8 py-6">
              <div className="grid grid-cols-3 gap-5">
                <div className="col-span-2 space-y-5">
                  {/* AI Intelligence Summary */}
                  <div
                    className="rounded-xl p-5 shadow-sm"
                    style={{ background: "linear-gradient(135deg, #293055 0%, #1e2440 100%)" }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "rgba(231,93,80,0.20)" }}>
                        <Sparkles size={12} style={{ color: "#E75D50" }} />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "#E75D50" }}>
                        Recent Intelligence
                      </span>
                      <span className="ml-auto text-[10px]" style={{ color: "rgba(252,250,250,0.35)" }}>
                        {Array.isArray(intel) ? intel.length : 0} items found
                      </span>
                    </div>
                    {Array.isArray(intel) && intel.length > 0 ? (
                      <div className="space-y-3">
                        {intel.slice(0, 2).map((item: any) => (
                          <div key={item.id} className="border-t border-white/10 pt-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                                style={{
                                  background: `${categoryColors[item.category] ?? "#344F9F"}22`,
                                  color: categoryColors[item.category] ?? "#344F9F",
                                }}
                              >
                                {categoryLabel[item.category] ?? item.category}
                              </span>
                              <span className="text-[10px]" style={{ color: "rgba(252,250,250,0.40)" }}>
                                {item.sourceDomain}
                              </span>
                              <span className="ml-auto text-[10px] font-medium" style={{ color: "rgba(252,250,250,0.45)" }}>
                                {item.confidence}% confidence
                              </span>
                            </div>
                            <p className="text-[13px] font-medium mb-1" style={{ color: "rgba(252,250,250,0.90)" }}>
                              {item.title}
                            </p>
                            <p className="text-[12px] leading-relaxed" style={{ color: "rgba(252,250,250,0.60)" }}>
                              {item.summary}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        {isPopulating ? (
                          <>
                            <div className="w-4 h-4 border-2 border-[rgba(252,250,250,0.4)] border-t-[#E75D50] rounded-full animate-spin flex-shrink-0" />
                            <p className="text-[13px]" style={{ color: "rgba(252,250,250,0.70)" }}>
                              Agent is gathering intelligence — this takes about 10–20 seconds…
                            </p>
                          </>
                        ) : (
                          <p className="text-[13px]" style={{ color: "rgba(252,250,250,0.60)" }}>
                            No intelligence items yet. The agent will surface updates as it crawls relevant sources.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Performance Snapshot */}
                  <div>
                    <h3 className="text-[13px] font-semibold text-[#1C1F3A] mb-3">Performance Snapshot</h3>
                    <div className="grid grid-cols-4 gap-3">
                      {athlete.worldRank && (
                        <div className="rounded-xl border border-[#DCE2EF] bg-white p-4 shadow-sm">
                          <div className="text-[11px] text-[#9097B0] font-medium mb-1">World Rank</div>
                          <div className="text-[22px] font-bold text-[#1C1F3A] leading-tight mb-0.5">#{athlete.worldRank}</div>
                          <div className="text-[10px] text-[#A0A8C0]">{athlete.event}</div>
                          {athlete.worldRankDelta != null && athlete.worldRankDelta !== 0 && (
                            <div className={`text-[10px] font-semibold mt-1.5 flex items-center gap-1 ${athlete.worldRankDelta > 0 ? "text-[#059669]" : "text-[#E75D50]"}`}>
                              {athlete.worldRankDelta > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                              {Math.abs(athlete.worldRankDelta)}
                            </div>
                          )}
                        </div>
                      )}
                      {athlete.personalBest && (
                        <div className="rounded-xl border border-[#DCE2EF] bg-white p-4 shadow-sm">
                          <div className="text-[11px] text-[#9097B0] font-medium mb-1">Personal Best</div>
                          <div className="text-[22px] font-bold text-[#1C1F3A] leading-tight mb-0.5">{athlete.personalBest}</div>
                          <div className="text-[10px] text-[#A0A8C0]">{athlete.event}</div>
                        </div>
                      )}
                      {athlete.seasonBest && (
                        <div className="rounded-xl border border-[#DCE2EF] bg-white p-4 shadow-sm">
                          <div className="text-[11px] text-[#9097B0] font-medium mb-1">Season Best</div>
                          <div className="text-[22px] font-bold text-[#1C1F3A] leading-tight mb-0.5">{athlete.seasonBest}</div>
                          <div className="text-[10px] text-[#A0A8C0]">2025 season</div>
                        </div>
                      )}
                      {athlete.nationalRank && (
                        <div className="rounded-xl border border-[#DCE2EF] bg-white p-4 shadow-sm">
                          <div className="text-[11px] text-[#9097B0] font-medium mb-1">National Rank</div>
                          <div className="text-[22px] font-bold text-[#1C1F3A] leading-tight mb-0.5">#{athlete.nationalRank}</div>
                          <div className="text-[10px] text-[#A0A8C0]">{athlete.nationality}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Upcoming Competitions */}
                  {Array.isArray(competitions) && competitions.filter((c: any) => c.status === "upcoming").length > 0 && (
                    <div>
                      <h3 className="text-[13px] font-semibold text-[#1C1F3A] mb-3">Upcoming Competitions</h3>
                      <div className="rounded-xl border border-[#DCE2EF] bg-white shadow-sm overflow-hidden">
                        {competitions
                          .filter((c: any) => c.status === "upcoming")
                          .slice(0, 3)
                          .map((comp: any, i: number, arr: any[]) => (
                            <div key={comp.id} className={`flex items-center justify-between px-5 py-3.5 ${i < arr.length - 1 ? "border-b border-[#DCE2EF]" : ""}`}>
                              <div className="flex items-center gap-3">
                                <div className="w-7 h-7 rounded-lg bg-[rgba(52,79,159,0.08)] flex items-center justify-center">
                                  <Calendar size={13} className="text-[#344F9F]" />
                                </div>
                                <div>
                                  <div className="text-[13px] font-medium text-[#1C1F3A]">{comp.meetName}</div>
                                  <div className="text-[11px] text-[#8A90A8]">{comp.location} · {comp.event}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${comp.tier === "A" ? "bg-[rgba(231,93,80,0.10)] text-[#E75D50]" : "bg-[rgba(52,79,159,0.08)] text-[#344F9F]"}`}>
                                  Tier {comp.tier}
                                </span>
                                <span className="text-[12px] text-[#8A90A8]">{comp.date}</span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right column */}
                <div className="space-y-5">
                  {/* Social Media */}
                  {(athlete.instagramHandle || athlete.twitterHandle) && (
                    <div className="rounded-xl border border-[#DCE2EF] bg-white p-5 shadow-sm">
                      <div className="flex items-center gap-2 mb-4">
                        <Users size={13} className="text-[#9097B0]" />
                        <h3 className="text-[13px] font-semibold text-[#1C1F3A]">Social Media</h3>
                      </div>
                      <div className="space-y-4">
                        {athlete.instagramHandle && athlete.instagramFollowers && (
                          <div className="pb-4 border-b border-[#DCE2EF]">
                            <div className="text-[12px] font-semibold text-[#1C1F3A] mb-0.5">@{athlete.instagramHandle}</div>
                            <div className="text-[11px] text-[#8A90A8] mb-1">Instagram</div>
                            <div className="text-[20px] font-bold text-[#1C1F3A]">
                              {(athlete.instagramFollowers / 1000).toFixed(1)}K{" "}
                              <span className="text-xs text-[#9097B0] font-normal">followers</span>
                            </div>
                            <Sparkline data={[60, 62, 65, 63, 70, 74, 72, 78, 80, 83, 85, 100]} color="#E75D50" />
                          </div>
                        )}
                        {athlete.twitterHandle && athlete.twitterFollowers && (
                          <div>
                            <div className="text-[12px] font-semibold text-[#1C1F3A] mb-0.5">@{athlete.twitterHandle}</div>
                            <div className="text-[11px] text-[#8A90A8] mb-1">X / Twitter</div>
                            <div className="text-[20px] font-bold text-[#1C1F3A]">
                              {(athlete.twitterFollowers / 1000).toFixed(1)}K{" "}
                              <span className="text-xs text-[#9097B0] font-normal">followers</span>
                            </div>
                            <Sparkline data={[50, 52, 55, 60, 58, 63, 65, 68, 70, 72, 75, 80]} color="#344F9F" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Agent Status */}
                  <div className="rounded-xl border border-[#DCE2EF] bg-white p-5 shadow-sm">
                    <h3 className="text-[13px] font-semibold text-[#1C1F3A] mb-3">Agent Status</h3>
                    <div className="space-y-2 text-[12px]">
                      <div className="flex justify-between">
                        <span className="text-[#8A90A8]">Status</span>
                        <span className={`font-semibold ${athlete.agentStatus === "active" ? "text-[#059669]" : "text-[#8A90A8]"}`}>
                          {athlete.agentStatus === "active" ? "Active" : "Paused"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8A90A8]">Intel items</span>
                        <span className="font-semibold text-[#1C1F3A]">{athlete.intelligenceCount ?? 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Intelligence tab */}
          {activeTab === "intelligence" && (
            <div className="max-w-6xl mx-auto w-full px-8 py-6 space-y-3">
              {Array.isArray(intel) && intel.length > 0 ? (
                intel.map((item: any) => (
                  <div key={item.id} className="rounded-xl border border-[#DCE2EF] bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="px-2 py-0.5 rounded text-[11px] font-semibold"
                          style={{
                            background: `${categoryColors[item.category] ?? "#344F9F"}18`,
                            color: categoryColors[item.category] ?? "#344F9F",
                          }}
                        >
                          {categoryLabel[item.category] ?? item.category}
                        </span>
                        <span className="text-[11px] text-[#8A90A8]">{item.sourceDomain}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[11px] text-[#8A90A8]">{item.confidence}% confidence</span>
                        {item.sourceUrl && (
                          <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-[#344F9F] hover:underline flex items-center gap-1">
                            <Globe size={11} />
                            Source
                          </a>
                        )}
                      </div>
                    </div>
                    <h4 className="text-[14px] font-semibold text-[#1C1F3A] mb-1">{item.title}</h4>
                    <p className="text-[13px] text-[#6B7080] leading-relaxed">{item.summary}</p>
                  </div>
                ))
              ) : (
                <EmptyState icon={<BarChart2 size={20} className="text-[#9097B0]" />} label="No intelligence items yet" />
              )}
            </div>
          )}

          {/* Contacts tab */}
          {activeTab === "contacts" && (
            <div className="max-w-6xl mx-auto w-full px-8 py-6 space-y-3">
              {Array.isArray(contacts) && contacts.length > 0 ? (
                contacts.map((c: any) => (
                  <div key={c.id} className="rounded-xl border border-[#DCE2EF] bg-white p-5 shadow-sm flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[14px] font-semibold text-[#1C1F3A]">{c.name || "Unknown"}</span>
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                          style={{ background: `${statusColor[c.status]}18`, color: statusColor[c.status] }}
                        >
                          {c.status}
                        </span>
                      </div>
                      <div className="text-[12px] text-[#6B7080] mb-1">{c.role} · {c.org}</div>
                      {c.note && <p className="text-[12px] text-[#8A90A8]">{c.note}</p>}
                      {c.sourceExcerpt && (
                        <p className="text-[11px] text-[#A0A8C0] mt-1 italic border-l-2 border-[#DCE2EF] pl-2">{c.sourceExcerpt}</p>
                      )}
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-2">
                      <span className="text-[11px] text-[#8A90A8]">{c.confidence}% confidence</span>
                      {c.publicEmail && (
                        <a href={`mailto:${c.publicEmail}`} className="text-[11px] text-[#344F9F] hover:underline flex items-center gap-1">
                          <Mail size={11} /> {c.publicEmail}
                        </a>
                      )}
                      {c.website && (
                        <a href={`https://${c.website}`} target="_blank" rel="noopener noreferrer" className="text-[11px] text-[#344F9F] hover:underline flex items-center gap-1">
                          <Globe size={11} /> {c.website}
                        </a>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState icon={<ShieldCheck size={20} className="text-[#9097B0]" />} label="No verified contacts yet" />
              )}
            </div>
          )}

          {/* Timeline tab */}
          {activeTab === "timeline" && (
            <div className="max-w-6xl mx-auto w-full px-8 py-6">
              {Array.isArray(timeline) && timeline.length > 0 ? (
                <div className="relative pl-6 border-l-2 border-[#DCE2EF] space-y-6">
                  {timeline.map((evt: any) => (
                    <div key={evt.id} className="relative">
                      <div className="absolute -left-[25px] top-1 w-4 h-4 rounded-full border-2 border-[#E75D50] bg-white flex items-center justify-center">
                        {evt.significant && <div className="w-2 h-2 rounded-full bg-[#E75D50]" />}
                      </div>
                      <div className="rounded-xl border border-[#DCE2EF] bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3 mb-1">
                          <h4 className="text-[13px] font-semibold text-[#1C1F3A]">{evt.title}</h4>
                          <span className="text-[11px] text-[#8A90A8] shrink-0">{evt.date}</span>
                        </div>
                        {evt.location && <div className="flex items-center gap-1 text-[11px] text-[#8A90A8] mb-1"><MapPin size={10} />{evt.location}</div>}
                        {evt.description && <p className="text-[12px] text-[#6B7080] leading-relaxed">{evt.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={<Clock size={20} className="text-[#9097B0]" />} label="No timeline events yet" />
              )}
            </div>
          )}

          {/* Results tab */}
          {activeTab === "results" && (
            <div className="max-w-6xl mx-auto w-full px-8 py-6">
              {completedComps.length > 0 ? (
                <>
                  {/* Summary bar */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    {(() => {
                      const podiums = completedComps.filter((c: any) => /^(1st|2nd|3rd|gold|silver|bronze)/i.test(c.result ?? "")).length;
                      const wins = completedComps.filter((c: any) => /^(1st|gold|win)/i.test(c.result ?? "")).length;
                      return (
                        <>
                          <div className="rounded-xl border border-[#DCE2EF] bg-white p-4 shadow-sm text-center">
                            <div className="text-[26px] font-bold text-[#1C1F3A]">{completedComps.length}</div>
                            <div className="text-[11px] text-[#8A90A8] font-medium mt-0.5">Races on Record</div>
                          </div>
                          <div className="rounded-xl border border-[#DCE2EF] bg-white p-4 shadow-sm text-center">
                            <div className="text-[26px] font-bold text-[#E75D50]">{wins}</div>
                            <div className="text-[11px] text-[#8A90A8] font-medium mt-0.5">Wins</div>
                          </div>
                          <div className="rounded-xl border border-[#DCE2EF] bg-white p-4 shadow-sm text-center">
                            <div className="text-[26px] font-bold text-[#344F9F]">{podiums}</div>
                            <div className="text-[11px] text-[#8A90A8] font-medium mt-0.5">Podiums</div>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {/* Results table */}
                  <div className="rounded-xl border border-[#DCE2EF] bg-white shadow-sm overflow-hidden">
                    <div className="grid grid-cols-[1fr_2fr_1fr_80px_120px] gap-0 border-b border-[#DCE2EF] bg-[#FCFAFA] px-5 py-2.5">
                      {["Date", "Competition", "Event", "Tier", "Result"].map((h) => (
                        <div key={h} className="text-[10px] font-bold uppercase tracking-widest text-[#A0A8C0]">{h}</div>
                      ))}
                    </div>
                    {completedComps
                      .slice()
                      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((comp: any, i: number) => {
                        const result = comp.result ?? "";
                        const isWin = /^(1st|gold|win)/i.test(result);
                        const isPodium = /^(2nd|silver|3rd|bronze)/i.test(result);
                        const medalColor = isWin ? "#F59E0B" : isPodium ? "#9CA3AF" : null;
                        return (
                          <div
                            key={comp.id}
                            className={`grid grid-cols-[1fr_2fr_1fr_80px_120px] gap-0 px-5 py-3.5 items-center ${i % 2 === 0 ? "bg-white" : "bg-[#FAFBFD]"} border-b border-[#F0F2F8] last:border-0 hover:bg-[#F5F7FC] transition-colors`}
                          >
                            <div className="text-[12px] text-[#8A90A8] font-medium">{comp.date}</div>
                            <div>
                              <div className="text-[13px] font-semibold text-[#1C1F3A] leading-snug">{comp.meetName}</div>
                              {comp.location && <div className="text-[11px] text-[#A0A8C0] flex items-center gap-1 mt-0.5"><MapPin size={9} />{comp.location}</div>}
                            </div>
                            <div className="text-[12px] text-[#6B7080]">{comp.event}</div>
                            <div>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${comp.tier === "A" ? "bg-[rgba(231,93,80,0.10)] text-[#E75D50]" : comp.tier === "B" ? "bg-[rgba(52,79,159,0.08)] text-[#344F9F]" : "bg-[rgba(160,168,192,0.10)] text-[#8A90A8]"}`}>
                                Tier {comp.tier}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {medalColor && (
                                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0" style={{ background: medalColor }}>
                                  {isWin ? "1" : isPodium && /2nd/i.test(result) ? "2" : "3"}
                                </div>
                              )}
                              <span className={`text-[13px] font-semibold ${isWin ? "text-[#F59E0B]" : isPodium ? "text-[#6B7280]" : "text-[#1C1F3A]"}`}>
                                {result || "—"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </>
              ) : (
                <EmptyState icon={<Trophy size={20} className="text-[#9097B0]" />} label="No results recorded yet" />
              )}
            </div>
          )}

          {/* Schedule tab */}
          {activeTab === "schedule" && (
            <div className="max-w-6xl mx-auto w-full px-8 py-6 space-y-3">
              {upcomingComps.length > 0 ? (
                upcomingComps
                  .slice()
                  .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .map((comp: any) => (
                    <div key={comp.id} className="rounded-xl border border-[#DCE2EF] bg-white p-5 shadow-sm flex items-center justify-between gap-4 hover:border-[#C8D0E8] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[rgba(52,79,159,0.07)] flex flex-col items-center justify-center shrink-0">
                          <div className="text-[14px] font-bold text-[#344F9F] leading-none">{new Date(comp.date).getDate()}</div>
                          <div className="text-[9px] font-semibold text-[#8A90A8] uppercase tracking-wide">{new Date(comp.date).toLocaleString("default", { month: "short" })}</div>
                        </div>
                        <div>
                          <div className="text-[13px] font-semibold text-[#1C1F3A]">{comp.meetName}</div>
                          <div className="text-[11px] text-[#8A90A8] flex items-center gap-1 mt-0.5">
                            {comp.location && <><MapPin size={9} />{comp.location} · </>}
                            {comp.event}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${comp.tier === "A" ? "bg-[rgba(231,93,80,0.10)] text-[#E75D50]" : comp.tier === "B" ? "bg-[rgba(52,79,159,0.08)] text-[#344F9F]" : "bg-[rgba(160,168,192,0.10)] text-[#8A90A8]"}`}>
                          Tier {comp.tier}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[rgba(16,185,129,0.10)] text-[#059669]">Upcoming</span>
                      </div>
                    </div>
                  ))
              ) : (
                <EmptyState icon={<Calendar size={20} className="text-[#9097B0]" />} label="No upcoming competitions" />
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function EmptyState({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-full bg-[rgba(41,48,85,0.06)] flex items-center justify-center mb-3">
        {icon}
      </div>
      <p className="text-[13px] text-[#8A90A8]">{label}</p>
    </div>
  );
}
