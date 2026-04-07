import { Router, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db";
import { employees, jobs, jobAssignments, customers, businesses } from "../../shared/schema";
import { eq, and, gte, lt, lte, desc, asc, sql } from "drizzle-orm";
import { employeeAuthMiddleware, signEmployeeToken, type EmployeeTokenPayload } from "../lib/employeeAuth";
import { sendCheckinEmail, sendCheckoutEmail } from "../lib/employeeNotify";

const router = Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getEmployee(req: Request): EmployeeTokenPayload {
  return (req as any).employee as EmployeeTokenPayload;
}

function todayDateStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatJobForEmployee(
  job: any,
  customer: any,
  assignment: any
) {
  return {
    assignmentId: assignment.id,
    jobId: job.id,
    status: assignment.status,
    assignedDate: assignment.assignedDate,
    checkinTime: assignment.checkinTime,
    checkoutTime: assignment.checkoutTime,
    durationMinutes: assignment.durationMinutes,
    employeeNotes: assignment.employeeNotes,
    checkinPhotoUrl: assignment.checkinPhotoUrl,
    checkoutPhotoUrl: assignment.checkoutPhotoUrl,
    scheduledTime: job.startDatetime,
    endDatetime: job.endDatetime,
    estimatedDurationMinutes: job.estimatedDurationMinutes,
    serviceType: job.jobType,
    address: job.address,
    customerName: customer
      ? `${customer.firstName} ${customer.lastName}`.trim()
      : "Customer",
    customerPhone: customer?.phone ?? null,
    specialRequests: job.specialRequests ?? null,
    accessCode: job.accessCode ?? null,
    parkingNotes: job.parkingNotes ?? null,
    keyLocation: job.keyLocation ?? null,
    roomCount: job.roomCount ?? null,
    squareFootage: job.squareFootage ?? null,
    internalNotes: job.internalNotes ?? "",
  };
}

// ─── Auth: Login ──────────────────────────────────────────────────────────────

router.post("/auth/login", async (req: Request, res: Response) => {
  try {
    const { email, pin, businessId } = req.body as {
      email?: string;
      pin?: string;
      businessId?: string;
    };

    if (!email || !pin) {
      return res.status(400).json({ message: "Email and PIN are required" });
    }

    // Find employee — match by email across all businesses or scoped to businessId
    const whereClause = businessId
      ? and(eq(employees.email, email.toLowerCase().trim()), eq(employees.businessId, businessId))
      : eq(employees.email, email.toLowerCase().trim());

    const [employee] = await db
      .select()
      .from(employees)
      .where(whereClause)
      .limit(1);

    if (!employee) {
      return res.status(401).json({ message: "Incorrect email or PIN" });
    }

    if (!employee.isActive || employee.status === "inactive") {
      return res.status(403).json({ message: "Your account has been deactivated. Contact your manager." });
    }

    if (!employee.pin) {
      return res.status(403).json({ message: "PIN not set up yet. Contact your manager." });
    }

    const pinMatch = await bcrypt.compare(pin, employee.pin);
    if (!pinMatch) {
      return res.status(401).json({ message: "Incorrect email or PIN" });
    }

    const token = signEmployeeToken({
      employeeId: employee.id,
      businessId: employee.businessId,
      name: employee.name,
      role: "employee",
    });

    return res.json({
      token,
      employee: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        businessId: employee.businessId,
        color: employee.color,
        role: employee.role,
      },
    });
  } catch (err: any) {
    console.error("[employee/auth/login]", err);
    return res.status(500).json({ message: "Login failed" });
  }
});

// ─── Jobs: Today ─────────────────────────────────────────────────────────────

router.get("/jobs/today", employeeAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { employeeId } = getEmployee(req);
    const today = todayDateStr();

    const assignments = await db
      .select()
      .from(jobAssignments)
      .where(and(eq(jobAssignments.employeeId, employeeId), eq(jobAssignments.assignedDate, today)))
      .orderBy(asc(jobAssignments.createdAt));

    const results = await Promise.all(
      assignments.map(async (a) => {
        const [job] = await db.select().from(jobs).where(eq(jobs.id, a.jobId)).limit(1);
        if (!job) return null;
        let customer = null;
        if (job.customerId) {
          [customer] = await db.select().from(customers).where(eq(customers.id, job.customerId)).limit(1);
        }
        return formatJobForEmployee(job, customer, a);
      })
    );

    return res.json(results.filter(Boolean));
  } catch (err: any) {
    console.error("[employee/jobs/today]", err);
    return res.status(500).json({ message: "Failed to load today's jobs" });
  }
});

