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
  // The paid-only product no longer enrolls accounts in trial marketing.
  return;
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
  // Preserve old unsubscribe links/history without sending obsolete trial offers.
  return;
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
  return; // Trial campaigns are disabled for the paid-only release.
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
  return; // These templates promise free quoting.
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
    const unsubUrl = `${APP_URL}/api/email/unsubscribe?uid=${user.id}&token=${unsubToken}`;
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
  return; // Never automatically reactivate old accounts with trial offers.
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
      const unsubUrl = `${APP_URL}/api/email/unsubscribe?uid=${user.id}&token=${unsubToken}`;
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
      const unsubUrl = `${APP_URL}/api/email/unsubscribe?uid=${userId}&token=${unsubToken}`;

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

/* ─── Capterra review blast ───────────────────────────────────────────────── */
// Sends a personal review-request email to every user with a reachable email.

export async function sendCapterraReviewBlast(): Promise<{ sent: number; failed: number; skipped: number }> {
  const APP_URL = process.env.PUBLIC_APP_URL || "https://app.getquotepro.ai";
  let sent = 0, failed = 0, skipped = 0;

  const result = await pool.query<{
    id: string;
    email: string;
    contact_email: string | null;
    name: string | null;
    email_unreachable: boolean;
    trial_drip_unsubscribed: boolean;
  }>(`
    SELECT id, email, contact_email, name, email_unreachable, trial_drip_unsubscribed
    FROM users
    WHERE email IS NOT NULL
      AND email <> ''
      AND email NOT LIKE '%@privaterelay.appleid.com'
      AND email_unreachable = FALSE
      AND trial_drip_unsubscribed = FALSE
    ORDER BY created_at ASC
  `);

  console.log(`[capterra-blast] Sending to ${result.rows.length} users...`);

  for (const user of result.rows) {
    try {
      const effectiveEmail = user.contact_email || user.email;
      const rawFirst = getFirstName(user.name, user.email);
      const greeting = rawFirst && rawFirst.toLowerCase() !== "there" ? `Hi ${rawFirst},` : "Hello,";
      const unsubToken = generateUnsubscribeToken(user.id);
      const unsubUrl = `${APP_URL}/api/email/unsubscribe?uid=${user.id}&token=${unsubToken}`;

      const subject = "A quick favor — would you leave us a review?";

      const plainText = `${greeting}

I built QuotePro after losing cleaning jobs to competitors who just quoted faster than me. I run two cleaning franchise locations — so everything in the software came from real frustration in the field.

If QuotePro has helped your business at all, I'd really appreciate a quick review on Capterra. Takes about 2 minutes and it helps other cleaning business owners find us.

https://reviews.capterra.com/products/new/db6a5b19-843b-40a9-9c2c-90efe0f1dba2/

No pressure — and thank you for being a QuotePro customer.

Mike Quealy
Founder, QuotePro AI for Cleaners

---
Unsubscribe: ${unsubUrl}`;

      const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:15px;color:#111827;line-height:1.75;max-width:520px;">
        <p style="margin:0 0 16px">${greeting}</p>
        <p style="margin:0 0 16px">I built QuotePro after losing cleaning jobs to competitors who just quoted faster than me. I run two cleaning franchise locations — so everything in the software came from real frustration in the field.</p>
        <p style="margin:0 0 16px">If QuotePro has helped your business at all, I'd really appreciate a quick review on Capterra. Takes about 2 minutes and it helps other cleaning business owners find us.</p>
        <p style="margin:0 0 16px"><a href="https://reviews.capterra.com/products/new/db6a5b19-843b-40a9-9c2c-90efe0f1dba2/" style="color:#1d3557;font-weight:600;">Leave a Capterra review →</a></p>
        <p style="margin:0 0 16px">No pressure — and thank you for being a QuotePro customer.</p>
        <p style="margin:0 0 4px">Mike Quealy</p>
        <p style="margin:0 0 24px;color:#6b7280;font-size:13px;">Founder, QuotePro AI for Cleaners</p>
        <p style="margin:0;font-size:11px;color:#9ca3af;"><a href="${unsubUrl}" style="color:#9ca3af;">Unsubscribe</a></p>
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
      await new Promise((r) => setTimeout(r, 600));
    } catch (err: any) {
      console.error(`[capterra-blast] Failed for user ${user.id}:`, err.message);
      failed++;
    }
  }

  console.log(`[capterra-blast] Done — sent: ${sent}, failed: ${failed}, skipped: ${skipped}`);
  return { sent, failed, skipped };
}

