/**
 * QuotePro Pricing Rules Engine
 * Deterministic, versioned, explainable pricing engine.
 * Accepts job attributes + ordered rules → returns total + line-item breakdown.
 */

export type RuleType =
  | "base_price"
  | "base_by_service"
  | "sqft_range"
  | "bed_adjustment"
  | "bath_adjustment"
  | "half_bath_adjustment"
  | "condition_multiplier"
  | "frequency_discount"
  | "pet_surcharge"
  | "addon_price"
  | "zip_surcharge"
  | "first_time_multiplier"
  | "minimum_floor";

export interface PricingRuleFormula {
  type: "fixed" | "per_unit" | "multiplier" | "range_lookup" | "percent_discount";
  value?: number;
  ranges?: Array<{ min: number; max: number; price: number }>;
  applyTo?: "subtotal" | "base";
}

export interface PricingRuleData {
  id: string;
  label: string;
  ruleType: RuleType;
  inputVariables: string[];
  formula: PricingRuleFormula;
  explanation: string;
  source: "inferred" | "user" | "ai-recommended";
  active: boolean;
  sortOrder: number;
}

export interface JobAttributes {
  serviceType: string;
  sqft?: number;
  beds?: number;
  baths?: number;
  halfBaths?: number;
  conditionLevel?: string;
  frequency?: string;
  pets?: boolean;
  addOns?: string[];
  zipCode?: string;
  crewSize?: number;
}

export interface BreakdownLine {
  ruleId: string;
  label: string;
  effect: number;
  type: "add" | "multiply" | "discount" | "floor";
  explanation: string;
  runningTotal: number;
}

export interface QuoteResult {
  total: number;
  breakdown: BreakdownLine[];
  rulesApplied: number;
  warnings: string[];
}

