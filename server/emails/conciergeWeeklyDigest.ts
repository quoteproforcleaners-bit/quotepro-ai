import type { ConciergeInsights } from "../services/conciergeInsights";

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]!));
}

export interface DigestEmailData {
  ownerFirstName: string;
  businessName: string;
  brandColor: string;
  insights: ConciergeInsights;
  appUrl: string;
}

export function buildConciergeWeeklyDigestEmail(data: DigestEmailData): { subject: string; html: string; text: string } {
  const { ownerFirstName, businessName, brandColor, insights, appUrl } = data;
  const color = brandColor || "#1E40AF";
  const liftPct = (insights.conversionLiftEstimate * 100).toFixed(1);
  const liftPositive = insights.conversionLiftEstimate >= 0;

  const headline =
    insights.totalConversations === 0
      ? "Your AI Concierge had a quiet week"
      : insights.acceptedAfterChat > 0
      ? `Your AI Concierge helped close ${insights.acceptedAfterChat} job${insights.acceptedAfterChat !== 1 ? "s" : ""} this week`
      : `Your AI Concierge had ${insights.totalConversations} conversation${insights.totalConversations !== 1 ? "s" : ""} this week`;

  const subject = `Concierge weekly: ${insights.totalConversations} chat${insights.totalConversations !== 1 ? "s" : ""}, ${insights.acceptedAfterChat} accepted`;

  const topQuestionsHtml = insights.topQuestions.slice(0, 5).length
    ? `
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-top:8px;border-collapse:collapse;">
        ${insights.topQuestions
          .slice(0, 5)
          .map(
            (q) => `
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;color:#374151;font-size:14px;text-transform:capitalize;">${escapeHtml((q.signal_type || "").replace(/_/g, " "))}</td>
              <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;color:#9ca3af;font-size:13px;text-align:right;">${q.count}</td>
            </tr>`
          )
          .join("")}
      </table>`
    : `<p style="color:#9ca3af;font-size:13px;margin:6px 0 0;">No questions yet — share more quotes to spark chats.</p>`;

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f5f6f8;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',Segoe UI,Helvetica,Arial,sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f5f6f8;padding:32px 0;">
    <tr><td align="center">
      <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
        <tr><td style="padding:28px 32px 0;">
          <p style="margin:0;color:${color};font-size:13px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;">${escapeHtml(businessName)} · AI CONCIERGE</p>
          <h1 style="margin:8px 0 4px;font-size:24px;color:#0f172a;font-weight:700;line-height:1.25;">${escapeHtml(headline)}</h1>
          <p style="margin:0;color:#64748b;font-size:14px;">Week of ${new Date(Date.now() - 7 * 86400000).toLocaleDateString()} – ${new Date().toLocaleDateString()}</p>
        </td></tr>

        <tr><td style="padding:24px 32px 8px;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td width="50%" style="padding:14px;background:#f8fafc;border-radius:12px;vertical-align:top;">
                <p style="margin:0;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.4px;">Conversations</p>
                <p style="margin:6px 0 0;color:#0f172a;font-size:28px;font-weight:700;">${insights.totalConversations}</p>
              </td>
              <td width="12"></td>
              <td width="50%" style="padding:14px;background:#f8fafc;border-radius:12px;vertical-align:top;">
                <p style="margin:0;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.4px;">Accepted after chat</p>
                <p style="margin:6px 0 0;color:#0f172a;font-size:28px;font-weight:700;">${insights.acceptedAfterChat}</p>
              </td>
            </tr>
            <tr><td colspan="3" style="height:12px;"></td></tr>
            <tr>
              <td width="50%" style="padding:14px;background:#f8fafc;border-radius:12px;vertical-align:top;">
                <p style="margin:0;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.4px;">Offers made</p>
                <p style="margin:6px 0 0;color:#0f172a;font-size:28px;font-weight:700;">${insights.offersMade}</p>
              </td>
              <td width="12"></td>
              <td width="50%" style="padding:14px;background:#f8fafc;border-radius:12px;vertical-align:top;">
                <p style="margin:0;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.4px;">Offers accepted</p>
                <p style="margin:6px 0 0;color:#0f172a;font-size:28px;font-weight:700;">${insights.offersAccepted}</p>
              </td>
            </tr>
          </table>
        </td></tr>

        <tr><td style="padding:8px 32px;">
          <div style="padding:18px;background:linear-gradient(135deg, ${color}15, ${color}08);border-radius:12px;border:1px solid ${color}22;">
            <p style="margin:0;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.4px;">Conversion lift (chat vs no-chat)</p>
            <p style="margin:6px 0 0;color:${liftPositive ? color : "#b45309"};font-size:30px;font-weight:800;">${liftPositive ? "+" : ""}${liftPct}%</p>
            <p style="margin:6px 0 0;color:#475569;font-size:13px;">${
              insights.totalConversations === 0
                ? "No conversations yet to compare."
                : liftPositive
                ? "Quotes with concierge chats accepted at a higher rate."
                : "Negative or flat lift — try refreshing your default prompts."
            }</p>
          </div>
        </td></tr>

        ${
          insights.negotiations > 0
            ? `<tr><td style="padding:18px 32px 0;">
                <h3 style="margin:0 0 6px;color:#0f172a;font-size:16px;">Negotiations</h3>
                <p style="margin:0;color:#475569;font-size:14px;line-height:1.5;">
                  ${insights.negotiations} negotiation conversation${insights.negotiations !== 1 ? "s" : ""}, average discount ${insights.avgDiscountPct.toFixed(1)}%, $${insights.totalRevenueRecovered.toFixed(0)} total concession given.
                </p>
              </td></tr>`
            : ""
        }

        <tr><td style="padding:18px 32px 0;">
          <h3 style="margin:0 0 6px;color:#0f172a;font-size:16px;">Top customer questions</h3>
          ${topQuestionsHtml}
        </td></tr>

        <tr><td style="padding:24px 32px 32px;">
          <a href="${escapeHtml(appUrl)}" style="display:inline-block;background:${color};color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:12px;font-weight:600;font-size:15px;">Open the dashboard</a>
        </td></tr>

        <tr><td style="padding:0 32px 24px;">
          <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.5;">You're receiving this because the AI Concierge is enabled on your QuotePro account. Manage settings in the QuotePro app under Settings → AI Concierge.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = [
    headline,
    "",
    `Conversations: ${insights.totalConversations}`,
    `Accepted after chat: ${insights.acceptedAfterChat}`,
    `Offers made: ${insights.offersMade} (accepted: ${insights.offersAccepted})`,
    `Conversion lift: ${liftPositive ? "+" : ""}${liftPct}%`,
    insights.negotiations > 0
      ? `Negotiations: ${insights.negotiations}, avg discount ${insights.avgDiscountPct.toFixed(1)}%, $${insights.totalRevenueRecovered.toFixed(0)} total concession`
      : "",
    "",
    "Top customer questions:",
    ...insights.topQuestions.slice(0, 5).map((q) => `  • ${(q.signal_type || "").replace(/_/g, " ")} (${q.count})`),
    "",
    `Open the dashboard: ${appUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}
