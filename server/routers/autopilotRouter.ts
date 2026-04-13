import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware";
import { pool } from "../db";
import { getBusinessByOwner, getUserById } from "../storage";
import {
  enrollLead,
  processAutopilotJobs,
  enrollAllPendingIntakeRequests,
} from "../services/autopilotService";
import { isGrowthOrAbove, isProTier } from "../middleware";
import { getStripe } from "../clients";
import { trackEvent } from "../analytics";
import { AnalyticsEvents } from "../../shared/analytics-events";

const router = Router();

async function requireAutopilot(req: Request, res: Response, next: any) {
  try {
    const user = await getUserById(req.session.userId!);
    if (!user) return res.status(401).json({ message: "Not authenticated" });
    if (isProTier(user.subscriptionTier)) return next();
    if (isGrowthOrAbove(user.subscriptionTier)) return next();
    return res.status(403).json({
      upsell: true,
      message: "Upgrade to unlock Autopilot",
      requiresUpgrade: true,
    });
  } catch {
    return res.status(500).json({ message: "Subscription check failed" });
  }
}

router.post("/enroll", requireAuth, requireAutopilot, async (req: Request, res: Response) => {
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

// Manually enroll a specific intake request into autopilot (from Quote Requests page)
router.post("/enroll-intake/:intakeId", requireAuth, requireAutopilot, async (req: Request, res: Response) => {
  try {
    const { intakeId } = req.params;
    const business = await getBusinessByOwner(req.session.userId!);
    if (!business) return res.status(404).json({ message: "Business not found" });

    // Verify intake belongs to this business
    const check = await pool.query(
      `SELECT id FROM intake_requests WHERE id = $1 AND business_id = $2`,
      [intakeId, business.id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ message: "Quote request not found" });
    }

    const jobId = await enrollLead(req.session.userId!, business.id, intakeId);

    // Persist enrollment + status on the intake_requests row
    await pool.query(
      `UPDATE intake_requests 
       SET autopilot_enrolled=true, autopilot_enrolled_at=NOW(), autopilot_status='queued'
       WHERE id=$1`,
      [intakeId]
    );

    return res.json({ jobId, autopilotEnrolled: true, autopilotStatus: "queued", message: "Lead enrolled — quote being generated now" });
  } catch (err: any) {
    console.error("[autopilot] enroll-intake error:", err.message);
    return res.status(500).json({ message: "Failed to enroll lead" });
  }
});

// ─── GET /status/:intakeId — poll autopilot status for a single intake request ──
router.get("/intake-status/:intakeId", requireAuth, async (req: Request, res: Response) => {
  try {
    const business = await getBusinessByOwner(req.session.userId!);
    if (!business) return res.status(404).json({ message: "Business not found" });

    const r = await pool.query(
      `SELECT autopilot_enrolled, autopilot_status, autopilot_error,
              autopilot_enrolled_at, autopilot_quote_sent_at, quote_email_sent_at
       FROM intake_requests WHERE id=$1 AND business_id=$2`,
      [req.params.intakeId, business.id]
    );
    if (r.rows.length === 0) return res.status(404).json({ message: "Not found" });
    const row = r.rows[0];
    return res.json({
      autopilotEnrolled: row.autopilot_enrolled ?? false,
      autopilotStatus: row.autopilot_status ?? null,
      autopilotError: row.autopilot_error ?? null,
      autopilotEnrolledAt: row.autopilot_enrolled_at ?? null,
      autopilotQuoteSentAt: row.autopilot_quote_sent_at ?? null,
      quoteEmailSentAt: row.quote_email_sent_at ?? null,
    });
  } catch (err: any) {
    return res.status(500).json({ message: "Failed to fetch status" });
  }
});

// ─── POST /enroll-all-intake — bulk enroll all eligible intake requests ─────────
router.post("/enroll-all-intake", requireAuth, requireAutopilot, async (req: Request, res: Response) => {
  try {
    const business = await getBusinessByOwner(req.session.userId!);
    if (!business) return res.status(404).json({ message: "Business not found" });

    // Get all new leads that aren't already enrolled and have an email
    const leads = await pool.query(
      `SELECT id FROM intake_requests
       WHERE business_id=$1
         AND status NOT IN ('dismissed', 'converted')
         AND (autopilot_enrolled = false OR autopilot_enrolled IS NULL)
         AND customer_email IS NOT NULL AND customer_email <> ''
       ORDER BY created_at DESC LIMIT 50`,
      [business.id]
    );

    if (leads.rows.length === 0) {
      return res.json({ success: true, enrolled: 0, message: "No eligible leads to enroll" });
    }

    let enrolled = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const lead of leads.rows) {
      try {
        await pool.query(
          `UPDATE intake_requests SET autopilot_enrolled=true, autopilot_enrolled_at=NOW(), autopilot_status='queued' WHERE id=$1`,
          [lead.id]
        );
        enrollLead(req.session.userId!, business.id, lead.id).catch((err: any) => {
          console.warn(`[autopilot] bulk-enroll failed for ${lead.id}:`, err.message);
          pool.query(
            `UPDATE intake_requests SET autopilot_status='failed', autopilot_error=$1 WHERE id=$2`,
            [err.message, lead.id]
          ).catch(() => {});
        });
        enrolled++;
        // Stagger sends slightly
        await new Promise(r => setTimeout(r, 300));
      } catch (err: any) {
        skipped++;
        errors.push(`${lead.id}: ${err.message}`);
      }
    }

    return res.json({
      success: true,
      enrolled,
      skipped,
      message: `${enrolled} lead${enrolled === 1 ? "" : "s"} enrolled — quotes on the way!`,
    });
  } catch (err: any) {
    console.error("[autopilot] enroll-all-intake error:", err.message);
    return res.status(500).json({ message: "Failed to bulk enroll leads" });
  }
});

