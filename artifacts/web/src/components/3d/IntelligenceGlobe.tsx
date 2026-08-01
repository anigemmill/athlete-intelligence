/**
 * IntelligenceGlobe — live operational globe for the Dashboard.
 *
 * Shows three pin types:
 *   • Athlete home-nation pins (green = fresh < 7d, amber = aging 7-14d, red = stale > 14d)
 *   • Competition venue pins (cyan, only events within 14 days)
 *   • Intelligence event pins (category-coloured, latest item per athlete)
 *
 * Clicking a pin opens an inline popover below the globe.
 */
import React, { useRef, useState, useCallback } from "react";
import { Canvas, useFrame, ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { T, CATEGORY_TOKENS, freshnessColor } from "@/lib/tokens";
import type { Athlete, Competition, IntelligenceItem } from "@workspace/api-client-react";
import { X, MapPin, Trophy, Zap } from "lucide-react";

// ── Geocoding lookup ─────────────────────────────────────────────────────────

const COUNTRY_COORDS: Record<string, [number, number]> = {
  "New Zealand":    [-40.9,  174.9],
  "Australia":      [-25.3,  133.8],
  "USA":            [ 37.1,  -95.7],
  "United States":  [ 37.1,  -95.7],
  "Great Britain":  [ 55.4,   -3.4],
  "UK":             [ 51.5,   -0.1],
  "England":        [ 52.5,   -1.5],
  "Scotland":       [ 56.8,   -4.0],
  "Germany":        [ 51.2,   10.5],
  "France":         [ 46.2,    2.2],
  "Japan":          [ 36.2,  138.3],
  "Kenya":          [ -0.1,   37.9],
  "Ethiopia":       [  9.1,   40.5],
  "Canada":         [ 56.1, -106.3],
  "South Africa":   [-30.6,   22.9],
  "Netherlands":    [ 52.1,    5.3],
  "Norway":         [ 64.6,   17.9],
  "Sweden":         [ 60.1,   18.6],
  "Jamaica":        [ 18.1,  -77.3],
  "China":          [ 35.9,  104.2],
  "Brazil":         [-14.2,  -51.9],
  "Italy":          [ 41.9,   12.6],
  "Spain":          [ 40.5,   -3.7],
  "Poland":         [ 51.9,   19.1],
  "Portugal":       [ 39.4,   -8.2],
  "Ireland":        [ 53.4,   -8.2],
  "Switzerland":    [ 47.0,    8.2],
  "Czech Republic": [ 49.8,   15.5],
  "Hungary":        [ 47.2,   19.5],
  "Romania":        [ 45.9,   24.9],
  "Ukraine":        [ 49.0,   31.5],
  "Russia":         [ 61.5,  105.3],
  "Uganda":         [  1.4,   32.3],
  "Morocco":        [ 31.8,   -7.1],
  "Nigeria":        [  9.1,    8.7],
  "Ghana":          [  7.9,   -1.0],
  "Argentina":      [-38.4,  -63.6],
  "Colombia":       [  4.6,  -74.1],
  "Cuba":           [ 22.0,  -79.5],
  "Mexico":         [ 23.6, -102.6],
  "India":          [ 20.6,   78.9],
  "South Korea":    [ 35.9,  127.8],
  "Korea":          [ 35.9,  127.8],
  "Thailand":       [ 15.9,  100.9],
  "Indonesia":      [ -0.8,  113.9],
  "Belgium":        [ 50.5,    4.5],
  "Austria":        [ 47.5,   14.6],
  "Denmark":        [ 56.3,    9.5],
  "Finland":        [ 61.9,   25.7],
  "Greece":         [ 39.1,   21.8],
  "Turkey":         [ 38.9,   35.2],
  "Qatar":          [ 25.4,   51.2],
  "UAE":            [ 24.0,   54.0],
  "Saudi Arabia":   [ 23.9,   45.1],
  "Egypt":          [ 26.8,   30.8],
  "Tanzania":       [ -6.4,   34.9],
  "Bahrain":        [ 26.0,   50.6],
  "New Caledonia":  [-20.9,  165.6],
  "Fiji":           [-17.7,  178.1],
  "Samoa":          [-13.8, -172.1],
  "Tonga":          [-21.2, -175.2],
  "Czech":          [ 49.8,   15.5],
  "Serbia":         [ 44.0,   21.0],
  "Croatia":        [ 45.1,   15.2],
  "Slovakia":       [ 48.7,   19.7],
  "Slovenia":       [ 46.1,   14.5],
  "Belarus":        [ 53.7,   27.9],
  "Lithuania":      [ 55.2,   23.9],
  "Latvia":         [ 56.9,   24.6],
  "Estonia":        [ 58.6,   25.0],
  "Bulgaria":       [ 42.7,   25.5],
  "Algeria":        [ 28.0,    3.0],
  "Cameroon":       [  3.9,   11.5],
  "Senegal":        [ 14.5,  -14.5],
  "Ivory Coast":    [  7.5,   -5.5],
  "Zimbabwe":       [-20.0,   30.0],
  "Botswana":       [-22.3,   24.7],
  "Namibia":        [-22.6,   17.1],
};

const CITY_COORDS: Record<string, [number, number]> = {
  "London":       [ 51.5,   -0.1],
  "Paris":        [ 48.9,    2.3],
  "Berlin":       [ 52.5,   13.4],
  "Tokyo":        [ 35.7,  139.7],
  "New York":     [ 40.7,  -74.0],
  "Los Angeles":  [ 34.1, -118.2],
  "Chicago":      [ 41.9,  -87.6],
  "Boston":       [ 42.4,  -71.1],
  "Eugene":       [ 44.0, -123.1],
  "Stockholm":    [ 59.3,   18.1],
  "Oslo":         [ 59.9,   10.8],
  "Helsinki":     [ 60.2,   25.0],
  "Copenhagen":   [ 55.7,   12.6],
  "Amsterdam":    [ 52.4,    4.9],
  "Brussels":     [ 50.8,    4.4],
  "Zurich":       [ 47.4,    8.5],
  "Zürich":       [ 47.4,    8.5],
  "Geneva":       [ 46.2,    6.1],
  "Vienna":       [ 48.2,   16.4],
  "Rome":         [ 41.9,   12.5],
  "Milan":        [ 45.5,    9.2],
  "Barcelona":    [ 41.4,    2.2],
  "Madrid":       [ 40.4,   -3.7],
  "Lisbon":       [ 38.7,   -9.1],
  "Athens":       [ 37.9,   23.7],
  "Warsaw":       [ 52.2,   21.0],
  "Prague":       [ 50.1,   14.4],
  "Budapest":     [ 47.5,   19.1],
  "Bucharest":    [ 44.4,   26.1],
  "Kyiv":         [ 50.5,   30.5],
  "Kiev":         [ 50.5,   30.5],
  "Moscow":       [ 55.8,   37.6],
  "Istanbul":     [ 41.0,   28.9],
  "Dubai":        [ 25.2,   55.3],
  "Doha":         [ 25.3,   51.5],
  "Beijing":      [ 39.9,  116.4],
  "Shanghai":     [ 31.2,  121.5],
  "Sydney":       [-33.9,  151.2],
  "Melbourne":    [-37.8,  145.0],
  "Auckland":     [-36.9,  174.8],
  "Nairobi":      [ -1.3,   36.8],
  "Addis Ababa":  [  9.0,   38.7],
  "Johannesburg": [-26.2,   28.1],
  "Cape Town":    [-33.9,   18.4],
  "Cairo":        [ 30.1,   31.2],
  "Casablanca":   [ 33.6,   -7.6],
  "Lagos":        [  6.5,    3.4],
  "Accra":        [  5.6,   -0.2],
  "Toronto":      [ 43.7,  -79.4],
  "Montreal":     [ 45.5,  -73.6],
  "Vancouver":    [ 49.3, -123.1],
  "Mexico City":  [ 19.4,  -99.1],
  "São Paulo":    [-23.5,  -46.6],
  "Buenos Aires": [-34.6,  -58.4],
  "Bogotá":       [  4.7,  -74.1],
  "Lima":         [-12.1,  -77.0],
  "Lausanne":     [ 46.5,    6.6],
  "Monaco":       [ 43.7,    7.4],
  "Birmingham":   [ 52.5,   -1.9],
  "Manchester":   [ 53.5,   -2.2],
  "Glasgow":      [ 55.9,   -4.3],
  "Edinburgh":    [ 55.9,   -3.2],
  "Cardiff":      [ 51.5,   -3.2],
  "Dublin":       [ 53.3,   -6.3],
  "Gothenburg":   [ 57.7,   12.0],
  "Hamburg":      [ 53.6,   10.0],
  "Frankfurt":    [ 50.1,    8.7],
  "Munich":       [ 48.1,   11.6],
  "Cologne":      [ 50.9,    6.9],
  "Lyon":         [ 45.7,    4.8],
  "Marseille":    [ 43.3,    5.4],
  "Taipei":       [ 25.0,  121.5],
  "Seoul":        [ 37.6,  127.0],
  "Osaka":        [ 34.7,  135.5],
  "Fukuoka":      [ 33.6,  130.4],
  "Sapporo":      [ 43.1,  141.3],
  "Mumbai":       [ 19.1,   72.9],
  "Delhi":        [ 28.7,   77.1],
  "Kuala Lumpur": [  3.1,  101.7],
  "Singapore":    [  1.3,  103.8],
  "Bangkok":      [ 13.8,  100.5],
  "Jakarta":      [ -6.2,  106.8],
  "Manila":       [ 14.6,  121.0],
  "Riyadh":       [ 24.7,   46.7],
  "Amman":        [ 31.9,   35.9],
  "Rabat":        [ 34.0,   -6.8],
};

/** Attempt to geocode a location string like "Paris, France" or "London Stadium, UK" */
function geocodeLocation(location: string | null | undefined): [number, number] | null {
  if (!location) return null;
  const loc = location.trim();

  // Try exact country match first
  for (const [country, coords] of Object.entries(COUNTRY_COORDS)) {
    if (loc.toLowerCase() === country.toLowerCase()) return coords;
  }

  // Try city match
  for (const [city, coords] of Object.entries(CITY_COORDS)) {
    if (loc.toLowerCase().includes(city.toLowerCase())) return coords;
  }

  // Try country match in string (e.g. "Budapest, Hungary")
  for (const [country, coords] of Object.entries(COUNTRY_COORDS)) {
    if (loc.toLowerCase().includes(country.toLowerCase())) return coords;
  }

  return null;
}

// ── Pin data types ───────────────────────────────────────────────────────────

export interface AthleteGlobePin {
  kind: "athlete";
  id: string;
  lat: number;
  lon: number;
  color: string;
  nationality: string;
  athletes: Array<{ id: number; name: string; lastCrawledAt: string | null; freshColor: string }>;
}

export interface CompetitionGlobePin {
  kind: "competition";
  id: string;
  lat: number;
  lon: number;
  color: string;
  location: string;
  competitions: Array<{ id: number; meetName: string; date: string; athleteName: string; daysAway: number | null; event: string }>;
}

export interface IntelligenceGlobePin {
  kind: "intelligence";
  id: string;
  lat: number;
  lon: number;
  color: string;
  category: string;
  nationality: string;
  athleteName: string;
  title: string;
}

export type GlobePin = AthleteGlobePin | CompetitionGlobePin | IntelligenceGlobePin;

// ── 3-D helpers ──────────────────────────────────────────────────────────────

function latLonToXYZ(lat: number, lon: number, r = 1.02): [number, number, number] {
  const latR = (lat * Math.PI) / 180;
  const lonR = (lon * Math.PI) / 180;
  return [
    r * Math.cos(latR) * Math.cos(lonR),
    r * Math.sin(latR),
    r * Math.cos(latR) * Math.sin(lonR),
  ];
}

// ── Single pin mesh ──────────────────────────────────────────────────────────

interface PinMeshProps {
  pin: GlobePin;
  isSelected: boolean;
  onSelect: (pin: GlobePin) => void;
}

function PinMesh({ pin, isSelected, onSelect }: PinMeshProps) {
  const [hovered, setHovered] = useState(false);
  const pinRef  = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  const [px, py, pz] = latLonToXYZ(pin.lat, pin.lon);
  const color = new THREE.Color(pin.color);

  // Size: competitions a bit larger; intelligence slightly smaller
  const baseSize = pin.kind === "competition" ? 0.042 : pin.kind === "intelligence" ? 0.028 : 0.036;
  const size = isSelected || hovered ? baseSize * 1.4 : baseSize;

  useFrame((_, delta) => {
    const rot = delta * 0.22;
    if (pinRef.current)  pinRef.current.rotation.y  += rot;
    if (glowRef.current) glowRef.current.rotation.y += rot;
    if (ringRef.current) {
      ringRef.current.rotation.y += rot;
      const t = Date.now() * 0.002;
      const mat = ringRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = (isSelected || hovered ? 0.9 : 0.4) + Math.sin(t) * 0.3;
      mat.opacity = (isSelected || hovered ? 0.28 : 0.14) + Math.sin(t * 1.3) * 0.08;
    }
  });

  return (
    <group>
      {/* Core pin */}
      <mesh
        ref={pinRef}
        position={[px, py, pz]}
        onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onSelect(pin); }}
        onPointerEnter={() => { setHovered(true); document.body.style.cursor = "pointer"; }}
        onPointerLeave={() => { setHovered(false); document.body.style.cursor = "default"; }}
      >
        <sphereGeometry args={[size, 12, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.0} />
      </mesh>

      {/* Inner glow */}
      <mesh ref={glowRef} position={[px, py, pz]}>
        <sphereGeometry args={[size * 1.8, 12, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7} transparent opacity={0.18} />
      </mesh>

      {/* Pulsing ring */}
      <mesh ref={ringRef} position={[px, py, pz]}>
        <sphereGeometry args={[size * 2.8, 12, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} transparent opacity={0.14} />
      </mesh>
    </group>
  );
}

// ── Globe scene ──────────────────────────────────────────────────────────────

interface GlobeSceneProps {
  pins: GlobePin[];
  selectedPinId: string | null;
  onPinSelect: (pin: GlobePin) => void;
}

function GlobeScene({ pins, selectedPinId, onPinSelect }: GlobeSceneProps) {
  const globeRef  = useRef<THREE.Mesh>(null);
  const gridRef   = useRef<THREE.Mesh>(null);
  const atmosRef  = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    const rot = delta * 0.18;
    if (globeRef.current)  globeRef.current.rotation.y  += rot;
    if (gridRef.current)   gridRef.current.rotation.y   += rot;
    if (atmosRef.current)  atmosRef.current.rotation.y  += rot * 0.5;
  });

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 4, 4]} intensity={0.90} color="#ffffff" />
      <pointLight position={[-3, 2, 2]} intensity={0.40} color="#B9FF4A" />
      <pointLight position={[2, -3, -2]} intensity={0.20} color="#C8BDFF" />

      {/* Globe body */}
      <mesh ref={globeRef}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial
          color="#071a2f"
          roughness={0.55}
          metalness={0.18}
          emissive="#050e1a"
          emissiveIntensity={0.55}
        />
      </mesh>

      {/* Grid */}
      <mesh ref={gridRef}>
        <sphereGeometry args={[1.006, 28, 28]} />
        <meshBasicMaterial color="#1a4060" wireframe transparent opacity={0.18} />
      </mesh>

      {/* Atmosphere halo */}
      <mesh ref={atmosRef}>
        <sphereGeometry args={[1.09, 32, 32]} />
        <meshStandardMaterial
          color="#1a6090"
          transparent
          opacity={0.07}
          side={THREE.BackSide}
          emissive="#0a3060"
          emissiveIntensity={0.5}
        />
      </mesh>

      {/* Pins */}
      {pins.map((pin) => (
        <PinMesh
          key={pin.id}
          pin={pin}
          isSelected={selectedPinId === pin.id}
          onSelect={onPinSelect}
        />
      ))}

      <OrbitControls enableZoom={false} enablePan={false} rotateSpeed={0.55} />
    </>
  );
}

