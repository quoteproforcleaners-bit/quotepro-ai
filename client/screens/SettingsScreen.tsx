import React, { useState, useCallback, useEffect } from "react";
import { View, StyleSheet, Image, Pressable, Platform, Modal, TextInput as RNTextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
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

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user, logout } = useAuth();
  const { businessProfile: profile, updateBusinessProfile } = useApp();
  const { isPro } = useSubscription();
  const { language, setLanguage, communicationLanguage, setCommunicationLanguage, t } = useLanguage();

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

  const { data: calendarStatus, refetch: refetchCalendar } = useQuery({
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
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: tabBarHeight + Spacing.xl,
        },
      ]}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
    >
      <SectionHeader title={t.settings.subscription} />

      {isPro ? (
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
            onPress={() => navigation.navigate("Paywall")}
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

          <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.sm, textAlign: "center" }}>
            {t.paywall.freePlanNote}
          </ThemedText>
        </View>
      )}

      <SectionHeader title={t.settings.businessProfile} />

      <Pressable
        onPress={handlePickImage}
        style={[
          styles.logoContainer,
          { backgroundColor: theme.backgroundDefaultSecondary, borderColor: theme.border },
        ]}
      >
        {profile.logoUri ? (
          <Image source={{ uri: profile.logoUri }} style={styles.logo} />
        ) : (
          <View style={styles.logoPlaceholder}>
            <Image
              source={require("../../assets/images/business-avatar-default.png")}
              style={styles.defaultLogo}
            />
          </View>
        )}
        <View
          style={[styles.editBadge, { backgroundColor: theme.primary }]}
        >
          <Feather name="camera" size={14} color="#FFFFFF" />
        </View>
      </Pressable>

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
          styles.settingsLink,
          { backgroundColor: theme.cardBackground, borderColor: theme.border },
        ]}
        testID="button-pricing-settings"
      >
        <View style={styles.settingsLinkContent}>
          <View style={[styles.settingsLinkIcon, { backgroundColor: `${theme.primary}15` }]}>
            <Feather name="dollar-sign" size={20} color={theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="body" style={{ fontWeight: "600" }}>
              {t.settings.hourlyRates}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {t.settings.hourlyRatesDesc}
            </ThemedText>
          </View>
          <Feather name="chevron-right" size={20} color={theme.textSecondary} />
        </View>
      </Pressable>

      <Pressable
        onPress={() => navigation.navigate("PricingSettings")}
        style={[
          styles.settingsLink,
          { backgroundColor: theme.cardBackground, borderColor: theme.border },
        ]}
        testID="button-service-types"
      >
        <View style={styles.settingsLinkContent}>
          <View style={[styles.settingsLinkIcon, { backgroundColor: `${theme.success}15` }]}>
            <Feather name="list" size={20} color={theme.success} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="body" style={{ fontWeight: "600" }}>
              {t.settings.serviceTypes}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {t.settings.serviceTypesDesc}
            </ThemedText>
          </View>
          <Feather name="chevron-right" size={20} color={theme.textSecondary} />
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

      <SectionHeader title={t.settings.language} subtitle={t.settings.languageSubtitle} />

      <ThemedText type="subtitle" style={{ marginBottom: Spacing.xs, marginTop: Spacing.xs }}>
        {t.settings.appLanguage}
      </ThemedText>
      <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: Spacing.sm }}>
        {t.settings.appLanguageDesc}
      </ThemedText>
      <View style={[styles.languageSelector, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        {(["en", "es"] as Language[]).map((lang) => (
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
        {(["en", "es"] as Language[]).map((lang) => (
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
        onPress={logout}
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
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
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
});
