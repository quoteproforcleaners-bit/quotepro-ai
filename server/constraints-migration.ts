/**
 * server/constraints-migration.ts
 * One-time migration: add CHECK constraints and performance indexes.
 *
 * Run once: npx tsx server/constraints-migration.ts
 * Safe to re-run — all statements are guarded with IF NOT EXISTS / DO blocks.
 *
 * Constraint rationale
 * ────────────────────
 * referral_credits_months   0–6  The hard cap is enforced atomically in code;
 *                                this makes the invariant true at the DB layer too,
 *                                preventing direct-DB manipulation or future code bugs
 *                                from exceeding the 6-month cap.
 *
 * ai_follow_ups_used_this_month  >= 0 only
 *   Upper bound is plan-specific (Starter = 3). Growth/Pro may have higher or
 *   separate limits. A DB upper-bound cap would silently reject legitimate writes
 *   for higher-tier users or when plan limits change in the future.
 *
 * photo_quotes_used_this_month   >= 0 only
 *   Pro tier is unlimited (Infinity in code). Counter is still incremented per use,
 *   so any fixed upper bound would throw on Pro users who exceed it.
 *
 * quotes_this_month              >= 0 only
 *   No plan-wide ceiling exists in code; large Pro businesses routinely send
 *   hundreds of quotes per month.
 */

import { pool } from "./db";

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // ── referral_credits_months: 0–6 ─────────────────────────────────────────
    // Exact match to the 6-month cap enforced in businessRouter / referralCredits cron.
    // NULL is allowed (COALESCE(referral_credits_months, 0) is used throughout).
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'referral_credits_limit'
            AND conrelid = 'users'::regclass
        ) THEN
          ALTER TABLE users ADD CONSTRAINT referral_credits_limit
            CHECK (referral_credits_months IS NULL
                OR (referral_credits_months >= 0 AND referral_credits_months <= 6));
        END IF;
      END $$;
    `);

    // ── Non-negative guards for usage counters ────────────────────────────────
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'ai_follow_ups_non_negative'
            AND conrelid = 'users'::regclass
        ) THEN
          ALTER TABLE users ADD CONSTRAINT ai_follow_ups_non_negative
            CHECK (ai_follow_ups_used_this_month IS NULL
                OR ai_follow_ups_used_this_month >= 0);
        END IF;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'photo_quotes_non_negative'
            AND conrelid = 'users'::regclass
        ) THEN
          ALTER TABLE users ADD CONSTRAINT photo_quotes_non_negative
            CHECK (photo_quotes_used_this_month IS NULL
                OR photo_quotes_used_this_month >= 0);
        END IF;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'quotes_this_month_non_negative'
            AND conrelid = 'users'::regclass
        ) THEN
          ALTER TABLE users ADD CONSTRAINT quotes_this_month_non_negative
            CHECK (quotes_this_month IS NULL OR quotes_this_month >= 0);
        END IF;
      END $$;
    `);

    // ── Performance indexes ────────────────────────────────────────────────────
    await client.query(`
      CREATE INDEX IF NOT EXISTS users_subscription_tier_idx
        ON users(subscription_tier)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS customers_business_email_idx
        ON customers(business_id, email)
    `);

    await client.query("COMMIT");
    console.log("Constraints migration complete.");

    // Verify what was created
    const { rows: constraints } = await client.query(`
      SELECT conname, pg_get_constraintdef(oid) AS definition
      FROM pg_constraint
      WHERE conrelid = 'users'::regclass AND contype = 'c'
      ORDER BY conname
    `);
    console.log("CHECK constraints now on users:");
    constraints.forEach((r) => console.log(`  ${r.conname}: ${r.definition}`));

    const { rows: indexes } = await client.query(`
      SELECT indexname FROM pg_indexes
      WHERE tablename IN ('users', 'customers')
        AND indexname IN (
          'users_subscription_tier_idx',
          'customers_business_email_idx'
        )
    `);
    console.log("Indexes confirmed:", indexes.map((r) => r.indexname).join(", "));
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("Migration failed, rolled back:", e);
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(() => process.exit(1));
