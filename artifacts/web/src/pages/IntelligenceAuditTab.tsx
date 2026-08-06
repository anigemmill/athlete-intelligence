/**
 * IntelligenceAuditTab — the permanent Intelligence Audit QA tool.
 *
 * Runs the real production pipeline (never mocked) against selected
 * athletes or the Golden Athlete Set, waits for completion, and renders the
 * resulting report. Rendered as a tab inside AdminPage, matching every
 * other admin feature's navigation pattern.
 */
import React, { useEffect, useMemo, useState } from "react";
import { DsCard, DsBadge, DsEmptyState, DsMetric } from "@/components/ui/ds";
import { T } from "@/lib/tokens";
import {
  RefreshCw, CheckCircle2, XCircle, AlertTriangle, Download, ChevronDown, ChevronRight, Loader2,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

type AuthFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

// ── Types mirroring the backend report shape ─────────────────────────────────

interface AthleteAuditReport {
  athleteId: number;
  name: string;
  identity: { name: string; nationality: string; sport: string; event: string; hasProfileImage: boolean; notes: string[] };
  results: { personalBest: string | null; seasonBest: string | null; worldRank: number | null; nationalRank: number | null; pbSbInverted: boolean | null; lastCrawledAt: string | null; daysSinceCrawl: number | null };
  competitions: { total: number; upcoming: number; completed: number; resultCompletenessPct: number; genericMeetNames: string[]; duplicates: unknown[]; staleUpcoming: unknown[] };
  timeline: { total: number; earliestDate: string | null; latestDate: string | null; duplicates: unknown[]; largestGapDays: number | null; sparseFlag: boolean };
  intelligence: { total: number; byCategory: Record<string, number>; zeroCategories: string[]; averageConfidence: number | null; lowConfidenceCount: number };
  contacts: { total: number; hasCoach: boolean; hasManagerOrAgent: boolean; hasSponsorContact: boolean; sponsorMentionsInIntelligence: number; perContact: Array<{ name: string; role: string; category: string; confidence: number; sourceDomain: string }>; notes: string[] };
  social: { instagram: { handle: string | null; followers: number; validFormat: boolean | null }; twitter: { handle: string | null; followers: number; validFormat: boolean | null }; tiktok: { handle: string | null; followers: number; validFormat: boolean | null }; notes: string[] };
  images: { avatarUrl: string | null; live: { ok: boolean; status: number | null; widthPx: number | null; heightPx: number | null } | null; licensingNote: string };
  sources: { totalEvidenceRecords: number; citationIndexLeaksFound: number; placeholderDomainsFound: number; distinctDomains: number; deadLinks: Array<{ url: string; status: number | null; error: string | null }>; liveLinksChecked: number };
  confidence: { distribution: { under65: number; from65to79: number; from80to89: number; from90to97: number }; average: number | null; lowestConfidenceItems: Array<{ table: string; title: string; explanation: string }> };
  iqs: { total: number; subScores: Record<string, number> };
  strengths: string[];
  weaknesses: string[];
  improvementNotes: string[];
}

interface OverallAssessment {
  overallIqs: number;
  previousRunComparison: { previousAuditRunId: number; previousOverallIqs: number; delta: number } | null;
  biggestMilestone1Impacts: string[];
  remainingIssues: string[];
  milestone2FixableIssues: string[];
  architectureLevelIssues: string[];
}

interface AuditRunReport {
  athletes: AthleteAuditReport[];
  overall: OverallAssessment;
}

interface AuditRunSummary {
  id: number;
  status: "running" | "completed" | "failed";
  athleteIds: number[];
  triggeredAt: string;
  completedAt: string | null;
  progressCompleted: number;
  progressTotal: number;
  overallIqs: number | null;
  errorMessage: string | null;
}

interface AuditRunDetail extends AuditRunSummary {
  report: AuditRunReport | null;
}

interface RosterAthlete {
  id: number;
  name: string;
  sport: string;
}

const GOLDEN_SET_NAMES = ["Peter Bol", "Zoe Hobbs", "Nick Willis", "Hamish Kerr", "Brook Macdonald"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function athletePasses(a: AthleteAuditReport): boolean {
  return a.results.pbSbInverted !== true && a.sources.citationIndexLeaksFound === 0 && a.sources.deadLinks.length === 0;
}

async function downloadReport(authFetch: AuthFetch, runId: number, format: "json" | "md") {
  const res = await authFetch(`/api/admin/intelligence-audit/${runId}/report.${format}`);
  if (!res.ok) return;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `intelligence-audit-${runId}.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ── Per-athlete drill-down ────────────────────────────────────────────────────

function AthleteDrillDown({ report }: { report: AthleteAuditReport }) {
  const [open, setOpen] = useState(false);
  const passed = athletePasses(report);

  return (
    <DsCard className="mb-3">
      <button className="flex items-center justify-between w-full text-left" onClick={() => setOpen((o) => !o)}>
        <div className="flex items-center gap-3">
          {open ? <ChevronDown size={16} style={{ color: T.t40 }} /> : <ChevronRight size={16} style={{ color: T.t40 }} />}
          <span className="text-[14px] font-semibold" style={{ color: T.t92 }}>{report.name}</span>
          <DsBadge variant={passed ? "lime" : "danger"}>{passed ? "Pass" : "Needs attention"}</DsBadge>
        </div>
        <span className="text-[13px] font-semibold" style={{ color: T.lime }}>IQS {report.iqs.total}/100</span>
      </button>

      {open && (
        <div className="mt-4 space-y-4 text-[13px]" style={{ color: T.t55 }}>
          <Section title="Identity">
            <div>Name: {report.identity.name} · Nationality: {report.identity.nationality} · Sport: {report.identity.sport} · Event: {report.identity.event}</div>
            <div>Profile image on file: {report.identity.hasProfileImage ? "yes" : "no"}</div>
            {report.identity.notes.map((n, i) => <Note key={i}>{n}</Note>)}
          </Section>

          <Section title="Results">
            <div>PB: {report.results.personalBest ?? "—"} · SB: {report.results.seasonBest ?? "—"}</div>
            <div>World rank: {report.results.worldRank ?? "—"} · National rank: {report.results.nationalRank ?? "—"}</div>
            <div>Last crawled: {report.results.daysSinceCrawl ?? "—"} day(s) ago</div>
            {report.results.pbSbInverted === true && <Note danger>Season best is logically superior to personal best.</Note>}
          </Section>

          <Section title="Competitions">
            <div>{report.competitions.total} total · {report.competitions.upcoming} upcoming · {report.competitions.completed} completed</div>
            <div>Result completeness: {report.competitions.resultCompletenessPct}%</div>
            {report.competitions.genericMeetNames.length > 0 && <Note>Generic meet names: {report.competitions.genericMeetNames.join(", ")}</Note>}
            {report.competitions.staleUpcoming.length > 0 && <Note danger>{report.competitions.staleUpcoming.length} competition(s) still "upcoming" past their date.</Note>}
          </Section>

          <Section title="Timeline">
            <div>{report.timeline.total} events · earliest {report.timeline.earliestDate ?? "—"} · latest {report.timeline.latestDate ?? "—"}</div>
            {report.timeline.sparseFlag && <Note danger>Sparse timeline (fewer than 5 events).</Note>}
          </Section>

          <Section title="Intelligence">
            <div>{report.intelligence.total} items · average confidence {report.intelligence.averageConfidence ?? "—"} · {report.intelligence.lowConfidenceCount} below emission floor</div>
            <div>By category: {Object.entries(report.intelligence.byCategory).map(([k, v]) => `${k}=${v}`).join(", ")}</div>
            {report.intelligence.zeroCategories.length > 0 && <Note>Zero coverage: {report.intelligence.zeroCategories.join(", ")}</Note>}
          </Section>

          <Section title="Contacts">
            <div>Coach: {report.contacts.hasCoach ? "yes" : "no"} · Manager/agent: {report.contacts.hasManagerOrAgent ? "yes" : "no"} · Sponsor: {report.contacts.hasSponsorContact ? "yes" : "no"}</div>
            {report.contacts.perContact.map((c, i) => (
              <div key={i}>· {c.role} — {c.name} ({c.category}, confidence {c.confidence}, source {c.sourceDomain})</div>
            ))}
            {report.contacts.notes.map((n, i) => <Note key={i}>{n}</Note>)}
          </Section>

          <Section title="Social">
            <div>Instagram: {report.social.instagram.handle ?? "—"} ({report.social.instagram.followers} followers)</div>
            <div>X/Twitter: {report.social.twitter.handle ?? "—"} ({report.social.twitter.followers} followers)</div>
            <div>TikTok: {report.social.tiktok.handle ?? "—"} ({report.social.tiktok.followers} followers)</div>
            {report.social.notes.map((n, i) => <Note key={i}>{n}</Note>)}
          </Section>

          <Section title="Images">
            <div>Avatar: {report.images.avatarUrl ?? "—"}</div>
            <div>
              Live check: {report.images.live ? (report.images.live.ok ? `resolves (${report.images.live.widthPx ?? "?"}×${report.images.live.heightPx ?? "?"}px)` : `does not resolve (status ${report.images.live.status ?? "n/a"})`) : "no image to check"}
            </div>
            <Note>{report.images.licensingNote}</Note>
          </Section>

          <Section title="Sources">
            <div>{report.sources.totalEvidenceRecords} evidence records · {report.sources.distinctDomains} distinct domains</div>
            <div>Citation-index leaks: {report.sources.citationIndexLeaksFound} · Placeholder domains: {report.sources.placeholderDomainsFound}</div>
            <div>Live links checked: {report.sources.liveLinksChecked} · Dead links: {report.sources.deadLinks.length}</div>
            {report.sources.deadLinks.map((d, i) => <Note key={i} danger>{d.url} — status {d.status ?? "n/a"}{d.error ? `, ${d.error}` : ""}</Note>)}
          </Section>

          <Section title="Confidence">
            <div>
              Distribution — &lt;65: {report.confidence.distribution.under65} · 65-79: {report.confidence.distribution.from65to79} · 80-89: {report.confidence.distribution.from80to89} · 90-97: {report.confidence.distribution.from90to97}
            </div>
            <div>Average: {report.confidence.average ?? "—"}</div>
            {report.confidence.lowestConfidenceItems.slice(0, 5).map((it, i) => <Note key={i}>{it.title} — {it.explanation}</Note>)}
          </Section>

          <Section title="IQS breakdown">
            <div className="grid grid-cols-2 gap-1">
              {Object.entries(report.iqs.subScores).map(([k, v]) => <div key={k}>{k}: {v}</div>)}
            </div>
          </Section>

          {report.strengths.length > 0 && (
            <Section title="Strengths">{report.strengths.map((s, i) => <Note key={i}>{s}</Note>)}</Section>
          )}
          {report.weaknesses.length > 0 && (
            <Section title="Weaknesses">{report.weaknesses.map((s, i) => <Note key={i} danger>{s}</Note>)}</Section>
          )}
          {report.improvementNotes.length > 0 && (
            <Section title="What still needs improving">{report.improvementNotes.map((s, i) => <Note key={i}>{s}</Note>)}</Section>
          )}
        </div>
      )}
    </DsCard>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: T.t40 }}>{title}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Note({ children, danger }: { children: React.ReactNode; danger?: boolean }) {
  return <div style={{ color: danger ? "#f87171" : T.t40 }}>· {children}</div>;
}

// ── Main tab ──────────────────────────────────────────────────────────────────

export function IntelligenceAuditTab({ authFetch }: { authFetch: AuthFetch }) {
  const [roster, setRoster] = useState<RosterAthlete[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [useGoldenSet, setUseGoldenSet] = useState(true);
  const [runs, setRuns] = useState<AuditRunSummary[]>([]);
  const [activeRun, setActiveRun] = useState<AuditRunDetail | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRuns = () =>
    authFetch("/api/admin/intelligence-audit")
      .then((r) => r.json())
      .then((d) => setRuns(d.runs ?? []))
      .catch(() => {});

  useEffect(() => {
    authFetch("/api/athletes").then((r) => r.json()).then((d) => setRoster(Array.isArray(d) ? d : [])).catch(() => {});
    loadRuns();
  }, []);

  // Poll the active run while it's still going.
  useEffect(() => {
    if (!activeRun || activeRun.status !== "running") return;
    const interval = setInterval(async () => {
      const r = await authFetch(`/api/admin/intelligence-audit/${activeRun.id}`);
      if (!r.ok) return;
      const d = await r.json();
      setActiveRun(d.run);
      if (d.run.status !== "running") loadRuns();
    }, 3000);
    return () => clearInterval(interval);
  }, [activeRun?.id, activeRun?.status]);

  const startAudit = async () => {
    setError(null);
    setStarting(true);
    try {
      const body = useGoldenSet ? { useGoldenSet: true } : { athleteIds: [...selectedIds] };
      const res = await authFetch("/api/admin/intelligence-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed to start audit");
      setActiveRun({ id: d.auditRunId, status: "running", athleteIds: d.athleteIds, triggeredAt: new Date().toISOString(), completedAt: null, progressCompleted: 0, progressTotal: d.athleteIds.length, overallIqs: null, errorMessage: null, report: null });
      loadRuns();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setStarting(false);
    }
  };

  const viewRun = async (id: number) => {
    const r = await authFetch(`/api/admin/intelligence-audit/${id}`);
    if (!r.ok) return;
    const d = await r.json();
    setActiveRun(d.run);
  };

  const trendData = useMemo(
    () =>
      runs
        .filter((r) => r.status === "completed" && r.overallIqs !== null)
        .slice()
        .reverse()
        .map((r) => ({ id: r.id, iqs: r.overallIqs, date: new Date(r.triggeredAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) })),
    [runs],
  );

  const passFailSummary = activeRun?.report
    ? {
        pass: activeRun.report.athletes.filter(athletePasses).length,
        fail: activeRun.report.athletes.filter((a) => !athletePasses(a)).length,
      }
    : null;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-[15px] font-semibold mb-1" style={{ color: T.t92 }}>Intelligence Audit</h2>
        <p className="text-[13px]" style={{ color: T.t40 }}>
          Runs the real production pipeline against selected athletes, waits for completion, and audits the resulting data.
          Never mocks AI responses, never edits records, never hard-codes corrections.
        </p>
      </div>

      {/* Run controls */}
      <DsCard>
        <div className="flex items-center gap-4 mb-3">
          <button
            className="text-[13px] px-3 py-1.5 rounded-lg font-medium"
            style={{ background: useGoldenSet ? T.bgHighlight : T.bgElevated, border: `1px solid ${useGoldenSet ? T.borderLime : T.borderDefault}`, color: useGoldenSet ? T.lime : T.t55 }}
            onClick={() => setUseGoldenSet(true)}
          >
            Golden Athlete Set ({GOLDEN_SET_NAMES.length})
          </button>
          <button
            className="text-[13px] px-3 py-1.5 rounded-lg font-medium"
            style={{ background: !useGoldenSet ? T.bgHighlight : T.bgElevated, border: `1px solid ${!useGoldenSet ? T.borderLime : T.borderDefault}`, color: !useGoldenSet ? T.lime : T.t55 }}
            onClick={() => setUseGoldenSet(false)}
          >
            Choose athletes ({selectedIds.size} selected)
          </button>
        </div>

        {useGoldenSet ? (
          <div className="text-[13px]" style={{ color: T.t40 }}>{GOLDEN_SET_NAMES.join(", ")}</div>
        ) : (
          <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto mb-2">
            {roster.map((a) => (
              <label key={a.id} className="flex items-center gap-2 text-[13px]" style={{ color: T.t55 }}>
                <input
                  type="checkbox"
                  checked={selectedIds.has(a.id)}
                  onChange={(e) => {
                    setSelectedIds((prev) => {
                      const next = new Set(prev);
                      if (e.target.checked) next.add(a.id);
                      else next.delete(a.id);
                      return next;
                    });
                  }}
                />
                {a.name}
              </label>
            ))}
          </div>
        )}

        <button
          className="mt-3 text-[13px] px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
          style={{ background: T.lime, color: T.limeFg, opacity: starting || (!useGoldenSet && selectedIds.size === 0) ? 0.5 : 1 }}
          disabled={starting || (activeRun?.status === "running") || (!useGoldenSet && selectedIds.size === 0)}
          onClick={startAudit}
        >
          {starting || activeRun?.status === "running" ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {activeRun?.status === "running" ? "Audit running…" : "Run audit"}
        </button>
        {error && <div className="mt-2 text-[13px]" style={{ color: "#f87171" }}>{error}</div>}
      </DsCard>

      {/* Progress */}
      {activeRun && activeRun.status === "running" && (
        <DsCard>
          <div className="flex items-center justify-between mb-2 text-[13px]" style={{ color: T.t55 }}>
            <span>Repopulating athlete {activeRun.progressCompleted} of {activeRun.progressTotal} via the real pipeline…</span>
            <span>{activeRun.progressCompleted}/{activeRun.progressTotal}</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: T.bgElevated }}>
            <div className="h-full rounded-full" style={{ background: T.lime, width: `${(activeRun.progressCompleted / Math.max(1, activeRun.progressTotal)) * 100}%`, transition: "width 0.3s" }} />
          </div>
        </DsCard>
      )}

      {activeRun && activeRun.status === "failed" && (
        <DsCard>
          <div className="flex items-center gap-2 text-[13px]" style={{ color: "#f87171" }}>
            <XCircle size={16} />
            Audit run #{activeRun.id} failed: {activeRun.errorMessage}
          </div>
        </DsCard>
      )}

      {/* Pass/fail summary + IQS trend */}
      {activeRun?.status === "completed" && activeRun.report && (
        <div className="grid grid-cols-3 gap-4">
          <DsMetric label="Overall IQS" value={`${activeRun.report.overall.overallIqs}/100`} accent="lime" />
          <DsMetric
            label="Pass / needs attention"
            value={`${passFailSummary?.pass ?? 0} / ${passFailSummary?.fail ?? 0}`}
            icon={passFailSummary && passFailSummary.fail === 0 ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          />
          <DsMetric
            label="vs previous run"
            value={activeRun.report.overall.previousRunComparison ? `${activeRun.report.overall.previousRunComparison.delta >= 0 ? "+" : ""}${activeRun.report.overall.previousRunComparison.delta}` : "—"}
          />
        </div>
      )}

      {trendData.length > 1 && (
        <DsCard>
          <div className="text-[13px] font-semibold mb-3" style={{ color: T.t92 }}>IQS trend</div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.borderSubtle} />
              <XAxis dataKey="date" tick={{ fill: T.t40, fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fill: T.t40, fontSize: 12 }} />
              <Tooltip contentStyle={{ background: T.bgSidebar, border: `1px solid ${T.borderDefault}`, borderRadius: 8 }} labelStyle={{ color: T.t92 }} />
              <Line type="monotone" dataKey="iqs" stroke={T.lime} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </DsCard>
      )}

      {/* Overall assessment */}
      {activeRun?.status === "completed" && activeRun.report && (
        <DsCard>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-semibold" style={{ color: T.t92 }}>Platform assessment</span>
            <div className="flex gap-2">
              <button className="text-[12px] px-3 py-1.5 rounded-lg flex items-center gap-1.5" style={{ background: T.bgElevated, border: `1px solid ${T.borderDefault}`, color: T.t55 }} onClick={() => downloadReport(authFetch, activeRun.id, "json")}>
                <Download size={12} /> JSON
              </button>
              <button className="text-[12px] px-3 py-1.5 rounded-lg flex items-center gap-1.5" style={{ background: T.bgElevated, border: `1px solid ${T.borderDefault}`, color: T.t55 }} onClick={() => downloadReport(authFetch, activeRun.id, "md")}>
                <Download size={12} /> Markdown
              </button>
            </div>
          </div>
          <div className="space-y-4 text-[13px]" style={{ color: T.t55 }}>
            <Section title="Biggest Milestone 1 impacts">{activeRun.report.overall.biggestMilestone1Impacts.map((s, i) => <Note key={i}>{s}</Note>)}</Section>
            <Section title="Remaining issues">{activeRun.report.overall.remainingIssues.length ? activeRun.report.overall.remainingIssues.map((s, i) => <Note key={i} danger>{s}</Note>) : <Note>None found.</Note>}</Section>
            <Section title="Which issues Milestone 2 will fix">{activeRun.report.overall.milestone2FixableIssues.map((s, i) => <Note key={i}>{s}</Note>)}</Section>
            <Section title="Architecture-level issues (not fixable by validation alone)">{activeRun.report.overall.architectureLevelIssues.map((s, i) => <Note key={i} danger>{s}</Note>)}</Section>
          </div>
        </DsCard>
      )}

      {/* Per-athlete drill-down */}
      {activeRun?.status === "completed" && activeRun.report && (
        <div>
          <div className="text-[13px] font-semibold mb-3" style={{ color: T.t92 }}>Per-athlete detail</div>
          {activeRun.report.athletes.map((a) => <AthleteDrillDown key={a.athleteId} report={a} />)}
        </div>
      )}

      {/* History */}
      <DsCard>
        <div className="text-[13px] font-semibold mb-3" style={{ color: T.t92 }}>Run history</div>
        {runs.length === 0 ? (
          <DsEmptyState icon={<RefreshCw size={20} />} title="No audit runs yet" description="Run your first audit above." />
        ) : (
          <div className="space-y-2">
            {runs.map((r) => (
              <button key={r.id} className="w-full flex items-center justify-between text-[13px] px-3 py-2 rounded-lg" style={{ background: T.bgElevated }} onClick={() => viewRun(r.id)}>
                <span style={{ color: T.t55 }}>#{r.id} · {new Date(r.triggeredAt).toLocaleString("en-GB")} · {r.progressTotal} athlete(s)</span>
                <div className="flex items-center gap-2">
                  {r.overallIqs !== null && <span style={{ color: T.lime }}>{r.overallIqs}/100</span>}
                  <DsBadge variant={r.status === "completed" ? "lime" : r.status === "failed" ? "danger" : "muted"}>{r.status}</DsBadge>
                </div>
              </button>
            ))}
          </div>
        )}
      </DsCard>
    </div>
  );
}
