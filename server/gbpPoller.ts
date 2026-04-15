/**
 * Google Business Profile lead poller.
 * Runs every 5 minutes for each connected GBP account, checks for new
 * customer reviews and Q&A questions (the primary signals available via the
 * GBP API), creates draft quotes from unseen leads, and notifies the operator.
 */

import cron from "node-cron";
import { pool } from "./db";
import { sendEmail, PLATFORM_FROM_EMAIL, PLATFORM_FROM_NAME, MIKE_ALERTS_EMAIL } from "./mail";

const LOG = "[gbp-poller]";

interface GbpConn {
  userId: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  accountId: string | null;
  locationId: string | null;
  locationName: string | null;
}

// ── Token Refresh ─────────────────────────────────────────────────────────────
async function ensureFreshToken(conn: GbpConn): Promise<string | null> {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) return null;

  const now = new Date();
  const isExpired = conn.expiresAt && conn.expiresAt <= new Date(now.getTime() + 60_000);

  if (!isExpired) return conn.accessToken;
  if (!conn.refreshToken) {
    console.warn(`${LOG} [user:${conn.userId}] access token expired and no refresh token — marking disconnected`);
    await markDisconnected(conn.userId, "token_expired");
    return null;
  }

  try {
    const resp = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: conn.refreshToken,
        grant_type: "refresh_token",
      }),
    });
    if (!resp.ok) {
      const body = await resp.text();
      if (body.includes("invalid_grant")) {
        console.warn(`${LOG} [user:${conn.userId}] refresh token invalid — marking disconnected`);
        await markDisconnected(conn.userId, "refresh_invalid");
        await notifyReconnect(conn.userId);
      }
      return null;
    }
    const data: any = await resp.json();
    const newExpiry = new Date(Date.now() + (data.expires_in ?? 3600) * 1000);
    await pool.query(
      `UPDATE gbp_connections SET access_token = $1, expires_at = $2 WHERE user_id = $3`,
      [data.access_token, newExpiry, conn.userId]
    );
    return data.access_token;
  } catch (e: any) {
    console.error(`${LOG} [user:${conn.userId}] token refresh error:`, e.message);
    return null;
  }
}

async function markDisconnected(userId: string, _reason: string) {
  await pool.query(
    `UPDATE gbp_connections SET access_token = '', refresh_token = NULL WHERE user_id = $1`,
    [userId]
  );
}

async function notifyReconnect(userId: string) {
  try {
    const { rows } = await pool.query(`SELECT email FROM users WHERE id = $1`, [userId]);
    if (!rows[0]?.email) return;
    await sendEmail({
      to: rows[0].email,
      subject: "Action required: Reconnect your Google Business Profile",
      html: `<p>Hi,</p><p>Your Google Business Profile connection to QuotePro has expired and needs to be reconnected. New leads from Google will not be captured until you reconnect.</p><p><a href="https://app.getquotepro.ai/settings?tab=integrations">Click here to reconnect</a></p><p>— QuotePro</p>`,
      fromEmail: PLATFORM_FROM_EMAIL,
      fromName: PLATFORM_FROM_NAME,
    });
  } catch (e: any) {
    console.error(`${LOG} notifyReconnect error:`, e.message);
  }
}

// ── API Calls ─────────────────────────────────────────────────────────────────
async function fetchReviews(token: string, accountId: string, locationId: string): Promise<any[]> {
  try {
    const url = `https://mybusiness.googleapis.com/v4/${accountId}/${locationId}/reviews?pageSize=10`;
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!resp.ok) {
      console.warn(`${LOG} reviews API ${resp.status}:`, await resp.text().catch(() => ""));
      return [];
    }
    const data: any = await resp.json();
    return data.reviews ?? [];
  } catch (e: any) {
    console.warn(`${LOG} fetchReviews error:`, e.message);
    return [];
  }
}

