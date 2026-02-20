import AsyncStorage from "@react-native-async-storage/async-storage";
import type { CustomerInfo, HomeDetails, AddOns, ServiceFrequency } from "@/types";

const GUEST_DRAFT_KEY = "@quotepro_guest_draft";

export interface GuestDraft {
  customer: CustomerInfo;
  homeDetails: HomeDetails;
  addOns: AddOns;
  frequency: ServiceFrequency;
  selectedOption: "good" | "better" | "best";
  savedAt: number;
}

export async function saveGuestDraft(draft: Omit<GuestDraft, "savedAt">): Promise<void> {
  try {
    const data: GuestDraft = { ...draft, savedAt: Date.now() };
    await AsyncStorage.setItem(GUEST_DRAFT_KEY, JSON.stringify(data));
  } catch {}
}

export async function loadGuestDraft(): Promise<GuestDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(GUEST_DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GuestDraft;
  } catch {
    return null;
  }
}

export async function clearGuestDraft(): Promise<void> {
  try {
    await AsyncStorage.removeItem(GUEST_DRAFT_KEY);
  } catch {}
}
