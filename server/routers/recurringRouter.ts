/**
 * server/routers/recurringRouter.ts
 * Recurring schedule management — /api/recurring-schedules
 *
 * Wraps the existing recurring_clean_series infrastructure with a clean REST API
 * that also handles Stripe SetupIntent flows for auto-charge.
 */

import { Router, type Request, type Response } from "express";
import { pool } from "../db";
import { requireAuth, requirePro } from "../middleware";
import { getStripe } from "../clients";
import {
  getBusinessByOwner,
  createRecurringSeries,
  getRecurringSeriesByBusiness,
  getRecurringSeriesById,
  updateRecurringSeries,
  cancelRecurringSeries,
  generateSeriesJobs,
  getCustomerById,
} from "../storage";
import { trackEvent } from "../analytics";

const router = Router();

// ─── GET /api/recurring-schedules ─────────────────────────────────────────────

router.get("/recurring-schedules", requireAuth, requirePro, async (req: Request, res: Response) => {
  try {
    const business = await getBusinessByOwner(req.session.userId!);
    if (!business) return res.status(404).json({ message: "Business not found" });

    const series = await getRecurringSeriesByBusiness(business.id);

    // Enrich with customer names
    const enriched = await Promise.all(
      series.map(async (s) => {
        let customerName = "";
        if (s.customerId) {
          const c = await getCustomerById(s.customerId);
          if (c) customerName = `${c.firstName} ${c.lastName}`.trim();
        }
        return { ...s, customerName };
      })
    );

    return res.json(enriched);
  } catch (e: any) {
    console.error("[recurring-schedules] list error:", e.message);
    return res.status(500).json({ message: "Failed to list recurring schedules" });
  }
});

// ─── POST /api/recurring-schedules ────────────────────────────────────────────

router.post("/recurring-schedules", requireAuth, requirePro, async (req: Request, res: Response) => {
  try {
    const business = await getBusinessByOwner(req.session.userId!);
    if (!business) return res.status(404).json({ message: "Business not found" });

    const {
      customerId,
      frequency,
      customIntervalDays,
      dayOfWeek,
      timeOfDay,
      durationHours,
      price,
      notes,
      autoCharge,
      startDate,
    } = req.body;

    if (!frequency || !startDate) {
      return res.status(400).json({ message: "frequency and startDate are required" });
    }

    // Map spec fields to existing storage fields
    const intervalValue = frequency === "custom" ? (customIntervalDays || 7) : (frequency === "biweekly" ? 2 : 1);
    const intervalUnit  = frequency === "monthly" ? "months" : "weeks";
    const mappedFreq    = frequency; // weekly | biweekly | monthly | custom

    const series = await createRecurringSeries({
      businessId: business.id,
      customerId: customerId || undefined,
      frequency: mappedFreq,
      intervalValue,
      intervalUnit,
      startDate,
      defaultPrice: price ? price / 100 : undefined, // cents → dollars internally
      durationHours: durationHours || 3,
      internalNotes: notes || "",
      arrivalTime: timeOfDay || "09:00",
    });

    // Apply auto_charge flag and day_of_week if provided
    if (autoCharge !== undefined || dayOfWeek !== undefined) {
      await pool.query(
        `UPDATE recurring_clean_series
         SET auto_charge = $1, day_of_week = $2, updated_at = NOW()
         WHERE id = $3`,
        [autoCharge || false, dayOfWeek ?? null, series.id]
      );
    }

    trackEvent(req.session.userId!, "RECURRING_SCHEDULE_CREATED" as any, {
      frequency, price, autoCharge,
    }).catch(() => {});

    return res.status(201).json({ ...series, autoCharge: autoCharge || false });
  } catch (e: any) {
    console.error("[recurring-schedules] create error:", e.message);
    return res.status(500).json({ message: "Failed to create recurring schedule" });
  }
});

// ─── GET /api/recurring-schedules/:id ─────────────────────────────────────────

router.get("/recurring-schedules/:id", requireAuth, requirePro, async (req: Request, res: Response) => {
  try {
    const business = await getBusinessByOwner(req.session.userId!);
    if (!business) return res.status(404).json({ message: "Business not found" });

    const series = await getRecurringSeriesById(req.params.id);
    if (!series || series.businessId !== business.id) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    // Compute next 4 upcoming job dates
    const { rows: upcomingRows } = await pool.query(
      `SELECT id, start_datetime, status, total
       FROM jobs
       WHERE series_id = $1
         AND start_datetime >= NOW()
         AND skipped = false
         AND deleted_at IS NULL
       ORDER BY start_datetime ASC
       LIMIT 4`,
      [series.id]
    );

    // Customer name
    let customerName = "";
    if (series.customerId) {
      const c = await getCustomerById(series.customerId);
      if (c) customerName = `${c.firstName} ${c.lastName}`.trim();
    }

    return res.json({ ...series, customerName, upcomingJobs: upcomingRows });
  } catch (e: any) {
    console.error("[recurring-schedules] get error:", e.message);
    return res.status(500).json({ message: "Failed to get recurring schedule" });
  }
});

// ─── PATCH /api/recurring-schedules/:id ───────────────────────────────────────

