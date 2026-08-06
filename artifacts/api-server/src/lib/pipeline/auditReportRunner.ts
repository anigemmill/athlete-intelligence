/**
 * The one function in the Intelligence Audit feature that actually touches
 * the database. Split out from auditReport.ts specifically so that file's
 * pure section builders can be unit tested without DATABASE_URL being set
 * at all — importing this file's collectAthleteRawData dependency at the
 * top of auditReport.ts would defeat that, since @workspace/db throws at
 * import time (not just at query time) when DATABASE_URL is missing.
 */

import { collectAthleteRawData } from "./collectAthleteData.js";
import { computeIQS, buildIQSInputFromRawData } from "./iqs.js";
import {
  buildIdentitySection,
  buildResultsSection,
  buildCompetitionsSection,
  buildTimelineSection,
  buildIntelligenceSection,
  buildContactsSection,
  buildSocialSection,
  buildImagesSection,
  buildSourcesSection,
  buildConfidenceSection,
  deriveAthleteAssessment,
  type AthleteAuditReport,
} from "./auditReport.js";

export async function buildAthleteAuditReport(athleteId: number): Promise<AthleteAuditReport | null> {
  const raw = await collectAthleteRawData(athleteId);
  if (!raw) return null;

  const today = new Date().toISOString().split("T")[0];

  const identity = buildIdentitySection(raw.athlete);
  const results = buildResultsSection(raw.athlete);
  const competitions = buildCompetitionsSection(raw.competitions, today);
  const timeline = buildTimelineSection(raw.timelineEvents);
  const intelligence = buildIntelligenceSection(raw.intelItems);
  const contacts = buildContactsSection(raw.contacts, raw.intelItems);
  const social = buildSocialSection(raw.athlete);
  const [images, sources] = await Promise.all([buildImagesSection(raw.athlete), buildSourcesSection(raw)]);
  const confidence = buildConfidenceSection(raw);
  const iqs = computeIQS(buildIQSInputFromRawData(raw, today));

  const { strengths, weaknesses, improvementNotes } = deriveAthleteAssessment(
    identity, results, competitions, timeline, intelligence, contacts, images, sources, iqs,
  );

  return {
    athleteId,
    name: raw.athlete.name,
    identity, results, competitions, timeline, intelligence, contacts, social, images, sources, confidence, iqs,
    strengths, weaknesses, improvementNotes,
  };
}
