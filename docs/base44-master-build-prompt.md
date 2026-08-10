# Athlete Intelligence — Master Build Prompt for Base44

**Purpose of this document:** this is a complete, self-contained specification of an existing production SaaS product called Athlete Intelligence, written so that a no-code/AI-assisted builder (Base44) can recreate it without any other access to the original codebase. Paste this entire document into Base44 as your build brief.

**How to read the status tags used throughout:**
- **[CURRENTLY IMPLEMENTED]** — exists and works in the current system today, confirmed by direct source-code inspection.
- **[PARTIALLY IMPLEMENTED]** — exists in some form but is incomplete, inconsistent, or only partly wired up. Detail is given on exactly what's missing.
- **[PLANNED]** — referenced in the product's own roadmap documentation but not built.
- **[REQUIRED FOR TARGET MVP]** — not fully working today, but must be correct in the rebuild. Used for defects serious enough that reproducing them would be a mistake.
- **[KNOWN DEFECT]** — a specific, confirmed bug or gap in the current system. The rebuild should fix it, not reproduce it.

Where the product's own documentation and its actual implementation disagreed, this document trusts the implementation and says so explicitly.

---

## PART 1 — THE PRODUCT

### What it is

Athlete Intelligence is a B2B SaaS platform for national sports federations, professional sports clubs, and talent/athlete-management agencies. It continuously researches named elite athletes across the public web using AI, extracts what it finds into a structured, evidence-attributed database, and presents it through a dashboard with explicit confidence scoring and source citation on every fact.

The core promise, stated in the product's own internal documentation: **"trustworthy, evidence-attributed intelligence on any elite athlete — with a confidence score on every data point."**

### Who it's for

Primary user: a staff member at a sports federation, professional club, or talent agency who needs to track a roster of athletes — their performance results, career trajectory, media coverage, sponsorship deals, and professional contacts (coaches, agents, medical staff) — without manually monitoring dozens of scattered sources.

### The problem it solves

Sports organizations currently track athlete information through a patchwork of spreadsheets, manual web searches, and word-of-mouth. This is slow, inconsistent, and has no audit trail — nobody can say *where* a given fact came from or *how confident* they should be in it. Athlete Intelligence automates the research and, critically, keeps every fact attached to its source and a numeric confidence score, so users can trust — or explicitly distrust — what they're looking at.

### What makes it different from just asking ChatGPT

This is the product's central architectural differentiator and must be preserved exactly: a general-purpose LLM chat interface answers from its own training data with no way to verify a claim or know how current it is. Athlete Intelligence instead runs a **two-phase, code-enforced pipeline** for every fact: (1) a web-search-capable model (Perplexity Sonar) researches live sources and returns real citation URLs; (2) a second model (GPT-4o) extracts that research into strict structured JSON; then — this is the part a bare chatbot never does — **code, not the model, verifies that every claimed source URL actually appears in the real citation list Perplexity returned**, and discards any fact whose claimed source doesn't check out. A confidence score is computed and adjusted based on the authority of the actual source domain. The system is explicitly designed so that **an unknown value is always preferable to an invented one** — every extraction prompt instructs the model to return `null` rather than guess, and the verification code re-checks this regardless of what the model claims.

### Commercial model

Subscription SaaS, three tiers, sold and billed through Stripe:
- **Starter** — $299/month (or $249/month billed annually) — up to 50 athletes monitored, 5 team seats, intelligence feed & alerts, athlete dossiers, all sports & countries.
- **Pro** — $799/month (or $666/month billed annually), marked "Most popular" — up to 200 athletes monitored, 15 team seats, everything in Starter, AI chat & saved reports, PDF/CSV exports, comparison tool.
- **Enterprise** — custom pricing, sales-assisted — unlimited athletes, SSO, API access, dedicated customer success manager.

All plans include a 3-day free trial, no charge until it ends, cancellable any time before the trial ends.

### The intended workflow, signup to daily use

1. Visitor lands on the marketing site, requests a demo or signs up directly.
2. Signs up / signs in (email + password or OAuth via the auth provider).
3. On first login with no active subscription, hits a plan-selection paywall — must start a trial or contact sales to proceed (admins bypass this).
4. Adds their first athlete — either by typing a name and structured details, or by bulk-importing a spreadsheet of many athletes at once.
5. The system automatically researches the athlete in the background (roughly 20–45 seconds): results/rankings, competition history, contacts, career timeline, sponsorships, social media profiles and follower counts, biography, photo, and general intelligence — no user action required beyond adding the athlete.
6. User opens the athlete's dossier page and reviews the researched intelligence, each item showing a confidence score and a link back to its source.
7. Ongoing: the system automatically re-researches each athlete every few days in the background to keep data fresh; the user can also manually trigger a full re-population or a social-stats-only refresh at any time.
8. User monitors the roster via a dashboard (aggregate stats, a live intelligence feed, a world map of activity), receives alerts on new intelligence, and can ask a natural-language AI analyst questions that are answered strictly from the organization's own tracked-athlete database (never from the model's general knowledge).

---

## PART 2 — COMPLETE UI/UX RECONSTRUCTION

Base44 must recreate this exact visual identity and page structure. Do not substitute a generic AI-dashboard template.

### 2.1 Brand identity & design tokens **[CURRENTLY IMPLEMENTED]**

**Aesthetic:** a dark, "intelligence agency" look — deep forest green-black base, a single vivid lime-green accent, a soft lavender secondary accent. Always dark mode; there is no light mode toggle anywhere in the authenticated app (one page, the AI Chat page, inconsistently uses a light theme — flagged as a defect below, do not replicate it).

**Exact color values** (this is the literal token source of truth from the codebase):

Backgrounds:
- Page background: `#0D1C0B`
- Sidebar background: `#0B1809`
- Card background: `rgba(255,255,255,0.05)`
- Card hover background: `rgba(255,255,255,0.07)`
- Input background: `rgba(255,255,255,0.06)`
- Elevated surface: `rgba(255,255,255,0.08)`
- Highlighted/accented card background: `rgba(185,255,74,0.08)`
- Danger/error background: `rgba(248,113,113,0.08)`

Borders:
- Default border: `rgba(255,255,255,0.09)`
- Subtle border (internal dividers): `rgba(255,255,255,0.07)`
- Strong border (hover/focus): `rgba(255,255,255,0.15)`
- Section divider: `rgba(255,255,255,0.08)`
- Lime-tinted border: `rgba(185,255,74,0.30)`
- Lavender-tinted border: `rgba(200,189,255,0.30)`

Text opacity scale — use ONLY these five levels for all text, nothing in between:
- 92% white (`rgba(255,255,255,0.92)`) — headings, primary text
- 70% white (`rgba(255,255,255,0.70)`) — important body text, hero subtitles
- 55% white (`rgba(255,255,255,0.55)`) — body text, descriptions
- 40% white (`rgba(255,255,255,0.40)`) — muted/secondary text, labels
- 28% white (`rgba(255,255,255,0.28)`) — decorative/ghost text (background numerals etc.)

Brand colors:
- Primary accent (lime): `#B9FF4A`
- Foreground color to use ON lime backgrounds: `#0D1C0B`
- Secondary accent (lavender): `#C8BDFF`

Category colors (used consistently for the four intelligence categories everywhere in the app — badges, feed items, dashboard tiles):
| Category (internal key) | Display label | Background | Border | Text |
|---|---|---|---|---|
| `results_rankings` | Results | `rgba(107,143,224,0.15)` | `rgba(107,143,224,0.30)` | `#6B8FE0` (blue) |
| `media_interviews` | Media | `rgba(200,189,255,0.15)` | `rgba(200,189,255,0.30)` | `#C8BDFF` (lavender) |
| `sponsorships` | Sponsorships | `rgba(74,222,128,0.15)` | `rgba(74,222,128,0.30)` | `#4ade80` (green) |
| `career_changes` | Career | `rgba(251,191,36,0.15)` | `rgba(251,191,36,0.30)` | `#fbbf24` (amber) |

Status/semantic colors:
- Fresh data (updated < 7 days ago): `#4ade80` (green)
- Aging data (7–14 days): `#fbbf24` (amber)
- Stale data (> 14 days): `#f87171` (red)
- Active status: `#4ade80`; Paused status: `rgba(255,255,255,0.28)`; Alert: `#fbbf24`; Error: `#f87171`

Border radii: small `8px`, medium `12px`, large `16px`, extra-large `20px`, full/pill `9999px`.

Typography sizes: caption `11px`, label `12px`, body `13px`, body-large `14px`, subhead `15px`, title `18px`, H3 `20px`, H2 `24px`, H1 `32px`, display `48px`. Primary font family: Inter.

Shadows: card shadow `0 2px 12px rgba(0,0,0,0.35)`; modal shadow `0 24px 80px rgba(0,0,0,0.60)`; lime glow (used on primary CTAs) `0 4px 24px rgba(185,255,74,0.25)`.

**Brand mark:** a lime rounded-square containing a sparkle/asterisk icon (stroke color `#0D1C0B`), paired with the wordmark "Athlete Intelligence."

### 2.2 Core reusable components **[CURRENTLY IMPLEMENTED]**

A small design-system component set used across the authenticated app:
- **Card** — the standard content surface: rounded corners, `1px` default border, card background, optional "highlighted" variant (swaps to the lime-tinted background), optional "interactive" variant (border brightens on hover, cursor becomes a pointer).
- **Card Header** — a top row within a card: title left, an optional action/link right, separated from the card body by a subtle bottom border.
- **Badge** — a small pill for category/status labels: category variants (results/media/sponsorships/career, using the color table above), plus generic variants lime/lavender/muted/danger. Rendered as small (~11px), bold, rounded text with a colored background and matching border.
- **Status dot** — a small colored circle indicating freshness/active-status, optionally pulsing (animated) for "live" states.
- **Empty state** — a dashed-border block used whenever a list has zero items: centered icon in a circular badge, a title, a description, and an optional action button.
- **Loading skeleton** — animated pulsing placeholder rows (an avatar-shaped block plus two text-bar shapes of decreasing width), used while data is loading.
- **Metric/stat card** — a KPI tile: an optional thin colored gradient bar across the top (accent color), a small uppercase label, a large bold value, an optional smaller sub-label below, and an optional icon.

Beyond this small custom set, the app also has access to a full generic UI primitive library (accordion, alert, avatar, dialog/modal, dropdown menu, form inputs, popover, progress bar, select, sheet/drawer, skeleton, switch, table, tabs, toast, tooltip) in the standard shadcn/ui style — use these for anything not covered by the custom components above, styled to match the dark theme and token palette.

### 2.3 Complete sitemap

| # | Route | Page | Auth |
|---|---|---|---|
| 1 | `/` | Landing | Public |
| 2 | `/pricing` | Pricing | Public |
| 3 | `/about` | About | Public |
| 4 | `/contact` | Contact | Public |
| 5 | `/security` | Security & Trust | Public |
| 6 | `/terms` | Terms of Service | Public |
| 7 | `/sign-in` | Sign in | Public |
| 8 | `/sign-up` | Sign up | Public |
| 9 | `/dashboard` | Dashboard (Overview) | Authenticated (admins auto-redirect to Admin) |
| 10 | `/intelligence` | Intelligence Feed | Authenticated |
| 11 | `/schedule` | Competition Schedule | Authenticated |
| 12 | `/chat` | AI Analyst Chat | Authenticated |
| 13 | `/alerts` | Alerts / Notifications | Authenticated |
| 14 | `/settings` | Settings | Authenticated |
| 15 | `/admin` | Admin Console | Authenticated + admin |
| 16 | `/sources` | Source Explorer | Authenticated |
| 17 | `/athletes/new` | Add Athlete (wizard) | Authenticated |
| 18 | `/athletes/compare` | Compare Athletes | Authenticated |
| 19 | `/athletes/:id` | Athlete Dossier | Authenticated |
| 20 | `/billing/success` | Checkout success | Public (reached via Stripe redirect) |
| — | (any unmatched path) | 404 Not Found | Public |

