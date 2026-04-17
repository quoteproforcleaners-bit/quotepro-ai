/**
 * E2E tests for the First-Quote Gate
 *
 * A logged-in user whose `has_completed_first_quote` flag is false must be
 * redirected to /onboarding/first-quote and blocked from /dashboard until
 * they complete at least one quote.  After completing a quote they land on
 * /onboarding/complete and can navigate to /dashboard without being bounced
 * back.
 *
 * Covers:
 *   - Gate redirect fires on /dashboard
 *   - Gate page shows Option A ("Quote a real lead") and Option B ("Try it on my home")
 *   - Option B address-form flow creates a quote and lands on /onboarding/complete
 *   - /onboarding/complete renders the iframe preview and the "Go to dashboard" CTA
 *   - Clicking "Go to dashboard" calls auth.refresh() so the gate is lifted and
 *     /dashboard is reachable without another redirect
 */

import { test, expect } from "@playwright/test";
import { Pool } from "pg";

const BASE_URL = "http://localhost:5000";
const PASSWORD = "TestGate2026!!";
// bcrypt hash for PASSWORD (cost 12, generated with bcryptjs)
const PASSWORD_HASH =
  "$2b$12$OPFA6mXTXXZnxxF4iRjFpuvonSLv4ic6DzkRKpYGv71rPk9i5zoZW";

async function seedGateUser(email: string) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(
      `INSERT INTO users
         (id, email, name, password_hash, auth_provider,
          has_completed_first_quote, trial_started_at)
       VALUES
         (gen_random_uuid(), $1, 'Gate E2E Test', $2, 'email',
          false, NOW())
       ON CONFLICT (email) DO UPDATE
         SET has_completed_first_quote = false,
             password_hash = $2`,
      [email, PASSWORD_HASH]
    );
    await pool.query(
      `INSERT INTO businesses
         (id, owner_user_id, company_name, onboarding_complete, created_at, updated_at)
       SELECT gen_random_uuid(), id, 'Gate E2E Co', true, NOW(), NOW()
       FROM users
       WHERE email = $1
         AND NOT EXISTS (
           SELECT 1 FROM businesses WHERE owner_user_id = users.id
         )`,
      [email]
    );
    // If business already exists (re-run scenario), ensure onboarding_complete=true
    await pool.query(
      `UPDATE businesses SET onboarding_complete = true
       WHERE owner_user_id = (SELECT id FROM users WHERE email = $1)`,
      [email]
    );
  } finally {
    await pool.end();
  }
}

async function getHasCompletedFirstQuote(email: string): Promise<boolean> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const res = await pool.query<{ has_completed_first_quote: boolean }>(
      "SELECT has_completed_first_quote FROM users WHERE email = $1",
      [email]
    );
    return res.rows[0]?.has_completed_first_quote ?? false;
  } finally {
    await pool.end();
  }
}

async function dismissModalIfPresent(
  page: import("@playwright/test").Page,
  buttonText: RegExp | string,
  timeout = 3000
) {
  try {
    const btn = page.getByRole("button", { name: buttonText });
    await btn.waitFor({ state: "visible", timeout });
    await btn.click();
  } catch {
    // modal not present – ignore
  }
}

async function loginAs(page: import("@playwright/test").Page, email: string) {
  await page.goto(`${BASE_URL}/login`);
  // Playwright fill() with React controlled inputs: click first to focus, then fill
  const emailInput = page.locator('input[type="email"]');
  await emailInput.click();
  await emailInput.fill(email);
  const pwInput = page.locator('input[type="password"]');
  await pwInput.click();
  await pwInput.fill(PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.endsWith("/login"), {
    timeout: 12000,
  });
  // Dismiss any first-login modals (language selection, "What's new", etc.)
  await dismissModalIfPresent(page, /continue/i, 3000);
  await dismissModalIfPresent(page, /got it/i, 3000);
  await dismissModalIfPresent(page, /let.s go/i, 3000);
}

