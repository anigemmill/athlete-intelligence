# Athlete Intelligence — API Documentation

## Base URL

Development: `https://{REPLIT_DEV_DOMAIN}/api`  
Production: `https://{DEPLOYED_DOMAIN}/api`

All routes except those marked **Public** require a valid Clerk session token in the `Authorization: Bearer {token}` header.

Routes marked **Admin** additionally require the authenticated user's email to be `FOUNDER_EMAIL` (set via environment variable).

---

## Authentication

The API uses **Clerk** for authentication. To authenticate:

1. Obtain a session token from Clerk: `const token = await clerk.session.getToken()`
2. Include it as: `Authorization: Bearer {token}`

All protected routes return `401 Unauthorized` if the token is missing or invalid.

---

## Public Endpoints

### `GET /health`
Server health check.

**Response:** `200 { status: "ok", timestamp: ISO-8601 }`

---

### `POST /contact`
Submit a contact/demo enquiry. Rate limited to 10 requests/hour per IP.

**Request body:**
```json
{
  "type": "demo | sales | general",
  "name": "string (required)",
  "org": "string (required)",
  "email": "string (required)",
  "role": "string (optional)",
  "athletes": "string (optional — roster size estimate)",
  "message": "string (optional)"
}
```
**Response:** `201 { success: true }`

---

### `GET /stripe/prices`
List active Stripe prices/products.

**Response:** `200 { prices: [...] }`

---

### `GET /stripe/products-with-prices`
List products with their associated prices.

**Response:** `200 { products: [...] }`

---

### `POST /stripe/checkout`
Create a Stripe checkout session. **No auth required** (user may not have an account yet).

**Request body:** `{ priceId: string }`  
**Response:** `200 { url: string }` — Stripe hosted checkout URL

---

## Dashboard

### `GET /dashboard`
Aggregated dashboard metrics.

**Response:**
```json
{
  "athleteCount": 5,
  "totalIntelligenceItems": 30,
  "freshAthletes": 4,
  "staleAthletes": 1,
  "averageConfidence": 82.3,
  "recentIntelligence": [{ ...intelligenceItem }]
}
```

---

## Athletes

### `POST /athletes/discover`
Identify an athlete by name and begin intelligence population.

**Request body:** `{ name: string }`

**Response on success:** `201 { id: number, name, sport, event, nationality, ... }`  
**Response on rejection:** `422 { error: "...", confidence: number, reason: string }`

The AI pipeline (`autoPopulateAthlete`) runs in the background after this returns. The dossier will populate over the next 30–60 seconds.

---

### `GET /athletes`
List all tracked athletes.

**Query params:**
- `squad` — filter by squad name
- `sport` — filter by sport
- `status` — filter by `agent_status`

**Response:** `200 { athletes: [Athlete] }`

---

### `GET /athletes/compare`
Compare multiple athletes side by side.

**Query params:** `ids=1,2,3` (comma-separated)

**Response:** `200 { athletes: [AthleteWithIntelligence] }`

---

### `GET /athletes/:id`
Full athlete profile.

**Response:** `200 { athlete: Athlete }` or `404`

---

### `PATCH /athletes/:id`
Update athlete metadata.

**Request body (partial):**
```json
{
  "squad": "string",
  "agentStatus": "active | paused | archived",
  "instagramHandle": "string",
  "twitterHandle": "string"
}
```
**Response:** `200 { athlete: Athlete }`

---

### `DELETE /athletes/:id`
Remove athlete and all associated data (cascade delete).

**Response:** `204 No Content`

---

### `POST /athletes/:id/repopulate`
Wipe all intelligence data and re-run the full AI pipeline.

**Response:** `202 { message: "Repopulation started" }`

The pipeline runs in the background. Poll `GET /athletes/:id` or the health endpoint to track progress.

---

### `POST /athletes/:id/refresh-social`
Live Perplexity lookup for social handles and follower counts.

**Response:** `200 { updated: true, data: SocialData }` or `200 { updated: false, reason: string }`

---

### `GET /athletes/:id/health`
Intelligence health metrics for the IntelligenceHealthPanel.

**Response:**
```json
{
  "confidence": { "score": 82.3, "level": "good" },
  "freshness": { "daysSinceCrawl": 2, "level": "excellent" },
  "sourceDiversity": { "uniqueDomains": 4, "level": "moderate" },
  "resultCompleteness": { "filled": 3, "total": 4, "pct": 75 },
  "gaps": [
    "No manager/agent on file",
    "Sparse timeline (6 events)"
  ]
}
```

---

### `GET /athletes/:id/intelligence`
All intelligence items for an athlete.

**Query params:** `category` — filter to one category

**Response:** `200 { items: [IntelligenceItem] }`

---

### `GET /athletes/:id/alerts`
Alert configuration for an athlete.

**Response:** `200 { config: AlertConfig }`

---

### `PUT /athletes/:id/alerts`
Update alert settings.

**Request body:** `Partial<AlertConfig>`  
**Response:** `200 { config: AlertConfig }`

---

## Competitions

### `GET /athletes/:id/competitions`
All competitions for an athlete.

**Query params:** `status` — `upcoming` | `completed`

**Response:** `200 { competitions: [Competition] }`

---

## Contacts

