/**
 * server/dripEmails.ts
 * Trial drip email system for QuotePro AI.
 * Handles enrollment, sending, stats, and unsubscribe tokens.
 */

import crypto from "node:crypto";
import { pool } from "./db";
import { sendEmail, PLATFORM_FROM_EMAIL } from "./mail";

/* ─── Constants ─────────────────────────────────────────────────────────────── */

const DRIP_FROM_NAME = "Mike at QuotePro";
const DRIP_REPLY_TO = "mike@getquotepro.ai";
const APP_BASE_URL = process.env.PUBLIC_APP_URL || "https://app.getquotepro.ai";

/* ─── Token helpers ─────────────────────────────────────────────────────────── */

function getDripSecret(): string {
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET environment variable is required");
  }
  return process.env.SESSION_SECRET;
}

export function generateUnsubscribeToken(userId: string): string {
  return crypto.createHmac("sha256", getDripSecret()).update(userId).digest("hex");
}

export function verifyUnsubscribeToken(userId: string, token: string): boolean {
  try {
    const expected = generateUnsubscribeToken(userId);
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(token, "hex"));
  } catch {
    return false;
  }
}

/* ─── Personalization helpers ────────────────────────────────────────────────── */

export function getFirstName(name: string | null | undefined, email: string): string {
  if (name && name.trim()) {
    return name.trim().split(/\s+/)[0];
  }
  const local = email.split("@")[0];
  return local.replace(/[^a-zA-Z]/g, "").slice(0, 20) || "there";
}

interface DripStats {
  quotesSent: number;
  jobsConfirmed: number;
  estimatedRevenue: number;
}

export async function getDripStats(userId: string): Promise<DripStats> {
  try {
    const result = await pool.query(
      `SELECT
        (SELECT COUNT(*) FROM quotes q JOIN businesses b ON b.id = q.business_id WHERE b.owner_user_id = $1) AS quotes_sent,
        (SELECT COUNT(*) FROM jobs j JOIN businesses b ON b.id = j.business_id WHERE b.owner_user_id = $1) AS jobs_confirmed,
        (SELECT COALESCE(SUM(q.total), 0) FROM quotes q JOIN businesses b ON b.id = q.business_id WHERE b.owner_user_id = $1 AND q.status = 'accepted') AS estimated_revenue`,
      [userId]
    );
    const row = result.rows[0];
    return {
      quotesSent: parseInt(row?.quotes_sent ?? "0", 10),
      jobsConfirmed: parseInt(row?.jobs_confirmed ?? "0", 10),
      estimatedRevenue: parseFloat(row?.estimated_revenue ?? "0"),
    };
  } catch {
    return { quotesSent: 0, jobsConfirmed: 0, estimatedRevenue: 0 };
  }
}

/* ─── Enrollment ─────────────────────────────────────────────────────────────── */

export async function enrollUserInDrip(
  userId: string,
  email: string,
  name: string | null | undefined
): Promise<void> {
  // Skip enrollment silently for Apple relay addresses — they cannot receive external email
  const check = await pool.query(
    `SELECT email_unreachable FROM users WHERE id = $1`,
    [userId]
  );
  if (check.rows[0]?.email_unreachable) {
    console.log(`[drip] Skipping enrollment — unreachable address: ${email}`);
    return;
  }

  await pool.query(
    `UPDATE users
     SET trial_drip_enrolled_at = NOW(),
         trial_drip_last_sent_day = 0,
         trial_drip_completed = FALSE,
         trial_drip_unsubscribed = FALSE
     WHERE id = $1`,
    [userId]
  );

  // Send Day 0 immediately — non-blocking so signup doesn't slow down
  sendDripDay(userId, email, name, 0).catch((err) => {
    console.error(`[drip] Day 0 send failed for ${email}:`, err.message);
  });
}

/* ─── Shared email layout ────────────────────────────────────────────────────── */

