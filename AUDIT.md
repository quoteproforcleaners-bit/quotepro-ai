# QuotePro AI — Full Product Audit Brief

> **Purpose:** This document gives an AI auditor a complete picture of the QuotePro AI SaaS product — its purpose, architecture, features, code structure, data model, and known constraints — so it can provide high-quality improvement recommendations without reading every source file.

---

## 1. Product Overview

**QuotePro AI** is a vertical SaaS product for **residential cleaning companies**. It replaces spreadsheets, pen-and-paper estimates, and generic CRMs with a purpose-built platform that handles quoting, customer management, job scheduling, follow-up automation, AI coaching, and revenue analytics.

**Target customer:** Solo cleaning operators and small crews (1–10 employees). Non-technical owners who run their business from an iPhone.

**Core value proposition:**
1. Send a professional Good/Better/Best quote in under 2 minutes
2. Let the customer accept online and pay a deposit
3. Automate follow-ups on quotes that go quiet
4. Use AI to coach, analyze, and grow the business

---

## 2. Business Model — Freemium SaaS

| Tier | Price | Quota | Key Features |
|------|-------|-------|-------------|
| Free | $0 (14-day trial) | 3 total quotes | Basic quoting only |
| Starter | $19/mo | 20 quotes/month | + CRM, basic reports |
| Growth | $49/mo or $39/mo annual | Unlimited | + AI features, automations, follow-ups |
| Pro | $99/mo or $79/mo annual | Unlimited | + Jobber, QuickBooks, Stripe Connect, API keys |

Subscriptions managed by **RevenueCat** (iOS in-app purchases). Quote quota enforced server-side on `POST /api/quotes`. A monthly reset cron runs against `users.quotesThisMonth`.

---

## 3. Technology Stack

### Frontend — Mobile (Primary)
- **Expo SDK 54** / React Native 0.81.5
- React Navigation 7 (Stack + Tab navigators)
- `@tanstack/react-query` for data fetching
- `react-native-reanimated` + `react-native-gesture-handler` for animations
- RevenueCat for in-app subscriptions
- Push notifications via `expo-notifications`
- PDF export via `expo-print` + `expo-sharing`

### Frontend — Web (Secondary dashboard)
- React 19 + React Router 7
- Vite 7 build tool — outputs to `web/dist/`, served at `/app` by the Express server
- Tailwind CSS with a custom "Warm Minimal" design system
- `@tanstack/react-query` with a shared `queryClient`
- 248px left sidebar layout with command palette (⌘K)

### Backend
- **Node.js + Express.js + TypeScript**
- Single monolithic `server/routes.ts` (~14,800 lines) — all routes registered here
- Session auth via `express-session` + `connect-pg-simple`
- Background cron jobs for quote expiration, follow-up scheduling

### Database
- **PostgreSQL** (Neon serverless)
- **Drizzle ORM** with schema in `shared/schema.ts`
- 70+ tables (see Section 6)

### AI
- **OpenAI `gpt-4o-mini`** via Replit AI Integrations for all AI endpoints
- Used for: agent chat (3 modes), quote note extraction, closing messages, campaign copy, review emails, scope generation, pricing analysis, intake-to-quote conversion

### Third-Party Services
| Service | Purpose |
|---------|---------|
| Twilio | SMS delivery |
| SendGrid | Transactional email |
| Stripe Connect | Customer deposits + platform payments |
| RevenueCat | iOS subscription billing |
| Google Calendar | OAuth2 calendar sync |
| QuickBooks Online | Invoice export / customer sync |
| Jobber | Client + job creation sync |
| Expo Push | Mobile push notifications |

---

## 4. Architecture

```
┌─────────────────────────────────────────────────────────┐
│  iOS App (Expo Go / TestFlight)     Web App (/app)      │
│  Port 8081 (Expo dev server)        Served from /app    │
└──────────────────┬──────────────────────────────────────┘
                   │ REST API  /api/*
┌──────────────────▼──────────────────────────────────────┐
│              Express.js  (Port 5000)                    │
│  server/index.ts → server/routes.ts (monolith)          │
│  server/storage.ts (DB abstraction layer)               │
│  server/pricingEngine.ts (server-side engine)           │
│  server/mail.ts (SendGrid + Zoho SMTP fallback)         │
│  server/templates/  (Mustache HTML templates)           │
└──────────────────┬──────────────────────────────────────┘
                   │ Drizzle ORM
┌──────────────────▼──────────────────────────────────────┐
│              PostgreSQL (Neon)                          │
│              shared/schema.ts                           │
└─────────────────────────────────────────────────────────┘
```

