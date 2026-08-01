---
name: Contrast and design token floor rules
description: The approved text opacity scale, border minimums, and token file location for the Athlete Intelligence design system.
---

# Contrast & Design Token Floor Rules

## Text opacity scale (Tailwind / inline styles)
Use ONLY these named levels — never arbitrary values like `/37` or `rgba(x,x,x,0.47)`:

| Token | Opacity | Use case |
|-------|---------|----------|
| `T.t92` | 0.92 | Headings, primary labels |
| `T.t70` | 0.70 | Important body text, hero subtitles |
| `T.t55` | 0.55 | Body / descriptions |
| `T.t40` | 0.40 | Muted / secondary / metadata |
| `T.t28` | 0.28 | Ghost / decorative background numbers |

**Minimum readable body text**: T55 (`rgba(255,255,255,0.55)`)
**Minimum decorative/background typography**: T28 (`rgba(255,255,255,0.28)`)

## Border opacity scale
| Token | Opacity | Use case |
|-------|---------|----------|
| `T.borderDefault` | 0.09 | Standard card/section borders |
| `T.borderSubtle` | 0.07 | Internal dividers |
| `T.borderStrong` | 0.15 | Hover / focus emphasis |
| `T.borderDivider` | 0.08 | Section dividers |

**Minimum border opacity**: 0.08 (T.borderDivider)

## Design tokens file
All tokens live in `artifacts/web/src/lib/tokens.ts`. Import `{ T }` and reference named constants. Never hard-code arbitrary rgba values in component code.

## Reusable DS components
Located in `artifacts/web/src/components/ui/ds/`:
- `DsCard` / `DsCardHeader` — standard dark surface card
- `DsBadge` / `DsStatusDot` — category/status badges
- `DsEmptyState` / `DsLoadingSkeleton` — empty/loading states
- `DsMetric` — KPI stat card (accent top border support)
Barrel export from `@/components/ui/ds`.

## Why
The contrast audit (late July 2026) found that arbitrary opacity values throughout the codebase caused near-zero contrast on the `#0D1C0B` dark green background. Lime (`#B9FF4A`) at 15% opacity has similar luminance to the background, making it nearly invisible. The floor rules above prevent this from recurring.

## How to apply
Before adding any text colour or border, check the scale above. If the desired opacity isn't in the scale, pick the nearest approved level. If a brand-new semantic role is needed, add it to `tokens.ts` with a descriptive name.
