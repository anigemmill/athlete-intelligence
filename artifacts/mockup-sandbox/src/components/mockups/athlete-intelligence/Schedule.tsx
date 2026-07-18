import React, { useState, useEffect } from "react";
import { AppLayout } from "./_shared/AppLayout";
import "./_group.css";
import {
  MapPin,
  Calendar,
  Clock,
  ChevronRight,
  Flag,
  Trophy,
  Activity,
  ExternalLink,
  Timer,
  Star,
} from "lucide-react";

// ─── Data ────────────────────────────────────────────────────────────────────

interface Competition {
  id: string;
  athleteName: string;
  athleteInitials: string;
  athleteColor: string;
  event: string;
  meet: string;
  venue: string;
  country: string;
  countryFlag: string;
  dateISO: string;          // full ISO, used for countdown
  dateLabel: string;        // display string
  timeLabel: string;
  round: string;
  tier: "A" | "B" | "C";   // A = major, B = standard, C = developmental
  pbContext: string;
  expectation: string;
}

const competitions: Competition[] = [
  {
    id: "c1",
    athleteName: "Lola Anderson",
    athleteInitials: "LA",
    athleteColor: "#E75D50",
    event: "100m Sprint",
    meet: "NZ Track & Field Championships",
    venue: "Newtown Park, Wellington",
    country: "New Zealand",
    countryFlag: "🇳🇿",
    dateISO: "2026-07-28T09:30:00",
    dateLabel: "28 Jul 2026",
    timeLabel: "09:30 NZST",
    round: "Final",
    tier: "A",
    pbContext: "PB 11.24s — posted +1.2m/s conditions at Sir Graeme Douglas",
    expectation: "Defending champion. Agent monitoring World Athletics results feed and Athletics NZ event portal from race morning.",
  },
  {
    id: "c2",
    athleteName: "Marcus Webb",
    athleteInitials: "MW",
    athleteColor: "#344F9F",
    event: "Decathlon Day 1",
    meet: "Trans-Tasman Athletics Classic",
    venue: "Sydney Athletics Centre",
    country: "Australia",
    countryFlag: "🇦🇺",
    dateISO: "2026-08-03T08:00:00",
    dateLabel: "3–4 Aug 2026",
    timeLabel: "08:00 AEST",
    round: "Combined Event",
    tier: "B",
    pbContext: "PB 7,814 pts — 2025 Oceania Championships",
    expectation: "First international competition since coaching change. Agent watching World Athletics live results and ANSW coverage.",
  },
  {
    id: "c3",
    athleteName: "Lola Anderson",
    athleteInitials: "LA",
    athleteColor: "#E75D50",
    event: "100m Sprint",
    meet: "Oceania Athletics Championships",
    venue: "Mount Smart Stadium, Auckland",
    country: "New Zealand",
    countryFlag: "🇳🇿",
    dateISO: "2026-08-15T18:00:00",
    dateLabel: "15 Aug 2026",
    timeLabel: "18:00 NZST",
    round: "Final",
    tier: "A",
    pbContext: "Won silver here in 2025 (11.31s). Enters with better form.",
    expectation: "Medal contention. Agent will surface results, post-race interviews, and ranking update within 20 min of finish.",
  },
  {
    id: "c4",
    athleteName: "James Kowalski",
    athleteInitials: "JK",
    athleteColor: "#7C6FA0",
    event: "High Jump",
    meet: "British Athletics League",
    venue: "Alexander Stadium, Birmingham",
    country: "United Kingdom",
    countryFlag: "🇬🇧",
    dateISO: "2026-08-22T14:00:00",
    dateLabel: "22 Aug 2026",
    timeLabel: "14:00 BST",
    round: "Open",
    tier: "B",
    pbContext: "PB 2.24m — targeting 2.26m for World Champs qualifying standard",
    expectation: "Qualifier attempt. Agent monitoring British Athletics results portal and field-by-field height progression.",
  },
  {
    id: "c5",
    athleteName: "Priya Nair",
    athleteInitials: "PN",
    athleteColor: "#10b981",
    event: "5000m",
    meet: "World Athletics Continental Tour",
    venue: "Stade Sébastien-Charléty, Paris",
    country: "France",
    countryFlag: "🇫🇷",
    dateISO: "2026-09-04T20:15:00",
    dateLabel: "4 Sep 2026",
    timeLabel: "20:15 CEST",
    round: "Elite Race",
    tier: "A",
    pbContext: "SB 15:12.4 — set at NZ Road Mile in June",
    expectation: "First Continental Tour appearance. Potential ranking points. Agent watching World Athletics live timing and start lists.",
  },
  {
    id: "c6",
    athleteName: "Sophie Chen",
    athleteInitials: "SC",
    athleteColor: "#8A90A8",
    event: "400m Hurdles",
    meet: "Auckland Invitational",
    venue: "AUT Millennium, Auckland",
    country: "New Zealand",
    countryFlag: "🇳🇿",
    dateISO: "2026-09-12T11:00:00",
    dateLabel: "12 Sep 2026",
    timeLabel: "11:00 NZST",
    round: "Heat + Final",
    tier: "C",
    pbContext: "PB 57.42s — returning from hamstring injury",
    expectation: "Return to competition after 8-week absence. Agent set to low-cadence monitoring with injury-status alert active.",
  },
];

