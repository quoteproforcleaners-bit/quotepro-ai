/**
 * bookingWidgetRouter.ts
 *
 * Public endpoints (no auth) — identified by businessId:
 *   GET  /api/booking/:businessId/config
 *   GET  /api/booking/:businessId/availability?date=YYYY-MM-DD
 *   POST /api/booking/:businessId/request
 *
 * Owner endpoints (auth required):
 *   GET   /api/booking/settings
 *   PATCH /api/booking/settings
 *   GET   /api/booking/embed-code
 *
 * Widget JS served by index.ts at GET /widget/:businessId.js
 */

import { Router, type Request, type Response } from "express";
import { db } from "../db";
import { businesses, jobs, customers } from "../../shared/schema";
import { eq, and, gte, lt } from "drizzle-orm";
import { requireAuth } from "../middleware";
import { sendEmail } from "../mail";
import { getBusinessByOwner } from "../storage";
import { trackEvent } from "../analytics";
import { AnalyticsEvents } from "../../shared/analytics-events";

const router = Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseTime(t: string): { h: number; m: number } {
  const [h, m] = t.split(":").map(Number);
  return { h, m };
}

/** Generate 1-hour slots between startTime and endTime */
function buildSlots(startTime: string, endTime: string): string[] {
  const start = parseTime(startTime);
  const end = parseTime(endTime);
  const slots: string[] = [];
  for (let h = start.h; h < end.h; h++) {
    slots.push(`${String(h).padStart(2, "0")}:00`);
  }
  return slots;
}

