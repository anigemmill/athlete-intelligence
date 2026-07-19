/**
 * photo-lookup.ts
 *
 * Profile photo lookup for athletes.
 *
 * Strategy:
 * 1. Try exact Wikipedia title match (fastest, most accurate)
 * 2. If page is missing, search Wikipedia for "{name} {sport}" and try the
 *    first result — catches athletes whose page title differs slightly
 * 3. Perplexity web fallback — searches live sports sites (UCI, Red Bull,
 *    team pages, WorldAthletics, etc.) and extracts a direct image URL
 * 4. Return null if nothing found
 */

import { logger } from "./logger.js";
import { openrouter } from "@workspace/integrations-openrouter-ai";
import { openai } from "@workspace/integrations-openai-ai-server";

const WIKI_UA = "AthleteIntelligence/1.0 (sports-intelligence-platform)";
const TIMEOUT = 8000;

// ── Wikipedia helpers ─────────────────────────────────────────────────────────

async function wikiGet(params: string): Promise<any> {
  const resp = await fetch(`https://en.wikipedia.org/w/api.php?${params}`, {
    headers: { "User-Agent": WIKI_UA },
    signal: AbortSignal.timeout(TIMEOUT),
  });
  if (!resp.ok) return null;
  return resp.json();
}

async function thumbnailFromTitle(title: string): Promise<string | null> {
  const data = await wikiGet(
    `action=query&titles=${encodeURIComponent(title)}&prop=pageimages&format=json&pithumbsize=400&redirects=1`,
  );
  const pages = data?.query?.pages;
  if (!pages) return null;
  const page = Object.values(pages)[0] as any;
  if ("missing" in page || !page?.thumbnail?.source) return null;
  return String(page.thumbnail.source);
}

// ── Perplexity web fallback ───────────────────────────────────────────────────
// Searches live sports sites for a profile photo when Wikipedia has nothing.

async function fetchPhotoViaPerplexity(
  athleteName: string,
  sport?: string,
): Promise<string | null> {
  try {
    const research = await openrouter.chat.completions.create({
      model: "perplexity/sonar",
      max_tokens: 512,
      messages: [
        {
          role: "system",
          content:
            "You are an image researcher. Find a direct URL to a profile photo of the athlete from a public website. Return ONLY the image URL — nothing else. It must end in .jpg, .jpeg, .png, or .webp and be a real, publicly accessible image.",
        },
        {
          role: "user",
          content: `Find a direct profile photo URL for ${athleteName}${sport ? ` (${sport} athlete)` : ""}. Search Wikipedia, UCI profiles, WorldAthletics, Red Bull athlete pages, team websites, and sports media. Return only the direct image URL.`,
        },
      ],
    });

    const raw = (research.choices[0]?.message?.content ?? "").trim();
    if (!raw) return null;

    // Ask OpenAI to extract just the URL from whatever Perplexity returned
    const extraction = await openai.chat.completions.create({
      model: "gpt-5.6-luna",
      max_completion_tokens: 128,
      reasoning_effort: "none" as any,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            'Extract the image URL from the text. Return JSON: {"url": "<the direct image url or null if none found>"}. The URL must start with http and end in .jpg, .jpeg, .png, or .webp.',
        },
        { role: "user", content: raw },
      ],
    });

    const parsed = JSON.parse(extraction.choices[0]?.message?.content ?? "{}");
    const url: string = parsed?.url ?? "";

    // Basic sanity check — must look like a real image URL
    if (
      url &&
      url.startsWith("http") &&
      /\.(jpg|jpeg|png|webp)(\?.*)?$/i.test(url)
    ) {
      return url;
    }
    return null;
  } catch (err) {
    logger.warn({ err, athleteName }, "photo-lookup: Perplexity fallback failed");
    return null;
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function fetchWikipediaPhoto(
  athleteName: string,
  sport?: string,
): Promise<string | null> {
  try {
    // 1. Exact Wikipedia title lookup
    const direct = await thumbnailFromTitle(athleteName);
    if (direct) return direct;

    // 2. Wikipedia search fallback
    const query = sport ? `${athleteName} ${sport}` : `${athleteName} athlete`;
    const searchData = await wikiGet(
      `action=query&list=search&srsearch=${encodeURIComponent(query)}&srnamespace=0&srlimit=3&format=json`,
    );
    const hits: any[] = searchData?.query?.search ?? [];

    for (const hit of hits) {
      if (!hit.title) continue;
      const img = await thumbnailFromTitle(hit.title);
      if (img) return img;
    }

    // 3. Perplexity live web search fallback
    logger.info({ athleteName }, "photo-lookup: Wikipedia empty, trying Perplexity");
    const perplexityUrl = await fetchPhotoViaPerplexity(athleteName, sport);
    if (perplexityUrl) return perplexityUrl;

    return null;
  } catch (err) {
    logger.warn({ err, athleteName }, "photo-lookup: request failed");
    return null;
  }
}
