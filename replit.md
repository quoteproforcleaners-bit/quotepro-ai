# QuotePro

## Overview

QuotePro is a comprehensive SaaS platform for residential cleaning companies, aiming to streamline operations, enhance customer engagement, and drive business growth. It offers tools for accurate, branded customer quotes, CRM, job scheduling, communications, and business management. The platform features a multi-step quote calculator, Good/Better/Best pricing, customizable business profiles, and configurable pricing settings. Key capabilities include AI-powered draft generation for customer communications, an AI Command Center for natural language interaction, job photo attachments, recurring job automation, and quote PDF exports. A significant feature is the "Social / AI Sales Assistant" for lead capture and automated replies via Instagram and TikTok DMs, part of the "QuotePro AI" subscription tier. The platform supports multi-user access and stores all data server-side in PostgreSQL. Recent enhancements include a guest mode for quote generation, an enhanced quote acceptance system with revenue playbook recommendations, an underpricing detector, a follow-up queue, weekly recap, opportunities management, a growth automation suite with a task engine, sales strategy profiles, and revenue forecasting. Additional features include customer satisfaction ratings (1-5 stars on completed jobs with dashboard summary, plus public customer-facing rating page at `/rate/:token` with branded UI), VIP customer badges (toggle on any customer with gold badge UI), customizable dashboard widgets (drag-and-arrange with AsyncStorage persistence), smooth animated screen transitions (Reanimated fade+slide wrappers on all tab screens), a dark mode schedule (system/light/dark/auto-evening modes via Settings), and Apple-compliant AI consent management (explicit user permission before sharing data with OpenAI, toggleable in Settings, persisted via AsyncStorage).

## User Preferences

Preferred communication style: Simple, everyday language.
iPhone-only app. No hours/times shown to customers. Customizable service types.
Freemium model: Free users get 3 residential quotes total. All premium features (CRM, Jobs, Growth, AI, Automations, Sales Strategy, Social) are paywalled at $19.99/month via RevenueCat. Server-side quote limit enforced in `POST /api/quotes` (403 if free user has >=3 quotes). Client-side check via `GET /api/quotes/count` before saving. ProGate component (`/client/components/ProGate.tsx`) wraps 21 premium screens. Dashboard AI Command Center gated via `useProGate` hook. PaywallScreen accepts `trigger_source` route param for contextual messaging (quote_limit, after_demo, feature_gate, settings). SubscriptionContext tracks `subscriptionStatus` (free/trial/active/expired) and `trialDaysLeft`.

## System Architecture

### Frontend Architecture

v1.0.7 (build 19) conversion overhaul: 3-step onboarding (Goals → Basics → Demo Quote → Paywall), 3-quote freemium limit, benefit-first paywall with contextual headers, subscription status in Settings (free/trial/active/expired), restore purchases in Settings, follow-up nudge modal after first quote, revenue microcopy on quote preview, Help & Support section, full funnel analytics events.

**"Built by a Cleaner" Growth Loop** (v1.0.8):
- **FounderModal** (`client/components/FounderModal.tsx`): Bottom-sheet modal shown after first real quote (once per user, 14-day cooldown on dismiss). Primary: share via native sheet, secondary: join community / copy message. Toast confirmation on share.
- **SocialProofBanner** (`client/components/SocialProofBanner.tsx`): Dismissible dashboard banner ("Used by cleaning businesses across the US"), 30-day dismiss persistence, Share CTA.
- **ReviewPromptModal** (`client/components/ReviewPromptModal.tsx`): Fallback review modal when native SKStoreReviewController unavailable. Triggers after 3 real quotes + 7 days or 2 sessions + 90-day cooldown.
- **Growth Loop Config** (`client/lib/growthLoop.ts`): AsyncStorage flags (install date, session count, founder modal seen, banner dismissed, review prompted), config constants (COMMUNITY_URL, APP_STORE_URL, SHARE_MESSAGE), share sheet / store review / clipboard helpers.
- **Analytics**: `quote_completed` (with quote_type, total, is_demo, quote_number_for_user), `founder_modal_viewed/share_tapped/community_tapped/dismissed`, `share_sheet_opened/completed`, `banner_viewed/dismissed/share_tapped`, `review_eligible/prompt_shown/dismissed/leave_review_tapped`.
- **Settings**: "Join the QuotePro Community" link in Help & Support section.

