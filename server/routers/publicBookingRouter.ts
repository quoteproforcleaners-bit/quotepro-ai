/**
 * publicBookingRouter.ts
 *
 * Public routes (no auth) for the customer-facing booking flow.
 *
 * GET  /book/:token          → Serve the booking page HTML
 * GET  /book/:token/confirmed → Serve the confirmed page HTML
 * GET  /api/book/:token      → Return booking data as JSON
 * POST /api/book/:token      → Confirm a booking
 */

import { Router, Request, Response } from "express";
import path from "path";
import fs from "fs";
import { pool } from "../db";
import { sendEmail, PLATFORM_FROM_EMAIL } from "../mail";

const router = Router();

// ─── Serve booking HTML page ──────────────────────────────────────────────────

const bookingHtmlPath = path.join(process.cwd(), "server/templates/booking.html");

router.get("/book/:token", (_req: Request, res: Response) => {
  try {
    const html = fs.readFileSync(bookingHtmlPath, "utf-8");
    res.setHeader("Content-Type", "text/html");
    return res.send(html);
  } catch {
    return res.status(500).send("Page unavailable.");
  }
});

router.get("/book/:token/confirmed", (_req: Request, res: Response) => {
  try {
    const html = fs.readFileSync(bookingHtmlPath, "utf-8");
    res.setHeader("Content-Type", "text/html");
    return res.send(html);
  } catch {
    return res.status(500).send("Page unavailable.");
  }
});

// ─── GET /api/book/:token — return booking data ───────────────────────────────

router.get("/api/book/:token", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const jobRes = await pool.query(
      `SELECT aj.*,
              b.company_name, b.email AS business_email, b.primary_color,
              b.phone AS business_phone, b.owner_user_id,
              COALESCE(
                NULLIF(TRIM(c.first_name || ' ' || c.last_name), ''),
                ir.customer_name
              ) AS lead_full_name,
              COALESCE(c.email, ir.customer_email) AS lead_email,
              COALESCE(c.phone, ir.customer_phone) AS lead_phone,
              c.address AS customer_address,
              ir.customer_address AS intake_address,
              ir.extracted_fields,
              ir.property_beds, ir.property_baths, ir.property_sqft,
              ir.service_type, ir.frequency
       FROM autopilot_jobs aj
       JOIN businesses b ON b.id = aj.business_id
       LEFT JOIN customers c ON c.id = aj.lead_id
       LEFT JOIN intake_requests ir ON ir.id = aj.lead_id
       WHERE aj.booking_token = $1`,
      [token]
    );

    if (jobRes.rows.length === 0) {
      return res.status(404).json({ message: "Booking link not found or expired" });
    }

    const job = jobRes.rows[0];

    // Fetch most recent confirmed booking for this job (if any)
    let booking = null;
    if (job.booking_id) {
      const bkRes = await pool.query(
        `SELECT * FROM bookings WHERE id = $1`,
        [job.booking_id]
      );
      if (bkRes.rows.length > 0) booking = bkRes.rows[0];
    }

    return res.json({
      lead: {
        id: job.id,
        userId: job.owner_user_id || job.user_id,
        fullName: job.lead_full_name,
        email: job.lead_email,
        phone: job.lead_phone,
        address: job.customer_address || job.intake_address,
        quoteAmount: job.quote_amount,
        currentStep: job.current_step,
        frequency: job.frequency,
        serviceType: job.service_type,
        propertyBeds: job.property_beds,
        propertyBaths: job.property_baths,
        propertySqft: job.property_sqft,
        extractedFields: job.extracted_fields,
        extractedBeds: job.extracted_fields?.beds || job.extracted_fields?.bedrooms,
        extractedBaths: job.extracted_fields?.baths || job.extracted_fields?.bathrooms,
        extractedSqft: job.extracted_fields?.sqft || job.extracted_fields?.square_feet,
        extractedFrequency: job.extracted_fields?.frequency,
      },
      business: {
        companyName: job.company_name,
        email: job.business_email,
        phone: job.business_phone,
        primaryColor: job.primary_color,
        userId: job.owner_user_id || job.user_id,
      },
      booking,
    });
  } catch (err: any) {
    console.error("[publicBooking] GET error:", err.message);
    return res.status(500).json({ message: "Failed to load booking" });
  }
});

