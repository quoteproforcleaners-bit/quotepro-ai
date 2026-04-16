/**
 * server/onboardingNudge.ts
 *
 * Daily 9am UTC cron: find non-free users who signed up > 72h ago and have
 * never sent a quote. Send one nudge email and set onboarding_nudge_sent = true
 * so we never email them again.
 */

import { pool } from "./db";
import { sendEmail, PLATFORM_FROM_EMAIL, PLATFORM_FROM_NAME } from "./mail";
import { trackEvent } from "./analytics";
import { AnalyticsEvents } from "../shared/analytics-events";

const BASE_APP_URL = process.env.APP_URL || "https://app.getquotepro.ai/app";

function getFirstName(name: string | null, email: string): string {
  if (name) {
    const first = name.trim().split(/\s+/)[0];
    if (first && first.length > 0) return first;
  }
  return email.split("@")[0];
}

function buildNudgeHtml(firstName: string, ctaUrl: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;">
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 20px;font-size:22px;font-weight:700;color:#111827;">
                Send your first quote in under 2 minutes
              </p>
              <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">
                Hey ${firstName},
              </p>
              <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">
                You signed up for QuotePro AI a few days ago but haven't sent a quote yet. We just want to make sure you're not stuck.
              </p>
              <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">
                Here's how the quote builder works:
              </p>
              <ol style="margin:0 0 20px;padding-left:20px;font-size:15px;color:#374151;line-height:1.9;">
                <li>Enter your customer's home details (bedrooms, bathrooms, square footage)</li>
                <li>QuotePro AI prices it automatically based on your market</li>
                <li>Hit send — your customer gets a professional quote they can accept with one tap</li>
              </ol>
              <p style="margin:0 0 28px;font-size:15px;color:#374151;line-height:1.7;">
                That's it. The whole thing takes under 2 minutes, and the quote looks more professional than anything you'd make by hand.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:32px;">
                <tr>
                  <td align="center">
                    <a href="${ctaUrl}"
                       style="display:inline-block;padding:15px 36px;background:#4f46e5;color:#ffffff;font-weight:700;font-size:15px;border-radius:10px;text-decoration:none;letter-spacing:0.01em;">
                      Build My First Quote &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.6;">
                &mdash; Mike<br/>
                <span style="font-size:13px;">QuotePro AI</span>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function processOnboardingNudges(): Promise<void> {
  const ctaUrl = `${BASE_APP_URL}/quotes/new`;

  const result = await pool.query<{
    id: number;
    email: string;
    contact_email: string | null;
    name: string | null;
    created_at: Date;
  }>(`
    SELECT id, email, contact_email, name, created_at
    FROM users
    WHERE first_quote_sent_at IS NULL
      AND onboarding_nudge_sent = false
      AND subscription_tier != 'free'
      AND created_at < NOW() - INTERVAL '72 hours'
      AND (email_unreachable IS NULL OR email_unreachable = false)
      AND (trial_drip_unsubscribed IS NULL OR trial_drip_unsubscribed = false)
  `);

  if (result.rows.length === 0) return;

  console.log(`[onboarding-nudge] ${result.rows.length} user(s) eligible for nudge`);
  let sent = 0;

  for (const user of result.rows) {
    const firstName = getFirstName(user.name, user.email);
    const toEmail = user.contact_email || user.email;

    try {
      await sendEmail({
        to: toEmail,
        subject: "Quick tip: send your first quote in under 2 minutes",
        html: buildNudgeHtml(firstName, ctaUrl),
        text: `Hey ${firstName},\n\nYou signed up for QuotePro AI but haven't sent a quote yet. Here's how quick it is: enter your customer's home details, let AI price it for you, and hit send. Under 2 minutes.\n\nBuild your first quote here: ${ctaUrl}\n\n— Mike\nQuotePro AI`,
        fromName: "Mike at QuotePro",
        replyTo: PLATFORM_FROM_EMAIL,
      });

      await pool.query(
        "UPDATE users SET onboarding_nudge_sent = true WHERE id = $1",
        [user.id]
      );

      trackEvent(user.id, AnalyticsEvents.ONBOARDING_STALLED_72H, {}).catch(() => {});
      sent++;
    } catch (err: any) {
      console.error(`[onboarding-nudge] Failed for user ${user.id}:`, err.message);
    }
  }

  console.log(`[onboarding-nudge] Sent ${sent} nudge email(s)`);
}
