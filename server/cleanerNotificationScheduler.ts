/**
 * Sprint 20B — Cleaner Job Notification Scheduler
 * Handles:
 *  1. runCleanerNotificationScheduler() — hourly cron, sends day-before reminders to cleaners
 *  2. sendCleanerAssignmentNotification() — called immediately when a job is assigned
 *  3. sendTestCleanerNotification() — sends a test to a specific employee
 *  4. sendWorkOrderEmail() — sends a detailed work order email to assigned cleaners
 */

import crypto from "crypto";
import { pool } from "./db";
import { sendEmail, getBusinessSendParams } from "./mail";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
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

async function alreadyLoggedCleaner(
  jobId: string,
  employeeId: string,
  type: string
): Promise<boolean> {
  const r = await pool.query(
    "SELECT 1 FROM reminder_log WHERE job_id=$1 AND employee_id=$2 AND reminder_type=$3 LIMIT 1",
    [jobId, employeeId, type]
  );
  return r.rows.length > 0;
}

async function logCleanerReminder(
  businessId: string,
  jobId: string,
  employeeId: string | null,
  type: string,
  status: "sent" | "failed",
  error?: string
): Promise<void> {
  await pool.query(
    `INSERT INTO reminder_log (id, business_id, job_id, employee_id, reminder_type, status, error_message)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT DO NOTHING`,
    [crypto.randomUUID(), businessId, jobId, employeeId || null, type, status, error || null]
  );
}

// ── Email HTML builders ───────────────────────────────────────────────────────

function buildAssignmentEmail(opts: {
  cleanerName: string;
  clientName: string;
  address: string;
  date: string;
  time: string;
  serviceType: string;
  notes: string;
  businessName: string;
}): string {
  const { cleanerName, clientName, address, date, time, serviceType, notes, businessName } = opts;
  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;color:#1e293b;">
  <div style="background:#0f172a;border-radius:12px 12px 0 0;padding:24px 28px;">
    <div style="font-size:12px;font-weight:600;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">${businessName}</div>
    <div style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;">New Job Assigned</div>
  </div>
  <div style="background:#ffffff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:24px 28px;">
    <p style="margin:0 0 16px;font-size:15px;color:#334155;">Hi <strong>${cleanerName}</strong>,</p>
    <p style="margin:0 0 20px;font-size:14px;color:#64748b;">You have a new cleaning job assigned. Here are the details:</p>

    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px;margin-bottom:20px;">
      <table cellpadding="0" cellspacing="0" width="100%">
        <tr><td style="padding:5px 0;font-size:12px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;width:90px;">CLIENT</td><td style="padding:5px 0;font-size:14px;color:#1e293b;font-weight:600;">${clientName}</td></tr>
        <tr><td style="padding:5px 0;font-size:12px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">ADDRESS</td><td style="padding:5px 0;font-size:14px;color:#334155;">${address}</td></tr>
        <tr><td style="padding:5px 0;font-size:12px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">DATE</td><td style="padding:5px 0;font-size:14px;color:#334155;">${date}</td></tr>
        <tr><td style="padding:5px 0;font-size:12px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">TIME</td><td style="padding:5px 0;font-size:14px;color:#334155;">${time}</td></tr>
        <tr><td style="padding:5px 0;font-size:12px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">SERVICE</td><td style="padding:5px 0;font-size:14px;color:#334155;">${serviceType}</td></tr>
        ${notes ? `<tr><td style="padding:5px 0;font-size:12px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;vertical-align:top;">NOTES</td><td style="padding:5px 0;font-size:14px;color:#334155;">${notes}</td></tr>` : ""}
      </table>
    </div>

    <p style="margin:0 0 24px;font-size:13px;color:#94a3b8;">Please confirm you've seen this by replying to this email.</p>
    <p style="margin:0;font-size:13px;color:#64748b;">See you soon,<br/><strong>${businessName}</strong></p>
  </div>
</div>`;
}

function buildReminderEmail(opts: {
  cleanerName: string;
  clientName: string;
  address: string;
  time: string;
  serviceType: string;
  notes: string;
  businessName: string;
  checklistItems: string[];
}): string {
  const { cleanerName, clientName, address, time, serviceType, notes, businessName, checklistItems } = opts;
  const checklistHtml = checklistItems.length > 0
    ? `<div style="margin-top:12px;"><div style="font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">CHECKLIST</div>${checklistItems.map(item => `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:13px;color:#334155;">&#9744; ${item}</div>`).join("")}</div>`
    : "";
  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;color:#1e293b;">
  <div style="background:#0f172a;border-radius:12px 12px 0 0;padding:24px 28px;">
    <div style="font-size:12px;font-weight:600;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">${businessName}</div>
    <div style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;">Reminder: Job Tomorrow</div>
  </div>
  <div style="background:#ffffff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:24px 28px;">
    <p style="margin:0 0 16px;font-size:15px;color:#334155;">Hi <strong>${cleanerName}</strong>,</p>
    <p style="margin:0 0 20px;font-size:14px;color:#64748b;">Don't forget — you have a job tomorrow:</p>

    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px;margin-bottom:20px;">
      <table cellpadding="0" cellspacing="0" width="100%">
        <tr><td style="padding:5px 0;font-size:12px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;width:90px;">CLIENT</td><td style="padding:5px 0;font-size:14px;color:#1e293b;font-weight:600;">${clientName}</td></tr>
        <tr><td style="padding:5px 0;font-size:12px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">ADDRESS</td><td style="padding:5px 0;font-size:14px;color:#334155;">${address}</td></tr>
        <tr><td style="padding:5px 0;font-size:12px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">TIME</td><td style="padding:5px 0;font-size:14px;color:#334155;">${time}</td></tr>
        <tr><td style="padding:5px 0;font-size:12px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">SERVICE</td><td style="padding:5px 0;font-size:14px;color:#334155;">${serviceType}</td></tr>
        ${notes ? `<tr><td style="padding:5px 0;font-size:12px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;vertical-align:top;">NOTES</td><td style="padding:5px 0;font-size:14px;color:#334155;">${notes}</td></tr>` : ""}
      </table>
      ${checklistHtml}
    </div>

    <p style="margin:0;font-size:13px;color:#64748b;">See you tomorrow!<br/><strong>${businessName}</strong></p>
  </div>
</div>`;
}