// ─── POST /api/book/:token — confirm a booking ────────────────────────────────

router.post("/api/book/:token", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { date, time } = req.body;

    if (!date || !time) {
      return res.status(400).json({ message: "Date and time are required" });
    }

    // Fetch job
    const jobRes = await pool.query(
      `SELECT aj.*,
              b.company_name, b.email AS business_email, b.primary_color,
              b.owner_user_id,
              COALESCE(
                NULLIF(TRIM(c.first_name || ' ' || c.last_name), ''),
                ir.customer_name
              ) AS lead_full_name,
              COALESCE(c.email, ir.customer_email) AS lead_email,
              COALESCE(c.phone, ir.customer_phone) AS lead_phone,
              c.address AS customer_address,
              ir.customer_address AS intake_address,
              ir.service_type, ir.frequency,
              ir.property_beds, ir.property_baths, ir.property_sqft
       FROM autopilot_jobs aj
       JOIN businesses b ON b.id = aj.business_id
       LEFT JOIN customers c ON c.id = aj.lead_id
       LEFT JOIN intake_requests ir ON ir.id = aj.lead_id
       WHERE aj.booking_token = $1`,
      [token]
    );

    if (jobRes.rows.length === 0) {
      return res.status(404).json({ message: "Booking link not found" });
    }

    const job = jobRes.rows[0];

    if (job.current_step === "booked" || job.current_step === "completed") {
      return res.status(409).json({ message: "This slot has already been booked" });
    }

    const settingsRes = await pool.query(
      `SELECT slot_duration_minutes FROM availability_settings WHERE user_id = $1`,
      [job.owner_user_id || job.user_id]
    );
    const duration = settingsRes.rows[0]?.slot_duration_minutes || 120;

    // Create booking record
    const bookingRes = await pool.query(
      `INSERT INTO bookings
         (user_id, autopilot_job_id, scheduled_date, scheduled_time, duration_minutes,
          customer_name, customer_email, customer_phone, service_type, address,
          quote_amount, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'confirmed')
       RETURNING *`,
      [
        job.owner_user_id || job.user_id,
        job.id,
        date,
        time,
        duration,
        job.lead_full_name,
        job.lead_email,
        job.lead_phone,
        job.service_type,
        job.customer_address || job.intake_address,
        job.quote_amount,
      ]
    );

    const booking = bookingRes.rows[0];

    // Update autopilot_job
    await pool.query(
      `UPDATE autopilot_jobs
       SET current_step = 'booked',
           quote_accepted_at = NOW(),
           booking_id = $1,
           status = 'pending_review'
       WHERE id = $2`,
      [booking.id, job.id]
    );

    // Format display values
    const displayDate = new Date(date + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
    });
    const [h, m] = time.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    const displayTime = `${h12}:${String(m).padStart(2, "0")} ${ampm}`;

    // Email 2: Confirmation to customer
    if (job.lead_email) {
      sendEmail({
        to: job.lead_email,
        subject: `Your Cleaning is Booked! — ${job.company_name}`,
        html: buildCustomerConfirmationEmail({
          firstName: (job.lead_full_name || "").split(" ")[0] || "there",
          companyName: job.company_name,
          displayDate,
          displayTime,
          serviceType: job.service_type,
          address: job.customer_address || job.intake_address,
          businessEmail: job.business_email,
          primaryColor: job.primary_color || "#007AFF",
        }),
        fromName: job.company_name,
        replyTo: job.business_email || null,
      }).catch((e) => console.error("[publicBooking] customer email error:", e.message));
    }

    // Email 3: Notification to owner
    if (job.business_email) {
      sendEmail({
        to: job.business_email,
        subject: `New Booking Confirmed — ${job.lead_full_name || "Customer"}`,
        html: buildOwnerNotificationEmail({
          customerName: job.lead_full_name,
          customerEmail: job.lead_email,
          customerPhone: job.lead_phone,
          companyName: job.company_name,
          displayDate,
          displayTime,
          serviceType: job.service_type,
          address: job.customer_address || job.intake_address,
          beds: job.property_beds,
          baths: job.property_baths,
          sqft: job.property_sqft,
          quoteAmount: job.quote_amount,
          primaryColor: job.primary_color || "#007AFF",
        }),
        fromName: "QuotePro Autopilot",
        replyTo: null,
      }).catch((e) => console.error("[publicBooking] owner email error:", e.message));
    }

    // Update confirmation_sent_at
    pool.query(
      `UPDATE autopilot_jobs SET confirmation_sent_at = NOW() WHERE id = $1`,
      [job.id]
    ).catch(() => {});

    return res.json({ success: true, booking });
  } catch (err: any) {
    console.error("[publicBooking] POST error:", err.message);
    return res.status(500).json({ message: "Failed to confirm booking" });
  }
});

