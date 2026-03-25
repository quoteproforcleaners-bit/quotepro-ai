# QuotePro AI — Full Product Audit Document

> This document is intended for an external AI or human reviewer to conduct a comprehensive audit of the QuotePro AI SaaS platform. It includes the full product context, architecture, feature inventory, data model, API surface, code structure, and known decisions so that an auditor can identify improvements, risks, and gaps.

---

## 1. Product Overview

**Product Name**: QuotePro AI
**Category**: Vertical SaaS for residential cleaning companies
**Target User**: Small-to-mid residential cleaning business owners (solo operators to ~10-person teams)
**Core Value Proposition**: Replace spreadsheets and guesswork with AI-assisted quoting, CRM, job tracking, follow-up automation, and revenue intelligence — built specifically for the cleaning industry.

### Business Model

| Tier | Price | Key Limits |
|------|-------|-----------|
| Free | $0 | 3 total quotes (lifetime), no AI, no CRM |
| Starter | $19/mo | 20 quotes/month, basic CRM, no AI |
| Growth | $49/mo or $39/mo annual | Unlimited quotes, all AI features, automations |
| Pro | $99/mo or $79/mo annual | Everything + integrations (QuickBooks, Jobber) |

- **14-day free trial** on paid tiers, with countdown banner
- **Referral program**: Each referral that converts earns the referrer +1 free month
- **Web subscriptions**: Stripe Billing (checkout + portal)
- **iOS subscriptions**: RevenueCat (in-app purchase, iOS only)

---

## 2. Platform Surfaces

### 2a. Web Application
- React 19 + TypeScript, served from Express at `/app`
- React Router v6 with a 248px sidebar layout
- Design system: "Warm Minimal" — off-white backgrounds, cream/sand palette, primary color customizable per business
- Dark mode supported
- Command palette at ⌘K
- i18n: English, Spanish, Portuguese, Russian (react-i18next)

### 2b. iOS Mobile Application
- React Native (Expo SDK 54) + TypeScript
- Expo Go compatible (no custom native modules beyond pre-approved list)
- iOS 26 Liquid Glass design language
- Bottom tab navigation: Dashboard, Quotes, Customers, Jobs, More
- Additional tabs: Lead Radar (Lead Finder), AI Assistant, Growth, Calendar, Settings
- Dark mode supported

### 2c. Public-Facing Pages
- `/q/:token` — Customer-facing quote acceptance page (view, accept, select tiers, pay deposit, view testimonials)
- `/intake/:code` — AI-powered intake form for homeowners to self-describe their cleaning needs
- `/b/:slug` — Public booking/lead-capture page per business
- Calculator landing pages for SEO (dynamically generated via `CalcDefinition` objects)
- Landing page at root (`/`) served from `server/templates/landing-page.html`

---

## 3. Technology Stack

### Frontend (Web)
- React 19.1.0
- TypeScript
- React Router v6
- TanStack React Query v5
- i18next / react-i18next
- Lucide React (icons)
- Tailwind CSS (via PostCSS)
- Vite (build tool)

### Frontend (Mobile)
- React Native 0.81.5
- Expo SDK 54
- React Navigation 7
- React Native Reanimated
- React Native Gesture Handler
- Expo Glass Effect (iOS 26 liquid glass)
- TanStack React Query
- @expo/vector-icons (Feather icons)
- expo-notifications, expo-haptics, expo-camera, expo-image-picker, expo-location

### Backend
- Node.js + TypeScript
- Express.js
- tsx (TypeScript execution)
- express-session + connect-pg-simple (session management)
- Drizzle ORM + drizzle-zod
- PostgreSQL (Neon-backed)
- node-cron (scheduled jobs)

### AI
- OpenAI gpt-4o-mini (exclusively — no other models)
- Accessed via Replit AI Integrations (`AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`)
- Centralized client in `server/aiClient.ts`: 15s timeout, 2 retries with 1s/2s backoff, retry on 429/500/502/503, logs all calls to `ai_usage_logs` table

