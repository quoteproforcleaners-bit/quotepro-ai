import {
  HomeDetails,
  AddOns,
  ServiceFrequency,
  PricingSettings,
  QuoteOption,
} from "@/types";
import {
  calculateBaseHours,
  calculateQuoteOption,
  getServiceTypeById,
} from "@/lib/quoteCalculator";
import {
  calculateLaborEstimate,
  calculateCommercialPricing,
  generateDefaultTiers,
  PricingInputs,
  FREQUENCY_VISITS_PER_MONTH,
} from "@/features/commercial/laborModel";
import {
  CommercialWalkthrough,
  CommercialLaborEstimate,
  CommercialPricing,
  CommercialTier,
  FacilityType,
  CommercialFrequency,
  GlassLevel,
} from "@/features/commercial/types";

export interface ExtractedFields {
  propertyType?: string;
  serviceCategory?: string;
  isCommercial?: boolean;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  frequency?: string;
  isFirstTimeClean?: boolean;
  isDeepClean?: boolean;
  isMoveInOut?: boolean;
  petCount?: number;
  petType?: string;
  addOns?: string[];
  conditionLevel?: string;
  kitchenCondition?: string;
  floors?: number;
  stairs?: number;
  officeCount?: number;
  officeBathrooms?: number;
  breakrooms?: number;
  heavySoil?: boolean;
  urgency?: string;
  notes?: string;
}

export interface PricingBreakdown {
  base: number;
  bedroomAdj: number;
  bathroomAdj: number;
  petFee: number;
  addOnsTotal: number;
  frequencyDiscount: number;
  minimumCharge: number;
  conditionMultiplier: number;
}

export interface RecommendedOption {
  name: string;
  serviceTypeName: string;
  scope: string;
  price: number;
  addOnsIncluded: string[];
  isRecommended?: boolean;
}

export interface CommercialRecommendedOption {
  tierName: string;
  scopeText: string;
  pricePerVisit: number;
  monthlyPrice: number;
  includedBullets: string[];
  excludedBullets: string[];
  isRecommended?: boolean;
}

export interface PricingRecommendation {
  isCommercial: boolean;
  residentialOptions?: RecommendedOption[];
  commercialOptions?: CommercialRecommendedOption[];
  breakdown: PricingBreakdown;
  estimatedLaborHours: number;
  suggestedCrewSize: number;
  upsellSuggestions: string[];
  warnings: string[];
}

function mapFrequency(freq?: string): ServiceFrequency {
  if (!freq) return "one-time";
  const lower = freq.toLowerCase().replace(/[^a-z]/g, "");
  if (lower.includes("weekly") && !lower.includes("bi")) return "weekly";
  if (lower.includes("biweekly") || lower.includes("everyother") || lower.includes("every2")) return "biweekly";
  if (lower.includes("monthly")) return "monthly";
  return "one-time";
}

function mapCommercialFrequency(freq?: string): CommercialFrequency {
  if (!freq) return "1x";
  const lower = freq.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (lower.includes("daily") || lower.includes("everyday")) return "daily";
  if (lower.includes("5x")) return "5x";
  if (lower.includes("3x")) return "3x";
  if (lower.includes("2x") || lower.includes("twiceaweek") || lower.includes("twice")) return "2x";
  if (lower.includes("biweekly") || lower.includes("everyother")) return "1x";
  if (lower.includes("monthly")) return "1x";
  if (lower.includes("weekly") && !lower.includes("bi")) return "1x";
  return "1x";
}

function mapConditionScore(level?: string): number {
  if (!level) return 7;
  const lower = level.toLowerCase();
  if (lower.includes("excellent") || lower.includes("pristine") || lower.includes("spotless")) return 9;
  if (lower.includes("good") || lower.includes("clean") || lower.includes("maintained")) return 7;
  if (lower.includes("average") || lower.includes("fair") || lower.includes("normal")) return 5;
  if (lower.includes("dirty") || lower.includes("poor") || lower.includes("neglected")) return 3;
  if (lower.includes("very dirty") || lower.includes("terrible") || lower.includes("filthy")) return 1;
  return 7;
}

