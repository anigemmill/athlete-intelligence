/**
 * sponsors-agent.ts
 *
 * SponsorsAgent — brand-deal intelligence, with confidence decay for aged
 * reports. Per docs/roadmap.md / docs/ai-architecture.md ("SponsorsAgent —
 * brand deals + confidence decay"). Writes to the existing
 * intelligence_items table under category "sponsorships" — that category
 * is removed from the shared main-extraction prompt so this agent is the
 * sole source for it, the same pattern CompetitionsAgent/ContactsAgent/
 * TimelineAgent used when pulling their categories out of the monolith.
 *
 * Scope boundary (set in ContactsAgent's M5 docstring, still true here):
 * this agent tracks brand DEALS (what sponsorship exists, when it was
 * reported), not brand-relations CONTACT PEOPLE — those remain
 * ContactsAgent's "representation" scope. A deal and a named contact for
 * that deal can both exist; this agent only writes the former.
 *
 * Confidence decay: a sponsorship reported a long time ago is less likely
 * to still be an active, current deal than one reported recently. Rather
 * than a background job that continuously ages stored confidence (which
 * would need either a cron job or read-time computation — outside this
 * pipeline's scope), decay is applied once at extraction time based on
 * how old the reported publication date is, using the existing
 * publishedAt column. No schema change needed. Decay lowers confidence,
 * it never drops the item outright — an old, no-longer-active deal is
 * still real, useful historical context, unlike a "current coach" claim
 * that needs to be true right now.
 */

import { openai } from "@workspace/integrations-openai-ai-server";
import { logger } from "./logger.js";
import { callPerplexity } from "./perplexity-client.js";
import { withAiConcurrencyLimit } from "./ai-concurrency.js";
import { withRetry } from "./retry.js";
import { isValidDate } from "./validation.js";
import { resolveSourceAttribution, applyConfidenceFloor } from "./source-validation.js";
import type { AthleteStub } from "./athlete-stub.js";

export interface SponsorRow {
  category: "sponsorships";
  title: string;
  summary: string | null;
  sourceDomain: string;
  sourceUrl: string | null;
  confidence: number;
  publishedAt: Date;
}

/** Minimum confidence, after domain adjustment (before recency decay), to keep a sponsorship item. */
const MIN_SPONSOR_CONFIDENCE = 70;

const DECAY_THRESHOLDS_MONTHS = [
  { maxMonths: 6, penalty: 0 },
  { maxMonths: 18, penalty: 5 },
  { maxMonths: 36, penalty: 10 },
  { maxMonths: Infinity, penalty: 15 },
];

/** How many points to subtract for a sponsorship reported this many months ago. */
export function decayPenaltyForAge(publishedAt: Date, now: Date): number {
  // Calendar-month difference, not a fixed-day approximation — avoids
  // drift at bucket boundaries from varying month lengths.
  const months =
    (now.getFullYear() - publishedAt.getFullYear()) * 12 +
    (now.getMonth() - publishedAt.getMonth()) +
    (now.getDate() >= publishedAt.getDate() ? 0 : -1);
  const bucket = DECAY_THRESHOLDS_MONTHS.find((t) => months <= t.maxMonths);
  return bucket ? bucket.penalty : 0;
}

async function researchSponsorships(
  athlete: AthleteStub,
): Promise<{ research: string; citations: string[] }> {
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  try {
    const { research, citations } = await callPerplexity({
      label: "sponsors-agent research",
      maxTokens: 3072,
      systemPrompt: `You are a sports business researcher tracking athlete brand sponsorships. Only report deals with real, named brands explicitly stated in a source. Today's date is ${today}. Never fabricate information.`,
      userPrompt: `Research the sponsorship and brand-deal history of ${athlete.name} (${athlete.sport} — ${athlete.event}, ${athlete.nationality}), current and past.

For each sponsorship, give: the specific brand name (never a vague label like "a sportswear company" — the real named brand), what kind of deal it is if known (apparel, equipment, nutrition, endorsement, etc.), when it was reported or announced, and whether the source indicates it is still active or has ended. Only report deals with a named brand explicitly stated in a real source — do not guess a plausible sponsor from the athlete's sport.

Cite your sources.`,
    });
    logger.info(
      { athleteId: athlete.id, name: athlete.name, length: research.length, citationCount: citations.length },
      "sponsors-agent: research complete",
    );
    return { research, citations };
  } catch (err) {
    logger.warn(
      { err, athleteId: athlete.id, name: athlete.name },
      "sponsors-agent: research failed — skipping sponsorship items this run",
    );
    return { research: "", citations: [] };
  }
}

