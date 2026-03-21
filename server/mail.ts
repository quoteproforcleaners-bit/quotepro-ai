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
  const { to, subject, html, text, fromName, replyTo, cc, attachments } = opts;
  const displayName = fromName || PLATFORM_FROM_NAME;

  const mailOpts: nodemailer.SendMailOptions = {
    from: `"${displayName}" <${PLATFORM_FROM_EMAIL}>`,
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