### External Services
| Service | Purpose |
|---------|---------|
| Stripe | Web subscription billing + Stripe Connect for customer payments |
| RevenueCat | iOS in-app subscription purchases |
| Twilio | SMS sending |
| SendGrid | Transactional email |
| Google Calendar | OAuth2 calendar sync |
| QuickBooks Online | OAuth2 customer/invoice sync (Pro tier) |
| Jobber | OAuth2 field service sync (Pro tier) |

---

## 4. Project File Structure

```
/
├── client/                    # Expo mobile app
│   ├── App.tsx
│   ├── navigation/
│   │   ├── MainTabNavigator.tsx
│   │   └── RootStackNavigator.tsx
│   ├── screens/               # ~50 screens
│   ├── components/
│   ├── constants/             # theme.ts, Colors
│   └── lib/                   # query-client, subscription, etc.
│
├── web/                       # React web app
│   ├── src/
│   │   ├── pages/             # ~45 pages
│   │   ├── components/        # Layout, AIChatBubble, Card, etc.
│   │   └── lib/               # auth, query-client, aiToast, subscription
│   └── dist/                  # built static files served by Express
│
├── server/                    # Express backend
│   ├── index.ts               # app entry, cron jobs, static serving
│   ├── aiClient.ts            # centralized AI client (NEW)
│   ├── clients.ts             # OpenAI, Stripe, SendGrid singletons
│   ├── db.ts                  # Drizzle DB + pool
│   ├── middleware.ts           # requireAuth, requireStarter, requireGrowth, requirePro
│   ├── storage.ts             # all DB query helpers
│   ├── calculator-engine.ts   # dynamic SEO calculator engine
│   ├── helpers.ts             # email/SMS builders, PDF, follow-up logic
│   └── routers/               # 12 router files (split by domain)
│       ├── adminRouter.ts
│       ├── aiRouter.ts        # largest file: all AI endpoints + messaging
│       ├── authRouter.ts
│       ├── automationsRouter.ts
│       ├── businessRouter.ts
│       ├── customersRouter.ts
│       ├── integrationsRouter.ts
│       ├── jobsRouter.ts
│       ├── pricingRouter.ts
│       ├── publicRouter.ts
│       ├── quotesRouter.ts
│       └── adminRouter.ts
│
└── shared/
    ├── schema.ts              # Drizzle table definitions (69 tables)
    └── pricingEngine.ts       # Shared pricing calculation logic
```

---

## 5. Database Schema (69 Tables)

### Core Business Entities
| Table | Description |
|-------|-------------|
| `users` | Auth accounts: email/password, Apple SSO, Google SSO, subscription tier, Stripe subscription ID, trial dates, referral code, referral credits |
| `businesses` | Business profile per user: company name, branding, communication preferences, language settings, primary color, booking link, email/SMS signatures |
| `pricingSettings` | Configurable pricing: hourly rate, minimum ticket, service type multipliers, add-on prices, frequency discounts, Good/Better/Best tier offsets |
| `customers` | CRM contacts: name, phone, email, address, notes, preferred language, source |
| `quotes` | Quotes with line items, status, tier selection, public token, expiry, Stripe payment info, follow-up state |
| `quoteLineItems` | Individual line items on a quote |
| `jobs` | Scheduled jobs linked to quotes: status progression, assigned employees, checklist, notes, photos |
| `employees` | Team members with role and contact info |

### AI & Automation
| Table | Description |
|-------|-------------|
| `quoteFollowUps` | Scheduled follow-up sequence entries per quote |
| `followUpTouches` | Each individual follow-up send attempt log |
| `automationRules` | Custom trigger/action pairs for business automation |
| `growthTasks` | AI-generated action items for business growth |
| `growthTaskEvents` | Completion log for growth tasks |
| `campaigns` | Email marketing campaign records |
| `salesStrategySettings` | Stored sales strategy configuration |
| `reviewRequests` | Review request send log |
| `ai_usage_logs` | Every AI API call: route, tokens, latency, success/error |

### Jobs & Scheduling
| Table | Description |
|-------|-------------|
| `jobChecklistItems` | Per-job checklist line items |
| `jobPhotos` | Before/after photos per job |
| `jobStatusHistory` | Audit log of job status changes |
| `jobNotes` | Internal notes on jobs |
| `recurringCleanSeries` | Recurring job series config: frequency, schedule |

