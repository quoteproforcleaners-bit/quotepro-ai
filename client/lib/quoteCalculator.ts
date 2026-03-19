import {
  HomeDetails,
  AddOns,
  ServiceFrequency,
  ServiceTypeConfig,
  PricingSettings,
  QuoteOption,
} from "@/types";

function getSqftBaseHours(sqft: number): number {
  // 40 min per 1000 sqft for standard clean (reference tier)
  // touch-up uses 0.75× (30 min/1000), deep-clean uses 1.5× (60 min/1000), move-in/out uses 1.875× (75 min/1000)
  return (sqft / 1000) * (40 / 60);
}

function getBathroomHours(baths: number, halfBaths: number): number {
  const additionalFullBaths = Math.max(0, baths - 1);
  return additionalFullBaths * 0.5 + halfBaths * 0.25;
}

function getBedroomHours(beds: number): number {
  return Math.max(0, beds - 2) * 0.25;
}

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

function getPetHours(
  petType: HomeDetails["petType"],
  shedding: boolean
): number {
  if (petType === "none") return 0;
  if (petType === "cat" && !shedding) return 0.25;
  if (petType === "dog" || shedding) return 0.5;
  if (petType === "multiple") return shedding ? 1.0 : 0.75;
  return 0;
}

function getAddOnHours(addOns: AddOns): number {
  let hours = 0;
  if (addOns.insideFridge) hours += 0.5;
  if (addOns.insideOven) hours += 0.5;
  if (addOns.insideCabinets) hours += 1.0;
  if (addOns.interiorWindows) hours += 1.0;
  if (addOns.blindsDetail) hours += 1.0;
  if (addOns.baseboardsDetail) hours += 1.0;
  if (addOns.laundryFoldOnly) hours += 0.5;
  if (addOns.dishes) hours += 0.5;
  if (addOns.organizationTidy) hours += 1.0;
  if (addOns.biannualDeepClean) hours += 0;
  return hours;
}

function getAddOnPrice(addOns: AddOns, prices: PricingSettings["addOnPrices"]): number {
  let total = 0;
  if (addOns.insideFridge) total += prices.insideFridge;
  if (addOns.insideOven) total += prices.insideOven;
  if (addOns.insideCabinets) total += prices.insideCabinets;
  if (addOns.interiorWindows) total += prices.interiorWindows;
  if (addOns.blindsDetail) total += prices.blindsDetail;
  if (addOns.baseboardsDetail) total += prices.baseboardsDetail;
  if (addOns.laundryFoldOnly) total += prices.laundryFoldOnly;
  if (addOns.dishes) total += prices.dishes;
  if (addOns.organizationTidy) total += prices.organizationTidy;
  if (addOns.biannualDeepClean) total += prices.biannualDeepClean;
  return total;
}

function getFrequencyDiscount(
  frequency: ServiceFrequency,
  discounts: PricingSettings["frequencyDiscounts"]
): number {
  switch (frequency) {
    case "weekly":
      return discounts.weekly / 100;
    case "biweekly":
      return discounts.biweekly / 100;
    case "monthly":
      return discounts.monthly / 100;
    default:
      return 0;
  }
}

function roundToNearest(value: number, nearest: number): number {
  return Math.round(value / nearest) * nearest;
}

function roundHours(hours: number): number {
  return Math.round(hours * 2) / 2;
}

export function calculateBaseHours(homeDetails: HomeDetails): number {
  const sqftHours = getSqftBaseHours(homeDetails.sqft);
  const bathHours = getBathroomHours(homeDetails.baths, homeDetails.halfBaths);
  const bedHours = getBedroomHours(homeDetails.beds);
  const conditionMultiplier = getConditionMultiplier(homeDetails.conditionScore);
  const peopleMultiplier = getPeopleMultiplier(homeDetails.peopleCount);
  const petHours = getPetHours(homeDetails.petType, homeDetails.petShedding);

  const baseHours = sqftHours + bathHours + bedHours + petHours;
  return baseHours * conditionMultiplier * peopleMultiplier;
}

