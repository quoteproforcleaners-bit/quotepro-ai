import { Router, Request, Response } from "express";
import { sendEmail, PLATFORM_FROM_NAME } from "../mail";

export const supportRouter = Router();

const SUPPORT_EMAIL = "mike@getquotepro.ai";

const TIER_LABELS: Record<string, string> = {
  free: "Free Trial",
  starter: "Starter ($19/mo)",
  growth: "Growth ($49/mo)",
  pro: "Pro ($99/mo)",
};

supportRouter.post("/ticket", async (req: Request, res: Response) => {
  try {
    const { name, email, tier, message, screenshots } = req.body as {
      name: string;
      email: string;
      tier: string;
      message: string;
      screenshots?: { filename: string; base64: string; mimeType: string }[];
    };

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return res.status(400).json({ error: "Name, email, and message are required." });
    }

    const tierLabel = TIER_LABELS[tier] || tier || "Unknown";
    const ticketId = `QP-${Date.now().toString(36).toUpperCase()}`;

    const attachments = (screenshots || []).map((s, i) => ({
      filename: s.filename || `screenshot-${i + 1}.jpg`,
      content: s.base64,
      contentType: s.mimeType || "image/jpeg",
    }));

    // ── Email to support (mike@getquotepro.ai) ──
    const adminHtml = `
      <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:640px;margin:0 auto;background:#f8fafc;padding:24px;">
        <div style="background:#1e3a5f;border-radius:12px 12px 0 0;padding:24px 28px;">
          <h1 style="margin:0;font-size:20px;color:#fff;font-weight:800;">New Support Ticket</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.7);font-size:13px;">Ticket ID: <strong style="color:#fff;">${ticketId}</strong></p>
        </div>
        <div style="background:#fff;border-radius:0 0 12px 12px;padding:28px;border:1px solid #e2e8f0;border-top:none;">
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
            <tr>
              <td style="padding:8px 12px;background:#f1f5f9;border-radius:6px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;width:100px;">Name</td>
              <td style="padding:8px 12px;font-size:14px;color:#1e293b;font-weight:600;">${name}</td>
            </tr>
            <tr>
              <td style="padding:8px 12px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Email</td>
              <td style="padding:8px 12px;font-size:14px;"><a href="mailto:${email}" style="color:#2563eb;">${email}</a></td>
            </tr>
            <tr>
              <td style="padding:8px 12px;background:#f1f5f9;border-radius:6px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Plan</td>
              <td style="padding:8px 12px;font-size:14px;color:#1e293b;">${tierLabel}</td>
            </tr>
          </table>

          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:20px;">
            <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Message</p>
            <p style="margin:0;font-size:14px;color:#1e293b;line-height:1.7;white-space:pre-wrap;">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
          </div>

          ${attachments.length > 0 ? `<p style="font-size:13px;color:#64748b;">📎 ${attachments.length} screenshot${attachments.length > 1 ? "s" : ""} attached below.</p>` : ""}

          <div style="margin-top:20px;padding-top:20px;border-top:1px solid #f1f5f9;">
            <a href="mailto:${email}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 22px;border-radius:8px;font-size:13px;font-weight:700;">Reply to ${name}</a>
          </div>
        </div>
      </div>`;

    // ── Confirmation email to user ──
    const userHtml = `
      <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;">
        <div style="background:linear-gradient(135deg,#1e3a5f,#1d4ed8);border-radius:12px 12px 0 0;padding:28px;">
          <h1 style="margin:0;font-size:22px;color:#fff;font-weight:800;">We've got your message, ${name.split(" ")[0]}!</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">Your support ticket has been received.</p>
        </div>
        <div style="background:#fff;border-radius:0 0 12px 12px;padding:28px;border:1px solid #e2e8f0;border-top:none;">
          <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 16px;">
            Thanks for reaching out. We typically respond within a few hours during business hours.
          </p>

          <div style="background:#f0fdf4;border:1px solid #a7f3d0;border-radius:8px;padding:14px 16px;margin-bottom:20px;">
            <p style="margin:0;font-size:13px;font-weight:700;color:#059669;">Ticket ID: ${ticketId}</p>
          </div>

          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;">
            <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Your message</p>
            <p style="margin:0;font-size:14px;color:#374151;line-height:1.7;white-space:pre-wrap;">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
          </div>

          <p style="font-size:14px;color:#64748b;margin-top:20px;line-height:1.6;">
            If your issue is urgent, you can also reply directly to this email and it'll go straight to our team.
          </p>
          <p style="font-size:14px;color:#374151;margin-top:16px;font-weight:600;">
            — The QuotePro Team
          </p>
        </div>
      </div>`;

    // Send both emails (don't block on either)
    await Promise.all([
      sendEmail({
        to: SUPPORT_EMAIL,
        subject: `[Support] ${name} — ${tierLabel} — ${ticketId}`,
        html: adminHtml,
        replyTo: email,
        attachments,
      }),
      sendEmail({
        to: email,
        subject: `We got your message — Ticket ${ticketId}`,
        html: userHtml,
        fromName: PLATFORM_FROM_NAME,
        replyTo: SUPPORT_EMAIL,
      }),
    ]);

    console.log(`[Support] Ticket ${ticketId} filed by ${email} (${tierLabel})`);
    return res.json({ success: true, ticketId });
  } catch (err: any) {
    console.error("[Support] ticket error:", err?.message || err);
    return res.status(500).json({ error: "Failed to submit ticket. Please try again." });
  }
});
