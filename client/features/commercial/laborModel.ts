import {
  CommercialWalkthrough,
  CommercialLaborEstimate,
  CommercialPricing,
  CommercialTier,
  CommercialFrequency,
  FacilityType,
  GlassLevel,
  RoundingRule,
  SuppliesSurchargeType,
} from './types';

const BASE_MINUTES_PER_1000_SQFT: Record<FacilityType, number> = {
  Office: 25,
  Retail: 20,
  Medical: 35,
  Gym: 30,
  School: 28,
  Warehouse: 15,
  Restaurant: 40,
  Other: 25,
};

const ADDON_MINUTES = {
  perBathroom: 15,
  perBreakroom: 10,
  perTrashPoint: 3,
  perConferenceRoom: 5,
  perPrivateOffice: 5,
  perOpenArea: 8,
  perEntryLobby: 10,
};

const GLASS_LEVEL_MINUTES: Record<GlassLevel, number> = {
  None: 0,
  Some: 10,
  Lots: 25,
};

const HIGH_TOUCH_ADDON_MINUTES = 15;

const CARPET_ADJUSTMENT_FACTOR = 1.1;
const HARD_FLOOR_ADJUSTMENT_FACTOR = 0.95;

const DEFAULT_TARGET_MINUTES_PER_CLEANER = 120;

const FREQUENCY_VISITS_PER_MONTH: Record<CommercialFrequency, number> = {
  '1x': 4,
  '2x': 8,
  '3x': 12,
  '5x': 20,
  daily: 22,
  custom: 4,
};

export function calculateLaborEstimate(
  walkthrough: CommercialWalkthrough
): CommercialLaborEstimate {
  const baseMins =
    (walkthrough.totalSqFt / 1000) *
    BASE_MINUTES_PER_1000_SQFT[walkthrough.facilityType];

  let totalMinutes = baseMins;

  totalMinutes += walkthrough.bathroomCount * ADDON_MINUTES.perBathroom;
  totalMinutes += walkthrough.breakroomCount * ADDON_MINUTES.perBreakroom;
  totalMinutes += walkthrough.trashPointCount * ADDON_MINUTES.perTrashPoint;
  totalMinutes += walkthrough.conferenceRoomCount * ADDON_MINUTES.perConferenceRoom;
  totalMinutes += walkthrough.privateOfficeCount * ADDON_MINUTES.perPrivateOffice;
  totalMinutes += walkthrough.openAreaCount * ADDON_MINUTES.perOpenArea;
  totalMinutes += walkthrough.entryLobbyCount * ADDON_MINUTES.perEntryLobby;

  totalMinutes += GLASS_LEVEL_MINUTES[walkthrough.glassLevel];

  if (walkthrough.highTouchFocus) {
    totalMinutes += HIGH_TOUCH_ADDON_MINUTES;
  }

  const carpetRatio = walkthrough.carpetPercent / 100;
  const hardFloorRatio = walkthrough.hardFloorPercent / 100;
  const floorAdjustment =
    carpetRatio * CARPET_ADJUSTMENT_FACTOR +
    hardFloorRatio * HARD_FLOOR_ADJUSTMENT_FACTOR;
  totalMinutes *= floorAdjustment;

  if (walkthrough.floors > 1) {
    totalMinutes *= 1 + (walkthrough.floors - 1) * 0.05;
  }

  const rawMinutes = Math.round(totalMinutes);
  const rawHours = Math.round((rawMinutes / 60) * 100) / 100;
  const targetMinutesPerCleaner = DEFAULT_TARGET_MINUTES_PER_CLEANER;
  const recommendedCleaners = Math.max(
    1,
    Math.ceil(rawMinutes / targetMinutesPerCleaner)
  );

  return {
    rawMinutes,
    rawHours,
    recommendedCleaners,
    targetMinutesPerCleaner,
  };
}

export interface PricingInputs {
  hourlyRate: number;
  overheadPct: number;
  targetMarginPct: number;
  suppliesSurcharge: number;
  suppliesSurchargeType: SuppliesSurchargeType;
  roundingRule: RoundingRule;
  frequency: CommercialFrequency;
}

function applyRounding(price: number, rule: RoundingRule): number {
  if (rule === 'none') return Math.round(price * 100) / 100;
  const increment = parseInt(rule, 10);
  return Math.ceil(price / increment) * increment;
}

