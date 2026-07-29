import React, { useState, useRef, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Link, useLocation } from "wouter";
import { useAuthFetch } from "@/lib/useAuthFetch";
import {
  ChevronRight,
  Search,
  User,
  ArrowRight,
  Target,
  X,
  CheckCircle2,
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  Users,
} from "lucide-react";
import * as XLSX from "xlsx";
import { useListAthletes, useCreateAthlete } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";


type Step = 1 | 2 | 3;
type Mode = "single" | "import";

// ── Sport / Event catalogue ───────────────────────────────────────────────────

const SPORT_OPTIONS = [
  "Athletics (Track & Field)","Baseball","Basketball","Beach Volleyball","Biathlon",
  "Bobsled / Skeleton","Bowling","Boxing","Canoe / Kayak","Climbing","Cricket",
  "Cross Country","Curling","Cycling","Diving","Equestrian","Fencing","Field Hockey",
  "Football (American)","Football (Canadian)","Golf","Gymnastics (Artistic)",
  "Gymnastics (Rhythmic)","Gymnastics (Trampoline)","Handball","Ice Hockey","Judo",
  "Lacrosse","Luge","Marathon / Road Running","Modern Pentathlon","Racquetball",
  "Rifle / Shooting","Rowing","Rugby","Sailing","Shooting (Para)","Skateboarding",
  "Skiing (Alpine)","Skiing (Cross Country)","Skiing (Freestyle)",
  "Skiing (Nordic Combined)","Skiing (Ski Jump)","Soccer","Softball","Speed Skating",
  "Squash","Surfing","Swimming","Swimming & Diving","Table Tennis","Taekwondo",
  "Tennis","Triathlon","Volleyball","Water Polo","Weightlifting","Wrestling","Other",
];

