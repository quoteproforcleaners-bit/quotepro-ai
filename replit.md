# QuotePro

## Overview

QuotePro is a comprehensive business management SaaS platform for residential cleaning companies. It transforms complex pricing calculations into confident, branded customer quotes and provides full CRM, job scheduling, and communications tracking.

Key capabilities:
- Multi-step quote calculator with customer info, property details, and service add-ons
- Good/Better/Best pricing options with live preview
- Quote history management with status tracking (draft, sent, accepted, declined, expired)
- Customer Relationship Management (CRM) with search, notes, and tags
- Job scheduling with status tracking (scheduled, in_progress, completed, cancelled)
- Job checklists for cleaning tasks
- Communications tracking (email, SMS, phone)
- Business profile customization including logo and branding
- Configurable pricing settings (hourly rates, minimum tickets, add-on prices, frequency discounts)
- Email and SMS draft generation for customer communication
- Dashboard with revenue analytics, recent quotes, and task management

Multi-user app with authentication (email/password, Apple Sign-In, Google Sign-In). All data stored server-side per user in PostgreSQL.

## User Preferences

Preferred communication style: Simple, everyday language.
iPhone-only app. No hours/times shown to customers. Customizable service types.

## System Architecture

### Frontend Architecture

**Framework**: React Native with Expo SDK 54
- React Navigation for native stack and bottom tab navigation
- React Native Reanimated for animations
- React Native Gesture Handler for touch interactions

**State Management**:
- React Context (AppContext) for global app state (business profile, pricing settings, onboarding status)
- React Query (TanStack Query) for server state management
- Local component state with useState for UI state

**Navigation Structure**:
- Root Stack Navigator with conditional rendering based on auth + onboarding status
- Auth Stack: LoginScreen (login/register modes)
- Onboarding Stack: Welcome -> Company Info -> Pricing Setup -> Done
- Main Tab Navigator with 5 tabs: Home, Customers, Quotes, Jobs, Settings
- Modal/Stack screens: QuoteCalculator, QuoteDetail, CustomerDetail

**Screen Inventory**:
- `DashboardScreen` (Home tab): Stats cards, recent quotes, tasks
- `CustomersScreen` (Customers tab): Searchable CRM list, add/edit customer modal
- `CustomerDetailScreen`: Full customer profile with quotes, jobs, communications
- `QuotesScreen` (Quotes tab): Quote list with status filter (all/draft/sent/accepted)
- `QuoteCalculatorScreen`: Multi-step quote creation (Customer -> Property -> Services -> Preview)
- `QuoteDetailScreen`: Quote details with pricing options, status management, copy email/SMS
- `JobsScreen` (Jobs tab): Job list with status filter (all/scheduled/in_progress/completed)
- `SettingsScreen` (Settings tab): Business profile, pricing settings, service types
- `PricingScreen`: Service types configuration with multipliers

**Component Architecture**:
- Themed components (ThemedText, ThemedView) for consistent styling
- Reusable UI components (Button, Card, Input, Toggle, FAB, SegmentedControl, etc.)
- QuoteListItem, QuoteCard for quote display
- SectionHeader, EmptyState for common patterns

**Styling Approach**:
- Centralized theme constants in `/constants/theme.ts`
- Light/dark mode support via useColorScheme hook
- Consistent spacing and border radius tokens
- Platform-specific adaptations (blur effects on iOS, solid backgrounds on Android/web)

### Backend Architecture

**Server**: Express.js running on Node.js
- TypeScript with ES modules
- CORS configured for Replit domains and localhost development
- Static file serving for production web builds
- Background job: Auto-expire old quotes runs every hour via setInterval

**API Pattern**:
- Routes registered in `/server/routes.ts`
- All API routes prefixed with `/api`
- JSON body parsing with raw body preservation
- `requireAuth` middleware gates authenticated endpoints

### Data Storage

**PostgreSQL Database** (active, Neon-backed):
- Drizzle ORM with PostgreSQL dialect
- Schema defined in `/shared/schema.ts`
- Storage layer in `/server/storage.ts` with CRUD functions

**Database Tables**:
- `users` - User accounts with email/password or SSO
- `businesses` - Business profiles per user (company name, logo, branding)
- `pricing_settings` - Per-user pricing configuration (rates, add-ons, service types)
- `customers` - CRM contacts linked to business (name, email, phone, address, notes, tags)
- `quotes` - Server-stored quotes with property details, pricing options, status
- `quote_line_items` - Individual line items on quotes
- `jobs` - Scheduled cleaning jobs linked to customers/quotes
- `job_checklist_items` - Task checklists for jobs
- `communications` - Email/SMS/phone log entries
- `automation_rules` - Configurable automation triggers (follow-ups, reminders)
- `tasks` - Business tasks/to-dos
- `session` - Express session store (auto-created by connect-pg-simple)

