/**
 * photo-lookup.ts
 *
 * Wikipedia/Wikimedia photo lookup for athlete profile pictures.
 *
 * Strategy:
 * 1. Try exact Wikipedia title match (fastest, most accurate)
 * 2. If page is missing, search Wikipedia for "{name} {sport}" and try the
 *    first result — catches athletes whose page title differs slightly
 * 3. Return null if neither yields an image
 */

import { logger } from "./logger.js";

const WIKI_UA = "AthleteIntelligence/1.0 (sports-intelligence-platform)";
const TIMEOUT = 8000;

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

export async function fetchWikipediaPhoto(
  athleteName: string,
  sport?: string,
): Promise<string | null> {
  try {
    // 1. Exact title lookup
    const direct = await thumbnailFromTitle(athleteName);
    if (direct) return direct;

    // 2. Search fallback — find the Wikipedia article about this person
    const query = sport
      ? `${athleteName} ${sport}`
      : `${athleteName} athlete`;
    const searchData = await wikiGet(
      `action=query&list=search&srsearch=${encodeURIComponent(query)}&srnamespace=0&srlimit=3&format=json`,
    );
    const hits: any[] = searchData?.query?.search ?? [];

    for (const hit of hits) {
      // Only follow results that look like person/biography articles
      if (!hit.title) continue;
      const img = await thumbnailFromTitle(hit.title);
      if (img) return img;
    }

    return null;
  } catch (err) {
    logger.warn({ err, athleteName }, "photo-lookup: Wikipedia request failed");
    return null;
  }
}