async function fetchQuestions(token: string, accountId: string, locationId: string): Promise<any[]> {
  try {
    const url = `https://mybusiness.googleapis.com/v4/${accountId}/${locationId}/questions?pageSize=10`;
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!resp.ok) {
      console.warn(`${LOG} questions API ${resp.status}:`, await resp.text().catch(() => ""));
      return [];
    }
    const data: any = await resp.json();
    return data.questions ?? [];
  } catch (e: any) {
    console.warn(`${LOG} fetchQuestions error:`, e.message);
    return [];
  }
}

// ── Parse Lead Data ───────────────────────────────────────────────────────────
function parseServiceType(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("move out") || t.includes("move-out") || t.includes("moving out")) return "move-out";
  if (t.includes("deep clean") || t.includes("deep-clean")) return "deep";
  if (t.includes("commercial") || t.includes("office") || t.includes("business")) return "commercial";
  if (t.includes("recurring") || t.includes("weekly") || t.includes("biweekly") || t.includes("monthly")) return "recurring";
  return "standard";
}

// ── Process a Single Lead ─────────────────────────────────────────────────────
async function processLead(conn: GbpConn, googleLeadId: string, rawData: any) {
  // Skip if already processed
  const existing = await pool.query(
    `SELECT id FROM gbp_leads WHERE user_id = $1 AND google_lead_id = $2`,
    [conn.userId, googleLeadId]
  );
  if (existing.rows.length > 0) return;

  // Get business for this user
  const bizRes = await pool.query(
    `SELECT id FROM businesses WHERE owner_user_id = $1 LIMIT 1`,
    [conn.userId]
  );
  if (bizRes.rows.length === 0) return;
  const businessId = bizRes.rows[0].id;

  // Extract customer info from the raw GBP data
  const reviewerName = rawData.reviewer?.displayName ?? rawData.author?.displayName ?? "";
  const message =
    rawData.comment ??
    rawData.text ??
    (typeof rawData.question === "string" ? rawData.question : rawData.question?.text) ??
    "";

  const [firstName, ...rest] = reviewerName.split(" ");
  const lastName = rest.join(" ");
  const serviceType = parseServiceType(message);

  // Create a draft quote
  const quoteRes = await pool.query(
    `INSERT INTO quotes
       (business_id, first_name, last_name, notes, status, source, created_at, updated_at)
     VALUES ($1, $2, $3, $4, 'draft', 'gbp', NOW(), NOW())
     RETURNING id`,
    [
      businessId,
      firstName || "Google",
      lastName || "Lead",
      message
        ? `[From Google Business Profile]\n\n${message}`
        : "[Lead from Google Business Profile]",
    ]
  );
  const quoteId = quoteRes.rows[0].id;

  // Record the lead
  await pool.query(
    `INSERT INTO gbp_leads (user_id, google_lead_id, raw_data, processed_at, quote_id)
     VALUES ($1, $2, $3, NOW(), $4)`,
    [conn.userId, googleLeadId, JSON.stringify(rawData), quoteId]
  );

  // Notify the operator by email
  await notifyOperator(conn, { firstName, lastName, message, quoteId, serviceType });
}

