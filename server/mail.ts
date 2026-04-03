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
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,'Inter','Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:580px;margin:40px auto;padding:0 16px 60px;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0f172a 0%,#1e3a8a 55%,#2563eb 100%);border-radius:20px 20px 0 0;padding:36px 40px 32px;position:relative;overflow:hidden;">
      <div style="position:absolute;inset:0;opacity:0.05;background-image:radial-gradient(circle,white 1px,transparent 1px);background-size:22px 22px;"></div>
      <div style="position:relative;">
        <div style="display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);border-radius:100px;padding:4px 14px;font-size:11px;font-weight:700;color:rgba(255,255,255,0.9);letter-spacing:0.05em;text-transform:uppercase;margin-bottom:16px;">
          Welcome to QuotePro
        </div>
        <h1 style="font-size:26px;font-weight:800;color:#fff;margin:0 0 10px;line-height:1.2;">
          Hey ${firstName}, you're in!
        </h1>
        <p style="font-size:15px;color:rgba(186,213,253,0.9);margin:0;line-height:1.6;">
          Thanks for signing up. QuotePro is built to help your cleaning business win more jobs and run smoother — starting today.
        </p>
      </div>
    </div>

    <!-- Body -->
    <div style="background:#fff;padding:36px 40px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">

      <!-- Benefits -->
      <p style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 16px;">Here's what you can do right now</p>

      <!-- Benefit 1 -->
      <div style="display:flex;gap:16px;margin-bottom:20px;align-items:flex-start;">
        <div style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#dbeafe,#bfdbfe);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <svg width="18" height="18" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13,2 13,9 20,9"/></svg>
        </div>
        <div>
          <p style="font-size:15px;font-weight:700;color:#0f172a;margin:0 0 4px;">Fast, professional quotes</p>
          <p style="font-size:14px;color:#64748b;margin:0;line-height:1.6;">Create a branded residential or commercial quote in under 60 seconds — right from your phone or browser. No more back-and-forth guessing on price.</p>
        </div>
      </div>

      <!-- Benefit 2 -->
      <div style="display:flex;gap:16px;margin-bottom:20px;align-items:flex-start;">
        <div style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#dcfce7,#bbf7d0);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <svg width="18" height="18" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
        <div>
          <p style="font-size:15px;font-weight:700;color:#0f172a;margin:0 0 4px;">Capture leads from your website</p>
          <p style="font-size:14px;color:#64748b;margin:0;line-height:1.6;">Embed a QuotePro lead capture form on your website. Visitors fill it out, and new leads land directly in your dashboard — ready to quote.</p>
        </div>
      </div>

      <!-- Benefit 3 -->
      <div style="display:flex;gap:16px;margin-bottom:32px;align-items:flex-start;">
        <div style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#ede9fe,#ddd6fe);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <svg width="18" height="18" fill="none" stroke="#7c3aed" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        </div>
        <div>
          <p style="font-size:15px;font-weight:700;color:#0f172a;margin:0 0 4px;">Customer-facing appointment managing</p>
          <p style="font-size:14px;color:#64748b;margin:0;line-height:1.6;">Your customers get their own portal to view quotes, accept bookings, and track upcoming appointments — reducing back-and-forth calls and no-shows.</p>
        </div>
      </div>

      <hr style="border:none;border-top:1px solid #f1f5f9;margin:0 0 28px;">

      <!-- Calendly CTA -->
      <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1.5px solid #86efac;border-radius:16px;padding:24px 28px;text-align:center;">
        <p style="font-size:16px;font-weight:800;color:#14532d;margin:0 0 8px;">Book a free 30-min onboarding call</p>
        <p style="font-size:14px;color:#15803d;margin:0 0 20px;line-height:1.6;">I'll walk you through everything and make sure you're set up to win. No charge, no pitch — just a quick hands-on session with me.</p>
        <a href="${CALENDLY_LINK}" style="display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#16a34a,#059669);color:#fff;font-weight:800;font-size:15px;padding:14px 32px;border-radius:12px;text-decoration:none;box-shadow:0 4px 16px rgba(22,163,74,0.35);">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Pick a Time — It's Free
        </a>
        <p style="font-size:12px;color:#4ade80;margin:12px 0 0;">30 minutes · Zoom or phone · No prep needed</p>
      </div>

    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 20px 20px;padding:24px 40px;text-align:center;">
      <p style="font-size:14px;color:#374151;margin:0 0 4px;font-weight:600;">Mike — Founder, QuotePro</p>
      <p style="font-size:13px;color:#94a3b8;margin:0;">Reply to this email anytime. I read every message.</p>
      <p style="font-size:12px;color:#cbd5e1;margin:16px 0 0;">
        <a href="https://app.getquotepro.ai" style="color:#94a3b8;text-decoration:none;">app.getquotepro.ai</a>
        &nbsp;·&nbsp;
        <a href="https://app.getquotepro.ai/settings" style="color:#94a3b8;text-decoration:none;">Manage preferences</a>
      </p>
    </div>

  </div>
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
