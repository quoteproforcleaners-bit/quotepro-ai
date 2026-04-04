import { Router, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db";
import { employees, jobs, jobAssignments, customers, businesses } from "../../shared/schema";
import { eq, and, asc, desc, sql } from "drizzle-orm";
import { requireAuth } from "../middleware";
import { sseClients } from "./employeeRouter";

const router = Router();

const AVATAR_COLORS = [
  "#0F6E56", "#3b82f6", "#8b5cf6", "#ec4899",
  "#ef4444", "#f97316", "#eab308", "#14b8a6",
];

async function getBusinessId(userId: string): Promise<string | null> {
  const [biz] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.ownerUserId, userId))
    .limit(1);
  return biz?.id ?? null;
}

// ─── List employees ────────────────────────────────────────────────────────────

router.get("/api/admin/employees", requireAuth, async (req: Request, res: Response) => {
  try {
    const businessId = await getBusinessId(req.session.userId!);
    if (!businessId) return res.status(404).json({ message: "Business not found" });

    const emps = await db
      .select()
      .from(employees)
      .where(eq(employees.businessId, businessId))
      .orderBy(asc(employees.name));

    const today = new Date().toISOString().slice(0, 10);

    const result = await Promise.all(
      emps.map(async (e) => {
        const todayAssignments = await db
          .select()
          .from(jobAssignments)
          .where(
            and(eq(jobAssignments.employeeId, e.id), eq(jobAssignments.assignedDate, today))
          );
        return {
          ...e,
          pin: undefined, // never expose PIN
          todayJobCount: todayAssignments.length,
          todayStatuses: todayAssignments.map((a) => a.status),
        };
      })
    );

    return res.json(result);
  } catch (err) {
    console.error("[admin/employees GET]", err);
    return res.status(500).json({ message: "Failed to load employees" });
  }
});

// ─── Create employee ──────────────────────────────────────────────────────────

router.post("/api/admin/employees", requireAuth, async (req: Request, res: Response) => {
  try {
    const businessId = await getBusinessId(req.session.userId!);
    if (!businessId) return res.status(404).json({ message: "Business not found" });

    const { name, email, phone, pin, role } = req.body as {
      name?: string;
      email?: string;
      phone?: string;
      pin?: string;
      role?: string;
    };

    if (!name || !email || !pin) {
      return res.status(400).json({ message: "Name, email, and PIN are required" });
    }

    if (!/^\d{4,6}$/.test(pin)) {
      return res.status(400).json({ message: "PIN must be 4–6 digits" });
    }

    // Pick avatar color based on existing count
    const existing = await db.select().from(employees).where(eq(employees.businessId, businessId));
    const color = AVATAR_COLORS[existing.length % AVATAR_COLORS.length];

    const hashedPin = await bcrypt.hash(pin, 12);

    const [created] = await db
      .insert(employees)
      .values({
        businessId,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone?.trim() ?? "",
        role: role?.trim() ?? "Cleaner",
        pin: hashedPin,
        isActive: true,
        color,
        status: "active",
      })
      .returning();

    return res.json({ ...created, pin: undefined });
  } catch (err: any) {
    console.error("[admin/employees POST]", err);
    if (err?.code === "23505") {
      return res.status(409).json({ message: "An employee with that email already exists" });
    }
    return res.status(500).json({ message: "Failed to create employee" });
  }
});

// ─── Update employee ──────────────────────────────────────────────────────────

