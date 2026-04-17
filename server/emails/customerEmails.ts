/**
 * Builders for customer-facing transactional emails.
 *
 * Extracted from quotesRouter and publicRouter so the rendered email bodies
 * can be unit-tested in isolation. Each builder returns the HTML body, and
 * (where applicable) a plain-text alternative, exactly as they will be passed
 * to sendEmail().
 *
 * All three builders include a spam-folder hint so customers who don't see
 * the message in their inbox know to look in spam/junk. The hint string is
 * exported as SPAM_FOLDER_HINT_TEXT so tests and other call sites can keep
 * the wording consistent.
 */

export const SPAM_FOLDER_HINT_TEXT =
  "Don't see this email next time? Check your spam or junk folder and mark it as not spam.";

export function spamFolderHintHtml(color: string = "#94A3B8"): string {
  return `<p style="margin:12px 0 0;font-size:12px;color:${color};line-height:1.5;text-align:center;">${SPAM_FOLDER_HINT_TEXT}</p>`;
}

const escHtml = (v: any) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// ─── /api/quotes/:id/send-with-pdf ───────────────────────────────────────────

export interface SendQuoteWithPdfEmailInput {
  business: any;
  growthSettings?: any;
  primaryColor: string;
  customerName: string;
  customBody?: string;
  propertyInfoHtml: string;
  optionsCardsHtml: string;
  replyToEmail: string | null;
  quoteUrl: string;
}

export function buildSendQuoteWithPdfEmail(
  input: SendQuoteWithPdfEmailInput,
): { html: string; text: string } {
  const {
    business,
    growthSettings: gs,
    primaryColor,
    customerName,
    customBody,
    propertyInfoHtml,
    optionsCardsHtml,
    replyToEmail,
    quoteUrl,
  } = input;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:20px 0;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:700px;background-color:#ffffff;">
        <tr><td style="padding:32px 20px;text-align:center;border-bottom:1px solid #eeeeee;">
          ${business.logoUri ? `<div style="margin-bottom:16px;"><img src="${business.logoUri}" alt="${business.companyName}" style="max-height:50px;max-width:200px;"></div>` : ""}
          <h1 style="margin:0;font-size:24px;font-weight:700;color:#333333;">${business.companyName || "QuotePro"}</h1>
        </td></tr>
        ${customBody ? `
        <tr><td style="padding:24px 32px;background-color:#ffffff;border-bottom:1px solid #eeeeee;">
          <div style="font-size:15px;color:#333333;line-height:1.7;white-space:pre-wrap;">${customBody.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
        </td></tr>
        <tr><td style="padding:16px 20px 8px;text-align:center;">
          <h2 style="margin:0;font-size:18px;font-weight:700;color:#333333;">Your Quote Options</h2>
          <p style="margin:8px 0 0;font-size:13px;color:#666666;">Select the option that works best for you.</p>
        </td></tr>` : `
        <tr><td style="padding:16px 20px;text-align:center;border-bottom:1px solid #eeeeee;">
          <p style="margin:0;font-size:14px;color:#666666;">Hi ${customerName}, please select the option that works best for you.</p>
        </td></tr>`}

        ${propertyInfoHtml}

        <tr><td style="padding:24px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;">
            ${optionsCardsHtml}
          </table>
        </td></tr>

        <tr><td style="padding:20px;text-align:center;background-color:#f9f9f9;border-top:1px solid #eeeeee;">
          <p style="margin:0;font-size:12px;color:#666666;line-height:1.5;">
            If buttons don't work, reply with <strong>1</strong> (Good), <strong>2</strong> (Better), or <strong>3</strong> (Best) to select your option.
          </p>
          ${spamFolderHintHtml("#666666")}
        </td></tr>

        ${gs?.includeReviewInMessages && gs?.googleReviewLink?.trim() ? `<tr><td style="padding:16px 20px;text-align:center;background-color:#fffbeb;border-top:1px solid #fde68a;"><div style="font-size:13px;color:#92400e;margin-bottom:4px;">After your service, would you mind leaving a quick review?</div><a href="${gs.googleReviewLink.trim()}" style="color:${primaryColor};font-size:13px;text-decoration:underline;">${gs.googleReviewLink.trim()}</a></td></tr>` : ""}
        <tr><td style="padding:24px 20px;text-align:center;border-top:1px solid #eeeeee;background-color:#ffffff;">
          <div style="font-weight:600;color:#333333;margin-bottom:8px;">${business.companyName || "QuotePro"}</div>
          ${business.phone ? `<div style="font-size:13px;color:#666666;margin-bottom:4px;">Phone: <a href="tel:${business.phone}" style="color:${primaryColor};text-decoration:none;">${business.phone}</a></div>` : ""}
          ${replyToEmail ? `<div style="font-size:13px;color:#666666;">Email: <a href="mailto:${replyToEmail}" style="color:${primaryColor};text-decoration:none;">${replyToEmail}</a></div>` : ""}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const baseText = customBody
    ? `${customBody}\n\nView your quote online: ${quoteUrl}`
    : `Hi ${customerName},\n\nPlease see your quote details below.\n\nTo view and accept your quote online, visit: ${quoteUrl}`;

  const text = `${baseText}\n\n${SPAM_FOLDER_HINT_TEXT}`;

  return { html, text };
}

