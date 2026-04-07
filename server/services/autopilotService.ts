/**
 * AutopilotService — The core engine for QuotePro Autopilot.
 *
 * Step flow:
 *   enroll → step1 (qualify + quote) → step2 (follow-up) → step3 (contract) → step4 (review)
 *
 * Steps 3 and 4 are event-triggered (quote accepted, job completed).
 * Steps 1 and 2 run via the 15-minute cron (processAutopilotJobs).
 */

import { pool } from "../db";
import { callAI } from "../aiClient";
import { sendEmail, getBusinessSendParams } from "../mail";

const QUALIFICATION_SYSTEM_PROMPT = `You are the QuotePro Autopilot, an AI assistant for professional cleaning
business owners. Your job is to qualify an incoming lead and prepare a
personalized outreach message.

You will receive a lead form submission with some or all of these fields:
- Name
- Address or zip code
- Home size (bedrooms/bathrooms)
- Cleaning type (standard, deep clean, move-in/out, commercial)
- Frequency (one-time, weekly, bi-weekly, monthly)
- Special requests or notes
- How they found us

Return ONLY a JSON object with no preamble or markdown:

{
  "qualificationScore": <1-10 integer>,
  "scoreReason": "<one sentence why>",
  "recommendedTier": "<standard | deep_clean | premium>",
  "urgencySignals": ["<signals suggesting they need service soon>"],
  "openingLine": "<warm, specific 1-sentence email opener using their name and one detail from their submission — never generic>",
  "redFlags": ["<low close probability signals — empty array if none>"],
  "suggestedFollowUpAngle": "<if no response in 48hrs, the angle to use in the follow-up email>"
}

Scoring guide:
9-10: Specific address, knows frequency, move-in/out or recurring intent
7-8: Good detail, clear intent
5-6: Vague on scope or frequency
1-4: Missing critical info, red flags, or unrealistic expectations

Tone: confident, warm, not salesy. This is a relationship-driven industry.`;

