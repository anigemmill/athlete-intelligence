import React, { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Link, useParams, useLocation } from "wouter";
import { useAuthFetch } from "@/lib/useAuthFetch";
import { useIsAdmin } from "@/hooks/useIsAdmin";
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
  ChevronDown,
  RefreshCw,
} from "lucide-react";
import {
  useGetAthlete,
  useListAthleteIntelligence,
  useListAthleteContacts,
  useListAthleteTimeline,
  useListAthleteCompetitions,
} from "@workspace/api-client-react";
import { HeroFlipCard } from "@/components/3d/HeroFlipCard";
import { MiniGlobe } from "@/components/3d/MiniGlobe";
import { Timeline3D } from "@/components/3d/Timeline3D";
import { RelationshipGraph3D } from "@/components/3d/RelationshipGraph3D";
import { Canvas3DWrapper } from "@/components/3d/Canvas3DWrapper";
import { IntelligenceHealthPanel } from "@/components/IntelligenceHealthPanel";

// ── Design system ──────────────────────────────────────────────────────────────
const BG       = "#0D1C0B";
const CARD_BG  = "rgba(255,255,255,0.05)";
const CARD_BDR = "1px solid rgba(255,255,255,0.09)";
const T92      = "rgba(255,255,255,0.92)";
const T70      = "rgba(255,255,255,0.70)";
const T55      = "rgba(255,255,255,0.55)";
const T40      = "rgba(255,255,255,0.40)";
const T28      = "rgba(255,255,255,0.28)";
const LIME     = "#B9FF4A";
const BDR_DIM  = "rgba(255,255,255,0.08)";

const categoryColors: Record<string, string> = {
  results_rankings: "#6B8FE0",
  media_interviews: "#C8BDFF",
  sponsorships:     "#4ade80",
  career_changes:   "#fbbf24",
};
const categoryLabel: Record<string, string> = {
  results_rankings: "Results",
  media_interviews: "Media",
  sponsorships:     "Sponsorship",
  career_changes:   "Career",
};
const statusColor: Record<string, string> = {
  verified:    "#4ade80",
  unconfirmed: "#fbbf24",
  historical:  T40,
};

const Sparkline = ({ data, color }: { data: number[]; color: string }) => {
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1;
  const w = 80, h = 28;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <polyline points={pts} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={(data.length - 1) / (data.length - 1) * w} cy={h - ((data[data.length - 1] - min) / range) * h} r="2.5" fill={color} />
    </svg>
  );
};

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return "Never";
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

