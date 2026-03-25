import { describe, it, expect } from "vitest";
import {
  computeResidentialQuote,
  DEFAULT_PRICING,
  ADD_ON_OPTIONS,
  DEFAULT_ADD_ON_PRICES,
  type ResidentialProperty,
  type PricingSettings,
} from "./pricingEngine";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function prop(overrides: Partial<ResidentialProperty> = {}): ResidentialProperty {
  return {
    beds: 2,
    halfBaths: 0,
    baths: 1,
    sqft: 1000,
    homeType: "house",
    conditionScore: 7,
    peopleCount: 2,
    petType: "none",
    petShedding: false,
    ...overrides,
  };
}

function pricing(overrides: Partial<PricingSettings> = {}): PricingSettings {
  return { ...DEFAULT_PRICING, ...overrides };
}

// All add-ons enabled
const ALL_ADDONS = Object.fromEntries(ADD_ON_OPTIONS.map((o) => [o.key, true])) as Record<string, boolean>;
const NO_ADDONS: Record<string, boolean> = {};

// Total price of all add-ons in the catalog at default prices
const ALL_ADDONS_TOTAL = Object.values(DEFAULT_ADD_ON_PRICES).reduce((s, v) => s + v, 0); // 280

// ─── BASE PRICE CALCULATION ───────────────────────────────────────────────────
// Contract: base = (sqft/1000)*pricePerSqft + beds*pricePerBedroom + baths*pricePerBathroom + halfBaths*(pricePerBathroom/2)
// adjusted = base * conditionMultiplier * peopleMultiplier + petSurcharge
// tier price (better = ×1.0) = adjusted, rounded to nearest $5, floored at minimumTicket

describe("Base price calculation", () => {
  it("1000 sqft, 2 bed, 1 bath, no pets, average condition (score 7) — better tier one-time", () => {
    // base = (1000/1000)*85 + 2*15 + 1*18 = 85+30+18 = 133
    // cond=1.0, people(2)=1.0 → adjusted=133
    // better ×1.0 → tierBase=133 → firstClean=round5(133)=135
    const result = computeResidentialQuote(prop(), NO_ADDONS, "one-time", null);
    expect(result.better.price).toBe(135);
  });

  it("1000 sqft, 2 bed, 1 bath — good tier is 75% of adjusted base, min ticket enforced", () => {
    // good ×0.75 → tierBase=99.75 → below min 100 → firstClean=100
    const result = computeResidentialQuote(prop(), NO_ADDONS, "one-time", null);
    expect(result.good.price).toBe(100);
  });

  it("2500 sqft, 4 bed, 2.5 bath, score 7, one-time — correct base price", () => {
    // sqft: (2500/1000)*85=212.5, beds: 4*15=60, baths: 2*18+1*9=45 → base=317.5
    // better ×1.0 → firstClean=round5(317.5)=320
    const result = computeResidentialQuote(
      prop({ sqft: 2500, beds: 4, baths: 2, halfBaths: 1 }),
      NO_ADDONS,
      "one-time",
      null
    );
    expect(result.better.price).toBe(320);
  });

  it("2500 sqft, 4 bed, 2.5 bath — good and best also correct", () => {
    // good ×0.75: 317.5*0.75=238.125 → round5=240
    // best ×1.5: 317.5*1.5=476.25, extraAddons=175 → 651.25 → round5=650
    const result = computeResidentialQuote(
      prop({ sqft: 2500, beds: 4, baths: 2, halfBaths: 1 }),
      NO_ADDONS,
      "one-time",
      null
    );
    expect(result.good.price).toBe(240);
    expect(result.best.price).toBe(650);
  });

  it("minimum ticket enforced — tiny property (zero sqft/beds/baths) never goes below $100", () => {
    // adjusted=0 → all tiers below min → good=100 (minimum), better bumped by $20 gap rule
    const result = computeResidentialQuote(
      prop({ sqft: 0, beds: 0, baths: 0 }),
      NO_ADDONS,
      "one-time",
      null
    );
    expect(result.good.price).toBe(100);
    expect(result.better.price).toBeGreaterThanOrEqual(100);
    expect(result.best.price).toBeGreaterThanOrEqual(100);
  });

  it("minimum ticket warning is included when below threshold", () => {
    const result = computeResidentialQuote(
      prop({ sqft: 0, beds: 0, baths: 0 }),
      NO_ADDONS,
      "one-time",
      null
    );
    const hasMinWarning =
      result.good.warnings.some((w) => w.type === "below_minimum") ||
      result.better.warnings.some((w) => w.type === "below_minimum") ||
      result.best.warnings.some((w) => w.type === "below_minimum");
    expect(hasMinWarning).toBe(true);
  });

  it("custom minimumTicket is respected", () => {
    const result = computeResidentialQuote(
      prop({ sqft: 0, beds: 0, baths: 0 }),
      NO_ADDONS,
      "one-time",
      pricing({ minimumTicket: 150 })
    );
    expect(result.good.price).toBe(150);
  });
});

// ─── CONDITION MULTIPLIERS ────────────────────────────────────────────────────
// score ≥9 → 0.9×  |  ≥7 → 1.0×  |  ≥5 → 1.2×  |  ≥3 → 1.4×  |  <3 → 1.7×

