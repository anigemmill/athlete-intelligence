# M7 Production Backfill — Step-by-Step Runbook

**Purpose:** run `scripts/backfill-owner-id.ts` once against your real production database, safely, with a way to confirm at every step that you're touching the right database and that it did the right thing.
**Status:** guidance only. Nothing has been run against production. This document makes no changes.

---

## Step 0 — Prerequisite: get M7 onto Replit at all

This matters and is easy to miss: the M7 work (the schema change and the backfill script) lives on the branch `claude/live-pipeline-verification-m9mwzq` in GitHub, **not on `main`**. Per your standing workflow (GitHub is source of truth, Replit deploys from `main`, you "Republish" after pulling), Replit will not have `scripts/backfill-owner-id.ts` until this branch's commits reach `main` and Replit pulls them.

Two ways to do that — your call, I haven't done either:
- **Merge the branch into `main` on GitHub** (directly, or via a pull request if you'd like me to open one — I haven't, since you didn't ask for one), then in Replit pull `main` and Republish as usual.
- Or, if you'd rather test on the branch first: in Replit's Git pane, check out `claude/live-pipeline-verification-m9mwzq` directly before running anything below.

Either way, confirm the file exists before continuing:
```
ls artifacts/api-server/scripts/backfill-owner-id.ts
```
If that errors with "No such file," the code isn't there yet — stop and resolve Step 0 first.

---

## Step 1 — Where to run it

**Replit's Shell tab** (not the Console/webview, the actual Shell), in the project root (`/home/runner/<your-repl-name>` or wherever `pnpm-workspace.yaml` lives — run `pwd` and `ls pnpm-workspace.yaml` to confirm you're at the repo root).

This must be Replit specifically, not your local machine or this Claude Code session — the script needs the real `DATABASE_URL`, `CLERK_SECRET_KEY`, and `FOUNDER_EMAIL`, which only exist in Replit's environment/Secrets.

---

## Step 2 — Confirm you're actually pointed at production before running anything

Do this before the backfill, not after. In the Replit Shell:

```
echo $DATABASE_URL
```

Check the **host/database name portion** (not the password) matches what you know to be your real production database — e.g. it should look like a Neon/Replit-managed Postgres URL, not `localhost`. If you're unsure what your production `DATABASE_URL` should look like, check Replit's **Secrets** pane (padlock icon in the sidebar) for the `DATABASE_URL` entry — that's the actual value the running app uses.

Then run a read-only sanity check against it — this only reads, it changes nothing:

```
psql "$DATABASE_URL" -c "SELECT count(*) FROM athletes;"
psql "$DATABASE_URL" -c "SELECT id, name FROM athletes ORDER BY id LIMIT 5;"
```

