# QuotePro — Replit Agent Session Transcript

**Project:** QuotePro — iOS + Web SaaS for cleaning business owners  
**Stack:** Expo (React Native) + Express + PostgreSQL + Drizzle ORM + Vite (web)  
**Model:** Claude Sonnet (Replit Agent)  
**Date:** March 15–16, 2026

---

## Session Overview

This session covered three major workstreams across a production SaaS app:

1. **Full feature removal** — AI Quote Assistant (Linq SMS automation)
2. **Lead Finder improvements** — auto-scan, search, filters, city autocomplete
3. **Intake link UX** — URL shortening (added then reverted), iMessage preview title injection, business name in share sheet

---

## Part 1 — AI Quote Assistant Removal

### Context
The AI Quote Assistant was a Linq-powered SMS automation feature that allowed the app to qualify leads, run structured intake, answer FAQs, and hand off to the owner via SMS threads. It was being removed because it doesn't scale for multi-tenant SaaS (each business would need their own Linq account and phone number).

### What Was Removed

**Mobile screens deleted:**
- `client/screens/AIQuoteAssistantInboxScreen.tsx`
- `client/screens/AIQuoteAssistantThreadScreen.tsx`
- `client/screens/AIQuoteAssistantSettingsScreen.tsx`

**Web pages deleted:**
- `web/src/pages/AIQuoteAssistantPage.tsx`
- `web/src/pages/AIQuoteAssistantThreadPage.tsx`
- `web/src/pages/AIQuoteAssistantSettingsPage.tsx`

**Backend service directory deleted:**
- `server/services/linq/` — 7 files: `types.ts`, `client.ts`, `webhooks.ts`, `assistant-orchestrator.ts`, `faq.ts`, `intake.ts`, `handoff.ts`

**Routes removed from `server/routes.ts`:**
- Entire AI Quote Assistant routes block (~175 lines): 13 routes including `/api/ai-assistant/*` and `/api/integrations/linq/webhook`

**Storage functions removed from `server/storage.ts`:**
- `getLinqAccountByBusinessId`, `upsertLinqAccount`, `getLinqPrimaryNumber`, `upsertLinqPhoneNumber`, `getOrCreateConversationThread`, `getConversationThreadById`, `listConversationThreads`, `addConversationMessage`, `listConversationMessages`, `updateThreadAiStatus`, `updateThreadHandoffStatus`, `getAiQuoteAssistantSettings`, `upsertAiQuoteAssistantSettings`, `getActiveIntakeSession`, `createOrUpdateIntakeSession`, `completeIntakeSession`, `abandonIntakeSession`

**Schema removed from `shared/schema.ts`:**
- 7 table definitions: `linqAccounts`, `linqPhoneNumbers`, `conversationThreads`, `conversationMessages`, `conversationAutomations`, `aiQuoteAssistantSettings`, `aiQuoteIntakeSessions`
- 7 exported types removed

**Navigation/routing cleaned up:**
- `client/navigation/RootStackNavigator.tsx` — removed 3 imports, 3 `Stack.Screen` entries, param type entries
- `web/src/App.tsx` — removed 3 route entries
- `web/src/components/Layout.tsx` — removed sidebar item and `PRO_ROUTES` entry
- `client/screens/SettingsScreen.tsx` — removed AI Quote Assistant pressable row

**Database:**
```sql
DROP TABLE IF EXISTS ai_quote_intake_sessions CASCADE;
DROP TABLE IF EXISTS ai_quote_assistant_settings CASCADE;
DROP TABLE IF EXISTS conversation_automations CASCADE;
DROP TABLE IF EXISTS conversation_messages CASCADE;
DROP TABLE IF EXISTS conversation_threads CASCADE;
DROP TABLE IF EXISTS linq_phone_numbers CASCADE;
DROP TABLE IF EXISTS linq_accounts CASCADE;
```

**Environment variables removed:**
- `LINQ_ENVIRONMENT`, `LINQ_BASE_URL`, `LINQ_PHONE_NUMBER`
- (`LINQ_API_TOKEN` secret requires manual deletion from Replit Secrets UI)

### Result
- Module count dropped from 1614 → 1552 after removal
- Both frontend and backend start cleanly with zero errors
- Zero remaining references to AI Quote Assistant anywhere in the codebase (`grep` confirmed)

---

## Part 2 — Intake Link UX

### Problem 1: Share text said "Request a quote from :"
The `SendLinkModal` was receiving `businessName=""` (hardcoded empty string). The business name was available in the `my-link` API response but not being passed through.

