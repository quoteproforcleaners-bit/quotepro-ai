/**
 * server/routers/staffRouter.ts
 * Staff (field cleaner) endpoints — /api/staff/*
 *
 * Re-uses the existing `employees` table for identity and
 * `employeeAuthMiddleware` / `signEmployeeToken` for JWT auth.
 */

import { Router, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { db, pool } from "../db";
import { eq, and, gte, lt, desc, asc } from "drizzle-orm";
import {
  employees,
  jobAssignments,
  jobs,
  customers,
  jobPhotos,
  businesses,
  staffClockEvents,
} from "../../shared/schema";
import {
  employeeAuthMiddleware,
  signEmployeeToken,
} from "../lib/employeeAuth";
import { requireAuth } from "../middleware";
import { getBusinessByOwner } from "../storage";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getStaff(req: Request) {
  return (req as any).employee as {
    employeeId: string;
    businessId: string;
    name: string;
    role: string;
  };
}

function todayStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function todayEnd(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

// ─── Photo upload setup ───────────────────────────────────────────────────────

const uploadDir = path.join(process.cwd(), "uploads", "staff-photos");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only images allowed"));
  },
});

// ─── PUBLIC: Staff PIN Login ──────────────────────────────────────────────────

router.post("/staff/auth", async (req: Request, res: Response) => {
  try {
    const { businessId, pin } = req.body as { businessId: string; pin: string };
    if (!businessId || !pin) {
      return res.status(400).json({ message: "businessId and pin are required" });
    }

    // Find active staff members for this business
    const staff = await db
      .select()
      .from(employees)
      .where(and(eq(employees.businessId, businessId), eq(employees.isActive, true)));

    // Compare PIN against each staff member
    let matched = null;
    for (const s of staff) {
      if (!s.pin) continue;
      const ok = await bcrypt.compare(pin, s.pin);
      if (ok) { matched = s; break; }
    }

    if (!matched) {
      return res.status(401).json({ message: "Invalid PIN. Please try again." });
    }

    const token = signEmployeeToken({
      employeeId: matched.id,
      businessId: matched.businessId,
      name: matched.name,
      role: "employee",
    });

    return res.json({
      token,
      staff: {
        id: matched.id,
        name: matched.name,
        businessId: matched.businessId,
        email: matched.email,
        phone: matched.phone,
      },
    });
  } catch (e: any) {
    console.error("[staff/auth]", e.message);
    return res.status(500).json({ message: "Login failed" });
  }
});

// ─── AUTHENTICATED STAFF ENDPOINTS ────────────────────────────────────────────

// GET /api/staff/me
router.get("/staff/me", employeeAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { employeeId } = getStaff(req);
    const [s] = await db.select().from(employees).where(eq(employees.id, employeeId));
    if (!s) return res.status(404).json({ message: "Staff not found" });

    // Get today's job count
    const todayJobs = await db
      .select()
      .from(jobAssignments)
      .where(
        and(
          eq(jobAssignments.employeeId, employeeId),
          gte(jobAssignments.createdAt, todayStart()),
          lt(jobAssignments.createdAt, todayEnd())
        )
      );

    return res.json({
      id: s.id,
      name: s.name,
      email: s.email,
      phone: s.phone,
      businessId: s.businessId,
      todayJobCount: todayJobs.length,
    });
  } catch (e: any) {
    console.error("[staff/me]", e.message);
    return res.status(500).json({ message: "Failed to get profile" });
  }
});