### `GET /athletes/:id/contacts`
Relationship network for an athlete.

**Response:** `200 { contacts: [Contact] }`

---

## Timeline

### `GET /athletes/:id/timeline`
Career timeline events.

**Query params:** `significant=true` — only pivotal events

**Response:** `200 { events: [TimelineEvent] }`

---

## Intelligence (Global Feed)

### `GET /intelligence`
Unified feed across all athletes.

**Query params:**
- `category` — filter by category
- `limit` — number of items (default 50)
- `offset` — pagination offset

**Response:** `200 { items: [IntelligenceItemWithAthlete] }`

---

## Chat

### `POST /chat`
AI analyst query. Streams SSE response.

**Request body:**
```json
{
  "message": "What are Peter Bol's recent results?",
  "conversationId": "optional — for future persistence"
}
```

**Response:** SSE stream of text tokens. Each event is `data: {token}`. Stream ends with `data: [DONE]`.

The analyst uses a database-first agentic loop — it calls internal tools to retrieve structured data before generating a response. It will never answer from LLM training knowledge alone.

**Rate limit:** Applied per authenticated user.

---

## Summary

### `POST /athletes/:id/summary`
Generate an AI narrative briefing for an athlete. Streams SSE.

**Response:** SSE stream of the narrative text.

The briefing covers current form, recent results, key relationships, and any notable intelligence items. Cached in `athletes.ai_summary` with a timestamp.

---

## Stripe (Protected)

### `GET /stripe/subscription`
Current authenticated user's subscription status.

**Response:**
```json
{
  "status": "active | trialing | canceled | none",
  "planName": "Pro",
  "currentPeriodEnd": "2026-09-01T00:00:00Z"
}
```

---

### `POST /stripe/portal`
Create a Stripe Customer Portal session for billing management.

**Response:** `200 { url: string }` — redirect user to this URL

---

### `POST /stripe/webhook`
**Public** (verified via Stripe signature). Handles subscription lifecycle events.

---

## User

### `GET /user/me`
Current authenticated user's profile from Clerk.

**Response:** `200 { id, email, name, imageUrl, createdAt }`

---

## Admin (Founder only)

All admin routes return `403` if the authenticated user is not the founder email.

### `GET /admin/customers`
All Clerk users joined with Stripe subscription data and MRR.

**Response:** `200 { customers: [Customer] }`

---

### `GET /admin/enquiries`
All contact form submissions.

**Response:** `200 { enquiries: [ContactEnquiry] }`

---

### `PUT /admin/enquiries/:id`
Update enquiry status.

**Request body:** `{ status: "new | read | replied" }`  
**Response:** `200 { enquiry: ContactEnquiry }`

---

### `POST /admin/backfill-photos`
Run Wikipedia/Perplexity photo lookup for all athletes without a photo.

**Response:** `200 { updated: number }`

---

### `POST /admin/backfill-social`
Run live social media lookup for all athletes.

**Response:** `200 { updated: number }`

---

### `GET /admin/data-health`
Roster-wide data quality dashboard — freshness, count metrics, confidence averages.

**Response:** `200 { athletes: [AthleteHealthSummary], overall: OverallHealth }`

---

### `POST /admin/backfill-results`
Trigger competition result backfill for all athletes with missing results.

**Response:** `200 { filled: number }`

---

### `GET /admin/health`
Detailed system environment, DB connection, and API key status.

**Response:** `200 { db: "connected", env: { ... } }`

---

### Intelligence Audit

The permanent QA tool. Runs the real production pipeline against selected athletes (never mocked, never hand-edited) and reports on the resulting data. See `artifacts/api-server/src/lib/pipeline/auditReport.ts` for exactly what it can and cannot verify.

### `POST /admin/intelligence-audit`
Starts a new audit run in the background.

**Request body:** `{ athleteIds?: number[], useGoldenSet?: boolean }` — omitting `athleteIds` (or setting `useGoldenSet: true`) audits the Golden Athlete Set.

**Response:** `202 { auditRunId: number, athleteIds: number[] }`

---

### `GET /admin/intelligence-audit`
Lists recent audit runs (no report payload — for the history list and IQS trend).

**Response:** `200 { runs: [{ id, status, athleteIds, triggeredAt, completedAt, progressCompleted, progressTotal, overallIqs, errorMessage }] }`

---

### `GET /admin/intelligence-audit/:id`
Full detail for one run, including the report once `status` is `"completed"`.

**Response:** `200 { run: {...} }` or `404`

---

### `GET /admin/intelligence-audit/:id/report.json`
Downloadable JSON report. `409` if the run hasn't completed yet.

### `GET /admin/intelligence-audit/:id/report.md`
Downloadable Markdown report. `409` if the run hasn't completed yet.

---

## Error Responses

All errors follow this shape:

```json
{ "error": "Human-readable message" }
```

| Status | Meaning |
|---|---|
| 400 | Bad request — invalid input |
| 401 | Unauthorised — missing or invalid Clerk session |
| 403 | Forbidden — admin route, insufficient permissions |
| 404 | Not found |
| 408 | Request timeout (30s server limit) |
| 422 | Unprocessable — athlete discovery rejected (confidence too low) |
| 429 | Rate limit exceeded |
| 500 | Internal server error |