**Fix:**
- Updated `/api/intake-requests/my-link` endpoint in `server/routes.ts` to include `businessName: business.companyName` in the JSON response
- Updated `IntakeQueueScreen.tsx` query type to include `businessName: string`
- Added `intakeBusinessName` derived from `linkData?.businessName`
- Changed `businessName=""` → `businessName={intakeBusinessName}` in the modal call

### Problem 2: iMessage link preview showed "QuotePro — Dashboard"
The app's `web/index.html` had a static `<title>QuotePro — Dashboard</title>`. Since iMessage fetches link previews server-side (before JavaScript runs), it always showed the wrong title.

**Fix — server-side title injection in `server/index.ts`:**
```typescript
app.use(async (req, res, next) => {
  if (req.path.startsWith("/intake/")) {
    const code = req.path.split("/intake/")[1]?.split("/")[0];
    const r = await pool.query(
      `SELECT company_name FROM businesses WHERE intake_code = $1 OR id = $1 LIMIT 1`,
      [code]
    );
    let title = "Quick Quote Form";
    if (r.rows[0]?.company_name) {
      title = `${r.rows[0].company_name} — Quick Quote Form`;
    }
    let html = fs.readFileSync(indexPath, "utf8");
    html = html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
    return res.type("html").send(html);
  }
  // ...
});
```

**Result:** When a customer receives the intake link in iMessage, the preview now shows:
- **Title:** "Bright Shine Cleaning — Quick Quote Form"
- **Domain:** the actual deployment URL

### Problem 3: URL shortener backfired
An attempt was made to shorten the intake URL using TinyURL's free API to reduce the long Replit deployment domain. A DB migration added `intake_short_url TEXT` to the businesses table, and `getOrCreateShortUrl()` was implemented to call TinyURL and cache the result.

**What went wrong:** When iOS Messages sees a TinyURL link, it previews TinyURL's own website — showing "URL Shortener, Branded Short Links & Analytics" and `tinyurl.com` as the domain — instead of the actual destination.

**Fix — reverted completely:**
- Removed TinyURL from both `my-link` and `send-link` endpoints
- Cleared all cached short URLs: `UPDATE businesses SET intake_short_url = NULL`
- The direct URL now previews correctly with the business name title

**Lesson:** URL shorteners break rich link previews in iMessage because iOS previews the shortener's domain, not the destination.

---

## Part 3 — DB Migration Pattern Used

The project uses a lightweight inline migration pattern instead of Drizzle's `db:push` for additive changes (new nullable columns):

```typescript
(async () => {
  try {
    await pool.query(`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS intake_short_url TEXT`);
  } catch (e) {
    console.error("migration error:", e);
  }
})();
```

This runs on server startup and is idempotent. Schema tables in `shared/schema.ts` are kept in sync manually to reflect production state.

---

## Key Technical Notes

- **`db:push` is interactive** — always use `executeSql` code execution for DDL in this environment
- **Storage pattern:** named function exports only — `getBusinessByOwner()`, never `storage.xxx`
- **Lazy OpenAI init:** all service files use `let _openai; function getOpenAI() {...}` pattern
- **Stack screen padding:** use `insets.bottom` from `useSafeAreaInsets()`, never `useBottomTabBarHeight()` on stack screens
- **Web build base:** Vite base is `/app/`; rebuild with `cd web && npx vite build`
- **Theme colors:** `theme.primary` = `#2563EB` (blue), `#7C3AED` (purple) for Lead Finder only
- **Module count after cleanup:** 1552 modules (down from 1614)

---

## App Store Copy Generated

**What's New (v1.1.7, build 23):**
- Intake links are now automatically shortened — customers get a clean, shareable link
- iMessage and text previews now show your business name when you share a quote request link
- Lead Finder now auto-loads results when you open it, with faster search and smarter filters
- Improved overall performance and stability

**Promo Text (124 chars):**
> Send quotes, track jobs, and win more clients — all from your phone. The all-in-one tool built for cleaning business owners.

---

## Competitive Positioning Notes

QuotePro differentiators vs Jobber, HouseCall Pro, ServiceTitan, Markate:

1. Built exclusively for cleaning businesses (not generic field service)
2. iPhone-first native app, not a web dashboard adapted for mobile
3. Lead Finder built in — proactively surfaces local leads
4. AI Sales Assistant for real-time objection coaching
5. Customer self-serve intake via shareable quote request link
6. Works alongside Jobber (integrates, not replaces)
7. $19.99/mo vs Jobber ($49+) and HouseCall Pro ($65+)
