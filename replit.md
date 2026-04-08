# QuotePro

## Overview
QuotePro is a SaaS platform for residential cleaning companies, offering tools to streamline operations, enhance customer engagement, and drive business growth. It provides a comprehensive solution for managing and growing a cleaning business, with capabilities such as a multi-step quote calculator with Good/Better/Best pricing, customizable business profiles, configurable pricing, and AI-powered communication and sales assistance. The platform includes CRM, job scheduling, communication tools, job photo attachments, recurring job automation, quote PDF exports, and advanced analytics for revenue forecasting and customer satisfaction.

## User Preferences
Preferred communication style: Simple, everyday language.
iPhone-only app. No hours/times shown to customers. Customizable service types.
Freemium model with 4 tiers: Free (3 total quotes), Starter ($19/mo, 20 quotes/month, basic CRM), Growth ($49/mo or $39/mo annual, unlimited quotes + AI), Pro ($99/mo or $79/mo annual, integrations). RevenueCat handles iOS subscriptions (EXPO_PUBLIC_REVENUECAT_API_KEY, iOS only). Server-side quota enforced at `POST /api/quotes`. Client-side check via `GET /api/quotes/count` before saving. `SubscriptionContext` tracks `tier: PlanTier ("free"|"starter"|"growth"|"pro")`, `isPro` (=Growth or Pro), `isGrowth` (=Growth or Pro), `isStarter` (=Starter+). `ProGate` component wraps premium screens with `minTier` prop (defaults "growth"). Starter users can access basic CRM (CustomersScreen minTier="starter"). Growth gates: WalkthroughAI ("AI Quote Builder"), FollowUpQueue ("Automated Follow-Ups"), AutomationsHub ("Growth Automation"), UpsellOpportunities ("Smart Upsell Recommendations"), AIAssistant ("AI Business Advisor"), Reports/Revenue. AI builder gate intercepts card tap in QuoteCalculatorScreen before navigation (logged-in users only). Starter quote counter banner in QuoteCalculatorScreen shows "X of 20 used this month". PaywallScreen: Growth default, annual billing default, "2 MONTHS FREE" badge, contextual headers for trigger_source (quote_limit, ai_builder_gate, feature_gate), outcome-driven copy.

## System Architecture

### Frontend Architecture
The frontend comprises a React Native (Expo SDK 54) mobile application and a React 19 web application. Both use React Navigation/React Router for navigation, React Native Reanimated for animations (mobile), and React Context/React Query for state management. Styling is theme-based with light/dark modes. The web app features a "Warm Minimal" design system, a 248px left sidebar, a command palette (⌘K), and a "Revenue Command Center" dashboard with KPIs.

### Backend Architecture
The backend is an Express.js application built with Node.js and TypeScript. All routing is fully modular — 19 domain routers in `server/routers/`, registered in `server/routes.ts` with three mounting strategies:

- **Group A — prefix-mounted** (each router defines paths relative to its mount prefix):
  - `app.use('/api/admin', adminRouter)` — admin dashboard + field management (merged from former `fieldAdminRouter`)
  - `app.use('/api/nps', npsRouter)` — NPS surveys
  - `app.use('/api/autopilot', autopilotRouter)` — Autopilot pipeline
  - `app.use('/api/webhooks', revenuecatRouter)` — RevenueCat webhooks
  - `app.use('/api/employee', employeeRouter)` — employee portal
  - `app.use('/api/market-rates', marketRatesRouter)` — market rate data
  - `app.use('/api/pricing', pricingRouter)` — pricing config
  - `app.use('/api/support', supportRouter)` — support tickets
  - `app.use('/api/quote-doctor', quoteDoctorRouter)` — AI quote improvement

- **Group B — multi-domain, mounted at `/api`** (internal paths are relative to `/api`):
  - `authRouter` — `/api/auth/*`, `/api/consent`, `/api/crash-report`
  - `quotesRouter` — `/api/quotes/*`, `/api/commercial/*`
  - `customersRouter` — `/api/customers/*`, `/api/intake-requests/*`
  - `jobsRouter` — `/api/jobs/*`, `/api/schedule/*`, `/api/dispatch/*`
  - `businessRouter` — `/api/business/*`, `/api/subscription/*`, `/api/settings`, `/api/preferences`, `/api/files`, `/api/tasks`, `/api/referrals`, `/api/badges`, `/api/communications`, `/api/analytics`, `/api/geocode`, `/api/lead-link`, `/api/tip-settings`, `/api/tips`
  - `aiRouter` — `/api/ai/*`, `/api/send/*`
  - `automationsRouter` — `/api/automations`, `/api/social/*`, `/api/streaks`
  - `integrationsRouter` — `/api/google-calendar/*`, `/api/stripe/*`, `/api/api-keys`, `/api/webhook-endpoints`, `/api/internal/*`

- **Group C — hybrid (mounted at root)** — serve both API routes and static HTML pages:
  - `publicRouter` — `/api/public/*` + `/q`, `/privacy`, `/terms`, `/calculators`
  - `portalRouter` — `/api/portal/*` + `/portal-manifest/*`, `/api/portal-stats`