function mapPetType(petType?: string, petCount?: number): HomeDetails["petType"] {
  if (!petType && (!petCount || petCount === 0)) return "none";
  if (petCount && petCount > 1) return "multiple";
  if (!petType) return petCount && petCount > 0 ? "dog" : "none";
  const lower = petType.toLowerCase();
  if (lower.includes("cat")) return "cat";
  if (lower.includes("dog")) return "dog";
  if (lower.includes("multiple") || lower.includes("both")) return "multiple";
  return "dog";
}

function mapHomeType(propertyType?: string): HomeDetails["homeType"] {
  if (!propertyType) return "house";
  const lower = propertyType.toLowerCase();
  if (lower.includes("apartment") || lower.includes("condo") || lower.includes("flat") || lower.includes("studio")) return "apartment";
  if (lower.includes("townhome") || lower.includes("townhouse") || lower.includes("duplex")) return "townhome";
  return "house";
}

function mapFacilityType(propertyType?: string, serviceCategory?: string): FacilityType {
  const text = `${propertyType || ""} ${serviceCategory || ""}`.toLowerCase();
  if (text.includes("office")) return "Office";
  if (text.includes("retail") || text.includes("store") || text.includes("shop")) return "Retail";
  if (text.includes("medical") || text.includes("clinic") || text.includes("hospital") || text.includes("dental")) return "Medical";
  if (text.includes("gym") || text.includes("fitness")) return "Gym";
  if (text.includes("school") || text.includes("daycare") || text.includes("university")) return "School";
  if (text.includes("warehouse") || text.includes("industrial")) return "Warehouse";
  if (text.includes("restaurant") || text.includes("cafe") || text.includes("kitchen") || text.includes("food")) return "Restaurant";
  return "Other";
}

function mapAddOns(addOnNames?: string[]): AddOns {
  const addOns: AddOns = {
    insideFridge: false,
    insideOven: false,
    insideCabinets: false,
    interiorWindows: false,
    blindsDetail: false,
    baseboardsDetail: false,
    laundryFoldOnly: false,
    dishes: false,
    organizationTidy: false,
    biannualDeepClean: false,
  };
  if (!addOnNames) return addOns;
  for (const name of addOnNames) {
    const lower = name.toLowerCase();
    if (lower.includes("fridge") || lower.includes("refrigerator")) addOns.insideFridge = true;
    if (lower.includes("oven") || lower.includes("stove")) addOns.insideOven = true;
    if (lower.includes("cabinet")) addOns.insideCabinets = true;
    if (lower.includes("window")) addOns.interiorWindows = true;
    if (lower.includes("blind")) addOns.blindsDetail = true;
    if (lower.includes("baseboard")) addOns.baseboardsDetail = true;
    if (lower.includes("laundry")) addOns.laundryFoldOnly = true;
    if (lower.includes("dish")) addOns.dishes = true;
    if (lower.includes("organiz") || lower.includes("tidy")) addOns.organizationTidy = true;
  }
  return addOns;
}

function detectServiceTypeId(fields: ExtractedFields): string {
  if (fields.isMoveInOut) return "move-in-out";
  if (fields.isDeepClean || fields.isFirstTimeClean) return "deep-clean";
  const category = (fields.serviceCategory || "").toLowerCase();
  if (category.includes("move")) return "move-in-out";
  if (category.includes("deep") || category.includes("first")) return "deep-clean";
  if (category.includes("post") || category.includes("construction")) return "post-construction";
  if (category.includes("airbnb") || category.includes("turnover")) return "airbnb";
  if (category.includes("touch")) return "touch-up";
  return "regular";
}