// ─── Activation blast: nudge non-activated free users to send first real quote ─
export async function sendActivationBlast(
  options: { dryRun?: boolean } = {}
): Promise<{ sent: number; failed: number; skipped: number; targets: number; recipients?: string[] }> {
  const APP_URL = process.env.PUBLIC_APP_URL || "https://app.getquotepro.ai";
  const dryRun = options.dryRun === true;
  let sent = 0, failed = 0, skipped = 0;

  const result = await pool.query<{
    id: string;
    email: string;
    contact_email: string | null;
    name: string | null;
  }>(`
    SELECT id, email, contact_email, name
    FROM users
    WHERE subscription_tier = 'free'
      AND email IS NOT NULL
      AND email <> ''
      AND email_unreachable = FALSE
      AND trial_drip_unsubscribed = FALSE
      AND has_completed_first_quote = FALSE
    ORDER BY created_at ASC
  `);

  console.log(`[activation-blast] ${dryRun ? "DRY RUN — would send" : "Sending"} to ${result.rows.length} users...`);

  if (dryRun) {
    return {
      sent: 0,
      failed: 0,
      skipped: 0,
      targets: result.rows.length,
      recipients: result.rows.map(r => r.contact_email || r.email),
    };
  }

  for (const user of result.rows) {
    try {
      const effectiveEmail = user.contact_email || user.email;
      const rawFirst = getFirstName(user.name, user.email);
      const greeting = rawFirst && rawFirst.toLowerCase() !== "there" ? `Hi ${rawFirst},` : "Hello,";
      const unsubToken = generateUnsubscribeToken(user.id);
      const unsubUrl = `${APP_URL}/api/email/unsubscribe?uid=${user.id}&token=${unsubToken}`;
      const appOpen = APP_URL;

      const subject = "Send your first real quote in 2 minutes";

      const plainText = `${greeting}

Saw you signed up for QuotePro AI but haven't sent a real customer quote yet — totally normal, I want to help you get over that first hump.

Here's the 2-minute version:

  1. Open the app and tap "New Quote"
  2. Plug in a real customer's address and what they're asking for (a recurring weekly clean, a deep clean, whatever)
  3. Hit send — your customer gets a clean, branded quote with Good / Better / Best options

That's it. The whole point is to send ONE real quote and watch what happens when your customer accepts. Most owners tell me the moment they "get it" is when they see the customer click through and book on the spot.

If something's tripping you up, hit reply and tell me what's in the way. I read every email myself.

${appOpen}

— Mike
Founder, QuotePro AI for Cleaners

---
Don't want these? Unsubscribe: ${unsubUrl}`;

      const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:15px;color:#111827;line-height:1.7;max-width:540px;">
        <p style="margin:0 0 16px">${greeting}</p>
        <p style="margin:0 0 16px">Saw you signed up for QuotePro AI but haven't sent a real customer quote yet — totally normal, I want to help you get over that first hump.</p>
        <p style="margin:0 0 8px"><strong>Here's the 2-minute version:</strong></p>
        <ol style="margin:0 0 16px;padding-left:20px;">
          <li style="margin-bottom:6px">Open the app and tap <strong>New Quote</strong></li>
          <li style="margin-bottom:6px">Plug in a real customer's address and what they're asking for (recurring weekly clean, deep clean, whatever)</li>
          <li style="margin-bottom:6px">Hit send — your customer gets a clean, branded quote with Good / Better / Best options</li>
        </ol>
        <p style="margin:0 0 16px">That's it. The whole point is to send ONE real quote and watch what happens when your customer accepts. Most owners tell me the moment they "get it" is when they see the customer click through and book on the spot.</p>
        <p style="margin:0 0 20px">If something's tripping you up, hit reply and tell me what's in the way. I read every email myself.</p>
        <p style="margin:0 0 20px"><a href="${appOpen}" style="display:inline-block;background:#1d3557;color:#fff;text-decoration:none;font-weight:600;padding:11px 22px;border-radius:8px;">Open QuotePro &rarr;</a></p>
        <p style="margin:0 0 4px">&mdash; Mike</p>
        <p style="margin:0 0 24px;color:#6b7280;font-size:13px;">Founder, QuotePro AI for Cleaners</p>
        <p style="margin:0;font-size:11px;color:#9ca3af;">Don't want these? <a href="${unsubUrl}" style="color:#9ca3af;">Unsubscribe</a></p>
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
      await new Promise((r) => setTimeout(r, 600));
    } catch (err: any) {
      console.error(`[activation-blast] Failed for user ${user.id}:`, err.message);
      failed++;
    }
  }

  console.log(`[activation-blast] Done — sent: ${sent}, failed: ${failed}, skipped: ${skipped}`);
  return { sent, failed, skipped, targets: result.rows.length };
}