router.patch("/api/admin/employees/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const businessId = await getBusinessId(req.session.userId!);
    if (!businessId) return res.status(404).json({ message: "Business not found" });

    const { id } = req.params;
    const { name, phone, role, isActive, pin } = req.body as {
      name?: string;
      phone?: string;
      role?: string;
      isActive?: boolean;
      pin?: string;
    };

    const updates: Partial<typeof employees.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (name !== undefined) updates.name = name.trim();
    if (phone !== undefined) updates.phone = phone.trim();
    if (role !== undefined) updates.role = role.trim();
    if (isActive !== undefined) {
      updates.isActive = isActive;
      updates.status = isActive ? "active" : "inactive";
    }
    if (pin) {
      if (!/^\d{4,6}$/.test(pin)) {
        return res.status(400).json({ message: "PIN must be 4–6 digits" });
      }
      updates.pin = await bcrypt.hash(pin, 12);
    }

    const [updated] = await db
      .update(employees)
      .set(updates)
      .where(and(eq(employees.id, id), eq(employees.businessId, businessId)))
      .returning();

    if (!updated) return res.status(404).json({ message: "Employee not found" });

    return res.json({ ...updated, pin: undefined });
  } catch (err) {
    console.error("[admin/employees PATCH]", err);
    return res.status(500).json({ message: "Failed to update employee" });
  }
});

// ─── Deactivate employee ──────────────────────────────────────────────────────

router.delete("/api/admin/employees/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const businessId = await getBusinessId(req.session.userId!);
    if (!businessId) return res.status(404).json({ message: "Business not found" });

    await db
      .update(employees)
      .set({ isActive: false, status: "inactive", updatedAt: new Date() })
      .where(and(eq(employees.id, req.params.id), eq(employees.businessId, businessId)));

    return res.json({ success: true });
  } catch (err) {
    console.error("[admin/employees DELETE]", err);
    return res.status(500).json({ message: "Failed to deactivate employee" });
  }
});

// ─── Assign job ───────────────────────────────────────────────────────────────

router.post("/api/admin/jobs/:jobId/assign", requireAuth, async (req: Request, res: Response) => {
  try {
    const businessId = await getBusinessId(req.session.userId!);
    if (!businessId) return res.status(404).json({ message: "Business not found" });

    const { jobId } = req.params;
    const { employeeId, assignedDate } = req.body as {
      employeeId?: string;
      assignedDate?: string;
    };

    if (!employeeId || !assignedDate) {
      return res.status(400).json({ message: "employeeId and assignedDate required" });
    }

    // Verify job belongs to this business
    const [job] = await db.select().from(jobs).where(and(eq(jobs.id, jobId), eq(jobs.businessId, businessId))).limit(1);
    if (!job) return res.status(404).json({ message: "Job not found" });

    // Verify employee belongs to this business
    const [emp] = await db.select().from(employees).where(and(eq(employees.id, employeeId), eq(employees.businessId, businessId))).limit(1);
    if (!emp) return res.status(404).json({ message: "Employee not found" });

    // Upsert — if already assigned, return existing
    const [existing] = await db
      .select()
      .from(jobAssignments)
      .where(and(eq(jobAssignments.jobId, jobId), eq(jobAssignments.employeeId, employeeId)))
      .limit(1);

    if (existing) {
      return res.json(existing);
    }

    const [assignment] = await db
      .insert(jobAssignments)
      .values({
        jobId,
        employeeId,
        businessId,
        assignedDate,
        status: "assigned",
      })
      .returning();

    return res.json(assignment);
  } catch (err) {
    console.error("[admin/jobs/:id/assign]", err);
    return res.status(500).json({ message: "Failed to assign job" });
  }
});

// ─── Unassign job ─────────────────────────────────────────────────────────────

router.delete("/api/admin/jobs/:jobId/assignments/:assignmentId", requireAuth, async (req: Request, res: Response) => {
  try {
    const businessId = await getBusinessId(req.session.userId!);
    if (!businessId) return res.status(404).json({ message: "Business not found" });

    await db
      .delete(jobAssignments)
      .where(and(eq(jobAssignments.id, req.params.assignmentId), eq(jobAssignments.businessId, businessId)));

    return res.json({ success: true });
  } catch (err) {
    console.error("[admin/jobs/:id/assignments DELETE]", err);
    return res.status(500).json({ message: "Failed to remove assignment" });
  }
});

// ─── Get assignments for a job ────────────────────────────────────────────────

