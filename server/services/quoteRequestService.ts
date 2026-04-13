/**
 * quoteRequestService.ts
 *
 * Handles the complete Autopilot quote-request pipeline:
 *  1. Fetch operator pricing config
 *  2. Call Claude to generate a quote
 *  3. Fetch available booking slots
 *  4. Generate a booking token
 *  5. Send the branded quote email with embedded calendar
 */

import Anthropic from "@anthropic-ai/sdk";
import { pool } from "../db";
import { sendEmail, getBusinessSendParams } from "../mail";
import crypto from "crypto";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Use Haiku for quote generation — 5x faster than Sonnet, more than sufficient for structured JSON
const QUOTE_MODEL = "claude-haiku-4-5";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LeadContact {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  street?: string;
  apt?: string;
  city?: string;
  state?: string;
  zip: string;
  lat?: number;
  lng?: number;
}

interface LeadHome {
  serviceType: string;
  bedrooms: number;
  bathrooms: number;
  sqft?: string;
  condition: string;
  extras: string[];
}

interface LeadPreferences {
  preferredDate?: string;
  preferredTime?: string;
  notes?: string;
  source?: string;
}

interface AIQuote {
  quoteType: "exact" | "range";
  exactAmount?: number;
  rangeMin?: number;
  rangeMax?: number;
  estimatedDuration: string;
  breakdown: { item: string; amount: number }[];
  notes: string;
  confidence: "high" | "medium" | "low";
}