### Key Architectural Patterns
- **`requireAuth` middleware** — all `/api/*` routes except `/api/public/*`, `/q/*`, `/r/*`, `/rate/*` require a session
- **`requirePro` / `requireGrowth` middlewares** — gate premium routes server-side
- **`getBusinessByOwner(userId)`** — the universal pattern for all business-scoped queries
- **Public quote page** (`/q/:token`) — Mustache-templated HTML at `server/templates/instant-quote.html`, fully self-contained, no React
- **Pricing engine lives in two places**: `web/src/lib/pricingEngine.ts` (client-side, used for live previews) and `server/pricingEngine.ts` (server-side). Both must stay in sync.

---

## 5. Pricing Engine (Core Business Logic)

The pricing engine is the mathematical heart of the product. Every residential quote uses it.

### Formula
```
basePrice = (sqft / 1000) × pricePerSqft
          + beds × pricePerBedroom
          + baths × pricePerBathroom
          + halfBaths × (pricePerBathroom / 2)

adjustedPrice = basePrice × conditionMultiplier × peopleMultiplier + petSurcharge

tierPrice = adjustedPrice × serviceTypeMultiplier

firstCleanPrice = max(tierPrice + addOnTotal, minimumTicket), rounded to nearest $5
recurringPrice  = max(tierPrice, minimumTicket) × (1 − freqDiscount), rounded to $5
price = firstCleanPrice  [one-time]  |  recurringPrice  [recurring]
```

### Service Tiers (Good / Better / Best)
Each quote has three price tiers mapped to service type multipliers:
- **Good** → e.g., "Touch Up" (multiplier 0.75)
- **Better** → e.g., "Standard Clean" (multiplier 1.0)
- **Best** → e.g., "Deep Clean" (multiplier 1.5)

Business owners can customize service type names and multipliers in Settings → Pricing.

A **$20 minimum gap** is enforced between tiers at runtime — if the minimum ticket collapses them together, the lower tiers are bumped up.

### Condition Multipliers
| Score | Multiplier |
|-------|-----------|
| ≥9 (very clean) | 0.9 |
| ≥7 (average) | 1.0 |
| ≥5 (dirty) | 1.2 |
| ≥3 (heavy) | 1.4 |
| <3 (extreme) | 1.7 |

### Frequency Discounts
Default: Weekly −25%, Bi-weekly −15%, Monthly −10%. Configurable per business.

### Add-On Catalog (flat prices, configurable)
`insideFridge ($25)`, `insideOven ($25)`, `insideCabinets ($40)`, `interiorWindows ($40)`, `blindsDetail ($35)`, `baseboardsDetail ($35)`, `laundryFoldOnly ($20)`, `dishes ($15)`, `organizationTidy ($45)`

### Quote Options Data Shape (stored in `quotes.options` JSONB)
```json
{
  "good":   { "price": 140, "firstCleanPrice": null, "name": "Good", "serviceTypeName": "Touch Up", "serviceTypeId": "touch-up", "scope": "...", "addOnsIncluded": [] },
  "better": { "price": 175, "firstCleanPrice": null, "name": "Better", "serviceTypeName": "Standard Clean", "serviceTypeId": "standard", "scope": "...", "addOnsIncluded": ["Inside Oven"] },
  "best":   { "price": 220, "firstCleanPrice": null, "name": "Best", "serviceTypeName": "Deep Clean", "serviceTypeId": "deep-clean", "scope": "...", "addOnsIncluded": ["Inside Oven", "Inside Cabinets", "Interior Windows", "Baseboards Detail", "Blinds Detail"] }
}
```
`firstCleanPrice` is non-null only for recurring quotes (the initial clean is priced higher than ongoing).

---

## 6. Database Schema (70+ tables)

### Core Business
| Table | Purpose |
|-------|---------|
| `users` | Auth accounts — email, subscriptionTier, quotesThisMonth |
| `businesses` | One business per user — company name, branding, payment handles, integrations config |
| `pricing_settings` | JSONB blob of all pricing config per business |
| `user_preferences` | Per-user preferences (dark mode, etc.) |