**Navigation structure (left sidebar, present on every authenticated page):**
1. Brand block at top (logo + wordmark + organization name).
2. Main nav, ungrouped: Overview, Intelligence, AI Chat, Source Explorer.
3. "Athletes" group: All Athletes (→ Add Athlete flow), Schedule, Compare.
4. "Workspace" group: Alerts.
5. A scrollable roster panel filling the remaining vertical space: header "Roster (N)" with a "+" add button, a search box (shown once the roster exceeds 5 athletes), and one row per athlete (avatar, name, sport, an unread-intelligence indicator dot).
6. Bottom-pinned: Settings (always visible), Admin (visible only to admins), then a user footer (avatar, name, plan label, sign-out button).

The public marketing site uses a separate top navigation bar (fixed, translucent-blur background) with links to Product, Pricing, About, Security, a "Sign in" link, and a lime "Request demo" button — plus a multi-column footer with product/company/legal link groups and a live "All systems operational" status indicator.

### 2.4 Every page, in detail

For each page below: purpose, access, layout, data, actions, states.

---

**1. Landing (`/`)** — Public.
Purpose: convert visitors into demo requests / trial signups.
Layout: hero with headline, a "Private Beta" badge, two CTAs (Request a demo, Explore the platform); an animated trust-metrics strip (four count-up statistics that animate into view: athletes monitored, countries covered, data points processed, uptime); an animated mock dashboard preview (fake browser chrome, auto-cycling fake intelligence feed); a four-pillar feature grid (Results, Media, Relationships, AI Intelligence) with alternating card backgrounds; a three-step "how it works" section; a closing lime call-to-action band.
Data: none — fully static content.
Actions: navigate to Contact, Pricing, or About.
Loading/empty/error: none applicable (static).

**2. Pricing (`/pricing`)** — Public.
Purpose: plan comparison and self-serve checkout entry point.
Layout: hero with a monthly/annual billing toggle; three tier cards (Starter, Pro — marked "Most popular", Enterprise); a full feature-comparison table grouped into six sections (Athletes & Coverage, Intelligence, Analytics & Reports, AI Features, Integrations & Security, Support); an FAQ accordion; a closing Enterprise CTA band.
Data: fetches live price identifiers from the billing provider on page load so checkout buttons always reflect real configured prices.
Actions: clicking Starter/Pro starts a Stripe Checkout session (redirects off-site); Enterprise links to Contact.
Loading/empty/error: a tier's button shows "Coming soon" (disabled) if no matching price is configured yet; a checkout failure shows inline error text under the button.

**3. About (`/about`)** — Public. Static company/mission content (stats, founding story, values). No API calls.

**4. Contact (`/contact`)** — Public.
Purpose: lead capture (demo request / enterprise inquiry / general).
Layout: left column — enquiry-type selector (3 options as clickable cards) plus a static info panel; right column — the form (name, organization, email, role, a roster-size dropdown shown only for demo requests, message).
Actions: submits to a contact-form endpoint that stores the inquiry for admin review.
States: success shows a confirmation card; failure surfaces an error and resets the form to editable.

**5. Security (`/security`)** — Public. Static trust/compliance content: security architecture pillars, AI principles (source attribution on everything, public information only, honest confidence scoring, no inferred personal profiling), data source list, compliance status badges.

**6. Terms (`/terms`)** — Public. Full legal Terms of Service document with a sticky table-of-contents sidebar (14 sections: acceptance, service description, accounts, billing, acceptable use, data & privacy, intellectual property, disclaimers, liability, indemnification, termination, governing law, changes, contact).

**7. Sign in (`/sign-in`)** — Public.
Layout: split screen. Left ~480px column: logo, headline, the embedded auth widget (styled to match the dark/lime theme), a link to request access for new organizations. Right column (hidden on small/medium screens): a purely decorative, non-interactive mocked dashboard preview.
States: a shimmer skeleton placeholder is shown briefly while the auth widget loads, to avoid a layout-shift flash.

**8. Sign up (`/sign-up`)** — Public. Same split-screen shell as Sign in, with the embedded sign-up widget on the left, centered.

**9. Dashboard / Overview (`/dashboard`)** — Authenticated (non-admin; admins are automatically redirected to `/admin` on load).
Purpose: the daily operational home screen.
Layout, top to bottom:
- Header: page title, a dynamic subtitle ("Monitoring N athletes — {today's date}" or empty-roster welcome copy), a search box, a lime "+ Add Athlete" button.
- An onboarding banner (shown only when the roster is empty and not previously dismissed): a 4-step guided-start card (Add an athlete → Review the dossier → Generate AI summary → Ask AI anything).
- Four stat/metric cards: Today's Activity, Monitored Athletes, Unread Alerts (clickable, links to Alerts), Agents Active (percentage).
- A "Global Intelligence Map" — a rotating interactive 3D world globe (see §2.5) plotting athlete locations, upcoming competitions, and recent intelligence as colored pins, with a legend showing live counts per category and click-to-expand pin detail popovers.
- A two-column body: left (wider) — a "Priority Targets" table of athletes needing attention (name, unread-intelligence badge, country/sport, rank, category badge, data-freshness indicator, hover-reveal profile link), each row with a subtle mouse-tracking 3D tilt hover effect; right (narrower) — a "Live Intelligence" vertical timeline feed of the most recent items (athlete name, category badge, time-ago, title, source domain, mini confidence bar).
Data: dashboard summary stats, athlete roster, recent intelligence, upcoming competitions.
Actions: search, add athlete, click through to any athlete's dossier, click a globe pin.
Loading: four pulsing skeleton stat cards plus skeleton rows in feed/roster areas.
Empty states: dedicated empty-state messaging for zero athletes and zero feed items.

**10. Athlete Dossier (`/athletes/:id`)** — Authenticated. **The product's centerpiece — give this the most design attention.**
See the full dedicated breakdown in §2.6 below (information hierarchy, tabs, and confidence/source-attribution presentation).

**11. Intelligence Feed (`/intelligence`)** — Authenticated.
Purpose: unified, filterable chronological feed of every intelligence item across the entire roster.
Layout: breadcrumb; header with item count; a category filter tab bar (All / Results & Rankings / Media & Interviews / Sponsorships / Career Changes, each with a live count badge); a card list — each card: category badge, athlete-name link (to dossier), time-ago, title, summary, and a footer row with source domain, an external "Source" link, a confidence bar + percentage, freshness time-ago, and a "View dossier →" link.
Loading/empty: skeletons while loading; distinct empty states for "no intelligence at all yet" (with a CTA to add the first athlete) versus "nothing in this filtered category."

**12. Competition Schedule (`/schedule`)** — Authenticated.
Purpose: calendar view of upcoming and past competitions with live countdowns.
Layout: a "Next Race" hero band showing the soonest upcoming competition with a live day/hour/minute/second countdown; below it, a split view — left: an athlete filter row plus a month-grouped list of competitions (avatar, meet name, "Next" badge on the soonest one, athlete/event/location/date, tier badge, days-away); right: a detail panel for the selected competition (tier, status, athlete, its own countdown, or the result if already completed).
Tiers: A = "Major", B = "Standard", C = "Developmental", each with distinct badge coloring.

**13. Compare Athletes (`/athletes/compare`)** — Authenticated. Accepts a query parameter listing which athlete IDs to pre-select.
Purpose: side-by-side comparison of up to 4 athletes.
Layout: a selector bar (chips for each selected athlete with remove buttons, an "add athlete" dropdown with search — including an inline "search the web for a brand-new athlete not yet in the roster" option that creates and adds them on the fly); per-athlete header cards; a head-to-head results table (shown only with 2+ athletes selected, listing shared competitions); a side-by-side stats table (world rank, personal best, season best, national rank, total followers, average engagement, intelligence item count, results on record — each visualized with a normalized horizontal bar); a "Recent Intelligence" section with one column of top items per athlete.
Empty state: a centered call-to-action to select athletes or open a dossier and use its Compare button.

**14. Add Athlete (`/athletes/new`)** — Authenticated. A wizard with two entry modes, switchable via a segmented control. **See full breakdown in §2.7.**

**15. AI Analyst Chat (`/chat`)** — Authenticated.
Purpose: natural-language question answering strictly grounded in the organization's own tracked-athlete database (never the model's general knowledge — every claim must come from a real database lookup performed live during the conversation).
Layout: header with an animated glowing "intelligence orb" avatar (pulses/brightens while actively streaming a response), title, a "LIVE DATA" badge, and a streaming-status badge (e.g., "Searching roster…"); an empty state with a welcome message and grouped suggested questions (Athlete Research / Discovery / Relationships / Trends); a message list with distinct user/assistant bubble styling and rich text rendering (headers, bullet/numbered lists, bold/inline code, and a special highlighted rendering for a trailing "Overall confidence" line); follow-up question suggestion chips below each completed assistant reply; an auto-growing input textarea (Enter to send, Shift+Enter for newline) with a character-count warning near the limit, and a Send/Stop toggle button.
Data: streams token-by-token from the chat endpoint, showing live status-phase updates ("Retrieving athlete profile…", "Searching roster…", etc.) as the assistant performs successive database lookups.
**Design note:** in the current build this page uses a mismatched light theme (off-white background, navy text) instead of the app's dark theme — this is a defect (see Part 15), not an intentional design choice. Build it in the standard dark theme.

**16. Alerts (`/alerts`)** — Authenticated.
Purpose: a personal notification inbox over intelligence items, with read/unread tracking.
Layout: header (title, unread-count badge, "Mark all read" button); filter tabs (All/Unread/Results/Media/Sponsorships/Career with counts); a list of rows each with an unread indicator dot, avatar, athlete name, category pill, title, summary, source domain, confidence percentage, time-ago, and hover-revealed archive/mark-read actions; clicking a row also marks it read.
Empty states: distinct messaging for zero alerts ever versus zero unread / zero in a filtered category.

**17. Settings (`/settings`)** — Authenticated. Six tabs in a left sub-navigation:
- **Profile** — editable name, organization name, job title; read-only email.
- **Billing** — current plan, status, renewal date; a "Manage billing" button opening the billing provider's self-serve portal; a plan comparison list with upgrade actions.
- **Team** — single-user display for now; an "Invite member" action explicitly marked as coming in a future release; a static description of role types (Owner/Admin/Analyst/Viewer).
- **Notifications** — per-category (Results/Media/Sponsorships/Career) delivery-frequency preference (Immediate/Daily digest/Weekly summary/Off) and delivery-channel toggles (email, browser push, Slack — Slack marked as requiring a paid integration).
- **Integrations** — a static catalogue of possible integrations (Slack, Microsoft Teams, Email, Calendar, CRM, REST API) each tagged with its status and required plan tier.
- **API Keys** — an Enterprise-tier-gated section showing a masked placeholder key and disabled key-generation/documentation actions.

