/**
 * DsBadge — category/status label pill.
 * Wraps the canonical category colour tokens so every badge looks consistent.
 */
import React from "react";
import { T, CATEGORY_TOKENS } from "@/lib/tokens";

export type BadgeVariant =
  | "results"
  | "media"
  | "sponsorships"
  | "career"
  | "lime"
  | "lavender"
  | "muted"
  | "danger";

const VARIANT_MAP: Record<BadgeVariant, { bg: string; border: string; text: string }> = {
  results:      T.catResults,
  media:        T.catMedia,
  sponsorships: T.catSponsorships,
  career:       T.catCareer,
  lime:         { bg: T.bgHighlight,             border: T.borderLime,    text: T.lime },
  lavender:     { bg: "rgba(200,189,255,0.10)",   border: T.borderLavender, text: T.lavender },
  muted:        { bg: "rgba(255,255,255,0.06)",   border: T.borderSubtle,  text: T.t40 },
  danger:       { bg: "rgba(248,113,113,0.12)",   border: "rgba(248,113,113,0.30)", text: "#f87171" },
};

export interface DsBadgeProps {
  variant?: BadgeVariant;
  /** Convenience: pass an API category key (e.g. "results_rankings") to auto-resolve */
  category?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function DsBadge({ variant, category, children, icon, className }: DsBadgeProps) {
  let tokens: { bg: string; border: string; text: string } = VARIANT_MAP.muted;

  if (category && CATEGORY_TOKENS[category]) {
    const cat = CATEGORY_TOKENS[category];
    tokens = { bg: cat.bg, border: cat.border, text: cat.text };
  } else if (variant) {
    tokens = VARIANT_MAP[variant];
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${className ?? ""}`}
      style={{ background: tokens.bg, border: `1px solid ${tokens.border}`, color: tokens.text }}
    >
      {icon}
      {children}
    </span>
  );
}

/** DsStatusDot — a small coloured circle for status indicators */
export function DsStatusDot({ color, pulse = false }: { color: string; pulse?: boolean }) {
  return (
    <span
      className={`w-2 h-2 rounded-full shrink-0 ${pulse ? "animate-pulse" : ""}`}
      style={{ background: color }}
    />
  );
}
