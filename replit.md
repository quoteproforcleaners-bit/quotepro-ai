# QuotePro

## Overview

QuotePro is a comprehensive SaaS platform for residential cleaning companies, aiming to streamline operations, enhance customer engagement, and drive business growth. It offers tools for accurate, branded customer quotes, CRM, job scheduling, communications, and business management. The platform features a multi-step quote calculator, Good/Better/Best pricing, customizable business profiles, and configurable pricing settings. Key capabilities include AI-powered draft generation for customer communications, an AI Command Center for natural language interaction, job photo attachments, recurring job automation, and quote PDF exports. A significant feature is the "Social / AI Sales Assistant" for lead capture and automated replies via Instagram and TikTok DMs, part of the "QuotePro AI" subscription tier. The platform supports multi-user access and stores all data server-side in PostgreSQL. Recent enhancements include a guest mode for quote generation, an enhanced quote acceptance system with revenue playbook recommendations, an underpricing detector, a follow-up queue, weekly recap, opportunities management, a growth automation suite with a task engine, sales strategy profiles, and revenue forecasting. Additional features include customer satisfaction ratings (1-5 stars on completed jobs with dashboard summary, plus public customer-facing rating page at `/rate/:token` with branded UI), VIP customer badges (toggle on any customer with gold badge UI), customizable dashboard widgets (drag-and-arrange with AsyncStorage persistence), smooth animated screen transitions (Reanimated fade+slide wrappers on all tab screens), a dark mode schedule (system/light/dark/auto-evening modes via Settings), and Apple-compliant AI consent management (explicit user permission before sharing data with OpenAI, toggleable in Settings, persisted via AsyncStorage).

## User Preferences

Preferred communication style: Simple, everyday language.
iPhone-only app. No hours/times shown to customers. Customizable service types.
Freemium model: Basic quote creation is free. All premium features (CRM, Jobs, Growth, AI, Automations, Sales Strategy, Social) are paywalled at $14.99/month via RevenueCat. ProGate component (`/client/components/ProGate.tsx`) wraps 21 premium screens, showing inline paywall overlay for non-Pro users. Dashboard AI Command Center also gated via `useProGate` hook. QuoteDetail and QuotePreview have individual AI feature gates. AIAssistantScreen and RevenueScreen have their own isPro redirects.

## System Architecture

### Frontend Architecture

The frontend is built with **React Native (Expo SDK 54)**, using **React Navigation** for native stack and bottom tab navigation. **React Native Reanimated** and **React Native Gesture Handler** manage animations and touch. State management utilizes **React Context (AppContext)** for global state and **React Query (TanStack Query)** for server state. Styling adheres to a centralized theme (`/constants/theme.ts`) supporting light/dark modes and platform adaptations. The navigation structure includes a Root Stack Navigator with conditional rendering for authentication and onboarding, leading to a Main Tab Navigator with Home, Customers, Quotes, Jobs, Growth, and Settings tabs, as well as various modal and stack screens for detailed functionalities.

### Backend Architecture

The backend is an **Express.js with Node.js and TypeScript** application, configured with CORS. All API routes are prefixed with `/api` and secured by `requireAuth` middleware. A background job handles automatic expiration of old quotes.

### Data Storage

A **PostgreSQL Database (Neon-backed)** is used with **Drizzle ORM** for schema definition (`/shared/schema.ts`) and CRUD operations (`/server/storage.ts`). Key tables include `users`, `businesses`, `pricing_settings`, `customers`, `quotes`, `jobs`, `communications`, and specialized tables for social features (`social_connections`, `social_conversations`, `social_leads`) and the growth automation suite (`growth_tasks`, `growth_task_events`, `campaigns`). Session management is handled by a `session` table using `express-session` and `connect-pg-simple`.

### Authentication

Session-based authentication uses `express-session`, supporting email/password, Apple, and Google SSO. `AuthContext` on the frontend manages authentication state.

### Quote Calculation Engine

The core logic, located in `/client/lib/quoteCalculator.ts`, calculates base hours based on square footage and applies multipliers for property attributes. It supports **customizable service types**, frequency discounts, and add-on pricing. Internal calculations for hours and estimated times are not exposed to customers.

### Commercial Quoting Feature

