// Single source of truth for all Lead Link price calculations.
// Every number the customer sees comes from this file.

export interface ServiceType {
  id: string;
  name: string;
  multiplier: number;
  scope?: string;
  isDefault?: boolean;
}

export interface FrequencyDiscounts {
  weekly: number;
  biweekly: number;
  monthly: number;
}

export type AddOnKey =
  | "insideFridge" | "insideOven" | "insideCabinets" | "interiorWindows"
  | "blindsDetail" | "baseboardsDetail" | "laundryFoldOnly" | "dishes"
  | "organizationTidy" | "biannualDeepClean" | "insideWindows" | "laundry"
  | "organizing" | "garage" | "baseboards" | "blinds" | "carpetCleaning" | "wallWashing";

export type AddOnPrices = Record<AddOnKey, number>;

export interface LeadLinkPricingConfig {
  hourlyRate: number;
  minimumTicket: number;
  taxRate: number;
  serviceTypes: ServiceType[];
  goodOptionId: string | null;
  betterOptionId: string | null;
  bestOptionId: string | null;
  frequencyDiscounts: FrequencyDiscounts;
  addOnPrices: Partial<AddOnPrices>;
}

export type CleaningType = "standard" | "deep" | "moveinout" | "recurring";
export type Frequency = "onetime" | "weekly" | "biweekly" | "monthly";
export type ConditionLevel = "excellent" | "good" | "average" | "dirty";

export interface QuoteInputs {
  bedrooms: number;
  bathrooms: number;
  sqft?: number | null;
  cleaningType: CleaningType;
  frequency: Frequency;
  conditionLevel: ConditionLevel;
  petCount: number;
  addOns: AddOnKey[];
  usingDefaultPricing: boolean;
}

export interface PriceBreakdown {
  baseLabor: number;
  conditionAdjustment: number;
  petFee: number;
  addOnsTotal: number;
  frequencyDiscount: number;
  subtotal: number;
  tax: number;
  total: number;
}

export interface PriceEstimate {
  lowEstimate: number;
  highEstimate: number;
  midEstimate: number;
  serviceTypeName: string;
  frequencyLabel: string;
  frequencyDiscountPercent: number;
  addOnsSubtotal: number;
  breakdown: PriceBreakdown;
  confidence: "high" | "medium" | "low";
  largeSqftNote?: string;
  largeBedNote?: string;
}

const roundTo5 = (n: number) => Math.round(n / 5) * 5;

// Bedroom hours lookup
const BEDROOM_HOURS: Record<number, number> = {
  0: 0.75, 1: 1.0, 2: 1.5, 3: 2.0, 4: 2.5, 5: 3.0, 6: 3.5,
};

// Bathroom hours lookup
const BATHROOM_HOURS: Record<string, number> = {
  1: 0.5, 1.5: 0.65, 2: 0.75, 2.5: 0.9, 3: 1.0, 3.5: 1.15, 4: 1.25,
};

const CONDITION_MULTIPLIERS: Record<ConditionLevel, number> = {
  excellent: 0.90,
  good: 1.00,
  average: 1.15,
  dirty: 1.35,
};

const FREQUENCY_LABELS: Record<Frequency, string> = {
  onetime: "One-time clean",
  weekly: "Weekly recurring",
  biweekly: "Every 2 weeks",
  monthly: "Monthly recurring",
};

