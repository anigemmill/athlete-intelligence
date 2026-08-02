# Athlete Intelligence — System Architecture

## Overview

Athlete Intelligence is a B2B SaaS platform that provides national sport organisations, professional clubs, and talent agencies with AI-sourced intelligence on elite athletes. The system continuously crawls the web, structures what it finds into verifiable data, and presents it through a dashboard with 3D visualisations.

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT BROWSER                             │
│  React SPA (Vite)  ─── Clerk Auth ─── TanStack Query ─── Wouter   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTPS (path-based proxy)
┌──────────────────────────────▼──────────────────────────────────────┐
│                         API SERVER (Express 5)                      │
│  Clerk middleware ─── Routes ─── Drizzle ORM ─── PostgreSQL        │
│                           │                                          │
│              ┌────────────▼────────────┐                            │
│              │   Intelligence Pipeline  │                            │
│              │  Perplexity Sonar        │                            │
│              │  GPT-4o extraction       │                            │
│              │  Background scheduler    │                            │
│              └─────────────────────────┘                            │
└──────────────────────────────────────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────┐
│                           PostgreSQL                                 │
│  athletes · intelligence_items · competitions · timeline_events     │
│  contacts · alert_configs · contact_enquiries · conversations       │
│  messages · stripe.* (managed schema)                               │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Monorepo Structure

This is a **pnpm workspace** monorepo. All packages are strictly typed (TypeScript 5.9).

```
/
├── artifacts/
│   ├── web/                    React SPA (Vite, Tailwind v4, Three.js)
│   ├── api-server/             Express 5 API + AI pipeline
│   └── mockup-sandbox/         Component preview server (Replit design tooling)
├── lib/
│   ├── db/                     Drizzle schema + pg connection (@workspace/db)
│   ├── api-zod/                Shared Zod schemas for request/response validation
│   ├── api-client-react/       TanStack Query hooks generated from API Zod schemas
│   ├── integrations-openai-ai-server/   OpenAI client (server-only)
│   └── integrations-openrouter-ai/      OpenRouter client (Perplexity access)
├── scripts/                    One-off admin scripts (Stripe seed, etc.)
├── docs/                       This documentation
├── CLAUDE.md                   Handover guide for Claude Code
├── README.md                   Project overview
└── pnpm-workspace.yaml         Workspace config + dependency catalog
```

---

## Frontend Architecture

**Stack:** React 19, Vite 7, Tailwind CSS v4, TanStack Query v5, Wouter v3, Three.js, Framer Motion, Clerk React.

### Routing

All routes are defined in `artifacts/web/src/App.tsx` using Wouter with lazy-loaded page components.

| Route | Auth | Component |
|---|---|---|
| `/` | Public | `LandingPage` |
| `/pricing` | Public | `PricingPage` |
| `/about` | Public | `AboutPage` |
| `/contact` | Public | `ContactPage` |
| `/security` | Public | `SecurityPage` |
| `/terms` | Public | `TermsPage` |
| `/sign-in/*?` | Public | `SignInPage` (Clerk) |
| `/dashboard` | Protected | `Dashboard` |
| `/intelligence` | Protected | `FeedPage` |
| `/schedule` | Protected | `SchedulePage` |
| `/chat` | Protected | `ChatPage` |
| `/alerts` | Protected | `AlertsPage` |
| `/settings` | Protected | `SettingsPage` |
| `/admin` | Admin only | `AdminPage` |
| `/sources` | Protected | `SourcesPage` |
| `/athletes/new` | Protected | `NewAgentPage` |
| `/athletes/compare` | Protected | `ComparePage` |
| `/athletes/:id` | Protected | `DossierPage` |
| `/billing/success` | Protected | `BillingSuccessPage` |

### Authentication

Authentication uses **Replit-managed Clerk**. The Clerk publishable key is resolved via `publishableKeyFromHost()` from `@clerk/react/internal` — do **not** hardcode a key. The proxy URL is set unconditionally to the `CLERK_PROXY_PATH` prefix. See `CLAUDE.md` for the exact setup pattern.

Protected routes use a `<ProtectedRoute>` wrapper that redirects to `/sign-in` when unauthenticated.

### Data Fetching

All API calls go through `@workspace/api-client-react` which provides TanStack Query hooks. Auth tokens are injected globally via `setAuthTokenGetter` using the Clerk `getToken()` method registered on app init.

### 3D Visualisations

| Component | Technology | Location in DossierPage |
|---|---|---|
| `IntelligenceGlobe` | Three.js / R3F | Dashboard + DossierPage globe tab |
| `RelationshipGraph3D` | Three.js / R3F | DossierPage relationships tab |
| `Timeline3D` | Three.js / R3F | DossierPage timeline tab |
| `TiltCard` | Three.js / R3F | Hero section |
| `HeroFlipCard` | Three.js / R3F | Landing page |
| `MiniGlobe` | Three.js / R3F | Sidebar |

