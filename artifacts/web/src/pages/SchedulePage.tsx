import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { MapPin, Calendar, ChevronRight, Timer } from "lucide-react";
import { useAuthFetch } from "@/lib/useAuthFetch";

// ── Tier config ───────────────────────────────────────────────────────────────

const tierConfig: Record<string, { label: string; bg: string; color: string; border: string }> = {
  A: { label: "Major",         bg: "rgba(185,255,74,0.15)",  color: "#B9FF4A", border: "rgba(185,255,74,0.30)" },
  B: { label: "Standard",      bg: "rgba(107,143,224,0.15)", color: "#6B8FE0", border: "rgba(107,143,224,0.30)" },
  C: { label: "Developmental", bg: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.55)", border: "rgba(255,255,255,0.15)" },
};

const ATHLETE_COLORS = [
  "#B9FF4A", "#C8BDFF", "#4ade80", "#fbbf24", "#6B8FE0",
  "#f87171", "#34d399", "#a78bfa", "#38bdf8", "#fb923c",
];

function athleteColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return ATHLETE_COLORS[h % ATHLETE_COLORS.length];
}

function athleteInitials(name: string): string {
  return name.split(" ").map((n) => n[0] ?? "").join("").slice(0, 2).toUpperCase();
}

type ApiComp = {
  id: number;
  athleteId: number;
  athleteName: string;
  meetName: string;
  event: string;
  location: string | null;
  date: string;
  tier: string;
  status: string;
  result: string | null;
  daysAway: number | null;
};

type Comp = ApiComp & { color: string; initials: string };

function normalise(c: ApiComp): Comp {
  return { ...c, color: athleteColor(c.athleteName), initials: athleteInitials(c.athleteName) };
}

// ── Countdown hook ────────────────────────────────────────────────────────────

type CountdownState = { days: number; hours: number; minutes: number; seconds: number; past: boolean };