### Revenue & Analytics
| Table | Description |
|-------|-------------|
| `analyticsEvents` | Custom event log for product analytics (TTL: 90 days) |
| `badges` | Gamification achievements earned by users |
| `streaks` | Activity streak tracking (daily/weekly) |
| `invoicePackets` | Generated invoice packet metadata |
| `calendarEventStubs` | Calendar event metadata for ICS/Google Calendar |

### Social & Lead Management
| Table | Description |
|-------|-------------|
| `socialLeads` | Inbound social media leads (Facebook, Instagram, TikTok, Nextdoor) |
| `socialConversations` | Threaded conversations with leads |
| `socialMessages` | Individual messages in a conversation |
| `socialAutomationSettings` | Auto-response and DM settings per platform |
| `socialOptOuts` | Opt-out tracking per contact |
| `channelConnections` | Connected social platform credentials |
| `attributionEvents` | Lead-to-quote attribution tracking |

### Integrations
| Table | Description |
|-------|-------------|
| `googleCalendarTokens` | OAuth2 tokens for Google Calendar |
| `qboConnections` | QuickBooks Online OAuth2 tokens |
| `qboCustomerMappings` | Customer ID mappings between QuotePro and QBO |
| `qboInvoiceLinks` | Invoice ID mappings |
| `qboSyncLog` | Sync attempt history |
| `apiKeys` | Generated API keys for webhook/Zapier integrations |
| `webhookEndpoints` | Configured webhook destination URLs |
| `webhookEvents` | Webhook event type subscriptions |
| `webhookDeliveries` | Delivery attempt log with retry state |

### Other
| Table | Description |
|-------|-------------|
| `communications` | Email/SMS send log |
| `tasks` | User task list items |
| `pushTokens` | Expo push notification device tokens |
| `userPreferences` | Per-user UI preferences (dismissed banners, etc.) |
| `pricingAnalyses` | Stored AI pricing analysis results |
| `salesRecommendations` | AI-generated sales recommendations per quote |
| `intake requests` | Homeowner self-submitted intake forms |
| `customerMarketingPrefs` | Per-customer marketing opt-in/out |
| `growthAutomationSettings` | Growth feature config (review links, campaign settings) |
| `emailSequences` | Drip sequence definitions |
| `emailSequenceEnrollments` | Customer enrollment in email sequences |
| `cleanerScheduleNotifications` | Cleaner schedule alerts |

---

