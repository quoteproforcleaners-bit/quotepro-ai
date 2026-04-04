/**
 * server/quoteFollowUpScheduler.ts
 *
 * Automatic follow-up emails sent to customers for quotes that have
 * been in "sent" status for ≥ 3 days with no customer response.
 *
 * Logic:
 * - Runs daily
 * - Finds quotes where: status = 'sent' AND sent_at < NOW() - 3 days
 * - Skips any quote that already has a follow-up logged in quote_follow_ups
 * - Sends a personalized "Just checking in" email to the customer
 * - Logs the follow-up in quote_follow_ups (status = 'sent')
 * - Caps at 1 auto follow-up per quote (humans can send more via the UI)
 */

import { pool } from "./db";
import { sendEmail, getBusinessSendParams } from "./mail";

const APP_BASE_URL = process.env.PUBLIC_APP_URL || "https://app.getquotepro.ai";

interface PendingFollowUp {
  quoteId: string;
  businessId: string;
  customerName: string;
  customerEmail: string | null;
  total: number;
  publicToken: string | null;
  companyName: string | null;
  ownerEmail: string;
  ownerName: string | null;
  replyTo: string | null;
  sentAt: Date;
}

export async function processSentQuoteFollowUps(): Promise<void> {
  // 1. Find all quotes that are ripe for a follow-up
  const pendingResult = await pool.query<PendingFollowUp>(`
    SELECT
      q.id          AS "quoteId",
      q.business_id AS "businessId",
      q.customer_name AS "customerName",
      c.email       AS "customerEmail",
      q.total,
      q.public_token AS "publicToken",
      b.company_name AS "companyName",
      u.email       AS "ownerEmail",
      u.name        AS "ownerName",
      b.reply_to_email AS "replyTo",
      q.sent_at     AS "sentAt"
    FROM quotes q
    JOIN businesses b ON b.id = q.business_id
    JOIN users u ON u.id = b.owner_user_id
    LEFT JOIN customers c ON c.id = q.customer_id
    WHERE q.status = 'sent'
      AND q.sent_at IS NOT NULL
      AND q.sent_at < NOW() - INTERVAL '3 days'
      AND c.email IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM quote_follow_ups qf
        WHERE qf.quote_id = q.id
          AND qf.status = 'sent'
      )
    LIMIT 50
  `);

  const rows = pendingResult.rows;

  if (rows.length === 0) {
    console.log("[quote-followup] No pending follow-ups to send.");
    return;
  }

  console.log(`[quote-followup] Sending ${rows.length} follow-up email(s)…`);

  let sent = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const quoteLink = row.publicToken
        ? `${APP_BASE_URL}/q/${row.publicToken}`
        : null;

      const firstName = (row.customerName || "").split(" ")[0] || "there";
      const company = row.companyName || "us";
      const total = Number(row.total || 0).toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      });

      const subject = `Quick check-in on your cleaning quote`;
      const html = `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
          <p style="font-size: 16px;">Hi ${firstName},</p>
          <p style="font-size: 16px; line-height: 1.6;">
            I wanted to follow up on the cleaning quote we sent you a few days ago
            (${total}). We'd love to get you scheduled and take cleaning off your plate
            completely.
          </p>
          <p style="font-size: 16px; line-height: 1.6;">
            If you have any questions about what's included, pricing, or scheduling,
            just reply to this email — I'm happy to help.
          </p>
          ${quoteLink ? `
          <div style="margin: 28px 0; text-align: center;">
            <a href="${quoteLink}"
               style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #2563eb, #4f46e5);
                      color: #fff; font-weight: 700; border-radius: 10px; text-decoration: none; font-size: 15px;">
              View Your Quote
            </a>
          </div>
          ` : ""}
          <p style="font-size: 15px; color: #64748b;">
            Looking forward to hearing from you,<br/>
            <strong>${row.ownerName || company}</strong><br/>
            <span style="font-size: 13px;">${company}</span>
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;"/>
          <p style="font-size: 12px; color: #94a3b8;">
            You're receiving this because a quote was sent to this email address.
            Reply to this email to unsubscribe from future follow-ups.
          </p>
        </div>
      `;

      await sendEmail({
        to: row.customerEmail!,
        subject,
        html,
        fromEmail: row.ownerEmail,
        fromName: row.ownerName || row.companyName || "QuotePro",
        replyTo: row.replyTo || row.ownerEmail,
      });

      // Log the follow-up so we don't send again
      await pool.query(
        `INSERT INTO quote_follow_ups (quote_id, business_id, scheduled_for, channel, message, status, sent_at)
         VALUES ($1, $2, NOW(), 'email', $3, 'sent', NOW())`,
        [row.quoteId, row.businessId, subject]
      );

      sent++;
    } catch (err: any) {
      console.error(`[quote-followup] Failed for quote ${row.quoteId}:`, err.message);
      failed++;
    }
  }

  console.log(`[quote-followup] Done — sent: ${sent}, failed: ${failed}`);
}