// ─── Jobs: Upcoming (7 days) ─────────────────────────────────────────────────

router.get("/jobs/upcoming", employeeAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { employeeId } = getEmployee(req);
    const today = todayDateStr();
    const inSevenDays = new Date();
    inSevenDays.setDate(inSevenDays.getDate() + 7);
    const sevenDaysStr = inSevenDays.toISOString().slice(0, 10);

    const assignments = await db
      .select()
      .from(jobAssignments)
      .where(
        and(
          eq(jobAssignments.employeeId, employeeId),
          gte(jobAssignments.assignedDate, today),
          lte(jobAssignments.assignedDate, sevenDaysStr)
        )
      )
      .orderBy(asc(jobAssignments.assignedDate));

    const results = await Promise.all(
      assignments.map(async (a) => {
        const [job] = await db.select().from(jobs).where(eq(jobs.id, a.jobId)).limit(1);
        if (!job) return null;
        let customer = null;
        if (job.customerId) {
          [customer] = await db.select().from(customers).where(eq(customers.id, job.customerId)).limit(1);
        }
        return formatJobForEmployee(job, customer, a);
      })
    );

    // Group by date
    const grouped: Record<string, any[]> = {};
    for (const item of results.filter(Boolean)) {
      if (!item) continue;
      const date = item.assignedDate as string;
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(item);
    }

    return res.json(
      Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, jobs]) => ({ date, jobs }))
    );
  } catch (err: any) {
    console.error("[employee/jobs/upcoming]", err);
    return res.status(500).json({ message: "Failed to load upcoming jobs" });
  }
});

// ─── Jobs: Detail ─────────────────────────────────────────────────────────────

router.get("/jobs/:assignmentId", employeeAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { employeeId } = getEmployee(req);
    const { assignmentId } = req.params;

    const [assignment] = await db
      .select()
      .from(jobAssignments)
      .where(and(eq(jobAssignments.id, assignmentId), eq(jobAssignments.employeeId, employeeId)))
      .limit(1);

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    const [job] = await db.select().from(jobs).where(eq(jobs.id, assignment.jobId)).limit(1);
    if (!job) return res.status(404).json({ message: "Job not found" });

    let customer = null;
    if (job.customerId) {
      [customer] = await db.select().from(customers).where(eq(customers.id, job.customerId)).limit(1);
    }

    return res.json(formatJobForEmployee(job, customer, assignment));
  } catch (err: any) {
    console.error("[employee/jobs/:id]", err);
    return res.status(500).json({ message: "Failed to load job" });
  }
});

// ─── Jobs: En Route ─────────────────────────────────────────────────────────

router.patch("/jobs/:assignmentId/status", employeeAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { employeeId, businessId } = getEmployee(req);
    const { assignmentId } = req.params;
    const { status } = req.body as { status?: string };

    if (status !== "en_route") {
      return res.status(400).json({ message: "Only 'en_route' status transition is allowed via this endpoint" });
    }

    const [assignment] = await db
      .select()
      .from(jobAssignments)
      .where(and(eq(jobAssignments.id, assignmentId), eq(jobAssignments.employeeId, employeeId)))
      .limit(1);

    if (!assignment) return res.status(404).json({ message: "Assignment not found" });
    if (assignment.status !== "assigned") {
      return res.status(409).json({ message: "Can only set en_route from assigned status" });
    }

    const [updated] = await db
      .update(jobAssignments)
      .set({ status: "en_route", updatedAt: new Date() })
      .where(eq(jobAssignments.id, assignmentId))
      .returning();

    // Notify admin
    notifyAdmin(businessId, {
      type: "employee_en_route",
      employeeId,
      assignmentId,
      jobId: assignment.jobId,
    }).catch(() => {});

    return res.json(updated);
  } catch (err: any) {
    console.error("[employee/jobs/:id/status]", err);
    return res.status(500).json({ message: "Failed to update status" });
  }
});

