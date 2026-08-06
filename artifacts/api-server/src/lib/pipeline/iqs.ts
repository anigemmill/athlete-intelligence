/**
 * Intelligence Quality Score (docs/task-27-success-metrics.md §1).
 *
 * A single 0-100 score, computed per athlete, from 7 weighted components.
 * This is not a new invention disconnected from the roadmap — it is the
 * formula Milestone 7 (`qualityScore.ts`) will expose live via
 * `GET /admin/data-health`. This module let the baseline audit script
 * (artifacts/api-server/scripts/audit-iqs.ts) compute it for real in
 * Milestone 0, ahead of that dashboard, and is now also the engine behind
 * the live Intelligence Audit admin feature (pipeline/auditReport.ts) — the
 * same formula, computed identically from either entry point.
 */

import { isSeasonBestBetterThanPersonalBest, sanitizeSourceDomain, sanitizeSourceUrl, isValidHandle } from "./validation.js";
import type { AthleteRawData } from "./collectAthleteData.js";

export interface IQSEvidenceRecord {
  sourceDomain: string;
  sourceUrl: string | null;
  confidence: number;
}

export interface IQSInput {
  athleteId: number;
  name: string;
  /** Every intelligence item, timeline event, and contact row for this
   * athlete, flattened to just the fields IQS needs. */
  evidenceRecords: IQSEvidenceRecord[];
  personalBest: string | null;
  seasonBest: string | null;
  /** Distinct `contacts.category` values on file for this athlete. */
  contactCategories: string[];
  intelItemCount: number;
  timelineEventCount: number;
  pastCompetitionsTotal: number;
  pastCompetitionsWithResult: number;
  hasPhoto: boolean;
  hasValidSocialHandle: boolean;
}

export interface IQSSubScores {
  evidenceValidity: number; // /25
  confidence: number; // /20
  pbSbConsistency: number; // /10
  contactCoverage: number; // /15
  contentDensity: number; // /15
  competitionCompleteness: number; // /10
  presence: number; // /5
}

export interface IQSResult {
  athleteId: number;
  name: string;
  total: number; // 0-100
  subScores: IQSSubScores;
  detail: {
    totalEvidenceRecords: number;
    validEvidenceRecords: number;
    averageConfidence: number | null;
    pbSbInverted: boolean | null;
  };
}

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
const round1 = (v: number): number => Math.round(v * 10) / 10;

function isValidEvidenceRecord(record: IQSEvidenceRecord): boolean {
  if (sanitizeSourceDomain(record.sourceDomain) === null) return false;
  if (record.sourceUrl !== null && sanitizeSourceUrl(record.sourceUrl) === null) return false;
  return true;
}

/**
 * Computes the Intelligence Quality Score for one athlete. Every sub-score
 * is independently capped, so `total` is always in [0, 100].
 */
