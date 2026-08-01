/**
 * HeroFlipCard — 3D flip card for the dossier hero.
 * Front: portrait + name + sport + nationality
 * Back: confidence, agent status, last updated
 * Built with CSS 3D transforms + framer-motion (no R3F needed here).
 */
import React, { useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Clock, Activity } from "lucide-react";

interface HeroFlipCardProps {
  name: string;
  sport?: string;
  nationality?: string;
  avatarUrl?: string;
  initials: string;
  confidence?: number;
  agentStatus?: string;
  lastCrawledAt?: string;
  intelligenceCount?: number;
}

export function HeroFlipCard({
  name,
  sport,
  nationality,
  avatarUrl,
  initials,
  confidence,
  agentStatus,
  lastCrawledAt,
  intelligenceCount,
}: HeroFlipCardProps) {
  const [flipped, setFlipped] = useState(false);
  const [imgError, setImgError] = useState(false);

  const lastUpdated = lastCrawledAt
    ? new Date(lastCrawledAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Never";

  const conf = confidence ?? 0;
  const confColor =
    conf >= 85 ? "#B9FF4A" : conf >= 70 ? "#D97706" : "#E75D50";

  return (
    <div
      style={{ perspective: 900, width: 88, height: 88 }}
      className="shrink-0 cursor-pointer"
      onMouseEnter={() => setFlipped(true)}
      onMouseLeave={() => setFlipped(false)}
    >
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.55, ease: [0.23, 1, 0.32, 1] }}
        style={{ transformStyle: "preserve-3d", width: "100%", height: "100%", position: "relative" }}
      >
        {/* Front face */}
        <div
          style={{ backfaceVisibility: "hidden" }}
          className="absolute inset-0 rounded-2xl overflow-hidden border border-[#DCE2EF] shadow-md flex items-center justify-center text-2xl font-bold text-white bg-gradient-to-br from-[#E75D50] to-[#C84840]"
        >
          {avatarUrl && !imgError ? (
            <img
              src={avatarUrl}
              alt={name}
              loading="lazy"
              className="w-full h-full object-cover object-top"
              onError={() => setImgError(true)}
            />
          ) : (
            <span className="select-none">{initials}</span>
          )}
        </div>

        {/* Back face */}
        <div
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            background: "linear-gradient(135deg, #0d1c3a 0%, #1a2e50 100%)",
          }}
          className="absolute inset-0 rounded-2xl border border-[rgba(255,255,255,0.12)] shadow-lg flex flex-col items-center justify-center gap-1.5 p-2"
        >
          {/* Confidence ring */}
          <div className="relative w-10 h-10 flex items-center justify-center">
            <svg width="40" height="40" viewBox="0 0 40 40" className="absolute inset-0">
              <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
              <circle
                cx="20" cy="20" r="16"
                fill="none"
                stroke={confColor}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 16}`}
                strokeDashoffset={`${2 * Math.PI * 16 * (1 - conf / 100)}`}
                style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
              />
            </svg>
            <span className="text-[9px] font-bold" style={{ color: confColor }}>{conf}%</span>
          </div>

          <div className="flex items-center gap-1">
            <div className={`w-1.5 h-1.5 rounded-full ${agentStatus === "active" ? "bg-[#10b981]" : "bg-gray-500"}`} />
            <span className="text-[8px] font-medium text-white/60">
              {agentStatus === "active" ? "Active" : "Paused"}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Clock size={7} className="text-white/40" />
            <span className="text-[7px] text-white/40 leading-none">{lastUpdated}</span>
          </div>

          {intelligenceCount != null && (
            <div className="flex items-center gap-1">
              <Activity size={7} className="text-white/40" />
              <span className="text-[7px] text-white/40">{intelligenceCount} items</span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
