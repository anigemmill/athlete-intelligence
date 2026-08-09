/**
 * photo-agent.ts
 *
 * PhotoAgent — profile photo lookup with the federation-first hierarchy
 * docs/roadmap.md / docs/ai-architecture.md specify ("PhotoAgent — WA →
 * federation → Wikipedia") and docs/technical-debt.md Priority 6
 * documents as the fix for the existing Wikipedia-first ordering:
 *
 *   Current (photo-lookup.ts, unchanged, still used as the fallback):
 *     Wikipedia exact match → Wikipedia search → Perplexity fallback
 *   Target (this agent):
 *     World Athletics / sport federation / national Olympic committee
 *     profile → (fall back to the existing photo-lookup.ts hierarchy)
 *
 * This agent tries the federation-first path via a dedicated, citation-
 * validated Perplexity + GPT-4o search. If that finds nothing, it falls
 * back to the existing fetchWikipediaPhoto — reused, not reimplemented.
 *
 * Evidence bar raised versus the existing Perplexity photo fallback in
 * photo-lookup.ts: that path only regex-checks the URL looks like an
 * image file. This agent additionally requires the image URL's hostname
 * to match one of the real citation hostnames from its own research call
 * — an image URL on a domain that was never actually cited is discarded
 * rather than trusted.
 */

import { openai } from "@workspace/integrations-openai-ai-server";
import { logger } from "./logger.js";
import { callPerplexity } from "./perplexity-client.js";
import { withAiConcurrencyLimit } from "./ai-concurrency.js";
import { withRetry } from "./retry.js";
import { fetchWikipediaPhoto } from "./photo-lookup.js";
import type { AthleteStub } from "./athlete-stub.js";

const IMAGE_URL_PATTERN = /^https?:\/\/\S+\.(jpg|jpeg|png|webp)(\?\S*)?$/i;

export function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

async function researchFederationPhoto(
  athlete: AthleteStub,
): Promise<{ research: string; citations: string[] }> {
  try {
    const { research, citations } = await callPerplexity({
      label: "photo-agent research",
      maxTokens: 1024,
      systemPrompt: `You are an image researcher for a sports intelligence platform. Find a direct profile photo URL from an official, authoritative source. Never fabricate a URL.`,
      userPrompt: `Find a direct profile photo image URL for ${athlete.name} (${athlete.sport} — ${athlete.event}, ${athlete.nationality}) from an OFFICIAL, AUTHORITATIVE source, in this priority order:
1. World Athletics (or the equivalent international federation for their sport) athlete profile page
2. Their national/continental sport federation's athlete profile page (e.g. UCI, national athletics federation)
3. Their National Olympic Committee profile page

Only report a URL if it is a direct, real image link (ending in .jpg, .jpeg, .png, or .webp) that you found on one of these official sources. Do not construct or guess a plausible-looking URL. If you cannot find one from these official sources, say so clearly.

Cite your sources.`,
    });
    logger.info(
      { athleteId: athlete.id, name: athlete.name, length: research.length, citationCount: citations.length },
      "photo-agent: federation research complete",
    );
    return { research, citations };
  } catch (err) {
    logger.warn(
      { err, athleteId: athlete.id, name: athlete.name },
      "photo-agent: federation research failed — falling back to Wikipedia hierarchy",
    );
    return { research: "", citations: [] };
  }
}

const SYSTEM_PROMPT = `You are extracting a profile photo URL from research. Return ONLY valid JSON — no markdown, no explanation.

Rules:
- imageUrl MUST be one of the citation URLs provided, or a URL on the same domain as one of them. NEVER invent or guess a URL.
- imageUrl must end in .jpg, .jpeg, .png, or .webp.
- If no real, sourced image URL was found, set imageUrl to null.`;

const USER_PROMPT = (research: string, citations: string[]): string => `
${citations.length > 0
  ? `CITATION URLs from the research (imageUrl must be on one of these domains):
${citations.map((c, i) => `${i + 1}. ${c}`).join("\n")}

`
  : ""}${research
  ? `RESEARCH:
\`\`\`
${research}
\`\`\``
  : `ABORT: No research available. Return { "imageUrl": null }.`}

Extract as JSON: { "imageUrl": <string or null> }
`;

/**
 * Runs the PhotoAgent: tries the federation-first hierarchy with
 * citation-domain validation, then falls back to the existing Wikipedia-
 * first hierarchy (photo-lookup.ts) if that finds nothing. Never throws
 * — returns null if no photo can be found anywhere.
 */
export async function runPhotoAgent(athlete: AthleteStub): Promise<string | null> {
  const { research, citations } = await researchFederationPhoto(athlete);

  if (research && citations.length > 0) {
    try {
      const response = await withAiConcurrencyLimit(() =>
        withRetry(
          () =>
            openai.chat.completions.create({
              model: "gpt-4o-mini",
              max_completion_tokens: 256,
              messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: USER_PROMPT(research, citations) },
              ],
              response_format: { type: "json_object" },
            }),
          { label: "photo-agent extraction" },
        ),
      );
      const raw = response.choices[0]?.message?.content;
      const data = raw ? (JSON.parse(raw) as { imageUrl?: unknown }) : {};
      const claimed = typeof data.imageUrl === "string" ? data.imageUrl.trim() : "";

      if (claimed && IMAGE_URL_PATTERN.test(claimed)) {
        const claimedHost = hostnameOf(claimed);
        const citationHosts = new Set(citations.map((c) => hostnameOf(c)).filter((h): h is string => h !== null));
        if (claimedHost && citationHosts.has(claimedHost)) {
          logger.info(
            { athleteId: athlete.id, name: athlete.name, source: claimedHost },
            "photo-agent: federation photo found and citation-validated",
          );
          return claimed;
        }
        logger.warn(
          { athleteId: athlete.id, name: athlete.name, claimedHost },
          "photo-agent: claimed image URL's domain doesn't match any real citation — discarding, falling back",
        );
      }
    } catch (err) {
      logger.warn(
        { err, athleteId: athlete.id, name: athlete.name },
        "photo-agent: federation extraction failed — falling back to Wikipedia hierarchy",
      );
    }
  }

  // Fall back to the existing Wikipedia-first hierarchy.
  return fetchWikipediaPhoto(athlete.name, athlete.sport);
}
