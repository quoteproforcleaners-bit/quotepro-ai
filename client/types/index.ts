export interface BusinessProfile {
  id: string;
  companyName: string;
  email: string;
  phone: string;
  address: string;
  logoUri: string | null;
  primaryColor: string;
  senderName: string;
  senderTitle: string;
  bookingLink: string;
  onboardingComplete: boolean;
}

export interface PricingSettings {
  hourlyRate: number;
  minimumTicket: number;
  taxRate: number;
  addOnPrices: {
    insideFridge: number;
    insideOven: number;
    insideCabinets: number;
    interiorWindows: number;
    blindsDetail: number;
    baseboardsDetail: number;
    laundryFoldOnly: number;
    dishes: number;
    organizationTidy: number;
  };
  frequencyDiscounts: {
    weekly: number;
    biweekly: number;
    monthly: number;
  };
}

export interface CustomerInfo {
  name: string;
  phone: string;
  email: string;
  address: string;
  datePreference: string;
}

export interface HomeDetails {
  sqft: number;
  beds: number;
  baths: number;
  halfBaths: number;
  conditionScore: number;
  peopleCount: number;
  petType: "none" | "cat" | "dog" | "multiple";
  petShedding: boolean;
  homeType: "house" | "apartment" | "townhome";
  kitchensCount: number;
}

export interface AddOns {
  insideFridge: boolean;
  insideOven: boolean;
  insideCabinets: boolean;
  interiorWindows: boolean;
  blindsDetail: boolean;
  baseboardsDetail: boolean;
  laundryFoldOnly: boolean;
  dishes: boolean;
  organizationTidy: boolean;
}

export type ServiceFrequency = "one-time" | "weekly" | "biweekly" | "monthly";
export type ServiceType = "touch-up" | "premium" | "deep-clean" | "move-in-out" | "post-construction";

export interface QuoteOption {
  name: string;
  serviceType: ServiceType;
  scope: string;
  price: number;
  hours: number;
  addOnsIncluded: string[];
}

export interface Quote {
  id: string;
  customer: CustomerInfo;
  homeDetails: HomeDetails;
  addOns: AddOns;
  frequency: ServiceFrequency;
  options: {
    good: QuoteOption;
    better: QuoteOption;
    best: QuoteOption;
  };
  selectedOption: "good" | "better" | "best";
  createdAt: string;
  status: "draft" | "sent" | "accepted" | "expired";
  emailDraft?: string;
  smsDraft?: string;
}

export const DEFAULT_PRICING_SETTINGS: PricingSettings = {
  hourlyRate: 55,
  minimumTicket: 179,
  taxRate: 0,
  addOnPrices: {
    insideFridge: 35,
    insideOven: 35,
    insideCabinets: 75,
    interiorWindows: 75,
    blindsDetail: 75,
    baseboardsDetail: 75,
    laundryFoldOnly: 35,
    dishes: 35,
    organizationTidy: 75,
  },
  frequencyDiscounts: {
    weekly: 15,
    biweekly: 10,
    monthly: 5,
  },
};

export const DEFAULT_BUSINESS_PROFILE: BusinessProfile = {
  id: "",
  companyName: "",
  email: "",
  phone: "",
  address: "",
  logoUri: null,
  primaryColor: "#2563EB",
  senderName: "",
  senderTitle: "",
  bookingLink: "",
  onboardingComplete: false,
};
