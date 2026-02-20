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
- AI-powered draft generation for customer communications (respects communication language preference).
- Dual language system: separate App Language and Customer Communication Language preferences. Stored in AsyncStorage (`@quotepro_language`, `@quotepro_comm_language`). `useLanguage()` exposes `t` (app translations) and `tc` (communication translations). AI endpoints accept `language` param for message generation.
- AI Command Center home screen with natural language command input, rotating example prompts, quick action chips, and "Today at a glance" stats. Uses a local deterministic intent parser (`client/lib/aiCommandRouter.ts`) with feature flags (`client/lib/featureFlags.ts`) to later swap in real AI.
- Job photo attachments (before/after photos with captions via image picker).
- Recurring job automation (weekly/biweekly/monthly/quarterly auto-scheduling on completion).
- Quote PDF export with branded HTML template (uses expo-print and expo-sharing).
- Push notification support (expo-notifications with token registration).
- Twilio SMS integration for sending text messages to customers (env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER).
- SendGrid email integration for sending emails to customers (env: SENDGRID_API_KEY, SENDGRID_FROM_EMAIL=quoteproforcleaners@gmail.com).
- Google Calendar integration: OAuth2-based sync that creates calendar events when jobs are scheduled/updated (env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET). Each user connects their own Google account via Settings > Integrations.
- Stripe Connect integration: Each cleaner connects their own Stripe Express account via Settings > Integrations. Supports online payments on quotes with a 3% platform fee. Payment links can be copied from quote details. Uses Stripe Checkout for payment collection (env: STRIPE_PUBLISHABLE_KEY, STRIPE_SECRET_KEY).

### Delayed Authentication / Guest Mode (Feb 2026)
- **LandingScreen** (`client/screens/LandingScreen.tsx`): First screen for unauthenticated users with "Create a Free Quote" CTA and "Sign In" button. Includes language switcher, feature grid, and "Why create an account?" benefits modal.
- **Guest Quote Flow**: Users can build a complete quote (Customer > Property > Services > Quote Preview) without signing up. Uses default pricing settings. Draft auto-saved to AsyncStorage via `client/lib/guestDraft.ts`.
- **AuthGateModal** (`client/components/AuthGateModal.tsx`): Bottom-sheet auth modal triggered when guest users try to save/send a quote. Supports Apple, Google, and email auth. On success, draft migrates to server.
- **AuthContext** (`client/context/AuthContext.tsx`): Added `isGuest`, `enterGuestMode()`, `exitGuestMode()`. Guest mode auto-exits on any successful auth.
- **Navigation**: `RootStackNavigator` shows Landing > Login | GuestQuoteCalculator when no user. QuoteCalculatorScreen detects guest mode and shows AuthGateModal on save.
- **i18n**: `landing` and `authGate` translation keys in `en.ts`/`es.ts`.

A new "Social / AI Sales Assistant" feature integrates with Instagram and TikTok DMs for lead capture, AI-powered intent detection, automated replies with quote links, and comprehensive lead management with attribution tracking. This feature is part of the "QuotePro AI" subscription tier, emphasizing AI-driven value. The platform supports multi-user access with various authentication methods and stores all data server-side in PostgreSQL.

### V3 Sticky Product Features (Feb 2026)
- **Follow-Up Queue** (`client/screens/FollowUpQueueScreen.tsx`): Smart follow-up management with Overdue/Due Today/Upcoming filter tabs, 5 age-based message templates with merge fields, snooze functionality, and quick actions (SMS/Email/Call/Mark Contacted).
- **Weekly Recap** (`client/screens/WeeklyRecapScreen.tsx`): Performance dashboard with stats grid, week navigation, at-risk quotes section, and weekly goal setting with progress tracking.
- **Opportunities** (`client/screens/OpportunitiesScreen.tsx`): Reactivation screen for dormant customers (configurable threshold) and lost/expired quotes with revenue recovery estimates and do-not-contact management.
- **Dashboard Enhancements**: Today's Focus card (follow-up count, at-risk value, oldest quote), streak badge display, opportunities summary card, and weekly recap link.
- **Streak Tracking**: Consecutive-day follow-up streaks tracked via `streaks` table, updates on follow-up actions, displayed in dashboard header.
- **Push Notifications**: Local notification scheduling for daily pulse reminders and weekly recaps via expo-notifications. Configurable time/day in Settings.
- **User Preferences** (Settings): Notification toggles (daily pulse, weekly recap, quiet hours), reminder time picker, recap day picker, dormant customer threshold (30-180 days).
- **Analytics Tracking** (`client/lib/analytics.ts`): Event tracking module for app_open, follow_up actions, and engagement metrics.
- **New DB Tables**: `follow_up_touches`, `streaks`, `user_preferences`, `analytics_events`, `badges` with 16 storage functions and 11 API endpoints.

