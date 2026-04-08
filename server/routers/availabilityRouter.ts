import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware";
import { pool } from "../db";

const router = Router();

// ─── GET /api/availability — fetch or seed availability settings ───────────────
router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;

    let result = await pool.query(
      `SELECT * FROM availability_settings WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      // Seed defaults: Mon–Fri, 8am–5pm, 2h slots, 30m buffer
      const insert = await pool.query(
        `INSERT INTO availability_settings
           (user_id, working_days, start_time, end_time, slot_duration_minutes,
            buffer_minutes, advance_booking_days, min_notice_hours)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [userId, [1, 2, 3, 4, 5], "08:00", "17:00", 120, 30, 30, 24]
      );
      result = insert;
    }

    const settings = result.rows[0];
    const blocked = await pool.query(
      `SELECT * FROM blocked_dates WHERE user_id = $1 ORDER BY blocked_date ASC`,
      [userId]
    );

    return res.json({ settings, blockedDates: blocked.rows });
  } catch (err: any) {
    console.error("[availability] GET error:", err.message);
    return res.status(500).json({ message: "Failed to fetch availability settings" });
  }
});

// ─── POST /api/availability — save settings + blocked dates ──────────────────
router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const {
      workingDays,
      startTime,
      endTime,
      slotDurationMinutes,
      bufferMinutes,
      advanceBookingDays,
      minNoticeHours,
      blockedDates,
    } = req.body;

    await pool.query(
      `INSERT INTO availability_settings
         (user_id, working_days, start_time, end_time, slot_duration_minutes,
          buffer_minutes, advance_booking_days, min_notice_hours, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         working_days = EXCLUDED.working_days,
         start_time = EXCLUDED.start_time,
         end_time = EXCLUDED.end_time,
         slot_duration_minutes = EXCLUDED.slot_duration_minutes,
         buffer_minutes = EXCLUDED.buffer_minutes,
         advance_booking_days = EXCLUDED.advance_booking_days,
         min_notice_hours = EXCLUDED.min_notice_hours,
         updated_at = NOW()`,
      [userId, workingDays || [1, 2, 3, 4, 5], startTime || "08:00",
       endTime || "17:00", slotDurationMinutes || 120, bufferMinutes || 30,
       advanceBookingDays || 30, minNoticeHours || 24]
    );

    if (Array.isArray(blockedDates)) {
      await pool.query(`DELETE FROM blocked_dates WHERE user_id = $1`, [userId]);
      for (const bd of blockedDates) {
        if (bd.date) {
          await pool.query(
            `INSERT INTO blocked_dates (user_id, blocked_date, reason) VALUES ($1, $2, $3)`,
            [userId, bd.date, bd.reason || null]
          );
        }
      }
    }

    return res.json({ message: "Availability settings saved" });
  } catch (err: any) {
    console.error("[availability] POST error:", err.message);
    return res.status(500).json({ message: "Failed to save availability settings" });
  }
});

// ─── GET /api/availability/slots — compute open time slots ───────────────────
// Public or authenticated. Query param: userId, startDate (YYYY-MM-DD), days
router.get("/slots", async (req: Request, res: Response) => {
  try {
    const userId = (req.query.userId as string) || req.session.userId;
    const startDateStr = (req.query.startDate as string) || new Date().toISOString().slice(0, 10);
    const days = Math.min(parseInt(req.query.days as string) || 14, 60);

    if (!userId) return res.status(400).json({ message: "userId required" });

    // Fetch settings
    const settingsRes = await pool.query(
      `SELECT * FROM availability_settings WHERE user_id = $1`,
      [userId]
    );
    if (settingsRes.rows.length === 0) {
      return res.json([]);
    }
    const s = settingsRes.rows[0];

    // Fetch blocked dates in window
    const blockedRes = await pool.query(
      `SELECT blocked_date FROM blocked_dates WHERE user_id = $1`,
      [userId]
    );
    const blockedSet = new Set(blockedRes.rows.map((r: any) => r.blocked_date));

    // Fetch existing bookings in window
    const windowEnd = new Date(startDateStr);
    windowEnd.setDate(windowEnd.getDate() + days);
    const bookingsRes = await pool.query(
      `SELECT scheduled_date, scheduled_time, duration_minutes
       FROM bookings
       WHERE user_id = $1
         AND scheduled_date >= $2
         AND scheduled_date <= $3
         AND status != 'cancelled'`,
      [userId, startDateStr, windowEnd.toISOString().slice(0, 10)]
    );
    const bookedSlots = new Map<string, number[]>();
    for (const b of bookingsRes.rows) {
      const key = b.scheduled_date;
      if (!bookedSlots.has(key)) bookedSlots.set(key, []);
      const [bh, bm] = b.scheduled_time.split(":").map(Number);
      bookedSlots.get(key)!.push(bh * 60 + bm);
    }

    const slotDuration = parseInt(s.slot_duration_minutes) || 120;
    const buffer = parseInt(s.buffer_minutes) || 30;
    const advanceDays = parseInt(s.advance_booking_days) || 30;
    const minNoticeMs = (parseInt(s.min_notice_hours) || 24) * 60 * 60 * 1000;
    const [sh, sm] = s.start_time.split(":").map(Number);
    const [eh, em] = s.end_time.split(":").map(Number);

    const now = Date.now();
    const results: any[] = [];

    for (let d = 0; d < days; d++) {
      const date = new Date(startDateStr + "T00:00:00");
      date.setDate(date.getDate() + d);

      // Skip days beyond advance booking window
      const diffDays = (date.getTime() - now) / (1000 * 60 * 60 * 24);
      if (diffDays > advanceDays) break;

      const dayOfWeek = date.getDay();
      if (!s.working_days.includes(dayOfWeek)) continue;

      const dateStr = date.toISOString().slice(0, 10);
      if (blockedSet.has(dateStr)) continue;

      const booked = bookedSlots.get(dateStr) || [];
      let slotStart = sh * 60 + sm;
      const dayEnd = eh * 60 + em;

      while (slotStart + slotDuration <= dayEnd) {
        // Check min notice
        const slotDate = new Date(`${dateStr}T${String(Math.floor(slotStart / 60)).padStart(2, "0")}:${String(slotStart % 60).padStart(2, "0")}:00`);
        if (slotDate.getTime() - now < minNoticeMs) {
          slotStart += slotDuration + buffer;
          continue;
        }

        // Check conflict with existing bookings
        const conflict = booked.some((b) => Math.abs(b - slotStart) < slotDuration);
        if (!conflict) {
          const h = Math.floor(slotStart / 60);
          const m = slotStart % 60;
          const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
          const ampm = h >= 12 ? "PM" : "AM";
          const h12 = h % 12 === 0 ? 12 : h % 12;
          const displayTime = `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
          const displayDate = date.toLocaleDateString("en-US", {
            weekday: "long", month: "long", day: "numeric"
          });

          results.push({ date: dateStr, time: timeStr, displayDate, displayTime });
        }

        slotStart += slotDuration + buffer;
      }
    }

    return res.json(results);
  } catch (err: any) {
    console.error("[availability] slots error:", err.message);
    return res.status(500).json({ message: "Failed to compute slots" });
  }
});

export default router;
