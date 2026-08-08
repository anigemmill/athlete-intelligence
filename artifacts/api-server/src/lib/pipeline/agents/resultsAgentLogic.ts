/**
 * Pure validation/fact-building logic for ResultsAgent (Milestone 3,
 * docs/task-27-milestone-3-resultsagent-proposal.md §4/§5).
 *
 * Split out from resultsAgent.ts — which calls OpenRouter/OpenAI and reads/
 * writes the database — so this file has zero runtime dependency on
 * @workspace/db and is unit-testable with plain fixtures, without
 * DATABASE_URL set. Same pattern as fanOutReconciliation.ts (split from
 * orchestrator.ts) and auditReportRunner.ts (split from auditReport.ts).
 */

import {
  isEventDirectionConsistent,
  isSeasonBestBetterThanPersonalBest,
  isValidDate,
  parseMark,
  sanitizeSourceDomain,
  sanitizeSourceUrl,
  type MarkDirection,
} from "../validation.js";
import { EMISSION_CONFIDENCE_FLOOR } from "../confidence.js";
import { getSourceTier } from "../sourceHierarchy.js";
import type { AgentContext, EvidenceRecord } from "../types.js";

export const RESULTS_AGENT_NAME = "results";

/** One field's raw candidate as returned by the extraction model, before any validation. */
export interface RawFieldCandidate {
  value: unknown;
  sourceDomain: unknown;
  sourceUrl: unknown;
  confidence: unknown;
  publishedAt: unknown;
  rawExcerpt: unknown;
}

export interface RawResultsExtraction {
  worldRank?: RawFieldCandidate | null;
  nationalRank?: RawFieldCandidate | null;
  personalBest?: RawFieldCandidate | null;
  seasonBest?: RawFieldCandidate | null;
}

/** The athlete's currently-stored values, needed for the new-PB Tier 3 gate,
 * the worldRankDelta computation, and recency decay. */
export interface CurrentAthleteStats {
  worldRank: number | null;
  nationalRank: number | null;
  personalBest: string | null;
  seasonBest: string | null;
  lastCrawledAt: Date | null;
}

export interface DroppedField {
  field: string;
  reason: string;
}

export interface BuiltResultsFacts {
  facts: EvidenceRecord[];
  columnUpdates: {
    worldRank?: number | null;
    nationalRank?: number | null;
    personalBest?: string | null;
    seasonBest?: string | null;
  };
  /** Always present. 0 when not resolvable (either observation missing) — matches the existing `worldRankDelta` column's NOT NULL default. */
  worldRankDelta: number;
  droppedFields: DroppedField[];
}

interface RankField { kind: "rank"; claim: "worldRank" | "nationalRank"; value: number; fact: EvidenceRecord }
interface MarkField { kind: "mark"; claim: "personalBest" | "seasonBest"; value: string; direction: MarkDirection; comparableValue: number; fact: EvidenceRecord }

function daysBetween(a: Date, b: Date): number {
  return Math.max(0, Math.round((a.getTime() - b.getTime()) / (24 * 60 * 60 * 1000)));
}

function sourceOrDrop(
  candidate: RawFieldCandidate,
  claim: string,
  dropped: DroppedField[],
): { sourceDomain: string | null; sourceUrl: string | null } | null {
  const sourceDomain = sanitizeSourceDomain(candidate.sourceDomain);
  const sourceUrl = sanitizeSourceUrl(candidate.sourceUrl);
  if (sourceDomain === null && sourceUrl === null) {
    dropped.push({ field: claim, reason: "no traceable source (citation-index leak or missing entirely)" });
    return null;
  }
  return { sourceDomain, sourceUrl };
}

function makeFact(
  claim: string,
  value: unknown,
  sourceDomain: string | null,
  sourceUrl: string | null,
  candidate: RawFieldCandidate,
  now: Date,
): EvidenceRecord {
  return {
    claim,
    value,
    agent: RESULTS_AGENT_NAME,
    sourceDomain,
    sourceUrl,
    retrievedAt: now,
    publishedAt: isValidDate(candidate.publishedAt) ? new Date(candidate.publishedAt) : null,
    rawExcerpt: typeof candidate.rawExcerpt === "string" ? candidate.rawExcerpt : null,
    confidenceBase: typeof candidate.confidence === "number" ? candidate.confidence : 70,
  };
}

