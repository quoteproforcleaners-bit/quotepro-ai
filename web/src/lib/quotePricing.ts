/**
 * quotePricing.ts — Single source of truth for /quotes/new pricing display.
 *
 * Why this exists:
 *   The Review step + LiveQuotePreview previously derived prices, labels, and
 *   breakdowns from 3+ different code paths (engine result, AI overrides,
 *   flat-config compute, manual adjustment). The displays disagreed —
 *   header total didn't match breakdown sum, tier label didn't match the
 *   selected service type, ALL OPTIONS list didn't include override+adj,
 *   benchmark widget read a different service-type source than the header.
 *
 *   This module consolidates ALL of that into one pure function that returns
 *   a QuotePricingResult. Every UI component on the Review step (header,
 *   breakdown, tier cards, ALL OPTIONS, benchmark) reads from this single
 *   object — no parallel calculation paths.
 *
 *   Invariant: sum(breakdown[].amount) === finalPrice. Asserted in dev.
 */

import type { ResidentialQuoteResult, LineItem } from "shared/pricingEngine";
import type { ResidentialServiceCategory } from "../components/BenchmarkBadge";

// ─── Types ────────────────────────────────────────────────────────────────────

export type QuoteTier = "good" | "better" | "best";

export interface ManualAdjustment {
  amount: number;
  note?: string;
}

export interface QuoteServiceType {
  id: string;
  typeKey: string;
  displayName: string;
  pricingMode: "tiered" | "flat";
  /** Benchmark category — used by the benchmark widget. Same source as the header label. */
  benchmarkCategory: ResidentialServiceCategory | undefined;
  /** Flat-service config (only meaningful when pricingMode === "flat") */
  pricingConfig?: {
    basePrice?: number;
    perSqft?: number;
    perBedroom?: number;
    perBathroom?: number;
    minimum?: number;
  };
}

export interface QuotePricingProperty {
  sqft: number;
  beds: number;
  baths: number;
  halfBaths: number;
}

export interface QuotePricingInput {
  serviceType: QuoteServiceType;
  property: QuotePricingProperty;
  /** "good" | "better" | "best" — ignored for flat services (forced to "better"). */
  selectedTier: QuoteTier;
  /** Output of computeResidentialQuote — required for tiered mode, ignored for flat. */
  engineResult: ResidentialQuoteResult | null;
  /** Per-tier AI price overrides (tiered mode only). */
  aiPriceOverrides: { good: number; better: number; best: number } | null;
  /** Per-tier first-visit price overrides (tiered recurring mode). */
  firstCleanOverrides: { good?: number; better?: number; best?: number };
  /** Manual flat-price override (flat mode only). */
  flatPriceOverride: number | null;
  manualAdjustment: ManualAdjustment;
  /** "one-time" | "weekly" | "biweekly" | "monthly" */
  frequency: string;
}

