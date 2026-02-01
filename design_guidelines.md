# QuotePro - Design Guidelines

## Brand Identity

**Purpose**: QuotePro is a professional quoting tool for residential cleaning business owners. It transforms complex pricing calculations into confident, branded customer quotes.

**Aesthetic Direction**: **Editorial/Professional** - Clean typography hierarchy, structured layouts, and business-focused UI that inspires confidence. Think invoicing software meets messaging app - efficient, trustworthy, with subtle polish.

**Memorable Element**: The quote preview cards with instant pricing updates as inputs change. The app feels like a live spreadsheet that writes your sales pitch for you.

**No Authentication**: This is a single-user business tool. Include a Settings screen with business profile (logo, branding) but no login required.

---

## Navigation Architecture

**Root Navigation**: Tab Bar (4 tabs) + Floating Action Button

**Tabs**:
1. **Home** - Dashboard with recent quotes, quick stats
2. **Pricing** - Default pricing settings configuration
3. **Quotes** - History of all generated quotes
4. **Settings** - Business profile, app preferences

**Core Action**: Floating Action Button (FAB) in bottom-right corner - "New Quote" - opens the quote calculator flow as a modal stack.

---

## Screen-by-Screen Specifications

### Onboarding Flow (Stack, shown once on first launch)

**Screen 1: Business Profile**
- Header: "Welcome to QuotePro" (large, center-aligned title), Skip button (top-right)
- Form fields: Company Name (required), Email, Phone, Address
- Logo upload button with preview (tap to upload or skip)
- Bottom: "Next" button (primary CTA)
- Safe area: top = insets.top + Spacing.xl, bottom = insets.bottom + Spacing.xl

**Screen 2: Default Pricing**
- Header: "Set Your Pricing" (with back button)
- Scrollable form:
  - Hourly rate input ($55 default)
  - Minimum ticket ($179 default)
  - Tax percentage input
  - Service fees/add-ons section (fridge $35, oven $35, etc.)
- Bottom: "Save & Continue" button
- Safe area: top = headerHeight + Spacing.xl, bottom = insets.bottom + Spacing.xl

---

### Home Tab (Dashboard)

**Layout**:
- Header: Transparent, business logo + name (left), settings icon (right)
- Scrollable content:
  - Welcome banner: "Good morning, [Business Name]"
  - Quick stats cards (3 horizontal): This Week Revenue, Pending Quotes, Avg Quote Value
  - Recent Quotes section (last 5, tappable cards)
  - Empty state: Illustration + "Create your first quote" if no quotes exist
- Safe area: top = headerHeight + Spacing.xl, bottom = tabBarHeight + Spacing.xl + 64 (FAB clearance)

---

### Pricing Tab

**Layout**:
- Header: "Default Pricing" (default nav header)
- Scrollable form (same as onboarding Screen 2)
- Sections: Base Rates, Add-on Pricing, Frequency Discounts
- Each field has label, input, and helper text
- Auto-saves on blur
- Safe area: top = headerHeight + Spacing.xl, bottom = tabBarHeight + Spacing.xl

---

### Quotes Tab

**Layout**:
- Header: "Quotes" with search bar, filter icon (right)
- List view: Quote cards showing customer name, date, price, status (Sent/Draft/Expired)
- Tap card to view full quote details (pushes to detail screen)
- Empty state: Illustration + "No quotes yet"
- Safe area: top = headerHeight + Spacing.xl, bottom = tabBarHeight + Spacing.xl

---

### Settings Tab

**Layout**:
- Header: "Settings" (default nav header)
- Scrollable list with sections:
  - Business Profile (logo, name, contact info)
  - Branding (primary color picker, sender name/title)
  - App Preferences (theme, notifications)
  - Legal (Terms, Privacy Policy placeholders)
- Safe area: top = headerHeight + Spacing.xl, bottom = tabBarHeight + Spacing.xl

---

### Quote Calculator (Modal Stack via FAB)

**Screen 1: Customer Info**
- Modal header: "New Quote", Cancel (left), Next (right, disabled until name filled)
- Form: Customer Name (required), Phone, Email, Address, Date Preference
- Safe area: top = Spacing.xl, bottom = insets.bottom + Spacing.xl

**Screen 2: Home Details**
- Header: Back button, "Home Details", Next (right)
- Form: Sqft, Beds, Baths, Condition slider (1-10), People count, Pet selector, Home type picker
- Safe area: top = Spacing.xl, bottom = insets.bottom + Spacing.xl

**Screen 3: Service & Add-ons**
- Header: Back, "Service Details", Next
- Service frequency segmented control (One-time/Weekly/Biweekly/Monthly)
- Add-ons checklist with toggle switches
- Safe area: top = Spacing.xl, bottom = insets.bottom + Spacing.xl

**Screen 4: Quote Preview**
- Header: Back, "Quote Preview", Done (right, closes modal)
- Scrollable content:
  - Live pricing cards: Good ($A), Better ($B), Best ($C) - tappable to expand details
  - Selected quote shows: Service type, scope, hours, add-ons
  - Actions: "Generate Email Draft", "Generate SMS Draft", "Save Quote"
- Bottom floating button: "Send Quote" (primary CTA)
- Safe area: top = Spacing.xl, bottom = insets.bottom + Spacing.xl + 64 (floating button)

---

## Color Palette

**Professional & Trustworthy**
- Primary: #2563EB (confident blue, not generic)
- Primary Dark: #1E40AF (pressed states)
- Background: #F8FAFC (soft off-white)
- Surface: #FFFFFF
- Text Primary: #0F172A (near-black with blue tint)
- Text Secondary: #64748B (muted slate)
- Border: #E2E8F0
- Success: #10B981 (quote sent confirmation)
- Warning: #F59E0B (pending/draft status)
- Error: #EF4444

---

## Typography

**Font**: SF Pro (system font, clean and professional)

**Type Scale**:
- Hero: 32pt, Bold (onboarding titles)
- Title: 24pt, Bold (screen headers)
- Headline: 18pt, Semibold (card titles, section headers)
- Body: 16pt, Regular (form labels, descriptions)
- Caption: 14pt, Regular (helper text, timestamps)
- Subtext: 12pt, Regular (legal, footnotes)

---

## Visual Design

- Cards: White surface with 1pt border (#E2E8F0), 12pt corner radius, no shadow
- Inputs: 8pt corner radius, 1pt border, focus state changes border to Primary
- Buttons: Primary (filled with Primary color), Secondary (outlined), Ghost (text only)
- FAB: 56x56pt circle, Primary color, white "+" icon, shadow: offset (0, 2), opacity 0.10, radius 2
- Quote pricing cards: Larger 16pt corner radius, tap scales to 0.97

---

## Assets to Generate

**Required**:
1. **icon.png** - App icon: Stylized "QP" monogram in Primary blue on white, subtle sparkle/clean symbol
2. **splash-icon.png** - Same as icon.png for splash screen
3. **empty-quotes.png** - Illustration: Clipboard with checkmarks and dollar sign, soft blue/gray tones. WHERE USED: Quotes tab when no quotes exist
4. **empty-dashboard.png** - Illustration: Calculator with upward trending arrow, optimistic feel. WHERE USED: Home tab on first launch
5. **business-avatar-default.png** - Generic business logo placeholder (abstract geometric mark). WHERE USED: Settings, onboarding logo preview

**Recommended**:
6. **onboarding-hero.png** - Illustration: Cleaning supplies + mobile device + quote document, cohesive with brand blue. WHERE USED: Background of onboarding Screen 1

All illustrations: Flat, 2-color (Primary + #E0E7FF as tint), minimal linework, professional not playful.