### Quoting
| Table | Purpose |
|-------|---------|
| `quotes` | Core quote record — options (JSONB), addOns (JSONB), propertyDetails (JSONB), status, publicToken |
| `quote_line_items` | Breakdown rows for commercial quotes |
| `quote_follow_ups` | Follow-up scheduling + completion tracking |
| `follow_up_touches` | Individual touch log per quote |
| `sales_recommendations` | AI-generated upsell suggestions per quote |

### CRM
| Table | Purpose |
|-------|---------|
| `customers` | Customer records — contact info, tags, leadSource, isVip, preferredLanguage |
| `customer_marketing_prefs` | Email/SMS opt-in per customer |

### Jobs & Scheduling
| Table | Purpose |
|-------|---------|
| `jobs` | Individual job records — scheduledDate, status, assignedEmployeeIds |
| `recurring_clean_series` | Recurring job series definition |
| `employees` | Team member records |
| `job_checklist_items` | Per-job checklist |
| `job_photos` | Before/after photo attachments |
| `job_status_history` | Job status audit trail |
| `job_notes` | Internal job notes |
| `schedule_publications` | Published weekly schedules sent to cleaners |
| `cleaner_schedule_notifications` | Per-cleaner acknowledgment tracking |
| `booking_availability_settings` | Business's available booking slots |

### Communications
| Table | Purpose |
|-------|---------|
| `communications` | Log of all sent SMS/email messages |
| `push_tokens` | Expo push notification device tokens |
| `channel_connections` | Social channel OAuth connections |
| `social_conversations` | Inbound social DM threads |
| `social_messages` | Individual messages in social threads |
| `social_leads` | Leads extracted from social conversations |
| `social_automation_settings` | Auto-reply settings per channel |
| `social_opt_outs` | Social message opt-outs |

### AI & Automation
| Table | Purpose |
|-------|---------|
| `automation_rules` | Trigger/action automation definitions |
| `tasks` | Task queue for automation actions |
| `growth_automation_settings` | Growth automation config |
| `campaigns` | Bulk message campaign definitions |
| `email_sequences` (library) | Email drip sequence templates |
| `sequence_enrollments` | Customer enrollments in sequences |

### Analytics & Growth
| Table | Purpose |
|-------|---------|
| `analytics_events` | Internal event log |
| `attribution_events` | Lead source attribution |
| `streaks` | Gamification streaks (booking streaks, etc.) |
| `badges` | Achievement badges |
| `growth_tasks` | Growth-oriented task suggestions |
| `growth_task_events` | Completion tracking for growth tasks |
| `review_requests` | Review solicitation tracking |
| `sales_strategy_settings` | Sales strategy config per business |

### Integrations
| Table | Purpose |
|-------|---------|
| `google_calendar_tokens` | Google OAuth tokens |
| `qbo_connections` | QuickBooks Online OAuth |
| `qbo_customer_mappings` | QBO ↔ local customer ID mapping |
| `qbo_invoice_links` | QBO invoice references |
| `qbo_sync_log` | QBO sync audit log |
| `jobber_connections` | Jobber OAuth |
| `jobber_client_mappings` | Jobber ↔ local customer mapping |
| `jobber_job_links` | Jobber job references |
| `jobber_sync_log` | Jobber sync audit log |
| `api_keys` | User-generated API keys for webhooks |
| `webhook_endpoints` | Registered webhook URLs |
| `webhook_events` | Dispatched webhook event log |
| `webhook_deliveries` | Per-endpoint delivery receipts |
| `invoice_packets` | QBO-compatible invoice packet records |
| `calendar_event_stubs` | ICS calendar events |

### Pricing Intelligence
| Table | Purpose |
|-------|---------|
| `pricing_questionnaires` | Business owner pricing questionnaire answers |
| `pricing_rules` | AI-generated pricing adjustment rules |
| `pricing_analyses` | AI pricing analysis results |
| `published_pricing_profiles` | Approved pricing rule sets |
| `imported_jobs` | Historical job data for pricing analysis |

### Lead Generation
| Table | Purpose |
|-------|---------|
| `lead_finder_settings` | Lead finder configuration |
| `lead_finder_leads` | Discovered leads |
| `lead_finder_replies` | AI-generated reply drafts |
| `lead_finder_events` | Lead finder activity log |

