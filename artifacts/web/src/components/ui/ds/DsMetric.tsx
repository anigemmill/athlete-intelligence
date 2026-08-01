/**
 * DsMetric — stat / KPI card used in dashboard and dossier summary rows.
 */
import React from "react";
import { T } from "@/lib/tokens";
import { DsCard } from "./DsCard";

export interface DsMetricProps {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
  /** Highlight the card with a lime accent (e.g. primary metric) */
  accent?: "lime" | "lavender" | "amber" | "red" | "none";
  /** Make the card clickable */
  onClick?: () => void;
}

const ACCENT_COLORS: Record<NonNullable<DsMetricProps["accent"]>, string> = {
  lime:     T.lime,
  lavender: T.lavender,
  amber:    "#fbbf24",
  red:      "#f87171",
  none:     "transparent",
};

export function DsMetric({ label, value, sub, icon, accent = "none", onClick }: DsMetricProps) {
  const accentColor = ACCENT_COLORS[accent];

  return (
    <DsCard
      interactive={!!onClick}
      onClick={onClick}
      className="relative overflow-hidden"
      padded={false}
    >
      {accent !== "none" && (
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: `linear-gradient(90deg, ${accentColor}60, ${accentColor}20)` }}
        />
      )}
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="text-[12px] font-medium uppercase tracking-wider" style={{ color: T.t40 }}>
            {label}
          </div>
          {icon && <span style={{ color: T.t40 }}>{icon}</span>}
        </div>
        <div
          className="text-[26px] font-bold tracking-tight leading-none mb-2"
          style={{ color: accent !== "none" ? accentColor : T.t92 }}
        >
          {value}
        </div>
        {sub && (
          <div className="text-[12px] flex items-center gap-1" style={{ color: T.t40 }}>
            {sub}
          </div>
        )}
      </div>
    </DsCard>
  );
}