/* ════════════════════════════════════════════════════════════════════════════
 *  LIFECYCLE NUDGES — added 2026-04-29
 *  - Paid-but-inactive winback (uses churn_risk_score)
 *  - Paywall-cancel rescue (uses analytics_events)
 *  - AI Concierge launch announcement (one-time blast)
 *  - AI Concierge "hot lead" alert to owner
 *
 *  All four are safe to call repeatedly: each one dedupes via either a
 *  user-row column (churn_intervention_sent_at) or a communications row
 *  with template_key. Cron + admin-trigger callers wrap in lock manager.
 * ═══════════════════════════════════════════════════════════════════════════ */

import { acquireLock, releaseLock } from "./lockManager";

/* ─── 1. Paid-but-inactive winback ───────────────────────────────────────── */
export async function processChurnWinback(opts: { dryRun?: boolean } = {}): Promise<{
  sent: number; failed: number; skipped: number; targets: number;
}> {
  const got = await acquireLock("churn-winback", 15);
  if (!got) {
    console.log("[churn-winback] Skipped — lock held.");
    return { sent: 0, failed: 0, skipped: 0, targets: 0 };
  }
  try {
    const result = await pool.query<{
      id: string; email: string; contact_email: string | null; name: string | null;
      churn_risk_score: number;
    }>(`
      SELECT u.id, u.email, u.contact_email, u.name, u.churn_risk_score
      FROM users u
      WHERE u.churn_risk_score >= 50
        AND u.subscription_tier IN ('starter','growth','pro')
        AND u.email_unreachable = FALSE
        AND COALESCE(u.trial_drip_unsubscribed, FALSE) = FALSE
        AND (u.churn_intervention_sent_at IS NULL
             OR u.churn_intervention_sent_at < NOW() - INTERVAL '30 days')
      ORDER BY u.churn_risk_score DESC
      LIMIT 200
    `);
    const targets = result.rows.length;
    if (targets === 0) {
      console.log("[churn-winback] No eligible users.");
      return { sent: 0, failed: 0, skipped: 0, targets: 0 };
    }
    let sent = 0, failed = 0, skipped = 0;
    for (const u of result.rows) {
      try {
        const firstName = getFirstName(u.name, u.email);
        const to = u.contact_email || u.email;
        const unsubToken = generateUnsubscribeToken(u.id);
        const unsubUrl = `${APP_BASE_URL}/api/email/unsubscribe?uid=${u.id}&token=${unsubToken}`;
        const ctaUrl = `${APP_BASE_URL}/app`;
        const subject = `Anything we can fix, ${firstName}?`;
        const html = layout({
          preheader: "We noticed you haven't been creating quotes — what's blocking you?",
          unsubscribeUrl: unsubUrl,
          body: `
            <p style="margin:0 0 16px;font-size:16px;color:#111827;font-weight:600;">Hey ${firstName},</p>
            <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
              I've been checking the QuotePro dashboard and noticed your account has gone quiet for a couple of weeks. Before you cancel and walk away, I want to make sure it's not something we could fix.
            </p>
            <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
              Just hit reply and tell me what's not working — pricing, the workflow, the booking flow, the AI assistant, whatever. I read every reply personally and we ship fixes fast.
            </p>
            <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
              And while you're here: we just shipped the new <strong>AI Concierge</strong> that handles customer questions, negotiates discounts inside guardrails you set, and books jobs while you're driving. It might be the missing piece.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;"><tr><td align="center">
              <a href="${ctaUrl}" style="display:inline-block;padding:14px 32px;background:#4f46e5;color:#fff;font-weight:700;font-size:15px;border-radius:10px;text-decoration:none;">
                Open My QuotePro Dashboard
              </a>
            </td></tr></table>
            <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.6;">— Mike<br/><span style="font-size:13px;">QuotePro AI</span></p>
          `,
        });
        if (opts.dryRun) {
          console.log(`[churn-winback DRY] would send → ${to}`);
          sent++;
          continue;
        }
        await sendEmail({ to, subject, html, fromName: DRIP_FROM_NAME, replyTo: DRIP_REPLY_TO });
        await pool.query(`UPDATE users SET churn_intervention_sent_at = NOW() WHERE id = $1`, [u.id]);
        sent++;
        await new Promise((r) => setTimeout(r, 500));
      } catch (e: any) {
        console.error(`[churn-winback] Failed ${u.id}:`, e.message);
        failed++;
      }
    }
    console.log(`[churn-winback] Done — sent: ${sent}, failed: ${failed}, targets: ${targets}`);
    return { sent, failed, skipped, targets };
  } finally {
    await releaseLock("churn-winback");
  }
}

