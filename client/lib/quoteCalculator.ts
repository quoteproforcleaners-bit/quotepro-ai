import {
  HomeDetails,
  AddOns,
  ServiceFrequency,
  ServiceType,
  PricingSettings,
  QuoteOption,
} from "@/types";

function getSqftBaseHours(sqft: number): number {
  if (sqft <= 1000) return 1.5;
  if (sqft <= 1500) return 2.5;
  if (sqft <= 2000) return 3.0;
  if (sqft <= 2500) return 3.5;
  if (sqft <= 3000) return 4.0;
  if (sqft <= 3500) return 4.5;
  if (sqft <= 4000) return 5.0;
  return 5.0 + Math.ceil((sqft - 4000) / 750);
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

function getServiceTypeMultiplier(serviceType: ServiceType): number {
  switch (serviceType) {
    case "touch-up":
      return 0.7;
    case "premium":
      return 1.0;
    case "deep-clean":
      return 1.35;
    case "move-in-out":
      return 1.5;
    case "post-construction":
      return 1.75;
    default:
      return 1.0;
  }
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
  serviceType: ServiceType,
  settings: PricingSettings
): QuoteOption {
  const baseHours = calculateBaseHours(homeDetails);
  const serviceMultiplier = getServiceTypeMultiplier(serviceType);
  const addOnHours = getAddOnHours(addOns);

  const totalHours = roundHours(baseHours * serviceMultiplier + addOnHours);
  const basePrice = totalHours * settings.hourlyRate;
  const addOnPrice = getAddOnPrice(addOns, settings.addOnPrices);

  let price = basePrice + addOnPrice;
  price = Math.max(price, settings.minimumTicket);

  const canDiscount = serviceType !== "move-in-out" && serviceType !== "post-construction";
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

  const scopeMap: Record<ServiceType, string> = {
    "touch-up": "Kitchen, bathrooms, and floors only",
    premium: "Complete whole-home cleaning",
    "deep-clean": "Thorough first-time or catch-up cleaning",
    "move-in-out": "Detailed move-ready cleaning",
    "post-construction": "Heavy-duty post-build cleanup",
  };

  return {
    name: serviceType === "touch-up" ? "Good" : serviceType === "premium" ? "Better" : "Best",
    serviceType,
    scope: scopeMap[serviceType],
    price,
    hours: totalHours,
    addOnsIncluded,
  };
}

export function getRecommendedServiceType(
  homeDetails: HomeDetails,
  isFirstTime: boolean
): ServiceType {
  if (isFirstTime && homeDetails.conditionScore <= 6) {
    return "deep-clean";
  }
  if (homeDetails.conditionScore >= 7) {
    return "premium";
  }
  return "deep-clean";
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
  };

  const recommendedType = getRecommendedServiceType(homeDetails, isFirstTime);

  let goodType: ServiceType = "touch-up";
  let betterType: ServiceType = recommendedType;
  let bestType: ServiceType = recommendedType;

  if (recommendedType === "deep-clean") {
    goodType = "premium";
    betterType = "deep-clean";
    bestType = "deep-clean";
  }

  const good = calculateQuoteOption(homeDetails, emptyAddOns, frequency, goodType, settings);
  good.name = "Good";

  const better = calculateQuoteOption(homeDetails, emptyAddOns, frequency, betterType, settings);
  better.name = "Better";

  const bestAddOns: AddOns = {
    ...emptyAddOns,
    insideFridge: true,
    insideOven: true,
  };
  const best = calculateQuoteOption(homeDetails, bestAddOns, frequency, bestType, settings);
  best.name = "Best";
  best.addOnsIncluded = ["Inside Fridge", "Inside Oven"];

  return { good, better, best };
}

export function generateEmailDraft(
  customerName: string,
  businessName: string,
  senderName: string,
  options: { good: QuoteOption; better: QuoteOption; best: QuoteOption },
  bookingLink?: string
): string {
  const betterPrice = options.better.price;
  const goodPrice = options.good.price;
  const bestPrice = options.best.price;

  let email = `Hi ${customerName},

Thank you for reaching out to ${businessName}! Based on the details you shared, here is your personalized cleaning quote.

Your Options:
- Good ($${goodPrice}): ${options.good.scope}
- Better ($${betterPrice}): ${options.better.scope} (Recommended)
- Best ($${bestPrice}): ${options.best.scope} + premium add-ons

The Better option at $${betterPrice} is our most popular choice and includes ${options.better.scope.toLowerCase()}.`;

  if (bookingLink) {
    email += `

Ready to book? Click here: ${bookingLink}`;
  } else {
    email += `

Reply to this email or give us a call to confirm your appointment.`;
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
  bookingLink?: string
): string {
  let sms = `Hi ${customerName}! Your ${businessName} quote is ready. Our recommended cleaning: $${betterPrice}.`;

  if (bookingLink) {
    sms += ` Book now: ${bookingLink}`;
  } else {
    sms += ` Reply YES to confirm or call us with questions!`;
  }

  return sms;
}
