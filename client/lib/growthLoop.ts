import AsyncStorage from "@react-native-async-storage/async-storage";
import { Share, Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as StoreReview from "expo-store-review";

export const COMMUNITY_URL = "https://getquotepro.ai/community";
export const APP_STORE_URL = "https://apps.apple.com/app/quotepro-ai/id6743187498";
export const WEBSITE_URL = "https://getquotepro.ai";

export const SHARE_MESSAGE = `I've been testing this quoting app built by a cleaning franchise owner.\nIt creates quotes fast and generates follow-ups.\nWorth checking out: ${WEBSITE_URL}`;
export const SHARE_TITLE = "QuotePro AI — quoting built for cleaners";

const KEYS = {
  hasSeenFounderModal: "@qp_founder_modal_seen",
  founderModalDismissedAt: "@qp_founder_modal_dismissed_at",
  bannerDismissedUntil: "@qp_banner_dismissed_until",
  lastReviewPromptAt: "@qp_last_review_prompt_at",
  installDate: "@qp_install_date",
  sessionCount: "@qp_session_count",
};

const DAYS_MS = 24 * 60 * 60 * 1000;

export async function ensureInstallDate(): Promise<void> {
  const existing = await AsyncStorage.getItem(KEYS.installDate);
  if (!existing) {
    await AsyncStorage.setItem(KEYS.installDate, Date.now().toString());
  }
}

export async function incrementSessionCount(): Promise<number> {
  const current = await AsyncStorage.getItem(KEYS.sessionCount);
  const count = (parseInt(current || "0", 10) || 0) + 1;
  await AsyncStorage.setItem(KEYS.sessionCount, count.toString());
  return count;
}

export async function getSessionCount(): Promise<number> {
  const val = await AsyncStorage.getItem(KEYS.sessionCount);
  return parseInt(val || "0", 10) || 0;
}

export async function shouldShowFounderModal(): Promise<boolean> {
  try {
    const seen = await AsyncStorage.getItem(KEYS.hasSeenFounderModal);
    if (seen === "true") {
      const dismissedAt = await AsyncStorage.getItem(KEYS.founderModalDismissedAt);
      if (dismissedAt) {
        const elapsed = Date.now() - parseInt(dismissedAt, 10);
        return elapsed > 14 * DAYS_MS;
      }
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function markFounderModalSeen(): Promise<void> {
  await AsyncStorage.setItem(KEYS.hasSeenFounderModal, "true");
}

export async function markFounderModalDismissed(): Promise<void> {
  await AsyncStorage.setItem(KEYS.hasSeenFounderModal, "true");
  await AsyncStorage.setItem(KEYS.founderModalDismissedAt, Date.now().toString());
}

export async function shouldShowBanner(): Promise<boolean> {
  try {
    const until = await AsyncStorage.getItem(KEYS.bannerDismissedUntil);
    if (!until) return true;
    return Date.now() > parseInt(until, 10);
  } catch {
    return true;
  }
}

export async function dismissBanner(): Promise<void> {
  const until = Date.now() + 30 * DAYS_MS;
  await AsyncStorage.setItem(KEYS.bannerDismissedUntil, until.toString());
}

export async function shouldPromptReview(quoteCount: number): Promise<boolean> {
  try {
    if (quoteCount < 3) return false;

    const installDateStr = await AsyncStorage.getItem(KEYS.installDate);
    const sessionCount = await getSessionCount();
    const lastPromptStr = await AsyncStorage.getItem(KEYS.lastReviewPromptAt);

    if (installDateStr) {
      const daysSinceInstall = (Date.now() - parseInt(installDateStr, 10)) / DAYS_MS;
      if (daysSinceInstall < 7 && sessionCount < 2) return false;
    }

    if (lastPromptStr) {
      const daysSincePrompt = (Date.now() - parseInt(lastPromptStr, 10)) / DAYS_MS;
      if (daysSincePrompt < 90) return false;
    }

    return true;
  } catch {
    return false;
  }
}

export async function markReviewPrompted(): Promise<void> {
  await AsyncStorage.setItem(KEYS.lastReviewPromptAt, Date.now().toString());
}

export async function triggerNativeReview(): Promise<boolean> {
  try {
    const available = await StoreReview.isAvailableAsync();
    if (available) {
      await StoreReview.requestReview();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function openShareSheet(source: string): Promise<string | null> {
  try {
    const result = await Share.share(
      {
        message: SHARE_MESSAGE,
        title: SHARE_TITLE,
        ...(Platform.OS === "ios" ? { url: APP_STORE_URL } : {}),
      },
      { subject: SHARE_TITLE }
    );
    if (result.action === Share.sharedAction) {
      return result.activityType || "shared";
    }
    return null;
  } catch {
    return null;
  }
}

export async function openCommunity(): Promise<void> {
  try {
    await WebBrowser.openBrowserAsync(COMMUNITY_URL);
  } catch {}
}

export async function openAppStoreReview(): Promise<void> {
  try {
    const reviewUrl = `${APP_STORE_URL}?action=write-review`;
    if (Platform.OS === "web") {
      await WebBrowser.openBrowserAsync(reviewUrl);
    } else {
      const { Linking } = require("react-native");
      await Linking.openURL(reviewUrl);
    }
  } catch {}
}