describe("Condition multipliers", () => {
  // Base: 1000sqft, 2bed, 1bath → base=133. Better tier (×1.0), one-time.
  // Adjusted = 133 * multiplier. firstClean = round5(adjusted).

  it("score 9 → 0.9× multiplier — better price is cleanliness credit", () => {
    // 133 * 0.9 = 119.7 → round5 = 120
    const result = computeResidentialQuote(prop({ conditionScore: 9 }), NO_ADDONS, "one-time", null);
    expect(result.better.price).toBe(120);
  });

  it("score 10 → also 0.9× multiplier (boundary: ≥9)", () => {
    const r9 = computeResidentialQuote(prop({ conditionScore: 9 }), NO_ADDONS, "one-time", null);
    const r10 = computeResidentialQuote(prop({ conditionScore: 10 }), NO_ADDONS, "one-time", null);
    expect(r9.better.price).toBe(r10.better.price);
  });

  it("score 7 → 1.0× (no adjustment) — better price is base", () => {
    // 133 * 1.0 = 133 → round5 = 135
    const result = computeResidentialQuote(prop({ conditionScore: 7 }), NO_ADDONS, "one-time", null);
    expect(result.better.price).toBe(135);
  });

  it("score 8 → also 1.0× (boundary: ≥7)", () => {
    const r7 = computeResidentialQuote(prop({ conditionScore: 7 }), NO_ADDONS, "one-time", null);
    const r8 = computeResidentialQuote(prop({ conditionScore: 8 }), NO_ADDONS, "one-time", null);
    expect(r7.better.price).toBe(r8.better.price);
  });

  it("score 5 → 1.2× multiplier applied correctly", () => {
    // 133 * 1.2 = 159.6 → round5 = 160
    const result = computeResidentialQuote(prop({ conditionScore: 5 }), NO_ADDONS, "one-time", null);
    expect(result.better.price).toBe(160);
  });

  it("score 6 → also 1.2× (boundary: ≥5)", () => {
    const r5 = computeResidentialQuote(prop({ conditionScore: 5 }), NO_ADDONS, "one-time", null);
    const r6 = computeResidentialQuote(prop({ conditionScore: 6 }), NO_ADDONS, "one-time", null);
    expect(r5.better.price).toBe(r6.better.price);
  });

  it("score 3 → 1.4× multiplier applied correctly", () => {
    // 133 * 1.4 = 186.2 → round5 = 185
    const result = computeResidentialQuote(prop({ conditionScore: 3 }), NO_ADDONS, "one-time", null);
    expect(result.better.price).toBe(185);
  });

  it("score 4 → also 1.4× (boundary: ≥3)", () => {
    const r3 = computeResidentialQuote(prop({ conditionScore: 3 }), NO_ADDONS, "one-time", null);
    const r4 = computeResidentialQuote(prop({ conditionScore: 4 }), NO_ADDONS, "one-time", null);
    expect(r3.better.price).toBe(r4.better.price);
  });

  it("score 2 → 1.7× multiplier applied correctly", () => {
    // 133 * 1.7 = 226.1 → round5 = 225
    const result = computeResidentialQuote(prop({ conditionScore: 2 }), NO_ADDONS, "one-time", null);
    expect(result.better.price).toBe(225);
  });

  it("score 1 → also 1.7× (boundary: <3)", () => {
    const r1 = computeResidentialQuote(prop({ conditionScore: 1 }), NO_ADDONS, "one-time", null);
    const r2 = computeResidentialQuote(prop({ conditionScore: 2 }), NO_ADDONS, "one-time", null);
    expect(r1.better.price).toBe(r2.better.price);
  });

  it("condition multiplier increases price monotonically as score drops", () => {
    const scores = [10, 8, 6, 4, 2];
    const prices = scores.map(
      (s) => computeResidentialQuote(prop({ conditionScore: s }), NO_ADDONS, "one-time", null).better.price
    );
    // Each lower score should produce the same or higher price
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
    }
  });
});

// ─── SERVICE TIER MULTIPLIERS ─────────────────────────────────────────────────
// good ×0.75  |  better ×1.0  |  best ×1.5
// $20 minimum gap enforced between adjacent tiers

describe("Service tier multipliers", () => {
  it("good tier (×0.75) produces correct price — enforces min ticket", () => {
    // 133 * 0.75 = 99.75 → below min 100 → price = 100
    const result = computeResidentialQuote(prop(), NO_ADDONS, "one-time", null);
    expect(result.good.price).toBe(100);
  });

  it("better tier (×1.0) produces correct price", () => {
    // 133 * 1.0 = 133 → round5 = 135
    const result = computeResidentialQuote(prop(), NO_ADDONS, "one-time", null);
    expect(result.better.price).toBe(135);
  });

  it("best tier (×1.5) produces correct price with built-in add-ons", () => {
    // 133 * 1.5 = 199.5, built-in addons: oven(25)+cabinets(40)+windows(40)+baseboards(35)+blinds(35)=175
    // firstClean = round5(199.5 + 175) = round5(374.5) = 375
    const result = computeResidentialQuote(prop(), NO_ADDONS, "one-time", null);
    expect(result.best.price).toBe(375);
  });

  it("tiers are always in ascending price order", () => {
    const result = computeResidentialQuote(prop(), NO_ADDONS, "one-time", null);
    expect(result.good.price).toBeLessThan(result.better.price);
    expect(result.better.price).toBeLessThan(result.best.price);
  });

  it("$20 minimum gap — tiers below minimum ticket collapse without gap enforcement", () => {
    // Zero input: all tiers compute to minimum. Gap rule bumps better and best.
    const result = computeResidentialQuote(
      prop({ sqft: 0, beds: 0, baths: 0 }),
      NO_ADDONS,
      "one-time",
      null
    );
    // good = 100 (min), better must be ≥ good + 20, best must be ≥ better + 20
    expect(result.better.price).toBeGreaterThanOrEqual(result.good.price + 20);
    expect(result.best.price).toBeGreaterThanOrEqual(result.better.price + 20);
  });

  it("$20 gap enforced on firstCleanPrice for recurring quotes", () => {
    const result = computeResidentialQuote(
      prop({ sqft: 0, beds: 0, baths: 0 }),
      NO_ADDONS,
      "biweekly",
      null
    );
    if (result.good.firstCleanPrice !== null && result.better.firstCleanPrice !== null) {
      expect(result.better.firstCleanPrice).toBeGreaterThanOrEqual(result.good.firstCleanPrice + 20);
    }
    if (result.better.firstCleanPrice !== null && result.best.firstCleanPrice !== null) {
      expect(result.best.firstCleanPrice).toBeGreaterThanOrEqual(result.better.firstCleanPrice + 20);
    }
  });

  it("tier gap holds on a normal mid-size property", () => {
    const result = computeResidentialQuote(
      prop({ sqft: 2000, beds: 3, baths: 2 }),
      NO_ADDONS,
      "one-time",
      null
    );
    expect(result.better.price - result.good.price).toBeGreaterThanOrEqual(20);
    expect(result.best.price - result.better.price).toBeGreaterThanOrEqual(20);
  });
});

