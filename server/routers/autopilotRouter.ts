import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware";
import { pool } from "../db";
import { getBusinessByOwner, getUserById } from "../storage";
import {
  enrollLead,
  processAutopilotJobs,
} from "../services/autopilotService";
import { isGrowthOrAbove, isProTier } from "../middleware";
import { getStripe } from "../clients";

const router = Router();

async function requireAutopilot(req: Request, res: Response, next: any) {
  try {
    const user = await getUserById(req.session.userId!);
    if (!user) return res.status(401).json({ message: "Not authenticated" });
    if (isProTier(user.subscriptionTier)) return next();
    if (isGrowthOrAbove(user.subscriptionTier) && (user as any).autopilotEnabled) return next();
    return res.status(403).json({
      upsell: true,
      message: "Upgrade to unlock Autopilot",
      requiresUpgrade: true,
    });
  } catch {
    return res.status(500).json({ message: "Subscription check failed" });
  }
}

router.post("/api/autopilot/enroll", requireAuth, requireAutopilot, async (req: Request, res: Response) => {
  try {
    const { leadId } = req.body;
    if (!leadId) return res.status(400).json({ message: "leadId is required" });

    const business = await getBusinessByOwner(req.session.userId!);
    if (!business) return res.status(404).json({ message: "Business not found" });

    const jobId = await enrollLead(req.session.userId!, business.id, leadId);
    return res.json({ jobId, message: "Lead enrolled in Autopilot" });
  } catch (err: any) {
    console.error("[autopilot] enroll error:", err.message);
    return res.status(500).json({ message: "Failed to enroll lead" });
  }
});

router.get("/api/autopilot/jobs", requireAuth, requireAutopilot, async (req: Request, res: Response) => {
  try {
    const business = await getBusinessByOwner(req.session.userId!);
    if (!business) return res.status(404).json({ message: "Business not found" });

    const result = await pool.query(
      `SELECT aj.*,
              c.first_name || ' ' || c.last_name AS lead_name,
              c.email AS lead_email,
              (SELECT COUNT(*) FROM autopilot_job_logs l WHERE l.job_id = aj.id) AS log_count
       FROM autopilot_jobs aj
       LEFT JOIN customers c ON c.id = aj.lead_id
       WHERE aj.business_id = $1
       ORDER BY aj.created_at DESC
       LIMIT 100`,
      [business.id]
    );
    return res.json(result.rows);
  } catch (err: any) {
    console.error("[autopilot] jobs error:", err.message);
    return res.status(500).json({ message: "Failed to fetch jobs" });
  }
});

router.post("/api/autopilot/jobs/:id/pause", requireAuth, requireAutopilot, async (req: Request, res: Response) => {
  try {
    const business = await getBusinessByOwner(req.session.userId!);
    if (!business) return res.status(404).json({ message: "Business not found" });

    await pool.query(
      `UPDATE autopilot_jobs SET status = 'paused', next_action_at = NULL WHERE id = $1 AND business_id = $2`,
      [req.params.id, business.id]
    );
    return res.json({ message: "Job paused" });
  } catch (err: any) {
    return res.status(500).json({ message: "Failed to pause job" });
  }
});

router.post("/api/autopilot/jobs/:id/resume", requireAuth, requireAutopilot, async (req: Request, res: Response) => {
  try {
    const business = await getBusinessByOwner(req.session.userId!);
    if (!business) return res.status(404).json({ message: "Business not found" });

    const next = new Date(Date.now() + 60 * 60 * 1000);
    await pool.query(
      `UPDATE autopilot_jobs SET status = 'pending_response', next_action_at = $1 WHERE id = $2 AND business_id = $3`,
      [next, req.params.id, business.id]
    );
    return res.json({ message: "Job resumed" });
  } catch (err: any) {
    return res.status(500).json({ message: "Failed to resume job" });
  }
});

