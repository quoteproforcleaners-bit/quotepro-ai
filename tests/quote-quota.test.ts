/**
 * Regression test for the quote-quota gate.
 *
 * The bug: server/routers/quotesRouter.ts was calling
 * getQuotesByBusiness(business.id) (lifetime quotes) and comparing length
 * against the Starter cap of 20, which capped Starter users forever as soon
 * as they hit 20 quotes — even though the error message says "monthly limit".
 *
 * The fix: a new storage helper `getQuoteCountThisMonth(businessId)` counts
 * only quotes created in the current calendar month, so the cap resets on
 * the 1st of each month.
 *
 * This test seeds a synthetic business + 20 quotes dated last month and
 * confirms `getQuoteCountThisMonth` reports 0 (not 20). It then inserts a
 * single quote dated today and confirms the count rolls forward to 1.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { getQuoteCountThisMonth } from "../server/storage";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

let userId: string;
let businessId: string;

beforeAll(async () => {
  const userRes = await pool.query<{ id: string }>(
    `INSERT INTO users (email, name, auth_provider, subscription_tier)
     VALUES ($1, 'Quote Quota Test', 'email', 'starter')
     RETURNING id`,
    [`vitest-quota-${Date.now()}@example.com`]
  );
  userId = userRes.rows[0].id;

  const bizRes = await pool.query<{ id: string }>(
    `INSERT INTO businesses (owner_user_id, company_name, created_at, updated_at)
     VALUES ($1, 'Quota Test Co', NOW(), NOW())
     RETURNING id`,
    [userId]
  );
  businessId = bizRes.rows[0].id;

  // Seed 20 quotes dated 35 days ago (definitely last month).
  for (let i = 0; i < 20; i++) {
    await pool.query(
      `INSERT INTO quotes (business_id, status, created_at)
       VALUES ($1, 'draft', NOW() - INTERVAL '35 days')`,
      [businessId]
    );
  }
});

afterAll(async () => {
  if (businessId) {
    await pool.query(`DELETE FROM quotes WHERE business_id = $1`, [businessId]);
    await pool.query(`DELETE FROM businesses WHERE id = $1`, [businessId]);
  }
  if (userId) await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
  await pool.end();
});

describe("getQuoteCountThisMonth", () => {
  it("returns 0 when all 20 quotes were created last month (Starter user is NOT capped)", async () => {
    const count = await getQuoteCountThisMonth(businessId);
    expect(count).toBe(0);
  });

  it("rolls forward to 1 after a quote is created this month", async () => {
    await pool.query(
      `INSERT INTO quotes (business_id, status, created_at)
       VALUES ($1, 'draft', NOW())`,
      [businessId]
    );
    const count = await getQuoteCountThisMonth(businessId);
    expect(count).toBe(1);
  });

  it("excludes soft-deleted quotes from the count", async () => {
    const insRes = await pool.query<{ id: string }>(
      `INSERT INTO quotes (business_id, status, created_at, deleted_at)
       VALUES ($1, 'draft', NOW(), NOW())
       RETURNING id`,
      [businessId]
    );
    const count = await getQuoteCountThisMonth(businessId);
    // Still 1 (the previous test's quote); the soft-deleted one is excluded.
    expect(count).toBe(1);
    // Cleanup the soft-deleted row so afterAll's hard-delete catches it.
    await pool.query(`DELETE FROM quotes WHERE id = $1`, [insRes.rows[0].id]);
  });
});