// ─── FREQUENCY DISCOUNTS ──────────────────────────────────────────────────────
// Defaults: weekly=25%, biweekly=15%, monthly=10%
// recurring = max(tierBase, minTicket) * (1 - discount), rounded to $5
// firstCleanPrice (returned separately) = full tier price with add-ons

describe("Frequency discounts", () => {
  // 1000sqft, 2bed, 1bath, score=7 → adjustedBase=133. better tier (×1.0).
  // recurringBase = max(133, 100) = 133. firstClean = round5(133) = 135.

  it("weekly: 25% discount → recurring price is correct", () => {
    // 133 * 0.75 = 99.75 → round5 = 100
    const result = computeResidentialQuote(prop(), NO_ADDONS, "weekly", null);
    expect(result.better.price).toBe(100);
  });

  it("weekly: firstCleanPrice is higher than recurring price", () => {
    // firstClean = 135, recurring = 100
    const result = computeResidentialQuote(prop(), NO_ADDONS, "weekly", null);
    expect(result.better.firstCleanPrice).toBe(135);
    expect(result.better.firstCleanPrice!).toBeGreaterThan(result.better.price);
  });

  it("biweekly: 15% discount → recurring price is correct", () => {
    // 133 * 0.85 = 113.05 → round5 = 115
    const result = computeResidentialQuote(prop(), NO_ADDONS, "biweekly", null);
    expect(result.better.price).toBe(115);
  });

  it("biweekly: firstCleanPrice is higher than recurring price", () => {
    const result = computeResidentialQuote(prop(), NO_ADDONS, "biweekly", null);
    expect(result.better.firstCleanPrice).toBe(135);
    expect(result.better.firstCleanPrice!).toBeGreaterThan(result.better.price);
  });

  it("monthly: 10% discount → recurring price is correct", () => {
    // 133 * 0.90 = 119.7 → round5 = 120
    const result = computeResidentialQuote(prop(), NO_ADDONS, "monthly", null);
    expect(result.better.price).toBe(120);
  });

  it("monthly: firstCleanPrice is higher than recurring price", () => {
    const result = computeResidentialQuote(prop(), NO_ADDONS, "monthly", null);
    expect(result.better.firstCleanPrice).toBe(135);
    expect(result.better.firstCleanPrice!).toBeGreaterThan(result.better.price);
  });

  it("one-time: no discount applied — price equals full firstClean amount", () => {
    // No discount: price = round5(133) = 135
    const result = computeResidentialQuote(prop(), NO_ADDONS, "one-time", null);
    expect(result.better.price).toBe(135);
  });

  it("one-time: firstCleanPrice is null (price field already is the first clean)", () => {
    const result = computeResidentialQuote(prop(), NO_ADDONS, "one-time", null);
    expect(result.better.firstCleanPrice).toBeNull();
    expect(result.good.firstCleanPrice).toBeNull();
    expect(result.best.firstCleanPrice).toBeNull();
  });

  it("recurring: firstCleanPrice is never null", () => {
    for (const freq of ["weekly", "biweekly", "monthly"] as const) {
      const result = computeResidentialQuote(prop(), NO_ADDONS, freq, null);
      expect(result.better.firstCleanPrice).not.toBeNull();
    }
  });

  it("discount is larger for higher-frequency schedules", () => {
    const weekly = computeResidentialQuote(prop(), NO_ADDONS, "weekly", null).better.price;
    const biweekly = computeResidentialQuote(prop(), NO_ADDONS, "biweekly", null).better.price;
    const monthly = computeResidentialQuote(prop(), NO_ADDONS, "monthly", null).better.price;
    expect(weekly).toBeLessThanOrEqual(biweekly);
    expect(biweekly).toBeLessThanOrEqual(monthly);
  });

  it("custom discount rates are applied correctly", () => {
    // Override weekly discount to 50%
    const result = computeResidentialQuote(
      prop(),
      NO_ADDONS,
      "weekly",
      pricing({ frequencyDiscounts: { weekly: 50, biweekly: 15, monthly: 10 } })
    );
    // recurringBase = max(133, 100) = 133
    // recurringCalc = 133 * 0.50 = 66.5 → round5 = 65
    // Note: min ticket enforces floor on recurringBase BEFORE discount, not after
    expect(result.better.price).toBe(65);
  });
});

// ─── ADD-ONS ──────────────────────────────────────────────────────────────────
// Each add-on adds its catalog price to the better (middle) tier.
// Best tier uses its own built-in add-ons; user-selected add-ons do NOT double-count.

describe("Add-ons", () => {
  it("single add-on (insideFridge $25) adds its flat price to better tier", () => {
    // base=133, +25 → 158 → round5 = 160
    const result = computeResidentialQuote(prop(), { insideFridge: true }, "one-time", null);
    expect(result.better.price).toBe(160);
  });

  it("single add-on (insideOven $25) adds its flat price to better tier", () => {
    // base=133, +25 → 158 → round5 = 160
    const result = computeResidentialQuote(prop(), { insideOven: true }, "one-time", null);
    expect(result.better.price).toBe(160);
  });

  it("multiple add-ons stack correctly — insideFridge($25) + insideOven($25) = $50 added", () => {
    // base=133, +50 → 183 → round5 = 185
    const result = computeResidentialQuote(
      prop(),
      { insideFridge: true, insideOven: true },
      "one-time",
      null
    );
    expect(result.better.price).toBe(185);
  });

  it("all add-ons combined produce correct total", () => {
    // better: base=133, +280 (all addons) → 413 → round5 = 415
    const result = computeResidentialQuote(prop(), ALL_ADDONS, "one-time", null);
    expect(result.better.price).toBe(415);
  });

  it("tier-included add-on (insideOven) on best tier is NOT double-counted when user also selects it", () => {
    // best with user insideOven selected = same as best without user selecting it
    // (best uses its own extraAddons, ignores user addons entirely)
    const withAddon = computeResidentialQuote(prop(), { insideOven: true }, "one-time", null);
    const withoutAddon = computeResidentialQuote(prop(), NO_ADDONS, "one-time", null);
    expect(withAddon.best.price).toBe(withoutAddon.best.price);
  });

  it("good tier never includes user-selected add-ons", () => {
    const withAddons = computeResidentialQuote(prop(), ALL_ADDONS, "one-time", null);
    const withoutAddons = computeResidentialQuote(prop(), NO_ADDONS, "one-time", null);
    // good tier ignores user add-ons (includeUserAddOns=false, no extraAddOns)
    expect(withAddons.good.price).toBe(withoutAddons.good.price);
  });

  it("add-on total is reflected in result.addOnPrice", () => {
    const result = computeResidentialQuote(prop(), ALL_ADDONS, "one-time", null);
    expect(result.addOnPrice).toBe(ALL_ADDONS_TOTAL);
  });

  it("no add-ons → addOnPrice is zero", () => {
    const result = computeResidentialQuote(prop(), NO_ADDONS, "one-time", null);
    expect(result.addOnPrice).toBe(0);
  });

  it("custom add-on prices are respected", () => {
    // Override insideFridge to $50 instead of $25
    const result = computeResidentialQuote(
      prop(),
      { insideFridge: true },
      "one-time",
      pricing({ addOnPrices: { ...DEFAULT_ADD_ON_PRICES, insideFridge: 50 } })
    );
    // better: base=133, +50 → 183 → round5 = 185
    expect(result.better.price).toBe(185);
  });
});

