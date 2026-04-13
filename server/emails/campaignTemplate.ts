export interface CampaignEmailData {
  recipientName: string;
  recipientEmail: string;
  businessName: string;
  businessColor: string;
  operatorFirstName: string;
  subject: string;
  bodyText: string;
  ctaText: string;
  ctaUrl: string;
  footerNote?: string;
  unsubscribeUrl: string;
}

export function buildCampaignEmail(data: CampaignEmailData): string {
  if (!data.ctaUrl || data.ctaUrl.trim() === "") {
    throw new Error(`Campaign email missing ctaUrl for recipient ${data.recipientEmail}`);
  }
  if (!data.ctaText || data.ctaText.trim() === "") {
    data.ctaText = "Book Now";
  }

  const color = data.businessColor || "#0F6E56";

  const bodyParagraphs = data.bodyText
    .split("\n")
    .filter((line) => line.trim())
    .map(
      (line) =>
        `<p style="margin:0 0 14px;font-size:15px;color:#374151;line-height:1.7;">${escapeHtml(line)}</p>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(data.subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0"
    style="background-color:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">

        <table width="600" cellpadding="0" cellspacing="0" border="0"
          style="max-width:600px;width:100%;background-color:#ffffff;
                 border-radius:12px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background-color:${color};padding:22px 36px;">
              <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;
                         letter-spacing:-0.3px;">
                ${escapeHtml(data.businessName)}
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px;">

              <p style="margin:0 0 18px;font-size:15px;color:#374151;line-height:1.6;">
                Hi ${escapeHtml(data.recipientName)},
              </p>

              ${bodyParagraphs}

              <!-- CTA button — table-based for Gmail compatibility -->
              <table cellpadding="0" cellspacing="0" border="0"
                style="margin:24px 0 20px;">
                <tr>
                  <td align="center" bgcolor="${color}"
                    style="border-radius:8px;mso-padding-alt:0;">
                    <a href="${data.ctaUrl}"
                      target="_blank"
                      style="display:inline-block;
                             padding:15px 34px;
                             background-color:${color};
                             color:#ffffff;
                             text-decoration:none;
                             font-size:15px;
                             font-weight:700;
                             border-radius:8px;
                             letter-spacing:0.2px;
                             font-family:Arial,Helvetica,sans-serif;
                             mso-hide:none;">
                      ${escapeHtml(data.ctaText)}
                    </a>
                  </td>
                </tr>
              </table>

              ${
                data.footerNote
                  ? `<p style="margin:0 0 20px;font-size:14px;color:#6b7280;font-style:italic;">${escapeHtml(data.footerNote)}</p>`
                  : ""
              }

              <p style="margin:20px 0 0;font-size:14px;color:#374151;">
                ${escapeHtml(data.operatorFirstName)}<br>
                <span style="color:#6b7280;">${escapeHtml(data.businessName)}</span>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;padding:18px 36px;
                        border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;
                          text-align:center;line-height:1.6;">
                You're receiving this as a customer of ${escapeHtml(data.businessName)}.<br>
                <a href="${data.unsubscribeUrl}"
                  style="color:#9ca3af;text-decoration:underline;">
                  Unsubscribe
                </a>
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

function escapeHtml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function getCampaignCtaText(templateKey?: string | null): string {
  const map: Record<string, string> = {
    spring_cleaning: "Book Your Spring Clean",
    win_back: "Book Your Next Clean",
    referral: "Get Your Free Month",
    review_request: "Leave a Review",
    recurring_offer: "Start Weekly Service",
    holiday: "Book Holiday Cleaning",
    reactivation: "Book Your Next Clean",
    seasonal: "Book Now",
    upsell: "Upgrade Your Clean",
    promotion: "Claim This Offer",
  };
  return (templateKey && map[templateKey]) || "Book Now";
}

export function getCampaignFooterNote(templateKey?: string | null): string {
  const map: Record<string, string> = {
    spring_cleaning: "Spots are filling fast!",
    win_back: "We'd love to have you back.",
    referral: "Limited time offer.",
    holiday: "Book early — slots go fast.",
  };
  return (templateKey && map[templateKey]) || "";
}