interface AvailableSlot {
  date: string;
  dayLabel: string;
  times: string[];
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

export async function processQuoteRequest(leadId: string): Promise<void> {
  const t0 = Date.now();
  let leadRow: any;
  let business: any;

  console.log(`[Quote] ▶ Started for lead: ${leadId}`);

  try {
    // Fetch lead + business
    const leadRes = await pool.query(
      `SELECT l.*, u.id AS owner_user_id,
              b.id AS business_id, b.company_name, b.email AS business_email,
              b.phone AS business_phone, b.logo_uri, b.primary_color,
              b.address AS business_address, b.email AS reply_to_email
       FROM leads l
       JOIN businesses b ON b.public_quote_slug = l.business_slug
       JOIN users u ON u.id = b.owner_user_id
       WHERE l.id = $1`,
      [leadId]
    );

    if (leadRes.rows.length === 0) {
      console.error(`[Quote] ✗ Lead ${leadId} not found in DB`);
      return;
    }

    leadRow = leadRes.rows[0];
    business = {
      id: leadRow.business_id,
      userId: leadRow.owner_user_id,
      companyName: leadRow.company_name,
      email: leadRow.business_email,
      phone: leadRow.business_phone,
      logoUri: leadRow.logo_uri,
      primaryColor: leadRow.primary_color || "#2563EB",
      address: leadRow.business_address,
    };

    const contact: LeadContact = leadRow.contact;
    const home: LeadHome = leadRow.home;
    const preferences: LeadPreferences = leadRow.preferences;

    console.log(`[Quote] Lead found: ${contact?.firstName} ${contact?.lastName} <${contact?.email}> — ${home?.serviceType} ${home?.bedrooms}BR/${home?.bathrooms}BA`);

    // Update status to processing
    await pool.query(
      `UPDATE leads SET status = 'processing', autopilot_triggered_at = NOW() WHERE id = $1`,
      [leadId]
    );

    // Fetch operator pricing config
    const pricingRes = await pool.query(
      `SELECT * FROM pricing_settings WHERE business_id = $1 LIMIT 1`,
      [business.id]
    );
    const pricingConfig = pricingRes.rows[0] || {};

    // Fetch operator quote mode setting
    const settingsRes = await pool.query(
      `SELECT quote_mode FROM user_preferences WHERE user_id = $1 LIMIT 1`,
      [business.userId]
    ).catch(() => ({ rows: [] as any[] }));
    const quoteMode = settingsRes.rows[0]?.quote_mode || "smart";

    // Generate AI quote (Haiku model — ~3s)
    console.log(`[Quote] ⏳ Calling AI at ${Date.now() - t0}ms…`);
    const aiQuote = await generateAIQuote(home, contact, pricingConfig);
    console.log(`[Quote] ✅ AI response at ${Date.now() - t0}ms — confidence: ${aiQuote.confidence}, amount: ${aiQuote.exactAmount ?? `$${aiQuote.rangeMin}-${aiQuote.rangeMax}`}`);

    // Always show range for customer-facing lead capture quotes
    const finalQuoteType: "exact" | "range" = "range";

    // Normalize range: derive midpoint, then apply -15%/+20% rounded to nearest $5
    const midpoint = aiQuote.exactAmount
      || (aiQuote.rangeMin && aiQuote.rangeMax ? Math.round((aiQuote.rangeMin + aiQuote.rangeMax) / 2) : 0);
    if (midpoint > 0) {
      aiQuote.rangeMin = Math.round((midpoint * 0.85) / 5) * 5;
      aiQuote.rangeMax = Math.round((midpoint * 1.20) / 5) * 5;
      aiQuote.quoteType = "range";
    } else if (aiQuote.rangeMin && aiQuote.rangeMax) {
      // AI returned a range directly — re-apply formula from its midpoint
      const mid = Math.round((aiQuote.rangeMin + aiQuote.rangeMax) / 2);
      aiQuote.rangeMin = Math.round((mid * 0.85) / 5) * 5;
      aiQuote.rangeMax = Math.round((mid * 1.20) / 5) * 5;
      aiQuote.quoteType = "range";
    }

    // Save quote to lead
    await pool.query(
      `UPDATE leads SET
         quote = $1, quote_type = $2, quote_generated_at = NOW()
       WHERE id = $3`,
      [JSON.stringify(aiQuote), finalQuoteType, leadId]
    );
    console.log(`[Quote] DB quote saved at ${Date.now() - t0}ms`);

    // Fetch available slots
    const slots = await getAvailableSlots(business.userId, preferences?.preferredDate);
    console.log(`[Quote] Slots fetched (${slots.length} days) at ${Date.now() - t0}ms`);

    // Generate booking token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    await pool.query(
      `INSERT INTO booking_tokens (lead_id, user_id, token, quote_snapshot, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING`,
      [leadId, business.userId, token, JSON.stringify({ aiQuote, finalQuoteType, home, contact }), expiresAt]
    );
    console.log(`[Quote] Booking token created at ${Date.now() - t0}ms`);

    // Send quote email
    console.log(`[Quote] ⏳ Sending email to ${contact.email}…`);
    await sendQuoteEmail(leadId, token, contact, home, business, aiQuote, finalQuoteType, slots);
    console.log(`[Quote] ✅ Email sent at ${Date.now() - t0}ms`);

    // Update lead status to 'quoted'
    await pool.query(
      `UPDATE leads SET status = 'quoted', quote_email_sent_at = NOW() WHERE id = $1`,
      [leadId]
    );

    console.log(`[Quote] ✅ COMPLETE — lead ${leadId} processed in ${Date.now() - t0}ms`);
  } catch (err: any) {
    console.error(`[Quote] ✗ FAILED for lead ${leadId} at ${Date.now() - t0}ms:`, err.message, err.stack?.split("\n")[1]);
    await pool.query(`UPDATE leads SET status = 'new' WHERE id = $1`, [leadId]).catch(() => {});
  }
}

// ─── AI Quote Generation ──────────────────────────────────────────────────────

