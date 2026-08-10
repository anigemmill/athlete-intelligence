# Athlete Intelligence — Product & Technical Feasibility Audit

**Date:** 2026-08-10
**Trigger:** Manual testing of the live MVP surfaced material data-accuracy errors the automated engineering verification (M3.1–M14) did not catch.
**Method:** Live re-testing against the real pipeline (fresh runs, not cached data) for Brook Macdonald, Peter Bol, Zoe Hobbs, and Hamish Kerr, combined with direct code/schema inspection. Not a live browser click-through — this sandbox has no production Clerk credentials (established in an earlier session); every UI claim below is explicitly marked code-verified vs. unverified.
**Ground rule honored:** no code, database, deployment config, or production data was modified. One temporary debug trace was added to two files during investigation and fully reverted before this report was written (`git status` clean throughout).

**Headline finding, stated up front because it changes the shape of everything else in this report:** the two accuracy bugs you found are real and are explained below — but neither is the most severe problem in the system. **There is no multi-tenancy anywhere in the database schema.** Every signed-in user reads and writes the same global athlete roster. This is addressed in full in Part 4 and factors into every readiness judgment from here on.

---

## PART 1 — Product Requirements Audit

### What the product is supposed to be, reconstructed from CLAUDE.md/docs/roadmap

*"AI-powered sports intelligence platform... continuously monitors the web for information about your tracked athletes and structures everything it finds into a verified, confidence-scored dossier."* (README.md) Core promise per CLAUDE.md: **"trustworthy, evidence-attributed intelligence on any elite athlete — with a confidence score on every data point."**

### A. Core MVP functionality (the thing has to do this or it isn't the product)
- Athlete discovery/creation (single + bulk) — **built, works**
- AI-researched, evidence-attributed dossier: stats, competitions, contacts, timeline, intelligence feed — **built, mostly works, accuracy gaps below**
- Confidence scoring per data point — **built, works mechanically** (whether the *scores themselves* are trustworthy is a separate question, addressed in Part 2)
- Auth (Clerk) — **built, works**
- Per-customer data isolation — **assumed by the product description ("your tracked athletes"), not actually implemented — see Part 4**

### B. Important but secondary functionality
- AI analyst chat (database-first, cites sources) — built, functionally sound per code, never load-tested with real usage
- Billing (Stripe checkout/portal) — built and wired, but **not enforced server-side** (a signed-in user's API access doesn't depend on subscription status)
- Alerts/notifications — schema and routes exist; whether anything actually triggers a notification (email, push) wasn't verified — no notification-sending code found anywhere in `artifacts/api-server/src`
- Compare athletes — built, works
- Globe/graph 3D visualisations — built, explicitly flagged incomplete by `docs/roadmap.md` itself (filter, clustering, evidence-links all pending)

### C. Nice-to-have functionality
- Photo/avatar sourcing — built, but per the M10 report has a real architectural limitation (LLM research surfaces page URLs, not image URLs) and largely returns nothing
- Social growth/engagement metrics (`followerGrowth30d`, `avgEngagement`, `instagramEngagement`) — **schema columns exist, no agent or route writes to them, ever.** Permanently stuck at 0. This was already flagged in `docs/technical-debt.md` Priority 10 before this audit.
- CSV/XLSX bulk import — built, works, now capped at 10/request

### D. Things that look implemented but are not production-ready
This is the category the user asked me not to assume away. Concrete, verified examples:
1. **Admin feature flags.** `AdminPage.tsx` renders a Flags tab with toggles. `PUT /api/admin/flags/:key` accepts the request, returns `{ok: true}`, and **persists nothing.** `GET /api/admin/flags` always returns `{flags: []}`. The UI will let an admin "save" a flag change that is silently discarded on the next request. This is not a missing feature — it's a feature that actively lies about succeeding.
2. **Subscription enforcement.** Stripe's presence (checkout, portal, pricing page) implies gating, but no route checks subscription status server-side. Already flagged in the MVP readiness assessment; restating because Part 1 asked me not to assume completeness from a route's existence.
3. **Social growth metrics fields**, as above — present in every `Athlete` API response, always 0, never computed by anything.
4. **`FOUNDER_EMAIL`-gated admin** — functionally fixed this session, but is a single hardcoded admin identity model, not a real role/permission system. Fine for one founder, not a real "admin team" capability.
5. **Multi-tenancy** — the schema and every route behave as if there's one shared organization. See Part 4.

---

## PART 2 — Data Accuracy Audit

### Where the Brook Macdonald errors actually originate

**Traced live, end-to-end, with real Perplexity/GPT-4o calls (not simulated), across two independent fresh runs.**

**1. Instagram followers (~118K shown vs. ~253K+ real).**

