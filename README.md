# QuotePro AI

AI-powered quoting and lead nurturing platform for residential cleaning companies. Available as an iOS mobile app (Expo) and a web SaaS dashboard, sharing a single Express backend.

---

## What It Does

- **Instant quotes** — AI generates accurate cleaning quotes in seconds based on home details, service type, and your pricing rules
- **QuotePro Autopilot** — 4-step automated lead nurturing pipeline (quote sent → follow-up → objection handling → booking confirmation)
- **Lead Finder** — Discover local leads and generate personalized outreach with AI
- **Staff Field Mode** — Cleaners clock in/out via PIN on mobile, complete jobs, and attach photos
- **Recurring Schedules** — Auto-generate jobs for repeat clients
- **QuickBooks Online sync** — Automatically create invoices when jobs are completed
- **Booking Widget** — Embeddable widget for your website to capture leads

---

## Subscription Tiers

| Plan | Price | Quotes/mo |
|------|-------|-----------|
| Free | $0 | 3 |
| Starter | $19/mo | Unlimited |
| Growth | $49/mo | Unlimited + Autopilot |
| Pro | $99/mo | Everything |

Annual billing available at 20% discount.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native / Expo (iOS-first) |
| Web | React + Vite + Tailwind CSS |
| Backend | Express + TypeScript |
| Database | PostgreSQL + Drizzle ORM |
| AI | Anthropic Claude (via `server/services/ai.service.ts`) |
| Payments | Stripe (web checkout) + RevenueCat (mobile IAP) |
| Email | SendGrid |
| Auth | JWT (cookie-based) |

---

## Project Structure

```
/
├── client/          # Expo mobile app (React Native)
│   ├── screens/     # App screens
│   ├── components/  # Shared UI components
│   ├── context/     # React context (auth, subscription, theme)
│   ├── hooks/       # Custom hooks
│   ├── lib/         # API client, analytics, utilities
│   └── navigation/  # React Navigation stacks & tabs
├── web/             # Web SaaS dashboard (React + Vite)
│   └── src/
│       ├── pages/   # Page components
│       ├── components/ # Shared UI
│       └── lib/     # API client, auth context
├── server/          # Express backend
│   ├── routers/     # API route handlers
│   ├── services/    # Business logic (AI, email, etc.)
│   └── db.ts        # Database connection
├── shared/          # Shared TypeScript types & Drizzle schema
└── .github/
    └── workflows/
        └── ci.yml   # GitHub Actions CI
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Expo Go app (for mobile development)

### Environment Variables

Copy and fill in the following secrets:

```
DATABASE_URL=
ANTHROPIC_API_KEY=
STRIPE_WEBHOOK_SECRET=
REVENUECAT_API_KEY=
REVENUECAT_WEBHOOK_SECRET=
SENDGRID_API_KEY=
JOBBER_CLIENT_ID=
JOBBER_CLIENT_SECRET=
INTUIT_CLIENT_ID=
INTUIT_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
ZOHO_SMTP_USER=
ZOHO_SMTP_PASS=
```

### Run Locally

```bash
# Install dependencies
npm install

# Start the backend (port 5000)
npm run server:dev

# Start the Expo dev server (port 8081)
npm run expo:dev
```

Scan the QR code with Expo Go on your device, or open `http://localhost:8081` for the web version.

---

## CI/CD

GitHub Actions runs on every push and pull request to `main`:

- **Type check** — `tsc --noEmit` across client and shared code
- **Lint** — ESLint
- **Tests** — Jest
- **Web build** — Vite production build
- **Server build** — TypeScript compilation check

See [`.github/workflows/ci.yml`](.github/workflows/ci.yml) for the full pipeline.

---

## Key Commands

| Command | Description |
|---------|-------------|
| `npm run server:dev` | Start Express backend with hot reload |
| `npm run expo:dev` | Start Expo dev server |
| `npm run check:types` | TypeScript type check (client + shared) |
| `npm run lint` | ESLint |
| `npm run test` | Jest tests |
| `cd web && npx vite build` | Production web build |

---

## QuotePro MCP Server

QuotePro exposes an MCP (Model Context Protocol) server that allows AI assistants to calculate cleaning quotes and commercial bids directly.

### Install in Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "quotepro": {
      "url": "https://getquotepro.ai/mcp"
    }
  }
}
```

### Available Tools

1. **get_cleaning_quote** — Residential quotes with Good/Better/Best tiers
2. **get_commercial_bid** — Commercial janitorial bid calculator
3. **get_autopilot_info** — Learn about QuotePro Autopilot

### Example Prompts

> "How much should I charge to clean a 3BR 2BA house in Philadelphia biweekly?"

> "What's a fair monthly bid for a 4,000 sqft office in Dallas cleaned 3x per week?"

> "How does QuotePro Autopilot work?"
