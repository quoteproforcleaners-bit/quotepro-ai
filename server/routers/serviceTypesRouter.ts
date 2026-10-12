import { Router, type Request, type Response } from "express";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { serviceTypes } from "@shared/schema";
import { requireAuth } from "../middleware";
import { getBusinessByOwner } from "../storage";
import {
  listServiceTypes,
  resetServiceTypes,
  ensureServiceTypesForBusiness,
} from "../services/serviceTypesService";

const router = Router();

/** GET /api/service-types — full list incl. inactive (for Settings UI + builder). */
router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const business = await getBusinessByOwner(req.session.userId!);
    if (!business) return res.status(404).json({ error: "business_not_found" });
    const rows = await listServiceTypes(business.id);
    res.json({ serviceTypes: rows });
  } catch (e: any) {
    console.error("[service-types] list error:", e?.message);
    res.status(500).json({ error: "list_failed" });
  }
});

/** PATCH /api/service-types/:id — update display_name, is_active, pricing_config, sort_order. */
router.patch("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const business = await getBusinessByOwner(req.session.userId!);
    if (!business) return res.status(404).json({ error: "business_not_found" });
    await ensureServiceTypesForBusiness(business.id);

    const { id } = req.params;
    const body = req.body || {};
    const patch: Record<string, any> = { updatedAt: new Date() };

    if (typeof body.displayName === "string" && body.displayName.trim()) {
      patch.displayName = body.displayName.trim().slice(0, 80);
    }
    if (typeof body.isActive === "boolean") {
      patch.isActive = body.isActive;
    }
    if (typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)) {
      patch.sortOrder = Math.max(0, Math.floor(body.sortOrder));
    }
    if (body.pricingConfig && typeof body.pricingConfig === "object") {
      patch.pricingConfig = body.pricingConfig;
    }
    // pricing_model is NOT user-editable (residential is always tiered, others always flat)

    // Pre-check: residential_recurring is locked active. Block atomically before
    // the UPDATE so there's no transient deactivated state visible to readers.
    if (patch.isActive === false) {
      const [existing] = await db
        .select({ typeKey: serviceTypes.typeKey })
        .from(serviceTypes)
        .where(and(eq(serviceTypes.id, id), eq(serviceTypes.businessId, business.id)))
        .limit(1);
      if (!existing) return res.status(404).json({ error: "service_type_not_found" });
      if (existing.typeKey === "residential_recurring") {
        // Strip the deactivation but apply any other field updates, returning a warning
        delete patch.isActive;
      }
    }

    const [updated] = await db
      .update(serviceTypes)
      .set(patch)
      .where(and(eq(serviceTypes.id, id), eq(serviceTypes.businessId, business.id)))
      .returning();

    if (!updated) return res.status(404).json({ error: "service_type_not_found" });

    const blockedDeactivation =
      body.isActive === false && updated.typeKey === "residential_recurring";
    res.json({
      serviceType: updated,
      ...(blockedDeactivation ? { warning: "residential_always_active" } : {}),
    });
  } catch (e: any) {
    console.error("[service-types] patch error:", e?.message);
    res.status(500).json({ error: "patch_failed" });
  }
});

/** POST /api/service-types/reset — wipe + re-seed defaults. */
router.post("/reset", requireAuth, async (req: Request, res: Response) => {
  try {
    const business = await getBusinessByOwner(req.session.userId!);
    if (!business) return res.status(404).json({ error: "business_not_found" });
    await resetServiceTypes(business.id);
    const rows = await listServiceTypes(business.id);
    res.json({ serviceTypes: rows, reset: true });
  } catch (e: any) {
    console.error("[service-types] reset error:", e?.message);
    res.status(500).json({ error: "reset_failed" });
  }
});

export default router;
