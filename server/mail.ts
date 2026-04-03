/**
 * Centralized mail service for QuotePro.
 *
 * All outbound email sends from the platform address (quote@getquotepro.ai)
 * via Zoho SMTP. The tenant's company name appears as the sender display
 * name; their business email is set as Reply-To so customer replies land
 * in their inbox.
 *
 * Required environment variables:
 *   ZOHO_SMTP_USER  – platform sending address (e.g. quote@getquotepro.ai)
 *   ZOHO_SMTP_PASS  – Zoho account password or app-specific password
 *
 * Optional:
 *   ZOHO_SMTP_HOST  – defaults to smtp.zoho.com
 *   ZOHO_SMTP_PORT  – defaults to 587 (STARTTLS); use 465 for SSL
 */
import nodemailer from "nodemailer";

export const PLATFORM_FROM_EMAIL =
  process.env.ZOHO_SMTP_USER || "quote@getquotepro.ai";

export const PLATFORM_FROM_NAME = "QuotePro";

export const MIKE_EMAIL = "mike@getquotepro.ai";

export interface MailAttachment {
  filename: string;
  content: Buffer | string; // Buffer OR a base64-encoded string
  contentType?: string;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  fromName?: string;
  fromEmail?: string; // optional override of the SMTP from address
  replyTo?: string | null;
  cc?: string | string[];
  attachments?: MailAttachment[];
}

/** Returns the display name and reply-to address to use for a business tenant. */
export function getBusinessSendParams(business: any): {
  fromName: string;
  replyTo: string | null;
} {
  return {
    fromName: business?.companyName || PLATFORM_FROM_NAME,
    replyTo: business?.email || null,
  };
}

let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (_transporter) return _transporter;

  const host = process.env.ZOHO_SMTP_HOST || "smtp.zoho.com";
  const port = parseInt(process.env.ZOHO_SMTP_PORT || "587", 10);
  const user = process.env.ZOHO_SMTP_USER;
  const pass = process.env.ZOHO_SMTP_PASS;

  if (!user || !pass) {
    throw new Error(
      "ZOHO_SMTP_USER and ZOHO_SMTP_PASS must be set to enable email delivery."
    );
  }

  _transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true = SSL, false = STARTTLS
    auth: { user, pass },
  });

  return _transporter;
}

/**
 * Send an email through the platform Zoho SMTP account.
 * Throws on delivery failure — callers catch and return appropriate responses.
 */
export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  const { to, subject, html, text, fromName, fromEmail, replyTo, cc, attachments } = opts;
  const displayName = fromName || PLATFORM_FROM_NAME;
  const senderAddress = fromEmail || PLATFORM_FROM_EMAIL;

  const mailOpts: nodemailer.SendMailOptions = {
    from: `"${displayName}" <${senderAddress}>`,
    to: Array.isArray(to) ? to.join(", ") : to,
    subject,
    html,
    text: text || "",
  };

  if (replyTo) mailOpts.replyTo = replyTo;

  if (cc) {
    mailOpts.cc = Array.isArray(cc) ? cc.join(", ") : cc;
  }

  if (attachments && attachments.length > 0) {
    mailOpts.attachments = attachments.map((a) => ({
      filename: a.filename,
      content:
        typeof a.content === "string"
          ? Buffer.from(a.content, "base64")
          : a.content,
      contentType: a.contentType,
    }));
  }

  await getTransporter().sendMail(mailOpts);
}

// ─── Welcome email ────────────────────────────────────────────────────────────

const CALENDLY_LINK = "https://calendly.com/mike-getquotepro/30min";