async function logAction(jobId: string, step: string, action: string, result: string) {
  try {
    await pool.query(
      `INSERT INTO autopilot_job_logs (job_id, step, action, result, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [jobId, step, action, result]
    );
  } catch (err: any) {
    console.warn(`[autopilot] Failed to log action for job ${jobId}:`, err.message);
  }
}

async function updateJob(jobId: string, fields: Record<string, any>) {
  const sets: string[] = [];
  const values: any[] = [];
  let idx = 1;

  for (const [key, val] of Object.entries(fields)) {
    const col = key.replace(/([A-Z])/g, "_$1").toLowerCase();
    sets.push(`${col} = $${idx}`);
    values.push(val);
    idx++;
  }
  values.push(jobId);
  await pool.query(
    `UPDATE autopilot_jobs SET ${sets.join(", ")} WHERE id = $${idx}`,
    values
  );
}

export async function enrollLead(userId: string, businessId: string, leadId: string): Promise<string> {
  const existing = await pool.query(
    `SELECT id FROM autopilot_jobs WHERE lead_id = $1 AND status NOT IN ('complete', 'paused')`,
    [leadId]
  );
  if (existing.rows.length > 0) return existing.rows[0].id;

  const res = await pool.query(
    `INSERT INTO autopilot_jobs (user_id, business_id, lead_id, status, created_at)
     VALUES ($1, $2, $3, 'pending_quote', NOW())
     RETURNING id`,
    [userId, businessId, leadId]
  );
  const jobId = res.rows[0].id;
  await logAction(jobId, "enroll", "Lead enrolled in Autopilot", "ok");

  step1_qualifyAndQuote(jobId).catch((err) => {
    console.error(`[autopilot] step1 failed for job ${jobId}:`, err.message);
  });

  return jobId;
}

export async function step1_qualifyAndQuote(jobId: string): Promise<void> {
  const jobRes = await pool.query(
    `SELECT aj.*, b.company_name, b.email as business_email, b.sender_name, b.reply_to_email,
            b.primary_color, b.id as bid
     FROM autopilot_jobs aj
     JOIN businesses b ON b.id = aj.business_id
     WHERE aj.id = $1`,
    [jobId]
  );
  const job = jobRes.rows[0];
  if (!job) return;

  const leadRes = await pool.query(
    `SELECT * FROM customers WHERE id = $1`,
    [job.lead_id]
  );
  const lead = leadRes.rows[0];
  if (!lead || !lead.email) {
    await logAction(jobId, "step1", "Skipped — no lead or email", "skipped");
    return;
  }

  const leadContext = JSON.stringify({
    name: `${lead.first_name || ""} ${lead.last_name || ""}`.trim() || lead.customer_name,
    address: lead.address,
    notes: lead.notes,
    tags: lead.tags,
    leadSource: lead.lead_source,
    extractedFields: lead.extracted_fields,
  });

  let qualification: any = {};
  try {
    const { content } = await callAI(
      [
        { role: "system", content: QUALIFICATION_SYSTEM_PROMPT },
        { role: "user", content: `Lead submission:\n${leadContext}` },
      ],
      { maxTokens: 600, responseFormat: "json_object" }
    );
    qualification = JSON.parse(content.trim());
  } catch (err: any) {
    qualification = {
      qualificationScore: 5,
      scoreReason: "Unable to qualify automatically",
      recommendedTier: "standard",
      urgencySignals: [],
      openingLine: `Hi ${lead.first_name || "there"}, thanks for reaching out!`,
      redFlags: [],
      suggestedFollowUpAngle: "Follow up to see if they still need cleaning services.",
    };
    console.warn(`[autopilot] Claude qualification failed for job ${jobId}:`, err.message);
  }

  const pricingRes = await pool.query(
    `SELECT settings FROM pricing_settings WHERE business_id = $1 LIMIT 1`,
    [job.business_id]
  );
  const pricing = pricingRes.rows[0]?.settings || {};

  const tier = qualification.recommendedTier || "standard";
  const basePrice = tier === "premium" ? (pricing.basePrice || 150) * 1.4 :
    tier === "deep_clean" ? (pricing.basePrice || 150) * 1.2 :
    (pricing.basePrice || 150);
  const estimatedTotal = Math.round(basePrice);

  let quoteId: string | null = null;
  try {
    const qRes = await pool.query(
      `INSERT INTO quotes (business_id, customer_name, customer_email, total, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'draft', NOW(), NOW())
       RETURNING id`,
      [
        job.business_id,
        `${lead.first_name || ""} ${lead.last_name || ""}`.trim() || "Customer",
        lead.email,
        estimatedTotal,
      ]
    );
    quoteId = qRes.rows[0].id;
  } catch (err: any) {
    console.warn(`[autopilot] Quote creation failed for job ${jobId}:`, err.message);
  }

  const businessRes = await pool.query(`SELECT * FROM businesses WHERE id = $1`, [job.business_id]);
  const business = businessRes.rows[0];
  const { fromName, replyTo } = getBusinessSendParams(business);

  const tierLabel = tier === "premium" ? "Premium Clean" : tier === "deep_clean" ? "Deep Clean" : "Standard Clean";
  const emailHtml = buildOutreachEmail({
    openingLine: qualification.openingLine,
    firstName: lead.first_name || "there",
    companyName: business.company_name,
    tierLabel,
    estimatedTotal,
    primaryColor: business.primary_color || "#2563EB",
    quoteId: quoteId || "",
  });

  try {
    await sendEmail({
      to: lead.email,
      subject: `Your cleaning quote from ${business.company_name}`,
      html: emailHtml,
      fromName,
      replyTo,
    });
  } catch (err: any) {
    await logAction(jobId, "step1", "Email send failed", err.message);
    return;
  }

  const meta = {
    ...(job.metadata || {}),
    qualification,
    quoteId,
    estimatedTotal,
    step1SentAt: new Date().toISOString(),
  };

  const next = new Date(Date.now() + 48 * 60 * 60 * 1000);
  await updateJob(jobId, {
    status: "pending_response",
    quoteId,
    lastActionAt: new Date(),
    nextActionAt: next,
    metadata: meta,
  });

  await logAction(jobId, "step1", `Quote emailed to ${lead.email} — ${tierLabel} $${estimatedTotal}`, "ok");
}

export async function step2_followUp(jobId: string): Promise<void> {
  const jobRes = await pool.query(
    `SELECT aj.*, b.company_name, b.primary_color
     FROM autopilot_jobs aj
     JOIN businesses b ON b.id = aj.business_id
     WHERE aj.id = $1`,
    [jobId]
  );
  const job = jobRes.rows[0];
  if (!job) return;

  const leadRes = await pool.query(`SELECT * FROM customers WHERE id = $1`, [job.lead_id]);
  const lead = leadRes.rows[0];
  if (!lead || !lead.email) return;

  const meta: any = job.metadata || {};
  const angle = meta.qualification?.suggestedFollowUpAngle || "Check in to see if they still need cleaning services.";

  const businessRes = await pool.query(`SELECT * FROM businesses WHERE id = $1`, [job.business_id]);
  const business = businessRes.rows[0];
  const { fromName, replyTo } = getBusinessSendParams(business);

  const html = buildFollowUpEmail({
    firstName: lead.first_name || "there",
    companyName: business.company_name,
    angle,
    primaryColor: business.primary_color || "#2563EB",
    estimatedTotal: meta.estimatedTotal,
    quoteId: meta.quoteId,
  });

  try {
    await sendEmail({
      to: lead.email,
      subject: `Just checking in — ${business.company_name}`,
      html,
      fromName,
      replyTo,
    });
  } catch (err: any) {
    await logAction(jobId, "step2", "Follow-up email failed", err.message);
    return;
  }

  const next = new Date(Date.now() + 72 * 60 * 60 * 1000);
  await updateJob(jobId, {
    status: "pending_response",
    lastActionAt: new Date(),
    nextActionAt: next,
    metadata: { ...meta, step2SentAt: new Date().toISOString(), followUpFired: true },
  });

  await logAction(jobId, "step2", `Follow-up sent to ${lead.email}`, "ok");
}

export async function step3_sendContract(jobId: string): Promise<void> {
  const jobRes = await pool.query(
    `SELECT aj.*, b.company_name, b.primary_color
     FROM autopilot_jobs aj
     JOIN businesses b ON b.id = aj.business_id
     WHERE aj.id = $1`,
    [jobId]
  );
  const job = jobRes.rows[0];
  if (!job) return;

  const leadRes = await pool.query(`SELECT * FROM customers WHERE id = $1`, [job.lead_id]);
  const lead = leadRes.rows[0];
  if (!lead || !lead.email) return;

  const businessRes = await pool.query(`SELECT * FROM businesses WHERE id = $1`, [job.business_id]);
  const business = businessRes.rows[0];
  const { fromName, replyTo } = getBusinessSendParams(business);

  const html = buildWelcomeEmail({
    firstName: lead.first_name || "there",
    companyName: business.company_name,
    primaryColor: business.primary_color || "#2563EB",
  });

  try {
    await sendEmail({
      to: lead.email,
      subject: `You're booked — welcome to ${business.company_name}!`,
      html,
      fromName,
      replyTo,
    });
  } catch (err: any) {
    await logAction(jobId, "step3", "Welcome email failed", err.message);
    return;
  }

  const meta: any = job.metadata || {};
  await updateJob(jobId, {
    status: "pending_review",
    lastActionAt: new Date(),
    nextActionAt: null,
    metadata: { ...meta, step3SentAt: new Date().toISOString() },
  });

  await logAction(jobId, "step3", `Welcome/contract email sent to ${lead.email}`, "ok");
}

