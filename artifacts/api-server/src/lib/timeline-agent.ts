/**
 * timeline-agent.ts
 *
 * TimelineAgent (M6) — builds a career timeline sized to the individual
 * athlete's actual career, not a fixed row-count target. The earlier
 * (M3.1) version of this logic asked GPT for "20-30 events" as an output
 * target; per the M6 design refinement, that figure is now used only as
 * an investigative-depth signal (logged when the result falls well short
 * of it — worth a look, never a reason to invent more) rather than
 * something the model is asked to pad toward. A veteran athlete's career
 * may genuinely need far more than 30 meaningful events; a young
 * athlete's may legitimately need far fewer than 20. The model is asked
 * to reason about this specific athlete's actual career length and
 * produce coverage proportional to it — junior/development years,
 * breakthrough, peak, and current status — not a generic count.
 *
 * Same guardrail stack as CompetitionsAgent/ContactsAgent: dedicated
 * Perplexity research, dedicated GPT-4o extraction, sourceUrl/sourceDomain
 * cross-checked against real citations (resolveSourceAttribution), and a
 * minimum-confidence floor after domain-authority adjustment. New for M6:
 * exact-duplicate rejection (same date + same normalized title) — "do not
 * pad with duplicate events" is enforced in code, not left to the prompt.
 *
 * Guiding principle, same as every agent in this pipeline: quality over
 * quantity, evidence over completeness, unknown over invented.
 */

import { openai } from "@workspace/integrations-openai-ai-server";
import { openrouter } from "@workspace/integrations-openrouter-ai";
import { logger } from "./logger.js";
import { resolveSourceAttribution, adjustConfidenceByDomain } from "./source-validation.js";

interface AthleteStub {
  id: number;
  name: string;
  sport: string;
  event: string;
  nationality: string;
  age?: number | null;
}

export interface TimelineRow {
  date: string;
  category: "competition" | "media" | "sponsorship" | "career" | "personal";
  title: string;
  description: string | null;
  location: string | null;
  sourceDomain: string;
  sourceUrl: string | null;
  confidence: number;
  significant: boolean;
}

/** Minimum confidence, after domain-authority adjustment, to keep an event. */
const MIN_TIMELINE_CONFIDENCE = 70;

/**
 * Below this count, the result is worth flagging as possibly sparse
 * research rather than a genuinely short career — a signal to look at,
 * not a floor the model is told to hit. See module docstring.
 */
const INVESTIGATIVE_DEPTH_BENCHMARK = 12;

function isValidDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value);
  return !isNaN(d.getTime());
}

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

async function researchCareerTimeline(
  athlete: AthleteStub,
): Promise<{ research: string; citations: string[] }> {
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  try {
    const response = await openrouter.chat.completions.create({
      model: "perplexity/sonar",
      max_tokens: 4096,
      messages: [
        {
          role: "system",
          content: `You are a sports historian building an accurate career timeline. Today's date is ${today}. Cover the athlete's actual career length — do not assume every career is the same length or shape. Never fabricate information.`,
        },
        {
          role: "user",
          content: `Research the career of ${athlete.name} (${athlete.sport} — ${athlete.event}, ${athlete.nationality}) from their earliest known involvement in the sport (junior/youth level, or first senior season — whichever is genuinely earliest and documented) through to ${today}.

Cover their progression through career phases as they actually happened: junior/development years, breakthrough into senior competition, peak years, and current status. For each phase, report what's actually documented — major competitions and results, significant career changes (team, coach, or sponsor changes), injuries and returns ONLY where explicitly reported (do not speculate about undisclosed injuries), and major individual achievements or milestones. If a period of their career has no documented events, say so rather than inventing filler.

Give exact dates where known, and cite your sources for each claim.`,
        },
      ],
    });
    const message = response.choices[0]?.message as any;
    const research = message?.content ?? "";
    const citations: string[] = Array.isArray(message?.annotations)
      ? message.annotations
          .filter((a: any) => a?.type === "url_citation" && typeof a?.url_citation?.url === "string")
          .map((a: any) => a.url_citation.url as string)
      : [];
    logger.info(
      { athleteId: athlete.id, name: athlete.name, length: research.length, citationCount: citations.length },
      "timeline-agent: research complete",
    );
    return { research, citations };
  } catch (err) {
    logger.warn(
      { err, athleteId: athlete.id, name: athlete.name },
      "timeline-agent: research failed — skipping timeline events this run",
    );
    return { research: "", citations: [] };
  }
}

const SYSTEM_PROMPT = `You are a sports intelligence data engine extracting a career timeline. Return ONLY valid JSON — no markdown, no explanation.

Guiding principle: quality over quantity, evidence over completeness, unknown over invented. You are not trying to hit a target number of events — you are trying to accurately represent this specific athlete's career, whatever shape it actually has.

Rules:
- ACCURACY FIRST: use the provided research as your primary source of truth. Do not contradict it.
- Every event must be grounded in a real, specific claim in the research — not a generic restatement like "athlete competed this year" with no real content.
- Do NOT invent events to fill quiet years, and do NOT split one real event into multiple near-duplicate entries to inflate the count.
- sourceUrl MUST be chosen from the provided CITATION URLs list. If no citation is relevant, set sourceUrl to null. NEVER invent, guess, or construct a URL.
- sourceDomain must match the domain of the chosen sourceUrl, or be the most relevant real domain from the research if sourceUrl is null.
- Dates must be ISO-8601 strings reflecting when events actually occurred.
- Confidence: 85-97 for data explicitly stated in the research. 70-84 for reasonably inferred from context (e.g. an approximate season). Never below 70 — omit the event instead if evidence is that weak.
- Categories: competition | media | sponsorship | career | personal (injuries/returns belong under "career" or "personal", only when explicitly reported).`;

