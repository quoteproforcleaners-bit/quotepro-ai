// ─── Shared Pricing Engine ────────────────────────────────────────────────────
// Single source of truth for both residential and commercial quote calculation.
// Both the live preview and the final save use this module.
// ─────────────────────────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════════════════════
// RESIDENTIAL ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

export interface ResidentialProperty {
  beds: number;
  halfBaths: number;
  baths: number;
  sqft: number;
  homeType: string;
  conditionScore: number;
  peopleCount: number;
  petType: string;
  petShedding: boolean;
}

export interface PricingSettings {
  // ── Flat-rate residential base pricing ──────────────────────────────────
  // These three values drive the live preview and all residential quotes.
  // Defaults: $85/1000sqft · $15/bedroom · $18/bathroom
  pricePerSqft: number;        // dollars per 1,000 sq ft (default 85)
  pricePerBedroom: number;     // dollars per bedroom (default 15)
  pricePerBathroom: number;    // dollars per full bathroom (default 18)
  // ── Other pricing config ─────────────────────────────────────────────────
  hourlyRate: number;          // used for pet surcharge & labor-hour estimate display
  minimumTicket: number;
  serviceTypes: Array<{ id: string; name: string; multiplier: number; scope: string }>;
  goodOptionId: string;
  betterOptionId: string;
  bestOptionId: string;
  addOnPrices: Record<string, number>;
  frequencyDiscounts: { weekly: number; biweekly: number; monthly: number };
  taxRate?: number;
}

export interface LineItem {
  label: string;
  amount: number;
  /** positive = adds to total, negative = reduces total */
  type: "base" | "room" | "addon" | "surcharge" | "discount" | "minimum" | "adjustment";
}

export interface AppliedRule {
  label: string;
  impact: number; // dollar delta
}

export interface Warning {
  type: "below_minimum" | "low_sqft" | "missing_sqft" | "unusually_high";
  message: string;
}

export interface ResidentialTierResult {
  price: number;
  firstCleanPrice: number | null;
  name: string;
  scope: string;
  serviceTypeId: string;
  totalHours: number;
  lineItems: LineItem[];
  appliedRules: AppliedRule[];
  warnings: Warning[];
}

export interface ResidentialQuoteResult {
  good: ResidentialTierResult;
  better: ResidentialTierResult;
  best: ResidentialTierResult;
  baseHours: number;
  addOnHours: number;
  addOnPrice: number;
  hourlyRate: number;
}

// ─── Add-on catalog ──────────────────────────────────────────────────────────

export const ADD_ON_OPTIONS = [
  { key: "insideFridge",      label: "Inside Fridge",       hours: 0.5 },
  { key: "insideOven",        label: "Inside Oven",          hours: 0.5 },
  { key: "insideCabinets",    label: "Inside Cabinets",      hours: 1.0 },
  { key: "interiorWindows",   label: "Interior Windows",     hours: 1.0 },
  { key: "blindsDetail",      label: "Blinds Detail",        hours: 1.0 },
  { key: "baseboardsDetail",  label: "Baseboards Detail",    hours: 1.0 },
  { key: "laundryFoldOnly",   label: "Laundry (Fold Only)",  hours: 0.5 },
  { key: "dishes",            label: "Dishes",               hours: 0.5 },
  { key: "organizationTidy",  label: "Organization & Tidy",  hours: 1.0 },
];

export const DEFAULT_ADD_ON_PRICES: Record<string, number> = {
  insideFridge: 25, insideOven: 25, insideCabinets: 40,
  interiorWindows: 40, blindsDetail: 35, baseboardsDetail: 35,
  laundryFoldOnly: 20, dishes: 15, organizationTidy: 45,
};

// ─── Pure helper functions ────────────────────────────────────────────────────

function getConditionMultiplier(score: number): number {
  if (score >= 9) return 0.9;
  if (score >= 7) return 1.0;
  if (score >= 5) return 1.2;
  if (score >= 3) return 1.4;
  return 1.7;
}

