# QuotePro - Compressed

## Overview
QuotePro is a SaaS platform designed for residential cleaning companies. Its primary purpose is to streamline operations, enhance customer engagement, and drive business growth through a comprehensive suite of tools. Key capabilities include a multi-step quote calculator with Good/Better/Best pricing, customizable business profiles, configurable pricing models, and AI-powered communication and sales assistance. The platform offers CRM functionalities, job scheduling, communication tools, job photo attachments, recurring job automation, quote PDF exports, and advanced analytics for revenue forecasting and customer satisfaction. QuotePro aims to be an all-in-one solution for managing and expanding cleaning businesses.

## User Preferences
Preferred communication style: Simple, everyday language.
iPhone-only app. No hours/times shown to customers. Customizable service types.

## System Architecture

### Frontend
The frontend consists of a React Native (Expo SDK 54) mobile application and a React 19 web application. Both utilize React Navigation/React Router for navigation, React Native Reanimated for mobile animations, and React Context/React Query for state management. Styling is theme-based with light/dark modes. The web app employs a "Warm Minimal" design system, a 248px left sidebar, a command palette (⌘K), and a "Revenue Command Center" dashboard with key performance indicators.

### Backend
The backend is an Express.js application built with Node.js and TypeScript. It features a modular routing system, with domain-specific routers mounted at various prefixes or directly at the `/api` root.

### Data Storage
A PostgreSQL Database, powered by Neon, is used with Drizzle ORM. Session management is handled by `express-session` with `connect-pg-simple`.

### Authentication
The system uses session-based authentication supporting email/password, Apple, and Google SSO.

### Core Functionality
- **First-Quote Onboarding Gate**: New users cannot access the dashboard or any nav until they generate their first quote. Gate routes to `/onboarding/first-quote`, then `/onboarding/complete` which shows an iframe preview of the live customer quote view (`?preview=1` param disables analytics/tracking). Gate skips for existing users via `has_completed_first_quote` DB flag (backfilled). `OnboardingCompletePage` calls `auth.refresh()` before navigating to `/dashboard` so the gate is correctly lifted client-side. E2E Playwright tests live in `tests/first-quote-gate.spec.ts`.
- **Quote Calculation Engine**: A flexible engine that calculates base hours and applies multipliers, supporting customizable service types, discounts, add-ons, and AI-powered commercial quoting.
- **Instant Quote Page**: Public-facing pages allowing customers to view, accept quotes, select tiers, toggle add-ons, make deposit payments, and view testimonials. Supports `?preview=1` parameter for operator previews (disables view logging, push notifications, follow-up creation, and accept/decline actions).
- **AI Features**: Includes an AI Agent with "My Business", "Coach Me", and "Teach Me" modes; Walkthrough AI Quoting for structured details from natural language; AI Closing Assistant for customer messages; and AI Dynamic Pricing Suggestions.
- **Job Management**: Provides detailed job scheduling, status tracking, and customer-facing updates.
- **AI Follow-Up Automation**: Automatically schedules and sends AI-generated follow-up messages for unaccepted quotes.
- **Public SEO Calculator Pages**: Commercial and residential cleaning cost calculators with benchmarks, PDF exports, and shareable URLs. These are driven by a scalable calculator engine that generates pages from `CalcDefinition` objects.
- **Lead Link Microsite**: A progressive disclosure quote request page for customers.
- **Smart Push Notification System**: Server-side push notifications for various triggers with user preferences and cron-based scheduling.
- **Trial Drip Email System**: A sequence of emails to new users to encourage platform engagement.
- **Multilingual System**: Supports per-business currency, app language, and outbound communication language with customer-specific overrides.
- **Customer Portal**: A "My Home" portal for customers to manage quotes, reschedule requests, and view preferences.
- **Model Context Protocol (MCP) Server**: Exposes API tools for AI agents (e.g., `get_cleaning_quote`, `get_commercial_bid`) via an OpenPlugin manifest.
- **Payment Collection**: Implements payment processing, auto-charging for recurring services, and dunning management.
- **Finance Intelligence**: Provides a finance dashboard with metrics, audit logs, reports, and an AI finance chat assistant.

### UI/UX
- Redesigned `DashboardPage.tsx` with simplified stats and a `TodaysFocus` component.
- Web navigation restructured with renamed sections and reorganized items.
- Context-aware upgrade prompts within `ProGate` components.
- Version-gated changelog modal (`WhatsNewModal`).
- Feature discovery tips on the dashboard.
- Full i18n support for page body internationalization using locale files and `useDateFormat` hook.

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