export function runPricingEngine(
  job: JobAttributes,
  rules: PricingRuleData[]
): QuoteResult {
  const activeRules = [...rules]
    .filter(r => r.active)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  let subtotal = 0;
  const breakdown: BreakdownLine[] = [];
  const warnings: string[] = [];
  let baseSet = false;

  for (const rule of activeRules) {
    const { formula, ruleType } = rule;
    let effect = 0;
    let lineType: BreakdownLine["type"] = "add";

    switch (ruleType) {
      case "base_price": {
        if (!baseSet) {
          effect = formula.value ?? 0;
          subtotal = effect;
          baseSet = true;
          lineType = "add";
        }
        break;
      }

      case "base_by_service": {
        if (!baseSet) {
          const serviceMap = formula.value as any;
          if (typeof serviceMap === "object" && job.serviceType) {
            effect = serviceMap[job.serviceType] ?? serviceMap["standard"] ?? 0;
          } else {
            effect = formula.value ?? 0;
          }
          subtotal = effect;
          baseSet = true;
          lineType = "add";
        }
        break;
      }

      case "sqft_range": {
        if (!job.sqft || !formula.ranges) break;
        const sqft = job.sqft;
        const match = formula.ranges.find(r => sqft >= r.min && sqft <= r.max);
        if (match) {
          if (!baseSet) {
            subtotal = match.price;
            effect = match.price;
            baseSet = true;
          } else {
            effect = match.price - subtotal;
            subtotal = match.price;
          }
          lineType = "add";
        }
        break;
      }

      case "bed_adjustment": {
        if (!job.beds) break;
        const perBed = formula.value ?? 0;
        effect = job.beds * perBed;
        subtotal += effect;
        lineType = "add";
        break;
      }

      case "bath_adjustment": {
        if (!job.baths) break;
        const perBath = formula.value ?? 0;
        effect = Math.floor(job.baths) * perBath;
        subtotal += effect;
        lineType = "add";
        break;
      }

      case "half_bath_adjustment": {
        if (!job.halfBaths || job.halfBaths === 0) break;
        const perHalf = formula.value ?? 0;
        effect = job.halfBaths * perHalf;
        subtotal += effect;
        lineType = "add";
        break;
      }

      case "condition_multiplier": {
        if (!job.conditionLevel) break;
        const multiplierMap = formula.value as any;
        let mult = 1.0;
        if (typeof multiplierMap === "object" && multiplierMap[job.conditionLevel]) {
          mult = multiplierMap[job.conditionLevel];
        } else if (typeof formula.value === "number") {
          const condMap: Record<string, number> = {
            light: 0.9,
            standard: 1.0,
            heavy: 1.25,
          };
          mult = condMap[job.conditionLevel] ?? 1.0;
        }
        if (mult !== 1.0) {
          effect = subtotal * (mult - 1.0);
          subtotal = subtotal * mult;
          lineType = "multiply";
        }
        break;
      }

      case "frequency_discount": {
        if (!job.frequency) break;
        const discountMap = formula.value as any;
        let discountPct = 0;
        if (typeof discountMap === "object") {
          discountPct = discountMap[job.frequency] ?? 0;
        } else if (job.frequency === "recurring" || job.frequency === "weekly" || job.frequency === "biweekly" || job.frequency === "monthly") {
          discountPct = typeof formula.value === "number" ? formula.value : 10;
        }
        if (discountPct > 0) {
          effect = -(subtotal * discountPct / 100);
          subtotal += effect;
          lineType = "discount";
        }
        break;
      }

      case "pet_surcharge": {
        if (!job.pets) break;
        effect = formula.value ?? 25;
        subtotal += effect;
        lineType = "add";
        break;
      }

      case "addon_price": {
        const addonMap = formula.value as any;
        if (!job.addOns || !addonMap || typeof addonMap !== "object") break;
        for (const addon of job.addOns) {
          if (addonMap[addon]) {
            effect += addonMap[addon];
          }
        }
        if (effect > 0) {
          subtotal += effect;
          lineType = "add";
        }
        break;
      }

      case "zip_surcharge": {
        if (!job.zipCode) break;
        const zipMap = formula.value as any;
        if (typeof zipMap === "object" && zipMap[job.zipCode]) {
          effect = zipMap[job.zipCode];
          subtotal += effect;
          lineType = "add";
        } else if (typeof formula.value === "number") {
          effect = formula.value;
          subtotal += effect;
          lineType = "add";
        }
        break;
      }

      case "first_time_multiplier": {
        if (job.frequency !== "one-time") break;
        const mult = formula.value ?? 1.0;
        if (mult !== 1.0) {
          effect = subtotal * (mult - 1.0);
          subtotal = subtotal * mult;
          lineType = "multiply";
        }
        break;
      }

      case "minimum_floor": {
        const floor = formula.value ?? 0;
        if (subtotal < floor) {
          effect = floor - subtotal;
          subtotal = floor;
          lineType = "floor";
        }
        break;
      }
    }

    if (effect !== 0 || ruleType === "minimum_floor") {
      breakdown.push({
        ruleId: rule.id,
        label: rule.label,
        effect: Math.round(effect * 100) / 100,
        type: lineType,
        explanation: rule.explanation,
        runningTotal: Math.round(subtotal * 100) / 100,
      });
    }
  }

  if (!baseSet) {
    warnings.push("No base price rule was applied. Add a base price or sqft range rule.");
  }

  return {
    total: Math.round(Math.max(subtotal, 0) * 100) / 100,
    breakdown,
    rulesApplied: breakdown.length,
    warnings,
  };
}

/**
 * Convert questionnaire responses into a default set of pricing rules
 * to bootstrap a new pricing profile.
 */
