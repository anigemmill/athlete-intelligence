import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Link, useLocation } from "wouter";
import {
  ChevronRight,
  Search,
  User,
  ArrowRight,
  Target,
  X,
  CheckCircle2,
} from "lucide-react";
import { useListAthletes, useCreateAthlete } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

type Step = 1 | 2 | 3;

const SPORT_OPTIONS = ["Athletics", "Swimming", "Cycling", "Rowing", "Triathlon"];
const EVENT_OPTIONS: Record<string, string[]> = {
  Athletics: ["100m", "200m", "400m", "800m", "1500m", "5000m", "10000m", "Marathon", "High Jump", "Long Jump", "Triple Jump", "Pole Vault", "Shot Put", "Discus", "Javelin", "Hammer", "Heptathlon", "Decathlon"],
  Swimming: ["50m Freestyle", "100m Freestyle", "200m Freestyle", "100m Backstroke", "100m Breaststroke", "100m Butterfly", "200m IM"],
  Cycling: ["Road Race", "Time Trial", "Track Sprint", "Track Pursuit"],
  Rowing: ["Single Scull", "Double Scull", "Coxless Four", "Eight"],
  Triathlon: ["Olympic Distance", "Sprint Distance", "Ironman"],
};
const NATIONALITY_OPTIONS = ["NZL", "AUS", "GBR", "USA", "CAN", "IRL", "RSA", "KEN", "ETH", "JAM"];