**18. Admin Console (`/admin`)** — Authenticated, admin-only. Seven tabs:
- **Customers** — summary stats (total customers, active subscriptions, cancelling) plus a full customer table (name, email, plan, subscription status, monthly recurring revenue, signup date).
- **Enquiries** — the inbox of submissions from the public Contact form, with expandable detail, a status dropdown (new/read/replied), and a reply-by-email action.
- **AI Usage** — intended to show LLM call volume, token consumption, and cost. **Not built yet** — currently a placeholder message.
- **Crawl Tools** — manual bulk-operation triggers: backfill missing athlete photos across the whole roster; backfill missing social-media stats across the whole roster; a per-athlete table with individual "repopulate this athlete" buttons showing live progress.
- **Data Health** — a roster-wide view of data freshness and completeness: summary counts (total / fresh ≤7 days / stale 8–30 days / very stale 30+ days) and a detailed per-athlete table (last-crawl freshness, agent status, and counts of intelligence items / timeline events / contacts / competitions on file, with a manual refresh button per row).
- **System Health** — live status of the database connection, API, and required configuration, plus raw diagnostic detail.
- **Feature Flags** — a simple editable key/value list. **Currently non-functional** — the current build does not actually persist changes; see Part 15.

**19. Source Explorer (`/sources`)** — Authenticated.
Purpose: a dedicated audit-trail / evidence-browsing view across the entire intelligence database — this is the UI's most direct expression of the "every claim traces to a source" product principle.
Layout: header with a trust-focused subtitle; four summary stat cards (total sources, average confidence, unique source domains, percentage verified at 90%+ confidence); a two-column body — left: filters (text search, category dropdown, confidence-tier dropdown [Verified 90%+ / High 80–89% / Moderate 70–79% / Low <70%], sort order) plus the filtered result list (same card shape as the Intelligence Feed, with published date shown); right sidebar: "Top Sources" (top domains by item count), "Confidence Breakdown" (proportional bar per tier), "Categories" (count per category).
Empty state: a dashed-border "no sources match your filters" message.

**20. Billing Success (`/billing/success`)** — Public (reachable immediately after a Stripe redirect, even before auth state fully resolves).
A simple confirmation screen (checkmark, "You're all set.") with two CTAs (go to dashboard / add first athlete) and a note that a confirmation email is on its way.

**404 / Not Found** — a standalone page (its own layout, not the standard public shell) with a large numeral, a "page not found" message, and links back to Landing and Contact.

### 2.5 The athlete dossier's 3D visualizations & the intelligence graph

The product uses interactive 3D visualizations (WebGL, rotate/zoom-capable, mouse-drag orbit controls) in several places — these are a distinctive part of the product's identity and should be preserved:

- **Global Intelligence Map** (Dashboard) — a rotating dark globe with a wireframe lat/lon grid and atmospheric glow, plotting three kinds of colored pins: athlete locations (colored by data freshness), upcoming-competition locations (next 14 days), and recent-intelligence locations (offset slightly from the athlete's home pin). Clicking a pin opens a detail panel. A legend below shows live counts. Rotate-only (no zoom/pan) on this view.
- **Mini Globe** (Dossier hero) — a smaller single-pin version showing just that athlete's home country, decorative alongside their key stats.
- **Relationship / Intelligence Graph** (Dossier → Contacts tab, toggleable "Graph" view) — a 3D node-and-edge visualization: the athlete as a central node, with each of their contacts (coach, manager/agent, sponsor contact, federation contact, media contact) as a surrounding node color-coded by role, connected by glowing lines back to the center. Clicking a contact node opens a floating detail panel (name, role, organization, a confidence bar). Auto-rotates slowly; full zoom/pan/orbit enabled.
- **Career Timeline 3D** (Dossier → Timeline tab, toggleable "3D" view) — career events plotted as glowing spheres along a gentle arced path, with milestone/"significant" events rendered larger and in the accent color versus routine events in the secondary color. Clicking an event opens a detail panel.
- **Intelligence Orb** (Chat page header) — an animated glowing particle-field orb that visually intensifies while the AI is actively streaming a response, and idles calmly otherwise.
- **Flip card** (Dossier hero) — not 3D-rendered, but a CSS 3D-transform flip-on-hover card: front face shows the athlete's photo, back face reveals a confidence ring, agent status, and last-updated info.

Every 3D view should degrade gracefully to a plain list/card view if WebGL rendering fails or isn't available (a full-page crash must never be possible because a 3D component failed to render).

### 2.6 The Athlete Dossier — full information hierarchy (build this carefully; it's the core deliverable)

**Hero section** (always visible above the tabs): the flip card (photo/confidence), the athlete's name, an optional squad label, event/nationality/age, up to three headline stat blocks (World Rank with a trend arrow, Personal Best, Season Best), the mini-globe, and an action cluster: an Active/Paused toggle, a "Refresh Data" button (which fully re-runs the research pipeline and shows live progress text while running), an Export button, a "Compare" button, a "Configure Alerts" button, and a "Remove athlete" action (behind a confirmation prompt warning that all of that athlete's data will be permanently deleted).

**Intelligence Health panel** (directly below the hero, above the tabs): this is the primary at-a-glance trust surface for the whole dossier. Collapsed by default, showing a compact freshness label and inline stats (confidence %, item count, source count, a warning count if there are known data gaps). Expanded, it shows: a circular confidence-ring gauge (color-coded green/amber/red by score); five tiles — Freshness (days since last research, with a qualitative label), Evidence (item count with a "good/moderate/sparse" qualitative label), Sources (unique-domain count), Timeline (event count with a richness label), Results (completion percentage, e.g. "8/12 competitions have a result recorded"); a completeness progress bar; a list of specific known gaps if any exist (or a positive "no gaps detected" message); and a "Refresh now" action.

**Tabs**, in this order, each showing an item-count badge where relevant:
1. **Overview** — a two-column summary: recent intelligence highlights, a performance snapshot (whichever of world rank/PB/SB/national rank actually exist for this athlete — see Part 8 on why not every athlete has all of these), upcoming competitions; and in the side column, social media handles/follower counts with a small trend sparkline, and an agent-status summary card.
2. **AI Summary** — an on-demand AI-generated narrative career/intelligence briefing (streamed in as it generates), with a "Generate"/"Regenerate" action. Empty state before first generation.
3. **Intelligence** — every intelligence item as an individual card (category badge, source domain + link, confidence bar, title, summary).
4. **Sources** — functionally the evidence-audit view of the same intelligence items, framed explicitly around provenance (citation count, published date per item).
5. **Results** — completed competitions only, with summary tiles (races on record, wins, podiums) and a full results table.
6. **Contacts** — the relationship network, with a Table/Graph view toggle (see §2.5). Each contact shows name, a verification-status badge (verified/unconfirmed/historical), role, organization, a quoted source excerpt, a confidence score, and contact details where available (public email, website).
7. **Timeline** — the career timeline, with a List/3D view toggle (see §2.5). List view is a vertical timeline with markers, milestone events visually emphasized.
8. **Schedule** — upcoming competitions only.

**Confidence & source-attribution presentation pattern** (apply consistently everywhere a researched fact is shown, not just the dossier): every individual piece of AI-researched intelligence shows (a) a numeric confidence percentage with a color-coded horizontal bar (green = high confidence, amber/blue = medium, red = low — exact thresholds can vary slightly by context but should stay in the 70/85/90-ish range), and (b) the source domain it came from, ideally as a clickable external link to the actual source page. A fact with no available source should visibly say so rather than silently omitting the attribution row. This dual confidence+source treatment is the single most important recurring UI pattern in the product — do not build any researched-fact display without it.

### 2.7 Adding athletes — the two entry flows

**Single-athlete mode:** a 3-step wizard (Find Athlete → Confirm Profile → Configure Alerts). Step 1 offers both a search-the-existing-roster box and a "create new" form (full name required; sport, event/discipline, and nationality as dropdowns — event options should dynamically change based on the selected sport, e.g. swimming shows strokes/distances while combat sports show weight classes; age optional). Step 2 shows a read-only confirmation of what will be tracked. Step 3 lets the user set a per-category alert frequency before launching the agent, which creates the athlete and immediately kicks off background research, then navigates to the new dossier.

**Bulk-import mode:** drag-and-drop (or click-to-browse) upload of a CSV or Excel spreadsheet, plus a downloadable template file. Column headers are auto-detected by fuzzy name-matching (so "Name"/"Athlete"/"Full Name" etc. all map correctly) — **column order must not matter**. A detection summary shows which required fields were successfully mapped, with a preview of the first several rows before import. Imports are capped at a modest maximum per request (10 in the current build) specifically because each imported row triggers the full, costly research pipeline — this cap should be preserved and should be clearly explained to the user in the UI when they exceed it. On completion, shows a per-row success/failure summary.

### 2.8 Loading, empty, and error state conventions

- **Loading:** prefer skeleton placeholders (pulsing gray/translucent blocks approximating the shape of the content about to appear) over spinners for list/card content; a centered spinner is acceptable for full-page or full-panel loads.
- **Empty states:** always a dashed-border card with a centered icon, a clear title, a one-line explanation, and — where there's an obvious next action — a button to take it (e.g., "Add your first athlete").
- **Errors:** prefer small inline error text near the action that failed, in the red/danger color token, over blocking browser alerts or toasts. A toast/notification system does exist and should be available as a pattern, but the current build under-uses it — most feedback in the current app is inline and contextual, and that's the convention to follow for the rebuild too, using toasts only for global, non-contextual confirmations.

### 2.9 Responsive / mobile behavior

**[KNOWN DEFECT — REQUIRED FOR TARGET MVP if mobile matters to you; otherwise explicitly out of scope]** The current product is effectively desktop-only. The authenticated app shell uses a fixed-width sidebar and fixed multi-column grid layouts throughout, with no mobile navigation menu and no responsive breakpoint handling in any authenticated page. Only the public marketing pages have partial responsive behavior (some elements hidden below a breakpoint, but no working mobile menu even there). **Decide explicitly whether the rebuild should support mobile/tablet — do not assume it from the current build, since the current build doesn't.** If mobile support is wanted, this needs to be designed fresh, not ported.

---

## PART 3 — USER JOURNEYS

### New user

Landing → Sign up → (email verification if applicable) → first login → **paywall/plan-selection modal appears immediately if no active subscription** (blocking overlay, not dismissible except by starting checkout or explicitly signing out — admins bypass this entirely) → selects a plan and billing cycle → redirected to Stripe Checkout (off-site) → 3-day trial begins, no charge yet → redirected back to `/billing/success` → Dashboard, now showing an onboarding banner since the roster is empty → clicks "Add Athlete" → Add Athlete wizard (single or bulk) → athlete(s) created, background research kicks off immediately → redirected to the new athlete's Dossier, which shows a "gathering intelligence" progress state for roughly 20–45 seconds while the research pipeline runs → dossier populates with results, competitions, contacts, timeline, sponsorships, social profiles, and general intelligence, each item showing confidence and source.

