import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Link } from "wouter";
import {
  MapPin,
  Calendar,
  ChevronRight,
  Timer,
} from "lucide-react";
import { useListCompetitions } from "@workspace/api-client-react";

const tierConfig: Record<string, any> = {
  A: { label: "Major", bg: "rgba(231,93,80,0.12)", color: "#E75D50", border: "rgba(231,93,80,0.25)" },
  B: { label: "Standard", bg: "rgba(52,79,159,0.10)", color: "#344F9F", border: "rgba(52,79,159,0.22)" },
  C: { label: "Developmental", bg: "rgba(138,144,168,0.12)", color: "#6B7080", border: "rgba(138,144,168,0.22)" },
};

function useCountdown(targetISO: string) {
  const [t, setT] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, past: false });

  useEffect(() => {
    const target = new Date(targetISO).getTime();

    function tick() {
      const diff = target - Date.now();
      if (diff <= 0) {
        setT({ days: 0, hours: 0, minutes: 0, seconds: 0, past: true });
        return;
      }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setT({ days, hours, minutes, seconds, past: false });
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetISO]);

  return t;
}

function CountdownDigit({ value, label }: { value: number; label: string }) {
  const padded = String(value).padStart(2, "0");
  return (
    <div className="flex flex-col items-center">
      <div
        className="text-4xl font-bold tabular-nums leading-none tracking-tight"
        style={{ color: "#FEEEEE", fontVariantNumeric: "tabular-nums" }}
      >
        {padded}
      </div>
      <div className="text-[10px] font-medium mt-1.5 uppercase tracking-widest" style={{ color: "rgba(252,250,250,0.45)" }}>
        {label}
      </div>
    </div>
  );
}

function Separator() {
  return (
    <div className="text-3xl font-light mb-4 select-none" style={{ color: "rgba(252,250,250,0.30)" }}>
      :
    </div>
  );
}

