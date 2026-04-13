/**
 * autoCharge.ts
 * Auto-charge cron: runs every minute, fires at business-configured time/tz.
 */
import { pool } from "../db";
import { chargeJob } from "../routers/paymentsRouter";
import { sendEmail, getBusinessSendParams } from "../mail";

export async function runAutoChargeForBusiness(businessId: string): Promise<{
  attempted: number; charged: number; failed: number; totalCents: number;
}> {
  const bizRes = await pool.query(`SELECT * FROM businesses WHERE id=$1`, [businessId]);
  const business = bizRes.rows[0];
  if (!business) return { attempted: 0, charged: 0, failed: 0, totalCents: 0 };

  // Find all completed, unpaid jobs with payment method on file
  const jobsRes = await pool.query(
    `SELECT j.id, j.charge_amount, q.total as quote_total
     FROM jobs j
     LEFT JOIN customers c ON c.id = j.customer_id
     LEFT JOIN quotes q ON q.id = j.quote_id
     WHERE j.business_id=$1
       AND j.status='completed'
       AND j.payment_status='unpaid'
       AND c.has_payment_method=true
       AND c.stripe_payment_method_id IS NOT NULL`,
    [businessId]
  );

  if (!jobsRes.rows.length) return { attempted: 0, charged: 0, failed: 0, totalCents: 0 };

  let charged = 0, failed = 0, totalCents = 0;
  const results: { jobId: string; success: boolean; error?: string }[] = [];

  for (const job of jobsRes.rows) {
    const result = await chargeJob(job.id, businessId, `auto-${job.id}-${new Date().toISOString().slice(0, 10)}`);
    results.push({ jobId: job.id, ...result });
    if (result.success) {
      charged++;
      const cents = job.charge_amount || Math.round((parseFloat(job.quote_total) || 0) * 100);
      totalCents += cents;
    } else {
      failed++;
    }
  }

  const attempted = jobsRes.rows.length;

  // Update last run and log
  const today = new Date().toISOString().slice(0, 10);
  await pool.query(
    `UPDATE businesses SET auto_charge_last_run_at=NOW() WHERE id=$1`,
    [businessId]
  );
  await pool.query(
    `INSERT INTO auto_charge_log (business_id, run_date, jobs_attempted, jobs_charged, jobs_failed, total_amount_cents)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [businessId, today, attempted, charged, failed, totalCents]
  );

  // Send summary email to business owner
  try {
    const ownerRes = await pool.query(`SELECT email FROM users WHERE id=$1`, [business.owner_user_id]);
    const ownerEmail = ownerRes.rows[0]?.email;
    if (ownerEmail) {
      const { fromName } = getBusinessSendParams(business);
      const collected = (totalCents / 100).toFixed(2);
      await sendEmail({
        to: ownerEmail,
        subject: `Auto-Charge Summary — ${today}`,
        html: `<p>Hi,</p><p>Your auto-charge run for <strong>${business.company_name}</strong> is complete:</p>
<ul>
  <li>Jobs attempted: ${attempted}</li>
  <li>Successfully charged: ${charged}</li>
  <li>Failed: ${failed}</li>
  <li>Total collected: $${collected}</li>
</ul>
${failed > 0 ? `<p><strong>Note:</strong> ${failed} charge(s) failed. Visit your Finance page to retry.</p>` : ""}
<p>— QuotePro AI</p>`,
        fromName,
      });
    }
  } catch (_) {}

  return { attempted, charged, failed, totalCents };
}

export function startAutoChargeCron() {
  // Run every minute
  setInterval(async () => {
    try {
      const now = new Date();
      // Get all businesses with auto-charge enabled
      const bizRes = await pool.query(
        `SELECT id, auto_charge_time, auto_charge_timezone, auto_charge_last_run_at
         FROM businesses
         WHERE auto_charge_enabled=true AND stripe_onboarding_complete=true AND stripe_account_id IS NOT NULL`
      );

      for (const biz of bizRes.rows) {
        try {
          const tz = biz.auto_charge_timezone || "America/New_York";
          const time = biz.auto_charge_time || "17:00";
          const [targetH, targetM] = time.split(":").map(Number);

          // Get current time in business timezone
          const nowInTz = new Intl.DateTimeFormat("en-US", {
            timeZone: tz,
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).formatToParts(now);

          const tzParts: Record<string, string> = {};
          for (const part of nowInTz) tzParts[part.type] = part.value;
          const currentH = parseInt(tzParts.hour || "0");
          const currentM = parseInt(tzParts.minute || "0");
          const today = `${tzParts.year}-${tzParts.month}-${tzParts.day}`;

          if (currentH !== targetH || currentM !== targetM) continue;

          // Check if we already ran today
          const lastRunStr = biz.auto_charge_last_run_at ? new Date(biz.auto_charge_last_run_at).toISOString().slice(0, 10) : null;
          if (lastRunStr === today) continue;

          console.log(`[auto-charge] Running for business ${biz.id} at ${time} ${tz}`);
          await runAutoChargeForBusiness(biz.id);
        } catch (bizErr: any) {
          console.error(`[auto-charge] Error for business ${biz.id}:`, bizErr.message);
        }
      }
    } catch (err: any) {
      console.error("[auto-charge] Cron error:", err.message);
    }
  }, 60_000);

  console.log("[auto-charge] Cron started (runs every minute)");
}
