/**
 * Centralized mail service for QuotePro.
 *
 * All outbound email sends via SendGrid HTTP API from the verified sender
 * mike@getquotepro.ai. The tenant's company name appears as the sender
 * display name; their business email is set as Reply-To so customer replies
 * land in their inbox.
 *
 * Required environment variables:
 *   SENDGRID_API_KEY – SendGrid API key with Mail Send permission
 */

export const PLATFORM_FROM_EMAIL = "mike@getquotepro.ai";
export const PLATFORM_FROM_NAME  = "QuotePro";
export const MIKE_EMAIL          = "mike@getquotepro.ai";

const SENDGRID_SEND_URL = "https://api.sendgrid.com/v3/mail/send";

export interface MailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  fromName?: string;
  fromEmail?: string;
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

/**
 * Send an email through SendGrid.
 * Throws on delivery failure — callers catch and return appropriate responses.
 */
export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  const key = process.env.SENDGRID_API_KEY;
  if (!key) {
    throw new Error("SENDGRID_API_KEY must be set to enable email delivery.");
  }

  const { to, subject, html, text, fromName, fromEmail, replyTo, cc, attachments } = opts;

  const toList = (Array.isArray(to) ? to : [to]).map((e) => ({ email: e }));
  const ccList = cc ? (Array.isArray(cc) ? cc : [cc]).map((e) => ({ email: e })) : undefined;

  const body: Record<string, any> = {
    personalizations: [{ to: toList, ...(ccList ? { cc: ccList } : {}) }],
    from: {
      email: fromEmail || PLATFORM_FROM_EMAIL,
      name:  fromName  || PLATFORM_FROM_NAME,
    },
    subject,
    content: [{ type: "text/html", value: html }],
  };

  if (text) {
    body.content.unshift({ type: "text/plain", value: text });
  }

  if (replyTo) {
    body.reply_to = { email: replyTo };
  }

  if (attachments && attachments.length > 0) {
    body.attachments = attachments.map((a) => ({
      filename: a.filename,
      type: a.contentType || "application/octet-stream",
      content: typeof a.content === "string"
        ? a.content
        : a.content.toString("base64"),
      disposition: "attachment",
    }));
  }

  const resp = await fetch(SENDGRID_SEND_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (resp.status !== 202) {
    const errText = await resp.text().catch(() => "");
    throw new Error(`SendGrid error ${resp.status}: ${errText.substring(0, 200)}`);
  }
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
              <div style="display:inline-block;background-color:#334d88;border:1px solid #4a6ab5;border-radius:100px;padding:5px 14px;font-size:11px;font-weight:700;color:#00cfff;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:16px;">
                <span style="color:#00cfff;">Welcome to QuotePro</span>
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

        <!-- Calendly CTA -->
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
 * Send Mike a notification whenever a new trial user signs up.
 * Fire-and-forget — never throws.
 */
export function sendSignupNotification(
  userEmail: string,
  userName: string | null | undefined,
  authProvider: "email" | "apple" | "google",
): void {
  const providerLabel =
    authProvider === "apple"  ? "Apple Sign-In" :
    authProvider === "google" ? "Google" :
    "Email / Password";

  const platformLabel =
    authProvider === "apple"  ? "iOS" :
    authProvider === "google" ? "Web / iOS" :
    "Web";

  const displayName = userName || "(no name)";
  const now = new Date().toLocaleString("en-US", {
    timeZone: "America/New_York",
    dateStyle: "medium",
    timeStyle: "short",
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>New QuotePro Signup</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f5f9;">
<tr><td align="center" style="padding:40px 16px;">
  <table width="520" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;width:100%;">
    <tr>
      <td style="background:linear-gradient(135deg,#0f172a 0%,#1e3a8a 55%,#2563eb 100%);border-radius:14px 14px 0 0;padding:28px 32px;">
        <p style="font-size:11px;font-weight:700;color:#00cfff;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 8px;">New Trial Signup</p>
        <h1 style="font-size:22px;font-weight:800;color:#ffffff;margin:0;line-height:1.2;">You have a new user!</h1>
      </td>
    </tr>
    <tr>
      <td style="background:#ffffff;padding:28px 32px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;">
              <span style="font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">Name</span><br>
              <span style="font-size:16px;font-weight:700;color:#0f172a;">${displayName}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;">
              <span style="font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">Email</span><br>
              <span style="font-size:16px;color:#0f172a;">${userEmail}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;">
              <span style="font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">Sign-up Method</span><br>
              <span style="font-size:16px;color:#0f172a;">${providerLabel}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;">
              <span style="font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">Platform</span><br>
              <span style="font-size:16px;color:#0f172a;">${platformLabel}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 0;">
              <span style="font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">Time (ET)</span><br>
              <span style="font-size:16px;color:#0f172a;">${now}</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 14px 14px;padding:16px 32px;text-align:center;">
        <p style="font-size:12px;color:#94a3b8;margin:0;">QuotePro &mdash; app.getquotepro.ai</p>
      </td>
    </tr>
  </table>
</td></tr>
</table>
</body>
</html>`;

  sendEmail({
    to: MIKE_EMAIL,
    subject: `New signup: ${displayName} (${userEmail})`,
    html,
    fromName: "QuotePro Alerts",
    replyTo: null,
  }).catch((err) => {
    console.error("[signup-notification] failed —", err?.message || err);
  });
}

/**
 * Send a welcome email to a newly signed-up user.
 * Fire-and-forget — never throws. Logs errors only.
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