export interface QuotePricingResult {
  kind: "tiered" | "flat";
  serviceType: QuoteServiceType;
  /** Always present. For flat services this is forced to "better" for compat with the engine result shape. */
  selectedTier: QuoteTier;
  /** Final per-tier prices (tiered: engine + override + adj on active; flat: all three == flat finalPrice). */
  tierPrices: { good: number; better: number; best: number };
  /** Per-tier display names. Tiered: engine names ("Touch Up"/"Standard"/"Deep"). Flat: serviceType.displayName for all three. */
  tierLabels: { good: string; better: string; best: string };
  /** Per-tier first-visit prices for recurring quotes. */
  firstCleanPrices: { good?: number; better?: number; best?: number };
  /** The flat base price (before manual adjustment). null for tiered services. */
  flatPrice: number | null;
  manualAdjustment: ManualAdjustment;
  /** Pre-adjustment price of the selected tier (or flat). */
  basePrice: number;
  /** finalPrice = basePrice + manualAdjustment.amount. THE displayed total. */
  finalPrice: number;
  /** True when manual adjustment ≠ 0 OR an override deviates from the engine-computed price. */
  isAdjusted: boolean;
  /** "Better · Standard Clean" or "Flat Rate · Deep Clean". Always reads from this object. */
  headerLabel: string;
  /** Same source as headerLabel — guaranteed to agree with the benchmark widget. */
  benchmarkCategory: ResidentialServiceCategory | undefined;
  benchmarkServiceName: string;
  /** Property sqft — passed through so the benchmark widget can size-bracket. */
  propertySqft: number;
  /** Complete breakdown. INVARIANT: sum of (rounded) amounts === finalPrice. All amounts are integers. */
  breakdown: LineItem[];
  /** Labor estimate (tiered only). null for flat services. */
  laborHours: number | null;
  warnings: ResidentialQuoteResult[QuoteTier]["warnings"];
  appliedRules: ResidentialQuoteResult[QuoteTier]["appliedRules"];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sumItems(items: LineItem[]): number {
  return items.reduce((s, li) => s + li.amount, 0);
}

/**
 * Normalize line items so each amount is a whole-dollar integer. The display
 * layer renders Math.round(amount), so storing the rounded values up-front
 * means breakdown.sum === displayed sum. Items that round to $0 are dropped
 * (they would otherwise render as "+$0" rows).
 */
function roundItems(items: LineItem[]): LineItem[] {
  const out: LineItem[] = [];
  for (const li of items) {
    const rounded = Math.round(li.amount);
    if (rounded === 0) continue;
    out.push({ ...li, amount: rounded });
  }
  return out;
}

function buildFlatBreakdown(
  cfg: NonNullable<QuoteServiceType["pricingConfig"]>,
  property: QuotePricingProperty,
  serviceName: string,
): LineItem[] {
  const base = Number(cfg.basePrice) || 0;
  const perSqft = Number(cfg.perSqft) || 0;
  const perBed = Number(cfg.perBedroom) || 0;
  const perBath = Number(cfg.perBathroom) || 0;
  const min = Number(cfg.minimum) || 0;

  const items: LineItem[] = [];
  if (base > 0) items.push({ label: `Base price (${serviceName})`, amount: base, type: "base" });
  if (perSqft > 0 && property.sqft > 0) {
    items.push({
      label: `Square footage (${property.sqft.toLocaleString()} sqft × $${perSqft}/sqft)`,
      amount: perSqft * property.sqft,
      type: "base",
    });
  }
  if (perBed > 0 && property.beds > 0) {
    items.push({ label: `Bedrooms (${property.beds} × $${perBed})`, amount: perBed * property.beds, type: "room" });
  }
  if (perBath > 0) {
    const bathCount = property.baths + 0.5 * property.halfBaths;
    if (bathCount > 0) {
      const label = property.halfBaths > 0
        ? `Bathrooms (${property.baths} full, ${property.halfBaths} half × $${perBath})`
        : `Bathrooms (${property.baths} × $${perBath})`;
      items.push({ label, amount: perBath * bathCount, type: "room" });
    }
  }
  const calcSum = sumItems(items);
  if (min > 0 && calcSum < min) {
    items.push({ label: `Minimum job price ($${min})`, amount: min - calcSum, type: "surcharge" });
  }
  return items;
}

/** Compute the pre-adjustment flat base from config + property. */
export function computeFlatBase(
  cfg: NonNullable<QuoteServiceType["pricingConfig"]> | undefined,
  property: QuotePricingProperty,
): number {
  if (!cfg) return 0;
  const base = Number(cfg.basePrice) || 0;
  const perSqft = Number(cfg.perSqft) || 0;
  const perBed = Number(cfg.perBedroom) || 0;
  const perBath = Number(cfg.perBathroom) || 0;
  const min = Number(cfg.minimum) || 0;
  const calc =
    base + perSqft * property.sqft + perBed * property.beds + perBath * (property.baths + 0.5 * property.halfBaths);
  return Math.max(min, Math.round(calc));
}

// ─── Main calculator ──────────────────────────────────────────────────────────

export function calculateQuotePrice(input: QuotePricingInput): QuotePricingResult {
  const { serviceType, property, manualAdjustment, frequency } = input;
  const isFlat = serviceType.pricingMode === "flat";

  if (isFlat) {
    const cfg = serviceType.pricingConfig || {};
    const computedFlat = computeFlatBase(cfg, property);
    const basePrice = Math.round(input.flatPriceOverride ?? computedFlat);
    const finalPrice = basePrice + Math.round(manualAdjustment.amount);

    // Round line items to whole dollars FIRST (display layer rounds at render
    // time anyway — pre-rounding makes sum===total exact, not approximate).
    const breakdown = roundItems(buildFlatBreakdown(cfg, property, serviceType.displayName));
    const breakdownSum = sumItems(breakdown);
    const overrideDelta = basePrice - breakdownSum;
    if (overrideDelta !== 0) {
      breakdown.push({
        label: input.flatPriceOverride != null ? "Pricing override" : "Minimum / rounding",
        amount: overrideDelta,
        type: overrideDelta > 0 ? "surcharge" : "discount",
      });
    }
    if (manualAdjustment.amount !== 0) {
      breakdown.push({
        label: manualAdjustment.note || "Manual adjustment",
        amount: Math.round(manualAdjustment.amount),
        type: manualAdjustment.amount > 0 ? "surcharge" : "discount",
      });
    }

    const isAdjusted =
      manualAdjustment.amount !== 0 ||
      (input.flatPriceOverride != null && Math.abs(input.flatPriceOverride - computedFlat) >= 1);

    const result: QuotePricingResult = {
      kind: "flat",
      serviceType,
      selectedTier: "better",
      tierPrices: { good: finalPrice, better: finalPrice, best: finalPrice },
      tierLabels: {
        good: serviceType.displayName,
        better: serviceType.displayName,
        best: serviceType.displayName,
      },
      firstCleanPrices: {},
      flatPrice: basePrice,
      manualAdjustment,
      basePrice,
      finalPrice,
      isAdjusted,
      headerLabel: `Flat Rate · ${serviceType.displayName}`,
      benchmarkCategory: serviceType.benchmarkCategory,
      benchmarkServiceName: serviceType.displayName,
      propertySqft: property.sqft,
      breakdown,
      laborHours: null,
      warnings: [],
      appliedRules: [],
    };
    assertSumsMatch(result);
    return result;
  }

  // ── Tiered path ─────────────────────────────────────────────────────────────
  const engine = input.engineResult;
  if (!engine) {
    throw new Error("calculateQuotePrice: engineResult is required for tiered services");
  }
  const selectedTier = input.selectedTier;
  const tier = engine[selectedTier];

  const tierEnginePrices = { good: engine.good.price, better: engine.better.price, best: engine.best.price };
  const tierPricesPreAdj = {
    good: input.aiPriceOverrides?.good ?? tierEnginePrices.good,
    better: input.aiPriceOverrides?.better ?? tierEnginePrices.better,
    best: input.aiPriceOverrides?.best ?? tierEnginePrices.best,
  };
  const basePrice = Math.round(tierPricesPreAdj[selectedTier]);
  const finalPrice = basePrice + Math.round(manualAdjustment.amount);

  // Mirror to per-tier finalPrices: only the active tier gets the adjustment;
  // inactive tiers reflect the override-or-engine price for ALL OPTIONS display.
  const tierPrices = {
    good: tierPricesPreAdj.good + (selectedTier === "good" ? manualAdjustment.amount : 0),
    better: tierPricesPreAdj.better + (selectedTier === "better" ? manualAdjustment.amount : 0),
    best: tierPricesPreAdj.best + (selectedTier === "best" ? manualAdjustment.amount : 0),
  };

  const firstCleanPrices = {
    good: input.firstCleanOverrides.good ?? engine.good.firstCleanPrice ?? undefined,
    better: input.firstCleanOverrides.better ?? engine.better.firstCleanPrice ?? undefined,
    best: input.firstCleanOverrides.best ?? engine.best.firstCleanPrice ?? undefined,
  };

  // Round engine line items to whole dollars FIRST so per-item display
  // rounding can never drift from basePrice. (Engine stores raw floats like
  // pet surcharge = 22.5 → without pre-rounding, three such items can shift
  // the displayed sum by $1+ from basePrice even though the math is "right".)
  const breakdown: LineItem[] = roundItems(tier.lineItems);
  const breakdownSum = sumItems(breakdown);
  const overrideDelta = basePrice - breakdownSum;
  if (overrideDelta !== 0) {
    const label = input.aiPriceOverrides != null
      ? "AI pricing override"
      : (overrideDelta > 0 ? "Minimum job price" : "Rounding adjustment");
    breakdown.push({
      label,
      amount: overrideDelta,
      type: overrideDelta > 0 ? "surcharge" : "discount",
    });
  }
  if (manualAdjustment.amount !== 0) {
    breakdown.push({
      label: manualAdjustment.note || "Manual adjustment",
      amount: Math.round(manualAdjustment.amount),
      type: manualAdjustment.amount > 0 ? "surcharge" : "discount",
    });
  }

  const isAdjusted =
    manualAdjustment.amount !== 0 ||
    (input.aiPriceOverrides != null &&
      (Math.abs(tierPricesPreAdj.good - tierEnginePrices.good) >= 1 ||
        Math.abs(tierPricesPreAdj.better - tierEnginePrices.better) >= 1 ||
        Math.abs(tierPricesPreAdj.best - tierEnginePrices.best) >= 1));

  const result: QuotePricingResult = {
    kind: "tiered",
    serviceType,
    selectedTier,
    tierPrices,
    tierLabels: { good: engine.good.name, better: engine.better.name, best: engine.best.name },
    firstCleanPrices,
    flatPrice: null,
    manualAdjustment,
    basePrice,
    finalPrice,
    isAdjusted,
    headerLabel: `${selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1)} · ${tier.name}`,
    benchmarkCategory: serviceType.benchmarkCategory,
    benchmarkServiceName: serviceType.displayName,
    propertySqft: property.sqft,
    breakdown,
    laborHours: tier.totalHours,
    warnings: tier.warnings,
    appliedRules: tier.appliedRules,
  };
  assertSumsMatch(result);
  // frequency is reserved for callers (recurring vs one-time UX); not used here.
  void frequency;
  return result;
}

/**
 * Dev-mode invariant guard: STRICT equality — breakdown.sum === finalPrice.
 * No tolerance. Because all amounts are pre-rounded to integers in
 * roundItems(), this should hold exactly. Logs to console in dev so future
 * regressions surface immediately. Never throws in production.
 */
function assertSumsMatch(result: QuotePricingResult): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isDev = typeof window !== "undefined" && (import.meta as any)?.env?.DEV;
  // Always assert in vitest (NODE_ENV === "test"); always assert in browser dev.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isTest = typeof process !== "undefined" && (process as any)?.env?.NODE_ENV === "test";
  if (!isDev && !isTest) return;
  const sum = sumItems(result.breakdown);
  if (sum !== result.finalPrice) {
    const msg = "[quotePricing] INVARIANT VIOLATION: breakdown sum ≠ finalPrice";
    // eslint-disable-next-line no-console
    console.error(msg, {
      sum,
      finalPrice: result.finalPrice,
      delta: sum - result.finalPrice,
      headerLabel: result.headerLabel,
      breakdown: result.breakdown,
    });
    if (isTest) {
      throw new Error(`${msg} — sum=${sum} finalPrice=${result.finalPrice}`);
    }
  }
}