// ─── ROUNDING ─────────────────────────────────────────────────────────────────
// All prices round to the nearest $5 via Math.round(v/5)*5
// $142 → $140  |  $143 → $145

describe("Price rounding", () => {
  it("price rounds DOWN — input that produces ~$139 rounds to $140", () => {
    // 1000sqft(85) + 3bed(45) + 0bath + 1halfBath(9) = 139 → round5 = 140
    const result = computeResidentialQuote(
      prop({ sqft: 1000, beds: 3, baths: 0, halfBaths: 1 }),
      NO_ADDONS,
      "one-time",
      null
    );
    expect(result.better.price).toBe(140);
  });

  it("price rounds UP — input that produces ~$143 rounds to $145", () => {
    // 1400sqft(119) + 1bed(15) + 0bath + 1halfBath(9) = 143 → round5 = 145
    const result = computeResidentialQuote(
      prop({ sqft: 1400, beds: 1, baths: 0, halfBaths: 1 }),
      NO_ADDONS,
      "one-time",
      null
    );
    expect(result.better.price).toBe(145);
  });

  it("all output prices are always multiples of $5", () => {
    const inputs = [
      prop({ sqft: 750 }),
      prop({ sqft: 1234, beds: 3, baths: 2 }),
      prop({ sqft: 2700, conditionScore: 5, beds: 4 }),
    ];
    for (const p of inputs) {
      const r = computeResidentialQuote(p, NO_ADDONS, "one-time", null);
      for (const tier of [r.good, r.better, r.best]) {
        expect(tier.price % 5).toBe(0);
        if (tier.firstCleanPrice !== null) {
          expect(tier.firstCleanPrice % 5).toBe(0);
        }
      }
    }
  });

  it("recurring prices also round to nearest $5", () => {
    const r = computeResidentialQuote(prop(), NO_ADDONS, "biweekly", null);
    expect(r.better.price % 5).toBe(0);
  });
});

// ─── PETS ─────────────────────────────────────────────────────────────────────
// petSurcharge = getPetHours(type, shedding) * hourlyRate (default $45/hr)

describe("Pets", () => {
  // Baseline: 1000sqft, 2bed, 1bath, score=7 → base=133, better ×1.0 → 135

  it("no pet — no surcharge applied", () => {
    const result = computeResidentialQuote(prop({ petType: "none" }), NO_ADDONS, "one-time", null);
    expect(result.better.price).toBe(135);
  });

  it("cat (no shedding) — 0.25hr × $45 = $11.25 surcharge", () => {
    // adjusted = 133 + 11.25 = 144.25 → round5 = 145
    const result = computeResidentialQuote(
      prop({ petType: "cat", petShedding: false }),
      NO_ADDONS,
      "one-time",
      null
    );
    expect(result.better.price).toBe(145);
  });

  it("dog (no shedding) — 0.5hr × $45 = $22.50 surcharge", () => {
    // adjusted = 133 + 22.5 = 155.5 → round5 = 155 (Math.round(31.1)*5=31*5=155)
    const result = computeResidentialQuote(
      prop({ petType: "dog", petShedding: false }),
      NO_ADDONS,
      "one-time",
      null
    );
    expect(result.better.price).toBe(155);
  });

  it("pet surcharge increases price relative to no-pet baseline", () => {
    const noPet = computeResidentialQuote(prop({ petType: "none" }), NO_ADDONS, "one-time", null);
    const withCat = computeResidentialQuote(
      prop({ petType: "cat", petShedding: false }),
      NO_ADDONS,
      "one-time",
      null
    );
    const withDog = computeResidentialQuote(
      prop({ petType: "dog", petShedding: false }),
      NO_ADDONS,
      "one-time",
      null
    );
    expect(withCat.better.price).toBeGreaterThan(noPet.better.price);
    expect(withDog.better.price).toBeGreaterThan(noPet.better.price);
  });

  it("multiple pets (no shedding) — higher surcharge than single dog", () => {
    // multiple, !shedding → 0.75hr × $45 = $33.75 surcharge
    // adjusted = 133 + 33.75 = 166.75 → round5 = 165
    const single = computeResidentialQuote(
      prop({ petType: "dog", petShedding: false }),
      NO_ADDONS,
      "one-time",
      null
    );
    const multiple = computeResidentialQuote(
      prop({ petType: "multiple", petShedding: false }),
      NO_ADDONS,
      "one-time",
      null
    );
    expect(multiple.better.price).toBeGreaterThan(single.better.price);
    expect(multiple.better.price).toBe(165);
  });

  it("pet surcharge line item is present in lineItems when pet is selected", () => {
    const result = computeResidentialQuote(
      prop({ petType: "dog", petShedding: false }),
      NO_ADDONS,
      "one-time",
      null
    );
    const petItem = result.better.lineItems.find((li) => li.type === "surcharge" && li.label.includes("Pet"));
    expect(petItem).toBeDefined();
    expect(petItem!.amount).toBe(22.5); // 0.5hr * $45
  });

  it("custom hourlyRate changes pet surcharge amount", () => {
    // hourlyRate $60: cat (0.25hr) = $15 surcharge
    // adjusted = 133 + 15 = 148 → round5 = 150
    const result = computeResidentialQuote(
      prop({ petType: "cat", petShedding: false }),
      NO_ADDONS,
      "one-time",
      pricing({ hourlyRate: 60 })
    );
    expect(result.better.price).toBe(150);
  });
});