All 3D components are wrapped in `Canvas3DWrapper` which provides an `ErrorBoundary` — if the WebGL renderer fails, the parent layout remains intact.

---

## Backend Architecture

**Stack:** Node.js (ESM), Express 5, Drizzle ORM, pg, Pino, Clerk Express, Helmet, pino-http.

The server entry point (`src/index.ts`) bootstraps:
1. Stripe integration (migrations + webhook registration)
2. Background refresh scheduler (every 6 hours)
3. HTTP server on `process.env.PORT`

### Middleware Stack (in order)

```
Clerk proxy          /clerk-proxy/*  (raw bytes — before body parsers)
Stripe webhook       /api/stripe/webhook  (raw Buffer)
pino-http            structured request logging
CORS                 *.replit.app, *.replit.dev, localhost only
Helmet               CSP, HSTS, X-Frame-Options
express.json         1 MB body limit
express.urlencoded   1 MB body limit
30s response timeout prevents hanging connections
clerkMiddleware()    populates req.auth on all routes
/api router          all API routes
Global error handler 500 with no stack trace leak
```

### Security

- CORS is restricted to known origins — never mirrors arbitrary origins
- Helmet CSP explicitly lists allowed script, style, and connect sources
- Rate limiting on public endpoints (contact form: 10/hour, chat: custom)
- Admin endpoints gated by founder email (`requireAdmin` middleware)
- No secrets are logged (Pino serializers strip sensitive fields)

---

## Background Jobs

### Auto-refresh Scheduler

Runs every **6 hours**, triggered 2 minutes after server boot.

```
1. flushStaleCompetitionStatuses()     — DB-only: flip upcoming → completed for past dates
2. Query up to 3 athletes where lastCrawledAt < 5 days ago OR lastCrawledAt IS NULL
3. For each athlete (sequential, 90s gap):
   a. repopulateAthlete(id)            — wipe + re-run full intelligence pipeline
   b. backfillCompetitionResults(id)   — fill null results on past competitions
```

Staleness threshold: **5 days**. Max athletes per cycle: **3**. The 90-second gap prevents Perplexity + OpenAI rate-limit errors.

---

## Intelligence Pipeline

See `docs/ai-architecture.md` for the full AI pipeline documentation.

Summary:
1. **Discovery** — GPT-4o identifies sport/nationality from athlete name
2. **Research** — Perplexity Sonar searches the live web
3. **Extraction** — GPT-4o structures research into typed JSON
4. **Validation** — date checks, domain authority scoring, URL sanitisation
5. **DB write** — sequential inserts across 5 tables

---

## Intelligence Health Panel

`IntelligenceHealthPanel` (`artifacts/web/src/components/IntelligenceHealthPanel.tsx`) renders a per-athlete data quality layer visible to all authenticated users. It calls `GET /api/athletes/:id/health` and displays:

- **Confidence ring** — weighted average across intelligence items
- **Freshness tile** — days since last crawl (<3d = Excellent, <7d = Good, <14d = Aging, >14d = Stale)
- **Source diversity tile** — unique legitimate domains
- **Result completeness bar** — % of past competitions with a result
- **Known gaps badges** — missing coach, missing manager, sparse timeline
- **Refresh action** — triggers `POST /api/athletes/:id/repopulate`

---

## Authentication

Clerk handles all user auth. The backend uses `@clerk/express` middleware. The `requireAuth` middleware (applied to all `/api` routes except health/contact/stripe-public) calls `getAuth(req)` and returns 401 if no session is present.

Admin routes additionally check that `auth.sessionClaims?.email === process.env.FOUNDER_EMAIL`.

---

## Billing

Stripe integration via `stripe-replit-sync`. The Stripe schema is provisioned as a separate PostgreSQL schema (`stripe.*`) during server startup via `runMigrations`.

Key flows:
- `GET /api/stripe/prices` — public, lists active products
- `POST /api/stripe/checkout` — creates a checkout session, returns URL
- `POST /api/stripe/portal` — creates a customer portal session
- `POST /api/stripe/webhook` — handles subscription lifecycle events
- `GET /api/stripe/subscription` — current user's plan status

Subscription gating in the frontend uses `PlanSelectionModal` which blocks feature access based on the subscription tier returned from the API.

---

## Design System

See `docs/design-system.md` for full design system documentation.

The design system lives in two places:
- **Tokens:** `artifacts/web/src/lib/tokens.ts` — single source of truth for all values
- **DS components:** `artifacts/web/src/components/ui/ds/` — `DsCard`, `DsBadge`, `DsEmptyState`, `DsMetric`
- **Shadcn base:** `artifacts/web/src/components/ui/` — Radix UI + CVA primitives
