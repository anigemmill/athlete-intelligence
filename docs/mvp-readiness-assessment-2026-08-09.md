# MVP Readiness Assessment — 2026-08-09

Written at the transition point requested: the AI intelligence pipeline (Task #27, M3.1–M14) is complete, measured (IQS 87/100, `docs/quality-audit-2026-08-09-m14-postfix.md`), and pipeline engineering is paused. This assessment covers everything **around** the pipeline — UI, onboarding, deployment, billing, security, monitoring — to answer: is the product, as a whole, ready for a small group of real users?

Scope note: this is a code-level readiness review (what exists, what's wired, what's missing), not a live penetration test or a UX study with real users. Findings are graded **Ready / Partial / Gap** per area.

---

## 1. UI — Partial, but close

19 pages exist and are substantially built: Landing, Sign-in, Dashboard, Dossier, Feed, Schedule, Compare, Chat, Alerts, Sources, Settings, Admin, Pricing, Billing-success, About, Contact, Security, Terms, New-agent (onboarding), plus a 404 page. The design system (`tokens.ts`, `DsCard`/`DsBadge`/`DsEmptyState`/`DsMetric`) is applied consistently per the design-token audit already completed (Q2 2026 sprint, `docs/roadmap.md`).

**What's genuinely solid:** the Dossier page (the core product surface) is deep — intelligence feed, competitions, contacts, timeline, social panel, AI-generated summary, manual repopulate trigger with live progress polling. Empty states use the DS component rather than blank screens.

**What's not ready:**
- The manual social-handle/follower-count edit form on the Dossier page (`saveSocial()`) has likely **never actually worked** — a pre-existing spec/implementation drift (found and fixed as part of M14, see that report) meant the PATCH body's follower/handle fields were silently stripped by validation before reaching the handler. This is now fixed at the contract level, but the end-to-end save flow should be manually clicked through once before launch — I fixed the plumbing, I have not clicked the button.
- Three visualisation features are explicitly incomplete per the roadmap and untouched by this engagement: globe filter by sport/region (#21), globe pin clustering (#22), graph auto-refresh/evidence-links/blank-state (#24–26). These are polish, not blockers, but a pilot user will notice a globe with unfiltered, potentially-overlapping pins.
- No indication of mobile/responsive testing in the codebase or docs — CLAUDE.md's design philosophy doesn't mention a breakpoint strategy. Worth a quick manual check before any pilot user opens this on a phone.

---

## 2. Onboarding — Ready

`NewAgentPage.tsx` supports both single-athlete AI discovery (name → confidence-gated identity resolution → creation) and bulk CSV/XLSX import with a genuine sport/event catalogue. `DISCOVERY_CONFIDENCE_THRESHOLD = 70` correctly rejects ambiguous names with a 422 rather than silently creating a wrong profile — this is the same evidence-first discipline the pipeline itself uses, applied at the front door. Sign-in is Clerk-managed (Replit's non-standard `publishableKeyFromHost()` pattern, documented in CLAUDE.md's gotchas). A first-time user with zero athletes gets a clear path to their first one.

No in-product tour, tooltip walkthrough, or sample/demo athlete pre-seeded for a brand-new account — a pilot user's first screen after sign-in is an empty roster. For a **small, hands-held pilot** (the scope you described) this is a non-issue if you're walking users through it live; it would matter more for unassisted self-serve signup.

---

## 3. Production deployment — Ready, Replit-specific

Deployment target is Replit (per CLAUDE.md and `docs/setup.md`): managed Postgres, managed Clerk, Replit Secrets for all credentials, `PORT` required at boot (throws if unset — fails loud, not silent). The Stripe webhook self-registers against `REPLIT_DOMAINS` at boot. `GET /api/healthz` checks DB connectivity and returns 503 on failure — enough for Replit's own health-check/restart behavior, not enough for external uptime monitoring (see Monitoring, below).

**Real gap:** `docs/technical-debt.md` Priority 8 — no migration history, schema is synced directly via `drizzle-kit push`. Fine for the current single-environment setup; if a staging environment or a second engineer joins, this becomes a real risk (no audit trail of schema changes, no rollback path). Not urgent for a small pilot on one environment.

**Scaling ceiling, already self-documented** (`docs/technical-debt.md` Priority 9): the scheduler refreshes 3 athletes per 6-hour cycle — a 50-athlete roster takes ~4 days to fully cycle. Irrelevant for a 5–15 athlete pilot roster; would need tuning (`MAX_PER_CYCLE`, `INTER_ATHLETE_DELAY`) before onboarding a larger client.

---

## 4. Billing — Partial: wired, but not enforced

Stripe integration is real, not a stub: `stripe-replit-sync` handles webhook registration and backfill, checkout and customer-portal routes exist, pricing page is built. This is more billing infrastructure than most MVPs have at this stage.

**The gap that matters:** I found no server-side enforcement of plan/subscription status on any feature route. `GET /api/stripe/subscription` reports status, but nothing in `athletes.ts`, `chat.ts`, `dashboard.ts`, etc. checks it before serving a request. "Gated feature access" (per CLAUDE.md) currently appears to be a **client-side UI concern only** — any authenticated user can call the API directly regardless of subscription tier. For a small, personally-vetted pilot group this is low-risk (nobody's going to bypass the UI to steal a feature they'd be handed anyway), but it means the billing system cannot yet actually stop a non-paying account from using the product. Needs a middleware check before this goes anywhere near self-serve or a paying customer who could churn and keep using it.

---

## 5. Security — Ready for a trusted pilot, with one gap worth naming

**Solid:** centralized auth gate (`routes/index.ts` — every route requires a valid Clerk session except an explicit public allowlist of 3: health, contact form, Stripe price listing); admin routes re-verify the caller's email against Clerk's API server-side rather than trusting a client claim (`routes/admin.ts`'s `requireAdmin`); Helmet with a real CSP (not disabled), CORS restricted to an explicit origin allowlist (never a wildcard-with-credentials), 1MB body limit, 30s request timeout, global error handler that logs internally but never leaks a stack trace to the client; Stripe webhook signature verification; no secrets found hardcoded in source beyond one intentional admin-email constant (`admin.ts`'s `FOUNDER_EMAIL`, not a secret but a single point of change — moving it to an env var would make admin-access changes a config change instead of a deploy).

**The gap:** rate limiting exists on exactly 3 routes (chat, the public contact form, Stripe public endpoints). The AI-cost-incurring endpoints — `POST /athletes/discover`, `/athletes/bulk`, `/athletes/:id/repopulate`, `/athletes/:id/refresh-social` — have none. Every one of these fires real, billed Perplexity/OpenAI calls. For a small pilot of trusted users this is a low-probability risk, but it's also a cheap one to close (the codebase already has `express-rate-limit` as a dependency and a working pattern to copy from `chat.ts`) — worth doing before the pilot roster or user count grows past "people you personally know."

---

## 6. Monitoring — Partial

Pino structured logging is used consistently (per CLAUDE.md's coding standard — confirmed no stray `console.log` in the code touched across this whole engagement). `pino-http` captures request/response metadata. `/api/healthz` gives a binary DB-up signal.

**What's missing:** no external error-tracking/APM service (no Sentry or equivalent found anywhere in the repo) — a production error today is visible only in whatever log sink Replit provides, with no alerting layer on top. No dashboards, no cost/usage tracking for the AI API spend (a real concern given every populate cycle costs real money and there's no rate limiting on the endpoints that trigger it — see Security). For a small hand-monitored pilot, watching logs directly is workable; it will not scale past that without at least basic error alerting.

---

## Remaining product gaps (not blockers, tracked in `docs/roadmap.md`)

Globe filter by sport/region (#21), globe pin clustering (#22), competition location geocoding (#23), graph auto-refresh (#24), graph evidence links (#25), graph blank-state fallback (#26) — all pre-existing, lower-priority, explicitly deferred. Also carried forward from the M13/M14 quality audits: sponsorship coverage gaps for specific athletes (possibly genuine, seen twice, not yet confirmed), national ranking mostly unpopulated, follower-growth/engagement metrics never computed (`docs/technical-debt.md` Priority 10, pre-existing, not touched by this engagement).

---

## Recommendation

**Ready for a small, hands-on pilot with real users — with two cheap fixes first, not architectural blockers.**

The core product — AI-sourced, evidence-attributed athlete intelligence — is the hard part, and M3.1–M14 demonstrated it's trustworthy (82→87/100, zero fabrication, real citations, correct status/freshness logic) with a full paper trail of what was measured and how. The surrounding product (onboarding, deployment, core security posture) is genuinely further along than "MVP" usually implies — this isn't a demo held together with tape, it's a working system with real auth, real billing infrastructure, and real logging.

Before putting it in front of users I'd personally vetted, I'd close two specific, narrow gaps, both estimated as small (hours, not days):
1. **Rate-limit the AI-cost-incurring endpoints** (discover/bulk/repopulate/refresh-social) — copy the existing pattern from `chat.ts`. This protects your API budget, which is real money per click.
2. **Manually click through the social-handle edit save flow** once, now that the plumbing is fixed, to confirm it actually round-trips — I fixed the contract, I haven't verified the UI against a live server.

I would **not** block the pilot on billing enforcement, the migration-history gap, or an APM service — all real, all worth doing, none of them dangerous with a small trusted group you're personally onboarding and watching. I'd revisit billing enforcement specifically before this goes anywhere near a self-serve signup flow or a customer who isn't someone you already know.