function layout(opts: {
  preheader?: string;
  body: string;
  unsubscribeUrl: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>QuotePro</title>
<!--[if mso]><style>table{border-collapse:collapse;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background:#f4f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
${opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${opts.preheader}&zwnj;&nbsp;</div>` : ""}
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f0;padding:32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

      <!-- Header -->
      <tr>
        <td style="background:#1d3557;border-radius:12px 12px 0 0;padding:28px 40px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">QuotePro AI</span>
                <span style="font-size:13px;color:rgba(255,255,255,0.6);margin-left:8px;">for cleaning pros</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="background:#ffffff;padding:40px;border-left:1px solid #e8e8e0;border-right:1px solid #e8e8e0;">
          ${opts.body}
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#f9f9f7;border:1px solid #e8e8e0;border-top:none;border-radius:0 0 12px 12px;padding:24px 40px;text-align:center;">
          <p style="margin:0 0 8px;font-size:13px;color:#888;line-height:1.5;">
            You're receiving this because you signed up for QuotePro AI.<br />
            Your account remains active even if you unsubscribe from these emails.
          </p>
          <p style="margin:0;font-size:12px;">
            <a href="${opts.unsubscribeUrl}" style="color:#1d3557;text-decoration:underline;">Unsubscribe from trial emails</a>
            &nbsp;&bull;&nbsp;
            <a href="https://getquotepro.ai" style="color:#888;text-decoration:none;">getquotepro.ai</a>
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function btn(text: string, href: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr>
      <td style="background:#1d3557;border-radius:8px;padding:0;">
        <a href="${href}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.1px;">${text}</a>
      </td>
    </tr>
  </table>`;
}

function h1(text: string): string {
  return `<h1 style="margin:0 0 20px;font-size:26px;font-weight:700;color:#1d3557;line-height:1.25;">${text}</h1>`;
}

function p(text: string, style = ""): string {
  return `<p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;${style}">${text}</p>`;
}

function bullet(items: string[]): string {
  const lis = items.map((i) => `<li style="margin:0 0 10px;font-size:15px;color:#374151;line-height:1.6;">${i}</li>`).join("");
  return `<ul style="margin:0 0 20px;padding-left:22px;">${lis}</ul>`;
}

function divider(): string {
  return `<hr style="border:none;border-top:1px solid #e8e8e0;margin:28px 0;" />`;
}

function signOff(): string {
  return `${divider()}
${p("— Mike, founder of QuotePro &amp; cleaning franchise owner", "color:#6b7280;font-size:14px;font-style:italic;")}
${p('<a href="mailto:mike@getquotepro.ai" style="color:#1d3557;font-size:14px;">mike@getquotepro.ai</a> &nbsp;·&nbsp; I personally read every reply.', "font-size:13px;color:#9ca3af;")}`;
}

function callout(text: string): string {
  return `<div style="background:#f0f4ff;border-left:4px solid #1d3557;border-radius:0 8px 8px 0;padding:16px 20px;margin:20px 0;">
    <p style="margin:0;font-size:14px;color:#1d3557;line-height:1.6;">${text}</p>
  </div>`;
}

/* ─── Email templates ────────────────────────────────────────────────────────── */

function templateDay0(firstName: string, appUrl: string, unsubscribeUrl: string): { subject: string; html: string } {
  const subject = `Welcome to QuotePro, ${firstName} — here's where to start`;
  const body = `
${h1(`You're in, ${firstName}. Your 14-day trial starts now.`)}
${p("You're now on a full Growth trial — every feature unlocked, no credit card required. Here's what's waiting for you:")}
${bullet([
  "<strong>Send a quote in 60 seconds</strong> — describe a job in plain English, AI builds the quote",
  "<strong>Good / Better / Best proposals</strong> — stop leaving money on the table with single-price quotes",
  "<strong>Automated follow-ups</strong> — AI follows up on unanswered quotes so you don't have to",
])}
${btn("Send your first quote in 60 seconds →", `${appUrl}/quotes/new`)}
${callout("💡 <strong>Quick tip:</strong> Most cleaners send their first QuotePro quote within 10 minutes of signing up. Try the AI Quote Builder — just describe the job in plain English.")}
${p("Over the next two weeks, I'll send you a few short emails showing you the features that make the biggest difference for cleaning businesses like yours.")}
${p("Questions? Hit reply — I read every single one.")}
${signOff()}`;
  return { subject, html: layout({ preheader: "Your 14-day free trial starts now", body, unsubscribeUrl }) };
}

function templateDay1(firstName: string, unsubscribeUrl: string): { subject: string; html: string } {
  const ctaUrl = "https://app.getquotepro.ai/quotes/new";
  const subject = `Your account is live — send your first quote in 3 minutes`;
  const body = `
${h1(`Your account is ready, ${firstName}.`)}
${p("Everything is set up. The fastest way to see what QuotePro does is to send a real quote right now — it takes under 3 minutes.")}
${p("You don't need a customer lined up. Just enter a name, describe the job, and hit send. You'll see immediately how Good / Better / Best proposals look to your clients.")}
${btn("Send My First Quote →", ctaUrl)}
${p("Questions? Just reply to this email.", "color:#6b7280;font-size:14px;")}
${signOff()}`;
  return { subject, html: layout({ preheader: "Your account is live — send a quote in 3 minutes", body, unsubscribeUrl }) };
}

function templateDay2HasQuote(firstName: string, appUrl: string, unsubscribeUrl: string): { subject: string; html: string } {
  const subject = `Great start, ${firstName} — here's how to close that quote`;
  const body = `
${h1(`You're already ahead of the pack, ${firstName}.`)}
${p("You've sent at least one quote — that puts you ahead of most cleaners who sign up and never take action. Here's how to turn that quote into a confirmed job:")}
${bullet([
  "<strong>Check if they've opened it</strong> — QuotePro shows you when your customer viewed the quote",
  "<strong>Use the AI follow-up</strong> — one click sends a personalized follow-up message if they haven't responded",
  "<strong>Good / Better / Best tiers</strong> — customers who see 3 options accept 34% more often than single-price quotes",
])}
${btn("View your quotes →", `${appUrl}/quotes`)}
${callout("<strong>Did you know?</strong> Cleaners using Good/Better/Best proposals see their average ticket size increase by 18-27% in the first month. It only takes 2 minutes to set up.")}
${signOff()}`;
  return { subject, html: layout({ preheader: "You sent a quote — now let's close it", body, unsubscribeUrl }) };
}

function templateDay2NoQuote(firstName: string, appUrl: string, unsubscribeUrl: string): { subject: string; html: string } {
  const subject = `Have you sent your first quote yet, ${firstName}?`;
  const body = `
${h1(`Most cleaners close their first QuotePro job within 48 hours.`)}
${p(`Hey ${firstName} — you signed up 2 days ago but haven't sent a quote yet. That's okay — let me make this as easy as possible.`)}
${p("Here's the fastest way to send a quote right now:")}
${bullet([
  "Tap <strong>New Quote</strong> and pick a customer (or enter their info)",
  "Describe the job in plain English — AI fills in the details",
  "Select Good / Better / Best tiers and hit Send",
])}
${btn("Send your first quote now →", `${appUrl}/quotes/new`)}
${callout("<strong>Why Good / Better / Best?</strong> Instead of one price, you give customers three options. Customers who choose the middle or top tier are more likely to book — and they book bigger jobs. It takes 30 seconds to set up.")}
${p("The whole thing takes under 3 minutes. And once you see how easy it is, you'll wonder how you quoted jobs before.")}
${signOff()}`;
  return { subject, html: layout({ preheader: "Send your first quote — it takes 60 seconds", body, unsubscribeUrl }) };
}

function templateDay4(firstName: string, appUrl: string, unsubscribeUrl: string): { subject: string; html: string } {
  const subject = `This cleaning business recovered $400 with one button`;
  const body = `
${h1(`One button. $400 recovered. True story.`)}
${p(`Hey ${firstName} — here's something that happens to every cleaning business:`)}
${p("A homeowner asks for a quote. You send it. Life gets busy. You forget to follow up. Two weeks later you realize that job never booked — and you never knew why.")}
${p("That's exactly what happened to Maria, who runs a 3-person cleaning team in Austin. She had 8 open quotes sitting in her inbox for 10+ days. She forgot to follow up on all of them.")}
${p("Then she turned on AI follow-up in QuotePro.")}
${callout("<strong>What happened next:</strong> QuotePro automatically sent a personalized follow-up to each of those 8 customers. 3 of them booked — that's <strong>$400 in recovered revenue</strong> from quotes she'd given up on.")}
${p("Here's how AI follow-up works in QuotePro:")}
${bullet([
  "You decide the timing (e.g., follow up after 2 days if not accepted)",
  "AI writes a personalized message — not a generic template",
  "It sends automatically via email or text",
  "You can review or edit any message before it goes out",
])}
${btn("See your unanswered quotes →", `${appUrl}/quotes?status=sent`)}
${p("Most cleaners have $200–$800 in unbooked quotes sitting right now. This feature finds that money for you.")}
${signOff()}`;
  return { subject, html: layout({ preheader: "Recover revenue from quotes you forgot to follow up on", body, unsubscribeUrl }) };
}

function templateDay7(
  firstName: string,
  appUrl: string,
  unsubscribeUrl: string,
  stats: DripStats
): { subject: string; html: string } {
  const subject = `7 days down, 7 to go — here's your trial scorecard`;
  const revenue = stats.estimatedRevenue > 0 ? `$${Math.round(stats.estimatedRevenue).toLocaleString()}` : "$0";
  const body = `
${h1(`Here's where you stand at the halfway mark, ${firstName}.`)}
${p("You're 7 days into your trial. Here's a quick look at what you've done:")}
<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border:1px solid #e8e8e0;border-radius:8px;overflow:hidden;">
  <tr style="background:#f9f9f7;">
    <td style="padding:16px 20px;border-bottom:1px solid #e8e8e0;">
      <p style="margin:0;font-size:12px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Quotes Sent</p>
      <p style="margin:4px 0 0;font-size:28px;font-weight:700;color:#1d3557;">${stats.quotesSent}</p>
    </td>
    <td style="padding:16px 20px;border-bottom:1px solid #e8e8e0;border-left:1px solid #e8e8e0;">
      <p style="margin:0;font-size:12px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Jobs Confirmed</p>
      <p style="margin:4px 0 0;font-size:28px;font-weight:700;color:#1d3557;">${stats.jobsConfirmed}</p>
    </td>
    <td style="padding:16px 20px;border-bottom:1px solid #e8e8e0;border-left:1px solid #e8e8e0;">
      <p style="margin:0;font-size:12px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Estimated Revenue</p>
      <p style="margin:4px 0 0;font-size:28px;font-weight:700;color:#1d3557;">${revenue}</p>
    </td>
  </tr>
</table>
${p("Here are the Growth features that make the biggest difference — have you tried them yet?")}
${bullet([
  "<strong>AI Follow-Up Automation</strong> — automatically follows up on unanswered quotes. Set it once, it runs forever.",
  "<strong>AI Agent (Coach Me mode)</strong> — get sales scripts, objection handling, and pricing advice on demand.",
  "<strong>Campaign Emails</strong> — send a re-engagement email to all your past customers in 2 clicks.",
])}
${btn("Explore what you haven't tried yet →", `${appUrl}/dashboard`)}
${divider()}
${p("<strong>Ready to keep everything after your trial?</strong>", "font-size:16px;color:#1d3557;")}
${p("Growth is $49/month. That's less than the profit from one extra job per month — and most cleaners book 2–5 extra jobs per month with QuotePro.")}
${btn("Upgrade to Growth — $49/mo →", `${appUrl}/pricing`)}
${p("Or keep exploring free for 7 more days — no pressure. I just want you to make an informed decision.", "color:#6b7280;font-size:14px;")}
${signOff()}`;
  return { subject, html: layout({ preheader: "Your halfway report — quotes, jobs, and revenue", body, unsubscribeUrl }) };
}

function templateDay13(firstName: string, appUrl: string, unsubscribeUrl: string): { subject: string; html: string } {
  const subject = `Your trial ends tomorrow, ${firstName}`;
  const body = `
${h1(`Tomorrow your trial ends, ${firstName}.`)}
${p("Your 14-day Growth trial expires tomorrow. After that, your account moves to the free tier.")}
${p("Here's what you'll lose access to on the free tier:")}
${bullet([
  "AI Follow-Up Automation (your automated follow-ups stop sending)",
  "AI Quote Builder — describe jobs in plain English",
  "AI Agent: Coach Me + Teach Me modes",
  "Campaign emails to your customer list",
  "Revenue reports and forecasting",
  "Good / Better / Best proposal tiers",
  "Unlimited quotes (free tier: 3/month)",
])}
${callout("<strong>Everything you've set up stays intact.</strong> Your customers, quotes, and jobs are safe either way. Upgrading just means keeping the AI features running.")}
${p("Upgrading takes 60 seconds:")}
${btn("Upgrade to Growth — $49/mo →", `${appUrl}/pricing`)}
${p("Annual billing saves you $120/year ($39/mo instead of $49). Both options are on the pricing page.")}
${divider()}
${p("Have a question before you decide? Reply to this email — I personally read every reply and usually respond within a few hours.")}
${p("Either way, thank you for trying QuotePro. It's been built by a cleaning business owner for cleaning business owners — I hope it's made your life a little easier.")}
${signOff()}`;
  return { subject, html: layout({ preheader: "Trial ends tomorrow — here's what changes", body, unsubscribeUrl }) };
}

/* ─── Main send function ─────────────────────────────────────────────────────── */

export async function sendDripDay(
  userId: string,
  email: string,
  name: string | null | undefined,
  day: number
): Promise<void> {
  const firstName = getFirstName(name, email);
  const unsubToken = generateUnsubscribeToken(userId);
  const unsubscribeUrl = `${APP_BASE_URL}/api/email/unsubscribe?uid=${userId}&token=${unsubToken}`;
  const appUrl = `${APP_BASE_URL}/app`;

  let subject = "";
  let html = "";
  let templateKey = "";

  if (day === 0) {
    ({ subject, html } = templateDay0(firstName, appUrl, unsubscribeUrl));
    templateKey = "drip_day0_welcome";
  } else if (day === 1) {
    const stats = await getDripStats(userId);
    if (stats.quotesSent > 0) {
      // User already sent a quote — no nudge needed; advance the counter and exit
      await pool.query(
        `UPDATE users SET trial_drip_last_sent_day = 1 WHERE id = $1`,
        [userId]
      );
      console.log(`[drip] Day 1 skipped (already sent quote) → ${email}`);
      return;
    }
    ({ subject, html } = templateDay1(firstName, unsubscribeUrl));
    templateKey = "drip_day1_firstquote";
  } else if (day === 2) {
    const stats = await getDripStats(userId);
    if (stats.quotesSent > 0) {
      ({ subject, html } = templateDay2HasQuote(firstName, appUrl, unsubscribeUrl));
      templateKey = "drip_day2_hassent";
    } else {
      ({ subject, html } = templateDay2NoQuote(firstName, appUrl, unsubscribeUrl));
      templateKey = "drip_day2_nosent";
    }
  } else if (day === 4) {
    ({ subject, html } = templateDay4(firstName, appUrl, unsubscribeUrl));
    templateKey = "drip_day4_followup";
  } else if (day === 7) {
    const stats = await getDripStats(userId);
    ({ subject, html } = templateDay7(firstName, appUrl, unsubscribeUrl, stats));
    templateKey = "drip_day7_scorecard";
  } else if (day === 13) {
    ({ subject, html } = templateDay13(firstName, appUrl, unsubscribeUrl));
    templateKey = "drip_day13_lastchance";
  } else {
    console.warn(`[drip] Unknown day ${day} for user ${userId}`);
    return;
  }

  await sendEmail({ to: email, subject, html, fromName: DRIP_FROM_NAME, replyTo: DRIP_REPLY_TO });

  // Update the last sent day tracker
  await pool.query(
    `UPDATE users SET trial_drip_last_sent_day = $1 WHERE id = $2`,
    [day, userId]
  );

  // Log to communications table (best-effort)
  try {
    const bizRow = await pool.query(
      `SELECT id FROM businesses WHERE owner_user_id = $1 LIMIT 1`,
      [userId]
    );
    if (bizRow.rows.length > 0) {
      const businessId = bizRow.rows[0].id;
      await pool.query(
        `INSERT INTO communications (id, business_id, channel, direction, template_key, content, status, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, 'email', 'outbound', $2, $3, 'sent', NOW(), NOW())`,
        [businessId, templateKey, `Trial drip email: ${subject}`]
      );
    }
  } catch (logErr: any) {
    console.warn("[drip] Communications log failed:", logErr.message);
  }

  console.log(`[drip] Day ${day} email sent → ${email} (${templateKey})`);
}

/* ─── Drip cron processor ────────────────────────────────────────────────────── */

export async function processDripQueue(): Promise<void> {
  let processed = 0;
  let skipped = 0;

  try {
    const result = await pool.query<{
      id: string;
      email: string;
      contact_email: string | null;
      email_unreachable: boolean;
      name: string | null;
      trial_drip_enrolled_at: Date;
      trial_drip_last_sent_day: number;
      subscription_tier: string;
    }>(
      `SELECT id, email, contact_email, email_unreachable, name, trial_drip_enrolled_at, trial_drip_last_sent_day, subscription_tier
       FROM users
       WHERE trial_drip_enrolled_at IS NOT NULL
         AND trial_drip_completed = FALSE
         AND trial_drip_unsubscribed = FALSE
       ORDER BY trial_drip_enrolled_at ASC`
    );

    for (const user of result.rows) {
      try {
        // Skip users with unreachable addresses (Apple relay with no fallback provided)
        if (user.email_unreachable) {
          skipped++;
          continue;
        }

        // Skip users who have upgraded
        if (user.subscription_tier !== "free") {
          await pool.query(
            `UPDATE users SET trial_drip_completed = TRUE WHERE id = $1`,
            [user.id]
          );
          skipped++;
          continue;
        }

        const enrolledAt = new Date(user.trial_drip_enrolled_at);
        const now = new Date();
        const daysSinceEnroll = Math.floor(
          (now.getTime() - enrolledAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        const lastDay = user.trial_drip_last_sent_day ?? 0;

        let nextDay: number | null = null;

        if (lastDay === 0 && daysSinceEnroll >= 1) nextDay = 1;
        else if (lastDay === 1 && daysSinceEnroll >= 2) nextDay = 2;
        else if (lastDay === 2 && daysSinceEnroll >= 4) nextDay = 4;
        else if (lastDay === 4 && daysSinceEnroll >= 7) nextDay = 7;
        else if (lastDay === 7 && daysSinceEnroll >= 13) nextDay = 13;
        else if (lastDay === 13) {
          await pool.query(
            `UPDATE users SET trial_drip_completed = TRUE WHERE id = $1`,
            [user.id]
          );
          skipped++;
          continue;
        }

        if (nextDay !== null) {
          const effectiveEmail = user.contact_email || user.email;
          await sendDripDay(user.id, effectiveEmail, user.name, nextDay);
          processed++;
        }
      } catch (userErr: any) {
        console.error(`[drip] Failed processing user ${user.id}:`, userErr.message);
      }
    }
  } catch (err: any) {
    console.error("[drip] Queue processing failed:", err.message);
  }

  if (processed > 0 || skipped > 0) {
    console.log(`[drip] Cron complete: ${processed} sent, ${skipped} skipped/completed`);
  }
}

/* ─── Activation nudges (24h / 48h / 70h) ──────────────────────────────────── */
// Sent to free users who signed up but never created a quote.

export async function processActivationNudges(): Promise<void> {
  const now = new Date();

  const result = await pool.query<{
    id: string;
    email: string;
    contact_email: string | null;
    name: string | null;
    email_unreachable: boolean;
    activation_nudge_24h_sent: boolean;
    activation_nudge_48h_sent: boolean;
    activation_nudge_70h_sent: boolean;
    hours_since_signup: number;
    quote_count: string;
  }>(`
    SELECT
      u.id,
      u.email,
      u.contact_email,
      u.name,
      u.email_unreachable,
      u.activation_nudge_24h_sent,
      u.activation_nudge_48h_sent,
      u.activation_nudge_70h_sent,
      EXTRACT(EPOCH FROM (NOW() - u.created_at)) / 3600 AS hours_since_signup,
      COUNT(q.id)::text AS quote_count
    FROM users u
    LEFT JOIN businesses b ON b.owner_user_id = u.id
    LEFT JOIN quotes q ON q.business_id = b.id
    WHERE u.subscription_tier = 'free'
      AND u.email_unreachable = FALSE
      AND u.trial_drip_unsubscribed = FALSE
      AND (
        u.activation_nudge_24h_sent = FALSE OR
        u.activation_nudge_48h_sent = FALSE OR
        u.activation_nudge_70h_sent = FALSE
      )
    GROUP BY u.id, u.email, u.contact_email, u.name, u.email_unreachable,
             u.activation_nudge_24h_sent, u.activation_nudge_48h_sent,
             u.activation_nudge_70h_sent, u.created_at
    HAVING COUNT(q.id) = 0
  `);

  let sent = 0;
  const APP_URL = process.env.PUBLIC_APP_URL || "https://app.getquotepro.ai";

  for (const user of result.rows) {
    const firstName = getFirstName(user.name, user.email);
    const effectiveEmail = user.contact_email || user.email;
    const hours = user.hours_since_signup;
    const unsubToken = generateUnsubscribeToken(user.id);
    const unsubUrl = `${APP_URL}/api/drip/unsubscribe?uid=${user.id}&token=${unsubToken}`;
    const ctaUrl = `${APP_URL}/app/quotes/new`;

    try {
      // 24h nudge — friendly first check-in
      if (!user.activation_nudge_24h_sent && hours >= 24 && hours < 120) {
        const subject = `${firstName}, your first quote is one click away`;
        const html = layout({
          preheader: "It takes under 2 minutes — and most people are surprised how good it looks.",
          unsubscribeUrl: unsubUrl,
          body: `
            <p style="margin:0 0 16px;font-size:16px;color:#111827;font-weight:600;">Hey ${firstName} 👋</p>
            <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
              You signed up for QuotePro AI yesterday — but haven't sent your first quote yet.
            </p>
            <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
              Here's the thing: the first one takes less than 2 minutes. Just enter a customer's home details, pick a price option, and hit send. That's it.
            </p>
            <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
              Your customer gets a beautiful, professional quote they can accept with one tap — and you look like a pro before you've even cleaned a single room.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td align="center">
                  <a href="${ctaUrl}" style="display:inline-block;padding:14px 32px;background:#4f46e5;color:#fff;font-weight:700;font-size:15px;border-radius:10px;text-decoration:none;">
                    Create My First Quote →
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.6;">
              — Mike<br/>
              <span style="font-size:13px;">QuotePro AI</span>
            </p>
          `,
        });
        await sendEmail({
          to: effectiveEmail,
          subject,
          html,
          text: `Hey ${firstName}, you haven't sent your first quote yet! Create one in under 2 minutes: ${ctaUrl}`,
          fromName: "Mike at QuotePro",
          replyTo: "mike@getquotepro.ai",
        });
        await pool.query(`UPDATE users SET activation_nudge_24h_sent = TRUE WHERE id = $1`, [user.id]);
        sent++;
        continue;
      }

      // 48h nudge — show what they're missing
      if (!user.activation_nudge_48h_sent && hours >= 48 && hours < 144) {
        const subject = `Here's what quoting could look like for you`;
        const html = layout({
          preheader: "Other cleaning businesses using QuotePro are closing more jobs — here's how.",
          unsubscribeUrl: unsubUrl,
          body: `
            <p style="margin:0 0 16px;font-size:16px;color:#111827;font-weight:600;">Hi ${firstName},</p>
            <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
              You've been in QuotePro for 2 days and haven't sent a quote yet. No pressure — but I wanted to share what other cleaning businesses are getting out of it:
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">
              <tr style="background:#f9fafb;">
                <td style="padding:12px 16px;font-size:14px;color:#374151;border-bottom:1px solid #e5e7eb;">Quotes sent with one tap</td>
                <td align="right" style="padding:12px 16px;font-size:14px;font-weight:700;color:#4f46e5;border-bottom:1px solid #e5e7eb;">✓</td>
              </tr>
              <tr>
                <td style="padding:12px 16px;font-size:14px;color:#374151;border-bottom:1px solid #e5e7eb;">AI prices each job automatically</td>
                <td align="right" style="padding:12px 16px;font-size:14px;font-weight:700;color:#4f46e5;border-bottom:1px solid #e5e7eb;">✓</td>
              </tr>
              <tr style="background:#f9fafb;">
                <td style="padding:12px 16px;font-size:14px;color:#374151;">Follow-ups sent automatically</td>
                <td align="right" style="padding:12px 16px;font-size:14px;font-weight:700;color:#4f46e5;">✓</td>
              </tr>
            </table>
            <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
              None of that is available until you send quote #1. It's literally the unlock.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td align="center">
                  <a href="${ctaUrl}" style="display:inline-block;padding:14px 32px;background:#4f46e5;color:#fff;font-weight:700;font-size:15px;border-radius:10px;text-decoration:none;">
                    Send My First Quote →
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.6;">
              — Mike<br/>
              <span style="font-size:13px;">QuotePro AI</span>
            </p>
          `,
        });
        await sendEmail({
          to: effectiveEmail,
          subject,
          html,
          text: `Hi ${firstName}, see what other cleaning businesses are getting from QuotePro. Create your first quote: ${ctaUrl}`,
          fromName: "Mike at QuotePro",
          replyTo: "mike@getquotepro.ai",
        });
        await pool.query(`UPDATE users SET activation_nudge_48h_sent = TRUE WHERE id = $1`, [user.id]);
        sent++;
        continue;
      }

      // 70h nudge — last one, make it count
      if (!user.activation_nudge_70h_sent && hours >= 70) {
        const subject = `Last check-in from me, ${firstName}`;
        const html = layout({
          preheader: "If quoting isn't the right fit right now, no worries — but I wanted to ask.",
          unsubscribeUrl: unsubUrl,
          body: `
            <p style="margin:0 0 16px;font-size:16px;color:#111827;font-weight:600;">Hey ${firstName},</p>
            <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
              This is my last nudge — I promise.
            </p>
            <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
              You signed up for QuotePro but haven't created a quote yet. I'm curious — is something getting in the way? Too busy? Not sure where to start? Just reply to this email and I'll help personally.
            </p>
            <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
              Or if you're ready, here's your direct link:
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td align="center">
                  <a href="${ctaUrl}" style="display:inline-block;padding:14px 32px;background:#4f46e5;color:#fff;font-weight:700;font-size:15px;border-radius:10px;text-decoration:none;">
                    Create a Quote Now →
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.6;">
              — Mike<br/>
              <span style="font-size:13px;">QuotePro AI · <a href="${unsubUrl}" style="color:#9ca3af;">Unsubscribe</a></span>
            </p>
          `,
        });
        await sendEmail({
          to: effectiveEmail,
          subject,
          html,
          text: `Hey ${firstName}, this is my last nudge. Create your first quote: ${ctaUrl}`,
          fromName: "Mike at QuotePro",
          replyTo: "mike@getquotepro.ai",
        });
        await pool.query(`UPDATE users SET activation_nudge_70h_sent = TRUE WHERE id = $1`, [user.id]);
        sent++;
      }
    } catch (err: any) {
      console.error(`[activation-nudge] Failed for user ${user.id}:`, err.message);
    }
  }

  if (sent > 0) {
    console.log(`[activation-nudge] Sent ${sent} nudge(s)`);
  }
}

