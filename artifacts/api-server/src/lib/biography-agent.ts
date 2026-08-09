/**
 * biography-agent.ts
 *
 * BiographyAgent — verifies and refines an athlete's core biographical
 * facts (age, nationality) on each populate cycle. Per docs/roadmap.md /
 * docs/ai-architecture.md ("BiographyAgent — birth date, nationality").
 *
 * Scope note, made explicitly rather than silently: the athletes table
 * has no birthDate column — only an integer `age`, set once at athlete
 * creation via discoverAthleteProfile and never refreshed afterward. This
 * agent operates within that existing schema (verifying/correcting age
 * and nationality) rather than adding a new column. A dedicated
 * birthDate column would be more precise — age drifts stale year over
 * year, a birth date wouldn't — but adding one is a schema decision, not
 * something to make unilaterally mid-run. Flagged here for a later
 * milestone rather than implemented now.
 *
 * Nationality is required and already set at athlete creation; this
 * agent's job is to catch and correct it when wrong (e.g. an athlete who
 * has since changed sporting nationality) rather than leave a stale or
 * incorrect value in place indefinitely. A correction is only applied
 * when the research explicitly and confidently supports it — this does
 * not overwrite a correct value with a guess, and does not touch
 * anything if the research is inconclusive.
 */

import { openai } from "@workspace/integrations-openai-ai-server";
import { logger } from "./logger.js";
import { callPerplexity } from "./perplexity-client.js";
import { withAiConcurrencyLimit } from "./ai-concurrency.js";
import { withRetry } from "./retry.js";
import type { AthleteStub } from "./athlete-stub.js";

export interface BiographyUpdate {
  age: number | null;
  nationality: string | null;
  nationalityChanged: boolean;
}

const MIN_BIOGRAPHY_CONFIDENCE = 80;

async function researchBiography(
  athlete: AthleteStub,
): Promise<{ research: string; citations: string[] }> {
  try {
    const { research, citations } = await callPerplexity({
      label: "biography-agent research",
      maxTokens: 1024,
      systemPrompt: `You are a sports researcher verifying an athlete's core biographical facts. Only report facts explicitly stated in a real source. Never fabricate information.`,
      userPrompt: `Verify the current age and competitive nationality of ${athlete.name} (${athlete.sport} — ${athlete.event}). They are currently recorded as ${athlete.nationality} and approximately ${athlete.age ?? "unknown"} years old.

Confirm their date of birth or current age, and confirm which country they currently compete for. If you find explicit evidence they have changed sporting nationality (e.g. now competing for a different country than previously), state that clearly with the source. If the recorded information is already correct, say so.

Cite your sources.`,
    });
    logger.info(
      { athleteId: athlete.id, name: athlete.name, length: research.length, citationCount: citations.length },
      "biography-agent: research complete",
    );
    return { research, citations };
  } catch (err) {
    logger.warn(
      { err, athleteId: athlete.id, name: athlete.name },
      "biography-agent: research failed — skipping this run",
    );
    return { research: "", citations: [] };
  }
}

const SYSTEM_PROMPT = `You are a sports intelligence data engine verifying biographical facts. Return ONLY valid JSON — no markdown, no explanation.

Rules:
- Only report age or nationality if the research explicitly and clearly supports it. If the research is inconclusive or doesn't mention it, set the field to null.
- nationalityChanged: true only if the research explicitly states the athlete now competes for a different country than before. Do not infer this from ambiguous information.
- confidence: integer 0-100 for how clearly the research supports the reported facts. Use below 80 for anything uncertain, ambiguous, or inferred rather than explicitly stated.`;

const USER_PROMPT = (a: AthleteStub, research: string): string => `
Athlete: ${a.name} — currently recorded as ${a.nationality}, age ${a.age ?? "unknown"}

${research
  ? `VERIFIED RESEARCH:
\`\`\`
${research}
\`\`\``
  : `ABORT: No verified research is available. Return { "age": null, "nationality": null, "nationalityChanged": false, "confidence": 0 }.`}

Extract as JSON:
{
  "age": <integer or null>,
  "nationality": <string or null>,
  "nationalityChanged": <boolean>,
  "confidence": <integer 0-100>
}
`;

/**
 * Runs the BiographyAgent: verifies age and nationality against fresh
 * research. Returns fields as null when unconfirmed or below the
 * confidence floor — callers should treat null as "no update", not "no
 * data". Never throws.
 */
export async function runBiographyAgent(athlete: AthleteStub): Promise<BiographyUpdate> {
  const noUpdate: BiographyUpdate = { age: null, nationality: null, nationalityChanged: false };

  const { research } = await researchBiography(athlete);
  if (!research) return noUpdate;

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
        { label: "biography-agent extraction" },
      ),
    );
    const raw = response.choices[0]?.message?.content;
    if (!raw) return noUpdate;

    const data = JSON.parse(raw) as Record<string, unknown>;
    const confidence = typeof data.confidence === "number" ? data.confidence : 0;
    if (confidence < MIN_BIOGRAPHY_CONFIDENCE) {
      logger.info(
        { athleteId: athlete.id, name: athlete.name, confidence },
        "biography-agent: confidence below floor — no update applied this run",
      );
      return noUpdate;
    }

    const nationalityChanged = data.nationalityChanged === true;
    const nationality =
      typeof data.nationality === "string" && data.nationality.trim() && data.nationality.trim() !== athlete.nationality
        ? data.nationality.trim()
        : null;

    if (nationality && nationalityChanged) {
      logger.info(
        { athleteId: athlete.id, name: athlete.name, previous: athlete.nationality, updated: nationality },
        "biography-agent: nationality change confirmed by research — updating",
      );
    } else if (nationality && !nationalityChanged) {
      // GPT reported a different nationality than recorded but did not
      // explicitly confirm a change — treat as unconfirmed, don't apply.
      logger.warn(
        { athleteId: athlete.id, name: athlete.name, recorded: athlete.nationality, claimed: nationality },
        "biography-agent: research suggests a different nationality than recorded, but no explicit change was confirmed — not updating",
      );
    }

    return {
      age: typeof data.age === "number" ? data.age : null,
      nationality: nationality && nationalityChanged ? nationality : null,
      nationalityChanged: nationality !== null && nationalityChanged,
    };
  } catch (err) {
    logger.warn(
      { err, athleteId: athlete.id, name: athlete.name },
      "biography-agent: extraction failed — skipping this run",
    );
    return noUpdate;
  }
}