export function calculateCommercialPricing(
  laborEstimate: CommercialLaborEstimate,
  inputs: PricingInputs
): CommercialPricing {
  const effectiveHours = laborEstimate.overrideHours ?? laborEstimate.rawHours;
  const laborCost = effectiveHours * inputs.hourlyRate;

  const overheadAmount = laborCost * (inputs.overheadPct / 100);
  const baseCost = laborCost + overheadAmount;

  let suppliesAmount = 0;
  if (inputs.suppliesSurchargeType === 'fixed') {
    suppliesAmount = inputs.suppliesSurcharge;
  } else {
    suppliesAmount = baseCost * (inputs.suppliesSurcharge / 100);
  }

  const totalCost = baseCost + suppliesAmount;
  const priceBeforeMargin = totalCost / (1 - inputs.targetMarginPct / 100);
  const finalPricePerVisit = applyRounding(priceBeforeMargin, inputs.roundingRule);

  const visitsPerMonth = FREQUENCY_VISITS_PER_MONTH[inputs.frequency];
  const monthlyPrice = applyRounding(
    finalPricePerVisit * visitsPerMonth,
    inputs.roundingRule
  );

  return {
    hourlyRate: inputs.hourlyRate,
    overheadPct: inputs.overheadPct,
    targetMarginPct: inputs.targetMarginPct,
    suppliesSurcharge: inputs.suppliesSurcharge,
    suppliesSurchargeType: inputs.suppliesSurchargeType,
    finalPricePerVisit,
    monthlyPrice,
    roundingRule: inputs.roundingRule,
  };
}

export function generateDefaultTiers(
  walkthrough: CommercialWalkthrough,
  laborEstimate: CommercialLaborEstimate,
  pricing: CommercialPricing
): CommercialTier[] {
  const basePrice = pricing.finalPricePerVisit;
  const frequency = walkthrough.frequency;
  const visitsPerMonth = FREQUENCY_VISITS_PER_MONTH[frequency];

  const basicPrice = applyRounding(basePrice * 0.75, pricing.roundingRule);
  const enhancedPrice = applyRounding(basePrice, pricing.roundingRule);
  const premiumPrice = applyRounding(basePrice * 1.3, pricing.roundingRule);

  const basic: CommercialTier = {
    name: 'Basic Janitorial',
    scopeText: `Standard janitorial service for ${walkthrough.facilityName || 'the facility'}`,
    includedBullets: [
      'Trash removal and liner replacement',
      'Restroom cleaning and restocking',
      'Floor sweeping and mopping (hard surfaces)',
      'Surface wiping (desks, counters, tables)',
      'Entrance and lobby tidying',
    ],
    excludedBullets: [
      'Carpet vacuuming (common areas only)',
      'Deep sanitization',
      'Window and glass cleaning',
      'High-touch point disinfection',
      'Breakroom appliance cleaning',
    ],
    pricePerVisit: basicPrice,
    monthlyPrice: applyRounding(basicPrice * visitsPerMonth, pricing.roundingRule),
    frequency,
  };

  const enhanced: CommercialTier = {
    name: 'Enhanced Sanitation',
    scopeText: `Comprehensive cleaning with enhanced sanitation for ${walkthrough.facilityName || 'the facility'}`,
    includedBullets: [
      'All Basic Janitorial services',
      'Full carpet vacuuming',
      'High-touch point disinfection (handles, switches, railings)',
      'Breakroom and kitchen cleaning',
      'Conference room reset and cleaning',
      'Glass and mirror cleaning',
    ],
    excludedBullets: [
      'Deep carpet extraction',
      'Floor stripping and waxing',
      'Exterior window cleaning',
      'Specialty chemical treatments',
    ],
    pricePerVisit: enhancedPrice,
    monthlyPrice: applyRounding(enhancedPrice * visitsPerMonth, pricing.roundingRule),
    frequency,
  };

  const premium: CommercialTier = {
    name: 'Premium Maintenance',
    scopeText: `Full-service premium maintenance for ${walkthrough.facilityName || 'the facility'}`,
    includedBullets: [
      'All Enhanced Sanitation services',
      'Deep carpet care (monthly extraction)',
      'Hard floor maintenance (buffing/polishing)',
      'Interior window and partition cleaning',
      'Detailed dusting (vents, blinds, fixtures)',
      'Quarterly deep clean included',
      'Priority scheduling and dedicated team',
    ],
    excludedBullets: [
      'Exterior window cleaning',
      'Pressure washing',
      'Specialty hazmat cleaning',
    ],
    pricePerVisit: premiumPrice,
    monthlyPrice: applyRounding(premiumPrice * visitsPerMonth, pricing.roundingRule),
    frequency,
  };

  return [basic, enhanced, premium];
}

export { FREQUENCY_VISITS_PER_MONTH, DEFAULT_TARGET_MINUTES_PER_CLEANER };