/**
 * Validates one rank-shaped field (worldRank or nationalRank). Returns null
 * (dropped, with a reason recorded) if the value isn't a finite integer, its
 * base confidence never clears EMISSION_CONFIDENCE_FLOOR, or it has no
 * traceable source.
 */
function buildRankFact(
  claim: "worldRank" | "nationalRank",
  candidate: RawFieldCandidate | null | undefined,
  now: Date,
  dropped: DroppedField[],
): RankField | null {
  if (!candidate || candidate.value === null || candidate.value === undefined) return null;

  const baseConfidence = typeof candidate.confidence === "number" ? candidate.confidence : 0;
  if (baseConfidence < EMISSION_CONFIDENCE_FLOOR) {
    dropped.push({ field: claim, reason: `base confidence ${baseConfidence} is below the emission floor (${EMISSION_CONFIDENCE_FLOOR})` });
    return null;
  }

  if (typeof candidate.value !== "number" || !Number.isFinite(candidate.value) || !Number.isInteger(candidate.value)) {
    dropped.push({ field: claim, reason: "value is not a finite integer" });
    return null;
  }

  const source = sourceOrDrop(candidate, claim, dropped);
  if (!source) return null;

  return {
    kind: "rank",
    claim,
    value: candidate.value,
    fact: makeFact(claim, candidate.value, source.sourceDomain, source.sourceUrl, candidate, now),
  };
}

/**
 * Validates one mark-shaped field (personalBest or seasonBest). Returns null
 * (dropped, with a reason recorded) if the mark doesn't parse, its base
 * confidence never clears EMISSION_CONFIDENCE_FLOOR, its implied direction
 * is inconsistent with the athlete's declared event, or it has no traceable
 * source.
 */
function buildMarkFact(
  claim: "personalBest" | "seasonBest",
  candidate: RawFieldCandidate | null | undefined,
  athlete: AgentContext,
  now: Date,
  dropped: DroppedField[],
): MarkField | null {
  if (!candidate || candidate.value === null || candidate.value === undefined) return null;

  const baseConfidence = typeof candidate.confidence === "number" ? candidate.confidence : 0;
  if (baseConfidence < EMISSION_CONFIDENCE_FLOOR) {
    dropped.push({ field: claim, reason: `base confidence ${baseConfidence} is below the emission floor (${EMISSION_CONFIDENCE_FLOOR})` });
    return null;
  }

  if (typeof candidate.value !== "string" || candidate.value.trim() === "") {
    dropped.push({ field: claim, reason: "value is not a non-empty string" });
    return null;
  }

  const parsed = parseMark(candidate.value);
  if (!parsed) {
    dropped.push({ field: claim, reason: "mark does not parse to a known, unit-declared format" });
    return null;
  }

  if (isEventDirectionConsistent(athlete.event, parsed.direction) === false) {
    dropped.push({ field: claim, reason: "mark's implied direction is inconsistent with the athlete's declared event" });
    return null;
  }

  const source = sourceOrDrop(candidate, claim, dropped);
  if (!source) return null;

  return {
    kind: "mark",
    claim,
    value: candidate.value,
    direction: parsed.direction,
    comparableValue: parsed.comparableValue,
    fact: makeFact(claim, candidate.value, source.sourceDomain, source.sourceUrl, candidate, now),
  };
}

/**
 * The single entry point this file exists for. Validates every field
 * independently, cross-checks PB/SB for inversion (docs/technical-debt.md
 * Priority 2), applies the Tier 3 new-PB corroboration gate
 * (docs/truth-verification-layer.md §3), and computes worldRankDelta.
 *
 * Corroboration: Milestone 3 runs exactly one research pass per invocation,
 * so there is no second, independent source to agree with yet (cross-agent
 * corroboration is a later, unimplemented piece of the Truth Verification
 * Layer). This means a genuinely new (numerically superior to the current
 * stored value) PB is always withheld this milestone — see the
 * current.personalBest !== null handling below for the one deliberate
 * exception (a first-ever discovery is treated as a Tier 2 restatement, not
 * a "new record" claim).
 *
 * Recency decay (confidence.ts's applyRecencyDecay) is intentionally not
 * applied here — it discounts an already-stored value that's going stale,
 * which is a concern for whatever reads confidence back out of evidence_log
 * later, not for deciding whether to accept a freshly-retrieved candidate
 * this run. Nothing in this milestone reads adjusted confidence back out of
 * a persisted fact yet (see docs/task-27-agentic-pipeline.md §5.1 — the
 * evidence store is a raw JSON blob, not a queryable ledger), so there is no
 * consumer for a decayed number today; wiring recency decay into a real
 * consumer is future Evidence Ledger work, not fabricated here ahead of one.
 */
