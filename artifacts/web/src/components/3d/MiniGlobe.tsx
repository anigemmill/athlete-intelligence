/**
 * MiniGlobe — a small interactive R3F globe with a glowing pin.
 * Shows a slowly rotating sphere; user can drag to spin.
 */
import React, { useRef, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sphere } from "@react-three/drei";
import * as THREE from "three";

function GlobeScene({ pinLat = 51.5, pinLon = -0.1 }: { pinLat?: number; pinLon?: number }) {
  const globeRef = useRef<THREE.Mesh>(null);
  const pinRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  // Auto-rotate
  useFrame((_, delta) => {
    if (globeRef.current) globeRef.current.rotation.y += delta * 0.25;
    if (pinRef.current) pinRef.current.rotation.y += delta * 0.25;
    if (glowRef.current) {
      glowRef.current.rotation.y += delta * 0.25;
      const t = Date.now() * 0.002;
      (glowRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.6 + Math.sin(t) * 0.3;
    }
  });

  // Convert lat/lon to 3D point on unit sphere (radius ~1)
  const r = 1.02;
  const latRad = (pinLat * Math.PI) / 180;
  const lonRad = (pinLon * Math.PI) / 180;
  const px = r * Math.cos(latRad) * Math.cos(lonRad);
  const py = r * Math.sin(latRad);
  const pz = r * Math.cos(latRad) * Math.sin(lonRad);

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 3, 3]} intensity={0.8} />
      <pointLight position={[-2, -2, 2]} intensity={0.3} color="#B9FF4A" />

      {/* Globe */}
      <mesh ref={globeRef}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshStandardMaterial
          color="#0a1628"
          roughness={0.7}
          metalness={0.1}
          emissive="#071020"
          emissiveIntensity={0.5}
          wireframe={false}
        />
      </mesh>

      {/* Grid overlay — wireframe sphere slightly larger */}
      <mesh ref={globeRef}>
        <sphereGeometry args={[1.005, 24, 24]} />
        <meshBasicMaterial color="#1a3a5c" wireframe transparent opacity={0.25} />
      </mesh>

      {/* Pin dot */}
      <mesh ref={pinRef} position={[px, py, pz]}>
        <sphereGeometry args={[0.035, 12, 12]} />
        <meshStandardMaterial color="#B9FF4A" emissive="#B9FF4A" emissiveIntensity={1.5} />
      </mesh>

      {/* Glow ring around pin */}
      <mesh ref={glowRef} position={[px, py, pz]}>
        <sphereGeometry args={[0.065, 12, 12]} />
        <meshStandardMaterial
          color="#B9FF4A"
          emissive="#B9FF4A"
          emissiveIntensity={0.6}
          transparent
          opacity={0.25}
        />
      </mesh>

      <OrbitControls enableZoom={false} enablePan={false} rotateSpeed={0.6} />
    </>
  );
}

interface MiniGlobeProps {
  nationality?: string;
  size?: number;
}

// Very rough nationality → lat/lon lookup
const NATIONALITY_COORDS: Record<string, [number, number]> = {
  "New Zealand": [-40.9, 174.9],
  "Australia": [-25.3, 133.8],
  "USA": [37.1, -95.7],
  "Great Britain": [55.4, -3.4],
  "UK": [55.4, -3.4],
  "Germany": [51.2, 10.5],
  "France": [46.2, 2.2],
  "Japan": [36.2, 138.3],
  "Kenya": [-0.1, 37.9],
  "Ethiopia": [9.1, 40.5],
  "Canada": [56.1, -106.3],
  "South Africa": [-30.6, 22.9],
  "Netherlands": [52.1, 5.3],
  "Norway": [64.6, 17.9],
  "Sweden": [60.1, 18.6],
  "Jamaica": [18.1, -77.3],
  "China": [35.9, 104.2],
  "Brazil": [-14.2, -51.9],
  "Italy": [41.9, 12.6],
  "Spain": [40.5, -3.7],
};

export function MiniGlobe({ nationality, size = 180 }: MiniGlobeProps) {
  const coords = nationality
    ? NATIONALITY_COORDS[nationality] ?? NATIONALITY_COORDS["USA"]
    : NATIONALITY_COORDS["USA"];

  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full overflow-hidden bg-[#050a14] hidden md:block"
    >
      <Canvas camera={{ position: [0, 0, 2.8], fov: 35 }} dpr={[1, 2]}>
        <Suspense fallback={null}>
          <GlobeScene pinLat={coords[0]} pinLon={coords[1]} />
        </Suspense>
      </Canvas>
    </div>
  );
}