**Google Review Link Integration** (v1.0.9):
- **Settings "Reviews & Referrals" section**: Google Review Link URL input with validation, three toggles (include on PDF, include in messages, ask after job complete), referral offer amount/booking link settings. Stored in `growth_automation_settings` table (new columns: `include_review_on_pdf`, `include_review_in_messages`, `ask_review_after_complete`, `referral_offer_amount`, `referral_booking_link`).
- **Quote PDF "Review Us" section**: When `includeReviewOnPdf` enabled, both residential and commercial PDFs include a styled "Review Us" block with clickable link near the bottom.
- **Message review append**: When `includeReviewInMessages` enabled, SMS and email copy messages append a deterministic review request line in the user's communication language (EN/ES/PT/RU translations in `REVIEW_REQUEST_LINES` maps). Email sent via SendGrid also includes the review CTA in the footer.
- **QuoteDetailScreen**: "Send Review Request" and "Send Referral Offer" buttons appear for accepted/sent quotes when Google Review link is configured. Uses native SMS or clipboard fallback.
- **JobDetailScreen**: "Send Review Request" button appears on completed jobs when `askReviewAfterComplete` is enabled and review link exists.
- **Analytics**: `review_link_saved`, `review_link_toggle_changed` (surface: pdf/messages/post_service), `review_link_included_in_quote`, `review_request_sent` (channel, language), `review_request_copy_tapped`, `referral_offer_sent`.
- **i18n**: All review settings labels translated in EN/ES/PT/RU.

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

### Instant Quote Page (Public Customer-Facing)
The public quote page at `/q/:token` is a conversion-focused, premium customer-facing sales experience.
- **Template**: `server/templates/instant-quote.html` — a 620-line external template loaded and rendered with placeholder interpolation
- **Route handler**: `GET /q/:token` in `server/routes.ts` — loads template, populates data, handles conditional sections
- **Features**:
  - Google Fonts (Inter), CSS custom properties, mobile-first responsive design
  - Company branding (logo, name, brand color, trust badges)
  - Good/Better/Best interactive tier selection cards with "Most Popular" badge
  - Live add-on toggling with real-time total recalculation
  - Accept modal with: name, phone, frequency, preferred date/time/days, notes
  - Request Changes modal, Decline flow
  - Expiration countdown timer (live updating every 60s, urgent styling within 48h)
  - Deposit section with Stripe Checkout integration (`/api/public/quote/:token/pay-deposit`)
  - Trust/testimonials section pulling real 4-5 star reviews from `review_requests` table
  - Analytics tracking events (viewed, option selected, addon toggled, accept clicked, accepted)
  - Bottom-sheet modal animation, backdrop blur
  - States: main, accepted (with detail summary), declined, changes-requested, expired
- **Accept endpoint**: `POST /q/:token/accept` — saves selectedOption, selectedAddons, phone, frequency, preferences
- **Deposit endpoint**: `POST /api/public/quote/:token/pay-deposit` → Stripe Checkout → `/api/stripe/deposit-success`
- **Analytics endpoint**: `POST /q/:token/track` — logs events to quote's aiNotes
- **Admin UI**: QuoteDetailScreen has "Quote Settings" section with expiration picker (None/3/7/14/30 days) and deposit toggle with amount input
- **Preview**: "Preview" button in QuoteDetailScreen opens public quote page in browser
- **Schema additions**: `viewed_at`, `deposit_type`, `deposit_paid_at` columns on quotes table

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
- **RevenueCat**: In-app subscription management ($19.99/mo Pro tier). Configured via `SubscriptionContext` with retry logic for offerings loading, inline error states on paywall, and `offerings.current` usage (not hardcoded identifiers). API key fetched from server `/api/subscription/config`. Entitlement IDs: `["Pro", "QuotePro for Cleaners Pro", "pro"]`. Dynamic CTA text on paywall reads trial/intro offer from RevenueCat product data (no hardcoded "Start Free Trial"). `trialInfo` state with `extractTrialInfo` helper detects free trials from iOS/Android product fields. RevenueCat is source of truth for native entitlements (DB never overrides active RC entitlement). Real-time listener handles both upgrades and downgrades. Analytics: `offerings_load_success/failed`, `revenuecat_init_failed`, `premium_feature_blocked`, `trial_started` (only fires when real trial detected).
- **Expo-notifications**: Push notification support.
- **Expo-print**, **expo-sharing**: For quote PDF export.

