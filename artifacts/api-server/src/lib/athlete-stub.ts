/**
 * athlete-stub.ts
 *
 * Shared shape for the minimal athlete data every research/extraction
 * agent needs. Previously redeclared identically in auto-populate.ts,
 * competitions-agent.ts, contacts-agent.ts, and timeline-agent.ts.
 */
export interface AthleteStub {
  id: number;
  name: string;
  sport: string;
  event: string;
  nationality: string;
  age?: number | null;
}