### Files
| Table | Purpose |
|-------|---------|
| `business_files` | Uploaded file records (PDFs, guides, etc.) |

---

## 7. API Route Inventory (~120 routes)

### Authentication
- `POST /api/auth/register` — email/password signup
- `POST /api/auth/login` — email/password login
- `POST /api/auth/apple` — Apple Sign-In (mobile)
- `GET/POST /api/auth/apple/start|callback` — Apple Sign-In (web)
- `POST /api/auth/google` — Google Sign-In (mobile)
- `GET /api/auth/google/start|callback` — Google OAuth (web)
- `POST /api/auth/exchange-token` — session token exchange (mobile→web)
- `GET /api/auth/me` — current session user
- `POST /api/auth/logout`
- `POST /api/auth/delete-account`

### Business Profile
- `GET/PUT/PATCH /api/business`
- `PUT /api/settings/language` — app language + outbound language
- `POST /api/business/logo` — logo upload
- `GET /api/settings` — full settings blob

### Pricing
- `GET/PUT /api/pricing` — pricing settings JSONB
- `GET/POST /api/pricing/jobs` — job import for pricing analysis
- `PUT/DELETE /api/pricing/jobs/:id`
- `GET/POST /api/pricing/questionnaire`
- `POST /api/pricing/analyze` — AI pricing analysis
- `GET /api/pricing/analysis`
- `GET/PUT/DELETE /api/pricing/rules` — AI-generated pricing rules
- `POST /api/pricing/publish` — publish pricing profile
- `GET /api/pricing/profile`
- `POST /api/pricing/calculate` — compute price for given inputs

### Quotes
- `GET /api/quotes` — list (with filters: status, dateRange, search)
- `GET /api/quotes/:id`
- `GET /api/quotes/count` — quota check
- `POST /api/quotes` — create quote (enforces monthly quota)
- `PUT /api/quotes/:id`
- `DELETE /api/quotes/:id`
- `POST /api/quotes/:id/send` — send via email or SMS
- `GET /api/quotes/:id/recommendations` — AI upsell recommendations
- `PATCH /api/recommendations/:id` — mark recommendation applied
- `GET /api/quotes/unscheduled-accepted` — accepted but not yet scheduled
- `POST /api/quotes/:id/invoice-packet` — generate QBO invoice packet
- `POST /api/quotes/:id/calendar-event` — create calendar event stub

### Public Quote Page (unauthenticated)
- `GET /q/:token` — render customer-facing quote HTML
- `POST /q/:token/accept` — customer accepts + selects tier
- `POST /q/:token/decline`
- `POST /q/:token/request-changes`
- `POST /q/:token/track` — page view tracking
- `GET /q/:token/booking-slots`
- `POST /q/:token/book` — customer self-booking

### Customers (CRM)
- `GET/POST /api/customers`
- `GET/PUT/DELETE /api/customers/:id`
- `GET /api/customers/:id/last-job`
- `GET/PUT /api/customers/:id/marketing-prefs`

### Jobs & Scheduling
- `GET /api/jobs` / `GET /api/jobs/:id` / `POST /api/jobs` / `PUT/DELETE /api/jobs/:id`
- `GET /api/jobs/calendar`
- `GET /api/jobs/quote/:quoteId`
- `POST /api/jobs/:id/start|complete|rate|skip|assign`
- `POST /api/jobs/:id/send-confirmation`
- `GET/POST /api/jobs/:jobId/checklist` / `PUT/DELETE /api/checklist/:id`
- `GET/POST /api/jobs/:jobId/photos` / `DELETE /api/photos/:id`
- `GET/POST/PUT /api/recurring-series` / `POST /api/recurring-series/:id/cancel|pause|resume|generate`
- `GET /api/schedule/week-jobs`
- `GET/POST /api/schedule/publications`
- `GET /api/schedule/publications/:pubId`
- `POST /api/schedule/publications/:pubId/resend/:notifId`
- `GET/POST /api/schedule/ack/:token` — cleaner schedule acknowledgment
- `GET/PUT /api/booking-availability`

### Employees
- `GET/POST /api/employees`
- `PUT/DELETE /api/employees/:id`
- `POST /api/dispatch/send` — dispatch job notification to employee
- `POST /api/jobs/:id/assign`