router.get("/api/admin/jobs/:jobId/assignments", requireAuth, async (req: Request, res: Response) => {
  try {
    const businessId = await getBusinessId(req.session.userId!);
    if (!businessId) return res.status(404).json({ message: "Business not found" });

    const assignments = await db
      .select()
      .from(jobAssignments)
      .where(and(eq(jobAssignments.jobId, req.params.jobId), eq(jobAssignments.businessId, businessId)))
      .orderBy(asc(jobAssignments.createdAt));

    const result = await Promise.all(
      assignments.map(async (a) => {
        const [emp] = await db.select().from(employees).where(eq(employees.id, a.employeeId)).limit(1);
        return { ...a, employee: emp ? { id: emp.id, name: emp.name, color: emp.color, role: emp.role } : null };
      })
    );

    return res.json(result);
  } catch (err) {
    console.error("[admin/jobs/:id/assignments GET]", err);
    return res.status(500).json({ message: "Failed to load assignments" });
  }
});

// ─── Field status dashboard ───────────────────────────────────────────────────

router.get("/api/admin/dashboard/field-status", requireAuth, async (req: Request, res: Response) => {
  try {
    const businessId = await getBusinessId(req.session.userId!);
    if (!businessId) return res.status(404).json({ message: "Business not found" });

    const today = new Date().toISOString().slice(0, 10);

    const emps = await db
      .select()
      .from(employees)
      .where(and(eq(employees.businessId, businessId), eq(employees.isActive, true)))
      .orderBy(asc(employees.name));

    const result = await Promise.all(
      emps.map(async (emp) => {
        const assignments = await db
          .select()
          .from(jobAssignments)
          .where(and(eq(jobAssignments.employeeId, emp.id), eq(jobAssignments.assignedDate, today)))
          .orderBy(asc(jobAssignments.createdAt));

        const enriched = await Promise.all(
          assignments.map(async (a) => {
            const [job] = await db.select().from(jobs).where(eq(jobs.id, a.jobId)).limit(1);
            let customer = null;
            if (job?.customerId) {
              [customer] = await db.select().from(customers).where(eq(customers.id, job.customerId)).limit(1);
            }
            return {
              ...a,
              job: job
                ? {
                    id: job.id,
                    address: job.address,
                    startDatetime: job.startDatetime,
                    estimatedDurationMinutes: job.estimatedDurationMinutes,
                  }
                : null,
              customerName: customer
                ? `${customer.firstName} ${customer.lastName}`.trim()
                : "Customer",
            };
          })
        );

        return {
          employee: { id: emp.id, name: emp.name, color: emp.color, role: emp.role, phone: emp.phone },
          assignments: enriched,
        };
      })
    );

    return res.json({ employees: result, date: today });
  } catch (err) {
    console.error("[admin/dashboard/field-status]", err);
    return res.status(500).json({ message: "Failed to load field status" });
  }
});

// ─── SSE Stream ──────────────────────────────────────────────────────────────

router.get("/api/admin/events/stream", requireAuth, async (req: Request, res: Response) => {
  try {
    const businessId = await getBusinessId(req.session.userId!);
    if (!businessId) return res.status(404).json({ message: "Business not found" });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    // Send initial ping
    res.write(`data: ${JSON.stringify({ type: "connected", timestamp: new Date().toISOString() })}\n\n`);

    // Register client
    if (!sseClients.has(businessId)) sseClients.set(businessId, new Set());
    sseClients.get(businessId)!.add(res);

    // Heartbeat every 25s to keep alive through proxies
    const heartbeat = setInterval(() => {
      try {
        res.write(": heartbeat\n\n");
      } catch {
        clearInterval(heartbeat);
      }
    }, 25000);

    req.on("close", () => {
      clearInterval(heartbeat);
      sseClients.get(businessId)?.delete(res);
    });
  } catch (err) {
    console.error("[admin/events/stream]", err);
    return res.status(500).json({ message: "Stream failed" });
  }
});

export default router;
