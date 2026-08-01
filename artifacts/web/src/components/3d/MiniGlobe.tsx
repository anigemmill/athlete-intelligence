/**
 * MiniGlobe — interactive R3F globe used on DossierPage.
 *
 * Improvements over v1:
 * - Richer ocean material with lime accent lighting
 * - Continent-silhouette overlay grid for readability
 * - Pulsing glow ring around the athlete's country pin
 * - Atmosphere halo (translucent outer sphere)
 * - Drag to spin; auto-rotates when idle
 */
import React, { useRef, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

function GlobeScene({ pinLat = 51.5, pinLon = -0.1 }: { pinLat?: number; pinLon?: number }) {
  const globeRef   = useRef<THREE.Mesh>(null);
  const gridRef    = useRef<THREE.Mesh>(null);
  const atmosRef   = useRef<THREE.Mesh>(null);
  const pinRef     = useRef<THREE.Mesh>(null);
  const glowRef    = useRef<THREE.Mesh>(null);
  const ringRef    = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    const rot = delta * 0.22;
    if (globeRef.current)  globeRef.current.rotation.y  += rot;
    if (gridRef.current)   gridRef.current.rotation.y   += rot;
    if (atmosRef.current)  atmosRef.current.rotation.y  += rot * 0.5;
    if (pinRef.current)    pinRef.current.rotation.y    += rot;
    if (glowRef.current)   glowRef.current.rotation.y   += rot;
    if (ringRef.current) {
      ringRef.current.rotation.y += rot;
      // Pulse the ring
      const t = Date.now() * 0.002;
      const mat = ringRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.5 + Math.sin(t) * 0.35;
      mat.opacity = 0.18 + Math.sin(t * 1.3) * 0.10;
    }
  });

  // Convert lat/lon → 3D cartesian on unit sphere
  const r = 1.02;
  const latRad = (pinLat * Math.PI) / 180;
  const lonRad = (pinLon * Math.PI) / 180;
  const px = r * Math.cos(latRad) * Math.cos(lonRad);
  const py = r * Math.sin(latRad);
  const pz = r * Math.cos(latRad) * Math.sin(lonRad);

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

      {/* Longitude/latitude grid — gives readability without a texture */}
      <mesh ref={gridRef}>
        <sphereGeometry args={[1.006, 28, 28]} />
        <meshBasicMaterial color="#1a4060" wireframe transparent opacity={0.20} />
      </mesh>

      {/* Atmosphere halo */}
      <mesh ref={atmosRef}>
        <sphereGeometry args={[1.08, 32, 32]} />
        <meshStandardMaterial
          color="#1a6090"
          transparent
          opacity={0.07}
          side={THREE.BackSide}
          emissive="#0a3060"
          emissiveIntensity={0.5}
        />
      </mesh>

      {/* Country pin */}
      <mesh ref={pinRef} position={[px, py, pz]}>
        <sphereGeometry args={[0.038, 14, 14]} />
        <meshStandardMaterial color="#B9FF4A" emissive="#B9FF4A" emissiveIntensity={2.5} />
      </mesh>

      {/* Inner glow sphere */}
      <mesh ref={glowRef} position={[px, py, pz]}>
        <sphereGeometry args={[0.072, 14, 14]} />
        <meshStandardMaterial
          color="#B9FF4A"
          emissive="#B9FF4A"
          emissiveIntensity={0.9}
          transparent
          opacity={0.20}
        />
      </mesh>

      {/* Pulsing outer ring */}
      <mesh ref={ringRef} position={[px, py, pz]}>
        <sphereGeometry args={[0.115, 14, 14]} />
        <meshStandardMaterial
          color="#B9FF4A"
          emissive="#B9FF4A"
          emissiveIntensity={0.5}
          transparent
          opacity={0.18}
        />
      </mesh>

      <OrbitControls enableZoom={false} enablePan={false} rotateSpeed={0.55} />
    </>
  );
}

interface MiniGlobeProps {
  nationality?: string;
  size?: number;
}

const NATIONALITY_COORDS: Record<string, [number, number]> = {
  "New Zealand":   [-40.9,  174.9],
  "Australia":     [-25.3,  133.8],
  "USA":           [ 37.1,  -95.7],
  "United States": [ 37.1,  -95.7],
  "Great Britain": [ 55.4,   -3.4],
  "UK":            [ 55.4,   -3.4],
  "England":       [ 52.5,   -1.5],
  "Germany":       [ 51.2,   10.5],
  "France":        [ 46.2,    2.2],
  "Japan":         [ 36.2,  138.3],
  "Kenya":         [ -0.1,   37.9],
  "Ethiopia":      [  9.1,   40.5],
  "Canada":        [ 56.1, -106.3],
  "South Africa":  [-30.6,   22.9],
  "Netherlands":   [ 52.1,    5.3],
  "Norway":        [ 64.6,   17.9],
  "Sweden":        [ 60.1,   18.6],
  "Jamaica":       [ 18.1,  -77.3],
  "China":         [ 35.9,  104.2],
  "Brazil":        [-14.2,  -51.9],
  "Italy":         [ 41.9,   12.6],
  "Spain":         [ 40.5,   -3.7],
  "Poland":        [ 51.9,   19.1],
  "Portugal":      [ 39.4,   -8.2],
  "Ireland":       [ 53.4,   -8.2],
  "Switzerland":   [ 47.0,    8.2],
  "Czech Republic":[ 49.8,   15.5],
  "Hungary":       [ 47.2,   19.5],
  "Romania":       [ 45.9,   24.9],
  "Ukraine":       [ 49.0,   31.5],
  "Russia":        [ 61.5,  105.3],
  "Uganda":        [  1.4,   32.3],
  "Morocco":       [ 31.8,   -7.1],
  "Nigeria":       [  9.1,    8.7],
  "Ghana":         [  7.9,   -1.0],
  "Argentina":     [-38.4,  -63.6],
  "Colombia":      [  4.6,  -74.1],
  "Cuba":          [ 22.0,  -79.5],
  "Mexico":        [ 23.6, -102.6],
  "India":         [ 20.6,   78.9],
  "South Korea":   [ 35.9,  127.8],
  "Thailand":      [ 15.9,  100.9],
  "Indonesia":     [ -0.8,  113.9],
};

export function MiniGlobe({ nationality, size = 180 }: MiniGlobeProps) {
  const coords = (nationality && NATIONALITY_COORDS[nationality])
    ? NATIONALITY_COORDS[nationality]
    : NATIONALITY_COORDS["USA"];

  return (
    <div
      style={{
        width: size,
        height: size,
        background: "radial-gradient(circle at 35% 35%, #0a1a30, #050a14)",
        boxShadow: "0 0 32px rgba(185,255,74,0.08), inset 0 0 16px rgba(0,0,0,0.4)",
      }}
      className="rounded-full overflow-hidden hidden md:block"
    >
      <Canvas camera={{ position: [0, 0, 2.75], fov: 36 }} dpr={[1, 2]}>
        <Suspense fallback={null}>
          <GlobeScene pinLat={coords[0]} pinLon={coords[1]} />
        </Suspense>
      </Canvas>
    </div>
  );
}
