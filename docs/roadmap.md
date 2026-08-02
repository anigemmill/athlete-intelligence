# Athlete Intelligence — Roadmap

## Completed

### Foundation (Q1–Q2 2026)
- **Athlete roster management** — CRUD for tracked athletes, CSV/XLSX bulk import
- **AI intelligence pipeline** — Perplexity research + GPT-4o extraction + structured DB write
- **Dossier page** — full athlete profile with competition history, intelligence feed, contacts, timeline
- **Intelligence feed** — unified chronological feed across all athletes with category filtering
- **Competition calendar** — upcoming and past competitions with results
- **Alert system** — per-category notification preferences per athlete
- **AI analyst chat** — database-first agentic loop using GPT-4o with tool use (streams SSE)
- **Clerk authentication** — Replit-managed Clerk with Google/email sign-in
- **Stripe billing** — subscription plans with gated feature access and customer portal

### Design System Sprint (Q2 2026)
- Established design token system (`tokens.ts`) with text opacity scale, border floor rules
- Implemented DS components: `DsCard`, `DsBadge`, `DsEmptyState`, `DsMetric`
- Dashboard rewrite using the design system
- Contrast audit and remediation (T55 minimum for body text)

### Intelligence Quality Sprint (Q2–Q3 2026)
- Partial-failure recovery — pipeline stamps `lastCrawledAt` even on GPT extraction failure
- Domain-authority confidence scoring (`adjustConfidenceByDomain`)
- Competition result backfill module (`result-backfill.ts`)
- Scheduler upgraded from 1 → 3 athletes/cycle, staleness threshold 7d → 5d
- **Intelligence Health Panel** — per-dossier trust layer showing confidence, freshness, source diversity, gaps

### Visualisations (Q3 2026)
- **Global Intelligence Map** (Task #19) — WebGL globe with athlete location pins, live intelligence overlay
- **Relationship Graph** (Task #20) — 3D force-directed graph of athlete relationships (coach, sponsor, federation, teammates)

---

## Current Status (August 2026)

The platform has a working end-to-end pipeline and a polished UI. The core value proposition — AI-sourced, evidence-attributed athlete intelligence — is functional.

**Known quality issues (see `docs/technical-debt.md`):**
- Average intelligence quality score: 59/100
- Citation index leak affecting source attribution for 2/5 athletes
- Contact extraction failing for 4/5 athletes
- Timeline and intelligence counts below target for most athletes

**Active proposals (see task list):**
- Task #27 — Specialised retrieval agent pipeline redesign (the primary quality investment)
- Task #21 — Intelligence map filter by sport/region/freshness
- Task #22 — Accurate globe pin placement for co-located athletes
- Task #23 — Competition location parsing improvements
- Task #24 — Graph auto-refresh when new intelligence arrives
- Task #25 — Graph edge evidence links (show what data proves each relationship)
- Task #26 — Graph canvas blank-state fallback

---

## Next Milestones

### Milestone 1: Intelligence Accuracy (Immediate priority)

**Task #27 — Specialised Retrieval Agents**

Replace the monolithic pipeline with 11 domain-specific agents:

```
Orchestrator (Promise.allSettled)
├── ResultsAgent        — rank/PB/SB with sport-aware cross-validation
├── CompetitionsAgent   — career history, rejects generic meet names
├── ContactsAgent       — 2-query strategy (coaching + management separately)
├── SponsorsAgent       — brand deal confidence decay
├── SocialProfilesAgent — handle format validation
├── SocialMetricsAgent  — X API v2 + Perplexity fallback
├── BiographyAgent      — birth date, nationality
├── PhotoAgent          — WA → federation → Wikipedia hierarchy
├── TimelineAgent       — supplementary pass if count < 12
└── IntelligenceAgent   — 3 category queries, 8-item minimum
```

Expected outcome: platform quality score from 59/100 → 76–80/100.

**Plan file:** `.local/tasks/agentic-pipeline-redesign.md`

---

### Milestone 2: Visualisation Hardening

Fix the known issues with the globe and graph visualisations:
- Task #21: Globe filter controls (sport, region, freshness)
- Task #22: Pin clustering for co-located athletes  
- Task #23: Competition location geocoding improvements
- Task #26: Blank canvas fallback when 3D renderer fails

---

### Milestone 3: Real-time Intelligence

- Task #24: Graph auto-refresh via WebSocket or server-sent events when new intelligence is discovered
- Task #25: Edge evidence panel — click a relationship edge to see the intelligence items that prove it

---

## Future Vision

### Multi-sport Federation Dashboard
Scale the roster from 5 to 500+ athletes. Support federation-level views (all NZ athletics athletes, all UCI cyclists). Requires scheduler scaling (Bull/BullMQ), search indexing (pg full-text or Meilisearch), and pagination throughout.

### Event-driven Intelligence
Move from a polling scheduler to an event-driven model where new competition results trigger targeted intelligence updates rather than waiting for the next 6-hour cycle.

### Competitive Intelligence Layer
Extend the platform to cover athletes who are NOT on the roster — competitors of your tracked athletes. When preparing a dossier on Peter Bol, automatically surface his main rivals' recent results.

### Mobile Companion App
Task #9 — iOS/Android app for coaches to check athlete intel and receive alerts in the field.

### Model Upgrades
- Task #1: Upgrade extraction model from GPT-4o to GPT-5 when available
- Task #15: Upgrade to GPT-5 (higher capability tier)

### API Access for External Integrations
Expose a public API with OAuth so platforms like Hudl, Catapult, and national federation databases can query Athlete Intelligence programmatically.