### Integrations Lite (v1.0.8+)
- **Invoice Packets**: Generate QuickBooks-compatible invoice packets (PDF/CSV/text) from quotes. Server endpoints at `/api/quotes/:id/invoice-packet` and `/api/invoice-packets/:id`. DB table: `invoice_packets`.
- **Calendar Integration**: Create calendar event stubs with ICS download and Google Calendar deep links. Reminder templates (Confirmation, 24hr, On-my-way). DB table: `calendar_event_stubs`. Endpoints: `/api/quotes/:id/calendar-event`, `/api/calendar-events/quote/:id`.
- **Webhooks & API Keys**: Webhook endpoints for Zapier/Make with HMAC-SHA256 signing, 3-attempt retry with exponential backoff. Events: quote.created/sent/accepted/declined, invoice_packet.created, calendar_stub.created. DB tables: `api_keys`, `webhook_endpoints`, `webhook_events`, `webhook_deliveries`. AutomationsIntegrationsScreen with full API key lifecycle and event log.
- **QuoteDetailScreen**: 3 new action buttons (Invoice Packet, Calendar, Automations) with modal UIs.

### QuickBooks Online Integration
- **OAuth2 Flow**: Connect via Intuit OAuth2 (env: `INTUIT_CLIENT_ID`, `INTUIT_CLIENT_SECRET`). Tokens encrypted with AES-256-GCM (env: `QBO_ENCRYPTION_KEY`). Auto-refresh on expiry.
- **QBO Client**: `server/qbo-client.ts` — token encrypt/decrypt, auto-refresh, exponential retry, customer query/create, invoice create, company info test.
- **DB Tables**: `qbo_connections` (OAuth state, encrypted tokens, company info, auto-invoice flag), `qbo_customer_mappings` (QuotePro customer → QBO customer), `qbo_invoice_links` (quote → QBO invoice, unique constraint on user_id+quote_id), `qbo_sync_log` (audit trail).
- **API Endpoints**: `/api/integrations/qbo/status`, `/connect`, `/callback` (OAuth redirect, state-validated), `/disconnect`, `/test`, `/create-invoice` (idempotent), `/logs`, `/settings`, `/invoice-link/:quoteId`.
- **Auto-Invoice**: When quote status changes to "accepted" and `autoCreateInvoice` is enabled, QBO invoice is created fire-and-forget.
- **UI Screens**: `QBOSettingsScreen` (connect/disconnect/test/auto-invoice toggle/recent logs), `QBOLogsScreen` (full sync history with pull-to-refresh).
- **Navigation**: Settings → "QuickBooks Online" row → QBOSettings. QuoteDetailScreen shows "QuickBooks" action button (create invoice or linked badge).