export function calculateQuoteOption(
  homeDetails: HomeDetails,
  addOns: AddOns,
  frequency: ServiceFrequency,
  serviceType: ServiceTypeConfig,
  settings: PricingSettings,
  optionName: string
): QuoteOption {
  const baseHours = calculateBaseHours(homeDetails);
  const serviceMultiplier = serviceType.multiplier;
  const addOnHours = getAddOnHours(addOns);

  const totalHours = roundHours(baseHours * serviceMultiplier + addOnHours);
  const basePrice = totalHours * settings.hourlyRate;
  const addOnPrice = getAddOnPrice(addOns, settings.addOnPrices);

  let price = basePrice + addOnPrice;
  price = Math.max(price, settings.minimumTicket);

  const canDiscount = serviceType.id !== "move-in-out" && serviceType.id !== "post-construction";
  if (canDiscount && frequency !== "one-time") {
    const discount = getFrequencyDiscount(frequency, settings.frequencyDiscounts);
    price = price * (1 - discount);
  }

  price = roundToNearest(price, 5);

  const addOnsIncluded: string[] = [];
  if (addOns.insideFridge) addOnsIncluded.push("Inside Fridge");
  if (addOns.insideOven) addOnsIncluded.push("Inside Oven");
  if (addOns.insideCabinets) addOnsIncluded.push("Inside Cabinets");
  if (addOns.interiorWindows) addOnsIncluded.push("Interior Windows");
  if (addOns.blindsDetail) addOnsIncluded.push("Blinds Detail");
  if (addOns.baseboardsDetail) addOnsIncluded.push("Baseboards Detail");
  if (addOns.laundryFoldOnly) addOnsIncluded.push("Laundry Fold");
  if (addOns.dishes) addOnsIncluded.push("Dishes");
  if (addOns.organizationTidy) addOnsIncluded.push("Organization/Tidy");

  return {
    name: optionName,
    serviceTypeId: serviceType.id,
    serviceTypeName: serviceType.name,
    scope: serviceType.scope,
    price,
    addOnsIncluded,
  };
}

export function getServiceTypeById(
  settings: PricingSettings,
  id: string
): ServiceTypeConfig | undefined {
  return settings.serviceTypes.find((st) => st.id === id);
}

export function calculateAllOptions(
  homeDetails: HomeDetails,
  addOns: AddOns,
  frequency: ServiceFrequency,
  settings: PricingSettings,
  isFirstTime: boolean
): {
  good: QuoteOption;
  better: QuoteOption;
  best: QuoteOption;
} {
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

  const goodType = getServiceTypeById(settings, settings.goodOptionId) || settings.serviceTypes[0];
  const betterType = getServiceTypeById(settings, settings.betterOptionId) || settings.serviceTypes[1];
  const bestType = getServiceTypeById(settings, settings.bestOptionId) || settings.serviceTypes[2];

  // Good: no add-ons (base service only)
  const good = calculateQuoteOption(homeDetails, emptyAddOns, frequency, goodType, settings, "Good");

  // Better: user-selected add-ons included (fixed: was incorrectly using emptyAddOns)
  const better = calculateQuoteOption(homeDetails, addOns, frequency, betterType, settings, "Better");

  // Best: deep-clean default add-ons — oven, cabinets, windows, baseboards, blinds (no fridge)
  const bestAddOns: AddOns = {
    ...emptyAddOns,
    insideOven: true,
    insideCabinets: true,
    interiorWindows: true,
    baseboardsDetail: true,
    blindsDetail: true,
  };
  const best = calculateQuoteOption(homeDetails, bestAddOns, frequency, bestType, settings, "Best");

  return { good, better, best };
}

export interface PriceBreakdownLine {
  label: string;
  detail: string;
  value?: number;
  type: "base" | "add" | "multiplier" | "discount" | "addon" | "floor" | "total";
}

export interface PriceBreakdown {
  lines: PriceBreakdownLine[];
  totalHours: number;
  hourlyRate: number;
  rawTotal: number;
  finalPrice: number;
}

