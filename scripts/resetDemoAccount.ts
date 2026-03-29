/**
 * Reset Demo Account — Sprint 18
 * Run: npx ts-node scripts/resetDemoAccount.ts --confirm
 */

import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  if (!process.argv.includes("--confirm")) {
    console.log("⚠️  This will DELETE all demo data for demo@pristinehomecleaning.com.");
    console.log("    Run with --confirm to proceed:");
    console.log("    npx ts-node scripts/resetDemoAccount.ts --confirm");
    return;
  }

  const client = await pool.connect();
  try {
    const userResult = await client.query(
      "SELECT id FROM users WHERE email = $1",
      ["demo@pristinehomecleaning.com"]
    );
    if (userResult.rows.length === 0) {
      console.log("No demo account found.");
      return;
    }
    const userId = userResult.rows[0].id;
    const bizResult = await client.query(
      "SELECT id FROM businesses WHERE owner_user_id = $1",
      [userId]
    );
    if (bizResult.rows.length === 0) {
      console.log("No business found for demo account.");
      return;
    }
    const businessId = bizResult.rows[0].id;

    console.log(`Resetting demo account (business: ${businessId})...`);
    await client.query("DELETE FROM campaigns WHERE business_id = $1", [businessId]);
    await client.query("DELETE FROM review_requests WHERE business_id = $1", [businessId]);
    await client.query("DELETE FROM growth_tasks WHERE business_id = $1", [businessId]);
    await client.query("DELETE FROM jobs WHERE business_id = $1", [businessId]);
    await client.query("DELETE FROM quotes WHERE business_id = $1", [businessId]);
    await client.query("DELETE FROM employees WHERE business_id = $1", [businessId]);
    await client.query("DELETE FROM customers WHERE business_id = $1", [businessId]);
    await client.query("DELETE FROM growth_automation_settings WHERE business_id = $1", [businessId]);
    await client.query("DELETE FROM sales_strategy_settings WHERE business_id = $1", [businessId]);
    await client.query("DELETE FROM pricing_settings WHERE business_id = $1", [businessId]);

    console.log("✅ Demo account data wiped. Run seedDemoAccount.ts to reseed.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error("❌ Reset failed:", err.message);
  process.exit(1);
});
