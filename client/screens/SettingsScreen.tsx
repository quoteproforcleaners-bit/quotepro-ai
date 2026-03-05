import React, { useState, useCallback, useEffect } from "react";
import { View, StyleSheet, Image, Pressable, Platform, Modal, TextInput as RNTextInput, Linking, useWindowDimensions, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/Input";
import { SectionHeader } from "@/components/SectionHeader";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { getApiUrl, apiRequest } from "@/lib/query-client";
import { PaymentOptions, DEFAULT_PAYMENT_OPTIONS } from "@/types";
import { PAYMENT_METHOD_LABELS, getPaymentOptions } from "@/lib/paymentOptions";
import { Switch } from "react-native";
import { useLanguage } from "@/context/LanguageContext";
import { LANGUAGE_LABELS, type Language } from "@/i18n";
import { syncNotificationSchedule } from "@/lib/notifications";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { useDarkModePreference } from "@/hooks/useColorScheme";
import { useAIConsent } from "@/context/AIConsentContext";
import { FeatureFlags } from "@/lib/featureFlags";
import { useTutorial } from "@/context/TutorialContext";
import { DASHBOARD_TOUR, SETTINGS_TOUR } from "@/lib/tourDefinitions";
import { trackEvent } from "@/lib/analytics";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { width: screenWidth } = useWindowDimensions();
  const useMaxWidth = screenWidth > 600;
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user, logout } = useAuth();
  const { businessProfile: profile, updateBusinessProfile } = useApp();
  const { isPro, subscriptionStatus, trialDaysLeft, restore } = useSubscription();
  const [restoring, setRestoring] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);
  const { language, setLanguage, communicationLanguage, setCommunicationLanguage, t } = useLanguage();
  const { preference: darkModePref, setPreference: setDarkModePref } = useDarkModePreference();
  const { hasConsented: aiConsented, requestConsent: requestAIConsent, revokeConsent: revokeAIConsent } = useAIConsent();
  const tutorialCtx = useTutorial();
  const resetAllTours = tutorialCtx?.resetAllTours;
  const startTour = tutorialCtx?.startTour;
  const completedTours = tutorialCtx?.completedTours || [];
  const hasCompletedTour = tutorialCtx?.hasCompletedTour || (() => false);
  const tourActive = tutorialCtx?.isActive || false;
  const [commercialEnabled, setCommercialEnabled] = useState(FeatureFlags.commercialQuotingEnabled);

  const { data: growthSettings, refetch: refetchGrowthSettings } = useQuery<any>({
    queryKey: ["/api/growth-automation-settings"],
  });
  const [reviewLinkInput, setReviewLinkInput] = useState("");
  const [referralAmountInput, setReferralAmountInput] = useState("25");
  const [referralLinkInput, setReferralLinkInput] = useState("");
  const [reviewLinkSaving, setReviewLinkSaving] = useState(false);

  useEffect(() => {
    if (growthSettings) {
      setReviewLinkInput(growthSettings.googleReviewLink || "");
      setReferralAmountInput(String(growthSettings.referralOfferAmount || 25));
      setReferralLinkInput(growthSettings.referralBookingLink || "");
    }
  }, [growthSettings]);

  const isValidUrl = (url: string) => {
    try {
      const parsed = new URL(url.trim());
      return parsed.protocol === "https:" || parsed.protocol === "http:";
    } catch { return false; }
  };

  const hasValidReviewLink = isValidUrl(reviewLinkInput);

  const updateGrowthSetting = useCallback(async (updates: Record<string, any>) => {
    try {
      setReviewLinkSaving(true);
      await apiRequest("PUT", "/api/growth-automation-settings", { ...growthSettings, ...updates });
      queryClient.invalidateQueries({ queryKey: ["/api/growth-automation-settings"] });
      Haptics.selectionAsync();
    } catch (e) {
      console.warn("Failed to update growth setting:", e);
    } finally {
      setReviewLinkSaving(false);
    }
  }, [growthSettings, queryClient]);

  useEffect(() => {
    try {
      if (startTour && hasCompletedTour && !hasCompletedTour(SETTINGS_TOUR.id) && !tourActive) {
        const timer = setTimeout(() => startTour(SETTINGS_TOUR), 800);
        return () => clearTimeout(timer);
      }
    } catch (e) {
      console.warn("Settings tour error:", e);
    }
  }, []);

  useEffect(() => {
    AsyncStorage.getItem("@quotepro_commercial_enabled").then((val) => {
      if (val !== null) {
        const enabled = val === "true";
        setCommercialEnabled(enabled);
        FeatureFlags.commercialQuotingEnabled = enabled;
      }
    }).catch(() => {});
  }, []);

  const handleToggleCommercial = async (val: boolean) => {
    setCommercialEnabled(val);
    FeatureFlags.commercialQuotingEnabled = val;
    try {
      await AsyncStorage.setItem("@quotepro_commercial_enabled", val ? "true" : "false");
    } catch {}
    Haptics.selectionAsync();
  };

  const queryClient = useQueryClient();

  const DAY_LABELS = [t.common.sunday, t.common.monday, t.common.tuesday, t.common.wednesday, t.common.thursday, t.common.friday, t.common.saturday];
  const TIME_OPTIONS = [
    { label: "6:00 AM", value: "06:00" },
    { label: "7:00 AM", value: "07:00" },
    { label: "8:00 AM", value: "08:00" },
    { label: "9:00 AM", value: "09:00" },
    { label: "10:00 AM", value: "10:00" },
    { label: "12:00 PM", value: "12:00" },
  ];

  const { data: prefs } = useQuery<{
    dailyPulseEnabled: boolean;
    dailyPulseTime: string;
    weeklyRecapEnabled: boolean;
    weeklyRecapDay: number;
    quietHoursEnabled: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
    dormantThresholdDays: number;
    maxFollowUpsPerDay: number;
    weeklyGoal: string | null;
    weeklyGoalTarget: number | null;
  }>({ queryKey: ["/api/preferences"] });

  const currentPrefs = prefs || {
    dailyPulseEnabled: true,
    dailyPulseTime: "08:00",
    weeklyRecapEnabled: true,
    weeklyRecapDay: 1,
    quietHoursEnabled: false,
    quietHoursStart: "21:00",
    quietHoursEnd: "08:00",
    dormantThresholdDays: 90,
    maxFollowUpsPerDay: 1,
    weeklyGoal: null,
    weeklyGoalTarget: null,
  };

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [showDormantPicker, setShowDormantPicker] = useState(false);

  const updatePref = useCallback(async (updates: Record<string, any>) => {
    try {
      const { dailyPulseEnabled, dailyPulseTime, weeklyRecapEnabled, weeklyRecapDay, quietHoursEnabled, quietHoursStart, quietHoursEnd, dormantThresholdDays, maxFollowUpsPerDay, weeklyGoal, weeklyGoalTarget } = { ...currentPrefs, ...updates };
      await apiRequest("PUT", "/api/preferences", { dailyPulseEnabled, dailyPulseTime, weeklyRecapEnabled, weeklyRecapDay, quietHoursEnabled, quietHoursStart, quietHoursEnd, dormantThresholdDays, maxFollowUpsPerDay, weeklyGoal, weeklyGoalTarget });
      queryClient.invalidateQueries({ queryKey: ["/api/preferences"] });
      Haptics.selectionAsync();
      const merged = { ...currentPrefs, ...updates };
      syncNotificationSchedule({
        dailyPulseEnabled: merged.dailyPulseEnabled,
        dailyPulseTime: merged.dailyPulseTime,
        weeklyRecapEnabled: merged.weeklyRecapEnabled,
        weeklyRecapDay: merged.weeklyRecapDay,
      });
    } catch (e) {
      console.warn("Failed to update preference:", e);
    }
  }, [currentPrefs, queryClient]);

  const { data: calendarStatus, refetch: refetchCalendar } = useQuery<{ connected: boolean }>({
    queryKey: ["/api/google-calendar/status"],
  });

  const { data: stripeStatus, refetch: refetchStripe } = useQuery<{ connected: boolean; accountId: string | null }>({
    queryKey: ["/api/stripe/status"],
  });

  const [stripeError, setStripeError] = useState<string | null>(null);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [showVenmoModal, setShowVenmoModal] = useState(false);
  const [showCashappModal, setShowCashappModal] = useState(false);
  const [venmoInput, setVenmoInput] = useState(profile.venmoHandle || "");
  const [cashappInput, setCashappInput] = useState(profile.cashappHandle || "");
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const currentPaymentOptions = getPaymentOptions(profile.paymentOptions);
  const [paymentNotesInput, setPaymentNotesInput] = useState(profile.paymentNotes || "");

  const handleConnectStripe = async () => {
    try {
      setStripeError(null);
      const res = await fetch(new URL("/api/stripe/connect", getApiUrl()).toString(), {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (data.url) {
        await WebBrowser.openBrowserAsync(data.url);
        refetchStripe();
      } else if (data.message) {
        setStripeError(data.message);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (e) {
      setStripeError("Could not connect to Stripe. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleDisconnectStripe = async () => {
    try {
      await fetch(new URL("/api/stripe/disconnect", getApiUrl()).toString(), {
        method: "DELETE",
        credentials: "include",
      });
      refetchStripe();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error("Stripe disconnect error", e);
    }
  };

  const handleSaveVenmo = async () => {
    const handle = venmoInput.trim().replace(/^@/, "");
    await updateBusinessProfile({ venmoHandle: handle || null });
    setShowVenmoModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleSaveCashapp = async () => {
    const handle = cashappInput.trim().replace(/^\$/, "");
    await updateBusinessProfile({ cashappHandle: handle || null });
    setShowCashappModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleConnectCalendar = async () => {
    try {
      setCalendarError(null);
      const res = await fetch(new URL("/api/google-calendar/connect", getApiUrl()).toString(), {
        credentials: "include",
      });
      const data = await res.json();
      if (data.url) {
        await WebBrowser.openBrowserAsync(data.url);
        refetchCalendar();
      } else if (data.message) {
        setCalendarError(data.message);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (e) {
      setCalendarError("Could not connect to Google Calendar. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleDisconnectCalendar = async () => {
    try {
      await fetch(new URL("/api/google-calendar/disconnect", getApiUrl()).toString(), {
        method: "DELETE",
        credentials: "include",
      });
      refetchCalendar();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error("Calendar disconnect error", e);
    }
  };

  const updateProfile = async (updates: Partial<typeof profile>) => {
    await updateBusinessProfile(updates);
    Haptics.selectionAsync();
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      updateProfile({ logoUri: result.assets[0].uri });
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: tabBarHeight + Spacing.xl,
        },
        useMaxWidth ? { maxWidth: 560, alignSelf: "center" as const, width: "100%" } : undefined,
      ]}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
      keyboardShouldPersistTaps="handled"
    >
      <SectionHeader title={t.settings.subscription} />

      {subscriptionStatus === "active" ? (
        <View
          style={[
            styles.proActiveCard,
            { backgroundColor: `${theme.primary}10`, borderColor: `${theme.primary}30` },
          ]}
        >
          <View style={styles.proActiveHeader}>
            <View style={[styles.proBadge, { backgroundColor: theme.primary }]}>
              <Feather name="zap" size={14} color="#FFFFFF" />
              <ThemedText type="small" style={{ color: "#FFFFFF", fontWeight: "700", marginLeft: 4 }}>
                AI
              </ThemedText>
            </View>
            <ThemedText type="small" style={{ color: theme.success, fontWeight: "600" }}>
              {t.common.active}
            </ThemedText>
          </View>
          <ThemedText type="body" style={{ fontWeight: "600", marginTop: Spacing.sm }}>
            QuotePro AI
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 4 }}>
            {t.settings.aiActiveDesc}
          </ThemedText>
        </View>
      ) : subscriptionStatus === "trial" ? (
        <View
          style={[
            styles.proActiveCard,
            { backgroundColor: `${theme.primary}10`, borderColor: `${theme.primary}30` },
          ]}
        >
          <View style={styles.proActiveHeader}>
            <View style={[styles.proBadge, { backgroundColor: theme.primary }]}>
              <Feather name="zap" size={14} color="#FFFFFF" />
              <ThemedText type="small" style={{ color: "#FFFFFF", fontWeight: "700", marginLeft: 4 }}>
                TRIAL
              </ThemedText>
            </View>
            <ThemedText type="small" style={{ color: theme.warning, fontWeight: "600" }}>
              {trialDaysLeft !== null ? `${trialDaysLeft} ${trialDaysLeft === 1 ? t.common.day : t.common.days} left` : "Trial"}
            </ThemedText>
          </View>
          <ThemedText type="body" style={{ fontWeight: "600", marginTop: Spacing.sm }}>
            QuotePro AI Trial
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 4 }}>
            {t.settings.aiActiveDesc}
          </ThemedText>
        </View>
      ) : subscriptionStatus === "expired" ? (
        <View
          style={[
            styles.proActiveCard,
            { backgroundColor: `${theme.error}08`, borderColor: `${theme.error}30` },
          ]}
        >
          <View style={styles.proActiveHeader}>
            <View style={[styles.proBadge, { backgroundColor: theme.error }]}>
              <Feather name="alert-circle" size={14} color="#FFFFFF" />
              <ThemedText type="small" style={{ color: "#FFFFFF", fontWeight: "700", marginLeft: 4 }}>
                EXPIRED
              </ThemedText>
            </View>
          </View>
          <ThemedText type="body" style={{ fontWeight: "600", marginTop: Spacing.sm }}>
            Subscription Expired
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 4 }}>
            Your subscription has expired. Renew to regain access to all Pro features.
          </ThemedText>
          <Pressable
            onPress={() => navigation.navigate("Paywall", { trigger_source: "settings" })}
            style={[styles.upgradeBtn, { backgroundColor: theme.accent, marginTop: Spacing.md }]}
            testID="button-renew-subscription"
          >
            <Feather name="zap" size={18} color="#FFFFFF" />
            <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "700", marginLeft: 8 }}>
              Renew Subscription
            </ThemedText>
          </Pressable>
        </View>
      ) : (
        <View
          style={[
            styles.proUpgradeCard,
            { backgroundColor: theme.cardBackground, borderColor: theme.border },
          ]}
        >
          <View style={[styles.proUpgradeIcon, { backgroundColor: `${theme.accent}15` }]}>
            <Feather name="zap" size={28} color={theme.accent} />
          </View>
          <ThemedText type="h4" style={{ marginTop: Spacing.md }}>
            {t.settings.upgradeToAI}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 4, textAlign: "center" }}>
            {t.settings.upgradeSubtitle}
          </ThemedText>

          <View style={styles.proFeaturesList}>
            {[
              { icon: "edit-3" as const, text: t.settings.aiWrittenMessages },
              { icon: "send" as const, text: t.settings.sendQuotesDirect },
              { icon: "zap" as const, text: t.settings.aiEnhancedDescriptions },
              { icon: "refresh-cw" as const, text: t.settings.regenerateMessages },
              { icon: "user" as const, text: t.settings.personalizedForCustomer },
            ].map((feature, i) => (
              <View key={i} style={styles.proFeatureItem}>
                <View style={[styles.proFeatureCheck, { backgroundColor: `${theme.success}15` }]}>
                  <Feather name={feature.icon} size={14} color={theme.success} />
                </View>
                <ThemedText type="small" style={{ flex: 1 }}>
                  {feature.text}
                </ThemedText>
              </View>
            ))}
          </View>

          <Pressable
            onPress={() => navigation.navigate("Paywall", { trigger_source: "settings" })}
            style={[
              styles.upgradeBtn,
              { backgroundColor: theme.accent },
            ]}
            testID="button-upgrade-pro"
          >
            <Feather name="zap" size={18} color="#FFFFFF" />
            <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "700", marginLeft: 8 }}>
              {t.settings.upgradeToAI}
            </ThemedText>
          </Pressable>

          <View style={[styles.freePlanInfo, { backgroundColor: `${theme.warning}10`, borderColor: `${theme.warning}25` }]}>
            <Feather name="info" size={16} color={theme.warning} />
            <ThemedText type="small" style={{ flex: 1, marginLeft: Spacing.sm, color: theme.textSecondary }}>
              Free Plan: 3 quotes included. No AI messaging, follow-up queue, or PDF export.
            </ThemedText>
          </View>
        </View>
      )}

      <Pressable
        onPress={async () => {
          setRestoring(true);
          setRestoreMessage(null);
          try {
            const restored = await restore();
            if (restored) {
              setRestoreMessage(t.paywall.restoreSuccessMessage);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
              setRestoreMessage(t.paywall.noSubscriptionMessage);
            }
          } catch {
            setRestoreMessage(t.paywall.restoreFailedMessage);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          } finally {
            setRestoring(false);
          }
        }}
        style={[styles.settingsLink, { backgroundColor: theme.cardBackground, borderColor: theme.border, marginBottom: Spacing.sm }]}
        testID="button-restore-purchases-settings"
      >
        <View style={styles.settingsLinkContent}>
          <View style={[styles.settingsLinkIcon, { backgroundColor: `${theme.primary}15` }]}>
            <Feather name="refresh-cw" size={20} color={theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="body" style={{ fontWeight: "600" }}>
              {t.paywall.restorePurchases}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Already subscribed? Restore your purchase
            </ThemedText>
          </View>
          {restoring ? (
            <ThemedText type="small" style={{ color: theme.primary }}>...</ThemedText>
          ) : (
            <Feather name="chevron-right" size={20} color={theme.textSecondary} />
          )}
        </View>
      </Pressable>

      {restoreMessage ? (
        <View style={{ backgroundColor: `${theme.primary}10`, padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.md }}>
          <ThemedText type="small" style={{ color: theme.primary, textAlign: "center" }}>
            {restoreMessage}
          </ThemedText>
        </View>
      ) : null}

      {!isPro ? (
        <View
          style={[
            styles.freeLimitsCard,
            { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
          ]}
          testID="free-limits-info"
        >
          <View style={styles.freeLimitsHeader}>
            <Feather name="info" size={16} color={theme.textSecondary} />
            <ThemedText type="subtitle" style={{ marginLeft: Spacing.sm, fontWeight: "600" }}>
              Free Plan Limits
            </ThemedText>
          </View>
          <View style={styles.freeLimitsList}>
            <View style={styles.freeLimitRow}>
              <Feather name="file-text" size={14} color={theme.textSecondary} />
              <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: Spacing.sm, flex: 1 }}>
                3 residential quotes total
              </ThemedText>
            </View>
            <View style={styles.freeLimitRow}>
              <Feather name="x-circle" size={14} color={theme.textSecondary} />
              <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: Spacing.sm, flex: 1 }}>
                No AI messaging
              </ThemedText>
            </View>
            <View style={styles.freeLimitRow}>
              <Feather name="x-circle" size={14} color={theme.textSecondary} />
              <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: Spacing.sm, flex: 1 }}>
                No follow-up queue
              </ThemedText>
            </View>
            <View style={styles.freeLimitRow}>
              <Feather name="x-circle" size={14} color={theme.textSecondary} />
              <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: Spacing.sm, flex: 1 }}>
                No PDF export
              </ThemedText>
            </View>
          </View>
          <Pressable
            onPress={() => navigation.navigate("Paywall", { trigger_source: "settings" })}
            style={[styles.freeLimitsUpgradeLink]}
            testID="button-upgrade-from-limits"
          >
            <ThemedText type="small" style={{ color: theme.primary, fontWeight: "600" }}>
              Upgrade for unlimited access
            </ThemedText>
            <Feather name="arrow-right" size={14} color={theme.primary} style={{ marginLeft: 4 }} />
          </Pressable>
        </View>
      ) : null}

      <SectionHeader title={t.settings.businessProfile} />

      <View style={styles.avatarRow}>
        <Pressable
          onPress={() => navigation.navigate("AvatarBuilder" as any)}
          style={[
            styles.avatarContainer,
            { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
          ]}
          testID="button-customize-avatar"
        >
          <ProfileAvatar
            config={profile.avatarConfig || null}
            size={64}
            fallbackInitials={profile.companyName}
          />
          <View style={[styles.editBadge, { backgroundColor: theme.primary }]}>
            <Feather name="edit-2" size={12} color="#FFFFFF" />
          </View>
        </Pressable>
        <View style={{ flex: 1, marginLeft: Spacing.md }}>
          <ThemedText type="body" style={{ fontWeight: "600" }}>{t.settings.avatar}</ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>{t.settings.avatarSubtitle}</ThemedText>
        </View>
      </View>

      <Input
        label={t.settings.companyName}
        value={profile.companyName}
        onChangeText={(v) => updateProfile({ companyName: v })}
        placeholder={t.settings.companyNamePlaceholder}
        leftIcon="briefcase"
      />

      <Input
        label={t.customers.email}
        value={profile.email}
        onChangeText={(v) => updateProfile({ email: v })}
        placeholder="contact@yourcompany.com"
        keyboardType="email-address"
        autoCapitalize="none"
        leftIcon="mail"
      />

      <Input
        label={t.customers.phone}
        value={profile.phone}
        onChangeText={(v) => updateProfile({ phone: v })}
        placeholder="(555) 123-4567"
        keyboardType="phone-pad"
        leftIcon="phone"
      />

      <Input
        label={t.customers.address}
        value={profile.address}
        onChangeText={(v) => updateProfile({ address: v })}
        placeholder="123 Main St, City, State"
        leftIcon="map-pin"
      />

      <SectionHeader title={t.settings.branding} subtitle={t.settings.brandingSubtitle} />

      <Input
        label={t.settings.senderName}
        value={profile.senderName}
        onChangeText={(v) => updateProfile({ senderName: v })}
        placeholder={t.settings.senderNamePlaceholder}
        leftIcon="user"
      />

      <Input
        label={t.settings.senderTitle}
        value={profile.senderTitle}
        onChangeText={(v) => updateProfile({ senderTitle: v })}
        placeholder={t.settings.senderTitlePlaceholder}
        leftIcon="award"
      />

      <Input
        label={t.settings.bookingLink}
        value={profile.bookingLink}
        onChangeText={(v) => updateProfile({ bookingLink: v })}
        placeholder={t.settings.bookingLinkPlaceholder}
        keyboardType="url"
        autoCapitalize="none"
        leftIcon="link"
      />

      <SectionHeader title={t.settings.signatures} subtitle={t.settings.signaturesSubtitle} />

      <Input
        label={t.settings.emailSignature}
        value={profile.emailSignature}
        onChangeText={(v) => updateProfile({ emailSignature: v })}
        placeholder={t.settings.emailSigPlaceholder}
        multiline
        numberOfLines={3}
        leftIcon="edit-3"
        testID="input-email-signature"
      />

      <Input
        label={t.settings.smsSignature}
        value={profile.smsSignature}
        onChangeText={(v) => updateProfile({ smsSignature: v })}
        placeholder={t.settings.smsSigPlaceholder}
        leftIcon="message-square"
        testID="input-sms-signature"
      />

      <SectionHeader title={t.settings.pricingAndServices} />

      <Pressable
        onPress={() => navigation.navigate("PricingSettings")}
        style={[
          styles.quoteSettingsCard,
          { backgroundColor: theme.gradientPrimary, borderColor: `${theme.primary}25` },
        ]}
        testID="button-pricing-settings"
      >
        <View style={styles.settingsLinkContent}>
          <View style={[styles.quoteSettingsIcon, { backgroundColor: `${theme.primary}20` }]}>
            <Feather name="sliders" size={22} color={theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <ThemedText type="body" style={{ fontWeight: "700", fontSize: 16 }}>
                Quote Settings
              </ThemedText>
              <View style={[styles.quoteSettingsBadge, { backgroundColor: `${theme.primary}15` }]}>
                <Feather name="zap" size={10} color={theme.primary} />
                <ThemedText type="caption" style={{ color: theme.primary, fontWeight: "600", marginLeft: 3, fontSize: 10 }}>
                  CUSTOMIZE
                </ThemedText>
              </View>
            </View>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
              Rates, service types, add-ons & pricing
            </ThemedText>
          </View>
          <View style={[styles.quoteSettingsArrow, { backgroundColor: `${theme.primary}15` }]}>
            <Feather name="arrow-right" size={18} color={theme.primary} />
          </View>
        </View>
      </Pressable>

      <SectionHeader title={t.settings.integrations} subtitle={t.settings.integrationsSubtitle} />

      {calendarStatus?.connected ? (
        <View style={[styles.settingsLink, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <View style={styles.settingsLinkContent}>
            <View style={[styles.settingsLinkIcon, { backgroundColor: `${theme.success}15` }]}>
              <Feather name="check-circle" size={20} color={theme.success} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                Google Calendar
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.success }}>
                {t.common.connected}
              </ThemedText>
            </View>
            <Pressable onPress={handleDisconnectCalendar} testID="button-disconnect-calendar">
              <ThemedText type="small" style={{ color: theme.error }}>
                {t.settings.disconnect}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          onPress={handleConnectCalendar}
          style={[styles.settingsLink, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
          testID="button-connect-calendar"
        >
          <View style={styles.settingsLinkContent}>
            <View style={[styles.settingsLinkIcon, { backgroundColor: `${theme.primary}15` }]}>
              <Feather name="calendar" size={20} color={theme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                Google Calendar
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {t.settings.syncCalendar}
              </ThemedText>
            </View>
            <Feather name="chevron-right" size={20} color={theme.textSecondary} />
          </View>
        </Pressable>
      )}

      {calendarError ? (
        <View style={{ backgroundColor: `${theme.error}15`, padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.md }}>
          <ThemedText type="small" style={{ color: theme.error, textAlign: "center" }}>
            {calendarError}
          </ThemedText>
        </View>
      ) : null}

      {stripeStatus?.connected ? (
        <View style={[styles.settingsLink, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <View style={styles.settingsLinkContent}>
            <View style={[styles.settingsLinkIcon, { backgroundColor: `${theme.success}15` }]}>
              <Feather name="check-circle" size={20} color={theme.success} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                Stripe Payments
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.success }}>
                {t.common.connected}
              </ThemedText>
            </View>
            <Pressable onPress={handleDisconnectStripe} testID="button-disconnect-stripe">
              <ThemedText type="small" style={{ color: theme.error }}>
                {t.settings.disconnect}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          onPress={handleConnectStripe}
          style={[styles.settingsLink, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
          testID="button-connect-stripe"
        >
          <View style={styles.settingsLinkContent}>
            <View style={[styles.settingsLinkIcon, { backgroundColor: "#635BFF15" }]}>
              <Feather name="credit-card" size={20} color="#635BFF" />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                Stripe Payments
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {t.settings.acceptPayments}
              </ThemedText>
            </View>
            <Feather name="chevron-right" size={20} color={theme.textSecondary} />
          </View>
        </Pressable>
      )}

      {stripeError ? (
        <View style={{ backgroundColor: `${theme.error}15`, padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.md }}>
          <ThemedText type="small" style={{ color: theme.error, textAlign: "center" }}>
            {stripeError}
          </ThemedText>
        </View>
      ) : null}

      <Pressable
        onPress={() => {
          setVenmoInput(profile.venmoHandle || "");
          setShowVenmoModal(true);
        }}
        style={[styles.settingsLink, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
        testID="button-venmo"
      >
        <View style={styles.settingsLinkContent}>
          <View style={[styles.settingsLinkIcon, { backgroundColor: profile.venmoHandle ? `${theme.success}15` : "#008CFF15" }]}>
            {profile.venmoHandle ? (
              <Feather name="check-circle" size={20} color={theme.success} />
            ) : (
              <Feather name="dollar-sign" size={20} color="#008CFF" />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="body" style={{ fontWeight: "600" }}>
              {t.settings.venmo}
            </ThemedText>
            <ThemedText type="small" style={{ color: profile.venmoHandle ? theme.success : theme.textSecondary }}>
              {profile.venmoHandle ? `@${profile.venmoHandle}` : t.settings.addVenmoUsername}
            </ThemedText>
          </View>
          <Feather name="chevron-right" size={20} color={theme.textSecondary} />
        </View>
      </Pressable>

      <Pressable
        onPress={() => {
          setCashappInput(profile.cashappHandle || "");
          setShowCashappModal(true);
        }}
        style={[styles.settingsLink, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
        testID="button-cashapp"
      >
        <View style={styles.settingsLinkContent}>
          <View style={[styles.settingsLinkIcon, { backgroundColor: profile.cashappHandle ? `${theme.success}15` : "#00D63215" }]}>
            {profile.cashappHandle ? (
              <Feather name="check-circle" size={20} color={theme.success} />
            ) : (
              <Feather name="dollar-sign" size={20} color="#00D632" />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="body" style={{ fontWeight: "600" }}>
              {t.settings.cashApp}
            </ThemedText>
            <ThemedText type="small" style={{ color: profile.cashappHandle ? theme.success : theme.textSecondary }}>
              {profile.cashappHandle ? `$${profile.cashappHandle}` : t.settings.addCashAppTag}
            </ThemedText>
          </View>
          <Feather name="chevron-right" size={20} color={theme.textSecondary} />
        </View>
      </Pressable>

      <Modal visible={showVenmoModal} transparent animationType="fade" onRequestClose={() => setShowVenmoModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
            <ThemedText type="subtitle" style={{ marginBottom: Spacing.md }}>{t.settings.venmoUsername}</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.md }}>
              {t.settings.venmoUsernameDesc}
            </ThemedText>
            <View style={[styles.handleInputRow, { borderColor: theme.border, backgroundColor: theme.backgroundDefault }]}>
              <ThemedText type="body" style={{ color: theme.textSecondary }}>@</ThemedText>
              <RNTextInput
                value={venmoInput}
                onChangeText={setVenmoInput}
                placeholder="your-venmo-username"
                placeholderTextColor={theme.textSecondary}
                style={[styles.handleInput, { color: theme.text }]}
                autoCapitalize="none"
                autoCorrect={false}
                testID="input-venmo"
              />
            </View>
            <View style={{ flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.lg }}>
              <Pressable
                onPress={() => setShowVenmoModal(false)}
                style={[styles.modalButton, { backgroundColor: theme.backgroundDefault, flex: 1 }]}
              >
                <ThemedText type="body" style={{ textAlign: "center" }}>{t.common.cancel}</ThemedText>
              </Pressable>
              <Pressable
                onPress={handleSaveVenmo}
                style={[styles.modalButton, { backgroundColor: "#008CFF", flex: 1 }]}
                testID="button-save-venmo"
              >
                <ThemedText type="body" style={{ color: "#FFFFFF", textAlign: "center", fontWeight: "600" }}>{t.common.save}</ThemedText>
              </Pressable>
            </View>
            {profile.venmoHandle ? (
              <Pressable
                onPress={async () => {
                  await updateBusinessProfile({ venmoHandle: null });
                  setShowVenmoModal(false);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }}
                style={{ marginTop: Spacing.md, alignItems: "center" }}
              >
                <ThemedText type="small" style={{ color: theme.error }}>{t.settings.removeVenmo}</ThemedText>
              </Pressable>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal visible={showCashappModal} transparent animationType="fade" onRequestClose={() => setShowCashappModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
            <ThemedText type="subtitle" style={{ marginBottom: Spacing.md }}>{t.settings.cashAppCashtag}</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.md }}>
              {t.settings.cashAppCashtagDesc}
            </ThemedText>
            <View style={[styles.handleInputRow, { borderColor: theme.border, backgroundColor: theme.backgroundDefault }]}>
              <ThemedText type="body" style={{ color: theme.textSecondary }}>$</ThemedText>
              <RNTextInput
                value={cashappInput}
                onChangeText={setCashappInput}
                placeholder="your-cashtag"
                placeholderTextColor={theme.textSecondary}
                style={[styles.handleInput, { color: theme.text }]}
                autoCapitalize="none"
                autoCorrect={false}
                testID="input-cashapp"
              />
            </View>
            <View style={{ flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.lg }}>
              <Pressable
                onPress={() => setShowCashappModal(false)}
                style={[styles.modalButton, { backgroundColor: theme.backgroundDefault, flex: 1 }]}
              >
                <ThemedText type="body" style={{ textAlign: "center" }}>{t.common.cancel}</ThemedText>
              </Pressable>
              <Pressable
                onPress={handleSaveCashapp}
                style={[styles.modalButton, { backgroundColor: "#00D632", flex: 1 }]}
                testID="button-save-cashapp"
              >
                <ThemedText type="body" style={{ color: "#FFFFFF", textAlign: "center", fontWeight: "600" }}>{t.common.save}</ThemedText>
              </Pressable>
            </View>
            {profile.cashappHandle ? (
              <Pressable
                onPress={async () => {
                  await updateBusinessProfile({ cashappHandle: null });
                  setShowCashappModal(false);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }}
                style={{ marginTop: Spacing.md, alignItems: "center" }}
              >
                <ThemedText type="small" style={{ color: theme.error }}>{t.settings.removeCashApp}</ThemedText>
              </Pressable>
            ) : null}
          </View>
        </View>
      </Modal>

      <SectionHeader title={t.settings.paymentOptions} subtitle={t.settings.paymentOptionsSubtitle} />

      <Pressable
        onPress={() => setShowPaymentOptions(!showPaymentOptions)}
        style={[styles.settingsLink, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
        testID="button-payment-options"
      >
        <View style={styles.settingsLinkContent}>
          <View style={[styles.settingsLinkIcon, { backgroundColor: `${theme.primary}15` }]}>
            <Feather name="credit-card" size={20} color={theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="body" style={{ fontWeight: "600" }}>
              {t.settings.acceptedPaymentMethods}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {(Object.keys(currentPaymentOptions) as (keyof PaymentOptions)[]).filter(k => currentPaymentOptions[k]?.enabled).length} {t.settings.methodsEnabled}
            </ThemedText>
          </View>
          <Feather name={showPaymentOptions ? "chevron-up" : "chevron-down"} size={20} color={theme.textSecondary} />
        </View>
      </Pressable>

      {showPaymentOptions ? (
        <View style={[styles.paymentOptionsContainer, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          {(Object.keys(PAYMENT_METHOD_LABELS) as (keyof PaymentOptions)[]).map((key) => {
            const config = PAYMENT_METHOD_LABELS[key];
            const option = currentPaymentOptions[key];
            return (
              <View key={key} style={[styles.paymentOptionRow, { borderBottomColor: theme.border }]}>
                <View style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: Spacing.sm }}>
                  <Feather name={config.icon as any} size={18} color={option?.enabled ? theme.primary : theme.textSecondary} />
                  <ThemedText type="body" style={{ color: option?.enabled ? theme.text : theme.textSecondary }}>
                    {config.label}
                  </ThemedText>
                </View>
                <Switch
                  value={option?.enabled || false}
                  onValueChange={(val) => {
                    const updated = { ...currentPaymentOptions, [key]: { ...option, enabled: val } };
                    updateBusinessProfile({ paymentOptions: updated });
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  trackColor={{ false: theme.border, true: theme.primary }}
                  thumbColor="#FFFFFF"
                  testID={`switch-payment-${key}`}
                />
              </View>
            );
          })}

          <View style={{ padding: Spacing.md }}>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.xs, fontWeight: "600" }}>
              {t.settings.paymentNotesLabel}
            </ThemedText>
            <RNTextInput
              value={paymentNotesInput}
              onChangeText={setPaymentNotesInput}
              onBlur={() => updateBusinessProfile({ paymentNotes: paymentNotesInput || null })}
              placeholder={t.settings.paymentNotesPlaceholder}
              placeholderTextColor={theme.textSecondary}
              style={[styles.paymentNotesInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundDefault }]}
              multiline
              numberOfLines={2}
              testID="input-payment-notes"
            />
          </View>
        </View>
      ) : null}

      <SectionHeader title={t.notifications.title} subtitle={t.settings.notificationsSubtitle} />

      <View style={[styles.prefSection, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        <View style={styles.prefRow}>
          <View style={{ flex: 1 }}>
            <ThemedText type="body" style={{ fontWeight: "600" }}>{t.settings.dailyFollowUpReminder}</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
              {t.settings.dailyFollowUpReminderDesc}
            </ThemedText>
          </View>
          <Switch
            value={currentPrefs.dailyPulseEnabled}
            onValueChange={(val) => updatePref({ dailyPulseEnabled: val })}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor="#FFFFFF"
            testID="switch-daily-pulse"
          />
        </View>

        {currentPrefs.dailyPulseEnabled ? (
          <Pressable
            onPress={() => setShowTimePicker(!showTimePicker)}
            style={[styles.prefSubRow, { borderTopColor: theme.border }]}
            testID="button-pulse-time"
          >
            <Feather name="clock" size={16} color={theme.textSecondary} />
            <ThemedText type="small" style={{ flex: 1, marginLeft: Spacing.sm }}>{t.notifications.reminderTime}</ThemedText>
            <ThemedText type="small" style={{ color: theme.primary, fontWeight: "600" }}>
              {TIME_OPTIONS.find((opt) => opt.value === currentPrefs.dailyPulseTime)?.label || currentPrefs.dailyPulseTime}
            </ThemedText>
            <Feather name="chevron-down" size={16} color={theme.textSecondary} style={{ marginLeft: 4 }} />
          </Pressable>
        ) : null}

        {showTimePicker && currentPrefs.dailyPulseEnabled ? (
          <View style={[styles.pickerContainer, { borderTopColor: theme.border }]}>
            {TIME_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => { updatePref({ dailyPulseTime: opt.value }); setShowTimePicker(false); }}
                style={[styles.pickerOption, { backgroundColor: currentPrefs.dailyPulseTime === opt.value ? `${theme.primary}15` : "transparent" }]}
              >
                <ThemedText type="small" style={{ fontWeight: currentPrefs.dailyPulseTime === opt.value ? "700" : "400", color: currentPrefs.dailyPulseTime === opt.value ? theme.primary : theme.text }}>
                  {opt.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={[styles.prefDivider, { backgroundColor: theme.border }]} />

        <View style={styles.prefRow}>
          <View style={{ flex: 1 }}>
            <ThemedText type="body" style={{ fontWeight: "600" }}>{t.settings.weeklyRecapLabel}</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
              {t.settings.weeklyRecapDesc}
            </ThemedText>
          </View>
          <Switch
            value={currentPrefs.weeklyRecapEnabled}
            onValueChange={(val) => updatePref({ weeklyRecapEnabled: val })}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor="#FFFFFF"
            testID="switch-weekly-recap"
          />
        </View>

        {currentPrefs.weeklyRecapEnabled ? (
          <Pressable
            onPress={() => setShowDayPicker(!showDayPicker)}
            style={[styles.prefSubRow, { borderTopColor: theme.border }]}
            testID="button-recap-day"
          >
            <Feather name="calendar" size={16} color={theme.textSecondary} />
            <ThemedText type="small" style={{ flex: 1, marginLeft: Spacing.sm }}>{t.notifications.recapDay}</ThemedText>
            <ThemedText type="small" style={{ color: theme.primary, fontWeight: "600" }}>
              {DAY_LABELS[currentPrefs.weeklyRecapDay] || t.common.monday}
            </ThemedText>
            <Feather name="chevron-down" size={16} color={theme.textSecondary} style={{ marginLeft: 4 }} />
          </Pressable>
        ) : null}

        {showDayPicker && currentPrefs.weeklyRecapEnabled ? (
          <View style={[styles.pickerContainer, { borderTopColor: theme.border }]}>
            {DAY_LABELS.map((label, idx) => (
              <Pressable
                key={idx}
                onPress={() => { updatePref({ weeklyRecapDay: idx }); setShowDayPicker(false); }}
                style={[styles.pickerOption, { backgroundColor: currentPrefs.weeklyRecapDay === idx ? `${theme.primary}15` : "transparent" }]}
              >
                <ThemedText type="small" style={{ fontWeight: currentPrefs.weeklyRecapDay === idx ? "700" : "400", color: currentPrefs.weeklyRecapDay === idx ? theme.primary : theme.text }}>
                  {label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={[styles.prefDivider, { backgroundColor: theme.border }]} />

        <View style={styles.prefRow}>
          <View style={{ flex: 1 }}>
            <ThemedText type="body" style={{ fontWeight: "600" }}>{t.settings.quietHoursLabel}</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
              {t.settings.quietHoursDesc}
            </ThemedText>
          </View>
          <Switch
            value={currentPrefs.quietHoursEnabled}
            onValueChange={(val) => updatePref({ quietHoursEnabled: val })}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor="#FFFFFF"
            testID="switch-quiet-hours"
          />
        </View>

        {currentPrefs.quietHoursEnabled ? (
          <View style={[styles.prefSubRow, { borderTopColor: theme.border }]}>
            <Feather name="moon" size={16} color={theme.textSecondary} />
            <ThemedText type="small" style={{ marginLeft: Spacing.sm, color: theme.textSecondary }}>
              {`${currentPrefs.quietHoursStart} - ${currentPrefs.quietHoursEnd}`}
            </ThemedText>
          </View>
        ) : null}
      </View>

      <SectionHeader title={t.settings.followUpBehavior} subtitle={t.settings.followUpBehaviorSubtitle} />

      <View style={[styles.prefSection, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        <Pressable
          onPress={() => setShowDormantPicker(!showDormantPicker)}
          style={styles.prefRow}
          testID="button-dormant-threshold"
        >
          <View style={{ flex: 1 }}>
            <ThemedText type="body" style={{ fontWeight: "600" }}>{t.settings.dormantCustomerThreshold}</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
              {t.settings.dormantCustomerThresholdDesc}
            </ThemedText>
          </View>
          <ThemedText type="small" style={{ color: theme.primary, fontWeight: "600" }}>
            {`${currentPrefs.dormantThresholdDays} ${t.common.days}`}
          </ThemedText>
        </Pressable>

        {showDormantPicker ? (
          <View style={[styles.pickerContainer, { borderTopColor: theme.border }]}>
            {[30, 60, 90, 120, 180].map((days) => (
              <Pressable
                key={days}
                onPress={() => { updatePref({ dormantThresholdDays: days }); setShowDormantPicker(false); }}
                style={[styles.pickerOption, { backgroundColor: currentPrefs.dormantThresholdDays === days ? `${theme.primary}15` : "transparent" }]}
              >
                <ThemedText type="small" style={{ fontWeight: currentPrefs.dormantThresholdDays === days ? "700" : "400", color: currentPrefs.dormantThresholdDays === days ? theme.primary : theme.text }}>
                  {`${days} ${t.common.days}`}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      <SectionHeader title={t.settings.growthAndAutomations} subtitle={t.settings.growthAndAutomationsSubtitle} />

      <Pressable
        onPress={() => navigation.navigate("AutomationsHub" as any)}
        style={[styles.settingsLink, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
        testID="button-automations-hub"
      >
        <View style={styles.settingsLinkContent}>
          <View style={[styles.settingsLinkIcon, { backgroundColor: `${theme.primary}15` }]}>
            <Feather name="zap" size={20} color={theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="body" style={{ fontWeight: "600" }}>
              {t.settings.automationsHubLabel}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {t.settings.automationsHubDesc}
            </ThemedText>
          </View>
          <Feather name="chevron-right" size={20} color={theme.textSecondary} />
        </View>
      </Pressable>

      <Pressable
        onPress={() => navigation.navigate("AutomationsIntegrations" as any)}
        style={[styles.settingsLink, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
        testID="button-automations-integrations"
      >
        <View style={styles.settingsLinkContent}>
          <View style={[styles.settingsLinkIcon, { backgroundColor: `${theme.primary}15` }]}>
            <Feather name="code" size={20} color={theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="body" style={{ fontWeight: "600" }}>
              {t.settings.apiWebhooksLabel}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {t.settings.apiWebhooksDesc}
            </ThemedText>
          </View>
          <Feather name="chevron-right" size={20} color={theme.textSecondary} />
        </View>
      </Pressable>

      <Pressable
        onPress={() => navigation.navigate("SalesStrategy" as any)}
        style={[styles.settingsLink, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
        testID="button-sales-strategy"
      >
        <View style={styles.settingsLinkContent}>
          <View style={[styles.settingsLinkIcon, { backgroundColor: "#8B5CF615" }]}>
            <Feather name="target" size={20} color="#8B5CF6" />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="body" style={{ fontWeight: "600" }}>
              {t.settings.salesStrategyLabel}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {t.settings.salesStrategyDesc}
            </ThemedText>
          </View>
          <Feather name="chevron-right" size={20} color={theme.textSecondary} />
        </View>
      </Pressable>

      <SectionHeader title={t.reviewSettings.sectionTitle} subtitle={t.reviewSettings.sectionSubtitle} />

      <View style={[styles.prefSection, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        <View style={styles.prefRow}>
          <View style={{ flex: 1 }}>
            <ThemedText type="body" style={{ fontWeight: "600" }}>{t.reviewSettings.googleReviewLink}</ThemedText>
            <RNTextInput
              value={reviewLinkInput}
              onChangeText={setReviewLinkInput}
              onBlur={() => {
                const trimmed = reviewLinkInput.trim();
                if (trimmed === (growthSettings?.googleReviewLink || "")) return;
                if (trimmed.length === 0) {
                  updateGrowthSetting({ googleReviewLink: "" });
                  return;
                }
                if (!isValidUrl(trimmed)) return;
                updateGrowthSetting({ googleReviewLink: trimmed });
                trackEvent("review_link_saved", { has_link: true });
              }}
              placeholder={t.reviewSettings.googleReviewLinkPlaceholder}
              placeholderTextColor={theme.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              style={{
                marginTop: Spacing.sm,
                paddingHorizontal: Spacing.md,
                paddingVertical: Spacing.sm,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: BorderRadius.sm,
                color: theme.text,
                fontSize: 14,
                backgroundColor: theme.backgroundSecondary,
              }}
              testID="input-google-review-link"
            />
            {!hasValidReviewLink && reviewLinkInput.trim().length === 0 ? (
              <ThemedText type="caption" style={{ color: theme.textMuted, marginTop: 4 }}>
                {t.reviewSettings.googleReviewLinkHelper}
              </ThemedText>
            ) : null}
            {reviewLinkInput.trim().length > 0 && !hasValidReviewLink ? (
              <ThemedText type="caption" style={{ color: theme.error, marginTop: 4 }}>
                Please enter a valid URL starting with https://
              </ThemedText>
            ) : null}
          </View>
        </View>

        <View style={[styles.prefRow, { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: Spacing.md }]}>
          <View style={{ flex: 1, opacity: hasValidReviewLink ? 1 : 0.5 }}>
            <ThemedText type="body" style={{ fontWeight: "600" }}>{t.reviewSettings.includeOnPdf}</ThemedText>
          </View>
          <Switch
            value={growthSettings?.includeReviewOnPdf ?? false}
            disabled={!hasValidReviewLink}
            onValueChange={(val) => {
              updateGrowthSetting({ includeReviewOnPdf: val });
              trackEvent("review_link_toggle_changed", { surface: "pdf", enabled: val });
            }}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor="#FFFFFF"
            testID="switch-review-on-pdf"
          />
        </View>

        <View style={[styles.prefRow, { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: Spacing.md }]}>
          <View style={{ flex: 1, opacity: hasValidReviewLink ? 1 : 0.5 }}>
            <ThemedText type="body" style={{ fontWeight: "600" }}>{t.reviewSettings.includeInMessages}</ThemedText>
          </View>
          <Switch
            value={growthSettings?.includeReviewInMessages ?? false}
            disabled={!hasValidReviewLink}
            onValueChange={(val) => {
              updateGrowthSetting({ includeReviewInMessages: val });
              trackEvent("review_link_toggle_changed", { surface: "messages", enabled: val });
            }}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor="#FFFFFF"
            testID="switch-review-in-messages"
          />
        </View>

        <View style={[styles.prefRow, { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: Spacing.md }]}>
          <View style={{ flex: 1, opacity: hasValidReviewLink ? 1 : 0.5 }}>
            <ThemedText type="body" style={{ fontWeight: "600" }}>{t.reviewSettings.askAfterComplete}</ThemedText>
          </View>
          <Switch
            value={growthSettings?.askReviewAfterComplete ?? true}
            disabled={!hasValidReviewLink}
            onValueChange={(val) => {
              updateGrowthSetting({ askReviewAfterComplete: val });
              trackEvent("review_link_toggle_changed", { surface: "post_service", enabled: val });
            }}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor="#FFFFFF"
            testID="switch-review-after-complete"
          />
        </View>
      </View>

      <View style={[styles.prefSection, { backgroundColor: theme.cardBackground, borderColor: theme.border, marginTop: Spacing.md }]}>
        <View style={styles.prefRow}>
          <View style={{ flex: 1 }}>
            <ThemedText type="body" style={{ fontWeight: "600" }}>{t.reviewSettings.referralSection}</ThemedText>
          </View>
        </View>
        <View style={[styles.prefRow, { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: Spacing.md }]}>
          <View style={{ flex: 1 }}>
            <ThemedText type="body">{t.reviewSettings.referralOfferAmount}</ThemedText>
            <RNTextInput
              value={referralAmountInput}
              onChangeText={setReferralAmountInput}
              onBlur={() => {
                const num = parseInt(referralAmountInput, 10);
                if (!isNaN(num) && num !== (growthSettings?.referralOfferAmount || 25)) {
                  updateGrowthSetting({ referralOfferAmount: num });
                }
              }}
              keyboardType="number-pad"
              style={{
                marginTop: Spacing.sm,
                paddingHorizontal: Spacing.md,
                paddingVertical: Spacing.sm,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: BorderRadius.sm,
                color: theme.text,
                fontSize: 14,
                backgroundColor: theme.backgroundSecondary,
                width: 100,
              }}
              testID="input-referral-amount"
            />
          </View>
        </View>
        <View style={[styles.prefRow, { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: Spacing.md }]}>
          <View style={{ flex: 1 }}>
            <ThemedText type="body">{t.reviewSettings.referralBookingLink}</ThemedText>
            <RNTextInput
              value={referralLinkInput}
              onChangeText={setReferralLinkInput}
              onBlur={() => {
                if (referralLinkInput.trim() !== (growthSettings?.referralBookingLink || "")) {
                  updateGrowthSetting({ referralBookingLink: referralLinkInput.trim() });
                }
              }}
              placeholder={t.reviewSettings.referralBookingLinkPlaceholder}
              placeholderTextColor={theme.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              style={{
                marginTop: Spacing.sm,
                paddingHorizontal: Spacing.md,
                paddingVertical: Spacing.sm,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: BorderRadius.sm,
                color: theme.text,
                fontSize: 14,
                backgroundColor: theme.backgroundSecondary,
              }}
              testID="input-referral-booking-link"
            />
          </View>
        </View>
      </View>

      <SectionHeader title="Features" subtitle="Enable or disable app features" />

      <View style={[styles.prefSection, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        <View style={styles.prefRow}>
          <View style={{ flex: 1 }}>
            <ThemedText type="body" style={{ fontWeight: "600" }}>Enable Commercial Quoting</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
              Create quotes for commercial facilities with labor estimates, tiered pricing, and proposals
            </ThemedText>
          </View>
          <Switch
            value={commercialEnabled}
            onValueChange={handleToggleCommercial}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor="#FFFFFF"
            testID="switch-commercial-quoting"
          />
        </View>
        <View style={[styles.prefRow, { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: Spacing.md }]}>
          <View style={{ flex: 1 }}>
            <ThemedText type="body" style={{ fontWeight: "600" }}>Replay Guided Tours</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
              {completedTours.length > 0 ? `${completedTours.length} tour${completedTours.length === 1 ? "" : "s"} completed` : "No tours completed yet"}
            </ThemedText>
          </View>
          <Pressable
            onPress={async () => {
              try {
                if (resetAllTours) await resetAllTours();
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                if (startTour) startTour(DASHBOARD_TOUR);
              } catch (e) {
                console.warn("Reset tours error:", e);
              }
            }}
            style={{
              paddingHorizontal: Spacing.lg,
              paddingVertical: Spacing.sm,
              backgroundColor: `${theme.primary}12`,
              borderRadius: BorderRadius.sm,
              borderWidth: 1,
              borderColor: `${theme.primary}30`,
            }}
            testID="button-reset-tours"
          >
            <ThemedText type="small" style={{ color: theme.primary, fontWeight: "600" }}>Replay</ThemedText>
          </Pressable>
        </View>
      </View>

      <SectionHeader title={t.aiConsent.settingsTitle} />

      <View style={[styles.prefSection, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        <View style={styles.prefRow}>
          <View style={{ flex: 1 }}>
            <ThemedText type="body" style={{ fontWeight: "600" }}>{t.aiConsent.settingsTitle}</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
              {t.aiConsent.settingsDescription}
            </ThemedText>
          </View>
          <Switch
            value={aiConsented}
            onValueChange={async (val) => {
              if (val) {
                await requestAIConsent();
              } else {
                revokeAIConsent();
              }
            }}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor="#FFFFFF"
            testID="switch-ai-consent"
          />
        </View>
      </View>

      <SectionHeader title={t.display.appearance} />

      <View style={[styles.languageSelector, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        {([
          { key: "system" as const, icon: "smartphone" as const, label: t.display.system },
          { key: "light" as const, icon: "sun" as const, label: t.display.light },
          { key: "dark" as const, icon: "moon" as const, label: t.display.dark },
          { key: "auto" as const, icon: "clock" as const, label: t.display.autoEvening },
        ]).map((option) => (
          <Pressable
            key={option.key}
            onPress={() => setDarkModePref(option.key)}
            style={[
              styles.languageOption,
              {
                backgroundColor: darkModePref === option.key ? `${theme.primary}15` : "transparent",
                borderColor: darkModePref === option.key ? theme.primary : "transparent",
              },
            ]}
            testID={`settings-dark-mode-${option.key}`}
          >
            <Feather name={option.icon} size={18} color={darkModePref === option.key ? theme.primary : theme.textSecondary} style={{ marginRight: Spacing.sm }} />
            <View style={{ flex: 1 }}>
              <ThemedText type="body" style={{ fontWeight: darkModePref === option.key ? "700" : "500" }}>
                {option.label}
              </ThemedText>
              {option.key === "auto" ? (
                <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
                  {t.display.autoDescription}
                </ThemedText>
              ) : null}
            </View>
            {darkModePref === option.key ? (
              <Feather name="check" size={20} color={theme.primary} />
            ) : null}
          </Pressable>
        ))}
      </View>

      <SectionHeader title={t.settings.language} subtitle={t.settings.languageSubtitle} />

      <ThemedText type="subtitle" style={{ marginBottom: Spacing.xs, marginTop: Spacing.xs }}>
        {t.settings.appLanguage}
      </ThemedText>
      <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: Spacing.sm }}>
        {t.settings.appLanguageDesc}
      </ThemedText>
      <View style={[styles.languageSelector, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        {(["en", "es", "pt", "ru"] as Language[]).map((lang) => (
          <Pressable
            key={lang}
            onPress={() => setLanguage(lang)}
            style={[
              styles.languageOption,
              {
                backgroundColor: language === lang ? `${theme.primary}15` : "transparent",
                borderColor: language === lang ? theme.primary : "transparent",
              },
            ]}
            testID={`settings-lang-${lang}`}
          >
            <View style={{ flex: 1 }}>
              <ThemedText type="body" style={{ fontWeight: language === lang ? "700" : "500" }}>
                {LANGUAGE_LABELS[lang]}
              </ThemedText>
            </View>
            {language === lang ? (
              <Feather name="check" size={20} color={theme.primary} />
            ) : null}
          </Pressable>
        ))}
      </View>

      <ThemedText type="subtitle" style={{ marginBottom: Spacing.xs, marginTop: Spacing.lg }}>
        {t.settings.commLanguage}
      </ThemedText>
      <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: Spacing.sm }}>
        {t.settings.commLanguageDesc}
      </ThemedText>
      <View style={[styles.languageSelector, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        {(["en", "es", "pt", "ru"] as Language[]).map((lang) => (
          <Pressable
            key={`comm-${lang}`}
            onPress={() => setCommunicationLanguage(lang)}
            style={[
              styles.languageOption,
              {
                backgroundColor: communicationLanguage === lang ? `${theme.primary}15` : "transparent",
                borderColor: communicationLanguage === lang ? theme.primary : "transparent",
              },
            ]}
            testID={`settings-comm-lang-${lang}`}
          >
            <View style={{ flex: 1 }}>
              <ThemedText type="body" style={{ fontWeight: communicationLanguage === lang ? "700" : "500" }}>
                {LANGUAGE_LABELS[lang]}
              </ThemedText>
            </View>
            {communicationLanguage === lang ? (
              <Feather name="check" size={20} color={theme.primary} />
            ) : null}
          </Pressable>
        ))}
      </View>

      <SectionHeader title={t.settings.account} />

      {user ? (
        <View
          style={[
            styles.aboutCard,
            { backgroundColor: theme.cardBackground, borderColor: theme.border, marginBottom: Spacing.md },
          ]}
        >
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {t.settings.signedInAs}
          </ThemedText>
          <ThemedText type="body" style={{ fontWeight: "600", marginTop: 2 }}>
            {user.email}
          </ThemedText>
        </View>
      ) : null}

      <Pressable
        onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); logout(); }}
        style={[
          styles.logoutButton,
          { backgroundColor: theme.error + "15", borderColor: theme.error + "30" },
        ]}
        testID="button-logout"
      >
        <Feather name="log-out" size={18} color={theme.error} />
        <ThemedText type="body" style={{ color: theme.error, fontWeight: "600", marginLeft: Spacing.sm }}>
          {t.settings.signOut}
        </ThemedText>
      </Pressable>

      <SectionHeader title="Help & Support" />

      <Pressable
        onPress={() => navigation.navigate("HelpGuide")}
        style={[styles.settingsLink, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
        testID="button-help-guide"
      >
        <View style={styles.settingsLinkContent}>
          <View style={[styles.settingsLinkIcon, { backgroundColor: `${theme.primary}15` }]}>
            <Feather name="book-open" size={20} color={theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="body" style={{ fontWeight: "600" }}>
              How to use QuotePro
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {t.settings.helpGuideDesc}
            </ThemedText>
          </View>
          <Feather name="chevron-right" size={20} color={theme.textSecondary} />
        </View>
      </Pressable>

      <Pressable
        onPress={() => Linking.openURL("mailto:quoteproforcleaners@gmail.com")}
        style={[styles.settingsLink, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
        testID="button-contact-support"
      >
        <View style={styles.settingsLinkContent}>
          <View style={[styles.settingsLinkIcon, { backgroundColor: `${theme.success}15` }]}>
            <Feather name="mail" size={20} color={theme.success} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="body" style={{ fontWeight: "600" }}>
              Contact Support
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              quoteproforcleaners@gmail.com
            </ThemedText>
          </View>
          <Feather name="external-link" size={18} color={theme.textSecondary} />
        </View>
      </Pressable>

      <Pressable
        onPress={() => WebBrowser.openBrowserAsync("https://getquotepro.ai/affiliate-kit")}
        style={[styles.settingsLink, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
        testID="button-affiliate-program"
      >
        <View style={styles.settingsLinkContent}>
          <View style={[styles.settingsLinkIcon, { backgroundColor: "#8B5CF615" }]}>
            <Feather name="users" size={20} color="#8B5CF6" />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="body" style={{ fontWeight: "600" }}>
              Join Affiliate Program
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Earn by referring cleaning businesses
            </ThemedText>
          </View>
          <Feather name="external-link" size={18} color={theme.textSecondary} />
        </View>
      </Pressable>

      <SectionHeader title={t.settings.legalCompliance} />

      <Pressable
        onPress={() => Linking.openURL("https://www.freeprivacypolicy.com/live/9ac71f0a-aa27-477d-98b2-5f8c103f766a")}
        style={[styles.settingsLink, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
        testID="button-privacy-policy"
      >
        <View style={styles.settingsLinkContent}>
          <View style={[styles.settingsLinkIcon, { backgroundColor: `${theme.primary}15` }]}>
            <Feather name="shield" size={20} color={theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="body" style={{ fontWeight: "600" }}>
              {t.settings.privacyPolicy}
            </ThemedText>
          </View>
          <Feather name="external-link" size={18} color={theme.textSecondary} />
        </View>
      </Pressable>

      <Pressable
        onPress={() => Linking.openURL("https://www.apple.com/legal/internet-services/itunes/dev/stdeula/")}
        style={[styles.settingsLink, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
        testID="button-terms-of-use"
      >
        <View style={styles.settingsLinkContent}>
          <View style={[styles.settingsLinkIcon, { backgroundColor: `${theme.primary}15` }]}>
            <Feather name="file-text" size={20} color={theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="body" style={{ fontWeight: "600" }}>
              {t.settings.termsOfUse}
            </ThemedText>
          </View>
          <Feather name="external-link" size={18} color={theme.textSecondary} />
        </View>
      </Pressable>

      <SectionHeader title={t.settings.about} />

      <View
        style={[
          styles.aboutCard,
          { backgroundColor: theme.cardBackground, borderColor: theme.border },
        ]}
      >
        <ThemedText type="body" style={{ fontWeight: "600" }}>
          QuotePro
        </ThemedText>
        <ThemedText
          type="small"
          style={[styles.version, { color: theme.textSecondary }]}
        >
          {t.settings.version} 1.0.0
        </ThemedText>
        <ThemedText
          type="small"
          style={{ color: theme.textSecondary, marginTop: Spacing.md }}
        >
          {t.settings.appDescription}
        </ThemedText>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  avatarContainer: {
    position: "relative",
    borderRadius: 40,
    padding: 4,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.md,
    alignSelf: "center",
    marginBottom: Spacing["2xl"],
    overflow: "hidden",
    borderWidth: 1,
    position: "relative",
  },
  logo: {
    width: "100%",
    height: "100%",
  },
  logoPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  defaultLogo: {
    width: 60,
    height: 60,
  },
  editBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  version: {
    marginTop: 2,
  },
  aboutCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing["2xl"],
  },
  settingsLink: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  quoteSettingsCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  quoteSettingsIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  quoteSettingsBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  quoteSettingsArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  settingsLinkContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  settingsLinkIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  proActiveCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing["2xl"],
  },
  proActiveHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  proBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  proUpgradeCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  proUpgradeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  proFeaturesList: {
    width: "100%",
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  proFeatureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  proFeatureCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  upgradeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.lg,
  },
  freePlanInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginTop: Spacing.md,
    width: "100%",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
  },
  handleInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: 4,
  },
  handleInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
  },
  modalButton: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
  },
  paymentOptionsContainer: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  paymentOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  paymentNotesInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: "top",
  },
  languageSelector: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: Spacing.md,
  },
  languageOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderWidth: 1,
  },
  prefSection: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  prefRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  prefSubRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  prefDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.xs,
  },
  pickerContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  pickerOption: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  freeLimitsCard: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  freeLimitsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  freeLimitsList: {
    gap: Spacing.sm,
  },
  freeLimitRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  freeLimitsUpgradeLink: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
  },
});
