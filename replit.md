# QuotePro

## Overview
QuotePro is a SaaS platform designed for residential cleaning companies to streamline operations, improve customer engagement, and foster business growth. It provides tools for accurate, branded customer quotes, CRM, job scheduling, communication, and overall business management. Key features include a multi-step quote calculator with Good/Better/Best pricing, customizable business profiles, and configurable pricing settings. The platform integrates AI for drafting customer communications and an AI Command Center for natural language interaction. Advanced capabilities encompass job photo attachments, recurring job automation, quote PDF exports, and a "Social / AI Sales Assistant" for lead capture and automated replies via Instagram and TikTok DMs (part of the "QuotePro AI" tier). Recent additions include a guest mode for quotes, an enhanced quote acceptance system with revenue playbook recommendations, an underpricing detector, a follow-up queue, opportunities management, a growth automation suite with a task engine, sales strategy profiles, revenue forecasting, customer satisfaction ratings, VIP customer badges, customizable dashboard widgets, animated screen transitions, dark mode scheduling, and Apple-compliant AI consent management.

## User Preferences
Preferred communication style: Simple, everyday language.
iPhone-only app. No hours/times shown to customers. Customizable service types.
Freemium model with 4 tiers: Free (3 total quotes), Starter ($19/mo, 20 quotes/month, basic CRM), Growth ($49/mo or $39/mo annual, unlimited quotes + AI), Pro ($99/mo or $79/mo annual, integrations). RevenueCat handles iOS subscriptions (EXPO_PUBLIC_REVENUECAT_API_KEY, iOS only). Server-side quota enforced at `POST /api/quotes`. Client-side check via `GET /api/quotes/count` before saving. `SubscriptionContext` tracks `tier: PlanTier ("free"|"starter"|"growth"|"pro")`, `isPro` (=Growth or Pro), `isGrowth` (=Growth or Pro), `isStarter` (=Starter+). `ProGate` component wraps premium screens with `minTier` prop (defaults "growth"). Starter users can access basic CRM (CustomersScreen minTier="starter"). Growth gates: WalkthroughAI ("AI Quote Builder"), FollowUpQueue ("Automated Follow-Ups"), AutomationsHub ("Growth Automation"), UpsellOpportunities ("Smart Upsell Recommendations"), AIAssistant ("AI Business Advisor"), Reports/Revenue. AI builder gate intercepts card tap in QuoteCalculatorScreen before navigation (logged-in users only). Starter quote counter banner in QuoteCalculatorScreen shows "X of 20 used this month". PaywallScreen: Growth default, annual billing default, "2 MONTHS FREE" badge, contextual headers for trigger_source (quote_limit, ai_builder_gate, feature_gate), outcome-driven copy.

## System Architecture

### Frontend Architecture
The frontend is built with React Native (Expo SDK 54), utilizing React Navigation for native stack and bottom tab navigation. Animations and touch interactions are managed by React Native Reanimated and React Native Gesture Handler. State management employs React Context for global state and React Query for server state. Styling is based on a centralized theme (`/constants/theme.ts`) supporting light/dark modes and platform adaptations. The navigation structure includes a Root Stack Navigator with conditional rendering for authentication and onboarding, leading to a Main Tab Navigator with Home, Customers, Quotes, Jobs, Reports, and Settings tabs (previously "Growth" tab renamed to "Reports" with bar-chart-2 icon), alongside various modal and stack screens for detailed functionalities. There is also a companion web application served at `/app`, built with React 19, Vite, Tailwind CSS, and React Router, sharing the same backend APIs and session authentication.

### Backend Architecture
The backend is an Express.js application built with Node.js and TypeScript, configured with CORS. All API routes are prefixed with `/api` and secured by authentication middleware. A background job manages the automatic expiration of old quotes.

### Data Storage
A PostgreSQL Database (Neon-backed) is used with Drizzle ORM for schema definition and CRUD operations. Key tables store users, businesses, pricing settings, customers, quotes, jobs, communications, social features, and growth automation data. Session management is handled by `express-session` with `connect-pg-simple`.

### Authentication
Session-based authentication supports email/password, Apple, and Google SSO, with `AuthContext` managing frontend authentication state.

