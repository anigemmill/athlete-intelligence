/**
 * One-off script: re-populate specific athletes.
 * Run from artifacts/api-server: node scripts/repopulate-athletes.mjs
 */
import { autoPopulateAthlete } from "../dist/lib/auto-populate.mjs";

const athletes = [
  { id: 9, name: "Brook Macdonald", sport: "Mountain Bike", event: "Downhill", nationality: "New Zealand", age: 32 },
  { id: 2, name: "Hamish Kerr", sport: "Athletics", event: "High Jump", nationality: "New Zealand", age: 26 },
];

for (const athlete of athletes) {
  console.log(`Populating ${athlete.name}…`);
  try {
    await autoPopulateAthlete(athlete);
    console.log(`✓ ${athlete.name} done`);
  } catch (err) {
    console.error(`✗ ${athlete.name} failed:`, err.message);
  }
}
process.exit(0);
