# QuotePro

## Overview
QuotePro is a SaaS platform designed for residential cleaning companies to streamline operations, improve customer engagement, and foster business growth. It provides tools for accurate, branded customer quotes, CRM, job scheduling, communication, and overall business management. Key features include a multi-step quote calculator with Good/Better/Best pricing, customizable business profiles, and configurable pricing settings. The platform integrates AI for drafting customer communications and an AI Command Center for natural language interaction. Advanced capabilities encompass job photo attachments, recurring job automation, quote PDF exports, and a "Social / AI Sales Assistant" for lead capture and automated replies via Instagram and TikTok DMs (part of the "QuotePro AI" tier). Recent additions include a guest mode for quotes, an enhanced quote acceptance system with revenue playbook recommendations, an underpricing detector, a follow-up queue, opportunities management, a growth automation suite with a task engine, sales strategy profiles, revenue forecasting, customer satisfaction ratings, VIP customer badges, customizable dashboard widgets, animated screen transitions, dark mode scheduling, and Apple-compliant AI consent management.

## User Preferences
Preferred communication style: Simple, everyday language.
iPhone-only app. No hours/times shown to customers. Customizable service types.
Freemium model: Free users get 3 residential quotes total. All premium features (CRM, Jobs, Growth, AI, Automations, Sales Strategy, Social) are paywalled at $19.99/month via RevenueCat. Server-side quote limit enforced in `POST /api/quotes` (403 if free user has >=3 quotes). Client-side check via `GET /api/quotes/count` before saving. ProGate component (`/client/components/ProGate.tsx`) wraps 21 premium screens. Dashboard AI Command Center gated via `useProGate` hook. PaywallScreen accepts `trigger_source` route param for contextual messaging (quote_limit, after_demo, feature_gate, settings). SubscriptionContext tracks `subscriptionStatus` (free/trial/active/expired) and `trialDaysLeft`.

## System Architecture

### Frontend Architecture
The frontend is built with React Native (Expo SDK 54), utilizing React Navigation for native stack and bottom tab navigation. Animations and touch interactions are managed by React Native Reanimated and React Native Gesture Handler. State management employs React Context for global state and React Query for server state. Styling is based on a centralized theme (`/constants/theme.ts`) supporting light/dark modes and platform adaptations. The navigation structure includes a Root Stack Navigator with conditional rendering for authentication and onboarding, leading to a Main Tab Navigator with Home, Customers, Quotes, Jobs, Growth, and Settings tabs, alongside various modal and stack screens for detailed functionalities. There is also a companion web application served at `/app`, built with React 19, Vite, Tailwind CSS, and React Router, sharing the same backend APIs and session authentication.

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
- **Walkthrough AI Quoting**: Allows generating quotes by extracting structured fields from natural language descriptions using `gpt-5-nano`, followed by pricing recommendations and quote creation.
- **AI Closing Assistant**: Generates customer-facing messages for various purposes in multiple tones and languages.
- **AI Dynamic Pricing Suggestions**: Analyzes property details, add-ons, frequency, and history to suggest optimal Good/Better/Best tier pricing.

### Job Management
Job scheduling includes start/end clock functionality with duration tracking. Jobs have a detailed status flow (Scheduled → En Route → Service Started → In Progress → Final Touches → Completed) and a customer-facing live update page (`/job-updates/:token`) showing progress, checklist items, and photos.

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
- OpenAI via Replit AI Integrations (gpt-5-nano)

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

### SEO Calculator Landing Pages
- **Template system**: `server/seo-pages.ts` — reusable `renderSEOPage(config)` template for creating SEO-optimized calculator pages.
- **Pages**:
  - `/house-cleaning-price-calculator` — standard cleaning price calculator with beds/baths/sqft/service type/frequency
  - `/deep-cleaning-price-calculator` — deep clean calculator with home condition selector
  - `/move-in-out-cleaning-calculator` — move clean calculator with extras (garage, carpet treatment)
- **Features**: FAQ schema markup (JSON-LD), absolute canonical URLs, OG/Twitter meta tags, client-side calculator with Good/Better/Best tier pricing, mobile responsive layout, internal links to toolkit.
- **Instant Quote Generator Funnel**: After calculator results, a professional quote preview card appears showing service details + estimated price. "Generate Professional Quote" opens a styled proposal overlay with service details, scope of work, and estimated investment. "Send This Quote to Your Customer" triggers a signup modal. On signup, `POST /api/public/calculator-signup` creates user + business + quote (server-side price recalculation, rate-limited, validated inputs) and redirects to `/app/quotes/:id`.
- **Adding new pages**: Create a new function in `seo-pages.ts` following `CalculatorPageConfig` interface, register the route in `routes.ts`.

### Cleaning Business Toolkit
- **Web route**: `/app/toolkit` — resource page with 10 downloadable/viewable cleaning business resources (calculators, templates, scripts, AI prompts).
- **Lead capture modal**: Gated behind email capture modal. Email (required) + first name (optional). Session-unlocked via `sessionStorage`; per-resource unlock via `localStorage`.
- **Backend endpoint**: `POST /api/public/toolkit-lead` (public, no auth) — stores leads in `toolkit_leads` table with `ON CONFLICT DO NOTHING` for idempotent duplicate handling.
- **DB table**: `toolkit_leads` (id, email UNIQUE, first_name, resource, source, created_at).
- **Components**: `web/src/pages/ToolkitPage.tsx`, `web/src/components/LeadCaptureModal.tsx`.