**Failure states to handle explicitly:** checkout failing (must show a clear, non-generic error — the current build shows only a vague message on failure, which is a defect to fix, not repeat); the athlete-creation research pipeline failing partially or fully (the dossier must show what succeeded and clearly flag what's still missing/unknown, never silently show nothing); attempting to bulk-import more than the per-request cap (clear, specific error stating the limit and the count received).

### Returning user

Sign in → Dashboard (subscription already active, no paywall) → reviews stat cards and the intelligence feed → clicks into an athlete's dossier to review updates, or into Alerts to review unread notifications, or into AI Chat to ask a question about the roster → optionally triggers a manual refresh on a specific athlete, or browses the Source Explorer to audit where a specific claim came from → signs out.

### Admin

Sign in as the designated admin account → automatically redirected from Dashboard to the Admin Console → reviews the Customers tab for account/billing overview → checks Data Health for any athletes with stale or sparse data and triggers refreshes as needed → reviews new Enquiries from the public contact form and updates their status → uses Crawl Tools for roster-wide maintenance operations (photo backfill, social-stats backfill) → checks System Health if something seems wrong.

**Critical requirement for the rebuild, not present in the source system today:** admin identity and privilege must be a real, explicit, server-verified role — not a single hardcoded email address compared against a config value (see Part 9 and Part 14). The *concept* of "exactly one privileged operator account, verified server-side, never inferred client-side" from the current build is worth keeping as a starting posture, but the mechanism must be a real admin-role system that can support more than one admin.

---

## PART 4 — DATABASE

**Design principle Base44 must follow that the source system does not yet fully enforce: every table below that stores athlete-specific data must be scoped to the owning user/tenant, and every query against it must filter by that ownership. Do not build a schema where all customers' athlete data lives in one global, unscoped pool.** The source system has a documented, in-progress fix for exactly this gap (see the Multi-Tenancy subsection below) — treat that as the required target shape, not the current gap, when you design the schema.

### Entity: Athletes (hub table)

The central entity. One row per tracked athlete. Columns:

| Column | Type | Nullable | Notes |
|---|---|---|---|
| id | integer, auto-increment | No | Primary key |
| owner_id | text | No | The id of the user/account that owns this athlete record. Indexed. **This is the tenancy key — every read and write must filter on it.** |
| name | text | No | |
| sport | text | No | |
| event | text | No | Specific discipline/event/position within the sport |
| nationality | text | No | |
| age | integer | Yes | No date-of-birth field exists in the source system — this is a known gap, see Part 15; recommend adding a real date-of-birth field in the rebuild instead of a bare age integer |
| squad | text | No, defaults to empty string | Free-text grouping label |
| world_rank | integer | Yes | |
| world_rank_delta | integer | No, defaults to 0 | Change vs. a prior snapshot |
| national_rank | integer | Yes | |
| personal_best | text | Yes | Free-text formatted mark — see Part 8 for why this needs to become sport-aware |
| season_best | text | Yes | |
| instagram_handle | text | Yes | |
| instagram_followers | integer | Yes (no default) | **Nullable is intentional and important:** null means "not verified this run," which must be displayed as "unknown," never coerced to zero |
| instagram_engagement | real | No, defaults to 0 | |
| twitter_handle | text | Yes | |
| twitter_followers | integer | Yes (no default) | Same null-means-unknown semantics as Instagram |
| tiktok_handle | text | Yes | |
| tiktok_followers | integer | Yes (no default) | Same |
| follower_growth_30d | real | No, defaults to 0 | Currently always 0 in the source system — never actually computed; see Part 15 |
| avg_engagement | real | No, defaults to 0 | Same — never actually computed |
| agent_status | text | No, defaults to "active" | active / paused |
| last_crawled_at | timestamp | Yes | |
| intelligence_count | integer | No, defaults to 0 | |
| has_new_intelligence | boolean | No, defaults to false | |
| avatar_url | text | Yes | |
| ai_summary | text | Yes | Cached generated narrative |
| ai_summary_generated_at | timestamp | Yes | |
| created_at | timestamp | No, defaults to now |
| updated_at | timestamp | No, auto-updates on write |

### Entity: Competitions

One row per competition entry for an athlete. Columns: id (PK), athlete_id (FK to Athletes, cascade delete), athlete_name (denormalized copy), meet_name, event, location (nullable), date, tier (A/B/C, defaults "B"), status (upcoming/completed/cancelled, defaults "upcoming" — **but status should always be derived deterministically by comparing the date to today, not trusted from whatever an AI extraction returned; see Part 7**), result (nullable text), created_at.

### Entity: Contacts

One row per professional contact associated with an athlete (coach, medical staff, manager/agent, media contact, sponsorship contact). Columns: id (PK), athlete_id (FK, cascade delete), role, category (management/coaching/medical/media/sponsorship), name, org, org_type (nullable), status (verified/unconfirmed/historical, defaults "verified"), confidence (integer, defaults 80), public_email (nullable), website (nullable), note (nullable), last_verified (date), date_discovered (date), source_domain, source_excerpt (a quoted snippet supporting the claim). No created_at/updated_at on this table in the source system — recommend adding them in the rebuild for consistency.

### Entity: Timeline Events

One row per career-timeline entry. Columns: id (PK), athlete_id (FK, cascade delete), date, category (competition/media/sponsorship/career/personal), title, description (nullable), location (nullable), source_domain, source_url (nullable), confidence (integer, defaults 85), significant (boolean, defaults false — drives the "milestone" visual emphasis).

### Entity: Intelligence Items

One row per general intelligence finding (news, media coverage, sponsorship news, career changes). Columns: id (PK), athlete_id (FK, cascade delete), athlete_name (denormalized), category (results_rankings/media_interviews/sponsorships/career_changes), title, summary (nullable), source_domain, source_url (nullable), confidence (integer, defaults 80), published_at (nullable timestamp — when the underlying event/article happened), discovered_at (timestamp, defaults now — when the system found it).

### Entity: Alert Configs

Exactly one row per athlete (the athlete_id column is itself the primary key, not a separate id), governing per-category notification preferences: results_enabled/results_frequency, media_enabled/media_frequency, sponsorships_enabled/sponsorships_frequency, career_enabled/career_frequency (each `*_frequency` defaulting to "immediate" or "daily" depending on category). FK to Athletes, cascade delete.

### Entity: Contact/Sales Enquiries

Independent of the athlete data model entirely — feeds the public Contact page into the Admin Enquiries tab. Columns: id (PK), type (demo/sales/general, defaults "general"), name, org, email, role (nullable), a free-text roster-size-estimate field, message (nullable), status (new/read/replied, defaults "new"), created_at.

### Relationships

Athletes is the hub. Competitions, Contacts, Timeline Events, and Intelligence Items all have a mandatory foreign key back to Athletes, with cascade delete — removing an athlete removes all of its dependent rows automatically. Alert Configs has exactly one row per athlete (1:1). Contact/Sales Enquiries stands alone with no relationship to any athlete data.

### Multi-tenancy / ownership model — REQUIRED, read carefully

**[REQUIRED FOR TARGET MVP]** The source system has begun — but not finished — implementing per-user data isolation. What exists today: the Athletes table has an `owner_id` column (storing the id of the user who created that athlete), it is written correctly on every athlete-creation path, and it is indexed. **What does not exist today, and is the single most important thing for Base44 to get right that the source system got wrong:** no query anywhere in the source system's API actually filters by `owner_id`. Every authenticated user can currently read, edit, and delete every other user's athletes and all of their associated competitions/contacts/timeline/intelligence, and the AI chat analyst can retrieve any user's data regardless of who's asking. Dashboard aggregate counts, the intelligence feed, and search are all similarly unscoped across the whole customer base.

**Build the rebuild correctly from the start:** every table that hangs off Athletes should be scoped through the Athletes table's `owner_id` (do not duplicate an owner/tenant column onto Competitions, Contacts, Timeline Events, or Intelligence Items individually — scope through the `athlete_id` relationship instead, checking the parent athlete's ownership). Every single read and write in the API layer — including dashboard aggregates, search, the AI chat's database-lookup tools, and bulk operations — must filter to the current authenticated user's own athletes only. A request for another user's athlete (by ID or any other means) should behave as if it doesn't exist (return a not-found response), not as if access were merely denied — do not let the API confirm that a given ID belongs to someone else. This is a hard security requirement, not a nice-to-have; see the acceptance criteria in Part 17.

**Do not build multi-user team/organization support unless you specifically want it** — the source system, and this spec, are describing a *single owner per athlete* model (one authenticated user id per athlete), not a shared-team-workspace model. If Base44's target product needs teams sharing one roster, that's a deliberate scope decision to make explicitly, not something to infer from this document.

---

## PART 5 — BACKEND / API SPECIFICATION

All endpoints are prefixed with `/api`. Two auth tiers: **Public** (no login required) and **Authenticated** (valid session required); a further **Admin** tier requires both authentication and a verified admin role.

### Public endpoints

| Method & path | Purpose |
|---|---|
| `GET /healthz` | Liveness probe — checks database connectivity, returns ok/error |
| `POST /contact` | Submits a lead/enquiry from the public Contact page. Rate-limited (~10/hour per IP). Body: type, name, org, email, role, athletes (roster-size estimate text), message. |
| `GET /stripe/prices` | Returns live price identifiers grouped by plan tier, for the pricing/checkout UI |
| `GET /stripe/products-with-prices` | Returns the full product catalogue |
| `POST /stripe/checkout` | Starts a Stripe Checkout session. Rate-limited (~10/hour per IP). Body: priceId, optional email, successUrl, cancelUrl, optional trialDays. Returns a redirect URL. |
| `POST /stripe/webhook` | Stripe webhook receiver — verifies signature, updates local subscription state |

### Authenticated endpoints — Athletes

| Method & path | Purpose | Tenancy requirement |
|---|---|---|
| `GET /athletes` | List the roster | **Must return only the caller's own athletes** |
| `POST /athletes` | Create an athlete directly with full details (name, sport, event, nationality, optional age/squad); triggers background research | Stamp owner = caller |
| `POST /athletes/discover` | Create an athlete from a name alone — an AI call first infers sport/event/nationality/age with a confidence score; rejects (422) if confidence is too low or key fields can't be determined; if an athlete with that exact name already exists, returns the existing one instead of creating a duplicate | Stamp owner = caller; the "already exists" dedupe check must also be scoped to the caller's own roster, not global |
| `POST /athletes/bulk` | Bulk-create from an array, capped at a small max per request (10 in the source system) because each row triggers the full research pipeline; per-row validation, partial success supported | Stamp owner = caller on every row |
| `GET /athletes/compare?ids=1,2,3` | Fetch multiple athletes by id for the comparison page | **Must only return ids owned by the caller** |
| `GET /athletes/:id` | Fetch one athlete | **Must 404 if not owned by the caller** |
| `PATCH /athletes/:id` | Update editable fields (squad, agent status, avatar URL, social handles/follower counts) | **Must 404 if not owned by the caller** |
| `DELETE /athletes/:id` | Delete an athlete and all dependent data (cascade) | **Must 404 if not owned by the caller** |
| `POST /athletes/:id/repopulate` | Wipe and fully re-run the research pipeline for this athlete; returns immediately, runs in background | Ownership check required |
| `POST /athletes/:id/refresh-social` | Re-run just the social-profile/follower-count research; this one is awaited (the request blocks until it completes, unlike repopulate) | Ownership check required |
| `GET /athletes/:id/health` | Data-quality/freshness metrics for one athlete (confidence, item counts, freshness, known gaps) | Ownership check required |

### Authenticated endpoints — child resources (all scoped to a specific athlete)

| Method & path | Purpose |
|---|---|
| `GET /athletes/:id/intelligence` | All intelligence items for this athlete |
| `GET /athletes/:id/competitions` | All competitions for this athlete (status is recomputed from date at read time, never trusted from storage) |
| `GET /athletes/:id/contacts` | All contacts for this athlete |
| `GET /athletes/:id/timeline` | All timeline events for this athlete |
| `GET /athletes/:id/alerts` | This athlete's alert-config preferences (auto-created with defaults on first access) |
| `PUT /athletes/:id/alerts` | Update alert-config preferences |
| `GET /athletes/:id/summary` | Fetch the cached AI-generated narrative summary |
| `POST /athletes/:id/summary` | Generate (or regenerate) the narrative summary — streams back token-by-token, caches the final result |

Every one of the above must inherit the parent athlete's ownership check — a caller must not be able to read another user's athlete's intelligence/competitions/contacts/timeline just because they know the athlete's numeric id.

