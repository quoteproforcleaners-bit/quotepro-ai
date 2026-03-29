/**
 * Sprint 20A — Appointment Reminder Scheduler
 * Runs every hour. Sends email + SMS reminders to customers before their cleaning jobs.
 */

import crypto from "crypto";
import { pool } from "./db";
import { sendEmail, getBusinessSendParams } from "./mail";

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function daysLabel(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

function dayLabel(days: number): string {
  if (days === 0) return "TODAY";
  if (days === 1) return "tomorrow";
  return `on ${formatDate(new Date(Date.now() + days * 86400_000))}`;
}

async function sendSms(to: string, body: string): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!sid || !token || !from) throw new Error("SMS not configured");
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
    },
    body: new URLSearchParams({ From: from, To: to, Body: body }).toString(),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Twilio ${res.status}: ${txt}`);
  }
}

async function alreadySent(jobId: string, type: "email" | "sms"): Promise<boolean> {
  const r = await pool.query(
    "SELECT 1 FROM reminder_log WHERE job_id=$1 AND reminder_type=$2 LIMIT 1",
    [jobId, type]
  );
  return r.rows.length > 0;
}

async function logReminder(
  businessId: string, jobId: string, type: "email" | "sms",
  status: "sent" | "failed", error?: string
): Promise<void> {
  await pool.query(
    `INSERT INTO reminder_log (id, business_id, job_id, reminder_type, status, error_message)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO NOTHING`,
    [crypto.randomUUID(), businessId, jobId, type, status, error || null]
  );
}

export async function runAppointmentReminderScheduler(): Promise<void> {
  const now = new Date();
  const hour = now.getHours();
  const isQuietHours = hour < 8 || hour >= 21;

  try {
    // Fetch all businesses with at least one reminder channel enabled
    const bizRes = await pool.query<{
      id: string; company_name: string; phone: string; email: string;
      sender_name: string; customer_email_reminder_days: number | null;
      customer_sms_reminder_days: number | null;
    }>(
      `SELECT id, company_name, phone, email, sender_name,
              customer_email_reminder_days, customer_sms_reminder_days
       FROM businesses
       WHERE customer_email_reminder_days IS NOT NULL
          OR customer_sms_reminder_days IS NOT NULL`
    );

    let emailsSent = 0;
    let smsSent = 0;

    for (const biz of bizRes.rows) {
      const sendParams = getBusinessSendParams(biz);

      // ── EMAIL reminders ─────────────────────────────────────────────────
      if (biz.customer_email_reminder_days !== null) {
        const daysAhead = biz.customer_email_reminder_days;
        // Window: jobs starting within the next hour from (now + daysAhead days)
        const windowStart = new Date(now.getTime() + daysAhead * 86400_000);
        const windowEnd = new Date(windowStart.getTime() + 3600_000);

        const jobs = await pool.query<{
          id: string; start_datetime: Date;
          first_name: string; last_name: string;
          email: string; address: string;
        }>(
          `SELECT j.id, j.start_datetime,
                  c.first_name, c.last_name, c.email, j.address
           FROM jobs j
           JOIN customers c ON c.id = j.customer_id
           WHERE j.business_id = $1
             AND j.status IN ('scheduled','confirmed')
             AND j.start_datetime >= $2
             AND j.start_datetime < $3
             AND c.email IS NOT NULL AND c.email != ''`,
          [biz.id, windowStart, windowEnd]
        );

        for (const job of jobs.rows) {
          if (await alreadySent(job.id, "email")) continue;
          try {
            const label = daysLabel(daysAhead);
            const dateStr = formatDate(job.start_datetime);
            const timeStr = formatTime(job.start_datetime);
            const subject = daysAhead === 0
              ? `Reminder: Your cleaning is TODAY at ${timeStr}`
              : daysAhead === 1
              ? `Reminder: Your cleaning appointment is tomorrow`
              : `Reminder: Your cleaning appointment is ${label}`;

            const html = `
<div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; color: #1e293b;">
  <p>Hi ${job.first_name},</p>
  <p>This is a friendly reminder that <strong>${biz.company_name}</strong> is scheduled to clean your home:</p>
  <div style="background:#f0f9ff;border-left:4px solid #2563eb;padding:16px;border-radius:8px;margin:20px 0;">
    <p style="margin:0;font-size:18px;font-weight:700;color:#1e40af;">${dateStr}</p>
    <p style="margin:4px 0 0;color:#3b82f6;font-size:15px;">${timeStr}</p>
    ${job.address ? `<p style="margin:4px 0 0;color:#64748b;font-size:13px;">${job.address}</p>` : ""}
  </div>
  <p>If you need to reschedule or cancel, please reply to this message or call us at <strong>${biz.phone}</strong>.</p>
  <p>See you ${label}!<br/><strong>${sendParams.fromName}</strong><br/>${biz.company_name}</p>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;"/>
  <p style="color:#94a3b8;font-size:12px;">This reminder was sent automatically by QuotePro AI.</p>