`social-extract.ts`'s `lookupSocialData()` — the sole source for Instagram/TikTok follower counts (no free API exists, unlike Twitter which uses the real X API) — has an architectural gap unique among this system's eight retrieval agents: **its extraction schema captures no source URL, no publish date, and no freshness signal for the follower number it returns.** Every other agent in this codebase (Competitions, Contacts, Timeline, Sponsors, Intelligence) enforces `resolveSourceAttribution()` — the number must trace to a real citation URL or it's discarded. `lookupSocialData` never had this. The Perplexity prompt *asks* for a source URL in prose, but the GPT-4o-mini extraction step's JSON schema (`{"instagramFollowers": null, ...}`) has nowhere to put it — the citation is thrown away the moment extraction runs.

Live evidence: across 4 fresh runs (Macdonald ×2, Hobbs, Bol), the extraction step returned `null` for every follower count 3 of 4 times — Perplexity's search snippets essentially never expose a live, current number for Instagram (Instagram doesn't index follower counts into crawlable page text the way it once did). The one case that returned a real value (not shown above, but the consistent pattern) came back explicitly *without* a date attached, and the code has no way to know if that number came from a page crawled yesterday or cached from three years ago.

**This directly explains how a wrong number can persist:** before this session's M14 fix, a follower count that was successfully extracted *once* was written and then never overwritten — the old code skipped the field entirely (`?? undefined`) whenever a later run returned `null`, meaning a stale number, once captured, could sit in the database indefinitely even as every subsequent re-crawl correctly found nothing new. Given how rarely this pipeline finds a real number at all (3 of 4 runs, live, right now), the most probable explanation for "118K" is that it was captured once, on some earlier crawl, from a page that was already out of date when Perplexity indexed it, and was never refreshed since. The M14 fix (write `null` explicitly instead of skipping) stops *future* staleness of this kind but does not retroactively correct a number written before the fix shipped, and does not add the missing citation/freshness check — a wrong number extracted *today* would still sail through with the same lack of provenance.

**2. "PB" for Brook Macdonald.**

This is not a wrong number — it's a concept forced onto a sport it doesn't fit, and I have the model's own research explicitly saying so. Live trace, verbatim from Perplexity's research for Macdonald:

> *"I therefore cannot responsibly label any result as his PB or SB (2026) from the supplied sources alone."*

The system asks every athlete, regardless of sport, for a single "personal best" — a concept that is well-defined for track/field/swimming (one number, directly comparable across venues and time) and **not well-defined for downhill mountain biking**, where every course has a different length, gradient, and surface, so finishing times aren't comparable to each other the way sprint times are. `results-agent.ts`'s own system prompt already half-acknowledges this ("For DH MTB this is a race finishing time like '4:31.18', not a placement") but still asks for one canonical number.

Result, live-verified across two runs: `personalBest` came back `null` both times (correct, honest behavior) while `seasonBest` came back a bare, decontextualized split time — `"03:21.210"` — which the research text reveals is a **qualifying-round** time at Leogang, not a final result, not his fastest time, and completely disconnected from what actually matters about his career. Meanwhile his real defining achievement — the 2012 Val d'Isère World Cup win, his first — **is being correctly captured**, in both runs, by IntelligenceAgent, TimelineAgent, and CompetitionsAgent, with accurate details and real citations. It is not missing. It is buried in a list of ~10-25 intelligence items and ~10 timeline events with no structural priority, while the "headline stat" slot on his profile — the thing a user's eye goes to first — shows either nothing or a meaningless split time. **The bug isn't fabrication. It's that the data model has no field for "defining achievement," so a genuinely well-researched fact has nowhere prominent to live.**

### Structured-field accuracy table

Method per field: origin → authority → research → extraction → validation → storage → display → can it distinguish unknown from wrong → staleness detection → cross-checking. Classified GREEN (reliable enough for MVP) / YELLOW (usable with limitations) / RED (not trustworthy enough), evidence-based from this session's live traces plus the M13/M14 audits' broader sampling.

