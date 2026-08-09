# Private Pilot Launch Checklist — 2026-08-09

Engineering is done. This is the founder's punch list to go from "code is ready" to "first real user is in." Nothing here requires writing code — it's verification, configuration, and one manual click-through. Follow it in order; each section depends on the one before it.

---

## 1. Environment / secret verification (do this first)

Everything below lives in **Replit Secrets** for the production deployment, not `.env` — `.env` is dev-only and this repo's copy holds placeholders. Go to the Replit workspace → Secrets panel and confirm each of these is set to a **real** value, not a placeholder:

| Secret | What it's for | How to verify it's real |
|---|---|---|
| `DATABASE_URL` | Production Postgres | Replit injects this automatically for managed Postgres — confirm it's present, don't need to set manually |
| `CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` / `VITE_CLERK_PUBLISHABLE_KEY` | Auth | Should be Replit-managed Clerk keys for your **production** Clerk tenant — this is a separate tenant from dev, per `docs/setup.md` |
| `SESSION_SECRET` | Session signing | Any random 64-char string, not the `change_me_to_a_random_64_character_string` placeholder |
| `AI_INTEGRATIONS_OPENAI_API_KEY` + `AI_INTEGRATIONS_OPENAI_BASE_URL` | GPT-4o extraction, chat, AI summaries | Real OpenAI key with billing enabled |
| `AI_INTEGRATIONS_OPENROUTER_API_KEY` + `AI_INTEGRATIONS_OPENROUTER_BASE_URL` | Perplexity Sonar live research | Real OpenRouter key with billing enabled |
| `STRIPE_SECRET_KEY` | Billing | Real key — **decide now whether this is a test-mode or live-mode key** for the pilot; either is defensible, but know which one you're running |
| `PORT` | Server boot | Replit sets this automatically |
| `TWITTER_BEARER_TOKEN` (optional) | Live X follower counts | Without it, follower counts fall back to Perplexity-sourced estimates, which is what every quality audit in this engagement actually ran against — not required, but nice to have |

**One finding worth knowing about, not a blocker:** `docs/setup.md`/`.env.example` document a `FOUNDER_EMAIL` environment variable that gates `/api/admin/*` access. **It's not actually read from the environment.** The admin email is hardcoded directly in `artifacts/api-server/src/routes/admin.ts` and `routes/user.ts` as `anigemmill@theoutsidein.nz`. Setting a `FOUNDER_EMAIL` secret in Replit will have no effect. **Before you try to reach the admin panel, confirm that hardcoded address is the exact email your Clerk account signs in with** — if it isn't, you'll get a 403 on every admin route until someone edits those two files and redeploys. This is a code change, so flag it back if it needs fixing rather than something to work around.

---

## 2. Database verification

- Run `DATABASE_URL={your-production-url} pnpm --filter @workspace/db run push` to make sure the production schema is current — this includes the follower-nullability change from this session (`instagram_followers`/`twitter_followers`/`tiktok_followers` are now nullable).
- Confirm the production `athletes` table is in the state you want before real users see it — empty for a true blank slate, or pre-seeded with a few athletes if you want the pilot to open with content already populated.
- **Note on test data:** every verification run in this entire engagement (M3.1 through today) ran against a local sandbox Postgres instance I started myself in this session, never against your real Replit-managed production database. There is no cleanup needed on your end from my testing — I've never touched your actual production data. This bullet is here so you don't spend time looking for test athletes that were never there.
- If you want Stripe plans to actually show real products on the pricing page, run the one-time seed: `pnpm --filter @workspace/scripts run seed-products` (only once per Stripe account — it creates Starter/Pro/Enterprise products and prices).

---

## 3. Deploy

