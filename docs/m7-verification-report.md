# M7 Verification Report — Multi-tenancy: Schema and Ownership Plumbing

**Date:** 2026-08-10
**Milestone:** M7 of `docs/mvp-hardening-plan-m7-m12.md`
**Scope confirmed before implementation:** re-read `docs/product-technical-feasibility-audit-2026-08-10.md` and `docs/mvp-hardening-plan-m7-m12.md` in full before making any change. M7's stated scope is schema + ownership plumbing only — add `owner_id`, backfill existing athletes to the founder's Clerk id, write `owner_id` on new-athlete creation, no route-level read/write enforcement (that's M8), no Stripe/AI/UI changes.

---

## What changed

### 1. Schema — `lib/db/src/schema/athletes.ts`

Added `ownerId: text("owner_id").notNull()` to the `athletes` table, plus a btree index (`idx_athletes_owner_id`) — exactly as specified. No local foreign key: users live in Clerk, not in this database, matching how `founderAccess.ts` already treats Clerk identity as the source of truth. No child table (`intelligence_items`, `competitions`, `contacts`, `timeline_events`, `sponsorships`) was touched — per the plan, ownership scoping in M8 will happen through the existing `athlete_id` FK joins, not a duplicated column.

### 2. Athlete-creation routes — `artifacts/api-server/src/routes/athletes.ts`

All three routes that insert into `athletes` now stamp `ownerId` from the authenticated request:
- `POST /athletes` (direct create)
- `POST /athletes/bulk` (bulk import)
- `POST /athletes/discover` (AI-assisted create-by-name) — the plan named only the first two explicitly; this third insert site exists in the same file and would otherwise have been left unscoped, so it's included for the same reason.

A small helper, `ownerIdOf(req)`, extracts `req.userId` (set by `requireAuth`, which runs ahead of every non-public route per `routes/index.ts`) — added once and reused at all three call sites rather than repeating the inline cast three times.

**No other route behavior changed.** `GET /athletes`, `GET /athletes/:id`, and every other read/update/delete route are byte-for-byte unchanged — they still return/operate on the full roster. That's deliberately M8's job, not M7's.

### 3. Backfill mechanism

Two new files, both under `artifacts/api-server` (not `lib/db`, since resolving the founder's identity requires Clerk, which the `db` package has no reason to depend on):

- **`src/lib/owner-backfill.ts`** — pure, dependency-injected resolution logic: `parseExplicitOwnerId` (reads a `--owner-id=<id>` CLI flag) and `resolveFounderOwnerId` (looks up `FOUNDER_EMAIL` against an injected Clerk user list via the *existing* `isFounderEmail()` — not a re-implementation of that logic). Throws rather than guessing whenever resolution is ambiguous: `FOUNDER_EMAIL` unset, zero Clerk users matching, or (defensively) more than one matching.
- **`scripts/backfill-owner-id.ts`** — the operational entrypoint. Idempotently: adds `owner_id` as nullable if it isn't already there, resolves the target owner id, backfills every row where `owner_id IS NULL`, verifies zero rows remain unowned, *then* applies `SET NOT NULL` and creates the index.

**Why a script instead of `drizzle-kit push`:** this was tested directly, not assumed. Running `push` against a schema with a new `NOT NULL` column and a populated table produces:

> `Found data-loss statements: You're about to add not-null owner_id column without default value... Do you still want to push changes? Error: Interactive prompts require a TTY terminal.`

That's `push` correctly refusing to silently apply a destructive change non-interactively — not a bug, but it does mean `push` alone cannot deploy this column to a live, populated `athletes` table without a human at a real terminal choosing a default value (which would itself be the wrong choice: a literal default is exactly the kind of "plausible but arbitrary" data the accuracy audit was written to move away from). The script performs the same add-nullable → backfill → enforce-NOT-NULL sequence atomically via the same connection pool `@workspace/db` already exports, so it's a single non-interactive run. Confirmed empirically afterward: with the column and constraint already in place, `drizzle-kit push` reports **"No changes detected"** — so it remains the normal tool for every future schema change; this script is a one-time bridge for this specific column.

### 4. One incidental fix required by the constraint itself

`scripts/live-pipeline-verify.ts` — the live-trace tool used throughout this whole engagement (Brook Macdonald, Peter Bol, etc.) — also inserts directly into `athletes`. The new `NOT NULL` constraint would have broken it outright. Gave it a fixed, recognizable owner id (`"live-pipeline-verify-script"`) since it's a CLI diagnostic tool with no real authenticated user behind it, not a product feature. This is the one change outside the plan's explicit file list; it exists only because the schema change would otherwise silently break existing tooling.

---

## What was deliberately NOT done (correctly deferred to later milestones)

- **No route-level read scoping.** `GET /athletes` still returns every athlete regardless of who's asking. This is M8, not M7 — confirmed by design, not an oversight.
- **No admin bypass logic, no chat-analyst scoping, no dashboard-aggregate scoping.** All M8.
- **No Stripe, AI agent, or UI changes.** Confirmed via `git status` — the diff touches exactly `lib/db/src/schema/athletes.ts`, `artifacts/api-server/src/routes/athletes.ts`, `artifacts/api-server/scripts/live-pipeline-verify.ts`, and three new files.
- **No Clerk Organizations.** Ownership is a single Clerk user id per athlete, per the plan's explicit single-owner rationale.

---

## Testing

### Unit tests — `src/lib/owner-backfill.test.ts` (12 tests, all passing)

Covers the resolution logic in isolation, with an injected fake Clerk lister (no network, no real Clerk credentials needed):
- `--owner-id` flag parsing (present, absent, empty).
- Primary-email resolution (matches Clerk's own precedence: primary → verified → first).
- Explicit override short-circuits Clerk entirely.
- Correct resolution via `FOUNDER_EMAIL` match (case-insensitive, matching `isFounderEmail`'s existing behavior).
- Throws (never guesses) when: `FOUNDER_EMAIL` unset, zero matches, or multiple matches.

### HTTP + real database tests — `src/routes/athletes.owner.test.ts` (3 tests, all passing)

Run against the real `athletes` router and a real (local) Postgres instance — same pattern as the existing `athletes.bulk.test.ts`:
1. `POST /athletes` stamps `owner_id` from the authenticated request.
2. `POST /athletes/bulk` stamps `owner_id` on every row of a multi-athlete import.
3. Two different simulated requesting users get two different `owner_id` values on their own athletes (proves the value isn't hardcoded — it actually tracks the caller).

`POST /athletes/discover` is not covered by an HTTP-level test: unlike the other two routes, its insert is preceded by an *awaited* real OpenAI call, and this project's test suite already establishes (in `athletes.bulk.test.ts`'s own docstring) the convention of not firing real, billable AI calls from automated tests. Its insert uses the identical `ownerId: ownerIdOf(req)` pattern verified for the other two routes — confirmed by direct code review, not a distinct implementation.

### Full suite + typecheck

```
pnpm --filter @workspace/api-server run test    → 36/36 pass, 0 fail
pnpm run typecheck                              → clean across api-server, web, mockup-sandbox, scripts
```

### End-to-end migration rehearsal (the closest thing to a production dry run available in this sandbox)

This sandbox has no access to the real production database or a working Clerk secret key (established earlier in this engagement) — so the actual backfill against real data cannot be executed from here. Instead, the exact production scenario was rehearsed against a local Postgres instance:

1. Dropped the `owner_id` column and seeded two rows with no `owner_id` — simulating pre-M7 production data.
2. Ran `backfill-owner-id.ts` with **no arguments** (the real production invocation) — it correctly attempted the Clerk lookup, got a `403` (the local `.env`'s Clerk key is a placeholder, not real), and **aborted with a non-zero exit code without touching any row**. Verified via direct query: both rows still had no `owner_id` afterward. This confirms the script fails loudly rather than silently proceeding on a resolution failure.
3. Re-ran with `--owner-id=user_simulated_founder` (the fallback path a real operator has if Clerk lookup isn't viable) — both rows backfilled correctly, `name`/`sport`/`event`/`nationality` on both rows confirmed unchanged, `NOT NULL` and the index both applied.
4. Re-ran the full test suite again against this now-realistic DB state — still 36/36.
5. Confirmed idempotency: running the script a second time with the same arguments reports `0` rows updated and makes no further changes.
6. Cleaned up all simulated/test rows; local DB confirmed back to 0 athlete rows.

---

## What you (or whoever has Replit/production access) need to run

Nothing in this milestone touches production. When you're ready to deploy M7:

```
pnpm --filter @workspace/api-server exec tsx scripts/backfill-owner-id.ts
```

Run this once, in the environment with the real `DATABASE_URL`, `CLERK_SECRET_KEY`, and `FOUNDER_EMAIL` (Replit). It will resolve your Clerk user id automatically via `FOUNDER_EMAIL` and report exactly how many rows it backfilled. If for any reason the Clerk lookup can't run, it aborts cleanly with a clear error and does not touch the database — you'd then have the option to pass `--owner-id=<your Clerk user id>` directly. After this script succeeds, `pnpm --filter @workspace/db run push` is safe to use normally for any future schema change — it won't re-prompt for this column.

---

## Data integrity

- Every simulated pre-existing row's `name`, `sport`, `event`, and `nationality` were confirmed unchanged after backfill.
- No child table (`competitions`, `contacts`, `timeline_events`, `intelligence_items`, `sponsorships`, `alert_configs`) was touched, queried destructively, or had its schema altered.
- The backfill script only ever writes to rows where `owner_id IS NULL` — it cannot overwrite an already-set value on a second run.

---

## Acceptance criteria (from the plan) — status

| Criterion | Status |
|---|---|
| `athletes.owner_id` is `NOT NULL` with zero rows failing the constraint | ✅ verified locally; script aborts rather than applying the constraint if any row would fail it |
| Every pre-existing athlete row backfilled to the founder's Clerk id | ✅ mechanism built and rehearsed end-to-end; **actual production backfill not yet run — requires your Replit environment** |
| New athlete (single + bulk) gets `owner_id` set to the creator's Clerk id | ✅ verified live via HTTP+DB tests |
| Full typecheck and test suite pass | ✅ 36/36 tests, clean typecheck |
| No route's read/write *behavior* changed yet | ✅ confirmed via diff — only inserts changed |

---

*No Stripe, AI agent, or UI code was touched. No route-level enforcement was added. M8 (multi-tenancy enforcement across every route) is next, pending your review and approval of this milestone.*