export function calculateLeadLinkEstimate(
  inputs: QuoteInputs,
  config: LeadLinkPricingConfig,
): PriceEstimate {
  let largeSqftNote: string | undefined;
  let largeBedNote: string | undefined;

  // STEP 1: Determine service type
  const serviceTypeMap: Record<CleaningType, string | null> = {
    standard: config.goodOptionId,
    deep: config.betterOptionId,
    moveinout: config.bestOptionId ?? config.betterOptionId ?? config.goodOptionId,
    recurring: config.goodOptionId,
  };

  const targetId = serviceTypeMap[inputs.cleaningType];
  const serviceType =
    (targetId ? config.serviceTypes.find((st) => st.id === targetId) : null) ??
    config.serviceTypes[0] ??
    null;
  const multiplier = serviceType?.multiplier ?? 1.0;

  // STEP 2: Base labor hours
  let estimatedHours: number;
  const cappedSqft = inputs.sqft && inputs.sqft > 5000 ? 5000 : (inputs.sqft ?? null);
  if (cappedSqft && cappedSqft > 0) {
    estimatedHours = cappedSqft / 400;
    if (inputs.sqft && inputs.sqft > 5000) {
      largeSqftNote = `For very large properties, exact pricing will be confirmed by the business.`;
    }
  } else {
    const bedCapped = Math.min(inputs.bedrooms, 6);
    if (inputs.bedrooms > 5) {
      largeBedNote = `For larger homes, exact pricing will be confirmed.`;
    }
    const bedHours = BEDROOM_HOURS[bedCapped] ?? 2.0;
    const bathKey = Math.min(inputs.bathrooms, 4);
    const bathHours = BATHROOM_HOURS[bathKey] ?? 0.75;
    estimatedHours = bedHours + bathHours;
  }

  // STEP 3: Apply service type multiplier
  estimatedHours = estimatedHours * multiplier;

  // STEP 4: Base labor cost — guard against zero hourly rate
  const hourlyRate = config.hourlyRate > 0 ? config.hourlyRate : 40;
  const baseLabor = estimatedHours * hourlyRate;

  // STEP 5: Condition adjustment
  const condMult = CONDITION_MULTIPLIERS[inputs.conditionLevel] ?? 1.0;
  const conditionAdjustment = baseLabor * condMult - baseLabor;

  // STEP 6: Pet fee — $15/pet, max $45
  const petFee = Math.min(inputs.petCount * 15, 45);

  // STEP 7: Add-ons
  const addOnsTotal = inputs.addOns.reduce((sum, key) => {
    const price = Number((config.addOnPrices as any)[key] ?? 0);
    return sum + (price > 0 ? price : 0);
  }, 0);

  // STEP 8: Subtotal before discount
  const subtotalBeforeDiscount = baseLabor + conditionAdjustment + petFee + addOnsTotal;

  // STEP 9: Frequency discount
  const frequencyDiscountMap: Record<Frequency, number> = {
    onetime: 0,
    weekly: (config.frequencyDiscounts.weekly ?? 0) / 100,
    biweekly: (config.frequencyDiscounts.biweekly ?? 0) / 100,
    monthly: (config.frequencyDiscounts.monthly ?? 0) / 100,
  };
  const discountPercent = frequencyDiscountMap[inputs.frequency] ?? 0;
  const frequencyDiscount = subtotalBeforeDiscount * discountPercent;

  // STEP 10: Subtotal after discount
  const subtotal = subtotalBeforeDiscount - frequencyDiscount;

  // STEP 11: Apply minimum ticket — guard against zero minimum
  const minimumTicket = config.minimumTicket > 0 ? config.minimumTicket : 100;
  const subtotalWithMinimum = Math.max(subtotal, minimumTicket);

  // STEP 12: Tax
  const tax = subtotalWithMinimum * ((config.taxRate ?? 0) / 100);

  // STEP 13: Total
  const total = subtotalWithMinimum + tax;

  // STEP 14: Range width
  let rangeWidth: { low: number; high: number };
  if (inputs.usingDefaultPricing) {
    rangeWidth = { low: 0.70, high: 1.50 };
  } else if (cappedSqft && cappedSqft > 0) {
    rangeWidth = { low: 0.90, high: 1.15 };
  } else if (inputs.conditionLevel === "dirty") {
    rangeWidth = { low: 0.82, high: 1.28 };
  } else {
    rangeWidth = { low: 0.85, high: 1.25 };
  }

  // Range is applied to the total (which already has minimum ticket baked in via Step 11)
  // Never override the range here — minimum ticket enforcement belongs in Step 11 only
  const lowEstimate = roundTo5(total * rangeWidth.low);
  const highEstimate = roundTo5(total * rangeWidth.high);
  const midEstimate = roundTo5((lowEstimate + highEstimate) / 2);

  // STEP 15: Confidence
  let confidence: "high" | "medium" | "low";
  if (inputs.usingDefaultPricing) {
    confidence = "low";
  } else if (cappedSqft && cappedSqft > 0) {
    confidence = "high";
  } else {
    confidence = "medium";
  }

  return {
    lowEstimate,
    highEstimate,
    midEstimate,
    serviceTypeName: serviceType?.name ?? "Standard Clean",
    frequencyLabel: FREQUENCY_LABELS[inputs.frequency],
    frequencyDiscountPercent: discountPercent * 100,
    addOnsSubtotal: addOnsTotal,
    breakdown: {
      baseLabor: roundTo5(baseLabor),
      conditionAdjustment: roundTo5(conditionAdjustment),
      petFee,
      addOnsTotal,
      frequencyDiscount: roundTo5(frequencyDiscount),
      subtotal: roundTo5(subtotalWithMinimum),
      tax: roundTo5(tax),
      total: roundTo5(total),
    },
    confidence,
    largeSqftNote,
    largeBedNote,
  };
}
