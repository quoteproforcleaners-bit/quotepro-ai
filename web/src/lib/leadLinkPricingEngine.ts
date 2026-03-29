// Single source of truth for all Lead Link price calculations.
// Every number the customer sees comes from this file.
// Sprint 17 — complete rewrite with industry-validated data.

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
  pricePerSqft?: number;
  pricePerBedroom?: number;
  pricePerBathroom?: number;
  serviceTypes: ServiceType[];
  goodOptionId: string | null;
  betterOptionId: string | null;
  bestOptionId: string | null;
  frequencyDiscounts: FrequencyDiscounts;
  addOnPrices: Partial<AddOnPrices>;
}

export type CleaningType = "standard" | "deep" | "moveinout" | "recurring" | "postconstruct" | "airbnb";
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
  serviceMultiplier: number;
  adjustedHours: number;
  conditionAdjustment: number;
  petFee: number;
  addOnsTotal: number;
  frequencyDiscount: number;
  subtotal: number;
  tax: number;
  total: number;
}

export interface IndustryBenchmark {
  low: number;
  high: number;
}

export interface PriceEstimate {
  lowEstimate: number;
  highEstimate: number;
  midEstimate: number;
  serviceTypeName: string;
  frequencyLabel: string;
  frequencyDiscountPercent: number;
  addOnsSubtotal: number;
  calculatedTotal: number;
  benchmark: IndustryBenchmark | null;
  breakdown: PriceBreakdown;
  confidence: "high" | "medium" | "low";
  usingIndustryFloor: boolean;
  largeSqftNote?: string;
  largeBedNote?: string;
}

// ─── Lookup Tables ────────────────────────────────────────────────────────────

const roundTo5 = (n: number) => Math.round(n / 5) * 5;

// Base hours for a STANDARD CLEAN indexed by `${bedrooms}_${bathrooms}`.
// Multipliers are applied on top for other service types.
const BASE_HOURS_BY_CONFIG: Record<string, number> = {
  "0_1":   1.25,
  "1_1":   1.75,
  "1_1.5": 1.90,
  "2_1":   2.25,
  "2_1.5": 2.50,
  "2_2":   2.75,
  "2_2.5": 3.00,
  "3_1":   2.75,
  "3_1.5": 3.00,
  "3_2":   3.25,
  "3_2.5": 3.50,
  "3_3":   3.75,
  "4_2":   4.00,
  "4_2.5": 4.25,
  "4_3":   4.50,
  "4_3.5": 4.75,
  "4_4":   5.00,
  "5_3":   5.50,
  "5_3.5": 5.75,
  "5_4":   6.25,
  "6_4":   7.50,
};

// Service type multipliers applied on top of standard clean base hours.
// Deep = 1.85x, MoveIn/Out = 2.20x — these MUST produce meaningfully different ranges.
const SERVICE_MULTIPLIERS: Record<CleaningType, number> = {
  standard:      1.00,
  deep:          1.85,
  moveinout:     2.20,
  postconstruct: 2.80,
  airbnb:        0.75,
  recurring:     1.00,
};

const CONDITION_MULTIPLIERS: Record<ConditionLevel, number> = {
  excellent: 0.90,
  good:      1.00,
  average:   1.18,
  dirty:     1.40,
};

// Flat pet fee structure
const PET_FEES: Record<number, number> = { 0: 0, 1: 20, 2: 35, 3: 50 };

// Add-on fallback prices (used when business hasn't configured prices)
const ADD_ON_DEFAULTS: Partial<Record<AddOnKey, number>> = {
  insideFridge:    35,
  insideOven:      35,
  insideCabinets:  50,
  interiorWindows: 45,
  blindsDetail:    30,
  baseboardsDetail: 40,
  laundryFoldOnly: 30,
  dishes:          25,
  organizationTidy: 60,
};

