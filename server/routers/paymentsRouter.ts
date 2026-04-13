/**
 * paymentsRouter.ts
 * All payment collection endpoints for QuotePro AI.
 * Mounts at /api/payments
 */
import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware";
import { pool } from "../db";
import { getStripe } from "../clients";
import { getBusinessByOwner } from "../storage";
import { updateBusiness } from "../helpers";
import { sendEmail, getBusinessSendParams } from "../mail";

const router = Router();

// ─── Helper: log payment event ────────────────────────────────────────────────
async function logPaymentEvent(opts: {
  jobId?: string | null;
  businessId: string;
  customerId?: string | null;
  eventType: string;
  amountCents?: number | null;
  stripeId?: string | null;
  failureReason?: string | null;
}) {
  await pool.query(
    `INSERT INTO payment_events (job_id, business_id, customer_id, event_type, amount_cents, stripe_id, failure_reason)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [opts.jobId ?? null, opts.businessId, opts.customerId ?? null, opts.eventType,
     opts.amountCents ?? null, opts.stripeId ?? null, opts.failureReason ?? null]
  );
}

// ─── Helper: charge a single job ─────────────────────────────────────────────
export async function chargeJob(jobId: string, businessId: string, idempotencyKey?: string): Promise<{ success: boolean; error?: string }> {
  const stripe = getStripe();
  if (!stripe) return { success: false, error: "Stripe not configured" };

  const jobRes = await pool.query(
    `SELECT j.*, c.stripe_customer_id, c.stripe_payment_method_id, c.has_payment_method,
            c.email as customer_email, c.first_name, c.last_name,
            q.total as quote_total
     FROM jobs j
     LEFT JOIN customers c ON c.id = j.customer_id
     LEFT JOIN quotes q ON q.id = j.quote_id
     WHERE j.id = $1 AND j.business_id = $2`,
    [jobId, businessId]
  );
  if (!jobRes.rows.length) return { success: false, error: "Job not found" };
  const job = jobRes.rows[0];

  if (job.payment_status === "charged") return { success: false, error: "Job already charged" };
  if (!job.has_payment_method || !job.stripe_payment_method_id) return { success: false, error: "No payment method on file" };

  const bizRes = await pool.query(`SELECT * FROM businesses WHERE id = $1`, [businessId]);
  const business = bizRes.rows[0];
  if (!business?.stripe_account_id || !business.stripe_onboarding_complete) {
    return { success: false, error: "Stripe Connect not configured" };
  }

  const amountCents = Math.round((job.charge_amount || job.quote_total || 0) * 100);
  if (amountCents <= 0) return { success: false, error: "Invalid charge amount" };

  try {
    const intentOpts: any = {
      amount: amountCents,
      currency: business.currency?.toLowerCase() || "usd",
      customer: job.stripe_customer_id,
      payment_method: job.stripe_payment_method_id,
      confirm: true,
      automatic_payment_methods: { enabled: false },
      description: `QuotePro job ${jobId} – ${business.company_name}`,
      metadata: { jobId, businessId },
    };

    const intent = await stripe.paymentIntents.create(intentOpts, {
      stripeAccount: business.stripe_account_id,
      idempotencyKey: idempotencyKey || `charge-${jobId}`,
    });

    await pool.query(
      `UPDATE jobs SET payment_status='charged', stripe_payment_intent_id=$1, charged_at=NOW(), charge_amount=$2, charge_failure_reason=NULL, updated_at=NOW()
       WHERE id=$3`,
      [intent.id, amountCents, jobId]
    );
    await logPaymentEvent({ jobId, businessId, customerId: job.customer_id, eventType: "charge_success", amountCents, stripeId: intent.id });

    // Send receipt email if customer has email
    if (job.customer_email) {
      const amount = (amountCents / 100).toFixed(2);
      const name = [job.first_name, job.last_name].filter(Boolean).join(" ") || "there";
      const { fromName } = getBusinessSendParams(business);
      await sendEmail({
        to: job.customer_email,
        subject: `Payment received – $${amount}`,
        html: `<p>Hi ${name},</p><p>We received your payment of <strong>$${amount}</strong> for your cleaning service. Thank you!</p><p>— ${fromName}</p>`,
        fromName,
      }).catch(() => {});
      await pool.query(`UPDATE jobs SET receipt_email_sent=true WHERE id=$1`, [jobId]);
    }

    return { success: true };
  } catch (err: any) {
    const reason = err?.message || "Unknown error";
    await pool.query(
      `UPDATE jobs SET payment_status='failed', charge_failure_reason=$1, updated_at=NOW() WHERE id=$2`,
      [reason, jobId]
    );
    await logPaymentEvent({ jobId, businessId, customerId: job.customer_id, eventType: "charge_failed", amountCents, failureReason: reason });
    return { success: false, error: reason };
  }
}

// ─── POST /api/payments/charge-job ───────────────────────────────────────────
router.post("/charge-job", requireAuth, async (req: Request, res: Response) => {
  try {
    const business = await getBusinessByOwner(req.session.userId!);
    if (!business) return res.status(400).json({ message: "Business not found" });
    const { jobId } = req.body;
    if (!jobId) return res.status(400).json({ message: "jobId required" });
    const result = await chargeJob(jobId, business.id);
    if (!result.success) return res.status(400).json({ message: result.error });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/payments/retry-charge ─────────────────────────────────────────
router.post("/retry-charge", requireAuth, async (req: Request, res: Response) => {
  try {
    const business = await getBusinessByOwner(req.session.userId!);
    if (!business) return res.status(400).json({ message: "Business not found" });
    const { jobId } = req.body;
    if (!jobId) return res.status(400).json({ message: "jobId required" });
    // Reset so charge can proceed
    await pool.query(`UPDATE jobs SET payment_status='unpaid', charge_failure_reason=NULL WHERE id=$1 AND business_id=$2`, [jobId, business.id]);
    const result = await chargeJob(jobId, business.id, `retry-${jobId}-${Date.now()}`);
    if (!result.success) return res.status(400).json({ message: result.error });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// ─── PATCH /api/payments/waive/:jobId ────────────────────────────────────────
router.patch("/waive/:jobId", requireAuth, async (req: Request, res: Response) => {
  try {
    const business = await getBusinessByOwner(req.session.userId!);
    if (!business) return res.status(400).json({ message: "Business not found" });
    const { jobId } = req.params;
    await pool.query(
      `UPDATE jobs SET payment_status='waived', updated_at=NOW() WHERE id=$1 AND business_id=$2`,
      [jobId, business.id]
    );
    await logPaymentEvent({ jobId, businessId: business.id, eventType: "waived" });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/payments/setup-intent ─────────────────────────────────────────
router.post("/setup-intent", requireAuth, async (req: Request, res: Response) => {
  try {
    const stripe = getStripe();
    if (!stripe) return res.status(503).json({ message: "Stripe not configured" });
    const business = await getBusinessByOwner(req.session.userId!);
    if (!business?.stripeAccountId || !business.stripeOnboardingComplete) {
      return res.status(400).json({ message: "Stripe Connect not configured" });
    }
    const { customerId } = req.body;
    if (!customerId) return res.status(400).json({ message: "customerId required" });

    const custRes = await pool.query(`SELECT * FROM customers WHERE id=$1 AND business_id=$2`, [customerId, business.id]);
    if (!custRes.rows.length) return res.status(404).json({ message: "Customer not found" });
    const customer = custRes.rows[0];

    let stripeCustomerId = customer.stripe_customer_id;
    if (!stripeCustomerId) {
      const sc = await stripe.customers.create(
        { name: [customer.first_name, customer.last_name].filter(Boolean).join(" "), email: customer.email || undefined, metadata: { customerId: customer.id } },
        { stripeAccount: business.stripeAccountId }
      );
      stripeCustomerId = sc.id;
      await pool.query(`UPDATE customers SET stripe_customer_id=$1 WHERE id=$2`, [stripeCustomerId, customerId]);
    }

    const intent = await stripe.setupIntents.create(
      { customer: stripeCustomerId, payment_method_types: ["card"], metadata: { customerId, businessId: business.id } },
      { stripeAccount: business.stripeAccountId }
    );

    return res.json({ clientSecret: intent.client_secret, publishableKey: await import("../stripeClient").then(m => m.getStripePublishableKey()) });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/payments/save-payment-method ───────────────────────────────────
router.post("/save-payment-method", requireAuth, async (req: Request, res: Response) => {
  try {
    const stripe = getStripe();
    if (!stripe) return res.status(503).json({ message: "Stripe not configured" });
    const business = await getBusinessByOwner(req.session.userId!);
    if (!business?.stripeAccountId) return res.status(400).json({ message: "Stripe not connected" });

    const { customerId, paymentMethodId } = req.body;
    if (!customerId || !paymentMethodId) return res.status(400).json({ message: "customerId and paymentMethodId required" });

    const pm = await stripe.paymentMethods.retrieve(paymentMethodId, { stripeAccount: business.stripeAccountId });
    await pool.query(
      `UPDATE customers SET stripe_payment_method_id=$1, has_payment_method=true, payment_method_last4=$2, payment_method_brand=$3, updated_at=NOW()
       WHERE id=$4 AND business_id=$5`,
      [paymentMethodId, pm.card?.last4 ?? null, pm.card?.brand ?? null, customerId, business.id]
    );
    await logPaymentEvent({ businessId: business.id, customerId, eventType: "card_added" });
    return res.json({ success: true, last4: pm.card?.last4, brand: pm.card?.brand });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/payments/send-card-request ────────────────────────────────────
router.post("/send-card-request", requireAuth, async (req: Request, res: Response) => {
  try {
    const business = await getBusinessByOwner(req.session.userId!);
    if (!business) return res.status(400).json({ message: "Business not found" });
    const { customerId } = req.body;
    const custRes = await pool.query(`SELECT * FROM customers WHERE id=$1 AND business_id=$2`, [customerId, business.id]);
    if (!custRes.rows.length) return res.status(404).json({ message: "Customer not found" });
    const customer = custRes.rows[0];
    if (!customer.email) return res.status(400).json({ message: "Customer has no email" });

    const domain = process.env.REPLIT_DOMAINS?.split(",")[0]
      ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
      : "https://app.getquotepro.ai";
    const { fromName } = getBusinessSendParams(business);
    const name = [customer.first_name, customer.last_name].filter(Boolean).join(" ") || "there";
    await sendEmail({
      to: customer.email,
      subject: `${business.companyName || business.company_name} — Save your card for easy payment`,
      html: `<p>Hi ${name},</p><p>${business.companyName || business.company_name} would like to save a payment method on file to streamline your future cleaning payments.</p><p>This is a secure, one-time setup. Your card will only be charged after each service.</p><p><a href="${domain}/portal" style="display:inline-block;padding:12px 24px;background:#16a34a;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">Save Payment Method</a></p><p style="color:#64748b;font-size:13px;">If you have questions, reply to this email.</p><p>— ${fromName}</p>`,
      fromName,
    });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/payments/stripe-connect-status ──────────────────────────────────
router.get("/stripe-connect-status", requireAuth, async (req: Request, res: Response) => {
  try {
    const stripe = getStripe();
    const business = await getBusinessByOwner(req.session.userId!);
    if (!business?.stripeAccountId) return res.json({ connected: false });
    if (!stripe) return res.json({ connected: !!business.stripeOnboardingComplete, accountId: business.stripeAccountId });

    const account = await stripe.accounts.retrieve(business.stripeAccountId);
    return res.json({
      connected: true,
      accountId: business.stripeAccountId,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      displayName: (account as any).business_profile?.name || account.email,
      country: account.country,
      currency: account.default_currency,
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/payments/finance-snapshot ───────────────────────────────────────
router.get("/finance-snapshot", requireAuth, async (req: Request, res: Response) => {
  try {
    const business = await getBusinessByOwner(req.session.userId!);
    if (!business) return res.status(400).json({ message: "Business not found" });

    const snapshot = await buildFinanceSnapshot(business.id, business);
    return res.json(snapshot);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/payments/audit ───────────────────────────────────────────────────
router.get("/audit", requireAuth, async (req: Request, res: Response) => {
  try {
    const business = await getBusinessByOwner(req.session.userId!);
    if (!business) return res.status(400).json({ message: "Business not found" });

    const [failed, uncharged, missingCard, navBadge] = await Promise.all([
      // Failed charges
      pool.query(
        `SELECT j.id, j.charge_failure_reason, j.charge_amount, j.charged_at, j.start_datetime,
                c.first_name, c.last_name, c.email, c.has_payment_method,
                q.total as quote_total
         FROM jobs j
         LEFT JOIN customers c ON c.id = j.customer_id
         LEFT JOIN quotes q ON q.id = j.quote_id
         WHERE j.business_id=$1 AND j.payment_status='failed'
         ORDER BY j.start_datetime DESC LIMIT 100`,
        [business.id]
      ),
      // Uncharged completed jobs 7+ days old
      pool.query(
        `SELECT j.id, j.start_datetime, j.payment_status,
                c.first_name, c.last_name, c.email, c.has_payment_method,
                q.total as quote_total
         FROM jobs j
         LEFT JOIN customers c ON c.id = j.customer_id
         LEFT JOIN quotes q ON q.id = j.quote_id
         WHERE j.business_id=$1 AND j.status='completed'
           AND j.payment_status='unpaid'
           AND j.start_datetime < NOW() - INTERVAL '7 days'
         ORDER BY j.start_datetime DESC LIMIT 100`,
        [business.id]
      ),
      // Customers without payment method
      pool.query(
        `SELECT id, first_name, last_name, email, phone
         FROM customers
         WHERE business_id=$1 AND has_payment_method=false AND deleted_at IS NULL
           AND (email IS NOT NULL AND email <> '')
         ORDER BY created_at DESC LIMIT 100`,
        [business.id]
      ),
      // Nav badge count
      pool.query(
        `SELECT COUNT(*) as count FROM jobs
         WHERE business_id=$1 AND (
           payment_status='failed' OR (
             status='completed' AND payment_status='unpaid' AND start_datetime < NOW() - INTERVAL '7 days'
           )
         )`,
        [business.id]
      ),
    ]);

    return res.json({
      failed: failed.rows,
      uncharged: uncharged.rows,
      missingCard: missingCard.rows,
      badgeCount: parseInt(navBadge.rows[0]?.count || "0"),
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/payments/auto-charge-settings ────────────────────────────────────
router.get("/auto-charge-settings", requireAuth, async (req: Request, res: Response) => {
  try {
    const business = await getBusinessByOwner(req.session.userId!);
    if (!business) return res.status(400).json({ message: "Business not found" });
    const r = await pool.query(
      `SELECT auto_charge_enabled, auto_charge_time, auto_charge_timezone, auto_charge_last_run_at FROM businesses WHERE id=$1`,
      [business.id]
    );
    const row = r.rows[0] || {};
    return res.json({
      enabled: row.auto_charge_enabled ?? false,
      time: row.auto_charge_time ?? "17:00",
      timezone: row.auto_charge_timezone ?? "America/New_York",
      lastRunAt: row.auto_charge_last_run_at ?? null,
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// ─── PATCH /api/payments/auto-charge-settings ─────────────────────────────────
router.patch("/auto-charge-settings", requireAuth, async (req: Request, res: Response) => {
  try {
    const business = await getBusinessByOwner(req.session.userId!);
    if (!business) return res.status(400).json({ message: "Business not found" });
    const { enabled, time, timezone } = req.body;
    await pool.query(
      `UPDATE businesses SET auto_charge_enabled=$1, auto_charge_time=$2, auto_charge_timezone=$3, updated_at=NOW() WHERE id=$4`,
      [!!enabled, time || "17:00", timezone || "America/New_York", business.id]
    );
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/payments/auto-charge-run — manual trigger ─────────────────────
router.post("/auto-charge-run", requireAuth, async (req: Request, res: Response) => {
  try {
    const business = await getBusinessByOwner(req.session.userId!);
    if (!business) return res.status(400).json({ message: "Business not found" });
    const { runAutoChargeForBusiness } = await import("../cron/autoCharge");
    const result = await runAutoChargeForBusiness(business.id);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// ─── Exported snapshot builder (used by AI router too) ───────────────────────
export async function buildFinanceSnapshot(businessId: string, business: any) {
  const [jobs90, recentEvents, summary] = await Promise.all([
    pool.query(
      `SELECT j.id, j.status, j.payment_status, j.charge_amount, j.charged_at, j.start_datetime,
              j.charge_failure_reason, j.receipt_email_sent,
              c.first_name, c.last_name, c.has_payment_method,
              q.total as quote_total
       FROM jobs j
       LEFT JOIN customers c ON c.id = j.customer_id
       LEFT JOIN quotes q ON q.id = j.quote_id
       WHERE j.business_id=$1 AND j.start_datetime > NOW() - INTERVAL '90 days'
       ORDER BY j.start_datetime DESC`,
      [businessId]
    ),
    pool.query(
      `SELECT event_type, amount_cents, created_at FROM payment_events
       WHERE business_id=$1 ORDER BY created_at DESC LIMIT 50`,
      [businessId]
    ),
    pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE payment_status='charged') as total_charged_count,
         COALESCE(SUM(charge_amount) FILTER (WHERE payment_status='charged'), 0) as total_collected_cents,
         COUNT(*) FILTER (WHERE payment_status='failed') as total_failed_count,
         COUNT(*) FILTER (WHERE status='completed' AND payment_status='unpaid') as total_uncharged_count,
         COALESCE(SUM(COALESCE(charge_amount, q.total*100)) FILTER (WHERE status='completed' AND payment_status='unpaid'), 0) as uncharged_value_cents
       FROM jobs j
       LEFT JOIN quotes q ON q.id = j.quote_id
       WHERE j.business_id=$1 AND j.start_datetime > NOW() - INTERVAL '90 days'`,
      [businessId]
    ),
  ]);

  const s = summary.rows[0];
  return {
    period: "90 days",
    totalCollected: Math.round(s.total_collected_cents / 100),
    totalCollectedCount: parseInt(s.total_charged_count),
    totalFailed: parseInt(s.total_failed_count),
    totalUncharged: parseInt(s.total_uncharged_count),
    unchargedValue: Math.round(s.uncharged_value_cents / 100),
    jobs: jobs90.rows,
    recentEvents: recentEvents.rows,
    companyName: business.company_name || business.companyName,
  };
}