/* ─── Backfill: enroll pre-drip users with a reactivation email ─────────────── */
// Runs once at startup. Finds users who never got any drip email and sends them
// a one-time "we missed you" reactivation, then marks them drip_completed so they
// don't get the regular day-sequence (which would be confusing weeks after signup).

export async function backfillReactivationEmails(): Promise<void> {
  const APP_URL = process.env.PUBLIC_APP_URL || "https://app.getquotepro.ai";

  const result = await pool.query<{
    id: string;
    email: string;
    contact_email: string | null;
    name: string | null;
    quote_count: string;
    hours_since_signup: number;
  }>(`
    SELECT
      u.id,
      u.email,
      u.contact_email,
      u.name,
      EXTRACT(EPOCH FROM (NOW() - u.created_at)) / 3600 AS hours_since_signup,
      COUNT(q.id)::text AS quote_count
    FROM users u
    LEFT JOIN businesses b ON b.owner_user_id = u.id
    LEFT JOIN quotes q ON q.business_id = b.id
    WHERE u.trial_drip_enrolled_at IS NULL
      AND u.email_unreachable = FALSE
      AND u.subscription_tier = 'free'
      AND u.created_at < NOW() - INTERVAL '3 days'
    GROUP BY u.id, u.email, u.contact_email, u.name, u.created_at
    HAVING COUNT(q.id) = 0
    ORDER BY u.created_at DESC
  `);

  if (result.rows.length === 0) {
    console.log("[drip-backfill] No unenrolled users to reactivate.");
    return;
  }

  console.log(`[drip-backfill] Found ${result.rows.length} users to reactivate.`);
  let sent = 0;

  for (const user of result.rows) {
    try {
      const firstName = getFirstName(user.name, user.email);
      const effectiveEmail = user.contact_email || user.email;
      const unsubToken = generateUnsubscribeToken(user.id);
      const unsubUrl = `${APP_URL}/api/drip/unsubscribe?uid=${user.id}&token=${unsubToken}`;
      const ctaUrl = `${APP_URL}/app/quotes/new`;

      // Mark enrolled + completed up front so we don't re-send if the cron fails mid-loop
      await pool.query(
        `UPDATE users
         SET trial_drip_enrolled_at = NOW(),
             trial_drip_last_sent_day = 0,
             trial_drip_completed = TRUE,
             trial_drip_unsubscribed = FALSE
         WHERE id = $1`,
        [user.id]
      );

      const subject = `${firstName}, your QuotePro account is waiting for you`;
      const html = layout({
        preheader: "You signed up a little while back — here's your quick-start link.",
        unsubscribeUrl: unsubUrl,
        body: `
          <p style="margin:0 0 16px;font-size:16px;color:#111827;font-weight:600;">Hey ${firstName},</p>
          <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
            You signed up for QuotePro AI a little while back — and your account is still sitting there ready to go.
          </p>
          <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
            If you're still running your cleaning business and looking to win more jobs without playing phone tag, this is a good time to try sending your first quote. It takes under 2 minutes.
          </p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
            Your account is free — no card needed — and everything is still saved exactly where you left it.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr>
              <td align="center">
                <a href="${ctaUrl}" style="display:inline-block;padding:14px 32px;background:#4f46e5;color:#fff;font-weight:700;font-size:15px;border-radius:10px;text-decoration:none;">
                  Pick Up Where I Left Off →
                </a>
              </td>
            </tr>
          </table>
          <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.6;">
            — Mike<br/>
            <span style="font-size:13px;">QuotePro AI · <a href="${unsubUrl}" style="color:#9ca3af;">Unsubscribe</a></span>
          </p>
        `,
      });

      await sendEmail({
        to: effectiveEmail,
        subject,
        html,
        text: `Hey ${firstName}, your QuotePro account is still waiting. Create your first quote here: ${ctaUrl}`,
        fromName: "Mike at QuotePro",
        replyTo: "mike@getquotepro.ai",
      });

      sent++;

      // Throttle: 1 per second to avoid hammering the mail server
      await new Promise((r) => setTimeout(r, 1000));
    } catch (err: any) {
      console.error(`[drip-backfill] Failed for user ${user.id}:`, err.message);
    }
  }

  console.log(`[drip-backfill] Complete. Sent ${sent} reactivation emails.`);
}

