/**
 * quotePricing.test.ts — Snapshot tests for the 5 review-step scenarios
 * from the P0 pricing-display spec.
 */
import { describe, it, expect } from "vitest";
import { calculateQuotePrice, type QuoteServiceType, type QuotePricingInput } from "./quotePricing";
import type { ResidentialQuoteResult } from "shared/pricingEngine";
import { getResidentialBenchmark, getSqftBracket } from "../components/BenchmarkBadge";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const PROPERTY = { sqft: 1500, beds: 3, baths: 2, halfBaths: 0 };

function makeTieredService(displayName: string, typeKey: string): QuoteServiceType {
  return {
    id: typeKey,
    typeKey,
    displayName,
    pricingMode: "tiered",
    benchmarkCategory: typeKey === "residential_recurring" ? "standard" : undefined,
  };
}

function makeFlatService(displayName: string, typeKey: string, cfg: QuoteServiceType["pricingConfig"]): QuoteServiceType {
  const benchmarkCategory =
    typeKey === "deep_clean" ? "deep" :
    typeKey === "move_in_out" ? "moveinout" :
    typeKey === "post_construction" ? "postconstruct" :
    typeKey === "airbnb" ? "airbnb" : undefined;
  return { id: typeKey, typeKey, displayName, pricingMode: "flat", pricingConfig: cfg, benchmarkCategory };
}

function makeEngineResult(prices: { good: number; better: number; best: number }): ResidentialQuoteResult {
  // Minimal stand-in matching the shape used by calculateQuotePrice.
  const mkTier = (price: number, name: string, serviceTypeId: string) => ({
    price,
    firstCleanPrice: null,
    name,
    scope: "",
    serviceTypeId,
    totalHours: 2,
    lineItems: [
      { label: "Square footage (1,500 sqft × $75/1k)", amount: 113, type: "base" as const },
      { label: "Bedrooms (3 × $10)", amount: 30, type: "room" as const },
      { label: "Bathrooms (2 × $10)", amount: 20, type: "room" as const },
    ],
    appliedRules: [],
    warnings: [],
  });
  return {
    good: mkTier(prices.good, "Touch Up", "touch-up"),
    better: mkTier(prices.better, "Standard Clean", "standard"),
    best: mkTier(prices.best, "Deep Clean", "deep-clean"),
  } as unknown as ResidentialQuoteResult;
}

function baseInput(overrides: Partial<QuotePricingInput>): QuotePricingInput {
  return {
    serviceType: makeTieredService("Residential Recurring", "residential_recurring"),
    property: PROPERTY,
    selectedTier: "better",
    engineResult: makeEngineResult({ good: 120, better: 165, best: 420 }),
    aiPriceOverrides: null,
    firstCleanOverrides: {},
    flatPriceOverride: null,
    manualAdjustment: { amount: 0 },
    frequency: "one-time",
    ...overrides,
  };
}

// ─── Invariant ────────────────────────────────────────────────────────────────

function expectInvariants(result: ReturnType<typeof calculateQuotePrice>) {
  const sum = result.breakdown.reduce((s, li) => s + li.amount, 0);
  // STRICT equality. roundItems() pre-rounds each amount, so sum must equal
  // finalPrice exactly with zero tolerance. If this fails the displayed
  // breakdown will not add up to the displayed total.
  expect(sum).toBe(result.finalPrice);
  // Each amount must be an integer so per-row Math.round at display time is a no-op.
  for (const li of result.breakdown) {
    expect(Number.isInteger(li.amount)).toBe(true);
  }
  expect(result.benchmarkServiceName).toBe(result.serviceType.displayName);
  // Header label must reference the service type, never a foreign service name.
  if (result.kind === "flat") {
    expect(result.headerLabel).toContain(result.serviceType.displayName);
  } else {
    // Tiered headerLabel uses the engine tier name, which IS the service type
    // for the residential standard tiered flow (Good=Touch Up, Better=Standard, Best=Deep).
    expect(result.headerLabel).toMatch(/^(Good|Better|Best) · /);
  }
}

// ─── Scenarios ────────────────────────────────────────────────────────────────