export function buildResultsFacts(
  extraction: RawResultsExtraction,
  athlete: AgentContext,
  current: CurrentAthleteStats,
  now: Date,
): BuiltResultsFacts {
  const dropped: DroppedField[] = [];

  const worldRank = buildRankFact("worldRank", extraction.worldRank, now, dropped);
  const nationalRank = buildRankFact("nationalRank", extraction.nationalRank, now, dropped);
  let personalBest = buildMarkFact("personalBest", extraction.personalBest, athlete, now, dropped);
  let seasonBest = buildMarkFact("seasonBest", extraction.seasonBest, athlete, now, dropped);

  // docs/technical-debt.md Priority 2 — cross-check, don't auto-correct.
  // Unlike the legacy monolith (which silently overwrites personalBest with
  // seasonBest), ResultsAgent drops BOTH fields for this run rather than
  // storing a value it cannot vouch for either side of.
  if (personalBest && seasonBest) {
    const inverted = isSeasonBestBetterThanPersonalBest(personalBest.value, seasonBest.value);
    if (inverted === true) {
      dropped.push({ field: "personalBest", reason: "season best is logically superior to personal best — both dropped, not corrected" });
      dropped.push({ field: "seasonBest", reason: "season best is logically superior to personal best — both dropped, not corrected" });
      personalBest = null;
      seasonBest = null;
    }
  }

  // docs/truth-verification-layer.md §3, Tier 3 — a NEW personal best (one
  // numerically superior to an already-known stored value) is never stored
  // on a single, uncorroborated source. A first-ever discovery (current
  // value is null — nothing to compare against, not a "just broke the
  // record" claim) is treated as a Tier 2 restatement instead: storable,
  // just not yet corroborated. This distinction is a deliberate judgement
  // call documented here, not an oversight — see this milestone's proposal
  // (docs/task-27-milestone-3-resultsagent-proposal.md §5) for the reasoning.
  if (personalBest && current.personalBest !== null) {
    const currentParsed = parseMark(current.personalBest);
    if (currentParsed && currentParsed.direction === personalBest.direction) {
      const isNewAndBetter =
        personalBest.direction === "lower-better"
          ? personalBest.comparableValue < currentParsed.comparableValue
          : personalBest.comparableValue > currentParsed.comparableValue;
      if (isNewAndBetter) {
        dropped.push({ field: "personalBest", reason: "new PB claim requires independent corroboration (Tier 3) — withheld this run" });
        personalBest = null;
      }
    }
  }

  const columnUpdates: BuiltResultsFacts["columnUpdates"] = {};
  const facts: EvidenceRecord[] = [];

  if (worldRank) { columnUpdates.worldRank = worldRank.value; facts.push(worldRank.fact); }
  if (nationalRank) { columnUpdates.nationalRank = nationalRank.value; facts.push(nationalRank.fact); }
  if (personalBest) { columnUpdates.personalBest = personalBest.value; facts.push(personalBest.fact); }
  if (seasonBest) { columnUpdates.seasonBest = seasonBest.value; facts.push(seasonBest.fact); }

  // world_rank_delta is derived, not independently sourced (proposal §2) —
  // positive = improved, matching the frontend's existing rendering
  // convention (DossierPage.tsx: worldRankDelta > 0 -> green, TrendingUp).
  // Note this is the OPPOSITE sign convention from the now-superseded
  // legacy extraction prompt's comment in auto-populate.ts ("negative =
  // improved") — a pre-existing inconsistency between that prompt's
  // instruction and the frontend's actual rendering, found while
  // implementing this milestone and corrected here rather than propagated.
  const worldRankDelta =
    worldRank && current.worldRank !== null ? current.worldRank - worldRank.value : 0;

  return { facts, columnUpdates, worldRankDelta, droppedFields: dropped };
}