// ─── POST /api/payments/webhook/stripe — connected account events ─────────────
// Register this URL in Stripe Connect settings for connected account events.
// Express delivery: raw body required — ensure this is mounted BEFORE body-parser.
router.post("/webhook/stripe", async (req: Request, res: Response) => {
  const connectedAccountId = req.headers["stripe-account"] as string | undefined;
  const payload = (req as any).rawBody || req.body;

  try {
    const stripe = getStripe();
    if (!stripe) return res.status(503).send("Stripe not configured");

    let event: any;
    const sig = req.headers["stripe-signature"];
    const secret = process.env.STRIPE_WEBHOOK_SECRET;

    if (sig && secret) {
      try {
        event = stripe.webhooks.constructEvent(
          typeof payload === "string" ? payload : JSON.stringify(payload),
          sig,
          secret
        );
      } catch {
        event = typeof payload === "string" ? JSON.parse(payload) : payload;
      }
    } else {
      event = typeof payload === "string" ? JSON.parse(payload) : payload;
    }

    const { type, data } = event;
    const obj = data?.object;

    if (!obj) return res.json({ received: true });

    if (type === "payment_intent.succeeded") {
      const intentId = obj.id;
      const amountCents = obj.amount_received;
      await pool.query(
        `UPDATE jobs SET payment_status='charged', charged_at=NOW(), charge_amount=$1, charge_failure_reason=NULL
         WHERE stripe_payment_intent_id=$2`,
        [amountCents, intentId]
      );
      const jobRes = await pool.query(`SELECT id, business_id, customer_id FROM jobs WHERE stripe_payment_intent_id=$1`, [intentId]);
      if (jobRes.rows.length) {
        const j = jobRes.rows[0];
        await logPaymentEvent({ jobId: j.id, businessId: j.business_id, customerId: j.customer_id, eventType: "charge_success", amountCents, stripeId: intentId });
      }
    }

    if (type === "payment_intent.payment_failed") {
      const intentId = obj.id;
      const reason = obj.last_payment_error?.message || "Payment failed";
      await pool.query(
        `UPDATE jobs SET payment_status='failed', charge_failure_reason=$1
         WHERE stripe_payment_intent_id=$2`,
        [reason, intentId]
      );
      const jobRes = await pool.query(`SELECT id, business_id, customer_id FROM jobs WHERE stripe_payment_intent_id=$1`, [intentId]);
      if (jobRes.rows.length) {
        const j = jobRes.rows[0];
        await logPaymentEvent({ jobId: j.id, businessId: j.business_id, customerId: j.customer_id, eventType: "charge_failed", failureReason: reason, stripeId: intentId });
      }
    }

    if (type === "charge.refunded") {
      const chargeId = obj.id;
      const amountRefunded = obj.amount_refunded;
      // Find job by payment intent
      const intentId = obj.payment_intent;
      if (intentId) {
        const jobRes = await pool.query(`SELECT id, business_id, customer_id FROM jobs WHERE stripe_payment_intent_id=$1`, [intentId]);
        if (jobRes.rows.length) {
          const j = jobRes.rows[0];
          await logPaymentEvent({ jobId: j.id, businessId: j.business_id, customerId: j.customer_id, eventType: "refund", amountCents: amountRefunded, stripeId: chargeId });
        }
      }
    }

    if (type === "payment_method.attached" || type === "setup_intent.succeeded") {
      const pm = type === "payment_method.attached" ? obj : null;
      const setupIntent = type === "setup_intent.succeeded" ? obj : null;
      const customerId = pm?.customer || setupIntent?.customer;
      const pmId = pm?.id || setupIntent?.payment_method;
      const metadata = setupIntent?.metadata || pm?.metadata || {};
      const appCustomerId = metadata.customerId;

      if (appCustomerId && pmId) {
        let brand: string | null = null;
        let last4: string | null = null;
        if (stripe && connectedAccountId) {
          try {
            const pmDetails = await stripe.paymentMethods.retrieve(pmId, { stripeAccount: connectedAccountId });
            brand = pmDetails.card?.brand || null;
            last4 = pmDetails.card?.last4 || null;
          } catch {}
        }
        await pool.query(
          `UPDATE customers SET stripe_payment_method_id=$1, has_payment_method=true, payment_method_brand=$2, payment_method_last4=$3
           WHERE id=$4`,
          [pmId, brand, last4, appCustomerId]
        );
        const bizRes = await pool.query(`SELECT id FROM businesses WHERE stripe_account_id=$1`, [connectedAccountId]);
        if (bizRes.rows.length) {
          await logPaymentEvent({ businessId: bizRes.rows[0].id, customerId: appCustomerId, eventType: "card_added", stripeId: pmId });
        }
      }
    }

    return res.json({ received: true });
  } catch (err: any) {
    console.error("[stripe-webhook]", err.message);
    return res.status(400).send(`Webhook error: ${err.message}`);
  }
});

export default router;
