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

test.describe("First-Quote Gate – skip link visibility by error type", () => {
  // Helpers --------------------------------------------------------------------

  async function mockQuoteCreateStatus(
    page: import("@playwright/test").Page,
    status: number,
    message: string
  ) {
    await page.route("**/api/quotes", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status,
          contentType: "application/json",
          body: JSON.stringify({ message }),
        });
      } else {
        await route.continue();
      }
    });
  }

  async function openOwnHomeForm(page: import("@playwright/test").Page) {
    await expect(
      page.getByRole("heading", { name: /let.s send your first quote/i })
    ).toBeVisible({ timeout: 8000 });

    const tryItBtn = page.getByRole("button", { name: /try it on my home/i });
    await expect(tryItBtn).toBeVisible({ timeout: 8000 });

    // Click and retry until the address form actually renders. React state
    // updates can race with the analytics fire-and-forget call, so retry the
    // click a few times if the form does not appear.
    const addressInput = page.getByPlaceholder("Start typing your address...");
    for (let attempt = 0; attempt < 3; attempt++) {
      await tryItBtn.click().catch(() => {});
      try {
        await expect(addressInput).toBeVisible({ timeout: 3000 });
        break;
      } catch {
        if (attempt === 2) throw new Error("Address form did not appear");
      }
    }
    await addressInput.fill("100 Main Street, Denver, CO 80201");
  }

  // Tests ----------------------------------------------------------------------

  test(
    "429 rate-limit response: skip link visible after the first failure",
    { timeout: 30000 },
    async ({ page }) => {
      const email = `pw-gate-429-${Date.now()}@example.com`;
      await seedGateUser(email);
      await loginAs(page, email);
      await page.goto(`${BASE_URL}/onboarding/first-quote`);
      await mockQuoteCreateStatus(page, 429, "Too many requests");
      await openOwnHomeForm(page);

      await page.getByRole("button", { name: /generate my quote/i }).click();

      await expect(
        page.getByText(/too many requests/i)
      ).toBeVisible({ timeout: 8000 });

      // Skip link must be visible after a single 429 failure
      await expect(
        page.getByRole("button", { name: /skip this step/i })
      ).toBeVisible({ timeout: 5000 });
    }
  );

  test(
    "5xx server response: skip link visible after the first failure",
    { timeout: 30000 },
    async ({ page }) => {
      const email = `pw-gate-5xx-${Date.now()}@example.com`;
      await seedGateUser(email);
      await loginAs(page, email);
      await page.goto(`${BASE_URL}/onboarding/first-quote`);
      await mockQuoteCreateStatus(page, 500, "Simulated server error");
      await openOwnHomeForm(page);

      await page.getByRole("button", { name: /generate my quote/i }).click();

      await expect(
        page.getByText(/our servers are having trouble/i)
      ).toBeVisible({ timeout: 8000 });

      // Skip link must be visible after a single 5xx failure
      await expect(
        page.getByRole("button", { name: /skip this step/i })
      ).toBeVisible({ timeout: 5000 });
    }
  );

  test(
    "Generic client error (400): skip link hidden after 1 failure, visible after 2; skip navigates to dashboard",
    { timeout: 30000 },
    async ({ page }) => {
      const email = `pw-gate-400-${Date.now()}@example.com`;
      await seedGateUser(email);
      await loginAs(page, email);
      await page.goto(`${BASE_URL}/onboarding/first-quote`);
      await mockQuoteCreateStatus(page, 400, "Bad request");
      await openOwnHomeForm(page);

      // ── First failure: skip link must NOT be visible ──────────────────────
      await page.getByRole("button", { name: /generate my quote/i }).click();

      await expect(
        page.getByText(/something went wrong generating your quote/i)
      ).toBeVisible({ timeout: 8000 });

      await expect(
        page.getByRole("button", { name: /try again/i })
      ).toBeVisible();

      await expect(
        page.getByRole("button", { name: /skip this step/i })
      ).not.toBeVisible();

      // ── Second failure: skip link must now be visible ─────────────────────
      await page.getByRole("button", { name: /try again/i }).click();

      await expect(
        page.getByText(/something went wrong generating your quote/i)
      ).toBeVisible({ timeout: 8000 });

      const skipLink = page.getByRole("button", { name: /skip this step/i });
      await expect(skipLink).toBeVisible({ timeout: 5000 });

      // ── Clicking skip navigates to /dashboard ─────────────────────────────
      await skipLink.click();
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    }
  );
});

