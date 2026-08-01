/**
 * RelationshipGraph3D — force-directed 3D graph of athlete contacts.
 * Central athlete node + surrounding contact nodes connected by glow lines.
 * Built with R3F + OrbitControls.
 */
import React, { useMemo, useRef, useState, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Line } from "@react-three/drei";
import * as THREE from "three";

interface Contact {
  id: number | string;
  name?: string;
  role?: string;
  org?: string;
  confidence?: number;
  status?: string;
}

// ── Colour by role ──────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  coach: "#B9FF4A",
  manager: "#C8BDFF",
  agent: "#C8BDFF",
  sponsor: "#F59E0B",
  federation: "#60A5FA",
  organisation: "#60A5FA",
  media: "#F472B6",
};

function roleColor(role?: string): string {
  if (!role) return "#C8BDFF";
  const key = Object.keys(ROLE_COLORS).find((k) =>
    role.toLowerCase().includes(k)
  );
  return key ? ROLE_COLORS[key] : "#C8BDFF";
}

// ── Node ────────────────────────────────────────────────────────────────────

function GraphNode({
  position,
  color,
  label,
  sublabel,
  radius,
  selected,
  isCenter,
  onClick,
}: {
  position: [number, number, number];
  color: string;
  label: string;
  sublabel?: string;
  radius: number;
  selected: boolean;
  isCenter: boolean;
  onClick: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const t = Date.now() * 0.001;
    const pulse = 1 + Math.sin(t * 1.5 + position[0]) * (isCenter ? 0.07 : 0.04);
    meshRef.current.scale.setScalar(hovered || selected ? 1.35 : pulse);
    if (glowRef.current) {
      glowRef.current.scale.setScalar((hovered || selected ? 1.35 : pulse) * 1.8);
      (glowRef.current.material as THREE.MeshStandardMaterial).opacity =
        (hovered || selected ? 0.35 : 0.12) + Math.sin(t * 2) * 0.03;
    }
  });

  return (
    <group position={position}>
      {/* Glow */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[radius, 12, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} transparent opacity={0.12} depthWrite={false} />
      </mesh>
      {/* Core */}
      <mesh
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <sphereGeometry args={[radius, 24, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered || selected ? 2 : isCenter ? 1.2 : 0.7}
          roughness={0.2}
          metalness={0.5}
        />
      </mesh>
      {/* Label */}
      <Text position={[0, radius + 0.15, 0]} fontSize={isCenter ? 0.105 : 0.085} color="rgba(255,255,255,0.9)" anchorX="center" anchorY="bottom" maxWidth={1.2} textAlign="center">
        {label.length > 18 ? label.slice(0, 16) + "…" : label}
      </Text>
      {sublabel && (
        <Text position={[0, radius + 0.04, 0]} fontSize={0.065} color="rgba(255,255,255,0.4)" anchorX="center" anchorY="top">
          {sublabel.length > 18 ? sublabel.slice(0, 16) + "…" : sublabel}
        </Text>
      )}
    </group>
  );
}

// ── Edge line ───────────────────────────────────────────────────────────────

function GlowEdge({
  from,
  to,
  color,
}: {
  from: [number, number, number];
  to: [number, number, number];
  color: string;
}) {
  return (
    <Line
      points={[from, to]}
      color={color}
      lineWidth={1}
      transparent
      opacity={0.35}
    />
  );
}

// ── Scene ───────────────────────────────────────────────────────────────────

function GraphScene({
  contacts,
  athleteName,
  selectedId,
  onSelect,
}: {
  contacts: Contact[];
  athleteName: string;
  selectedId: string | number | null;
  onSelect: (id: string | number) => void;
}) {
  // Lay nodes out in a circle with slight Z-depth variation
  const nodePositions = useMemo<[number, number, number][]>(() => {
    return contacts.map((_, i) => {
      const angle = (i / contacts.length) * Math.PI * 2;
      const radius = contacts.length <= 5 ? 2.4 : 3.0;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = (Math.random() - 0.5) * 1.2;
      return [x, y, z];
    });
  }, [contacts.length]);

  const center: [number, number, number] = [0, 0, 0];

  return (
    <>
      <color attach="background" args={["#05080f"]} />
      <fog attach="fog" args={["#05080f", 8, 18]} />
      <ambientLight intensity={0.25} />
      <pointLight position={[0, 3, 0]} intensity={1.2} color="#B9FF4A" />
      <pointLight position={[3, -2, 3]} intensity={0.6} color="#C8BDFF" />

      {/* Central athlete node */}
      <GraphNode
        position={center}
        color="#E75D50"
        label={athleteName}
        radius={0.2}
        selected={false}
        isCenter={true}
        onClick={() => {}}
      />

      {/* Contact nodes + edges */}
      {contacts.map((c, i) => {
        const pos = nodePositions[i];
        const color = roleColor(c.role);
        return (
          <React.Fragment key={c.id}>
            <GlowEdge from={center} to={pos} color={color} />
            <GraphNode
              position={pos}
              color={color}
              label={c.name ?? "Unknown"}
              sublabel={c.role}
              radius={0.13}
              selected={selectedId === c.id}
              isCenter={false}
              onClick={() => onSelect(c.id)}
            />
          </React.Fragment>
        );
      })}

      <OrbitControls enablePan={false} enableZoom autoRotate autoRotateSpeed={0.3} minDistance={3} maxDistance={12} />
    </>
  );
}

// ── Info panel ──────────────────────────────────────────────────────────────

function ContactPanel({ contact, onClose }: { contact: Contact; onClose: () => void }) {
  const color = roleColor(contact.role);
  return (
    <div
      className="absolute left-1/2 bottom-4 -translate-x-1/2 z-20 w-72 pointer-events-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="rounded-xl p-4 shadow-2xl border"
        style={{ background: "rgba(5,8,20,0.93)", backdropFilter: "blur(16px)", borderColor: `${color}40` }}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
            <span className="text-[13px] font-semibold text-white">{contact.name ?? "Unknown"}</span>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors text-sm">✕</button>
        </div>
        {contact.role && <div className="text-[11px] text-white/50 mb-0.5">{contact.role}</div>}
        {contact.org && <div className="text-[11px] text-white/40">{contact.org}</div>}
        {contact.confidence != null && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${contact.confidence}%`, background: color }} />
            </div>
            <span className="text-[10px] text-white/40">{contact.confidence}% confidence</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Legend ──────────────────────────────────────────────────────────────────

const LEGEND = [
  { label: "Coach", color: "#B9FF4A" },
  { label: "Agent / Manager", color: "#C8BDFF" },
  { label: "Sponsor", color: "#F59E0B" },
  { label: "Federation / Org", color: "#60A5FA" },
  { label: "Media", color: "#F472B6" },
];

// ── Public component ────────────────────────────────────────────────────────

interface RelationshipGraph3DProps {
  contacts: Contact[];
  athleteName: string;
}

export function RelationshipGraph3D({ contacts, athleteName }: RelationshipGraph3DProps) {
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const selectedContact = contacts.find((c) => c.id === selectedId) ?? null;

  if (contacts.length === 0) return null;

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-[rgba(200,189,255,0.12)]" style={{ height: 440 }}>
      <Canvas camera={{ position: [0, 2, 7], fov: 55 }} dpr={[1, 2]}>
        <Suspense fallback={null}>
          <GraphScene
            contacts={contacts}
            athleteName={athleteName}
            selectedId={selectedId}
            onSelect={(id) => setSelectedId((prev) => (prev === id ? null : id))}
          />
        </Suspense>
      </Canvas>

      {selectedContact && (
        <ContactPanel contact={selectedContact} onClose={() => setSelectedId(null)} />
      )}

      {/* Legend */}
      <div className="absolute top-3 right-3 flex flex-col gap-1 pointer-events-none">
        {LEGEND.map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: l.color }} />
            <span className="text-[9px] text-white/40">{l.label}</span>
          </div>
        ))}
      </div>

      <div className="absolute top-3 left-3 text-[10px] text-white/30 pointer-events-none select-none">
        Click a node · drag to rotate
      </div>
    </div>
  );
}