const EVENT_OPTIONS: Record<string, string[]> = {
  "Athletics (Track & Field)": [
    "60m","100m","200m","400m","800m","1500m","Mile","3000m","3000m Steeplechase",
    "5000m","10000m","Half Marathon","Marathon","60m Hurdles","100m Hurdles",
    "110m Hurdles","400m Hurdles","4×100m Relay","4×400m Relay","4×800m Relay",
    "4×1500m Relay","High Jump","Pole Vault","Long Jump","Triple Jump","Shot Put",
    "Discus","Javelin","Hammer","Weight Throw","Decathlon","Heptathlon","Pentathlon",
    "Race Walk 10km","Race Walk 20km",
  ],
  Baseball: ["Starting Pitcher","Relief Pitcher","Closer","Catcher","First Base","Second Base","Third Base","Shortstop","Left Field","Center Field","Right Field","Designated Hitter","Utility"],
  Basketball: ["Point Guard","Shooting Guard","Small Forward","Power Forward","Center"],
  "Beach Volleyball": ["Beach Volleyball"],
  Biathlon: ["Sprint","Individual","Pursuit","Mass Start","Relay"],
  "Bobsled / Skeleton": ["2-Man Bobsled","4-Man Bobsled","Women's Bobsled","Skeleton"],
  Bowling: ["Singles","Doubles","Team"],
  Boxing: ["Light Flyweight (46-49kg)","Flyweight (49-52kg)","Featherweight (54-57kg)","Lightweight (57-63.5kg)","Welterweight (63.5-71kg)","Middleweight (71-80kg)","Light Heavyweight (80-90kg)","Heavyweight (90-92kg)","Super Heavyweight (+92kg)"],
  "Canoe / Kayak": ["K-1 200m","K-1 500m","K-1 1000m","K-2 500m","K-2 1000m","K-4 500m","C-1 200m","C-1 1000m","C-2 1000m","Canoe Slalom K-1","Canoe Slalom C-1","Canoe Slalom C-2"],
  Climbing: ["Lead","Boulder","Speed","Combined"],
  Cricket: ["Opening Batter","Middle-Order Batter","Lower-Order Batter","Wicket-Keeper","Fast Bowler","Medium Bowler","Spin Bowler","All-Rounder"],
  "Cross Country": ["5km","6km","8km","10km","12km"],
  Curling: ["Skip","Vice-Skip","Second","Lead"],
  Cycling: ["Road Race","Time Trial","Criterium","Track Sprint","Track Keirin","Track Omnium","Track Pursuit","Track Madison","Mountain Bike XCO","Mountain Bike Downhill","BMX Racing","BMX Freestyle","Cyclocross","Gravel"],
  Diving: ["1m Springboard","3m Springboard","10m Platform","3m Synchronized","10m Synchronized"],
  Equestrian: ["Dressage","Show Jumping","Eventing","Hunt Seat Equitation","Western Horsemanship","Reining"],
  Fencing: ["Foil","Épée","Sabre"],
  "Field Hockey": ["Goalkeeper","Defender","Midfielder","Forward"],
  "Football (American)": ["Quarterback","Running Back","Fullback","Wide Receiver","Tight End","Offensive Line","Defensive End","Defensive Tackle","Linebacker","Cornerback","Safety","Kicker","Punter","Long Snapper"],
  "Football (Canadian)": ["Quarterback","Running Back","Receiver","Offensive Line","Defensive Line","Linebacker","Defensive Back","Kicker","Punter"],
  Golf: ["Individual Stroke Play","Individual Match Play","Team"],
  "Gymnastics (Artistic)": ["Vault","Uneven Bars","Balance Beam","Floor Exercise","Pommel Horse","Still Rings","Parallel Bars","Horizontal Bar","All-Around"],
  "Gymnastics (Rhythmic)": ["Rope","Hoop","Ball","Clubs","Ribbon","All-Around"],
  "Gymnastics (Trampoline)": ["Individual","Synchronized","Tumbling","Double Mini-Trampoline"],
  Handball: ["Goalkeeper","Left Back","Centre Back","Right Back","Left Wing","Right Wing","Pivot"],
  "Ice Hockey": ["Goalie","Defenseman","Centre","Left Wing","Right Wing"],
  Judo: ["-48kg","-52kg","-57kg","-63kg","-70kg","-78kg","+78kg","-60kg","-66kg","-73kg","-81kg","-90kg","-100kg","+100kg"],
  Lacrosse: ["Goalie","Defender","Midfielder","Attacker"],
  Luge: ["Singles Men","Singles Women","Doubles","Team Relay"],
  "Marathon / Road Running": ["5km","10km","Half Marathon","Marathon","Ultra"],
  "Modern Pentathlon": ["Combined","Laser Run","Riding","Fencing","Swimming"],
  Racquetball: ["Singles","Doubles","Mixed Doubles"],
  "Rifle / Shooting": ["10m Air Rifle","50m Rifle 3 Positions","25m Pistol","10m Air Pistol","Trap","Skeet","10m Running Target"],
  Rowing: ["Single Scull","Pair","Double Scull","Coxless Four","Coxed Four","Quadruple Scull","Eight","Lightweight Single","Lightweight Pair","Lightweight Double","Lightweight Coxless Four"],
  Rugby: ["Prop","Hooker","Lock","Flanker","Number 8","Scrum-half","Fly-half","Inside Centre","Outside Centre","Wing","Fullback","Rugby Sevens"],
  Sailing: ["Laser / ILCA 6","ILCA 7","470","49er","49erFX","Nacra 17","RS:X Windsurfer","Formula Kite","Singlehanded","Doublehanded"],
  Skateboarding: ["Street","Park"],
  "Skiing (Alpine)": ["Downhill","Super-G","Giant Slalom","Slalom","Alpine Combined","Parallel Giant Slalom"],
  "Skiing (Cross Country)": ["Sprint Classic","Sprint Freestyle","10km","15km","30km","50km","Skiathlon","Relay"],
  "Skiing (Freestyle)": ["Moguls","Dual Moguls","Aerials","Ski Cross","Halfpipe","Slopestyle","Big Air"],
  "Skiing (Nordic Combined)": ["Individual Normal Hill","Individual Large Hill","Team"],
  "Skiing (Ski Jump)": ["Normal Hill Individual","Large Hill Individual","Team"],
  Soccer: ["Goalkeeper","Right Back","Left Back","Centre Back","Defensive Midfielder","Central Midfielder","Attacking Midfielder","Right Winger","Left Winger","Striker"],
  Softball: ["Pitcher","Catcher","First Base","Second Base","Third Base","Shortstop","Left Field","Center Field","Right Field","Designated Player","Utility"],
  "Speed Skating": ["500m","1000m","1500m","3000m","5000m","10000m","Mass Start","Team Pursuit","Short Track 500m","Short Track 1000m","Short Track 1500m","Short Track Relay"],
  Squash: ["Singles","Doubles"],
  Surfing: ["Shortboard","Longboard","Big Wave"],
  Swimming: ["50m Freestyle","100m Freestyle","200m Freestyle","400m Freestyle","800m Freestyle","1500m Freestyle","100m Backstroke","200m Backstroke","100m Breaststroke","200m Breaststroke","100m Butterfly","200m Butterfly","200m Individual Medley","400m Individual Medley","4×100m Freestyle Relay","4×200m Freestyle Relay","4×100m Medley Relay","10km Open Water"],
  "Swimming & Diving": ["50m Freestyle","100m Freestyle","200m Freestyle","500m Freestyle","1000m Freestyle","1650m Freestyle","100m Backstroke","200m Backstroke","100m Breaststroke","200m Breaststroke","100m Butterfly","200m Butterfly","200m IM","400m IM","1m Springboard","3m Springboard","Platform"],
  "Table Tennis": ["Singles","Doubles","Mixed Doubles","Team"],
  Taekwondo: ["-49kg","-53kg","-57kg","-62kg","-67kg","-73kg","-80kg","+80kg","-54kg","-58kg","-63kg","-68kg","-74kg","+74kg"],
  Tennis: ["Singles","Doubles","Mixed Doubles"],
  Triathlon: ["Olympic Distance","Sprint Distance","Super Sprint","Duathlon","Aquathlon","70.3 (Half)","Ironman (Full)","XTERRA"],
  Volleyball: ["Setter","Outside Hitter","Opposite Hitter","Middle Blocker","Libero","Defensive Specialist"],
  "Water Polo": ["Goalkeeper","Field Player — Center","Field Player — Wing","Field Player — Point","Field Player — Driver"],
  Weightlifting: ["49kg","55kg","59kg","64kg","71kg","76kg","81kg","87kg","+87kg","61kg","67kg","73kg","81kg","89kg","96kg","102kg","109kg","+109kg"],
  Wrestling: ["57kg Freestyle","65kg Freestyle","74kg Freestyle","86kg Freestyle","97kg Freestyle","125kg Freestyle","50kg Women's","53kg Women's","57kg Women's","62kg Women's","68kg Women's","76kg Women's","NCAA 125 lbs","NCAA 133 lbs","NCAA 141 lbs","NCAA 149 lbs","NCAA 157 lbs","NCAA 165 lbs","NCAA 174 lbs","NCAA 184 lbs","NCAA 197 lbs","NCAA Heavyweight"],
  Other: ["General"],
};