export function calculatePriceBreakdown(
  homeDetails: HomeDetails,
  addOns: AddOns,
  frequency: ServiceFrequency,
  serviceType: ServiceTypeConfig,
  settings: PricingSettings
): PriceBreakdown {
  const sqftHours = getSqftBaseHours(homeDetails.sqft);
  const bathHours = getBathroomHours(homeDetails.baths, homeDetails.halfBaths);
  const bedHours = getBedroomHours(homeDetails.beds);
  const petHours = getPetHours(homeDetails.petType, homeDetails.petShedding);
  const conditionMult = getConditionMultiplier(homeDetails.conditionScore);
  const peopleMult = getPeopleMultiplier(homeDetails.peopleCount);
  const serviceMult = serviceType.multiplier;
  const addOnHours = getAddOnHours(addOns);
  const addOnPrice = getAddOnPrice(addOns, settings.addOnPrices);

  const rawBaseHours = sqftHours + bathHours + bedHours + petHours;
  const adjustedBaseHours = rawBaseHours * conditionMult * peopleMult;
  const serviceHours = roundHours(adjustedBaseHours * serviceMult);
  const totalHours = roundHours(serviceHours + addOnHours);

  const basePrice = totalHours * settings.hourlyRate;
  let price = basePrice + addOnPrice;
  const rawTotal = price;
  const hitMinimum = price < settings.minimumTicket;
  if (hitMinimum) price = settings.minimumTicket;

  const canDiscount = serviceType.id !== "move-in-out" && serviceType.id !== "post-construction";
  const discountPct = canDiscount ? getFrequencyDiscount(frequency, settings.frequencyDiscounts) : 0;
  if (discountPct > 0) price = price * (1 - discountPct);

  price = roundToNearest(price, 5);

  const lines: PriceBreakdownLine[] = [];

  lines.push({ label: "Sq ft base", detail: `${homeDetails.sqft.toLocaleString()} sq ft`, value: sqftHours, type: "base" });
  if (bathHours > 0) lines.push({ label: "Bathrooms", detail: `${homeDetails.baths} bath`, value: bathHours, type: "add" });
  if (bedHours > 0) lines.push({ label: "Bedrooms", detail: `${homeDetails.beds} bed`, value: bedHours, type: "add" });
  if (petHours > 0) lines.push({ label: "Pets", detail: homeDetails.petType, value: petHours, type: "add" });

  if (conditionMult !== 1.0) {
    const condPct = conditionMult > 1 ? `+${Math.round((conditionMult - 1) * 100)}%` : `-${Math.round((1 - conditionMult) * 100)}%`;
    lines.push({ label: "Condition", detail: `Score ${homeDetails.conditionScore}/10 (${condPct})`, type: "multiplier" });
  }
  if (peopleMult > 1.0) {
    lines.push({ label: "Occupants", detail: `${homeDetails.peopleCount} people (+${Math.round((peopleMult - 1) * 100)}%)`, type: "multiplier" });
  }
  if (serviceMult !== 1.0) {
    lines.push({ label: serviceType.name, detail: `${serviceMult}x multiplier`, type: "multiplier" });
  }

  lines.push({ label: "Labor hours", detail: `${totalHours - addOnHours}h × $${settings.hourlyRate}/hr`, value: serviceHours * settings.hourlyRate, type: "base" });

  if (addOnHours > 0 || addOnPrice > 0) {
    lines.push({ label: "Add-ons", detail: `+${addOnHours}h / $${addOnPrice.toFixed(0)}`, value: addOnPrice, type: "addon" });
  }

  if (hitMinimum) {
    lines.push({ label: "Minimum price applied", detail: `$${settings.minimumTicket}`, type: "floor" });
  }

  if (discountPct > 0) {
    const saveAmt = hitMinimum ? settings.minimumTicket * discountPct : rawTotal * discountPct;
    lines.push({ label: `${FREQ_LABEL[frequency] || frequency} discount`, detail: `-${Math.round(discountPct * 100)}%  (-$${saveAmt.toFixed(0)})`, type: "discount" });
  }

  lines.push({ label: "Total", detail: `$${price}`, value: price, type: "total" });

  return { lines, totalHours, hourlyRate: settings.hourlyRate, rawTotal, finalPrice: price };
}

const FREQ_LABEL: Record<string, string> = {
  weekly: "Weekly",
  biweekly: "Bi-weekly",
  monthly: "Monthly",
};

export function generateEmailDraft(
  customerName: string,
  businessName: string,
  senderName: string,
  options: { good: QuoteOption; better: QuoteOption; best: QuoteOption },
  bookingLink?: string,
  paymentMethodsText?: string
): string {
  const betterPrice = options.better.price;
  const goodPrice = options.good.price;
  const bestPrice = options.best.price;

  const goodName = options.good.serviceTypeName || "Touch Up";
  const betterName = options.better.serviceTypeName || "Standard Cleaning";
  const bestName = options.best.serviceTypeName || "Deep Clean";

  let email = `Hi ${customerName},

Thank you for reaching out to ${businessName}! Based on the details you shared, here is your personalized cleaning quote.

Your Options:
- ${goodName} ($${goodPrice}): ${options.good.scope}
- ${betterName} ($${betterPrice}): ${options.better.scope} (Recommended)
- ${bestName} ($${bestPrice}): ${options.best.scope} + premium add-ons

The ${betterName} option at $${betterPrice} is our most popular choice and includes ${options.better.scope.toLowerCase()}.`;

  if (bookingLink) {
    email += `

Ready to book? Click here: ${bookingLink}`;
  } else {
    email += `

Reply to this email or give us a call to confirm your appointment.`;
  }

  if (paymentMethodsText) {
    email += `

We accept: ${paymentMethodsText}.`;
  }

  email += `

Looking forward to making your home sparkle!

Best regards,
${senderName}
${businessName}`;

  return email;
}

export function generateSmsDraft(
  customerName: string,
  businessName: string,
  betterPrice: number,
  bookingLink?: string,
  betterServiceName?: string
): string {
  const serviceName = betterServiceName || "cleaning";
  let sms = `Hi ${customerName}! Your ${businessName} quote is ready. Our recommended ${serviceName}: $${betterPrice}.`;

  if (bookingLink) {
    sms += ` Book now: ${bookingLink}`;
  } else {
    sms += ` Reply YES to confirm or call us with questions!`;
  }

  return sms;
}
