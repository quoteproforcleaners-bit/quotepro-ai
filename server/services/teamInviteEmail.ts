/**
 * server/services/teamInviteEmail.ts
 *
 * Sends the "you've been invited to <Business> on QuotePro" email to a
 * prospective team member. Token is delivered as a query param to the
 * /invite/accept page in the web app.
 */

import { sendEmail, BASE_APP_URL } from "../mail";
import type { Role } from "../lib/permissions";

const ROLE_DISPLAY: Record<Role, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  estimator: "Estimator",
  cleaner: "Cleaner",
};

export interface SendInviteEmailOpts {
  toEmail: string;
  rawToken: string;
  role: Role;
  businessName: string;
  inviterName: string | null;
  inviterEmail: string | null;
  expiresAt: Date;
}

export async function sendTeamInviteEmail(opts: SendInviteEmailOpts): Promise<void> {
  const { toEmail, rawToken, role, businessName, inviterName, inviterEmail, expiresAt } = opts;

  const acceptUrl = `${BASE_APP_URL.replace(/\/$/, "")}/invite/accept?token=${encodeURIComponent(rawToken)}`;
  const inviterLabel = inviterName?.trim() || inviterEmail || "Your teammate";
  const roleLabel = ROLE_DISPLAY[role] || role;
  const expiresStr = expiresAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const subject = `${inviterLabel} invited you to join ${businessName} on QuotePro`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f5f9;">
  <tr><td align="center" style="padding:40px 16px 60px;">
    <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">
      <tr><td style="background:linear-gradient(135deg,#0f172a 0%,#1e3a8a 60%,#2563eb 100%);border-radius:16px 16px 0 0;padding:32px 36px;">
        <p style="margin:0;color:#c7ddff;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">QuotePro</p>
        <h1 style="margin:8px 0 0;color:#fff;font-size:24px;font-weight:800;line-height:1.25;">You're invited to ${escapeHtml(businessName)}</h1>
      </td></tr>
      <tr><td style="background:#fff;padding:32px 36px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
        <p style="margin:0 0 16px;font-size:15px;color:#0f172a;line-height:1.6;">
          <strong>${escapeHtml(inviterLabel)}</strong> invited you to join
          <strong>${escapeHtml(businessName)}</strong> on QuotePro as
          <strong>${escapeHtml(roleLabel)}</strong>.
        </p>
        <p style="margin:0 0 28px;font-size:14px;color:#475569;line-height:1.6;">
          QuotePro helps cleaning businesses send quotes, manage customers, and grow revenue. Accept this invite to get started.
        </p>
        <p style="text-align:center;margin:0 0 28px;">
          <a href="${acceptUrl}" style="display:inline-block;background:#1e40af;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px;">Accept invitation</a>
        </p>
        <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;text-align:center;">
          This invitation expires on <strong>${expiresStr}</strong>. If the button doesn't work, paste this link into your browser:<br/>
          <span style="word-break:break-all;color:#64748b;">${acceptUrl}</span>
        </p>
      </td></tr>
      <tr><td style="background:#f8fafc;padding:20px 36px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;">
        <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;line-height:1.6;">
          Didn't expect this email? You can safely ignore it — no account will be created unless you accept.
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;

  const text =
    `${inviterLabel} invited you to join ${businessName} on QuotePro as ${roleLabel}.\n\n` +
    `Accept the invitation: ${acceptUrl}\n\n` +
    `This invitation expires on ${expiresStr}.`;

  await sendEmail({ to: toEmail, subject, html, text });
}

function escapeHtml(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