function generateUpsellSuggestions(fields: ExtractedFields, frequency: ServiceFrequency): string[] {
  const suggestions: string[] = [];
  if (frequency === "one-time") {
    suggestions.push("Offer a recurring service discount to convert this one-time client into a regular customer.");
  }
  if (!fields.addOns || fields.addOns.length === 0) {
    suggestions.push("Consider offering add-on services like inside fridge, oven, or window cleaning to increase ticket value.");
  }
  if (fields.conditionLevel && mapConditionScore(fields.conditionLevel) <= 5) {
    suggestions.push("Property condition suggests a deep clean first visit, then transition to regular maintenance.");
  }
  if (fields.petCount && fields.petCount > 0) {
    suggestions.push("Pet household — mention pet hair removal expertise and suggest more frequent service.");
  }
  if (fields.sqft && fields.sqft >= 3000) {
    suggestions.push("Large home — consider team cleaning (2+ cleaners) for faster service time.");
  }
  return suggestions;
}

function generateWarnings(fields: ExtractedFields): string[] {
  const warnings: string[] = [];
  if (!fields.sqft || fields.sqft === 0) {
    warnings.push("Square footage was not specified. Estimate may be less accurate.");
  }
  if (!fields.bedrooms && !fields.bathrooms) {
    warnings.push("Bedroom and bathroom counts were not provided. Using defaults.");
  }
  return warnings;
}

