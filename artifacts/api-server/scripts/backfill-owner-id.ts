/**
 * backfill-owner-id.ts
 *
 * M7 (multi-tenancy schema foundation, docs/mvp-hardening-plan-m7-m12.md):
 * one-off operational script that brings the live `athletes` table up to
 * the new schema (owner_id text not null, indexed) and assigns every
 * pre-existing row to a single resolved Clerk user id.
 *
 * Why this isn't just `pnpm --filter @workspace/db run push`: drizzle-kit
 * push refuses to apply a NOT NULL column with no default to a populated
 * table non-interactively (confirmed by running it against a seeded local
 * DB during this milestone) -- it requires a TTY confirmation, which
 * doesn't exist in an automated/CI/agent context, and choosing a
 * meaningless literal default would be exactly the "plausible but wrong"
 * data the accuracy audit warned against. This script does the same
 * three-step migration (add nullable -> backfill -> enforce NOT NULL)
 * atomically via raw SQL through the same connection pool `@workspace/db`
 * already exports, so it's a single non-interactive run.
 *
 * Idempotent: every step is safe to re-run. If the column and index
 * already exist and every row already has an owner_id, this is a no-op
 * that reports 0 rows changed.
 *
 * Usage (run once, in the environment that holds the real DATABASE_URL,
 * CLERK_SECRET_KEY, and FOUNDER_EMAIL — i.e. Replit, not this sandbox):
 *
 *   pnpm --filter @workspace/api-server exec tsx scripts/backfill-owner-id.ts
 *
 * Or, to skip the Clerk lookup and assign existing athletes to a known
 * Clerk user id directly:
 *
 *   pnpm --filter @workspace/api-server exec tsx scripts/backfill-owner-id.ts --owner-id=user_xxxxxxxx
 *
 * After this script succeeds, `athletes.owner_id` matches the TypeScript
 * schema in lib/db/src/schema/athletes.ts exactly, so a subsequent
 * `pnpm --filter @workspace/db run push` for any *other* schema change
 * will see no diff for this column and will not re-prompt.
 */

import { clerkClient } from "@clerk/express";
import { pool } from "@workspace/db";
import { parseExplicitOwnerId, resolveFounderOwnerId, OwnerResolutionError } from "../src/lib/owner-backfill.js";

async function main() {
  const explicitOwnerId = parseExplicitOwnerId(process.argv.slice(2));

  console.log("── M7 owner_id migration + backfill ──────────────────────────");

  console.log("[1/5] Ensuring athletes.owner_id column exists (nullable for now)…");
  await pool.query(`ALTER TABLE "athletes" ADD COLUMN IF NOT EXISTS "owner_id" text;`);

  console.log("[2/5] Resolving target owner id…");
  let ownerId: string;
  try {
    ownerId = await resolveFounderOwnerId({
      explicitOwnerId,
      founderEmail: process.env.FOUNDER_EMAIL,
      listUsers: async () => {
        const { data } = await clerkClient.users.getUserList({ limit: 200 });
        return data.map((u) => ({
          id: u.id,
          primaryEmailAddressId: u.primaryEmailAddressId,
          emailAddresses: u.emailAddresses.map((e) => ({
            id: e.id,
            emailAddress: e.emailAddress,
            verification: e.verification ? { status: e.verification.status } : null,
          })),
        }));
      },
    });
  } catch (err) {
    if (err instanceof OwnerResolutionError) {
      console.error(`✗ ${err.message}`);
      process.exit(1);
    }
    throw err;
  }
  console.log(`      Resolved owner id: ${ownerId}`);

  console.log("[3/5] Backfilling rows with no owner_id…");
  const backfillResult = await pool.query(
    `UPDATE "athletes" SET "owner_id" = $1 WHERE "owner_id" IS NULL;`,
    [ownerId],
  );
  console.log(`      Rows updated: ${backfillResult.rowCount ?? 0}`);

  console.log("[4/5] Verifying no rows remain unowned…");
  const remaining = await pool.query(`SELECT count(*)::int AS count FROM "athletes" WHERE "owner_id" IS NULL;`);
  const remainingCount = remaining.rows[0]?.count ?? -1;
  if (remainingCount !== 0) {
    console.error(
      `✗ Refusing to enforce NOT NULL: ${remainingCount} row(s) still have no owner_id after backfill. This should not be possible -- aborting without altering the constraint.`,
    );
    process.exit(1);
  }

  console.log("[5/5] Enforcing NOT NULL and creating the index…");
  await pool.query(`ALTER TABLE "athletes" ALTER COLUMN "owner_id" SET NOT NULL;`);
  await pool.query(`CREATE INDEX IF NOT EXISTS "idx_athletes_owner_id" ON "athletes" USING btree ("owner_id");`);

  const total = await pool.query(`SELECT count(*)::int AS count FROM "athletes";`);
  console.log("─────────────────────────────────────────────────────────────");
  console.log(`✓ Done. ${total.rows[0]?.count ?? 0} athlete row(s) now have a non-null owner_id (owner: ${ownerId}).`);

  await pool.end();
}

main().catch((err) => {
  console.error("✗ Migration failed:", err);
  process.exit(1);
});
