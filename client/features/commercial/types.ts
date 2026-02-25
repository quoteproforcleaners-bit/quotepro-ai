export type FacilityType =
  | 'Office'
  | 'Retail'
  | 'Medical'
  | 'Gym'
  | 'School'
  | 'Warehouse'
  | 'Restaurant'
  | 'Other';

export type GlassLevel = 'None' | 'Some' | 'Lots';

export type CommercialFrequency = '1x' | '2x' | '3x' | '5x' | 'daily' | 'custom';

export type RoundingRule = 'none' | '5' | '10' | '25';

export type SuppliesSurchargeType = 'fixed' | 'percent';

export type CommercialQuoteType = 'residential' | 'commercial';

export type CommercialQuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined';

export interface CommercialWalkthrough {
  facilityName: string;
  siteAddress: string;
  facilityType: FacilityType;
  totalSqFt: number;
  floors: number;
  afterHoursRequired: boolean;
  accessConstraints: string;
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
  frequency: CommercialFrequency;
  preferredDays: string;
  preferredTimeWindow: string;
  durationPerVisitConstraint: number;
  suppliesByClient: boolean;
  restroomConsumablesIncluded: boolean;
  specialChemicals: string;
  notes: string;
  photos: string[];
}

export interface CommercialLaborEstimate {
  rawMinutes: number;
  rawHours: number;
  recommendedCleaners: number;
  overrideHours?: number;
  targetMinutesPerCleaner: number;
}

export interface CommercialPricing {
  hourlyRate: number;
  overheadPct: number;
  targetMarginPct: number;
  suppliesSurcharge: number;
  suppliesSurchargeType: SuppliesSurchargeType;
  finalPricePerVisit: number;
  monthlyPrice: number;
  roundingRule: RoundingRule;
}

export interface CommercialTier {
  name: string;
  scopeText: string;
  includedBullets: string[];
  excludedBullets: string[];
  pricePerVisit: number;
  monthlyPrice: number;
  frequency: CommercialFrequency;
}

export interface ProposalAttachment {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
}

export interface ProposalAttachments {
  coi?: ProposalAttachment;
  w9?: ProposalAttachment;
}

export interface CommercialQuoteData {
  quoteType: CommercialQuoteType;
  walkthrough: CommercialWalkthrough;
  laborEstimate: CommercialLaborEstimate;
  pricing: CommercialPricing;
  tiers: CommercialTier[];
  status: CommercialQuoteStatus;
  attachments?: ProposalAttachments;
}

export const DEFAULT_WALKTHROUGH: CommercialWalkthrough = {
  facilityName: '',
  siteAddress: '',
  facilityType: 'Office',
  totalSqFt: 0,
  floors: 1,
  afterHoursRequired: false,
  accessConstraints: '',
  bathroomCount: 0,
  breakroomCount: 0,
  conferenceRoomCount: 0,
  privateOfficeCount: 0,
  openAreaCount: 0,
  entryLobbyCount: 0,
  trashPointCount: 0,
  carpetPercent: 50,
  hardFloorPercent: 50,
  glassLevel: 'None',
  highTouchFocus: false,
  frequency: '3x',
  preferredDays: '',
  preferredTimeWindow: '',
  durationPerVisitConstraint: 0,
  suppliesByClient: false,
  restroomConsumablesIncluded: true,
  specialChemicals: '',
  notes: '',
  photos: [],
};
