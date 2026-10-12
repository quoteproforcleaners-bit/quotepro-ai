---
name: Release scope
description: User-approved release baseline and limits on further work.
---
Use the previously published app, approximately four months before October 2026, as the baseline—not the recent refactor. Keep its experience and apply only no-free-trial pricing: Basic quotes $1.99/week, AI $4.99/week. Defer broader product improvements.

**Why:** The user wants to get the existing app published rather than continue expanding scope.

**How to apply:** Preserve customer data and avoid unrelated redesigns or feature removal. Verify the intended published baseline before changes. A Replit publish checkpoint is not by itself proof of the App Store binary version.

The user explicitly instructed: “Don’t skip verifying purchases on an iPhone.”

**Why:** The user requires real native purchase verification before release.

**How to apply:** Confirm both plans, access restrictions, and purchase restoration on iPhone before calling the release ready. Browser tests do not substitute for native purchase checks.

Keep historical paid access and customer quote links while removing free acquisition allowances. Do not reset provider customers or cancel existing subscriptions to simplify testing.

**Why:** A pricing-only release must not erase existing paid periods or customer agreements.

**How to apply:** Verify remaining access with the provider; cancellation of renewal is not immediate expiry. Test new weekly products using isolated identities and a native build.