async function notifyOperator(
  conn: GbpConn,
  lead: { firstName: string; lastName: string; message: string; quoteId: string; serviceType: string }
) {
  try {
    const { rows } = await pool.query(`SELECT email FROM users WHERE id = $1`, [conn.userId]);
    const userEmail = rows[0]?.email;
    if (!userEmail || userEmail.includes("@privaterelay.appleid.com")) return;

    const quoteUrl = `https://app.getquotepro.ai/quotes/${lead.quoteId}`;
    const name = [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "A customer";

    await sendEmail({
      to: userEmail,
      subject: "New lead from Google — quote ready to send",
      html: `<p>Hi,</p>
<p><strong>${name}</strong> submitted a lead through your Google Business Profile.</p>
${lead.message ? `<blockquote style="border-left:3px solid #ccc;padding:8px 12px;margin:12px 0;color:#555;">${lead.message}</blockquote>` : ""}
<p>A draft quote has been created and pre-populated with their details. Send it before a competitor does.</p>
<p><a href="${quoteUrl}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:white;border-radius:6px;text-decoration:none;font-weight:600;">View Quote Draft →</a></p>
<p style="color:#888;font-size:12px;">Source: ${conn.locationName ?? "Google Business Profile"}</p>`,
      fromEmail: PLATFORM_FROM_EMAIL,
      fromName: PLATFORM_FROM_NAME,
      replyTo: null,
    });
  } catch (e: any) {
    console.error(`${LOG} notifyOperator error:`, e.message);
  }
}

// ── Poll a Single Account ─────────────────────────────────────────────────────
async function pollAccount(conn: GbpConn) {
  const token = await ensureFreshToken(conn);
  if (!token) return;

  if (!conn.accountId || !conn.locationId) {
    console.warn(`${LOG} [user:${conn.userId}] no account/location ID — skipping`);
    return;
  }

  const [reviews, questions] = await Promise.all([
    fetchReviews(token, conn.accountId, conn.locationId),
    fetchQuestions(token, conn.accountId, conn.locationId),
  ]);

  for (const review of reviews) {
    const id = review.reviewId ?? review.name;
    if (!id) continue;
    // Only process reviews that have a comment (i.e. customer said something)
    if (!review.comment) continue;
    await processLead(conn, `review:${id}`, review).catch((e) =>
      console.error(`${LOG} processLead error (review):`, e.message)
    );
  }

  for (const q of questions) {
    const id = q.name ?? q.questionId;
    if (!id) continue;
    await processLead(conn, `question:${id}`, q).catch((e) =>
      console.error(`${LOG} processLead error (question):`, e.message)
    );
  }

  // Update last synced timestamp
  await pool.query(
    `UPDATE gbp_connections SET last_synced_at = NOW() WHERE user_id = $1`,
    [conn.userId]
  );
}

// ── Main Poll Job ─────────────────────────────────────────────────────────────
async function runGbpPoll() {
  try {
    const { rows } = await pool.query<GbpConn>(
      `SELECT user_id AS "userId", access_token AS "accessToken",
              refresh_token AS "refreshToken", expires_at AS "expiresAt",
              account_id AS "accountId", location_id AS "locationId",
              location_name AS "locationName"
       FROM gbp_connections
       WHERE access_token != ''`
    );
    if (rows.length === 0) return;
    console.log(`${LOG} polling ${rows.length} connected account(s)`);
    await Promise.allSettled(rows.map(pollAccount));
  } catch (e: any) {
    console.error(`${LOG} poll run error:`, e.message);
  }
}

// ── Init Table & Schedule ─────────────────────────────────────────────────────
export async function initGbpPoller() {
  try {
    // Create tables if not yet migrated (safe to call repeatedly)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS gbp_connections (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id varchar NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        access_token text NOT NULL DEFAULT '',
        refresh_token text,
        expires_at timestamptz,
        account_id varchar,
        location_id varchar,
        location_name varchar,
        connected_at timestamptz DEFAULT NOW(),
        last_synced_at timestamptz
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS gbp_leads (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        google_lead_id varchar(512) NOT NULL,
        raw_data jsonb,
        processed_at timestamptz DEFAULT NOW(),
        quote_id varchar
      )
    `);
    // Add source column to quotes if it doesn't exist yet
    await pool.query(`
      ALTER TABLE quotes ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual'
    `);

    cron.schedule("*/5 * * * *", () => {
      runGbpPoll().catch((e) => console.error(`${LOG} uncaught:`, e.message));
    });
    console.log(`${LOG} Cron scheduled (every 5 min)`);
  } catch (e: any) {
    console.error(`${LOG} init error:`, e.message);
  }
}
