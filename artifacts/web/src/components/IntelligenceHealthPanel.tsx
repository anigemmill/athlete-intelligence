/**
 * IntelligenceHealthPanel
 *
 * The "trust layer" — shows every athlete's data quality at a glance.
 * Fetches from GET /api/athletes/:id/health and renders:
 *   - Overall confidence ring
 *   - Freshness indicator
 *   - Source diversity count
 *   - Evidence items count
 *   - Result completeness bar
 *   - Timeline events count
 *   - Known gaps list
 *   - Refresh action
 */

import React, { useEffect, useState } from "react";
import {
  Activity,
  RefreshCw,
  ChevronDown,
  Database,
  Globe,
  CheckCircle2,
  AlertTriangle,
  Clock,
  BarChart2,
  List,
  Zap,
} from "lucide-react";
import { useAuthFetch } from "@/lib/useAuthFetch";

// ── Tokens ──────────────────────────────────────────────────────────────────
const BG      = "#0D1C0B";
const LIME    = "#B9FF4A";
const T92     = "rgba(255,255,255,0.92)";
const T70     = "rgba(255,255,255,0.70)";
const T55     = "rgba(255,255,255,0.55)";
const T40     = "rgba(255,255,255,0.40)";
const T28     = "rgba(255,255,255,0.28)";
const BDR_DIM = "rgba(255,255,255,0.07)";

const GREEN  = "#4ade80";
const AMBER  = "#fbbf24";
const RED    = "#f87171";
const LAVENDER = "#C8BDFF";

// ── Types ────────────────────────────────────────────────────────────────────

interface HealthMetrics {
  athleteId:             number;
  overallConfidence:     number | null;
  evidenceCount:         number;
  sourceDiversity:       number;
  lastCrawledAt:         string | null;
  freshness:             "excellent" | "good" | "aging" | "stale" | "never";
  freshnessLabel:        string;
  daysSinceLastCrawl:    number | null;
  competitionTotal:      number;
  competitionWithResult: number;
  resultCompleteness:    number;
  timelineEventCount:    number;
  hasPhoto:              boolean;
  knownGaps:             string[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function freshnessColor(f: HealthMetrics["freshness"]): string {
  if (f === "excellent") return GREEN;
  if (f === "good")      return GREEN;
  if (f === "aging")     return AMBER;
  if (f === "stale")     return RED;
  return AMBER;
}

function confidenceColor(c: number | null): string {
  if (c === null)  return AMBER;
  if (c >= 85)     return GREEN;
  if (c >= 70)     return AMBER;
  return RED;
}

function diversityColor(d: number): string {
  if (d >= 5) return GREEN;
  if (d >= 3) return AMBER;
  return RED;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 2)  return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Yesterday";
  return `${d} days ago`;
}

// ── Confidence Ring ──────────────────────────────────────────────────────────

function ConfidenceRing({ value }: { value: number | null }) {
  const pct    = value ?? 0;
  const r      = 28;
  const circ   = 2 * Math.PI * r;
  const fill   = (pct / 100) * circ;
  const color  = confidenceColor(value);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="72" height="72" viewBox="0 0 72 72">
        {/* Track */}
        <circle cx="36" cy="36" r={r} fill="none" stroke={BDR_DIM} strokeWidth="5" />
        {/* Progress */}
        <circle
          cx="36" cy="36" r={r} fill="none"
          stroke={color} strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={`${fill} ${circ}`}
          transform="rotate(-90 36 36)"
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
        {/* Value */}
        <text
          x="36" y="36" textAnchor="middle" dominantBaseline="central"
          fill={value !== null ? T92 : T40}
          fontSize="14" fontWeight="700" fontFamily="inherit"
        >
          {value !== null ? `${value}%` : "—"}
        </text>
      </svg>
      <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: T40 }}>
        Confidence
      </span>
    </div>
  );
}

// ── Compact metric tile ──────────────────────────────────────────────────────

interface TileProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color?: string;
}