function calculateResidentialRecommendations(
  fields: ExtractedFields,
  settings: PricingSettings
): PricingRecommendation {
  const homeDetails: HomeDetails = {
    sqft: fields.sqft || 1500,
    beds: fields.bedrooms || 3,
    baths: fields.bathrooms || 2,
    halfBaths: 0,
    conditionScore: mapConditionScore(fields.conditionLevel),
    peopleCount: 2,
    petType: mapPetType(fields.petType, fields.petCount),
    petShedding: (fields.petCount || 0) > 0,
    homeType: mapHomeType(fields.propertyType),
    kitchensCount: 1,
  };

  const addOns = mapAddOns(fields.addOns);
  const frequency = mapFrequency(fields.frequency);
  const detectedServiceId = detectServiceTypeId(fields);

  const emptyAddOns: AddOns = {
    insideFridge: false,
    insideOven: false,
    insideCabinets: false,
    interiorWindows: false,
    blindsDetail: false,
    baseboardsDetail: false,
    laundryFoldOnly: false,
    dishes: false,
    organizationTidy: false,
    biannualDeepClean: false,
  };

  // Resolve base types from user's configured Good/Better/Best option IDs
  const goodType = getServiceTypeById(settings, settings.goodOptionId) || settings.serviceTypes[0];
  const betterType = getServiceTypeById(settings, settings.betterOptionId) || settings.serviceTypes[1];
  const bestType = getServiceTypeById(settings, settings.bestOptionId) || settings.serviceTypes[2];

  // If the customer requested a specific service type, anchor the tiers around it
  // so every quote always presents exactly Good / Better / Best — never a 4th option.
  const detectedType = getServiceTypeById(settings, detectedServiceId);

  // Determine which tier to anchor the detected service to.
  // Premium services (deep-clean, move-in-out, post-construction) → anchor to Better.
  // The detected type replaces the configured type for that tier so the customer's
  // request is respected while still showing all three revenue-generating options.
  const premiumServiceIds = new Set(["deep-clean", "move-in-out", "post-construction"]);
  let effectiveBetterType = betterType;
  let detectedAnchor: "good" | "better" | "best" | null = null;

  if (detectedType && detectedServiceId !== settings.goodOptionId &&
      detectedServiceId !== settings.betterOptionId &&
      detectedServiceId !== settings.bestOptionId) {
    if (premiumServiceIds.has(detectedServiceId)) {
      // Customer wants a premium service — anchor it at Better, keep Best with best tier + add-ons
      effectiveBetterType = detectedType;
      detectedAnchor = "better";
    } else {
      // Standard or basic detected service — anchor to Good
      detectedAnchor = "good";
    }
  }

  const effectiveGoodType = (detectedAnchor === "good" && detectedType) ? detectedType : goodType;

  const good   = calculateQuoteOption(homeDetails, emptyAddOns, frequency, effectiveGoodType, settings, "Good");
  const better = calculateQuoteOption(homeDetails, addOns, frequency, effectiveBetterType, settings, "Better");

  const bestAddOns: AddOns = {
    ...emptyAddOns,
    insideFridge: true,
    insideOven: true,
    baseboardsDetail: true,
  };
  const best = calculateQuoteOption(homeDetails, bestAddOns, frequency, bestType, settings, "Best");

  // Always show exactly 3 options: Good / Better / Best.
  // Mark the detected anchor as recommended; default to Better when no detection.
  const recommendedTier: "good" | "better" | "best" = detectedAnchor || "better";

  const options: RecommendedOption[] = [
    {
      name: good.name,
      serviceTypeName: good.serviceTypeName,
      scope: good.scope,
      price: good.price,
      addOnsIncluded: good.addOnsIncluded,
      isRecommended: recommendedTier === "good",
    },
    {
      name: better.name,
      serviceTypeName: better.serviceTypeName,
      scope: better.scope,
      price: better.price,
      addOnsIncluded: better.addOnsIncluded,
      isRecommended: recommendedTier === "better",
    },
    {
      name: best.name,
      serviceTypeName: best.serviceTypeName,
      scope: best.scope,
      price: best.price,
      addOnsIncluded: best.addOnsIncluded,
      isRecommended: (recommendedTier as string) === "best",
    },
  ];

  const baseHours = calculateBaseHours(homeDetails);
  const estimatedLaborHours = Math.round(baseHours * 2) / 2;
  const suggestedCrewSize = estimatedLaborHours > 4 ? 2 : 1;

  const basePrice = estimatedLaborHours * settings.hourlyRate;
  let addOnPrice = 0;
  if (addOns.insideFridge) addOnPrice += settings.addOnPrices.insideFridge;
  if (addOns.insideOven) addOnPrice += settings.addOnPrices.insideOven;
  if (addOns.insideCabinets) addOnPrice += settings.addOnPrices.insideCabinets;
  if (addOns.interiorWindows) addOnPrice += settings.addOnPrices.interiorWindows;
  if (addOns.blindsDetail) addOnPrice += settings.addOnPrices.blindsDetail;
  if (addOns.baseboardsDetail) addOnPrice += settings.addOnPrices.baseboardsDetail;
  if (addOns.laundryFoldOnly) addOnPrice += settings.addOnPrices.laundryFoldOnly;
  if (addOns.dishes) addOnPrice += settings.addOnPrices.dishes;
  if (addOns.organizationTidy) addOnPrice += settings.addOnPrices.organizationTidy;

  let freqDiscount = 0;
  if (frequency === "weekly") freqDiscount = settings.frequencyDiscounts.weekly;
  else if (frequency === "biweekly") freqDiscount = settings.frequencyDiscounts.biweekly;
  else if (frequency === "monthly") freqDiscount = settings.frequencyDiscounts.monthly;

  const bedroomAdj = Math.max(0, (fields.bedrooms || 3) - 2) * 0.25 * settings.hourlyRate;
  const bathroomAdj = Math.max(0, (fields.bathrooms || 2) - 1) * 0.5 * settings.hourlyRate;
  const petFee = homeDetails.petType !== "none" ? (homeDetails.petShedding ? 0.5 : 0.25) * settings.hourlyRate : 0;

  const breakdown: PricingBreakdown = {
    base: Math.round(basePrice * 100) / 100,
    bedroomAdj: Math.round(bedroomAdj * 100) / 100,
    bathroomAdj: Math.round(bathroomAdj * 100) / 100,
    petFee: Math.round(petFee * 100) / 100,
    addOnsTotal: addOnPrice,
    frequencyDiscount: freqDiscount,
    minimumCharge: settings.minimumTicket,
    conditionMultiplier: mapConditionScore(fields.conditionLevel) >= 9 ? 0.9 :
      mapConditionScore(fields.conditionLevel) >= 7 ? 1.0 :
      mapConditionScore(fields.conditionLevel) >= 5 ? 1.2 :
      mapConditionScore(fields.conditionLevel) >= 3 ? 1.4 : 1.7,
  };

  return {
    isCommercial: false,
    residentialOptions: options,
    breakdown,
    estimatedLaborHours,
    suggestedCrewSize,
    upsellSuggestions: generateUpsellSuggestions(fields, frequency),
    warnings: generateWarnings(fields),
  };
}

