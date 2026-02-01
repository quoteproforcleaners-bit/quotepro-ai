import AsyncStorage from "@react-native-async-storage/async-storage";
import { v4 as uuidv4 } from "uuid";
import {
  BusinessProfile,
  PricingSettings,
  Quote,
  DEFAULT_PRICING_SETTINGS,
  DEFAULT_BUSINESS_PROFILE,
} from "@/types";

const KEYS = {
  BUSINESS_PROFILE: "@cleanquote_business_profile",
  PRICING_SETTINGS: "@cleanquote_pricing_settings",
  QUOTES: "@cleanquote_quotes",
};

export async function getBusinessProfile(): Promise<BusinessProfile> {
  try {
    const data = await AsyncStorage.getItem(KEYS.BUSINESS_PROFILE);
    if (data) {
      return JSON.parse(data);
    }
    return { ...DEFAULT_BUSINESS_PROFILE, id: uuidv4() };
  } catch (error) {
    console.error("Error getting business profile:", error);
    return { ...DEFAULT_BUSINESS_PROFILE, id: uuidv4() };
  }
}

export async function saveBusinessProfile(
  profile: BusinessProfile
): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.BUSINESS_PROFILE, JSON.stringify(profile));
  } catch (error) {
    console.error("Error saving business profile:", error);
    throw error;
  }
}

export async function getPricingSettings(): Promise<PricingSettings> {
  try {
    const data = await AsyncStorage.getItem(KEYS.PRICING_SETTINGS);
    if (data) {
      return JSON.parse(data);
    }
    return DEFAULT_PRICING_SETTINGS;
  } catch (error) {
    console.error("Error getting pricing settings:", error);
    return DEFAULT_PRICING_SETTINGS;
  }
}

export async function savePricingSettings(
  settings: PricingSettings
): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.PRICING_SETTINGS, JSON.stringify(settings));
  } catch (error) {
    console.error("Error saving pricing settings:", error);
    throw error;
  }
}

export async function getQuotes(): Promise<Quote[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.QUOTES);
    if (data) {
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error("Error getting quotes:", error);
    return [];
  }
}

export async function saveQuote(quote: Quote): Promise<void> {
  try {
    const quotes = await getQuotes();
    const existingIndex = quotes.findIndex((q) => q.id === quote.id);
    if (existingIndex >= 0) {
      quotes[existingIndex] = quote;
    } else {
      quotes.unshift(quote);
    }
    await AsyncStorage.setItem(KEYS.QUOTES, JSON.stringify(quotes));
  } catch (error) {
    console.error("Error saving quote:", error);
    throw error;
  }
}

export async function deleteQuote(quoteId: string): Promise<void> {
  try {
    const quotes = await getQuotes();
    const filtered = quotes.filter((q) => q.id !== quoteId);
    await AsyncStorage.setItem(KEYS.QUOTES, JSON.stringify(filtered));
  } catch (error) {
    console.error("Error deleting quote:", error);
    throw error;
  }
}