// ─── /api/quotes/:id/onboarding-send ─────────────────────────────────────────

export interface OnboardingQuoteEmailInput {
  business: any;
  customerName: string;
  propertySummary: string; // e.g. "3 Bed · 2 Bath · 1500 Sq Ft"
  cardCells: string;       // pre-rendered tier card cells HTML
  replyToEmail: string | null;
  quoteUrl: string;
}

export function buildOnboardingQuoteEmail(
  input: OnboardingQuoteEmailInput,
): { html: string; text: string } {
  const { business, customerName, propertySummary, cardCells, replyToEmail, quoteUrl } = input;

  const BRAND_GREEN = "#0F6E56";
  const TEXT_DARK = "#1A1A1A";
  const TEXT_MUTED = "#5A6B6E";
  const CARD_BG_MUTED = "#F5F7F6";
  const PAGE_BG = "#F5F5F5";
  const BORDER_LIGHT = "#E5E9E8";
  const FONT_STACK = `'Plus Jakarta Sans','Inter','Helvetica Neue',Arial,Helvetica,sans-serif`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Quote Options</title>
  <style>
    @media only screen and (max-width: 600px) {
      .tier-row { display:block !important; width:100% !important; }
      .tier-cell { display:block !important; width:100% !important; padding:8px 0 !important; }
      .container { width:100% !important; padding:0 12px !important; }
      h1.email-h1 { font-size:22px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${PAGE_BG};font-family:${FONT_STACK};-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${PAGE_BG};padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="container" style="max-width:680px;">

        <tr><td style="padding:8px 12px 20px;text-align:center;font-family:${FONT_STACK};">
          ${business.logoUri ? `<img src="${escHtml(business.logoUri)}" alt="${escHtml(business.companyName || "QuotePro")}" style="max-height:42px;max-width:180px;display:inline-block;">` : `<div style="font-size:18px;font-weight:800;color:${TEXT_DARK};">${escHtml(business.companyName || "QuotePro")}</div>`}
        </td></tr>

        <tr><td style="background:#FFFFFF;border-radius:14px;border:1px solid ${BORDER_LIGHT};padding:32px 24px 12px;text-align:center;font-family:${FONT_STACK};">
          <h1 class="email-h1" style="margin:0 0 8px;font-size:26px;font-weight:800;color:${TEXT_DARK};letter-spacing:-0.4px;">Your Quote Options</h1>
          <p style="margin:0 0 6px;font-size:15px;color:${TEXT_DARK};">Hi ${escHtml(customerName)},</p>
          <p style="margin:0 0 14px;font-size:14px;color:${TEXT_MUTED};line-height:1.5;">Based on your home details, here are your cleaning options. Pick the one that fits best.</p>
          ${propertySummary ? `<div style="display:inline-block;background:${CARD_BG_MUTED};border:1px solid ${BORDER_LIGHT};border-radius:999px;padding:8px 16px;font-size:13px;color:${TEXT_DARK};font-weight:600;">${propertySummary}</div>` : ""}
        </td></tr>

        <tr><td style="padding:18px 0 6px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="tier-row">
            <tr>
              ${cardCells}
            </tr>
          </table>
        </td></tr>

        <tr><td style="padding:8px 16px 6px;text-align:center;font-family:${FONT_STACK};">
          <p style="margin:0;font-size:12px;color:${TEXT_MUTED};line-height:1.6;">
            If buttons don't work, reply with <strong style="color:${TEXT_DARK};">1</strong> (Good), <strong style="color:${TEXT_DARK};">2</strong> (Better), or <strong style="color:${TEXT_DARK};">3</strong> (Best) to select your option.
          </p>
          ${spamFolderHintHtml(TEXT_MUTED)}
        </td></tr>

        <tr><td style="padding:24px 16px 8px;text-align:center;font-family:${FONT_STACK};">
          <div style="font-weight:700;color:${TEXT_DARK};margin-bottom:6px;font-size:14px;">${escHtml(business.companyName || "QuotePro")}</div>
          ${business.phone ? `<div style="font-size:12px;color:${TEXT_MUTED};margin-bottom:3px;">Phone: <a href="tel:${escHtml(business.phone)}" style="color:${BRAND_GREEN};text-decoration:none;">${escHtml(business.phone)}</a></div>` : ""}
          ${replyToEmail ? `<div style="font-size:12px;color:${TEXT_MUTED};margin-bottom:10px;">Email: <a href="mailto:${escHtml(replyToEmail)}" style="color:${BRAND_GREEN};text-decoration:none;">${escHtml(replyToEmail)}</a></div>` : ""}
          <div style="font-size:11px;color:${TEXT_MUTED};margin-top:12px;">Powered by <span style="color:${BRAND_GREEN};font-weight:700;">QuotePro</span></div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text =
    `Hi ${customerName},\n\nPlease see your quote details below.\n\nTo view and accept your quote online, visit: ${quoteUrl}\n\n${SPAM_FOLDER_HINT_TEXT}`;

  return { html, text };
}

// ─── POST /q/:token/book booking confirmation ────────────────────────────────

export interface BookingConfirmationEmailInput {
  bookingDateStr: string;
  bookingTimeStr: string;
  endTimeStr: string;
  address: string;
  serviceLabel: string;
  total: number;
  confirmMsg: string;
  senderLine: string; // e.g. business.senderName || companyName
}

export function buildBookingConfirmationEmail(
  input: BookingConfirmationEmailInput,
): { html: string } {
  const {
    bookingDateStr,
    bookingTimeStr,
    endTimeStr,
    address,
    serviceLabel,
    total,
    confirmMsg,
    senderLine,
  } = input;

  const html = `
              <div style="font-family:Inter,system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px">
                <h1 style="font-size:24px;font-weight:800;color:#0F172A;margin:0 0 4px">You're all booked!</h1>
                <p style="font-size:15px;color:#64748B;margin:0 0 24px">Here are the details for your upcoming clean:</p>
                <div style="background:#F8FAFC;border-radius:12px;padding:20px;margin-bottom:20px">
                  <div style="display:flex;gap:12px;margin-bottom:12px">
                    <span style="font-size:20px">&#128197;</span>
                    <div><strong style="color:#0F172A">${bookingDateStr}</strong><br/><span style="color:#64748B">${bookingTimeStr} – ${endTimeStr}</span></div>
                  </div>
                  ${address ? `<div style="display:flex;gap:12px;margin-bottom:12px"><span style="font-size:20px">&#128205;</span><div><strong style="color:#0F172A">${address}</strong></div></div>` : ""}
                  <div style="display:flex;gap:12px"><span style="font-size:20px">&#128246;</span><div><strong style="color:#0F172A">${serviceLabel}</strong><br/><span style="color:#64748B">$${Number(total || 0).toFixed(2)}</span></div></div>
                </div>
                <p style="font-size:14px;color:#64748B">${confirmMsg}</p>
                ${spamFolderHintHtml("#94A3B8")}
                <p style="font-size:14px;color:#64748B;margin-top:16px">— ${senderLine}</p>
              </div>
            `;

  return { html };
}