// ── Popover card ─────────────────────────────────────────────────────────────

function PinPopover({ pin, onClose }: { pin: GlobePin; onClose: () => void }) {
  const headerColor =
    pin.kind === "athlete"      ? pin.athletes[0]?.freshColor ?? T.statusFresh
    : pin.kind === "competition" ? "#22d3ee"
    : CATEGORY_TOKENS[pin.category]?.text ?? T.lavender;

  return (
    <div
      className="rounded-xl p-4 relative"
      style={{
        background: "rgba(7,26,47,0.96)",
        border: `1px solid ${headerColor}44`,
        boxShadow: `0 8px 32px rgba(0,0,0,0.50), 0 0 0 1px ${headerColor}22`,
      }}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 p-1 rounded transition-colors"
        style={{ color: T.t40 }}
        onMouseEnter={e => (e.currentTarget.style.color = T.t70)}
        onMouseLeave={e => (e.currentTarget.style.color = T.t40)}
      >
        <X size={13} />
      </button>

      {pin.kind === "athlete" && (
        <>
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={12} style={{ color: headerColor }} />
            <span className="text-[12px] font-semibold" style={{ color: T.t92 }}>{pin.nationality}</span>
            <span className="text-[11px]" style={{ color: T.t40 }}>{pin.athletes.length} athlete{pin.athletes.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="flex flex-col gap-2">
            {pin.athletes.map(a => (
              <div key={a.id} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: a.freshColor }} />
                <span className="text-[12px] font-medium" style={{ color: T.t70 }}>{a.name}</span>
                <span className="text-[10px] ml-auto" style={{ color: T.t40 }}>
                  {a.lastCrawledAt
                    ? new Date(a.lastCrawledAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                    : "Never"}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {pin.kind === "competition" && (
        <>
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={12} style={{ color: headerColor }} />
            <span className="text-[12px] font-semibold" style={{ color: T.t92 }}>{pin.location}</span>
            <span className="text-[11px]" style={{ color: T.t40 }}>{pin.competitions.length} event{pin.competitions.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="flex flex-col gap-2">
            {pin.competitions.map(c => (
              <div key={c.id} className="rounded-lg p-2" style={{ background: "rgba(34,211,238,0.06)", border: "1px solid rgba(34,211,238,0.15)" }}>
                <div className="text-[12px] font-medium mb-0.5" style={{ color: T.t70 }}>{c.meetName}</div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px]" style={{ color: T.t40 }}>{c.event}</span>
                  <span className="text-[10px] ml-auto font-semibold" style={{ color: "#22d3ee" }}>
                    {c.daysAway != null ? (c.daysAway === 0 ? "Today" : c.daysAway === 1 ? "Tomorrow" : `${c.daysAway}d away`) : c.date}
                  </span>
                </div>
                <div className="text-[10px] mt-0.5" style={{ color: T.t40 }}>{c.athleteName}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {pin.kind === "intelligence" && (
        <>
          <div className="flex items-center gap-2 mb-2">
            <Zap size={12} style={{ color: headerColor }} />
            <span className="text-[12px] font-semibold" style={{ color: T.t92 }}>{pin.athleteName}</span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{ background: CATEGORY_TOKENS[pin.category]?.bg ?? "rgba(200,189,255,0.15)", color: headerColor, border: `1px solid ${CATEGORY_TOKENS[pin.category]?.border ?? "rgba(200,189,255,0.3)"}` }}
            >
              {CATEGORY_TOKENS[pin.category]?.label ?? pin.category}
            </span>
          </div>
          <p className="text-[12px] leading-relaxed" style={{ color: T.t55 }}>{pin.title}</p>
          <div className="text-[10px] mt-2" style={{ color: T.t40 }}>{pin.nationality}</div>
        </>
      )}
    </div>
  );
}

// ── Legend ───────────────────────────────────────────────────────────────────

interface LegendProps {
  athleteCount: number;
  freshCount: number;
  agingCount: number;
  staleCount: number;
  competitionCount: number;
  intelligenceCount: number;
}

function GlobeLegend({ athleteCount, freshCount, agingCount, staleCount, competitionCount, intelligenceCount }: LegendProps) {
  const items: Array<{ color: string; label: string; count: number }> = [
    { color: T.statusFresh,  label: "Updated today",        count: freshCount },
    { color: T.statusAging,  label: "Aging (7–14d)",        count: agingCount },
    { color: T.statusStale,  label: "Stale (>14d)",         count: staleCount },
    { color: "#22d3ee",      label: "Competitions (14d)",   count: competitionCount },
    { color: T.lavender,     label: "Intelligence signals", count: intelligenceCount },
  ].filter(i => i.count > 0);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {items.map(item => (
        <div key={item.label} className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color, boxShadow: `0 0 4px ${item.color}88` }} />
          <span className="text-[10px]" style={{ color: T.t40 }}>
            <span className="font-semibold" style={{ color: T.t55 }}>{item.count}</span> {item.label}
          </span>
        </div>
      ))}
      {items.length === 0 && (
        <span className="text-[11px]" style={{ color: T.t40 }}>No pins — add athletes to see the intelligence map come alive</span>
      )}
    </div>
  );
}

// ── Main export ──────────────────────────────────────────────────────────────

interface IntelligenceGlobeProps {
  athletes: Athlete[];
  competitions: Competition[];
  intelligence: IntelligenceItem[];
}

export function IntelligenceGlobe({ athletes, competitions, intelligence }: IntelligenceGlobeProps) {
  const [selectedPin, setSelectedPin] = useState<GlobePin | null>(null);

  // ── Build athlete pins (grouped by nationality) ────────────────────────────
  const athletePinMap = new Map<string, AthleteGlobePin>();
  for (const a of athletes) {
    const nat = a.nationality || "USA";
    const coords = COUNTRY_COORDS[nat] ?? COUNTRY_COORDS["USA"];
    if (!coords) continue;
    const fc = freshnessColor(a.lastCrawledAt);
    if (!athletePinMap.has(nat)) {
      athletePinMap.set(nat, {
        kind:     "athlete",
        id:       `athlete:${nat}`,
        lat:      coords[0],
        lon:      coords[1],
        color:    fc,
        nationality: nat,
        athletes: [],
      });
    }
    const pin = athletePinMap.get(nat)!;
    pin.athletes.push({ id: a.id, name: a.name, lastCrawledAt: a.lastCrawledAt ?? null, freshColor: fc });
    // Pin color = freshest athlete in this group
    const best = pin.athletes.reduce((prev, cur) => {
      const pFresh = prev.freshColor === T.statusFresh ? 0 : prev.freshColor === T.statusAging ? 1 : 2;
      const cFresh = cur.freshColor  === T.statusFresh ? 0 : cur.freshColor  === T.statusAging ? 1 : 2;
      return cFresh < pFresh ? cur : prev;
    });
    pin.color = best.freshColor;
  }
  const athletePins: AthleteGlobePin[] = Array.from(athletePinMap.values());

  // ── Build competition pins (within 14 days, grouped by location) ───────────
  const compPinMap = new Map<string, CompetitionGlobePin>();
  const today = new Date();
  const in14  = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
  for (const c of competitions) {
    if (c.status !== "upcoming") continue;
    const compDate = new Date(c.date);
    if (compDate < today || compDate > in14) continue;
    const coords = geocodeLocation(c.location);
    if (!coords) continue;
    const key = c.location?.trim() ?? "unknown";
    if (!compPinMap.has(key)) {
      compPinMap.set(key, {
        kind:         "competition",
        id:           `comp:${key}`,
        lat:          coords[0],
        lon:          coords[1],
        color:        "#22d3ee",
        location:     key,
        competitions: [],
      });
    }
    compPinMap.get(key)!.competitions.push({
      id:         c.id,
      meetName:   c.meetName,
      date:       c.date,
      athleteName: c.athleteName,
      daysAway:   c.daysAway ?? null,
      event:      c.event,
    });
  }
  const competitionPins: CompetitionGlobePin[] = Array.from(compPinMap.values());

  // ── Build intelligence pins (latest item per athlete, non-results category) ─
  // One pin per athlete at their nationality, coloured by category, small offset
  const intelPins: IntelligenceGlobePin[] = [];
  const intelByAthlete = new Map<number, IntelligenceItem>();
  for (const item of intelligence) {
    const existing = intelByAthlete.get(item.athleteId);
    if (!existing || item.discoveredAt > existing.discoveredAt) {
      intelByAthlete.set(item.athleteId, item);
    }
  }
  for (const [athleteId, item] of intelByAthlete) {
    const athlete = athletes.find(a => a.id === athleteId);
    if (!athlete) continue;
    const nat = athlete.nationality || "USA";
    const coords = COUNTRY_COORDS[nat];
    if (!coords) continue;
    const catToken = CATEGORY_TOKENS[item.category];
    if (!catToken) continue;
    // Slight offset to avoid exact overlap with athlete pin
    const latOffset  = 3.0;
    const lonOffset  = 4.0;
    intelPins.push({
      kind:        "intelligence",
      id:          `intel:${athleteId}`,
      lat:         coords[0] + latOffset,
      lon:         coords[1] + lonOffset,
      color:       catToken.text,
      category:    item.category,
      nationality: nat,
      athleteName: athlete.name,
      title:       item.title,
    });
  }

  const allPins: GlobePin[] = [...athletePins, ...competitionPins, ...intelPins];

  // ── Legend counts ──────────────────────────────────────────────────────────
  let freshCount = 0, agingCount = 0, staleCount = 0;
  for (const a of athletes) {
    const fc = freshnessColor(a.lastCrawledAt);
    if (fc === T.statusFresh) freshCount++;
    else if (fc === T.statusAging) agingCount++;
    else staleCount++;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4" style={{ minHeight: 280 }}>

        {/* ── Globe canvas ──────────────────────────────────────────────── */}
        <div
          className="flex-1 rounded-xl overflow-hidden relative"
          style={{
            background:  "radial-gradient(ellipse at 40% 40%, #071a2f 0%, #050a14 100%)",
            border:      `1px solid ${T.borderDefault}`,
            boxShadow:   "0 0 48px rgba(185,255,74,0.05), inset 0 0 24px rgba(0,0,0,0.5)",
            minHeight:   280,
          }}
        >
          <Canvas camera={{ position: [0, 0, 2.75], fov: 36 }} dpr={[1, 2]}>
            <GlobeScene
              pins={allPins}
              selectedPinId={selectedPin?.id ?? null}
              onPinSelect={setSelectedPin}
            />
          </Canvas>
        </div>

        {/* ── Popover side panel ────────────────────────────────────────── */}
        <div style={{ width: 260, flexShrink: 0 }}>
          {selectedPin ? (
            <PinPopover pin={selectedPin} onClose={() => setSelectedPin(null)} />
          ) : (
            <div
              className="h-full rounded-xl flex flex-col items-center justify-center text-center p-5"
              style={{
                background: T.bgCard,
                border:     `1px solid ${T.borderSubtle}`,
              }}
            >
              <MapPin size={20} style={{ color: T.t28, marginBottom: 8 }} />
              <p className="text-[12px] leading-relaxed" style={{ color: T.t40 }}>
                Click any pin on the globe to see details
              </p>
              {allPins.length === 0 && (
                <p className="text-[11px] mt-3" style={{ color: T.t28 }}>
                  Add athletes to see their locations appear on the map
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Legend ─────────────────────────────────────────────────────── */}
      <GlobeLegend
        athleteCount={athletes.length}
        freshCount={freshCount}
        agingCount={agingCount}
        staleCount={staleCount}
        competitionCount={competitionPins.length}
        intelligenceCount={intelPins.length}
      />
    </div>
  );
}
