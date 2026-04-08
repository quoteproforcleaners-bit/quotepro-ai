import { pool } from "./db";

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS availability_settings (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        working_days INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}',
        start_time VARCHAR(5) NOT NULL DEFAULT '08:00',
        end_time VARCHAR(5) NOT NULL DEFAULT '17:00',
        slot_duration_minutes INTEGER NOT NULL DEFAULT 120,
        buffer_minutes INTEGER NOT NULL DEFAULT 30,
        advance_booking_days INTEGER NOT NULL DEFAULT 30,
        min_notice_hours INTEGER NOT NULL DEFAULT 24,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS blocked_dates (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        blocked_date TEXT NOT NULL,
        reason VARCHAR(255),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        autopilot_job_id VARCHAR REFERENCES autopilot_jobs(id) ON DELETE SET NULL,
        scheduled_date TEXT NOT NULL,
        scheduled_time VARCHAR(5) NOT NULL,
        duration_minutes INTEGER NOT NULL DEFAULT 120,
        customer_name TEXT,
        customer_email TEXT,
        customer_phone TEXT,
        service_type TEXT,
        address TEXT,
        quote_amount REAL,
        status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`ALTER TABLE autopilot_jobs ADD COLUMN IF NOT EXISTS quote_amount REAL`);
    await client.query(`ALTER TABLE autopilot_jobs ADD COLUMN IF NOT EXISTS quote_sent_at TIMESTAMP`);
    await client.query(`ALTER TABLE autopilot_jobs ADD COLUMN IF NOT EXISTS quote_accepted_at TIMESTAMP`);
    await client.query(`ALTER TABLE autopilot_jobs ADD COLUMN IF NOT EXISTS booking_token VARCHAR UNIQUE DEFAULT gen_random_uuid()`);
    await client.query(`ALTER TABLE autopilot_jobs ADD COLUMN IF NOT EXISTS current_step TEXT NOT NULL DEFAULT 'quote_sent'`);
    await client.query(`ALTER TABLE autopilot_jobs ADD COLUMN IF NOT EXISTS confirmation_sent_at TIMESTAMP`);
    await client.query(`ALTER TABLE autopilot_jobs ADD COLUMN IF NOT EXISTS booking_id INTEGER`);

    await client.query("COMMIT");
    console.log("Migration complete.");
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", e);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