export function buildDefaultRulesFromQuestionnaire(q: {
  minJobPrice?: number | null;
  deepCleanMultiplier?: number | null;
  moveOutMultiplier?: number | null;
  petSurcharge?: number | null;
  recurringDiscount?: number | null;
  neverGoBelow?: number | null;
  targetHourlyRevenue?: number | null;
  travelSurcharge?: number | null;
}): Omit<PricingRuleData, "id">[] {
  const rules: Omit<PricingRuleData, "id">[] = [];
  let order = 0;

  // Base price by service type (derived from min job price + multipliers)
  const baseStandard = q.minJobPrice ?? 100;
  rules.push({
    label: "Base Price by Service Type",
    ruleType: "base_by_service",
    inputVariables: ["serviceType"],
    formula: {
      type: "fixed",
      value: {
        standard: baseStandard,
        "deep-clean": Math.round(baseStandard * (q.deepCleanMultiplier ?? 1.5)),
        "move-in-out": Math.round(baseStandard * (q.moveOutMultiplier ?? 1.75)),
        recurring: Math.round(baseStandard * 0.9),
        commercial: Math.round(baseStandard * 2.0),
      } as any,
    },
    explanation: `Starting price varies by service type. Deep clean is ${q.deepCleanMultiplier ?? 1.5}x and move-in/out is ${q.moveOutMultiplier ?? 1.75}x the standard base.`,
    source: "inferred",
    active: true,
    sortOrder: order++,
  });

  // Sqft range pricing
  rules.push({
    label: "Square Footage Pricing",
    ruleType: "sqft_range",
    inputVariables: ["sqft"],
    formula: {
      type: "range_lookup",
      ranges: [
        { min: 0, max: 800, price: Math.round(baseStandard * 0.85) },
        { min: 801, max: 1200, price: baseStandard },
        { min: 1201, max: 1600, price: Math.round(baseStandard * 1.15) },
        { min: 1601, max: 2000, price: Math.round(baseStandard * 1.3) },
        { min: 2001, max: 2500, price: Math.round(baseStandard * 1.5) },
        { min: 2501, max: 3200, price: Math.round(baseStandard * 1.7) },
        { min: 3201, max: 99999, price: Math.round(baseStandard * 2.0) },
      ],
    },
    explanation: "Adjusts pricing based on the square footage of the home. Larger homes take more time and supplies.",
    source: "inferred",
    active: true,
    sortOrder: order++,
  });

  // Bedroom adjustment
  rules.push({
    label: "Bedroom Adjustment",
    ruleType: "bed_adjustment",
    inputVariables: ["beds"],
    formula: { type: "per_unit", value: 10 },
    explanation: "Each bedroom adds to the quote to account for additional time spent dusting, vacuuming, and making beds.",
    source: "inferred",
    active: true,
    sortOrder: order++,
  });

  // Bathroom adjustment
  rules.push({
    label: "Bathroom Adjustment",
    ruleType: "bath_adjustment",
    inputVariables: ["baths"],
    formula: { type: "per_unit", value: 15 },
    explanation: "Each full bathroom adds to the quote — bathrooms are time-intensive and require more supplies.",
    source: "inferred",
    active: true,
    sortOrder: order++,
  });

  // Half bath adjustment
  rules.push({
    label: "Half Bath Adjustment",
    ruleType: "half_bath_adjustment",
    inputVariables: ["halfBaths"],
    formula: { type: "per_unit", value: 8 },
    explanation: "Half baths (toilet + sink only) require less time than full bathrooms.",
    source: "inferred",
    active: true,
    sortOrder: order++,
  });

  // Condition multiplier
  rules.push({
    label: "Condition Level Multiplier",
    ruleType: "condition_multiplier",
    inputVariables: ["conditionLevel"],
    formula: {
      type: "multiplier",
      value: { light: 0.9, standard: 1.0, heavy: 1.25 } as any,
    },
    explanation: "Homes in heavy condition take significantly more time. Light condition homes get a small discount.",
    source: "inferred",
    active: true,
    sortOrder: order++,
  });

  // Pet surcharge
  if (q.petSurcharge && q.petSurcharge > 0) {
    rules.push({
      label: "Pet Surcharge",
      ruleType: "pet_surcharge",
      inputVariables: ["pets"],
      formula: { type: "fixed", value: q.petSurcharge },
      explanation: `Homes with pets require extra vacuuming and dander removal. Adds $${q.petSurcharge} to the quote.`,
      source: "inferred",
      active: true,
      sortOrder: order++,
    });
  }

  // Recurring discount
  if (q.recurringDiscount && q.recurringDiscount > 0) {
    rules.push({
      label: "Recurring Client Discount",
      ruleType: "frequency_discount",
      inputVariables: ["frequency"],
      formula: {
        type: "percent_discount",
        value: {
          recurring: q.recurringDiscount,
          weekly: q.recurringDiscount,
          biweekly: q.recurringDiscount,
          monthly: Math.round(q.recurringDiscount / 2),
          "one-time": 0,
        } as any,
      },
      explanation: `Recurring clients receive a ${q.recurringDiscount}% loyalty discount to encourage long-term relationships.`,
      source: "inferred",
      active: true,
      sortOrder: order++,
    });
  }

  // Travel surcharge
  if (q.travelSurcharge && q.travelSurcharge > 0) {
    rules.push({
      label: "Travel / Distance Surcharge",
      ruleType: "zip_surcharge",
      inputVariables: ["zipCode"],
      formula: { type: "fixed", value: q.travelSurcharge },
      explanation: `A flat travel surcharge of $${q.travelSurcharge} applies to jobs outside your primary service area.`,
      source: "inferred",
      active: false,
      sortOrder: order++,
    });
  }

  // Minimum floor
  rules.push({
    label: "Minimum Job Price Floor",
    ruleType: "minimum_floor",
    inputVariables: [],
    formula: { type: "fixed", value: q.neverGoBelow ?? 80 },
    explanation: `No job should be quoted below $${q.neverGoBelow ?? 80}. This protects your minimum profitability.`,
    source: "inferred",
    active: true,
    sortOrder: order++,
  });

  return rules;
}