// ─── Email Templates ──────────────────────────────────────────────────────────

function buildCustomerConfirmationEmail({
  firstName, companyName, displayDate, displayTime, serviceType, address, businessEmail, primaryColor,
}: any) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;">
<tr><td align="center" style="padding:40px 16px;">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
  <tr><td style="background:${primaryColor};padding:32px;">
    <h1 style="margin:0;font-size:24px;font-weight:800;color:#fff;">Your Cleaning is Booked!</h1>
  </td></tr>
  <tr><td style="padding:32px;">
    <p style="margin:0 0 16px;font-size:16px;color:#374151;line-height:1.6;">Hi ${firstName},</p>
    <p style="margin:0 0 24px;font-size:16px;color:#374151;line-height:1.6;">Thanks for booking with <strong>${companyName}</strong> — we're looking forward to taking care of your home.</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;margin-bottom:24px;">
      <tr><td style="padding:20px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
              <span style="font-size:13px;color:#6b7280;">Date</span><br>
              <strong style="font-size:15px;color:#111827;">${displayDate}</strong>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
              <span style="font-size:13px;color:#6b7280;">Time</span><br>
              <strong style="font-size:15px;color:#111827;">${displayTime}</strong>
            </td>
          </tr>
          ${serviceType ? `<tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
            <span style="font-size:13px;color:#6b7280;">Service</span><br>
            <strong style="font-size:15px;color:#111827;">${serviceType}</strong>
          </td></tr>` : ""}
          ${address ? `<tr><td style="padding:8px 0;">
            <span style="font-size:13px;color:#6b7280;">Address</span><br>
            <strong style="font-size:15px;color:#111827;">${address}</strong>
          </td></tr>` : ""}
        </table>
      </td></tr>
    </table>
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">Your cleaner will arrive at <strong>${displayTime}</strong> on <strong>${displayDate}</strong>.</p>
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">The owner will be in touch soon to arrange payment and confirm any final details.</p>
    ${businessEmail ? `<p style="margin:0;font-size:14px;color:#6b7280;line-height:1.6;">Questions? Reply to this email or reach us at <a href="mailto:${businessEmail}" style="color:${primaryColor}">${businessEmail}</a>.</p>` : ""}
  </td></tr>
  <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center;">
    <p style="font-size:12px;color:#9ca3af;margin:0;">${companyName} · Powered by QuotePro</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