export async function step4_requestReview(jobId: string): Promise<void> {
  const jobRes = await pool.query(
    `SELECT aj.*, b.company_name, b.primary_color
     FROM autopilot_jobs aj
     JOIN businesses b ON b.id = aj.business_id
     WHERE aj.id = $1`,
    [jobId]
  );
  const job = jobRes.rows[0];
  if (!job) return;

  const leadRes = await pool.query(`SELECT * FROM customers WHERE id = $1`, [job.lead_id]);
  const lead = leadRes.rows[0];
  if (!lead || !lead.email) return;

  const businessRes = await pool.query(`SELECT * FROM businesses WHERE id = $1`, [job.business_id]);
  const business = businessRes.rows[0];
  const { fromName, replyTo } = getBusinessSendParams(business);

  const growthRes = await pool.query(
    `SELECT google_review_link FROM growth_automation_settings WHERE business_id = $1`,
    [job.business_id]
  );
  const googleReviewLink = growthRes.rows[0]?.google_review_link || "";

  const html = buildReviewEmail({
    firstName: lead.first_name || "there",
    companyName: business.company_name,
    primaryColor: business.primary_color || "#2563EB",
    googleReviewLink,
  });

  try {
    await sendEmail({
      to: lead.email,
      subject: `How did we do? — ${business.company_name}`,
      html,
      fromName,
      replyTo,
    });
  } catch (err: any) {
    await logAction(jobId, "step4", "Review email failed", err.message);
    return;
  }

  const meta: any = job.metadata || {};
  await updateJob(jobId, {
    status: "complete",
    lastActionAt: new Date(),
    nextActionAt: null,
    metadata: { ...meta, step4SentAt: new Date().toISOString() },
  });

  await logAction(jobId, "step4", `Review request sent to ${lead.email}`, "ok");
}