Per `docs/setup.md`:
1. `pnpm run build` locally (or let Replit's deploy pipeline run it) — confirms typecheck and both builds (API + web) pass. This should already be clean; it was run repeatedly throughout this engagement.
2. In the Replit dashboard, click **Publish** (or the workspace's deploy button). Replit provisions the production environment.
3. Confirm `GET /api/healthz` returns `{ "status": "ok" }` against the live production URL — this checks real DB connectivity, not just that the process started.

---

## 4. Manual UI click-through (the one thing that couldn't be done from this environment)

This sandbox has no real Clerk credentials, so this step needs your live production login. Budget about 10 minutes.

1. **Sign in** — go to the production URL, sign in via Clerk (Google or email per the existing setup). Confirm you land on the Dashboard, not an error page.
2. **Add an athlete** — use "New Agent" → single discovery, type a well-known athlete's name, confirm it resolves with a reasonable sport/nationality and doesn't 422 on an unambiguous name.
3. **Open the dossier** — confirm intelligence items, timeline, competitions, and contacts populate after the background pipeline runs (give it 1-2 minutes; the Dossier page polls automatically after you click "Refresh").
4. **The social-edit save flow specifically** (this is the one I verified at the code/API level but couldn't click through myself):
   - Open the social panel on the dossier, click into edit mode.
   - Enter or change a handle and a follower count, click Save.
   - Confirm the panel updates immediately without a page reload.
   - **Reload the page** (hard refresh) and confirm the value is still there.
   - Check the same athlete's follower count on the Compare page and confirm it matches.
   - Clear the follower count field back to blank and save — confirm it goes back to "Not verified — add follower count" rather than showing "0".
5. **Try the AI chat** — ask it something about the athlete you just added, confirm it cites a source/confidence rather than answering from general knowledge (this is the "database-first" guarantee the whole platform is built on).
6. **Admin panel** — as the founder account, confirm `/admin` loads and doesn't 403 (see the `FOUNDER_EMAIL` note above if it does).
7. **Bulk import** — try uploading a CSV/XLSX with more than 10 rows and confirm you get the new clear error message rather than a silent failure or a runaway import.
8. **Quick mobile check** — open the production URL on a phone browser. Nobody has verified this yet in this engagement; a five-minute look is enough to know if it's usable or badly broken. Not required to be perfect for this pilot (see section 6), but worth knowing which one it is.

If any of these fail, that's real signal — come back with what broke rather than working around it live.

---

## 5. Create the first pilot user

- Clerk sign-in already supports Google/email per the existing setup — the simplest path is to just tell your first pilot user the production URL and let them sign in themselves.
- If you'd rather control invitations directly, Clerk's own dashboard supports inviting specific email addresses or restricting sign-up — that's a Clerk configuration choice, not something in this codebase to change.
- New users land with an empty roster and the "New Agent" onboarding flow (Section 4, step 2) is their path to their first athlete — there's no guided product tour, so plan to walk the first few users through it live rather than expecting a self-serve experience yet.

---

## 6. Safe to defer until after the pilot

Not fixed, not blocking, deliberately deferred — don't spend time on these before inviting the first users:

- **Billing/subscription enforcement** — Stripe is wired but nothing server-side blocks a non-paying account from using the API. Fine for people you've personally vetted; revisit before self-serve signup or a customer who could churn and keep using it.
- **Monitoring/APM** — structured logs and a DB health check exist; no external error-tracking service or alerting. Fine to watch logs by hand for a small pilot.
- **Mobile/responsive polish** — genuinely unverified, not confirmed broken either. Check it (Section 4, step 8) but don't block on fixing it unless it's actually unusable.
- **Database migration history** — schema is pushed directly with no migration trail. Fine for one environment and one person; matters once a second engineer or a staging environment exists.
- **Globe filters, pin clustering, graph auto-refresh/evidence-links** (`docs/roadmap.md` #21-26) — pre-existing, lower-priority visualisation polish, unrelated to this pilot's readiness.
- **A fresh IQS quality audit** — the last measured score is 87/100 (`docs/quality-audit-2026-08-09-m14-postfix.md`), current as of this session. No need to re-run it just to launch; it's a good idea again after the pilot has generated real usage patterns worth measuring against.

---

## Net

Once sections 1-5 are done, you're not waiting on anything else from this engagement. The intelligence pipeline is measured and verified, the two pre-pilot blockers are closed, rate limiting and the bulk-import cap protect your API spend, and everything in Section 6 is a deliberate, informed deferral rather than an oversight.