router.patch("/recurring-schedules/:id", requireAuth, requirePro, async (req: Request, res: Response) => {
  try {
    const business = await getBusinessByOwner(req.session.userId!);
    if (!business) return res.status(404).json({ message: "Business not found" });

    const series = await getRecurringSeriesById(req.params.id);
    if (!series || series.businessId !== business.id) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    const { price, timeOfDay, frequency, active, notes, autoCharge, dayOfWeek } = req.body;

    const updates: Record<string, any> = {};
    if (price !== undefined)    updates.defaultPrice = price / 100;
    if (timeOfDay !== undefined) updates.arrivalTime = timeOfDay;
    if (frequency !== undefined) updates.frequency = frequency;
    if (notes !== undefined)     updates.internalNotes = notes;
    if (active !== undefined)    updates.status = active ? "active" : "paused";

    const updated = await updateRecurringSeries(req.params.id, updates);

    // Apply auto_charge and day_of_week directly (not in updateRecurringSeries signature yet)
    if (autoCharge !== undefined || dayOfWeek !== undefined) {
      const setClauses: string[] = [];
      const vals: any[] = [];
      if (autoCharge !== undefined) { setClauses.push(`auto_charge = $${vals.length + 1}`); vals.push(autoCharge); }
      if (dayOfWeek !== undefined)  { setClauses.push(`day_of_week = $${vals.length + 1}`); vals.push(dayOfWeek); }
      vals.push(req.params.id);
      await pool.query(
        `UPDATE recurring_clean_series SET ${setClauses.join(", ")}, updated_at = NOW() WHERE id = $${vals.length}`,
        vals
      );
    }

    return res.json(updated);
  } catch (e: any) {
    console.error("[recurring-schedules] patch error:", e.message);
    return res.status(500).json({ message: "Failed to update recurring schedule" });
  }
});

// ─── DELETE /api/recurring-schedules/:id ──────────────────────────────────────

router.delete("/recurring-schedules/:id", requireAuth, requirePro, async (req: Request, res: Response) => {
  try {
    const business = await getBusinessByOwner(req.session.userId!);
    if (!business) return res.status(404).json({ message: "Business not found" });

    const series = await getRecurringSeriesById(req.params.id);
    if (!series || series.businessId !== business.id) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    await cancelRecurringSeries(req.params.id);
    return res.json({ message: "Schedule cancelled" });
  } catch (e: any) {
    console.error("[recurring-schedules] delete error:", e.message);
    return res.status(500).json({ message: "Failed to cancel recurring schedule" });
  }
});

// ─── POST /api/recurring-schedules/:id/save-payment-method ────────────────────
// Creates a Stripe SetupIntent so the client can collect a payment method for auto-charge.

router.post("/recurring-schedules/:id/save-payment-method", requireAuth, requirePro, async (req: Request, res: Response) => {
  try {
    const business = await getBusinessByOwner(req.session.userId!);
    if (!business) return res.status(404).json({ message: "Business not found" });

    const series = await getRecurringSeriesById(req.params.id);
    if (!series || series.businessId !== business.id) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    const stripe = getStripe();
    if (!stripe) return res.status(503).json({ message: "Stripe is not configured" });

    // Confirm we have a payment method ID to save (from client after confirming SetupIntent)
    const { paymentMethodId } = req.body;
    if (paymentMethodId) {
      // Client already confirmed the SetupIntent — just save the payment method
      await pool.query(
        `UPDATE recurring_clean_series
         SET stripe_payment_method_id = $1, auto_charge = true, updated_at = NOW()
         WHERE id = $2`,
        [paymentMethodId, series.id]
      );
      trackEvent(req.session.userId!, "RECURRING_PAYMENT_METHOD_SAVED" as any, {
        scheduleId: series.id,
      }).catch(() => {});
      return res.json({ message: "Payment method saved", autoCharge: true });
    }

    // No paymentMethodId yet — create a SetupIntent for the client to confirm
    // Fetch or create a Stripe customer for the business owner
    const { rows } = await pool.query(
      `SELECT stripe_customer_id FROM users WHERE id = $1`,
      [req.session.userId]
    );
    let stripeCustomerId: string | undefined = rows[0]?.stripe_customer_id;

    if (!stripeCustomerId) {
      const { rows: userRows } = await pool.query(
        `SELECT email, name FROM users WHERE id = $1`,
        [req.session.userId]
      );
      const u = userRows[0];
      const customer = await stripe.customers.create({
        email: u?.email,
        name: u?.name || undefined,
        metadata: { userId: req.session.userId! },
      });
      stripeCustomerId = customer.id;
      await pool.query(
        `UPDATE users SET stripe_customer_id = $1 WHERE id = $2`,
        [stripeCustomerId, req.session.userId]
      );
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      payment_method_types: ["card"],
      metadata: { scheduleId: series.id, userId: req.session.userId! },
    });

    return res.json({ clientSecret: setupIntent.client_secret });
  } catch (e: any) {
    console.error("[recurring-schedules] save-payment-method error:", e.message);
    return res.status(500).json({ message: "Failed to set up payment method" });
  }
});

export default router;
