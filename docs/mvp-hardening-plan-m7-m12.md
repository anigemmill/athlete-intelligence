# MVP Hardening Plan — M7–M12

**Date:** 2026-08-10
**Source:** `docs/product-technical-feasibility-audit-2026-08-10.md`
**Status:** Planning only. No code, schema, or config has been changed. Nothing in this document has been implemented.
**Scope decision (per direction received):** stop adding new retrieval agents; shift entirely to MVP hardening. Multi-tenancy is the first milestone, in agreement with the audit's Part 9/15 recommendation ("the single highest-leverage fix in this report").

**Naming note:** this is a new six-milestone track for the hardening phase, labeled M7–M12 as directed. It is distinct from the M1–M14 series already used in `docs/` for the agentic-pipeline redesign and its verification/audit passes (M3.1–M14) — those milestone numbers are not being reused or renumbered.

---

## Sequencing overview

```
M7  Multi-tenancy: schema + ownership plumbing
 └─▶ M8  Multi-tenancy: enforcement across every route
        └─▶ M9  Stripe checkout fix + server-side billing enforcement
               (soft dependency on M7 — gating logic keys off owner identity)

M10 Accuracy hardening: citation/freshness enforcement (social + PB/SB)
        (independent of M7–M9; sequenced after per stated priority order)
 └─▶ M11 Sport-specific data model (builds on M10's citation infra;
          touches the same file, results-agent.ts)

M12 Admin/observability/trust-surface cleanup
        (draws on M9's billing-health signal and M10/M11's data;
         sequenced last)
```

M7→M8→M9 is a hard chain (tenancy must exist before enforcement; billing enforcement should key off the same owner identity). M10→M11 is a hard chain (the sport-model work modifies the same agent M10 hardens). M12 is deliberately last because two of its widgets (billing health, data-completeness) depend on M9 and M10/M11 existing.