describe("calculateQuotePrice — 5 review-step scenarios", () => {
  it("1. Standard Clean tiered, Better selected, no adjustment", () => {
    const r = calculateQuotePrice(baseInput({}));
    expect(r.kind).toBe("tiered");
    expect(r.selectedTier).toBe("better");
    expect(r.finalPrice).toBe(165);
    expect(r.tierPrices).toEqual({ good: 120, better: 165, best: 420 });
    expect(r.headerLabel).toBe("Better · Standard Clean");
    expect(r.isAdjusted).toBe(false);
    expectInvariants(r);
  });

  it("2. Tiered with AI override pushing Better from $165 to $450 — header & options reconcile", () => {
    const r = calculateQuotePrice(
      baseInput({
        aiPriceOverrides: { good: 200, better: 450, best: 650 },
      }),
    );
    expect(r.finalPrice).toBe(450);
    expect(r.tierPrices.better).toBe(450);
    expect(r.tierPrices.good).toBe(200);
    expect(r.tierPrices.best).toBe(650);
    expect(r.isAdjusted).toBe(true);
    // Reconciliation row exists so breakdown sums to total.
    const overrideRow = r.breakdown.find((li) => li.label === "AI pricing override");
    expect(overrideRow).toBeDefined();
    expectInvariants(r);
  });

  it("3. Tiered Best selected with +$30 manual adjustment — breakdown discloses adjustment", () => {
    const r = calculateQuotePrice(
      baseInput({
        selectedTier: "best",
        manualAdjustment: { amount: 30, note: "Pet surcharge" },
      }),
    );
    expect(r.basePrice).toBe(420);
    expect(r.finalPrice).toBe(450);
    expect(r.isAdjusted).toBe(true);
    const adjRow = r.breakdown.find((li) => li.label === "Pet surcharge");
    expect(adjRow?.amount).toBe(30);
    // Active tier in tierPrices reflects adjustment; inactive tiers don't.
    expect(r.tierPrices.best).toBe(450);
    expect(r.tierPrices.good).toBe(120);
    expect(r.tierPrices.better).toBe(165);
    expectInvariants(r);
  });

  it("4. Airbnb flat service — header reads 'Flat Rate · Airbnb', no tier ambiguity", () => {
    const r = calculateQuotePrice(
      baseInput({
        serviceType: makeFlatService("Airbnb Turnover", "airbnb", {
          basePrice: 100,
          perSqft: 0.05,
          perBedroom: 15,
          perBathroom: 20,
          minimum: 150,
        }),
        engineResult: null,
      }),
    );
    expect(r.kind).toBe("flat");
    expect(r.headerLabel).toBe("Flat Rate · Airbnb Turnover");
    expect(r.benchmarkServiceName).toBe("Airbnb Turnover");
    expect(r.benchmarkCategory).toBe("airbnb");
    // 100 + 0.05*1500 + 15*3 + 20*2 = 100 + 75 + 45 + 40 = 260
    expect(r.finalPrice).toBe(260);
    // All three tier prices equal the flat finalPrice (so any consumer reading
    // tier slots gets the same number).
    expect(r.tierPrices).toEqual({ good: 260, better: 260, best: 260 });
    expectInvariants(r);
  });

  it("5. Move-In/Move-Out flat with manual override above computed — pricing override row appears", () => {
    const r = calculateQuotePrice(
      baseInput({
        serviceType: makeFlatService("Move-In/Move-Out", "move_in_out", {
          basePrice: 200,
          perSqft: 0.1,
          perBedroom: 25,
          perBathroom: 30,
          minimum: 300,
        }),
        engineResult: null,
        flatPriceOverride: 600,
        manualAdjustment: { amount: 0 },
      }),
    );
    expect(r.kind).toBe("flat");
    expect(r.finalPrice).toBe(600);
    expect(r.isAdjusted).toBe(true);
    expect(r.headerLabel).toBe("Flat Rate · Move-In/Move-Out");
    expect(r.benchmarkCategory).toBe("moveinout");
    // 200 + 150 + 75 + 60 = 485 → override 600, delta +115 must appear
    const overrideRow = r.breakdown.find((li) => li.label === "Pricing override");
    expect(overrideRow?.amount).toBe(115);
    expectInvariants(r);
  });

  // ─── Bug 1 regression: per-item float rounding must not drift from total ───
  it("6. Engine line items with float remainders pre-round to integers; sum equals finalPrice exactly", () => {
    // Engine returns floats (e.g. petSurcharge = 22.5, sqftRaw = 187.34) and
    // a final tier.price rounded to nearest $5. Without roundItems(), the
    // displayed integer sum drifts by $1 from the displayed total. With
    // roundItems(), strict equality holds.
    const driftEngine: ResidentialQuoteResult = {
      good: { price: 0, firstCleanPrice: null, name: "Touch Up", scope: "", serviceTypeId: "touch-up", totalHours: 1, lineItems: [], appliedRules: [], warnings: [] },
      better: {
        price: 290, // roundToNearest5 of raw float sum
        firstCleanPrice: null,
        name: "Standard Clean",
        scope: "",
        serviceTypeId: "standard",
        totalHours: 3,
        lineItems: [
          { label: "Square footage (2,200 sqft × $85/1k)", amount: 187.0,  type: "base"      as const },
          { label: "Bedrooms (3 × $15)",                   amount: 45.0,   type: "room"      as const },
          { label: "Bathrooms (2 × $18)",                  amount: 36.0,   type: "room"      as const },
          { label: "Pet surcharge (dog, shedding)",        amount: 22.5,   type: "surcharge" as const },
        ],
        appliedRules: [], warnings: [],
      },
      best: { price: 0, firstCleanPrice: null, name: "Deep Clean", scope: "", serviceTypeId: "deep-clean", totalHours: 4, lineItems: [], appliedRules: [], warnings: [] },
    } as unknown as ResidentialQuoteResult;

    const r = calculateQuotePrice(baseInput({
      property: { sqft: 2200, beds: 3, baths: 2, halfBaths: 0 },
      engineResult: driftEngine,
    }));

    expect(r.finalPrice).toBe(290);
    // Strict equality is now enforced by expectInvariants.
    expectInvariants(r);
    // Reconciliation row should appear because Math.round(22.5) = 23 means
    // pre-rounded sum is 187+45+36+23 = 291, but basePrice is 290 → -1 row.
    const recon = r.breakdown.find((li) => li.label === "Rounding adjustment" || li.label === "Minimum job price");
    expect(recon).toBeDefined();
    expect(recon!.amount).toBe(-1);
  });
});

