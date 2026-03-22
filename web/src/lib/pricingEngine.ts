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
  hourlyRate: number;
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

function getSqftBaseHours(sqft: number): number { return (sqft / 1000) * (40 / 60); }

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

function getFreqDiscount(freq: string, discounts: { weekly: number; biweekly: number; monthly: number }): number {
  if (freq === "weekly") return discounts.weekly / 100;
  if (freq === "biweekly") return discounts.biweekly / 100;
  if (freq === "monthly") return discounts.monthly / 100;
  return 0;
}

// ─── Main residential calculator ─────────────────────────────────────────────

function calcTier(
  typeId: string,
  includeUserAddOns: boolean,
  property: ResidentialProperty,
  addOns: Record<string, boolean>,
  frequency: string,
  pricing: PricingSettings,
  extraAddOns?: Record<string, boolean>
): ResidentialTierResult {
  const hourlyRate = pricing.hourlyRate || 45;
  const minimumTicket = pricing.minimumTicket || 100;
  const serviceTypes = pricing.serviceTypes || [];
  const addOnPrices = { ...DEFAULT_ADD_ON_PRICES, ...(pricing.addOnPrices || {}) };
  const freqDiscounts = pricing.frequencyDiscounts || { weekly: 25, biweekly: 15, monthly: 10 };

  const st = serviceTypes.find((s) => s.id === typeId) || { id: typeId, name: typeId, multiplier: 1, scope: "" };
  const tierAddOns = includeUserAddOns ? addOns : (extraAddOns || {});

  const sqftHours = getSqftBaseHours(property.sqft);
  const bathHours = Math.max(0, property.baths - 1) * 0.5 + property.halfBaths * 0.25;
  const bedHours = Math.max(0, property.beds - 2) * 0.25;
  const condMult = getConditionMultiplier(property.conditionScore);
  const peopleMult = getPeopleMultiplier(property.peopleCount);
  const petHrs = getPetHours(property.petType, property.petShedding);

  const baseHours = (sqftHours + bathHours + bedHours + petHrs) * condMult * peopleMult;

  let tierAddOnHours = 0;
  let tierAddOnPrice = 0;
  for (const opt of ADD_ON_OPTIONS) {
    if ((tierAddOns as any)[opt.key]) {
      tierAddOnHours += opt.hours;
      tierAddOnPrice += addOnPrices[opt.key] || 0;
    }
  }

  const canDiscount = st.id !== "move-in-out" && st.id !== "post-construction";
  const disc = canDiscount ? getFreqDiscount(frequency, freqDiscounts) : 0;
  const isOneTime = frequency === "one-time";

  const serviceHours = roundHours(baseHours * st.multiplier);
  const totalHoursWithAddOns = roundHours(baseHours * st.multiplier + tierAddOnHours);

  let firstCleanPrice = totalHoursWithAddOns * hourlyRate + tierAddOnPrice;
  const minimumApplied = firstCleanPrice < minimumTicket;
  firstCleanPrice = Math.max(firstCleanPrice, minimumTicket);
  firstCleanPrice = roundToNearest5(firstCleanPrice);

  let recurringPrice = serviceHours * hourlyRate;
  const recurringMinimumApplied = recurringPrice < minimumTicket;
  recurringPrice = Math.max(recurringPrice, minimumTicket);
  let discountAmount = 0;
  if (disc > 0) {
    discountAmount = recurringPrice * disc;
    recurringPrice = recurringPrice * (1 - disc);
  }
  recurringPrice = roundToNearest5(recurringPrice);

  const price = isOneTime ? firstCleanPrice : recurringPrice;
  const totalHours = isOneTime ? totalHoursWithAddOns : serviceHours;

  // ── Build line items ──
  const lineItems: LineItem[] = [];
  const appliedRules: AppliedRule[] = [];
  const warnings: Warning[] = [];

  // Base labor from sqft
  const sqftContrib = sqftHours * st.multiplier * condMult * peopleMult * hourlyRate;
  if (property.sqft > 0) {
    lineItems.push({ label: `Base labor (${property.sqft.toLocaleString()} sqft)`, amount: sqftContrib, type: "base" });
  } else {
    warnings.push({ type: "missing_sqft", message: "Enter square footage for accurate pricing." });
  }

  // Extra bathrooms
  if (bathHours > 0) {
    const bathContrib = bathHours * st.multiplier * condMult * peopleMult * hourlyRate;
    lineItems.push({ label: `Extra bathrooms (+${property.baths - 1} full, ${property.halfBaths} half)`, amount: bathContrib, type: "room" });
  }

  // Extra bedrooms (3+)
  if (bedHours > 0) {
    const bedContrib = bedHours * st.multiplier * condMult * peopleMult * hourlyRate;
    lineItems.push({ label: `Extra bedrooms (${property.beds - 2} above 2)`, amount: bedContrib, type: "room" });
  }

  // Condition surcharge / discount
  if (condMult !== 1.0) {
    const base = sqftHours * st.multiplier * hourlyRate;
    const condDelta = base * condMult - base;
    const condLabel = condMult > 1.0
      ? `Condition surcharge (score ${property.conditionScore}/10)`
      : `Cleanliness credit (score ${property.conditionScore}/10)`;
    lineItems.push({ label: condLabel, amount: condDelta, type: condDelta > 0 ? "surcharge" : "discount" });
    if (condMult > 1.0) {
      appliedRules.push({ label: `+${Math.round((condMult - 1) * 100)}% condition adjustment`, impact: condDelta });
    }
  }

  // People multiplier
  if (peopleMult > 1.0) {
    const base = sqftHours * st.multiplier * condMult * hourlyRate;
    const peopleDelta = base * peopleMult - base;
    lineItems.push({ label: `Occupancy surcharge (${property.peopleCount} residents)`, amount: peopleDelta, type: "surcharge" });
  }

  // Pet surcharge
  if (petHrs > 0) {
    const petContrib = petHrs * st.multiplier * condMult * peopleMult * hourlyRate;
    lineItems.push({ label: `Pet surcharge (${property.petType}${property.petShedding ? ", shedding" : ""})`, amount: petContrib, type: "surcharge" });
    appliedRules.push({ label: `Pet surcharge applied (+${property.petType}${property.petShedding ? ", heavy shedding" : ""})`, impact: petContrib });
  }

  // Service type multiplier (above 1.0 standard)
  if (st.multiplier !== 1.0) {
    const baseWithoutMult = (sqftHours + bathHours + bedHours + petHrs) * condMult * peopleMult * hourlyRate;
    const multDelta = baseWithoutMult * st.multiplier - baseWithoutMult;
    appliedRules.push({ label: `${st.name} multiplier (×${st.multiplier})`, impact: multDelta });
  }

  // Add-on items
  for (const opt of ADD_ON_OPTIONS) {
    if ((tierAddOns as any)[opt.key]) {
      lineItems.push({ label: opt.label, amount: addOnPrices[opt.key] || 0, type: "addon" });
    }
  }

  // Frequency discount
  if (discountAmount > 0) {
    const freqLabel =
      frequency === "weekly" ? `Weekly discount (${freqDiscounts.weekly}%)`
      : frequency === "biweekly" ? `Biweekly discount (${freqDiscounts.biweekly}%)`
      : `Monthly discount (${freqDiscounts.monthly}%)`;
    lineItems.push({ label: freqLabel, amount: -discountAmount, type: "discount" });
    appliedRules.push({ label: freqLabel, impact: -discountAmount });
  }

  // Minimum price
  if (minimumApplied || recurringMinimumApplied) {
    appliedRules.push({ label: `Minimum job price applied ($${minimumTicket})`, impact: 0 });
    warnings.push({ type: "below_minimum", message: `Quote was below minimum ticket ($${minimumTicket}) — minimum applied.` });
  }

  // Unusually high
  if (price > 1500) {
    warnings.push({ type: "unusually_high", message: "This quote is above $1,500 — double-check your inputs." });
  }

  return {
    price, firstCleanPrice: isOneTime ? null : firstCleanPrice,
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
  const p: PricingSettings = pricing || {
    hourlyRate: 45, minimumTicket: 100,
    serviceTypes: [
      { id: "touch-up", name: "Touch Up", multiplier: 0.75, scope: "Quick surface cleaning" },
      { id: "standard", name: "Standard Clean", multiplier: 1.0, scope: "Full cleaning of all rooms" },
      { id: "deep-clean", name: "Deep Clean", multiplier: 1.5, scope: "Thorough deep cleaning" },
    ],
    goodOptionId: "touch-up", betterOptionId: "standard", bestOptionId: "deep-clean",
    addOnPrices: DEFAULT_ADD_ON_PRICES,
    frequencyDiscounts: { weekly: 25, biweekly: 15, monthly: 10 },
  };

  const good = calcTier(p.goodOptionId, false, property, addOns, frequency, p);
  const better = calcTier(p.betterOptionId, true, property, addOns, frequency, p);
  const best = calcTier(p.bestOptionId, false, property, addOns, frequency, p, {
    insideOven: true, insideCabinets: true, interiorWindows: true, baseboardsDetail: true, blindsDetail: true,
  });

  const addOnPrices = { ...DEFAULT_ADD_ON_PRICES, ...(p.addOnPrices || {}) };
  const sqftHours = getSqftBaseHours(property.sqft);
  const bathHours = Math.max(0, property.baths - 1) * 0.5 + property.halfBaths * 0.25;
  const bedHours = Math.max(0, property.beds - 2) * 0.25;
  const condMult = getConditionMultiplier(property.conditionScore);
  const peopleMult = getPeopleMultiplier(property.peopleCount);
  const petHrs = getPetHours(property.petType, property.petShedding);
  const baseHours = (sqftHours + bathHours + bedHours + petHrs) * condMult * peopleMult;

  let addOnHours = 0; let addOnPrice = 0;
  for (const opt of ADD_ON_OPTIONS) {
    if (addOns[opt.key]) { addOnHours += opt.hours; addOnPrice += addOnPrices[opt.key] || 0; }
  }

  return { good, better, best, baseHours: roundHours(baseHours), addOnHours, addOnPrice, hourlyRate: p.hourlyRate || 45 };
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