function useCountdown(dateISO: string): CountdownState {
  const [t, setT] = useState<CountdownState>({ days: 0, hours: 0, minutes: 0, seconds: 0, past: false });
  useEffect(() => {
    if (!dateISO) return;
    const target = new Date(dateISO).getTime();
    if (isNaN(target)) return;
    function tick() {
      const diff = target - Date.now();
      if (diff <= 0) { setT({ days: 0, hours: 0, minutes: 0, seconds: 0, past: true }); return; }
      setT({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
        past: false,
      });
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [dateISO]);
  return t;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CountdownDigit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="text-4xl font-bold tabular-nums leading-none tracking-tight" style={{ color: "#B9FF4A", fontVariantNumeric: "tabular-nums" }}>
        {String(value).padStart(2, "0")}
      </div>
      <div className="text-[10px] font-medium mt-1.5 uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>
        {label}
      </div>
    </div>
  );
}

function Separator() {
  return <div className="text-3xl font-light mb-4 select-none" style={{ color: "rgba(255,255,255,0.20)" }}>:</div>;
}

function CompetitionRow({ comp, isNext, isSelected, onClick }: {
  comp: Comp; isNext: boolean; isSelected: boolean; onClick: () => void;
}) {
  const tier = tierConfig[comp.tier] ?? tierConfig.B;
  const daysAway = comp.daysAway ?? Math.ceil((new Date(comp.date).getTime() - Date.now()) / 86400000);

  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-4 rounded-xl flex items-center gap-4 transition-all"
      style={{
        background: isSelected ? "rgba(185,255,74,0.08)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${isSelected ? "rgba(185,255,74,0.25)" : "rgba(255,255,255,0.09)"}`,
      }}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
        style={{ background: `${comp.color}20`, color: comp.color, border: `1.5px solid ${comp.color}35` }}
      >
        {comp.initials}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[13px] font-semibold text-white truncate">{comp.meetName}</span>
          {isNext && (
            <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide"
              style={{ background: "#B9FF4A", color: "#0D1C0B" }}>
              Next
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[12px]" style={{ color: "rgba(255,255,255,0.40)" }}>
          <span className="font-medium" style={{ color: comp.color }}>{comp.athleteName}</span>
          <span style={{ color: "rgba(255,255,255,0.20)" }}>·</span>
          <span>{comp.event}</span>
          {comp.location && (
            <>
              <span style={{ color: "rgba(255,255,255,0.20)" }}>·</span>
              <span>{comp.location}</span>
            </>
          )}
          <span style={{ color: "rgba(255,255,255,0.20)" }}>·</span>
          <span>{new Date(comp.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <span className="px-2 py-0.5 rounded text-[11px] font-semibold"
          style={{ background: tier.bg, color: tier.color, border: `1px solid ${tier.border}` }}>
          {tier.label}
        </span>
        <span className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>
          {daysAway != null && daysAway > 0 ? `in ${daysAway}d` : "Today"}
        </span>
      </div>
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const [competitions, setCompetitions] = useState<Comp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [athleteFilter, setAthleteFilter] = useState("All");
  const authFetch = useAuthFetch();

  useEffect(() => {
    setIsLoading(true);
    authFetch("/api/competitions")
      .then((r) => r.json())
      .then((data: ApiComp[]) => {
        setCompetitions(Array.isArray(data) ? data.map(normalise) : []);
      })
      .catch(() => setCompetitions([]))
      .finally(() => setIsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nextComp = competitions[0] ?? null;
  const countdown = useCountdown(nextComp?.date ?? "");

  const effectiveId = selectedId ?? nextComp?.id ?? null;
  const selected = competitions.find((c) => c.id === effectiveId) ?? nextComp;
  const selectedCountdown = useCountdown(selected?.date ?? "");

  const athletes = ["All", ...Array.from(new Set(competitions.map((c) => c.athleteName)))];
  const filtered = athleteFilter === "All" ? competitions : competitions.filter((c) => c.athleteName === athleteFilter);

  const grouped: Record<string, Comp[]> = {};
  filtered.forEach((c) => {
    const key = new Date(c.date).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    (grouped[key] ??= []).push(c);
  });

  const breadcrumb = (
    <div className="h-14 flex items-center px-6 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.09)" }}>
      <div className="flex items-center gap-2 text-[13px] font-medium" style={{ color: "rgba(255,255,255,0.40)" }}>
        <Calendar size={14} style={{ color: "rgba(255,255,255,0.30)" }} />
        <ChevronRight size={14} style={{ color: "rgba(255,255,255,0.20)" }} />
        <span style={{ color: "rgba(255,255,255,0.85)" }}>Competition Schedule</span>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <AppLayout activePage="schedule">
        <div className="flex flex-col h-full" style={{ background: "#0D1C0B" }}>
          {breadcrumb}
          <div className="flex-1 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#B9FF4A", borderTopColor: "transparent" }} />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (competitions.length === 0) {
    return (
      <AppLayout activePage="schedule">
        <div className="flex flex-col h-full" style={{ background: "#0D1C0B" }}>
          {breadcrumb}
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Calendar size={40} className="mx-auto mb-3" style={{ color: "rgba(255,255,255,0.18)" }} />
              <h3 className="text-[15px] font-semibold text-white mb-1">No upcoming competitions</h3>
              <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.45)" }}>
                Competitions linked to your monitored athletes will appear here automatically after populating athlete data.
              </p>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  const tierDef = tierConfig[selected?.tier ?? "B"] ?? tierConfig.B;

  return (
    <AppLayout activePage="schedule">
      <div className="flex flex-col h-full overflow-hidden" style={{ background: "#0D1C0B" }}>
        {breadcrumb}

        {/* Next Race Hero */}
        <div
          className="shrink-0 px-8 py-5 flex items-center justify-between gap-8"
          style={{ background: "linear-gradient(135deg, rgba(185,255,74,0.08) 0%, rgba(13,28,11,0) 100%)", borderBottom: "1px solid rgba(255,255,255,0.09)" }}
        >
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <Timer size={13} style={{ color: "#B9FF4A" }} />
              <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "#B9FF4A" }}>Next Race</span>
            </div>
            <h2 className="text-[17px] font-semibold leading-tight truncate text-white">
              {nextComp!.meetName}
            </h2>
            <div className="flex items-center gap-2 text-[12px]" style={{ color: "rgba(255,255,255,0.45)" }}>
              <span style={{ color: nextComp!.color, fontWeight: 600 }}>{nextComp!.athleteName}</span>
              <span>·</span>
              <span>{nextComp!.event}</span>
              {nextComp!.location && <><span>·</span><span><MapPin size={11} className="inline mb-0.5" /> {nextComp!.location}</span></>}
              <span>·</span>
              <span>{new Date(nextComp!.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span>
            </div>
          </div>

          {!countdown.past ? (
            <div className="flex items-end gap-3 shrink-0">
              <CountdownDigit value={countdown.days}    label="Days" />
              <Separator />
              <CountdownDigit value={countdown.hours}   label="Hrs" />
              <Separator />
              <CountdownDigit value={countdown.minutes} label="Min" />
              <Separator />
              <CountdownDigit value={countdown.seconds} label="Sec" />
            </div>
          ) : (
            <span className="text-[13px] shrink-0" style={{ color: "rgba(255,255,255,0.40)" }}>Completed</span>
          )}
        </div>

        {/* Main content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Schedule list */}
          <div className="flex flex-col overflow-hidden" style={{ width: 480, borderRight: "1px solid rgba(255,255,255,0.09)" }}>
            {/* Athlete filter pills */}
            <div className="px-5 py-3 flex items-center gap-2 flex-wrap shrink-0"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              {athletes.map((a) => (
                <button
                  key={a}
                  onClick={() => setAthleteFilter(a)}
                  className="px-3 py-1 rounded-full text-[12px] font-medium transition-all"
                  style={{
                    background: athleteFilter === a ? "#B9FF4A" : "rgba(255,255,255,0.06)",
                    color: athleteFilter === a ? "#0D1C0B" : "rgba(255,255,255,0.55)",
                    border: `1px solid ${athleteFilter === a ? "#B9FF4A" : "rgba(255,255,255,0.10)"}`,
                  }}
                >
                  {a === "All" ? "All athletes" : a.split(" ")[0]}
                </button>
              ))}
              <span className="ml-auto text-[11px]" style={{ color: "rgba(255,255,255,0.30)" }}>
                {filtered.length} competition{filtered.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto hide-scrollbar px-4 py-4">
              {Object.entries(grouped).map(([month, comps]) => (
                <div key={month} className="mb-5">
                  <div className="text-[11px] font-bold uppercase tracking-widest mb-2 px-1"
                    style={{ color: "rgba(255,255,255,0.30)" }}>{month}</div>
                  <div className="space-y-2">
                    {comps.map((c) => (
                      <CompetitionRow
                        key={c.id}
                        comp={c}
                        isNext={c.id === nextComp!.id}
                        isSelected={c.id === effectiveId}
                        onClick={() => setSelectedId(c.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Selected event detail */}
          {selected && (
            <div className="flex-1 overflow-y-auto hide-scrollbar px-8 py-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold"
                      style={{ background: tierDef.bg, color: tierDef.color, border: `1px solid ${tierDef.border}` }}>
                      {tierDef.label}
                    </span>
                    <span className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>
                      {selected.status === "upcoming" ? "Upcoming" : "Completed"}
                    </span>
                  </div>
                  <h2 className="text-[22px] font-semibold text-white leading-tight mb-1">{selected.meetName}</h2>
                  <div className="text-[13px] flex items-center gap-2" style={{ color: "rgba(255,255,255,0.45)" }}>
                    <MapPin size={13} />
                    {selected.location ?? "Location TBC"}
                  </div>
                </div>
              </div>

              {/* Athlete pill */}
              <div className="flex items-center gap-3 mb-5 p-4 rounded-xl"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ background: `${selected.color}20`, color: selected.color }}>
                  {selected.initials}
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-white">{selected.athleteName}</div>
                  <div className="text-[12px]" style={{ color: "rgba(255,255,255,0.45)" }}>{selected.event}</div>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-[12px] font-medium text-white">
                    {new Date(selected.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  </div>
                  {selected.result && (
                    <div className="text-[12px] font-semibold mt-0.5" style={{ color: "#4ade80" }}>Result: {selected.result}</div>
                  )}
                </div>
              </div>

              {/* Countdown for selected */}
              <div className="rounded-xl p-5 mb-5 flex items-center justify-between"
                style={{ background: "linear-gradient(135deg, rgba(185,255,74,0.08) 0%, rgba(13,28,11,0.0) 100%)", border: "1px solid rgba(185,255,74,0.15)" }}>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "#B9FF4A" }}>
                    {selected.status === "upcoming" ? `Time until ${selected.event}` : "Event completed"}
                  </div>
                  <div className="text-[12px]" style={{ color: "rgba(255,255,255,0.45)" }}>
                    {new Date(selected.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                  </div>
                </div>
                <div className="flex items-end gap-2.5">
                  {selectedCountdown.past || selected.status !== "upcoming" ? (
                    <span className="text-[13px] font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>
                      {selected.result ? `Result: ${selected.result}` : "Completed"}
                    </span>
                  ) : (
                    <>
                      <CountdownDigit value={selectedCountdown.days}    label="Days" />
                      <Separator />
                      <CountdownDigit value={selectedCountdown.hours}   label="Hrs" />
                      <Separator />
                      <CountdownDigit value={selectedCountdown.minutes} label="Min" />
                      <Separator />
                      <CountdownDigit value={selectedCountdown.seconds} label="Sec" />
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
