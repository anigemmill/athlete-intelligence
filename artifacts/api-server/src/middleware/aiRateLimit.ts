/**
 * aiRateLimit.ts
 *
 * Shared rate-limit factory for routes that trigger billable AI/API calls
 * (OpenAI, OpenRouter/Perplexity, the X API, etc). Per the MVP readiness
 * assessment (docs/mvp-readiness-assessment-2026-08-09.md, Security
 * section): every route that fires a real, billed external call needs a
 * limit, not just the obvious athlete-refresh endpoint -- creation, bulk
 * import, social refresh, AI summary generation, and the admin roster-wide
 * backfill routes all cost real money per request.
 *
 * Keyed by the authenticated user (req.userId, set by requireAuth.ts)
 * rather than IP -- an IP-based limit either over-restricts users sharing
 * a network or under-restricts a single user rotating IPs. Falls back to
 * IP only if userId is somehow unset (defensive; every route this is
 * applied to already sits behind requireAuth). This is the same pattern
 * chat.ts's chatLimiter already used; extracted here so it's defined once
 * rather than re-implemented per route.
 */

import rateLimit, { type RateLimitRequestHandler } from "express-rate-limit";
import type { Request } from "express";

function userKey(req: Request): string {
  const key = (req as Request & { userId?: string }).userId ?? req.ip ?? "anon";
  // Normalize IPv6 and other special chars to avoid ERR_ERL_KEY_GEN_IPV6
  return String(key).replace(/[^a-zA-Z0-9._-]/g, "_");
}

export interface AiRateLimitOptions {
  /** Rolling window, in milliseconds. */
  windowMs: number;
  /** Max requests per key within the window. */
  max: number;
  /** Returned in the 429 body's `error` field. */
  message: string;
}

export function createAiRateLimit(opts: AiRateLimitOptions): RateLimitRequestHandler {
  return rateLimit({
    windowMs: opts.windowMs,
    max: opts.max,
    keyGenerator: userKey,
    validate: false,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: opts.message },
  });
}

const HOUR = 60 * 60 * 1000;

/**
 * Named, pre-configured limiters for each AI-cost route. Limits are sized
 * around normal pilot usage (an admin/user building out or maintaining a
 * roster of a handful to a few dozen athletes), not a theoretical maximum
 * -- see docs/mvp-readiness-assessment-2026-08-09.md for the reasoning
 * per route.
 */
export const aiRateLimits = {
  /** POST /chat -- one or more OpenAI calls per message (tool-use loop). */
  chat: createAiRateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    message: "Too many messages. Please slow down.",
  }),
  /** POST /athletes/discover -- one OpenAI call, no DB write, tried repeatedly while typing a name. */
  discover: createAiRateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: "Too many discovery requests. Please slow down.",
  }),
  /** POST /athletes -- fires the full 8-agent pipeline in the background. */
  create: createAiRateLimit({
    windowMs: HOUR,
    max: 30,
    message: "Too many athletes created. Please try again later.",
  }),
  /** POST /athletes/bulk -- fires the full pipeline PER ROW in a single request; stricter than single create. */
  bulk: createAiRateLimit({
    windowMs: HOUR,
    max: 5,
    message: "Too many bulk imports. Please try again later.",
  }),
  /** POST /athletes/:id/repopulate -- full pipeline re-run for one athlete. */
  repopulate: createAiRateLimit({
    windowMs: HOUR,
    max: 15,
    message: "Too many refresh requests. Please try again later.",
  }),
  /** POST /athletes/:id/refresh-social -- single Perplexity + gpt-4o-mini lookup. */
  refreshSocial: createAiRateLimit({
    windowMs: HOUR,
    max: 20,
    message: "Too many social refresh requests. Please try again later.",
  }),
  /** POST /athletes/:id/summary -- one gpt-4o narrative generation. */
  summary: createAiRateLimit({
    windowMs: HOUR,
    max: 20,
    message: "Too many summary requests. Please try again later.",
  }),
  /**
   * Admin roster-wide backfill routes (backfill-photos, backfill-social,
   * backfill-results, admin repopulate) -- already gated to a single
   * founder account by requireAdmin, so the realistic risk is an
   * accidental double-click or a buggy script looping the call, not
   * abuse from an untrusted party. A modest limit is still worth having:
   * each of these loops the ENTIRE roster, so even a trusted account
   * re-firing one by accident multiplies cost fast.
   */
  adminBackfill: createAiRateLimit({
    windowMs: HOUR,
    max: 6,
    message: "Too many backfill requests. Please wait before running another.",
  }),
};