export default function DossierPage() {
  const params = useParams<{ id: string }>();
  const athleteId = parseInt(params.id ?? "0");
  const [activeTab, setActiveTab] = useState<string>("overview");
  const { isAdmin: _isAdmin } = useIsAdmin(); // reserved for future admin-only features

  // Auto-poll while the AI populates freshly-created athletes.
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

  const authFetch = useAuthFetch();

  const athlete    = (athleteData as any)?.athlete ?? (athleteData as any);
  const intel: any[] = (intelData as any)?.items ?? (intelData as any) ?? [];
  const contacts: any[] = (contactsData as any)?.contacts ?? (contactsData as any) ?? [];
  const timeline: any[] = (timelineData as any)?.events ?? (timelineData as any) ?? [];
  const competitions: any[] = (competitionsData as any)?.competitions ?? (competitionsData as any) ?? [];

  useEffect(() => {
    if (!athlete) return;
    const hasData = intel.length > 0 || contacts.length > 0 || (athlete.worldRank != null);
    if (hasData) {
      setIsPopulating(false);
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
      return;
    }
    if (pollingRef.current) return;
    setIsPopulating(true);
    pollingRef.current = setInterval(async () => {
      setPollCount((c) => {
        if (c >= 20) {
          setIsPopulating(false);
          if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
          return c;
        }
        return c + 1;
      });
      await Promise.all([refetchAthlete(), refetchIntel(), refetchContacts(), refetchTimeline(), refetchCompetitions()]);
    }, 3000);
    return () => { if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; } };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [athlete?.id, intel.length, contacts.length, athlete?.worldRank]);

  const completedComps = competitions.filter((c: any) => c.status === "completed");
  const upcomingComps  = competitions.filter((c: any) => c.status === "upcoming");

  const tabs = [
    { id: "overview",     label: "Overview" },
    { id: "summary",      label: "AI Summary" },
    { id: "intelligence", label: "Intelligence", count: intel.length },
    { id: "sources",      label: "Sources" },
    { id: "results",      label: "Results",   count: completedComps.length },
    { id: "contacts",     label: "Contacts" },
    { id: "timeline",     label: "Timeline" },
    { id: "schedule",     label: "Schedule",  count: upcomingComps.length },
  ];

  const initials = athlete?.name
    ? athlete.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : "??";

  const [, navigate] = useLocation();
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [editingPhoto, setEditingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const [togglingAgent, setTogglingAgent] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshLabel, setRefreshLabel] = useState("Refreshing…");
  const repopulateRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const preRefreshCrawledAt = useRef<string | null>(null);
  const refreshStartRef = useRef<number>(0);

  const [timelineView, setTimelineView] = useState<"list" | "3d">("list");
  const [contactsView, setContactsView] = useState<"table" | "graph">("table");

  const [editingSocial, setEditingSocial] = useState(false);
  const [savingSocial, setSavingSocial] = useState(false);
  const [refreshingSocial, setRefreshingSocial] = useState(false);
  const [socialRefreshNote, setSocialRefreshNote] = useState<string | null>(null);
  const [socialDraft, setSocialDraft] = useState({
    instagramHandle: "", instagramFollowers: "",
    twitterHandle: "", twitterFollowers: "",
    tiktokHandle: "", tiktokFollowers: "",
  });

  const [summaryText, setSummaryText] = useState<string>("");
  const [summaryGeneratedAt, setSummaryGeneratedAt] = useState<string | null>(null);
  const [summaryStreaming, setSummaryStreaming] = useState(false);
  const [summaryLoaded, setSummaryLoaded] = useState(false);

  useEffect(() => {
    if (athlete?.avatarUrl) { setPhotoUrl(athlete.avatarUrl); setPhotoError(false); }
  }, [athlete?.avatarUrl]);

  useEffect(() => {
    if (!athlete) return;
    setSocialDraft({
      instagramHandle:   athlete.instagramHandle   ?? "",
      instagramFollowers: athlete.instagramFollowers ? String(athlete.instagramFollowers) : "",
      twitterHandle:     athlete.twitterHandle     ?? "",
      twitterFollowers:  athlete.twitterFollowers  ? String(athlete.twitterFollowers)  : "",
      tiktokHandle:      athlete.tiktokHandle      ?? "",
      tiktokFollowers:   athlete.tiktokFollowers   ? String(athlete.tiktokFollowers)   : "",
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [athlete?.id]);

  const refreshData = async () => {
    if (isRefreshing) return;
    preRefreshCrawledAt.current = athlete?.lastCrawledAt ?? null;
    refreshStartRef.current = Date.now();
    setIsRefreshing(true);
    setRefreshLabel("Starting…");
    try {
      await authFetch(`/api/athletes/${athleteId}/repopulate`, { method: "POST" });
      let polls = 0;
      repopulateRef.current = setInterval(async () => {
        polls++;
        const elapsed = Math.floor((Date.now() - refreshStartRef.current) / 1000);
        if (elapsed < 8) setRefreshLabel("Starting…");
        else if (elapsed < 50) setRefreshLabel("Searching the web…");
        else if (elapsed < 100) setRefreshLabel("Building profile…");
        else setRefreshLabel("Almost done…");
        await Promise.all([refetchAthlete(), refetchIntel(), refetchContacts(), refetchTimeline(), refetchCompetitions()]);
        if (polls >= 60) {
          setIsRefreshing(false);
          if (repopulateRef.current) { clearInterval(repopulateRef.current); repopulateRef.current = null; }
        }
      }, 3000);
    } catch {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isRefreshing || !athlete?.lastCrawledAt) return;
    if (athlete.lastCrawledAt !== preRefreshCrawledAt.current) {
      setIsRefreshing(false);
      if (repopulateRef.current) { clearInterval(repopulateRef.current); repopulateRef.current = null; }
    }
  }, [athlete?.lastCrawledAt, isRefreshing]);

  useEffect(() => {
    return () => { if (repopulateRef.current) clearInterval(repopulateRef.current); };
  }, []);

  const refreshSocial = async () => {
    if (refreshingSocial) return;
    setRefreshingSocial(true);
    setSocialRefreshNote(null);
    try {
      const r = await authFetch(`/api/athletes/${athleteId}/refresh-social`, { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Refresh failed");
      if (d.updated) { setSocialRefreshNote("Updated from live web search."); await refetchAthlete(); }
      else { setSocialRefreshNote("No new social data found for this athlete."); }
    } catch (e: any) {
      setSocialRefreshNote(`Error: ${e.message}`);
    } finally {
      setRefreshingSocial(false);
    }
  };

  const saveSocial = async () => {
    setSavingSocial(true);
    try {
      await authFetch(`/api/athletes/${athleteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instagramHandle:   socialDraft.instagramHandle.trim() || null,
          instagramFollowers: socialDraft.instagramFollowers ? Number(socialDraft.instagramFollowers.replace(/[^0-9]/g, "")) : 0,
          twitterHandle:     socialDraft.twitterHandle.trim() || null,
          twitterFollowers:  socialDraft.twitterFollowers ? Number(socialDraft.twitterFollowers.replace(/[^0-9]/g, "")) : 0,
          tiktokHandle:      socialDraft.tiktokHandle.trim() || null,
          tiktokFollowers:   socialDraft.tiktokFollowers ? Number(socialDraft.tiktokFollowers.replace(/[^0-9]/g, "")) : 0,
        }),
      });
      setEditingSocial(false);
      refetchAthlete();
    } finally {
      setSavingSocial(false);
    }
  };

  const savePhotoUrl = async () => {
    try {
      await authFetch(`/api/athletes/${athleteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: photoUrl.trim() || null }),
      });
      setEditingPhoto(false);
      refetchAthlete();
    } catch { /* silent */ }
  };

  const toggleAgent = async () => {
    if (togglingAgent || !athlete) return;
    setTogglingAgent(true);
    const next = athlete.agentStatus === "active" ? "paused" : "active";
    try {
      await authFetch(`/api/athletes/${athleteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentStatus: next }),
      });
      refetchAthlete();
    } finally {
      setTogglingAgent(false);
    }
  };

  useEffect(() => {
    if (!athleteId || summaryLoaded) return;
    authFetch(`/api/athletes/${athleteId}/summary`)
      .then((r) => r.json())
      .then((d) => {
        if (d.summary) { setSummaryText(d.summary); setSummaryGeneratedAt(d.generatedAt); }
        setSummaryLoaded(true);
      })
      .catch(() => setSummaryLoaded(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [athleteId]);

  const generateSummary = async () => {
    if (summaryStreaming) return;
    setSummaryStreaming(true);
    setSummaryText("");
    try {
      const resp = await authFetch(`/api/athletes/${athleteId}/summary`, { method: "POST" });
      if (!resp.ok || !resp.body) throw new Error("Stream failed");
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const evt = JSON.parse(line.slice(6));
            if (evt.token) setSummaryText((t) => t + evt.token);
            if (evt.done)  setSummaryGeneratedAt(new Date().toISOString());
          } catch {}
        }
      }
    } catch {
      setSummaryText("Failed to generate summary. Please try again.");
    } finally {
      setSummaryStreaming(false);
    }
  };

  const removeAthlete = async () => {
    setRemoving(true);
    try {
      await authFetch(`/api/athletes/${athleteId}`, { method: "DELETE" });
      navigate("/dashboard");
    } catch {
      setRemoving(false);
      setConfirmRemove(false);
    }
  };

  if (athleteLoading) {
    return (
      <AppLayout activePage="athletes">
        <div className="h-full flex items-center justify-center" style={{ background: BG }}>
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${LIME} transparent` }} />
        </div>
      </AppLayout>
    );
  }

  if (!athlete) {
    return (
      <AppLayout activePage="athletes">
        <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-8" style={{ background: BG }}>
          <AlertCircle className="w-10 h-10" style={{ color: T40 }} />
          <div>
            <h3 className="text-base font-semibold mb-1" style={{ color: T92 }}>Athlete not found</h3>
            <p className="text-sm" style={{ color: T55 }}>No athlete exists with this ID.</p>
          </div>
          <Link href="/dashboard">
            <span className="text-sm cursor-pointer hover:underline" style={{ color: LIME }}>Back to dashboard</span>
          </Link>
        </div>
      </AppLayout>
    );
  }

  // ── Data display helpers ─────────────────────────────────────────────────
  const lastCrawledAgo = timeAgo(athlete.lastCrawledAt);

  return (
    <AppLayout activePage="athletes">
      <div className="h-full flex flex-col overflow-hidden" style={{ background: BG }}>

        {/* Breadcrumb */}
        <div className="h-14 flex items-center px-6 shrink-0" style={{ borderBottom: `1px solid ${BDR_DIM}`, background: BG }}>
          <div className="flex items-center gap-2 text-[13px] font-medium" style={{ color: T40 }}>
            <Link href="/athletes">
              <span className="cursor-pointer transition-colors hover:text-white">Athletes</span>
            </Link>
            <ChevronRight size={14} style={{ color: T28 }} />
            <span style={{ color: T92 }}>{athlete.name}</span>
            <ChevronRight size={14} style={{ color: T28 }} />
            <span className="font-semibold" style={{ color: LIME }}>Intelligence Dossier</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* Hero */}
          <div className="px-8 py-7 shrink-0" style={{ borderBottom: `1px solid ${BDR_DIM}`, background: BG }}>
            <div className="max-w-6xl mx-auto flex items-start justify-between gap-6">
              <div className="flex gap-5 items-start">
                {/* 3D flip card */}
                <div className="relative shrink-0">
                  <HeroFlipCard
                    name={athlete.name}
                    sport={athlete.event}
                    nationality={athlete.nationality}
                    avatarUrl={athlete.avatarUrl && !photoError ? athlete.avatarUrl : undefined}
                    initials={initials}
                    confidence={athlete.confidenceScore}
                    agentStatus={athlete.agentStatus}
                    lastCrawledAt={athlete.lastCrawledAt}
                    intelligenceCount={athlete.intelligenceCount}
                  />
                  {/* Edit photo button */}
                  <button
                    onClick={() => setEditingPhoto(true)}
                    className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center z-10 transition-all hover:scale-110"
                    style={{ background: "rgba(185,255,74,0.15)", border: "1px solid rgba(185,255,74,0.30)" }}
                    title="Edit photo URL"
                  >
                    <svg width="8" height="8" fill="none" viewBox="0 0 24 24" stroke={LIME} strokeWidth={2.2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487a2.25 2.25 0 113.182 3.182L7.5 19.213l-4.5 1.5 1.5-4.5 12.362-12.226z" />
                    </svg>
                  </button>
                </div>

                {/* Photo URL edit popover */}
                {editingPhoto && (
                  <div className="absolute top-[170px] left-[80px] z-50 rounded-xl shadow-2xl p-4 w-80" style={{ background: "#1a2d18", border: "1px solid rgba(185,255,74,0.20)" }}>
                    <div className="text-[12px] font-semibold mb-2" style={{ color: T92 }}>Photo URL</div>
                    <input
                      autoFocus
                      value={photoUrl}
                      onChange={(e) => setPhotoUrl(e.target.value)}
                      placeholder="https://upload.wikimedia.org/…"
                      className="w-full px-3 py-2 text-[12px] rounded-lg outline-none mb-3"
                      style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: T92 }}
                    />
                    <div className="flex items-center gap-2">
                      <button onClick={savePhotoUrl} className="flex-1 py-1.5 rounded-lg text-[12px] font-semibold transition-colors" style={{ background: LIME, color: BG }}>Save</button>
                      <button onClick={() => { setEditingPhoto(false); setPhotoUrl(athlete.avatarUrl ?? ""); }} className="flex-1 py-1.5 rounded-lg text-[12px] font-medium transition-colors" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)", color: T55 }}>Cancel</button>
                    </div>
                    <div className="text-[10px] mt-2" style={{ color: T40 }}>Paste any public image URL — Wikipedia Commons works well for elite athletes.</div>
                  </div>
                )}

                <div className="flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-1.5">
                    <h1 className="text-[24px] font-semibold tracking-tight leading-none" style={{ color: T92 }}>{athlete.name}</h1>
                    {athlete.squad && (
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold tracking-wide" style={{ background: "rgba(185,255,74,0.10)", color: LIME, border: "1px solid rgba(185,255,74,0.20)" }}>
                        {athlete.squad}
                      </span>
                    )}
                  </div>
                  <div className="text-[13px] mb-3 flex items-center gap-2 font-medium" style={{ color: T55 }}>
                    <span>{athlete.event}</span>
                    <span className="w-1 h-1 rounded-full" style={{ background: T28 }} />
                    <MapPin size={12} style={{ color: T40 }} />
                    <span>{athlete.nationality}{athlete.age ? ` · Age ${athlete.age}` : ""}</span>
                  </div>
                  <div className="flex items-center gap-5">
                    {athlete.worldRank && (
                      <div className="flex flex-col">
                        <span className="text-[11px] font-medium" style={{ color: T40 }}>World Rank</span>
                        <div className="flex items-center gap-1">
                          <span className="text-[16px] font-bold leading-tight" style={{ color: T92 }}>#{athlete.worldRank}</span>
                          {athlete.worldRankDelta != null && athlete.worldRankDelta !== 0 && (
                            <span className="text-[11px] font-semibold flex items-center gap-0.5" style={{ color: athlete.worldRankDelta > 0 ? "#4ade80" : "#f87171" }}>
                              {athlete.worldRankDelta > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                              {Math.abs(athlete.worldRankDelta)}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {athlete.personalBest && (
                      <div className="flex flex-col min-w-0" title={athlete.personalBest}>
                        <span className="text-[11px] font-medium" style={{ color: T40 }}>Personal Best</span>
                        <span className="text-[16px] font-bold leading-tight truncate max-w-[120px]" style={{ color: T92 }}>{athlete.personalBest}</span>
                      </div>
                    )}
                    {athlete.seasonBest && (
                      <div className="flex flex-col min-w-0" title={athlete.seasonBest}>
                        <span className="text-[11px] font-medium" style={{ color: T40 }}>Season Best</span>
                        <span className="text-[16px] font-bold leading-tight truncate max-w-[120px]" style={{ color: T92 }}>{athlete.seasonBest}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Mini globe */}
              <div className="hidden lg:flex items-center shrink-0">
                <Canvas3DWrapper>
                  <MiniGlobe nationality={athlete.nationality} size={100} />
                </Canvas3DWrapper>
              </div>

              <div className="flex flex-col items-end gap-3 shrink-0">
                {/* Agent toggle */}
                <button
                  onClick={toggleAgent}
                  disabled={togglingAgent}
                  className="flex items-center gap-2 text-[11px] font-semibold rounded-full px-3 py-1 transition-all"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: `1px solid ${athlete.agentStatus === "active" ? "rgba(74,222,128,0.30)" : BDR_DIM}`,
                    color: athlete.agentStatus === "active" ? "#4ade80" : T40,
                  }}
                  title={athlete.agentStatus === "active" ? "Pause monitoring" : "Resume monitoring"}
                >
                  {togglingAgent ? (
                    <div className="w-3 h-3 border-[1.5px] border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: athlete.agentStatus === "active" ? "#4ade80" : T40 }} />
                  )}
                  {athlete.agentStatus === "active" ? "Agent Active" : "Agent Paused"}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={refreshData}
                    disabled={isRefreshing}
                    title="Wipe and regenerate all intelligence, results, contacts and timeline from scratch"
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors disabled:opacity-60"
                    style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${BDR_DIM}`, color: T70 }}
                  >
                    {isRefreshing ? (
                      <div className="w-3 h-3 border-[1.5px] border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <RefreshCw size={13} />
                    )}
                    {isRefreshing ? refreshLabel : "Refresh Data"}
                  </button>
                  <button className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors" style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${BDR_DIM}`, color: T70 }}>
                    <Download size={13} style={{ color: T40 }} />
                    Export
                  </button>
                  <Link href={`/athletes/compare?ids=${athleteId}`}>
                    <button className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-all" style={{ background: "rgba(107,143,224,0.10)", border: "1px solid rgba(107,143,224,0.25)", color: "#6B8FE0" }}>
                      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                      Compare
                    </button>
                  </Link>
                  <Link href="/alerts">
                    <button className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors" style={{ background: LIME, color: BG }}>
                      <Bell size={13} />
                      Configure Alerts
                    </button>
                  </Link>
                  <button
                    onClick={() => setConfirmRemove(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-all"
                    style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BDR_DIM}`, color: T55 }}
                    title="Remove athlete from monitoring"
                  >
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                    Remove
                  </button>
                </div>
              </div>

              {/* Confirm remove dialog */}
              {confirmRemove && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                  <div className="rounded-2xl shadow-2xl p-6 w-[360px] mx-4" style={{ background: "#1a2d18", border: "1px solid rgba(248,113,113,0.25)" }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: "rgba(248,113,113,0.12)" }}>
                      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#f87171" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                    </div>
                    <h3 className="text-[15px] font-semibold mb-1" style={{ color: T92 }}>Remove {athlete.name}?</h3>
                    <p className="text-[13px] mb-5 leading-relaxed" style={{ color: T55 }}>
                      This will permanently delete all intelligence, results, contacts, and timeline data for this athlete. This cannot be undone.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmRemove(false)}
                        disabled={removing}
                        className="flex-1 py-2 rounded-lg text-[13px] font-medium transition-colors"
                        style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${BDR_DIM}`, color: T55 }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={removeAthlete}
                        disabled={removing}
                        className="flex-1 py-2 rounded-lg text-[13px] font-semibold transition-colors flex items-center justify-center gap-2"
                        style={{ background: "#f87171", color: "#fff" }}
                      >
                        {removing && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                        {removing ? "Removing…" : "Remove athlete"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Intelligence Health Panel — visible to all users */}
          <IntelligenceHealthPanel
            athleteId={athleteId}
            onRefresh={refreshData}
            isRefreshing={isRefreshing}
            refreshLabel={refreshLabel}
          />

          {/* Tab bar */}
          <div className="px-8 shrink-0" style={{ borderBottom: `1px solid ${BDR_DIM}`, background: BG }}>
            <div className="max-w-6xl mx-auto flex items-center gap-6">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="pb-3 pt-3 text-[13px] font-medium transition-colors relative flex items-center gap-1.5"
                    style={{ color: isActive ? T92 : T40 }}
                  >
                    {tab.label}
                    {"count" in tab && (tab as any).count > 0 && (
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{
                          background: isActive ? "rgba(185,255,74,0.12)" : "rgba(255,255,255,0.07)",
                          color:      isActive ? LIME                    : T40,
                        }}
                      >
                        {(tab as any).count}
                      </span>
                    )}
                    {isActive && (
                      <div className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-full" style={{ background: LIME }} />
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
                  <div className="rounded-xl p-5" style={{ background: "linear-gradient(135deg, rgba(185,255,74,0.08) 0%, rgba(13,28,11,0) 100%)", border: "1px solid rgba(185,255,74,0.15)" }}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "rgba(185,255,74,0.15)" }}>
                        <Sparkles size={12} style={{ color: LIME }} />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: LIME }}>Recent Intelligence</span>
                      <span className="ml-auto text-[10px]" style={{ color: T28 }}>
                        {Array.isArray(intel) ? intel.length : 0} items found
                      </span>
                    </div>
                    {Array.isArray(intel) && intel.length > 0 ? (
                      <div className="space-y-3">
                        {intel.slice(0, 2).map((item: any) => (
                          <div key={item.id} className="border-t pt-3" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                                style={{
                                  background: `${categoryColors[item.category] ?? "#6B8FE0"}22`,
                                  color: categoryColors[item.category] ?? "#6B8FE0",
                                }}
                              >
                                {categoryLabel[item.category] ?? item.category}
                              </span>
                              <span className="text-[10px]" style={{ color: T40 }}>{item.sourceDomain}</span>
                              <span className="ml-auto text-[10px] font-medium" style={{ color: T40 }}>{item.confidence}% confidence</span>
                            </div>
                            <p className="text-[13px] font-medium mb-1" style={{ color: T92 }}>{item.title}</p>
                            <p className="text-[12px] leading-relaxed" style={{ color: T55 }}>{item.summary}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        {isPopulating ? (
                          <>
                            <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin flex-shrink-0" style={{ borderColor: `${LIME} transparent` }} />
                            <p className="text-[13px]" style={{ color: T70 }}>Agent is gathering intelligence — this takes about 10–20 seconds…</p>
                          </>
                        ) : (
                          <p className="text-[13px]" style={{ color: T55 }}>No intelligence items yet. The agent will surface updates as it crawls relevant sources.</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Performance Snapshot */}
                  <div>
                    <h3 className="text-[13px] font-semibold mb-3" style={{ color: T92 }}>Performance Snapshot</h3>
                    <div className="grid grid-cols-4 gap-3">
                      {athlete.worldRank && (
                        <div className="rounded-xl p-4" style={{ background: CARD_BG, border: CARD_BDR }}>
                          <div className="text-[11px] font-medium mb-1" style={{ color: T40 }}>World Rank</div>
                          <div className="text-[22px] font-bold leading-tight mb-0.5" style={{ color: T92 }}>#{athlete.worldRank}</div>
                          <div className="text-[10px]" style={{ color: T28 }}>{athlete.event}</div>
                          {athlete.worldRankDelta != null && athlete.worldRankDelta !== 0 && (
                            <div className="text-[10px] font-semibold mt-1.5 flex items-center gap-1" style={{ color: athlete.worldRankDelta > 0 ? "#4ade80" : "#f87171" }}>
                              {athlete.worldRankDelta > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                              {Math.abs(athlete.worldRankDelta)}
                            </div>
                          )}
                        </div>
                      )}
                      {athlete.personalBest && (
                        <div className="rounded-xl p-4 overflow-hidden" title={athlete.personalBest} style={{ background: CARD_BG, border: CARD_BDR }}>
                          <div className="text-[11px] font-medium mb-1" style={{ color: T40 }}>Personal Best</div>
                          <div className={`font-bold leading-tight mb-0.5 break-words ${athlete.personalBest.length <= 8 ? "text-[22px]" : athlete.personalBest.length <= 14 ? "text-[16px]" : "text-[12px] line-clamp-2"}`} style={{ color: T92 }}>{athlete.personalBest}</div>
                          <div className="text-[10px] truncate" style={{ color: T28 }}>{athlete.event}</div>
                        </div>
                      )}
                      {athlete.seasonBest && (
                        <div className="rounded-xl p-4 overflow-hidden" title={athlete.seasonBest} style={{ background: CARD_BG, border: CARD_BDR }}>
                          <div className="text-[11px] font-medium mb-1" style={{ color: T40 }}>Season Best</div>
                          <div className={`font-bold leading-tight mb-0.5 break-words ${athlete.seasonBest.length <= 8 ? "text-[22px]" : athlete.seasonBest.length <= 14 ? "text-[16px]" : "text-[12px] line-clamp-2"}`} style={{ color: T92 }}>{athlete.seasonBest}</div>
                          <div className="text-[10px]" style={{ color: T28 }}>Current season</div>
                        </div>
                      )}
                      {athlete.nationalRank && (
                        <div className="rounded-xl p-4" style={{ background: CARD_BG, border: CARD_BDR }}>
                          <div className="text-[11px] font-medium mb-1" style={{ color: T40 }}>National Rank</div>
                          <div className="text-[22px] font-bold leading-tight mb-0.5" style={{ color: T92 }}>#{athlete.nationalRank}</div>
                          <div className="text-[10px]" style={{ color: T28 }}>{athlete.nationality}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Upcoming Competitions */}
                  {Array.isArray(competitions) && upcomingComps.length > 0 && (
                    <div>
                      <h3 className="text-[13px] font-semibold mb-3" style={{ color: T92 }}>Upcoming Competitions</h3>
                      <div className="rounded-xl overflow-hidden" style={{ background: CARD_BG, border: CARD_BDR }}>
                        {upcomingComps.slice(0, 3).map((comp: any, i: number, arr: any[]) => (
                          <div key={comp.id} className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: i < arr.length - 1 ? `1px solid ${BDR_DIM}` : undefined }}>
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(107,143,224,0.12)" }}>
                                <Calendar size={13} style={{ color: "#6B8FE0" }} />
                              </div>
                              <div>
                                <div className="text-[13px] font-medium" style={{ color: T92 }}>{comp.meetName}</div>
                                <div className="text-[11px]" style={{ color: T40 }}>{comp.location} · {comp.event}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span
                                className="px-2 py-0.5 rounded text-[10px] font-bold"
                                style={{
                                  background: comp.tier === "A" ? "rgba(185,255,74,0.10)" : "rgba(107,143,224,0.10)",
                                  color:      comp.tier === "A" ? LIME                    : "#6B8FE0",
                                }}
                              >
                                Tier {comp.tier}
                              </span>
                              <span className="text-[12px]" style={{ color: T40 }}>{comp.date}</span>
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
                  <div className="rounded-xl p-5" style={{ background: CARD_BG, border: CARD_BDR }}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Users size={13} style={{ color: T40 }} />
                        <h3 className="text-[13px] font-semibold" style={{ color: T92 }}>Social Media</h3>
                      </div>
                      {!editingSocial ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={refreshSocial}
                            disabled={refreshingSocial}
                            aria-label="Refresh social media from web"
                            className="text-[11px] flex items-center gap-1 disabled:opacity-50 transition-colors hover:text-white"
                            style={{ color: T40 }}
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={refreshingSocial ? "animate-spin" : ""}><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                            {refreshingSocial ? "Searching…" : "Refresh from web"}
                          </button>
                          <button
                            onClick={() => setEditingSocial(true)}
                            aria-label="Edit social media stats"
                            className="text-[11px] flex items-center gap-1 transition-colors hover:text-white"
                            style={{ color: T40 }}
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            Edit
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button onClick={() => setEditingSocial(false)} className="text-[11px] transition-colors hover:text-white" style={{ color: T40 }}>Cancel</button>
                          <button
                            onClick={saveSocial}
                            disabled={savingSocial}
                            className="text-[11px] px-2.5 py-1 rounded-md transition-colors disabled:opacity-60"
                            style={{ background: LIME, color: BG }}
                          >
                            {savingSocial ? "Saving…" : "Save"}
                          </button>
                        </div>
                      )}
                    </div>
                    {socialRefreshNote && (
                      <p className="text-[11px] mb-3 px-2 py-1.5 rounded-md" style={{ background: "rgba(255,255,255,0.05)", color: T55 }}>{socialRefreshNote}</p>
                    )}

                    {editingSocial ? (
                      <div className="space-y-4">
                        {(["instagram", "twitter", "tiktok"] as const).map((platform) => {
                          const handleKey  = `${platform}Handle`   as keyof typeof socialDraft;
                          const followersKey = `${platform}Followers` as keyof typeof socialDraft;
                          const label = platform === "twitter" ? "X / Twitter" : platform.charAt(0).toUpperCase() + platform.slice(1);
                          return (
                            <div key={platform} className="space-y-1.5">
                              <div className="text-[11px] font-medium" style={{ color: T40 }}>{label}</div>
                              <input
                                type="text"
                                aria-label={`${label} handle`}
                                placeholder="username (no @)"
                                value={socialDraft[handleKey]}
                                onChange={(e) => setSocialDraft((d) => ({ ...d, [handleKey]: e.target.value.replace(/^@/, "") }))}
                                className="w-full text-[12px] rounded-lg px-3 py-1.5 outline-none transition-all"
                                style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${BDR_DIM}`, color: T92 }}
                              />
                              <input
                                type="text"
                                aria-label={`${label} follower count`}
                                placeholder="Followers (e.g. 250000)"
                                value={socialDraft[followersKey]}
                                onChange={(e) => setSocialDraft((d) => ({ ...d, [followersKey]: e.target.value }))}
                                className="w-full text-[12px] rounded-lg px-3 py-1.5 outline-none transition-all"
                                style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${BDR_DIM}`, color: T92 }}
                              />
                            </div>
                          );
                        })}
                        <p className="text-[10px] pt-1" style={{ color: T40 }}>Enter the current follower count from the platform directly — this keeps numbers accurate.</p>
                      </div>
                    ) : (
                      (() => {
                        const platforms = [
                          { handle: athlete.instagramHandle, followers: athlete.instagramFollowers, label: "Instagram", color: "#C8BDFF", sparkline: [60,62,65,63,70,74,72,78,80,83,85,100] as number[] },
                          { handle: athlete.twitterHandle,   followers: athlete.twitterFollowers,   label: "X / Twitter", color: "#6B8FE0", sparkline: [50,52,55,60,58,63,65,68,70,72,75,80] as number[] },
                          { handle: athlete.tiktokHandle,    followers: athlete.tiktokFollowers,    label: "TikTok",    color: "#4ade80", sparkline: [40,45,48,50,55,58,62,66,70,74,78,85] as number[] },
                        ].filter((p) => p.handle);

                        if (platforms.length === 0) {
                          return (
                            <div className="text-center py-4">
                              <p className="text-[12px] mb-2" style={{ color: T40 }}>No social accounts added yet.</p>
                              <button onClick={() => setEditingSocial(true)} className="text-[12px] hover:underline" style={{ color: LIME }}>Add social accounts →</button>
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-4">
                            {platforms.map((p, i) => (
                              <div key={p.label} className={i < platforms.length - 1 ? "pb-4" : ""} style={{ borderBottom: i < platforms.length - 1 ? `1px solid ${BDR_DIM}` : undefined }}>
                                <div className="text-[12px] font-semibold mb-0.5" style={{ color: T92 }}>@{p.handle}</div>
                                <div className="text-[11px] mb-1" style={{ color: T40 }}>{p.label}</div>
                                {p.followers ? (
                                  <>
                                    <div className="text-[20px] font-bold" style={{ color: T92 }}>
                                      {p.followers >= 1_000_000
                                        ? `${(p.followers / 1_000_000).toFixed(1)}M`
                                        : `${(p.followers / 1000).toFixed(1)}K`}{" "}
                                      <span className="text-xs font-normal" style={{ color: T40 }}>followers</span>
                                    </div>
                                    <Sparkline data={p.sparkline} color={p.color} />
                                  </>
                                ) : (
                                  <button onClick={() => setEditingSocial(true)} className="text-[11px] transition-colors hover:text-white" style={{ color: T40 }}>Add follower count →</button>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      })()
                    )}
                  </div>

                  {/* Agent Status */}
                  <div className="rounded-xl p-5" style={{ background: CARD_BG, border: CARD_BDR }}>
                    <h3 className="text-[13px] font-semibold mb-3" style={{ color: T92 }}>Agent Status</h3>
                    <div className="space-y-2 text-[12px]">
                      <div className="flex justify-between">
                        <span style={{ color: T40 }}>Status</span>
                        <span className="font-semibold" style={{ color: athlete.agentStatus === "active" ? "#4ade80" : T40 }}>
                          {athlete.agentStatus === "active" ? "Active" : "Paused"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: T40 }}>Intel items</span>
                        <span className="font-semibold" style={{ color: T92 }}>{athlete.intelligenceCount ?? 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: T40 }}>Last crawl</span>
                        <span className="font-semibold" style={{ color: T70 }}>{lastCrawledAgo}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AI Summary tab */}
          {activeTab === "summary" && (
            <div className="max-w-3xl mx-auto w-full px-8 py-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-[16px] font-semibold" style={{ color: T92 }}>AI Intelligence Summary</h2>
                  <p className="text-[12px] mt-0.5" style={{ color: T40 }}>
                    {summaryGeneratedAt
                      ? `Generated ${new Date(summaryGeneratedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`
                      : "AI-generated career and intelligence briefing"}
                  </p>
                </div>
                <button
                  onClick={generateSummary}
                  disabled={summaryStreaming}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-medium transition-colors disabled:opacity-60"
                  style={{ background: LIME, color: BG }}
                >
                  {summaryStreaming ? (
                    <><span className="w-3 h-3 rounded-full border-2 border-[#0D1C0B]/30 border-t-[#0D1C0B] animate-spin" /> Generating…</>
                  ) : summaryText ? (
                    <>↺ Regenerate</>
                  ) : (
                    <>✦ Generate Summary</>
                  )}
                </button>
              </div>

              {summaryStreaming && !summaryText && (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${LIME} transparent` }} />
                  <p className="text-[13px]" style={{ color: T40 }}>Analysing intelligence data…</p>
                </div>
              )}

              {summaryText ? (
                <div className="rounded-xl p-6" style={{ background: CARD_BG, border: CARD_BDR }}>
                  <div className="prose prose-sm max-w-none leading-relaxed">
                    {summaryText.split(/\n/).map((line, i) => {
                      if (line.startsWith("## ")) return (
                        <h3 key={i} className="text-[14px] font-bold mt-5 mb-2 first:mt-0 pb-1" style={{ color: T92, borderBottom: `1px solid ${BDR_DIM}` }}>
                          {line.replace("## ", "")}
                        </h3>
                      );
                      if (line.startsWith("# ")) return (
                        <h2 key={i} className="text-[15px] font-bold mt-5 mb-2 first:mt-0" style={{ color: T92 }}>{line.replace("# ", "")}</h2>
                      );
                      if (!line.trim()) return <div key={i} className="h-2" />;
                      return <p key={i} className="text-[13px] leading-relaxed mb-0" style={{ color: T70 }}>{line}</p>;
                    })}
                    {summaryStreaming && (
                      <span className="inline-block w-0.5 h-4 animate-pulse ml-0.5 translate-y-0.5" style={{ background: LIME }} />
                    )}
                  </div>
                </div>
              ) : !summaryStreaming && (
                <div className="flex flex-col items-center justify-center py-20 rounded-xl gap-4" style={{ border: `1px dashed ${BDR_DIM}` }}>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "rgba(185,255,74,0.08)" }}>
                    <span className="text-[20px]">✦</span>
                  </div>
                  <div className="text-center">
                    <p className="text-[14px] font-medium mb-1" style={{ color: T92 }}>No summary generated yet</p>
                    <p className="text-[13px] max-w-xs" style={{ color: T55 }}>
                      Generate an AI briefing covering career arc, current form, key relationships, and intelligence assessment.
                    </p>
                  </div>
                  <button
                    onClick={generateSummary}
                    className="px-5 py-2.5 rounded-lg text-[13px] font-medium transition-colors"
                    style={{ background: LIME, color: BG }}
                  >
                    Generate Summary
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Sources tab */}
          {activeTab === "sources" && (
            <div className="max-w-6xl mx-auto w-full px-8 py-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-[16px] font-semibold" style={{ color: T92 }}>Source Evidence</h2>
                  <p className="text-[12px] mt-0.5" style={{ color: T40 }}>Every intelligence item traced to its origin</p>
                </div>
                <span className="text-[12px]" style={{ color: T40 }}>{Array.isArray(intel) ? intel.length : 0} citations</span>
              </div>
              {Array.isArray(intel) && intel.length > 0 ? (
                <div className="space-y-3">
                  {intel.map((item: any) => (
                    <div key={item.id} className="rounded-xl p-5" style={{ background: CARD_BG, border: CARD_BDR }}>
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="px-2 py-0.5 rounded text-[11px] font-semibold"
                            style={{
                              background: `${categoryColors[item.category] ?? "#6B8FE0"}18`,
                              color: categoryColors[item.category] ?? "#6B8FE0",
                            }}
                          >
                            {categoryLabel[item.category] ?? item.category}
                          </span>
                          <Globe size={11} style={{ color: T28 }} />
                          <span className="text-[11px] font-medium" style={{ color: T55 }}>{item.sourceDomain}</span>
                          {item.sourceUrl && (
                            <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer"
                              className="text-[11px] flex items-center gap-1 hover:underline" style={{ color: "#6B8FE0" }}>
                              <Globe size={10} /> View source
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="flex items-center gap-1.5">
                            <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.10)" }}>
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${item.confidence}%`,
                                  background: (item.confidence ?? 0) >= 90 ? "#4ade80" : (item.confidence ?? 0) >= 80 ? "#6B8FE0" : "#fbbf24",
                                }}
                              />
                            </div>
                            <span className="text-[11px] font-semibold" style={{ color: T55 }}>{item.confidence}%</span>
                          </div>
                          {item.publishedAt && (
                            <span className="text-[11px]" style={{ color: T28 }}>
                              {new Date(item.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                          )}
                        </div>
                      </div>
                      <h4 className="text-[14px] font-semibold mb-1" style={{ color: T92 }}>{item.title}</h4>
                      <p className="text-[13px] leading-relaxed" style={{ color: T55 }}>{item.summary}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={<Globe size={20} style={{ color: T40 }} />} label="No source evidence yet" />
              )}
            </div>
          )}

          {/* Intelligence tab */}
          {activeTab === "intelligence" && (
            <div className="max-w-6xl mx-auto w-full px-8 py-6 space-y-3">
              {Array.isArray(intel) && intel.length > 0 ? (
                intel.map((item: any) => (
                  <div key={item.id} className="rounded-xl p-5" style={{ background: CARD_BG, border: CARD_BDR }}>
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="px-2 py-0.5 rounded text-[11px] font-semibold"
                          style={{
                            background: `${categoryColors[item.category] ?? "#6B8FE0"}18`,
                            color: categoryColors[item.category] ?? "#6B8FE0",
                          }}
                        >
                          {categoryLabel[item.category] ?? item.category}
                        </span>
                        <span className="text-[11px]" style={{ color: T40 }}>{item.sourceDomain}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[11px]" style={{ color: T40 }}>{item.confidence}% confidence</span>
                        {item.sourceUrl && (
                          <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] flex items-center gap-1 hover:underline" style={{ color: "#6B8FE0" }}>
                            <Globe size={11} />
                            Source
                          </a>
                        )}
                      </div>
                    </div>
                    <h4 className="text-[14px] font-semibold mb-1" style={{ color: T92 }}>{item.title}</h4>
                    <p className="text-[13px] leading-relaxed" style={{ color: T55 }}>{item.summary}</p>
                  </div>
                ))
              ) : (
                <EmptyState icon={<BarChart2 size={20} style={{ color: T40 }} />} label="No intelligence items yet" />
              )}
            </div>
          )}

          {/* Contacts tab */}
          {activeTab === "contacts" && (
            <div className="max-w-6xl mx-auto w-full px-8 py-6">
              {Array.isArray(contacts) && contacts.length > 0 ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[15px] font-semibold" style={{ color: T92 }}>Relationship Network</h2>
                    <div className="flex items-center gap-1 rounded-lg p-0.5" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <button
                        onClick={() => setContactsView("table")}
                        className="px-3 py-1.5 rounded-md text-[11px] font-medium transition-all"
                        style={{
                          background: contactsView === "table" ? "rgba(255,255,255,0.10)" : "transparent",
                          color: contactsView === "table" ? T92 : T40,
                        }}
                      >
                        Table
                      </button>
                      <button
                        onClick={() => setContactsView("graph")}
                        className="px-3 py-1.5 rounded-md text-[11px] font-medium transition-all flex items-center gap-1"
                        style={{
                          background: contactsView === "graph" ? "rgba(255,255,255,0.10)" : "transparent",
                          color: contactsView === "graph" ? T92 : T40,
                        }}
                      >
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="2" stroke="currentColor" strokeWidth="1.2"/><circle cx="2" cy="2" r="1.2" stroke="currentColor" strokeWidth="1.2"/><circle cx="10" cy="2" r="1.2" stroke="currentColor" strokeWidth="1.2"/><circle cx="2" cy="10" r="1.2" stroke="currentColor" strokeWidth="1.2"/><line x1="4" y1="4" x2="3" y2="3" stroke="currentColor" strokeWidth="1"/><line x1="8" y1="4" x2="9" y2="3" stroke="currentColor" strokeWidth="1"/><line x1="4" y1="8" x2="3" y2="9" stroke="currentColor" strokeWidth="1"/></svg>
                        Graph
                      </button>
                    </div>
                  </div>

                  {contactsView === "graph" ? (
                    <Canvas3DWrapper errorFallback={
                      <div className="space-y-3">
                        {contacts.map((c: any) => (
                          <div key={c.id} className="rounded-xl p-5 flex items-start justify-between gap-4" style={{ background: CARD_BG, border: CARD_BDR }}>
                            <div className="flex-1 min-w-0">
                              <span className="text-[14px] font-semibold" style={{ color: T92 }}>{c.name || "Unknown"}</span>
                              <div className="text-[12px] mt-0.5" style={{ color: T55 }}>{c.role} · {c.org}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    }>
                      <RelationshipGraph3D contacts={contacts} athleteName={athlete.name} />
                    </Canvas3DWrapper>
                  ) : (
                    <div className="space-y-3">
                      {contacts.map((c: any) => (
                        <div key={c.id} className="rounded-xl p-5 flex items-start justify-between gap-4" style={{ background: CARD_BG, border: CARD_BDR }}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[14px] font-semibold" style={{ color: T92 }}>{c.name || "Unknown"}</span>
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                                style={{ background: `${statusColor[c.status] ?? T40}18`, color: statusColor[c.status] ?? T40 }}
                              >
                                {c.status}
                              </span>
                            </div>
                            <div className="text-[12px] mb-1" style={{ color: T55 }}>{c.role} · {c.org}</div>
                            {c.note && <p className="text-[12px]" style={{ color: T40 }}>{c.note}</p>}
                            {c.sourceExcerpt && (
                              <p className="text-[11px] mt-1 italic pl-2" style={{ color: T28, borderLeft: "2px solid rgba(255,255,255,0.12)" }}>{c.sourceExcerpt}</p>
                            )}
                          </div>
                          <div className="shrink-0 flex flex-col items-end gap-2">
                            <span className="text-[11px]" style={{ color: T40 }}>{c.confidence}% confidence</span>
                            {c.publicEmail && (
                              <a href={`mailto:${c.publicEmail}`} className="text-[11px] flex items-center gap-1 hover:underline" style={{ color: "#6B8FE0" }}>
                                <Mail size={11} /> {c.publicEmail}
                              </a>
                            )}
                            {c.website && (
                              <a href={`https://${c.website}`} target="_blank" rel="noopener noreferrer" className="text-[11px] flex items-center gap-1 hover:underline" style={{ color: "#6B8FE0" }}>
                                <Globe size={11} /> {c.website}
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <EmptyState icon={<ShieldCheck size={20} style={{ color: T40 }} />} label="No verified contacts yet" />
              )}
            </div>
          )}

          {/* Timeline tab */}
          {activeTab === "timeline" && (
            <div className="max-w-6xl mx-auto w-full px-8 py-6">
              {Array.isArray(timeline) && timeline.length > 0 ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[15px] font-semibold" style={{ color: T92 }}>Career Timeline</h2>
                    <div className="flex items-center gap-1 rounded-lg p-0.5" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <button
                        onClick={() => setTimelineView("list")}
                        className="px-3 py-1.5 rounded-md text-[11px] font-medium transition-all"
                        style={{
                          background: timelineView === "list" ? "rgba(255,255,255,0.10)" : "transparent",
                          color: timelineView === "list" ? T92 : T40,
                        }}
                      >
                        List
                      </button>
                      <button
                        onClick={() => setTimelineView("3d")}
                        className="px-3 py-1.5 rounded-md text-[11px] font-medium transition-all flex items-center gap-1"
                        style={{
                          background: timelineView === "3d" ? "rgba(255,255,255,0.10)" : "transparent",
                          color: timelineView === "3d" ? T92 : T40,
                        }}
                      >
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M6 1L11 3.5V8.5L6 11L1 8.5V3.5L6 1Z" stroke="currentColor" strokeWidth="1.2"/></svg>
                        3D
                      </button>
                    </div>
                  </div>

                  {timelineView === "3d" ? (
                    <Canvas3DWrapper errorFallback={
                      <div className="relative pl-6 space-y-6" style={{ borderLeft: `2px solid ${BDR_DIM}` }}>
                        {timeline.map((evt: any) => (
                          <div key={evt.id} className="relative">
                            <div className="absolute -left-[25px] top-1 w-4 h-4 rounded-full border-2 flex items-center justify-center" style={{ background: BG, borderColor: evt.significant ? LIME : BDR_DIM }}>
                              {evt.significant && <div className="w-2 h-2 rounded-full" style={{ background: LIME }} />}
                            </div>
                            <div className="rounded-xl p-4" style={{ background: CARD_BG, border: CARD_BDR }}>
                              <div className="flex items-start justify-between gap-3 mb-1">
                                <h4 className="text-[13px] font-semibold" style={{ color: T92 }}>{evt.title}</h4>
                                <span className="text-[11px] shrink-0" style={{ color: T40 }}>{evt.date}</span>
                              </div>
                              {evt.location && <div className="flex items-center gap-1 text-[11px] mb-1" style={{ color: T40 }}><MapPin size={10} />{evt.location}</div>}
                              {evt.description && <p className="text-[12px] leading-relaxed" style={{ color: T55 }}>{evt.description}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    }>
                      <Timeline3D events={timeline} />
                    </Canvas3DWrapper>
                  ) : (
                    <div className="relative pl-6 space-y-6" style={{ borderLeft: `2px solid ${BDR_DIM}` }}>
                      {timeline.map((evt: any) => (
                        <div key={evt.id} className="relative">
                          <div className="absolute -left-[25px] top-1 w-4 h-4 rounded-full border-2 flex items-center justify-center" style={{ background: BG, borderColor: evt.significant ? LIME : BDR_DIM }}>
                            {evt.significant && <div className="w-2 h-2 rounded-full" style={{ background: LIME }} />}
                          </div>
                          <div className="rounded-xl p-4" style={{ background: CARD_BG, border: CARD_BDR }}>
                            <div className="flex items-start justify-between gap-3 mb-1">
                              <h4 className="text-[13px] font-semibold" style={{ color: T92 }}>{evt.title}</h4>
                              <span className="text-[11px] shrink-0" style={{ color: T40 }}>{evt.date}</span>
                            </div>
                            {evt.location && <div className="flex items-center gap-1 text-[11px] mb-1" style={{ color: T40 }}><MapPin size={10} />{evt.location}</div>}
                            {evt.description && <p className="text-[12px] leading-relaxed" style={{ color: T55 }}>{evt.description}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <EmptyState icon={<Clock size={20} style={{ color: T40 }} />} label="No timeline events yet" />
              )}
            </div>
          )}

          {/* Results tab */}
          {activeTab === "results" && (
            <div className="max-w-6xl mx-auto w-full px-8 py-6">
              {completedComps.length > 0 ? (
                <>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    {(() => {
                      const podiums = completedComps.filter((c: any) => /^(1st|2nd|3rd|gold|silver|bronze)/i.test(c.result ?? "")).length;
                      const wins    = completedComps.filter((c: any) => /^(1st|gold|win)/i.test(c.result ?? "")).length;
                      return (
                        <>
                          <div className="rounded-xl p-4 text-center" style={{ background: CARD_BG, border: CARD_BDR }}>
                            <div className="text-[26px] font-bold" style={{ color: T92 }}>{completedComps.length}</div>
                            <div className="text-[11px] font-medium mt-0.5" style={{ color: T40 }}>Races on Record</div>
                          </div>
                          <div className="rounded-xl p-4 text-center" style={{ background: CARD_BG, border: CARD_BDR }}>
                            <div className="text-[26px] font-bold" style={{ color: LIME }}>{wins}</div>
                            <div className="text-[11px] font-medium mt-0.5" style={{ color: T40 }}>Wins</div>
                          </div>
                          <div className="rounded-xl p-4 text-center" style={{ background: CARD_BG, border: CARD_BDR }}>
                            <div className="text-[26px] font-bold" style={{ color: "#6B8FE0" }}>{podiums}</div>
                            <div className="text-[11px] font-medium mt-0.5" style={{ color: T40 }}>Podiums</div>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  <div className="rounded-xl overflow-hidden" style={{ background: CARD_BG, border: CARD_BDR }}>
                    <div className="grid grid-cols-[1fr_2fr_1fr_80px_120px] gap-0 px-5 py-2.5" style={{ borderBottom: `1px solid ${BDR_DIM}`, background: "rgba(255,255,255,0.02)" }}>
                      {["Date", "Competition", "Event", "Tier", "Result"].map((h) => (
                        <div key={h} className="text-[10px] font-bold uppercase tracking-widest" style={{ color: T28 }}>{h}</div>
                      ))}
                    </div>
                    {completedComps
                      .slice()
                      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((comp: any, i: number) => {
                        const result   = comp.result ?? "";
                        const isWin    = /^(1st|gold|win)/i.test(result);
                        const isPodium = /^(2nd|silver|3rd|bronze)/i.test(result);
                        const medalColor = isWin ? "#F59E0B" : isPodium ? "#9CA3AF" : null;
                        return (
                          <div
                            key={comp.id}
                            className="grid grid-cols-[1fr_2fr_1fr_80px_120px] gap-0 px-5 py-3.5 items-center transition-colors"
                            style={{ borderBottom: `1px solid rgba(255,255,255,0.04)`, background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}
                          >
                            <div className="text-[12px] font-medium" style={{ color: T40 }}>{comp.date}</div>
                            <div>
                              <div className="text-[13px] font-semibold leading-snug" style={{ color: T92 }}>{comp.meetName}</div>
                              {comp.location && <div className="text-[11px] flex items-center gap-1 mt-0.5" style={{ color: T28 }}><MapPin size={9} />{comp.location}</div>}
                            </div>
                            <div className="text-[12px]" style={{ color: T55 }}>{comp.event}</div>
                            <div>
                              <span
                                className="px-2 py-0.5 rounded text-[10px] font-bold"
                                style={{
                                  background: comp.tier === "A" ? "rgba(185,255,74,0.10)" : comp.tier === "B" ? "rgba(107,143,224,0.10)" : "rgba(255,255,255,0.06)",
                                  color:      comp.tier === "A" ? LIME                    : comp.tier === "B" ? "#6B8FE0"                : T40,
                                }}
                              >
                                Tier {comp.tier}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {medalColor && (
                                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0" style={{ background: medalColor }}>
                                  {isWin ? "1" : isPodium && /2nd/i.test(result) ? "2" : "3"}
                                </div>
                              )}
                              <span className="text-[13px] font-semibold" style={{ color: isWin ? "#F59E0B" : isPodium ? T55 : T92 }}>
                                {result || "—"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </>
              ) : (
                <EmptyState icon={<Trophy size={20} style={{ color: T40 }} />} label="No results recorded yet" />
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
                    <div key={comp.id} className="rounded-xl p-5 flex items-center justify-between gap-4 transition-colors" style={{ background: CARD_BG, border: CARD_BDR }}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0" style={{ background: "rgba(107,143,224,0.10)" }}>
                          <div className="text-[14px] font-bold leading-none" style={{ color: "#6B8FE0" }}>{new Date(comp.date).getDate()}</div>
                          <div className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: T40 }}>{new Date(comp.date).toLocaleString("default", { month: "short" })}</div>
                        </div>
                        <div>
                          <div className="text-[13px] font-semibold" style={{ color: T92 }}>{comp.meetName}</div>
                          <div className="text-[11px] flex items-center gap-1 mt-0.5" style={{ color: T40 }}>
                            {comp.location && <><MapPin size={9} />{comp.location} · </>}
                            {comp.event}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold"
                          style={{
                            background: comp.tier === "A" ? "rgba(185,255,74,0.10)" : comp.tier === "B" ? "rgba(107,143,224,0.10)" : "rgba(255,255,255,0.06)",
                            color:      comp.tier === "A" ? LIME                    : comp.tier === "B" ? "#6B8FE0"                : T40,
                          }}
                        >
                          Tier {comp.tier}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold" style={{ background: "rgba(74,222,128,0.10)", color: "#4ade80" }}>Upcoming</span>
                      </div>
                    </div>
                  ))
              ) : (
                <EmptyState icon={<Calendar size={20} style={{ color: T40 }} />} label="No upcoming competitions" />
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
      <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: "rgba(255,255,255,0.05)" }}>
        {icon}
      </div>
      <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.40)" }}>{label}</p>
    </div>
  );
}
