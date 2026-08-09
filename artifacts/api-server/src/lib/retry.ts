/**
 * retry.ts
 *
 * Conservative retry for transient AI-API failures only — HTTP 429 (rate
 * limit), 5xx server errors, and network-level failures (no HTTP status at
 * all: timeout, connection reset, DNS failure). Deliberately does NOT
 * retry anything else: a 4xx like 401/403/404 is a real, non-transient
 * failure, and retrying it would just waste calls without fixing anything.
 *
 * `withRetry` should only ever wrap the raw API call itself — never JSON
 * parsing or validation code that runs after a successful response. As
 * long as callers respect that boundary, this can't retry a validation
 * failure or bad model output by construction: those errors are thrown
 * after `withRetry` has already returned successfully, outside its reach.
 */

import { logger } from "./logger.js";

function isTransientError(err: unknown): boolean {
  const status = (err as { status?: unknown })?.status;
  if (typeof status === "number") {
    return status === 429 || (status >= 500 && status < 600);
  }
  // No HTTP status at all means the request never got a response — a
  // network-level failure (timeout, connection reset, DNS). The SDKs used
  // here (openai) always attach `status` once a response is received, so
  // this branch is network-only, not a catch-all for unexpected errors.
  return true;
}

export interface RetryOptions {
  /** Total attempts including the first. Default 3. */
  attempts?: number;
  /** Base delay before the first retry, doubled each subsequent attempt. Default 500ms. */
  baseDelayMs?: number;
  /** Label included in retry log lines, e.g. "competitions-agent research". */
  label?: string;
}

export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const attempts = opts.attempts ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? 500;

  let lastErr: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === attempts || !isTransientError(err)) throw err;

      const delayMs = baseDelayMs * 2 ** (attempt - 1);
      logger.warn(
        { label: opts.label, attempt, attempts, delayMs, status: (err as { status?: unknown })?.status },
        "retry: transient AI call failure — retrying",
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastErr;
}