function Tile({ icon, label, value, sub, color = T92 }: TileProps) {
  return (
    <div
      className="rounded-xl p-3.5 flex flex-col gap-1.5"
      style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BDR_DIM}` }}
    >
      <div className="flex items-center gap-1.5">
        <span style={{ color: T40, display: "flex" }}>{icon}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: T40 }}>{label}</span>
      </div>
      <div className="text-[20px] font-bold leading-tight" style={{ color }}>{value}</div>
      {sub && <div className="text-[10px] leading-snug" style={{ color: T40 }}>{sub}</div>}
    </div>
  );
}

// ── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="w-full rounded-full overflow-hidden" style={{ height: 4, background: "rgba(255,255,255,0.08)" }}>
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  athleteId: number;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  refreshLabel?: string;
}

export function IntelligenceHealthPanel({ athleteId, onRefresh, isRefreshing, refreshLabel }: Props) {
  const authFetch = useAuthFetch();
  const [open, setOpen]       = useState(false);
  const [health, setHealth]   = useState<HealthMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  // Fetch health metrics whenever the panel opens (or athleteId changes while open)
  useEffect(() => {
    if (!open || !athleteId) return;
    setLoading(true);
    setError(null);
    authFetch(`/api/athletes/${athleteId}/health`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: HealthMetrics) => setHealth(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, athleteId]);

  // Re-fetch when a refresh completes (isRefreshing flips false → true → false)
  const prevRefreshing = React.useRef(isRefreshing);
  useEffect(() => {
    if (prevRefreshing.current && !isRefreshing && open) {
      // Refresh just finished — re-fetch health metrics
      setLoading(true);
      authFetch(`/api/athletes/${athleteId}/health`)
        .then((r) => r.json())
        .then((d: HealthMetrics) => setHealth(d))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
    prevRefreshing.current = isRefreshing;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRefreshing]);

  const fc = health ? freshnessColor(health.freshness) : AMBER;

  return (
    <div
      className="px-8 py-3 shrink-0"
      style={{ borderBottom: `1px solid ${BDR_DIM}`, background: "rgba(185,255,74,0.025)" }}
    >
      <div className="max-w-6xl mx-auto">

        {/* Header row — always visible */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2 text-[11px] font-semibold tracking-wide uppercase transition-colors hover:opacity-80"
            style={{ color: "rgba(185,255,74,0.65)" }}
          >
            <Activity size={12} style={{ color: LIME }} />
            Intelligence Health
            {health && (
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                style={{
                  background: `${fc}18`,
                  color: fc,
                  border: `1px solid ${fc}30`,
                }}
              >
                {health.freshnessLabel}
              </span>
            )}
            <ChevronDown
              size={12}
              className="transition-transform"
              style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
            />
          </button>

          {/* Quick stats visible even when collapsed */}
          {health && !open && (
            <div className="flex items-center gap-4 text-[11px]" style={{ color: T40 }}>
              <span>
                <span style={{ color: confidenceColor(health.overallConfidence) }}>
                  {health.overallConfidence !== null ? `${health.overallConfidence}%` : "—"}
                </span>{" "}
                confidence
              </span>
              <span>
                <span style={{ color: T70 }}>{health.evidenceCount}</span> items
              </span>
              <span>
                <span style={{ color: diversityColor(health.sourceDiversity) }}>{health.sourceDiversity}</span> sources
              </span>
              {health.knownGaps.length > 0 && (
                <span style={{ color: AMBER }}>
                  <AlertTriangle size={10} className="inline mr-0.5" />
                  {health.knownGaps.length} {health.knownGaps.length === 1 ? "gap" : "gaps"}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Expanded panel */}
        {open && (
          <div className="mt-4 space-y-4">

            {/* Loading / Error */}
            {loading && (
              <div className="flex items-center gap-2 text-[12px]" style={{ color: T40 }}>
                <div className="w-3 h-3 border border-t-transparent rounded-full animate-spin" style={{ borderColor: `${LIME} transparent` }} />
                Computing health metrics…
              </div>
            )}
            {error && !loading && (
              <p className="text-[12px]" style={{ color: RED }}>Failed to load health metrics: {error}</p>
            )}

            {health && !loading && (
              <>
                {/* Top row: confidence ring + 5 tiles */}
                <div className="flex items-start gap-4">
                  <ConfidenceRing value={health.overallConfidence} />

                  <div className="flex-1 grid grid-cols-5 gap-3">
                    <Tile
                      icon={<Clock size={11} />}
                      label="Freshness"
                      value={health.daysSinceLastCrawl !== null ? `${health.daysSinceLastCrawl}d` : "Never"}
                      sub={timeAgo(health.lastCrawledAt)}
                      color={fc}
                    />
                    <Tile
                      icon={<Database size={11} />}
                      label="Evidence"
                      value={String(health.evidenceCount)}
                      sub={`${health.evidenceCount >= 8 ? "Good" : health.evidenceCount >= 4 ? "Moderate" : "Sparse"} coverage`}
                      color={health.evidenceCount >= 8 ? GREEN : health.evidenceCount >= 4 ? AMBER : RED}
                    />
                    <Tile
                      icon={<Globe size={11} />}
                      label="Sources"
                      value={String(health.sourceDiversity)}
                      sub={`Unique domains`}
                      color={diversityColor(health.sourceDiversity)}
                    />
                    <Tile
                      icon={<List size={11} />}
                      label="Timeline"
                      value={String(health.timelineEventCount)}
                      sub={`${health.timelineEventCount >= 15 ? "Rich" : health.timelineEventCount >= 8 ? "Moderate" : "Sparse"} history`}
                      color={health.timelineEventCount >= 15 ? GREEN : health.timelineEventCount >= 8 ? AMBER : RED}
                    />
                    <Tile
                      icon={<BarChart2 size={11} />}
                      label="Results"
                      value={`${health.resultCompleteness}%`}
                      sub={`${health.competitionWithResult}/${health.competitionTotal} comps`}
                      color={health.resultCompleteness >= 80 ? GREEN : health.resultCompleteness >= 50 ? AMBER : RED}
                    />
                  </div>
                </div>

                {/* Result completeness bar */}
                {health.competitionTotal > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px]" style={{ color: T40 }}>
                      <span>Result completeness</span>
                      <span>{health.competitionWithResult} of {health.competitionTotal} past competitions have results</span>
                    </div>
                    <ProgressBar
                      pct={health.resultCompleteness}
                      color={health.resultCompleteness >= 80 ? GREEN : health.resultCompleteness >= 50 ? AMBER : RED}
                    />
                  </div>
                )}

                {/* Known gaps + actions row */}
                <div className="flex items-start gap-4">

                  {/* Known gaps */}
                  <div className="flex-1">
                    <div className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: T40 }}>
                      Known gaps
                    </div>
                    {health.knownGaps.length === 0 ? (
                      <div className="flex items-center gap-1.5 text-[12px]" style={{ color: GREEN }}>
                        <CheckCircle2 size={12} />
                        No gaps detected — profile is complete
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {health.knownGaps.map((gap) => (
                          <span
                            key={gap}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                            style={{
                              background: "rgba(251,191,36,0.08)",
                              border: "1px solid rgba(251,191,36,0.20)",
                              color: AMBER,
                            }}
                          >
                            <AlertTriangle size={9} />
                            {gap}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Refresh action */}
                  <div
                    className="rounded-xl p-3.5 flex flex-col gap-2 shrink-0 w-36"
                    style={{ background: "rgba(185,255,74,0.05)", border: "1px solid rgba(185,255,74,0.15)" }}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color: "rgba(185,255,74,0.60)" }}>
                      <Zap size={10} style={{ color: LIME }} />
                      Actions
                    </div>
                    <button
                      onClick={onRefresh}
                      disabled={isRefreshing}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all disabled:opacity-50 w-full justify-center"
                      style={{ background: isRefreshing ? "rgba(185,255,74,0.15)" : LIME, color: isRefreshing ? LIME : BG }}
                    >
                      <RefreshCw size={10} className={isRefreshing ? "animate-spin" : ""} />
                      {isRefreshing ? (refreshLabel ?? "Refreshing…") : "Refresh now"}
                    </button>
                    {health.lastCrawledAt && (
                      <div className="text-[9px] text-center leading-snug" style={{ color: T28 }}>
                        Last refreshed<br />
                        {new Date(health.lastCrawledAt).toLocaleString("en-GB", {
                          day: "numeric", month: "short", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