function buildWorkOrderEmail(opts: {
  cleanerName: string;
  clientName: string;
  clientPhone: string;
  address: string;
  date: string;
  time: string;
  serviceType: string;
  notes: string;
  businessName: string;
  checklistItems: string[];
  jobId: string;
}): string {
  const { cleanerName, clientName, clientPhone, address, date, time, serviceType, notes, businessName, checklistItems, jobId } = opts;
  const checklistHtml = checklistItems.length > 0
    ? checklistItems.map(item => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155;">
          <span style="display:inline-block;width:16px;height:16px;border:2px solid #cbd5e1;border-radius:3px;margin-right:10px;vertical-align:middle;"></span>${item}
        </td>
      </tr>`).join("")
    : `<tr><td style="padding:12px;font-size:13px;color:#94a3b8;">No checklist items</td></tr>`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Work Order — ${businessName}</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;min-height:100%;">
  <tr><td align="center" style="padding:24px 16px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

      <!-- Header -->
      <tr><td style="background:#0f172a;border-radius:12px 12px 0 0;padding:28px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <div style="font-size:12px;font-weight:700;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;">${businessName}</div>
              <div style="font-size:28px;font-weight:900;color:#ffffff;letter-spacing:-0.03em;">WORK ORDER</div>
            </td>
            <td align="right" style="vertical-align:top;">
              <div style="font-size:12px;color:rgba(255,255,255,0.4);">Job #${jobId.slice(0, 8).toUpperCase()}</div>
            </td>
          </tr>
        </table>
      </td></tr>

      <!-- Assigned To -->
      <tr><td style="background:#1e293b;padding:12px 28px;">
        <div style="font-size:13px;color:rgba(255,255,255,0.6);">Assigned to: <strong style="color:#ffffff;">${cleanerName}</strong></div>
      </td></tr>

      <!-- Body -->
      <tr><td style="background:#ffffff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:28px;">

        <!-- Job Info -->
        <div style="display:flex;gap:16px;margin-bottom:24px;">
          <div style="flex:1;background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:14px;">
            <div style="font-size:10px;font-weight:700;color:#0284c7;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">DATE</div>
            <div style="font-size:15px;font-weight:700;color:#0f172a;">${date}</div>
          </div>
          <div style="flex:1;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px;">
            <div style="font-size:10px;font-weight:700;color:#16a34a;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">TIME</div>
            <div style="font-size:15px;font-weight:700;color:#0f172a;">${time}</div>
          </div>
        </div>

        <!-- Client Info -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          <tr><td colspan="2" style="padding-bottom:8px;border-bottom:2px solid #0f172a;font-size:11px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.08em;">Client Information</td></tr>
          <tr><td style="padding:8px 0 4px;font-size:12px;color:#94a3b8;font-weight:600;width:100px;">NAME</td><td style="padding:8px 0 4px;font-size:14px;color:#1e293b;font-weight:600;">${clientName}</td></tr>
          <tr><td style="padding:4px 0;font-size:12px;color:#94a3b8;font-weight:600;">ADDRESS</td><td style="padding:4px 0;font-size:14px;color:#334155;">${address}</td></tr>
          ${clientPhone ? `<tr><td style="padding:4px 0;font-size:12px;color:#94a3b8;font-weight:600;">PHONE</td><td style="padding:4px 0;font-size:14px;color:#334155;">${clientPhone}</td></tr>` : ""}
        </table>

        <!-- Service Details -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          <tr><td colspan="2" style="padding-bottom:8px;border-bottom:2px solid #0f172a;font-size:11px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.08em;">Service Details</td></tr>
          <tr><td style="padding:8px 0 4px;font-size:12px;color:#94a3b8;font-weight:600;width:100px;">TYPE</td><td style="padding:8px 0 4px;font-size:14px;color:#334155;">${serviceType}</td></tr>
          ${notes ? `<tr><td style="padding:4px 0;font-size:12px;color:#94a3b8;font-weight:600;vertical-align:top;">NOTES</td><td style="padding:4px 0;font-size:14px;color:#334155;">${notes}</td></tr>` : ""}
        </table>

        <!-- Checklist -->
        <div style="margin-bottom:24px;">
          <div style="padding-bottom:8px;border-bottom:2px solid #0f172a;font-size:11px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0;">Cleaning Checklist</div>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;">
            ${checklistHtml}
          </table>
        </div>

        <!-- Footer note -->
        <div style="background:#fef9c3;border:1px solid #fde68a;border-radius:8px;padding:14px;">
          <div style="font-size:13px;color:#92400e;font-weight:600;">Please complete all checklist items and note any issues to your supervisor.</div>
        </div>

      </td></tr>

      <!-- Email footer -->
      <tr><td style="padding:16px 0;">
        <div style="font-size:11px;color:#94a3b8;text-align:center;">This work order was sent by ${businessName} via QuotePro AI.</div>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

// ── Public APIs ───────────────────────────────────────────────────────────────

/**
 * Called immediately when a job is assigned to employees.
 * Sends assignment notification if cleanerNotificationsEnabled and timing includes 'assign'.
 */
export async function sendCleanerAssignmentNotification(
  businessId: string,
  jobId: string,
  employeeIds: string[]
): Promise<void> {
  if (!employeeIds.length) return;

  // Fetch business prefs
  const bizRes = await pool.query(
    `SELECT id, company_name, phone, email, sender_name,
            cleaner_notifications_enabled, cleaner_notification_timing,
            cleaner_notification_email, cleaner_notification_sms
     FROM businesses WHERE id=$1 LIMIT 1`,
    [businessId]
  );
  if (!bizRes.rows.length) return;
  const biz = bizRes.rows[0];

  if (!biz.cleaner_notifications_enabled) return;
  const timing = biz.cleaner_notification_timing || "both";
  if (timing === "day_before") return; // Only day-before, skip on-assign

  // Fetch job details
  const jobRes = await pool.query(
    `SELECT j.*, c.first_name, c.last_name, c.phone as customer_phone
     FROM jobs j
     LEFT JOIN customers c ON c.id = j.customer_id
     WHERE j.id=$1 LIMIT 1`,
    [jobId]
  );
  if (!jobRes.rows.length) return;
  const job = jobRes.rows[0];
  const clientName = job.first_name
    ? `${job.first_name} ${job.last_name || ""}`.trim()
    : "Your client";
  const address = job.address || "";
  const date = job.start_datetime ? formatDate(new Date(job.start_datetime)) : "TBD";
  const time = job.start_datetime
    ? `${formatTime(new Date(job.start_datetime))}${job.end_datetime ? " – " + formatTime(new Date(job.end_datetime)) : ""}`
    : "TBD";
  const serviceType = job.job_type || "Cleaning";
  const notes = job.internal_notes || "";

  const sendParams = getBusinessSendParams(biz);

  // Fetch employees
  const empRes = await pool.query(
    `SELECT id, name, email, phone FROM employees WHERE id = ANY($1::text[]) AND business_id=$2`,
    [employeeIds, businessId]
  );

  for (const emp of empRes.rows) {
    // Email
    if (biz.cleaner_notification_email && emp.email) {
      try {
        const html = buildAssignmentEmail({
          cleanerName: emp.name.split(" ")[0],
          clientName,
          address,
          date,
          time,
          serviceType,
          notes,
          businessName: biz.company_name,
        });
        await sendEmail({
          to: emp.email,
          subject: `New job assigned: ${clientName} on ${date}`,
          html,
          fromName: sendParams.fromName,
          replyTo: sendParams.replyTo,
        });
        await logCleanerReminder(businessId, jobId, emp.id, "cleaner_assignment_email", "sent");
      } catch (e: any) {
        await logCleanerReminder(businessId, jobId, emp.id, "cleaner_assignment_email", "failed", e.message);
      }
    }

    // SMS
    if (biz.cleaner_notification_sms && emp.phone) {
      try {
        const clientFirst = clientName.split(" ")[0];
        let smsBody = `New job: ${clientFirst} at ${address} on ${date} at ${time}. Service: ${serviceType}. Check your email for details.`;
        if (smsBody.length > 160) smsBody = smsBody.slice(0, 157) + "...";
        await sendSms(emp.phone, smsBody);
        await logCleanerReminder(businessId, jobId, emp.id, "cleaner_assignment_sms", "sent");
      } catch (e: any) {
        await logCleanerReminder(businessId, jobId, emp.id, "cleaner_assignment_sms", "failed", e.message);
      }
    }
  }
}

/**
 * Hourly cron job — sends day-before reminders to cleaners.
 */
export async function runCleanerNotificationScheduler(): Promise<void> {
  const now = new Date();
  const hour = now.getHours();
  const isQuietHours = hour < 8 || hour >= 21;

  try {
    // Businesses with cleaner notifications enabled + day-before timing
    const bizRes = await pool.query(
      `SELECT id, company_name, phone, email, sender_name,
              cleaner_notifications_enabled, cleaner_notification_timing,
              cleaner_notification_email, cleaner_notification_sms
       FROM businesses
       WHERE cleaner_notifications_enabled = true
         AND (cleaner_notification_timing = 'day_before' OR cleaner_notification_timing = 'both')`
    );

    let emailsSent = 0;
    let smsSent = 0;

    for (const biz of bizRes.rows) {
      const sendParams = getBusinessSendParams(biz);

      // Find jobs starting tomorrow (within next 24h)
      const windowStart = new Date(now.getTime() + 20 * 3600_000); // at least 20h from now
      const windowEnd = new Date(now.getTime() + 28 * 3600_000);    // at most 28h from now

      const jobRes = await pool.query(
        `SELECT j.id, j.start_datetime, j.end_datetime, j.job_type, j.address,
                j.internal_notes, j.team_members,
                c.first_name, c.last_name, c.phone as customer_phone
         FROM jobs j
         LEFT JOIN customers c ON c.id = j.customer_id
         WHERE j.business_id = $1
           AND j.status NOT IN ('completed','cancelled')
           AND j.start_datetime >= $2
           AND j.start_datetime < $3
           AND j.team_members IS NOT NULL
           AND jsonb_array_length(j.team_members) > 0`,
        [biz.id, windowStart, windowEnd]
      );

      for (const job of jobRes.rows) {
        const employeeIds: string[] = job.team_members || [];
        if (!employeeIds.length) continue;

        const clientName = job.first_name
          ? `${job.first_name} ${job.last_name || ""}`.trim()
          : "Your client";
        const date = job.start_datetime ? formatDate(new Date(job.start_datetime)) : "TBD";
        const time = job.start_datetime
          ? `${formatTime(new Date(job.start_datetime))}${job.end_datetime ? " – " + formatTime(new Date(job.end_datetime)) : ""}`
          : "TBD";
        const serviceType = job.job_type || "Cleaning";
        const notes = job.internal_notes || "";

        // Fetch checklist items
        const clRes = await pool.query(
          `SELECT label FROM job_checklist_items WHERE job_id=$1 ORDER BY sort_order ASC, id ASC`,
          [job.id]
        );
        const checklistItems = clRes.rows.map((r: any) => r.label);

        // Fetch employees
        const empRes = await pool.query(
          `SELECT id, name, email, phone FROM employees WHERE id = ANY($1::text[]) AND business_id=$2`,
          [employeeIds, biz.id]
        );

        for (const emp of empRes.rows) {
          // Email
          if (biz.cleaner_notification_email && emp.email) {
            const alreadySent = await alreadyLoggedCleaner(job.id, emp.id, "cleaner_reminder_email");
            if (!alreadySent) {
              try {
                const html = buildReminderEmail({
                  cleanerName: emp.name.split(" ")[0],
                  clientName,
                  address: job.address || "",
                  time,
                  serviceType,
                  notes,
                  businessName: biz.company_name,
                  checklistItems,
                });
                await sendEmail({
                  to: emp.email,
                  subject: `Reminder: Job tomorrow — ${clientName} at ${time}`,
                  html,
                  fromName: sendParams.fromName,
                  replyTo: sendParams.replyTo,
                });
                await logCleanerReminder(biz.id, job.id, emp.id, "cleaner_reminder_email", "sent");
                emailsSent++;
              } catch (e: any) {
                await logCleanerReminder(biz.id, job.id, emp.id, "cleaner_reminder_email", "failed", e.message);
              }
            }
          }

          // SMS (quiet hours check)
          if (!isQuietHours && biz.cleaner_notification_sms && emp.phone) {
            const alreadySent = await alreadyLoggedCleaner(job.id, emp.id, "cleaner_reminder_sms");
            if (!alreadySent) {
              try {
                const clientFirst = clientName.split(" ")[0];
                let smsBody = `Reminder: ${clientFirst} tomorrow at ${time}, ${job.address || ""}. ${serviceType}. Reply STOP to opt out.`;
                if (smsBody.length > 160) smsBody = smsBody.slice(0, 157) + "...";
                await sendSms(emp.phone, smsBody);
                await logCleanerReminder(biz.id, job.id, emp.id, "cleaner_reminder_sms", "sent");
                smsSent++;
              } catch (e: any) {
                await logCleanerReminder(biz.id, job.id, emp.id, "cleaner_reminder_sms", "failed", e.message);
              }
            }
          }
        }
      }
    }

    if (emailsSent + smsSent > 0) {
      console.log(`[cleaner-notifications] Sent ${emailsSent} email(s), ${smsSent} SMS`);
    }
  } catch (e: any) {
    console.error("[cleaner-notifications] Scheduler error:", e.message);
  }
}

/**
 * Send a test notification to a specific employee (or first active employee).
 */
export async function sendTestCleanerNotification(
  businessId: string,
  employeeId?: string
): Promise<{ emailSent: boolean; smsSent: boolean; employeeName?: string }> {
  const bizRes = await pool.query(
    `SELECT id, company_name, phone, email, sender_name,
            cleaner_notification_email, cleaner_notification_sms
     FROM businesses WHERE id=$1 LIMIT 1`,
    [businessId]
  );
  if (!bizRes.rows.length) throw new Error("Business not found");
  const biz = bizRes.rows[0];
  const sendParams = getBusinessSendParams(biz);

  let emp: any = null;
  if (employeeId) {
    const empRes = await pool.query(
      `SELECT id, name, email, phone FROM employees WHERE id=$1 AND business_id=$2 LIMIT 1`,
      [employeeId, businessId]
    );
    emp = empRes.rows[0] || null;
  }
  if (!emp) {
    const empRes = await pool.query(
      `SELECT id, name, email, phone FROM employees WHERE business_id=$1 AND status='active' AND email IS NOT NULL AND email != '' LIMIT 1`,
      [businessId]
    );
    emp = empRes.rows[0] || null;
  }

  let emailSent = false;
  let smsSent = false;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const date = formatDate(tomorrow);
  const time = "9:00 AM";

  if (emp && emp.email && biz.cleaner_notification_email) {
    const testBanner = `<div style="background:#fef3c7;border:1px solid #f59e0b;padding:10px 16px;border-radius:8px;margin-bottom:20px;font-size:13px;color:#92400e;"><strong>Test notification</strong> — This is what your cleaners will receive.</div>`;
    const html = testBanner + buildAssignmentEmail({
      cleanerName: emp.name.split(" ")[0],
      clientName: "The Johnson Family",
      address: "123 Main Street, Your City",
      date,
      time,
      serviceType: "Deep Cleaning",
      notes: "Client prefers eco-friendly products.",
      businessName: biz.company_name,
    });
    await sendEmail({
      to: emp.email,
      subject: `[TEST] New job assigned: The Johnson Family on ${date}`,
      html,
      fromName: sendParams.fromName,
      replyTo: sendParams.replyTo,
    });
    emailSent = true;
  }

  if (emp && emp.phone && biz.cleaner_notification_sms) {
    const smsBody = `[TEST] New job: Johnson at 123 Main Street on ${date} at ${time}. Deep Cleaning. Check email for details.`;
    await sendSms(emp.phone, smsBody.slice(0, 160));
    smsSent = true;
  }

  return { emailSent, smsSent, employeeName: emp?.name };
}

/**
 * Send a detailed work order email to all assigned cleaners for a job.
 */
export async function sendWorkOrderEmail(
  businessId: string,
  jobId: string
): Promise<{ sent: number; cleaners: string[] }> {
  const bizRes = await pool.query(
    `SELECT id, company_name, phone, email, sender_name FROM businesses WHERE id=$1 LIMIT 1`,
    [businessId]
  );
  if (!bizRes.rows.length) throw new Error("Business not found");
  const biz = bizRes.rows[0];
  const sendParams = getBusinessSendParams(biz);

  const jobRes = await pool.query(
    `SELECT j.*, c.first_name, c.last_name, c.phone as customer_phone, c.email as customer_email
     FROM jobs j
     LEFT JOIN customers c ON c.id = j.customer_id
     WHERE j.id=$1 AND j.business_id=$2 LIMIT 1`,
    [jobId, businessId]
  );
  if (!jobRes.rows.length) throw new Error("Job not found");
  const job = jobRes.rows[0];

  const employeeIds: string[] = job.team_members || [];
  if (!employeeIds.length) throw new Error("No cleaners assigned to this job");

  const clientName = job.first_name
    ? `${job.first_name} ${job.last_name || ""}`.trim()
    : "Your client";
  const date = job.start_datetime ? formatDate(new Date(job.start_datetime)) : "TBD";
  const time = job.start_datetime
    ? `${formatTime(new Date(job.start_datetime))}${job.end_datetime ? " – " + formatTime(new Date(job.end_datetime)) : ""}`
    : "TBD";
  const serviceType = job.job_type || "Cleaning";
  const notes = job.internal_notes || "";

  // Fetch checklist
  const clRes = await pool.query(
    `SELECT label FROM job_checklist_items WHERE job_id=$1 ORDER BY sort_order ASC, id ASC`,
    [jobId]
  );
  const checklistItems = clRes.rows.map((r: any) => r.label);

  // Fetch employees
  const empRes = await pool.query(
    `SELECT id, name, email, phone FROM employees WHERE id = ANY($1::text[]) AND business_id=$2`,
    [employeeIds, businessId]
  );

  const sentTo: string[] = [];

  for (const emp of empRes.rows) {
    if (!emp.email) continue;
    try {
      const html = buildWorkOrderEmail({
        cleanerName: emp.name,
        clientName,
        clientPhone: job.customer_phone || "",
        address: job.address || "",
        date,
        time,
        serviceType,
        notes,
        businessName: biz.company_name,
        checklistItems,
        jobId,
      });
      await sendEmail({
        to: emp.email,
        subject: `Work order: ${clientName} — ${date}`,
        html,
        fromName: sendParams.fromName,
        replyTo: sendParams.replyTo,
      });
      await logCleanerReminder(businessId, jobId, emp.id, "work_order", "sent");
      sentTo.push(emp.name);
    } catch (e: any) {
      await logCleanerReminder(businessId, jobId, emp.id, "work_order", "failed", e.message);
    }
  }

  return { sent: sentTo.length, cleaners: sentTo };
}