function getPeopleMultiplier(count: number): number {
  if (count <= 2) return 1.0;
  if (count <= 4) return 1.1;
  return 1.2;
}

function getPetHours(petType: string, shedding: boolean): number {
  if (petType === "none") return 0;
  if (petType === "cat" && !shedding) return 0.25;
  if (petType === "dog" || shedding) return 0.5;
  if (petType === "multiple") return shedding ? 1.0 : 0.75;
  return 0;
}

function roundToNearest5(v: number): number { return Math.round(v / 5) * 5; }
function roundHours(h: number): number { return Math.round(h * 2) / 2; }

// Minutes of labor per 1,000 sqft, by service type
function getMinsPer1kSqft(typeId: string): number {
  switch (typeId) {
    case "touch-up":          return 30;
    case "standard":          return 40;
    case "deep-clean":        return 60;
    case "move-in-out":       return 75;
    case "post-construction": return 90;
    default:                  return 40; // fall back to standard rate
  }
}

function getFreqDiscount(freq: string, discounts: { weekly: number; biweekly: number; monthly: number }): number {
  if (freq === "weekly") return discounts.weekly / 100;
  if (freq === "biweekly") return discounts.biweekly / 100;
  if (freq === "monthly") return discounts.monthly / 100;
  return 0;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_PRICING: PricingSettings = {
  pricePerSqft: 85,
  pricePerBedroom: 15,
  pricePerBathroom: 18,
  hourlyRate: 45,
  minimumTicket: 100,
  serviceTypes: [
    { id: "touch-up",   name: "Touch Up",       multiplier: 0.75, scope: "Quick surface cleaning" },
    { id: "standard",   name: "Standard Clean",  multiplier: 1.0,  scope: "Full cleaning of all rooms" },
    { id: "deep-clean", name: "Deep Clean",      multiplier: 1.5,  scope: "Thorough deep cleaning" },
  ],
  goodOptionId: "touch-up",
  betterOptionId: "standard",
  bestOptionId: "deep-clean",
  addOnPrices: DEFAULT_ADD_ON_PRICES,
  frequencyDiscounts: { weekly: 25, biweekly: 15, monthly: 10 },
};

// ─── Main residential calculator ─────────────────────────────────────────────
//
// Pricing contract (residential):
//   basePrice  = (sqft / 1000) × pricePerSqft
//              + beds          × pricePerBedroom
//              + baths         × pricePerBathroom
//              + halfBaths     × (pricePerBathroom / 2)
//   adjusted   = basePrice × conditionMultiplier × peopleMultiplier + petSurcharge
//   tierPrice  = adjusted  × serviceTypeMultiplier
//   addOns     = flat add-on catalog prices
//   firstClean = max(tierPrice + addOns, minimumTicket), rounded to nearest $5
//   recurring  = max(tierPrice, minimumTicket) × (1 − freqDiscount), rounded to $5
//   price      = firstClean  (one-time)  |  recurring  (subscription)
//
// pricePerSqft / pricePerBedroom / pricePerBathroom are stored in pricing settings
// and editable by the software user in Settings → Pricing.
//
function calcTier(
  typeId: string,
  includeUserAddOns: boolean,
  property: ResidentialProperty,
  addOns: Record<string, boolean>,
  frequency: string,
  pricing: PricingSettings,
  extraAddOns?: Record<string, boolean>
): ResidentialTierResult {
  // ── Config ────────────────────────────────────────────────────────────────
  const pricePerSqft    = pricing.pricePerSqft    ?? 85;
  const pricePerBedroom = pricing.pricePerBedroom  ?? 15;
  const pricePerBathroom = pricing.pricePerBathroom ?? 18;
  const hourlyRate      = pricing.hourlyRate       ?? 45;
  const minimumTicket   = pricing.minimumTicket    ?? 100;
  const serviceTypes    = pricing.serviceTypes     ?? [];
  const addOnPrices     = { ...DEFAULT_ADD_ON_PRICES, ...(pricing.addOnPrices ?? {}) };
  const freqDiscounts   = pricing.frequencyDiscounts ?? { weekly: 25, biweekly: 15, monthly: 10 };

  const st = serviceTypes.find(s => s.id === typeId)
    ?? { id: typeId, name: typeId, multiplier: 1.0, scope: "" };
  const tierAddOns = includeUserAddOns ? addOns : (extraAddOns ?? {});

  // ── Flat-rate base ────────────────────────────────────────────────────────
  const sqftRaw  = (property.sqft / 1000) * pricePerSqft;
  const bedRaw   = property.beds * pricePerBedroom;
  const bathRaw  = property.baths * pricePerBathroom
                 + property.halfBaths * (pricePerBathroom / 2);

  const condMult   = getConditionMultiplier(property.conditionScore);
  const peopleMult = getPeopleMultiplier(property.peopleCount);
  const petHrs     = getPetHours(property.petType, property.petShedding);
  const petSurcharge = petHrs * hourlyRate; // pet time billed at hourly rate

  // adjusted base before service-tier multiplier
  const adjustedBase = (sqftRaw + bedRaw + bathRaw) * condMult * peopleMult + petSurcharge;

  // ── Add-ons ───────────────────────────────────────────────────────────────
  let tierAddOnPrice = 0;
  for (const opt of ADD_ON_OPTIONS) {
    if ((tierAddOns as any)[opt.key]) {
      tierAddOnPrice += addOnPrices[opt.key] ?? 0;
    }
  }

  const canDiscount  = st.id !== "move-in-out" && st.id !== "post-construction";
  const discFraction = canDiscount ? getFreqDiscount(frequency, freqDiscounts) : 0;
  const isOneTime    = frequency === "one-time";

  // ── Price computation ─────────────────────────────────────────────────────
  const tierBase = adjustedBase * st.multiplier;

  // First clean = full tier base + add-ons, no frequency discount
  const firstCleanCalc    = tierBase + tierAddOnPrice;
  const firstCleanBelowMin = firstCleanCalc < minimumTicket;
  const firstCleanPrice   = roundToNearest5(Math.max(firstCleanCalc, minimumTicket));

  // Recurring = tier base only, with frequency discount (no first-clean add-ons)
  const recurringBase      = Math.max(tierBase, minimumTicket);
  const recurringBelowMin  = tierBase < minimumTicket;
  let discountAmount        = 0;
  let recurringCalc         = recurringBase;
  if (discFraction > 0) {
    discountAmount = recurringBase * discFraction;
    recurringCalc  = recurringBase * (1 - discFraction);
  }
  const recurringPrice = roundToNearest5(recurringCalc);

  const price      = isOneTime ? firstCleanPrice : recurringPrice;
  // Estimated hours: sqft-based (minutes per 1k sqft by service type)
  const totalHours = property.sqft > 0
    ? roundHours((property.sqft / 1000) * getMinsPer1kSqft(st.id) / 60)
    : 0;

  // ── Line items (amounts shown after tier multiplier — sum ≈ pre-minimum total) ─
  const lineItems: LineItem[]     = [];
  const appliedRules: AppliedRule[] = [];
  const warnings: Warning[]       = [];

  // Square footage
  if (property.sqft > 0) {
    lineItems.push({
      label:  `Square footage (${property.sqft.toLocaleString()} sqft × $${pricePerSqft}/1k)`,
      amount: sqftRaw * condMult * peopleMult * st.multiplier,
      type:   "base",
    });
  } else {
    warnings.push({ type: "missing_sqft", message: "Enter square footage for accurate pricing." });
  }

  // Bedrooms
  if (bedRaw > 0) {
    lineItems.push({
      label:  `Bedrooms (${property.beds} × $${pricePerBedroom})`,
      amount: bedRaw * condMult * peopleMult * st.multiplier,
      type:   "room",
    });
  }

  // Bathrooms
  if (bathRaw > 0) {
    const bathLabel = property.halfBaths > 0
      ? `Bathrooms (${property.baths} full, ${property.halfBaths} half × $${pricePerBathroom})`
      : `Bathrooms (${property.baths} × $${pricePerBathroom})`;
    lineItems.push({ label: bathLabel, amount: bathRaw * condMult * peopleMult * st.multiplier, type: "room" });
  }

  // Condition surcharge / credit
  if (condMult !== 1.0) {
    const baseAt1x   = (sqftRaw + bedRaw + bathRaw) * peopleMult * st.multiplier;
    const condDelta  = baseAt1x * condMult - baseAt1x;
    const condLabel  = condMult > 1.0
      ? `Condition surcharge (score ${property.conditionScore}/10)`
      : `Cleanliness credit (score ${property.conditionScore}/10)`;
    lineItems.push({ label: condLabel, amount: condDelta, type: condDelta > 0 ? "surcharge" : "discount" });
    if (condMult > 1.0) {
      appliedRules.push({ label: `+${Math.round((condMult - 1) * 100)}% condition adjustment`, impact: condDelta });
    }
  }

  // People surcharge
  if (peopleMult > 1.0) {
    const baseAt1person = (sqftRaw + bedRaw + bathRaw) * condMult * st.multiplier;
    const peopleDelta   = baseAt1person * peopleMult - baseAt1person;
    lineItems.push({ label: `Occupancy surcharge (${property.peopleCount} residents)`, amount: peopleDelta, type: "surcharge" });
  }

  // Pet surcharge
  if (petSurcharge > 0) {
    lineItems.push({
      label:  `Pet surcharge (${property.petType}${property.petShedding ? ", shedding" : ""})`,
      amount: petSurcharge,
      type:   "surcharge",
    });
    appliedRules.push({ label: `Pet surcharge applied (${property.petType})`, impact: petSurcharge });
  }

  // Service tier multiplier (informational in applied rules)
  if (st.multiplier !== 1.0) {
    const baseAt1x = adjustedBase - petSurcharge; // ex-pet base
    const multDelta = baseAt1x * (st.multiplier - 1.0);
    appliedRules.push({ label: `${st.name} level (×${st.multiplier})`, impact: multDelta });
  }

  // Add-on items
  for (const opt of ADD_ON_OPTIONS) {
    if ((tierAddOns as any)[opt.key]) {
      lineItems.push({ label: opt.label, amount: addOnPrices[opt.key] ?? 0, type: "addon" });
    }
  }

  // Frequency discount
  if (discountAmount > 0) {
    const freqLabel = frequency === "weekly"   ? `Weekly discount (${freqDiscounts.weekly}%)`
      : frequency === "biweekly" ? `Biweekly discount (${freqDiscounts.biweekly}%)`
      :                            `Monthly discount (${freqDiscounts.monthly}%)`;
    lineItems.push({ label: freqLabel, amount: -discountAmount, type: "discount" });
    appliedRules.push({ label: freqLabel, impact: -discountAmount });
  }

  // Minimum ticket
  if (firstCleanBelowMin || recurringBelowMin) {
    appliedRules.push({ label: `Minimum job price applied ($${minimumTicket})`, impact: 0 });
    warnings.push({ type: "below_minimum", message: `Quote was below minimum ticket ($${minimumTicket}) — minimum applied.` });
  }

  // Unusually high
  if (price > 1500) {
    warnings.push({ type: "unusually_high", message: "This quote is above $1,500 — double-check your inputs." });
  }

  return {
    price,
    firstCleanPrice: isOneTime ? null : firstCleanPrice,
    name: st.name, scope: st.scope, serviceTypeId: st.id,
    totalHours, lineItems, appliedRules, warnings,
  };
}

export function computeResidentialQuote(
  property: ResidentialProperty,
  addOns: Record<string, boolean>,
  frequency: string,
  pricing: PricingSettings | null
): ResidentialQuoteResult {
  // Merge caller settings with defaults so missing fields always have values
  const p: PricingSettings = {
    ...DEFAULT_PRICING,
    ...(pricing ?? {}),
    // Ensure per-unit rates fall back to defaults if not set
    pricePerSqft:    (pricing as any)?.pricePerSqft    ?? DEFAULT_PRICING.pricePerSqft,
    pricePerBedroom: (pricing as any)?.pricePerBedroom  ?? DEFAULT_PRICING.pricePerBedroom,
    pricePerBathroom:(pricing as any)?.pricePerBathroom ?? DEFAULT_PRICING.pricePerBathroom,
  };

  let good   = calcTier(p.goodOptionId,   false, property, addOns, frequency, p);
  let better = calcTier(p.betterOptionId,  true,  property, addOns, frequency, p);
  let best   = calcTier(p.bestOptionId,   false, property, addOns, frequency, p, {
    insideOven: true, insideCabinets: true, interiorWindows: true,
    baseboardsDetail: true, blindsDetail: true,
  });

  // ── Enforce $20 minimum gap between tiers so minimum ticket never collapses them ──
  const TIER_DELTA = 20;
  if (better.price <= good.price) {
    better = { ...better, price: roundToNearest5(good.price + TIER_DELTA) };
  }
  if (best.price <= better.price) {
    best = { ...best, price: roundToNearest5(better.price + TIER_DELTA) };
  }
  // Also enforce gap on firstCleanPrice (displayed separately on recurring quotes)
  if (better.firstCleanPrice !== null && good.firstCleanPrice !== null
      && better.firstCleanPrice <= good.firstCleanPrice) {
    better = { ...better, firstCleanPrice: roundToNearest5(good.firstCleanPrice + TIER_DELTA) };
  }
  if (best.firstCleanPrice !== null && better.firstCleanPrice !== null
      && best.firstCleanPrice <= better.firstCleanPrice) {
    best = { ...best, firstCleanPrice: roundToNearest5(better.firstCleanPrice + TIER_DELTA) };
  }

  // Summary add-on totals for the parent result
  const addOnPricesMap = { ...DEFAULT_ADD_ON_PRICES, ...(p.addOnPrices ?? {}) };
  let addOnHours = 0; let addOnPrice = 0;
  for (const opt of ADD_ON_OPTIONS) {
    if (addOns[opt.key]) {
      addOnHours += opt.hours;
      addOnPrice += addOnPricesMap[opt.key] ?? 0;
    }
  }

  // Base labor for the "better" (standard) tier, sqft-based
  const baseHours = property.sqft > 0
    ? roundHours((property.sqft / 1000) * getMinsPer1kSqft(p.betterOptionId ?? "standard") / 60)
    : 0;

  return { good, better, best, baseHours, addOnHours, addOnPrice, hourlyRate: p.hourlyRate ?? 45 };
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMMERCIAL ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

export type FacilityType = "Office" | "Retail" | "Medical" | "Gym" | "School" | "Warehouse" | "Restaurant" | "Other";
export type GlassLevel = "None" | "Some" | "Lots";
export type CommercialFrequency = "1x" | "2x" | "3x" | "5x" | "daily" | "custom";
export type RoundingRule = "none" | "5" | "10" | "25";
export type SuppliesSurchargeType = "fixed" | "percent";

export interface CommercialWalkthrough {
  facilityType: FacilityType;
  totalSqFt: number;
  floors: number;
  bathroomCount: number;
  breakroomCount: number;
  conferenceRoomCount: number;
  privateOfficeCount: number;
  openAreaCount: number;
  entryLobbyCount: number;
  trashPointCount: number;
  carpetPercent: number;
  hardFloorPercent: number;
  glassLevel: GlassLevel;
  highTouchFocus: boolean;
  afterHoursRequired: boolean;
  suppliesByClient: boolean;
  restroomConsumablesIncluded: boolean;
  frequency: CommercialFrequency;
  preferredDays: string;
  preferredTimeWindow: string;
  accessConstraints: string;
  notes: string;
}

export interface CommercialLaborEstimate {
  rawMinutes: number;
  rawHours: number;
  recommendedCleaners: number;
  overrideHours: number | null;
}

export interface CommercialPricingConfig {
  hourlyRate: number;
  overheadPct: number;
  targetMarginPct: number;
  suppliesSurcharge: number;
  suppliesSurchargeType: SuppliesSurchargeType;
  roundingRule: RoundingRule;
}

export interface CommercialLineItem {
  label: string;
  amount: number;
  type: "labor" | "overhead" | "supplies" | "margin" | "surcharge" | "adjustment";
}

export interface CommercialAppliedRule {
  label: string;
  impact: number;
}

export interface CommercialWarning {
  type: "low_sqft" | "very_low_estimate" | "high_estimate" | "after_hours";
  message: string;
}

export interface CommercialQuoteResult {
  perVisit: number;
  monthly: number;
  annual: number;
  hours: number;
  recommendedCleaners: number;
  visitsPerMonth: number;
  lineItems: CommercialLineItem[];
  appliedRules: CommercialAppliedRule[];
  warnings: CommercialWarning[];
  laborCost: number;
  baseCost: number;
}

const BASE_MINUTES_PER_1000_SQFT: Record<FacilityType, number> = {
  Office: 25, Retail: 20, Medical: 35, Gym: 30,
  School: 28, Warehouse: 15, Restaurant: 40, Other: 25,
};

const ADDON_MINUTES = {
  perBathroom: 15, perBreakroom: 10, perTrashPoint: 3,
  perConferenceRoom: 5, perPrivateOffice: 5, perOpenArea: 8, perEntryLobby: 10,
};

const GLASS_LEVEL_MINUTES: Record<GlassLevel, number> = { None: 0, Some: 10, Lots: 25 };

export const FREQUENCY_VISITS_PER_MONTH: Record<CommercialFrequency, number> = {
  "1x": 4, "2x": 8, "3x": 12, "5x": 20, daily: 22, custom: 4,
};

function applyRounding(price: number, rule: RoundingRule): number {
  if (rule === "none") return Math.round(price * 100) / 100;
  const inc = parseInt(rule, 10);
  return Math.ceil(price / inc) * inc;
}

export function computeCommercialLaborEstimate(w: CommercialWalkthrough): Omit<CommercialLaborEstimate, "overrideHours"> {
  let mins = (w.totalSqFt / 1000) * BASE_MINUTES_PER_1000_SQFT[w.facilityType];
  mins += w.bathroomCount * ADDON_MINUTES.perBathroom;
  mins += w.breakroomCount * ADDON_MINUTES.perBreakroom;
  mins += w.trashPointCount * ADDON_MINUTES.perTrashPoint;
  mins += w.conferenceRoomCount * ADDON_MINUTES.perConferenceRoom;
  mins += w.privateOfficeCount * ADDON_MINUTES.perPrivateOffice;
  mins += w.openAreaCount * ADDON_MINUTES.perOpenArea;
  mins += w.entryLobbyCount * ADDON_MINUTES.perEntryLobby;
  mins += GLASS_LEVEL_MINUTES[w.glassLevel];
  if (w.highTouchFocus) mins += 15;
  const carpet = w.carpetPercent / 100;
  const hard = w.hardFloorPercent / 100;
  mins *= carpet * 1.1 + hard * 0.95;
  if (w.floors > 1) mins *= 1 + (w.floors - 1) * 0.05;
  const rawMinutes = Math.round(mins);
  const rawHours = Math.round((rawMinutes / 60) * 100) / 100;
  const recommendedCleaners = Math.max(1, Math.ceil(rawMinutes / 120));
  return { rawMinutes, rawHours, recommendedCleaners };
}

export function computeCommercialQuote(
  laborEst: CommercialLaborEstimate,
  config: CommercialPricingConfig,
  frequency: CommercialFrequency,
  walkthrough?: Partial<CommercialWalkthrough>
): CommercialQuoteResult {
  const hours = laborEst.overrideHours ?? laborEst.rawHours;
  const laborCost = hours * config.hourlyRate;
  const overheadAmount = laborCost * (config.overheadPct / 100);
  const baseCost = laborCost + overheadAmount;
  const suppliesAmount = config.suppliesSurchargeType === "fixed"
    ? config.suppliesSurcharge
    : baseCost * (config.suppliesSurcharge / 100);
  const totalBeforeMargin = baseCost + suppliesAmount;
  const marginMultiplier = 1 / (1 - config.targetMarginPct / 100);
  const rawPerVisit = totalBeforeMargin * marginMultiplier;
  const perVisit = applyRounding(rawPerVisit, config.roundingRule);
  const visitsPerMonth = FREQUENCY_VISITS_PER_MONTH[frequency];
  const monthly = applyRounding(perVisit * visitsPerMonth, config.roundingRule);
  const annual = applyRounding(monthly * 12, config.roundingRule);

  // Line items
  const lineItems: CommercialLineItem[] = [
    { label: `Direct labor (${hours.toFixed(1)}h @ $${config.hourlyRate}/hr)`, amount: laborCost, type: "labor" },
    { label: `Overhead (${config.overheadPct}%)`, amount: overheadAmount, type: "overhead" },
    { label: `Supplies surcharge ${config.suppliesSurchargeType === "fixed" ? `($${config.suppliesSurcharge} fixed)` : `(${config.suppliesSurcharge}%)`}`, amount: suppliesAmount, type: "supplies" },
    { label: `Target margin (${config.targetMarginPct}%)`, amount: rawPerVisit - totalBeforeMargin, type: "margin" },
  ];

  // Applied rules
  const appliedRules: CommercialAppliedRule[] = [];
  if (walkthrough?.afterHoursRequired) {
    appliedRules.push({ label: "After-hours requirement noted", impact: 0 });
  }
  if (walkthrough?.highTouchFocus) {
    appliedRules.push({ label: "High-touch point disinfection protocol applied (+15 min)", impact: 15 / 60 * config.hourlyRate });
  }
  if (config.targetMarginPct >= 40) {
    appliedRules.push({ label: `High margin target (${config.targetMarginPct}%)`, impact: rawPerVisit * 0.1 });
  }
  if (laborEst.overrideHours !== null) {
    appliedRules.push({ label: `Hours overridden to ${laborEst.overrideHours}h (auto: ${laborEst.rawHours}h)`, impact: 0 });
  }

  // Warnings
  const warnings: CommercialWarning[] = [];
  if (walkthrough?.totalSqFt && walkthrough.totalSqFt < 500) {
    warnings.push({ type: "low_sqft", message: "Very small square footage — verify facility size." });
  }
  if (perVisit < 100) {
    warnings.push({ type: "very_low_estimate", message: "Per-visit price is very low. Check your labor rate and margin settings." });
  }
  if (perVisit > 5000) {
    warnings.push({ type: "high_estimate", message: "Per-visit estimate is unusually high — review inputs." });
  }
  if (walkthrough?.afterHoursRequired) {
    warnings.push({ type: "after_hours", message: "After-hours cleaning may require a premium — consider adding a surcharge." });
  }

  return { perVisit, monthly, annual, hours, recommendedCleaners: laborEst.recommendedCleaners, visitsPerMonth, lineItems, appliedRules, warnings, laborCost, baseCost };
}
