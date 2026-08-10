import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseExplicitOwnerId,
  resolvePrimaryEmail,
  resolveFounderOwnerId,
  OwnerResolutionError,
  type ClerkUserLike,
} from "./owner-backfill.js";

// ── parseExplicitOwnerId ─────────────────────────────────────────────────

test("parseExplicitOwnerId: returns undefined when no --owner-id flag is present", () => {
  assert.equal(parseExplicitOwnerId(["node", "script.ts"]), undefined);
});

test("parseExplicitOwnerId: extracts the value after --owner-id=", () => {
  assert.equal(
    parseExplicitOwnerId(["node", "script.ts", "--owner-id=user_abc123"]),
    "user_abc123",
  );
});

test("parseExplicitOwnerId: treats an empty --owner-id= as not provided", () => {
  assert.equal(parseExplicitOwnerId(["--owner-id="]), undefined);
});

// ── resolvePrimaryEmail ──────────────────────────────────────────────────

test("resolvePrimaryEmail: prefers the address matching primaryEmailAddressId", () => {
  const user: ClerkUserLike = {
    id: "user_1",
    primaryEmailAddressId: "email_2",
    emailAddresses: [
      { id: "email_1", emailAddress: "old@example.com" },
      { id: "email_2", emailAddress: "primary@example.com" },
    ],
  };
  assert.equal(resolvePrimaryEmail(user), "primary@example.com");
});

test("resolvePrimaryEmail: falls back to a verified address when primaryEmailAddressId doesn't match anything", () => {
  const user: ClerkUserLike = {
    id: "user_1",
    primaryEmailAddressId: "email_missing",
    emailAddresses: [
      { id: "email_1", emailAddress: "unverified@example.com", verification: { status: "unverified" } },
      { id: "email_2", emailAddress: "verified@example.com", verification: { status: "verified" } },
    ],
  };
  assert.equal(resolvePrimaryEmail(user), "verified@example.com");
});

test("resolvePrimaryEmail: falls back to the first address when nothing else matches", () => {
  const user: ClerkUserLike = {
    id: "user_1",
    primaryEmailAddressId: null,
    emailAddresses: [{ id: "email_1", emailAddress: "only@example.com" }],
  };
  assert.equal(resolvePrimaryEmail(user), "only@example.com");
});

test("resolvePrimaryEmail: returns null when the user has no email addresses", () => {
  const user: ClerkUserLike = { id: "user_1", primaryEmailAddressId: null, emailAddresses: [] };
  assert.equal(resolvePrimaryEmail(user), null);
});

// ── resolveFounderOwnerId ─────────────────────────────────────────────────

function fakeUser(id: string, email: string): ClerkUserLike {
  return {
    id,
    primaryEmailAddressId: "email_1",
    emailAddresses: [{ id: "email_1", emailAddress: email }],
  };
}

test("resolveFounderOwnerId: an explicit --owner-id short-circuits Clerk entirely", async () => {
  const listUsers = async () => {
    throw new Error("listUsers must not be called when an explicit owner id is provided");
  };
  const result = await resolveFounderOwnerId({
    explicitOwnerId: "user_explicit",
    founderEmail: "founder@example.com",
    listUsers,
  });
  assert.equal(result, "user_explicit");
});

test("resolveFounderOwnerId: resolves via Clerk lookup when no explicit id is given", async () => {
  process.env.FOUNDER_EMAIL = "founder@example.com";
  try {
    const listUsers = async () => [
      fakeUser("user_other", "other@example.com"),
      fakeUser("user_founder", "Founder@Example.com"), // case-insensitive match, per isFounderEmail
    ];
    const result = await resolveFounderOwnerId({
      founderEmail: process.env.FOUNDER_EMAIL,
      listUsers,
    });
    assert.equal(result, "user_founder");
  } finally {
    delete process.env.FOUNDER_EMAIL;
  }
});

test("resolveFounderOwnerId: throws when FOUNDER_EMAIL is unset and no explicit id given", async () => {
  await assert.rejects(
    () => resolveFounderOwnerId({ founderEmail: undefined, listUsers: async () => [] }),
    OwnerResolutionError,
  );
});

test("resolveFounderOwnerId: throws when no Clerk user matches FOUNDER_EMAIL", async () => {
  await assert.rejects(
    () =>
      resolveFounderOwnerId({
        founderEmail: "founder@example.com",
        listUsers: async () => [fakeUser("user_other", "other@example.com")],
      }),
    OwnerResolutionError,
  );
});

test("resolveFounderOwnerId: throws rather than guessing when multiple users match", async () => {
  await assert.rejects(
    () =>
      resolveFounderOwnerId({
        founderEmail: "founder@example.com",
        listUsers: async () => [
          fakeUser("user_a", "founder@example.com"),
          fakeUser("user_b", "founder@example.com"),
        ],
      }),
    OwnerResolutionError,
  );
});
