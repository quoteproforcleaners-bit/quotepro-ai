import { z } from "zod";

// ─── Typed Error ──────────────────────────────────────────────────────────────

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly recordId?: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

// ─── Quote Options ────────────────────────────────────────────────────────────
// The options JSONB column stores one entry per option key.
// Keys are arbitrary strings (historically good/better/best, but any name is valid).
// Each tier has at minimum: price, name, scope, and the list of add-ons included.

export const QuoteTierSchema = z.object({
  price: z.number().nonnegative(),
  name: z.string(),
  scope: z.string(),
  addOnsIncluded: z.array(z.string()).default([]),
  firstCleanPrice: z.number().nonnegative().nullable().optional(),
  serviceTypeId: z.string().optional(),
  totalHours: z.number().nonnegative().optional(),
});

// Accepts any option key names — not just good/better/best
export const QuoteOptionsSchema = z.record(z.string(), QuoteTierSchema);

export type QuoteOptions = z.infer<typeof QuoteOptionsSchema>;
export type QuoteTier = z.infer<typeof QuoteTierSchema>;

// ─── Quote Add-Ons ────────────────────────────────────────────────────────────
// The add_ons JSONB column maps add-on keys to their selection state and price.

export const QuoteAddOnItemSchema = z.object({
  selected: z.boolean(),
  price: z.number().nonnegative(),
});

export const QuoteAddOnsSchema = z.record(z.string(), QuoteAddOnItemSchema);

export type QuoteAddOns = z.infer<typeof QuoteAddOnsSchema>;

// ─── Pricing Settings ─────────────────────────────────────────────────────────
// Mirrors the PricingSettings interface from the frontend pricing engine.

export const ServiceTypeSchema = z.object({
  id: z.string(),
  name: z.string(),
  multiplier: z.number().nonnegative(),
  scope: z.string(),
});

export const FrequencyDiscountsSchema = z.object({
  weekly: z.number().min(0).max(1),
  biweekly: z.number().min(0).max(1),
  monthly: z.number().min(0).max(1),
});

export const PricingSettingsSchema = z.object({
  pricePerSqft: z.number().nonnegative(),
  pricePerBedroom: z.number().nonnegative(),
  pricePerBathroom: z.number().nonnegative(),
  hourlyRate: z.number().nonnegative(),
  minimumTicket: z.number().nonnegative(),
  serviceTypes: z.array(ServiceTypeSchema),
  goodOptionId: z.string(),
  betterOptionId: z.string(),
  bestOptionId: z.string(),
  addOnPrices: z.record(z.string(), z.number().nonnegative()),
  frequencyDiscounts: FrequencyDiscountsSchema,
  taxRate: z.number().min(0).max(1).optional(),
});

export type PricingSettingsShape = z.infer<typeof PricingSettingsSchema>;

// ─── Validation helpers ───────────────────────────────────────────────────────

/**
 * Parse a JSONB blob with a Zod schema. On failure, logs the error with the
 * record ID and throws an AppError so it surfaces clearly instead of
 * propagating corrupt data silently.
 */
export function parseJsonbField<T>(
  schema: z.ZodType<T>,
  value: unknown,
  fieldName: string,
  recordId: string
): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    const detail = result.error.errors
      .slice(0, 3)
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join("; ");
    console.error(
      `[schema] Invalid ${fieldName} on record ${recordId}: ${detail}`
    );
    throw new AppError(
      `Data integrity error: malformed ${fieldName} on record ${recordId}`,
      "INVALID_JSONB",
      recordId
    );
  }
  return result.data;
}