router.get("/api/autopilot/stats", requireAuth, requireAutopilot, async (req: Request, res: Response) => {
  try {
    const business = await getBusinessByOwner(req.session.userId!);
    if (!business) return res.status(404).json({ message: "Business not found" });

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const result = await pool.query(
      `SELECT
         COUNT(DISTINCT aj.id) FILTER (WHERE aj.created_at >= $2) AS enrolled_this_month,
         COUNT(DISTINCT l.id) FILTER (WHERE l.step = 'step1' AND l.created_at >= $2) AS quotes_sent,
         COUNT(DISTINCT l2.id) FILTER (WHERE l2.step = 'step2' AND l2.created_at >= $2) AS follow_ups_fired,
         COUNT(DISTINCT l3.id) FILTER (WHERE l3.step = 'step3' AND l3.created_at >= $2) AS contracts_sent,
         COUNT(DISTINCT l4.id) FILTER (WHERE l4.step = 'step4' AND l4.created_at >= $2) AS reviews_requested
       FROM autopilot_jobs aj
       LEFT JOIN autopilot_job_logs l ON l.job_id = aj.id AND l.step = 'step1'
       LEFT JOIN autopilot_job_logs l2 ON l2.job_id = aj.id AND l2.step = 'step2'
       LEFT JOIN autopilot_job_logs l3 ON l3.job_id = aj.id AND l3.step = 'step3'
       LEFT JOIN autopilot_job_logs l4 ON l4.job_id = aj.id AND l4.step = 'step4'
       WHERE aj.business_id = $1`,
      [business.id, startOfMonth]
    );

    const row = result.rows[0] || {};
    return res.json({
      enrolledThisMonth: parseInt(row.enrolled_this_month || "0"),
      quotesSent: parseInt(row.quotes_sent || "0"),
      followUpsFired: parseInt(row.follow_ups_fired || "0"),
      contractsSent: parseInt(row.contracts_sent || "0"),
      reviewsRequested: parseInt(row.reviews_requested || "0"),
    });
  } catch (err: any) {
    console.error("[autopilot] stats error:", err.message);
    return res.status(500).json({ message: "Failed to fetch stats" });
  }
});

router.post("/api/autopilot/settings", requireAuth, async (req: Request, res: Response) => {
  try {
    const { autopilotEnabled, googleReviewLink } = req.body;

    if (typeof autopilotEnabled === "boolean") {
      const user = await getUserById(req.session.userId!);
      if (!user) return res.status(404).json({ message: "User not found" });

      if (!isGrowthOrAbove(user.subscriptionTier) && !isProTier(user.subscriptionTier)) {
        return res.status(403).json({ upsell: true, message: "Upgrade to unlock Autopilot" });
      }

      await pool.query(
        `UPDATE users SET autopilot_enabled = $1 WHERE id = $2`,
        [autopilotEnabled, req.session.userId]
      );
    }

    if (typeof googleReviewLink === "string") {
      const business = await getBusinessByOwner(req.session.userId!);
      if (business) {
        await pool.query(
          `INSERT INTO growth_automation_settings (id, business_id, google_review_link, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, NOW(), NOW())
           ON CONFLICT (business_id) DO UPDATE SET google_review_link = $2, updated_at = NOW()`,
          [business.id, googleReviewLink]
        );
      }
    }

    return res.json({ message: "Settings saved" });
  } catch (err: any) {
    console.error("[autopilot] settings error:", err.message);
    return res.status(500).json({ message: "Failed to save settings" });
  }
});

router.post("/api/autopilot/checkout", requireAuth, async (req: Request, res: Response) => {
  try {
    const addonPriceId = process.env.AUTOPILOT_ADDON_PRICE_ID;
    if (!addonPriceId) return res.status(503).json({ message: "Autopilot add-on not configured" });

    const stripeClient = getStripe();
    if (!stripeClient) return res.status(503).json({ message: "Stripe not available" });

    const user = await getUserById(req.session.userId!);
    if (!user) return res.status(404).json({ message: "User not found" });

    const session = await stripeClient.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email,
      line_items: [{ price: addonPriceId, quantity: 1 }],
      success_url: `${process.env.APP_URL || "https://app.getquotepro.ai"}/autopilot?checkout=success`,
      cancel_url: `${process.env.APP_URL || "https://app.getquotepro.ai"}/autopilot`,
      metadata: { userId: req.session.userId!, type: "autopilot_addon" },
    });

    return res.json({ url: session.url });
  } catch (err: any) {
    console.error("[autopilot] checkout error:", err.message);
    return res.status(500).json({ message: "Failed to create checkout session" });
  }
});

export default router;
