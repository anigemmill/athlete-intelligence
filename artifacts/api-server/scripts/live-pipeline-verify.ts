/**
 * One-off live verification of the intelligence pipeline:
 * inserts a test athlete row, runs the real auto-populate pipeline
 * (live Perplexity Sonar research -> live GPT-4o extraction -> DB writes),
 * then reports the resulting data for manual inspection.
 */
import { db, pool, athletesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { autoPopulateAthlete } from "../src/lib/auto-populate.js";
import {
  intelligenceItemsTable,
  timelineEventsTable,
  contactsTable,
  competitionsTable,
} from "@workspace/db";

async function main() {
  const name = process.argv[2] ?? "Mondo Duplantis";
  const sport = process.argv[3] ?? "Athletics";
  const event = process.argv[4] ?? "Pole Vault";
  const nationality = process.argv[5] ?? "Sweden";

  console.log(`[verify] inserting stub athlete: ${name}`);
  const [inserted] = await db
    .insert(athletesTable)
    // Not a real authenticated request -- this is a CLI diagnostic tool, so
    // it gets a recognizable fixed owner id rather than a real Clerk user
    // id. See M7 (docs/mvp-hardening-plan-m7-m12.md): owner_id is NOT NULL.
    .values({ ownerId: "live-pipeline-verify-script", name, sport, event, nationality })
    .returning();

  console.log(`[verify] athlete id=${inserted.id} — running live pipeline...`);
  const start = Date.now();
  await autoPopulateAthlete({
    id: inserted.id,
    name: inserted.name,
    sport: inserted.sport,
    event: inserted.event,
    nationality: inserted.nationality,
    age: inserted.age,
  });
  const elapsedMs = Date.now() - start;

  const [athlete] = await db.select().from(athletesTable).where(eq(athletesTable.id, inserted.id));
  const intel = await db.select().from(intelligenceItemsTable).where(eq(intelligenceItemsTable.athleteId, inserted.id));
  const timeline = await db.select().from(timelineEventsTable).where(eq(timelineEventsTable.athleteId, inserted.id));
  const contacts = await db.select().from(contactsTable).where(eq(contactsTable.athleteId, inserted.id));
  const competitions = await db.select().from(competitionsTable).where(eq(competitionsTable.athleteId, inserted.id));

  console.log(`\n[verify] pipeline finished in ${elapsedMs}ms`);
  console.log(JSON.stringify({ athlete, counts: {
    intel: intel.length, timeline: timeline.length, contacts: contacts.length, competitions: competitions.length,
  }}, null, 2));

  console.log("\n[verify] intelligence_items:");
  console.log(JSON.stringify(intel, null, 2));
  console.log("\n[verify] timeline_events:");
  console.log(JSON.stringify(timeline, null, 2));
  console.log("\n[verify] contacts:");
  console.log(JSON.stringify(contacts, null, 2));
  console.log("\n[verify] competitions (first 10):");
  console.log(JSON.stringify(competitions.slice(0, 10), null, 2));

  await pool.end();
}

main().catch((err) => {
  console.error("[verify] FATAL", err);
  process.exit(1);
});