### Jobber Integration
- **OAuth2 Flow**: Connect via Jobber OAuth2 (env: `JOBBER_CLIENT_ID`, `JOBBER_CLIENT_SECRET`). Tokens encrypted with AES-256-GCM (reuses QBO encryption utils). Auto-refresh on expiry.
- **Jobber Client**: `server/jobber-client.ts` — GraphQL API client (version `2023-11-15`), OAuth token management, client/job creation, quote sync orchestration.
- **DB Tables**: `jobber_connections` (OAuth state, encrypted tokens, auto-sync flag, unique per user), `jobber_client_mappings` (QuotePro customer → Jobber client, unique on user_id+qp_customer_id), `jobber_job_links` (quote → Jobber job, unique on user_id+quote_id), `jobber_sync_log` (audit trail with JSONB summaries).
- **API Endpoints**: `/api/integrations/jobber/status`, `/connect`, `/callback` (OAuth redirect, server-side state validation), `/disconnect`, `/settings`, `/sync-quote/:quoteId` (manual sync), `/logs`, `/sync-status/:quoteId`, `/dashboard-stats`, `/clients` (paginated GraphQL fetch), `/import-clients` (dedup by Jobber ID, email, phone).
- **Auto-Sync**: When quote status changes to "accepted" and `auto_create_job_on_quote_accept` is enabled, Jobber client+job created fire-and-forget. Hooks in both `PUT /api/quotes/:id` and `POST /q/:token/accept`. Post-acceptance toast shows "Job created in Jobber" or "Send to Jobber?" based on auto-sync setting.
- **UI Screens**: `JobberSettingsScreen` (connect/disconnect/test/auto-sync toggle/activity feed), `JobberLogsScreen` (full sync history), `JobberImportScreen` (paginated client list with checkboxes, select all, dedup, results summary modal).
- **Quote Detail Sync Card**: Dedicated "Jobber Sync" section with 5 states (not connected, not synced, syncing, synced with timestamp/job number, failed with retry). Below status buttons section.
- **Dashboard Widget**: "jobber" widget in reorderable widget system. Connected: green badge + jobs created/total syncs stats + auto-sync indicator + manage link. Disconnected: value prop + connect CTA.
- **Settings Marketing Hook**: "Works with Jobber" card below Jobber settings row when disconnected. Value prop with 3 bullet points + connect CTA. Hidden when connected.
- **Customer Import**: "Import from Jobber" row in CustomersScreen header when connected. Navigates to JobberImportScreen.
- **Navigation**: Settings → "Jobber" row → JobberSettings. QuoteDetailScreen shows sync card + action button. CustomersScreen → "Import from Jobber" → JobberImport.
- **Analytics**: `jobber_sync_manual_clicked`, `jobber_sync_success`, `jobber_sync_failed`, `jobber_import_started`, `jobber_import_completed`, `jobber_connect_cta_clicked`.
- **Feature Flag**: `jobberIntegrationEnabled` in `client/lib/featureFlags.ts`, env `ENABLE_JOBBER_INTEGRATION=true`.

### Job Scheduling Enhancements
- **Start/End Clock**: Jobs have `startedAt`/`completedAt` timestamp columns. `POST /api/jobs/:id/start` transitions scheduled→in_progress, `POST /api/jobs/:id/complete` transitions in_progress→completed with duration tracking.
- **Status Guards**: Start only allowed from "scheduled"; complete blocked if already completed/canceled (409 response).
- **Duration Display**: JobDetailScreen shows elapsed duration (Xh Ym) after completion, with NaN/invalid date guards. In-progress jobs show "Started at..." timestamp.
- **Day Filter Strip**: JobsScreen has a horizontal scrollable 14-day date strip (Today, Tmrw, Mon, Tue...) above the status segmented control. Tap to filter jobs by day; tap again or "All" to clear.
- **UI Flow**: Scheduled jobs show "Start Job" button (blue); in-progress jobs show "End Job" button (green).

### Walkthrough AI Quoting
- **Third quoting path**: New Quote screen shows Residential, Commercial, and Walkthrough AI as three card options. Walkthrough AI has "AI-Powered" badge.
- **Input screen** (`client/screens/WalkthroughAIScreen.tsx`): Large textarea with placeholder example, microphone button for voice-to-text (Web Speech API on web, graceful fallback on native), recording state indicator, Clear/Analyze buttons.
- **AI Extraction** (`POST /api/ai/walkthrough-extract`): gpt-5-nano extracts structured fields (property type, beds, baths, sqft, frequency, service type, pets, add-ons, condition, etc.) from natural language. Returns extractedFields + assumptions + confidence. AI never sets prices.
- **Pricing Recommendation Service** (`client/lib/pricingRecommendationService.ts`): Takes extracted fields + user's saved pricing settings. Reuses `quoteCalculator.ts` for residential and `laborModel.ts` for commercial. Returns Good/Better/Best options with breakdown, labor estimate, crew size, upsell suggestions.
- **Results screen** (`client/screens/WalkthroughResultsScreen.tsx`): 6 sections — Detected Job Details, Recommended Quote Options, Pricing Breakdown, Estimated Labor, Assumptions & Confidence, AI Recommendations. Action buttons: Create Quote, Edit Details, Closing Message, Copy Summary.
- **Edit Details screen** (`client/screens/WalkthroughEditScreen.tsx`): Editable form for all extracted fields with pickers/steppers/toggles. Recalculates and returns to results.
- **Create Quote conversion**: Pushes extracted fields into existing QuoteCalculator (residential) or CommercialQuote (commercial) with proper field mapping (beds, baths, sqft, condition, pets, frequency, add-ons).
- **AI Closing Assistant** (`client/screens/ClosingAssistantScreen.tsx`, `POST /api/ai/closing-message`): Generates customer-facing messages (text, email, follow-up, objection handling, upsell, deep-clean explanation) in 4 tones and 4 languages. Copy/regenerate buttons.
- **Analytics**: walkthrough_ai_selected, walkthrough_voice_started/completed, walkthrough_analysis_started/completed, walkthrough_quote_generated, walkthrough_create_quote_clicked, walkthrough_closing_message_generated.