**Explicitly out of scope for this plan** (per audit Part 9/11 — "what NOT to build yet"): full multi-user Clerk Organizations/teams (M7–M8 implement single-owner tenancy only, see M7 rationale), admin user suspend/impersonation, usage dashboards beyond the minimal signal in M12, notification-sending infrastructure beyond wiring the existing Alerts UI honestly, scheduler rearchitecture (still fine at current scale per the audit's own projection), DB migration-history tooling, Base44 migration.

---

## M7 — Multi-tenancy: schema and ownership plumbing

**Goal:** introduce athlete ownership into the data model and start populating it, without changing any runtime read/write behavior yet. Purely additive and invisible to users.

**Dependencies:** none. This is the foundation everything else in this plan sits on.

**Why single-owner, not full organizations:** nothing in the current product — Clerk config, schema, or UI — implies multi-user teams today (confirmed in the audit's Part 4/6 review). Building a full `organizations` table with membership/roles now would be speculative scope the audit explicitly warned against ("don't design for hypothetical future requirements"). The pragmatic fix that closes the actual hole — one customer seeing another customer's roster — is per-user ownership keyed to the Clerk user id already available on every authenticated request. A team/org model is a reasonable future milestone if the product later sells seats within one customer account, not a prerequisite for closing the data-leak gap.

**Database changes:**
- Add `owner_id text not null` to `athletes` (Clerk user id string — no local FK target since users live in Clerk, matching how `FOUNDER_EMAIL`/admin checks already treat Clerk identity as the source of truth).
- Add an index on `athletes.owner_id` (every scoped query in M8 filters on it).
- Do **not** duplicate `owner_id` onto every child table (`intelligence_items`, `competitions`, `contacts`, `timeline_events`, `sponsorships`, etc.) — they already FK to `athletes.id`; scoping happens through that join in M8. Duplicating ownership onto every child table would be exactly the kind of premature/parallel-source-of-truth design the codebase's own standards warn against.
- Backfill migration: assign every existing athlete row's `owner_id` to the founder's Clerk user id. Today's usage is, in practice, single-tenant (one admin), so this is a safe, lossless default — not a guess about who "should" own historical data.
- This table alteration (`NOT NULL` column added to a live, populated table) is a good forcing function to start using real Drizzle migration files instead of `drizzle-kit push` for this one change, given `docs/technical-debt.md` Priority 8 already flags the absence of migration history as a gap. Recommended, not required for M7 to be complete — flagged as a decision point, not silently assumed.

**API changes:**
- `POST /athletes` (single create) and the bulk-import route: write `owner_id = req.userId` (the authenticated Clerk id already available via existing auth middleware) at creation time. This is the only behavioral change in M7 — everything else in this milestone is schema/data only.
- No other route changes yet. Reads remain unscoped until M8 — this milestone must not be mistaken for the tenancy fix itself.

**UI changes:** none.

**Acceptance criteria:**
- Schema deployed; `athletes.owner_id` is `NOT NULL` with zero rows failing the constraint.
- Direct DB query confirms every pre-existing athlete row has `owner_id` set to the founder's Clerk id.
- A freshly created athlete (single and via bulk import) has `owner_id` set to the creating user's Clerk id, verified by a live test.
- Full typecheck and test suite pass.
- No route's *behavior* has changed yet — `GET /athletes` still returns the full roster (M8's job), confirmed deliberately so M7 and M8 aren't conflated in review.

---

## M8 — Multi-tenancy: enforcement

**Goal:** make cross-tenant access structurally impossible. This is the milestone that actually closes the "every customer sees every other customer's data" gap identified as the audit's headline finding.

**Dependencies:** M7 (every athlete row must have a valid `owner_id` before any query can filter on it).

**Database changes:** none beyond what M7 already added, unless load-testing in this milestone shows the new index insufficient (unlikely at current scale).

**API changes:**
- A single shared scoping helper (e.g. `withOwnerScope(userId)` used inside the Drizzle query builder), not one-off `WHERE` clauses per route — so the pattern is applied consistently and is easy to audit later, mirroring how `resolveSourceAttribution()` is one shared implementation used by every citation-checked agent rather than five separate copies.
- Apply it to every athlete-scoped route: `GET /athletes`, `GET /athletes/:id`, `PATCH /athletes/:id`, `DELETE /athletes/:id`, repopulate/backfill endpoints, and every child-resource route (`/athletes/:id/competitions`, `/contacts`, `/timeline-events`, `/intelligence-items`, `/sponsorships`) — ownership is checked via the parent athlete's `owner_id` before any read or write.
- Requests for an athlete owned by a different user return `404`, not `403` — a `403` confirms the athlete *exists*, which is itself a data leak (existence disclosure) for a product whose whole premise is discretion about who's tracking whom.
- Admin routes (`/admin/*`) get an explicit, separately-reviewed bypass of the scoping helper — they are supposed to see everything; this must be a deliberate exception, not an accidental one, so it should be implemented as a distinct code path, not a parameter that silently turns scoping off.
- The chat/analyst tool (`POST /api/chat`) — which calls a database tool per CLAUDE.md's "database first" rule — must have its DB tool scoped the same way, or an authenticated user could ask the analyst about athletes they don't own and get an answer anyway, defeating the whole point of M8.
- Dashboard aggregate/summary endpoints (roster counts, globe/graph data feeds) must filter to the caller's athletes — these are easy to miss because they don't look like "athlete routes" individually.

**UI changes:** none functionally required — this milestone's success is that the UI keeps working exactly as it does today, just now correctly scoped. No new screens.

**Acceptance criteria:**
- A test with two distinct Clerk user ids (simulated, not necessarily two real Clerk accounts) confirms: user B cannot list, read, update, or delete any athlete or child resource created by user A, via any route — `404` in every case.
- Dashboard/globe/graph aggregates for user B never include user A's athletes.
- Chat analyst answers for user B are provably scoped (cannot reference user A's athlete data even when asked directly).
- Admin routes are confirmed to still see the full roster (the bypass works and is intentional, not accidental).
- The founder's own existing account/data is unaffected — a regression check against the single-org usage that's been running throughout this engagement.
- Full typecheck and test suite pass.

---

## M9 — Stripe checkout fix and server-side billing enforcement

**Goal:** fix the confirmed-broken checkout flow, and close the "billing exists but isn't enforced" gap from audit Part 1/Part 8.

**Dependencies:** soft dependency on M7 (enforcement logic is naturally keyed to `owner_id`/Clerk user id, the same identity M7 introduced). Does not require M8 to be functionally correct, but shipping it after M8 avoids gating logic being written twice against two different identity models.

**Database changes:**
- New `subscriptions` cache table: `owner_id`, `stripe_customer_id`, `status`, `current_period_end`, `updated_at`. Rationale: the audit found no local subscription-status table exists at all — every check would otherwise require a live Stripe API call, which is both slow and a new failure mode on every gated request. This table is fed by the Stripe webhook handler that already exists (`webhookHandlers.ts`) rather than by polling.
- No change to the `stripe.*` schema itself (owned by `stripe-replit-sync`'s migration) beyond fixing how its failure is handled below.

**API changes:**
- Root-cause the checkout failure from real server logs first (the audit's hypothesis — the `stripe.*` schema migration failing silently in `initStripe()` — is not yet confirmed against actual log output). Fix whatever that turns out to be.
- Change `initStripe()`'s failure handling: currently a failed migration is caught, logged, and the server boots anyway looking healthy. At minimum this must become a loud, persistent signal (structured error log with a distinct code, plus the admin-visible flag consumed by M12) rather than a line in Pino logs no one is watching. Whether it should also block boot in production is a judgment call to make once the real failure mode is confirmed — noted here as a decision point, not pre-decided.
- New `requireActiveSubscription` middleware, applied to the actual gated actions (athlete creation, repopulate, bulk import) — not applied to admins (reuses the existing `isFounderEmail()`/`isAdmin` check, the same fail-safe pattern already in place elsewhere).
- Webhook handler updated to upsert the new `subscriptions` cache table on `customer.subscription.*` events, in addition to whatever it already does.
- `GET /user/me` (already the source `useIsAdmin()` and the paywall read from) returns subscription status from the cache table instead of wherever it currently sources it, so the frontend has one consistent, fast source of truth.

**UI changes:**
- Paywall/plan-selection modal reads from the corrected `/user/me` status — no visual redesign implied, just a correctness fix to what it's reading.
- Billing/settings page reflects the same cache-table status.
- Checkout error state, if it fails again in the future, should surface enough detail (still without leaking secrets) for the user to tell "temporary Stripe issue" from "this account's billing is misconfigured" apart — today both are identical generic text.

**Acceptance criteria:**
- Live test: a real checkout (test-mode trial and paid) completes successfully end to end.
- Webhook-driven update is verified by inspecting the `subscriptions` table row after a live test event, not just by reading the handler code.
- A non-subscribed, non-admin user is blocked server-side from athlete creation/repopulate — verified by calling the API directly (not just observing the UI hides the button), confirming this isn't a client-side-only gate.
- Admin bypass still works, verified live.
- If `initStripe()` fails again in a test environment, the failure is visible somewhere a human will actually see it before a customer hits checkout.

---

## M10 — Accuracy hardening: citation and freshness enforcement

**Goal:** bring the two fields identified in the audit as bypassing citation enforcement — social follower counts and PB/SB — up to the same standard already proven out in five of the eight retrieval agents (Competitions, Contacts, Timeline, Sponsors, Intelligence). This directly addresses the Brook Macdonald follower-count root cause from Part 2.

**Dependencies:** none on M7–M9; independent subsystem. Sequenced after per the stated priority (tenancy and billing first).

**Database changes:**
- Follower counts: extract out of the bare columns currently on `athletes` into a `social_metrics` table (`athlete_id`, `platform`, `handle`, `follower_count`, `source_domain`, `source_url`, `observed_at`, `confidence`). A single overwritten column can't represent "this number is from three years ago" — the audit's exact finding — so this needs to become a fact with provenance, the same shape every other well-rated field in the audit's table already has (Sponsorships' confidence-decay-by-publish-date design is the closest existing model to copy).
- PB/SB: add `source_domain`, `source_url`, `recorded_at` (the date the mark was actually set, not the crawl date) alongside the existing `personal_best`/`season_best` columns, or extract to a small `performance_marks` table (`athlete_id`, `mark_type: pb|sb`, `value`, `source_domain`, `source_url`, `recorded_at`, `confidence`) if reusing the sponsorships-style pattern proves cleaner in implementation — this is an implementation-time call, not a product decision, so it's left open here.

**API changes:**
- `social-extract.ts`: extend the GPT extraction JSON schema to require a `sourceUrl` per follower-count field (today the schema has nowhere to put the citation the Perplexity prompt already asks for in prose — this is the exact gap the audit traced). Run the extracted URL through the same `resolveSourceAttribution()`/`applyConfidenceFloor()` path the other five agents already use. A follower count that doesn't resolve to a real citation is discarded (stored `null`), never stored bare.
- `results-agent.ts`: same treatment — the extraction schema must capture which specific citation the returned PB/SB mark traces to (today citations are shown to the model but never checked against what it returns). A mark without a resolvable citation is discarded rather than stored.
- Both agents' DB-write paths updated to populate the new provenance columns/table.

**UI changes:**
- Dossier stat displays for follower counts and PB/SB gain the same "as of [date] · source-domain" attribution treatment CLAUDE.md's AI philosophy already promises ("every data point needs evidence") and that other fields in the dossier already render — reuse the existing badge/attribution component rather than building a new one.
- Where no citation is available, the field renders as an explicit "Unverified" / "Unknown" state (reusing `DsEmptyState` or equivalent) rather than a silent blank, consistent with the audit's Part 3 conclusion that a missing value should read as missing, not as a gap in the layout.

**Acceptance criteria:**
- Live re-run of the audit's exact methodology (Brook Macdonald, Peter Bol, Zoe Hobbs, Hamish Kerr) shows every non-null follower count and PB/SB carries a stored `source_domain`.
- A value the extraction step can't trace to a citation is verified to come back `null` in the database, not a bare number — tested by inspecting a live run's raw model output against what actually got written.
- UI shows either real source attribution or an explicit unverified state for every follower-count and PB/SB field — no more silent, unattributed numbers.
- Zero fabricated values across the four golden athletes, matching the zero-fabrication track record the audit found in the other five agents.

---

## M11 — Sport-specific data model

**Goal:** implement the conceptual model the audit described in Part 3 but explicitly did not design in detail — sport-aware metric typing, and a first-class home for career-defining achievements so they stop competing for space in a generic feed.

**Dependencies:** M10 (this milestone edits `results-agent.ts` again and should build on, not duplicate, the citation-enforcement work just added there; achievements should carry the same provenance rigor M10 establishes).

**Database changes:**
- A sport → metric-type mapping. This can be a static, versioned code config (`metricType: "time" | "distance" | "height" | "weight" | "score" | "placement-only"` keyed by sport string) rather than a database table — it's editorial data that changes rarely and doesn't need to be queried relationally. A DB table is only justified if the product later wants admins to edit this mapping without a deploy; not assumed here.
- New `defining_achievements` table: `athlete_id`, `title`, `description`, `date`, `source_domain`, `source_url`, `confidence`, nullable `competition_id` FK — structurally distinct from `intelligence_items`/`timeline_events` so a major win is guaranteed a place to live rather than competing for visibility with routine news coverage, which is the exact problem the audit found with Brook Macdonald's Val d'Isère win (correctly researched, present in three tables, structurally unprioritized in all of them).

**API changes:**
- `results-agent.ts` gated by the sport's metric type: for `placement-only`/`score` sports, skip asking for PB/SB entirely and return an explicit `notApplicable: true` rather than `null` — the UI needs to distinguish "this sport doesn't have this concept" from "we don't know yet," which today it cannot.
- Populate `defining_achievements` as an extraction-only pass over research the pipeline is already fetching (Timeline/Intelligence/Competitions), rather than a new dedicated Perplexity call — the goal is identifying and elevating achievement-worthy facts already being researched, not re-researching them, to avoid materially increasing the ~24–28-call-per-athlete figure from the audit's Part 6.
- Athlete detail payload includes `definingAchievements`, either as a new field on the existing response or a small dedicated route if the payload size argues for lazy loading — an implementation-time call.

**UI changes:**
- Dossier gains a "Career Highlights" module rendering `defining_achievements` prominently (near the top of the dossier, matching how central the audit found this fact to genuinely be for an athlete like Brook Macdonald).
- The "Personal Best" stat card is conditionally rendered: hidden or replaced with an explicit "Not applicable for this sport" state for `placement-only`/`score` sports, instead of showing an empty slot that reads as missing data.

**Acceptance criteria:**
- Live test on Brook Macdonald: dossier shows the 2012 Val d'Isère World Cup win in a prominent Career Highlights module, and does not show a misleading bare PB/SB stat for a sport where the concept doesn't cleanly apply.
- Regression test on Peter Bol and Hamish Kerr: PB/SB display is unchanged from before this milestone — the sport-model gating must not degrade the sports it already works well for.
- The sport → metric-type mapping covers every sport in the onboarding picker (`NewAgentPage.tsx`'s ~50 options) with an explicit, sensible default for anything unmapped (defaulting to `time`-type behavior, the current universal behavior, rather than silently hiding the field for sports no one has explicitly classified yet).

---

## M12 — Admin, observability, and trust-surface cleanup

**Goal:** close the specific admin/observability gaps the audit flagged as actively misleading — not build a full SaaS admin console (explicitly out of scope, per the audit's own "what can safely wait" list).

**Dependencies:** draws on M9 (billing-health signal) and M10/M11 (data-completeness signals) for its one new panel; sequenced last for that reason.

**Database changes:**
- Optional, minimal `feature_flags` table (`key`, `value`, `updated_at`, `updated_by`) — only if the decision (see below) is to make the Flags tab real rather than remove it.
- No usage-tracking or cost-tracking table — the audit explicitly places this in "what can safely wait," and building it now would be exactly the kind of scope creep the audit warned this plan against.

**API changes:**
- `PUT /admin/flags/:key` currently accepts a request, returns `{ok: true}`, and persists nothing — a UI control that lies about succeeding. This must be resolved one of two ways, both acceptable, neither optional: back it with the new `feature_flags` table so it actually persists, or remove the route and its UI entirely until it's real. Leaving it as-is is not an option the audit supports.
- Same binary choice for Alerts: either wire the existing config UI to a real, minimal notification path (even just transactional email through whatever provider is easiest to stand up), or remove/hide the UI with an honest "not yet available" state. The audit's objection isn't that alerts don't exist yet — it's that the UI implies they do.
- `GET /admin/customers` additionally surfaces `stripe_customer_id` (already available internally per the audit, just not piped into the response).
- New `GET /admin/system-status`: last scheduler run timestamp, count of athletes overdue for refresh (reuses the existing `/admin/data-health` computation, doesn't duplicate it), and the Stripe-init health flag from M9.

**UI changes:**
- Flags tab: functional if backed by the new table, or removed with a clear "coming soon" placeholder if not — either way, no more silent no-op saves.
- Alerts: same treatment.
- Admin dashboard gains a small System Status panel showing the three signals above.

**Acceptance criteria:**
- No control anywhere in the app claims to succeed without actually taking effect — the audit's core "D-category" complaint (features that look implemented but aren't) is resolved for both instances it specifically named.
- Admin can see a customer's Stripe customer ID without leaving the customers view.
- Admin can tell, at a glance, whether the scheduler has run recently and whether Stripe initialized successfully at last boot — the two failure modes that caused real live incidents this engagement (checkout breaking silently, and the earlier admin-paywall confusion) become visible before a customer reports them.

---

## What this plan deliberately does not do

Matching the audit's Part 9/11 guidance directly:

- No full multi-user Clerk Organizations/teams — M7–M8 solve the actual leak (cross-customer visibility) with single-owner scoping; a team model is a separate, later product decision if the product ever sells seats within one account.
- No admin user suspend/delete/impersonation.
- No usage or cost dashboards beyond the one status panel in M12.
- No scheduler rearchitecture — the audit's own projection puts that ceiling around 100 athletes, which is not the immediate constraint.
- No DB migration-history tooling adoption beyond the one recommended (not required) migration file in M7.
- No Base44 migration — the audit's Part 10 conclusion stands unchanged by this plan.

---

*No code, schema, or configuration has been changed as part of producing this plan. Waiting for direction on which milestone to begin implementing.*