// ──────────────────────────────────────────────────────────────────────────────

test.describe("First-Quote Gate", () => {
  const testEmail = `pw-gate-${Date.now()}@example.com`;

  test.beforeAll(async () => {
    await seedGateUser(testEmail);
  });

  test("gate redirects /dashboard to /onboarding/first-quote and shows both options", async ({
    page,
  }) => {
    await loginAs(page, testEmail);

    // Direct visit to /dashboard must be blocked
    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page).toHaveURL(/\/onboarding\/first-quote/, { timeout: 8000 });

    // Heading present
    await expect(
      page.getByRole("heading", { name: /let.s send your first quote/i })
    ).toBeVisible();

    // Option A – quote a real lead
    await expect(page.getByText(/quote a real lead/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /start quote/i })
    ).toBeVisible();

    // Option B – quote own home (Recommended)
    await expect(page.getByRole("button", { name: /try it on my home/i })).toBeVisible();
    await expect(page.getByText(/recommended/i)).toBeVisible();
  });

  test("gate fires again on repeated /dashboard visits before quote is completed", async ({
    page,
  }) => {
    await loginAs(page, testEmail);

    for (let i = 0; i < 2; i++) {
      await page.goto(`${BASE_URL}/dashboard`);
      await expect(page).toHaveURL(/\/onboarding\/first-quote/, {
        timeout: 8000,
      });
    }
  });

  test("Option A: 'Start quote' navigates to the new-quote creation page", async ({
    page,
  }) => {
    await loginAs(page, testEmail);
    await page.goto(`${BASE_URL}/onboarding/first-quote`);

    // Clicking Option A should navigate away from the gate page toward quote creation
    await page.getByRole("button", { name: /start quote/i }).click();
    await expect(page).toHaveURL(/\/quotes/, { timeout: 8000 });
  });

  test(
    "Option B: address-form → /onboarding/complete (iframe + CTAs) → 'Go to dashboard' lifts the gate",
    { timeout: 75000 },
    async ({ page }) => {
      await loginAs(page, testEmail);
      await page.goto(`${BASE_URL}/onboarding/first-quote`);

      // Show the inline address form
      await page.getByRole("button", { name: /try it on my home/i }).click();

      // Address form appears inline (no navigation)
      await expect(page).toHaveURL(/\/onboarding\/first-quote/);
      const addressInput = page.getByPlaceholder("123 Main St, City, State");
      await expect(addressInput).toBeVisible({ timeout: 5000 });

      // Fill and submit (quote generation may take up to 30 s)
      await addressInput.fill("100 Main Street, Denver, CO 80201");
      await page.getByRole("button", { name: /generate my quote/i }).click();
      await expect(page).toHaveURL(/\/onboarding\/complete/, {
        timeout: 35000,
      });
      expect(new URL(page.url()).searchParams.has("quoteId")).toBeTruthy();

      // ── /onboarding/complete content ──────────────────────────────────────
      await expect(
        page.getByText(/this is exactly what your customer sees/i)
      ).toBeVisible();
      await expect(page.locator("iframe")).toBeVisible({ timeout: 10000 });
      await expect(
        page.getByRole("button", { name: /go to dashboard/i })
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: /quote a real lead/i })
      ).toBeVisible();

      // ── Gate lifted after clicking "Go to dashboard" ──────────────────────
      // auth.refresh() is called before navigation so the gate reads the
      // updated hasCompletedFirstQuote=true value from the server
      await page.getByRole("button", { name: /go to dashboard/i }).click();
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

      // Confirm no redirect back to onboarding
      await page.waitForTimeout(1500);
      expect(page.url()).toMatch(/\/dashboard/);
      expect(page.url()).not.toMatch(/\/onboarding/);

      // DB verification
      const flagged = await getHasCompletedFirstQuote(testEmail);
      expect(flagged).toBe(true);
    }
  );
});
