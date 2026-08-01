/**
 * TiltCard — CSS perspective tilt that tracks pointer position.
 * No Three.js needed; pure framer-motion transforms.
 */
import React, { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  intensity?: number; // degrees max tilt, default 8
}

export function TiltCard({ children, className = "", intensity = 8 }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const rawGX = useMotionValue(50);
  const rawGY = useMotionValue(50);

  const rotateX = useSpring(useTransform(rawY, [-0.5, 0.5], [intensity, -intensity]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(rawX, [-0.5, 0.5], [-intensity, intensity]), { stiffness: 300, damping: 30 });
  const glareX = useSpring(rawGX, { stiffness: 300, damping: 30 });
  const glareY = useSpring(rawGY, { stiffness: 300, damping: 30 });

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    rawX.set(x);
    rawY.set(y);
    rawGX.set(((e.clientX - rect.left) / rect.width) * 100);
    rawGY.set(((e.clientY - rect.top) / rect.height) * 100);
  };

  const handleLeave = () => {
    rawX.set(0);
    rawY.set(0);
    rawGX.set(50);
    rawGY.set(50);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
        perspective: 800,
      }}
      className={`relative ${className}`}
    >
      {children}
      {/* Specular highlight */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-inherit"
        style={{
          background: useTransform(
            [glareX, glareY],
            ([gx, gy]) =>
              `radial-gradient(circle at ${gx}% ${gy}%, rgba(255,255,255,0.12) 0%, transparent 60%)`
          ),
        }}
      />
    </motion.div>
  );
}
