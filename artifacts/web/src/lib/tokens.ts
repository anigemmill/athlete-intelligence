/**
 * Athlete Intelligence — Design System Tokens
 *
 * Single source of truth for every colour, opacity, radius, shadow, and spacing
 * value used in the application. Import `T` and reference named tokens instead of
 * hard-coding arbitrary values.
 *
 * Text opacity scale — use these levels ONLY (never text-white/37 etc.):
 *   T.t92  headings / primary text
 *   T.t70  important body / hero subtitles
 *   T.t55  body / descriptions
 *   T.t40  muted / secondary / labels
 *   T.t28  ghost / decorative numbers (background typography)
 *
 * Border opacity scale:
 *   T.borderDefault   0.09  standard card/section borders
 *   T.borderSubtle    0.07  internal dividers
 *   T.borderStrong    0.15  hover / focus emphasis
 *   T.borderDivider   0.08  section dividers
 */

export const T = {

  // ── Backgrounds ─────────────────────────────────────────────────────────────
  bgPage:      "#0D1C0B",
  bgSidebar:   "#0B1809",
  bgCard:      "rgba(255,255,255,0.05)",
  bgCardHover: "rgba(255,255,255,0.07)",
  bgInput:     "rgba(255,255,255,0.06)",
  bgElevated:  "rgba(255,255,255,0.08)",
  bgHighlight: "rgba(185,255,74,0.08)",
  bgDanger:    "rgba(248,113,113,0.08)",

  // ── Borders ──────────────────────────────────────────────────────────────────
  borderDefault: "rgba(255,255,255,0.09)",
  borderSubtle:  "rgba(255,255,255,0.07)",
  borderStrong:  "rgba(255,255,255,0.15)",
  borderDivider: "rgba(255,255,255,0.08)",
  borderLime:    "rgba(185,255,74,0.30)",
  borderLavender:"rgba(200,189,255,0.30)",

  // ── Text ────────────────────────────────────────────────────────────────────
  t92: "rgba(255,255,255,0.92)",   // headings
  t70: "rgba(255,255,255,0.70)",   // important body / hero subtitles
  t55: "rgba(255,255,255,0.55)",   // body / descriptions
  t40: "rgba(255,255,255,0.40)",   // muted / secondary / labels
  t28: "rgba(255,255,255,0.28)",   // ghost / decorative numbers

  // ── Brand ───────────────────────────────────────────────────────────────────
  lime:      "#B9FF4A",
  limeFg:    "#0D1C0B",   // foreground text on lime backgrounds
  lavender:  "#C8BDFF",

  // ── Category colours (intelligence types) ────────────────────────────────────
  catResults:      { bg: "rgba(107,143,224,0.15)", border: "rgba(107,143,224,0.30)", text: "#6B8FE0" },
  catMedia:        { bg: "rgba(200,189,255,0.15)", border: "rgba(200,189,255,0.30)", text: "#C8BDFF" },
  catSponsorships: { bg: "rgba(74,222,128,0.15)",  border: "rgba(74,222,128,0.30)",  text: "#4ade80" },
  catCareer:       { bg: "rgba(251,191,36,0.15)",  border: "rgba(251,191,36,0.30)",  text: "#fbbf24" },

  // ── Status / semantic ────────────────────────────────────────────────────────
  statusFresh:  "#4ade80",   // data < 7 days old
  statusAging:  "#fbbf24",   // data 7–14 days old
  statusStale:  "#f87171",   // data > 14 days old
  statusActive: "#4ade80",
  statusPaused: "rgba(255,255,255,0.28)",
  statusAlert:  "#fbbf24",
  statusError:  "#f87171",

  // ── Radius ───────────────────────────────────────────────────────────────────
  radSm:   "8px",
  radMd:   "12px",
  radLg:   "16px",
  radXl:   "20px",
  radFull: "9999px",

  // ── Typography scale (font sizes) ────────────────────────────────────────────
  fzCaption: "11px",
  fzLabel:   "12px",
  fzBody:    "13px",
  fzBodyLg:  "14px",
  fzSubhead: "15px",
  fzTitle:   "18px",
  fzH3:      "20px",
  fzH2:      "24px",
  fzH1:      "32px",
  fzDisplay: "48px",

  // ── Shadows ──────────────────────────────────────────────────────────────────
  shadowLimeGlow: "0 4px 24px rgba(185,255,74,0.25)",
  shadowCard:     "0 2px 12px rgba(0,0,0,0.35)",
  shadowModal:    "0 24px 80px rgba(0,0,0,0.60)",

} as const;

// ── Category config (convenience map) ─────────────────────────────────────────
export const CATEGORY_TOKENS: Record<string, { bg: string; border: string; text: string; label: string }> = {
  results_rankings: { ...T.catResults,      label: "Results" },
  media_interviews: { ...T.catMedia,        label: "Media" },
  sponsorships:     { ...T.catSponsorships, label: "Sponsorships" },
  career_changes:   { ...T.catCareer,       label: "Career" },
};

// ── Data-freshness helper ─────────────────────────────────────────────────────
export function freshnessColor(lastCrawledAt: string | null | undefined): string {
  if (!lastCrawledAt) return T.statusStale;
  const days = (Date.now() - new Date(lastCrawledAt).getTime()) / 86_400_000;
  if (days < 7)  return T.statusFresh;
  if (days < 14) return T.statusAging;
  return T.statusStale;
}