// ──────────────────────────────────────────────────────────────────────────────

test.describe("First-Quote Gate – skip API failure still navigates to dashboard", () => {
  const skipFailEmail = `pw-gate-skipfail-${Date.now()}@example.com`;

  test.beforeAll(async () => {
    // Seed the user with has_completed_first_quote=true so the FirstQuoteGate
    // won't bounce them away from /dashboard. We're specifically testing that
    // the FirstQuotePage's handleSkip()  *itself* surfaces the warning toast
    // and still calls navigate("/dashboard") when the skip API returns 500 —
    // we don't want the gate redirect to confound that assertion.
    await seedGateUser(skipFailEmail);
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
      await pool.query(
        "UPDATE users SET has_completed_first_quote = true WHERE email = $1",
        [skipFailEmail]
      );
    } finally {
      await pool.end();
    }
  });

  test(
    "when POST /api/quotes/onboarding-skip returns 500, the warning toast appears and the user is still navigated to /dashboard",
    { timeout: 30000 },
    async ({ page }) => {
      await loginAs(page, skipFailEmail);
      await page.goto(`${BASE_URL}/onboarding/first-quote`);

      await expect(
        page.getByRole("heading", { name: /let.s send your first quote/i })
      ).toBeVisible({ timeout: 8000 });

      // Force quote creation to fail (500) so the skip link is revealed.
      // Pattern **/api/quotes (exact) does NOT match the onboarding-skip subpath.
      await page.route("**/api/quotes", async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({ message: "Simulated server error" }),
          });
        } else {
          await route.continue();
        }
      });

      // Force the skip API to return 500 — this is the behavior under test.
      let skipApiCalled = false;
      await page.route("**/api/quotes/onboarding-skip", async (route) => {
        if (route.request().method() === "POST") {
          skipApiCalled = true;
          await route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({ message: "Simulated skip server error" }),
          });
        } else {
          await route.continue();
        }
      });

      // Slow down the post-skip auth refresh so the toast has a window to be
      // asserted before navigation unmounts the onboarding page.
      await page.route("**/api/auth/me", async (route) => {
        if (route.request().method() === "GET") {
          await new Promise((r) => setTimeout(r, 1500));
        }
        await route.continue();
      });

      // Reveal the skip link by causing two quote-create failures.
      await page.getByRole("button", { name: /try it on my home/i }).click();
      const addressInput = page.getByPlaceholder(/start typing your address/i);
      await expect(addressInput).toBeVisible({ timeout: 8000 });
      await addressInput.click();
      await addressInput.pressSequentially("100 Main Street, Denver, CO 80201", { delay: 10 });
      await expect(addressInput).toHaveValue(/100 Main Street/);

      // The autocomplete dropdown overlaps the submit button. Click any
      // suggestion (matches the secondary "City, State, USA" line that only
      // appears inside dropdown items) to commit the value and close the dropdown.
      const anySuggestion = page.locator('text=/^[A-Za-z][A-Za-z .\'-]+,\\s*[A-Z]{2},\\s*USA$/').first();
      try {
        await anySuggestion.waitFor({ state: "visible", timeout: 3000 });
        await anySuggestion.click();
      } catch {
        // Suggestions may not appear if Google Places isn't reachable; that's fine.
      }

      await page.getByRole("button", { name: /generate my quote/i }).click();
      // 500 from /api/quotes shows the server-error message; the skip link
      // is revealed immediately after a single server/rate-limit failure.
      await expect(
        page.getByText(/our servers are having trouble/i)
      ).toBeVisible({ timeout: 8000 });

      const skipLink = page.getByRole("button", { name: /skip this step/i });
      await expect(skipLink).toBeVisible({ timeout: 5000 });

      // Click skip — the API will return 500.
      await skipLink.click();

      // Warning toast must be visible before navigation completes.
      await expect(
        page.getByText(/couldn.t save your progress/i)
      ).toBeVisible({ timeout: 5000 });

      // User must still end up on /dashboard despite the API failure.
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

      // Sanity check: the failing skip endpoint really was hit.
      expect(skipApiCalled).toBe(true);
    }
  );
});

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
