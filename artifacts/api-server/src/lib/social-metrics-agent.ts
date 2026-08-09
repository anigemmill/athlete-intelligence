/**
 * social-metrics-agent.ts
 *
 * SocialMetricsAgent — fetches follower counts for an athlete's already
 * validated social handles (from SocialProfilesAgent, M8). Per
 * docs/roadmap.md ("SocialMetricsAgent — X API v2 + Perplexity fallback")
 * and docs/ai-architecture.md ("SocialMetricsAgent — wraps
 * social-extract.ts").
 *
 * Twitter/X: the real X API v2 (fetchTwitterFollowers, moved here from
 * auto-populate.ts) is the sole source when a handle is present and the
 * API key is configured — a live, authoritative count rather than a
 * research estimate. If the API is unavailable or the lookup fails, the
 * result is null — this does NOT fall back to an unrelated Perplexity
 * guess for Twitter specifically, since a wrong number presented as
 * verified is worse than no number for a platform where a real API
 * exists.
 *
 * Instagram/TikTok: there is no equivalent free public API, so these
 * always go through the existing social-extract.ts's lookupSocialData
 * (Perplexity research + gpt-4o-mini extraction) — hence "wraps
 * social-extract.ts" rather than reimplementing it. Critically, this
 * agent does not blindly trust whatever handle lookupSocialData happens
 * to report: a follower count is only kept if the handle it discovered
 * matches (case-insensitively) the handle SocialProfilesAgent already
 * validated. A mismatch means lookupSocialData found a different
 * (possibly wrong) account, and its follower number is discarded rather
 * than attached to our already-validated handle.
 */

import { logger } from "./logger.js";
import { lookupSocialData } from "./social-extract.js";
import type { AthleteStub } from "./athlete-stub.js";
import type { SocialHandles } from "./social-profiles-agent.js";

export interface SocialMetrics {
  instagramFollowers: number | null;
  twitterFollowers: number | null;
  tiktokFollowers: number | null;
}

export function normalizeHandle(handle: string): string {
  return handle.trim().toLowerCase().replace(/^@/, "");
}

/**
 * Real X API v2 follower lookup. Returns null silently if the token is
 * missing or the request fails — moved here (unchanged) from
 * auto-populate.ts as part of consolidating social-metrics logic into
 * this agent.
 */
export async function fetchTwitterFollowers(handle: string): Promise<number | null> {
  const token = process.env.TWITTER_BEARER_TOKEN;
  if (!token) return null;
  try {
    const resp = await fetch(
      `https://api.twitter.com/2/users/by/username/${encodeURIComponent(handle)}?user.fields=public_metrics`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(6000),
      },
    );
    if (!resp.ok) return null;
    const data = (await resp.json()) as any;
    const count = data?.data?.public_metrics?.followers_count;
    return typeof count === "number" ? count : null;
  } catch {
    return null;
  }
}

/**
 * Runs the SocialMetricsAgent: fetches follower counts for whichever of
 * the athlete's validated handles are present. Never throws — a platform
 * that can't be resolved simply returns null for that field.
 */
export async function runSocialMetricsAgent(
  athlete: AthleteStub,
  handles: SocialHandles,
): Promise<SocialMetrics> {
  const [twitterFollowers, perplexityMetrics] = await Promise.all([
    handles.twitterHandle ? fetchTwitterFollowers(handles.twitterHandle) : Promise.resolve(null),
    (handles.instagramHandle || handles.tiktokHandle)
      ? lookupSocialData({ name: athlete.name, sport: athlete.sport, nationality: athlete.nationality }).catch((err) => {
          logger.warn(
            { err, athleteId: athlete.id, name: athlete.name },
            "social-metrics-agent: Perplexity fallback lookup failed — Instagram/TikTok counts unavailable this run",
          );
          return null;
        })
      : Promise.resolve(null),
  ]);

  let instagramFollowers: number | null = null;
  let tiktokFollowers: number | null = null;

  if (perplexityMetrics) {
    if (
      handles.instagramHandle &&
      perplexityMetrics.instagramHandle &&
      normalizeHandle(perplexityMetrics.instagramHandle) === normalizeHandle(handles.instagramHandle)
    ) {
      instagramFollowers = perplexityMetrics.instagramFollowers;
    } else if (handles.instagramHandle && perplexityMetrics.instagramHandle) {
      logger.warn(
        {
          athleteId: athlete.id,
          name: athlete.name,
          validatedHandle: handles.instagramHandle,
          foundHandle: perplexityMetrics.instagramHandle,
        },
        "social-metrics-agent: Instagram handle mismatch — discarding follower count rather than trusting the wrong account",
      );
    }

    if (
      handles.tiktokHandle &&
      perplexityMetrics.tiktokHandle &&
      normalizeHandle(perplexityMetrics.tiktokHandle) === normalizeHandle(handles.tiktokHandle)
    ) {
      tiktokFollowers = perplexityMetrics.tiktokFollowers;
    } else if (handles.tiktokHandle && perplexityMetrics.tiktokHandle) {
      logger.warn(
        {
          athleteId: athlete.id,
          name: athlete.name,
          validatedHandle: handles.tiktokHandle,
          foundHandle: perplexityMetrics.tiktokHandle,
        },
        "social-metrics-agent: TikTok handle mismatch — discarding follower count rather than trusting the wrong account",
      );
    }
  }

  logger.info(
    { athleteId: athlete.id, name: athlete.name, instagramFollowers, twitterFollowers, tiktokFollowers },
    "social-metrics-agent: complete",
  );

  return { instagramFollowers, twitterFollowers, tiktokFollowers };
}