/* ─── 2. Paywall-cancel rescue ───────────────────────────────────────────── */
export async function processPaywallCancelRescue(opts: { dryRun?: boolean } = {}): Promise<{
  sent: number; failed: number; targets: number;
}> {
  const got = await acquireLock("paywall-cancel-rescue", 15);
  if (!got) {
    console.log("[paywall-rescue] Skipped — lock held.");
    return { sent: 0, failed: 0, targets: 0 };
  }
  try {
    // Find owners whose business fired cancel_paywall in the last 7 days
    // and who haven't received a paywall_cancel_rescue email in the last 30 days.
    const result = await pool.query<{
      id: string; email: string; contact_email: string | null; name: string | null;
      business_id: string;
    }>(`
      SELECT DISTINCT
        u.id, u.email, u.contact_email, u.name, b.id AS business_id
      FROM analytics_events e
      JOIN businesses b ON b.id = e.business_id
      JOIN users u ON u.id = b.owner_user_id
      WHERE e.event_name = 'cancel_paywall'
        AND e.created_at >= NOW() - INTERVAL '7 days'
        AND u.email_unreachable = FALSE
        AND COALESCE(u.trial_drip_unsubscribed, FALSE) = FALSE
        AND NOT EXISTS (
          SELECT 1 FROM communications c
          WHERE c.business_id = b.id
            AND c.template_key = 'paywall_cancel_rescue'
            AND c.sent_at > NOW() - INTERVAL '30 days'
        )
      LIMIT 200
    `);
    const targets = result.rows.length;
    if (targets === 0) {
      console.log("[paywall-rescue] No eligible users.");
      return { sent: 0, failed: 0, targets: 0 };
    }
    let sent = 0, failed = 0;
    for (const u of result.rows) {
      try {
        const firstName = getFirstName(u.name, u.email);
        const to = u.contact_email || u.email;
        const unsubToken = generateUnsubscribeToken(u.id);
        const unsubUrl = `${APP_BASE_URL}/api/email/unsubscribe?uid=${u.id}&token=${unsubToken}`;
        const upgradeUrl = `${APP_BASE_URL}/app/billing`;
        const subject = `Was it the price, the features, or just bad timing?`;
        const html = layout({
          preheader: "Quick one-question reply — would help us improve.",
          unsubscribeUrl: unsubUrl,
          body: `
            <p style="margin:0 0 16px;font-size:16px;color:#111827;font-weight:600;">Hey ${firstName},</p>
            <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
              I noticed you opened the upgrade page and decided to wait. Totally fine — but I'd love to know which it was, in one word:
            </p>
            <ul style="margin:0 0 20px 20px;padding:0;font-size:15px;color:#374151;line-height:1.8;">
              <li><strong>Price</strong> — too expensive for the value right now</li>
              <li><strong>Features</strong> — missing something you need</li>
              <li><strong>Timing</strong> — slow season, busy with other stuff</li>
            </ul>
            <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
              Just hit reply with the word and (if you want) a sentence why. I read every reply.
            </p>
            <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
              If it was price, here's a link to the plans in case you want to take another look — and there's almost always something I can do if money is tight:
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;"><tr><td align="center">
              <a href="${upgradeUrl}" style="display:inline-block;padding:14px 32px;background:#4f46e5;color:#fff;font-weight:700;font-size:15px;border-radius:10px;text-decoration:none;">
                See Plans Again
              </a>
            </td></tr></table>
            <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.6;">— Mike<br/><span style="font-size:13px;">QuotePro AI</span></p>
          `,
        });
        if (opts.dryRun) {
          console.log(`[paywall-rescue DRY] would send → ${to}`);
          sent++;
          continue;
        }
        await sendEmail({ to, subject, html, fromName: DRIP_FROM_NAME, replyTo: DRIP_REPLY_TO });
        await pool.query(
          `INSERT INTO communications (business_id, channel, direction, template_key, content, status, sent_at)
           VALUES ($1, 'email', 'outbound', 'paywall_cancel_rescue', $2, 'sent', NOW())`,
          [u.business_id, subject]
        );
        sent++;
        await new Promise((r) => setTimeout(r, 500));
      } catch (e: any) {
        console.error(`[paywall-rescue] Failed ${u.id}:`, e.message);
        failed++;
      }
    }
    console.log(`[paywall-rescue] Done — sent: ${sent}, failed: ${failed}, targets: ${targets}`);
    return { sent, failed, targets };
  } finally {
    await releaseLock("paywall-cancel-rescue");
  }
}