// ─── EDGE CASES ───────────────────────────────────────────────────────────────

describe("Edge cases", () => {
  it("zero sqft → returns minimum ticket (minimum enforcement kicks in)", () => {
    // adjusted = 0 + beds*15 + baths*18 only. With 0 beds/baths too → 0.
    const result = computeResidentialQuote(
      prop({ sqft: 0, beds: 0, baths: 0 }),
      NO_ADDONS,
      "one-time",
      null
    );
    expect(result.good.price).toBe(100);
  });

  it("zero sqft → missing_sqft warning is emitted", () => {
    const result = computeResidentialQuote(
      prop({ sqft: 0, beds: 2, baths: 1 }),
      NO_ADDONS,
      "one-time",
      null
    );
    const hasMissingSqft = result.better.warnings.some((w) => w.type === "missing_sqft");
    expect(hasMissingSqft).toBe(true);
  });

  it("negative sqft → still returns minimum ticket (clamped by max)", () => {
    const result = computeResidentialQuote(
      prop({ sqft: -500, beds: 0, baths: 0 }),
      NO_ADDONS,
      "one-time",
      null
    );
    expect(result.good.price).toBeGreaterThanOrEqual(100);
    expect(result.better.price).toBeGreaterThanOrEqual(100);
    expect(result.best.price).toBeGreaterThanOrEqual(100);
  });

  it("all add-ons selected simultaneously — correct total without overflow", () => {
    // better: 133 + 280 = 413 → round5 = 415
    const result = computeResidentialQuote(prop(), ALL_ADDONS, "one-time", null);
    expect(result.better.price).toBe(415);
    expect(Number.isFinite(result.better.price)).toBe(true);
  });

  it("extreme: score 1 + large property + all add-ons → correct total without overflow", () => {
    // 3000sqft, 5bed, 3bath, score=1 (mult=1.7), 5 people (mult=1.2), multiple pets (no shed, 0.75hr)
    // sqftRaw=255, bedRaw=75, bathRaw=54 → base=384
    // petSurcharge = 0.75*45 = 33.75
    // adjusted = 384 * 1.7 * 1.2 + 33.75 = 783.36 + 33.75 = 817.11
    // better: tierBase=817.11, +280 addons → 1097.11 → round5=1095
    const result = computeResidentialQuote(
      prop({ sqft: 3000, beds: 5, baths: 3, conditionScore: 1, peopleCount: 5, petType: "multiple", petShedding: false }),
      ALL_ADDONS,
      "one-time",
      null
    );
    expect(result.better.price).toBe(1095);
    expect(Number.isFinite(result.better.price)).toBe(true);
    expect(Number.isFinite(result.best.price)).toBe(true);
  });

  it("unusually_high warning fires when price exceeds $1,500", () => {
    // Push a custom high rate to trigger the warning
    const result = computeResidentialQuote(
      prop({ sqft: 10000, beds: 10, baths: 8, conditionScore: 1, peopleCount: 6 }),
      ALL_ADDONS,
      "one-time",
      pricing({ pricePerSqft: 200, pricePerBedroom: 50, pricePerBathroom: 50, hourlyRate: 100 })
    );
    const hasHighWarning = result.better.warnings.some((w) => w.type === "unusually_high");
    expect(hasHighWarning).toBe(true);
  });

  it("null pricing settings falls back to defaults cleanly", () => {
    expect(() =>
      computeResidentialQuote(prop(), NO_ADDONS, "one-time", null)
    ).not.toThrow();
  });

  it("lineItems sum approximates the tier price (before rounding)", () => {
    const result = computeResidentialQuote(
      prop({ sqft: 1500, beds: 3, baths: 2 }),
      { insideFridge: true },
      "one-time",
      null
    );
    // Line items are informational — their sum should be in the same ballpark as price
    const lineSum = result.better.lineItems.reduce((s, li) => s + li.amount, 0);
    expect(lineSum).toBeGreaterThan(0);
    // Allow ±$50 tolerance due to rounding and minimum enforcement
    expect(Math.abs(lineSum - result.better.price)).toBeLessThan(50);
  });
});

// ─── LINE ITEMS & APPLIED RULES ──────────────────────────────────────────────

describe("Line items", () => {
  it("sqft line item is present for non-zero sqft", () => {
    const result = computeResidentialQuote(prop(), NO_ADDONS, "one-time", null);
    const sqftItem = result.better.lineItems.find((li) => li.type === "base");
    expect(sqftItem).toBeDefined();
  });

  it("bedroom line item is present when beds > 0", () => {
    const result = computeResidentialQuote(prop({ beds: 3 }), NO_ADDONS, "one-time", null);
    const bedItem = result.better.lineItems.find((li) => li.type === "room" && li.label.includes("Bedroom"));
    expect(bedItem).toBeDefined();
  });

  it("bathroom line item includes half bath label when halfBaths > 0", () => {
    const result = computeResidentialQuote(prop({ halfBaths: 1 }), NO_ADDONS, "one-time", null);
    const bathItem = result.better.lineItems.find((li) => li.label.includes("half"));
    expect(bathItem).toBeDefined();
  });

  it("add-on line items appear in better tier when selected", () => {
    const result = computeResidentialQuote(prop(), { insideFridge: true, dishes: true }, "one-time", null);
    const addonItems = result.better.lineItems.filter((li) => li.type === "addon");
    expect(addonItems.length).toBe(2);
  });

  it("frequency discount appears as negative line item", () => {
    const result = computeResidentialQuote(prop(), NO_ADDONS, "weekly", null);
    const discountItem = result.better.lineItems.find((li) => li.type === "discount");
    expect(discountItem).toBeDefined();
    expect(discountItem!.amount).toBeLessThan(0);
  });

  it("condition surcharge line item present when score < 7", () => {
    const result = computeResidentialQuote(prop({ conditionScore: 4 }), NO_ADDONS, "one-time", null);
    const condItem = result.better.lineItems.find((li) => li.type === "surcharge" && li.label.includes("Condition"));
    expect(condItem).toBeDefined();
    expect(condItem!.amount).toBeGreaterThan(0);
  });

  it("cleanliness credit (discount) line item present when score ≥ 9", () => {
    const result = computeResidentialQuote(prop({ conditionScore: 9 }), NO_ADDONS, "one-time", null);
    const creditItem = result.better.lineItems.find((li) => li.type === "discount");
    expect(creditItem).toBeDefined();
    expect(creditItem!.amount).toBeLessThan(0);
  });
});

