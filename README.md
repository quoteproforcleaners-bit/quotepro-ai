# QuotePro purchase-first TEST backend handoff

This branch is a SOURCE HANDOFF ONLY, not a runnable replacement project or a native build. Do not merge this entire branch into main or deploy it directly.

## Observed blocker
On 2026-10-12, unauthenticated POST /api/auth/purchase-session with an empty JSON body at https://hotpink-glass-commas.replit.app returned HTTP 401 {"message":"Not authenticated"}. The new native app must initialize checkout before a QuotePro login. Builds 1.3.1 (111) and the separate 1.3.1 (1) predate this purchase-first implementation.

## Scope
Work in QuotePro-Sandbox only. Keep its isolated database, dedicated test credentials, approved deployment marker, exact two approved business/account owners and restrictions on real messaging/billing. Do not copy production data, expand the allowlist, publish production, or disable authentication on unrelated routes.

## Source
The six included files are copied byte-for-byte from the main workspace. Adapt them to the existing isolated runtime rather than overwriting that runtime. This is a reference implementation; preserve any subsequent ownership/concurrency hardening. Add @apple/app-store-server-library ^3.1.0 through package tooling.

Mount the applePurchaseRouter under /api after session initialization and JSON parsing. Add purchaseIdentity?: string to the express-session SessionData type. Its two paths are /auth/purchase-session and /auth/apple-purchase. The first mints a checkout identity and preflights schema and RevenueCat readiness; it must work without a QuotePro login. The second accepts cryptographically verified Apple evidence correlated against RevenueCat and may only restore an approved owner. Browser-origin requests remain forbidden.

IMPORTANT: The generic source can create a new purchase-owned account. The sandbox must NOT create an unapproved third owner. Reconcile its guard with passwordless checkout securely: use approved test context and verified purchase ownership, not arbitrary client IDs/aliases or a blanket auth bypass. Reject unknown/unapproved owners. If first-purchase testing needs an additional approval or binding, explain the exact missing approval instead of weakening the two-account restriction.

Apply the included additive SQL ONLY to the approved test database. Preserve activation time on reruns. The proof verifier deliberately requires optional legacy sign-in once for historical purchases without an established owner; never guess the old business from RevenueCat aliases. Existing approved test owners can establish an ownership binding through authenticated recovery, then verify passwordless restore after reinstall.

Set APPLE_PURCHASE_ENVIRONMENT=Sandbox using environment tooling; never enable this on production. Use the existing dedicated server credential with RevenueCat V1 subscriber access. Never expose keys or generate dummy customers solely to check credentials. The existing paidAccess service should use sandboxPurchasesAllowed() from applePurchaseEvidence when it calls accessFromSubscriber, rather than only NODE_ENV, so approved sandbox purchases remain recognized on a published test server.

## Verification before requesting a sandbox republish
Test unauthenticated bootstrap, no access before payment, invalid/forged proof rejection, approved-owner-only restoration, preservation of quote/customer IDs, repeated restore and the existing isolation suite. Preserve all legacy protected-route behavior. Include the supplied unit tests where compatible. Do not make real purchases, grant artificial entitlements, copy customer data, or send real notifications.

Once checked, ask the user to republish ONLY this sandbox. Report the deployed revision, bootstrap result without secrets, test isolation status, and remaining gates. The main project can then prepare one fresh TestFlight source/build for existing Apple app 6758575812 / app.replit.quotepro. Never create another Apple app, reuse an old Launch source URL, or submit to App Review as part of this handoff.