const NATIONALITY_OPTIONS = [
  "AFG","ALB","ALG","AND","ANG","ANT","ARG","ARM","ARU","ASA","AUS","AUT","AZE",
  "BAH","BAN","BAR","BDI","BEL","BEN","BER","BHU","BIH","BIZ","BLR","BOL","BOT",
  "BRA","BRN","BRU","BUL","BUR","CAF","CAM","CAN","CAY","CGO","CHA","CHI","CHN",
  "CIV","CMR","COD","COK","COL","COM","CPV","CRC","CRO","CUB","CYP","CZE","DEN",
  "DJI","DMA","DOM","ECU","EGY","ERI","ESA","ESP","EST","ETH","FIJ","FIN","FRA",
  "FSM","GAB","GAM","GBR","GBS","GEO","GEQ","GER","GHA","GRE","GRN","GUA","GUI",
  "GUM","GUY","HAI","HKG","HON","HUN","INA","IND","IRI","IRL","IRQ","ISL","ISR",
  "ISV","ITA","IVB","JAM","JOR","JPN","KAZ","KEN","KGZ","KIR","KOR","KOS","KSA",
  "KUW","LAO","LAT","LBA","LBR","LCA","LES","LIB","LIE","LTU","LUX","MAD","MAR",
  "MAS","MAW","MDA","MDV","MEX","MGL","MHL","MKD","MLI","MLT","MNE","MON","MOZ",
  "MRI","MTN","MYA","NAM","NCA","NED","NEP","NGR","NIG","NOR","NRU","NZL","OMA",
  "PAK","PAN","PAR","PER","PHI","PLE","PLW","PNG","POL","POR","PRK","PUR","QAT",
  "ROC","ROU","RSA","RUS","RWA","SAM","SEN","SEY","SGP","SKN","SLE","SLO","SMR",
  "SOL","SOM","SRB","SRI","SSD","STP","SUD","SUI","SUR","SVK","SWE","SWZ","SYR",
  "TAN","TGA","THA","TJK","TKM","TLS","TOG","TPE","TTO","TUN","TUR","TUV","UAE",
  "UGA","UKR","URU","USA","UZB","VAN","VEN","VIE","VIN","YEM","ZAM","ZIM",
];