// ─── RESULT SHAPE ─────────────────────────────────────────────────────────────

describe("Result shape", () => {
  it("result contains good, better, best, addOnHours, addOnPrice, hourlyRate", () => {
    const result = computeResidentialQuote(prop(), NO_ADDONS, "one-time", null);
    expect(result).toHaveProperty("good");
    expect(result).toHaveProperty("better");
    expect(result).toHaveProperty("best");
    expect(result).toHaveProperty("addOnHours");
    expect(result).toHaveProperty("addOnPrice");
    expect(result).toHaveProperty("hourlyRate");
  });

  it("each tier result has required fields", () => {
    const result = computeResidentialQuote(prop(), NO_ADDONS, "one-time", null);
    for (const tier of [result.good, result.better, result.best]) {
      expect(typeof tier.price).toBe("number");
      expect(Array.isArray(tier.lineItems)).toBe(true);
      expect(Array.isArray(tier.appliedRules)).toBe(true);
      expect(Array.isArray(tier.warnings)).toBe(true);
      expect(typeof tier.totalHours).toBe("number");
    }
  });

  it("serviceTypeId matches the configured option IDs", () => {
    const result = computeResidentialQuote(prop(), NO_ADDONS, "one-time", null);
    expect(result.good.serviceTypeId).toBe(DEFAULT_PRICING.goodOptionId);
    expect(result.better.serviceTypeId).toBe(DEFAULT_PRICING.betterOptionId);
    expect(result.best.serviceTypeId).toBe(DEFAULT_PRICING.bestOptionId);
  });

  it("addOnHours reflects selected add-on hours", () => {
    const result = computeResidentialQuote(prop(), { insideFridge: true }, "one-time", null);
    // insideFridge = 0.5 hours
    expect(result.addOnHours).toBe(0.5);
  });
});

// ─── COMMERCIAL ENGINE: LABOR ESTIMATE ────────────────────────────────────────

import {
  computeCommercialLaborEstimate,
  computeCommercialQuote,
  FREQUENCY_VISITS_PER_MONTH,
  type CommercialWalkthrough,
  type CommercialLaborEstimate,
  type CommercialPricingConfig,
} from "./pricingEngine";

function commercialWalkthrough(overrides: Partial<CommercialWalkthrough> = {}): CommercialWalkthrough {
  return {
    facilityType: "Office",
    totalSqFt: 5000,
    floors: 1,
    bathroomCount: 2,
    breakroomCount: 1,
    conferenceRoomCount: 1,
    privateOfficeCount: 0,
    openAreaCount: 2,
    entryLobbyCount: 1,
    trashPointCount: 2,
    carpetPercent: 0,
    hardFloorPercent: 100,
    glassLevel: "None",
    highTouchFocus: false,
    afterHoursRequired: false,
    suppliesByClient: false,
    restroomConsumablesIncluded: false,
    frequency: "1x",
    preferredDays: "Mon/Wed",
    preferredTimeWindow: "evening",
    accessConstraints: "",
    notes: "",
    ...overrides,
  };
}

function defaultConfig(overrides: Partial<CommercialPricingConfig> = {}): CommercialPricingConfig {
  return {
    hourlyRate: 50,
    overheadPct: 20,
    targetMarginPct: 30,
    suppliesSurcharge: 25,
    suppliesSurchargeType: "fixed",
    roundingRule: "none",
    ...overrides,
  };
}

function laborEst(overrides: Partial<CommercialLaborEstimate> = {}): CommercialLaborEstimate {
  return {
    rawMinutes: 192,
    rawHours: 3.2,
    recommendedCleaners: 2,
    overrideHours: null,
    ...overrides,
  };
}