export async function triggerStep3ForQuote(quoteId: string): Promise<void> {
  try {
    const res = await pool.query(
      `SELECT id FROM autopilot_jobs WHERE quote_id = $1 AND status = 'pending_response'`,
      [quoteId]
    );
    for (const row of res.rows) {
      await step3_sendContract(row.id).catch((e) =>
        console.error(`[autopilot] step3 failed for job ${row.id}:`, e.message)
      );
    }
  } catch (err: any) {
    console.error("[autopilot] triggerStep3ForQuote failed:", err.message);
  }
}

export async function triggerStep4ForBusiness(businessId: string): Promise<void> {
  try {
    const res = await pool.query(
      `SELECT id FROM autopilot_jobs WHERE business_id = $1 AND status = 'pending_review'`,
      [businessId]
    );
    for (const row of res.rows) {
      await step4_requestReview(row.id).catch((e) =>
        console.error(`[autopilot] step4 failed for job ${row.id}:`, e.message)
      );
    }
  } catch (err: any) {
    console.error("[autopilot] triggerStep4ForBusiness failed:", err.message);
  }
}

export async function processAutopilotJobs(): Promise<void> {
  try {
    const res = await pool.query(
      `SELECT * FROM autopilot_jobs
       WHERE next_action_at <= NOW()
         AND status NOT IN ('complete', 'paused')
       ORDER BY next_action_at ASC
       LIMIT 50`
    );

    for (const job of res.rows) {
      try {
        if (job.status === "pending_quote") {
          await step1_qualifyAndQuote(job.id);
        } else if (job.status === "pending_response") {
          const meta: any = job.metadata || {};
          if (meta.followUpFired) {
            await updateJob(job.id, { status: "paused", nextActionAt: null });
            await logAction(job.id, "cron", "No response after follow-up — paused", "paused");
          } else {
            await step2_followUp(job.id);
          }
        }
      } catch (err: any) {
        console.error(`[autopilot] Cron failed for job ${job.id}:`, err.message);
      }
    }
  } catch (err: any) {
    console.error("[autopilot] processAutopilotJobs failed:", err.message);
  }
}

// ─── Email Templates ──────────────────────────────────────────────────────────