// Industry benchmark ranges by cleaning type and bedroom count (2024–2026 US market)
const INDUSTRY_BENCHMARKS: Record<CleaningType, Record<number, IndustryBenchmark>> = {
  standard: {
    0: { low: 80,  high: 120 },
    1: { low: 120, high: 170 },
    2: { low: 120, high: 220 },
    3: { low: 150, high: 280 },
    4: { low: 200, high: 350 },
    5: { low: 250, high: 450 },
  },
  deep: {
    0: { low: 150, high: 250 },
    1: { low: 200, high: 300 },
    2: { low: 200, high: 400 },
    3: { low: 280, high: 500 },
    4: { low: 350, high: 650 },
    5: { low: 450, high: 800 },
  },
  moveinout: {
    0: { low: 200, high: 300 },
    1: { low: 250, high: 380 },
    2: { low: 280, high: 450 },
    3: { low: 350, high: 600 },
    4: { low: 450, high: 750 },
    5: { low: 550, high: 950 },
  },
  postconstruct: {
    0: { low: 300, high: 500 },
    1: { low: 350, high: 600 },
    2: { low: 400, high: 700 },
    3: { low: 500, high: 900 },
    4: { low: 650, high: 1100 },
    5: { low: 800, high: 1500 },
  },
  airbnb: {
    0: { low: 65,  high: 100 },
    1: { low: 75,  high: 130 },
    2: { low: 100, high: 170 },
    3: { low: 130, high: 210 },
    4: { low: 160, high: 270 },
    5: { low: 200, high: 340 },
  },
  recurring: {
    0: { low: 70,  high: 110 },
    1: { low: 100, high: 150 },
    2: { low: 100, high: 190 },
    3: { low: 130, high: 230 },
    4: { low: 170, high: 290 },
    5: { low: 210, high: 370 },
  },
};

const SERVICE_LABELS: Record<CleaningType, string> = {
  standard:      "Standard Clean",
  deep:          "Deep Clean",
  moveinout:     "Move In / Move Out",
  postconstruct: "Post-Construction",
  airbnb:        "Airbnb Turnover",
  recurring:     "Recurring Clean",
};

const FREQUENCY_LABELS: Record<Frequency, string> = {
  onetime:  "One-time",
  weekly:   "Weekly recurring",
  biweekly: "Every 2 weeks",
  monthly:  "Monthly recurring",
};

// ─── Main Estimate Function ───────────────────────────────────────────────────