You should see your real athlete count and recognize real names (Brook Macdonald, Peter Bol, Zoe Hobbs, Hamish Kerr, etc. — whichever you've actually created). **If this returns 0 rows or unfamiliar names, stop — you are not connected to production**, and running the backfill next would do nothing harmful (it only writes to existing rows) but wouldn't accomplish anything either.

---

## Step 3 — Run the backfill

```
pnpm --filter @workspace/api-server exec tsx scripts/backfill-owner-id.ts
```

No arguments needed for the normal path — it resolves your Clerk user id automatically from `FOUNDER_EMAIL`.

---

## Step 4 — What the output should look like

The script prints five numbered steps. Here's what a **successful** run looks like, line by line:

```
── M7 owner_id migration + backfill ──────────────────────────
[1/5] Ensuring athletes.owner_id column exists (nullable for now)…
[2/5] Resolving target owner id…
      Resolved owner id: user_XXXXXXXXXXXXXXXXXXXXXXXX
[3/5] Backfilling rows with no owner_id…
      Rows updated: <N>
[4/5] Verifying no rows remain unowned…
[5/5] Enforcing NOT NULL and creating the index…
─────────────────────────────────────────────────────────────
✓ Done. <N> athlete row(s) now have a non-null owner_id (owner: user_XXXXXXXXXXXXXXXXXXXXXXXX).
```

What to check:
- **`Resolved owner id`** should look like a real Clerk id (`user_` followed by a long alphanumeric string) — not an email, not empty. This is *your* Clerk user id, resolved by matching `FOUNDER_EMAIL` against Clerk's user list.
- **`Rows updated`** should equal your real athlete count from Step 2 (or close to it — 0 is expected only if you've run this before and it's already backfilled; that's fine, see "idempotent" below).
- The final `✓ Done.` line's row count should match Step 2's `SELECT count(*)` exactly.
- **Exit code 0** (the shell prompt returns normally, no red error text).

### What a failure looks like, and what it means

If Clerk can't resolve your account (e.g. `CLERK_SECRET_KEY` misconfigured, or `FOUNDER_EMAIL` doesn't match any real Clerk user), you'll see something like:

```
[2/5] Resolving target owner id…
✗ No Clerk user's primary email matches FOUNDER_EMAIL (you@example.com). Cannot backfill without a resolved owner. Pass --owner-id=<clerkUserId> to bypass this lookup.
```

or a raw Clerk API error (e.g. `403 Forbidden`) if the secret key itself is wrong. **Either way, the script exits with a non-zero code and has not touched the database** — this was verified directly during M7's testing: a failed resolution aborts before any row is written. It's safe to fix the underlying issue (correct `FOUNDER_EMAIL`, or check `CLERK_SECRET_KEY` in Secrets) and re-run.

If you want to bypass the Clerk lookup entirely and specify your Clerk user id directly (find it in the Clerk Dashboard → Users → your account → the ID at the top of the page, starts with `user_`):

```
pnpm --filter @workspace/api-server exec tsx scripts/backfill-owner-id.ts --owner-id=user_XXXXXXXXXXXXXXXXXXXXXXXX
```

---

## Step 5 — Verify afterward

Run these read-only checks in the Replit Shell:

**5a. Every athlete has a non-null owner_id (this is now structurally guaranteed by the column constraint, but confirm it explicitly):**
```
psql "$DATABASE_URL" -c "SELECT count(*) FROM athletes WHERE owner_id IS NULL;"
```
Expected: `0`.

**5b. Every athlete has the *same* owner_id (correct for a single-founder pre-M8 state), and it matches what the script reported:**
```
psql "$DATABASE_URL" -c "SELECT owner_id, count(*) FROM athletes GROUP BY owner_id;"
```
Expected: exactly **one row**, with the `owner_id` matching the `Resolved owner id` from Step 4's output, and the count matching your total athlete count.

**5c. Cross-check that owner_id is really *your* Clerk id, not a coincidence:**
Open Clerk's Dashboard → Users → your account. Compare the ID shown there against the `owner_id` value from 5b. They should be identical.

**5d. Confirm nothing else about your athlete data changed:**
```
psql "$DATABASE_URL" -c "SELECT id, name, sport, nationality FROM athletes ORDER BY id;"
```
Compare against what you'd expect — names, sports, nationalities should be exactly as they were before. The backfill only ever touches the `owner_id` column.

**5e. Confirm the constraint and index are actually in place (not just that rows happen to have a value):**
```
psql "$DATABASE_URL" -c "\d athletes" 
```
Look for `owner_id | text | not null` in the column list, and `idx_athletes_owner_id` under Indexes.

---

## Safety notes

- **Idempotent.** If something interrupts the run, or you're not sure it fully completed, it's safe to just run it again — it only ever updates rows where `owner_id IS NULL`, and every other step (`ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`) is a no-op if already done.
- **Never overwrites an existing owner_id.** If you ever create a second real user before M8 ships (not recommended, but worth stating), re-running this script would not touch that user's athletes — only rows still `NULL`.
- **This does not enable multi-tenancy yet.** After this runs, every athlete belongs to you specifically, but `GET /athletes` and every other route still returns the full roster to any signed-in user — that enforcement is M8, not yet built. This backfill is the prerequisite, not the fix.

---

*Bring me the actual output (or a description of where it diverged from the above) and I'll help you interpret it before we touch anything else.*