| Field | Origin/Authority | Validation | Unknown vs. wrong? | Staleness detection | Cross-check | **Rating** |
|---|---|---|---|---|---|---|
| Name | User input at creation | N/A (not researched) | N/A | N/A | N/A | **GREEN** |
| Nationality | User input at creation; BiographyAgent may refine | Only changes on **explicit confirmation** of a change (M10 design) | Yes — never silently overwrites | No — never re-verified once set unless changed | No | **GREEN** |
| Date of birth | **Does not exist as a field.** Only an integer `age`, set at creation, occasionally refreshed by BiographyAgent | — | — | Age drifts stale every year with no auto-increment | No | **RED** (not a DOB at all — flagged as a schema gap since M10, never actioned) |
| Sport / Discipline | User input at creation | None (trusted as entered) | N/A | N/A | N/A | **GREEN** |
| Current team | Not a first-class field. Surfaces (if at all) inside free-text `intelligence_items`/`sponsorships`, not a structured column | None | No — no dedicated field to be right or wrong in | No | No | **RED** (doesn't exist as queryable structured data despite being core to "who does this athlete represent right now") |
| Personal best | ResultsAgent, single Perplexity+GPT-4o pass | `resolveSourceAttribution`-style citation trust at the *research* level (citations shown to the model) but **no code-level enforcement that the returned mark traces to one of them** — unlike every category-based agent | Yes for track/field (honest null when unsure) | No | Only PB≤SB internal consistency, not against a second source | **YELLOW for track/field/jump/throw sports, RED for course-variable sports (DH MTB, ski cross, similar)** |
| Season best | Same agent, same mechanism | Same | Partial — DH MTB case shows a decontextualized-but-technically-real split can pass through | No | Same as PB | **Same split rating as PB** |
| Major wins / podiums | Scattered across IntelligenceAgent (`results_rankings`), TimelineAgent, CompetitionsAgent — **three separate, independently-researched, uncoordinated agents, no shared "this is a major win" flag** | Per-agent citation checks (real, and they work — zero fabrication found across this whole engagement's audits) | Yes, each agent independently | No | No cross-agent dedup/reconciliation beyond incidental overlap | **YELLOW** — individually well-sourced, but not modeled as a first-class fact, so nothing guarantees it surfaces prominently or even once |
| World Cup / World Championship / Olympic results | CompetitionsAgent (generic across all competition tiers, no distinct handling) | Citation-checked, generic-meet-name filter | Yes | Status field now deterministic (M14 fix) | No | **GREEN for status/date integrity, YELLOW for completeness** (run-to-run count varies 1–32 for the same athlete, already documented) |
| Rankings (world/national) | ResultsAgent | citation-checked at research level, not code-enforced | Yes (honest null common) | No — delta is a same-call snapshot comparison, not a true historical diff | No | **YELLOW** — national ranking is empty for the large majority of athletes tested across this entire engagement; world rank present but is a single Perplexity snapshot with no way to detect a stale figure |
| Competition history/results | CompetitionsAgent | Citation-checked, generic-name-rejected, status now deterministic | Yes | Yes (M14 fix) | No | **GREEN**, best-verified category in the system |
| Social handles | SocialProfilesAgent | Format-validated, conservative (declines to guess) | Yes | No | No | **GREEN** for correctness of what's stored, **YELLOW** for completeness (misses real accounts often, confirmed live this session — 2 of 4 athletes got no handle at all this run) |
| Follower counts | SocialMetricsAgent / social-extract.ts | Handle-match check only; **zero citation/date capture on the number itself** | **No — cannot distinguish a fresh number from a three-year-old one, ever, by design** | **No mechanism exists** | No | **RED** — root cause of the reported bug, confirmed live |
| Sponsorships | SponsorsAgent | Citation-checked, confidence decay by publish date (best-designed freshness handling in the system) | Yes | **Yes — the only field with genuine, deliberate staleness modeling** | No | **GREEN**, ironically the most rigorous field in the system |
| Contacts | ContactsAgent | Citation-checked, `confirmed_absent` vs `no_evidence` distinction, `verified`/`unconfirmed` status | Yes, explicitly modeled | No | No | **GREEN** |
| Biography (age/nationality) | BiographyAgent | Explicit-confirmation-only overwrite | Yes | No (age never auto-increments) | No | **YELLOW** |
| Timeline | TimelineAgent | Citation-checked, dedup within run | Yes | No | No | **GREEN** |
| Intelligence/news | IntelligenceAgent + SponsorsAgent (merged) | Citation-checked | Yes | Published-date exists but never checked against "today" — this session's earlier audit found one item dated in the future (2026-12-31), a narrow but real gap | No | **GREEN with one known edge case** |

**Pattern across the whole table: everything that goes through the shared `resolveSourceAttribution()` chain (Competitions, Contacts, Timeline, Sponsors, Intelligence) is genuinely well-built** — this is real, repeatedly-verified engineering across M4–M14, and the zero-fabrication track record holds up again in this session's fresh testing. **Everything that bypasses that chain (`social-extract.ts`, and to a lesser extent `results-agent.ts`'s PB/SB, which cites research but doesn't enforce the citation on the specific mark returned) is where the trust breaks down.** That is a narrow, identifiable, fixable architectural seam — not a wholesale failure of the AI-research approach.

---

## PART 3 — Sport-Specific Data Model

**The current model assumes every sport reduces to: a rank, a personal best, a season best, and a list of competitions. This is wrong for a meaningful share of the sports the onboarding flow itself offers** (the sport picker in `NewAgentPage.tsx` lists ~50 sports including Boxing, Judo, Gymnastics, Sailing, Golf, Team sports).

Evidence from this session's live testing, three sport archetypes:
- **Timed, course-invariant (800m, sprints):** Peter Bol's PB (1:42.55, Monaco, 2025) came back clean, well-cited, cross-validated against SB. The model fits perfectly.
- **Measured, single-competition (High Jump):** Hamish Kerr's PB (2.36m, Glasgow, 21 Mar 2024) came back equally clean. The model fits.
- **Course-variable, achievement-based (Downhill MTB):** Brook Macdonald's PB came back null (correctly, the research says so explicitly) and SB came back a decontextualized qualifying split. The model does not fit, and the research model *itself* said so in plain language.

**What the correct conceptual model should be**, based on this evidence (analysis only, not a design to implement yet, per your instruction):

1. **Separate "defining achievements" from "performance marks."** A win, a podium, a record, a title — these are discrete, dated, evidenced *events*, not a rolling numeric stat. They should be first-class, structurally distinct from PB/SB, not left to compete for space inside a generic intelligence feed alongside interview coverage.
2. **"Personal best" should be sport-aware, not universal.** For time/distance/height/weight sports it's a real, valuable, comparable number. For placement/score/achievement sports (many combat sports, gymnastics, sailing, team sports) it should not be asked for at all — a null PB field on every dossier for these sports is not a bug to fix by finding *a* number, it's a sign the field doesn't apply and the UI should say so rather than show an empty slot that reads as missing data.
3. **Results should be represented independently of summary statistics.** The competition history table already does this well (CompetitionsAgent). PB/SB is the outlier that tries to compress a career into one number regardless of whether that's meaningful for the sport.
4. This is not a redesign proposal — it's a description of the shape a correct model would have. The concrete next step (not to be started yet) would be a small sport-taxonomy table (e.g. `metricType: "time" | "distance" | "height" | "weight" | "score" | "placement-only"`) that both gates what ResultsAgent asks for and tells the UI when to render "Personal Best" at all versus a "Career Highlights" module instead.

---

## PART 4 — Admin Panel Audit

**Most severe finding of the entire audit, and it belongs here because the admin panel's absence of user-athlete linkage is the symptom that exposed it:** `lib/db/src/schema/*.ts` — every table, checked directly — **contains no `userId`, `ownerId`, `organizationId`, or any tenant column anywhere.** `GET /athletes` is `db.select().from(athletesTable)` with no `WHERE` clause tied to the caller. **Every signed-in user sees, edits, and can delete every athlete in the system, added by any other user.** The `squad` field looked like it might be an implicit scoping mechanism — it isn't; it's a free-text label, never used in any query's `WHERE` clause.

This means the admin panel's inability to show "athletes per user" isn't a missing UI feature — **the concept doesn't exist in the data model to display.** Two customers on this product today would each see 100% of the other's roster, notes, and contacts.

### Against your requested checklist

**User management**
| Capability | Status |
|---|---|
| View all users | ✅ (`/admin/customers`, merges Clerk + Stripe) |
| Search users | ❌ frontend-only filter over the full list, not a real query |
| View email | ✅ |
| View account creation date | ✅ (`signedUpAt`) |
| View last active | ✅ (`lastActiveAt`, from Clerk) |
| View plan / subscription status | ✅ |
| Stripe customer ID | ❌ not surfaced (available internally, not exposed) |
| Billing status | Partial — subscription status shown, no explicit "billing OK/failing" indicator |
| Number of athletes per user | ❌ **cannot exist without the tenancy fix above** |
| Usage | ❌ no usage tracking of any kind exists |
| Disable/suspend/delete user | ❌ not implemented (would need to call Clerk's own admin API; nothing does) |
| Impersonation | ❌ not implemented |

**Subscription management** — plan/status/trial-end are shown (Stripe data, read-only display). No cancellation-status distinct from generic status, no failed-payment surfacing at all — Stripe webhook events are received (`webhookHandlers.ts`) but nothing in the admin UI reflects a failed charge.

**System management** — `/admin/data-health` (per-athlete population completeness/freshness) is genuinely good and is the one piece of real "system health" tooling that exists. Everything else on your list is missing: no pipeline/job-run status beyond that per-athlete view, no failed-job list, no AI/API cost tracking (confirmed: no such table, route, or counter exists anywhere), no error feed (errors go to Pino logs only, never surfaced in-app), no "recent activity" view.

**Classification of every gap above:** these are near-uniformly **missing backend capability**, not "backend exists, UI doesn't." The one partial exception is Stripe customer ID (data exists in Stripe, just not piped into the `/admin/customers` response). Usage tracking and per-user athlete counts require the tenancy fix as a prerequisite before they can even be defined. User disable/delete/impersonation would need new integration with Clerk's management API — none of that plumbing exists today.

---

## PART 5 — User Journey / UX Audit

**Stated plainly: this section is code-inspection-based.** I do not have working Clerk credentials in this environment (confirmed in an earlier session) and cannot click through the live app. Every item below is either a direct reading of the component code or a previously-established, live-verified fact from this engagement; I have not personally observed the rendered UI today.

1. **Landing page** — built out, no placeholder content found in a read of `LandingPage.tsx`.
2. **Sign up** — Clerk-hosted, standard.
3. **Login** — Clerk-hosted. Confirmed broken in practice this week for the founder's own account specifically because of the `FOUNDER_EMAIL` fail-safe interacting with a not-yet-restarted server — now understood and fixed in the code, but a real, live example of how a silent auth-state mismatch produces a confusing dead end (paywall shown instead of a clear "you're not recognized as admin" message).
4. **Onboarding** — no guided tour; a new account lands on an empty roster with the "New Agent" flow as the only path forward. Fine for a hand-held pilot, not fine unassisted.
5. **Plan selection** — this is the screen you hit the paywall on. The modal correctly reads `isAdmin`/subscription status server-side; the confusion you hit was a real config/deploy-state issue, not a UI bug.
6. **Checkout** — **confirmed broken in your own testing this week** ("Unable to start checkout"), root-caused most likely to the `stripe.*` Postgres schema never having been created (`initStripe()`'s migration fails silently and only logs a warning — the server boots fine and looks healthy while checkout is dead). Not yet confirmed against your actual server logs.
7. **First athlete** — discovery flow is real and functional per code and this session's repeated live testing.
8. **Athlete population** — works, average 20–45 seconds per athlete in every live test this whole engagement, ~24–28 AI/API calls per athlete (Part 6).
9. **Dashboard** — functional per code; globe visualisation has known incompleteness (roadmap items #21–26, pre-existing).
10. **Athlete dossier** — the deepest, most tested part of the product. Data accuracy caveats are Part 2's whole subject.
11. **Intelligence feed** — functional, well-sourced per every audit this engagement.
12. **Timeline** — functional.
13. **Competitions** — functional, status/date integrity fixed this session (M14).
14. **Contacts** — functional, the best-designed category (confirmed/unconfirmed status distinction).
15. **Social information** — the weakest data category in the product; see Part 2.
16. **Alerts** — schema and routes exist; **no code anywhere sends a notification** (no email service integration found, no push). An alert "config" can be saved but nothing acts on it. This is a D-category item (looks implemented, isn't) not previously flagged in this engagement.
17. **Chat** — functional per code, database-first design verified sound, real usage patterns never load-tested.
18. **Settings** — exists; specific contents not audited in this pass (lower priority given everything above).
19. **Billing** — checkout is broken (item 6). Portal (`/stripe/portal`) not verified this session.
20. **Logout** — standard Clerk, no reason to expect an issue, not independently verified.

---

## PART 6 — Engineering Architecture

**Frontend:** React 19 + Vite 7 + Tailwind v4, well-organized, consistent design-token system (verified extensively across this engagement's UI touches). One production build warning: several JS chunks exceed 500KB post-minification (cosmetic, not correctness).

**Backend:** Express 5, centralized auth gate, real rate limiting (now on every AI-cost route as of this session), Helmet with a real CSP, CORS allowlist, 1MB body limit, 30s timeout, global error handler that doesn't leak stack traces. This is a genuinely solid baseline — better than most MVPs at this stage.

**PostgreSQL:** schema is coherent for a single-tenant model; **no migration history** (`drizzle-kit push` only — self-documented pre-existing gap, `docs/technical-debt.md` Priority 8); **no tenancy** (Part 4, the headline finding).

**Auth (Clerk):** sound design, centralized, admin re-verified server-side. Now fail-safe by construction (this session's fix) rather than a hardcoded string.

**Stripe:** infrastructure is real (webhook handling, sync library, checkout/portal routes) but currently non-functional in practice (checkout error) and not enforced (no plan gating). Two different kinds of broken — one is a bug, the other is a design gap.

**AI integrations (OpenAI, OpenRouter/Perplexity):** the 8-agent architecture (M4–M12) is the strongest part of this codebase — consistent never-throws contract, shared retry/concurrency/rate-limit infrastructure, real citation enforcement in 5 of 8 agents. The 2 gaps found this session (social follower counts, PB/SB citation enforcement) are narrow and specific, not systemic.

**Background processing:** in-process `setTimeout`-based scheduler, no job queue, 3 athletes per 6-hour cycle. Explicitly self-documented as a scale ceiling (technical-debt.md Priority 9) — confirmed accurate.

**Observability:** Pino structured logging, one DB-connectivity health check. **No APM, no error tracking service, no cost/usage dashboard.** Confirmed again this session — nothing new found.

**Security/secrets:** solid (Part covered exhaustively in the MVP readiness assessment and this session's `FOUNDER_EMAIL` fix). No new issues found.

### AI/API call cost per athlete population — measured from the actual orchestration code

Counting every `Promise.all` branch in `auto-populate.ts` plus each agent's own internal calls:

| Agent | Perplexity calls | OpenAI calls |
|---|---|---|
| ResultsAgent | 1 | 1 |
| PhotoAgent (federation + Wikipedia fallback) | 1–2 | 1–2 |
| CompetitionsAgent | 1 | 1 |
| ContactsAgent (2 scopes) | 2 | 2 |
| TimelineAgent | 1 | 1 |
| SponsorsAgent | 1 | 1 |
| SocialProfilesAgent | 1 | 1 |
| BiographyAgent | 1 | 1 |
| IntelligenceAgent (3 categories) | 3 | 3 |
| SocialMetricsAgent (Perplexity fallback only, if IG/TikTok handle found) | 0–1 | 0–1 |
| **Total per populate/repopulate cycle** | **~12–14** | **~12–14** |

**~24–28 AI API calls per athlete, every time it's populated or repopulated** — at creation, on every manual "Repopulate" click, and on every scheduled 5-day-stale re-crawl. This is a real, code-derived number, not an estimate.

**Scale projection (call volume only — I do not have your actual per-token OpenAI/OpenRouter pricing tier, so I'm not inventing a dollar figure; what you'd need to measure is noted below):**

| Roster size | Initial population burst | Ongoing steady-state | Scheduler math |
|---|---|---|---|
| 10 athletes | ~260 calls | Low, fully refreshes within a day | Fine — well under the 5-day staleness target |
| 100 athletes | ~2,600 calls (rate-limited to 5 bulk-imports/hour post-M14, so hours to fully submit) | ~2,600 calls per full refresh cycle | **Already broken**: 100/3-per-6h-cycle ≈ 8.3 days per full refresh — exceeds the 5-day staleness target the system itself targets |
| 1,000 athletes | ~26,000 calls | Same per cycle | **~83 days per full refresh** — data would be months stale between updates; the in-process scheduler is not viable at this scale, independent of cost |
| 10,000 athletes | ~260,000 calls | Same | **~2.3 years per refresh cycle** — non-viable on every axis (scheduler, and per Part 4, tenancy — 10,000 athletes almost certainly implies many customers who'd all be looking at each other's data) |

**What needs to be measured, not invented:** your actual OpenAI and OpenRouter pricing tier and average token usage per call (the code caps `max_tokens`/`max_completion_tokens` per call at 256–4096 depending on the agent, which bounds the *ceiling* but not the *actual* average spend — that requires your real billing dashboard).

---

## PART 7 — Commercial MVP Readiness

| Tier | Ready? | Blockers |
|---|---|---|
| **A. Internal testing** | Yes, with caveats | Checkout is broken; social follower counts are unreliable; PB is misleading for non-track sports. All observable, all known now. |
| **B. 5 private pilot users, single organization** | Yes, conditionally | Same as A. Tenancy is not a blocker *only* because a single pilot org has nothing to leak data to. Must fix checkout before anyone can even start a trial. |
| **C. 25 paying users** | **No** | **Tenancy is now a hard blocker** — the moment there's more than one paying customer, they share one athlete roster. This is not a degraded-experience problem, it's each customer seeing 100% of every other customer's tracked athletes, notes, and contacts. Also: no billing enforcement, no user management, no failed-payment handling, checkout broken. |
| **D. 100 paying users** | No | Everything in C, plus the scheduler's staleness math is already broken at 100 athletes (not 100 *users* — even a modest average roster size per customer would push total athlete count well past the point where 5-day freshness holds). |
| **E. 1,000 paying users** | No | All of the above, plus the architecture (in-process scheduler, no job queue, no migration history, no observability) needs real engineering investment regardless of the accuracy/tenancy issues. |

**Sharpest way to say it: this product is realistically ready for exactly the scenario you're already running — one organization, a handful of trusted people, hand-monitored. It is not ready for a second paying customer, for a structural reason (tenancy) that has nothing to do with AI accuracy.**

---

## PART 8 — Current State vs. Expected Product

| Area | Expected | Current | Gap | Severity |
|---|---|---|---|---|
| Multi-tenancy / data isolation | Each customer sees only their own roster | Fully global, shared roster, no scoping column anywhere | Complete absence | **CRITICAL** |
| Social follower counts | Current, sourced, trustworthy number | Frequently null; when present, no citation or freshness check | No provenance mechanism | **HIGH** |
| Personal best (non-track sports) | Sport-appropriate representation or clear "not applicable" | Generic field applied uniformly; misleading decontextualized values possible | Data model doesn't fit the domain | **HIGH** |
| Major achievements | Prominent, structured, guaranteed to surface | Well-researched but buried in generic feeds, no dedicated field | No architectural home for this fact type | **MEDIUM–HIGH** |
| Billing enforcement | Non-paying users blocked from paid features | Nothing server-side checks subscription status | Missing capability | **HIGH** (before any real paying customer) |
| Checkout | Working trial signup | Currently erroring for every attempt | Broken feature | **CRITICAL** (blocks revenue entirely) |
| Admin — user management | View/manage real customers | Read-only merge of Clerk+Stripe; no suspend/delete/impersonate/usage | Partial | **MEDIUM** |
| Admin — system health | Job status, errors, AI costs | Only per-athlete data-completeness view | Mostly missing | **MEDIUM** |
| Feature flags | Real, persisted toggles | UI exists, backend is a no-op | Fake feature | **LOW–MEDIUM** (deceptive, but low usage impact today) |
| National ranking | Populated where it exists | Empty for most athletes across every audit this engagement | Possibly real-world data scarcity, possibly research gap — undetermined | **LOW–MEDIUM** |
| Alerts | Notify users of new intelligence | Config UI exists; nothing sends anything | Missing capability | **MEDIUM** |
| Scheduler at scale | Refresh a growing roster within its staleness target | Breaks its own 5-day target at ~100 athletes | Architectural ceiling | **MEDIUM at current scale, HIGH beyond it** |
| Observability | Errors and costs visible to the founder | Logs only, no APM, no cost tracking | Missing | **MEDIUM** |
| DB migrations | Auditable schema history | Direct push, no history | Missing | **LOW at current scale** |

---

## PART 9 — What Should We Actually Build?

**Recommendation: Option A — continue with the current architecture and fix the identified issues — with one addition that isn't in your A–E list as written: the tenancy fix must happen before Option A's "fix the issues" framing is sufficient for anything beyond a single-org pilot.**

Reasoning, directly against the evidence above:
- **Option E (not viable) is not supported by the evidence.** The core research/extraction/validation architecture (5 of 8 agents doing real, citation-enforced, repeatedly-verified work across M4–M14) is genuinely sound engineering. The accuracy bugs found this week are narrow and specifically located (one agent's missing citation capture, one field's sport-model mismatch), not evidence of a broken approach.
- **Option C (rebuild significant architecture) is not supported either.** The backend patterns (agent isolation, never-throws contracts, shared retry/rate-limit infra, real auth) are worth keeping. What's missing is additive (a tenant column and its enforcement, a sport-metric-type table, source citation on two specific fields) not a teardown.
- **Option B (redesign frontend/admin, keep backend) undersells how much backend work is actually required** — tenancy is a backend/schema change, not a frontend one, and it's the most urgent item on the list.
- **Option D (simplify, remove unreliable features) is worth doing narrowly, not broadly.** Specifically: stop presenting a generic "Personal Best" for sports where it doesn't apply (Part 3), and consider hiding follower counts entirely until the citation/freshness gap is closed, rather than showing a plausible-but-unverifiable number. This is a targeted trust decision, not a product simplification.

**The real answer is Option A, sequenced correctly: tenancy and checkout are launch-blocking bugs/gaps, not roadmap items. Everything else in this report is real but does not block getting back to a working private pilot.**

---

## PART 10 — Migration Decision (Base44)

Classifying the problems found in this audit against your six categories:

1. **Platform problems** — none found. Nothing in this audit traces to Replit, GitHub, or Claude Code as a platform. The checkout bug is a database-migration/init-sequencing bug in application code; the tenancy gap is a schema design decision; none of it is caused by where the code runs.
2. **Architecture problems** — one real one: the in-process scheduler's scale ceiling (Part 6). Everything else architectural (agent isolation, retry/rate-limiting, auth) is sound.
3. **Data/research problems** — yes, the specific ones in Part 2 (social citation gap, PB/SB citation enforcement, sport-model mismatch).
4. **Product-definition problems** — yes: "personal best" as a universal concept, "current team" not being a structured field, "major win" having no architectural home. These are product-modeling decisions, not implementation bugs.
5. **UI/UX problems** — some (Part 5's item 16, feature flags), mostly secondary to the above.
6. **Normal MVP incompleteness** — the majority of Part 4's admin gaps, notification sending, usage tracking.

**Would migrating to Base44 solve any of these?** No. Every problem found in this audit is either (a) a data-model/schema decision that would need to be redesigned identically on any platform, (b) an application-logic gap (missing citation capture, missing tenant scoping, a silently-failing Stripe migration) that is Node/TypeScript/Postgres code, portable and rebuildable but not *fixed* by moving it, or (c) a genuine research-quality question about how LLMs handle sport-specific facts, which is a prompt/architecture problem independent of hosting platform entirely. **None of the findings in this report are attributable to Claude Code, GitHub, or Replit as tools.** Migrating would mean re-implementing the same tenancy model, the same citation-enforcement pattern, and the same sport-metric-type decision on unfamiliar tooling, while carrying the same open bugs forward until someone fixes them there instead of here. If anything, migration now would be strictly worse: you'd be debugging the Stripe checkout failure and the tenancy gap in a new, less-understood codebase instead of one this engagement has traced end-to-end, repeatedly, for months.

---

## FINAL OUTPUT

**1. Executive summary.** The AI research/extraction core is genuinely solid engineering — real citation enforcement, zero fabrication across every audit this engagement has run, a coherent 8-agent architecture. Two real, narrow accuracy gaps exist (social follower-count provenance, sport-inappropriate "personal best") and are now root-caused, not just described. Those are not the biggest problem. **The biggest problem is that the product has no multi-tenancy at all** — every customer would see every other customer's data — combined with a currently-broken Stripe checkout that blocks revenue entirely. Neither is a Claude Code/GitHub/Replit platform issue.

**2. Is this idea viable?** Yes. Nothing found in this audit undermines the core premise (AI-researched, evidence-attributed athlete intelligence). The research architecture proves the concept works when the citation-enforcement pattern is applied consistently — it just isn't applied to two specific fields yet, and the multi-customer data model was never built.

**3. MVP readiness score:** Ready for exactly what you're running today (one org, hand-monitored, private). **Not ready for a second paying customer.**

**4. Data accuracy assessment:** Strong core (Competitions, Contacts, Timeline, Sponsors, Intelligence — GREEN), weak periphery (social follower counts — RED, PB/SB for non-track sports — YELLOW/RED depending on sport), one previously-undocumented-in-this-form insight: the failure mode is architectural inconsistency (5 of 8 agents enforce citations, 2 don't), not a general reliability problem with LLM research.

**5. Admin panel assessment:** Genuinely useful for what it does (customer list, per-athlete data health) but far short of a real SaaS console — no usage tracking, no user lifecycle management, one actively-fake feature (flags).

**6. UX assessment:** Code-level, not click-through-verified. Core dossier experience is deep and real. Checkout is broken. Alerts are a non-functional stub.

**7. Architecture assessment:** Strong backend fundamentals (security, auth, agent design). Two structural ceilings: the in-process scheduler (breaks its own staleness target at ~100 athletes) and the missing tenant model (breaks the product at 2 customers, not 100).

**8. Commercial/scalability assessment:** Viable at pilot scale today. Blocked at the next tier by tenancy and checkout specifically, not by a broad list of small issues.

**9. Issue list:**
- CRITICAL: no multi-tenancy; Stripe checkout broken
- HIGH: social follower-count provenance; PB/SB sport-model mismatch; no billing enforcement
- MEDIUM: admin system-health gaps; non-functional alerts; fake feature flags; scheduler scale ceiling; no observability/cost tracking
- LOW: no migration history; national ranking mostly empty (cause undetermined); missing DOB field

**10. Recommended path forward:** Option A (continue current architecture, fix identified issues), with tenancy and checkout treated as pre-pilot-continuation blockers, not roadmap items.

**11. What NOT to build yet:** admin user-suspend/impersonation, usage dashboards, notification sending, a sport-taxonomy redesign implementation (design it, don't build it yet), Base44 migration.

**12. What MUST be fixed before any pilot beyond the current single org:**
- Multi-tenancy (schema + every query)
- Stripe checkout (root-cause the migration failure, confirm from real logs)
- Social follower-count citation/freshness enforcement (bring it up to the standard every other agent already meets)
- Either scope "Personal Best" to sports where it's meaningful or clearly label it "not applicable" for course-variable/achievement sports

**13. What can safely wait:** admin usage tracking, feature flags (fix or remove the fake UI, low urgency either way), scheduler rearchitecture (fine until ~100 athletes), DB migration history, observability/APM, DOB field, national ranking investigation.

**14. Base44 migration:** Not advisable. None of the findings in this audit are platform problems; migrating carries every open bug forward into a less-understood codebase.

**15. Proposed next 3 milestones (analysis only, not started):**
1. Multi-tenancy: add the tenant column, scope every query, migrate/backfill existing data — the single highest-leverage fix in this report.
2. Fix Stripe checkout (confirm root cause from real logs first, per this report's hypothesis) and add minimal server-side subscription enforcement.
3. Bring `social-extract.ts` and `results-agent.ts`'s PB/SB up to the same citation-enforcement standard as the other 5 agents, and resolve the sport-model mismatch for "Personal Best" (design in Part 3, implementation not started).

---

*No code, database, or deployment changes were made during this audit. Waiting for direction before any implementation begins.*
