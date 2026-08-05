/**
 * Centralised confidence engine (docs/task-27-agentic-pipeline.md §7).
 *
 * This is the fix for a bug found during the repository review: the current
 * pipeline (artifacts/api-server/src/lib/auto-populate.ts) defines an
 * `adjustConfidenceByDomain` function that is exported but never called from
 * the write path — a rule that exists but isn't wired in. The architecture
 * spec's answer to that class of bug is to make confidence adjustment a
 * mandatory orchestrator stage that no write path can bypass, because no
 * write path has direct database access — only the persistence phase does,
 * and it only accepts already-adjusted values.
 *
 * These are pure functions. Nothing in Milestone 0 calls them from a live
 * code path yet — auto-populate.ts is untouched until Milestone 1, and the
 * orchestrator that will make this stage mandatory doesn't exist until
 * Milestone 2.
 */

import type { SourceTier } from "./sourceHierarchy.js";

/** §7.1 — the floor below which an agent must not emit a candidate fact at
 * all. Enforced by agents themselves once they exist (Milestone 2+); listed
 * here so every future agent references the same number instead of each
 * hard-coding its own. */
export const EMISSION_CONFIDENCE_FLOOR = 65;

export const CONFIDENCE_FLOOR = 40;
export const CONFIDENCE_CEILING = 97;

function clamp(value: number): number {
  return Math.min(CONFIDENCE_CEILING, Math.max(CONFIDENCE_FLOOR, value));
}

/**
 * §7.2 — domain-authority adjustment. Tier 1: +5. Tier 2: +2. Tier 3: no
 * change. Tier 4 (or unresolvable): -10. No source URL at all: additional -5.
 * Result is always clamped to [CONFIDENCE_FLOOR, CONFIDENCE_CEILING].
 */
export function adjustForSourceTier(
  confidence: number,
  tier: SourceTier,
  hasSourceUrl: boolean,
): number {
  let adjusted = confidence;
  if (tier === 1) adjusted += 5;
  else if (tier === 2) adjusted += 2;
  else if (tier === 4) adjusted -= 10;
  // tier 3: no adjustment

  if (!hasSourceUrl) adjusted -= 5;

  return clamp(adjusted);
}

/**
 * §7.3 — corroboration boost. When two independent agents (not two facts
 * from the same agent) surface the same underlying fact, the corroborated
 * instance gets +3. New relative to the current pipeline, which runs one
 * research pass and so can never corroborate anything against itself.
 */
export function applyCorroborationBoost(confidence: number, corroborated: boolean): number {
  return clamp(corroborated ? confidence + 3 : confidence);
}

const RECENCY_DECAY_GRACE_DAYS = 14;
const RECENCY_DECAY_PER_DAY = 1;

/** Fields whose truth changes over time even if the pipeline hasn't
 * refreshed them — world ranking, season-best marks, current team, and
 * follower counts are all stale in a way a birth date or a coach's name
 * is not. Used by applyRecencyDecay to decide whether decay applies at all. */
export const PERISHABLE_FIELDS = new Set([
  "worldRank",
  "seasonBest",
  "currentTeam",
  "instagramFollowers",
  "twitterFollowers",
  "tiktokFollowers",
]);

export function isPerishableField(fieldName: string): boolean {
  return PERISHABLE_FIELDS.has(fieldName);
}

/**
 * §7.4 — recency decay. Perishable fields lose 1 point of confidence per day
 * once more than 14 days have passed since the fact was last refreshed,
 * floored at CONFIDENCE_FLOOR. Non-perishable fields never decay this way —
 * a birth date confirmed a year ago is not less true today.
 */
export function applyRecencyDecay(
  confidence: number,
  daysSinceLastRefresh: number,
  isPerishable: boolean,
): number {
  if (!isPerishable) return clamp(confidence);
  if (daysSinceLastRefresh <= RECENCY_DECAY_GRACE_DAYS) return clamp(confidence);

  const daysPastGrace = daysSinceLastRefresh - RECENCY_DECAY_GRACE_DAYS;
  return clamp(confidence - daysPastGrace * RECENCY_DECAY_PER_DAY);
}

export interface ConfidenceAdjustmentInput {
  baseConfidence: number;
  tier: SourceTier;
  hasSourceUrl: boolean;
  corroborated?: boolean;
  /** Omit both of these together when recency decay doesn't apply — e.g.
   * the fact has no known field name, or this is its first-ever fetch. */
  fieldName?: string;
  daysSinceLastRefresh?: number;
}

/**
 * Applies all three adjustment stages in order: source-tier, then
 * corroboration, then recency decay. This is the single function every
 * future write path should call — see the file header for why "single" is
 * the whole point.
 */
export function computeAdjustedConfidence(input: ConfidenceAdjustmentInput): number {
  let confidence = adjustForSourceTier(input.baseConfidence, input.tier, input.hasSourceUrl);
  confidence = applyCorroborationBoost(confidence, input.corroborated ?? false);

  if (input.fieldName !== undefined && input.daysSinceLastRefresh !== undefined) {
    confidence = applyRecencyDecay(
      confidence,
      input.daysSinceLastRefresh,
      isPerishableField(input.fieldName),
    );
  }

  return confidence;
}