const USER_PROMPT = (a: AthleteStub, research: string, citations: string[]): string => {
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  return `
Athlete: ${a.name} (${a.sport} — ${a.event}, ${a.nationality})

${citations.length > 0
  ? `VERIFIED CITATION URLs — use ONLY these for sourceUrl fields. Do NOT invent URLs.
${citations.map((c, i) => `${i + 1}. ${c}`).join("\n")}

`
  : ""}${research
  ? `VERIFIED CAREER RESEARCH:
\`\`\`
${research}
\`\`\``
  : `ABORT: No verified research is available. Return { "timeline_events": [] }.`}

Extract the career timeline as JSON:

{
  "timeline_events": [
    {
      "date": <YYYY-MM-DD>,
      "category": "competition" | "media" | "sponsorship" | "career" | "personal",
      "title": <string>,
      "description": <string>,
      "location": <string or null>,
      "sourceDomain": <string>,
      "sourceUrl": <string or null — MUST be from the citation list above, or null>,
      "confidence": <integer>,
      "significant": <boolean>
    }
    // Include as many distinct, real, dated events as THIS athlete's actual career
    // and the research genuinely support — spanning their earliest documented
    // involvement through ${today}, chronological, oldest first. A long, richly
    // documented career may need far more than 30 events; a short or sparsely
    // documented one may genuinely only support a handful. Do not pad toward any
    // particular count in either direction. Every entry needs its own real date
    // and its own real, specific claim — no duplicates, no generic filler.
  ]
}
`;
};

async function extractCareerTimeline(
  athlete: AthleteStub,
  research: string,
  citations: string[],
): Promise<any[]> {
  if (!research) return [];
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: USER_PROMPT(athlete, research, citations) },
      ],
      response_format: { type: "json_object" },
    });
    const raw = response.choices[0]?.message?.content;
    if (!raw) return [];
    const data = JSON.parse(raw) as { timeline_events?: any[] };
    return Array.isArray(data.timeline_events) ? data.timeline_events : [];
  } catch (err) {
    logger.warn(
      { err, athleteId: athlete.id, name: athlete.name },
      "timeline-agent: extraction failed — skipping timeline events this run",
    );
    return [];
  }
}

/**
 * Runs the TimelineAgent: dedicated research + extraction for an athlete's
 * career timeline, validated and deduplicated before being returned.
 * Never throws — returns [] on any failure.
 */
export async function runTimelineAgent(athlete: AthleteStub): Promise<TimelineRow[]> {
  const { research, citations } = await researchCareerTimeline(athlete);
  const rawEvents = await extractCareerTimeline(athlete, research, citations);
  if (rawEvents.length === 0) return [];

  const rows: TimelineRow[] = [];
  const seen = new Set<string>();
  let droppedInvalid = 0;
  let droppedDuplicate = 0;
  let droppedLowConfidence = 0;

  for (const ev of rawEvents) {
    if (!isValidDate(ev?.date)) {
      droppedInvalid++;
      continue;
    }
    const title = typeof ev.title === "string" ? ev.title.trim() : "";
    if (!title) {
      droppedInvalid++;
      continue;
    }
    const dedupeKey = `${ev.date}|${normalizeTitle(title)}`;
    if (seen.has(dedupeKey)) {
      droppedDuplicate++;
      continue;
    }

    const { sourceDomain, sourceUrl } = resolveSourceAttribution(ev.sourceUrl, citations);
    const baseConfidence = typeof ev.confidence === "number" ? Math.max(70, ev.confidence) : 70;
    const confidence = adjustConfidenceByDomain(baseConfidence, sourceDomain, sourceUrl !== null);

    if (confidence < MIN_TIMELINE_CONFIDENCE) {
      droppedLowConfidence++;
      continue;
    }

    seen.add(dedupeKey);
    rows.push({
      date: ev.date,
      category: (["competition", "media", "sponsorship", "career", "personal"] as const).includes(ev.category)
        ? ev.category
        : "career",
      title,
      description: ev.description ? String(ev.description) : null,
      location: ev.location ? String(ev.location) : null,
      sourceDomain,
      sourceUrl,
      confidence,
      significant: Boolean(ev.significant),
    });
  }

  if (droppedInvalid > 0 || droppedDuplicate > 0 || droppedLowConfidence > 0) {
    logger.warn(
      { athleteId: athlete.id, name: athlete.name, droppedInvalid, droppedDuplicate, droppedLowConfidence, kept: rows.length },
      "timeline-agent: dropped invalid, duplicate, or low-confidence events",
    );
  }

  if (rows.length < INVESTIGATIVE_DEPTH_BENCHMARK) {
    logger.info(
      { athleteId: athlete.id, name: athlete.name, count: rows.length, benchmark: INVESTIGATIVE_DEPTH_BENCHMARK },
      "timeline-agent: event count below the investigative-depth benchmark — may indicate sparse research rather than a genuinely short career; not treated as an error",
    );
  }

  return rows;
}