type ColumnMap = { name: number; sport: number; event: number; nationality: number; age: number };

function detectColumns(headers: string[]): ColumnMap {
  const find = (patterns: RegExp) => headers.findIndex((h) => patterns.test(h.toLowerCase().trim()));
  return {
    name: find(/name|athlete|player|full.?name/),
    sport: find(/sport/),
    event: find(/event|discipline|specialty|position|role/),
    nationality: find(/national|country|nat(?:$|\s)|flag|code|country.?code|noc/),
    age: find(/^age$|birth|dob|born/),
  };
}

function parseSheetRows(file: File): Promise<{ headers: string[]; rows: string[][] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const all: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as string[][];
        if (all.length < 2) { resolve({ headers: [], rows: [] }); return; }
        resolve({ headers: all[0].map(String), rows: all.slice(1).filter((r) => r.some((c) => String(c).trim())).map((r) => r.map(String)) });
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ["name","sport","event","nationality","age"],
    ["Emma Gould","Swimming","200m Freestyle","NZL","22"],
    ["James Osei","Athletics (Track & Field)","400m","GHA","26"],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Athletes");
  XLSX.writeFile(wb, "athlete-import-template.xlsx");
}

// Shared input style
const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "rgba(255,255,255,0.85)",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 13,
  width: "100%",
  outline: "none",
};