// GET /api/staff/today — jobs assigned to this staff member today
router.get("/staff/today", employeeAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { employeeId, businessId } = getStaff(req);

    const assignments = await db
      .select({
        assignment: jobAssignments,
        job: jobs,
      })
      .from(jobAssignments)
      .innerJoin(jobs, eq(jobAssignments.jobId, jobs.id))
      .where(
        and(
          eq(jobAssignments.employeeId, employeeId),
          eq(jobAssignments.businessId, businessId),
          gte(jobs.startDatetime, todayStart()),
          lt(jobs.startDatetime, todayEnd())
        )
      )
      .orderBy(asc(jobs.startDatetime));

    // Enrich with customer name
    const result = await Promise.all(
      assignments.map(async ({ assignment, job }) => {
        let customerName = "";
        if (job.customerId) {
          const { rows } = await pool.query(
            `SELECT first_name, last_name, phone FROM customers WHERE id = $1`,
            [job.customerId]
          );
          if (rows[0]) {
            customerName = `${rows[0].first_name} ${rows[0].last_name}`.trim();
          }
        }

        // Photo counts
        const { rows: photoCounts } = await pool.query(
          `SELECT photo_type, count(*) FROM job_photos WHERE job_id = $1 GROUP BY photo_type`,
          [job.id]
        );
        const beforeCount = photoCounts.find((r: any) => r.photo_type === "before")?.count || 0;
        const afterCount  = photoCounts.find((r: any) => r.photo_type === "after")?.count || 0;

        return {
          assignmentId: assignment.id,
          jobId: job.id,
          status: assignment.status,
          checkinTime: assignment.checkinTime,
          checkoutTime: assignment.checkoutTime,
          scheduledTime: job.startDatetime,
          endDatetime: job.endDatetime,
          serviceType: job.jobType,
          address: job.address,
          internalNotes: job.internalNotes,
          specialRequests: job.specialRequests,
          accessCode: job.accessCode,
          parkingNotes: job.parkingNotes,
          customerName,
          total: job.total,
          beforePhotoCount: Number(beforeCount),
          afterPhotoCount: Number(afterCount),
        };
      })
    );

    return res.json(result);
  } catch (e: any) {
    console.error("[staff/today]", e.message);
    return res.status(500).json({ message: "Failed to load today's jobs" });
  }
});

// POST /api/staff/clock-in
router.post("/staff/clock-in", employeeAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { employeeId, businessId } = getStaff(req);
    const { latitude, longitude, jobId } = req.body;

    // Prevent double clock-in
    const { rows } = await pool.query(
      `SELECT id FROM staff_clock_events
       WHERE staff_id = $1
         AND event_type = 'clock_in'
         AND created_at >= $2
         AND created_at <= $3
       ORDER BY created_at DESC LIMIT 1`,
      [employeeId, todayStart(), todayEnd()]
    );
    // Check if there's a clock-in without a subsequent clock-out
    if (rows.length > 0) {
      const { rows: clockOuts } = await pool.query(
        `SELECT id FROM staff_clock_events
         WHERE staff_id = $1
           AND event_type = 'clock_out'
           AND created_at > $2
           AND created_at <= $3
         LIMIT 1`,
        [employeeId, rows[0].created_at || todayStart(), todayEnd()]
      );
      if (clockOuts.length === 0) {
        return res.status(409).json({ message: "You are already clocked in" });
      }
    }

    const { rows: inserted } = await pool.query(
      `INSERT INTO staff_clock_events (staff_id, business_id, job_id, event_type, latitude, longitude)
       VALUES ($1, $2, $3, 'clock_in', $4, $5)
       RETURNING *`,
      [employeeId, businessId, jobId || null, latitude ?? null, longitude ?? null]
    );

    return res.json({ event: inserted[0], clockedIn: true });
  } catch (e: any) {
    console.error("[staff/clock-in]", e.message);
    return res.status(500).json({ message: "Failed to clock in" });
  }
});

// POST /api/staff/clock-out
router.post("/staff/clock-out", employeeAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { employeeId, businessId } = getStaff(req);
    const { latitude, longitude, jobId } = req.body;

    const { rows: inserted } = await pool.query(
      `INSERT INTO staff_clock_events (staff_id, business_id, job_id, event_type, latitude, longitude)
       VALUES ($1, $2, $3, 'clock_out', $4, $5)
       RETURNING *`,
      [employeeId, businessId, jobId || null, latitude ?? null, longitude ?? null]
    );

    // Compute today's total hours
    const { rows: events } = await pool.query(
      `SELECT event_type, created_at FROM staff_clock_events
       WHERE staff_id = $1
         AND created_at >= $2
         AND created_at <= $3
       ORDER BY created_at ASC`,
      [employeeId, todayStart(), todayEnd()]
    );

    let totalMinutes = 0;
    let lastClockIn: Date | null = null;
    for (const ev of events) {
      if (ev.event_type === "clock_in") {
        lastClockIn = new Date(ev.created_at);
      } else if (ev.event_type === "clock_out" && lastClockIn) {
        totalMinutes += (new Date(ev.created_at).getTime() - lastClockIn.getTime()) / 60000;
        lastClockIn = null;
      }
    }

    return res.json({ event: inserted[0], clockedIn: false, totalMinutesToday: Math.round(totalMinutes) });
  } catch (e: any) {
    console.error("[staff/clock-out]", e.message);
    return res.status(500).json({ message: "Failed to clock out" });
  }
});