function CompetitionRow({
  comp,
  isNext,
  isSelected,
  onClick,
}: {
  comp: any;
  isNext: boolean;
  isSelected: boolean;
  onClick: () => void;
}) {
  const tier = tierConfig[comp.tier] || tierConfig.B;
  const daysAway = Math.ceil((new Date(comp.dateISO).getTime() - Date.now()) / 86400000);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-4 rounded-xl border transition-all duration-150 flex items-center gap-4 ${
        isSelected
          ? "bg-[#FEEEEE] border-[rgba(231,93,80,0.25)] shadow-sm"
          : "bg-[#FFFFFF] border-[#DCE2EF] hover:border-[rgba(41,48,85,0.18)] hover:shadow-sm"
      }`}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
        style={{ background: (comp.athleteColor || "#344F9F") + "28", color: comp.athleteColor || "#344F9F", border: `1.5px solid ${comp.athleteColor || "#344F9F"}30` }}
      >
        {comp.athleteInitials || "AA"}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[13px] font-semibold text-[#1C1F3A] truncate">{comp.meet || comp.name}</span>
          {isNext && (
            <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#E75D50] text-white uppercase tracking-wide">
              Next
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[12px] text-[#8A90A8]">
          <span className="font-medium" style={{ color: comp.athleteColor || "#344F9F" }}>{comp.athleteName || "Athlete"}</span>
          <span className="text-[#C0C8DC]">·</span>
          <span>{comp.event}</span>
          <span className="text-[#C0C8DC]">·</span>
          <span>{comp.countryFlag || "🌍"} {comp.dateLabel || new Date(comp.date).toLocaleDateString()}</span>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <span
          className="px-2 py-0.5 rounded text-[11px] font-semibold border"
          style={{ background: tier.bg, color: tier.color, borderColor: tier.border }}
        >
          {tier.label}
        </span>
        <span className="text-[11px] text-[#A0A8C0] font-medium">
          {daysAway > 0 ? `in ${daysAway}d` : "Today"}
        </span>
      </div>
    </button>
  );
}


export default function SchedulePage() {
  const { data: apiCompetitions, isLoading } = useListCompetitions();
  const competitions: any[] = apiCompetitions ?? [];

  const [selectedId, setSelectedId] = useState<string>("");
  const [athleteFilter, setAthleteFilter] = useState<string>("All");

  const effectiveId = selectedId || competitions[0]?.id || "";
  const nextComp: any = competitions[0] ?? null;
  const countdown = useCountdown(nextComp?.dateISO ?? nextComp?.date ?? "");
  const selected: any = competitions.find((c: any) => c.id === effectiveId) ?? nextComp;
  const selectedCountdown = useCountdown(selected?.dateISO ?? selected?.date ?? "");

  const athletes = ["All", ...Array.from(new Set(competitions.map((c: any) => c.athleteName || "Unknown")))];
  const filtered = athleteFilter === "All" ? competitions : competitions.filter((c: any) => (c.athleteName || "Unknown") === athleteFilter);

  // Group by month
  const grouped: Record<string, any[]> = {};
  filtered.forEach((c: any) => {
    const key = new Date(c.dateISO || c.date).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(c);
  });

  const tierDef = tierConfig[selected?.tier ?? "B"] || tierConfig.B;

  // Empty / loading state — shown before the hero band which requires nextComp to be non-null
  if (!isLoading && competitions.length === 0) {
    return (
      <AppLayout activePage="schedule">
        <div className="flex flex-col h-full bg-[#FCFAFA]">
          <div className="h-14 border-b border-[#DCE2EF] flex items-center px-6 shrink-0 bg-[#FCFAFA]">
            <div className="flex items-center gap-2 text-[13px] font-medium text-[#8A90A8]">
              <Calendar size={14} className="text-[#9097B0]" />
              <ChevronRight size={14} className="text-[#C0C8DC]" />
              <span className="text-[#293055]">Competition Schedule</span>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Calendar size={40} className="text-[#DCE2EF] mx-auto mb-3" />
              <h3 className="text-[15px] font-semibold text-[#1C1F3A] mb-1">No competitions scheduled</h3>
              <p className="text-[13px] text-[#6B7080]">Competitions linked to your monitored athletes will appear here automatically.</p>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activePage="schedule">
      <div className="flex flex-col h-full bg-[#FCFAFA] overflow-hidden">
        {/* Top bar */}
        <div className="h-14 border-b border-[#DCE2EF] flex items-center px-6 shrink-0 bg-[#FCFAFA]">
          <div className="flex items-center gap-2 text-[13px] font-medium text-[#8A90A8]">
            <Calendar size={14} className="text-[#9097B0]" />
            <ChevronRight size={14} className="text-[#C0C8DC]" />
            <span className="text-[#293055]">Competition Schedule</span>
          </div>
        </div>

        {/* Next Race Hero Band */}
        <div
          className="shrink-0 px-8 py-5 flex items-center justify-between gap-8"
          style={{
            background: "linear-gradient(135deg, #293055 0%, #1e2440 100%)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <Timer size={13} style={{ color: "#E75D50" }} />
              <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "#E75D50" }}>
                Next Race
              </span>
            </div>
            <h2 className="text-[17px] font-semibold leading-tight truncate" style={{ color: "rgba(252,250,250,0.95)" }}>
              {nextComp.meet || nextComp.name}
            </h2>
            <div className="flex items-center gap-2 text-[12px]" style={{ color: "rgba(252,250,250,0.50)" }}>
              <span style={{ color: nextComp.athleteColor || "#344F9F", fontWeight: 600 }}>{nextComp.athleteName || "Athlete"}</span>
              <span>·</span>
              <span>{nextComp.event}</span>
              <span>·</span>
              <span>{nextComp.countryFlag || "🌍"} {nextComp.venue || nextComp.location}</span>
              <span>·</span>
              <span>{nextComp.timeLabel || new Date(nextComp.date).toLocaleTimeString()}</span>
            </div>
          </div>

          <div className="flex items-end gap-3 shrink-0">
            <CountdownDigit value={countdown.days} label="Days" />
            <Separator />
            <CountdownDigit value={countdown.hours} label="Hrs" />
            <Separator />
            <CountdownDigit value={countdown.minutes} label="Min" />
            <Separator />
            <CountdownDigit value={countdown.seconds} label="Sec" />
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Schedule list */}
          <div className="flex flex-col border-r border-[#DCE2EF] overflow-hidden bg-[#FCFAFA]" style={{ width: 480 }}>
            <div className="px-5 py-3 border-b border-[#DCE2EF] flex items-center gap-2 flex-wrap shrink-0">
              {athletes.map((a: string) => (
                <button
                  key={a}
                  onClick={() => setAthleteFilter(a)}
                  className={`px-3 py-1 rounded-full text-[12px] font-medium transition-all border ${
                    athleteFilter === a
                      ? "bg-[#293055] text-white border-[#293055]"
                      : "bg-[#FFFFFF] text-[#6B7080] border-[#DCE2EF] hover:border-[#8A90A8]"
                  }`}
                >
                  {a === "All" ? "All athletes" : a.split(" ")[0]}
                </button>
              ))}
              <span className="ml-auto text-[11px] text-[#A0A8C0]">{filtered.length} competition{filtered.length !== 1 ? "s" : ""}</span>
            </div>

            <div className="flex-1 overflow-y-auto hide-scrollbar px-4 py-4 space-y-1">
              {Object.entries(grouped).map(([month, comps]) => (
                <div key={month} className="mb-5">
                  <div className="text-[11px] font-bold text-[#A0A8C0] uppercase tracking-widest mb-2 px-1">
                    {month}
                  </div>
                  <div className="space-y-2">
                    {comps.map((c: any) => (
                      <CompetitionRow
                        key={c.id}
                        comp={c}
                        isNext={c.id === competitions[0].id}
                        isSelected={c.id === selectedId}
                        onClick={() => setSelectedId(c.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Selected event detail */}
          <div className="flex-1 overflow-y-auto hide-scrollbar px-8 py-6 bg-[#FCFAFA]">
            {/* Event header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="px-2 py-0.5 rounded text-[11px] font-semibold border"
                    style={{ background: tierDef.bg, color: tierDef.color, borderColor: tierDef.border }}
                  >
                    {tierDef.label}
                  </span>
                  <span className="text-[11px] text-[#A0A8C0] font-medium">{selected.round || "Final"}</span>
                </div>
                <h2 className="text-[22px] font-semibold text-[#1C1F3A] leading-tight mb-1">{selected.meet || selected.name}</h2>
                <div className="text-[13px] text-[#7A8090] flex items-center gap-2">
                  <MapPin size={13} />
                  {selected.venue || selected.location} <span className="text-[#C0C8DC]">·</span> {selected.country} {selected.countryFlag}
                </div>
              </div>
            </div>

            {/* Countdown for selected */}
            <div
              className="rounded-xl p-5 mb-5 flex items-center justify-between"
              style={{ background: "linear-gradient(135deg, #293055 0%, #202740 100%)" }}
            >
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "#E75D50" }}>
                  Time until {selected.event}
                </div>
                <div className="text-[12px]" style={{ color: "rgba(252,250,250,0.55)" }}>
                  {selected.dateLabel || new Date(selected.date).toLocaleDateString()} · {selected.timeLabel || new Date(selected.date).toLocaleTimeString()}
                </div>
              </div>
              <div className="flex items-end gap-2.5">
                {selectedCountdown.past ? (
                  <span className="text-[13px] font-medium" style={{ color: "rgba(252,250,250,0.55)" }}>Completed</span>
                ) : (
                  <>
                    <CountdownDigit value={selectedCountdown.days} label="Days" />
                    <Separator />
                    <CountdownDigit value={selectedCountdown.hours} label="Hrs" />
                    <Separator />
                    <CountdownDigit value={selectedCountdown.minutes} label="Min" />
                    <Separator />
                    <CountdownDigit value={selectedCountdown.seconds} label="Sec" />
                  </>
                )}
              </div>
            </div>
            
            <div className="rounded-xl border border-[#DCE2EF] bg-white p-5 mb-4 shadow-sm">
               <p className="text-[#6B7080] text-sm leading-relaxed">{selected.expectation || "No additional context provided for this event."}</p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
