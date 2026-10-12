---
name: User account anonymization (deletion requests)
description: How to honor customer account-deletion requests in prod, and the constraints that bite.
---

## The write path
- Prod DB is reachable read-only via `executeSql({environment:"production"})`. The ONLY write path to prod from the dev/agent side is the deployed admin endpoint `POST /api/admin/deactivate-user` in `server/routers/adminRouter.ts` (auth: `?secret=ADMIN_GRANT_PRO_SECRET`, body `{email, dryRun?, sendConfirmation?, firstName?}`).
- The secret value baked into a running deployment is fixed at deploy time. If you set/rotate `ADMIN_GRANT_PRO_SECRET`, the live prod container keeps the OLD value until the next publish — a 403 from prod with a fresh secret means "needs redeploy", not "wrong secret".

## Constraint that bit twice
- `users.auth_provider` is `NOT NULL DEFAULT 'email'`. Anonymization must set it to a non-null sentinel (use `'deleted'`), NEVER null. `users.provider_id` IS nullable.
- **Why:** A one-shot boot-time anonymizer that set `auth_provider = NULL` failed silently on every prod boot for weeks (logged `[deactivate-kvleen] Failed: null value in column "auth_provider" ...`), so the account was never actually deleted despite repeated deploys.
- **How to apply:** Prefer the admin endpoint over one-shot boot blocks. Boot blocks that fail are invisible to the user and re-run every boot. If you must use one, verify it succeeded in deployment logs before assuming done.

## Anonymization shape (what the endpoint does)
- users: email -> `deleted+{uid}@deleted.quotepro.local`, name 'Deleted User', null password_hash/contact_email/first_name/provider_id, auth_provider 'deleted', email_unreachable + sms_opted_out + drip flags true.
- businesses (owner_user_id): company_name 'Deactivated Account', null contact fields.
- customers: soft-delete via deleted_at + scrub PII.
- Stripe subs are NOT canceled by the endpoint — cancel them separately in Stripe first, then run the endpoint.