### Quote Calculation Engine
The core logic calculates base hours based on square footage and applies multipliers for property attributes. It supports customizable service types, frequency discounts, and add-on pricing, with internal calculations hidden from customers. This engine also supports a comprehensive commercial quoting feature, including a multi-step walkthrough wizard, labor and pricing engines, tier builders, proposal previews, and AI-powered scope generation and risk analysis.

### Instant Quote Page
A public, customer-facing instant quote page at `/q/:token` offers an interactive experience for viewing and accepting quotes, including good/better/best tier selection, add-on toggling, expiration timers, deposit payments via Stripe Checkout, and testimonials.

### AI Features
- **Walkthrough AI Quoting ("Quote from Notes")**: Paste raw walkthrough notes, customer texts, or property descriptions. AI (gpt-4o-mini) extracts structured quote details — property type, beds/baths/sqft, service type, frequency, condition, pets, add-ons, missing fields, and recommendations. Output is rendered in structured cards. "Create Quote Draft" prefills the quote builder with extracted data. Gated at Growth tier. Route: `POST /api/ai/walkthrough-extract` (accepts `description` or `notes` field).
- **AI Closing Assistant**: Generates customer-facing messages for various purposes in multiple tones and languages.
- **AI Dynamic Pricing Suggestions**: Analyzes property details, add-ons, frequency, and history to suggest optimal Good/Better/Best tier pricing.

### Job Management
Job scheduling includes start/end clock functionality with duration tracking. Jobs have a detailed status flow (Scheduled → En Route → Service Started → In Progress → Final Touches → Completed) and a customer-facing live update page (`/job-updates/:token`) showing progress, checklist items, and photos.

### AI Follow-Up Automation
When a quote is sent, the system automatically schedules a follow-up message to be delivered 24 hours later (if not accepted). The follow-up is stored in the `communications` table with `status='queued'` and processed by a background cron (hourly). An AI message is generated on delivery using quote context (customer name, amount, business name, quote link). Users can:
- Toggle automation on/off per business (`automation_rules.quote_followups_enabled`)
- Change timing (12h/24h/48h via `automation_rules.followup_schedule`)
- Edit/preview the AI-generated message before it sends
- Send now or cancel any scheduled follow-up
- Follow-ups auto-cancel when quote is accepted (`cancel_pending_communications_for_quote`)
UI: "Follow-Up Automation" section in `QuoteDetailScreen.tsx` (mobile) and `QuoteDetailPage.tsx` (web), visible only for `sent` quotes.
API routes: `GET /api/quotes/:id/scheduled-followups`, `POST /api/communications/:id/send-now`, `PUT /api/communications/:id`, `DELETE /api/communications/:id`, `POST /api/quotes/:id/followup-preview`.

### Web Dashboard (DashboardPage.tsx)
The web dashboard (`web/src/pages/DashboardPage.tsx`) was fully redesigned as a premium "Revenue Command Center". Sections top to bottom:
1. **CommandHeader** — dark gradient hero (slate-900 → primary-800) with business greeting, glass stat pills (Month Revenue, Jobs This Week, Close Rate, At Risk), and a white "New Quote" CTA. Shows an amber alert ribbon when follow-ups are at risk.
2. **StartHereChecklist** — shown for new/low-setup users only (steps: set rates, create quote, add client, activate follow-ups).
3. **KPI Row** — 4 tinted gradient cards: "Revenue Won" (emerald), "Active Jobs" (blue), "Close Rate" (dynamic color), "Pipeline Value" (amber/violet).
4. **TodayOperations** — 4-cell strip: Cleans Today, Revenue Today, Next Clean, Needs Scheduling.
5. **TodaysRevenueMoves** — up to 3 dynamic action cards based on current business state.
6. **Pipeline + Attention** — 5-col grid: `PipelineCard` (3 cols) with funnel bars + close rate/avg value stats, `AttentionPanel` (2 cols) with severity-coded action items.
7. **AIGrowthTools** — dark-header card with 5 AI quick-launch buttons.
8. **Follow-Up Streak + Weekly Recap** — side-by-side cards.
9. **Revenue Chart** — 6-month bar chart with hover tooltips.
10. **Recent Quotes** — table with hover highlight and clickable rows.

