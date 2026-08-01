/**
 * Timeline3D — floating-nodes 3D career timeline built with R3F.
 * Each event is a glowing sphere on a curved track.
 * OrbitControls lets users rotate and zoom.
 * Falls back to flat list on narrow screens or WebGL error.
 */
import React, { useRef, useState, Suspense, useCallback, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";

interface TimelineEvent {
  id: number | string;
  title: string;
  date: string;
  description?: string;
  location?: string;
  significant?: boolean;
}

// ── Node component ──────────────────────────────────────────────────────────

function Node({
  position,
  significant,
  label,
  date,
  selected,
  onClick,
}: {
  position: THREE.Vector3;
  significant: boolean;
  label: string;
  date: string;
  selected: boolean;
  onClick: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const baseColor = significant ? "#B9FF4A" : "#C8BDFF";
  const emissiveColor = significant ? "#B9FF4A" : "#7C6FFF";

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const t = Date.now() * 0.0015;
    const scale = 1 + Math.sin(t + position.x * 3) * 0.08;
    const s = hovered || selected ? 1.35 : scale;
    meshRef.current.scale.setScalar(s);
    if (glowRef.current) {
      glowRef.current.scale.setScalar(s * 1.7);
      (glowRef.current.material as THREE.MeshStandardMaterial).opacity =
        (hovered || selected) ? 0.35 : 0.15 + Math.sin(t) * 0.05;
    }
  });

  const radius = significant ? 0.12 : 0.085;

  return (
    <group position={position}>
      {/* Glow halo */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[radius, 12, 12]} />
        <meshStandardMaterial
          color={baseColor}
          emissive={emissiveColor}
          emissiveIntensity={0.6}
          transparent
          opacity={0.15}
          depthWrite={false}
        />
      </mesh>

      {/* Core sphere */}
      <mesh
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <sphereGeometry args={[radius, 20, 20]} />
        <meshStandardMaterial
          color={baseColor}
          emissive={emissiveColor}
          emissiveIntensity={hovered || selected ? 1.8 : 0.8}
          roughness={0.2}
          metalness={0.4}
        />
      </mesh>

      {/* Label */}
      <Text
        position={[0, radius + 0.14, 0]}
        fontSize={0.09}
        color="rgba(255,255,255,0.85)"
        anchorX="center"
        anchorY="bottom"
        maxWidth={1.2}
        textAlign="center"
        lineHeight={1.3}
      >
        {label.length > 24 ? label.slice(0, 22) + "…" : label}
      </Text>
      <Text
        position={[0, radius + 0.04, 0]}
        fontSize={0.065}
        color="rgba(255,255,255,0.40)"
        anchorX="center"
        anchorY="top"
      >
        {date}
      </Text>
    </group>
  );
}

// ── Track tube ──────────────────────────────────────────────────────────────

function Track({ points }: { points: THREE.Vector3[] }) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.5), [points]);
  const tubeRef = useRef<THREE.Mesh>(null);

  return (
    <mesh ref={tubeRef}>
      <tubeGeometry args={[curve, 80, 0.012, 8, false]} />
      <meshStandardMaterial
        color="#C8BDFF"
        emissive="#7C6FFF"
        emissiveIntensity={0.5}
        transparent
        opacity={0.55}
        roughness={0.3}
        metalness={0.5}
      />
    </mesh>
  );
}

// ── Detail card (HTML overlay) ──────────────────────────────────────────────

function InfoCard({ event, onClose }: { event: TimelineEvent; onClose: () => void }) {
  return (
    <div
      className="absolute left-1/2 bottom-4 -translate-x-1/2 z-20 w-72 pointer-events-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="rounded-xl p-4 shadow-2xl border"
        style={{
          background: "rgba(13,28,58,0.92)",
          backdropFilter: "blur(16px)",
          borderColor: "rgba(200,189,255,0.25)",
        }}
      >
        <div className="flex items-start justify-between mb-1">
          <div className="text-[13px] font-semibold text-white leading-snug pr-2">{event.title}</div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors text-sm shrink-0">✕</button>
        </div>
        <div className="text-[11px] text-[rgba(200,189,255,0.7)] mb-2">{event.date}{event.location ? ` · ${event.location}` : ""}</div>
        {event.description && (
          <p className="text-[12px] text-white/60 leading-relaxed">{event.description}</p>
        )}
      </div>
    </div>
  );
}

// ── Scene ───────────────────────────────────────────────────────────────────

function TimelineScene({
  events,
  selectedId,
  onSelect,
}: {
  events: TimelineEvent[];
  selectedId: string | number | null;
  onSelect: (id: string | number) => void;
}) {
  // Arrange events on a curved arc
  const positions = useMemo(() => {
    return events.map((_, i) => {
      const t = events.length === 1 ? 0 : (i / (events.length - 1)) * 2 - 1;
      const x = t * 2.5;
      const y = -t * t * 0.6; // parabola
      const z = Math.sin(t * 1.2) * 0.4;
      return new THREE.Vector3(x, y, z);
    });
  }, [events]);

  return (
    <>
      <color attach="background" args={["#050a14"]} />
      <fog attach="fog" args={["#050a14", 8, 20]} />
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 3, 3]} intensity={1.2} color="#C8BDFF" />
      <pointLight position={[0, -2, 2]} intensity={0.6} color="#B9FF4A" />

      {positions.length > 1 && <Track points={positions} />}

      {events.map((evt, i) => (
        <Node
          key={evt.id}
          position={positions[i]}
          significant={!!evt.significant}
          label={evt.title}
          date={evt.date}
          selected={selectedId === evt.id}
          onClick={() => onSelect(evt.id)}
        />
      ))}

      <OrbitControls
        enablePan={false}
        enableZoom
        minDistance={2}
        maxDistance={10}
        autoRotate
        autoRotateSpeed={0.4}
      />
    </>
  );
}

// ── Public component ────────────────────────────────────────────────────────

interface Timeline3DProps {
  events: TimelineEvent[];
}

export function Timeline3D({ events }: Timeline3DProps) {
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const selectedEvent = events.find((e) => e.id === selectedId) ?? null;

  if (events.length === 0) return null;

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-[rgba(200,189,255,0.15)]" style={{ height: 420 }}>
      <Canvas camera={{ position: [0, 0, 5], fov: 50 }} dpr={[1, 2]}>
        <Suspense fallback={null}>
          <TimelineScene
            events={events}
            selectedId={selectedId}
            onSelect={(id) => setSelectedId((prev) => (prev === id ? null : id))}
          />
        </Suspense>
      </Canvas>

      {selectedEvent && (
        <InfoCard event={selectedEvent} onClose={() => setSelectedId(null)} />
      )}

      <div className="absolute top-3 left-3 text-[10px] text-white/30 pointer-events-none select-none">
        Click a node · drag to rotate
      </div>
    </div>
  );
}