### Authenticated endpoints — cross-roster / aggregate

| Method & path | Purpose | Tenancy requirement |
|---|---|---|
| `GET /dashboard` | Aggregate stats: total athletes, active agents, new-intelligence count, upcoming competitions, priority alerts, recent intelligence, priority athletes | **Must aggregate only the caller's own data** |
| `GET /intelligence` | Cross-roster recent intelligence feed | **Must be scoped to the caller's own athletes** |
| `GET /competitions` | Cross-roster upcoming competitions | **Must be scoped to the caller's own athletes** |
| `POST /chat` | AI analyst — see below | **Every database tool call the AI makes internally must be scoped to the caller's own athletes** |
| `GET /user/me` | Returns the caller's resolved identity: email and whether they're an admin (computed server-side) |

### Authenticated endpoints — billing (protected)

| Method & path | Purpose |
|---|---|
| `POST /stripe/portal` | Opens the billing-provider's self-serve customer portal for the caller |
| `GET /stripe/subscription` | Returns the caller's current subscription status |

Both of these must derive the customer identity strictly from the authenticated session — never from a client-supplied email or customer id — to prevent one user from viewing or managing another user's billing.

### Admin-only endpoints

All require both authentication and a verified admin role, checked on every request, server-side.

| Method & path | Purpose |
|---|---|
| `GET /admin/customers` | Full customer list merging identity + billing data (name, email, plan, subscription status, MRR, signup date) |
| `GET /admin/enquiries`, `PUT /admin/enquiries/:id` | Manage inbound contact-form submissions |
| `POST /admin/repopulate/:id` | Admin-triggered re-population of any athlete regardless of owner |
| `POST /admin/backfill-photos` | Roster-wide: fill missing avatar photos |
| `POST /admin/backfill-social` | Roster-wide: refresh social handles/follower counts |
| `POST /admin/backfill-results` | Roster-wide: fill missing competition results, and normalize any stale competition statuses |
| `GET /admin/data-health` | Roster-wide freshness/completeness report |
| `GET /admin/health` | System diagnostic (DB connectivity, required configuration present, uptime, memory) |
| `GET /admin/flags`, `PUT /admin/flags/:key` | Feature flags — **build this for real; the source system's version is a non-functional stub that accepts writes but never persists them** |

Admin routes are intentionally exempt from the per-user ownership scoping described above — an admin is explicitly meant to see and manage every customer's data. This must be an explicit, separately-implemented code path, not a parameter that quietly turns the tenancy check off — the distinction between "I am scoped to my own data" and "I am an admin and see everything" must be structurally obvious in the implementation, not a flag that's easy to accidentally set.

### The AI chat tool contract

`POST /chat` implements an agentic loop: the model can call a fixed set of tools that run real database queries — get an athlete's profile, get an athlete's intelligence/competitions/contacts/timeline, search the roster by sport/nationality/age/keyword, search the contact network, get cross-roster intelligence, get a rankings overview. The system prompt must instruct the model, and the tool implementations must enforce, that it can only ever retrieve data belonging to the requesting user's own roster — this is both a prompt-level instruction ("never answer from training knowledge; only from tool results") and a hard server-side filter on every tool's underlying query (do not rely on the prompt alone). Responses stream token-by-token with periodic "phase" status updates while tools are being called, and end with a structured trailing line of suggested follow-up questions.

### General API conventions to follow

- Successful responses return the resource itself (an object or array), not wrapped in an envelope.
- Errors return a JSON object with an `error` message field.
- Status codes: 200 (read/update), 201 (created), 202 (background job accepted), 204 (deleted), 400 (validation failure), 401 (not authenticated), 403 (authenticated but not authorized — used for admin checks), 404 (not found, including "not found because it belongs to someone else"), 422 (semantically rejected, e.g. low-confidence athlete discovery), 429 (rate limited), 500 (unhandled error — never leak internal error detail or stack traces to the client), 503 (health check failure).
- Every list/detail response converts dates/timestamps to a consistent ISO-8601 string format on the wire.
- Rate-limit every endpoint that triggers a billable AI call, keyed by the authenticated user (not raw IP, since IP-based limits either over- or under-restrict shared-network or IP-rotating users) — see Part 13 for suggested limits.

---

## PART 6 — AI AGENT ARCHITECTURE

This is the core intellectual property of the product. The research pipeline is organized as a set of independent, self-contained "agents," each responsible for one category of fact. Every agent follows the same two-phase pattern and the same reliability contract — study this pattern once, then apply it consistently across every agent, rather than treating each as a bespoke implementation.

### The universal agent pattern

1. **Research phase:** call a web-search-capable AI model with a system prompt establishing its role and an explicit "never fabricate information" instruction, and a user prompt describing exactly what to look for. The model returns free-text research findings **plus a list of real citation URLs** it actually used.
2. **Extraction phase:** call a second AI model, instructed to return only strict JSON matching a fixed schema, extracting structured facts from the research text. This prompt must always include an explicit rule that any field the research doesn't clearly support should be returned as null/omitted, never guessed.
3. **Verification phase (in code, not the model):** every extracted fact that claims a source must be checked against the real citation list from step 1 — if the claimed source doesn't actually appear in the citations, the source attribution (and often the whole fact) is discarded, regardless of what the model said. This step exists because, empirically, extraction models will sometimes invent a plausible-looking source if not checked.
4. **Reliability contract:** every agent must catch its own failures internally and return a safe empty/null result rather than throwing — one agent's failure must never prevent any other agent's already-successful results from being saved.

### The ten research agents

**1. Results Agent** — world/national ranking and personal-best/season-best performance marks. Research prompt asks for exact ranks and exact performance marks, explicitly noting that for course-variable sports (its own example: downhill mountain biking) the mark is a race finishing time, not a placement. Extraction requires the mark be an actual measured value in a sport-appropriate format (time, distance, weight, etc.), never a placement or event name, and to return null rather than guess. A validation step then checks that a season-best mark can never be objectively better than the career personal-best for the same discipline (if the model returns marks in incompatible formats, both are discarded as unreliable; if they're comparable but season-best appears to beat personal-best, personal-best is corrected upward to match, since that's a more plausible data-entry inconsistency than a truly impossible result).

**2. Photo Agent** — profile photo, in strict priority order: international sport federation profile page, then national/continental federation, then National Olympic Committee page, falling back to a Wikipedia-based search strategy (exact title match, then a fuzzy search that requires the result to plausibly match the athlete's actual name to avoid grabbing an unrelated person's photo), falling back to one more AI web-search attempt as a last resort. At every stage, a claimed image URL is only trusted if its domain matches one of the real citation URLs from that stage's research call.