function buildOwnerNotificationEmail({
  customerName, customerEmail, customerPhone, companyName,
  displayDate, displayTime, serviceType, address, beds, baths, sqft, quoteAmount, primaryColor,
}: any) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;">
<tr><td align="center" style="padding:40px 16px;">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
  <tr><td style="background:${primaryColor};padding:32px;">
    <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:rgba(255,255,255,0.75);text-transform:uppercase;letter-spacing:0.08em;">QuotePro Autopilot</p>
    <h1 style="margin:0;font-size:22px;font-weight:800;color:#fff;">New Booking Confirmed</h1>
  </td></tr>
  <tr><td style="padding:32px;">
    <p style="margin:0 0 20px;font-size:16px;color:#374151;line-height:1.6;"><strong>${customerName || "A customer"}</strong> just booked through your Autopilot link.</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;margin-bottom:24px;">
      <tr><td style="padding:20px 24px;">
        <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Customer</p>
        ${customerName ? `<p style="margin:0 0 4px;font-size:15px;color:#111827;"><strong>${customerName}</strong></p>` : ""}
        ${customerEmail ? `<p style="margin:0 0 4px;font-size:14px;color:#374151;">${customerEmail}</p>` : ""}
        ${customerPhone ? `<p style="margin:0 0 4px;font-size:14px;color:#374151;">${customerPhone}</p>` : ""}
      </td></tr>
      <tr><td style="padding:0 24px 20px;">
        <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Appointment</p>
        <p style="margin:0 0 4px;font-size:15px;color:#111827;"><strong>${displayDate} at ${displayTime}</strong></p>
        ${serviceType ? `<p style="margin:0 0 4px;font-size:14px;color:#374151;">Service: ${serviceType}</p>` : ""}
        ${address ? `<p style="margin:0 0 4px;font-size:14px;color:#374151;">Address: ${address}</p>` : ""}
        ${beds || baths ? `<p style="margin:0 0 4px;font-size:14px;color:#374151;">${beds ? `${beds} bed` : ""}${beds && baths ? " / " : ""}${baths ? `${baths} bath` : ""}${sqft ? ` / ${sqft} sqft` : ""}</p>` : ""}
        ${quoteAmount ? `<p style="margin:0 0 4px;font-size:14px;color:#374151;">Quote: <strong>$${parseFloat(quoteAmount).toFixed(0)}</strong></p>` : ""}
      </td></tr>
    </table>
    <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.6;">View this lead in your QuotePro dashboard to follow up on payment and job details.</p>
  </td></tr>
  <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center;">
    <p style="font-size:12px;color:#9ca3af;margin:0;">QuotePro Autopilot · ${companyName}</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

// ─── NEW: Quote-Request Booking Token Flow ────────────────────────────────────
// Used when lead clicks a slot button in the quote email

router.get("/api/booking-token/:token", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const tokenRes = await pool.query(
      `SELECT bt.*, l.contact, l.home, l.preferences, l.quote, l.quote_type,
              b.company_name, b.logo_uri, b.primary_color, b.phone AS business_phone,
              b.email AS business_email, b.address AS business_address,
              b.public_quote_slug, b.chat_widget_enabled, b.chat_widget_color,
              u.id AS operator_user_id
       FROM booking_tokens bt
       JOIN leads l ON l.id = bt.lead_id
       JOIN businesses b ON b.owner_user_id = bt.user_id
       JOIN users u ON u.id = bt.user_id
       WHERE bt.token = $1 LIMIT 1`,
      [token]
    );

    if (tokenRes.rows.length === 0) {
      return res.status(404).json({ message: "Booking link not found" });
    }

    const row = tokenRes.rows[0];

    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      return res.status(410).json({ message: "This booking link has expired" });
    }

    if (row.used) {
      return res.status(409).json({ message: "This booking has already been confirmed" });
    }

    return res.json({
      token,
      used: row.used,
      expiresAt: row.expires_at,
      contact: row.contact,
      home: row.home,
      preferences: row.preferences,
      quote: row.quote,
      quoteType: row.quote_type,
      business: {
        companyName: row.company_name,
        logoUri: row.logo_uri,
        primaryColor: row.primary_color || "#2563EB",
        phone: row.business_phone,
        email: row.business_email,
        address: row.business_address,
        userId: row.operator_user_id,
        publicQuoteSlug: row.public_quote_slug || null,
        chatWidgetEnabled: row.chat_widget_enabled ?? true,
        chatWidgetColor: row.chat_widget_color || null,
      },
    });
  } catch (err: any) {
    console.error("[bookingToken] GET error:", err.message);
    return res.status(500).json({ message: "Failed to load booking" });
  }
});