function buildWelcomeEmailHtml(name: string | null): string {
  const firstName = name?.split(" ")[0] || "there";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Welcome to QuotePro</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f5f9;">
<tr><td align="center" style="padding:40px 16px 60px;">

  <table width="580" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;width:100%;">

    <!-- Header -->
    <tr>
      <td style="background-color:#1e3a8a;background:linear-gradient(135deg,#0f172a 0%,#1e3a8a 55%,#2563eb 100%);border-radius:16px 16px 0 0;padding:36px 40px 32px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td>
              <div style="display:inline-block;background-color:#334d88;border:1px solid #4a6ab5;border-radius:100px;padding:5px 14px;font-size:11px;font-weight:700;color:#c7ddff;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:16px;">
                Welcome to QuotePro
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:10px;">
              <h1 style="font-size:26px;font-weight:800;color:#ffffff;margin:0;line-height:1.2;">Hey ${firstName}, you're in!</h1>
            </td>
          </tr>
          <tr>
            <td>
              <p style="font-size:15px;color:#c7ddff;margin:0;line-height:1.6;">Thanks for signing up. QuotePro is built to help your cleaning business win more jobs and run smoother &mdash; starting today.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="background-color:#ffffff;padding:36px 40px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">

        <!-- Section label -->
        <p style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 20px;">Here&rsquo;s what you can do right now</p>

        <!-- Benefit 1 -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
          <tr>
            <td width="52" valign="top" style="padding-right:16px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="40" height="40" align="center" valign="middle" style="background-color:#dbeafe;border-radius:10px;width:40px;height:40px;">
                    <img src="https://img.icons8.com/ios/40/2563eb/contract.png" width="20" height="20" alt="" style="display:block;border:0;" />
                  </td>
                </tr>
              </table>
            </td>
            <td valign="top">
              <p style="font-size:15px;font-weight:700;color:#0f172a;margin:0 0 4px;">Fast, professional quotes</p>
              <p style="font-size:14px;color:#64748b;margin:0;line-height:1.6;">Create a branded residential or commercial quote in under 60 seconds &mdash; right from your phone or browser. No more back-and-forth guessing on price.</p>
            </td>
          </tr>
        </table>

        <!-- Benefit 2 -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
          <tr>
            <td width="52" valign="top" style="padding-right:16px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="40" height="40" align="center" valign="middle" style="background-color:#dcfce7;border-radius:10px;width:40px;height:40px;">
                    <img src="https://img.icons8.com/ios/40/16a34a/conference-call.png" width="20" height="20" alt="" style="display:block;border:0;" />
                  </td>
                </tr>
              </table>
            </td>
            <td valign="top">
              <p style="font-size:15px;font-weight:700;color:#0f172a;margin:0 0 4px;">Capture leads from your website</p>
              <p style="font-size:14px;color:#64748b;margin:0;line-height:1.6;">Embed a QuotePro lead capture form on your website. Visitors fill it out, and new leads land directly in your dashboard &mdash; ready to quote.</p>
            </td>
          </tr>
        </table>

        <!-- Benefit 3 -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
          <tr>
            <td width="52" valign="top" style="padding-right:16px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="40" height="40" align="center" valign="middle" style="background-color:#ede9fe;border-radius:10px;width:40px;height:40px;">
                    <img src="https://img.icons8.com/ios/40/7c3aed/calendar.png" width="20" height="20" alt="" style="display:block;border:0;" />
                  </td>
                </tr>
              </table>
            </td>
            <td valign="top">
              <p style="font-size:15px;font-weight:700;color:#0f172a;margin:0 0 4px;">Customer-facing appointment managing</p>
              <p style="font-size:14px;color:#64748b;margin:0;line-height:1.6;">Your customers get their own portal to view quotes, accept bookings, and track upcoming appointments &mdash; reducing back-and-forth calls and no-shows.</p>
            </td>
          </tr>
        </table>

        <!-- Divider -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
          <tr><td style="border-top:1px solid #f1f5f9;font-size:0;line-height:0;">&nbsp;</td></tr>
        </table>

        <!-- Calendly CTA box -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0fdf4;border:2px solid #86efac;border-radius:14px;">
          <tr>
            <td align="center" style="padding:28px 28px 8px;">
              <p style="font-size:17px;font-weight:800;color:#14532d;margin:0 0 8px;">Book a free 30-min onboarding call</p>
              <p style="font-size:14px;color:#15803d;margin:0 0 20px;line-height:1.6;">I'll walk you through everything and make sure you're set up to win.<br>No charge, no pitch &mdash; just a quick hands-on session with me.</p>
              <a href="${CALENDLY_LINK}" style="display:inline-block;background-color:#16a34a;color:#ffffff;font-weight:800;font-size:15px;padding:14px 36px;border-radius:10px;text-decoration:none;">
                Pick a Time &mdash; It's Free
              </a>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:12px 28px 24px;">
              <p style="font-size:12px;color:#4ade80;margin:0;">30 minutes &middot; Zoom or phone &middot; No prep needed</p>
            </td>
          </tr>
        </table>

      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td align="center" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;padding:24px 40px;">
        <p style="font-size:14px;color:#374151;margin:0 0 4px;font-weight:600;">Mike &mdash; Founder, QuotePro</p>
        <p style="font-size:13px;color:#94a3b8;margin:0 0 16px;">Reply to this email anytime. I read every message.</p>
        <p style="font-size:12px;color:#cbd5e1;margin:0;">
          <a href="https://app.getquotepro.ai" style="color:#94a3b8;text-decoration:none;">app.getquotepro.ai</a>
          &nbsp;&middot;&nbsp;
          <a href="https://app.getquotepro.ai/settings" style="color:#94a3b8;text-decoration:none;">Manage preferences</a>
        </p>
      </td>
    </tr>

  </table>

</td></tr>
</table>

</body>
</html>`;
}

/**
 * Send a welcome email to a newly signed-up user.
 * Fire-and-forget — never throws. Log errors only.
 */
export function sendWelcomeEmail(email: string, name: string | null): void {
  sendEmail({
    to: email,
    subject: "Welcome to QuotePro — let's get you set up",
    html: buildWelcomeEmailHtml(name),
    fromName: "Mike from QuotePro",
    replyTo: MIKE_EMAIL,
  }).catch((err) => {
    console.error("[welcome-email] failed to send to", email, "—", err?.message || err);
  });
}