describe("Commercial labor estimate", () => {
  it("produces rawMinutes, rawHours, and recommendedCleaners for a standard office", () => {
    // 5000sqft office: (5000/1000)*25=125, 2bath*15=30, 1break*10=10, 2trash*3=6,
    // 1conf*5=5, 0priv, 2open*8=16, 1lobby*10=10 → total=202
    // glass=None(+0), highTouch=false, floor-type: 0*1.1+1.0*0.95=0.95
    // 202*0.95=191.9 → 192, hours=3.2, cleaners=ceil(192/120)=2
    const est = computeCommercialLaborEstimate(commercialWalkthrough());
    expect(est.rawMinutes).toBe(192);
    expect(est.rawHours).toBe(3.2);
    expect(est.recommendedCleaners).toBe(2);
  });

  it("highTouchFocus adds 15 minutes to raw estimate", () => {
    const base = computeCommercialLaborEstimate(commercialWalkthrough({ highTouchFocus: false }));
    const high = computeCommercialLaborEstimate(commercialWalkthrough({ highTouchFocus: true }));
    // 15 minutes added before floor-type scaling, so delta ≈ 15 * 0.95 ≈ 14
    expect(high.rawMinutes).toBeGreaterThan(base.rawMinutes);
  });

  it("glass level None → 0 extra minutes vs Some → +10 vs Lots → +25", () => {
    const none = computeCommercialLaborEstimate(commercialWalkthrough({ glassLevel: "None" }));
    const some = computeCommercialLaborEstimate(commercialWalkthrough({ glassLevel: "Some" }));
    const lots = computeCommercialLaborEstimate(commercialWalkthrough({ glassLevel: "Lots" }));
    expect(some.rawMinutes).toBeGreaterThan(none.rawMinutes);
    expect(lots.rawMinutes).toBeGreaterThan(some.rawMinutes);
  });

  it("multiple floors adds a per-floor multiplier (5% per extra floor)", () => {
    const one = computeCommercialLaborEstimate(commercialWalkthrough({ floors: 1 }));
    const two = computeCommercialLaborEstimate(commercialWalkthrough({ floors: 2 }));
    const three = computeCommercialLaborEstimate(commercialWalkthrough({ floors: 3 }));
    expect(two.rawMinutes).toBeGreaterThan(one.rawMinutes);
    expect(three.rawMinutes).toBeGreaterThan(two.rawMinutes);
  });

  it("carpet-heavy facility takes more time than hard-floor facility", () => {
    const hard = computeCommercialLaborEstimate(
      commercialWalkthrough({ carpetPercent: 0, hardFloorPercent: 100 })
    );
    const carpet = computeCommercialLaborEstimate(
      commercialWalkthrough({ carpetPercent: 100, hardFloorPercent: 0 })
    );
    expect(carpet.rawMinutes).toBeGreaterThan(hard.rawMinutes);
  });

  it("recommendedCleaners is at least 1 for any input", () => {
    const tiny = computeCommercialLaborEstimate(
      commercialWalkthrough({ totalSqFt: 100, bathroomCount: 0, breakroomCount: 0,
        trashPointCount: 0, conferenceRoomCount: 0, privateOfficeCount: 0,
        openAreaCount: 0, entryLobbyCount: 0 })
    );
    expect(tiny.recommendedCleaners).toBeGreaterThanOrEqual(1);
  });

  it("all facility types produce a positive rawMinutes value", () => {
    const facilityTypes = ["Office", "Retail", "Medical", "Gym", "School", "Warehouse", "Restaurant", "Other"] as const;
    for (const ft of facilityTypes) {
      const est = computeCommercialLaborEstimate(commercialWalkthrough({ facilityType: ft }));
      expect(est.rawMinutes).toBeGreaterThan(0);
    }
  });

  it("private offices, open areas, conference rooms each add time", () => {
    const base = computeCommercialLaborEstimate(
      commercialWalkthrough({ privateOfficeCount: 0, openAreaCount: 0, conferenceRoomCount: 0 })
    );
    const withRooms = computeCommercialLaborEstimate(
      commercialWalkthrough({ privateOfficeCount: 5, openAreaCount: 3, conferenceRoomCount: 2 })
    );
    expect(withRooms.rawMinutes).toBeGreaterThan(base.rawMinutes);
  });
});

// ─── COMMERCIAL ENGINE: QUOTE ─────────────────────────────────────────────────