export function computeIQS(input: IQSInput): IQSResult {
  const totalEvidence = input.evidenceRecords.length;
  const validEvidence = input.evidenceRecords.filter(isValidEvidenceRecord).length;

  // With zero evidence records there is nothing invalid to find — treat
  // validity as vacuously full marks. Sparsity itself is already penalised
  // by the Content Density component; double-counting it here would be
  // redundant, not more accurate.
  const evidenceValidity = totalEvidence > 0 ? 25 * (validEvidence / totalEvidence) : 25;

  const averageConfidence =
    totalEvidence > 0
      ? input.evidenceRecords.reduce((sum, r) => sum + r.confidence, 0) / totalEvidence
      : null;
  // Unlike validity, an undefined average confidence is scored as 0, not
  // full marks — there is no evidence to be confident about, which is a
  // materially different (weaker) state than "everything we have checks out".
  const confidenceScore = averageConfidence !== null ? 20 * clamp01((averageConfidence - 40) / (97 - 40)) : 0;

  let pbSbInverted: boolean | null = null;
  let pbSbConsistency = 10;
  if (input.personalBest && input.seasonBest) {
    pbSbInverted = isSeasonBestBetterThanPersonalBest(input.personalBest, input.seasonBest);
    if (pbSbInverted === true) pbSbConsistency = 0;
  }

  const baselineCategories = new Set(
    input.contactCategories.filter((c) => c === "coaching" || c === "management"),
  );
  const contactCoverage = 15 * Math.min(1, baselineCategories.size / 2);

  const contentDensity =
    7.5 * Math.min(1, input.intelItemCount / 8) + 7.5 * Math.min(1, input.timelineEventCount / 20);

  const competitionCompleteness =
    input.pastCompetitionsTotal > 0
      ? 10 * (input.pastCompetitionsWithResult / input.pastCompetitionsTotal)
      : 0;

  const presence = 5 * (((input.hasPhoto ? 1 : 0) + (input.hasValidSocialHandle ? 1 : 0)) / 2);

  const subScores: IQSSubScores = {
    evidenceValidity: round1(evidenceValidity),
    confidence: round1(confidenceScore),
    pbSbConsistency: round1(pbSbConsistency),
    contactCoverage: round1(contactCoverage),
    contentDensity: round1(contentDensity),
    competitionCompleteness: round1(competitionCompleteness),
    presence: round1(presence),
  };

  const total = Math.round(
    subScores.evidenceValidity +
      subScores.confidence +
      subScores.pbSbConsistency +
      subScores.contactCoverage +
      subScores.contentDensity +
      subScores.competitionCompleteness +
      subScores.presence,
  );

  return {
    athleteId: input.athleteId,
    name: input.name,
    total,
    subScores,
    detail: {
      totalEvidenceRecords: totalEvidence,
      validEvidenceRecords: validEvidence,
      averageConfidence: averageConfidence !== null ? round1(averageConfidence) : null,
      pbSbInverted,
    },
  };
}

/**
 * Shapes one athlete's raw pipeline rows (collectAthleteData.ts) into the
 * IQSInput this module expects. Shared by scripts/audit-iqs.ts and
 * pipeline/auditReport.ts so both ever compute IQS the exact same way —
 * previously this shaping logic was duplicated inline in audit-iqs.ts only.
 */
export function buildIQSInputFromRawData(raw: AthleteRawData, today: string): IQSInput {
  const { athlete, intelItems, timelineEvents, contacts, competitions } = raw;
  const pastCompetitions = competitions.filter((c) => c.date <= today);

  const evidenceRecords: IQSEvidenceRecord[] = [
    ...intelItems.map((i) => ({ sourceDomain: i.sourceDomain, sourceUrl: i.sourceUrl, confidence: i.confidence })),
    ...timelineEvents.map((t) => ({ sourceDomain: t.sourceDomain, sourceUrl: t.sourceUrl, confidence: t.confidence })),
    ...contacts.map((c) => ({ sourceDomain: c.sourceDomain, sourceUrl: null, confidence: c.confidence })),
  ];

  const hasValidSocialHandle =
    (!!athlete.instagramHandle && isValidHandle(athlete.instagramHandle, "instagram")) ||
    (!!athlete.twitterHandle && isValidHandle(athlete.twitterHandle, "twitter")) ||
    (!!athlete.tiktokHandle && isValidHandle(athlete.tiktokHandle, "tiktok"));

  return {
    athleteId: athlete.id,
    name: athlete.name,
    evidenceRecords,
    personalBest: athlete.personalBest,
    seasonBest: athlete.seasonBest,
    contactCategories: [...new Set(contacts.map((c) => c.category))],
    intelItemCount: intelItems.length,
    timelineEventCount: timelineEvents.length,
    pastCompetitionsTotal: pastCompetitions.length,
    pastCompetitionsWithResult: pastCompetitions.filter((c) => c.result !== null).length,
    hasPhoto: !!athlete.avatarUrl,
    hasValidSocialHandle,
  };
}
