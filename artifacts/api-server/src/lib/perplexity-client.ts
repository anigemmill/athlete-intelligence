/**
 * perplexity-client.ts
 *
 * Shared helper for calling Perplexity Sonar via OpenRouter and extracting
 * real citation URLs from the response. Every research call in the
 * pipeline (general research, CompetitionsAgent, ContactsAgent,
 * TimelineAgent) previously hand-rolled this same call + annotation-
 * parsing logic independently; centralised here so there is exactly one
 * place that knows where Perplexity's real citations actually live in the
 * response — message.annotations[].url_citation.url, NOT a top-level
 * `citations` field (see the 2026-08-09 live pipeline verification, which
 * found every caller reading the wrong field).
 *
 * Wrapped in the shared concurrency cap and a conservative retry for
 * transient failures only. Throws on failure (after retries are
 * exhausted) exactly like the original inline `openrouter.chat.completions
 * .create` calls did — callers keep their own try/catch and existing
 * fallback behaviour (some abort the pipeline, some return empty
 * research/citations and continue). This helper does not change what
 * "failure" means for any caller, only where the call + citation parsing
 * happens.
 */

import { openrouter } from "@workspace/integrations-openrouter-ai";
import { withAiConcurrencyLimit } from "./ai-concurrency.js";
import { withRetry } from "./retry.js";

export interface PerplexityResult {
  research: string;
  citations: string[];
}

export async function callPerplexity(params: {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  label?: string;
}): Promise<PerplexityResult> {
  const { systemPrompt, userPrompt, maxTokens = 4096, label } = params;

  const response = await withAiConcurrencyLimit(() =>
    withRetry(
      () =>
        openrouter.chat.completions.create({
          model: "perplexity/sonar",
          max_tokens: maxTokens,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      { label },
    ),
  );

  const message = response.choices[0]?.message as any;
  const research = message?.content ?? "";
  const citations: string[] = Array.isArray(message?.annotations)
    ? message.annotations
        .filter((a: any) => a?.type === "url_citation" && typeof a?.url_citation?.url === "string")
        .map((a: any) => a.url_citation.url as string)
    : [];

  return { research, citations };
}
