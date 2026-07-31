# Production Readiness Checklist
**Athlete Intelligence — Pre-deployment gate**

Run through every item below before deploying to production. Each item maps to a known failure mode or acceptance criterion.

---

## 1. Build & Environment

- [ ] `pnpm run build` completes without errors in all workspaces
- [ ] `tsc --noEmit` passes (or all remaining errors are documented and accepted)
- [ ] All required environment variables are set in the production environment:
  - `CLERK_PUBLISHABLE_KEY` / `VITE_CLERK_PUBLISHABLE_KEY`
  - `CLERK_SECRET_KEY`
  - `STRIPE_SECRET_KEY`
  - `SESSION_SECRET`
  - `AI_INTEGRATIONS_OPENAI_API_KEY` + `AI_INTEGRATIONS_OPENAI_BASE_URL`
  - `AI_INTEGRATIONS_OPENROUTER_API_KEY` + `AI_INTEGRATIONS_OPENROUTER_BASE_URL`
  - `DATABASE_URL` (or Replit DB connector)
- [ ] No `.env` files committed to source control

---

## 2. Authentication

- [ ] Sign-in page loads with Clerk form visible (no infinite skeleton)
- [ ] Google OAuth sign-in completes and redirects to `/dashboard`
- [ ] Email/password sign-in completes and redirects to `/dashboard`
- [ ] Unauthenticated requests to `/api/**` return `401` (not 200 or 500)
- [ ] Sign-out redirects to `/sign-in` and clears session
- [ ] Deep links (e.g. `/athletes/123`) redirect to sign-in and back after auth

---

## 3. Customer Portal — Core Flows

- [ ] **Dashboard** loads within 3 seconds; stats cards show real data, not zeros
- [ ] **Athlete search** in sidebar returns results; empty state shown when no match
- [ ] **Athlete profile (Dossier)** — all 8 tabs render without blank pages:
  - Overview, Intelligence, Timeline, Evidence, Social, Competitions, Contacts, AI Chat
- [ ] **Intelligence tab** shows items or a "no items" empty state (never infinite spinner)
- [ ] **Timeline tab** shows events or empty state
- [ ] **Competitions tab** shows competition rows or empty state
- [ ] **AI Chat** — typing a message and pressing Send returns a streaming response
- [ ] **Add athlete** form validates required fields; success redirects to new athlete profile
- [ ] **Repopulate** button triggers crawl; progress indicator shown; table updates on completion

---

## 4. Admin Portal

- [ ] `/admin` loads (requires admin role); tabs visible in sidebar
- [ ] **Customers tab** renders customer table (or "No customers" state)
- [ ] **Crawl tab** — per-athlete repopulate buttons functional
- [ ] **Health tab** shows DB: OK, API: OK, Env: OK (or surfaces real errors)
- [ ] **Feature Flags tab** renders without infinite spinner
- [ ] **Enquiries tab** loads submissions from the contact form

---

## 5. Billing & Subscriptions

- [ ] **Pricing page** loads plans from Stripe (not a blank/error state)
- [ ] **Checkout** flow redirects to Stripe hosted page; no raw Stripe error messages shown in UI
- [ ] **Billing success page** shown after Stripe redirects back with `?session_id=`
- [ ] **Settings → Billing** shows active subscription status (or "No active subscription" gracefully)
- [ ] **Manage billing** button opens Stripe Customer Portal
- [ ] Expired/cancelled subscriptions show `PlanSelectionModal`, not a blank screen

---

## 6. Error Handling & Resilience

- [ ] All API error responses return `{ error: "<friendly message>" }` — no raw exception messages, stack traces, or Stripe API errors visible in responses
- [ ] All pages have loading skeletons or spinners (no blank white/dark flash)
- [ ] All pages show a graceful empty state when data is missing
- [ ] Network errors (simulated via DevTools → Offline) show an error state, not a crash
- [ ] `ErrorBoundary` catches React runtime errors and shows a fallback (not a white screen)

---

## 7. Navigation & Routing

- [ ] All sidebar links navigate to the correct page
- [ ] Active page is highlighted in the sidebar
- [ ] Browser back/forward works correctly on all pages
- [ ] Refreshing any authenticated route keeps the user on the same page (not redirected to sign-in)
- [ ] 404 page renders for unknown routes

---

## 8. Design System Consistency

- [ ] All authenticated pages use `#0D1C0B` background (no `#FCFAFA` or `bg-white` bleed)
- [ ] All cards use `rgba(255,255,255,0.05)` + `rgba(255,255,255,0.09)` border
- [ ] Primary accent `#B9FF4A` used for active states, CTAs, and highlights
- [ ] No light-theme page flashes during navigation
- [ ] Fonts load correctly (no FOUT / unstyled text)
- [ ] No overflow scrollbars visible on page load

---

## 9. Performance

- [ ] No duplicate API requests on initial load (check Network tab)
- [ ] No React key warnings or missing dependency warnings in console
- [ ] Large athlete lists (50+) render without janking
- [ ] Images (athlete photos) have `loading="lazy"` or are otherwise deferred

---

## 10. Security

- [ ] No API keys, secrets, or internal IDs visible in browser network responses
- [ ] Stripe secret key never appears in frontend bundle (`grep STRIPE_SECRET` in `dist/`)
- [ ] All admin routes verify admin role before responding (`/api/admin/**`)
- [ ] Webhook endpoint verifies Stripe signature (no raw payload acceptance)
- [ ] Content-Security-Policy header present on all HTML responses
- [ ] HTTPS enforced in production (no mixed content warnings)

---

## 11. Database

- [ ] All 9 tables exist with correct schema: `athletes`, `intelligence_items`, `competitions`, `contacts`, `timeline_events`, `alert_configs`, `contact_enquiries`, `conversations`, `messages`
- [ ] All performance indexes present (run `\d <table>` to verify)
- [ ] No pending migrations (`drizzle-kit status` shows clean)
- [ ] Database connection pool does not exhaust under normal load

---

## 12. End-to-End Smoke Test (run as admin + customer)

### Admin workflow
1. Sign in with admin account
2. Open Dashboard — verify stats load
3. Search for an athlete by name
4. Open athlete profile — all tabs visible
5. Click Repopulate — confirm it completes
6. Open Admin panel → Health tab — all green
7. Sign out

### Customer workflow
1. Sign in with non-admin account
2. Dashboard loads with correct data
3. Open an athlete profile
4. Send a message in AI Chat — response arrives
5. Open Settings → Billing — subscription status visible
6. Sign out

---

## Known Accepted Issues (pre-production)

| Issue | Severity | Notes |
|---|---|---|
| Clerk dev-key console warning | Info | Expected in dev; disappears with production keys |
| Stripe webhook stale-ID log on server start | Low | Handled gracefully; cosmetic noise only |
| `conversations`/`messages` not in drizzle schema index | Medium | Chat functions correctly; migrations won't track these tables until resolved (Task #14) |
| TypeScript errors in DossierPage/ComparePage hooks | Low | `{ query: { enabled } }` pattern; runtime unaffected (Task #11) |
| Feature flags tab returns empty list | Info | No flags table yet; UI handles gracefully |

---

*Last updated: 31 July 2026 — Post unification & stabilisation sprint*
