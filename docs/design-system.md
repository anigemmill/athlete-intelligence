# Athlete Intelligence — Design System

## Philosophy

The design system follows a **dark intelligence** aesthetic — a near-black deep green base (`#0D1C0B`) with a high-contrast lime accent (`#B9FF4A`). The visual language communicates trust, precision, and analytical depth appropriate for a professional sports intelligence platform.

All design values live in a **single source of truth**: `artifacts/web/src/lib/tokens.ts`. Import `{ T }` and reference named tokens. Never hard-code arbitrary rgba values in component code.

---

## Design Tokens (`T`)

```typescript
import { T } from '@/lib/tokens';
```

### Backgrounds

| Token | Value | Usage |
|---|---|---|
| `T.bgPage` | `#0D1C0B` | Root page background — deep forest green-black |
| `T.bgSidebar` | `#0B1809` | Sidebar — slightly darker than page |
| `T.bgCard` | `rgba(255,255,255,0.05)` | Standard card surface |
| `T.bgCardHover` | `rgba(255,255,255,0.07)` | Card hover state |
| `T.bgInput` | `rgba(255,255,255,0.06)` | Form inputs |
| `T.bgElevated` | `rgba(255,255,255,0.08)` | Elevated surfaces (modals, dropdowns) |
| `T.bgHighlight` | `rgba(185,255,74,0.08)` | Lime-tinted highlight surface |
| `T.bgDanger` | `rgba(248,113,113,0.08)` | Danger/error surface |

### Borders

| Token | Value | Usage |
|---|---|---|
| `T.borderDefault` | `rgba(255,255,255,0.09)` | Standard card / section borders |
| `T.borderSubtle` | `rgba(255,255,255,0.07)` | Internal dividers |
| `T.borderStrong` | `rgba(255,255,255,0.15)` | Hover / focus emphasis |
| `T.borderDivider` | `rgba(255,255,255,0.08)` | Section separators |
| `T.borderLime` | `rgba(185,255,74,0.30)` | Lime-accent borders |
| `T.borderLavender` | `rgba(200,189,255,0.30)` | Lavender-accent borders |

**Minimum border opacity: 0.08.** Never use borders below this threshold — they become invisible on the dark background.

### Text Opacity Scale

Use **only** these levels. Never use arbitrary opacities like `/37` or `rgba(255,255,255,0.47)`.

| Token | Opacity | Usage |
|---|---|---|
| `T.t92` | 0.92 | Headings, primary labels |
| `T.t70` | 0.70 | Important body text, hero subtitles |
| `T.t55` | 0.55 | Body / descriptions — **minimum for readable body text** |
| `T.t40` | 0.40 | Muted / secondary / metadata |
| `T.t28` | 0.28 | Ghost / decorative background numbers — **minimum overall** |

**Why this scale:** A contrast audit (July 2026) found that arbitrary opacity values caused near-invisible text on `#0D1C0B`. Lime at 15% opacity has similar luminance to the background, making it effectively invisible. These floor rules prevent that from recurring.

### Brand Colours

| Token | Value | Usage |
|---|---|---|
| `T.lime` | `#B9FF4A` | Primary brand accent — CTAs, active states, highlights |
| `T.limeFg` | `#0D1C0B` | Text on lime backgrounds (maintains contrast) |
| `T.lavender` | `#C8BDFF` | Secondary accent — media category, feature highlights |

### Intelligence Category Colours

Each intelligence category has a `{ bg, border, text }` triple.

| Category | Token | Text Colour | Use |
|---|---|---|---|
| Results & Rankings | `T.catResults` | `#6B8FE0` (steel blue) | Competition results, rankings |
| Media & Interviews | `T.catMedia` | `#C8BDFF` (lavender) | Press coverage, interviews |
| Sponsorships | `T.catSponsorships` | `#4ade80` (green) | Brand deals |
| Career Changes | `T.catCareer` | `#fbbf24` (amber) | Team changes, retirements |

Convenience map: `CATEGORY_TOKENS` keyed by category string, includes `label` for display.

### Status Colours

| Token | Value | Usage |
|---|---|---|
| `T.statusFresh` | `#4ade80` | Data < 7 days old |
| `T.statusAging` | `#fbbf24` | Data 7–14 days old |
| `T.statusStale` | `#f87171` | Data > 14 days old |
| `T.statusActive` | `#4ade80` | Active athlete/subscription |
| `T.statusPaused` | `rgba(255,255,255,0.28)` | Paused state |
| `T.statusAlert` | `#fbbf24` | Warning / alert |
| `T.statusError` | `#f87171` | Error state |

`freshnessColor(lastCrawledAt)` utility maps a crawl timestamp directly to a status colour.

### Border Radius

