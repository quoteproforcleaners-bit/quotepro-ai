/**
 * Billing Reconciliation Script
 * Finds growth/pro users with no Stripe subscription and an expired (or null)
 * subscription_expires_at, then downgrades them to starter.
 *
 * NOTE: The schema uses subscription_expires_at (not trial_ends_at).
 *
 * Run: npm run reconcile:billing
 */

import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  console.log("=== QuotePro Billing Reconciliation ===\n");

  // ── 1. SELECT — show what we'd affect ─────────────────────────────────────
  const selectResult = await pool.query<{
    id: string;
    email: string;
    subscriptionTier: string;
    stripe_subscription_id: string | null;
    subscription_expires_at: string | null;
  }>(`
    SELECT id, email, subscription_tier AS "subscriptionTier",
           stripe_subscription_id,
           subscription_expires_at
    FROM users
    WHERE subscription_tier IN ('growth', 'pro')
      AND (stripe_subscription_id IS NULL OR stripe_subscription_id = '')
      AND (subscription_expires_at IS NULL OR subscription_expires_at < NOW())
  `);

  const rows = selectResult.rows;
  console.log(`Found ${rows.length} stale account(s):\n`);

  if (rows.length === 0) {
    console.log("No stale accounts found. Nothing to do.");
    await pool.end();
    return;
  }

  // ── 2. Log each row (id + email + tier only) ──────────────────────────────
  for (const row of rows) {
    console.log(`  id=${row.id}  email=${row.email}  tier=${row.subscriptionTier}`);
  }

  // ── 3. UPDATE — downgrade to starter ──────────────────────────────────────
  console.log("\nDowngrading to starter...");
  const updateResult = await pool.query(`
    UPDATE users
    SET subscription_tier = 'starter',
        updated_at = NOW()
    WHERE subscription_tier IN ('growth', 'pro')
      AND (stripe_subscription_id IS NULL OR stripe_subscription_id = '')
      AND (subscription_expires_at IS NULL OR subscription_expires_at < NOW())
  `);

  console.log(`\nDone. ${updateResult.rowCount} row(s) updated.`);
  await pool.end();
}

main().catch((err) => {
  console.error("Script failed:", err.message);
  pool.end();
  process.exit(1);
});