### Growth Automation Suite (Feb 2026)
- **Growth Dashboard** (`client/screens/GrowthDashboardScreen.tsx`): Growth score (0-100), pipeline snapshot with revenue forecasting, growth opportunities carousel (Reviews/Upsells/Rebook/Reactivation), today's focus tasks, recent activity feed, quick actions.
- **Growth Task Engine**: 7 task types (QUOTE_FOLLOWUP, ABANDONED_RECOVERY, REBOOK_NUDGE, REVIEW_REQUEST, REFERRAL_ASK, UPSELL_DEEP_CLEAN, REACTIVATION) with priority scoring 0-100, 4-stage escalation, guardrails (max sends/day, quiet hours, cooldowns).
- **Tasks Queue** (`client/screens/TasksQueueScreen.tsx`): Unified task queue with type filters, priority badges (High/Med/Low), escalation dots, due date tracking, complete/skip/escalate actions.
- **Reviews & Referrals** (`client/screens/ReviewsReferralsScreen.tsx`): Review request management with platform selection, referral tracking.
- **Upsell Opportunities** (`client/screens/UpsellOpportunitiesScreen.tsx`): Deep clean upsell detection based on customer history, revenue estimates, AI message generation.
- **Reactivation Campaigns** (`client/screens/ReactivationScreen.tsx`): Dormant customer reactivation with lite campaign builder modal, audience targeting, message templates.
- **Automations Hub** (`client/screens/AutomationsHubScreen.tsx`): Marketing Mode toggle, workflow controls for each automation type, guardrail settings (max daily sends, quiet hours, cooldown periods).
- **Sales Strategy Profiles** (`client/screens/SalesStrategyScreen.tsx`): 4 profiles (Professional/Friendly/Premium/Urgent) with AI-powered escalation engine, dynamic message generation via OpenAI, escalation stage previews.
- **Revenue Forecasting**: Pipeline value, close rate, confidence bands via `/api/forecast` endpoint.
- **New DB Tables**: `growth_tasks`, `growth_task_events`, `review_requests`, `customer_marketing_prefs`, `growth_automation_settings`, `sales_strategy_settings`, `campaigns` with 25+ storage functions and 23 API endpoints.
- **Navigation**: Growth tab replaces Revenue tab in MainTabNavigator. Settings includes "Growth & Automations" section with links to Automations Hub and Sales Strategy.

## User Preferences

Preferred communication style: Simple, everyday language.
iPhone-only app. No hours/times shown to customers. Customizable service types.
Future plan: Freemium model where quoting is free, CRM/jobs/automation are paid (RevenueCat for subscriptions).

## System Architecture

### Frontend Architecture

The frontend is built using **React Native with Expo SDK 54**, leveraging **React Navigation** for a structured native stack and bottom tab navigation. Animations are handled with **React Native Reanimated** and touch interactions with **React Native Gesture Handler**.

**State Management**: Global application state (business profile, pricing settings, onboarding) is managed via **React Context (AppContext)**. Server state is managed using **React Query (TanStack Query)**, while UI-specific state uses local `useState`.

**Navigation**: Features a Root Stack Navigator with conditional rendering based on authentication and onboarding status. It includes distinct stacks for authentication, a multi-step onboarding process, and a Main Tab Navigator with Home, Customers, Quotes, Jobs, Growth, and Settings tabs. Various modal and stack screens support detailed functionalities like quote calculation, customer details, social conversations, and growth automation screens (TasksQueue, ReviewsReferrals, UpsellOpportunities, ReactivationCampaigns, AutomationsHub, SalesStrategy).

**Styling**: Adheres to a centralized theme defined in `/constants/theme.ts`, supporting light/dark modes and platform-specific adaptations. Components are designed for reusability and consistency, utilizing themed components and a robust design system with specific brand colors, typography, and patterns for empty states and stat cards.

### Backend Architecture

The backend runs on **Express.js with Node.js and TypeScript**, configured with CORS and serving static files for production web builds. A background job handles automatic expiration of old quotes.

**API Pattern**: All API routes are prefixed with `/api` and secured by `requireAuth` middleware for authenticated endpoints.

### Data Storage

**PostgreSQL Database (Neon-backed)**: Utilizes **Drizzle ORM** for schema definition (`/shared/schema.ts`) and CRUD operations (`/server/storage.ts`).

**Key Database Tables**:
- `users`, `businesses`, `pricing_settings`, `customers`, `quotes`, `quote_line_items`, `jobs`, `job_checklist_items`, `communications`, `automation_rules`, `tasks`.
- Social features introduce: `social_connections`, `social_conversations`, `social_messages`, `social_leads`, `social_automation_settings`, `social_attribution_events`, `social_onboarding`.
- Growth Automation Suite: `growth_tasks`, `growth_task_events`, `review_requests`, `customer_marketing_prefs`, `growth_automation_settings`, `sales_strategy_settings`, `campaigns`.
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