---
name: RevenueCat API version checks
description: Distinguish V1 key compatibility from catalog API authorization failures.
---
A RevenueCat V1 secret receives a 403 legacy-key error when used to list projects through V2. This is a version mismatch, not evidence that the secret is invalid.

**Why:** Catalog inspection and subscriber verification use different API versions; replacing a suitable V1 key just to pass a V2 catalog check can break subscriber verification.

**How to apply:** Match credentials to the endpoint version. Recognition of a V1 key alone does not prove access to the intended app or successful subscriber verification. Avoid generating dummy customers solely to check authentication; use a known test identity for native verification.
