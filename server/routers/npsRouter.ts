/**
 * server/routers/npsRouter.ts
 * NPS survey submission + eligibility check.
 */

import { Router, type Request, type Response } from "express";
import { pool } from "../db";
import { requireAuth } from "../middleware";
import { trackEvent } from "../analytics";
import { sendEmail } from "../mail";

const router = Router();

// ── GET /api/nps/status — check if the NPS survey should be shown ──────────
router.get("/api/nps/status", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const result = await pool.query(
      `SELECT subscription_tier, subscription_started_at, created_at,
              nps_score, nps_surveyed_at
       FROM users WHERE id = $1 LIMIT 1`,
      [userId]
    );
    if (result.rows.length === 0) return res.json({ shouldShow: false });

    const u = result.rows[0];

    // Already surveyed
    if (u.nps_surveyed_at) return res.json({ shouldShow: false, alreadySurveyed: true });

    // Must be paid subscriber
    const isPaid = ["starter", "growth", "pro"].includes(u.subscription_tier);
    if (!isPaid) return res.json({ shouldShow: false });

    // Derive subscription start: subscription_started_at or fall back to checking analytics
    let subStartedAt: Date | null = u.subscription_started_at
      ? new Date(u.subscription_started_at)
      : null;

    if (!subStartedAt) {
      // Look for first upgrade_completed event
      const evRow = await pool.query(
        `SELECT MIN(ae.created_at) AS first_upgrade
         FROM analytics_events ae
         JOIN businesses b ON b.id = ae.business_id
         WHERE b.owner_user_id = $1
           AND ae.event_name = 'upgrade_completed'`,
        [userId]
      );
      subStartedAt = evRow.rows[0]?.first_upgrade ? new Date(evRow.rows[0].first_upgrade) : null;
    }

    if (!subStartedAt) return res.json({ shouldShow: false });

    const daysSinceSub = (Date.now() - subStartedAt.getTime()) / 86_400_000;
    const shouldShow = daysSinceSub >= 30;

    return res.json({ shouldShow, daysSinceSub: Math.floor(daysSinceSub) });
  } catch (err: any) {
    console.error("[nps/status]", err.message);
    return res.status(500).json({ message: "Failed to check NPS status" });
  }
});

// ── POST /api/nps/submit ───────────────────────────────────────────────────
router.post("/api/nps/submit", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const { score, followUp } = req.body as { score: number; followUp?: string };

    if (typeof score !== "number" || score < 0 || score > 10) {
      return res.status(400).json({ message: "score must be 0–10" });
    }

    // Save to DB
    await pool.query(
      `UPDATE users
       SET nps_score = $1, nps_response = $2, nps_surveyed_at = NOW()
       WHERE id = $3`,
      [score, followUp || null, userId]
    );

    trackEvent(userId, "NPS_SUBMITTED" as any, { score }).catch(() => {});

    // Fetch user info for follow-ups
    const userRow = await pool.query(
      "SELECT email, name, subscription_tier FROM users WHERE id = $1 LIMIT 1",
      [userId]
    );
    const user = userRow.rows[0];
    const firstName = user?.name?.split(" ")[0] || "there";

    if (score >= 9) {
      // Promoter: case study outreach
      await sendEmail({
        to: user.email,
        subject: "Would you share your QuotePro story?",
        html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;line-height:1.6">
<p>Hey ${firstName},</p>
<p>Thank you so much for the incredible rating — it genuinely means the world to us.</p>
<p>Would you be willing to share your QuotePro story? We'd love to feature you as a case study and show other cleaning business owners what's possible.</p>
<p>It's just a 20-minute conversation — book a time that works for you:</p>
<p><a href="https://calendly.com/quotepro/case-study" style="background:#2563eb;color:#fff;padding:10px 22px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">Book a 20-minute chat</a></p>
<p>No pressure at all — and thank you again for trusting QuotePro.</p>
<p>— Mike, Founder</p>
</div>`,
      });
    } else if (score <= 6 && user) {
      // Detractor: create growth_task for founder follow-up
      const bizRow = await pool.query(
        "SELECT id FROM businesses WHERE owner_user_id = $1 LIMIT 1",
        [userId]
      );
      if (bizRow.rows.length > 0) {
        await pool.query(
          `INSERT INTO growth_tasks (business_id, type, channel, priority, message, status, created_at, updated_at)
           VALUES ($1, 'nps_followup', 'email', 90, $2, 'pending', NOW(), NOW())`,
          [
            bizRow.rows[0].id,
            `Follow up with ${user.name || user.email} (${user.subscription_tier} plan) — NPS detractor score: ${score}. Feedback: ${followUp || "(no comment)"}`,
          ]
        );
      }
    }

    return res.json({ success: true });
  } catch (err: any) {
    console.error("[nps/submit]", err.message);
    return res.status(500).json({ message: "Failed to submit NPS" });
  }
});

export default router;
