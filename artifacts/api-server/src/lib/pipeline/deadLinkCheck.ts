/**
 * Real HTTP liveness checks for stored source URLs (Intelligence Audit
 * feature — docs/technical-debt.md's "every stored source should resolve to
 * a real webpage" requirement, made literal rather than inferred).
 *
 * This performs a live network request. It does not guess or simulate —
 * a URL is only ever reported "ok" because a real HTTP response said so.
 */

export interface LinkCheckResult {
  url: string;
  ok: boolean;
  status: number | null;
  error: string | null;
}

const TIMEOUT_MS = 8000;

export async function checkUrl(url: string): Promise<LinkCheckResult> {
  try {
    let resp = await fetch(url, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(TIMEOUT_MS) });
    // Some servers don't implement HEAD correctly (405/501) — a small
    // fraction of real sports sites do this. Retry with GET before
    // concluding the link is actually dead.
    if (resp.status === 405 || resp.status === 501) {
      resp = await fetch(url, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(TIMEOUT_MS) });
    }
    return { url, ok: resp.ok, status: resp.status, error: null };
  } catch (err: any) {
    return { url, ok: false, status: null, error: err?.message ?? "Request failed" };
  }
}

/**
 * Checks a batch of URLs with bounded concurrency, deduplicated first — a
 * roster where 5 athletes all cite the same worldathletics.org profile
 * should not fire that request 5 times.
 */
export async function checkUrlsConcurrently(urls: string[], concurrency = 5): Promise<LinkCheckResult[]> {
  const unique = [...new Set(urls)];
  const results: LinkCheckResult[] = [];
  for (let i = 0; i < unique.length; i += concurrency) {
    const chunk = unique.slice(i, i + concurrency);
    results.push(...(await Promise.all(chunk.map(checkUrl))));
  }
  return results;
}