/* ─── One-time fix: mark existing Apple relay users as unreachable ─────────── */

export async function fixAppleRelayEmailsUnreachable(): Promise<void> {
  const result = await pool.query(
    `UPDATE users
     SET email_unreachable = TRUE
     WHERE email LIKE '%@privaterelay.appleid.com'
       AND email_unreachable = FALSE`
  );
  if ((result.rowCount ?? 0) > 0) {
    console.log(`[drip] Marked ${result.rowCount} Apple relay email(s) as unreachable.`);
  }
}

/* ─── Personal one-line outreach campaign ────────────────────────────────────── */
// Sends a hand-crafted personal email to segmented non-paying users.
// bucket: "never_quoted" | "quoted_no_pay"

export async function sendPersonalOutreach(
  userIds: string[],
  bucket: "never_quoted" | "quoted_no_pay"
): Promise<{ sent: number; failed: number; skipped: number }> {
  const APP_URL = process.env.PUBLIC_APP_URL || "https://app.getquotepro.ai";
  let sent = 0, failed = 0, skipped = 0;

  for (const userId of userIds) {
    try {
      const result = await pool.query<{
        email: string;
        contact_email: string | null;
        name: string | null;
        email_unreachable: boolean;
        trial_drip_unsubscribed: boolean;
        quote_count: string;
      }>(`
        SELECT u.email, u.contact_email, u.name, u.email_unreachable, u.trial_drip_unsubscribed,
               COUNT(q.id)::text AS quote_count
        FROM users u
        LEFT JOIN businesses b ON b.owner_user_id = u.id
        LEFT JOIN quotes q ON q.business_id = b.id
        WHERE u.id = $1
        GROUP BY u.email, u.contact_email, u.name, u.email_unreachable, u.trial_drip_unsubscribed
      `, [userId]);

      const user = result.rows[0];
      if (!user || user.email_unreachable || user.trial_drip_unsubscribed) { skipped++; continue; }

      const firstName = getFirstName(user.name, user.email);
      const effectiveEmail = user.contact_email || user.email;
      const quoteCount = parseInt(user.quote_count || "0", 10);
      const unsubToken = generateUnsubscribeToken(userId);
      const unsubUrl = `${APP_URL}/api/drip/unsubscribe?uid=${userId}&token=${unsubToken}`;

      let subject: string;
      let plainText: string;

      if (bucket === "never_quoted") {
        subject = `quick question, ${firstName}`;
        plainText = `Hey ${firstName}, noticed you signed up but never got a quote out — what got in the way?\n\n— Mike\nhttps://app.getquotepro.ai\n\nUnsubscribe: ${unsubUrl}`;
      } else {
        const q = quoteCount === 1 ? "a quote" : `${quoteCount} quotes`;
        subject = `quick question, ${firstName}`;
        plainText = `Hey ${firstName}, you sent ${q} but never upgraded — what stopped you?\n\n— Mike\nhttps://app.getquotepro.ai\n\nUnsubscribe: ${unsubUrl}`;
      }

      // Plain text only — keeps it feeling personal, not automated
      const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:15px;color:#111827;line-height:1.7;max-width:480px;">
        <p>${plainText.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p>
      </div>`;

      await sendEmail({
        to: effectiveEmail,
        subject,
        html,
        text: plainText,
        fromName: "Mike at QuotePro",
        replyTo: "mike@getquotepro.ai",
      });

      sent++;
      // Throttle to avoid rate limits
      await new Promise((r) => setTimeout(r, 800));
    } catch (err: any) {
      console.error(`[personal-outreach] Failed for user ${userId}:`, err.message);
      failed++;
    }
  }

  console.log(`[personal-outreach] Done — sent: ${sent}, failed: ${failed}, skipped: ${skipped}`);
  return { sent, failed, skipped };
}