### Data Storage
A PostgreSQL Database, powered by Neon, is used with Drizzle ORM. Session management uses `express-session` with `connect-pg-simple`.

### Authentication
Session-based authentication supports email/password, Apple, and Google SSO.

### Core Functionality
- **Quote Calculation Engine**: A flexible engine calculates base hours and applies multipliers, supporting customizable service types, discounts, add-ons, and comprehensive commercial quoting with AI-powered scope generation.
- **Instant Quote Page**: A public-facing page (`/q/:token`) allows customers to view, accept quotes, select tiers, toggle add-ons, make deposit payments via Stripe Checkout, and view testimonials.
- **AI Features**:
    - **QuotePro AI Agent (3-mode)**: An AI agent at `/app/ai-assistant` with "My Business" (data-driven answers), "Coach Me" (sales/operations advice), and "Teach Me" (industry education) modes.
    - **Walkthrough AI Quoting**: Extracts structured quote details from natural language input.
    - **AI Closing Assistant**: Generates customer-facing messages.
    - **AI Dynamic Pricing Suggestions**: Recommends optimal pricing based on property details.
- **Job Management**: Detailed job scheduling, status tracking, and customer-facing updates.
- **AI Follow-Up Automation**: Automatically schedules and sends AI-generated follow-up messages for unaccepted quotes.
- **Public SEO Calculator Pages**:
  - `/commercial-cleaning-calculator` — `CommercialCalculatorPage.tsx`: 3-step public wizard (Facility → Walkthrough → Instant Quote), ISSA 2026 + BSCAI 2024 national benchmarks, FAQ JSON-LD schema, HowTo schema, shareable ?q= URL (base64 state), branded PDF export with QR code, "Get Full Pro Proposal" CTA → /register.
  - `/residential-cleaning-cost-calculator` — `ResidentialCalculatorPage.tsx`: 2-step public wizard (Property → Results), Good/Better/Best tiers via `computeResidentialQuote`, HomeAdvisor/Angi 2026 benchmark comparisons, FAQ JSON-LD schema, HowTo schema, shareable ?q= URL, branded PDF export with QR code, mutual cross-links between commercial and residential.
- **Scalable Calculator Engine**: A data-driven engine dynamically generates calculator pages based on `CalcDefinition` objects.
- **Lead Link Microsite**: A 4-step progressive disclosure quote request page (`/request/:slug`) for customers.
- **Smart Push Notification Trigger System**: Server-side push notifications for various triggers (activation reminders, quote expiry, dormant customer digest) with user preferences and cron-based scheduling.
- **Trial Drip Email System**: A sequence of 5 emails sent to new users over 13 days to encourage platform engagement, with enrollment, tracking, and unsubscribe features.
- **Multilingual System**: Supports per-business currency (USD, CAD, GBP), app language (en, es, pt, ru), and outbound communication language, with customer-specific language overrides.

### UI/UX and Feature Specifications
- **Dashboard Simplification**: Redesigned `DashboardPage.tsx` with updated `CommandHeader` stats, removal of old KPI cards, and a new `TodaysFocus` component for prioritized action items.
- **Navigation Restructure (Web)**: Renamed "GROWTH" section to "BUSINESS", restructured `CORE_NAV_ITEMS`, introduced `BUSINESS_NAV_ITEMS`, and made `TOOLS_NAV_ITEMS` collapsible by default.

## External Dependencies

### Core Technologies
- Expo SDK 54
- React 19.1.0
- React Native 0.81.5
- Node.js
- TypeScript
- Express.js
- PostgreSQL (Neon-backed)

### AI Integration
- OpenAI (gpt-4o-mini via Replit AI Integrations)

### Third-Party Services
- **Twilio**: SMS integration.
- **SendGrid**: Email integration.
- **Google Calendar**: OAuth2-based calendar synchronization.
- **Stripe Connect**: Online payments (Stripe Express and Stripe Checkout).
- **Stripe Billing**: Subscription management with webhooks.
- **RevenueCat**: In-app subscription management (iOS only).
- **Expo-notifications**: Push notification support.
- **Expo-print**, **expo-sharing**: For quote PDF export.
- **QuickBooks Online**: OAuth2 integration for customer and invoice management.
- **Jobber**: OAuth2 integration for client and job creation.

### Integrations Lite
- Invoice Packets (QuickBooks-compatible).
- Calendar event stubs (ICS download, Google Calendar deep links).
- Webhooks & API Keys (Zapier/Make with HMAC-SHA256 signing and retry logic).

