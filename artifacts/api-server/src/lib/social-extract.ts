/**
 * social-extract.ts
 *
 * Shared two-phase social media lookup pipeline used by both
 * POST /athletes/:id/refresh-social and POST /admin/backfill-social.
 *
 * Phase 1 — perplexity/sonar-pro (live web search for handles + follower counts)
 * Phase 2 — gpt-4o-mini (structured JSON extraction from the research text)
 *
 * Keeping both model choices here means neither caller can drift independently.
 */

import { openrouter } from "@workspace/integrations-openrouter-ai";
import { openai } from "@workspace/integrations-openai-ai-server";

export interface SocialData {
  instagramHandle:    string | null;
  instagramFollowers: number | null;
  twitterHandle:      string | null;
  twitterFollowers:   number | null;
  tiktokHandle:       string | null;
  tiktokFollowers:    number | null;
  /**
   * Raw Perplexity research text.
   * Included so callers can surface a snippet to the user (e.g. researchSummary)
   * without the service needing to know about HTTP response shapes.
   */
  researchText: string;
}

/**
 * Looks up social media handles and follower counts for an athlete using a
 * live two-phase pipeline.
 *
 * Returns null if:
 * - Perplexity returns no content (athlete not findable on social media), or
 * - gpt-4o-mini returns an empty extraction response.
 *
 * Throws if either API call itself fails — callers should catch and handle
 * appropriately (e.g. HTTP 500 or a per-athlete warning log in a batch).
 */
export async function lookupSocialData(athlete: {
  name:        string;
  sport:       string | null;
  nationality: string | null;
}): Promise<SocialData | null> {

  // ── Phase 1: Perplexity sonar-pro — live web search ─────────────────────────
  const research = await openrouter.chat.completions.create({
    model: "perplexity/sonar-pro",
    max_tokens: 1024,
    messages: [
      {
        role: "system",
        content:
          "You are a sports social media researcher with live web access. " +
          "Return exact, verified figures — never estimate unless the source explicitly says so.",
      },
      {
        role: "user",
        content:
          `Search the web RIGHT NOW for the official social media accounts of ` +
          `${athlete.name} (${athlete.sport ?? "athlete"}${athlete.nationality ? `, ${athlete.nationality}` : ""}).\n\n` +
          `Look up their profiles directly on Instagram, X/Twitter, and TikTok. Report:\n` +
          `1. Instagram: exact handle (no @) and current follower count shown on the profile page\n` +
          `2. X/Twitter: exact handle and current follower count\n` +
          `3. TikTok: exact handle and current follower count\n\n` +
          `Use the athlete's official or verified account. If multiple accounts exist, choose the one ` +
          `with the most followers that is clearly the athlete (not a fan page). State the source URL for each figure.`,
      },
    ],
  });

  const researchText = research.choices[0]?.message?.content ?? "";
  if (!researchText) return null;

  // ── Phase 2: gpt-4o-mini — structured JSON extraction ───────────────────────
  const extraction = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 512,
    messages: [
      {
        role: "system",
        content:
          `Extract social media data from the research text. Return ONLY valid JSON, no markdown.\n` +
          `Rules:\n` +
          `- handles: real username without @ symbol, null if not found\n` +
          `- followers: integer (round to nearest whole number), null if no specific verified number — NEVER invent a number\n` +
          `- Convert shorthand: "250k" → 250000, "1.2M" → 1200000`,
      },
      {
        role: "user",
        content:
          `Research about ${athlete.name}:\n${researchText}\n\n` +
          `Extract into JSON:\n` +
          `{"instagramHandle":null,"instagramFollowers":null,"twitterHandle":null,"twitterFollowers":null,"tiktokHandle":null,"tiktokFollowers":null}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const raw = extraction.choices[0]?.message?.content;
  if (!raw) return null;

  const s = JSON.parse(raw);
  return {
    instagramHandle:    typeof s.instagramHandle    === "string" ? s.instagramHandle    : null,
    instagramFollowers: typeof s.instagramFollowers === "number" ? s.instagramFollowers : null,
    twitterHandle:      typeof s.twitterHandle      === "string" ? s.twitterHandle      : null,
    twitterFollowers:   typeof s.twitterFollowers   === "number" ? s.twitterFollowers   : null,
    tiktokHandle:       typeof s.tiktokHandle       === "string" ? s.tiktokHandle       : null,
    tiktokFollowers:    typeof s.tiktokFollowers    === "number" ? s.tiktokFollowers    : null,
    researchText,
  };
}