## External Dependencies

### Core Framework
- Expo SDK 54
- React 19.1.0
- React Native 0.81.5

### Navigation & UI
- @react-navigation/native, @react-navigation/native-stack, @react-navigation/bottom-tabs
- react-native-reanimated, react-native-gesture-handler

### Data & State
- @tanstack/react-query
- @react-native-async-storage/async-storage
- drizzle-orm
- zod

### Server
- express
- express-session, connect-pg-simple
- bcrypt
- pg

### AI Integration
- OpenAI via Replit AI Integrations (gpt-4o-mini for all AI routes)

### Third-Party Services
- **Twilio**: SMS integration.
- **SendGrid**: Email integration.
- **Google Calendar**: OAuth2-based calendar sync.
- **Stripe Connect**: Online payments via Stripe Express and Stripe Checkout.
- **RevenueCat**: In-app subscription management ($19.99/mo Pro tier).
- **Expo-notifications**: Push notification support.
- **Expo-print**, **expo-sharing**: For quote PDF export.
- **QuickBooks Online**: OAuth2 integration for customer and invoice management.
- **Jobber**: OAuth2 integration for client and job creation via GraphQL API.

### Integrations Lite
- **Invoice Packets**: Generate QuickBooks-compatible invoice packets (PDF/CSV/text).
- **Calendar Integration**: Create calendar event stubs with ICS download and Google Calendar deep links.
- **Webhooks & API Keys**: For Zapier/Make with HMAC-SHA256 signing and retry logic for events like `quote.created/sent/accepted/declined`.

### Scalable Calculator Engine
- **Engine**: `server/calculator-engine.ts` — data-driven calculator engine. Define a `CalcDefinition` (slug, fields, formula, SEO content, FAQ) and the engine auto-generates the full calculator page with form, tier pricing, quote funnel, and SEO markup.
- **Template**: `server/seo-pages.ts` — shared `renderSEOPage()` template with all CSS/HTML/JS for tier cards, quote preview, proposal overlay, signup modal.
- **Index page**: `/calculators` — lists all calculators with card grid, count badge, and toolkit CTA.
- **Dynamic route**: `/calculators/:slug` — looks up `CalcDefinition` from registry and renders the page.
- **Current calculators (10)**: house-cleaning-price, deep-cleaning-price, move-in-out-cleaning, office-cleaning-bid, carpet-cleaning-price, window-cleaning-price, pressure-washing-price, airbnb-cleaning-price, post-construction-cleaning, janitorial-bidding.
- **Legacy URLs**: `/house-cleaning-price-calculator`, `/deep-cleaning-price-calculator`, `/move-in-out-cleaning-calculator` redirect 301 to `/calculators/` prefix.
- **Features**: FAQ schema markup (JSON-LD), canonical URLs, OG/Twitter meta, Good/Better/Best tier pricing, mobile responsive, breadcrumbs linking to `/calculators`.
- **Instant Quote Generator Funnel**: After calculator results, a quote preview card appears. "Generate Professional Quote" opens proposal overlay. "Send This Quote" triggers signup modal. `POST /api/public/calculator-signup` creates user + business + quote (server-side price recalculation, rate-limited, validated inputs) and redirects to `/app/quotes/:id`.
- **Adding new calculators**: Add a `CalcDefinition` object to the `calculators` array in `server/calculator-engine.ts`. No routing changes needed — the `/calculators/:slug` route handles it automatically.

### Cleaning Business Toolkit
- **Web route**: `/app/toolkit` — resource page with 10 downloadable/viewable cleaning business resources (calculators, templates, scripts, AI prompts).
- **Lead capture modal**: Gated behind email capture modal. Email (required) + first name (optional). Session-unlocked via `sessionStorage`; per-resource unlock via `localStorage`.
- **Backend endpoint**: `POST /api/public/toolkit-lead` (public, no auth) — stores leads in `toolkit_leads` table with `ON CONFLICT DO NOTHING` for idempotent duplicate handling.
- **DB table**: `toolkit_leads` (id, email UNIQUE, first_name, resource, source, created_at).
- **Components**: `web/src/pages/ToolkitPage.tsx`, `web/src/components/LeadCaptureModal.tsx`.
