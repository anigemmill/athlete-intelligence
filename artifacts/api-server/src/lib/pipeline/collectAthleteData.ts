/**
 * Single shared "gather everything stored about one athlete" query, used by
 * both scripts/audit-iqs.ts and pipeline/auditReport.ts so there is exactly
 * one place that knows how to assemble an athlete's raw pipeline data —
 * previously duplicated inline in audit-iqs.ts.
 */

import { db } from "@workspace/db";
import {
  athletesTable,
  intelligenceItemsTable,
  timelineEventsTable,
  contactsTable,
  competitionsTable,
  type Athlete,
  type IntelligenceItem,
  type TimelineEvent,
  type Contact,
  type Competition,
} from "@workspace/db";
import { eq } from "drizzle-orm";

export interface AthleteRawData {
  athlete: Athlete;
  intelItems: IntelligenceItem[];
  timelineEvents: TimelineEvent[];
  contacts: Contact[];
  competitions: Competition[];
}

export async function collectAthleteRawData(athleteId: number): Promise<AthleteRawData | null> {
  const [athleteRows, intelItems, timelineEvents, contacts, competitions] = await Promise.all([
    db.select().from(athletesTable).where(eq(athletesTable.id, athleteId)),
    db.select().from(intelligenceItemsTable).where(eq(intelligenceItemsTable.athleteId, athleteId)),
    db.select().from(timelineEventsTable).where(eq(timelineEventsTable.athleteId, athleteId)),
    db.select().from(contactsTable).where(eq(contactsTable.athleteId, athleteId)),
    db.select().from(competitionsTable).where(eq(competitionsTable.athleteId, athleteId)),
  ]);

  const athlete = athleteRows[0];
  if (!athlete) return null;

  return { athlete, intelItems, timelineEvents, contacts, competitions };
}
