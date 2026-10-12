# Pricing-only release — NOT ready for publishing

Preserve the restored app's features and layout. New iPhone subscriptions:

| Plan | US price | Store product | Entitlement |
| --- | --- | --- | --- |
| Basic | $1.99/week | quotepro_basic_weekly | basic |
| AI | $4.99/week | quotepro_ai_weekly | ai |

Prices must be confirmed in App Store Connect. The app displays Apple's localized
price, not a hardcoded charge. These identifiers are expected by code, not evidence
that the products already exist. Both must be in the current RevenueCat offering,
in one Apple subscription group, with no introductory/free-trial offers. Basic
includes unlimited manual quotes; AI adds AI-assisted features.

## Release blockers

- Confirm this is the correct RevenueCat project for the existing iOS public SDK key.
- A server secret is now stored; RevenueCat recognizes it as a legacy/V1 key.
  End-to-end V1 subscriber verification is still pending: the development database
  has no stored RevenueCat customer IDs to check. Confirm delivery to both test and
  published runtimes. Do not replace it with a public SDK key.
- Confirm Apple product IDs, prices, durations, entitlement mappings and offering.
- Identify the correct existing EAS project / App Store app; the currently configured
  EAS project's iOS build-list query returned no builds.
- Verify the actual iPhone purchase and restore journey below. This has NOT been done.
- TestFlight/App Review purchases use Apple's sandbox. Production currently rejects
  sandbox subscriptions. Complete isolated test-backend and review routing before
  submission; never enable sandbox access globally against live customer data.
- Existing web acquisition/pricing pages need a billing-copy audit before a backend
  publish. New legacy Stripe checkout is disabled; existing Stripe subscriptions
  are not cancelled or repriced.

## Mandatory iPhone evidence

An internal-only EAS profile, `subscription-test`, points to the separate sandbox
at `https://hotpink-glass-commas.replit.app`. The production and preview profiles
are unchanged. A public `/health` check reported HTTP 200, `mode: isolated-test`,
database connected, provider reads enabled, two configured test accounts, and
ephemeral sessions disabled. This does not verify account creation, API compatibility,
provider credentials, or purchase/restore behavior. No native build has been created
from this profile yet. Use only the approved sandbox identities; do not create
additional identities or copy live data.

Record build ID, environment, product ID, displayed Apple price and result for:

1. Unsubscribed account: cannot create or send quotes, or run AI. History remains readable.
2. Basic purchase: Apple sheet says $1.99/week in US store, no trial; manual quoting
   and PDF/email sending work, AI is denied by UI and server.
3. AI purchase: Apple sheet says $4.99/week in US store, no trial; AI and manual quoting work.
4. Cancel purchase sheet: no access granted.
5. Reinstall / sign in / Restore Purchases: correct paid account regains correct tier.
6. Switch app accounts: no previous account's access leaks; confirm RevenueCat restore
   transfer behavior matches the app-account ownership policy before release.
7. Cancel renewal: access remains until expiry. Expiry/refund: paid actions denied.
8. Network/provider failure: explicit retry, no free access, successful payment recoverable via restore.
9. Upgrade/downgrade: correct tier at Apple's effective time; no double subscription.

Browser mocks and unit tests are useful regression checks, NOT native payment evidence.
The paid-only paywall, disabled web purchase, and settings were verified in a browser
using mocked signed-in/free subscription fixtures. Typecheck, backend build, and 23
focused subscription tests passed. No Apple purchase or restore was exercised.
Do not publish, submit to Apple, grant entitlements, seed paid users, or alter live billing
as a substitute for this checklist.