const tierConfig = {
  A: { label: "Major", bg: "rgba(231,93,80,0.12)", color: "#E75D50", border: "rgba(231,93,80,0.25)" },
  B: { label: "Standard", bg: "rgba(52,79,159,0.10)", color: "#344F9F", border: "rgba(52,79,159,0.22)" },
  C: { label: "Developmental", bg: "rgba(138,144,168,0.12)", color: "#6B7080", border: "rgba(138,144,168,0.22)" },
};

// ─── Countdown hook ───────────────────────────────────────────────────────────

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

// ─── Sub-components ───────────────────────────────────────────────────────────

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
  comp: Competition;
  isNext: boolean;
  isSelected: boolean;
  onClick: () => void;
}) {
  const tier = tierConfig[comp.tier];
  const daysAway = Math.ceil((new Date(comp.dateISO).getTime() - Date.now()) / 86400000);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-4 rounded-xl border transition-all duration-150 flex items-center gap-4 ${
        isSelected
          ? "bg-[#FEEEEE] border-[rgba(231,93,80,0.25)] shadow-sm"
          : "bg-[#FFFFFF] border-[rgba(41,48,85,0.09)] hover:border-[rgba(41,48,85,0.18)] hover:shadow-sm"
      }`}
    >
      {/* Athlete avatar */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
        style={{ background: comp.athleteColor + "28", color: comp.athleteColor, border: `1.5px solid ${comp.athleteColor}30` }}
      >
        {comp.athleteInitials}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[13px] font-semibold text-[#1C1F3A] truncate">{comp.meet}</span>
          {isNext && (
            <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#E75D50] text-white uppercase tracking-wide">
              Next
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[12px] text-[#8A90A8]">
          <span className="font-medium" style={{ color: comp.athleteColor }}>{comp.athleteName}</span>
          <span className="text-[#C0C8DC]">·</span>
          <span>{comp.event}</span>
          <span className="text-[#C0C8DC]">·</span>
          <span>{comp.countryFlag} {comp.dateLabel}</span>
        </div>
      </div>

      {/* Tier badge + days away */}
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

// ─── Main component ───────────────────────────────────────────────────────────

export function Schedule() {
  const [selectedId, setSelectedId] = useState("c1");
  const [athleteFilter, setAthleteFilter] = useState<string>("All");

  const nextComp = competitions[0]; // first is always next
  const countdown = useCountdown(nextComp.dateISO);
  const selected = competitions.find((c) => c.id === selectedId) || nextComp;
  const selectedCountdown = useCountdown(selected.dateISO);

  const athletes = ["All", ...Array.from(new Set(competitions.map((c) => c.athleteName)))];
  const filtered =
    athleteFilter === "All" ? competitions : competitions.filter((c) => c.athleteName === athleteFilter);

  // Group by month
  const grouped: Record<string, Competition[]> = {};
  filtered.forEach((c) => {
    const key = new Date(c.dateISO).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(c);
  });

  const tierDef = tierConfig[selected.tier];
  const selectedDaysAway = Math.ceil((new Date(selected.dateISO).getTime() - Date.now()) / 86400000);

  return (
    <AppLayout activePage="schedule">
      <div className="athlete-intelligence-root h-full flex flex-col bg-[#FCFAFA] overflow-hidden">
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

        {/* ── Top bar ── */}
        <div className="h-14 border-b border-[rgba(41,48,85,0.10)] flex items-center px-6 shrink-0 bg-[#FCFAFA]">
          <div className="flex items-center gap-2 text-[13px] font-medium text-[#8A90A8]">
            <Calendar size={14} className="text-[#9097B0]" />
            <ChevronRight size={14} className="text-[#C0C8DC]" />
            <span className="text-[#293055]">Competition Schedule</span>
          </div>
        </div>

        {/* ── Next Race Hero Band ── */}
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
              {nextComp.meet}
            </h2>
            <div className="flex items-center gap-2 text-[12px]" style={{ color: "rgba(252,250,250,0.50)" }}>
              <span style={{ color: nextComp.athleteColor, fontWeight: 600 }}>{nextComp.athleteName}</span>
              <span>·</span>
              <span>{nextComp.event}</span>
              <span>·</span>
              <span>{nextComp.countryFlag} {nextComp.venue}</span>
              <span>·</span>
              <span>{nextComp.timeLabel}</span>
            </div>
          </div>

          {/* Countdown */}
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

        {/* ── Main content ── */}
        <div className="flex-1 flex overflow-hidden">

          {/* Left: Schedule list */}
          <div className="flex flex-col border-r border-[rgba(41,48,85,0.10)] overflow-hidden" style={{ width: 480 }}>
            {/* Athlete filter chips */}
            <div className="px-5 py-3 border-b border-[rgba(41,48,85,0.08)] flex items-center gap-2 flex-wrap shrink-0 bg-[#FCFAFA]">
              {athletes.map((a) => (
                <button
                  key={a}
                  onClick={() => setAthleteFilter(a)}
                  className={`px-3 py-1 rounded-full text-[12px] font-medium transition-all border ${
                    athleteFilter === a
                      ? "bg-[#293055] text-white border-[#293055]"
                      : "bg-[#FFFFFF] text-[#6B7080] border-[rgba(41,48,85,0.12)] hover:border-[rgba(41,48,85,0.25)]"
                  }`}
                >
                  {a === "All" ? "All athletes" : a.split(" ")[0]}
                </button>
              ))}
              <span className="ml-auto text-[11px] text-[#A0A8C0]">{filtered.length} competition{filtered.length !== 1 ? "s" : ""}</span>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto hide-scrollbar px-4 py-4 space-y-1">
              {Object.entries(grouped).map(([month, comps]) => (
                <div key={month} className="mb-5">
                  <div className="text-[11px] font-bold text-[#A0A8C0] uppercase tracking-widest mb-2 px-1">
                    {month}
                  </div>
                  <div className="space-y-2">
                    {comps.map((c) => (
                      <CompetitionRow
                        key={c.id}
                        comp={c}
                        isNext={c.id === "c1"}
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
          <div className="flex-1 overflow-y-auto hide-scrollbar px-8 py-6">
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
                  <span className="text-[11px] text-[#A0A8C0] font-medium">{selected.round}</span>
                </div>
                <h2 className="text-[22px] font-semibold text-[#1C1F3A] leading-tight mb-1">{selected.meet}</h2>
                <div className="text-[13px] text-[#7A8090] flex items-center gap-2">
                  <MapPin size={13} />
                  {selected.venue} <span className="text-[#C0C8DC]">·</span> {selected.country} {selected.countryFlag}
                </div>
              </div>
              <button className="flex items-center gap-1.5 text-[12px] font-medium text-[#8A90A8] hover:text-[#293055] transition-colors border border-[rgba(41,48,85,0.12)] rounded-lg px-3 py-1.5 bg-white">
                <ExternalLink size={12} />
                Event site
              </button>
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
                  {selected.dateLabel} · {selected.timeLabel}
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

            {/* Athlete card */}
            <div className="rounded-xl border border-[rgba(41,48,85,0.09)] bg-white p-5 mb-4">
              <div className="text-[11px] font-bold uppercase tracking-widest text-[#A0A8C0] mb-3">Monitored Athlete</div>
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold"
                  style={{ background: selected.athleteColor + "20", color: selected.athleteColor }}
                >
                  {selected.athleteInitials}
                </div>
                <div>
                  <div className="text-[14px] font-semibold text-[#1C1F3A]">{selected.athleteName}</div>
                  <div className="text-[12px] text-[#8A90A8]">{selected.event}</div>
                </div>
              </div>

              <div className="flex items-start gap-2 text-[12px] text-[#7A8090] bg-[#FCFAFA] rounded-lg p-3 border border-[rgba(41,48,85,0.07)]">
                <Trophy size={13} className="text-[#A0A8C0] mt-0.5 shrink-0" />
                <span className="leading-relaxed">{selected.pbContext}</span>
              </div>
            </div>

            {/* Agent expectation */}
            <div className="rounded-xl border border-[rgba(41,48,85,0.09)] bg-white p-5 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Activity size={13} className="text-[#E75D50]" />
                <div className="text-[11px] font-bold uppercase tracking-widest text-[#A0A8C0]">Agent Coverage Plan</div>
              </div>
              <p className="text-[13px] text-[#6B7080] leading-relaxed">{selected.expectation}</p>
            </div>

            {/* Alert on result */}
            <div
              className="rounded-xl p-4 flex items-center justify-between border"
              style={{ background: "rgba(231,93,80,0.05)", borderColor: "rgba(231,93,80,0.15)" }}
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(231,93,80,0.12)" }}>
                  <Flag size={12} style={{ color: "#E75D50" }} />
                </div>
                <div>
                  <div className="text-[13px] font-medium text-[#1C1F3A]">Result alert active</div>
                  <div className="text-[11px] text-[#8A90A8]">Immediate notification when result is published</div>
                </div>
              </div>
              <div className="w-8 h-5 rounded-full flex items-center" style={{ background: "#E75D50", paddingLeft: 3 }}>
                <div className="w-3.5 h-3.5 rounded-full bg-white ml-auto mr-0.5" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