**3. Competitions Agent** — full competition history. Explicitly instructed to reject generic/vague meet names (a validation function rejects placeholder-style names like "Competition" or "2024 Event") in favor of specific real event names. Assigns a tier (A = Olympics/World Championships/top circuit finals, B = continental/national/major invitational, C = domestic/club level). **Competition status (upcoming/completed/cancelled) must always be computed deterministically by comparing the competition's date to today's date in code — never trust an AI-returned status field.** (The source system learned this the hard way: an earlier version trusted the model's own status claim and found 25–33% of completed competitions mislabeled "upcoming" for several test athletes.)

**4. Contacts Agent** — named professional contacts only (coach, medical staff, manager/agent, a named sponsorship contact — never the sponsor brand itself, that's the Sponsors Agent's job). Runs two research passes in parallel (coaching-related roles; representation-related roles). Critically instructed to distinguish three outcomes clearly: a real named contact found with evidence; explicit evidence that no such contact exists (e.g. "reported as self-coached"); or genuinely no information either way — the model must never invent a plausible name to fill a gap, and the extraction schema requires a minimum confidence floor with no low-confidence contacts kept at all (better to have no contact than an unreliable one).

**5. Timeline Agent** — a career timeline sized to the athlete's actual career, explicitly not padded to hit a target count. Deduplicates near-identical events within one research pass. Requires every event's source URL to exactly match a real citation.

**6. Sponsors Agent** — named brand-sponsorship deals only, with a real named brand required (never a vague "a sportswear company" guess). Applies a time-based confidence decay: a deal confirmed within the last 6 months keeps full confidence; 6–18 months old loses a small amount; 18–36 months loses more; older than 3 years loses the most — but a deal is never fully discarded purely for being old, since a past sponsorship is still real, useful historical context (unlike a "current coach" claim, which needs to still be true right now).

**7. Social Profiles Agent** — finds and format-validates (never live-verifies) Instagram/X/TikTok handles. Rejects anything that looks like a placeholder ("unknown", "n/a", etc.) or isn't a plausible bare username. Deliberately does not fetch follower counts itself.

**8. Social Metrics Agent** — fetches follower counts for the handles the previous agent already validated. For X/Twitter, uses a **real API** when available, which is authoritative and never blended with an AI guess — if the API key isn't configured or the call fails, the follower count is simply left unknown, never estimated. For Instagram/TikTok (no equivalent public API exists), an AI web-search pass is used instead — but the handle it independently discovers must match (case-insensitively) the handle already validated by the Social Profiles Agent, or the follower count is discarded as unreliable (it may have found a different, wrong account).

**9. Biography Agent** — re-verifies age and nationality on every research cycle. Requires a high confidence threshold to apply any change at all, and — this is an important nuance — a claimed nationality change is only ever applied if the model *explicitly* flags it as a change (not merely returns a different value than currently on file, which could just be research imprecision); otherwise it's logged but not applied.

**10. Intelligence Agent** — general newsworthy items across three categories (results/rankings coverage, media/interviews, career changes) researched in three parallel passes, each covering roughly the athlete's last decade of career, again explicitly told not to pad for volume.

### Orchestration

Three entry points:
1. **Discover-by-name:** one AI call to infer an athlete's sport/event/nationality/age from just a name, with a confidence score; below a set threshold or missing key fields, the athlete is not created at all.
2. **Full population** (fires automatically whenever an athlete is created, and again on any manual "repopulate" request): all ten agents' research phases run **concurrently** where they don't depend on each other, except the follower-count lookup, which must run *after* the handle-validation agent since it depends on that result. Every database write happens only after all research is complete, batched into a small number of write operations. If a database write fails partway through, the athlete's freshness timestamp is deliberately backdated so the next scheduled refresh cycle retries it sooner.
3. **Repopulate:** deletes all of an athlete's existing competitions/contacts/timeline/intelligence and fully re-runs population from scratch, rather than trying to merge/diff — this is a deliberate simplicity choice.

A background scheduler should periodically (the source system uses a 6-hour interval) select a small batch of the most stale athletes (oldest last-researched-at, capped per cycle, e.g. 3 at a time) and refresh them automatically, with a deliberate delay between each athlete in a batch to stay within AI provider rate limits.

---

## PART 7 — DATA TRUST ARCHITECTURE

This is the mechanism that makes the "evidence-attributed" promise real rather than aspirational. Implement all of the following as code-level checks that run regardless of what any AI model claims — never rely on a prompt instruction alone to prevent fabrication.

**Source/citation validation:** a claimed source URL is only accepted if it exactly matches one of the real citation URLs the research-phase model actually returned for that specific research call. If zero real citations were returned at all, every fact from that call must have its source attribution nulled, regardless of what the extraction model wrote — there is nothing to verify it against. Reserved/placeholder domains (example.com, example.org, and citation-index-style placeholders like "source4" or "source9") must be explicitly rejected as never valid, since extraction models will occasionally invent exactly these when it can't find a real source.

**Source authority weighting:** maintain a list of high-authority domains (official sport federations, national Olympic bodies, major sports-media outlets) that get a small confidence boost when a claim is sourced from them, and a list of low-authority domains (social media platforms, general wikis, unattributed aggregators) that get a confidence penalty. A fact with no source URL at all (domain-only attribution, or none) should also take a small penalty relative to one with a full source URL.

**Confidence scoring:** every extraction that carries a confidence field should have that value floored to a minimum threshold before domain-authority adjustment is applied (so an unusually low or missing raw value doesn't get compounded unfairly), then adjusted by domain authority as above, then — for categories where it applies — only kept if it still clears the minimum threshold after adjustment. Suggested floor: 70 for general research categories (contacts, timeline, sponsorships, general intelligence items), 80 for biography corrections (a higher bar, since these overwrite existing data rather than adding new data).

**Duplicate prevention:** within a single research pass, reject near-identical entries (same normalized title occurring twice, or same date+title combination) before they're saved.

**Malformed-date rejection:** validate every date field strictly (real calendar date, correct format) before accepting a record; reject the record rather than saving a bad date.

**Fabrication protection — the core philosophy, stated explicitly so it's not lost in translation:** an unknown value must always be preferable to an invented one. Every extraction prompt should instruct the model that if research doesn't clearly support a field, return null/omit it rather than guess a plausible-looking value — and every extraction schema should make null a valid, expected value for every optional field, not an error case. This applies even under pressure to "fill out" a profile — a sparse-but-honest dossier is correct behavior, not a bug to fix by lowering the evidence bar.

**Retry logic:** only retry a genuinely transient failure (rate-limited or server-error responses, or a bare network-level failure with no response at all) — never retry a definite rejection (bad request, forbidden, not found), since retrying that just wastes calls without fixing anything. Use a short exponential backoff (e.g., a few hundred milliseconds doubling over 2–3 attempts). Retry logic must wrap only the raw API call itself, never any parsing or validation logic that runs after a successful response — a malformed model response should be treated as "this attempt returned unusable data," not silently retried as if it were a network blip.

**Concurrency limiting:** cap the total number of AI calls allowed in flight across the whole system at once (a modest number, e.g. 5–6) — not per-athlete, not per-agent, but process-wide, since that's where real rate limits and cost spikes actually bite, especially once multiple athletes can be researched concurrently.

**API rate limiting (product-facing, distinct from the AI-provider concurrency cap above):** every user-facing endpoint that triggers billable AI calls needs its own per-user rate limit — see the suggested limits table in Part 13.

**Unknown/null handling in storage and display:** any numeric field where "we don't know" is a real, meaningful state (most obviously follower counts) must be storable as null/unknown, distinct from and never silently converted to zero — and the UI must render that distinction visibly ("Unknown" or similar), not as a blank space that looks like a loading glitch.

**Time-sensitive data provenance — required improvement over the source system:** for any fact whose truth changes over time (the clearest example: social-media follower counts), store not just the value but the source it came from, the date it was checked/observed, and a confidence score, as a genuine three/four-part record — not a bare number. This lets the UI show "as of {date}" and lets a future refresh distinguish a fresh, current number from a stale one that just happens to still be sitting in the same column. **This is a real gap in the source system today** — follower counts and personal-best/season-best marks are currently stored as bare values with no source or date attached at all, which is precisely how a three-year-stale follower count can end up displayed with no way to tell it's stale. Every other researched-fact category in the source system (competitions, contacts, timeline, sponsorships, general intelligence) already does capture source+confidence properly — use those as the pattern to extend to the two categories that currently lack it.

---

## PART 8 — SPORT-SPECIFIC DATA MODEL

**[REQUIRED FOR TARGET MVP]** Do not assume every athlete has a conventional "personal best." The current system asks every athlete, in every sport, for a single canonical "personal best" and "season best" value. This works well for sports where performance reduces to one directly-comparable number across any venue or occasion — sprinting, distance running, swimming, jumping, throwing, weightlifting. It does not work for sports where the result is inherently course-, opponent-, or judged-outcome-dependent and not comparable across events — for example, downhill mountain biking (every course has a different length and terrain, so finishing times from different races aren't comparable to each other the way sprint times are), most combat sports, gymnastics, sailing, and most team sports. For these, the honest answer is often that "personal best" doesn't cleanly exist as a concept at all — not that the data is missing, but that the question doesn't apply.

**What the correct model distinguishes:**
- **Personal best / season best** — a single, directly comparable performance number. Meaningful only for time/distance/height/weight-based individual sports. For sports where it doesn't apply, the UI should say so explicitly ("Not applicable for this sport") rather than showing an empty slot that reads as missing data.
- **Season best** — same concept, current-season scope; same applicability constraint.
- **Performance result / competition result** — the outcome of one specific competition (a time, a placement, a score) — this is always meaningful regardless of sport, and already exists as its own concept (the Competitions entity) independent of any summary statistic.
- **Ranking** — a periodic, federation-published position; independent of PB/SB, meaningful for most sports.
- **Podium / major win** — a specific, dated, evidenced achievement. This should be a first-class, structurally distinct fact type, not left to compete for visual prominence inside a generic news/intelligence feed. A career-defining result (a first major title, an Olympic medal) deserves its own guaranteed-prominent home in the dossier — e.g. a "Career Highlights" or "Defining Achievements" module near the top of the page — rather than existing only as one entry among many in an undifferentiated list.
- **Defining achievement** — the single or handful of results that most define an athlete's career, which may or may not be reducible to a number at all (a World Cup win is a defining achievement regardless of whether "personal best" means anything for that sport).

**Implementation approach for the rebuild:** maintain a sport-to-metric-type mapping (e.g. time-based / distance-based / height-based / weight-based / score-based / placement-only) covering every sport your onboarding flow offers, with an explicit, sensible default for any unmapped sport. Gate whether the Results Agent even asks for a personal-best/season-best at all based on this mapping — for placement-only sports, it should return an explicit "not applicable" signal, not a null that looks identical to "we don't know yet." Add a first-class "defining achievements" concept, populated from the same research the system is already doing (extract achievement-worthy facts from what the Competitions/Timeline/Intelligence research already finds, rather than a wholly separate research pass), and give it prominent, guaranteed placement in the dossier UI.

---

## PART 9 — ADMIN / SAAS MANAGEMENT

Build a genuinely useful SaaS admin console — not fake metrics, and not a console that silently fails to persist changes. For anything below not achievable without additional backend work, that's stated explicitly rather than glossed over.

### User management

| Capability | Feasible now? |
|---|---|
| View all users | Yes — merge identity-provider user data with billing-provider customer data by email |
| Search users | Yes |
| View email, account creation date, last-active date | Yes, from the identity provider |
| View plan / subscription status | Yes, from the billing provider |
| View billing-provider customer id | Yes |
| View athlete count per user | **Requires the multi-tenancy fix in Part 4** — cannot be meaningfully computed until athletes are actually scoped to owners |
| View usage (AI calls, research runs) | **Requires new usage-tracking to be built** — does not exist in the source system at all today; needs a table logging AI/API call counts, ideally per-user and per-day, to make this real rather than approximate |
| Suspend/deactivate a user | **Requires integration with the identity provider's management API** — not built in the source system |
| Delete a user | Same — requires that integration, plus a decision on what happens to their athlete data (recommend: soft-delete/archive rather than immediate hard delete) |
| Impersonate a user (for support purposes) | Not built; a reasonable Enterprise-support feature to add later, not MVP-critical |

### Subscription management

Plan, trial status, subscription status (active/trialing/canceled/past_due/etc.), renewal date, billing-provider customer and subscription ids should all be straightforwardly readable from the billing provider's API and/or a locally-synced mirror of it. Failed-payment visibility requires listening to the billing provider's webhook events for payment-failure events specifically and surfacing them — the source system receives webhook events but doesn't currently surface payment failures anywhere in the admin UI; build this properly.

### System management

- Pipeline/job status and recent failures: requires a persisted log of research-pipeline runs (which the source system doesn't currently keep — failures are only visible in application logs, not in any admin-facing table). Build a lightweight run-log: athlete id, trigger type, start/end time, success/failure, error summary if failed.
- AI/API usage and cost visibility: requires the usage-tracking mentioned above. Do not fabricate a dollar figure without real per-call token/cost data — track call counts and let cost be computed against your actual provider billing rate once you know it.
- Recent errors: surface application errors in an admin-visible feed, not just in backend logs nobody but an engineer will ever look at.
- System health: database connectivity, required configuration/secrets present, uptime — straightforward to build, and worth building exactly as described (a simple green/red status panel).
- Recent activity: a simple "what happened recently across the platform" feed (new signups, new athletes added, subscriptions started/cancelled) is a reasonable, buildable MVP version of this.

**Do not build:** a fake "AI Usage" tab that just says "coming soon" forever, or a Feature Flags UI whose save button doesn't actually persist anything. If a capability isn't ready, either don't show the UI for it yet, or show it clearly labeled "not yet available" — never show a control that silently fails to do what it claims.

---

## PART 10 — STRIPE / BILLING

**Products & prices:** define your plan tiers (Starter/Pro/Enterprise or your own naming) as products in your billing provider with monthly and annual price variants; tag each with a machine-readable tier identifier in its metadata so your application can map a price back to a plan tier without hardcoding price ids in application code.

**Checkout:** a public (no-login-required) checkout-session-creation endpoint accepting a price id, optional pre-fill email, success/cancel redirect URLs, and an optional trial length in days. Look up or create a billing-provider customer by email before creating the session. Rate-limit this endpoint per IP to prevent abuse (a modest limit, e.g. 10/hour, is enough to stop scripted abuse without inconveniencing real users).

**Customer creation:** tie every billing-provider customer record to exactly one application user, by email match at minimum (a more robust rebuild could store the billing-provider customer id directly on the user record instead of relying on email lookup every time).

**Subscriptions:** support the standard lifecycle (trialing → active → past_due → canceled), read via the billing provider's API or a locally-synced mirror table kept current by webhooks.

**Webhook handling:** verify the webhook signature on every incoming event (never trust an unsigned payload). Register the webhook receiver **before** any generic JSON body-parsing middleware in your server stack — signature verification needs the exact raw request bytes, which a JSON parser would have already consumed/reformatted. Handle at minimum: checkout completed, subscription created/updated/canceled, and payment failed (surfacing failures to the admin console, per Part 9).

**Subscription state must never be trusted from the frontend alone.** This is the single most important Stripe-related correction to make versus the source system: **[KNOWN DEFECT — REQUIRED FOR TARGET MVP]** in the source system, subscription status is fetched and displayed by the frontend, and the paywall modal is a frontend-rendered blocking overlay — but **no backend API route actually checks subscription status before serving a request.** Any authenticated user, subscribed or not, currently has full API access to every protected endpoint. **The rebuild must add real server-side enforcement:** a middleware/check that verifies an active (or trialing) subscription before allowing access to the paid, non-trivial parts of the API (at minimum: athlete creation, bulk import, and repopulation — the AI-cost-incurring operations), with the admin role exempted from this check via the same explicit, separate code path described in Part 5. Cache subscription status locally (updated via webhook) rather than calling the billing provider's live API on every single request, for latency and reliability.

**Boot-time resilience:** if your billing-provider sync/migration step fails at application startup, that should be loud and visible (logged clearly, and ideally surfaced as a persistent "billing degraded" signal in the admin System Health panel) rather than silently swallowed — the source system logs a warning and continues booting on this exact failure, which is defensible as a resilience choice (the rest of the app shouldn't go down because billing failed to initialize) but the silence around it caused a real, confusing checkout outage in production that took time to diagnose. Keep the graceful-degradation behavior; fix the silence.

---

## PART 11 — AUTHENTICATION

Use a managed authentication provider (the source system uses Clerk; any comparable provider — or Base44's own built-in auth — is fine) rather than building session/password management from scratch.

**Required behaviors:**
- Standard email/password and/or OAuth sign-up and sign-in.
- Server-side session verification on every protected API request — the authenticated user's identity must be established from a verified session/token on the server, never trusted from a client-supplied value.
- The authenticated user's stable identifier (whatever your auth provider calls it — "user id," "subject," etc.) is the value stored as `owner_id` on every athlete record (see Part 4) — this is the entire mechanism tenancy is built on, so get the identifier resolution right and consistent everywhere it's used.
- **Admin verification must happen server-side, on every admin-route request, never inferred or cached client-side.** The source system's current mechanism — compare the authenticated user's verified primary email against a single configured "founder email" environment value, fail closed (deny access) if that value is unset or empty — is a reasonable *minimum viable* mechanism worth preserving as a fallback, but only supports exactly one admin account system-wide. **For the rebuild, prefer a real admin/role flag on the user record** (settable by an existing admin, or seeded at setup) so more than one person can hold admin access — treat the single-hardcoded-email approach as the floor, not the target.
- Environment/credential variables needed (use placeholder names like these — never write real key values into any document or into version control):
  - `YOUR_AUTH_PROVIDER_PUBLISHABLE_KEY` (safe for frontend use)
  - `YOUR_AUTH_PROVIDER_SECRET_KEY` (server-only, never exposed to the frontend)
  - A session-signing secret, server-only
  - The configured admin/founder email, if using the single-admin fallback mechanism

---

## PART 12 — EXTERNAL SERVICES

| Service | Purpose | Required or optional | Failure behavior to implement |
|---|---|---|---|
| A web-search-capable AI model (the source system uses Perplexity Sonar, accessed through an OpenAI-compatible API gateway) | Live research phase of every agent | Required — the pipeline should abort research for that fact rather than proceed without it | On failure, the calling agent returns its empty/null result; never blocks other agents |
| A structured-extraction-capable AI model (the source system uses GPT-4o, and a cheaper GPT-4o-mini variant for smaller extraction tasks) | Extraction phase of every agent, plus athlete-discovery-by-name, plus the AI chat analyst | Required | Same — catch and return empty/null, never throw uncaught |
| Authentication provider | User identity, session management | Required | N/A — this should be a hard boot-time dependency; the app shouldn't start without it configured |
| Billing provider (Stripe or equivalent) | Subscription billing | Required for a real commercial product, but the app should still boot and serve non-billing functionality if billing initialization fails (see Part 10) | Log loudly, surface in admin health, don't crash the app |
| PostgreSQL (or equivalent relational database) | Primary data store | Required | Hard boot-time dependency |
| X/Twitter API | Live, authoritative follower counts for X/Twitter specifically | Optional — if not configured, that platform's follower count is simply left unknown, never estimated by AI instead | Silent null on missing credentials or failed call |
| Instagram / TikTok | Follower counts | **No public API exists for either** — these are researched via the AI web-search agent instead, with the handle-matching safeguard described in Part 6 | N/A |
| Wikipedia API | Fallback photo source | Optional, used only as a fallback after official-federation sources are tried first | Silent fallback to "no photo found" |

**Never include real API keys, secrets, or credentials in any specification, prompt, or document — use placeholder names (`YOUR_OPENAI_API_KEY`, `YOUR_PERPLEXITY_API_KEY`, etc.) throughout, including in Base44's own configuration.**

---

## PART 13 — PERFORMANCE AND COST

### AI calls required to populate one athlete

Counting every research-phase and extraction-phase call across all ten agents in a typical run (assuming the photo agent succeeds on its first, federation-search attempt, and at least one Instagram/TikTok handle is found so the follower-lookup agent's AI branch fires): **roughly 26 AI calls** (13 research calls + 13 extraction calls) for one full population cycle. The realistic range, accounting for the photo agent's fallback chain and the conditional follower-lookup branch, is **approximately 24–30 AI calls per athlete population**. Add one further AI call for the discover-by-name step if that flow is used at athlete creation. A full "new athlete via search-by-name" onboarding therefore costs roughly **25–31 AI calls**.

### Scale projections

| Roster size | Initial population burst (AI calls) | Notes |
|---|---|---|
| 10 athletes | ~260 calls | Trivial at this scale |
| 100 athletes | ~2,600 calls | If your background refresh scheduler processes a small fixed batch every few hours (the source system does 3 athletes per 6-hour cycle), the math stops working here: 100 athletes ÷ 3 per cycle ≈ 8+ days for one full refresh pass — likely worse than your intended freshness target. Plan a scheduler that scales its batch size (or concurrency) with roster size, not a fixed constant. |
| 1,000 athletes | ~26,000 calls | A fixed small-batch scheduler becomes non-viable at this scale (months per refresh cycle) — this needs a real job queue with horizontal worker scaling, not an in-process interval timer. |
| 10,000 athletes | ~260,000 calls | Same conclusion, more urgently — and at this roster size you are almost certainly serving many separate customer organizations, making the multi-tenancy requirement in Part 4 completely non-negotiable, not just good practice. |

**On pricing:** this document deliberately does not invent a dollar cost per athlete, because that depends entirely on your actual negotiated rate with your AI provider(s) and the real average token usage per call — which varies by athlete (a well-documented athlete's research returns more text to extract than an obscure one). **What you need to measure once real usage exists:** average input/output tokens per call type, multiplied by your actual provider pricing tier. Do not publish a per-athlete cost estimate to customers or investors without that real measurement.

### Known bottlenecks and what to do about them

- **Sequential vs. parallel:** within one athlete's population, most agents' research phases can and should run concurrently (they're independent) — only the follower-count lookup must wait on the handle-validation agent's result. Across multiple athletes, apply a process-wide concurrency cap on total in-flight AI calls (suggested: 5–6) regardless of how many athletes are being processed at once, since that's where real provider rate limits bite.
- **Suggested per-user rate limits** on the API endpoints that trigger AI calls (adjust to your actual usage patterns once you have real data, but these are a reasonable starting point): athlete creation ~30/hour, bulk import ~5/hour (since each row multiplies cost), single-athlete repopulate ~15/hour, social-refresh ~20/hour, AI chat ~60/15 minutes, admin roster-wide backfill operations ~6/hour.
- **Database:** index every foreign key column and every column used in a freshness/staleness query (e.g. last-researched timestamp). Watch query patterns that scan the entire athlete table without a tenant filter — once multi-tenancy is correctly enforced (Part 4), every such query becomes naturally bounded to one customer's roster instead of the whole platform's.
- **Scheduler architecture:** a simple in-process timer that processes a small fixed batch on an interval is fine for a pilot-scale deployment (dozens to low hundreds of athletes) but becomes the platform's binding constraint well before AI cost does, per the table above. Plan to replace it with a real background job queue before you need to.

---

## PART 14 — SECURITY

**Authentication:** every protected endpoint must verify a real, valid session server-side; never trust a client-asserted identity for anything.

**Authorization / tenant isolation — the single most important security requirement in this entire specification:**

> **USER A MUST NEVER be able to access, modify, or delete USER B's data — athletes, competitions, contacts, timeline events, intelligence items, or anything derived from them (dashboard counts, search results, AI chat answers) — under any circumstance, through any endpoint.**

Implement this as one shared, reusable scoping mechanism applied consistently everywhere (a single helper/middleware used by every query touching athlete-derived data), not as a one-off check re-implemented per route — consistency here is what prevents a newly-added endpoint from accidentally forgetting the check. A request for another user's data should return "not found," not "forbidden" — confirming that a given id exists but belongs to someone else is itself a data leak for a product whose whole premise is discretion about who's tracking whom.

**Admin permissions:** a separate, explicit, server-verified privilege check, structurally distinct from the tenant-scoping mechanism above (an admin bypasses tenant scoping entirely, deliberately) — implement this as its own clearly-named code path, never as a parameter that quietly disables the normal scoping check.

**API protection:** rate limiting on every AI-cost-incurring endpoint (Part 13); a reasonable request body size cap; CORS restricted to your actual known frontend origin(s), never a wildcard; a restrictive Content-Security-Policy; standard security headers (the source system uses Helmet for this — any equivalent is fine).

**Rate limiting:** key limits by authenticated user id where the route requires authentication (more accurate than IP, which either over-restricts shared networks or under-restricts IP-rotating abuse); fall back to IP-based limiting only for public, unauthenticated endpoints.

**Secret handling:** all credentials via environment variables / a secrets manager, never hardcoded in source, never logged, never returned in any API response or error message, never written into documentation with real values.

**Input validation:** validate every request body/query/param against a strict schema before touching the database; reject invalid input with a clear 400 rather than attempting to coerce it.

**Database access:** use a query builder/ORM with parameterized queries throughout — no raw string-concatenated SQL, which is how injection vulnerabilities happen.

**Stripe webhook verification:** always verify the webhook signature before processing any event; never process an unsigned or badly-signed payload.

**Cross-user data protection in every surface, explicitly enumerated (this is the acceptance-test list, restated as a build checklist):** athlete read/update/delete, timeline, contacts, intelligence, competitions, social data, dashboard aggregates, search, AI chat tool calls, bulk operations — every one of these must be tenant-scoped, with no exceptions, before this product can safely support a second paying customer.

---

## PART 15 — KNOWN PROBLEMS IN THE SOURCE SYSTEM

Listed with root cause, desired behavior, and priority. The rebuild should fix these, not reproduce them.

**1. No enforced multi-tenancy (CRITICAL).** Root cause: the ownership column exists and is written correctly on athlete creation, but no read or write query anywhere in the API actually filters by it. Desired behavior: full tenant scoping as specified in Parts 4, 5, and 14. Priority: **launch-blocking** — the product cannot safely support a second paying customer without this.

**2. Subscription status is not enforced server-side (CRITICAL).** Root cause: the paywall is a frontend-only blocking modal; no backend middleware checks subscription status before serving protected API routes. Desired behavior: server-side subscription enforcement as specified in Part 10. Priority: launch-blocking for a real commercial deployment (currently, in practice, any authenticated account gets full product access regardless of billing state).

**3. Follower-count provenance gap (HIGH).** Root cause: the Social Metrics Agent's extraction schema never asked the model for a source URL, and the storage schema has no source/date column for follower counts at all — unlike every other researched-fact category in the system. This is the direct mechanism behind a real reported bug: a stale follower count, once written, had no way to be flagged as outdated even as later research runs correctly found nothing new to report. Desired behavior: as specified in Part 7's "time-sensitive data provenance" requirement — store source, observed-date, and confidence alongside every follower count, and surface "as of {date}" in the UI. Priority: high — fix before treating any follower-count field as trustworthy.

**4. Personal-best/season-best forced onto every sport uniformly (HIGH).** Root cause and desired behavior: as specified in full in Part 8. Priority: high — a specific real example (a downhill mountain biker) produced a misleading result where a decontextualized qualifying-round split time was stored as a "season best," while that athlete's actual defining achievement (a major race win) was correctly researched but had no prominent place to be shown.

**5. Results Agent's personal-best/season-best marks also lack source attribution (HIGH).** Root cause: same architectural pattern as #3 — the extraction schema shows the model real citations for grounding but never asks it to name which one supports the specific mark returned, and no code-level check verifies it. Desired behavior: bring this agent up to the same citation-verification standard used by the majority of the other agents (Part 6/7). Priority: high, same root cause and fix pattern as #3.

**6. Feature flags UI is non-functional (MEDIUM, but actively misleading).** Root cause: the save endpoint accepts requests and returns success without persisting anything anywhere. Desired behavior: either build real persistence, or don't show a save control that lies about succeeding — remove/hide the feature until it's real. Priority: medium impact, but fix the deception regardless of priority — a UI control that claims success without doing anything is a trust problem in a product whose entire pitch is trustworthiness.

**7. Alerts/notification delivery does not exist (MEDIUM, actively misleading in the same way).** Root cause: per-category notification-frequency preferences can be configured and saved, and an in-app "Alerts" inbox exists (client-side read/unread tracking only, not server-persisted), but no email/push/Slack notification is ever actually sent by anything in the system — the "delivery channel" toggles in Settings are pure UI state with no backend behind them. Desired behavior: either implement real notification delivery for at least one channel (email is the simplest starting point), or clearly label this "not yet available" rather than presenting working-looking toggles. Priority: medium, same "don't lie about capability" principle as #6.

**8. Admin panel has real gaps beyond the two stub items above (MEDIUM).** No usage/cost tracking, no pipeline/job-run history, no user suspend/delete/impersonate capability, no Stripe-customer-id-per-user visibility in the customer list. See Part 9 for exactly what's feasible now versus what needs new backend work.

**9. Background scheduler doesn't scale (MEDIUM at current scale, HIGH beyond it).** A fixed-size batch on a fixed interval works for a small pilot roster but breaks its own freshness target well before AI cost becomes the binding constraint. See Part 13.

**10. AI chat page uses a mismatched light theme (LOW, cosmetic).** Every other authenticated page uses the dark theme described in Part 2; this one page doesn't. Simple fix, just don't reproduce the inconsistency.

**11. 3D visualization "hardening" items from the product's own roadmap remain unbuilt (LOW–MEDIUM).** Specifically: no filter-by-sport/region/freshness controls on the global map; pin placement uses a crude fixed offset rather than real event-location geocoding, and the geocoding itself is a small hardcoded country/city lookup table (two separate, inconsistent copies of it exist in different components) rather than a real geocoding service; the relationship graph never auto-refreshes and its edges have no click-to-see-evidence interaction; the "graceful fallback if 3D rendering fails" pattern is only properly implemented in one of five 3D components. None of these block a functioning MVP but are worth doing properly in a rebuild rather than copying the shortcuts.

**12. No real date-of-birth field.** Only an approximate integer age exists, set once and rarely refreshed, which silently drifts stale every year with no automatic increment. Recommend a real date field in the rebuild.

**13. Settings page has several sections that are pure UI mockup with no backend behind them** (Team invitations, several Integrations entries, API Keys) — reasonable to leave as clearly-labeled "coming soon" in an MVP, just don't present them as functional.

**14. National ranking is empty for the large majority of athletes across the source system's own testing.** Cause undetermined — may be genuine real-world data scarcity for national-level rankings (many federations don't publish them prominently) rather than a research-quality problem. Worth a small investigation before assuming it's fixable.

---

## PART 16 — TARGET PRODUCT

Base44 should build a product that **preserves** the genuinely good parts of the source system's architecture and UI/UX, and **fixes** the specific, now-well-understood defects above — not a wholesale reimagining, and not a blind reproduction of known bugs.

**Preserve:**
- The overall visual identity and UX described in Part 2, including the dossier's information hierarchy and the confidence+source-attribution presentation pattern.
- The two-phase research/extraction agent architecture and the code-level source-verification mechanism described in Parts 6–7 — this is genuinely sound engineering and the product's real differentiator.
- The "null over fabrication" philosophy, applied consistently.
- The overall product scope and page set from Part 2's sitemap.

**Fix, in priority order:**
1. **Secure, fully-enforced multi-tenancy** (Parts 4, 5, 14) — nothing else matters if this isn't right.
2. **Trustworthy data** — close the follower-count and PB/SB provenance gaps (Part 7, problems #3/#5), fix the sport-specific data model (Part 8).
3. **Proper SaaS administration** — a real, honest admin console (Part 9) with no fake/non-persisting controls.
4. **Reliable billing** — server-side subscription enforcement (Part 10, problem #2), a loud rather than silent failure mode for billing initialization.
5. **An excellent athlete dossier** — this already works well in the source system; keep investing in it as the product's centerpiece.
6. **Strong research provenance** — apply the citation-verification standard already used by most agents to the two that currently lack it.
7. **Clear UX** — fix the two silently-misleading controls (feature flags, alerts) and the theme inconsistency; be honest in the UI about what's not built yet rather than presenting non-functional controls as working.
8. **Scalability** — a real job queue for the background refresh scheduler before you need it, not after.
9. **Maintainability** — the source system's pattern of small, self-contained, independently-testable agents each owning one category of fact, with a shared verification layer, is a good pattern to keep as the system grows.

---

## PART 17 — ACCEPTANCE CRITERIA

A comprehensive checklist. Every item must be independently verifiable — ideally with an automated test using two distinct real user accounts for every cross-tenant check, not just "user A can see their own data" (which proves nothing about isolation).

### Multi-tenancy (test with two real, distinct user accounts, User A and User B)
- [ ] User A cannot retrieve User B's athlete by id (returns not-found, not forbidden).
- [ ] User A cannot update User B's athlete.
- [ ] User A cannot delete User B's athlete.
- [ ] User A cannot see User B's timeline events.
- [ ] User A cannot see User B's contacts.
- [ ] User A cannot see User B's intelligence items.
- [ ] User A cannot see User B's competitions.
- [ ] User A's dashboard aggregate counts include only User A's own athletes.
- [ ] User A's search results include only User A's own athletes.
- [ ] The AI chat cannot retrieve or reference User B's athlete data when User A is asking, even if User A explicitly asks about an athlete by a name/id they've guessed.
- [ ] A bulk-import or bulk-admin operation triggered by User A never touches User B's data.
- [ ] Admin access is a separate, explicit, server-verified code path — confirmed by testing that an admin account CAN see all users' data while a non-admin account cannot, using the same test methodology as above.

### Billing
- [ ] Subscription status is enforced server-side on every AI-cost-incurring endpoint — confirmed by calling the API directly (not just observing the UI) with a non-subscribed account and receiving a rejection.
- [ ] An admin account bypasses subscription enforcement.
- [ ] Checkout completes successfully end-to-end in a live test.
- [ ] A webhook-driven subscription update is reflected in the application's local state, verified directly (not just assumed from the webhook handler's code).

### Data trust
- [ ] An unknown follower count displays as "unknown" in the UI, never as zero.
- [ ] Every stored follower count that has a value also has a source and an observed/checked date attached.
- [ ] A sport where "personal best" doesn't apply displays that fact explicitly, never a fabricated or misleading placeholder value.
- [ ] A major career achievement (e.g., a championship win) has a first-class, prominent representation in the dossier, independent of whether that sport has a meaningful "personal best."
- [ ] Every displayed research claim (intelligence item, timeline event, contact, sponsorship, competition) that has a source shows a confidence score and a source domain/link.
- [ ] A source URL claimed by the extraction step that does not match a real citation from the research step is rejected — confirmed by a test that injects a research response with a limited citation set and verifies a non-matching claimed URL is discarded, not stored.
- [ ] A duplicate event (same date + same normalized title) within one research pass is rejected, not stored twice.
- [ ] A failed AI call for one agent does not corrupt or discard any other agent's already-successful results for the same athlete.
- [ ] Bulk athlete import is capped at a defined maximum per request, with a clear error message when exceeded.
- [ ] Every AI-cost-incurring endpoint has a per-user rate limit, confirmed by exceeding it in a test and receiving a 429.
- [ ] Competition status (upcoming/completed/cancelled) is always consistent with the competition's date, verified by checking a sample of completed-date competitions never show as "upcoming."

### Admin
- [ ] Admin can view all users, with real (not fabricated) plan/status/signup data.
- [ ] Every admin console control that claims to save/persist something actually does — verified by reloading the page after a save and confirming the change is still there.
- [ ] No admin metric is displayed with a fabricated or placeholder value — if a metric can't yet be computed, the UI says so rather than showing a fake number.

---

## PART 18 — INSTRUCTIONS FOR BASE44

Build Athlete Intelligence — a B2B SaaS platform that uses a two-phase, citation-verified AI research pipeline to produce evidence-attributed, confidence-scored intelligence dossiers on elite athletes for sports federations, clubs, and agencies. Specifically:

1. **Understand the product before writing any code.** Read this entire document first. This is not a generic AI chatbot or a generic CRM — it is a research-and-verification pipeline with a specific, deliberate trust architecture, wrapped in a specific, deliberate visual identity. Both matter equally.

2. **Preserve the current visual identity and UX exactly as specified in Part 2** — the dark forest-green/lime/lavender color system with its exact token values, the specific page set and information hierarchy (especially the athlete dossier), the 3D visualizations, and the confidence+source-attribution presentation pattern that must appear on every researched fact throughout the product.

3. **Preserve the core intelligence architecture exactly as specified in Parts 6 and 7** — the ten-agent research/extraction pattern, the code-level citation-verification step that never trusts a model's source claim without checking it against real citations, the confidence-floor-plus-domain-authority scoring mechanism, and the "unknown is always better than invented" philosophy applied consistently in every prompt and every extraction schema.

4. **Implement secure multi-tenancy from the start, not as an afterthought** — every table and every query touching athlete-derived data must be scoped to the owning user, enforced server-side on every single endpoint including aggregates, search, and the AI chat's internal database tools. Use the acceptance criteria in Part 17 as your test suite for this, with two real distinct accounts, testing the negative case explicitly ("User A tries to access User B's data and gets nothing") — not just the positive case.

5. **Implement a real SaaS admin console** as specified in Part 9 — genuinely useful, nothing fabricated, nothing that silently fails to persist.

6. **Implement proper subscription enforcement server-side**, not just a frontend paywall modal, per Part 10.

7. **Preserve and extend evidence/provenance** — bring every researched-fact category, including the two that currently lack it (follower counts, personal-best/season-best marks), up to the same citation-verification and source-attribution standard used by the majority of the system today, per Part 7.

8. **Never fabricate data.** Every extraction prompt must instruct the model to return null/unknown rather than guess, and every extraction pipeline must independently verify source claims in code rather than trusting the model's word.

9. **Use null/unknown explicitly wherever evidence is unavailable**, and render that state honestly in the UI (never silently as zero, never as a blank that looks like a bug).

10. **Treat sport-specific metrics correctly**, per Part 8 — do not force every sport into a track-and-field-shaped data model; give career-defining achievements their own first-class, prominent representation independent of whether a numeric "personal best" applies to that sport.

11. **Build this as a production-quality commercial SaaS product** — real error handling, real rate limiting, real security headers, real input validation, real secret management, and an honest relationship between what the UI claims to do and what the backend actually does.

**Do not replace this product with a generic CRM, a generic AI chatbot dashboard, or a generic athlete database.** Every design and architecture decision in this document exists to serve one specific promise: every fact in this product can be traced to where it came from and how confident the system is in it. If a proposed shortcut would break that promise, don't take it — flag it instead.

**Do not pretend everything described here is already perfect.** Where this document identifies something as a known defect (Part 15) or a required fix (marked **[REQUIRED FOR TARGET MVP]** throughout), implement the corrected behavior, not the defect. Where something is genuinely unknown or unmeasured (for example, real per-token AI costs, per Part 13), do not invent a number — state clearly what needs to be measured once the system is live, and build the instrumentation to measure it rather than guessing.