export default function NewAgentPage() {
  const [step, setStep] = useState<Step>(1);
  const [mode, setMode] = useState<Mode>("single");

  const [query, setQuery] = useState("");
  const [selectedExisting, setSelectedExisting] = useState<any>(null);
  const [newName, setNewName] = useState("");
  const [newSport, setNewSport] = useState("Athletics (Track & Field)");
  const [newEvent, setNewEvent] = useState("100m");
  const [newNationality, setNewNationality] = useState("NZL");
  const [newAge, setNewAge] = useState("");

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importRows, setImportRows] = useState<string[][]>([]);
  const [colMap, setColMap] = useState<ColumnMap>({ name: -1, sport: -1, event: -1, nationality: -1, age: -1 });
  const [isDragging, setIsDragging] = useState(false);
  const [importStatus, setImportStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [importResult, setImportResult] = useState<{ imported: number; total: number } | null>(null);
  const [importError, setImportError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: athletesData } = useListAthletes();
  const createAthlete = useCreateAthlete();
  const allAthletes: any[] = (athletesData as any)?.athletes ?? (athletesData as any) ?? [];

  const filtered = query.trim().length > 0
    ? allAthletes.filter((a: any) =>
        a.name?.toLowerCase().includes(query.toLowerCase()) ||
        a.event?.toLowerCase().includes(query.toLowerCase()) ||
        a.sport?.toLowerCase().includes(query.toLowerCase()) ||
        a.nationality?.toLowerCase().includes(query.toLowerCase())
      )
    : allAthletes;

  const handleFile = useCallback(async (file: File) => {
    if (!file) return;
    setImportFile(file);
    setImportStatus("idle");
    setImportError("");
    try {
      const { headers, rows } = await parseSheetRows(file);
      setImportHeaders(headers);
      setImportRows(rows);
      setColMap(detectColumns(headers));
    } catch {
      setImportError("Could not parse this file. Please use a .csv or .xlsx file.");
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const authFetch = useAuthFetch();

  const handleBulkImport = async () => {
    setImportStatus("loading");
    const athletes = importRows.map((row) => ({
      name: colMap.name >= 0 ? row[colMap.name]?.trim() : "",
      sport: colMap.sport >= 0 ? row[colMap.sport]?.trim() : "Other",
      event: colMap.event >= 0 ? row[colMap.event]?.trim() : "General",
      nationality: colMap.nationality >= 0 ? row[colMap.nationality]?.trim() : "",
      age: colMap.age >= 0 ? (parseInt(row[colMap.age]) || undefined) : undefined,
    })).filter((a) => a.name);
    try {
      const resp = await authFetch("/api/athletes/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athletes }),
      });
      if (!resp.ok) throw new Error(await resp.text());
      const data = await resp.json();
      setImportResult({ imported: data.imported, total: data.total });
      setImportStatus("success");
    } catch (err: any) {
      setImportError(err?.message ?? "Import failed. Please try again.");
      setImportStatus("error");
    }
  };

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
      ? { name: selectedExisting.name, sport: selectedExisting.sport, event: selectedExisting.event, nationality: selectedExisting.nationality }
      : { name: newName.trim(), sport: newSport, event: newEvent, nationality: newNationality, age: newAge ? parseInt(newAge) : undefined };
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
  const validRows = importRows.filter((r) => colMap.name >= 0 && r[colMap.name]?.trim());

  const card: React.CSSProperties = { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 12 };

  return (
    <AppLayout activePage="athletes">
      <div className="w-full h-full flex flex-col" style={{ background: "#0D1C0B", color: "rgba(255,255,255,0.85)" }}>
        {/* Header / Stepper */}
        <header className="flex-shrink-0 flex items-center justify-between px-8 h-16" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "#0D1C0B" }}>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/athletes">
              <span className="cursor-pointer transition-colors" style={{ color: "rgba(255,255,255,0.40)" }}>Athletes</span>
            </Link>
            <ChevronRight className="w-4 h-4" style={{ color: "rgba(255,255,255,0.20)" }} />
            <span className="font-medium text-white">Add Athlete</span>
          </div>

          {mode === "single" && (
            <div className="flex items-center gap-1 text-[12px]">
              {([1, 2, 3] as Step[]).map((s, i, arr) => (
                <React.Fragment key={s}>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full font-medium" style={
                    step === s ? { background: "rgba(185,255,74,0.10)", color: "#B9FF4A" }
                    : step > s ? { color: "#4ade80" }
                    : { color: "rgba(255,255,255,0.28)" }
                  }>
                    {step > s ? <CheckCircle2 size={12} /> : <span>{s}</span>}
                    {s === 1 ? "Find Athlete" : s === 2 ? "Confirm Profile" : "Configure Alerts"}
                  </div>
                  {i < arr.length - 1 && <ChevronRight size={12} style={{ color: "rgba(255,255,255,0.20)" }} />}
                </React.Fragment>
              ))}
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto py-8 px-8">

          {/* ── Step 1 ── */}
          {step === 1 && (
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <h2 className="text-[20px] font-semibold text-white mb-1">Add athletes to monitor</h2>
                <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.45)" }}>Search your roster, add an athlete manually, or import a spreadsheet of athletes at once.</p>
              </div>

              {/* Mode tabs */}
              <div className="flex items-center gap-1 mb-6 rounded-lg p-1 w-fit" style={{ background: "rgba(255,255,255,0.06)" }}>
                {[
                  { id: "single" as Mode, label: "Single Athlete", icon: null },
                  { id: "import" as Mode, label: "Import Spreadsheet", icon: <FileSpreadsheet size={13} /> },
                ].map((m) => (
                  <button key={m.id} onClick={() => setMode(m.id)}
                    className="px-4 py-1.5 rounded-md text-[13px] font-medium transition-all flex items-center gap-1.5"
                    style={mode === m.id ? { background: "rgba(255,255,255,0.10)", color: "white" } : { color: "rgba(255,255,255,0.45)" }}
                  >
                    {m.icon}{m.label}
                  </button>
                ))}
              </div>

              {/* ── Single athlete mode ── */}
              {mode === "single" && (
                <div className="grid grid-cols-12 gap-6">
                  {/* Left: search */}
                  <div className="col-span-5 flex flex-col gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(255,255,255,0.30)" }} />
                      <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search by name, sport, event..."
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl text-[13px] focus:outline-none transition-all"
                        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.85)" }}
                      />
                      {query && (
                        <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.30)" }}>
                          <X size={13} />
                        </button>
                      )}
                    </div>

                    <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.30)" }}>
                      {query ? `${filtered.length} result${filtered.length !== 1 ? "s" : ""}` : `All athletes (${allAthletes.length})`}
                    </div>

                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1 hide-scrollbar">
                      {filtered.map((athlete: any) => (
                        <button key={athlete.id} onClick={() => handleSelectExisting(athlete)}
                          className="text-left w-full p-3.5 rounded-xl transition-all duration-150 flex items-center gap-3"
                          style={selectedExisting?.id === athlete.id
                            ? { background: "rgba(185,255,74,0.08)", border: "1px solid rgba(185,255,74,0.30)" }
                            : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }
                          }
                        >
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0" style={{ background: "rgba(185,255,74,0.15)", color: "#B9FF4A" }}>
                            {athlete.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-medium text-white truncate">{athlete.name}</div>
                            <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.40)" }}>{athlete.sport} · {athlete.nationality}</div>
                          </div>
                          {selectedExisting?.id === athlete.id && <div className="w-2 h-2 rounded-full shrink-0" style={{ background: "#B9FF4A" }} />}
                        </button>
                      ))}
                      {filtered.length === 0 && (
                        <div className="text-center py-6 text-[12px]" style={{ color: "rgba(255,255,255,0.35)" }}>No athletes match your search.</div>
                      )}
                    </div>
                  </div>

                  {/* Right: new athlete form */}
                  <div className="col-span-7">
                    <div className="rounded-xl p-6" style={card}>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "rgba(200,189,255,0.12)" }}>
                          <User size={12} style={{ color: "#C8BDFF" }} />
                        </div>
                        <h3 className="text-[13px] font-semibold text-white">Add a new athlete</h3>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1" style={{ color: "rgba(255,255,255,0.40)" }}>Full Name *</label>
                          <input type="text" value={newName} onChange={(e) => { setNewName(e.target.value); setSelectedExisting(null); }}
                            placeholder="e.g. Emma Gould" style={inputStyle}
                            onFocus={(e) => e.currentTarget.style.borderColor = "#B9FF4A"}
                            onBlur={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1" style={{ color: "rgba(255,255,255,0.40)" }}>Sport</label>
                            <select value={newSport} onChange={(e) => { setNewSport(e.target.value); setNewEvent(EVENT_OPTIONS[e.target.value]?.[0] ?? ""); }}
                              style={{ ...inputStyle, padding: "7px 12px" }}
                            >
                              {SPORT_OPTIONS.map((s) => <option key={s} style={{ background: "#0F2010" }}>{s}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1" style={{ color: "rgba(255,255,255,0.40)" }}>Event / Position</label>
                            <select value={newEvent} onChange={(e) => setNewEvent(e.target.value)} style={{ ...inputStyle, padding: "7px 12px" }}>
                              {(EVENT_OPTIONS[newSport] ?? ["General"]).map((e) => <option key={e} style={{ background: "#0F2010" }}>{e}</option>)}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1" style={{ color: "rgba(255,255,255,0.40)" }}>Nationality (IOC Code)</label>
                            <select value={newNationality} onChange={(e) => setNewNationality(e.target.value)} style={{ ...inputStyle, padding: "7px 12px" }}>
                              {NATIONALITY_OPTIONS.map((n) => <option key={n} style={{ background: "#0F2010" }}>{n}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1" style={{ color: "rgba(255,255,255,0.40)" }}>Age (optional)</label>
                            <input type="number" value={newAge} onChange={(e) => setNewAge(e.target.value)} placeholder="e.g. 24" min={14} max={60}
                              style={inputStyle}
                              onFocus={(e) => e.currentTarget.style.borderColor = "#B9FF4A"}
                              onBlur={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"}
                            />
                          </div>
                        </div>

                        <button onClick={handleCreateNew} disabled={!newName.trim()}
                          className="w-full py-2.5 rounded-lg flex items-center justify-center gap-2 text-[13px] font-medium transition-all mt-2"
                          style={newName.trim() ? { background: "#B9FF4A", color: "#0D1C0B" } : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.25)", cursor: "not-allowed" }}
                        >
                          Continue with new athlete <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Import mode ── */}
              {mode === "import" && (
                <div className="max-w-3xl">
                  {/* Success state */}
                  {importStatus === "success" && importResult && (
                    <div className="rounded-xl p-8 text-center" style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.20)" }}>
                      <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(74,222,128,0.12)" }}>
                        <CheckCircle2 size={28} className="text-emerald-400" />
                      </div>
                      <h3 className="text-[18px] font-semibold text-white mb-1">{importResult.imported} of {importResult.total} athletes imported</h3>
                      <p className="text-[13px] mb-6" style={{ color: "rgba(255,255,255,0.50)" }}>Intelligence agents have been created for each athlete.</p>
                      <div className="flex items-center justify-center gap-3">
                        <button onClick={() => { setImportStatus("idle"); setImportFile(null); setImportRows([]); setImportHeaders([]); }}
                          className="px-4 py-2 rounded-lg text-[13px] transition-colors"
                          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.70)" }}
                        >
                          Import another file
                        </button>
                        <button onClick={() => setLocation("/athletes")}
                          className="px-4 py-2 rounded-lg text-[13px] font-medium flex items-center gap-2"
                          style={{ background: "#B9FF4A", color: "#0D1C0B" }}
                        >
                          <Users size={14} /> View athletes
                        </button>
                      </div>
                    </div>
                  )}

                  {importStatus !== "success" && (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.55)" }}>
                          Upload a <strong className="text-white">.csv</strong> or <strong className="text-white">.xlsx</strong> file. Columns detected automatically — column order doesn't matter.
                        </p>
                        <button onClick={downloadTemplate} className="flex items-center gap-1.5 text-[12px] font-medium transition-colors" style={{ color: "#C8BDFF" }}>
                          <Download size={13} /> Download template
                        </button>
                      </div>

                      {/* Drop zone */}
                      <div
                        onDrop={onDrop}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onClick={() => !importFile && fileInputRef.current?.click()}
                        className="rounded-xl transition-all mb-5"
                        style={{
                          border: `2px dashed ${isDragging ? "#B9FF4A" : importFile ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.12)"}`,
                          background: isDragging ? "rgba(185,255,74,0.03)" : importFile ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.02)",
                          padding: importFile ? 16 : 40,
                          cursor: importFile ? "default" : "pointer",
                          textAlign: importFile ? "left" : "center",
                        }}
                      >
                        {importFile ? (
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(200,189,255,0.10)" }}>
                              <FileSpreadsheet size={18} style={{ color: "#C8BDFF" }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[13px] font-medium text-white truncate">{importFile.name}</div>
                              <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.40)" }}>{importRows.length} rows detected</div>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); setImportFile(null); setImportRows([]); setImportHeaders([]); setImportStatus("idle"); setImportError(""); }}
                              className="p-1 rounded transition-colors" style={{ color: "rgba(255,255,255,0.35)" }}>
                              <X size={15} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(200,189,255,0.08)" }}>
                              <Upload size={22} style={{ color: "#C8BDFF" }} />
                            </div>
                            <p className="text-[14px] font-medium text-white mb-1">Drop your spreadsheet here</p>
                            <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.40)" }}>or click to browse — .csv or .xlsx accepted</p>
                          </>
                        )}
                        <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={onFileChange} className="hidden" />
                      </div>

                      {importError && (
                        <div className="flex items-start gap-2 p-3 rounded-lg mb-5" style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.20)" }}>
                          <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
                          <p className="text-[12px] text-red-400">{importError}</p>
                        </div>
                      )}

                      {importRows.length > 0 && (
                        <div className="rounded-xl overflow-hidden mb-5" style={{ border: "1px solid rgba(255,255,255,0.09)" }}>
                          <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                            <div className="text-[12px] font-semibold" style={{ color: "rgba(255,255,255,0.40)" }}>Column detection</div>
                            <div className="text-[12px]" style={{ color: "rgba(255,255,255,0.30)" }}>Showing {Math.min(importRows.length, 5)} of {importRows.length} rows</div>
                          </div>

                          <div className="px-5 py-3 flex flex-wrap gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                            {(["name","sport","event","nationality","age"] as const).map((field) => {
                              const colIdx = colMap[field];
                              const colName = colIdx >= 0 ? importHeaders[colIdx] : null;
                              return (
                                <div key={field} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
                                  style={colName
                                    ? { background: "rgba(74,222,128,0.08)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.20)" }
                                    : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.08)" }
                                  }
                                >
                                  {colName ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
                                  <span className="capitalize">{field}</span>
                                  {colName && <span className="opacity-60">← {colName}</span>}
                                </div>
                              );
                            })}
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full text-[12px]">
                              <thead>
                                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                                  {importHeaders.map((h, i) => (
                                    <th key={i} className="text-left px-4 py-2.5 font-semibold whitespace-nowrap" style={{ color: "rgba(255,255,255,0.40)" }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {importRows.slice(0, 5).map((row, ri) => (
                                  <tr key={ri} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                                    {row.map((cell, ci) => (
                                      <td key={ci} className="px-4 py-2.5 whitespace-nowrap" style={{ color: cell ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.20)" }}>
                                        {cell || "—"}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {importRows.length > 0 && colMap.name >= 0 && (
                        <button onClick={handleBulkImport} disabled={importStatus === "loading"}
                          className="w-full py-3 rounded-xl text-[13px] font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                          style={{ background: "#B9FF4A", color: "#0D1C0B" }}
                        >
                          {importStatus === "loading" ? (
                            <><div className="w-4 h-4 border-2 border-[#0D1C0B]/30 border-t-[#0D1C0B] rounded-full animate-spin" />Importing {validRows.length} athletes…</>
                          ) : (
                            <><Users size={15} />Import {validRows.length} athlete{validRows.length !== 1 ? "s" : ""} and start tracking</>
                          )}
                        </button>
                      )}

                      {importRows.length > 0 && colMap.name < 0 && (
                        <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.20)" }}>
                          <AlertCircle size={14} className="text-amber-400 shrink-0" />
                          <p className="text-[12px] text-amber-400">
                            No <strong>name</strong> column detected. Add a column called "name" or "athlete" to your spreadsheet.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Confirm ── */}
          {step === 2 && displayAthlete && (
            <div className="max-w-2xl mx-auto">
              <div className="mb-6">
                <h2 className="text-[20px] font-semibold text-white mb-1">Confirm athlete profile</h2>
                <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.45)" }}>Review the details before starting the intelligence agent.</p>
              </div>

              <div className="rounded-xl overflow-hidden mb-5" style={{ border: "1px solid rgba(255,255,255,0.09)" }}>
                <div className="p-6 flex items-center gap-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)" }}>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold" style={{ background: "linear-gradient(135deg, rgba(185,255,74,0.25), rgba(185,255,74,0.08))", color: "#B9FF4A", border: "1px solid rgba(185,255,74,0.20)" }}>
                    {displayAthlete.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="text-[20px] font-semibold text-white mb-0.5">{displayAthlete.name}</h3>
                    <div className="text-[13px]" style={{ color: "rgba(255,255,255,0.50)" }}>{displayAthlete.sport} · {displayAthlete.event} · {displayAthlete.nationality}</div>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(74,222,128,0.10)" }}>
                      <Target size={14} className="text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold text-white">Intelligence coverage ready</div>
                      <div className="text-[12px]" style={{ color: "rgba(255,255,255,0.45)" }}>Agent will monitor news, social media, results, and commercial activity continuously.</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    {[
                      { label: "Results & Rankings", desc: "Race results, world rankings updates" },
                      { label: "Media & Interviews", desc: "Press coverage, social media mentions" },
                      { label: "Sponsorships", desc: "Brand deals, commercial partnerships" },
                      { label: "Career Changes", desc: "Coach changes, team moves, retirement" },
                    ].map((cat) => (
                      <div key={cat.label} className="flex items-start gap-2 p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <CheckCircle2 size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                        <div>
                          <div className="text-[12px] font-semibold text-white">{cat.label}</div>
                          <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.40)" }}>{cat.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button onClick={() => setStep(1)} className="px-4 py-2.5 rounded-xl text-[13px] font-medium transition-colors" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.65)" }}>
                  Back
                </button>
                <button onClick={() => setStep(3)} className="flex-1 py-2.5 rounded-xl text-[13px] font-medium flex items-center justify-center gap-2 transition-colors" style={{ background: "#B9FF4A", color: "#0D1C0B" }}>
                  Confirm and configure alerts <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Configure & launch ── */}
          {step === 3 && displayAthlete && (
            <div className="max-w-2xl mx-auto">
              <div className="mb-6">
                <h2 className="text-[20px] font-semibold text-white mb-1">Configure alert preferences</h2>
                <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.45)" }}>Choose which intelligence categories to monitor and how often to be notified.</p>
              </div>

              <div className="rounded-xl p-6 mb-5 space-y-4" style={{ border: "1px solid rgba(255,255,255,0.09)", background: "rgba(255,255,255,0.04)" }}>
                {[
                  { label: "Results & Rankings", key: "results" },
                  { label: "Media & Interviews", key: "media" },
                  { label: "Sponsorships", key: "sponsorships" },
                  { label: "Career Changes", key: "career" },
                ].map((cat) => (
                  <div key={cat.key} className="flex items-center justify-between py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div>
                      <div className="text-[13px] font-medium text-white">{cat.label}</div>
                      <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.40)" }}>Enabled by default</div>
                    </div>
                    <select className="px-3 py-1.5 rounded-lg text-[12px] focus:outline-none" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.75)" }}>
                      <option value="immediate" style={{ background: "#0F2010" }}>Immediate</option>
                      <option value="daily" style={{ background: "#0F2010" }}>Daily digest</option>
                      <option value="weekly" style={{ background: "#0F2010" }}>Weekly summary</option>
                    </select>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <button onClick={() => setStep(2)} className="px-4 py-2.5 rounded-xl text-[13px] font-medium transition-colors" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.65)" }}>
                  Back
                </button>
                <button onClick={handleConfirm} disabled={createAthlete.isPending}
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  style={{ background: "#B9FF4A", color: "#0D1C0B" }}
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