async function generateAIQuote(
  home: LeadHome,
  contact: LeadContact,
  pricingConfig: any
): Promise<AIQuote> {
  const hasOperatorPricing = pricingConfig && Object.keys(pricingConfig).length > 0 &&
    (pricingConfig.settings || pricingConfig.baseRates || pricingConfig.standardClean);

  const systemPrompt = `You are an AI pricing assistant for a professional cleaning business.
Calculate an accurate cleaning quote based on the home details provided.
${hasOperatorPricing ? "Use the operator's pricing configuration as your baseline for the midpoint price." : "Use the HomeAdvisor/Angi market baseline rates below."}
Return ONLY a JSON object — no explanation, no preamble, no markdown.

IMPORTANT: Always return quoteType "range". Never return "exact".
The range should be -15% to +20% around the midpoint, rounded to nearest $5.

${hasOperatorPricing ? `Operator pricing config (use as midpoint baseline):
${JSON.stringify(pricingConfig, null, 2)}` : `Market baseline rates (HomeAdvisor/Angi national averages):
Standard Clean: 1BR=$120, 2BR=$155, 3BR=$190, 4BR=$235, 5BR+=$280
Deep Clean: 1BR=$170, 2BR=$220, 3BR=$270, 4BR=$330, 5BR+=$390
Move In/Out: 1BR=$200, 2BR=$260, 3BR=$320, 4BR=$390, 5BR+=$460
Post-Construction: 1BR=$240, 2BR=$310, 3BR=$380, 4BR=$460, 5BR+=$540
Bathroom surcharge: +$25 per full bath above 1.5, +$15 per half bath above 1.5
Condition: Well maintained=+0%, Needs extra attention=+15%, Very dirty=+30%
Extras: Inside oven +$40, Inside fridge +$35, Interior windows +$50, Laundry +$30, Garage +$55, Basement +$65, Pets in home +$20, Has carpet +$25`}

Return format:
{
  "quoteType": "range",
  "rangeMin": number (midpoint × 0.85, rounded to nearest $5),
  "rangeMax": number (midpoint × 1.20, rounded to nearest $5),
  "estimatedDuration": string (e.g. "2.5-3 hours"),
  "breakdown": [
    { "item": "Base cleaning (3BR/2BA)", "amount": 190 },
    { "item": "Deep clean surcharge", "amount": 80 }
  ],
  "notes": "1-2 sentences about the quote, personalized to their home",
  "confidence": "high" | "medium" | "low"
}`;

  const userMessage = `Generate a quote for:
Service: ${home.serviceType}
Bedrooms: ${home.bedrooms}, Bathrooms: ${home.bathrooms}
Home size: ${home.sqft || "not specified"} sq ft
Condition: ${home.condition}
Extras requested: ${home.extras?.length > 0 ? home.extras.join(", ") : "none"}
Location: ${[contact.street, contact.apt, contact.city, contact.state].filter(Boolean).join(", ") || contact.zip}
ZIP code: ${contact.zip}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const resp = await anthropic.messages.create(
      {
        model: QUOTE_MODEL,
        max_tokens: 400,
        messages: [{ role: "user", content: userMessage }],
        system: systemPrompt,
      },
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    const text = resp.content[0].type === "text" ? resp.content[0].text.trim() : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in AI response");
    return JSON.parse(jsonMatch[0]) as AIQuote;
  } catch (err: any) {
    clearTimeout(timeout);
    console.error("[Quote] generateAIQuote failed, using fallback:", err.message);
    return fallbackQuote(home);
  }
}

function fallbackQuote(home: LeadHome): AIQuote {
  const beds = Math.min(Number(home.bedrooms) || 2, 5);
  const baths = Number(home.bathrooms) || 1;

  // HomeAdvisor/Angi market-aligned base rates
  const MARKET_BASE_RATES: Record<string, Record<number, number>> = {
    standard: { 1: 120, 2: 155, 3: 190, 4: 235, 5: 280 },
    deep:     { 1: 170, 2: 220, 3: 270, 4: 330, 5: 390 },
    move:     { 1: 200, 2: 260, 3: 320, 4: 390, 5: 460 },
    post_construction: { 1: 240, 2: 310, 3: 380, 4: 460, 5: 540 },
  };
  const EXTRA_PRICES: Record<string, number> = {
    "inside oven": 40, "inside fridge": 35, "interior windows": 50,
    "laundry": 30, "garage": 55, "basement": 65, "pets in home": 20, "has carpet": 25,
  };

  const serviceKey = (home.serviceType || "standard").toLowerCase();
  const rateTable = MARKET_BASE_RATES[serviceKey] || MARKET_BASE_RATES.standard;
  let base = rateTable[beds] || rateTable[5];

  // Bathroom surcharge (+$25 per full bath above 1.5, +$15 per half bath)
  const extraBaths = Math.max(0, baths - 1.5);
  base += Math.floor(extraBaths) * 25;

  // Condition surcharge
  const condition = (home.condition || "").toLowerCase();
  if (condition.includes("extra attention")) base = Math.round(base * 1.15);
  else if (condition.includes("dirty")) base = Math.round(base * 1.30);

  // Extras
  const extras = (home.extras || []).map((e: string) => e.toLowerCase());
  for (const [key, price] of Object.entries(EXTRA_PRICES)) {
    if (extras.some((e) => e.includes(key))) base += price;
  }

  // -15%/+20% range rounded to nearest $5
  const rangeMin = Math.round((base * 0.85) / 5) * 5;
  const rangeMax = Math.round((base * 1.20) / 5) * 5;

  return {
    quoteType: "range",
    rangeMin,
    rangeMax,
    estimatedDuration: `${2 + Math.floor(beds / 2)}-${3 + Math.floor(beds / 2)} hours`,
    breakdown: [{ item: `Base cleaning (${beds}BR/${baths}BA)`, amount: base }],
    notes: "Your final price will be confirmed before your appointment based on your home's exact condition.",
    confidence: "medium",
  };
}

// ─── Available Slots ──────────────────────────────────────────────────────────

export async function getAvailableSlots(userId: string, preferredDate?: string): Promise<AvailableSlot[]> {
  // Fetch availability settings
  const settingsRes = await pool.query(
    `SELECT * FROM booking_availability_settings WHERE business_id = (
       SELECT id FROM businesses WHERE owner_user_id = $1 LIMIT 1
     ) LIMIT 1`,
    [userId]
  );

  const settings = settingsRes.rows[0];
  const allowedDays: number[] = settings?.allowed_days ?? [1, 2, 3, 4, 5];
  const timeWindows: { start: string; end: string }[] = settings?.time_windows ?? [{ start: "08:00", end: "17:00" }];
  const slotDuration: number = settings?.slot_duration_hours ?? 2;
  const slotInterval: number = settings?.slot_interval_hours ?? 2;
  const minNoticeHours: number = settings?.min_notice_hours ?? 24;
  const maxJobsPerDay: number = settings?.max_jobs_per_day ?? 4;
  const blackoutDates: string[] = settings?.blackout_dates ?? [];

  // Fetch already booked slots for next 14 days
  const twoWeeksOut = new Date();
  twoWeeksOut.setDate(twoWeeksOut.getDate() + 14);
  const bookedRes = await pool.query(
    `SELECT date, time_slot FROM booked_slots WHERE user_id = $1 AND date >= $2`,
    [userId, new Date().toISOString().slice(0, 10)]
  );
  const bookedSet = new Set<string>(bookedRes.rows.map((r: any) => `${r.date}|${r.time_slot}`));

  // Also fetch from existing bookings table
  const existingBookingsRes = await pool.query(
    `SELECT scheduled_date AS date, scheduled_time AS time_slot
     FROM bookings
     WHERE user_id = $1 AND scheduled_date >= $2`,
    [userId, new Date().toISOString().slice(0, 10)]
  );
  for (const b of existingBookingsRes.rows) {
    bookedSet.add(`${b.date}|${b.time_slot}`);
  }

  // Count jobs per day
  const jobCountByDay = new Map<string, number>();
  for (const b of existingBookingsRes.rows) {
    jobCountByDay.set(b.date, (jobCountByDay.get(b.date) || 0) + 1);
  }

  const slots: AvailableSlot[] = [];
  const now = new Date();
  const minDate = new Date(now.getTime() + minNoticeHours * 60 * 60 * 1000);

  // Start from preferred date if provided and valid, else from minDate
  let startDate = new Date(minDate);
  if (preferredDate) {
    const pref = new Date(preferredDate + "T12:00:00");
    if (pref > minDate) startDate = pref;
  }

  // Round startDate to start of that day
  startDate.setHours(0, 0, 0, 0);

  let daysCovered = 0;
  let daysChecked = 0;
  const maxDays = 21;

  while (slots.length < 3 && daysChecked < maxDays) {
    const checkDate = new Date(startDate);
    checkDate.setDate(checkDate.getDate() + daysChecked);
    daysChecked++;

    const dow = checkDate.getDay(); // 0=Sun
    if (!allowedDays.includes(dow)) continue;

    const dateStr = checkDate.toISOString().slice(0, 10);
    if (blackoutDates.includes(dateStr)) continue;

    if ((jobCountByDay.get(dateStr) || 0) >= maxJobsPerDay) continue;

    const availTimes: string[] = [];

    for (const window of timeWindows) {
      const [startH, startM] = window.start.split(":").map(Number);
      const [endH, endM] = window.end.split(":").map(Number);
      const windowStartMin = startH * 60 + startM;
      const windowEndMin = endH * 60 + endM;

      let slotMin = windowStartMin;
      while (slotMin + slotDuration * 60 <= windowEndMin) {
        const slotHour = Math.floor(slotMin / 60);
        const slotMinute = slotMin % 60;
        const slotStr = `${String(slotHour).padStart(2, "0")}:${String(slotMinute).padStart(2, "0")}`;

        // Check not in the past or within minNoticeHours
        const slotDt = new Date(checkDate);
        slotDt.setHours(slotHour, slotMinute, 0, 0);
        if (slotDt <= minDate) {
          slotMin += slotInterval * 60;
          continue;
        }

        if (!bookedSet.has(`${dateStr}|${slotStr}`)) {
          // Format as 12-hour
          const period = slotHour >= 12 ? "PM" : "AM";
          const h12 = slotHour % 12 || 12;
          const display = `${h12}:${String(slotMinute).padStart(2, "0")} ${period}`;
          availTimes.push(display);
        }

        slotMin += slotInterval * 60;
      }
    }

    if (availTimes.length === 0) continue;

    // Format day label
    const dayLabel = checkDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });

    slots.push({ date: dateStr, dayLabel, times: availTimes });
    daysCovered++;
  }

  return slots;
}

// ─── Quote Email ──────────────────────────────────────────────────────────────

async function sendQuoteEmail(
  leadId: string,
  token: string,
  contact: LeadContact,
  home: LeadHome,
  business: any,
  quote: AIQuote,
  quoteType: "exact" | "range",
  slots: AvailableSlot[]
): Promise<void> {
  const appDomain = process.env.EXPO_PUBLIC_DOMAIN || process.env.APP_DOMAIN || "app.getquotepro.ai";
  const appUrl = `https://${appDomain}`;
  const color = (business.primaryColor || "#2563EB").replace(/[^#a-fA-F0-9]/g, "");

  // Format price string
  const priceStr =
    quoteType === "exact"
      ? `$${(quote.exactAmount || 0).toLocaleString()}`
      : `$${(quote.rangeMin || 0).toLocaleString()} – $${(quote.rangeMax || 0).toLocaleString()}`;

  // Service type display
  const serviceLabels: Record<string, string> = {
    standard: "Standard Clean",
    deep: "Deep Clean",
    move: "Move In / Move Out",
    post_construction: "Post-Construction Clean",
  };
  const serviceLabel = serviceLabels[home.serviceType] || home.serviceType;

  // Build breakdown rows
  const breakdownRows = quote.breakdown
    .map(
      (b) => `
      <tr>
        <td style="padding:4px 0; color:#374151; font-size:14px;">&#10003; ${b.item}</td>
        <td style="padding:4px 0; color:#374151; font-size:14px; text-align:right;">$${b.amount}</td>
      </tr>`
    )
    .join("");

  // Build calendar slot buttons (first 3 days)
  const topSlots = slots.slice(0, 3);
  const calendarRows = topSlots
    .map((day) => {
      const btns = day.times
        .map((t) => {
          const slotParam = encodeURIComponent(`${day.date}T${to24(t)}`);
          const bookUrl = `${appUrl}/book/${token}?slot=${slotParam}`;
          return `<a href="${bookUrl}" style="display:inline-block; margin:4px; padding:10px 18px; background:${color}; color:#fff; border-radius:8px; text-decoration:none; font-size:14px; font-weight:600;">${t}</a>`;
        })
        .join("");

      return `
      <div style="margin-bottom:12px; background:#F9FAFB; border-radius:10px; padding:14px;">
        <div style="font-size:13px; font-weight:600; color:#6B7280; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.05em;">${day.dayLabel}</div>
        <div>${btns || '<span style="color:#9CA3AF; font-size:13px;">No slots available</span>'}</div>
      </div>`;
    })
    .join("");

  const seeMoreUrl = `${appUrl}/book/${token}`;
  const logoHtml = business.logoUri
    ? `<img src="${business.logoUri}" alt="${business.companyName}" style="max-height:52px; max-width:180px; object-fit:contain;">`
    : `<div style="font-size:22px; font-weight:800; color:${color};">${business.companyName}</div>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your Quote from ${business.companyName}</title></head>
<body style="margin:0; padding:0; background:#F3F4F6; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6; padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);">

  <!-- Header -->
  <tr><td style="background:${color}; padding:28px 36px; text-align:center;">
    ${logoHtml}
  </td></tr>

  <!-- Greeting -->
  <tr><td style="padding:32px 36px 0;">
    <p style="font-size:24px; font-weight:700; color:#111827; margin:0 0 8px;">Hi ${contact.firstName}! &#128075;</p>
    <p style="font-size:16px; color:#374151; margin:0 0 24px; line-height:1.6;">
      Your quote is ready — here's what we put together for your home:
    </p>
  </td></tr>

  <!-- Quote Card -->
  <tr><td style="padding:0 36px;">
    <div style="background:#F9FAFB; border:1.5px solid #E5E7EB; border-radius:14px; padding:24px;">
      <div style="font-size:13px; color:#6B7280; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:4px;">&#127968; ${home.bedrooms}BR / ${home.bathrooms}BA &bull; ${serviceLabel}</div>
      <div style="margin:12px 0;">
        <div style="font-size:13px; color:#6B7280; margin-bottom:6px;">Your Quote:</div>
        <div style="display:inline-block; background:${color}; color:#fff; border-radius:10px; padding:12px 24px; font-size:32px; font-weight:800; letter-spacing:-0.5px;">${priceStr}</div>
        ${quoteType === "range" ? `<div style="font-size:12px; color:#6B7280; margin-top:8px;">Final price confirmed before your appointment</div>` : ""}
      </div>
      ${quote.breakdown?.length > 0 ? `
      <div style="margin-top:16px; border-top:1px solid #E5E7EB; padding-top:16px;">
        <div style="font-size:13px; color:#6B7280; font-weight:600; margin-bottom:10px;">Includes:</div>
        <table width="100%" cellpadding="0" cellspacing="0">${breakdownRows}</table>
      </div>` : ""}
      <div style="margin-top:14px; font-size:13px; color:#6B7280;">
        &#9201; Est. duration: <strong>${quote.estimatedDuration}</strong>
      </div>
      ${quote.notes ? `<div style="margin-top:10px; font-size:13px; color:#374151; line-height:1.5; font-style:italic;">${quote.notes}</div>` : ""}
    </div>
  </td></tr>

  <!-- Calendar Section -->
  ${slots.length > 0 ? `
  <tr><td style="padding:28px 36px 0;">
    <div style="text-align:center; margin-bottom:20px;">
      <div style="height:1px; background:#E5E7EB; margin-bottom:20px;"></div>
      <span style="font-size:18px; font-weight:700; color:#111827;">&#128197; Pick a time that works</span>
    </div>
    ${calendarRows}
    <div style="text-align:center; margin-top:12px;">
      <a href="${seeMoreUrl}" style="font-size:14px; color:${color}; text-decoration:none; font-weight:600;">See more available times &#8594;</a>
    </div>
  </td></tr>` : `
  <tr><td style="padding:28px 36px 0;">
    <div style="text-align:center; padding:20px;">
      <a href="${seeMoreUrl}" style="display:inline-block; padding:14px 32px; background:${color}; color:#fff; border-radius:10px; text-decoration:none; font-size:16px; font-weight:700;">View Booking Options &#8594;</a>
    </div>
  </td></tr>`}

  <!-- Divider -->
  <tr><td style="padding:24px 36px 0;"><div style="height:1px; background:#E5E7EB;"></div></td></tr>

  <!-- Footer -->
  <tr><td style="padding:24px 36px 32px; text-align:center;">
    <p style="font-size:13px; color:#6B7280; margin:0 0 6px; line-height:1.6;">
      Questions? Reply to this email${business.phone ? ` or call <strong>${business.phone}</strong>` : ""}.
    </p>
    <p style="font-size:13px; color:#9CA3AF; margin:0;">
      ${business.companyName}${business.address ? ` &bull; ${business.address}` : ""}
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  const { fromName, replyTo } = getBusinessSendParams(business);

  try {
    await sendEmail({
      to: contact.email,
      subject: `Your cleaning quote from ${business.companyName} — Book your spot`,
      html,
      fromName,
      replyTo,
    });
    console.log(`[Quote] sendQuoteEmail delivered to ${contact.email}`);
  } catch (err: any) {
    console.error(`[Quote] ✗ EMAIL SEND FAILED to ${contact.email}:`, err.message, err);
    throw err; // re-throw so processQuoteRequest sees the failure
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function to24(time12: string): string {
  const [timePart, period] = time12.split(" ");
  const [h, m] = timePart.split(":").map(Number);
  const hour = period === "PM" && h !== 12 ? h + 12 : period === "AM" && h === 12 ? 0 : h;
  return `${String(hour).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