**Authentication**:
- Session-based auth using `express-session` with `connect-pg-simple` store
- Auth routes: register, login, Apple SSO, Google SSO, me, logout
- `AuthContext` (`client/context/AuthContext.tsx`) manages auth state on frontend
- Navigation gated by auth state: Login -> Onboarding -> Main App

**API Endpoints**:

Auth:
- `POST /api/auth/register` - Create account with email/password
- `POST /api/auth/login` - Sign in with email/password
- `POST /api/auth/apple` - Apple Sign-In
- `POST /api/auth/google` - Google Sign-In
- `GET /api/auth/me` - Check current session
- `POST /api/auth/logout` - Destroy session

Business:
- `GET /api/business` - Get current user's business profile
- `PUT /api/business` - Update business profile

Pricing:
- `GET /api/pricing` - Get pricing settings
- `PUT /api/pricing` - Update pricing settings

Customers:
- `GET /api/customers` - List customers (supports ?search= query)
- `POST /api/customers` - Create customer
- `GET /api/customers/:id` - Get customer details
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

Quotes:
- `GET /api/quotes` - List quotes (supports ?status=, ?customerId= filters)
- `POST /api/quotes` - Create quote
- `GET /api/quotes/:id` - Get quote details
- `PUT /api/quotes/:id` - Update quote
- `POST /api/quotes/:id/send` - Mark quote as sent
- `DELETE /api/quotes/:id` - Delete quote

Jobs:
- `GET /api/jobs` - List jobs (supports ?status=, ?customerId= filters)
- `POST /api/jobs` - Create job
- `GET /api/jobs/:id` - Get job details
- `PUT /api/jobs/:id` - Update job
- `DELETE /api/jobs/:id` - Delete job

Job Checklists:
- `GET /api/jobs/:jobId/checklist` - Get checklist items
- `POST /api/jobs/:jobId/checklist` - Add checklist item
- `PUT /api/jobs/:jobId/checklist/:id` - Update checklist item
- `DELETE /api/jobs/:jobId/checklist/:id` - Delete checklist item

Communications:
- `GET /api/communications` - List communications
- `POST /api/communications` - Log communication

Tasks:
- `GET /api/tasks` - List tasks
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

Reports:
- `GET /api/reports/stats` - Dashboard statistics (counts, revenue)
- `GET /api/reports/revenue` - Revenue analytics

Public:
- `GET /api/public/quote/:token` - Public quote acceptance page

### Quote Calculation Engine

Located in `/client/lib/quoteCalculator.ts`:
- Square footage-based base hours calculation
- Multipliers for bathrooms, bedrooms, condition, occupants, and pets
- **Customizable service types** with user-editable names and multipliers:
  - Default types: Touch Up, Regular Cleaning, Deep Clean, Move In/Out, Post Construction, Airbnb Turnover
  - Users can add custom service types, rename existing ones, and set price multipliers
  - Quote package mapping: Configure which service type is used for Good/Better/Best options
- Frequency discounts (weekly, biweekly, monthly)
- Add-on pricing with individual toggle prices
- Good/Better/Best option generation based on configured service types
- Hours/estimated times are not shown to customers (internal calculation only)

## External Dependencies

### Core Framework
- **Expo SDK 54**: React Native development platform with managed workflow
- **React 19.1.0**: UI library
- **React Native 0.81.5**: Native mobile framework

### Navigation & UI
- **@react-navigation/native**: Navigation container and core
- **@react-navigation/native-stack**: Native stack navigator
- **@react-navigation/bottom-tabs**: Tab-based navigation
- **react-native-screens**: Native screen containers
- **react-native-safe-area-context**: Safe area handling
- **expo-blur**: Blur effects for iOS tab bar
- **expo-haptics**: Haptic feedback

### Data & State
- **@tanstack/react-query**: Server state management
- **@react-native-async-storage/async-storage**: Local data persistence
- **drizzle-orm**: SQL ORM for PostgreSQL
- **zod**: Schema validation

### UI Components
- **@expo/vector-icons**: Icon library (Feather icons used)
- **react-native-reanimated**: Animation library
- **react-native-gesture-handler**: Touch handling
- **@react-native-community/slider**: Slider input component
- **expo-image**: Optimized image component
- **expo-image-picker**: Image selection from device

### Utilities
- **uuid**: Unique identifier generation
- **expo-clipboard**: Clipboard access for copy functionality
- **expo-web-browser**: External link handling

### Server
- **express**: HTTP server framework
- **express-session**: Session management
- **connect-pg-simple**: PostgreSQL session store
- **bcrypt**: Password hashing
- **pg**: PostgreSQL client
- **drizzle-orm**: Database ORM

### Development
- **typescript**: Type checking
- **drizzle-kit**: Database migration tooling
- **tsx**: TypeScript execution for development
- **esbuild**: Server bundling for production
