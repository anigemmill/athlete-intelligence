/**
 * owner-backfill.ts
 *
 * M7 (multi-tenancy schema foundation, docs/mvp-hardening-plan-m7-m12.md):
 * pure, dependency-injected logic for resolving which Clerk user id
 * pre-M7 athlete rows should be backfilled to. Separated from
 * scripts/backfill-owner-id.ts (the CLI entrypoint) so it's testable
 * without a real database or a real Clerk secret key -- the same reason
 * lib/bulk-import-limit.ts and lib/founderAccess.ts are small standalone
 * modules rather than inlined into a route/script.
 *
 * Two ways to resolve the target owner id, in priority order:
 * 1. An explicit --owner-id=<clerkUserId> CLI argument -- skips Clerk
 *    entirely. Useful when the operator already knows the id, or when
 *    Clerk's API is unavailable for some reason.
 * 2. Otherwise, look up FOUNDER_EMAIL (the existing single source of
 *    truth for "who is the founder," lib/founderAccess.ts) against
 *    Clerk's user list via an injected lister function, matching the
 *    same primary-email resolution routes/user.ts already uses.
 *
 * Never guesses: if neither path resolves to exactly one id, this
 * throws rather than silently backfilling to the wrong owner or to a
 * placeholder value.
 */

import { isFounderEmail } from "./founderAccess.js";

export interface ClerkUserLike {
  id: string;
  primaryEmailAddressId: string | null;
  emailAddresses: Array<{
    id: string;
    emailAddress: string;
    verification?: { status?: string | null } | null;
  }>;
}

/** Mirrors routes/user.ts's primary-email resolution exactly (kept in sync manually -- both are ~3 lines). */
export function resolvePrimaryEmail(user: ClerkUserLike): string | null {
  return (
    user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
      ?.emailAddress ??
    user.emailAddresses.find((e) => e.verification?.status === "verified")
      ?.emailAddress ??
    user.emailAddresses[0]?.emailAddress ??
    null
  );
}

/** Parses `--owner-id=<value>` from argv. Returns undefined if not present or empty. */
export function parseExplicitOwnerId(argv: string[]): string | undefined {
  const arg = argv.find((a) => a.startsWith("--owner-id="));
  if (!arg) return undefined;
  const value = arg.slice("--owner-id=".length).trim();
  return value.length > 0 ? value : undefined;
}

export class OwnerResolutionError extends Error {}

/**
 * Resolves the single Clerk user id to backfill existing athletes to.
 * Throws OwnerResolutionError (never returns an empty/guessed value) if:
 * - FOUNDER_EMAIL is unset (isFounderEmail's own fail-safe -- see
 *   founderAccess.ts -- means "no email" also means "no match", so this
 *   is caught explicitly here with a clearer message for a migration
 *   context specifically).
 * - No Clerk user's resolved primary email matches FOUNDER_EMAIL.
 * - More than one Clerk user matches (should not happen for a single
 *   verified email, but a migration must never pick one arbitrarily).
 */
export async function resolveFounderOwnerId(params: {
  explicitOwnerId?: string;
  founderEmail: string | undefined;
  listUsers: () => Promise<ClerkUserLike[]>;
}): Promise<string> {
  if (params.explicitOwnerId) return params.explicitOwnerId;

  if (!params.founderEmail || !params.founderEmail.trim()) {
    throw new OwnerResolutionError(
      "FOUNDER_EMAIL is not set and no --owner-id=<clerkUserId> was provided -- cannot determine who existing athletes belong to. Set FOUNDER_EMAIL or pass --owner-id explicitly.",
    );
  }

  const users = await params.listUsers();
  const matches = users.filter((u) => isFounderEmail(resolvePrimaryEmail(u)));

  if (matches.length === 0) {
    throw new OwnerResolutionError(
      `No Clerk user's primary email matches FOUNDER_EMAIL (${params.founderEmail}). Cannot backfill without a resolved owner. Pass --owner-id=<clerkUserId> to bypass this lookup.`,
    );
  }
  if (matches.length > 1) {
    throw new OwnerResolutionError(
      `${matches.length} Clerk users matched FOUNDER_EMAIL (${params.founderEmail}) -- refusing to guess which one owns existing athletes. Pass --owner-id=<clerkUserId> explicitly.`,
    );
  }

  return matches[0].id;
}