function formatTime12(slot: string): string {
  const [h] = slot.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:00 ${ampm}`;
}

// ─── GET /api/booking/:businessId/config ─────────────────────────────────────

router.get("/:businessId/config", async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const [biz] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);

    if (!biz) return res.status(404).json({ error: "Business not found" });
    if (!biz.bookingWidgetEnabled) {
      return res.status(403).json({ error: "Booking widget not enabled" });
    }

    return res.json({
      businessName: biz.bookingWidgetBusinessName || biz.companyName,
      accentColor: biz.bookingWidgetAccentColor,
      services: biz.bookingWidgetServices || [],
      availableDays: biz.bookingWidgetAvailableDays || [1, 2, 3, 4, 5],
      startTime: biz.bookingWidgetStartTime,
      endTime: biz.bookingWidgetEndTime,
      advanceNoticeHours: biz.bookingWidgetAdvanceNoticeHours,
    });
  } catch (err) {
    console.error("[booking/config]", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ─── GET /api/booking/:businessId/availability ────────────────────────────────

router.get(
  "/:businessId/availability",
  async (req: Request, res: Response) => {
    try {
      const { businessId } = req.params;
      const { date } = req.query as { date?: string };

      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: "date param required (YYYY-MM-DD)" });
      }

      const [biz] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.id, businessId))
        .limit(1);

      if (!biz || !biz.bookingWidgetEnabled) {
        return res.status(404).json({ error: "Widget not available" });
      }

      // Check advance notice
      const requestedDate = new Date(date + "T00:00:00");
      const nowPlusNotice = new Date(
        Date.now() + biz.bookingWidgetAdvanceNoticeHours * 3600 * 1000
      );
      if (requestedDate < nowPlusNotice) {
        return res.json({ slots: [] });
      }

      // Check if this day of week is available (0=Sun, 6=Sat)
      const dayOfWeek = requestedDate.getDay();
      const availDays = biz.bookingWidgetAvailableDays || [1, 2, 3, 4, 5];
      if (!availDays.includes(dayOfWeek)) {
        return res.json({ slots: [] });
      }

      // Get existing jobs for this date
      const dayStart = new Date(date + "T00:00:00");
      const dayEnd = new Date(date + "T23:59:59");

      const bookedJobs = await db
        .select({ startDatetime: jobs.startDatetime, endDatetime: jobs.endDatetime })
        .from(jobs)
        .where(
          and(
            eq(jobs.businessId, businessId),
            gte(jobs.startDatetime, dayStart),
            lt(jobs.startDatetime, dayEnd)
          )
        );

      // Build all slots and remove conflicts
      const allSlots = buildSlots(
        biz.bookingWidgetStartTime,
        biz.bookingWidgetEndTime
      );

      const bookedHours = new Set(
        bookedJobs.map((j) => new Date(j.startDatetime).getHours())
      );

      const available = allSlots.filter((slot) => {
        const h = parseInt(slot.split(":")[0], 10);
        return !bookedHours.has(h);
      });

      return res.json({
        slots: available.map((s) => ({
          value: s,
          label: formatTime12(s),
        })),
      });
    } catch (err) {
      console.error("[booking/availability]", err);
      return res.status(500).json({ error: "Server error" });
    }
  }
);

// ─── POST /api/booking/:businessId/request ────────────────────────────────────

router.post("/:businessId/request", async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const {
      customerName,
      customerEmail,
      customerPhone,
      serviceId,
      preferredDate,
      preferredTime,
      address,
      notes,
    } = req.body;

    if (!customerName || !customerEmail || !preferredDate || !preferredTime) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const [biz] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);

    if (!biz || !biz.bookingWidgetEnabled) {
      return res.status(404).json({ error: "Widget not available" });
    }

    // Find or create customer
    const [firstName, ...rest] = customerName.trim().split(" ");
    const lastName = rest.join(" ") || "";

    let customerId: string;
    const [existing] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(
        and(
          eq(customers.businessId, businessId),
          eq(customers.email, customerEmail)
        )
      )
      .limit(1);

    if (existing) {
      customerId = existing.id;
    } else {
      const [created] = await db
        .insert(customers)
        .values({
          businessId,
          firstName,
          lastName,
          email: customerEmail,
          phone: customerPhone || "",
          address: address || "",
          notes: notes || "",
          leadSource: "booking_widget",
          status: "lead",
        })
        .returning({ id: customers.id });
      customerId = created.id;
    }

    // Find service name for email
    const services = (biz.bookingWidgetServices as any[]) || [];
    const service = services.find((s: any) => s.id === serviceId);
    const serviceName = service?.name || "Cleaning Service";

    const bookingId = `BK-${Date.now().toString(36).toUpperCase()}`;

    // Send confirmation to customer
    try {
      await sendEmail({
        to: customerEmail,
        subject: `Booking Request Received — ${biz.bookingWidgetBusinessName || biz.companyName}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1f2937">
            <h2 style="color:${biz.bookingWidgetAccentColor}">Booking Request Received</h2>
            <p>Hi ${firstName},</p>
            <p>We received your booking request and will confirm shortly.</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0">
              <tr><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;color:#6b7280">Service</td><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;font-weight:600">${serviceName}</td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;color:#6b7280">Date</td><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;font-weight:600">${preferredDate}</td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;color:#6b7280">Time</td><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;font-weight:600">${formatTime12(preferredTime)}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280">Reference</td><td style="padding:8px 0;font-weight:600">${bookingId}</td></tr>
            </table>
            <p>We'll be in touch to confirm your appointment.</p>
            <p style="color:#6b7280;font-size:14px">${biz.bookingWidgetBusinessName || biz.companyName}</p>
          </div>
        `,
        fromName: biz.bookingWidgetBusinessName || biz.companyName,
        replyTo: biz.email || null,
      });
    } catch (mailErr) {
      console.error("[booking/request] customer email failed:", mailErr);
    }

    // Notify business owner
    if (biz.email) {
      try {
        await sendEmail({
          to: biz.email,
          subject: `New Booking Request from ${customerName}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1f2937">
              <h2 style="color:${biz.bookingWidgetAccentColor}">New Booking Request</h2>
              <table style="width:100%;border-collapse:collapse;margin:16px 0">
                <tr><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;color:#6b7280">Customer</td><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;font-weight:600">${customerName}</td></tr>
                <tr><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;color:#6b7280">Email</td><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;font-weight:600">${customerEmail}</td></tr>
                <tr><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;color:#6b7280">Phone</td><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;font-weight:600">${customerPhone || "—"}</td></tr>
                <tr><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;color:#6b7280">Service</td><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;font-weight:600">${serviceName}</td></tr>
                <tr><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;color:#6b7280">Date</td><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;font-weight:600">${preferredDate}</td></tr>
                <tr><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;color:#6b7280">Time</td><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;font-weight:600">${formatTime12(preferredTime)}</td></tr>
                <tr><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;color:#6b7280">Address</td><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;font-weight:600">${address || "—"}</td></tr>
                <tr><td style="padding:8px 0;color:#6b7280">Notes</td><td style="padding:8px 0;font-weight:600">${notes || "—"}</td></tr>
              </table>
              <p style="color:#6b7280;font-size:14px">Reference: ${bookingId}</p>
            </div>
          `,
          fromName: "QuotePro AI",
        });
      } catch (mailErr) {
        console.error("[booking/request] owner email failed:", mailErr);
      }
    }

    return res.json({ success: true, bookingId });
  } catch (err) {
    console.error("[booking/request]", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ─── GET /api/booking/settings (owner auth) ──────────────────────────────────

router.get("/settings", requireAuth, async (req: Request, res: Response) => {
  try {
    const biz = await getBusinessByOwner(req.session.userId!);
    if (!biz) return res.status(404).json({ error: "Business not found" });

    return res.json({
      enabled: biz.bookingWidgetEnabled,
      accentColor: biz.bookingWidgetAccentColor,
      businessName: biz.bookingWidgetBusinessName || "",
      services: biz.bookingWidgetServices || [],
      availableDays: biz.bookingWidgetAvailableDays || [1, 2, 3, 4, 5],
      startTime: biz.bookingWidgetStartTime,
      endTime: biz.bookingWidgetEndTime,
      advanceNoticeHours: biz.bookingWidgetAdvanceNoticeHours,
    });
  } catch (err) {
    console.error("[booking/settings GET]", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ─── PATCH /api/booking/settings (owner auth) ────────────────────────────────

router.patch("/settings", requireAuth, async (req: Request, res: Response) => {
  try {
    const biz = await getBusinessByOwner(req.session.userId!);
    if (!biz) return res.status(404).json({ error: "Business not found" });
    const businessId = biz.id;
    const {
      enabled,
      accentColor,
      businessName,
      services,
      availableDays,
      startTime,
      endTime,
      advanceNoticeHours,
    } = req.body;

    await db
      .update(businesses)
      .set({
        ...(enabled !== undefined && { bookingWidgetEnabled: enabled }),
        ...(accentColor !== undefined && { bookingWidgetAccentColor: accentColor }),
        ...(businessName !== undefined && { bookingWidgetBusinessName: businessName || null }),
        ...(services !== undefined && { bookingWidgetServices: services }),
        ...(availableDays !== undefined && { bookingWidgetAvailableDays: availableDays }),
        ...(startTime !== undefined && { bookingWidgetStartTime: startTime }),
        ...(endTime !== undefined && { bookingWidgetEndTime: endTime }),
        ...(advanceNoticeHours !== undefined && {
          bookingWidgetAdvanceNoticeHours: advanceNoticeHours,
        }),
        updatedAt: new Date(),
      })
      .where(eq(businesses.id, businessId));

    if (enabled === true && req.session.userId) {
      trackEvent(req.session.userId, AnalyticsEvents.BOOKING_WIDGET_CONFIGURED, {}).catch(() => {});
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("[booking/settings PATCH]", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ─── GET /api/booking/embed-code (owner auth) ────────────────────────────────

router.get("/embed-code", requireAuth, async (req: Request, res: Response) => {
  try {
    const biz = await getBusinessByOwner(req.session.userId!);
    if (!biz) return res.status(404).json({ error: "Business not found" });
    const businessId = biz.id;
    const baseUrl =
      process.env.REPLIT_DOMAINS?.split(",")[0]
        ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
        : "https://app.getquotepro.ai";

    const scriptTag = `<script src="${baseUrl}/widget/${businessId}.js" async></script>`;
    return res.json({ scriptTag, businessId, baseUrl });
  } catch (err) {
    console.error("[booking/embed-code]", err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
