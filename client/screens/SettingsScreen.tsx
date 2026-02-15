import React, { useState } from "react";
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
import { useQuery } from "@tanstack/react-query";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { Input } from "@/components/Input";
import { SectionHeader } from "@/components/SectionHeader";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { getApiUrl } from "@/lib/query-client";
import { PaymentOptions, DEFAULT_PAYMENT_OPTIONS } from "@/types";
import { PAYMENT_METHOD_LABELS, getPaymentOptions } from "@/lib/paymentOptions";
import { Switch } from "react-native";
import { useLanguage } from "@/context/LanguageContext";
import { LANGUAGE_LABELS, type Language } from "@/i18n";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user, logout } = useAuth();
  const { businessProfile: profile, updateBusinessProfile } = useApp();
  const { isPro } = useSubscription();
  const { language, setLanguage, t } = useLanguage();

  const { data: calendarStatus, refetch: refetchCalendar } = useQuery({
    queryKey: ["/api/google-calendar/status"],
  });

  const { data: stripeStatus, refetch: refetchStripe } = useQuery<{ connected: boolean; accountId: string | null }>({
    queryKey: ["/api/stripe/status"],
  });

  const [stripeError, setStripeError] = useState<string | null>(null);
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
      const res = await fetch(new URL("/api/google-calendar/connect", getApiUrl()).toString(), {
        credentials: "include",
      });
      const data = await res.json();
      if (data.url) {
        await WebBrowser.openBrowserAsync(data.url);
        refetchCalendar();
      }
    } catch (e) {
      console.error("Calendar connect error", e);
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
              { icon: "edit-3" as const, text: "AI-written emails and text messages" },
              { icon: "send" as const, text: "Send quotes directly via email or SMS" },
              { icon: "zap" as const, text: "AI-enhanced quote descriptions" },
              { icon: "refresh-cw" as const, text: "Regenerate messages with one tap" },
              { icon: "user" as const, text: "Personalized for each customer" },
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
        label="Company Name"
        value={profile.companyName}
        onChangeText={(v) => updateProfile({ companyName: v })}
        placeholder="Your cleaning company"
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
              Venmo
            </ThemedText>
            <ThemedText type="small" style={{ color: profile.venmoHandle ? theme.success : theme.textSecondary }}>
              {profile.venmoHandle ? `@${profile.venmoHandle}` : "Add your Venmo username"}
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
              Cash App
            </ThemedText>
            <ThemedText type="small" style={{ color: profile.cashappHandle ? theme.success : theme.textSecondary }}>
              {profile.cashappHandle ? `$${profile.cashappHandle}` : "Add your Cash App $cashtag"}
            </ThemedText>
          </View>
          <Feather name="chevron-right" size={20} color={theme.textSecondary} />
        </View>
      </Pressable>

      <Modal visible={showVenmoModal} transparent animationType="fade" onRequestClose={() => setShowVenmoModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
            <ThemedText type="subtitle" style={{ marginBottom: Spacing.md }}>Venmo Username</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.md }}>
              Enter your Venmo username so customers can pay you directly
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
                <ThemedText type="body" style={{ textAlign: "center" }}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                onPress={handleSaveVenmo}
                style={[styles.modalButton, { backgroundColor: "#008CFF", flex: 1 }]}
                testID="button-save-venmo"
              >
                <ThemedText type="body" style={{ color: "#FFFFFF", textAlign: "center", fontWeight: "600" }}>Save</ThemedText>
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
                <ThemedText type="small" style={{ color: theme.error }}>Remove Venmo</ThemedText>
              </Pressable>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal visible={showCashappModal} transparent animationType="fade" onRequestClose={() => setShowCashappModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
            <ThemedText type="subtitle" style={{ marginBottom: Spacing.md }}>Cash App $cashtag</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.md }}>
              Enter your Cash App $cashtag so customers can pay you directly
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
                <ThemedText type="body" style={{ textAlign: "center" }}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                onPress={handleSaveCashapp}
                style={[styles.modalButton, { backgroundColor: "#00D632", flex: 1 }]}
                testID="button-save-cashapp"
              >
                <ThemedText type="body" style={{ color: "#FFFFFF", textAlign: "center", fontWeight: "600" }}>Save</ThemedText>
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
                <ThemedText type="small" style={{ color: theme.error }}>Remove Cash App</ThemedText>
              </Pressable>
            ) : null}
          </View>
        </View>
      </Modal>

      <SectionHeader title="Payment Options" subtitle="Choose which payment methods appear on quotes" />

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
              Accepted Payment Methods
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {(Object.keys(currentPaymentOptions) as (keyof PaymentOptions)[]).filter(k => currentPaymentOptions[k]?.enabled).length} methods enabled
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
              Payment Notes (optional)
            </ThemedText>
            <RNTextInput
              value={paymentNotesInput}
              onChangeText={setPaymentNotesInput}
              onBlur={() => updateBusinessProfile({ paymentNotes: paymentNotesInput || null })}
              placeholder="e.g., Payment due upon completion of service"
              placeholderTextColor={theme.textSecondary}
              style={[styles.paymentNotesInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundDefault }]}
              multiline
              numberOfLines={2}
              testID="input-payment-notes"
            />
          </View>
        </View>
      ) : null}

      <SectionHeader title={t.settings.language} subtitle={t.settings.languageSubtitle} />

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
          Version 1.0.0
        </ThemedText>
        <ThemedText
          type="small"
          style={{ color: theme.textSecondary, marginTop: Spacing.md }}
        >
          Professional quoting for residential cleaning businesses.
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
});
