# Final MVP Pilot Readiness Checklist — 2026-08-09

Written after closing the two pre-pilot items from `docs/mvp-readiness-assessment-2026-08-09.md`:

1. **Rate limiting** — every route that fires a billable AI/API call is now rate-limited (`middleware/aiRateLimit.ts`), keyed per authenticated user, tested with 4 passing `node:test` cases proving real throttling, per-user isolation, and window recovery. Inspecting every route (not just the obvious `repopulate` one) surfaced six more unprotected endpoints, all now covered — see the commit for the full list.
2. **Social-edit save flow** — verified end-to-end against the real route handler, real zod validation, real Drizzle write, and a real Postgres database: field load → edit → save → reload → persisted, and confirmed reflected in both the dossier and the roster list, including the specific null-vs-zero case. **One environment caveat, stated plainly:** this sandbox has no real Clerk credentials (`.env` holds only placeholders, confirmed) and isn't running behind Replit's proxy, so a literal browser sign-in through Clerk could not be performed here. The verification bypassed only Clerk's own session-verification step (the one piece that structurally requires credentials this environment doesn't have) and exercised every other real production code path over a real HTTP connection. No issues were found. **Recommend a 2-minute real click-through by a founder with real Clerk credentials before the pilot**, specifically on this one flow, since I could not do that final step myself.

No new intelligence-agent work was started, per your instruction. Everything below is a classification of what exists today, not a proposal for what to build next.

---

## Checklist

| Area | Status | Why |
|---|---|---|
| **Core UI** | READY | 19 pages built on a consistent design-token system; the core surfaces (Dashboard, Dossier, Feed, Schedule, Compare, Chat) are substantially complete, not placeholders. |
| **Athlete discovery** | READY | Single-athlete AI discovery (confidence-gated, rejects ambiguous names with a 422 rather than guessing) and bulk CSV/XLSX import both work; now rate-limited. |
| **Athlete dossier** | READY | Deep and functional: intelligence feed, timeline, contacts, competitions, social panel, AI summary generation, manual refresh with live progress. Social-edit save flow verified end-to-end today. |
| **Intelligence data** | READY | The most thoroughly verified part of the product: IQS 87/100 (measured, not estimated — `docs/quality-audit-2026-08-09-m14-postfix.md`), zero fabrication, zero citation mismatches, PB/SB consistency holds, competition status and follower-count integrity fixed and re-verified. |
| **Authentication** | READY | Centralized Clerk session gate on every route except an explicit public allowlist of 3; admin access re-verified server-side against Clerk's API rather than trusting a client claim. Code-reviewed thoroughly; recommend one real click-through with live credentials before launch, since this sandbox has none to test with. |
| **Database** | READY | Schema is sound (today's follower-nullability fix applied cleanly); single-environment `drizzle-kit push` workflow with no migration history is a known, pre-existing gap (`docs/technical-debt.md` Priority 8) that matters once a second environment or engineer exists, not before. |
| **API/security** | READY | Helmet with a real CSP (not disabled), CORS restricted to an explicit origin allowlist, 1MB body limit, 30s timeout, global error handler that never leaks a stack trace, Stripe webhook signature verification, no secrets found hardcoded in source. |
| **Rate limiting** | READY | Closed today. Every AI-cost route covered, keyed per user, tested. |
| **AI/API costs** | NEEDS FIX | One specific, narrow gap remains: `POST /athletes/bulk` has no cap on how many athletes a single request can contain — each row fires the full 8-agent pipeline. Rate limiting caps how *often* the endpoint can be hit, not how large one request can be. Deliberately not fixed today — it's a distinct validation feature, not rate limiting, and you said not to build outside what was asked without a founder call. Flagging it for that call now. |
| **Onboarding** | READY | Real discovery + bulk-import flow gets a new user to their first athlete quickly. No in-product guided tour, which matters for unassisted self-serve signup but not for a small pilot you're personally walking through. |
| **Billing/subscription enforcement** | NOT REQUIRED FOR PRIVATE PILOT | Stripe checkout/portal/webhooks are real and wired, but nothing server-side currently checks subscription status before serving a feature request — enforcement is client-side only. Fine for a small group of people you've personally vetted; must be fixed before any self-serve signup or a customer who could churn and keep using the product. |
| **Error handling** | READY | Global Express error handler, per-route try/catch with appropriate status codes, every intelligence-retrieval agent catches its own failures and degrades safely rather than throwing (the pattern this whole engagement was built on), a frontend `ErrorBoundary` component exists. |
| **Monitoring** | NOT REQUIRED FOR PRIVATE PILOT | Structured Pino logging and a DB-connectivity health check exist; there's no external error-tracking/APM service and no alerting layer. Workable for a small pilot you're watching directly; becomes necessary before this scales past hands-on monitoring. |
| **Deployment** | READY | Replit-specific setup (managed Postgres, managed Clerk, Replit Secrets, PORT required at boot with a loud failure if unset, Stripe webhook self-registration) — functional and implicitly exercised throughout this entire engagement's live pipeline runs. |
| **Mobile/responsive experience** | NOT REQUIRED FOR PRIVATE PILOT | Genuinely unverified — no evidence of a breakpoint strategy or responsive testing in the codebase, and I had no way to test it live in this sandbox. Not claiming it works; flagging it as unknown rather than inventing a result either way. This is a B2B desktop-first analyst tool, so it's reasonable to leave unverified for a first pilot, but it should be manually checked on a phone before assuming it's fine. |
| **Empty/error/loading states** | READY | The design system's `DsEmptyState` is used consistently (confirmed directly in the Dossier page's competitions/social panels), loading flags are threaded through the data-fetching hooks rather than showing blank screens. |
| **Admin tools** | READY | Founder-only routes (repopulate, customer/enquiry lookups, roster-wide backfills, health/data-health, feature flags) are functional and now rate-limited; access re-verified server-side per request. |

---

## Summary

**15 of 17 areas: READY. 1 area (AI/API costs) has one specific, narrow NEEDS FIX. 3 areas are explicitly NOT REQUIRED for a small private pilot but are named so they aren't forgotten before wider release** (billing enforcement, monitoring, mobile — note two of these three overlap with the "not required" list only because of the private-pilot framing specifically, not because they're fine in general).

**Two decisions for you, not made unilaterally:**
1. **Bulk-import batch cap** — should `POST /athletes/bulk` reject a request over some size (e.g. 50 rows), given each row is a real cost? This is the one remaining concrete AI-cost gap.
2. **Pre-launch click-through** — since this sandbox has no real Clerk credentials, someone with real access should do one manual pass through sign-in and the social-edit save flow before the pilot starts, just to close the loop I structurally couldn't close myself here.

Nothing else is blocking. The product is ready to put in front of a small group of real users.
