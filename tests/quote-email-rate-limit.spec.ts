/**
 * Integration test for the per-user quote email rate limiter (5/hour).
 *
 * Spec (Task #26):
 *   - Fire 6 POSTs across both /quotes/:id/send-with-pdf and
 *     /quotes/:id/onboarding-send under the same authenticated session
 *   - The 6th request must return HTTP 429 with the configured JSON body
 *
 * The express-rate-limit middleware increments its counter before the route
 * handler runs, so this test deliberately uses a non-existent quote id: the
 * first 5 requests can fail with 404/4xx (handler can't find the quote) but
 * the limiter still increments. The 6th request must short-circuit with 429
 * regardless of handler behavior, which is exactly the regression we want
 * to guard against (someone removing the limiter from one of these routes).
 */

import { test, expect, request as pwRequest } from "@playwright/test";
import { Pool } from "pg";

const BASE_URL = "http://localhost:5000";
const PASSWORD = "RateLimit2026!!";
// bcrypt hash for PASSWORD (cost 12, generated with bcryptjs); same key
// schedule used by the other e2e specs in this directory.
const PASSWORD_HASH =
  "$2b$12$T6FNd5ihX1vh3JYIUfwBQObLkUfKVEKnskXeqofCUcc7P5jFXyf3.";

async function seedGrowthUser(email: string) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    // Generate a fresh bcrypt hash on the fly so we don't depend on a
    // pre-baked constant matching PASSWORD across environments.
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.hash(PASSWORD, 12);

    await pool.query(
      `INSERT INTO users
         (id, email, name, password_hash, auth_provider,
          subscription_tier, has_completed_first_quote, trial_started_at)
       VALUES
         (gen_random_uuid(), $1, 'Rate Limit E2E', $2, 'email',
          'growth', true, NOW())
       ON CONFLICT (email) DO UPDATE
         SET subscription_tier = 'growth',
             has_completed_first_quote = true,
             password_hash = $2`,
      [email, hash]
    );
    await pool.query(
      `INSERT INTO businesses
         (id, owner_user_id, company_name, onboarding_complete, created_at, updated_at)
       SELECT gen_random_uuid(), id, 'Rate Limit Co', true, NOW(), NOW()
       FROM users
       WHERE email = $1
         AND NOT EXISTS (
           SELECT 1 FROM businesses WHERE owner_user_id = users.id
         )`,
      [email]
    );

    // Reset any prior counters so previous CI runs don't poison this test.
    await pool.query(
      `DELETE FROM rate_limit_counters
       WHERE key LIKE 'quote-email:%'
         AND key IN (
           SELECT 'quote-email:' || id FROM users WHERE email = $1
         )`,
      [email]
    );
  } finally {
    await pool.end();
  }
}

test.describe("quote email rate limiter (per-user, 5/hour)", () => {
  test(
    "blocks the 6th send across /quotes/:id/send-with-pdf and /quotes/:id/onboarding-send",
    { timeout: 30000 },
    async () => {
      const email = `pw-quote-email-rl-${Date.now()}@example.com`;
      await seedGrowthUser(email);

      // Fresh request context = fresh cookie jar, so this session is isolated
      // from any other tests running in parallel.
      const ctx = await pwRequest.newContext({ baseURL: BASE_URL });
      try {
        const login = await ctx.post("/api/auth/login", {
          data: { email, password: PASSWORD },
        });
        expect(login.status(), `login failed: ${await login.text()}`).toBe(200);

        const calls = [
          { path: "/api/quotes/q-rl-1/send-with-pdf" },
          { path: "/api/quotes/q-rl-1/onboarding-send" },
          { path: "/api/quotes/q-rl-2/send-with-pdf" },
          { path: "/api/quotes/q-rl-2/onboarding-send" },
          { path: "/api/quotes/q-rl-3/send-with-pdf" },
          { path: "/api/quotes/q-rl-3/onboarding-send" }, // 6th = blocked
        ];

        const statuses: number[] = [];
        let lastBody: any = null;
        for (let i = 0; i < calls.length; i++) {
          const res = await ctx.post(calls[i].path, {
            data: { to: "customer@example.com", subject: "test" },
          });
          statuses.push(res.status());
          if (i === calls.length - 1) {
            try {
              lastBody = await res.json();
            } catch {
              lastBody = await res.text();
            }
          }
        }

        // First 5 must NOT be 429 (handler may legitimately 4xx because the
        // quote id doesn't exist; what matters is that the limiter let them
        // through to the handler).
        for (let i = 0; i < 5; i++) {
          expect(
            statuses[i],
            `request #${i + 1} (${calls[i].path}) was unexpectedly rate-limited`
          ).not.toBe(429);
        }

        // 6th must be the rate-limit response with the configured JSON body.
        expect(statuses[5]).toBe(429);
        expect(lastBody).toEqual({
          message: "Too many emails sent. Please wait before sending another.",
        });
      } finally {
        await ctx.dispose();
      }
    }
  );
});