function buildOutreachEmail({ openingLine, firstName, companyName, tierLabel, estimatedTotal, primaryColor, quoteId }: any) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;">
<tr><td align="center" style="padding:40px 16px;">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
  <tr><td style="background:${primaryColor};padding:28px 32px;">
    <p style="margin:0;font-size:13px;font-weight:700;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:0.1em;">${companyName}</p>
    <h1 style="margin:6px 0 0;font-size:22px;font-weight:800;color:#fff;">Your cleaning quote is ready</h1>
  </td></tr>
  <tr><td style="padding:28px 32px;">
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">${openingLine}</p>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7;">Based on what you shared, we put together a <strong>${tierLabel}</strong> quote for your home:</p>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;width:100%;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;">
      <tr><td style="padding:20px 24px;">
        <p style="margin:0 0 4px;font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Estimated Price</p>
        <p style="margin:0;font-size:32px;font-weight:800;color:${primaryColor};">$${estimatedTotal}</p>
        <p style="margin:4px 0 0;font-size:13px;color:#6b7280;">${tierLabel}</p>
      </td></tr>
    </table>
    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">This is an estimate based on the details you provided. Final pricing is confirmed after a quick walkthrough or more details about your space.</p>
    <p style="margin:0;font-size:14px;color:#374151;line-height:1.7;">Reply to this email with any questions — I read every one personally.</p>
  </td></tr>
  <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center;">
    <p style="font-size:12px;color:#9ca3af;margin:0;">${companyName}</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

function buildFollowUpEmail({ firstName, companyName, angle, primaryColor, estimatedTotal, quoteId }: any) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;">
<tr><td align="center" style="padding:40px 16px;">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
  <tr><td style="padding:28px 32px;">
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">Just wanted to follow up on the quote I sent over. ${angle}</p>
    ${estimatedTotal ? `<p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">Your estimate was <strong>$${estimatedTotal}</strong> — still available if timing works out.</p>` : ""}
    <p style="margin:0;font-size:15px;color:#374151;line-height:1.7;">No pressure at all — just want to make sure you have everything you need to make a decision. Reply here and I'll get back to you quickly.</p>
  </td></tr>
  <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center;">
    <p style="font-size:12px;color:#9ca3af;margin:0;">${companyName}</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

function buildWelcomeEmail({ firstName, companyName, primaryColor }: any) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;">
<tr><td align="center" style="padding:40px 16px;">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
  <tr><td style="background:${primaryColor};padding:28px 32px;">
    <h1 style="margin:0;font-size:22px;font-weight:800;color:#fff;">You're booked!</h1>
  </td></tr>
  <tr><td style="padding:28px 32px;">
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">Thank you for choosing ${companyName} — we're excited to take care of your home.</p>
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">We'll reach out to confirm scheduling details shortly. In the meantime, if you have any special requests or access instructions for your home, just reply here.</p>
    <p style="margin:0;font-size:15px;color:#374151;line-height:1.7;">Looking forward to it!</p>
  </td></tr>
  <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center;">
    <p style="font-size:12px;color:#9ca3af;margin:0;">${companyName}</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

function buildReviewEmail({ firstName, companyName, primaryColor, googleReviewLink }: any) {
  const reviewSection = googleReviewLink
    ? `<table cellpadding="0" cellspacing="0" style="margin:24px 0;">
        <tr><td style="background:${primaryColor};border-radius:8px;">
          <a href="${googleReviewLink}" style="display:inline-block;padding:13px 24px;font-size:14px;font-weight:700;color:#fff;text-decoration:none;">Leave a Google Review &rarr;</a>
        </td></tr>
      </table>`
    : "";

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;">
<tr><td align="center" style="padding:40px 16px;">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
  <tr><td style="padding:28px 32px;">
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">We hope everything was spotless! It was a pleasure taking care of your home.</p>
    <p style="margin:0 0 4px;font-size:15px;color:#374151;line-height:1.7;">If you have a moment, a quick review goes a long way for a small business like ours — it helps other homeowners find us.</p>
    ${reviewSection}
    <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.6;">No pressure at all — just genuinely appreciated if you do. Either way, we hope to see you again soon.</p>
  </td></tr>
  <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center;">
    <p style="font-size:12px;color:#9ca3af;margin:0;">${companyName}</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}