export default function NewAgentPage() {
  const [step, setStep] = useState<Step>(1);
  const [query, setQuery] = useState("");
  const [selectedExisting, setSelectedExisting] = useState<any>(null);
  const [newName, setNewName] = useState("");
  const [newSport, setNewSport] = useState("Athletics");
  const [newEvent, setNewEvent] = useState("100m");
  const [newNationality, setNewNationality] = useState("NZL");
  const [newAge, setNewAge] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: athletesData } = useListAthletes();
  const createAthlete = useCreateAthlete();

  const allAthletes: any[] = (athletesData as any)?.athletes ?? (athletesData as any) ?? [];

  // Filter existing athletes by query
  const filtered = query.trim().length > 0
    ? allAthletes.filter((a: any) =>
        a.name?.toLowerCase().includes(query.toLowerCase()) ||
        a.event?.toLowerCase().includes(query.toLowerCase()) ||
        a.nationality?.toLowerCase().includes(query.toLowerCase())
      )
    : allAthletes;

  const handleSelectExisting = (athlete: any) => {
    setSelectedExisting(athlete);
    setNewName("");
    setStep(2);
  };

  const handleCreateNew = () => {
    if (!newName.trim()) return;
    setSelectedExisting(null);
    setStep(2);
  };

  const handleConfirm = () => {
    const payload = selectedExisting
      ? {
          name: selectedExisting.name,
          sport: selectedExisting.sport,
          event: selectedExisting.event,
          nationality: selectedExisting.nationality,
        }
      : {
          name: newName.trim(),
          sport: newSport,
          event: newEvent,
          nationality: newNationality,
          age: newAge ? parseInt(newAge) : undefined,
        };

    createAthlete.mutate(
      { data: payload as any },
      {
        onSuccess: (data: any) => {
          const id = data?.athlete?.id ?? data?.id;
          toast({ title: "Agent created", description: `Now monitoring ${payload.name}.` });
          setLocation(id ? `/athletes/${id}` : "/athletes");
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to create agent. Please try again.", variant: "destructive" });
        },
      }
    );
  };

  const displayAthlete = selectedExisting ?? (newName ? { name: newName, sport: newSport, event: newEvent, nationality: newNationality } : null);

  return (
    <AppLayout activePage="athletes">
      <div className="w-full h-full flex flex-col bg-[#FCFAFA] text-[#293055]">
        {/* Header / Stepper */}
        <header className="flex-shrink-0 border-b border-[#DCE2EF] flex items-center justify-between px-8 h-16 bg-[#FCFAFA]">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/athletes">
              <span className="text-[#6B7080] hover:text-[#1C1F3A] cursor-pointer transition-colors">Athletes</span>
            </Link>
            <ChevronRight className="w-4 h-4 text-[#A0A8C0]" />
            <span className="text-[#1C1F3A] font-medium">Add Athlete</span>
          </div>

          {/* Steps */}
          <div className="flex items-center gap-1 text-[12px]">
            {([1, 2, 3] as Step[]).map((s, i, arr) => (
              <React.Fragment key={s}>
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-medium ${step === s ? "bg-[rgba(231,93,80,0.10)] text-[#E75D50]" : step > s ? "text-[#059669]" : "text-[#A0A8C0]"}`}>
                  {step > s ? <CheckCircle2 size={12} /> : <span>{s}</span>}
                  {s === 1 ? "Find Athlete" : s === 2 ? "Confirm Profile" : "Configure Alerts"}
                </div>
                {i < arr.length - 1 && <ChevronRight size={12} className="text-[#C0C8DC]" />}
              </React.Fragment>
            ))}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto py-8 px-8">
          {/* Step 1: Find athlete */}
          {step === 1 && (
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <h2 className="text-[20px] font-semibold text-[#1C1F3A] mb-1">Find an athlete to monitor</h2>
                <p className="text-[13px] text-[#6B7080]">Search your existing roster or add a new athlete by name.</p>
              </div>

              <div className="grid grid-cols-12 gap-6">
                {/* Left: search + results */}
                <div className="col-span-5 flex flex-col gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A8C0]" />
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search by name, event, nationality..."
                      className="w-full pl-9 pr-4 py-2.5 border border-[#DCE2EF] rounded-xl text-[13px] text-[#1C1F3A] bg-white focus:outline-none focus:ring-2 focus:ring-[#E75D50]/30 focus:border-[#E75D50] transition-all"
                    />
                    {query && (
                      <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A0A8C0] hover:text-[#6B7080]">
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  <div className="text-[11px] font-semibold text-[#8A90A8] uppercase tracking-wider">
                    {query ? `${filtered.length} result${filtered.length !== 1 ? "s" : ""}` : `All athletes (${allAthletes.length})`}
                  </div>

                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {filtered.map((athlete: any) => (
                      <button
                        key={athlete.id}
                        onClick={() => handleSelectExisting(athlete)}
                        className={`text-left w-full p-3.5 rounded-xl border transition-all duration-150 flex items-center gap-3 ${
                          selectedExisting?.id === athlete.id
                            ? "bg-[rgba(231,93,80,0.06)] border-[rgba(231,93,80,0.40)]"
                            : "bg-white border-[#DCE2EF] hover:border-[#B0B8D0] hover:bg-[#FCFAFA]"
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#E75D50] to-[#C84840] flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                          {athlete.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-medium text-[#1C1F3A] truncate">{athlete.name}</div>
                          <div className="text-[11px] text-[#8A90A8]">{athlete.event} · {athlete.nationality}</div>
                        </div>
                        {selectedExisting?.id === athlete.id && <div className="w-2 h-2 rounded-full bg-[#E75D50] shrink-0" />}
                      </button>
                    ))}

                    {filtered.length === 0 && (
                      <div className="text-center py-6 text-[12px] text-[#8A90A8]">No athletes match your search.</div>
                    )}
                  </div>
                </div>

                {/* Right: add new athlete form */}
                <div className="col-span-7">
                  <div className="rounded-xl border border-[#DCE2EF] bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-6 h-6 rounded-md bg-[rgba(52,79,159,0.10)] flex items-center justify-center">
                        <User size={12} className="text-[#344F9F]" />
                      </div>
                      <h3 className="text-[13px] font-semibold text-[#1C1F3A]">Add a new athlete</h3>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-[11px] font-semibold text-[#6B7080] uppercase tracking-wider block mb-1">Full Name *</label>
                        <input
                          type="text"
                          value={newName}
                          onChange={(e) => { setNewName(e.target.value); setSelectedExisting(null); }}
                          placeholder="e.g. Emma Gould"
                          className="w-full px-3 py-2 border border-[#DCE2EF] rounded-lg text-[13px] text-[#1C1F3A] bg-[#FCFAFA] focus:outline-none focus:ring-2 focus:ring-[#E75D50]/30 focus:border-[#E75D50] transition-all"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold text-[#6B7080] uppercase tracking-wider block mb-1">Sport</label>
                          <select
                            value={newSport}
                            onChange={(e) => { setNewSport(e.target.value); setNewEvent(EVENT_OPTIONS[e.target.value]?.[0] ?? ""); }}
                            className="w-full px-3 py-2 border border-[#DCE2EF] rounded-lg text-[13px] text-[#1C1F3A] bg-[#FCFAFA] focus:outline-none focus:ring-2 focus:ring-[#E75D50]/30 focus:border-[#E75D50] transition-all"
                          >
                            {SPORT_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-[#6B7080] uppercase tracking-wider block mb-1">Event</label>
                          <select
                            value={newEvent}
                            onChange={(e) => setNewEvent(e.target.value)}
                            className="w-full px-3 py-2 border border-[#DCE2EF] rounded-lg text-[13px] text-[#1C1F3A] bg-[#FCFAFA] focus:outline-none focus:ring-2 focus:ring-[#E75D50]/30 focus:border-[#E75D50] transition-all"
                          >
                            {(EVENT_OPTIONS[newSport] ?? []).map((e) => <option key={e}>{e}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold text-[#6B7080] uppercase tracking-wider block mb-1">Nationality</label>
                          <select
                            value={newNationality}
                            onChange={(e) => setNewNationality(e.target.value)}
                            className="w-full px-3 py-2 border border-[#DCE2EF] rounded-lg text-[13px] text-[#1C1F3A] bg-[#FCFAFA] focus:outline-none focus:ring-2 focus:ring-[#E75D50]/30 focus:border-[#E75D50] transition-all"
                          >
                            {NATIONALITY_OPTIONS.map((n) => <option key={n}>{n}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-[#6B7080] uppercase tracking-wider block mb-1">Age (optional)</label>
                          <input
                            type="number"
                            value={newAge}
                            onChange={(e) => setNewAge(e.target.value)}
                            placeholder="e.g. 24"
                            min={14}
                            max={60}
                            className="w-full px-3 py-2 border border-[#DCE2EF] rounded-lg text-[13px] text-[#1C1F3A] bg-[#FCFAFA] focus:outline-none focus:ring-2 focus:ring-[#E75D50]/30 focus:border-[#E75D50] transition-all"
                          />
                        </div>
                      </div>

                      <button
                        onClick={handleCreateNew}
                        disabled={!newName.trim()}
                        className={`w-full py-2.5 rounded-lg flex items-center justify-center gap-2 text-[13px] font-medium transition-all mt-2 ${
                          newName.trim()
                            ? "bg-[#293055] hover:bg-[#1e2440] text-white"
                            : "bg-[#DCE2EF] text-[#A0A8C0] cursor-not-allowed"
                        }`}
                      >
                        Continue with new athlete
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Confirm */}
          {step === 2 && displayAthlete && (
            <div className="max-w-2xl mx-auto">
              <div className="mb-6">
                <h2 className="text-[20px] font-semibold text-[#1C1F3A] mb-1">Confirm athlete profile</h2>
                <p className="text-[13px] text-[#6B7080]">Review the details before starting the intelligence agent.</p>
              </div>

              <div className="rounded-xl border border-[#DCE2EF] bg-white shadow-sm overflow-hidden mb-5">
                <div className="p-6 border-b border-[#DCE2EF] bg-gradient-to-b from-[#FAF8F8] to-white flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#E75D50] to-[#C84840] flex items-center justify-center text-white text-lg font-bold">
                    {displayAthlete.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="text-[20px] font-semibold text-[#1C1F3A] mb-0.5">{displayAthlete.name}</h3>
                    <div className="text-[13px] text-[#6B7080]">{displayAthlete.event} · {displayAthlete.nationality}</div>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[rgba(16,185,129,0.10)] flex items-center justify-center shrink-0">
                      <Target size={14} className="text-[#059669]" />
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold text-[#1C1F3A]">Intelligence coverage ready</div>
                      <div className="text-[12px] text-[#6B7080]">
                        Agent will monitor news, social media, results, and commercial activity continuously.
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    {[
                      { label: "Results & Rankings", desc: "Race results, world rankings updates" },
                      { label: "Media & Interviews", desc: "Press coverage, social media mentions" },
                      { label: "Sponsorships", desc: "Brand deals, commercial partnerships" },
                      { label: "Career Changes", desc: "Coach changes, team moves, retirement" },
                    ].map((cat) => (
                      <div key={cat.label} className="flex items-start gap-2 p-3 rounded-lg bg-[#FCFAFA] border border-[#DCE2EF]">
                        <CheckCircle2 size={14} className="text-[#059669] mt-0.5 shrink-0" />
                        <div>
                          <div className="text-[12px] font-semibold text-[#1C1F3A]">{cat.label}</div>
                          <div className="text-[11px] text-[#8A90A8]">{cat.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 rounded-xl border border-[#DCE2EF] text-[13px] font-medium text-[#6B7080] hover:bg-[#FCFAFA] transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 py-2.5 rounded-xl bg-[#E75D50] hover:bg-[#D04840] text-white text-[13px] font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  Confirm and configure alerts
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Configure & launch */}
          {step === 3 && displayAthlete && (
            <div className="max-w-2xl mx-auto">
              <div className="mb-6">
                <h2 className="text-[20px] font-semibold text-[#1C1F3A] mb-1">Configure alert preferences</h2>
                <p className="text-[13px] text-[#6B7080]">Choose which intelligence categories to monitor and how often to be notified.</p>
              </div>

              <div className="rounded-xl border border-[#DCE2EF] bg-white shadow-sm p-6 mb-5 space-y-4">
                {[
                  { label: "Results & Rankings", key: "results" },
                  { label: "Media & Interviews", key: "media" },
                  { label: "Sponsorships", key: "sponsorships" },
                  { label: "Career Changes", key: "career" },
                ].map((cat) => (
                  <div key={cat.key} className="flex items-center justify-between py-3 border-b border-[#DCE2EF] last:border-0">
                    <div>
                      <div className="text-[13px] font-medium text-[#1C1F3A]">{cat.label}</div>
                      <div className="text-[11px] text-[#8A90A8]">Enabled by default</div>
                    </div>
                    <select className="px-3 py-1.5 border border-[#DCE2EF] rounded-lg text-[12px] text-[#293055] bg-[#FCFAFA] focus:outline-none focus:ring-2 focus:ring-[#E75D50]/30">
                      <option value="immediate">Immediate</option>
                      <option value="daily">Daily digest</option>
                      <option value="weekly">Weekly summary</option>
                    </select>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2.5 rounded-xl border border-[#DCE2EF] text-[13px] font-medium text-[#6B7080] hover:bg-[#FCFAFA] transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={createAthlete.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-[#E75D50] hover:bg-[#D04840] text-white text-[13px] font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {createAthlete.isPending ? "Creating agent..." : "Launch intelligence agent"}
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
