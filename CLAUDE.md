# Claude Code — Athlete Intelligence Handover

This document is written specifically for Claude Code. It assumes you have never seen this project before and need to understand it, build it, and continue developing it from first principles.

---

## What this project is

**Athlete Intelligence** is a B2B SaaS platform for national sport organisations, professional clubs, and talent agencies. It uses AI to automatically research elite athletes from the web, structures the results into a verified database, and presents them through a dashboard with real-time data quality indicators and 3D visualisations.

The core promise: **trustworthy, evidence-attributed intelligence on any elite athlete — with a confidence score on every data point**.

---

## Architecture in one paragraph

A React SPA (Vite + Three.js) calls an Express 5 API. The API uses Clerk for auth, Drizzle ORM for PostgreSQL access, and a background scheduler that every 6 hours picks the 3 most stale athletes and re-runs their intelligence pipeline. The pipeline uses Perplexity Sonar (via OpenRouter) to search the live web, then GPT-4o (via OpenAI) to extract the results into structured JSON, which is written across 5 database tables. The whole thing is deployed on Replit.

---

## Repository map

```
artifacts/web/              React SPA — all user-facing code
  src/App.tsx               Router (Wouter), auth wrapper
  src/pages/                19 pages (see docs/architecture.md)
  src/components/3d/        Three.js visualisations (Globe, Graph, Timeline)
  src/components/ui/ds/     Design system components (DsCard, DsBadge, etc.)
  src/lib/tokens.ts         THE design token source of truth — import T from here
  src/lib/getAuthToken.ts   Clerk token getter

artifacts/api-server/       Express 5 API + AI pipeline
  src/index.ts              Server entry, Stripe init, scheduler
  src/app.ts                Express setup, middleware stack
  src/routes/               All API routes (see docs/api.md)
  src/lib/auto-populate.ts  THE intelligence pipeline (Perplexity → GPT-4o → DB)
  src/lib/photo-lookup.ts   Wikipedia/Perplexity photo strategy
  src/lib/result-backfill.ts Fill null competition results
  src/lib/social-extract.ts  Social handles + follower lookup
  src/lib/athlete-health.ts  IntelligenceHealthPanel metrics computation

lib/db/                     Drizzle ORM schema + pg connection
  src/schema/               One file per table
  src/index.ts              exports db (drizzle instance) + all schema types

lib/api-zod/                Shared Zod schemas for request/response validation
lib/api-client-react/       TanStack Query hooks (auto-generated from api-zod)
lib/integrations-openai-ai-server/   OpenAI client (@workspace/integrations-openai-ai-server)
lib/integrations-openrouter-ai/      OpenRouter client (@workspace/integrations-openrouter-ai)

docs/                       Full documentation (read these first)
```

---

## How to run it

```bash
pnpm install
cp .env.example .env   # fill in all values
pnpm --filter @workspace/db run push   # sync schema to DB
# Terminal 1:
pnpm --filter @workspace/api-server run dev
# Terminal 2:
pnpm --filter @workspace/web run dev
```

On Replit: use the workflow panel — both services are pre-configured.

Full setup instructions: `docs/setup.md`.

---

## Current priorities

**Task #27 — Specialised Retrieval Agents is complete** (plan: `.local/tasks/agentic-pipeline-redesign.md`). The AI pipeline was redesigned from a single monolithic prompt into 8 domain-specific agents (`artifacts/api-server/src/lib/*-agent.ts`), live-verified end to end against 5 golden athletes across milestones M3.1–M12. See `docs/ai-architecture.md` ("Retrieval Agents") for the current architecture and `docs/live-pipeline-verification-2026-08-09-m12-results.md` for the final verification report (links back through the full series).

The pre-redesign platform quality score was **59/100** across 5 sample athletes; a fresh quality audit against the new 8-agent pipeline has not yet been run and would be a reasonable next step to quantify the improvement.

