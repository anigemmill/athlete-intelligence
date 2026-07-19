---
name: Clerk proxy middleware — missing = blank sign-in on published site
description: The clerkProxyMiddleware must be explicitly copied and wired into app.ts; without it the published site serves a blank sign-in form.
---

## Rule
`clerkProxyMiddleware` from `.local/skills/clerk-auth/templates/api-server/src/middlewares/clerkProxyMiddleware.ts` MUST be copied to `artifacts/api-server/src/middlewares/clerkProxyMiddleware.ts` and mounted in `app.ts` BEFORE body parsers. Without it, `/api/__clerk/...` requests 401 or 404 in production and Clerk JS never loads.

**Why:** Replit-managed Clerk routes its JS bundle and OAuth callbacks through the app's own domain via `/api/__clerk`. The proxy middleware is what fulfils those requests by forwarding them to `frontend-api.clerk.dev`. In dev, the middleware no-ops (dev hits Clerk FAPI directly). In production, without it, the sign-in page renders the title/subtitle but the Clerk form component is completely blank.

**How to apply:**
1. `mkdir -p artifacts/api-server/src/middlewares && cp .local/skills/clerk-auth/templates/api-server/src/middlewares/clerkProxyMiddleware.ts artifacts/api-server/src/middlewares/clerkProxyMiddleware.ts`
2. `pnpm --filter @workspace/api-server add http-proxy-middleware`
3. In `app.ts`, import `{ CLERK_PROXY_PATH, clerkProxyMiddleware }` and add `app.use(CLERK_PROXY_PATH, clerkProxyMiddleware())` as the FIRST middleware (before Stripe webhook raw handler and before body parsers).
4. Do NOT import `publishableKeyFromHost` from `@clerk/shared/keys` on the server — esbuild can't bundle that subpath and externalising it fails at runtime. Keep `clerkMiddleware()` call argument-free on the server; `publishableKeyFromHost` is only needed on the client (`@clerk/react/internal`).
5. Redeploy after this change — the proxy is production-only and won't be visible in dev logs.