describe("Commercial quote", () => {
  it("computes perVisit, monthly, annual correctly — fixed supplies, no rounding", () => {
    // laborCost = 3.2 * 50 = 160
    // overhead = 160 * 0.20 = 32 → baseCost = 192
    // supplies = 25 (fixed)
    // totalBeforeMargin = 217
    // marginMultiplier = 1/(1-0.30) = 10/7
    // rawPerVisit = 217 * 10/7 = 310.0
    // perVisit = 310.00, monthly(1x=4visits) = 1240, annual = 14880
    const result = computeCommercialQuote(laborEst(), defaultConfig(), "1x");
    expect(result.perVisit).toBeCloseTo(310.0, 1);
    expect(result.monthly).toBeCloseTo(1240.0, 1);
    expect(result.annual).toBeCloseTo(14880.0, 1);
  });

  it("percent supplies surcharge applies to baseCost", () => {
    // suppliesSurcharge=10%, suppliesSurchargeType="percent"
    // baseCost=192, suppliesAmount=192*0.10=19.2
    const resultFixed = computeCommercialQuote(laborEst(), defaultConfig({ suppliesSurcharge: 25, suppliesSurchargeType: "fixed" }), "1x");
    const resultPct = computeCommercialQuote(laborEst(), defaultConfig({ suppliesSurcharge: 10, suppliesSurchargeType: "percent" }), "1x");
    // Percent supplies = 19.2, fixed = 25; percent version should cost less here
    expect(resultPct.perVisit).toBeLessThan(resultFixed.perVisit);
  });

  it("override hours are used instead of rawHours when set", () => {
    const withOverride = computeCommercialQuote(
      laborEst({ rawHours: 3.2, overrideHours: 5.0 }),
      defaultConfig(),
      "1x"
    );
    const without = computeCommercialQuote(
      laborEst({ rawHours: 3.2, overrideHours: null }),
      defaultConfig(),
      "1x"
    );
    // Override 5h > raw 3.2h → higher cost
    expect(withOverride.perVisit).toBeGreaterThan(without.perVisit);
    expect(withOverride.hours).toBe(5.0);
  });

  it("rounding rule 'none' — returns decimal price", () => {
    const result = computeCommercialQuote(
      laborEst({ rawHours: 1.5 }),
      defaultConfig({ roundingRule: "none" }),
      "1x"
    );
    expect(typeof result.perVisit).toBe("number");
  });

  it("rounding rule '5' — rounds perVisit up to nearest $5", () => {
    const result = computeCommercialQuote(
      laborEst({ rawHours: 2.0 }),
      defaultConfig({ roundingRule: "5" }),
      "1x"
    );
    expect(result.perVisit % 5).toBe(0);
  });

  it("rounding rule '10' — rounds perVisit up to nearest $10", () => {
    const result = computeCommercialQuote(
      laborEst({ rawHours: 2.0 }),
      defaultConfig({ roundingRule: "10" }),
      "1x"
    );
    expect(result.perVisit % 10).toBe(0);
  });

  it("rounding rule '25' — rounds perVisit up to nearest $25", () => {
    const result = computeCommercialQuote(
      laborEst({ rawHours: 2.0 }),
      defaultConfig({ roundingRule: "25" }),
      "1x"
    );
    expect(result.perVisit % 25).toBe(0);
  });

  it("visitsPerMonth matches FREQUENCY_VISITS_PER_MONTH table", () => {
    const frequencies = ["1x", "2x", "3x", "5x", "daily", "custom"] as const;
    for (const freq of frequencies) {
      const result = computeCommercialQuote(laborEst(), defaultConfig(), freq);
      expect(result.visitsPerMonth).toBe(FREQUENCY_VISITS_PER_MONTH[freq]);
    }
  });

  it("higher frequency produces higher monthly price", () => {
    const monthly1x = computeCommercialQuote(laborEst(), defaultConfig(), "1x").monthly;
    const monthly5x = computeCommercialQuote(laborEst(), defaultConfig(), "5x").monthly;
    expect(monthly5x).toBeGreaterThan(monthly1x);
  });

  it("result contains all required fields", () => {
    const result = computeCommercialQuote(laborEst(), defaultConfig(), "1x");
    expect(result).toHaveProperty("perVisit");
    expect(result).toHaveProperty("monthly");
    expect(result).toHaveProperty("annual");
    expect(result).toHaveProperty("hours");
    expect(result).toHaveProperty("recommendedCleaners");
    expect(result).toHaveProperty("visitsPerMonth");
    expect(result).toHaveProperty("lineItems");
    expect(result).toHaveProperty("appliedRules");
    expect(result).toHaveProperty("warnings");
    expect(result).toHaveProperty("laborCost");
    expect(result).toHaveProperty("baseCost");
  });

  it("line items include labor, overhead, supplies, and margin", () => {
    const result = computeCommercialQuote(laborEst(), defaultConfig(), "1x");
    const types = result.lineItems.map((li) => li.type);
    expect(types).toContain("labor");
    expect(types).toContain("overhead");
    expect(types).toContain("supplies");
    expect(types).toContain("margin");
  });

  it("after_hours warning fires when afterHoursRequired is true", () => {
    const result = computeCommercialQuote(
      laborEst(),
      defaultConfig(),
      "1x",
      commercialWalkthrough({ afterHoursRequired: true })
    );
    const warn = result.warnings.find((w) => w.type === "after_hours");
    expect(warn).toBeDefined();
  });

  it("after_hours applied rule fires when afterHoursRequired is true", () => {
    const result = computeCommercialQuote(
      laborEst(),
      defaultConfig(),
      "1x",
      commercialWalkthrough({ afterHoursRequired: true })
    );
    expect(result.appliedRules.some((r) => r.label.includes("After-hours"))).toBe(true);
  });

  it("high_touch applied rule fires when highTouchFocus is true in walkthrough", () => {
    const result = computeCommercialQuote(
      laborEst(),
      defaultConfig(),
      "1x",
      commercialWalkthrough({ highTouchFocus: true })
    );
    expect(result.appliedRules.some((r) => r.label.includes("High-touch"))).toBe(true);
  });

  it("low_sqft warning fires for very small square footage", () => {
    const result = computeCommercialQuote(
      laborEst(),
      defaultConfig(),
      "1x",
      commercialWalkthrough({ totalSqFt: 200 })
    );
    const warn = result.warnings.find((w) => w.type === "low_sqft");
    expect(warn).toBeDefined();
  });

  it("very_low_estimate warning fires when perVisit < $100", () => {
    // Use tiny hours and low rate to force perVisit below $100
    const result = computeCommercialQuote(
      laborEst({ rawHours: 0.5, overrideHours: null }),
      defaultConfig({ hourlyRate: 10, overheadPct: 0, targetMarginPct: 0, suppliesSurcharge: 0 }),
      "1x"
    );
    const warn = result.warnings.find((w) => w.type === "very_low_estimate");
    expect(warn).toBeDefined();
  });

  it("high margin applied rule fires when targetMarginPct >= 40", () => {
    const result = computeCommercialQuote(
      laborEst(),
      defaultConfig({ targetMarginPct: 45 }),
      "1x"
    );
    expect(result.appliedRules.some((r) => r.label.includes("margin"))).toBe(true);
  });

  it("override hours applied rule fires when overrideHours is set", () => {
    const result = computeCommercialQuote(
      laborEst({ overrideHours: 4.0 }),
      defaultConfig(),
      "1x"
    );
    expect(result.appliedRules.some((r) => r.label.includes("overridden"))).toBe(true);
  });
});

// ─── REMAINING RESIDENTIAL EDGE CASES ─────────────────────────────────────────

describe("Residential — remaining edge cases", () => {
  it("unknown petType falls back to zero surcharge (no match in getPetHours)", () => {
    // petType='fish' doesn't match any branch → 0 hours → no surcharge
    const noPet = computeResidentialQuote(prop({ petType: "none" }), NO_ADDONS, "one-time", null);
    const fish = computeResidentialQuote(
      prop({ petType: "fish" as any }),
      NO_ADDONS,
      "one-time",
      null
    );
    expect(fish.better.price).toBe(noPet.better.price);
  });

  it("best tier firstCleanPrice gap enforced when user add-ons push better above best", () => {
    // Tiny property: tierBase ≈ 0 for both tiers.
    // better gets all user add-ons ($280) → better.firstCleanPrice = 280
    // best only gets extraAddons ($175) → best.firstCleanCalc = 175
    // 175 ≤ 280 → gap rule bumps best.firstCleanPrice to round5(280+20) = 300
    const result = computeResidentialQuote(
      prop({ sqft: 0, beds: 0, baths: 0 }),
      ALL_ADDONS,
      "biweekly",
      null
    );
    if (result.best.firstCleanPrice !== null && result.better.firstCleanPrice !== null) {
      expect(result.best.firstCleanPrice).toBeGreaterThanOrEqual(result.better.firstCleanPrice + 20);
    }
  });
});

// Cover the high_estimate warning (perVisit > $5000)
it("high_estimate warning fires when perVisit exceeds $5000", () => {
  const result = computeCommercialQuote(
    laborEst({ rawHours: 80, overrideHours: null }),
    defaultConfig({ hourlyRate: 100, overheadPct: 30, targetMarginPct: 40, suppliesSurcharge: 500, suppliesSurchargeType: "fixed" }),
    "1x"
  );
  const warn = result.warnings.find((w) => w.type === "high_estimate");
  expect(warn).toBeDefined();
});
