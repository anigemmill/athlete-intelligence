# Athlete Intelligence — Environment Setup

## Prerequisites

- **Node.js** ≥ 22 (LTS)
- **pnpm** ≥ 9
- **PostgreSQL** ≥ 15 (or use Replit's managed PostgreSQL)

---

## Clone

```bash
git clone https://github.com/your-org/athlete-intelligence.git
cd athlete-intelligence
```

---

## Install Dependencies

```bash
pnpm install
```

This installs all workspace packages. The `preinstall` script enforces pnpm — using `npm install` or `yarn install` will fail with an error.

---

## Environment Variables

Copy the template and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# ── Database ──────────────────────────────────────────────────────────────────
DATABASE_URL=postgresql://user:password@localhost:5432/athlete_intelligence

# ── Clerk Authentication ───────────────────────────────────────────────────────
# DO NOT hardcode these. On Replit, these are managed secrets.
# For local dev, get from your Clerk dashboard.
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
SESSION_SECRET=<random-64-char-string>

# ── AI APIs ───────────────────────────────────────────────────────────────────
# OpenAI (for GPT-4o extraction and chat)
AI_INTEGRATIONS_OPENAI_API_KEY=sk-...
AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1

# OpenRouter (for Perplexity Sonar live search)
AI_INTEGRATIONS_OPENROUTER_API_KEY=sk-or-...
AI_INTEGRATIONS_OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# ── Stripe ────────────────────────────────────────────────────────────────────
STRIPE_SECRET_KEY=sk_test_...

# ── Optional ──────────────────────────────────────────────────────────────────
# Twitter/X API v2 Bearer Token for live follower counts
TWITTER_BEARER_TOKEN=AAAA...

# Founder email — gates admin routes
FOUNDER_EMAIL=your@email.com
```

**Important:** Never commit `.env`. The `.gitignore` excludes it. On Replit, all secrets are managed via Replit Secrets (not `.env` files).

---

## Database Setup

### Local PostgreSQL

```bash
createdb athlete_intelligence
pnpm --filter @workspace/db run push
```

### Replit (provisioned automatically)

If using Replit's managed PostgreSQL, `DATABASE_URL` is injected automatically. Just run the push:

```bash
pnpm --filter @workspace/db run push
```

---

## Run in Development

The project has two services that must run simultaneously:

### API Server

```bash
pnpm --filter @workspace/api-server run dev
```

This builds the TypeScript (esbuild) and starts the Express server. The server rebuilds on file changes — restart manually after code changes.

Default port: from `PORT` environment variable (set by Replit, or set manually).

### Web Frontend

```bash
pnpm --filter @workspace/web run dev
```

Vite dev server with HMR. Proxy to the API server is configured in `artifacts/web/vite.config.ts`.

### Both at once (Replit)

On Replit, both workflows run automatically. Use the workflow panel to start/stop them.

---

## Build for Production

```bash
pnpm run build
```

This runs `typecheck` then builds all packages:
- API server: esbuild bundles to `artifacts/api-server/dist/index.mjs`
- Web: Vite builds to `artifacts/web/dist/`

Verify the build:

```bash
pnpm run typecheck
```

---

## Deploy

### Replit (recommended)

1. Open the Replit dashboard
2. Click **Publish** (or use the deploy button in the workspace)
3. Replit provisions the production environment automatically

The production environment uses:
- Replit managed PostgreSQL (separate from dev)
- Replit managed Clerk (separate tenant from dev)
- All secrets from Replit Secrets (not `.env`)

**Before deploying:**
- Ensure `pnpm run build` passes without errors
- Apply any schema changes to production: run `DATABASE_URL={prod-url} pnpm --filter @workspace/db run push`

### Manual / Custom

1. Set all environment variables
2. Run `pnpm run build`
3. Start the API server: `node --enable-source-maps artifacts/api-server/dist/index.mjs`
4. Serve the web build: any static file server pointing to `artifacts/web/dist/`
5. Configure the API reverse proxy so the web frontend's `/api/*` calls reach the API server

---

## Seed Stripe Products (first-time setup)

```bash
pnpm --filter @workspace/lib-scripts run seed-products
```

This creates the Starter/Pro/Enterprise products and prices in your Stripe account. Only run once per Stripe account.

---

## Database Schema Management

**Apply schema to database:**
```bash
pnpm --filter @workspace/db run push
```

**Force apply (drops conflicting columns — DANGEROUS on production):**
```bash
pnpm --filter @workspace/db run push-force
```

**Schema files:** `lib/db/src/schema/*.ts`

There are no migration files — schema is pushed directly. See `docs/technical-debt.md` for the migration history limitation.

---

## Troubleshooting

**Build fails with TypeScript errors:**
```bash
pnpm run typecheck
```
Fix reported errors before deploying.

**API server not responding:**
- Check `PORT` environment variable is set
- Check `DATABASE_URL` is valid and the database is reachable
- Check Clerk keys are present and correct

**Intelligence pipeline not running:**
- The background scheduler starts 2 minutes after server boot
- Check server logs for `Auto-refresh:` log lines
- Admin endpoint `POST /api/admin/backfill-results` can trigger manually

**Clerk auth not working locally:**
- `CLERK_PUBLISHABLE_KEY` and `VITE_CLERK_PUBLISHABLE_KEY` must match
- Vite needs `VITE_` prefix for browser-accessible env vars
- On Replit, use `publishableKeyFromHost()` — do not hardcode the key

**Globe/3D components not rendering:**
- WebGL must be enabled in the browser
- Check for browser console errors from Three.js / React Three Fiber
- The `Canvas3DWrapper` error boundary will show a fallback if the renderer fails
