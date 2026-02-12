# QuotePro

## Overview

QuotePro is a comprehensive SaaS platform designed for residential cleaning companies, offering tools for generating accurate, branded customer quotes, and managing customer relationships, job scheduling, and communications. The platform aims to streamline operations, enhance customer engagement, and drive business growth.

Key capabilities include:
- A multi-step quote calculator supporting detailed property information and service add-ons.
- Good/Better/Best pricing options with live previews.
- CRM functionalities for managing customers, notes, and tags.
- Job scheduling with status tracking and task checklists.
- Integrated communication tracking for emails, SMS, and phone calls.
- Customizable business profiles with branding options.
- Configurable pricing settings, including hourly rates, minimums, and frequency discounts.
- AI-powered draft generation for customer communications.
- A dashboard providing revenue analytics and task management.
- Job photo attachments (before/after photos with captions via image picker).
- Recurring job automation (weekly/biweekly/monthly/quarterly auto-scheduling on completion).
- Quote PDF export with branded HTML template (uses expo-print and expo-sharing).
- Push notification support (expo-notifications with token registration).
- Twilio SMS integration for sending text messages to customers (env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER).
- SendGrid email integration for sending emails to customers (env: SENDGRID_API_KEY, SENDGRID_FROM_EMAIL=quoteproforcleaners@gmail.com).

A new "Social / AI Sales Assistant" feature integrates with Instagram and TikTok DMs for lead capture, AI-powered intent detection, automated replies with quote links, and comprehensive lead management with attribution tracking. This feature is part of the "QuotePro AI" subscription tier, emphasizing AI-driven value. The platform supports multi-user access with various authentication methods and stores all data server-side in PostgreSQL.

## User Preferences

Preferred communication style: Simple, everyday language.
iPhone-only app. No hours/times shown to customers. Customizable service types.
Future plan: Freemium model where quoting is free, CRM/jobs/automation are paid (RevenueCat for subscriptions).

## System Architecture

### Frontend Architecture

The frontend is built using **React Native with Expo SDK 54**, leveraging **React Navigation** for a structured native stack and bottom tab navigation. Animations are handled with **React Native Reanimated** and touch interactions with **React Native Gesture Handler**.

**State Management**: Global application state (business profile, pricing settings, onboarding) is managed via **React Context (AppContext)**. Server state is managed using **React Query (TanStack Query)**, while UI-specific state uses local `useState`.

**Navigation**: Features a Root Stack Navigator with conditional rendering based on authentication and onboarding status. It includes distinct stacks for authentication, a multi-step onboarding process, and a Main Tab Navigator with Home, Customers, Quotes, Jobs, Social, and Settings tabs. Various modal and stack screens support detailed functionalities like quote calculation, customer details, and social conversations.

**Styling**: Adheres to a centralized theme defined in `/constants/theme.ts`, supporting light/dark modes and platform-specific adaptations. Components are designed for reusability and consistency, utilizing themed components and a robust design system with specific brand colors, typography, and patterns for empty states and stat cards.

### Backend Architecture

The backend runs on **Express.js with Node.js and TypeScript**, configured with CORS and serving static files for production web builds. A background job handles automatic expiration of old quotes.

**API Pattern**: All API routes are prefixed with `/api` and secured by `requireAuth` middleware for authenticated endpoints.

### Data Storage

**PostgreSQL Database (Neon-backed)**: Utilizes **Drizzle ORM** for schema definition (`/shared/schema.ts`) and CRUD operations (`/server/storage.ts`).

**Key Database Tables**:
- `users`, `businesses`, `pricing_settings`, `customers`, `quotes`, `quote_line_items`, `jobs`, `job_checklist_items`, `communications`, `automation_rules`, `tasks`.
- Social features introduce: `social_connections`, `social_conversations`, `social_messages`, `social_leads`, `social_automation_settings`, `social_attribution_events`, `social_onboarding`.
- Session management is handled by a `session` table using `express-session` and `connect-pg-simple`.

**Authentication**: Session-based authentication using `express-session`, supporting email/password, Apple, and Google SSO. `AuthContext` on the frontend manages authentication state, gating navigation flows.

### Quote Calculation Engine

The core quote calculation logic is in `/client/lib/quoteCalculator.ts`. It calculates base hours based on square footage and applies multipliers for various property attributes. **Customizable service types** allow users to define names and multipliers, mapping them to Good/Better/Best options. Frequency discounts and add-on pricing are also supported. The system internally calculates hours and estimated times, but these are not exposed to customers.

## External Dependencies

### Core Framework
- **Expo SDK 54**: For React Native development.
- **React 19.1.0**: UI library.
- **React Native 0.81.5**: Native mobile framework.

### Navigation & UI
- **@react-navigation/native**: Core navigation.
- **@react-navigation/native-stack**, **@react-navigation/bottom-tabs**: Specific navigators.
- **react-native-reanimated**, **react-native-gesture-handler**: For animations and touch.
- **@expo/vector-icons**: Icon library.
- **expo-blur**, **expo-haptics**: UI enhancements.

### Data & State
- **@tanstack/react-query**: Server state management.
- **@react-native-async-storage/async-storage**: Local data persistence.
- **drizzle-orm**: PostgreSQL ORM.
- **zod**: Schema validation.

### Server
- **express**: HTTP server.
- **express-session**, **connect-pg-simple**: Session management.
- **bcrypt**: Password hashing.
- **pg**: PostgreSQL client.
- **drizzle-orm**: Database ORM.

### AI Integration
- **OpenAI via Replit AI Integrations (gpt-5-nano)**: For AI-enhanced descriptions and communication drafts.