### AI Features
- `POST /api/ai/agent-chat` — 3-mode AI agent (My Business / Coach Me / Teach Me)
- `POST /api/ai/walkthrough-extract` — extract quote from natural language notes
- `POST /api/ai/generate-campaign-content`
- `POST /api/ai/generate-review-email`
- `POST /api/ai/generate-message` — closing assistant messages
- `POST /api/intake-requests/:id/ai-quote` — convert intake form to quote via AI
- `POST /api/lead-finder/leads/:id/generate-replies`

### Automations & Growth
- `GET/PUT /api/growth-automation-settings`
- `GET/PUT /api/sales-strategy`
- `GET/POST /api/campaigns` / `PUT /api/campaigns/:id` / `POST /api/campaigns/:id/send`
- `GET /api/upsell-opportunities`
- `GET /api/rebook-candidates`
- `GET /api/forecast`
- `GET/POST /api/email-sequences/library|enrollments`
- `POST /api/email-sequences/:sequenceId/enroll`
- `POST /api/email-sequences/enrollments/:id/send-step`
- `PATCH/DELETE /api/email-sequences/enrollments/:id/status`
- `GET/PUT /api/customers/:id/marketing-prefs`

### Employees
- `GET /api/employees` / `POST /api/employees`
- `PUT /api/employees/:id` / `DELETE /api/employees/:id`

### Intake / Lead Capture
- `GET /api/intake-requests` / `GET /api/intake-requests/count`
- `POST /api/intake-requests/:id/convert` — convert intake to quote
- `POST /api/intake-requests/send-link`
- `GET/PUT /api/business/lead-capture-settings`

### Lead Finder (Pro)
- `GET/POST /api/lead-finder/settings`
- `GET /api/lead-finder/leads` / `GET /api/lead-finder/count`
- `GET /api/lead-finder/leads/:id`
- `POST /api/lead-finder/leads/:id/status`
- `POST /api/lead-finder/poll`

### Integrations
- `GET /api/consent` / `POST /api/consent` — AI data consent gate
- `GET/POST /api/api-keys` / `DELETE /api/api-keys/:id`
- `GET/POST/PUT/DELETE /api/webhook-endpoints`
- `POST /api/webhook-endpoints/:id/test`
- `GET /api/webhook-events`
- `POST /api/quotes/:id/invoice-packet`
- `GET /api/invoice-packets/:id|csv|pdf`
- `GET /api/calendar-events/quote/:id`
- `POST /api/quotes/:id/calendar-event`
- QBO routes: connect, callback, sync, disconnect
- Jobber routes: connect, callback, sync, disconnect

### Files
- `GET/POST /api/files/upload`
- `PATCH/DELETE /api/files/:id`

### Review / Rating
- `POST /api/public/rate/:token`
- `GET /r/:token` — review redirect
- `GET /rate/:token` — rating page

### Admin (Internal)
- `GET /api/admin/grant-pro` — secret key to grant Pro access
- `GET /download/session-transcript`
- `POST /api/crash-report`

---

## 8. AI Features Detail

### 1. AI Agent — 3 Modes (`POST /api/ai/agent-chat`)
The flagship AI feature at `/app/ai-assistant`:

**My Business mode** — Pulls real data from the DB (quotes, customers, jobs, revenue, pipeline) and answers data-specific questions. E.g., "Which quotes are about to expire?" or "What's my revenue this month?"

**Coach Me mode** — Sales and ops coaching. Scripts for closing calls, objection handling, pricing psychology, recurring upsell language.

**Teach Me mode** — Industry education. Pricing norms, service type differences, operations best practices, KPIs for cleaning companies.

### 2. Walkthrough AI (`POST /api/ai/walkthrough-extract`)
Takes messy text (notes, customer texts, voicemail transcripts) and extracts structured quote fields:
- Property: beds, baths, sqft, type, condition, pets
- Service: category, frequency, add-ons, urgency
- Returns: `extractedFields`, `missingFields`, `recommendations`, `assumptions`, `confidence`
- Frontend then shows an editable review panel with live pricing preview before creating the quote

### 3. Closing Assistant (`POST /api/ai/generate-message`)
Generates customer-facing follow-up messages in multiple tones (friendly, professional, urgent, value-focused) and languages.