// GET /api/staff/clock-status — current clock status + today's hours
router.get("/staff/clock-status", employeeAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { employeeId } = getStaff(req);

    const { rows: events } = await pool.query(
      `SELECT event_type, created_at FROM staff_clock_events
       WHERE staff_id = $1
         AND created_at >= $2
         AND created_at <= $3
       ORDER BY created_at ASC`,
      [employeeId, todayStart(), todayEnd()]
    );

    let clockedIn = false;
    let clockInTime: Date | null = null;
    let totalMinutes = 0;
    let lastClockIn: Date | null = null;
    for (const ev of events) {
      if (ev.event_type === "clock_in") {
        lastClockIn = new Date(ev.created_at);
        clockedIn = true;
        clockInTime = lastClockIn;
      } else if (ev.event_type === "clock_out" && lastClockIn) {
        totalMinutes += (new Date(ev.created_at).getTime() - lastClockIn.getTime()) / 60000;
        lastClockIn = null;
        clockedIn = false;
        clockInTime = null;
      }
    }
    // If currently clocked in, add time since last clock-in
    if (clockedIn && lastClockIn) {
      totalMinutes += (Date.now() - lastClockIn.getTime()) / 60000;
    }

    return res.json({ clockedIn, clockInTime, totalMinutesToday: Math.round(totalMinutes) });
  } catch (e: any) {
    console.error("[staff/clock-status]", e.message);
    return res.status(500).json({ message: "Failed to get clock status" });
  }
});

// POST /api/staff/jobs/:jobId/photos — upload before/after photos
router.post(
  "/staff/jobs/:jobId/photos",
  employeeAuthMiddleware,
  upload.single("photo"),
  async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;
      const { phase } = req.body as { phase: "before" | "after" };

      if (!req.file) return res.status(400).json({ message: "No photo uploaded" });
      if (!["before", "after"].includes(phase)) {
        return res.status(400).json({ message: "phase must be 'before' or 'after'" });
      }

      // Build a URL accessible from the frontend
      const filename = path.basename(req.file.path);
      const photoUrl = `/uploads/staff-photos/${filename}`;

      // Save to job_photos table
      const { rows } = await pool.query(
        `INSERT INTO job_photos (job_id, photo_url, photo_type, caption, customer_visible)
         VALUES ($1, $2, $3, $4, false)
         RETURNING *`,
        [jobId, photoUrl, phase, `${phase} photo`]
      );

      return res.json({ photo: rows[0], photoUrl });
    } catch (e: any) {
      console.error("[staff/photos]", e.message);
      return res.status(500).json({ message: "Failed to upload photo" });
    }
  }
);

// POST /api/staff/jobs/:jobId/complete
router.post("/staff/jobs/:jobId/complete", employeeAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const { employeeId } = getStaff(req);
    const { notes } = req.body;

    // Check after photos exist
    const { rows: afterPhotos } = await pool.query(
      `SELECT id FROM job_photos WHERE job_id = $1 AND photo_type = 'after' LIMIT 1`,
      [jobId]
    );
    if (afterPhotos.length === 0) {
      return res.status(400).json({ message: "At least one after photo is required to mark the job complete" });
    }

    // Mark job complete
    await pool.query(
      `UPDATE jobs
       SET status = 'complete', completed_at = NOW(), cleaner_notes = $1, updated_at = NOW()
       WHERE id = $2`,
      [notes || "", jobId]
    );

    // Update the assignment
    await pool.query(
      `UPDATE job_assignments
       SET status = 'completed', checkout_time = NOW(), updated_at = NOW()
       WHERE job_id = $1 AND employee_id = $2`,
      [jobId, employeeId]
    );

    return res.json({ message: "Job marked complete" });
  } catch (e: any) {
    console.error("[staff/complete]", e.message);
    return res.status(500).json({ message: "Failed to mark job complete" });
  }
});

// ─── OWNER ENDPOINTS — manage staff ──────────────────────────────────────────

