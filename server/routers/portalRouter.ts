import { Router, Request, Response } from "express";
import { pool } from "../db";
import { getPublicBaseUrl } from "../clients";
import crypto from "crypto";

const router = Router();

// ─── DB Init ─────────────────────────────────────────────────────────────────

export async function initPortalTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customer_portals (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        customer_id VARCHAR(36) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        business_id VARCHAR(36) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        token VARCHAR(64) UNIQUE NOT NULL,
        preferences JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_viewed_at TIMESTAMPTZ,
        view_count INTEGER NOT NULL DEFAULT 0,
        UNIQUE(customer_id, business_id)
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reschedule_requests (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        portal_token VARCHAR(64) NOT NULL,
        job_id VARCHAR(36) REFERENCES jobs(id) ON DELETE SET NULL,
        requested_date TEXT NOT NULL,
        preferred_time TEXT NOT NULL DEFAULT 'either',
        customer_note TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS portal_enabled BOOLEAN NOT NULL DEFAULT TRUE`);
    await pool.query(`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS portal_color TEXT`);
    await pool.query(`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS portal_welcome_message TEXT`);
    // Tips infrastructure
    await pool.query(`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS tips_enabled BOOLEAN NOT NULL DEFAULT FALSE`);
    await pool.query(`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS tip_percentage_options JSONB DEFAULT '[18, 22, 25]'`);
    await pool.query(`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS tip_distribution_percent INTEGER DEFAULT 100`);
    await pool.query(`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS tip_request_delay INTEGER DEFAULT 2`);
    await pool.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS tip_token VARCHAR(64)`);
    await pool.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS tip_amount NUMERIC(10,2)`);
    await pool.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS tip_request_sent_at TIMESTAMPTZ`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tips (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        job_id VARCHAR(36) NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        business_id VARCHAR(36) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        customer_id VARCHAR(36),
        amount NUMERIC(10,2) NOT NULL,
        percentage NUMERIC(5,2),
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        stripe_session_id TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        paid_at TIMESTAMPTZ
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_tips_job_id ON tips(job_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_jobs_tip_token ON jobs(tip_token)`);
    console.log("[portal] Tables ready");
  } catch (e: any) {
    console.error("[portal] initPortalTables error:", e.message);
  }
}

// ─── Token Utilities ──────────────────────────────────────────────────────────

export async function getOrCreatePortalToken(customerId: string, businessId: string): Promise<string> {
  const existing = await pool.query(
    `SELECT token FROM customer_portals WHERE customer_id = $1 AND business_id = $2 LIMIT 1`,
    [customerId, businessId]
  );
  if (existing.rows[0]) return existing.rows[0].token;

  const token = crypto.randomBytes(32).toString("hex");
  const result = await pool.query(
    `INSERT INTO customer_portals (customer_id, business_id, token)
     VALUES ($1, $2, $3)
     ON CONFLICT (customer_id, business_id) DO UPDATE SET token = customer_portals.token
     RETURNING token`,
    [customerId, businessId, token]
  );
  return result.rows[0].token;
}

export async function backfillPortalTokens() {
  try {
    const customers = await pool.query(
      `SELECT id, business_id FROM customers
       WHERE deleted_at IS NULL
         AND id NOT IN (SELECT customer_id FROM customer_portals)`
    );
    let count = 0;
    for (const c of customers.rows) {
      await getOrCreatePortalToken(c.id, c.business_id).catch(() => {});
      count++;
    }
    if (count > 0) console.log(`[portal] Backfilled ${count} customer portal tokens`);
  } catch (e: any) {
    console.error("[portal] backfill error:", e.message);
  }
}

// Get portal token for a customer (used by other routers)
export async function getPortalTokenForCustomer(customerId: string, businessId: string): Promise<string | null> {
  try {
    return await getOrCreatePortalToken(customerId, businessId);
  } catch {
    return null;
  }
}

// ─── GET /api/portal/:token — main data endpoint ──────────────────────────────

router.get("/api/portal/:token", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const portalResult = await pool.query(
      `SELECT cp.id, cp.customer_id, cp.business_id, cp.token, cp.preferences, cp.view_count,
              c.first_name, c.last_name, c.phone AS customer_phone, c.address,
              b.company_name, b.phone AS business_phone, b.logo_uri, b.primary_color,
              b.sender_name, b.portal_enabled, b.portal_color, b.portal_welcome_message,
              COALESCE(b.tips_enabled, false) AS tips_enabled
       FROM customer_portals cp
       JOIN customers c ON cp.customer_id = c.id
       JOIN businesses b ON cp.business_id = b.id
       WHERE cp.token = $1 LIMIT 1`,
      [token]
    );

    if (!portalResult.rows[0]) {
      return res.status(404).json({ message: "Portal not found" });
    }

    const p = portalResult.rows[0];

    if (p.portal_enabled === false) {
      return res.status(403).json({ message: "Portal disabled", businessName: p.company_name });
    }

    // Update view stats (non-blocking)
    pool.query(
      `UPDATE customer_portals SET last_viewed_at = NOW(), view_count = view_count + 1 WHERE token = $1`,
      [token]
    ).catch(() => {});

    const { customer_id: customerId, business_id: businessId } = p;
    const nowIso = new Date().toISOString();

    // Fetch next job, upcoming, last job, history in parallel
    const [nextJobResult, upcomingJobsResult, lastJobResult, historyResult, recurrenceResult] =
      await Promise.all([
        pool.query(
          `SELECT j.id, j.job_type, j.status, j.detailed_status, j.start_datetime, j.end_datetime,
                  j.team_members,
                  (SELECT json_build_object('id', e.id, 'name', e.name)
                   FROM employees e WHERE e.id = (j.team_members->>0) LIMIT 1) AS first_cleaner
           FROM jobs j
           WHERE j.customer_id = $1 AND j.business_id = $2
             AND j.status NOT IN ('completed', 'canceled')
             AND j.start_datetime >= $3
             AND j.skipped IS NOT TRUE
           ORDER BY j.start_datetime ASC LIMIT 1`,
          [customerId, businessId, nowIso]
        ),
        pool.query(
          `SELECT j.id, j.job_type, j.start_datetime, j.team_members,
                  (SELECT json_build_object('id', e.id, 'name', e.name)
                   FROM employees e WHERE e.id = (j.team_members->>0) LIMIT 1) AS first_cleaner
           FROM jobs j
           WHERE j.customer_id = $1 AND j.business_id = $2
             AND j.status NOT IN ('completed', 'canceled')
             AND j.start_datetime >= $3
             AND j.skipped IS NOT TRUE
           ORDER BY j.start_datetime ASC LIMIT 4`,
          [customerId, businessId, nowIso]
        ),
        pool.query(
          `SELECT j.id, j.job_type, j.completed_at, j.total, j.satisfaction_rating,
                  j.tip_amount, j.tip_token, j.team_members,
                  (SELECT json_build_object('id', e.id, 'name', e.name)
                   FROM employees e WHERE e.id = (j.team_members->>0) LIMIT 1) AS first_cleaner
           FROM jobs j
           WHERE j.customer_id = $1 AND j.business_id = $2 AND j.status = 'completed'
           ORDER BY j.completed_at DESC LIMIT 1`,
          [customerId, businessId]
        ),
        pool.query(
          `SELECT j.id, j.job_type, j.start_datetime, j.completed_at, j.total,
                  j.satisfaction_rating, j.tip_amount,
                  (SELECT COUNT(*) FROM job_photos jp
                   WHERE jp.job_id = j.id AND jp.customer_visible = true) AS photo_count
           FROM jobs j
           WHERE j.customer_id = $1 AND j.business_id = $2 AND j.status = 'completed'
           ORDER BY j.completed_at DESC LIMIT 10`,
          [customerId, businessId]
        ),
        pool.query(
          `SELECT recurrence FROM jobs
           WHERE customer_id = $1 AND business_id = $2 AND recurrence != 'none'
           ORDER BY created_at DESC LIMIT 1`,
          [customerId, businessId]
        ),
      ]);

    const lastJobRow = lastJobResult.rows[0];

    // Fetch photos + tip status for last job
    let lastJobPhotos: any[] = [];
    let tipPaid: { amount: number } | null = null;
    if (lastJobRow) {
      const [photosResult, tipResult] = await Promise.all([
        pool.query(
          `SELECT id, photo_url, photo_type, caption
           FROM job_photos WHERE job_id = $1 AND customer_visible = true
           ORDER BY created_at ASC`,
          [lastJobRow.id]
        ),
        pool.query(
          `SELECT amount FROM tips WHERE job_id = $1 AND status = 'paid' LIMIT 1`,
          [lastJobRow.id]
        ).catch(() => ({ rows: [] as any[] })),
      ]);
      lastJobPhotos = photosResult.rows;
      if (tipResult.rows[0]) tipPaid = { amount: parseFloat(tipResult.rows[0].amount) };
    }

    const nextJobRow = nextJobResult.rows[0];
    const upcomingRows = upcomingJobsResult.rows;

    // Skip the first row from upcoming if it's the same as nextJob
    const upcomingJobs = upcomingRows
      .filter((j: any) => !nextJobRow || j.id !== nextJobRow.id)
      .slice(0, 3)
      .map((j: any) => ({
        id: j.id,
        startDatetime: j.start_datetime,
        jobType: j.job_type,
        assignedCleaner: j.first_cleaner
          ? { firstName: (j.first_cleaner.name || "").split(" ")[0] }
          : null,
      }));

    return res.json({
      customer: {
        firstName: p.first_name,
        lastName: p.last_name,
        address: p.address,
        phone: p.customer_phone,
        preferences: p.preferences || null,
      },
      business: {
        name: p.company_name,
        phone: p.business_phone,
        logoUrl: p.logo_uri || null,
        primaryColor: p.portal_color || p.primary_color || "#2563EB",
        senderName: p.sender_name,
        tipsEnabled: !!p.tips_enabled,
        welcomeMessage: p.portal_welcome_message || null,
      },
      nextJob: nextJobRow
        ? {
            id: nextJobRow.id,
            startDatetime: nextJobRow.start_datetime,
            jobType: nextJobRow.job_type,
            status: nextJobRow.status,
            detailedStatus: nextJobRow.detailed_status,
            assignedCleaner: nextJobRow.first_cleaner
              ? {
                  firstName: (nextJobRow.first_cleaner.name || "").split(" ")[0],
                  photoUrl: null,
                  bio: null,
                }
              : null,
          }
        : null,
      lastJob: lastJobRow
        ? {
            id: lastJobRow.id,
            completedAt: lastJobRow.completed_at,
            jobType: lastJobRow.job_type,
            total: lastJobRow.total,
            assignedCleaner: lastJobRow.first_cleaner
              ? {
                  firstName: (lastJobRow.first_cleaner.name || "").split(" ")[0],
                  photoUrl: null,
                }
              : null,
            photos: lastJobPhotos.map((ph: any) => ({
              id: ph.id,
              photoUrl: ph.photo_url,
              photoType: ph.photo_type,
              caption: ph.caption,
            })),
            satisfactionRating: lastJobRow.satisfaction_rating,
            tipAmount: tipPaid?.amount ?? null,
            tipToken: lastJobRow.tip_token,
          }
        : null,
      upcomingJobs,
      jobHistory: historyResult.rows.map((j: any) => ({
        id: j.id,
        startDatetime: j.start_datetime,
        completedAt: j.completed_at,
        jobType: j.job_type,
        total: j.total,
        photoCount: parseInt(j.photo_count || "0", 10),
        satisfactionRating: j.satisfaction_rating,
        tipAmount: j.tip_amount,
      })),
      recurrence: recurrenceResult.rows[0]?.recurrence || null,
      portalToken: token,
      viewCount: (p.view_count || 0) + 1,
    });
  } catch (e: any) {
    console.error("[portal] GET /api/portal/:token error:", e.message);
    return res.status(500).json({ message: "Failed to load portal" });
  }
});

// ─── PUT /api/portal/:token/preferences ──────────────────────────────────────

router.put("/api/portal/:token/preferences", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { preferences } = req.body;

    const result = await pool.query(
      `UPDATE customer_portals SET preferences = $1 WHERE token = $2 RETURNING id`,
      [JSON.stringify(preferences), token]
    );
    if (!result.rows[0]) return res.status(404).json({ message: "Portal not found" });
    return res.json({ success: true });
  } catch (e: any) {
    console.error("[portal] PUT preferences error:", e.message);
    return res.status(500).json({ message: "Failed to save preferences" });
  }
});

// ─── POST /api/portal/:token/reschedule ──────────────────────────────────────

router.post("/api/portal/:token/reschedule", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { jobId, requestedDate, preferredTime = "either", customerNote = "" } = req.body;

    if (!requestedDate) return res.status(400).json({ message: "Requested date is required" });

    const portal = await pool.query(
      `SELECT cp.customer_id, cp.business_id, c.first_name,
              b.company_name, b.owner_user_id
       FROM customer_portals cp
       JOIN customers c ON cp.customer_id = c.id
       JOIN businesses b ON cp.business_id = b.id
       WHERE cp.token = $1 LIMIT 1`,
      [token]
    );
    if (!portal.rows[0]) return res.status(404).json({ message: "Portal not found" });

    await pool.query(
      `INSERT INTO reschedule_requests (portal_token, job_id, requested_date, preferred_time, customer_note)
       VALUES ($1, $2, $3, $4, $5)`,
      [token, jobId || null, requestedDate, preferredTime, customerNote]
    );

    const p = portal.rows[0];
    // Log reschedule request for business owner visibility
    console.log(`[portal] Reschedule request from ${p.first_name} for date ${requestedDate}, time: ${preferredTime}`);

    return res.json({ success: true });
  } catch (e: any) {
    console.error("[portal] POST reschedule error:", e.message);
    return res.status(500).json({ message: "Failed to submit reschedule request" });
  }
});

// ─── POST /api/portal/:token/rate ────────────────────────────────────────────

router.post("/api/portal/:token/rate", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { jobId, rating } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be 1-5" });
    }

    const portal = await pool.query(
      `SELECT customer_id, business_id FROM customer_portals WHERE token = $1 LIMIT 1`,
      [token]
    );
    if (!portal.rows[0]) return res.status(404).json({ message: "Portal not found" });

    const { customer_id: customerId, business_id: businessId } = portal.rows[0];

    const job = await pool.query(
      `SELECT id FROM jobs WHERE id = $1 AND customer_id = $2 AND business_id = $3 LIMIT 1`,
      [jobId, customerId, businessId]
    );
    if (!job.rows[0]) return res.status(403).json({ message: "Not authorized" });

    await pool.query(`UPDATE jobs SET satisfaction_rating = $1 WHERE id = $2`, [rating, jobId]);
    return res.json({ success: true });
  } catch (e: any) {
    console.error("[portal] POST rate error:", e.message);
    return res.status(500).json({ message: "Failed to save rating" });
  }
});

// ─── POST /api/portal/send-link (auth required) ───────────────────────────────

router.post("/api/portal/send-link", async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any)?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { customerId } = req.body;
    if (!customerId) return res.status(400).json({ message: "customerId is required" });

    const biz = await pool.query(
      `SELECT id, company_name FROM businesses WHERE owner_user_id = $1 LIMIT 1`,
      [userId]
    );
    if (!biz.rows[0]) return res.status(404).json({ message: "Business not found" });

    const business = biz.rows[0];

    const cust = await pool.query(
      `SELECT id, first_name, phone FROM customers WHERE id = $1 AND business_id = $2 LIMIT 1`,
      [customerId, business.id]
    );
    if (!cust.rows[0]) return res.status(404).json({ message: "Customer not found" });

    const customer = cust.rows[0];
    if (!customer.phone) return res.status(400).json({ message: "Customer has no phone number on file" });

    const token = await getOrCreatePortalToken(customerId, business.id);
    const portalUrl = `${getPublicBaseUrl(req)}/home/${token}`;

    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

    if (!twilioSid || !twilioToken || !twilioFrom) {
      // Return the URL anyway so the owner can share it manually
      return res.json({ success: true, portalUrl, smsSent: false });
    }

    const msg = `Hi ${customer.first_name}! ${business.company_name} has set up your personal cleaning portal. View your upcoming cleans, photos & more: ${portalUrl}`;
    const toPhone = customer.phone.replace(/\D/g, "");
    const normalizedPhone = toPhone.startsWith("1") ? `+${toPhone}` : `+1${toPhone}`;

    const twilioRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ From: twilioFrom, To: normalizedPhone, Body: msg }).toString(),
      }
    );

    return res.json({ success: true, portalUrl, smsSent: twilioRes.ok });
  } catch (e: any) {
    console.error("[portal] send-link error:", e.message);
    return res.status(500).json({ message: "Failed to send portal link" });
  }
});

// ─── GET /api/portal/customer/:customerId/preferences (auth required) ────────

router.get("/api/portal/customer/:customerId/preferences", async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any)?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const biz = await pool.query(
      `SELECT id FROM businesses WHERE owner_user_id = $1 LIMIT 1`,
      [userId]
    );
    if (!biz.rows[0]) return res.status(404).json({ message: "Business not found" });

    const result = await pool.query(
      `SELECT preferences, token FROM customer_portals
       WHERE customer_id = $1 AND business_id = $2 LIMIT 1`,
      [req.params.customerId, biz.rows[0].id]
    );

    if (!result.rows[0]) return res.json({ preferences: null, token: null });
    return res.json({
      preferences: result.rows[0].preferences || null,
      token: result.rows[0].token,
    });
  } catch (e: any) {
    return res.status(500).json({ message: "Failed to load preferences" });
  }
});

// ─── GET /portal-manifest/:token — PWA manifest ───────────────────────────────

router.get("/portal-manifest/:token", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const result = await pool.query(
      `SELECT b.company_name, b.logo_uri, b.portal_color, b.primary_color
       FROM customer_portals cp JOIN businesses b ON cp.business_id = b.id
       WHERE cp.token = $1 LIMIT 1`,
      [token]
    );

    const b = result.rows[0];
    const name = b ? `${b.company_name} Portal` : "My Cleaning Portal";
    const color = b ? (b.portal_color || b.primary_color || "#2563EB") : "#2563EB";
    const icon = b?.logo_uri || null;

    const manifest: Record<string, any> = {
      name,
      short_name: "My Cleaning",
      start_url: `/home/${token}`,
      display: "standalone",
      background_color: "#ffffff",
      theme_color: color,
      icons: icon
        ? [{ src: icon, sizes: "192x192", type: "image/png" }]
        : [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    };

    res.setHeader("Content-Type", "application/manifest+json");
    return res.json(manifest);
  } catch (e: any) {
    console.error("[portal] manifest error:", e.message);
    return res.status(500).json({});
  }
});

// ─── GET /api/portal-stats (auth required) ────────────────────────────────────

router.get("/api/portal-stats", async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any)?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const biz = await pool.query(
      `SELECT id FROM businesses WHERE owner_user_id = $1 LIMIT 1`,
      [userId]
    );
    if (!biz.rows[0]) return res.status(404).json({ message: "Business not found" });

    const businessId = biz.rows[0].id;

    const stats = await pool.query(
      `SELECT
         COUNT(*) AS total_portals,
         COUNT(CASE WHEN last_viewed_at IS NOT NULL THEN 1 END) AS viewed_portals,
         COUNT(CASE WHEN last_viewed_at >= NOW() - INTERVAL '30 days' THEN 1 END) AS viewed_this_month,
         (SELECT c.first_name || ' ' || c.last_name
          FROM customer_portals cp2 JOIN customers c ON cp2.customer_id = c.id
          WHERE cp2.business_id = $1 AND cp2.view_count > 0
          ORDER BY cp2.view_count DESC LIMIT 1) AS most_viewed
       FROM customer_portals WHERE business_id = $1`,
      [businessId]
    );

    const s = stats.rows[0];
    return res.json({
      totalPortals: parseInt(s.total_portals || "0", 10),
      viewedPortals: parseInt(s.viewed_portals || "0", 10),
      viewedThisMonth: parseInt(s.viewed_this_month || "0", 10),
      mostViewed: s.most_viewed || null,
    });
  } catch (e: any) {
    console.error("[portal] stats error:", e.message);
    return res.status(500).json({ message: "Failed to load stats" });
  }
});

// ─── GET /api/portal-settings (auth required) ────────────────────────────────

router.get("/api/portal-settings", async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any)?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const result = await pool.query(
      `SELECT portal_enabled, portal_color, portal_welcome_message
       FROM businesses WHERE owner_user_id = $1 LIMIT 1`,
      [userId]
    );

    const r = result.rows[0];
    return res.json({
      portalEnabled: r?.portal_enabled !== false,
      portalColor: r?.portal_color || "",
      portalWelcomeMessage: r?.portal_welcome_message || "",
    });
  } catch (e: any) {
    return res.status(500).json({ message: "Failed to load portal settings" });
  }
});

// ─── PUT /api/portal-settings (auth required) ────────────────────────────────

router.put("/api/portal-settings", async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any)?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { portalEnabled, portalColor, portalWelcomeMessage } = req.body;

    await pool.query(
      `UPDATE businesses SET
         portal_enabled = COALESCE($1, portal_enabled),
         portal_color = COALESCE($2, portal_color),
         portal_welcome_message = COALESCE($3, portal_welcome_message)
       WHERE owner_user_id = $4`,
      [
        portalEnabled !== undefined ? portalEnabled : null,
        portalColor !== undefined ? (portalColor || null) : null,
        portalWelcomeMessage !== undefined ? portalWelcomeMessage : null,
        userId,
      ]
    );

    return res.json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ message: "Failed to save portal settings" });
  }
});

export default router;
