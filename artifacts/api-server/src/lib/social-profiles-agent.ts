/**
 * social-profiles-agent.ts
 *
 * SocialProfilesAgent — finds and format-validates an athlete's real
 * social media handles (Instagram, X/Twitter, TikTok). Per
 * docs/roadmap.md/docs/ai-architecture.md ("SocialProfilesAgent — handle
 * format validation"). Deliberately does NOT fetch follower counts —
 * that's SocialMetricsAgent's job, which takes this agent's validated
 * handles as input rather than re-discovering them.
 *
 * "Format validation" here means what it says: a returned handle is only
 * kept if it looks like a real handle (no @ prefix, no URL, no spaces, a
 * plausible username character set) — not a claim about whether the
 * handle is actually correct, which would require live verification
 * against the platform itself (out of scope; see docs/technical-debt.md
 * for the broader social-data trust gaps this doesn't attempt to close).
 *
 * Replaces the instagramHandle/twitterHandle/tiktokHandle fields that
 * were previously extracted inline as part of the shared main-extraction
 * prompt's athlete_stats block — those fields are removed from that
 * prompt so this agent is the sole source for handles.
 */

import { openai } from "@workspace/integrations-openai-ai-server";
import { logger } from "./logger.js";
import { callPerplexity } from "./perplexity-client.js";
import { withAiConcurrencyLimit } from "./ai-concurrency.js";
import { withRetry } from "./retry.js";
import type { AthleteStub } from "./athlete-stub.js";

export interface SocialHandles {
  instagramHandle: string | null;
  twitterHandle: string | null;
  tiktokHandle: string | null;
}

const HANDLE_PATTERN = /^[A-Za-z0-9._]{1,30}$/;
const PLACEHOLDER_HANDLES = new Set(["unknown", "none", "n/a", "na", "null", "notfound", "not_found"]);

/**
 * True if a claimed handle looks like a real, plausible username — no @
 * prefix, no URL, no spaces, a real platform-shaped character set, and
 * not an obvious placeholder like "none"/"N/A".
 */
export function isValidHandle(raw: unknown): raw is string {
  if (typeof raw !== "string") return false;
  const handle = raw.trim();
  if (!handle) return false;
  if (PLACEHOLDER_HANDLES.has(handle.toLowerCase())) return false;
  if (handle.includes("@") || handle.includes("/") || handle.includes(" ")) return false;
  if (/^https?:/i.test(handle)) return false;
  return HANDLE_PATTERN.test(handle);
}

async function researchSocialProfiles(
  athlete: AthleteStub,
): Promise<{ research: string; citations: string[] }> {
  try {
    const { research, citations } = await callPerplexity({
      label: "social-profiles-agent research",
      maxTokens: 1536,
      systemPrompt: `You are a sports researcher identifying an athlete's real, official social media accounts. Only report a handle if you can verify it is genuinely the athlete's own account (not a fan page). Never guess or construct a plausible-looking handle. Never fabricate information.`,
      userPrompt: `Find the real, official Instagram, X/Twitter, and TikTok handles for ${athlete.name} (${athlete.sport} — ${athlete.event}, ${athlete.nationality}).

For each platform, give the exact handle (without the @ symbol) only if you can confirm it is genuinely their own verified or clearly official account. If you cannot find a real account for a platform, or are not confident it's genuinely theirs, say so explicitly rather than guessing a plausible username.

Cite your sources.`,
    });
    logger.info(
      { athleteId: athlete.id, name: athlete.name, length: research.length, citationCount: citations.length },
      "social-profiles-agent: research complete",
    );
    return { research, citations };
  } catch (err) {
    logger.warn(
      { err, athleteId: athlete.id, name: athlete.name },
      "social-profiles-agent: research failed — skipping this run",
    );
    return { research: "", citations: [] };
  }
}

const SYSTEM_PROMPT = `You are a sports intelligence data engine extracting verified social media handles. Return ONLY valid JSON — no markdown, no explanation.

Rules:
- ONLY extract a handle if the research explicitly confirms it as the athlete's real account. NEVER infer, guess, or construct a plausible-looking handle.
- Handles must be the raw username without the @ symbol, without a URL, without spaces.
- If a platform isn't confirmed, set it to null. Do not leave a field as an empty string.`;

const USER_PROMPT = (a: AthleteStub, research: string): string => `
Athlete: ${a.name} (${a.sport} — ${a.event}, ${a.nationality})

${research
  ? `VERIFIED RESEARCH:
\`\`\`
${research}
\`\`\``
  : `ABORT: No verified research is available. Return { "instagramHandle": null, "twitterHandle": null, "tiktokHandle": null }.`}

Extract as JSON:
{
  "instagramHandle": <string or null>,
  "twitterHandle": <string or null>,
  "tiktokHandle": <string or null>
}
`;

/**
 * Runs the SocialProfilesAgent: dedicated research + extraction for an
 * athlete's real social media handles, with format validation applied
 * before being returned. Never throws — returns all-null on any failure.
 */
export async function runSocialProfilesAgent(athlete: AthleteStub): Promise<SocialHandles> {
  const allNull: SocialHandles = { instagramHandle: null, twitterHandle: null, tiktokHandle: null };

  const { research } = await researchSocialProfiles(athlete);
  if (!research) return allNull;

  try {
    const response = await withAiConcurrencyLimit(() =>
      withRetry(
        () =>
          openai.chat.completions.create({
            model: "gpt-4o",
            max_completion_tokens: 512,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: USER_PROMPT(athlete, research) },
            ],
            response_format: { type: "json_object" },
          }),
        { label: "social-profiles-agent extraction" },
      ),
    );
    const raw = response.choices[0]?.message?.content;
    if (!raw) return allNull;

    const data = JSON.parse(raw) as Record<string, unknown>;
    const handles: SocialHandles = {
      instagramHandle: isValidHandle(data.instagramHandle) ? data.instagramHandle.trim() : null,
      twitterHandle: isValidHandle(data.twitterHandle) ? data.twitterHandle.trim() : null,
      tiktokHandle: isValidHandle(data.tiktokHandle) ? data.tiktokHandle.trim() : null,
    };

    const rejected = (["instagramHandle", "twitterHandle", "tiktokHandle"] as const).filter(
      (k) => data[k] != null && data[k] !== "" && handles[k] === null,
    );
    if (rejected.length > 0) {
      logger.warn(
        { athleteId: athlete.id, name: athlete.name, rejected, claimed: rejected.map((k) => data[k]) },
        "social-profiles-agent: rejected handle(s) that failed format validation",
      );
    }

    return handles;
  } catch (err) {
    logger.warn(
      { err, athleteId: athlete.id, name: athlete.name },
      "social-profiles-agent: extraction failed — skipping this run",
    );
    return allNull;
  }
}
