/**
 * founderAccess.test.ts
 *
 * isFounderEmail() is the single source of truth for founder/admin access
 * (routes/admin.ts's requireAdmin, routes/user.ts's /user/me, and
 * Sidebar.tsx's nav-item visibility all defer to it -- the frontend via
 * the server-verified GET /user/me response, never its own comparison).
 * These tests cover the policy decision itself: given a resolved email
 * (the output of a real Clerk lookup), is admin access granted. Clerk's
 * own session verification is a separate, already-credentialed concern
 * this suite doesn't re-test -- see aiRateLimit.test.ts and
 * athletes.bulk.test.ts for the same reasoning applied elsewhere in this
 * project.
 *
 * process.env.FOUNDER_EMAIL is read fresh on every isFounderEmail() call
 * (not cached at import time), so each test sets/restores it directly
 * around itself rather than needing module reloads.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { isFounderEmail } from "./founderAccess.js";

function withFounderEmail<T>(value: string | undefined, fn: () => T): T {
  const original = process.env.FOUNDER_EMAIL;
  if (value === undefined) delete process.env.FOUNDER_EMAIL;
  else process.env.FOUNDER_EMAIL = value;
  try {
    return fn();
  } finally {
    if (original === undefined) delete process.env.FOUNDER_EMAIL;
    else process.env.FOUNDER_EMAIL = original;
  }
}

test("authenticated founder email -> allowed", () => {
  withFounderEmail("founder@example.com", () => {
    assert.equal(isFounderEmail("founder@example.com"), true);
  });
});

test("a different authenticated email -> denied", () => {
  withFounderEmail("founder@example.com", () => {
    assert.equal(isFounderEmail("someone-else@example.com"), false);
  });
});

test("missing FOUNDER_EMAIL -> denied safely, even for a plausible-looking email", () => {
  withFounderEmail(undefined, () => {
    assert.equal(isFounderEmail("founder@example.com"), false);
    assert.equal(isFounderEmail("anyone@example.com"), false);
  });
});

test("missing FOUNDER_EMAIL -> denied even when the caller's email is also empty (no accidental empty==empty match)", () => {
  withFounderEmail(undefined, () => {
    assert.equal(isFounderEmail(""), false);
    assert.equal(isFounderEmail(null), false);
    assert.equal(isFounderEmail(undefined), false);
  });
});

test("FOUNDER_EMAIL set to an empty/whitespace-only string is treated as unconfigured -> denied", () => {
  withFounderEmail("", () => {
    assert.equal(isFounderEmail(""), false);
    assert.equal(isFounderEmail("founder@example.com"), false);
  });
  withFounderEmail("   ", () => {
    assert.equal(isFounderEmail("   "), false);
    assert.equal(isFounderEmail("founder@example.com"), false);
  });
});

test("no authenticated email (null/undefined) -> denied even when FOUNDER_EMAIL is configured", () => {
  withFounderEmail("founder@example.com", () => {
    assert.equal(isFounderEmail(null), false);
    assert.equal(isFounderEmail(undefined), false);
    assert.equal(isFounderEmail(""), false);
  });
});

test("case handling: matches regardless of casing on either side, same as the previous hardcoded check", () => {
  withFounderEmail("Founder@Example.com", () => {
    assert.equal(isFounderEmail("founder@example.com"), true);
    assert.equal(isFounderEmail("FOUNDER@EXAMPLE.COM"), true);
    assert.equal(isFounderEmail("FoUnDeR@eXaMpLe.CoM"), true);
  });
});

test("whitespace around either value doesn't break a legitimate match", () => {
  withFounderEmail("  founder@example.com  ", () => {
    assert.equal(isFounderEmail("founder@example.com"), true);
  });
  withFounderEmail("founder@example.com", () => {
    assert.equal(isFounderEmail("  founder@example.com  "), true);
  });
});