/* ─── 3. AI Concierge launch announcement (one-time blast) ───────────────── */
export async function sendConciergeLaunchBlast(opts: { dryRun?: boolean } = {}): Promise<{
  sent: number; failed: number; targets: number;
}> {
  const got = await acquireLock("concierge-launch-blast", 30);
  if (!got) {
    console.log("[concierge-launch] Skipped — lock held.");
    return { sent: 0, failed: 0, targets: 0 };
  }
  try {
    // Active paying users who have not received the launch announcement yet.
    const result = await pool.query<{
      id: string; email: string; contact_email: string | null; name: string | null;
      business_id: string;
    }>(`
      SELECT u.id, u.email, u.contact_email, u.name, b.id AS business_id
      FROM users u
      JOIN businesses b ON b.owner_user_id = u.id
      WHERE u.subscription_tier IN ('starter','growth','pro')
        AND u.email_unreachable = FALSE
        AND COALESCE(u.trial_drip_unsubscribed, FALSE) = FALSE
        AND NOT EXISTS (
          SELECT 1 FROM communications c
          WHERE c.business_id = b.id
            AND c.template_key = 'concierge_launch_v1'
        )
      ORDER BY u.created_at DESC
      LIMIT 1000
    `);
    const targets = result.rows.length;
    if (targets === 0) {
      console.log("[concierge-launch] No eligible users.");
      return { sent: 0, failed: 0, targets: 0 };
    }
    let sent = 0, failed = 0;
    for (const u of result.rows) {
      try {
        const firstName = getFirstName(u.name, u.email);
        const to = u.contact_email || u.email;
        const unsubToken = generateUnsubscribeToken(u.id);
        const unsubUrl = `${APP_BASE_URL}/api/email/unsubscribe?uid=${u.id}&token=${unsubToken}`;
        const learnUrl = `https://getquotepro.ai/features/ai-concierge`;
        const settingsUrl = `${APP_BASE_URL}/app/settings/ai-concierge`;
        const subject = `${firstName}, your new AI Concierge is live`;
        const html = layout({
          preheader: "Answers customer questions, negotiates inside your guardrails, books jobs.",
          unsubscribeUrl: unsubUrl,
          body: `
            <p style="margin:0 0 16px;font-size:16px;color:#111827;font-weight:600;">Hi ${firstName},</p>
            <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
              Big shipping day. The new <strong>AI Concierge</strong> is live on every quote you send out.
            </p>
            <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">It can:</p>
            <ul style="margin:0 0 20px 20px;padding:0;font-size:15px;color:#374151;line-height:1.8;">
              <li>Answer customer questions in <strong>8 languages</strong> automatically</li>
              <li>Negotiate discounts inside guardrails <em>you</em> set (so it never gives away the farm)</li>
              <li>Add on services like inside-oven or windows mid-conversation</li>
              <li>Reschedule appointments without you lifting a finger</li>
              <li>Email you when a hot lead is on the fence so you can swoop in personally</li>
            </ul>
            <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
              You don't need to do anything to turn it on — but you can tune its personality, language, and pricing rules in settings.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;"><tr><td align="center">
              <a href="${settingsUrl}" style="display:inline-block;padding:14px 32px;background:#4f46e5;color:#fff;font-weight:700;font-size:15px;border-radius:10px;text-decoration:none;">
                Tune My AI Concierge
              </a>
            </td></tr></table>
            <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;text-align:center;">
              <a href="${learnUrl}" style="color:#4f46e5;text-decoration:underline;">See everything it can do →</a>
            </p>
            <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.6;">— Mike<br/><span style="font-size:13px;">QuotePro AI</span></p>
          `,
        });
        if (opts.dryRun) {
          console.log(`[concierge-launch DRY] would send → ${to}`);
          sent++;
          continue;
        }
        await sendEmail({ to, subject, html, fromName: DRIP_FROM_NAME, replyTo: DRIP_REPLY_TO });
        await pool.query(
          `INSERT INTO communications (business_id, channel, direction, template_key, content, status, sent_at)
           VALUES ($1, 'email', 'outbound', 'concierge_launch_v1', $2, 'sent', NOW())`,
          [u.business_id, subject]
        );
        sent++;
        await new Promise((r) => setTimeout(r, 400));
      } catch (e: any) {
        console.error(`[concierge-launch] Failed ${u.id}:`, e.message);
        failed++;
      }
    }
    console.log(`[concierge-launch] Done — sent: ${sent}, failed: ${failed}, targets: ${targets}`);
    return { sent, failed, targets };
  } finally {
    await releaseLock("concierge-launch-blast");
  }
}