## 6. API Route Inventory (~180 endpoints)

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/auth/google/start` + `/callback`
- `GET /api/auth/apple/start`

### Business & Settings
- `GET/PUT /api/business`
- `GET/PUT /api/settings`
- `PUT /api/settings/language`
- `GET/PUT /api/booking-availability`
- `GET /api/business/lead-capture-settings`

### Quotes
- `GET /api/quotes` — list with filters
- `POST /api/quotes` — create (quota enforced by tier)
- `GET/PUT/DELETE /api/quotes/:id`
- `POST /api/quotes/:id/send` — email/SMS delivery
- `POST /api/quotes/:id/send-with-pdf`
- `POST /api/quotes/:id/pdf` — PDF generation
- `POST /api/quotes/:id/generate-email` — AI-drafted email
- `GET /api/quotes/:id/scheduled-followups`
- `GET /api/quotes/:id/recommendations`
- `GET /api/quotes/:id/followup-preview`
- `POST /api/quotes/:id/calendar-event`
- `POST /api/quotes/:id/invoice-packet`
- `POST /api/quotes/:id/commercial-pdf`
- `GET /api/quotes/count` — quota status
- `GET /api/quotes/unscheduled-accepted`

### Customers
- `GET /api/customers` — list with search
- `POST /api/customers`
- `GET/PUT/DELETE /api/customers/:id`
- `GET /api/customers/:id/last-job`
- `GET /api/customers/:id/marketing-prefs`
- `POST /api/intake-requests/:id/ai-quote` — AI-generated quote from intake form (Pro)

### Jobs
- `GET /api/jobs` — list + filter
- `POST /api/jobs`
- `GET/PUT/DELETE /api/jobs/:id`
- `GET /api/jobs/calendar`
- `GET/POST/DELETE /api/jobs/:id/notes`
- `POST /api/jobs/:id/photos`
- `POST /api/jobs/:id/generate-update-token`

### AI Endpoints (Growth tier+)
- `POST /api/ai/agent-chat` — 3-mode AI advisor (My Business, Coach Me, Teach Me)
- `POST /api/ai/walkthrough-extract` — Natural language → structured quote fields
- `POST /api/ai/quote-descriptions` — AI line item descriptions
- `POST /api/ai/pricing-suggestion` — Good/Better/Best tier pricing AI
- `POST /api/ai/generate-followup` — Draft follow-up message
- `POST /api/ai/generate-message` — Contextual email or SMS draft
- `POST /api/ai/generate-review-email` — Review request email generator
- `POST /api/ai/generate-campaign-content` — Marketing email generator
- `POST /api/ai/job-update-message` — Customer job update message
- `POST /api/ai/analyze-quote` — Quote strength analysis
- `POST /api/ai/sales-chat` — Sales coaching conversation
- `POST /api/ai/closing-message` — Objection-handling message draft
- `POST /api/ai/objection-extract` — Parse and respond to objections
- `POST /api/ai/communication-draft` — General communication drafter
- `POST /api/lead-finder/leads/:id/generate-replies` — Reply suggestions for social leads

### Growth & Automations
- `GET/POST /api/automations`
- `GET/PUT /api/growth-automation-settings`
- `GET /api/campaigns` + `POST /api/campaigns`
- `POST /api/campaigns/:id/send`
- `GET /api/followup-queue`
- `GET/POST/DELETE /api/follow-ups`
- `GET /api/upsell-opportunities`
- `GET /api/rebook-candidates`
- `GET /api/growth-tasks`
- `POST /api/streaks/action`
- `GET /api/weekly-recap`

### Revenue & Reports
- `GET /api/forecast`
- `GET /api/reports/revenue`
- `GET /api/reports/stats`
- `GET /api/revenue/pipeline`
- `GET /api/revenue/unfollowed`
- `GET /api/badges`
- `GET /api/ratings/summary`

### Social / Lead Finder
- `GET/POST /api/social/leads`
- `GET/PUT /api/social/leads/:id`
- `GET /api/social/conversations`
- `GET/POST /api/social/conversations/:id/messages`
- `GET/POST /api/social/connections`
- `GET/PUT /api/social/automation`
- `POST /api/social/tiktok-lead`
- `POST /api/social/simulate-dm`

### Pricing
- `GET/PUT /api/pricing-settings` (or `/api/settings`)
- `POST /api/pricing/analyze` — AI-powered pricing analysis
- `GET/POST/DELETE /api/pricing/jobs`
- `GET/POST/DELETE /api/pricing/rules`
- `POST /api/pricing/calculate`
- `POST /api/pricing/questionnaire`
- `POST /api/pricing/publish`

### Intake & Booking
- `GET /api/intake-requests`
- `GET /api/intake-requests/count`
- `GET /api/intake-requests/my-link`
- `POST /api/intake-requests` (public)
- `GET /api/booking-availability`

### Subscriptions & Payments
- `GET /api/subscription`
- `POST /api/subscription/create-checkout`
- `POST /api/subscription/create-portal`
- `POST /api/subscription/webhook` (Stripe webhook)
- `POST /api/subscription/sync`
- `POST /api/subscription/upgrade`
- `GET /api/subscription/config`
- `POST /api/stripe/create-payment`
- `GET/POST /api/stripe/connect`
- `POST /api/stripe/disconnect`

### Integrations (Pro tier)
- `GET /api/integrations/qbo/connect` + `/callback` + `/status` + `/logs`
- `GET /api/integrations/jobber/connect` + `/callback` + `/status` + `/logs`
- `GET /api/google-calendar/connect` + `/callback` + `/status`
- `DELETE /api/google-calendar/disconnect`
- `GET/POST /api/api-keys`
- `DELETE /api/api-keys/:id`
- `GET/POST /api/webhook-endpoints`
- `POST /api/webhook-endpoints/:id/test`

### Admin
- `GET /api/admin/grant-pro` — manual tier upgrade
- `GET /api/admin/deleted-records` — soft-delete recovery
- `POST /api/admin/restore/:type/:id`
- `GET /api/admin/ai-usage` — AI usage metrics (calls/day, error rate, avg latency, tokens)

### Employees & Schedule
- `GET/POST /api/employees`
- `GET/PUT/DELETE /api/employees/:id`
- `POST /api/schedule/publish`
- `GET /api/schedule/week-jobs`
- `POST /api/schedule/ack/:token`

---

## 7. Feature Inventory

### Quoting Engine
- Multi-step quote builder: service type, property size, bedrooms/bathrooms, add-ons, frequency
- Good/Better/Best tiered pricing with customizable offsets
- AI pricing suggestions based on property data and history
- Recurring quote series with frequency discounts
- Quote PDF export (Expo Print on mobile, server-side HTML on web)
- Customer-facing quote page: tier selection, add-on toggling, deposit payment via Stripe
- Public quote link with expiry
- Stripe Connect for customer deposit/payment collection

### CRM
- Customer list with search, filter, notes
- Quote history per customer
- Communication log (email/SMS sent)
- Customer preferred language
- Marketing opt-in/out tracking
- Last job date tracking
- "Rebook candidates" — customers overdue for their next clean

### Job Management
- Job creation from accepted quote
- Status progression: Scheduled → In Progress → Completed
- Assigned employees per job
- Checklist items with completion tracking
- Before/after photo uploads
- Internal job notes
- Customer-facing live update page (token-gated)
- AI-generated customer update messages
- Recurring job series management (weekly/biweekly/monthly)
- Schedule publish with cleaner notifications (email + push)

### AI Features
- **AI Quote Builder (Walkthrough AI)**: Describe a job in natural language → AI extracts structured fields (beds, baths, sqft, service type, add-ons, frequency, pets) → auto-populates quote
- **AI Agent (3 modes)**:
  - *My Business*: Answers questions about the user's own business data
  - *Coach Me*: Sales coaching and script guidance
  - *Teach Me*: Cleaning industry education and best practices
- **AI Message Drafting**: Contextual email and SMS drafts for any quote/customer status
- **AI Follow-up Automation**: Schedules and sends follow-up messages for unaccepted quotes at configured intervals; Starter tier capped at 3 AI sends/month
- **AI Campaign Generator**: Marketing emails for segments (dormant, new, loyal)
- **AI Review Request**: Personalized review request emails with Google Review link
- **AI Pricing Analysis**: Analyzes historical jobs to identify underpriced work, missing surcharges, market positioning
- **AI Upsell Recommendations**: Identifies customers ready for add-ons or upgrades
- **AI Sales Strategy**: Personalized playbook for revenue growth
- **AI Closing Message**: Objection-handling message drafts
- **AI Commercial Quote**: Scope generation for commercial/multi-unit properties
- **Generate Replies**: Suggested reply messages for social media leads

### Follow-Up System
- Configurable follow-up schedule per business (day 1, 3, 7, custom)
- AI-drafted message per touch
- Send via email or SMS
- Follow-up queue with one-click send
- Monthly AI send cap enforcement (Starter: 3/month)

### Growth Features
- Weekly growth tasks with AI-generated action items
- Gamification: streaks, badges, achievement notifications
- Campaign email marketing (segments by customer type)
- Reactivation campaigns for dormant customers
- Review request automation
- Referral program: unique referral code per business, +1 free month per conversion
- Lead Finder: Social media lead tracking (Facebook, Instagram, TikTok, Nextdoor)
- Social DM automation and opt-out management
- Revenue forecast and pipeline view
- Weekly recap report

### Revenue Intelligence
- Revenue pipeline (unaccepted quotes by stage)
- Forecast modeling
- Reports: revenue over time, conversion rates, average ticket size
- Unfollowed revenue (quotes with no follow-up sent)
- Customer lifetime value indicators

### Integrations
- **QuickBooks Online**: Sync customers and invoices (Pro)
- **Jobber**: Sync clients and jobs (Pro)
- **Google Calendar**: Sync accepted jobs (all tiers)
- **Zapier/Make**: Webhook API with HMAC-SHA256 signing
- **Stripe Connect**: Receive customer payments directly
- **Twilio**: SMS delivery
- **SendGrid**: Email delivery

### Onboarding
- 7-step guided onboarding (web + mobile)
- Pro Setup Checklist (progress-tracked)
- Avatar builder for business profile
- Help Guide with feature walkthrough

### Settings & Configuration
- Business profile (name, logo, address, contact info)
- Branding: primary color, email/SMS signatures, sender name/title
- Pricing settings: hourly rate, minimum ticket, service type multipliers, add-on prices
- Communication language (outbound customer language)
- App language (UI language)
- Follow-up schedule configuration
- Automations hub
- Employee management
- Booking availability windows
- Notification preferences

---

## 8. Subscription Tier Enforcement

### Backend Middleware (server/middleware.ts)
- `requireAuth` — session check
- `requireStarter` — tier must be starter, growth, or pro
- `requireGrowth` — tier must be growth or pro
- `requirePro` — tier must be pro

### Frontend Gating (web)
- `ProGate` component with `minTier` prop wraps premium pages
- `useSubscription()` hook returns: `tier`, `isPro`, `isGrowth`, `isStarter`, `isOnTrial`

### Frontend Gating (mobile)
- `SubscriptionContext` with same tier flags
- `PaywallScreen` shown on blocked feature tap
- Quote counter shown in header (Starter users: "X of 20 used this month")

### Trial System
- 14-day trial tracked via `trial_started_at` on users table
- Countdown banner in Layout: amber when ≤7 days remain, red when ≤2 days remain
- Dismissible per session (stored in localStorage)

---

## 9. AI Architecture Detail

### Centralized Client (server/aiClient.ts)
```typescript
callAI(messages, options) → { content: string, tokensUsed: number }
```
- **Timeout**: 15-second AbortController per request
- **Retries**: Up to 2 retries on HTTP 429, 500, 502, 503 (not 400, 401)
- **Backoff**: 1s after 1st failure, 2s after 2nd failure
- **Logging**: Every call → `ai_usage_logs` (route, tokens, latency, success, error_code)
- **Error type**: `AIError` class with `code`, `retryable`, `statusCode`
- **Model**: Always `gpt-4o-mini` — never changes

### Routes Using callAI()
- `agent-chat` — soft fallback: returns error message inline in chat
- `walkthrough-extract` — returns HTTP 503 on failure
- `generate-campaign-content` — falls back to a pre-written template
- `generate-review-email` — falls back to a generic review email
- `generate-message` — returns HTTP 503 on failure
- `ai-quote` (intake route) — returns HTTP 503 on failure
- `pricing-analyze` — existing fallback: computes basic stats from raw data
- `generate-replies` — falls back to 3 generic reply templates

### Frontend Error Handling
- Global `AIToastProvider` in Layout wraps entire app
- Shows dismissible toast with "Retry" button when AI returns 503/500
- `useAIToast()` hook available in any component

---

## 10. Multilingual System

- **App UI language**: `businesses.app_language` (en/es/pt/ru) → synced to i18next on login
- **Customer outbound language**: `businesses.comm_language` → used in AI-generated messages via `getLangInstruction()`
- **Per-customer override**: `customers.preferred_language` → `getEffectiveLang(customerId, businessCommLanguage)` resolver
- **Translation files**: `web/src/locales/{en,es,pt,ru}.json`

---

## 11. Background Jobs (Cron)

All cron jobs run in `server/index.ts`:

| Job | Schedule | Purpose |
|-----|----------|---------|
| Quote expiry | Every hour | Marks quotes as expired after their expiry date |
| Follow-up processing | Every 30 minutes | Sends queued follow-up messages |
| AI follow-up reset | 1st of every month at midnight | Resets `ai_follow_ups_used_this_month` to 0 for all users |
| Analytics TTL cleanup | Daily at 2am | Deletes analytics events older than 90 days |
| Demo account refresh | Daily | Keeps the demo account in a clean state |

---

## 12. Known Technical Decisions & Constraints

1. **drizzle-kit push is broken** — All schema changes go through direct SQL (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...`). Never use `drizzle-kit push`.