### 4. AI Pricing Analysis (`POST /api/pricing/analyze`)
Analyzes the business's historical jobs, market position, and questionnaire answers to suggest optimized pricing rules.

### 5. Campaign Content (`POST /api/ai/generate-campaign-content`)
Generates bulk message content for reactivation campaigns, seasonal promotions, referral asks.

### 6. Review Email (`POST /api/ai/generate-review-email`)
Generates a post-job review request email personalized to the customer and job.

### 7. Intake-to-Quote (`POST /api/intake-requests/:id/ai-quote`)
Converts a customer-submitted intake form into a full structured quote using AI extraction + pricing engine.

**All AI calls use `gpt-4o-mini` with `response_format: { type: "json_object" }` for structured output.**

---

## 9. Subscription & Quota Logic

### Server-side enforcement
```typescript
// POST /api/quotes — quota check at ~line 2252 of routes.ts
if (user.subscriptionTier === "free" && totalQuotesCreated >= 3) → reject
if (user.subscriptionTier === "starter" && quotesThisMonth >= 20) → reject
```

### Client-side check
`GET /api/quotes/count` returns `{ count, monthlyLimit, tier }`. The mobile app checks this before showing the quote builder and shows a `PaywallScreen` if at limit.

### Tier gates
- `ProGate` component (web): wraps any feature with `minTier` prop
- `requirePro` / `requireGrowth` middleware (server): applied per route
- `useSubscription()` hook: provides `{ tier, isPro, isGrowth, isStarter }` to all screens

### RevenueCat integration
iOS only. The `REVENUECAT_API_KEY` is public (client-side). After purchase, the app calls the RevenueCat REST API to verify entitlements, then calls `POST /api/auth/apple` which updates `users.subscriptionTier`.

---

## 10. Quote Lifecycle

```
draft → sent → viewed → accepted|declined|expired
                  ↓
              (if accepted)
                  ↓
           job_created (optional)
                  ↓
          scheduled → in_progress → completed → rated
```

- **Draft:** Created by business owner, not yet sent
- **Sent:** Delivered via email or SMS; `sentAt` recorded
- **Viewed:** Customer opens the `/q/:token` page; `viewedAt` recorded
- **Accepted:** Customer clicks Accept on the customer-facing page; selects a tier, optionally pays deposit
- **Follow-up automation:** If quote remains `sent` and unaccepted after X hours, follow-up messages are auto-scheduled
- **Expired:** Background job marks quotes as expired after the expiration window

---

## 11. Customer-Facing Quote Page (`/q/:token`)

The most important customer touchpoint. A pure HTML/CSS/JS page rendered server-side with Mustache templating from `server/templates/instant-quote.html`.

Features:
- Displays business branding (logo, primary color)
- Shows 3 pricing tiers (Good/Better/Best) with radio selection
- Interactive add-on toggles (checkboxes) with real prices that update the total
- Tier-included add-ons shown as green "Included" badges (not priced separately)
- Deposit payment via Stripe Checkout (optional, configured per business)
- Customer testimonials / social proof section
- Accept / Decline / Request Changes actions
- Self-booking calendar if business enables it
- Multi-language support via `comm_language` setting
- Mobile-responsive, no React dependency

**Critical data quirk:** The `options` JSONB field drives which add-ons show as "Included" (per tier `addOnsIncluded` array) vs. which show as interactive checkboxes (from `add_ons` JSONB with `{ selected, price }` per key).

---

## 12. Multilingual Support

The product supports 4 app interface languages and unlimited outbound communication languages:

**App UI Languages:** English, Spanish, Portuguese, Russian — managed via `i18next` with JSON translation files in `web/src/locales/`.

**Outbound Languages:** Business sets a default language for all customer communications. Individual customers can have a `preferred_language` override. The server resolves the effective language via `getEffectiveLang(customerId, businessCommLanguage)` before any AI-generated message.

**AI prompts** include a language instruction via `getLangInstruction(lang)` to ensure responses are in the correct language.

---

## 13. Key Files Reference

