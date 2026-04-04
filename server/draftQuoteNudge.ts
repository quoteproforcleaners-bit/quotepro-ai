/**
 * server/draftQuoteNudge.ts
 *
 * Weekly email to business owners who have draft quotes sitting
 * more than 2 days old that haven't been sent to any customer.
 *
 * Logic:
 * - Runs every Monday at 7am
 * - Groups draft quotes (> 2 days old) by business owner
 * - Sends a single summary email per owner: "You have X unsent quotes"
 * - Skips owners who were notified within the last 7 days
 *   (tracked via communications table with template_key 'draft_nudge')
 */

import { pool } from "./db";
import { sendEmail, PLATFORM_FROM_EMAIL, PLATFORM_FROM_NAME } from "./mail";

const APP_BASE_URL = process.env.PUBLIC_APP_URL || "https://app.getquotepro.ai";

interface DraftOwner {
  ownerUserId: string;
  ownerEmail: string;
  ownerName: string | null;
  businessId: string;
  companyName: string | null;
  draftCount: number;
  totalValue: number;
  oldestDraftDays: number;
}

export async function processDraftQuoteNudges(): Promise<void> {
  // 1. Find owners who have old draft quotes and haven't been nudged recently
  const result = await pool.query<DraftOwner>(`
    SELECT
      u.id           AS "ownerUserId",
      u.email        AS "ownerEmail",
      u.name         AS "ownerName",
      b.id           AS "businessId",
      b.company_name AS "companyName",
      COUNT(q.id)::int           AS "draftCount",
      COALESCE(SUM(q.total), 0)  AS "totalValue",
      MAX(EXTRACT(DAY FROM NOW() - q.created_at))::int AS "oldestDraftDays"
    FROM quotes q
    JOIN businesses b ON b.id = q.business_id
    JOIN users u ON u.id = b.owner_user_id
    WHERE q.status = 'draft'
      AND q.created_at < NOW() - INTERVAL '2 days'
      AND NOT EXISTS (
        SELECT 1 FROM communications c
        WHERE c.business_id = b.id
          AND c.template_key = 'draft_nudge'
          AND c.sent_at > NOW() - INTERVAL '7 days'
      )
    GROUP BY u.id, u.email, u.name, b.id, b.company_name
    HAVING COUNT(q.id) > 0
    ORDER BY "draftCount" DESC
    LIMIT 100
  `);

  const rows = result.rows;

  if (rows.length === 0) {
    console.log("[draft-nudge] No owners to nudge today.");
    return;
  }

  console.log(`[draft-nudge] Nudging ${rows.length} owner(s) about draft quotes…`);

  let sent = 0;
  let failed = 0;

  for (const owner of rows) {
    try {
      const firstName = (owner.ownerName || owner.ownerEmail).split(/[\s@]/)[0] || "there";
      const company = owner.companyName || "your business";
      const totalValue = Number(owner.totalValue).toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      });
      const n = owner.draftCount;
      const days = owner.oldestDraftDays;

      const subject = `You have ${n} unsent quote${n !== 1 ? "s" : ""} waiting`;

      const html = `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
          <p style="font-size: 16px;">Hey ${firstName},</p>
          <p style="font-size: 16px; line-height: 1.6;">
            You have <strong>${n} draft quote${n !== 1 ? "s" : ""}</strong> sitting in
            QuotePro that ${n === 1 ? "hasn't" : "haven't"} been sent to any customer yet
            — the oldest is <strong>${days} day${days !== 1 ? "s" : ""} old</strong>.
          </p>
          <p style="font-size: 16px; line-height: 1.6;">
            Combined they're worth up to <strong>${totalValue}</strong> in potential revenue.
            Sending a quote takes about 30 seconds — let's get that money moving.
          </p>
          <div style="margin: 28px 0; text-align: center;">
            <a href="${APP_BASE_URL}/quotes?filter=draft"
               style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #2563eb, #4f46e5);
                      color: #fff; font-weight: 700; border-radius: 10px; text-decoration: none; font-size: 15px;">
              Review &amp; Send Your Quotes
            </a>
          </div>
          <p style="font-size: 14px; color: #64748b; line-height: 1.6;">
            <strong>Pro tip:</strong> Use QuoteDoctor to make sure your pricing is
            competitive before hitting send —
            <a href="${APP_BASE_URL}/quote-doctor" style="color: #2563eb;">open QuoteDoctor</a>.
          </p>
          <p style="font-size: 15px; color: #64748b;">
            — Mike at QuotePro
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;"/>
          <p style="font-size: 12px; color: #94a3b8;">
            You're receiving this because you have an active QuotePro account for ${company}.
            <a href="${APP_BASE_URL}/settings" style="color: #94a3b8;">Manage notifications</a>
          </p>
        </div>
      `;

      await sendEmail({
        to: owner.ownerEmail,
        subject,
        html,
        fromEmail: PLATFORM_FROM_EMAIL,
        fromName: PLATFORM_FROM_NAME,
      });

      // Log so we don't nudge the same owner within 7 days
      await pool.query(
        `INSERT INTO communications
           (business_id, channel, direction, template_key, content, status, sent_at)
         VALUES ($1, 'email', 'outbound', 'draft_nudge', $2, 'sent', NOW())`,
        [owner.businessId, subject]
      );

      sent++;
    } catch (err: any) {
      console.error(`[draft-nudge] Failed for owner ${owner.ownerUserId}:`, err.message);
      failed++;
    }
  }

  console.log(`[draft-nudge] Done — sent: ${sent}, failed: ${failed}`);
}