2. **No streaming AI responses** — All AI calls are buffered server-side and returned as complete responses. React Native cannot use `ReadableStream` on iOS/Android.

3. **Single AI model** — Only `gpt-4o-mini` is used. No model switching, no fine-tuning.

4. **Expo Go compatibility** — All native dependencies must be on the pre-approved Expo Go compatible list. No custom native modules.

5. **Session-based auth** — No JWT. Sessions stored in PostgreSQL via connect-pg-simple.

6. **Web + mobile share the same Express backend** — Both frontends hit the same API server on port 5000.

7. **Static web build** — The React web app is pre-built with Vite and served as static files by Express. Changes require `cd web && npx vite build`.

8. **Row-level multi-tenancy** — All queries filter by `businessId` derived from `getBusinessByOwner(userId)`. There is no separate tenant schema.

9. **No soft deletes on most tables** — Only specific entity types have `deleted_at` columns (recoverable via admin endpoint).

10. **Revenue Cat iOS only** — Web subscriptions go through Stripe. Mobile subscriptions go through RevenueCat. There is no cross-platform subscription sync.

---

## 13. Security Notes

- HMAC-SHA256 signing on webhook deliveries
- Session secret via environment variable
- Passwords hashed (bcrypt)
- API keys hashed before storage
- Rate limiting on auth routes (`authLimiter`, `loginFailureLimiter`)
- requireAuth middleware on all protected routes
- Tier enforcement middleware (`requireStarter`, `requireGrowth`, `requirePro`) on 70+ routes
- No public routes expose user or business data

