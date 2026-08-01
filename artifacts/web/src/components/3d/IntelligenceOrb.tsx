/**
 * IntelligenceOrb — animated R3F orb for the ChatPage.
 * Idle: gentle pulsing sphere with ambient particles.
 * Active (streaming): particles stream inward, orb glows brighter.
 * Complete: brief burst, then dims to standby.
 */
import React, { useRef, useMemo, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ── Particle system ──────────────────────────────────────────────────────────

function ParticleField({ active, count = 180 }: { active: boolean; count?: number }) {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, velocities, phases } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = 1.5 + Math.random() * 1.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      velocities[i * 3] = (Math.random() - 0.5) * 0.02;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.02;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
      phases[i] = Math.random() * Math.PI * 2;
    }
    return { positions, velocities, phases };
  }, [count]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions.slice(), 3));
    return geo;
  }, []);

  useFrame((state) => {
    if (!pointsRef.current) return;
    const t = state.clock.elapsedTime;
    const pos = pointsRef.current.geometry.attributes.position;
    const arr = pos.array as Float32Array;
    const orig = positions;

    for (let i = 0; i < count; i++) {
      const ox = orig[i * 3];
      const oy = orig[i * 3 + 1];
      const oz = orig[i * 3 + 2];
      const len = Math.sqrt(ox * ox + oy * oy + oz * oz);

      if (active) {
        // Stream inward
        arr[i * 3] += (-ox * 0.012) + Math.sin(t + phases[i]) * 0.008;
        arr[i * 3 + 1] += (-oy * 0.012) + Math.cos(t * 0.8 + phases[i]) * 0.008;
        arr[i * 3 + 2] += (-oz * 0.012);
        // Reset when close to center
        const cx = arr[i * 3], cy = arr[i * 3 + 1], cz = arr[i * 3 + 2];
        if (Math.sqrt(cx * cx + cy * cy + cz * cz) < 0.15) {
          arr[i * 3] = ox;
          arr[i * 3 + 1] = oy;
          arr[i * 3 + 2] = oz;
        }
      } else {
        // Gentle drift
        arr[i * 3] = ox + Math.sin(t * 0.4 + phases[i]) * 0.18;
        arr[i * 3 + 1] = oy + Math.cos(t * 0.35 + phases[i] * 1.3) * 0.18;
        arr[i * 3 + 2] = oz + Math.sin(t * 0.3 + phases[i] * 0.7) * 0.12;
      }
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        size={active ? 0.028 : 0.018}
        color={active ? "#B9FF4A" : "#C8BDFF"}
        transparent
        opacity={active ? 0.85 : 0.45}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

// ── Core orb ─────────────────────────────────────────────────────────────────

function OrbCore({ active, phase }: { active: boolean; phase?: string | null }) {
  const coreRef = useRef<THREE.Mesh>(null);
  const outerRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    const t = Date.now() * 0.001;
    if (coreRef.current) {
      const pulse = active
        ? 1 + Math.sin(t * 4) * 0.12
        : 1 + Math.sin(t * 1.2) * 0.05;
      coreRef.current.scale.setScalar(pulse);
      (coreRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        active ? 1.8 + Math.sin(t * 3) * 0.5 : 0.6 + Math.sin(t * 1) * 0.2;
    }
    if (outerRef.current) {
      outerRef.current.rotation.y += delta * (active ? 1.2 : 0.4);
      outerRef.current.rotation.x += delta * (active ? 0.7 : 0.2);
      (outerRef.current.material as THREE.MeshStandardMaterial).opacity =
        active ? 0.18 + Math.sin(t * 2) * 0.05 : 0.08 + Math.sin(t) * 0.02;
    }
  });

  return (
    <>
      {/* Inner core */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.38, 32, 32]} />
        <meshStandardMaterial
          color={active ? "#B9FF4A" : "#293055"}
          emissive={active ? "#B9FF4A" : "#344F9F"}
          emissiveIntensity={active ? 1.8 : 0.6}
          roughness={0.15}
          metalness={0.6}
        />
      </mesh>

      {/* Outer shell */}
      <mesh ref={outerRef}>
        <sphereGeometry args={[0.55, 24, 24]} />
        <meshStandardMaterial
          color={active ? "#B9FF4A" : "#C8BDFF"}
          emissive={active ? "#B9FF4A" : "#7C6FFF"}
          emissiveIntensity={0.4}
          transparent
          opacity={0.1}
          roughness={0.3}
          wireframe
        />
      </mesh>
    </>
  );
}

// ── Scene ─────────────────────────────────────────────────────────────────────

function OrbScene({ active, phase }: { active: boolean; phase?: string | null }) {
  return (
    <>
      <color attach="background" args={["#050808"]} />
      <ambientLight intensity={0.2} />
      <pointLight position={[0, 0, 2]} intensity={active ? 2 : 0.8} color={active ? "#B9FF4A" : "#C8BDFF"} />
      <pointLight position={[0, 2, -1]} intensity={0.4} color="#344F9F" />

      <OrbCore active={active} phase={phase} />
      <ParticleField active={active} count={active ? 240 : 140} />
    </>
  );
}

// ── Public component ──────────────────────────────────────────────────────────

interface IntelligenceOrbProps {
  active: boolean;
  phase?: string | null;
  size?: number;
}

export function IntelligenceOrb({ active, phase, size = 100 }: IntelligenceOrbProps) {
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full overflow-hidden"
      title={active ? phase ?? "Analysing…" : "AI Analyst — idle"}
    >
      <Canvas camera={{ position: [0, 0, 2.5], fov: 45 }} dpr={[1, 2]}>
        <Suspense fallback={null}>
          <OrbScene active={active} phase={phase} />
        </Suspense>
      </Canvas>
    </div>
  );
}