Other pending tasks (lower priority, see `docs/roadmap.md`):
- Globe filter by sport/region (#21)
- Globe pin clustering (#22)
- Competition location geocoding (#23)
- Graph auto-refresh (#24)
- Graph evidence links (#25)
- Graph blank-state fallback (#26)

---

## Design philosophy

**Dark intelligence aesthetic.** The application is always in dark mode. Base colour `#0D1C0B` (deep forest green-black). Primary accent `#B9FF4A` (lime). Secondary accent `#C8BDFF` (lavender).

**All design values come from `artifacts/web/src/lib/tokens.ts`.** Never hardcode arbitrary rgba values in component code. Import `{ T }` and use named tokens.

**Text opacity scale (strict — do not deviate):**
- `T.t92` — headings
- `T.t70` — important body
- `T.t55` — body (minimum for readable text)
- `T.t40` — muted/secondary
- `T.t28` — decorative (minimum overall)

**DS components before new ones.** Before building a new component, check `artifacts/web/src/components/ui/ds/` — `DsCard`, `DsBadge`, `DsEmptyState`, `DsMetric` cover most patterns.

---

## AI philosophy

**Accuracy over everything.** The platform sells trustworthy intelligence. A wrong PB or a fake source URL destroys user trust more than a missing field.

**Never store fabricated data.** The pipeline aborts if Perplexity fails — it is better to have no data than confidently wrong data.

**Every data point needs evidence.** Every intelligence item, timeline event, and contact must have a `source_domain`. Every item gets a confidence score (0–100). Domain authority adjustments are applied post-extraction.

**Database first, model second.** The chat analyst (`POST /api/chat`) must call a database tool before generating any response. It cannot answer from LLM training knowledge alone.

---

## Coding standards

- **TypeScript everywhere** — no `any` in production code; use `unknown` and narrow properly
- **ESM modules** — all packages use `"type": "module"`; use `.js` extensions in imports (TypeScript compiles to JS)
- **Drizzle ORM** — no raw SQL strings; use the Drizzle query builder
- **Zod validation** — all API request/response shapes are defined in `lib/api-zod/`
- **pnpm only** — the `preinstall` script blocks npm/yarn
- **Pino logging** — use `logger.info/warn/error()` with structured objects, never `console.log` in production code
- **No secrets in code** — all API keys via environment variables; never hardcode in source
- **Error handling** — every intelligence-retrieval agent (`artifacts/api-server/src/lib/*-agent.ts`) catches its own research/extraction failures internally, logs via `logger.warn`/`logger.error` with structured context, and returns a safe empty/default result rather than throwing — one agent's failure never discards another agent's already-validated data. Reserve thrown errors for truly unrecoverable failures (e.g. a database write failing).

---

## Critical gotchas

### 1. Clerk setup (non-standard)
This uses Replit-managed Clerk. The publishable key is resolved via `publishableKeyFromHost()` from `@clerk/react/internal` — **not from an environment variable**. The proxy URL must be set unconditionally. Do not add `<ClerkProvider publishableKey={process.env.VITE_...}>` — this breaks on Replit. See `artifacts/web/src/App.tsx` for the exact pattern.

### 2. Import extensions in TypeScript/ESM
When importing from compiled `.js` files in the API server, use `.js` extension in import paths even though the source files are `.ts`:
```typescript
import { fetchWikipediaPhoto } from "./photo-lookup.js";  // ✓
import { fetchWikipediaPhoto } from "./photo-lookup";      // ✗ breaks at runtime
```

### 3. Stripe webhook before body parser
`express.raw({ type: "application/json" })` must be registered for the Stripe webhook route before `express.json()`. The order in `src/app.ts` is critical.

### 4. DB write pattern — use `@workspace/db`
Import both the `db` instance and table references from `@workspace/db`:
```typescript
import { db } from "@workspace/db";
import { athletesTable, intelligenceItemsTable } from "@workspace/db";
```
Do not import directly from the `lib/db` package path — always use the workspace alias.

### 5. pnpm workspace imports
Cross-package imports use workspace aliases: `@workspace/db`, `@workspace/api-zod`, `@workspace/api-client-react`, etc. These are defined in each package's `package.json` and resolved by pnpm.

### 6. PORT is required
The API server throws on startup if `PORT` is not set. Replit sets this automatically. For local dev, add `PORT=3000` to your `.env`.

### 7. Background job timing
The scheduler starts 2 minutes after boot (`setTimeout(..., 2 * 60 * 1000)`). If you're testing pipeline changes, use `POST /api/admin/backfill-results` or `POST /api/athletes/:id/repopulate` to trigger manually.

---

## Known issues (quick reference)

See `docs/technical-debt.md` for the full list. Top 5:

1. **Source domains like `source4` / `source9` stored for Hamish Kerr** — citation index leak from GPT-4o misreading the citation list
2. **Peter Bol's season best (1:43.64) is faster than his personal best (1:45.14)** — no cross-validation between PB and SB fields
3. **4 of 5 athletes have zero contacts** — contact extraction relies on the general research pass which rarely surfaces coach names
4. **Timeline events average 5 per athlete** (target: 20–30) — 8192 token budget is too tight for full output
5. **Brook Macdonald's competitions have no results** — result backfill fails on generic meet names

---

## Where to begin

If you're picking up this project for the first time:

1. Read `docs/architecture.md` for the full system picture
2. Read `docs/ai-architecture.md` for the pipeline (the core IP of the platform)
3. Read `docs/technical-debt.md` to understand what's broken and why
4. The most impactful pending work is in `.local/tasks/agentic-pipeline-redesign.md` (Task #27)
5. All design work should start with `artifacts/web/src/lib/tokens.ts`

If you're debugging a specific issue:
- Pipeline failures → `artifacts/api-server/src/lib/auto-populate.ts`
- Bad data in DB → `docs/technical-debt.md`
- API route errors → `artifacts/api-server/src/routes/`
- Frontend rendering → `artifacts/web/src/pages/` or `src/components/`
- DB schema → `lib/db/src/schema/`
