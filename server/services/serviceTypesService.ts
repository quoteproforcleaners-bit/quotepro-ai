import { and, eq, asc } from "drizzle-orm";
import { db } from "../db";
import { serviceTypes, type ServiceType, type InsertServiceType } from "@shared/schema";

export type TypeKey =
  | "residential_recurring"
  | "deep_clean"
  | "move_in_out"
  | "post_construction"
  | "airbnb"
  | "commercial";

export type PricingModel = "tiered" | "flat";

export interface TieredPricingConfig {
  multipliers: { good: number; better: number; best: number };
}
export interface FlatPricingConfig {
  basePrice: number;
  perSqft?: number;
  perBedroom?: number;
  perBathroom?: number;
  minimum?: number;
}

interface SeedRow {
  typeKey: TypeKey;
  displayName: string;
  pricingModel: PricingModel;
  pricingConfig: TieredPricingConfig | FlatPricingConfig;
  isActive: boolean;
  sortOrder: number;
}

export const DEFAULT_SEED: SeedRow[] = [
  {
    typeKey: "residential_recurring",
    displayName: "Residential (Recurring)",
    pricingModel: "tiered",
    pricingConfig: { multipliers: { good: 0.75, better: 1.0, best: 1.5 } },
    isActive: true,
    sortOrder: 0,
  },
  {
    typeKey: "deep_clean",
    displayName: "One-Time Deep Clean",
    pricingModel: "flat",
    pricingConfig: { basePrice: 250, perSqft: 0.1, minimum: 200 },
    isActive: false,
    sortOrder: 1,
  },
  {
    typeKey: "move_in_out",
    displayName: "Move In / Move Out",
    pricingModel: "flat",
    pricingConfig: { basePrice: 350, perSqft: 0.15, minimum: 300 },
    isActive: false,
    sortOrder: 2,
  },
  {
    typeKey: "post_construction",
    displayName: "Post-Construction",
    pricingModel: "flat",
    pricingConfig: { basePrice: 500, perSqft: 0.25, minimum: 400 },
    isActive: false,
    sortOrder: 3,
  },
  {
    typeKey: "airbnb",
    displayName: "Airbnb / Vacation Rental Turnover",
    pricingModel: "flat",
    pricingConfig: { basePrice: 120, perSqft: 0.08, minimum: 100 },
    isActive: false,
    sortOrder: 4,
  },
  {
    typeKey: "commercial",
    displayName: "Office / Commercial",
    pricingModel: "flat",
    pricingConfig: { basePrice: 300, perSqft: 0.12, minimum: 250 },
    isActive: false,
    sortOrder: 5,
  },
];

/**
 * Lazy seed: if this business has zero service_types rows, insert the 6 defaults.
 * Idempotent — uses unique (business_id, type_key) constraint with onConflictDoNothing.
 * Returns nothing; callers should re-query.
 */
export async function ensureServiceTypesForBusiness(businessId: string): Promise<void> {
  if (!businessId) return;
  const existing = await db
    .select({ id: serviceTypes.id })
    .from(serviceTypes)
    .where(eq(serviceTypes.businessId, businessId))
    .limit(1);
  if (existing.length > 0) return;

  const rows: InsertServiceType[] = DEFAULT_SEED.map((s) => ({
    businessId,
    typeKey: s.typeKey,
    displayName: s.displayName,
    pricingModel: s.pricingModel,
    pricingConfig: s.pricingConfig as any,
    isActive: s.isActive,
    sortOrder: s.sortOrder,
  }));
  await db.insert(serviceTypes).values(rows).onConflictDoNothing();
}

/**
 * List all service types for a business (ensures seed). Includes inactive rows
 * so the Settings UI can render the full toggleable list.
 */
export async function listServiceTypes(businessId: string): Promise<ServiceType[]> {
  await ensureServiceTypesForBusiness(businessId);
  return db
    .select()
    .from(serviceTypes)
    .where(eq(serviceTypes.businessId, businessId))
    .orderBy(asc(serviceTypes.sortOrder));
}

/**
 * Active-only list (for quote builder pickers and customer-facing flows).
 */
export async function listActiveServiceTypes(businessId: string): Promise<ServiceType[]> {
  await ensureServiceTypesForBusiness(businessId);
  return db
    .select()
    .from(serviceTypes)
    .where(and(eq(serviceTypes.businessId, businessId), eq(serviceTypes.isActive, true)))
    .orderBy(asc(serviceTypes.sortOrder));
}

/**
 * Lookup by id OR by typeKey (string).
 */
export async function getServiceType(
  businessId: string,
  idOrKey: string,
): Promise<ServiceType | null> {
  if (!businessId || !idOrKey) return null;
  await ensureServiceTypesForBusiness(businessId);
  // Try by id first
  const byId = await db
    .select()
    .from(serviceTypes)
    .where(and(eq(serviceTypes.businessId, businessId), eq(serviceTypes.id, idOrKey)))
    .limit(1);
  if (byId[0]) return byId[0];
  // Fallback to type_key
  const byKey = await db
    .select()
    .from(serviceTypes)
    .where(and(eq(serviceTypes.businessId, businessId), eq(serviceTypes.typeKey, idOrKey)))
    .limit(1);
  return byKey[0] || null;
}

/**
 * Reset to defaults: delete all rows for business, re-seed.
 * Used by the "Reset to defaults" button in Settings.
 */
export async function resetServiceTypes(businessId: string): Promise<void> {
  if (!businessId) return;
  await db.delete(serviceTypes).where(eq(serviceTypes.businessId, businessId));
  await ensureServiceTypesForBusiness(businessId);
}

/**
 * Build a customer-facing quote title from a service type.
 * Examples:
 *   residential_recurring → "Cleaning Quote"
 *   deep_clean            → "Deep Cleaning Quote"
 *   move_in_out           → "Move-Out Cleaning Quote"
 *   airbnb                → "Airbnb Turnover Cleaning Quote"
 */
export function buildQuoteTitle(svc: ServiceType | null | undefined): string {
  if (!svc) return "Cleaning Quote";
  switch (svc.typeKey as TypeKey) {
    case "residential_recurring":
      return "Cleaning Quote";
    case "deep_clean":
      return "Deep Cleaning Quote";
    case "move_in_out":
      return "Move-Out Cleaning Quote";
    case "post_construction":
      return "Post-Construction Cleaning Quote";
    case "airbnb":
      return "Airbnb Turnover Cleaning Quote";
    case "commercial":
      return "Office Cleaning Quote";
    default:
      return `${svc.displayName} Quote`;
  }
}