export function calculateLeadLinkEstimate(
  inputs: QuoteInputs,
  config: LeadLinkPricingConfig,
): PriceEstimate {
  let largeSqftNote: string | undefined;
  let largeBedNote: string | undefined;

  // ── STEP 1: RESOLVE HOURLY RATE & MINIMUM ────────────────────────────────
  // Never allow 0 or null to propagate — use industry defaults as fallback
  const hourlyRate     = (config?.hourlyRate > 0 ? config.hourlyRate : 50);
  const minimumTicket  = (config?.minimumTicket > 0 ? config.minimumTicket : 110);

  // ── STEP 2: BASE HOURS FROM LOOKUP TABLE ─────────────────────────────────
  const lookupKey = `${inputs.bedrooms}_${inputs.bathrooms}`;
  let tableHours  = BASE_HOURS_BY_CONFIG[lookupKey];

  // Fallback formula if exact bed/bath combo not in table
  if (!tableHours) {
    if (inputs.bedrooms > 5) largeBedNote = `For larger homes, exact pricing will be confirmed.`;
    tableHours = Math.min(10, Math.max(1.25,
      (inputs.bedrooms * 0.75) + (inputs.bathrooms * 0.60) + 0.50
    ));
  }

  // Sanity-check with sqft if provided: use average when they diverge >40%
  let estimatedHours = tableHours;
  const cappedSqft = inputs.sqft && inputs.sqft > 5000 ? 5000 : (inputs.sqft ?? null);
  if (inputs.sqft && inputs.sqft > 5000) {
    largeSqftNote = `For very large properties, exact pricing will be confirmed by the business.`;
  }
  if (cappedSqft && cappedSqft > 200) {
    const sqftHours = cappedSqft / 350; // 1hr per 350 sqft — industry standard
    const variance  = Math.abs(sqftHours - tableHours) / tableHours;
    if (variance > 0.40) {
      estimatedHours = (sqftHours + tableHours) / 2;
    }
  }

  // ── STEP 3: SERVICE TYPE MULTIPLIER ──────────────────────────────────────
  // Use whichever is higher: our baseline or the business owner's config.
  // This is the most common bug — multiplier not applied or set too low.
  const baselineMultiplier = SERVICE_MULTIPLIERS[inputs.cleaningType] ?? 1.0;

  let configMultiplier = 1.0;
  if (config?.serviceTypes?.length > 0) {
    // Map the customer's clean type to the business's configured tier IDs
    const tierIdMap: Record<CleaningType, string | null> = {
      standard:      config.betterOptionId ?? config.goodOptionId,
      deep:          config.bestOptionId   ?? config.betterOptionId,
      moveinout:     config.bestOptionId   ?? config.betterOptionId,
      postconstruct: config.bestOptionId   ?? config.betterOptionId,
      airbnb:        config.goodOptionId,
      recurring:     config.betterOptionId ?? config.goodOptionId,
    };
    const mappedId  = tierIdMap[inputs.cleaningType];
    const matchedSt = mappedId
      ? config.serviceTypes.find((st) => st.id === mappedId)
      : null;
    configMultiplier = matchedSt?.multiplier ?? 1.0;
  }

  // Use whichever is higher — protects against under-configured multipliers
  const finalMultiplier = Math.max(baselineMultiplier, configMultiplier);
  const adjustedHours   = estimatedHours * finalMultiplier;

  // ── STEP 4: BASE LABOR COST ───────────────────────────────────────────────
  const baseLabor = adjustedHours * hourlyRate;

  // ── STEP 5: CONDITION ADJUSTMENT ─────────────────────────────────────────
  const conditionMult   = CONDITION_MULTIPLIERS[inputs.conditionLevel] ?? 1.0;
  const afterCondition  = baseLabor * conditionMult;
  const conditionAdjustment = roundTo5(afterCondition - baseLabor);

  // ── STEP 6: PET FEE ───────────────────────────────────────────────────────
  const petFee = PET_FEES[Math.min(inputs.petCount, 3)] ?? 50;

  // ── STEP 7: ADD-ONS ───────────────────────────────────────────────────────
  const addOnsTotal = (inputs.addOns || []).reduce((sum, addOn) => {
    const configPrice = (config?.addOnPrices as any)?.[addOn];
    const price       = (configPrice > 0) ? configPrice : (ADD_ON_DEFAULTS[addOn] ?? 0);
    return sum + price;
  }, 0);

  // ── STEP 8: SUBTOTAL BEFORE DISCOUNT ─────────────────────────────────────
  const subtotalBeforeDiscount = afterCondition + petFee + addOnsTotal;

  // ── STEP 9: FREQUENCY DISCOUNT ───────────────────────────────────────────
  const freqDiscounts = config?.frequencyDiscounts;
  const FREQUENCY_DISCOUNT_PCT: Record<Frequency, number> = {
    onetime:  0,
    weekly:   freqDiscounts?.weekly   ?? 20,
    biweekly: freqDiscounts?.biweekly ?? 15,
    monthly:  freqDiscounts?.monthly  ?? 10,
  };
  const discountPct       = (FREQUENCY_DISCOUNT_PCT[inputs.frequency] ?? 0) / 100;
  const frequencyDiscount = subtotalBeforeDiscount * discountPct;
  const afterDiscount     = subtotalBeforeDiscount - frequencyDiscount;

  // ── STEP 10: APPLY MINIMUM TICKET ────────────────────────────────────────
  const subtotal = Math.max(afterDiscount, minimumTicket);

  // ── STEP 11: TAX ─────────────────────────────────────────────────────────
  const taxRate = config?.taxRate ?? 0;
  const tax     = subtotal * (taxRate / 100);
  const total   = subtotal + tax;

  // ── STEP 12: INDUSTRY BENCHMARK CROSS-CHECK ──────────────────────────────
  // If our computed total is below the industry floor, use the floor.
  // This catches cases where the business's hourly rate is oddly low.
  const bedroomKey   = Math.min(inputs.bedrooms, 5) as 0|1|2|3|4|5;
  const benchmarkKey = (inputs.cleaningType in INDUSTRY_BENCHMARKS)
    ? inputs.cleaningType
    : "standard";
  const benchmark    = INDUSTRY_BENCHMARKS[benchmarkKey]?.[bedroomKey] ?? null;

  const flooredTotal     = benchmark ? Math.max(total, benchmark.low * 0.85) : total;
  const usingIndustryFloor = flooredTotal > total;

  // ── STEP 13: CALCULATE RANGE ─────────────────────────────────────────────
  let rangeFactor: { low: number; high: number };
  if (inputs.usingDefaultPricing) {
    rangeFactor = { low: 0.75, high: 1.45 };
  } else if (cappedSqft && cappedSqft > 200) {
    rangeFactor = { low: 0.88, high: 1.18 };
  } else if (inputs.conditionLevel === "dirty" || inputs.cleaningType === "postconstruct") {
    rangeFactor = { low: 0.80, high: 1.35 };
  } else {
    rangeFactor = { low: 0.85, high: 1.25 };
  }

  let lowEstimate  = roundTo5(flooredTotal * rangeFactor.low);
  let highEstimate = roundTo5(flooredTotal * rangeFactor.high);

  // Apply benchmark floors and ceilings (80%–120% of market)
  if (benchmark) {
    lowEstimate  = Math.max(lowEstimate,  roundTo5(benchmark.low  * 0.80));
    highEstimate = Math.min(highEstimate, roundTo5(benchmark.high * 1.20));
  }

  // Guarantee minimum $40 spread
  if (highEstimate - lowEstimate < 40) highEstimate = lowEstimate + 40;

  const midEstimate = roundTo5((lowEstimate + highEstimate) / 2);

  // ── STEP 14: CONFIDENCE ──────────────────────────────────────────────────
  let confidence: "high" | "medium" | "low";
  if (inputs.usingDefaultPricing) {
    confidence = "low";
  } else if (cappedSqft && cappedSqft > 200) {
    confidence = "high";
  } else {
    confidence = "medium";
  }

  // ── DEBUG OUTPUT (development only) ──────────────────────────────────────
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
    console.table({
      cleaningType:      inputs.cleaningType,
      bedrooms:          inputs.bedrooms,
      bathrooms:         inputs.bathrooms,
      tableHours,
      finalMultiplier,
      adjustedHours:     Math.round(adjustedHours * 4) / 4,
      hourlyRate,
      baseLabor:         roundTo5(baseLabor),
      afterCondition:    roundTo5(afterCondition),
      petFee,
      addOnsTotal,
      subtotal:          roundTo5(subtotal),
      flooredTotal:      roundTo5(flooredTotal),
      lowEstimate,
      highEstimate,
      benchmarkLow:      benchmark?.low,
      benchmarkHigh:     benchmark?.high,
      usingIndustryFloor,
    });
  }

  return {
    lowEstimate,
    highEstimate,
    midEstimate,
    serviceTypeName:        SERVICE_LABELS[inputs.cleaningType] ?? "Standard Clean",
    frequencyLabel:         FREQUENCY_LABELS[inputs.frequency]  ?? "One-time",
    frequencyDiscountPercent: discountPct * 100,
    addOnsSubtotal:         addOnsTotal,
    calculatedTotal:        roundTo5(flooredTotal),
    benchmark,
    breakdown: {
      baseLabor:           roundTo5(baseLabor),
      serviceMultiplier:   finalMultiplier,
      adjustedHours:       Math.round(adjustedHours * 4) / 4,
      conditionAdjustment,
      petFee,
      addOnsTotal,
      frequencyDiscount:   roundTo5(frequencyDiscount),
      subtotal:            roundTo5(subtotal),
      tax:                 roundTo5(tax),
      total:               roundTo5(flooredTotal),
    },
    confidence,
    usingIndustryFloor,
    largeSqftNote,
    largeBedNote,
  };
}