| File | Purpose |
|------|---------|
| `server/routes.ts` | All Express routes (~14,800 lines) |
| `server/storage.ts` | Database query functions (abstraction layer) |
| `server/index.ts` | Express app setup, middleware, cron jobs |
| `server/mail.ts` | Email delivery (SendGrid + Zoho SMTP fallback) |
| `server/pricingEngine.ts` | Server-side pricing calculations |
| `server/templates/instant-quote.html` | Customer-facing quote page (Mustache) |
| `shared/schema.ts` | Drizzle ORM schema — all 70+ tables |
| `web/src/lib/pricingEngine.ts` | Client-side pricing engine (must mirror server) |
| `web/src/lib/api.ts` | `apiGet`, `apiPost`, `apiPut`, `apiDelete` helpers |
| `web/src/lib/queryClient.ts` | React Query client + `getApiUrl()` |
| `web/src/lib/subscription.ts` | `useSubscription()` hook |
| `web/src/components/Layout.tsx` | Web app shell — sidebar, nav, command palette |
| `web/src/components/ui.tsx` | Design system components (Button, Card, etc.) |
| `web/src/pages/QuoteCreatePage.tsx` | Main quote builder (1,370 lines) |
| `web/src/pages/WalkthroughAIPage.tsx` | AI-assisted quote from notes |
| `web/src/pages/DashboardPage.tsx` | Revenue Command Center dashboard |
| `web/src/pages/SettingsPage.tsx` | All business settings tabs |

---

## 14. Known Constraints & Gotchas

1. **`server/routes.ts` is a 14,800-line monolith.** All routes live in one file. This works but makes it hard to navigate. No route-level unit tests exist.

2. **Dual pricing engine.** `web/src/lib/pricingEngine.ts` and `server/pricingEngine.ts` are separate files and must be kept manually in sync. A drift between them would cause live previews to show different prices than what gets saved.

3. **JSONB everywhere.** `quotes.options`, `quotes.addOns`, `quotes.propertyDetails`, `pricing_settings.settings` are all JSONB blobs. This provides flexibility but means the shape is only enforced in application code, not the DB schema.

4. **No automated test suite.** There are no Jest/Vitest unit tests or integration tests. All testing is manual or via Playwright e2e.

5. **Session-based auth on a serverless DB.** Sessions are stored in PostgreSQL via `connect-pg-simple`. On Neon serverless, cold starts can occasionally cause a brief session drop.

6. **RevenueCat iOS only.** Android in-app purchases are not implemented. Web subscriptions are not implemented (manual upgrade flow only).

7. **`total` field on quotes.** The `quotes.total` field is not used for pricing — actual prices live in `quotes.options.{good,better,best}.price`. The `total` field is often set to `quote.better.price` as a convenience for sorting/display.

8. **No soft-delete.** Deleting a customer or quote is a hard DB delete. No `deletedAt` column exists.

9. **AI consent gate.** AI features on the web are gated behind a consent checkbox (`/api/consent`). Users must explicitly opt in before any AI calls are made.

10. **The `requirePro` middleware label is misleading.** It actually gates Growth-tier features (not just Pro). Naming is legacy from an earlier plan structure.

---

## 15. Areas Suggested for Audit Focus

1. **Security** — Rate limiting on auth endpoints, HMAC webhook signing, session fixation, SQL injection surface (Drizzle parameterized queries should handle this, but worth verifying), API key scoping
2. **Performance** — The customer-facing quote page (`/q/:token`) currently renders the full Mustache template on every request; could benefit from caching. The `analytics_events` table will grow unbounded.
3. **Data integrity** — JSONB shape drift between client/server pricing engines, `total` field consistency, orphaned records when quotes are deleted
4. **Subscription enforcement** — Whether Growth/Pro gates are consistently enforced on both client and server for all premium features
5. **Error handling** — AI API failure modes (OpenAI rate limits, timeout), email/SMS delivery failure logging, Stripe webhook handling
6. **Scalability** — The monolithic `routes.ts`, missing database indexes on foreign keys, N+1 query risks in list endpoints
7. **UX/Product** — Onboarding flow completion rate, pricing settings discoverability, the gap between quote creation and job scheduling
8. **Revenue leakage** — Free users who exceed quota but find workarounds, trial conversion rate, upgrade prompt placement
9. **Mobile vs Web feature parity** — Some features only exist on web (lead finder, email sequences, invoice packets); mobile users miss them
10. **Multilingual coverage** — Whether all AI-generated customer messages correctly respect the `preferred_language` override

---

*Generated from source code review of the QuotePro AI codebase. Last updated: March 2026.*