router.post("/api/booking-token/:token/confirm", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { slot, address, notes } = req.body; // slot = "YYYY-MM-DDTHH:MM"

    if (!slot) {
      return res.status(400).json({ message: "Slot is required" });
    }

    // Parse slot
    const [datePart, timePart] = slot.split("T");
    if (!datePart || !timePart) {
      return res.status(400).json({ message: "Invalid slot format" });
    }

    // Fetch token record (with transaction to prevent double-booking)
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Lock and fetch token
      const tokenRes = await client.query(
        `SELECT bt.*, l.contact, l.home, l.quote, l.quote_type, l.id AS lead_id,
                b.company_name, b.logo_uri, b.primary_color, b.phone AS business_phone,
                b.email AS business_email, u.id AS operator_user_id
         FROM booking_tokens bt
         JOIN leads l ON l.id = bt.lead_id
         JOIN businesses b ON b.owner_user_id = bt.user_id
         JOIN users u ON u.id = bt.user_id
         WHERE bt.token = $1
         FOR UPDATE`,
        [token]
      );

      if (tokenRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Booking link not found" });
      }

      const row = tokenRes.rows[0];

      if (row.used) {
        await client.query("ROLLBACK");
        return res.status(409).json({ message: "This slot has already been booked" });
      }

      if (row.expires_at && new Date(row.expires_at) < new Date()) {
        await client.query("ROLLBACK");
        return res.status(410).json({ message: "This booking link has expired" });
      }

      // Try to claim the slot (unique constraint prevents double-booking)
      try {
        await client.query(
          `INSERT INTO booked_slots (user_id, date, time_slot, lead_id)
           VALUES ($1, $2, $3, $4)`,
          [row.operator_user_id, datePart, timePart, row.lead_id]
        );
      } catch (slotErr: any) {
        if (slotErr.code === "23505") {
          await client.query("ROLLBACK");
          return res.status(409).json({ message: "This time slot is no longer available. Please choose another." });
        }
        throw slotErr;
      }

      // Mark token as used
      await client.query(
        `UPDATE booking_tokens SET used = true, used_at = NOW() WHERE token = $1`,
        [token]
      );

      // Create a booking record
      const contact = row.contact as any;
      const home = row.home as any;
      const quote = row.quote as any;
      const customerName = `${contact.firstName || ""} ${contact.lastName || ""}`.trim();
      const quoteAmount = quote?.exactAmount || (quote?.rangeMin ? (quote.rangeMin + (quote.rangeMax || quote.rangeMin)) / 2 : null);

      const bookingRes = await client.query(
        `INSERT INTO bookings
           (user_id, scheduled_date, scheduled_time, customer_name, customer_email,
            customer_phone, service_type, address, quote_amount, status, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'confirmed', $10)
         RETURNING *`,
        [
          row.operator_user_id,
          datePart,
          timePart,
          customerName,
          contact.email,
          contact.phone || null,
          home.serviceType,
          address || null,
          quoteAmount,
          notes || null,
        ]
      );
      const booking = bookingRes.rows[0];

      // Update lead
      await client.query(
        `UPDATE leads SET status = 'booked', booking_confirmed_at = NOW() WHERE id = $1`,
        [row.lead_id]
      );

      await client.query("COMMIT");

      // Format display values
      const displayDate = new Date(datePart + "T12:00:00").toLocaleDateString("en-US", {
        weekday: "long", month: "long", day: "numeric", year: "numeric",
      });
      const [hStr, mStr] = timePart.split(":");
      const h = parseInt(hStr, 10);
      const m = parseInt(mStr, 10);
      const period = h >= 12 ? "PM" : "AM";
      const h12 = h % 12 || 12;
      const displayTime = `${h12}:${String(m).padStart(2, "0")} ${period}`;

      const serviceLabels: Record<string, string> = {
        standard: "Standard Clean", deep: "Deep Clean",
        move: "Move In / Move Out", post_construction: "Post-Construction Clean",
      };
      const serviceLabel = serviceLabels[home.serviceType] || home.serviceType || "Cleaning";

      // Confirmation email to customer
      if (contact.email) {
        const color = (row.primary_color || "#2563EB").replace(/[^#a-fA-F0-9]/g, "");
        sendEmail({
          to: contact.email,
          subject: `Your Cleaning is Confirmed! — ${row.company_name}`,
          html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
  <tr><td style="background:${color};padding:28px 36px;text-align:center;">
    <div style="font-size:22px;font-weight:800;color:#fff;">${row.company_name}</div>
  </td></tr>
  <tr><td style="padding:32px 36px;">
    <p style="font-size:22px;font-weight:700;color:#111827;margin:0 0 8px;">You're all set, ${contact.firstName}! &#127881;</p>
    <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 24px;">Your cleaning appointment has been confirmed. Here are your details:</p>
    <div style="background:#F9FAFB;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 8px;font-size:14px;color:#374151;">&#128197; <strong>${displayDate}</strong></p>
      <p style="margin:0 0 8px;font-size:14px;color:#374151;">&#128336; <strong>${displayTime}</strong></p>
      <p style="margin:0 0 8px;font-size:14px;color:#374151;">&#127968; <strong>${serviceLabel}</strong> &bull; ${home.bedrooms}BR / ${home.bathrooms}BA</p>
      ${address ? `<p style="margin:0;font-size:14px;color:#374151;">&#128205; ${address}</p>` : ""}
    </div>
    <p style="font-size:14px;color:#6B7280;line-height:1.6;margin:0;">Questions? Reply to this email${row.business_phone ? ` or call <strong>${row.business_phone}</strong>` : ""}.</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`,
          fromName: row.company_name,
          replyTo: row.business_email || null,
        }).catch((e: any) => console.error("[bookingToken] customer email error:", e.message));
      }

      // Notification email to operator
      if (row.business_email) {
        const color = (row.primary_color || "#2563EB").replace(/[^#a-fA-F0-9]/g, "");
        sendEmail({
          to: row.business_email,
          subject: `New Booking — ${customerName || contact.email} on ${displayDate}`,
          html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
  <tr><td style="background:${color};padding:28px 36px;">
    <div style="font-size:13px;color:rgba(255,255,255,0.8);font-weight:600;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.05em;">QuotePro Autopilot</div>
    <div style="font-size:22px;font-weight:800;color:#fff;">New Booking Confirmed</div>
  </td></tr>
  <tr><td style="padding:32px 36px;">
    <p style="font-size:16px;color:#374151;line-height:1.6;margin:0 0 20px;"><strong>${customerName || "A customer"}</strong> just confirmed a booking through your Autopilot quote.</p>
    <div style="background:#F9FAFB;border-radius:12px;padding:20px;margin-bottom:20px;">
      <p style="margin:0 0 8px;font-size:14px;color:#374151;"><strong>Customer:</strong> ${customerName}${contact.email ? ` &bull; ${contact.email}` : ""}${contact.phone ? ` &bull; ${contact.phone}` : ""}</p>
      <p style="margin:0 0 8px;font-size:14px;color:#374151;"><strong>Date:</strong> ${displayDate} at ${displayTime}</p>
      <p style="margin:0 0 8px;font-size:14px;color:#374151;"><strong>Service:</strong> ${serviceLabel} &bull; ${home.bedrooms}BR / ${home.bathrooms}BA</p>
      ${quoteAmount ? `<p style="margin:0;font-size:14px;color:#374151;"><strong>Quote:</strong> $${Math.round(quoteAmount)}</p>` : ""}
    </div>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`,
          fromName: "QuotePro Autopilot",
          replyTo: null,
        }).catch((e: any) => console.error("[bookingToken] owner email error:", e.message));
      }

      return res.json({
        success: true,
        booking: { id: booking.id, date: datePart, time: timePart, displayDate, displayTime },
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error("[bookingToken] POST error:", err.message);
    return res.status(500).json({ message: "Failed to confirm booking" });
  }
});

export { buildCustomerConfirmationEmail, buildOwnerNotificationEmail };
export default router;