</div>`;

            await sendEmail({
              to: job.email,
              subject,
              html,
              fromName: sendParams.fromName,
              replyTo: sendParams.replyTo,
            });
            await logReminder(biz.id, job.id, "email", "sent");
            emailsSent++;
          } catch (e: any) {
            await logReminder(biz.id, job.id, "email", "failed", e.message);
          }
        }
      }

      // ── SMS reminders ───────────────────────────────────────────────────
      if (!isQuietHours && biz.customer_sms_reminder_days !== null) {
        const daysAhead = biz.customer_sms_reminder_days;
        const windowStart = new Date(now.getTime() + daysAhead * 86400_000);
        const windowEnd = new Date(windowStart.getTime() + 3600_000);

        const jobs = await pool.query<{
          id: string; start_datetime: Date;
          first_name: string; last_name: string;
          phone: string; address: string;
        }>(
          `SELECT j.id, j.start_datetime,
                  c.first_name, c.last_name, c.phone, j.address
           FROM jobs j
           JOIN customers c ON c.id = j.customer_id
           WHERE j.business_id = $1
             AND j.status IN ('scheduled','confirmed')
             AND j.start_datetime >= $2
             AND j.start_datetime < $3
             AND c.phone IS NOT NULL AND c.phone != ''`,
          [biz.id, windowStart, windowEnd]
        );

        for (const job of jobs.rows) {
          if (await alreadySent(job.id, "sms")) continue;
          try {
            const label = dayLabel(daysAhead);
            const timeStr = formatTime(job.start_datetime);
            let body = `Hi ${job.first_name}! Reminder: ${biz.company_name} is cleaning your home ${label} at ${timeStr}.`;
            if (biz.phone) body += ` To reschedule call ${biz.phone}.`;
            body += ` Reply STOP to opt out.`;
            // Truncate to 160 chars
            if (body.length > 160) body = body.slice(0, 157) + "...";

            await sendSms(job.phone, body);
            await logReminder(biz.id, job.id, "sms", "sent");
            smsSent++;
          } catch (e: any) {
            await logReminder(biz.id, job.id, "sms", "failed", e.message);
          }
        }
      }
    }

    if (emailsSent + smsSent > 0) {
      console.log(`[reminders] Sent ${emailsSent} email(s), ${smsSent} SMS`);
    }
  } catch (e: any) {
    console.error("[reminders] Scheduler error:", e.message);
  }
}

/**
 * Send a test reminder to the business owner's own contact details.
 */
export async function sendTestReminder(businessId: string): Promise<{ emailSent: boolean; smsSent: boolean }> {
  const bizRes = await pool.query(
    `SELECT id, company_name, phone, email, sender_name,
            customer_email_reminder_days, customer_sms_reminder_days
     FROM businesses WHERE id = $1`,
    [businessId]
  );
  if (!bizRes.rows.length) throw new Error("Business not found");
  const biz = bizRes.rows[0];
  const sendParams = getBusinessSendParams(biz);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  const dateStr = formatDate(tomorrow);
  const timeStr = "9:00 AM";
  let emailSent = false;
  let smsSent = false;

  // Test email
  if (biz.email) {
    const html = `
<div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; color: #1e293b;">
  <div style="background:#fef3c7;border:1px solid #f59e0b;padding:10px 16px;border-radius:8px;margin-bottom:20px;font-size:13px;color:#92400e;">
    <strong>Test reminder</strong> — This is what your customers will receive.
  </div>
  <p>Hi [Customer],</p>
  <p>This is a friendly reminder that <strong>${biz.company_name}</strong> is scheduled to clean your home:</p>
  <div style="background:#f0f9ff;border-left:4px solid #2563eb;padding:16px;border-radius:8px;margin:20px 0;">
    <p style="margin:0;font-size:18px;font-weight:700;color:#1e40af;">${dateStr}</p>
    <p style="margin:4px 0;color:#3b82f6;font-size:15px;">${timeStr}</p>
    <p style="margin:4px 0 0;color:#64748b;font-size:13px;">123 Example Street, Your City</p>
  </div>
  <p>If you need to reschedule or cancel, please reply to this message or call us at <strong>${biz.phone}</strong>.</p>
  <p>See you tomorrow!<br/><strong>${sendParams.fromName}</strong><br/>${biz.company_name}</p>
</div>`;
    await sendEmail({
      to: biz.email,
      subject: "[TEST] Reminder: Your cleaning appointment is tomorrow",
      html,
      fromName: sendParams.fromName,
      replyTo: sendParams.replyTo,
    });
    emailSent = true;
  }

  // Test SMS
  if (biz.phone) {
    const body = `[TEST] Hi [Customer]! Reminder: ${biz.company_name} is cleaning your home tomorrow at ${timeStr}. To reschedule call ${biz.phone}. Reply STOP to opt out.`;
    await sendSms(biz.phone, body.slice(0, 160));
    smsSent = true;
  }

  return { emailSent, smsSent };
}