// ─── Jobs: Check In ──────────────────────────────────────────────────────────

router.post("/jobs/:assignmentId/checkin", employeeAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { employeeId, businessId, name } = getEmployee(req);
    const { assignmentId } = req.params;
    const { lat, lng, photoUrl, proximityWarning, distanceFt } = req.body as {
      lat?: number;
      lng?: number;
      photoUrl?: string;
      proximityWarning?: boolean;
      distanceFt?: number;
    };

    if (proximityWarning) {
      console.warn(
        `[PROXIMITY WARNING] Employee ${name} (${employeeId}) checked in ${distanceFt ?? "?"}ft from job site (assignment ${assignmentId})`
      );
    }

    const [assignment] = await db
      .select()
      .from(jobAssignments)
      .where(and(eq(jobAssignments.id, assignmentId), eq(jobAssignments.employeeId, employeeId)))
      .limit(1);

    if (!assignment) return res.status(404).json({ message: "Assignment not found" });

    if (assignment.status === "checked_in" || assignment.status === "completed") {
      return res.status(409).json({ message: "Already checked in or completed" });
    }

    const now = new Date();
    const [updated] = await db
      .update(jobAssignments)
      .set({
        status: "checked_in",
        checkinTime: now,
        checkinLat: lat ?? null,
        checkinLng: lng ?? null,
        checkinPhotoUrl: photoUrl ?? null,
        updatedAt: now,
      })
      .where(eq(jobAssignments.id, assignmentId))
      .returning();

    // Get job details for notification
    const [job] = await db.select().from(jobs).where(eq(jobs.id, assignment.jobId)).limit(1);
    let customer = null;
    if (job?.customerId) {
      [customer] = await db.select().from(customers).where(eq(customers.id, job.customerId)).limit(1);
    }

    const customerName = customer
      ? `${customer.firstName} ${customer.lastName}`.trim()
      : "Customer";

    notifyAdmin(businessId, {
      type: "employee_checkin",
      employeeId,
      employeeName: name,
      assignmentId,
      jobId: assignment.jobId,
      customerName,
      address: job?.address ?? "",
    }).catch(() => {});

    sendCheckinEmail({
      businessId,
      employeeName: name,
      customerName,
      address: job?.address ?? "",
      time: now,
    }).catch(() => {});

    return res.json(updated);
  } catch (err: any) {
    console.error("[employee/jobs/:id/checkin]", err);
    return res.status(500).json({ message: "Check-in failed" });
  }
});

// ─── Jobs: Check Out ─────────────────────────────────────────────────────────

router.post("/jobs/:assignmentId/checkout", employeeAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { employeeId, businessId, name } = getEmployee(req);
    const { assignmentId } = req.params;
    const { lat, lng, photoUrl, employeeNotes } = req.body as {
      lat?: number;
      lng?: number;
      photoUrl?: string;
      employeeNotes?: string;
    };

    const [assignment] = await db
      .select()
      .from(jobAssignments)
      .where(and(eq(jobAssignments.id, assignmentId), eq(jobAssignments.employeeId, employeeId)))
      .limit(1);

    if (!assignment) return res.status(404).json({ message: "Assignment not found" });

    if (assignment.status !== "checked_in") {
      return res.status(400).json({ message: "Must be checked in before checking out" });
    }

    const now = new Date();
    const durationMinutes = assignment.checkinTime
      ? Math.round((now.getTime() - new Date(assignment.checkinTime).getTime()) / 60000)
      : null;

    const [updated] = await db
      .update(jobAssignments)
      .set({
        status: "completed",
        checkoutTime: now,
        checkoutLat: lat ?? null,
        checkoutLng: lng ?? null,
        checkoutPhotoUrl: photoUrl ?? null,
        employeeNotes: employeeNotes ?? null,
        durationMinutes,
        updatedAt: now,
      })
      .where(eq(jobAssignments.id, assignmentId))
      .returning();

    const [job] = await db.select().from(jobs).where(eq(jobs.id, assignment.jobId)).limit(1);
    let customer = null;
    if (job?.customerId) {
      [customer] = await db.select().from(customers).where(eq(customers.id, job.customerId)).limit(1);
    }

    const customerName = customer
      ? `${customer.firstName} ${customer.lastName}`.trim()
      : "Customer";

    notifyAdmin(businessId, {
      type: "employee_checkout",
      employeeId,
      employeeName: name,
      assignmentId,
      jobId: assignment.jobId,
      customerName,
      address: job?.address ?? "",
      durationMinutes,
    }).catch(() => {});

    sendCheckoutEmail({
      businessId,
      employeeName: name,
      customerName,
      address: job?.address ?? "",
      durationMinutes,
      time: now,
    }).catch(() => {});

    return res.json(updated);
  } catch (err: any) {
    console.error("[employee/jobs/:id/checkout]", err);
    return res.status(500).json({ message: "Check-out failed" });
  }
});