// ─── Bug 2 regression: size-bracketed national benchmarks ──────────────────────

describe("getResidentialBenchmark — sqft brackets", () => {
  it("brackets sqft into the 5 expected ranges", () => {
    expect(getSqftBracket(800)).toBe("small");
    expect(getSqftBracket(1500)).toBe("medium");
    expect(getSqftBracket(2200)).toBe("large");
    expect(getSqftBracket(3000)).toBe("xl");
    expect(getSqftBracket(4000)).toBe("xxl");
    // Boundary values
    expect(getSqftBracket(999)).toBe("small");
    expect(getSqftBracket(1000)).toBe("medium");
    expect(getSqftBracket(1799)).toBe("medium");
    expect(getSqftBracket(1800)).toBe("large");
    expect(getSqftBracket(2499)).toBe("large");
    expect(getSqftBracket(2500)).toBe("xl");
    expect(getSqftBracket(3499)).toBe("xl");
    expect(getSqftBracket(3500)).toBe("xxl");
  });

  it("Standard Clean: 800 sqft → Small bracket $90–$150", () => {
    const bm = getResidentialBenchmark(800, 2, "standard");
    expect(bm.bracket).toBe("small");
    expect(bm.low).toBe(90);
    expect(bm.high).toBe(150);
    expect(bm.bracketLabel).toBe("<1,000 sqft");
  });

  it("Standard Clean: 1,500 sqft → Medium bracket $130–$200", () => {
    const bm = getResidentialBenchmark(1500, 3, "standard");
    expect(bm.bracket).toBe("medium");
    expect(bm.low).toBe(130);
    expect(bm.high).toBe(200);
  });

  it("Standard Clean: 2,200 sqft @ $290 → Large bracket high, no false 'review your pricing'", () => {
    // The screenshot scenario. With single-national-range benchmarks the widget
    // showed "84% above national high — review your pricing". With sqft
    // bracketing, $290 sits AT the high of the Large bracket → "within".
    const bm = getResidentialBenchmark(2200, 3, "standard");
    expect(bm.bracket).toBe("large");
    expect(bm.low).toBe(180);
    expect(bm.high).toBe(290);
    expect(bm.bracketLabel).toBe("1,800–2,500 sqft");
    // $290 is at the high → in-range, no warning fires.
    expect(290 <= bm.high).toBe(true);
  });

  it("Standard Clean: 4,000 sqft → XXL bracket $300–$520", () => {
    const bm = getResidentialBenchmark(4000, 5, "standard");
    expect(bm.bracket).toBe("xxl");
    expect(bm.low).toBe(300);
    expect(bm.high).toBe(520);
  });

  it("Deep Clean: 2,200 sqft → Large bracket scaled ~1.6x of Standard, NOT Standard range", () => {
    const bm = getResidentialBenchmark(2200, 3, "deep");
    expect(bm.bracket).toBe("large");
    // Deep should be ~1.6x of Standard Large ($180-$290) → ~$288-$464
    expect(bm.low).toBeGreaterThan(280);
    expect(bm.high).toBeGreaterThan(450);
    expect(bm.source).toContain("Deep");
  });

  it("falls back to bed-count-derived sqft when sqft is not provided", () => {
    const bm = getResidentialBenchmark(undefined, 3, "standard");
    // 3 beds → ~1800 sqft → large bracket
    expect(bm.bracket).toBe("large");
  });
});
