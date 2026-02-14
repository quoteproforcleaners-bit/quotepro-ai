export interface PaymentMethodOption {
  enabled: boolean;
  handle?: string;
  feeNote?: string;
  label?: string;
}

export interface PaymentOptions {
  cash: PaymentMethodOption;
  check: PaymentMethodOption;
  creditCard: PaymentMethodOption;
  venmo: PaymentMethodOption;
  cashApp: PaymentMethodOption;
  zelle: PaymentMethodOption;
  applePay: PaymentMethodOption;
  ach: PaymentMethodOption;
  other: PaymentMethodOption;
}

export const DEFAULT_PAYMENT_OPTIONS: PaymentOptions = {
  cash: { enabled: true },
  check: { enabled: true },
  creditCard: { enabled: true },
  venmo: { enabled: false },
  cashApp: { enabled: false },
  zelle: { enabled: false },
  applePay: { enabled: false },
  ach: { enabled: false },
  other: { enabled: false },
};

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
  emailSignature: string;
  smsSignature: string;
  onboardingComplete: boolean;
  venmoHandle: string | null;
  cashappHandle: string | null;
  paymentOptions: PaymentOptions | null;
  paymentNotes: string | null;
}

export interface ServiceTypeConfig {
  id: string;
  name: string;
  multiplier: number;
  scope: string;
  isDefault: boolean;
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
  serviceTypes: ServiceTypeConfig[];
  goodOptionId: string;
  betterOptionId: string;
  bestOptionId: string;
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

export interface QuoteOption {
  name: string;
  serviceTypeId: string;
  serviceTypeName: string;
  scope: string;
  price: number;
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

export const DEFAULT_SERVICE_TYPES: ServiceTypeConfig[] = [
  {
    id: "touch-up",
    name: "Touch Up",
    multiplier: 0.7,
    scope: "Kitchen, bathrooms, and floors only",
    isDefault: true,
  },
  {
    id: "regular",
    name: "Standard Cleaning",
    multiplier: 1.0,
    scope: "Complete whole-home cleaning",
    isDefault: true,
  },
  {
    id: "deep-clean",
    name: "Deep Clean",
    multiplier: 1.35,
    scope: "Thorough first-time or catch-up cleaning",
    isDefault: true,
  },
  {
    id: "move-in-out",
    name: "Move In/Out",
    multiplier: 1.5,
    scope: "Detailed move-ready cleaning",
    isDefault: true,
  },
  {
    id: "post-construction",
    name: "Post Construction",
    multiplier: 1.75,
    scope: "Heavy-duty post-build cleanup",
    isDefault: true,
  },
  {
    id: "airbnb",
    name: "Airbnb Turnover",
    multiplier: 0.85,
    scope: "Quick turnover cleaning between guests",
    isDefault: true,
  },
];

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
  serviceTypes: DEFAULT_SERVICE_TYPES,
  goodOptionId: "touch-up",
  betterOptionId: "regular",
  bestOptionId: "deep-clean",
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
  emailSignature: "",
  smsSignature: "",
  onboardingComplete: false,
  venmoHandle: null,
  cashappHandle: null,
  paymentOptions: null,
  paymentNotes: null,
};
