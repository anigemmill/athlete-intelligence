/**
 * founderAccess.ts
 *
 * Single source of truth for "is this email the founder/admin account."
 * Previously this comparison was hardcoded independently in both
 * routes/admin.ts and routes/user.ts as the literal string
 * "anigemmill@theoutsidein.nz" -- duplicated, and impossible to change
 * without a code deploy despite docs/setup.md documenting a FOUNDER_EMAIL
 * environment variable that was never actually read.
 *
 * isFounderEmail() reads FOUNDER_EMAIL from the environment on every
 * call (not cached at module load) so it's trivially testable and so a
 * misconfigured deploy fails the same way on every request rather than
 * only at boot. If FOUNDER_EMAIL is unset or blank, this ALWAYS returns
 * false -- a missing config value must never accidentally grant admin
 * access, it must deny it. Both sides are trimmed and lowercased before
 * comparison: lowercasing preserves the exact case-insensitivity the
 * previous hardcoded check already had; trimming is new but narrowly
 * defensive -- a hardcoded string literal couldn't pick up stray
 * whitespace, but a value pasted into an env var / secrets panel can.
 */

export function isFounderEmail(email: string | null | undefined): boolean {
  const founderEmail = process.env.FOUNDER_EMAIL?.trim().toLowerCase();
  if (!founderEmail) return false;
  if (!email) return false;
  return email.trim().toLowerCase() === founderEmail;
}