| Token | Value | Usage |
|---|---|---|
| `T.radSm` | `8px` | Small inputs, badges |
| `T.radMd` | `12px` | Cards, panels |
| `T.radLg` | `16px` | Large cards, modals |
| `T.radXl` | `20px` | Hero sections |
| `T.radFull` | `9999px` | Pills, avatars |

### Typography Scale

| Token | Value | Usage |
|---|---|---|
| `T.fzCaption` | `11px` | Metadata, timestamps |
| `T.fzLabel` | `12px` | Form labels, badges |
| `T.fzBody` | `13px` | Standard body text |
| `T.fzBodyLg` | `14px` | Larger body |
| `T.fzSubhead` | `15px` | Subheadings |
| `T.fzTitle` | `18px` | Card titles |
| `T.fzH3` | `20px` | Section headings |
| `T.fzH2` | `24px` | Page headings |
| `T.fzH1` | `32px` | Primary headings |
| `T.fzDisplay` | `48px` | Hero / display text |

**Font family:** System default (Tailwind base). No custom font is currently loaded — add via `@font-face` in `index.css` if needed.

### Shadows

| Token | Value | Usage |
|---|---|---|
| `T.shadowLimeGlow` | `0 4px 24px rgba(185,255,74,0.25)` | Active/selected state glow |
| `T.shadowCard` | `0 2px 12px rgba(0,0,0,0.35)` | Standard card shadow |
| `T.shadowModal` | `0 24px 80px rgba(0,0,0,0.60)` | Modal / overlay shadow |

---

## DS Components

Located at `artifacts/web/src/components/ui/ds/`. Import from `@/components/ui/ds`.

### `DsCard`

Standard dark surface card. Props: `padded` (default true), `interactive` (adds hover state), `highlighted` (lime border accent).

```tsx
import { DsCard } from '@/components/ui/ds';

<DsCard highlighted>
  <DsCard.Header>Title</DsCard.Header>
  ...
</DsCard>
```

### `DsBadge` / `DsStatusDot`

Category and status pills with automatic colour resolution from `CATEGORY_TOKENS`.

```tsx
import { DsBadge, DsStatusDot } from '@/components/ui/ds';

<DsBadge category="results_rankings" />   // → "Results" in steel blue
<DsBadge category="career_changes" />     // → "Career" in amber
<DsStatusDot status="active" />           // → green dot
```

### `DsEmptyState` / `DsLoadingSkeleton`

Zero-state UI with icon, title, description, and optional action. `DsLoadingSkeleton` shows animated placeholder bars while data loads.

```tsx
import { DsEmptyState, DsLoadingSkeleton } from '@/components/ui/ds';

<DsEmptyState
  icon={<Search />}
  title="No athletes found"
  description="Add an athlete to get started"
  action={{ label: "Add athlete", onClick: openModal }}
/>
```

### `DsMetric`

Stat/KPI card for dashboards. Supports `accent` prop (`lime` | `lavender` | `results` | `media` | `career` | `sponsorships`).

```tsx
import { DsMetric } from '@/components/ui/ds';

<DsMetric
  label="World Rank"
  value="#14"
  delta="+2"
  accent="lime"
/>
```

---

## Shadcn Base Components

`artifacts/web/src/components/ui/` contains the full Shadcn component library (Radix UI + CVA). These are the generic building blocks. The DS components above are built on top of them.

Key components used across the app:
- `Button` — with variants: default, destructive, outline, secondary, ghost, link
- `Card` / `CardHeader` / `CardContent` / `CardFooter`
- `Dialog` / `Sheet` — modals and side panels
- `Tabs` / `TabsList` / `TabsTrigger` / `TabsContent`
- `Select` — accessible dropdown
- `Badge` — simple label pill
- `Tooltip` — hover text
- `Separator` — divider line
- `Avatar` — profile image with fallback initials
- `Progress` — horizontal progress bar

---

## Tailwind Configuration

Tailwind v4 is configured via CSS `@theme` block in `artifacts/web/src/index.css`. CSS variables are set in `:root` (light) and `.dark` (dark — the app always uses dark mode).

Key custom utilities:
- `.hover-elevate` — subtle brightness lift on hover (pseudo-element based, preserves layout)
- `.toggle-elevate` — pressed/active state brightness effect

The app is **always in dark mode** — there is no light mode toggle.

---

## Component Authoring Rules

1. Import `{ T }` from `@/lib/tokens` before adding any colour value
2. Use only the approved text opacity scale (T.t28 – T.t92)
3. Use DS components (`DsCard`, `DsBadge`, etc.) for common patterns before building new ones
4. New semantic colours must be added to `tokens.ts` with a descriptive name — never inline an arbitrary rgba
5. All category-specific colouring must use `CATEGORY_TOKENS` — never hardcode category colours in components
