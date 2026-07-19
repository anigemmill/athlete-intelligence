# Athlete Intelligence — Founder Process Guide

**Platform:** Athlete Intelligence  
**Founder:** Aniruddha Gemmill  
**Last updated:** July 2026

---

## Table of Contents

1. [What the platform does](#1-what-the-platform-does)
2. [How a customer signs up and pays](#2-how-a-customer-signs-up-and-pays)
3. [How the AI agent works](#3-how-the-ai-agent-works)
4. [Database — what gets stored](#4-database--what-gets-stored)
5. [Your admin area](#5-your-admin-area)
6. [Enquiries from the contact form](#6-enquiries-from-the-contact-form)
7. [Stripe and billing](#7-stripe-and-billing)
8. [Security and auth](#8-security-and-auth)
9. [Infrastructure and uptime](#9-infrastructure-and-uptime)
10. [Things that are mocked or not yet live](#10-things-that-are-mocked-or-not-yet-live)
11. [Your day-to-day as founder](#11-your-day-to-day-as-founder)
12. [Key credentials and where to find them](#12-key-credentials-and-where-to-find-them)

---

## 1. What the platform does

Athlete Intelligence is a B2B SaaS platform that delivers AI-sourced intelligence on athletes to professional sports organisations — NSOs, clubs, academies, and agencies. Customers add athletes to a roster, and the platform automatically generates a structured intelligence dossier for each one: performance data, timeline events, key contacts, upcoming competitions, and an ongoing intelligence feed — all sourced from public data and confidence-scored by AI.

The platform is global in scope, all sports, and self-serve: customers sign up, subscribe, and are operational without any manual onboarding from you.

---

## 2. How a customer signs up and pays

### Step-by-step flow

1. **Visitor lands on the marketing site** — they read about the product on the landing page, pricing page, and security page.

2. **They click "Start free trial"** — this takes them to the pricing page where they choose a plan (Starter / Pro / Enterprise).

3. **Stripe Checkout opens** — the customer enters their card details. A **3-day free trial** is applied automatically. They are not charged until the trial ends. Promotion codes are supported.

4. **Stripe confirms payment setup** — the customer is redirected to `/billing/success`.

5. **They sign in or create a Clerk account** — using either Google (instant, no verification) or email + password (Clerk sends a 6-digit code to verify the email address automatically).

6. **They land on the dashboard** — full access begins immediately. They add their first athletes and the AI agent runs.

7. **After 3 days** — Stripe charges the card automatically and the subscription goes live. If they cancel before day 3, no charge is made.

### What triggers after payment
When Stripe confirms a subscription event, a webhook fires to your server. This updates the customer's subscription record in the database. No manual action is needed from you.

---

## 3. How the AI agent works

This is the core of the product. Understanding it fully is important.

### When does the agent run?
The agent runs automatically every time a customer adds a new athlete to their roster via `POST /api/athletes`. It runs in the **background** — the API responds immediately so the UI is fast, and the agent does its work asynchronously.

### What model is used?
`gpt-5.6-luna` via the OpenAI API (proxied through Replit AI Integrations — no direct OpenAI account needed).

### What does the agent generate?
When given an athlete's name and sport, the agent produces a structured JSON payload containing:

| Output | Description |
|---|---|
| **Intelligence items** | Individual insight cards — injury updates, form notes, media mentions, commercial activity, federation news |
| **Confidence score** | Each item is scored 65–97%. Lower scores are visually flagged |
| **Timeline events** | Key career milestones in chronological order |
| **Key contacts** | Management, coaching, and federation contacts with verification status |
| **Competitions** | Upcoming and recent meets with tier (A/B/C) and result data |
| **Stats** | Sport-specific performance statistics |

### How is confidence scoring determined?
The system prompt instructs the model to assess how reliable each piece of information is and return a score between 65 and 97. Items below ~75 are displayed with a visual warning in the UI. This is honest uncertainty communication — a deliberate product feature, not a limitation.

### What sources does the agent use?
The agent is instructed to use only **publicly available information**: competition results, federation announcements, accredited sports media, and official social accounts. It does not access private communications, purchase data broker lists, or ingest leaked data. Every intelligence item is intended to carry a traceable source domain, URL, and publication date.

### What the agent does NOT do
- Build psychological or health profiles
- Make inferences about personal or private life
- Surface items it cannot attribute to a public source

### Chat feature
Customers can also ask free-form questions about an athlete via the chat interface. This also uses `gpt-5.6-luna` and has access to the athlete's stored intelligence data as context. Chat history is persisted per conversation.

---

## 4. Database — what gets stored

The database is PostgreSQL, managed by Drizzle ORM. All tables are in `lib/db/src/schema/`.

| Table | What it holds |
|---|---|
| `athletes` | Core athlete profiles — name, sport, stats |
| `intelligence_items` | All AI-generated intelligence cards, including source, confidence score, category |
| `timeline_events` | Chronological career milestones per athlete |
| `contacts` | Management and coaching contacts linked to athletes |
| `competitions` | Meet history and upcoming events per athlete |
| `alert_configs` | Each user's notification preferences |
| `conversations` | Chat sessions per user |
| `messages` | Individual messages within each chat conversation |
| `contact_enquiries` | Leads submitted via the public contact form |
| *(Stripe sync tables)* | Stripe customer, subscription, price, and product records synced via webhook |

No athlete PII is stored beyond what is needed to generate and display intelligence. The platform does not store health data, private communications, or inferred personal profiles.

---

## 5. Your admin area

### How to access it
Go to `/admin` after signing in with `anigemmill@theoutsidein.nz`. Anyone else who tries to visit `/admin` is silently redirected to the regular dashboard.

The backend also enforces this — every admin API route checks your Clerk email server-side, so it cannot be bypassed by someone manipulating the frontend.

### What you can see

**Customers tab**
- Full list of all signed-up users
- Their plan (Starter / Pro / Enterprise / None)
- Subscription status (active / trialling / cancelled / past due)
- Monthly recurring revenue (MRR) per customer
- Trial end date
- Join date

This data is pulled live from Clerk (user records) and Stripe (subscription data), merged by email address.

**Enquiries tab**
- Every submission from the public contact form
- Expandable rows showing the full message
- Inline status dropdown: `new → reviewed → replied → archived`
- "Reply by email" link opens your email client pre-addressed to the enquirer

**Other tabs** (Licences, AI Usage, Crawl Monitor, Feature Flags) — these exist as navigation items but are currently placeholder screens. They are not wired to real data yet.

---

## 6. Enquiries from the contact form

When someone submits the contact form on `/contact`:

1. Their name, email, organisation, and message are saved to the `contact_enquiries` table in the database
2. It appears immediately in your Enquiries tab in the admin panel
3. You update the status as you handle it
4. There is no automatic email notification to you — you need to check the admin panel, or this can be added later (e.g. via Resend)

---

## 7. Stripe and billing

### Live mode
The platform is running in **live Stripe mode** using a restricted API key. Real cards will be charged.

### Plans
Plans and prices are defined in your Stripe dashboard (not in code). The platform fetches them dynamically, so you can change pricing in Stripe and the pricing page updates automatically — no code change needed.

### How the webhook works
Stripe sends events to your server at a URL like `https://your-domain.replit.app/api/stripe/webhook`. Your server verifies the event signature (to prevent spoofing) and then updates the local subscription record accordingly.

**After publishing, you should verify** in [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks) that:
- The webhook endpoint shows your production `.replit.app` URL
- Status is "Enabled"
- Recent deliveries are succeeding (200 responses)

### Customer self-service
Customers can manage their own subscription (upgrade, downgrade, cancel, update card) via the Stripe Customer Portal. They access it from Settings in the app — no involvement from you required.

### Trial
3-day free trial. Applied automatically at checkout. No credit card charge until day 4.

### Promotion codes
Supported at checkout — customers can enter a code on the Stripe Checkout page. Create codes in your Stripe dashboard.

---

## 8. Security and auth

### Authentication (Clerk)
All user authentication is handled by Clerk. You do not manage passwords or sessions yourself.

- **Google sign-in** — one click, no verification step
- **Email sign-up** — Clerk automatically sends a 6-digit code; user verifies, account is active
- **Session management** — Clerk issues and validates JWTs; your API verifies them on every protected request
- **No manual activation** — you never need to approve or activate a new account

### What's protected
All routes that involve actual data (athletes, intelligence, chat, billing, admin) require a valid Clerk session. The following are intentionally public (no login required):
- Health check
- Contact form submission
- Stripe prices and products
- Stripe checkout initiation

### Compliance posture
- **GDPR / UK GDPR** — data processing agreements available; right to erasure honoured
- **NZ Privacy Act 2020 / CCPA** — privacy principles followed; California opt-out rights respected
- **SOC 2 Type II** — audit in progress, expected Q4 2026

---

## 9. Infrastructure and uptime

The platform runs on Replit's infrastructure. Two services:

| Service | What it does |
|---|---|
| **Web** (`artifacts/web`) | React + Vite frontend — the UI customers see |
| **API Server** (`artifacts/api-server`) | Express 5 backend — all data, AI calls, Stripe, auth |

**Database** — PostgreSQL managed by Replit. Automatic encrypted backups. No manual database administration needed.

**AI** — OpenAI API via Replit AI Integrations proxy. No direct OpenAI account or API key management needed.

**Stripe** — Live mode. Webhooks auto-register against your current domain on every server start.

There are no cron jobs or scheduled background tasks currently running. Intelligence is generated on-demand when an athlete is added, not on a schedule.

---

## 10. Things that are mocked or not yet live

Be aware of the following when talking to customers or investors:

| Feature | Status |
|---|---|
| Sidebar alert badge | Hardcoded to "3" — does not reflect real unread count |
| Licences tab (admin) | Placeholder — no data |
| AI Usage tab (admin) | Placeholder — no data |
| Crawl Monitor tab (admin) | Placeholder — no data |
| Feature Flags tab (admin) | Client-side only — not persisted |
| Per-user data scoping | All signed-in users currently see the same data pool |
| Real web crawling | Intelligence is generated by the LLM from its training knowledge + public sources — not from live real-time crawls |
| Email notifications | No automated email to you when a new enquiry arrives |

---

## 11. Your day-to-day as founder

### Checking in on the business
- Visit `/admin` → **Customers tab** to see who has signed up, what plan they're on, and your MRR
- Visit `/admin` → **Enquiries tab** to see and respond to contact form submissions
- Check [Stripe Dashboard](https://dashboard.stripe.com) for payment events, failed charges, and refund requests

### When a customer has a problem
- Their subscription or billing issues → direct them to the Customer Portal in Settings (they can self-serve), or handle via the Stripe Dashboard
- Account access issues → manage via the [Clerk Dashboard](https://dashboard.clerk.com)
- Product feedback → captured via the contact form or direct email

### Changing pricing
- Update plans and prices directly in the Stripe Dashboard — no code changes needed
- The pricing page fetches live from Stripe

### Adding a new admin user
Currently the admin email (`anigemmill@theoutsidein.nz`) is hardcoded. To add another admin, a code change is required — update the `requireAdmin` check in `artifacts/api-server/src/routes/admin.ts`.

### If the site goes down
- Check the workflow logs in the Replit workspace
- Stripe webhooks will queue and retry automatically — no lost events during brief downtime
- Clerk auth is hosted externally — unaffected by your server being down

---

## 12. Key credentials and where to find them

All secrets are stored as Replit environment secrets — never in code.

| Secret | What it's for |
|---|---|
| `CLERK_SECRET_KEY` | Backend Clerk auth verification |
| `CLERK_PUBLISHABLE_KEY` / `VITE_CLERK_PUBLISHABLE_KEY` | Frontend Clerk initialisation |
| `STRIPE_SECRET_KEY` | All Stripe API calls (live restricted key) |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | OpenAI / AI Integrations access |
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Server session signing |

**You never need to touch these directly.** They are injected into the running environment automatically.

### External dashboards
| Service | URL |
|---|---|
| Stripe | https://dashboard.stripe.com |
| Clerk | https://dashboard.clerk.com |
| Replit (hosting + DB + secrets) | https://replit.com |

---

*This document reflects the state of the platform as of July 2026. Update it as features are built or policies change.*