function calculateCommercialRecommendations(
  fields: ExtractedFields,
  settings: PricingSettings
): PricingRecommendation {
  const facilityType = mapFacilityType(fields.propertyType, fields.serviceCategory);
  const frequency = mapCommercialFrequency(fields.frequency);

  const walkthrough: CommercialWalkthrough = {
    facilityName: "",
    siteAddress: "",
    facilityType,
    totalSqFt: fields.sqft || 5000,
    floors: fields.floors || 1,
    afterHoursRequired: false,
    accessConstraints: "",
    bathroomCount: fields.officeBathrooms || fields.bathrooms || 2,
    breakroomCount: fields.breakrooms || 1,
    conferenceRoomCount: 0,
    privateOfficeCount: fields.officeCount || 0,
    openAreaCount: 1,
    entryLobbyCount: 1,
    trashPointCount: Math.max(1, Math.ceil((fields.sqft || 5000) / 1000)),
    carpetPercent: 50,
    hardFloorPercent: 50,
    glassLevel: "Some" as GlassLevel,
    highTouchFocus: fields.heavySoil || false,
    frequency,
    preferredDays: "",
    preferredTimeWindow: "",
    durationPerVisitConstraint: 0,
    suppliesByClient: false,
    restroomConsumablesIncluded: true,
    specialChemicals: "",
    notes: fields.notes || "",
    photos: [],
  };

  const laborEstimate = calculateLaborEstimate(walkthrough);

  const pricingInputs: PricingInputs = {
    hourlyRate: settings.hourlyRate,
    overheadPct: 15,
    targetMarginPct: 25,
    suppliesSurcharge: 5,
    suppliesSurchargeType: "percent",
    roundingRule: "5",
    frequency,
  };

  const pricing = calculateCommercialPricing(laborEstimate, pricingInputs);
  const tiers = generateDefaultTiers(walkthrough, laborEstimate, pricing);

  const commercialOptions: CommercialRecommendedOption[] = tiers.map((tier, index) => ({
    tierName: tier.name,
    scopeText: tier.scopeText,
    pricePerVisit: tier.pricePerVisit,
    monthlyPrice: tier.monthlyPrice,
    includedBullets: tier.includedBullets,
    excludedBullets: tier.excludedBullets,
    isRecommended: index === 1,
  }));

  const breakdown: PricingBreakdown = {
    base: Math.round(laborEstimate.rawHours * settings.hourlyRate * 100) / 100,
    bedroomAdj: 0,
    bathroomAdj: 0,
    petFee: 0,
    addOnsTotal: 0,
    frequencyDiscount: 0,
    minimumCharge: 0,
    conditionMultiplier: 1.0,
  };

  const upsellSuggestions: string[] = [];
  if (frequency === "1x") {
    upsellSuggestions.push("Suggest increasing frequency to 2x or 3x per week for better per-visit pricing.");
  }
  if (!fields.heavySoil) {
    upsellSuggestions.push("Offer enhanced sanitation tier for high-traffic areas.");
  }
  upsellSuggestions.push("Consider quarterly deep-clean add-on for premium maintenance value.");

  return {
    isCommercial: true,
    commercialOptions,
    breakdown,
    estimatedLaborHours: laborEstimate.rawHours,
    suggestedCrewSize: laborEstimate.recommendedCleaners,
    upsellSuggestions,
    warnings: generateWarnings(fields),
  };
}

export function calculatePricingRecommendations(
  extractedFields: ExtractedFields,
  settings: PricingSettings
): PricingRecommendation {
  const isCommercial = extractedFields.isCommercial === true ||
    (extractedFields.propertyType || "").toLowerCase().match(/office|retail|medical|gym|school|warehouse|restaurant|commercial|business|clinic|store/) !== null;

  if (isCommercial) {
    return calculateCommercialRecommendations(extractedFields, settings);
  }
  return calculateResidentialRecommendations(extractedFields, settings);
}
