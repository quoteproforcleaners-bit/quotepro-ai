# QuotePro

## Overview

QuotePro is a professional quoting tool designed for residential cleaning business owners. It transforms complex pricing calculations into confident, branded customer quotes. The app follows an editorial/professional aesthetic with clean typography, structured layouts, and business-focused UI.

Key capabilities:
- Multi-step quote calculator with customer info, property details, and service add-ons
- Good/Better/Best pricing options with live preview
- Quote history management with status tracking (draft, sent, accepted, expired)
- Business profile customization including logo and branding
- Configurable pricing settings (hourly rates, minimum tickets, add-on prices, frequency discounts)
- Email and SMS draft generation for customer communication

Multi-user app with authentication (email/password, Apple Sign-In, Google Sign-In). Business profile and pricing settings are stored server-side per user in PostgreSQL.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React Native with Expo SDK 54
- Uses Expo Router conventions with file-based navigation
- React Navigation for native stack and bottom tab navigation
- React Native Reanimated for animations
- React Native Gesture Handler for touch interactions

**State Management**:
- React Context (AppContext) for global app state (business profile, pricing settings, onboarding status)
- React Query (TanStack Query) for server state management
- Local component state with useState for UI state

**Navigation Structure**:
- Root Stack Navigator with conditional rendering based on onboarding status
- Main Tab Navigator with 4 tabs: Home, Pricing, Quotes, Settings
- Modal stack for Quote Calculator flow
- Onboarding stack shown only on first launch

**Component Architecture**:
- Themed components (ThemedText, ThemedView) for consistent styling
- Reusable UI components (Button, Card, Input, Toggle, etc.)
- Screen-specific components in `/screens` directory
- Quote flow broken into sub-screens (CustomerInfo, HomeDetails, ServiceAddOns, QuotePreview)

**Styling Approach**:
- Centralized theme constants in `/constants/theme.ts`
- Light/dark mode support via useColorScheme hook
- Consistent spacing and border radius tokens
- Platform-specific adaptations (blur effects on iOS, solid backgrounds on Android/web)

### Backend Architecture

**Server**: Express.js running on Node.js
- TypeScript with ES modules
- HTTP server created via `createServer` for potential WebSocket support
- CORS configured for Replit domains and localhost development
- Static file serving for production web builds

**API Pattern**:
- Routes registered in `/server/routes.ts`
- All API routes should be prefixed with `/api`
- JSON body parsing with raw body preservation

### Data Storage

**PostgreSQL Database** (active, Neon-backed):
- Drizzle ORM with PostgreSQL dialect
- Schema defined in `/shared/schema.ts`
- Tables: `users`, `businesses`, `pricing_settings`, `session` (auto-created by connect-pg-simple)
- Business profile and pricing settings stored per user on the server
- Storage layer in `/server/storage.ts` with CRUD functions

**Authentication**:
- Session-based auth using `express-session` with `connect-pg-simple` store
- Auth routes in `/server/routes.ts`: register, login, Apple SSO, Google SSO, me, logout
- `AuthContext` (`client/context/AuthContext.tsx`) manages auth state on frontend
- Navigation gated by auth state: Login -> Onboarding -> Main App

**Local Storage**: AsyncStorage for client-side persistence
- Quotes stored locally (not yet migrated to server)
- UUID-based identifiers for all entities

**API Endpoints**:
- `POST /api/auth/register` - Create account with email/password
- `POST /api/auth/login` - Sign in with email/password
- `POST /api/auth/apple` - Apple Sign-In
- `POST /api/auth/google` - Google Sign-In
- `GET /api/auth/me` - Check current session
- `POST /api/auth/logout` - Destroy session
- `GET /api/business` - Get current user's business profile
- `PUT /api/business` - Update business profile
- `GET /api/pricing` - Get pricing settings
- `PUT /api/pricing` - Update pricing settings

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
- **drizzle-orm**: SQL ORM (prepared for PostgreSQL)
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
- **pg**: PostgreSQL client (prepared for future use)
- **http-proxy-middleware**: Development proxy

### Development
- **typescript**: Type checking
- **drizzle-kit**: Database migration tooling
- **esbuild**: Server bundling for production