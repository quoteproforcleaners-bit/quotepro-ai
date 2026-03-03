import AsyncStorage from "@react-native-async-storage/async-storage";

const ONBOARDING_KEY = "quotepro_onboarding_status";

export interface OnboardingStatus {
  startedAt: string | null;
  completed: boolean;
  skipped: boolean;
  currentStep: number;
  primaryGoal: string | null;
  businessName: string | null;
  zipCode: string | null;
  logoUri: string | null;
  acceptanceEnabled: boolean;
  followupsEnabled: boolean;
  cadencePreset: "light" | "standard" | "aggressive";
  tone: "friendly" | "confident" | "direct";
  quoteDraft: any | null;
  selectedTier: string | null;
  selectedAddOns: string[];
  sentQuote: boolean;
  ownerContact: { phone?: string; email?: string } | null;
}

const DEFAULT_STATUS: OnboardingStatus = {
  startedAt: null,
  completed: false,
  skipped: false,
  currentStep: 0,
  primaryGoal: null,
  businessName: null,
  zipCode: null,
  logoUri: null,
  acceptanceEnabled: true,
  followupsEnabled: false,
  cadencePreset: "standard",
  tone: "friendly",
  quoteDraft: null,
  selectedTier: null,
  selectedAddOns: [],
  sentQuote: false,
  ownerContact: null,
};

export async function getOnboardingStatus(): Promise<OnboardingStatus> {
  try {
    const raw = await AsyncStorage.getItem(ONBOARDING_KEY);
    if (raw) {
      return { ...DEFAULT_STATUS, ...JSON.parse(raw) };
    }
  } catch {}
  return { ...DEFAULT_STATUS };
}

export async function setOnboardingStatus(status: Partial<OnboardingStatus>): Promise<OnboardingStatus> {
  const current = await getOnboardingStatus();
  const updated = { ...current, ...status };
  await AsyncStorage.setItem(ONBOARDING_KEY, JSON.stringify(updated));
  return updated;
}

export async function markStepComplete(step: number): Promise<OnboardingStatus> {
  return setOnboardingStatus({ currentStep: Math.max(step + 1, (await getOnboardingStatus()).currentStep) });
}

export async function markSkipped(): Promise<OnboardingStatus> {
  return setOnboardingStatus({ skipped: true });
}

export async function markCompleted(): Promise<OnboardingStatus> {
  return setOnboardingStatus({ completed: true, currentStep: 3 });
}

export async function resetOnboarding(): Promise<void> {
  await AsyncStorage.removeItem(ONBOARDING_KEY);
}

export function getProgressPercent(status: OnboardingStatus): number {
  if (status.completed) return 100;
  return Math.round((status.currentStep / 3) * 100);
}
