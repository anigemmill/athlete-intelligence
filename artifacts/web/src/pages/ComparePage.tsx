import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Link, useSearch } from "wouter";
import { X, Plus, TrendingUp, TrendingDown, Users, BarChart2, ChevronRight, Trophy, Calendar, MapPin, Sparkles } from "lucide-react";
import { useListAthletes, useListAthleteCompetitions, useListAthleteIntelligence } from "@workspace/api-client-react";
import { useAuthFetch } from "@/lib/useAuthFetch";

// ── Colour palette for compared athletes ─────────────────────────────────────
const ATHLETE_COLORS = ["#E75D50", "#344F9F", "#7C6FA0", "#059669"];

// ── Stat bar: shows a value relative to the best across all athletes ─────────
function StatBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1.5 bg-[#F0F2F8] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[10px] text-[#A0A8C0] w-7 text-right shrink-0">{pct}%</span>
    </div>
  );
}

// ── Head-to-head results chart (sparkline-style bars) ─────────────────────────
function H2HChart({ athletes }: { athletes: any[] }) {
  // Build a unified timeline from completed competitions
  const allComps: { name: string; athleteId: number; date: string; result: string; meet: string }[] = [];
  athletes.forEach((a) => {
    (a.competitions ?? [])
      .filter((c: any) => c.status === "completed" && c.result)
      .forEach((c: any) => allComps.push({ name: a.name, athleteId: a.id, date: c.date, result: c.result ?? "", meet: c.meetName }));
  });
  allComps.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const meets = Array.from(new Set(allComps.map((c) => c.meet))).slice(-12);

  if (meets.length === 0) return null;

  return (
    <div className="rounded-xl border border-[#DCE2EF] bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-[#DCE2EF] flex items-center gap-2">
        <BarChart2 size={14} className="text-[#344F9F]" />
        <span className="text-[13px] font-semibold text-[#1C1F3A]">Head-to-Head Results</span>
        <span className="text-[11px] text-[#A0A8C0] ml-1">— recent competitions</span>
      </div>
      <div className="overflow-x-auto px-5 py-4">
        <table className="w-full min-w-[500px]">
          <thead>
            <tr>
              <th className="text-left text-[10px] font-bold uppercase tracking-widest text-[#A0A8C0] pb-3 w-40">Competition</th>
              {athletes.map((a, i) => (
                <th key={a.id} className="text-left text-[11px] font-semibold pb-3 px-2" style={{ color: ATHLETE_COLORS[i] }}>
                  {a.name.split(" ")[0]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0F2F8]">
            {meets.map((meet) => (
              <tr key={meet} className="hover:bg-[#FAFBFD] transition-colors">
                <td className="py-2.5 pr-4">
                  <div className="text-[12px] font-medium text-[#1C1F3A] truncate max-w-[150px]">{meet}</div>
                  <div className="text-[10px] text-[#A0A8C0]">
                    {allComps.find((c) => c.meet === meet)?.date ?? ""}
                  </div>
                </td>
                {athletes.map((a, i) => {
                  const comp = allComps.find((c) => c.meet === meet && c.athleteId === a.id);
                  const result = comp?.result ?? "";
                  const isWin = /^(1st|gold|win)/i.test(result);
                  const isPodium = /^(2nd|silver|3rd|bronze)/i.test(result);
                  return (
                    <td key={a.id} className="py-2.5 px-2">
                      {comp ? (
                        <span
                          className="inline-flex items-center gap-1 text-[12px] font-semibold"
                          style={{ color: isWin ? "#F59E0B" : isPodium ? "#6B7280" : ATHLETE_COLORS[i] }}
                        >
                          {isWin && <Trophy size={10} style={{ color: "#F59E0B" }} />}
                          {result}
                        </span>
                      ) : (
                        <span className="text-[12px] text-[#D0D5E8]">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ComparePage() {
  const searchStr = useSearch();
  const searchParams = new URLSearchParams(searchStr);
  const initialIds = (searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n) && n > 0);

  const [selectedIds, setSelectedIds] = useState<number[]>(initialIds.slice(0, 4));
  const [showPicker, setShowPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [discovering, setDiscovering] = useState(false);
  const [discoverError, setDiscoverError] = useState("");

  const { data: athletesRaw } = useListAthletes();
  const allAthletes: any[] = (athletesRaw as any)?.athletes ?? (athletesRaw as any) ?? [];

  // Fetch competitions + intel for each selected athlete
  const a0Comps = useListAthleteCompetitions(selectedIds[0] ?? 0, { query: { enabled: !!selectedIds[0] } });
  const a1Comps = useListAthleteCompetitions(selectedIds[1] ?? 0, { query: { enabled: !!selectedIds[1] } });
  const a2Comps = useListAthleteCompetitions(selectedIds[2] ?? 0, { query: { enabled: !!selectedIds[2] } });
  const a3Comps = useListAthleteCompetitions(selectedIds[3] ?? 0, { query: { enabled: !!selectedIds[3] } });
  const compQueries = [a0Comps, a1Comps, a2Comps, a3Comps];

  const a0Intel = useListAthleteIntelligence(selectedIds[0] ?? 0, { query: { enabled: !!selectedIds[0] } });
  const a1Intel = useListAthleteIntelligence(selectedIds[1] ?? 0, { query: { enabled: !!selectedIds[1] } });
  const a2Intel = useListAthleteIntelligence(selectedIds[2] ?? 0, { query: { enabled: !!selectedIds[2] } });
  const a3Intel = useListAthleteIntelligence(selectedIds[3] ?? 0, { query: { enabled: !!selectedIds[3] } });
  const intelQueries = [a0Intel, a1Intel, a2Intel, a3Intel];

  // Enrich selected athletes with competitions + intel
  const selected = selectedIds.map((id, i) => {
    const base = allAthletes.find((a: any) => a.id === id) ?? { id, name: `Athlete ${id}` };
    const compsRaw = compQueries[i]?.data;
    const intelRaw = intelQueries[i]?.data;
    return {
      ...base,
      competitions: (compsRaw as any)?.competitions ?? (compsRaw as any) ?? [],
      intel: (intelRaw as any)?.items ?? (intelRaw as any) ?? [],
    };
  });

  const available = allAthletes.filter((a: any) => !selectedIds.includes(a.id));
  const filtered = pickerSearch
    ? available.filter((a: any) => a.name?.toLowerCase().includes(pickerSearch.toLowerCase()))
    : available;

  const addAthlete = (id: number) => {
    setSelectedIds((prev) => [...prev, id].slice(0, 4));
    setShowPicker(false);
    setPickerSearch("");
  };

  const authFetch = useAuthFetch();

  const discoverAthlete = async (name: string) => {
    setDiscovering(true);
    setDiscoverError("");
    try {
      const res = await authFetch("/api/athletes/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Discovery failed");
      const data = await res.json();
      addAthlete(data.athlete.id);
    } catch {
      setDiscoverError(`Couldn't find "${name}" — try adding them manually.`);
      setDiscovering(false);
    }
  };

  const removeAthlete = (id: number) => {
    setSelectedIds((prev) => prev.filter((x) => x !== id));
  };

  // ── stat helpers ─────────────────────────────────────────────────────────
  const maxRankInverse = Math.max(...selected.map((a) => (a.worldRank ? 1000 - a.worldRank : 0)), 1);
  const maxFollowers = Math.max(...selected.map((a) => (a.instagramFollowers ?? 0) + (a.twitterFollowers ?? 0) + (a.tiktokFollowers ?? 0)), 1);
  const maxEngagement = Math.max(...selected.map((a) => a.avgEngagement ?? 0), 1);
  const maxIntel = Math.max(...selected.map((a) => a.intel.length), 1);
  const maxComps = Math.max(...selected.map((a) => a.competitions.filter((c: any) => c.status === "completed").length), 1);

  const statRows = [
    {
      label: "World Rank",
      getValue: (a: any) => a.worldRank ? `#${a.worldRank}` : "—",
      getBar: (a: any) => a.worldRank ? 1000 - a.worldRank : 0,
      getMax: () => maxRankInverse,
      highlight: (vals: any[]) => {
        const ranks = vals.filter((v) => v != null);
        return ranks.length ? Math.min(...ranks) : null;
      },
    },
    {
      label: "Personal Best",
      getValue: (a: any) => a.personalBest ?? "—",
      getBar: null,
      getMax: () => 1,
    },
    {
      label: "Season Best",
      getValue: (a: any) => a.seasonBest ?? "—",
      getBar: null,
      getMax: () => 1,
    },
    {
      label: "National Rank",
      getValue: (a: any) => a.nationalRank ? `#${a.nationalRank}` : "—",
      getBar: null,
      getMax: () => 1,
    },
    {
      label: "Total Followers",
      getValue: (a: any) => {
        const t = (a.instagramFollowers ?? 0) + (a.twitterFollowers ?? 0) + (a.tiktokFollowers ?? 0);
        return t > 0 ? t.toLocaleString() : "—";
      },
      getBar: (a: any) => (a.instagramFollowers ?? 0) + (a.twitterFollowers ?? 0) + (a.tiktokFollowers ?? 0),
      getMax: () => maxFollowers,
    },
    {
      label: "Avg Engagement",
      getValue: (a: any) => a.avgEngagement ? `${a.avgEngagement.toFixed(1)}%` : "—",
      getBar: (a: any) => a.avgEngagement ?? 0,
      getMax: () => maxEngagement,
    },
    {
      label: "Intelligence Items",
      getValue: (a: any) => a.intel.length > 0 ? String(a.intel.length) : "—",
      getBar: (a: any) => a.intel.length,
      getMax: () => maxIntel,
    },
    {
      label: "Results on Record",
      getValue: (a: any) => {
        const n = a.competitions.filter((c: any) => c.status === "completed").length;
        return n > 0 ? String(n) : "—";
      },
      getBar: (a: any) => a.competitions.filter((c: any) => c.status === "completed").length,
      getMax: () => maxComps,
    },
  ];

  return (
    <AppLayout activePage="athletes">
      <div className="h-full flex flex-col bg-[#FCFAFA] overflow-hidden">

        {/* Top bar */}
        <div className="h-14 border-b border-[#DCE2EF] flex items-center px-6 shrink-0 bg-[#FCFAFA] justify-between">
          <div className="flex items-center gap-2 text-[13px] font-medium text-[#8A90A8]">
            <Link href="/dashboard">
              <span className="hover:text-[#3D426A] cursor-pointer transition-colors">Athletes</span>
            </Link>
            <ChevronRight size={14} className="text-[#C0C8DC]" />
            <span className="text-[#293055] font-semibold">Compare Athletes</span>
          </div>
          <div className="text-[11px] text-[#A0A8C0]">Select up to 4 athletes to compare side-by-side</div>
        </div>

        {/* Athlete selector bar */}
        <div className="px-6 py-3 border-b border-[#DCE2EF] bg-[#FCFAFA] shrink-0 flex items-center gap-2 flex-wrap">
          {selected.map((a, i) => (
            <div
              key={a.id}
              className="flex items-center gap-2 pl-2.5 pr-2 py-1.5 rounded-xl border text-[12px] font-semibold"
              style={{ background: ATHLETE_COLORS[i] + "14", borderColor: ATHLETE_COLORS[i] + "35", color: ATHLETE_COLORS[i] }}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                style={{ background: ATHLETE_COLORS[i] }}
              >
                {(a.name ?? "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <span>{a.name}</span>
              {a.event && <span className="opacity-60 font-normal">· {a.event}</span>}
              {selectedIds.length > 1 && (
                <button
                  onClick={() => removeAthlete(a.id)}
                  className="ml-0.5 opacity-40 hover:opacity-90 transition-opacity"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}

          {selected.length < 4 && (
            <div className="relative">
              <button
                onClick={() => setShowPicker(!showPicker)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-[#C8D0E4] text-[12px] text-[#8A90A8] hover:border-[#8A90A8] hover:text-[#293055] hover:bg-white transition-all"
              >
                <Plus size={12} />
                Add athlete to compare
              </button>
              {showPicker && (
                <div className="absolute top-full left-0 mt-1.5 bg-white rounded-xl border border-[#DCE2EF] shadow-2xl z-50 py-2 w-64">
                  <div className="px-3 pb-2">
                    <input
                      autoFocus
                      value={pickerSearch}
                      onChange={(e) => setPickerSearch(e.target.value)}
                      placeholder="Search athletes…"
                      className="w-full px-3 py-1.5 text-[12px] border border-[#DCE2EF] rounded-lg outline-none focus:border-[#344F9F] bg-[#FCFAFA]"
                    />
                  </div>
                  <div className="max-h-52 overflow-y-auto">
                    {filtered.map((a: any) => (
                      <button
                        key={a.id}
                        onClick={() => addAthlete(a.id)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#F5F7FC] transition-colors text-left"
                      >
                        <div className="w-7 h-7 rounded-full overflow-hidden bg-[rgba(41,48,85,0.10)] flex items-center justify-center text-[10px] font-bold text-[#293055] shrink-0">
                          {a.avatarUrl ? (
                            <img src={a.avatarUrl} alt={a.name} loading="lazy" className="w-full h-full object-cover object-top" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                          ) : (
                            (a.name ?? "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="text-[12px] font-semibold text-[#1C1F3A]">{a.name}</div>
                          <div className="text-[11px] text-[#8A90A8]">{a.sport} · {a.event}</div>
                        </div>
                        {a.worldRank && <span className="ml-auto text-[11px] text-[#8A90A8]">#{a.worldRank}</span>}
                      </button>
                    ))}

                    {/* Web discovery fallback */}
                    {pickerSearch.trim().length > 1 && (
                      <div className="border-t border-[#F0F2F8] mt-1 pt-1">
                        {discovering ? (
                          <div className="flex items-center gap-2 px-4 py-3 text-[12px] text-[#8A90A8]">
                            <div className="w-3.5 h-3.5 border-2 border-[#344F9F] border-t-transparent rounded-full animate-spin shrink-0" />
                            Searching for "{pickerSearch}"…
                          </div>
                        ) : (
                          <button
                            onClick={() => discoverAthlete(pickerSearch.trim())}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#F0F4FF] transition-colors text-left group"
                          >
                            <div className="w-7 h-7 rounded-full bg-[rgba(52,79,159,0.10)] flex items-center justify-center shrink-0">
                              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#344F9F" strokeWidth={2.2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
                              </svg>
                            </div>
                            <div>
                              <div className="text-[12px] font-semibold text-[#344F9F]">Search web for "{pickerSearch}"</div>
                              <div className="text-[10px] text-[#A0A8C0]">Pull from the internet and add to comparison</div>
                            </div>
                          </button>
                        )}
                        {discoverError && (
                          <div className="px-4 pb-2 text-[11px] text-[#E75D50]">{discoverError}</div>
                        )}
                      </div>
                    )}

                    {filtered.length === 0 && pickerSearch.trim().length <= 1 && (
                      <div className="px-4 py-3 text-[12px] text-[#A0A8C0]">Type a name to search…</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {selected.length === 0 && (
            <span className="text-[12px] text-[#A0A8C0]">No athletes selected — use the button above or open a dossier and click "Compare"</span>
          )}
        </div>

        {/* Main content */}
        {selected.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
            <div className="w-14 h-14 rounded-2xl bg-[rgba(52,79,159,0.07)] flex items-center justify-center">
              <BarChart2 size={22} className="text-[#344F9F]" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-[#1C1F3A] mb-1">Select athletes to compare</h3>
              <p className="text-[13px] text-[#8A90A8] max-w-xs">
                Add athletes using the button above, or open any athlete's dossier and click the <strong>Compare</strong> button.
              </p>
            </div>
            <Link href="/athletes/new">
              <span className="text-[13px] text-[#344F9F] hover:underline cursor-pointer">Add athletes first →</span>
            </Link>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto hide-scrollbar">
            <div className="max-w-6xl mx-auto px-6 py-6 space-y-5">

              {/* Athlete header cards */}
              <div
                className="grid gap-4"
                style={{ gridTemplateColumns: `repeat(${selected.length}, minmax(0, 1fr))` }}
              >
                {selected.map((a, i) => {
                  const completedCount = a.competitions.filter((c: any) => c.status === "completed").length;
                  const wins = a.competitions.filter((c: any) => c.status === "completed" && /^(1st|gold|win)/i.test(c.result ?? "")).length;
                  return (
                    <div key={a.id} className="rounded-xl border bg-white shadow-sm p-5 flex flex-col gap-3" style={{ borderColor: ATHLETE_COLORS[i] + "40" }}>
                      <div className="flex items-start gap-3">
                        <div
                          className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center text-white text-[15px] font-bold shrink-0"
                          style={{ background: `linear-gradient(135deg, ${ATHLETE_COLORS[i]}, ${ATHLETE_COLORS[i]}cc)` }}
                        >
                          {a.avatarUrl ? (
                            <img src={a.avatarUrl} alt={a.name} loading="lazy" className="w-full h-full object-cover object-top" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                          ) : (
                            (a.name ?? "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[14px] font-semibold text-[#1C1F3A] leading-tight truncate">{a.name}</div>
                          <div className="text-[11px] text-[#8A90A8] mt-0.5">{a.sport}</div>
                          <div className="text-[11px] text-[#8A90A8]">{a.event}</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[#F0F2F8]">
                        <div className="text-center">
                          <div className="text-[16px] font-bold text-[#1C1F3A]">{a.worldRank ? `#${a.worldRank}` : "—"}</div>
                          <div className="text-[9px] text-[#A0A8C0] uppercase tracking-wide font-semibold">World</div>
                        </div>
                        <div className="text-center">
                          <div className="text-[16px] font-bold" style={{ color: ATHLETE_COLORS[i] }}>{wins}</div>
                          <div className="text-[9px] text-[#A0A8C0] uppercase tracking-wide font-semibold">Wins</div>
                        </div>
                        <div className="text-center">
                          <div className="text-[16px] font-bold text-[#1C1F3A]">{completedCount}</div>
                          <div className="text-[9px] text-[#A0A8C0] uppercase tracking-wide font-semibold">Races</div>
                        </div>
                      </div>
                      <Link href={`/athletes/${a.id}`}>
                        <span className="text-[11px] font-medium text-[#344F9F] hover:underline cursor-pointer">View dossier →</span>
                      </Link>
                    </div>
                  );
                })}
              </div>

              {/* Head-to-head results chart */}
              {selected.length >= 2 && <H2HChart athletes={selected} />}

              {/* Stat comparison table */}
              <div className="rounded-xl border border-[#DCE2EF] bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-[#DCE2EF]">
                  <span className="text-[13px] font-semibold text-[#1C1F3A]">Side-by-Side Stats</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#DCE2EF] bg-[#FAFBFD]">
                        <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-[#A0A8C0] w-44">Metric</th>
                        {selected.map((a, i) => (
                          <th key={a.id} className="px-5 py-3 text-left">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: ATHLETE_COLORS[i] }} />
                              <span className="text-[12px] font-semibold text-[#1C1F3A]">{a.name.split(" ")[0]}</span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0F2F8]">
                      {statRows.map((row) => (
                        <tr key={row.label} className="hover:bg-[#FAFBFD] transition-colors">
                          <td className="px-5 py-3.5 text-[12px] font-medium text-[#6B7080]">{row.label}</td>
                          {selected.map((a, i) => {
                            const displayVal = row.getValue(a);
                            const barVal = row.getBar ? row.getBar(a) : null;
                            const barMax = row.getMax();
                            return (
                              <td key={a.id} className="px-5 py-3">
                                <div className="text-[13px] font-semibold text-[#1C1F3A]">{displayVal}</div>
                                {barVal !== null && barMax > 0 && (
                                  <StatBar value={barVal} max={barMax} color={ATHLETE_COLORS[i]} />
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent intelligence per athlete */}
              <div className="rounded-xl border border-[#DCE2EF] bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-[#DCE2EF] flex items-center gap-2">
                  <Sparkles size={14} className="text-[#E75D50]" />
                  <span className="text-[13px] font-semibold text-[#1C1F3A]">Recent Intelligence</span>
                </div>
                <div
                  className="grid divide-x divide-[#F0F2F8]"
                  style={{ gridTemplateColumns: `repeat(${selected.length}, minmax(0, 1fr))` }}
                >
                  {selected.map((a, i) => (
                    <div key={a.id} className="p-5 space-y-3">
                      <div className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: ATHLETE_COLORS[i] }}>
                        {a.name.split(" ")[0]}
                      </div>
                      {a.intel.slice(0, 3).map((item: any) => (
                        <div key={item.id} className="rounded-lg bg-[#F8F9FC] border border-[#ECEEF5] p-3">
                          <div className="text-[11px] font-semibold text-[#1C1F3A] leading-snug mb-0.5">{item.title}</div>
                          <div className="text-[10px] text-[#A0A8C0]">{item.sourceDomain} · {item.confidence}% confidence</div>
                        </div>
                      ))}
                      {a.intel.length === 0 && (
                        <div className="text-[12px] text-[#A0A8C0] py-4 text-center">No intelligence yet</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