## Sprint 23 — "My Home" Customer Portal
- **DB Tables**: `customer_portals` (token, preferences, view_count), `reschedule_requests`; businesses extended with `portal_enabled`, `portal_color`, `portal_welcome_message`.
- **Portal Router** (`server/routers/portalRouter.ts`): `GET /api/portal/:token`, `PUT /api/portal/:token/preferences`, `POST /api/portal/:token/reschedule`, `POST /api/portal/send-link`.
- **Public URL**: `/home/:token` — OG meta tags injected server-side, SPA fallback for sub-pages (`/preferences`, `/reschedule`).
- **Frontend Pages**: `CustomerPortalPage.tsx`, `portal/PreferencesPage.tsx`, `portal/ReschedulePage.tsx` (all in `web/src/pages/`).
- **Admin Integration**: Portal Link button on `CustomerDetailPage`, preferences card on `JobDetailPage`, portal settings card on `SettingsPage`.
- **SMS**: Tip-request SMS appends portal URL for all customers with active portals.
- **Metro Proxy**: `metro.config.js` proxies `/home/*` and `/api/portal/*` from port 8081 → 5000 so the portal is accessible in development and testing.
- **Web App Router**: `/home/` added to `TOP_LEVEL_PATHS` in `web/src/main.tsx` so React Router uses `basename="/"` for portal routes.
- **Token Backfill**: All 69 existing customers backfilled with portal tokens on startup.
## Sprint 25 — Product Audit Improvements
- **ProGate (T001)**: Context-aware upgrade prompts in `web/src/components/ProGate.tsx`. Shows feature-specific benefit bullets, exact tier price badge ("$49/mo"), and feature name in headline.
- **WhatsNewModal (T002)**: Version-gated changelog modal in `web/src/components/WhatsNewModal.tsx`. Fires once per version key (`CURRENT_VERSION = "2026.04"`) via `localStorage`. Rendered in `App.tsx` for authenticated users only.
- **NPS Dashboard (T003)**: Admin page at `/nps-dashboard`. Backend `GET /api/nps/admin` in `server/routers/npsRouter.ts` returns averageScore, npsIndex, distribution, responses, lowScoreAlerts. Page: `web/src/pages/NPSDashboardPage.tsx`. Added to Layout.tsx Settings nav section.
- **Customer Portal Quote UX (T004)**: Improved pending-quote CTA in `web/src/pages/CustomerPortalPage.tsx`. Full-width "Accept Quote — $XX.XX" primary button with checkmark icon and box-shadow. Trust badge "Secure digital signature · No payment today". Decline demoted to subtle text link.
- **Feature Discovery Tips (T005)**: `PowerFeatureTips` component in `web/src/pages/DashboardPage.tsx`. Shows 3 dismissible tip cards (Booking Widget, Lead Capture Link, Autopilot) for active users who haven't used them. Dismissed state persisted in `localStorage["dismissedFeatureTips"]`.
- **Dunning for Recurring Auto-Charge (T006)**: 3 new columns on `recurring_clean_series` — `charge_failure_count`, `last_charge_failed_at`, `charge_paused_at` — added via `ALTER TABLE IF NOT EXISTS` on startup. Failure handler in `generateRecurringJobs()` (helpers.ts) now increments count, emails customer + owner, pauses after 3 failures. Daily 7am dunning cron in `server/index.ts` retries on day 1/3/7 from `last_charge_failed_at`.
- **Autopilot RevenueCat iOS (T007)**: `AutopilotUpsellModal.tsx` now uses RevenueCat on iOS/Android. Looks for "autopilot" offering in RC dashboard, purchases the monthly package, then calls `POST /api/autopilot/settings` to enable. Falls back to Stripe web checkout if offering not configured. Loading + cancel + error handling included.

## Sprint 24 — QuotePro Autopilot
- **Feature Gate**: Free/Starter → 403 upsell; Growth → requires Autopilot add-on ($29/mo, `AUTOPILOT_ADDON_PRICE_ID` env var); Pro → included.
- **DB Tables**: `autopilot_jobs` (UUID PK, lead_id, quote_id, status, next_action_at, metadata), `autopilot_job_logs` (serial PK, job_id, step, action, result). Users table extended with `autopilot_enabled` (boolean).
- **Service** (`server/services/autopilotService.ts`): 4-step pipeline — step1 (Claude qualifies lead + emails quote), step2 (48hr follow-up with AI-generated angle), step3 (welcome email on quote accept), step4 (Google Review request on job complete).
- **Router** (`server/routers/autopilotRouter.ts`): `POST /api/autopilot/enroll`, `GET /api/autopilot/jobs`, `POST /api/autopilot/jobs/:id/pause|resume`, `GET /api/autopilot/stats`, `POST /api/autopilot/settings`, `POST /api/autopilot/checkout`.
- **Cron**: 15-minute interval registered in `server/routes.ts`, runs `processAutopilotJobs()`.
- **Event Hooks**: `quotesRouter.ts` line ~288 triggers step3 when quote accepted; `jobsRouter.ts` line ~1366 triggers step4 when job completed.
- **Frontend**: `client/screens/AutopilotScreen.tsx` (dashboard with stats, jobs list, enroll modal); `client/components/AutopilotUpsellModal.tsx` (paywall with Stripe checkout link).
- **Navigation**: Push screen `Autopilot` in `RootStackNavigator.tsx`. Entry point in `SettingsScreen.tsx`. Zap icon in `IntakeQueueScreen.tsx` per-card action button.