---

## 14. Potential Audit Focus Areas

The following areas are suggested starting points for an auditor:

### Product & UX
- Is the 3-mode AI agent (My Business / Coach Me / Teach Me) genuinely differentiated and valuable, or could it be simplified?
- Does the free tier (3 lifetime quotes) convert well, or is it too restrictive to allow users to experience value?
- Are the 4 pricing tiers the right structure, or could Growth+Pro be merged?
- The web app has 45+ pages — is the navigation intuitive for a solo cleaning business owner?
- Is the "Lead Radar" (social media lead tracking) a core workflow for the target user?

### Technical & Architecture
- The main AI router file (`aiRouter.ts`) is ~1,550 lines — should it be split further by subdomain?
- `clients.ts` and `helpers.ts` are large shared utility files — are there hidden circular dependency risks?
- With 69 database tables, is the schema overly complex for the current feature set?
- The pricing engine is duplicated across `shared/pricingEngine.ts` (web), the calculator engine, and a server-side function in `customersRouter.ts` (ai-quote) — is this in sync?
- Are the 5 cron jobs reliable? Are there edge cases in the follow-up processing loop?

### Business Logic
- The referral system credits +1 free month but there is no cap — is this exploitable?
- The Starter tier caps AI follow-up sends at 3/month — is this limit stored safely against manipulation?
- The AI quote route (`/api/intake-requests/:id/ai-quote`) contains inline pricing logic that should ideally use `pricingEngine.ts` — is this diverging?

### Security
- Are all AI routes properly gated by subscription tier?
- Could a user escalate their effective tier by crafting requests?
- Are Stripe webhook events validated with signature verification?
- Is there any user-supplied content that reaches the AI prompt without sanitization?

### Growth & Retention
- Is there an email drip sequence for new users during the 14-day trial?
- Is there any in-app telemetry to understand where users drop off?
- The weekly recap and growth tasks are generated by AI — what happens if AI is unavailable during cron generation?

---

## 15. Demo Access

- **Email**: `demo@quotepro.com`
- **Password**: `Demo1234!`
- **Tier**: Pro (all features unlocked)
- **Business ID**: `04a89fc9-99a5-4aa7-ae7c-ceb8f8abc112`

---

*Document generated from live codebase. Last updated: March 2026.*