router.get("/jobs", requireAuth, requireAutopilot, async (req: Request, res: Response) => {
  try {
    const business = await getBusinessByOwner(req.session.userId!);
    if (!business) return res.status(404).json({ message: "Business not found" });

    const result = await pool.query(
      `SELECT aj.*,
              COALESCE(
                NULLIF(TRIM(c.first_name || ' ' || c.last_name), ''),
                ir.customer_name
              ) AS lead_name,
              COALESCE(c.email, ir.customer_email) AS lead_email,
              (SELECT COUNT(*) FROM autopilot_job_logs l WHERE l.job_id = aj.id) AS log_count
       FROM autopilot_jobs aj
       LEFT JOIN customers c ON c.id = aj.lead_id
       LEFT JOIN intake_requests ir ON ir.id = aj.lead_id
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

router.post("/jobs/:id/pause", requireAuth, requireAutopilot, async (req: Request, res: Response) => {
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

router.post("/jobs/:id/resume", requireAuth, requireAutopilot, async (req: Request, res: Response) => {
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

router.get("/stats", requireAuth, requireAutopilot, async (req: Request, res: Response) => {
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

    // Count bookings from new bookings table
    const bookingsRes = await pool.query(
      `SELECT COUNT(*) AS bookings_count FROM bookings WHERE user_id = $1 AND status != 'cancelled'`,
      [req.session.userId]
    );
    const bookingsCount = parseInt(bookingsRes.rows[0]?.bookings_count || "0");

    return res.json({
      enrolledThisMonth: parseInt(row.enrolled_this_month || "0"),
      quotesSent: parseInt(row.quotes_sent || "0"),
      followUpsFired: parseInt(row.follow_ups_fired || "0"),
      contractsSent: parseInt(row.contracts_sent || "0"),
      reviewsRequested: parseInt(row.reviews_requested || "0"),
      bookingsCount,
    });
  } catch (err: any) {
    console.error("[autopilot] stats error:", err.message);
    return res.status(500).json({ message: "Failed to fetch stats" });
  }
});

router.get("/settings", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await getUserById(req.session.userId!);
    if (!user) return res.status(404).json({ message: "User not found" });
    const business = await getBusinessByOwner(req.session.userId!);
    let googleReviewLink = null;
    if (business) {
      const gr = await pool.query(`SELECT google_review_link FROM growth_automation_settings WHERE business_id=$1 LIMIT 1`, [business.id]);
      googleReviewLink = gr.rows[0]?.google_review_link ?? null;
    }
    const rawUser = await pool.query(`SELECT autopilot_enabled FROM users WHERE id=$1 LIMIT 1`, [req.session.userId]);
    return res.json({ autopilotEnabled: rawUser.rows[0]?.autopilot_enabled ?? false, googleReviewLink });
  } catch (err: any) {
    return res.status(500).json({ message: "Failed to fetch settings" });
  }
});

router.post("/settings", requireAuth, async (req: Request, res: Response) => {
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

      // When toggling ON, back-enroll any existing pending quote requests
      // so they enter the pipeline immediately (fire-and-forget)
      if (autopilotEnabled) {
        trackEvent(req.session.userId!, AnalyticsEvents.AUTOPILOT_ENABLED, {}).catch(() => {});
        getBusinessByOwner(req.session.userId!).then((biz) => {
          if (biz) {
            enrollAllPendingIntakeRequests(req.session.userId!, biz.id).catch((err) =>
              console.error("[autopilot] back-enroll error:", err.message)
            );
          }
        }).catch(() => {});
      }
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

router.get("/bookings", requireAuth, async (req: Request, res: Response) => {
  try {
    const business = await getBusinessByOwner(req.session.userId!);
    if (!business) return res.status(404).json({ message: "Business not found" });

    const result = await pool.query(
      `SELECT bk.*,
              COALESCE(
                NULLIF(TRIM(c.first_name || ' ' || c.last_name), ''),
                ir.customer_name,
                bk.customer_name
              ) AS display_name,
              aj.current_step, aj.quote_amount AS job_quote_amount
       FROM bookings bk
       JOIN autopilot_jobs aj ON aj.id = bk.autopilot_job_id
       LEFT JOIN customers c ON c.id = aj.lead_id
       LEFT JOIN intake_requests ir ON ir.id = aj.lead_id
       WHERE bk.user_id = $1
       ORDER BY bk.scheduled_date DESC, bk.scheduled_time DESC
       LIMIT 100`,
      [req.session.userId]
    );

    const rows = result.rows.map((r: any) => ({
      ...r,
      customer_name: r.display_name || r.customer_name,
    }));

    return res.json(rows);
  } catch (err: any) {
    console.error("[autopilot] bookings error:", err.message);
    return res.status(500).json({ message: "Failed to fetch bookings" });
  }
});

router.post("/checkout", requireAuth, async (req: Request, res: Response) => {
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

// ─── New Quote-Request Leads (from the /request/:slug flow) ──────────────────

router.get("/leads", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const result = await pool.query(
      `SELECT id, status, contact, home, quote, quote_type,
              submission_received_at, autopilot_triggered_at,
              quote_generated_at, quote_email_sent_at,
              booking_confirmed_at, created_at
       FROM leads
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [userId]
    );
    return res.json({ leads: result.rows });
  } catch (err: any) {
    console.error("[autopilot] leads error:", err.message);
    return res.status(500).json({ message: "Failed to fetch leads" });
  }
});

// ─── Available Slots (public-accessible via separate middleware in routes.ts) ──

router.get("/available-slots", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const preferredDate = req.query.preferredDate as string | undefined;
    const { getAvailableSlots } = await import("../services/quoteRequestService");
    const slots = await getAvailableSlots(userId, preferredDate);
    return res.json({ slots });
  } catch (err: any) {
    console.error("[autopilot] available-slots error:", err.message);
    return res.status(500).json({ message: "Failed to fetch available slots" });
  }
});

// Public version — by business slug (no auth required)
export default router;