### Live Job Updates
- **Premium customer-facing update page** for any job, accessible via secure token-based URL at `/job-updates/:token`.
- **JobDetailScreen tabbed interface**: Overview, Progress, Checklist, Photos & Notes tabs.
- **Detailed status flow**: Scheduled → En Route → Service Started → In Progress → Final Touches → Completed. Quick-action buttons in Progress tab update status and add timeline entries.
- **Timeline**: All status changes logged with timestamps in `job_status_history` table, displayed in both app and customer-facing page.
- **Enhanced checklist**: Items grouped by `room_group` column (Kitchen, Bathrooms, etc.), with `customer_visible` toggle.
- **Notes system**: `job_notes` table with `customer_visible` toggle. Internal notes stay private, customer-visible notes appear on public page.
- **Photo visibility**: `customer_visible` column on `job_photos` table controls which photos appear on public page.
- **Send Update Page**: Modal with Copy Link, AI-generated SMS/Email message drafts (via `POST /api/ai/job-update-message`). Pro-only feature.
- **Customer-facing page**: Server-rendered HTML at `/job-updates/:token`, polls `/api/public/job-updates/:token` every 10 seconds. Shows company branding, status badge, progress bar, timeline, grouped checklist, photo gallery, customer-visible notes.
- **Database**: New columns on `jobs` (`update_token`, `detailed_status`), `job_checklist_items` (`room_group`, `customer_visible`), `job_photos` (`customer_visible`). New tables: `job_status_history`, `job_notes`.
- **Analytics**: `live_update_page_generated`, `live_update_sent` (method: copy/sms/email), `live_update_status_changed`.

### AI Dynamic Pricing Suggestions
- Server endpoint: `POST /api/ai/pricing-suggestion` (Pro-only, gpt-5-nano) analyzes property details, add-ons, frequency, current prices, and business history to suggest optimal Good/Better/Best tier pricing.
- Frontend: "AI Price Check" button on QuotePreviewScreen between quote cards and breakdown. Shows per-tier price comparison (current → suggested), reasoning, confidence badge, overall assessment, individual "Apply" buttons and "Apply All" button that updates priceOverrides.

### Tutorial Tours
- Interactive tutorial overlays using TutorialContext + TourOverlay component system.
- Tours: Dashboard, Quotes, Customers, Growth, Commercial, Quote Detail (Integrations), Settings.
- Each tour triggers once on first visit, can be replayed from Settings.
- Quote Detail tour covers Invoice Packet, Calendar, Automations, and AI features.

### Centralized Haptic Feedback
- Button component (`client/components/Button.tsx`) includes built-in haptic feedback (Light impact) on press, guarded by Platform.OS !== "web".
- Dashboard widget editor has haptic feedback on reorder (Light impact) and visibility toggle (selection haptic).

### iPad Layout Compatibility
All onboarding screens use ScrollView with sticky footer buttons and 560px max-width centering for iPad compatibility. The pattern: content wraps in `<View style={{ maxWidth: 560, width: "100%" }}>` inside a ScrollView with `contentContainerStyle={{ alignItems: "center" }}` when `screenWidth > 600`.

