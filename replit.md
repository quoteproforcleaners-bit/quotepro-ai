# QuotePro

## Overview
QuotePro is a SaaS platform designed for residential cleaning companies to streamline operations, improve customer engagement, and foster business growth. It offers tools for accurate, branded customer quotes, CRM, job scheduling, communication, and overall business management. Key capabilities include a multi-step quote calculator with Good/Better/Best pricing, customizable business profiles, configurable pricing, and AI-powered communication and sales assistance. The platform aims to provide a comprehensive solution for managing and growing a cleaning business, incorporating features like job photo attachments, recurring job automation, quote PDF exports, and advanced analytics for revenue forecasting and customer satisfaction.

## User Preferences
Preferred communication style: Simple, everyday language.
iPhone-only app. No hours/times shown to customers. Customizable service types.
Freemium model with 4 tiers: Free (3 total quotes), Starter ($19/mo, 20 quotes/month, basic CRM), Growth ($49/mo or $39/mo annual, unlimited quotes + AI), Pro ($99/mo or $79/mo annual, integrations). RevenueCat handles iOS subscriptions (EXPO_PUBLIC_REVENUECAT_API_KEY, iOS only). Server-side quota enforced at `POST /api/quotes`. Client-side check via `GET /api/quotes/count` before saving. `SubscriptionContext` tracks `tier: PlanTier ("free"|"starter"|"growth"|"pro")`, `isPro` (=Growth or Pro), `isGrowth` (=Growth or Pro), `isStarter` (=Starter+). `ProGate` component wraps premium screens with `minTier` prop (defaults "growth"). Starter users can access basic CRM (CustomersScreen minTier="starter"). Growth gates: WalkthroughAI ("AI Quote Builder"), FollowUpQueue ("Automated Follow-Ups"), AutomationsHub ("Growth Automation"), UpsellOpportunities ("Smart Upsell Recommendations"), AIAssistant ("AI Business Advisor"), Reports/Revenue. AI builder gate intercepts card tap in QuoteCalculatorScreen before navigation (logged-in users only). Starter quote counter banner in QuoteCalculatorScreen shows "X of 20 used this month". PaywallScreen: Growth default, annual billing default, "2 MONTHS FREE" badge, contextual headers for trigger_source (quote_limit, ai_builder_gate, feature_gate), outcome-driven copy.

## System Architecture

### Frontend Architecture
The frontend consists of a React Native (Expo SDK 54) mobile application and a React 19 web application. Both utilize React Navigation/React Router for navigation, React Native Reanimated for animations (mobile), and React Context/React Query for state management. Styling is theme-based, supporting light/dark modes. The web app features a "Warm Minimal" design system with a premium aesthetic, including a 248px left sidebar, a command palette triggered by ⌘K, and a redesigned "Revenue Command Center" dashboard with key performance indicators and growth tools.

### Backend Architecture
The backend is an Express.js application built with Node.js and TypeScript. It provides authenticated API routes (prefixed with `/api`) and manages background jobs for tasks like quote expiration.

### Data Storage
A PostgreSQL Database, backed by Neon, is used with Drizzle ORM for data modeling and interactions. Session management is handled by `express-session` with `connect-pg-simple`.

### Authentication
The system uses session-based authentication supporting email/password, Apple, and Google SSO.

### Core Functionality
- **Quote Calculation Engine**: A flexible engine calculates base hours and applies multipliers, supporting customizable service types, discounts, and add-ons. It also includes comprehensive commercial quoting features with AI-powered scope generation.
- **Instant Quote Page**: A public-facing page (`/q/:token`) allows customers to view, accept quotes, select tiers, toggle add-ons, make deposit payments via Stripe Checkout, and view testimonials.
- **AI Features**:
    - **QuotePro AI Agent (3-mode)**: A production-quality AI agent at `/app/ai-assistant` with three distinct modes:
      - **My Business** (`mode: "business"`): Fetches real user data (quotes, customers, jobs, revenue, pipeline) and answers data-driven questions with specifics. Backend at `POST /api/ai/agent-chat`.
      - **Coach Me** (`mode: "coach"`): Sales and operations coaching with tactical advice, scripts, objection handling, and revenue growth strategies.
      - **Teach Me** (`mode: "teach"`): Cleaning industry education covering pricing norms, service types, operations, growth, and business KPIs.
    - **Walkthrough AI Quoting**: Extracts structured quote details from natural language input using `gpt-4o-mini`.
    - **AI Closing Assistant**: Generates customer-facing messages in various tones and languages.
    - **AI Dynamic Pricing Suggestions**: Recommends optimal Good/Better/Best tier pricing based on property details and history.
- **Job Management**: Provides detailed job scheduling, status tracking (Scheduled to Completed), and customer-facing live updates.
- **AI Follow-Up Automation**: Automatically schedules and sends AI-generated follow-up messages for unaccepted quotes, with user control over timing and content.
- **Scalable Calculator Engine**: A data-driven engine (`server/calculator-engine.ts`) dynamically generates full calculator pages based on defined `CalcDefinition` objects, including SEO content, pricing tiers, and a quote funnel.
- **Cleaning Business Toolkit**: A resource page (`/app/toolkit`) offering downloadable business resources, gated by email capture.

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
- **RevenueCat**: In-app subscription management (iOS only).
- **Expo-notifications**: Push notification support.
- **Expo-print**, **expo-sharing**: For quote PDF export.
- **QuickBooks Online**: OAuth2 integration for customer and invoice management.
- **Jobber**: OAuth2 integration for client and job creation.

### Multilingual System
- **App Language**: Each business can set their interface language (`businesses.app_language` column). Options: en/es/pt/ru. Synced to `i18next` on login/change via App.tsx effect. Translation files in `web/src/locales/{en,es,pt,ru}.json`. Library: `react-i18next`.
- **Outbound Communication Language**: Each business sets a default language for customer-facing communications (`businesses.comm_language`). Used in AI-generated follow-ups, quotes, reminders, etc. via `getLangInstruction()` in routes.ts.
- **Customer Language Override**: Each customer can have a `preferred_language` column override. The `getEffectiveLang(customerId, businessCommLanguage)` helper in routes.ts checks this first. Follow-up messages and quote messages now use this resolver.
- **Language Settings UI**: `AccountSettingsPage.tsx` has a "Language Settings" card with independent selectors for App Language (blue selection) and Outbound Language (green selection). API: `PUT /api/settings/language`.
- **Translated Nav**: `Layout.tsx` uses `useTranslation` with `NAV_LABEL_KEYS` and `SECTION_LABEL_KEYS` lookup maps to translate all sidebar labels and section headers dynamically.
- **Customer Detail**: `CustomerDetailPage.tsx` includes a "Preferred Language" chip selector in the edit form.
- **Hook**: `web/src/lib/useLanguage.ts` provides `{ t, appLanguage, outboundLanguage, setAppLanguage, setOutboundLanguage }`.

### Integrations Lite
- **Invoice Packets**: Generation of QuickBooks-compatible invoice packets.
- **Calendar Integration**: Creation of calendar event stubs with ICS download and Google Calendar deep links.
- **Webhooks & API Keys**: For Zapier/Make with HMAC-SHA256 signing and retry logic.