// ─── Backfill: sync jobs.teamMembers → jobAssignments ────────────────────────
// Runs once on startup to create jobAssignments rows for jobs that were
// assigned via the teamMembers JSON array before this explicit sync existed.

// Resolves a team member reference (UUID or legacy name) to an employee record ID
async function resolveEmpId(ref: string, businessId: string): Promise<string | null> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ref);
  if (isUuid) {
    const [e] = await db.select({ id: employees.id }).from(employees)
      .where(and(eq(employees.id, ref), eq(employees.businessId, businessId))).limit(1);
    return e?.id ?? null;
  }
  // Legacy path: team_members stored the employee's display name, not ID
  const [e] = await db.select({ id: employees.id }).from(employees)
    .where(and(eq(employees.name, ref), eq(employees.businessId, businessId))).limit(1);
  return e?.id ?? null;
}

async function backfillJobAssignmentsFromTeamMembers() {
  try {
    const jobsWithMembers = await db
      .select({
        id: jobs.id,
        businessId: jobs.businessId,
        teamMembers: jobs.teamMembers,
        startDatetime: jobs.startDatetime,
      })
      .from(jobs)
      .where(sql`jsonb_array_length(COALESCE(team_members, '[]'::jsonb)) > 0`);

    let created = 0;
    for (const job of jobsWithMembers) {
      const memberRefs = (job.teamMembers as string[] | null) ?? [];
      if (!memberRefs.length || !job.startDatetime || !job.businessId) continue;

      const assignedDate = new Date(job.startDatetime).toISOString().slice(0, 10);

      const existingRows = await db
        .select({ employeeId: jobAssignments.employeeId })
        .from(jobAssignments)
        .where(eq(jobAssignments.jobId, job.id));

      const existingSet = new Set(existingRows.map((r) => r.employeeId));

      for (const ref of memberRefs) {
        const empId = await resolveEmpId(ref, job.businessId);
        if (!empId || existingSet.has(empId)) continue;
        try {
          await db.insert(jobAssignments).values({
            jobId: job.id,
            employeeId: empId,
            businessId: job.businessId,
            assignedDate,
            status: "assigned",
          });
          created++;
          existingSet.add(empId); // avoid duplicates within same job
        } catch {
          // skip constraint errors (e.g. employee deleted)
        }
      }
    }

    if (created > 0) {
      console.log(`[backfill] Created ${created} missing jobAssignment row(s) from teamMembers`);
    }
  } catch (err) {
    console.error("[backfill] jobAssignments sync error:", err);
  }
}

// Run non-blocking on startup
backfillJobAssignmentsFromTeamMembers().catch(() => {});

// ─── SSE notification helper ─────────────────────────────────────────────────

export const sseClients = new Map<string, Set<Response>>();

export function notifyAdmin(businessId: string, event: Record<string, any>): Promise<void> {
  try {
    const clients = sseClients.get(businessId);
    if (!clients || clients.size === 0) return Promise.resolve();
    const data = JSON.stringify({ ...event, timestamp: new Date().toISOString() });
    for (const client of clients) {
      try {
        client.write(`data: ${data}\n\n`);
      } catch {
        clients.delete(client);
      }
    }
  } catch {
    // ignore SSE errors
  }
  return Promise.resolve();
}

export default router;
