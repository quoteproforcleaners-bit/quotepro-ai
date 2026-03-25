# QuotePro AI — Security Implementation Reference

> For engineering team use. Last updated: March 2026.

---

## 1. Prompt Injection Sanitization

**File:** `server/promptSanitizer.ts`

All user-supplied content is filtered through `sanitizeAndLog()` before entering any AI prompt.

### What is stripped
14 regex patterns covering common LLM injection techniques:
- "Ignore all previous instructions"
- "You are now…", "Forget all previous…"
- Role markers: `[system]`, `[user]`, `[assistant]`
- OpenAI chat markup: `<|im_start|>`, `<|im_end|>`
- "Act as if you are…", "Pretend to be…"
- "Reveal your system prompt / instructions"

Matched text is replaced with `[removed]`. Input is hard-truncated at **2,000 characters**.

### Where applied (4 endpoints in `server/routers/aiRouter.ts`)
| Route | Fields sanitized |
|-------|-----------------|
| `POST /api/ai/agent-chat` | `message` |
| `POST /api/ai/walkthrough-extract` | `description` / `notes` |
| `POST /api/ai/communication-draft` | `purpose`, `customerName`, `companyName`, `senderName` |
| `POST /api/ai/generate-message` | `purpose`, `customerName`, `companyName`, `senderName` |

### Monitoring
Any removal fires `trackEvent(userId, 'PROMPT_INJECTION_DETECTED', { context, originalSnippet })`. This appears in `GET /api/admin/security` under `promptInjectionAttempts`.

---

## 2. Stripe Webhook Verification

**File:** `server/routers/businessRouter.ts` — `POST /api/subscription/webhook`

### Pattern
The raw request body is captured **before** `express.json()` parses it, via the `verify` callback in `server/index.ts`:

```ts
app.use(express.json({
  verify: (req, _res, buf) => { req.rawBody = buf; }
}));
```

The webhook handler then calls:
```ts
stripe.webhooks.constructEvent(req.rawBody as Buffer, sig, STRIPE_WEBHOOK_SECRET)
```

This is the **only** HMAC-verified entry point. Any request with a bad or missing signature receives `HTTP 400` immediately — no event processing occurs.

### Monitoring
Failed signature attempts fire `trackEvent('system', 'WEBHOOK_SIGNATURE_FAILED')` and appear in `GET /api/admin/security` under `failedWebhookSignatures`.

---

## 3. Referral System Fraud Protection

**File:** `server/routers/businessRouter.ts` — inside `checkout.session.completed` Stripe webhook handler

Four fraud guards run in order before any referral credit is issued:

### ① 30-Day Paid Subscription Requirement
The referred user must have `subscription_started_at` older than 30 days **and** still be on an active paid plan. Credits issued before this window are skipped and logged — a future cron can re-evaluate them.

### ② Same-IP Block
`signup_ip` is captured from `X-Forwarded-For` at registration (stored in `users.signup_ip`). If referrer and referred share the same IP:
- `users.referral_fraud_flagged = true` is set on the referred user
- `REFERRAL_FRAUD_SUSPECTED` event is logged
- No credit is issued — requires manual admin review

### ③ Email Domain Matching (flag, don't block)
If both accounts share the same non-generic email domain (e.g., both `@acmeclean.com`), a `REFERRAL_DOMAIN_MATCH_FLAGGED` event is logged. The credit still proceeds — this is a soft signal for human review.

Generic domains excluded: `gmail.com`, `yahoo.com`, `hotmail.com`, `outlook.com`, `icloud.com`.

### ④ 6-Month Credit Cap
Each referrer is limited to 6 total credit months (`referral_credits_months`). Credits above this cap are silently skipped and a `REFERRAL_CAP_REACHED` event is logged.

### Database columns added
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS signup_ip text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_fraud_flagged boolean DEFAULT false;
```

---

## 4. Starter Tier AI Follow-Up Cap

**File:** `server/routers/businessRouter.ts` — `POST /api/communications/:id/send-now`

Starter users are capped at **3 AI follow-ups per month**.

### Enforcement
```
Before send:
  SELECT aiFollowUpsUsedThisMonth FROM users WHERE id = req.user.id
  If >= 3 → HTTP 403 { error: 'limit_reached', upgradeUrl: '/app/pricing' }

After successful send:
  UPDATE users SET ai_follow_ups_used_this_month = ai_follow_ups_used_this_month + 1
  WHERE id = req.user.id   -- atomic SQL, not read-modify-write
```

The atomic `+1` SQL update prevents race conditions under concurrent requests.

### Monthly Reset
`server/routers/integrationsRouter.ts` resets the counter on the 1st of each month:
```sql
UPDATE users SET ai_follow_ups_used_this_month = 0 WHERE ai_follow_ups_used_this_month > 0
```
This query is idempotent — running it multiple times in the same month has no additional effect.

---

## 5. API Key Security

**File:** `server/routers/integrationsRouter.ts` — `POST /api/api-keys`

### Creation
1. Generate 64-char random key: `qp_` + `crypto.randomBytes(32).toString("hex")`
2. SHA-256 hash the key → store **only the hash** in `api_keys.key_hash`
3. Store last 8 chars as `key_prefix` (for display/identification)
4. Return the **plaintext key once** to the user — never stored, never logged

### Verification
On every API request:
1. Extract key from request header
2. Compute `SHA-256(key)` server-side
3. `SELECT * FROM api_keys WHERE key_hash = $1 AND is_active = true`

SHA-256 is correct for API keys (fast, deterministic). bcrypt is used only for passwords (slow, salted). No bcrypt migration is necessary — the codebase has always used SHA-256 for API keys.

---

## 6. Admin Security Dashboard

**Endpoint:** `GET /api/admin/security`
**Auth:** `X-Admin-Key: <ADMIN_API_KEY>` header required

Returns a 30-day security snapshot:

```json
{
  "windowDays": 30,
  "promptInjectionAttempts": 0,
  "failedWebhookSignatures": 0,
  "suspectedReferralFraud": 0,
  "failedLoginAttempts": 0,
  "apiKeysIssued": 0,
  "apiKeysRevoked": 0
}
```

All counts are sourced from the `analytics_events` table (event names as documented above) and the `api_keys` table.

---

## Event Name Reference

| Event | Description |
|-------|-------------|
| `PROMPT_INJECTION_DETECTED` | Injection pattern stripped from AI input |
| `WEBHOOK_SIGNATURE_FAILED` | Stripe webhook HMAC check failed |
| `REFERRAL_FRAUD_SUSPECTED` | Same-IP referral detected |
| `REFERRAL_DOMAIN_MATCH_FLAGGED` | Referral pair shares a corporate email domain |
| `REFERRAL_CAP_REACHED` | Referrer already has 6 credit months |
| `LOGIN_FAILED` | Failed password authentication attempt |