/* ─── 4. Concierge "hot lead" owner alert ────────────────────────────────── */
export async function processConciergeHotLeadAlerts(opts: { dryRun?: boolean } = {}): Promise<{
  sent: number; failed: number; targets: number;
}> {
  const got = await acquireLock("concierge-hot-lead", 10);
  if (!got) {
    console.log("[hot-lead] Skipped — lock held.");
    return { sent: 0, failed: 0, targets: 0 };
  }
  try {
    // Conversations from last 24h with >= 2 customer messages and no acceptance,
    // owner hasn't been alerted for this conversation yet.
    const result = await pool.query<{
      conversation_id: string; quote_id: string; business_id: string;
      owner_email: string; owner_name: string | null;
      customer_name: string | null; customer_email: string | null;
      total: number; public_token: string | null; company_name: string | null;
      msg_count: string;
    }>(`
      SELECT
        conv.id            AS conversation_id,
        conv.quote_id      AS quote_id,
        q.business_id      AS business_id,
        u.email            AS owner_email,
        u.name             AS owner_name,
        q.customer_name    AS customer_name,
        c.email            AS customer_email,
        q.total            AS total,
        q.public_token     AS public_token,
        b.company_name     AS company_name,
        (SELECT COUNT(*)::text FROM quote_ai_messages m
         WHERE m.conversation_id = conv.id AND m.role = 'user') AS msg_count
      FROM quote_ai_conversations conv
      JOIN quotes q ON q.id = conv.quote_id
      JOIN businesses b ON b.id = q.business_id
      JOIN users u ON u.id = b.owner_user_id
      LEFT JOIN customers c ON c.id = q.customer_id
      WHERE conv.last_message_at >= NOW() - INTERVAL '24 hours'
        AND conv.last_message_at < NOW() - INTERVAL '15 minutes'
        AND COALESCE(conv.resulted_in_acceptance, FALSE) = FALSE
        AND q.status IN ('sent','viewed','draft')
        AND NOT EXISTS (
          SELECT 1 FROM communications cc
          WHERE cc.business_id = q.business_id
            AND cc.template_key = 'concierge_hot_lead'
            AND cc.content = conv.id
        )
      LIMIT 100
    `);
    const eligible = result.rows.filter((r) => Number(r.msg_count) >= 2);
    const targets = eligible.length;
    if (targets === 0) {
      console.log("[hot-lead] No eligible conversations.");
      return { sent: 0, failed: 0, targets: 0 };
    }
    let sent = 0, failed = 0;
    for (const row of eligible) {
      try {
        const firstName = getFirstName(row.owner_name, row.owner_email);
        const customer = row.customer_name || "A potential customer";
        const total = Number(row.total || 0).toLocaleString("en-US", {
          style: "currency", currency: "USD", maximumFractionDigits: 0,
        });
        const quoteUrl = row.public_token ? `${APP_BASE_URL}/q/${row.public_token}` : `${APP_BASE_URL}/app`;
        const subject = `Hot lead: ${customer} chatted but didn't book`;
        const html = `
          <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#1e293b;">
            <p style="font-size:16px;">Hey ${firstName},</p>
            <p style="font-size:15px;line-height:1.6;">
              <strong>${customer}</strong> just had a real conversation with your AI Concierge about a ${total} quote — but didn't book yet. They asked ${row.msg_count} questions, which usually means high interest.
            </p>
            <p style="font-size:15px;line-height:1.6;">
              A 30-second personal text or call from you right now is the highest-converting move you can make.
            </p>
            ${row.customer_email ? `<p style="font-size:14px;color:#475569;">Customer email: <a href="mailto:${row.customer_email}">${row.customer_email}</a></p>` : ""}
            <div style="margin:20px 0;text-align:center;">
              <a href="${quoteUrl}" style="display:inline-block;padding:12px 28px;background:#4f46e5;color:#fff;font-weight:700;border-radius:10px;text-decoration:none;font-size:14px;">
                See the conversation
              </a>
            </div>
            <p style="font-size:13px;color:#94a3b8;">
              You're getting this because the AI Concierge is enabled for ${row.company_name || "your business"}.
              <a href="${APP_BASE_URL}/app/settings/ai-concierge" style="color:#94a3b8;">Manage alerts</a>
            </p>
          </div>
        `;
        if (opts.dryRun) {
          console.log(`[hot-lead DRY] would alert ${row.owner_email} re ${row.conversation_id}`);
          sent++;
          continue;
        }
        await sendEmail({
          to: row.owner_email,
          subject,
          html,
          fromName: PLATFORM_FROM_NAME,
          fromEmail: PLATFORM_FROM_EMAIL,
        });
        await pool.query(
          `INSERT INTO communications (business_id, channel, direction, template_key, content, status, sent_at)
           VALUES ($1, 'email', 'outbound', 'concierge_hot_lead', $2, 'sent', NOW())`,
          [row.business_id, row.conversation_id]
        );
        sent++;
        await new Promise((r) => setTimeout(r, 300));
      } catch (e: any) {
        console.error(`[hot-lead] Failed ${row.conversation_id}:`, e.message);
        failed++;
      }
    }
    console.log(`[hot-lead] Done — sent: ${sent}, failed: ${failed}, targets: ${targets}`);
    return { sent, failed, targets };
  } finally {
    await releaseLock("concierge-hot-lead");
  }
}