### Dark Mode
- `NavigationContainer` receives a dynamic theme (App.tsx `ThemedNavigation` component) synced with `useTheme()` so all navigation surfaces (headers, screen backgrounds, modals) respect dark mode.
- `useColorScheme` hook (`client/hooks/useColorScheme.ts`) supports system/light/dark/auto-evening preferences stored in AsyncStorage.
- All screens use `theme.backgroundRoot`, `theme.text`, etc. from `client/constants/theme.ts`. No hardcoded light-only background colors.

### Web App (Desktop/Browser Interface)
QuotePro also has a full web app served at `/app` from the Express backend, coexisting with the mobile app.

**Architecture**: React SPA built with Vite + Tailwind CSS + React Router, output to `web/dist/`, served by Express static middleware. Uses the same backend APIs, same session auth, same database as the mobile app.

**Tech Stack**:
- React 19 + TypeScript
- Vite (build tool)
- Tailwind CSS v4 (styling)
- React Router DOM (client-side routing)
- TanStack React Query (data fetching, shared with mobile)
- Lucide React (icons, matches Feather style from mobile)

**Directory**: `web/`
- `web/src/main.tsx` — Entry point
- `web/src/App.tsx` — Router + route definitions
- `web/src/lib/auth.tsx` — Auth context (login, register, logout, session)
- `web/src/lib/api.ts` — Fetch wrapper with credentials
- `web/src/lib/queryClient.ts` — TanStack Query client with default fetcher
- `web/src/components/Layout.tsx` — Sidebar + header shell
- `web/src/components/ProtectedRoute.tsx` — Auth guard
- `web/src/pages/` — All page components

**Design System**: `web/src/components/ui.tsx` — Shared component library (PageHeader, Card, CardHeader, Badge, Button, Input, Select, Tabs, Modal, ConfirmModal, Alert, Toast, EmptyState, Spinner, StatCard, DataTable, SearchInput). All pages import from this file for consistent styling.

**Pages**:
- `/app/login` — Premium login page with Google OAuth + email/password, split layout with marketing panel
- `/app/register` — Premium registration page with Google OAuth, matching login design
- `/app/dashboard` — Sales funnel bars, close rate, follow-up alert, stat cards, recent quotes table, today-at-a-glance
- `/app/quotes` — Sortable quote list with status tabs (all/draft/sent/viewed/accepted/declined/expired), search, column sorting
- `/app/quotes/new` — 4-step wizard (Customer → Property → Services → Review) with full calculator parity, stepper buttons, polished step indicator
- `/app/quotes/:id` — Full detail: property grid, Good/Better/Best cards, add-ons, AI comms (follow-up + message generation), integrations panel (Jobber/QBO), status management, PDF download, public link
- `/app/customers` — Customer list with status tabs (all/active/lead/inactive), avatar initials, VIP badges, search
- `/app/customers/new` — Add customer form with design system inputs
- `/app/customers/:id` — Full CRM: editable profile, VIP toggle, DNC toggle, AI draft messages, related quotes table, job history, customer summary card
- `/app/jobs` — Jobs list with status tabs, modal detail view with start/complete actions, calendar sync
- `/app/follow-ups` — Follow-up queue: urgency scoring, revenue at risk, AI follow-up generation per quote
- `/app/opportunities` — Dormant customers, lost quotes, growth tasks tabs with revenue recovery metrics
- `/app/ai-assistant` — Chat interface for AI sales assistant with suggestion cards
- `/app/walkthrough-ai` — Paste notes → AI extraction → create quote from extracted details
- `/app/settings` — Tabbed settings: business profile, pricing config (rate/minimum/service types/frequency discounts), integrations (Stripe/QBO/Jobber/Google Calendar), account management, developer (API keys/webhooks)

**Build**: Run `npx vite build web/` to rebuild. Output goes to `web/dist/`. Express serves it automatically on restart.

**Routing**: Express serves `web/dist/` static files at `/app` prefix. SPA catch-all middleware returns `index.html` for any `/app/*` path that isn't a static asset.

**Coexistence**: The web app does NOT interfere with:
- `/` — Expo landing page / manifest serving
- `/api/*` — Backend API routes
- `/q/:token` — Public quote pages
- `/static-build` — Expo static builds
- Port 8081 — Expo dev server (mobile)