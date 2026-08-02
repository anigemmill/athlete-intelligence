# Athlete Intelligence

AI-powered sports intelligence platform for national sport organisations, professional clubs, and talent agencies.

Track elite athletes. Discover relationships. Understand career trajectories. Act on verified intelligence.

---

## What it does

Athlete Intelligence continuously monitors the web for information about your tracked athletes and structures everything it finds into a verified, confidence-scored dossier:

- **Competition results** — career history and upcoming calendar
- **Rankings** — world and national positions with trend tracking
- **Contacts** — coaches, agents, sponsors, federation representatives
- **Intelligence feed** — news, interviews, sponsorships, career changes
- **Career timeline** — interactive 3D chronology of milestones
- **Relationship graph** — 3D force-directed network of athlete connections
- **AI analyst** — chat interface backed by structured platform data, not model hallucination

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 7, Tailwind CSS v4, Three.js, Framer Motion |
| Backend | Node.js ESM, Express 5, Drizzle ORM |
| Database | PostgreSQL |
| Auth | Clerk (Replit-managed) |
| AI — Live research | Perplexity Sonar (via OpenRouter) |
| AI — Extraction | GPT-4o (via OpenAI) |
| Billing | Stripe |
| Monorepo | pnpm workspaces |

---

## Quick start

```bash
# Install
pnpm install

# Configure
cp .env.example .env
# Fill in DATABASE_URL, Clerk keys, OpenAI key, OpenRouter key, Stripe key

# Set up database
pnpm --filter @workspace/db run push

# Run (two terminals)
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/web run dev
```

See [docs/setup.md](docs/setup.md) for the full setup guide.

---

## Documentation

| Document | Contents |
|---|---|
| [docs/architecture.md](docs/architecture.md) | System overview, frontend + backend architecture, auth, billing |
| [docs/ai-architecture.md](docs/ai-architecture.md) | AI pipeline, all prompts, confidence scoring, known weaknesses |
| [docs/database.md](docs/database.md) | All tables, columns, relationships, indexes |
| [docs/api.md](docs/api.md) | All API endpoints with request/response shapes |
| [docs/design-system.md](docs/design-system.md) | Design tokens, DS components, Tailwind config |
| [docs/technical-debt.md](docs/technical-debt.md) | Known issues ranked by priority |
| [docs/roadmap.md](docs/roadmap.md) | Completed work, current status, next milestones |
| [docs/setup.md](docs/setup.md) | Clone, install, configure, run, deploy |
| [CLAUDE.md](CLAUDE.md) | Handover guide for Claude Code |

---

## Repository structure

```
artifacts/
  web/          React SPA
  api-server/   Express API + AI pipeline
lib/
  db/           Drizzle schema + PostgreSQL connection
  api-zod/      Shared request/response Zod schemas
  api-client-react/  TanStack Query hooks
  integrations-openai-ai-server/  OpenAI client
  integrations-openrouter-ai/     OpenRouter/Perplexity client
docs/           Documentation
CLAUDE.md       Claude Code handover guide
```

---

## Licence

MIT — see [LICENSE](LICENSE)