// GET /api/staff — list staff for this business
router.get("/staff", requireAuth, async (req: Request, res: Response) => {
  try {
    const business = await getBusinessByOwner(req.session.userId!);
    if (!business) return res.status(404).json({ message: "Business not found" });

    const staff = await db
      .select()
      .from(employees)
      .where(eq(employees.businessId, business.id))
      .orderBy(asc(employees.name));

    // Enrich with today's job count + last clock-in
    const enriched = await Promise.all(
      staff.map(async (s) => {
        const { rows: todayJobs } = await pool.query(
          `SELECT ja.id FROM job_assignments ja
           INNER JOIN jobs j ON j.id = ja.job_id
           WHERE ja.employee_id = $1
             AND j.start_datetime >= $2
             AND j.start_datetime <= $3`,
          [s.id, todayStart(), todayEnd()]
        );

        const { rows: lastClock } = await pool.query(
          `SELECT event_type, created_at FROM staff_clock_events
           WHERE staff_id = $1
           ORDER BY created_at DESC LIMIT 1`,
          [s.id]
        );

        return {
          id: s.id,
          name: s.name,
          email: s.email,
          phone: s.phone,
          isActive: s.isActive,
          createdAt: s.createdAt,
          todayJobCount: todayJobs.length,
          lastClockEvent: lastClock[0] || null,
          hasPin: !!s.pin,
        };
      })
    );

    return res.json(enriched);
  } catch (e: any) {
    console.error("[staff list]", e.message);
    return res.status(500).json({ message: "Failed to list staff" });
  }
});

// POST /api/staff — create staff member
router.post("/staff", requireAuth, async (req: Request, res: Response) => {
  try {
    const business = await getBusinessByOwner(req.session.userId!);
    if (!business) return res.status(404).json({ message: "Business not found" });

    const { name, email, phone, pin } = req.body;
    if (!name || !pin || pin.length < 4) {
      return res.status(400).json({ message: "name and a 4+ digit PIN are required" });
    }

    const pinHash = await bcrypt.hash(String(pin), 12);

    const { rows } = await pool.query(
      `INSERT INTO employees (business_id, name, email, phone, pin, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING id, name, email, phone, is_active, created_at`,
      [business.id, name, email || "", phone || "", pinHash]
    );

    return res.status(201).json(rows[0]);
  } catch (e: any) {
    console.error("[staff create]", e.message);
    return res.status(500).json({ message: e.message?.includes("unique") ? "Email already in use" : "Failed to create staff member" });
  }
});

// PATCH /api/staff/:id — edit staff member
router.patch("/staff/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const business = await getBusinessByOwner(req.session.userId!);
    if (!business) return res.status(404).json({ message: "Business not found" });

    const { name, phone, email, pin, isActive } = req.body;

    const setClauses: string[] = [];
    const vals: any[] = [];

    if (name !== undefined)     { setClauses.push(`name = $${vals.length + 1}`);      vals.push(name); }
    if (phone !== undefined)    { setClauses.push(`phone = $${vals.length + 1}`);     vals.push(phone); }
    if (email !== undefined)    { setClauses.push(`email = $${vals.length + 1}`);     vals.push(email); }
    if (isActive !== undefined) { setClauses.push(`is_active = $${vals.length + 1}`); vals.push(isActive); }
    if (pin !== undefined)      {
      const pinHash = await bcrypt.hash(String(pin), 12);
      setClauses.push(`pin = $${vals.length + 1}`);
      vals.push(pinHash);
    }

    if (setClauses.length === 0) return res.status(400).json({ message: "No fields to update" });

    setClauses.push(`updated_at = NOW()`);
    vals.push(req.params.id, business.id);

    const { rows } = await pool.query(
      `UPDATE employees SET ${setClauses.join(", ")}
       WHERE id = $${vals.length - 1} AND business_id = $${vals.length}
       RETURNING id, name, email, phone, is_active`,
      vals
    );

    if (!rows[0]) return res.status(404).json({ message: "Staff member not found" });
    return res.json(rows[0]);
  } catch (e: any) {
    console.error("[staff update]", e.message);
    return res.status(500).json({ message: "Failed to update staff member" });
  }
});

// DELETE /api/staff/:id — deactivate
router.delete("/staff/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const business = await getBusinessByOwner(req.session.userId!);
    if (!business) return res.status(404).json({ message: "Business not found" });

    await pool.query(
      `UPDATE employees SET is_active = false, updated_at = NOW()
       WHERE id = $1 AND business_id = $2`,
      [req.params.id, business.id]
    );

    return res.json({ message: "Staff member deactivated" });
  } catch (e: any) {
    console.error("[staff delete]", e.message);
    return res.status(500).json({ message: "Failed to deactivate staff member" });
  }
});

export default router;