const SYSTEM_PROMPT = `You are a sports intelligence data engine extracting brand-sponsorship deals. Return ONLY valid JSON — no markdown, no explanation.

Rules:
- ONLY extract a deal with a real, specific, named brand explicitly stated in the research. Never invent or guess a plausible sponsor — omit the entry instead.
- title should name the brand and deal type, e.g. "Nike apparel sponsorship" — not a vague restatement.
- sourceUrl MUST be chosen from the provided CITATION URLs list. If no citation is relevant, set sourceUrl to null. NEVER invent, guess, or construct a URL.
- sourceDomain must match the domain of the chosen sourceUrl, or be the most relevant real domain from the research if sourceUrl is null.
- publishedAt must be an ISO-8601 date reflecting when the deal was actually reported/announced — not today's date.
- confidence: 85-97 for a deal explicitly and clearly reported. 70-84 for one that's mentioned but more weakly sourced. Never below 70 — omit the item instead if evidence is that weak.`;

const USER_PROMPT = (a: AthleteStub, research: string, citations: string[]): string => {
  return `
Athlete: ${a.name} (${a.sport} — ${a.event}, ${a.nationality})

${citations.length > 0
  ? `VERIFIED CITATION URLs — use ONLY these for sourceUrl fields. Do NOT invent URLs.
${citations.map((c, i) => `${i + 1}. ${c}`).join("\n")}

`
  : ""}${research
  ? `VERIFIED SPONSORSHIP RESEARCH:
\`\`\`
${research}
\`\`\``
  : `ABORT: No verified research is available. Return { "sponsorships": [] }.`}

Extract the sponsorship history as JSON:

{
  "sponsorships": [
    {
      "title": <string — brand name + deal type, e.g. "Nike apparel sponsorship">,
      "summary": <string, 1-2 sentences with specific details>,
      "sourceDomain": <string>,
      "sourceUrl": <string or null — MUST be from the citation list above, or null>,
      "confidence": <integer 70-97>,
      "publishedAt": <ISO-8601 date — when the deal was reported, not today>
    }
    // As many real, named-brand deals as the research genuinely supports.
    // Do not pad with vague or duplicate entries.
  ]
}
`;
};

/**
 * Runs the SponsorsAgent: dedicated research + extraction for an
 * athlete's brand-sponsorship history, with source validation, a
 * confidence floor, and recency-based confidence decay applied before
 * being returned.
 */
export async function runSponsorsAgent(athlete: AthleteStub): Promise<SponsorRow[]> {
  const { research, citations } = await researchSponsorships(athlete);
  if (!research) return [];

  try {
    const response = await withAiConcurrencyLimit(() =>
      withRetry(
        () =>
          openai.chat.completions.create({
            model: "gpt-4o",
            max_completion_tokens: 2048,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: USER_PROMPT(athlete, research, citations) },
            ],
            response_format: { type: "json_object" },
          }),
        { label: "sponsors-agent extraction" },
      ),
    );
    const raw = response.choices[0]?.message?.content;
    if (!raw) return [];

    const data = JSON.parse(raw) as { sponsorships?: any[] };
    const rawItems = Array.isArray(data.sponsorships) ? data.sponsorships : [];
    const now = new Date();

    const rows: SponsorRow[] = [];
    let droppedInvalid = 0;
    let droppedLowConfidence = 0;

    for (const item of rawItems) {
      const title = typeof item?.title === "string" ? item.title.trim() : "";
      if (!title) {
        droppedInvalid++;
        continue;
      }
      const publishedAt = isValidDate(item.publishedAt) ? new Date(item.publishedAt) : null;
      if (!publishedAt) {
        droppedInvalid++;
        continue;
      }

      const { sourceDomain, sourceUrl } = resolveSourceAttribution(item.sourceUrl, citations);
      const { confidence: adjustedConfidence, passesFloor } = applyConfidenceFloor(
        item.confidence,
        sourceDomain,
        sourceUrl !== null,
        MIN_SPONSOR_CONFIDENCE,
      );
      if (!passesFloor) {
        droppedLowConfidence++;
        continue;
      }

      const decay = decayPenaltyForAge(publishedAt, now);
      const confidence = Math.max(40, adjustedConfidence - decay);

      rows.push({
        category: "sponsorships",
        title,
        summary: item.summary ? String(item.summary) : null,
        sourceDomain,
        sourceUrl,
        confidence,
        publishedAt,
      });
    }

    if (droppedInvalid > 0 || droppedLowConfidence > 0) {
      logger.warn(
        { athleteId: athlete.id, name: athlete.name, droppedInvalid, droppedLowConfidence, kept: rows.length },
        "sponsors-agent: dropped invalid or low-confidence sponsorship items",
      );
    }

    return rows;
  } catch (err) {
    logger.warn(
      { err, athleteId: athlete.id, name: athlete.name },
      "sponsors-agent: extraction failed — skipping sponsorship items this run",
    );
    return [];
  }
}