A comprehensive commercial quoting add-on (`/client/features/commercial/`) with:
- **Feature Flag**: `commercialQuotingEnabled` in `/client/lib/featureFlags.ts`, persisted via AsyncStorage toggle in Settings
- **Quote Type Selector**: Added to QuoteCalculatorScreen - Residential vs Commercial selection at start of quote flow
- **Commercial Walkthrough Wizard** (6 steps): Site Basics, Areas & Counts, Floors & Surfaces, Frequency & Timing, Supplies & Equipment, Notes & Photos
- **Labor Estimate Engine**: Transparent labor-hours-per-visit calculator based on facility type, sqft, room counts, floor mix, with user override
- **Pricing/Margin Engine**: Configurable hourly rate, overhead %, profit margin %, supplies surcharge, rounding rules, with Margin Health badge
- **Tier Builder**: Auto-generated Good/Better/Best tiers (Basic Janitorial, Enhanced Sanitation, Premium Maintenance) with editable names, tasks, prices
- **Proposal Preview**: Full commercial proposal preview with Cover, Scope of Work, Schedule, Pricing Table, Terms, Acceptance
- **AI Features**: "Generate Professional Scope" (generates per-tier scope paragraph + included/excluded tasks) and "AI Risk Scan" (analyzes pricing risks with severity levels, suggested clauses, overall assessment) - both use AIConsentContext for Apple compliance
- **Attachments**: COI (Certificate of Insurance) and W-9 document attachments via expo-document-picker, supports PDF and image files, images embedded as base64 in proposal HTML, PDFs merged via pdf-lib, stored locally with metadata in quote data
- **PDF Export**: Commercial proposal PDF via `/api/quotes/:id/commercial-pdf` using expo-print + expo-sharing, with optional COI/W-9 attachment pages appended
- **Server Endpoints**: `/api/commercial/generate-scope`, `/api/commercial/risk-scan`, `/api/quotes/:id/commercial-pdf`
- **Quote List**: Commercial badge on list items, Type filter (All/Residential/Commercial)
- Commercial quote data stored in existing quotes table using `propertyDetails` JSONB field with `quoteType: "commercial"` and `commercialData` object

Key files:
- Types: `client/features/commercial/types.ts`
- Labor model: `client/features/commercial/laborModel.ts`
- Screens: `client/features/commercial/screens/` (CommercialQuoteScreen, WalkthroughScreen, LaborEstimateScreen, PricingEngineScreen, TierBuilderScreen, ProposalPreviewScreen)
- Components: `client/features/commercial/components/` (SiteBasicsStep, AreasCountsStep, FloorsSurfacesStep, FrequencyTimingStep, SuppliesEquipmentStep, NotesPhotosStep, TierCard, MarginBadge)

## External Dependencies

### Core Framework
- **Expo SDK 54**
- **React 19.1.0**
- **React Native 0.81.5**

### Navigation & UI
- **@react-navigation/native**
- **@react-navigation/native-stack**, **@react-navigation/bottom-tabs**
- **react-native-reanimated**, **react-native-gesture-handler**

### Data & State
- **@tanstack/react-query**
- **@react-native-async-storage/async-storage**
- **drizzle-orm**
- **zod**

### Server
- **express**
- **express-session**, **connect-pg-simple**
- **bcrypt**
- **pg**

### AI Integration
- **OpenAI via Replit AI Integrations (gpt-5-nano)**

### Third-Party Services
- **Twilio**: SMS integration (env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER).
- **SendGrid**: Email integration (env: SENDGRID_API_KEY, SENDGRID_FROM_EMAIL).
- **Google Calendar**: OAuth2-based calendar sync (env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET).
- **Stripe Connect**: Online payments via Stripe Express and Stripe Checkout (env: STRIPE_PUBLISHABLE_KEY, STRIPE_SECRET_KEY).
- **RevenueCat**: In-app subscription management ($14.99/mo Pro tier). Configured via `SubscriptionContext` with retry logic for offerings loading, inline error states on paywall, and `offerings.current` usage (not hardcoded identifiers). API key fetched from server `/api/subscription/config`. Entitlement IDs: `["Pro", "QuotePro for Cleaners Pro", "pro"]`.
- **Expo-notifications**: Push notification support.
- **Expo-print**, **expo-sharing**: For quote PDF export.

### iPad Layout Compatibility
All onboarding screens use ScrollView with sticky footer buttons and 560px max-width centering for iPad compatibility. The pattern: content wraps in `<View style={{ maxWidth: 560, width: "100%" }}>` inside a ScrollView with `contentContainerStyle={{ alignItems: "center" }}` when `screenWidth > 600`.