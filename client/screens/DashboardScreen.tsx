import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Elevation, GlowEffects } from "@/constants/theme";
import { useApp } from "@/context/AppContext";
import { FeatureFlags } from "@/lib/featureFlags";
import { useLanguage } from "@/context/LanguageContext";
import { trackEvent } from "@/lib/analytics";
import OnboardingBanner from "@/components/OnboardingBanner";
import { useProGate } from "@/components/ProGate";
import { useTutorial } from "@/context/TutorialContext";
import { DASHBOARD_TOUR } from "@/lib/tourDefinitions";

type WidgetId = "hero" | "quickQuote" | "momentum" | "streak" | "aiEngine" | "glance";

const DEFAULT_WIDGET_ORDER: WidgetId[] = ["hero", "quickQuote", "momentum", "streak", "aiEngine", "glance"];

const WIDGET_LABELS: Record<WidgetId, { en: string; icon: keyof typeof Feather.glyphMap }> = {
  hero: { en: "Revenue Waiting to Close", icon: "dollar-sign" },
  quickQuote: { en: "Quick Quote", icon: "zap" },
  momentum: { en: "Sales Momentum", icon: "trending-up" },
  streak: { en: "Follow-Up Streak", icon: "target" },
  aiEngine: { en: "AI Revenue Engine", icon: "cpu" },
  glance: { en: "Today at a Glance", icon: "eye" },
};

function useDesignTokens() {
  const { theme, isDark } = useTheme();
  return useMemo(() => ({
    gradientTop: isDark ? "#0B1220" : theme.bg0,
    gradientBottom: isDark ? "#101B2D" : theme.bg1,
    surfacePrimary: theme.surface0,
    surfaceSecondary: theme.surface1,
    surfaceRaised: (theme as any).surface2 || theme.surface1,
    surfaceHero: (theme as any).surface3 || theme.surface1,
    surfaceEmphasis: (theme as any).surface2 || theme.surface1,
    borderPrimary: theme.border,
    borderSecondary: theme.divider,
    borderAccent: isDark ? `${theme.primary}35` : `${theme.primary}18`,
    textPrimary: theme.text,
    textSecondary: theme.textSecondary,
    textMuted: theme.textMuted,
    accent: theme.primary,
    accentMuted: isDark ? "rgba(59, 130, 246, 0.55)" : "rgba(37, 99, 235, 0.45)",
    accentSoft: theme.primarySoft,
    brandGlow: (theme as any).brandGlow || "rgba(37, 99, 235, 0.08)",
    brandSoft: (theme as any).brandSoft || theme.primarySoft,
    warningSoft: (theme as any).warningSoft || "rgba(217, 119, 6, 0.10)",
    warningBorder: (theme as any).warningBorder || "rgba(217, 119, 6, 0.20)",
    warningGlow: (theme as any).warningGlow || "rgba(217, 119, 6, 0.18)",
    warningGradientTop: isDark ? "#1E293B" : "#FFFBEB",
    warningGradientBottom: isDark ? "#0F172A" : "#FEF3C7",
    chipBg: isDark ? theme.divider : "rgba(0,0,0,0.03)",
    chipBorder: theme.border,
  }), [theme, isDark]);
}

function PulsingCta({ children, style }: { children: React.ReactNode; style?: any }) {
  const pulseVal = useSharedValue(1);

  useEffect(() => {
    pulseVal.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseVal.value }],
  }));

  return <Animated.View style={[style, animStyle]}>{children}</Animated.View>;
}

function FollowUpHealthBar({ percent }: { percent: number }) {
  const dt = useDesignTokens();
  const { theme } = useTheme();
  const barColor = percent >= 70 ? theme.success : percent >= 40 ? theme.warning : "#EF4444";
  return (
    <View style={{ marginTop: Spacing.sm }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
        <ThemedText type="caption" style={{ color: dt.textMuted, fontSize: 11 }}>Follow-up health</ThemedText>
        <ThemedText type="caption" style={{ color: barColor, fontWeight: "700", fontSize: 11 }}>{percent}%</ThemedText>
      </View>
      <View style={{ height: 6, backgroundColor: dt.chipBg, borderRadius: 3, overflow: "hidden" }}>
        <View style={{ height: 6, width: `${Math.min(percent, 100)}%`, backgroundColor: barColor, borderRadius: 3 }} />
      </View>
    </View>
  );
}

function FunnelStep({ label, value, color, isLast }: { label: string; value: number; color: string; isLast?: boolean }) {
  const dt = useDesignTokens();
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <ThemedText type="h3" style={{ color, fontWeight: "800" }}>{value}</ThemedText>
      <ThemedText type="caption" style={{ color: dt.textSecondary, marginTop: 2, fontSize: 11 }}>{label}</ThemedText>
      {!isLast ? (
        <View style={{ position: "absolute", right: -4, top: 6 }}>
          <Feather name="chevron-right" size={12} color={dt.textMuted} />
        </View>
      ) : null}
    </View>
  );
}

function StreakDots({ days, streak }: { days: string[]; streak: number }) {
  const dt = useDesignTokens();
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 6, marginTop: Spacing.sm }}>
      {days.map((day, i) => {
        const active = i < streak;
        return (
          <View key={day} style={{ alignItems: "center", flex: 1 }}>
            <View style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: active ? theme.success : dt.chipBg,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: active ? 0 : 1,
              borderColor: dt.borderSecondary,
            }}>
              {active ? <Feather name="check" size={12} color="#FFF" /> : null}
            </View>
            <ThemedText type="caption" style={{ color: active ? theme.success : dt.textMuted, fontSize: 9, marginTop: 2, fontWeight: "600" }}>{day}</ThemedText>
          </View>
        );
      })}
    </View>
  );
}

function GlanceCard({ title, value, icon, color, onPress }: {
  title: string; value: string; icon: keyof typeof Feather.glyphMap; color: string; onPress?: () => void;
}) {
  const dt = useDesignTokens();
  const { isDark } = useTheme();
  return (
    <Pressable
      style={[s.glanceCard, { backgroundColor: isDark ? dt.surfaceSecondary : dt.surfaceSecondary, borderColor: dt.borderSecondary }, Elevation.e1]}
      onPress={onPress}
      testID={`glance-${title.toLowerCase().replace(/\s/g, "-")}`}
    >
      <View style={[s.glanceIcon, { backgroundColor: `${color}20` }]}>
        <Feather name={icon} size={15} color={color} />
      </View>
      <ThemedText type="h3" style={{ marginTop: 6 }}>{value}</ThemedText>
      <ThemedText type="caption" style={{ color: dt.textSecondary, marginTop: 2 }}>{title}</ThemedText>
    </Pressable>
  );
}

function QuickQuoteModal({ visible, onClose, navigation }: {
  visible: boolean;
  onClose: () => void;
  navigation: any;
}) {
  const { theme, isDark } = useTheme();
  const dt = useDesignTokens();
  const insets = useSafeAreaInsets();
  const { pricingSettings } = useApp();
  const { isPro } = useProGate();
  const queryClient = useQueryClient();

  const [customerName, setCustomerName] = useState("");
  const [propertyType, setPropertyType] = useState<"residential" | "commercial">("residential");
  const [sqft, setSqft] = useState("");
  const [beds, setBeds] = useState("3");
  const [baths, setBaths] = useState("2");
  const [serviceType, setServiceType] = useState("standard");
  const [notes, setNotes] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [calculatedPrice, setCalculatedPrice] = useState(0);
  const [editablePrice, setEditablePrice] = useState("");
  const [saving, setSaving] = useState(false);

  const serviceTypes = [
    { id: "standard", label: "Standard Clean" },
    { id: "deep-clean", label: "Deep Clean" },
    { id: "move-in-out", label: "Move In/Out" },
  ];

  const resetForm = () => {
    setCustomerName("");
    setPropertyType("residential");
    setSqft("");
    setBeds("3");
    setBaths("2");
    setServiceType("standard");
    setNotes("");
    setShowPreview(false);
    setCalculatedPrice(0);
    setEditablePrice("");
  };

  const handleCalculate = () => {
    if (!pricingSettings) return;
    const sqftNum = parseInt(sqft) || 2000;
    const bedsNum = parseInt(beds) || 3;
    const bathsNum = parseInt(baths) || 2;

    const homeDetails = {
      sqft: sqftNum,
      beds: bedsNum,
      baths: bathsNum,
      halfBaths: 0,
      homeType: "house" as const,
      conditionScore: 7,
      peopleCount: 2,
      petType: "none" as const,
      petShedding: false,
    };

    const noAddOns = {
      insideFridge: false,
      insideOven: false,
      insideCabinets: false,
      interiorWindows: false,
      blindsDetail: false,
      baseboardsDetail: false,
      laundryFoldOnly: false,
      dishes: false,
      organizationTidy: false,
      biannualDeepClean: false,
    };

    const svcType = getServiceTypeById(pricingSettings, serviceType) || pricingSettings.serviceTypes[0];
    const option = calculateQuoteOption(homeDetails, noAddOns, "one-time", svcType, pricingSettings, "Quick Quote");
    setCalculatedPrice(option.price);
    setEditablePrice(option.price.toString());
    setShowPreview(true);
  };

  const handleSendNow = async () => {
    setSaving(true);
    try {
      const quoteData = {
        customerName,
        customerEmail: "",
        customerPhone: "",
        propertyType,
        sqft: parseInt(sqft) || 2000,
        beds: parseInt(beds) || 3,
        baths: parseInt(baths) || 2,
        serviceType,
        total: parseFloat(editablePrice) || calculatedPrice,
        notes,
        status: "sent",
        options: [{
          name: "Quick Quote",
          serviceTypeId: serviceType,
          serviceTypeName: serviceTypes.find(st => st.id === serviceType)?.label || "Standard Clean",
          scope: "",
          price: parseFloat(editablePrice) || calculatedPrice,
          addOnsIncluded: [],
        }],
      };
      await apiRequest("POST", "/api/quotes", quoteData);
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/stats"] });
      resetForm();
      onClose();
    } catch (e) {
    } finally {
      setSaving(false);
    }
  };

  const handleAddDetails = () => {
    resetForm();
    onClose();
    navigation.navigate("QuoteCalculator", {
      prefillCustomer: { name: customerName, phone: "", email: "", address: "", customerId: "" },
    });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[s.modalContainer, { backgroundColor: isDark ? dt.gradientTop : "#FFF" }]}>
        <View style={[s.modalHeader, { borderBottomColor: dt.borderSecondary, paddingTop: insets.top > 0 ? insets.top : Spacing.lg }]}>
          <ThemedText type="h4" style={{ fontWeight: "700", flex: 1 }}>Quick Quote</ThemedText>
          <Pressable onPress={() => { resetForm(); onClose(); }} hitSlop={12} testID="close-quick-quote">
            <Feather name="x" size={22} color={dt.textPrimary} />
          </Pressable>
        </View>

        {!showPreview ? (
          <KeyboardAwareScrollViewCompat contentContainerStyle={{ padding: Spacing.lg, paddingBottom: insets.bottom + Spacing.xl }}>
            <ThemedText type="caption" style={{ color: dt.accent, fontWeight: "700", letterSpacing: 0.5, marginBottom: Spacing.md }}>
              SEND A PRICE IN UNDER 10 SECONDS
            </ThemedText>

            <ThemedText type="small" style={{ fontWeight: "600", marginBottom: 6 }}>Customer Name</ThemedText>
            <TextInput
              style={[s.modalInput, { backgroundColor: dt.surfaceSecondary, borderColor: dt.borderSecondary, color: dt.textPrimary }]}
              placeholder="Customer name"
              placeholderTextColor={dt.textMuted}
              value={customerName}
              onChangeText={setCustomerName}
              testID="quick-quote-name"
            />

            <ThemedText type="small" style={{ fontWeight: "600", marginBottom: 6, marginTop: Spacing.md }}>Property Type</ThemedText>
            <View style={{ flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.md }}>
              {(["residential", "commercial"] as const).map(type => (
                <Pressable
                  key={type}
                  onPress={() => setPropertyType(type)}
                  style={[s.toggleBtn, {
                    backgroundColor: propertyType === type ? dt.accent : dt.chipBg,
                    borderColor: propertyType === type ? dt.accent : dt.chipBorder,
                  }]}
                  testID={`toggle-${type}`}
                >
                  <ThemedText type="small" style={{
                    color: propertyType === type ? "#FFF" : dt.textPrimary,
                    fontWeight: "600",
                    textTransform: "capitalize",
                  }}>{type}</ThemedText>
                </Pressable>
              ))}
            </View>

            <ThemedText type="small" style={{ fontWeight: "600", marginBottom: 6 }}>Square Footage</ThemedText>
            <TextInput
              style={[s.modalInput, { backgroundColor: dt.surfaceSecondary, borderColor: dt.borderSecondary, color: dt.textPrimary }]}
              placeholder="e.g. 2000"
              placeholderTextColor={dt.textMuted}
              value={sqft}
              onChangeText={setSqft}
              keyboardType="numeric"
              testID="quick-quote-sqft"
            />

            {propertyType === "residential" ? (
              <View style={{ flexDirection: "row", gap: Spacing.md, marginTop: Spacing.md }}>
                <View style={{ flex: 1 }}>
                  <ThemedText type="small" style={{ fontWeight: "600", marginBottom: 6 }}>Beds</ThemedText>
                  <TextInput
                    style={[s.modalInput, { backgroundColor: dt.surfaceSecondary, borderColor: dt.borderSecondary, color: dt.textPrimary }]}
                    value={beds}
                    onChangeText={setBeds}
                    keyboardType="numeric"
                    testID="quick-quote-beds"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="small" style={{ fontWeight: "600", marginBottom: 6 }}>Baths</ThemedText>
                  <TextInput
                    style={[s.modalInput, { backgroundColor: dt.surfaceSecondary, borderColor: dt.borderSecondary, color: dt.textPrimary }]}
                    value={baths}
                    onChangeText={setBaths}
                    keyboardType="numeric"
                    testID="quick-quote-baths"
                  />
                </View>
              </View>
            ) : null}

            <ThemedText type="small" style={{ fontWeight: "600", marginBottom: 6, marginTop: Spacing.md }}>Service Type</ThemedText>
            <View style={{ gap: Spacing.xs }}>
              {serviceTypes.map(st => (
                <Pressable
                  key={st.id}
                  onPress={() => setServiceType(st.id)}
                  style={[s.serviceTypeRow, {
                    backgroundColor: serviceType === st.id ? dt.accentSoft : dt.chipBg,
                    borderColor: serviceType === st.id ? dt.accent : dt.chipBorder,
                  }]}
                  testID={`service-${st.id}`}
                >
                  <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: serviceType === st.id ? dt.accent : dt.textMuted, alignItems: "center", justifyContent: "center" }}>
                    {serviceType === st.id ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: dt.accent }} /> : null}
                  </View>
                  <ThemedText type="small" style={{ fontWeight: "500", marginLeft: Spacing.sm }}>{st.label}</ThemedText>
                </Pressable>
              ))}
            </View>

            <ThemedText type="small" style={{ fontWeight: "600", marginBottom: 6, marginTop: Spacing.md }}>Notes (optional)</ThemedText>
            <TextInput
              style={[s.modalInput, s.modalTextArea, { backgroundColor: dt.surfaceSecondary, borderColor: dt.borderSecondary, color: dt.textPrimary }]}
              placeholder="Any special notes..."
              placeholderTextColor={dt.textMuted}
              value={notes}
              onChangeText={setNotes}
              multiline
              testID="quick-quote-notes"
            />

            <Pressable
              onPress={handleCalculate}
              style={[s.primaryBtn, { backgroundColor: dt.accent, marginTop: Spacing.xl }]}
              testID="quick-quote-calculate"
            >
              <Feather name="zap" size={16} color="#FFF" style={{ marginRight: 6 }} />
              <ThemedText type="body" style={{ color: "#FFF", fontWeight: "700" }}>Calculate Quote</ThemedText>
            </Pressable>
          </KeyboardAwareScrollViewCompat>
        ) : (
          <ScrollView contentContainerStyle={{ padding: Spacing.lg, paddingBottom: insets.bottom + Spacing.xl }}>
            <View style={[s.previewCard, { backgroundColor: dt.surfaceSecondary, borderColor: dt.borderSecondary }]}>
              <ThemedText type="caption" style={{ color: dt.textMuted, fontWeight: "600", letterSpacing: 0.5 }}>ESTIMATED PRICE</ThemedText>
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: Spacing.sm }}>
                <ThemedText type="body" style={{ fontSize: 18, color: dt.textMuted }}>$</ThemedText>
                <TextInput
                  style={[s.priceInput, { color: dt.textPrimary }]}
                  value={editablePrice}
                  onChangeText={setEditablePrice}
                  keyboardType="numeric"
                  testID="editable-price"
                />
              </View>
              {customerName ? (
                <ThemedText type="small" style={{ color: dt.textSecondary, marginTop: Spacing.sm }}>
                  For: {customerName}
                </ThemedText>
              ) : null}
              <ThemedText type="caption" style={{ color: dt.textMuted, marginTop: 4 }}>
                {serviceTypes.find(st => st.id === serviceType)?.label} | {sqft || "2000"} sq ft
              </ThemedText>
            </View>

            {!isPro ? (
              <View style={[s.aiLockedBadge, { backgroundColor: dt.warningSoft, borderColor: dt.warningBorder }]}>
                <Feather name="lock" size={12} color={theme.warning} />
                <ThemedText type="caption" style={{ color: theme.warning, marginLeft: 6, flex: 1 }}>
                  Upgrade to auto-generate persuasive descriptions.
                </ThemedText>
              </View>
            ) : null}

            <View style={{ flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.lg }}>
              <Pressable
                onPress={handleSendNow}
                style={[s.primaryBtn, { backgroundColor: dt.accent, flex: 1 }]}
                disabled={saving}
                testID="quick-quote-send"
              >
                {saving ? <ActivityIndicator color="#FFF" size="small" /> : (
                  <>
                    <Feather name="send" size={14} color="#FFF" style={{ marginRight: 6 }} />
                    <ThemedText type="body" style={{ color: "#FFF", fontWeight: "700" }}>Send Now</ThemedText>
                  </>
                )}
              </Pressable>
              <Pressable
                onPress={handleAddDetails}
                style={[s.secondaryBtn, { borderColor: dt.borderPrimary, flex: 1 }]}
                testID="quick-quote-details"
              >
                <Feather name="edit-2" size={14} color={dt.textPrimary} style={{ marginRight: 6 }} />
                <ThemedText type="body" style={{ fontWeight: "600" }}>Add Details</ThemedText>
              </Pressable>
            </View>

            <Pressable onPress={() => setShowPreview(false)} style={{ alignSelf: "center", marginTop: Spacing.lg }}>
              <ThemedText type="small" style={{ color: dt.accent, fontWeight: "600" }}>Back to Edit</ThemedText>
            </Pressable>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { width: screenWidth } = useWindowDimensions();
  const useMaxWidth = screenWidth > 600;
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { theme, isDark } = useTheme();
  const dt = useDesignTokens();
  const { businessProfile: profile } = useApp();
  const { t } = useLanguage();
  const { isPro, requirePro } = useProGate();
  const { startTour, hasCompletedTour, isActive: tourActive } = useTutorial();

  const [refreshing, setRefreshing] = useState(false);
  const [widgetOrder, setWidgetOrder] = useState<WidgetId[]>(DEFAULT_WIDGET_ORDER);
  const [hiddenWidgets, setHiddenWidgets] = useState<Set<WidgetId>>(new Set());
  const [isEditingWidgets, setIsEditingWidgets] = useState(false);
  const [quickQuoteVisible, setQuickQuoteVisible] = useState(false);

  useEffect(() => {
    trackEvent("app_open");
    trackEvent("home_view");
    (async () => {
      try {
        const savedOrder = await AsyncStorage.getItem("dashboardWidgetOrderV2");
        const savedHidden = await AsyncStorage.getItem("dashboardHiddenWidgetsV2");
        if (savedOrder) {
          const parsed = JSON.parse(savedOrder) as WidgetId[];
          const validIds = new Set<string>(DEFAULT_WIDGET_ORDER);
          const filtered = parsed.filter((id) => validIds.has(id));
          DEFAULT_WIDGET_ORDER.forEach((id) => {
            if (!filtered.includes(id)) filtered.push(id);
          });
          setWidgetOrder(filtered);
        }
        if (savedHidden) {
          setHiddenWidgets(new Set(JSON.parse(savedHidden) as WidgetId[]));
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (!hasCompletedTour(DASHBOARD_TOUR.id) && !tourActive) {
      const timer = setTimeout(() => {
        startTour(DASHBOARD_TOUR);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const { data: followUpQueue = [], refetch: refetchFollowUpQueue } = useQuery<any[]>({
    queryKey: ["/api/followup-queue"],
  });

  const { data: streakData, refetch: refetchStreak } = useQuery<{
    currentStreak: number;
    longestStreak: number;
    lastActionDate: string | null;
  }>({ queryKey: ["/api/streaks"] });

  const { data: opportunitiesDormant = [], refetch: refetchDormant } = useQuery<any[]>({
    queryKey: ["/api/opportunities/dormant"],
  });

  const { data: opportunitiesLost = [], refetch: refetchLost } = useQuery<any[]>({
    queryKey: ["/api/opportunities/lost"],
  });

  const { data: stats, refetch: refetchStats } = useQuery<{
    totalQuotes: number;
    sentQuotes: number;
    acceptedQuotes: number;
    declinedQuotes: number;
    expiredQuotes: number;
    totalRevenue: number;
    avgQuoteValue: number;
    closeRate: number;
  }>({ queryKey: ["/api/reports/stats"] });

  const { data: quotes = [], refetch: refetchQuotes } = useQuery<any[]>({
    queryKey: ["/api/quotes"],
  });

  const { data: customers = [], refetch: refetchCustomers } = useQuery<any[]>({
    queryKey: ["/api/customers"],
  });

  const { data: allJobs = [], refetch: refetchJobs } = useQuery<any[]>({
    queryKey: ["/api/jobs"],
  });

  const { data: ratingSummary } = useQuery<{ average: number; total: number; distribution: Record<number, number> }>({
    queryKey: ["/api/ratings/summary"],
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchQuotes(), refetchCustomers(), refetchJobs(), refetchFollowUpQueue(), refetchStreak(), refetchDormant(), refetchLost()]);
    setRefreshing(false);
  };

  const followUpQueueCount = followUpQueue.length;
  const amountAtRisk = useMemo(() => {
    return followUpQueue.reduce((sum: number, q: any) => sum + (q.total || 0), 0);
  }, [followUpQueue]);
  const oldestQuoteDays = useMemo(() => {
    if (followUpQueue.length === 0) return 0;
    const now = Date.now();
    let oldest = 0;
    followUpQueue.forEach((q: any) => {
      const sent = q.sentAt ? new Date(q.sentAt).getTime() : new Date(q.createdAt).getTime();
      const days = Math.floor((now - sent) / (1000 * 60 * 60 * 24));
      if (days > oldest) oldest = days;
    });
    return oldest;
  }, [followUpQueue]);

  const currentStreak = streakData?.currentStreak || 0;
  const monthRevenue = stats?.totalRevenue || 0;
  const sentQuotes = stats?.sentQuotes || 0;
  const acceptedQuotes = stats?.acceptedQuotes || 0;
  const wonQuotes = acceptedQuotes;

  const viewedQuotes = useMemo(() => {
    return (quotes || []).filter((q: any) => q.viewedAt || q.status === "viewed").length;
  }, [quotes]);

  const todayJobCount = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    return (allJobs || []).filter((j: any) => {
      if (!j.startDatetime) return false;
      return j.startDatetime.slice(0, 10) === todayStr && j.status !== "cancelled";
    }).length;
  }, [allJobs]);

  const followUpHealthPercent = useMemo(() => {
    if (followUpQueueCount === 0) return 100;
    const recentlyFollowedUp = followUpQueue.filter((q: any) => {
      if (!q.lastFollowUpAt) return false;
      const daysSince = (Date.now() - new Date(q.lastFollowUpAt).getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 2;
    }).length;
    return Math.round((recentlyFollowedUp / followUpQueueCount) * 100);
  }, [followUpQueue, followUpQueueCount]);

  const weekDays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
  const streakDaysToShow = Math.min(currentStreak, 7);

  const saveWidgetConfig = useCallback(async (order: WidgetId[], hidden: Set<WidgetId>) => {
    try {
      await AsyncStorage.setItem("dashboardWidgetOrderV2", JSON.stringify(order));
      await AsyncStorage.setItem("dashboardHiddenWidgetsV2", JSON.stringify([...hidden]));
    } catch {}
  }, []);

  const moveWidget = useCallback((widgetId: WidgetId, direction: "up" | "down") => {
    setWidgetOrder((prev) => {
      const idx = prev.indexOf(widgetId);
      if (idx < 0) return prev;
      const newIdx = direction === "up" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      saveWidgetConfig(next, hiddenWidgets);
      return next;
    });
  }, [hiddenWidgets, saveWidgetConfig]);

  const toggleWidgetVisibility = useCallback((widgetId: WidgetId) => {
    setHiddenWidgets((prev) => {
      const next = new Set(prev);
      if (next.has(widgetId)) {
        next.delete(widgetId);
      } else {
        next.add(widgetId);
      }
      saveWidgetConfig(widgetOrder, next);
      return next;
    });
  }, [widgetOrder, saveWidgetConfig]);

  const renderWidget = useCallback((widgetId: WidgetId) => {
    switch (widgetId) {
      case "hero":
        return (
          <View key="hero">
            {followUpQueueCount > 0 ? (
              <Pressable
                onPress={() => navigation.navigate("FollowUpQueue")}
                style={[s.heroCard, { borderColor: dt.warningBorder }, Elevation.e3, isDark ? GlowEffects.glowWarning : {}]}
                testID="hero-revenue-card"
              >
                <LinearGradient
                  colors={[dt.warningGradientTop, dt.warningGradientBottom]}
                  style={s.heroCardGradient}
                >
                  {isDark ? <View style={s.heroCardHighlight} /> : null}
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                    <Feather name="dollar-sign" size={16} color={theme.warning} />
                    <ThemedText type="caption" style={{ color: theme.warning, fontWeight: "700", marginLeft: 4, letterSpacing: 0.5 }}>REVENUE WAITING TO CLOSE</ThemedText>
                  </View>
                  <ThemedText type="h2" style={{ fontWeight: "800", marginTop: 4 }}>
                    ${amountAtRisk.toLocaleString()} waiting to close
                  </ThemedText>
                  <ThemedText type="small" style={{ color: dt.textSecondary, marginTop: 4 }}>
                    {followUpQueueCount} {followUpQueueCount === 1 ? "quote needs" : "quotes need"} attention  |  Oldest: {oldestQuoteDays} {oldestQuoteDays === 1 ? "day" : "days"}
                  </ThemedText>
                  <ThemedText type="caption" style={{ color: dt.textMuted, marginTop: 6, fontStyle: "italic" }}>
                    Leads go cold after 24-48 hours.
                  </ThemedText>
                  <FollowUpHealthBar percent={followUpHealthPercent} />
                  <PulsingCta style={{ marginTop: Spacing.md }}>
                    <Pressable
                      onPress={() => navigation.navigate("FollowUpQueue")}
                      style={[s.heroCta, { backgroundColor: theme.warning }]}
                      testID="hero-follow-up-cta"
                    >
                      <Feather name="arrow-right" size={16} color="#FFF" />
                      <ThemedText type="body" style={{ color: "#FFF", fontWeight: "700", marginLeft: 6 }}>Follow Up Now</ThemedText>
                    </Pressable>
                  </PulsingCta>
                  <Pressable
                    onPress={() => navigation.navigate("Main", { screen: "QuotesTab" })}
                    style={{ alignSelf: "center", marginTop: Spacing.sm }}
                    testID="hero-view-quotes"
                  >
                    <ThemedText type="small" style={{ color: dt.accent, fontWeight: "600" }}>View Quotes</ThemedText>
                  </Pressable>
                </LinearGradient>
              </Pressable>
            ) : (
              <View style={[s.heroCard, { backgroundColor: dt.surfacePrimary, borderColor: theme.successBorder, padding: Spacing.lg }, Elevation.e1]}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={[s.focusIcon, { backgroundColor: theme.successSoft }]}>
                    <Feather name="check-circle" size={16} color={theme.success} />
                  </View>
                  <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                    <ThemedText type="subtitle" style={{ fontWeight: "700" }}>All Caught Up</ThemedText>
                    <ThemedText type="small" style={{ color: dt.textSecondary, marginTop: 2 }}>No revenue at risk. Keep the momentum going.</ThemedText>
                  </View>
                </View>
                <FollowUpHealthBar percent={100} />
              </View>
            )}
          </View>
        );

      case "quickQuote":
        return (
          <Pressable
            key="quickQuote"
            onPress={() => setQuickQuoteVisible(true)}
            style={[s.quickQuoteCard, { backgroundColor: isDark ? dt.surfaceRaised : dt.surfaceEmphasis, borderColor: dt.borderAccent }, Elevation.e2, isDark ? GlowEffects.glowBlueSubtle : {}]}
            testID="quick-quote-card"
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={[s.quickQuoteIcon, { backgroundColor: dt.accentSoft }]}>
                <Feather name="zap" size={18} color={dt.accent} />
              </View>
              <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                <ThemedText type="subtitle" style={{ fontWeight: "700" }}>Quick Quote</ThemedText>
                <ThemedText type="caption" style={{ color: dt.textSecondary, marginTop: 2 }}>
                  Send a price in under 10 seconds.
                </ThemedText>
              </View>
              <View style={[s.quickQuoteCta, { backgroundColor: dt.accent }]}>
                <Feather name="plus" size={16} color="#FFF" />
              </View>
            </View>
          </Pressable>
        );

      case "momentum":
        return (
          <View key="momentum" style={[s.sectionCard, { backgroundColor: dt.surfacePrimary, borderColor: dt.borderSecondary }, Elevation.e1]}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: Spacing.md }}>
              <Feather name="trending-up" size={14} color={dt.accent} />
              <ThemedText type="small" style={{ fontWeight: "700", marginLeft: 6, letterSpacing: 0.3 }}>SALES MOMENTUM</ThemedText>
            </View>
            <View style={{ flexDirection: "row" }}>
              <FunnelStep label="Sent" value={sentQuotes} color={dt.accent} />
              <FunnelStep label="Viewed" value={viewedQuotes} color={theme.warning} />
              <FunnelStep label="Accepted" value={acceptedQuotes} color={theme.success} />
              <FunnelStep label="Won" value={wonQuotes} color="#10B981" isLast />
            </View>
            {stats?.closeRate != null ? (
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: Spacing.md, paddingTop: Spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: dt.borderSecondary }}>
                <Feather name="target" size={12} color={dt.textMuted} />
                <ThemedText type="caption" style={{ color: dt.textSecondary, marginLeft: 4 }}>
                  Close rate: {Math.round(stats.closeRate)}%
                </ThemedText>
              </View>
            ) : null}
          </View>
        );

      case "streak":
        return (
          <View key="streak" style={[s.sectionCard, { backgroundColor: isDark ? dt.surfaceRaised : dt.surfaceSecondary, borderColor: dt.borderSecondary }, Elevation.e2]}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Feather name="target" size={16} color={currentStreak > 0 ? theme.success : dt.textMuted} />
              <ThemedText type="body" style={{ fontWeight: "700", marginLeft: Spacing.sm, flex: 1 }}>
                Follow-Up Streak: {currentStreak} {currentStreak === 1 ? "day" : "days"}
              </ThemedText>
            </View>
            <ThemedText type="caption" style={{ color: dt.textSecondary, marginTop: 4 }}>
              Top closers follow up daily.
            </ThemedText>
            <StreakDots days={weekDays} streak={streakDaysToShow} />
            <Pressable
              onPress={() => navigation.navigate("FollowUpQueue")}
              style={[s.streakCta, { backgroundColor: currentStreak > 0 ? theme.success : dt.accent, marginTop: Spacing.md }]}
              testID="keep-streak-cta"
            >
              <Feather name="zap" size={14} color="#FFF" />
              <ThemedText type="small" style={{ color: "#FFF", fontWeight: "700", marginLeft: 6 }}>
                {currentStreak > 0 ? "Keep streak alive" : "Start your streak"}
              </ThemedText>
            </Pressable>
          </View>
        );

      case "aiEngine":
        return (
          <View key="aiEngine" style={[s.sectionCard, { backgroundColor: isDark ? dt.surfaceRaised : dt.surfaceEmphasis, borderColor: dt.borderAccent }, Elevation.e2]}>
            {isPro ? (
              <>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={[s.aiIcon, { backgroundColor: "#10B98120" }]}>
                    <Feather name="cpu" size={16} color="#10B981" />
                  </View>
                  <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                    <ThemedText type="subtitle" style={{ fontWeight: "700" }}>AI Revenue Engine: ON</ThemedText>
                    <ThemedText type="caption" style={{ color: dt.textSecondary, marginTop: 2 }}>
                      Auto follow-ups and smart replies active.
                    </ThemedText>
                  </View>
                  <View style={[s.statusDot, { backgroundColor: "#10B981" }]} />
                </View>
                <Pressable
                  onPress={() => navigation.navigate("AutomationsHub")}
                  style={[s.aiCta, { borderColor: "#10B981", marginTop: Spacing.md }]}
                  testID="manage-sequences-cta"
                >
                  <ThemedText type="small" style={{ color: "#10B981", fontWeight: "600" }}>Manage Sequences</ThemedText>
                  <Feather name="chevron-right" size={14} color="#10B981" style={{ marginLeft: 4 }} />
                </Pressable>
              </>
            ) : (
              <>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={[s.aiIcon, { backgroundColor: dt.chipBg }]}>
                    <Feather name="cpu" size={16} color={dt.textMuted} />
                  </View>
                  <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                    <ThemedText type="subtitle" style={{ fontWeight: "700" }}>AI Revenue Engine: OFF</ThemedText>
                    <ThemedText type="caption" style={{ color: dt.textSecondary, marginTop: 2 }}>
                      Turn on auto follow-ups + smart replies to close more quotes.
                    </ThemedText>
                  </View>
                </View>
                <View style={{ marginTop: Spacing.md, marginLeft: 44 }}>
                  {["Auto follow-ups", "Smart objection replies", "Quote descriptions that sell"].map(item => (
                    <View key={item} style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                      <Feather name="check" size={12} color={dt.accent} />
                      <ThemedText type="small" style={{ color: dt.textSecondary, marginLeft: 8 }}>{item}</ThemedText>
                    </View>
                  ))}
                </View>
                <Pressable
                  onPress={() => navigation.navigate("Paywall")}
                  style={[s.activateBtn, { backgroundColor: dt.accent, marginTop: Spacing.md }]}
                  testID="activate-ai-cta"
                >
                  <Feather name="zap" size={14} color="#FFF" />
                  <ThemedText type="body" style={{ color: "#FFF", fontWeight: "700", marginLeft: 6 }}>Activate AI Engine</ThemedText>
                </Pressable>
              </>
            )}
          </View>
        );

      case "glance":
        return (
          <View key="glance">
            <View style={s.sectionHeader}>
              <ThemedText type="subtitle" style={{ fontWeight: "700", fontSize: 15 }}>Today at a Glance</ThemedText>
            </View>
            <View style={s.glanceRow}>
              <GlanceCard
                title="Need follow-up"
                value={followUpQueueCount.toString()}
                icon="phone-missed"
                color={theme.warning}
                onPress={() => navigation.navigate("FollowUpQueue")}
              />
              <GlanceCard
                title="Quotes out"
                value={sentQuotes.toString()}
                icon="send"
                color={dt.accent}
                onPress={() => navigation.navigate("Main", { screen: "QuotesTab" })}
              />
              <GlanceCard
                title="Won this month"
                value={`$${monthRevenue.toLocaleString()}`}
                icon="trending-up"
                color={theme.success}
                onPress={() => navigation.navigate("Main", { screen: "GrowthTab" })}
              />
            </View>
          </View>
        );

      default:
        return null;
    }
  }, [followUpQueueCount, amountAtRisk, oldestQuoteDays, followUpHealthPercent, currentStreak, sentQuotes, viewedQuotes, acceptedQuotes, wonQuotes, monthRevenue, dt, theme, isDark, navigation, isPro, stats]);

  return (
    <LinearGradient
      colors={[dt.gradientTop, dt.gradientBottom]}
      style={s.container}
    >
      {isDark ? (
        <>
          <View style={s.vignetteTop} />
          <View style={s.vignetteBottom} />
        </>
      ) : null}
      <ScrollView
        contentContainerStyle={[
          s.content,
          { paddingTop: headerHeight + Spacing.md, paddingBottom: tabBarHeight + Spacing.xl },
          useMaxWidth ? { maxWidth: 560, alignSelf: "center" as const, width: "100%" } : undefined,
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.headerRow}>
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <ProfileAvatar
              config={profile?.avatarConfig || null}
              size={44}
              fallbackInitials={profile?.companyName}
              style={{ marginRight: Spacing.sm }}
            />
            <View style={{ flex: 1 }}>
              <ThemedText type="h4" numberOfLines={1} style={{ fontWeight: "800" }}>
                QuotePro
              </ThemedText>
              <View style={[s.salesBadge, { backgroundColor: dt.accentSoft }]}>
                <Feather name="zap" size={10} color={dt.accent} />
                <ThemedText type="caption" style={{ color: dt.accent, fontWeight: "700", marginLeft: 3, fontSize: 10, letterSpacing: 0.3 }}>
                  Sales-First Mode
                </ThemedText>
              </View>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.sm }}>
            <Pressable
              onPress={() => setIsEditingWidgets(!isEditingWidgets)}
              style={[s.headerBtn, { backgroundColor: isEditingWidgets ? dt.accentSoft : dt.chipBg, borderColor: isEditingWidgets ? dt.accent : dt.chipBorder }]}
              testID="customize-widgets-btn"
            >
              <Feather name={isEditingWidgets ? "check" : "sliders"} size={14} color={isEditingWidgets ? dt.accent : dt.textSecondary} />
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate("Main", { screen: "SettingsTab" })}
              style={[s.headerBtn, { backgroundColor: dt.chipBg, borderColor: dt.chipBorder }]}
              testID="settings-btn"
            >
              <Feather name="settings" size={14} color={dt.textSecondary} />
            </Pressable>
          </View>
        </View>

        <OnboardingBanner />

        {isEditingWidgets ? (
          <View style={[s.editorCard, { backgroundColor: dt.surfacePrimary, borderColor: dt.borderPrimary }, Elevation.e2]}>
            <View style={s.editorHeader}>
              <Feather name="layout" size={16} color={dt.accent} />
              <ThemedText type="subtitle" style={{ fontWeight: "700", marginLeft: Spacing.sm, flex: 1 }}>
                Customize Dashboard
              </ThemedText>
              <Pressable onPress={() => setIsEditingWidgets(false)} hitSlop={12} testID="editor-done-btn">
                <ThemedText type="small" style={{ color: dt.accent, fontWeight: "600" }}>Done</ThemedText>
              </Pressable>
            </View>
            {widgetOrder.map((widgetId, index) => {
              const isHidden = hiddenWidgets.has(widgetId);
              const label = WIDGET_LABELS[widgetId];
              return (
                <View key={widgetId} style={[s.editorRow, { borderTopColor: dt.borderSecondary }]}>
                  <Pressable
                    onPress={() => toggleWidgetVisibility(widgetId)}
                    style={[s.editorVisibilityBtn, { backgroundColor: isHidden ? "transparent" : dt.accentSoft }]}
                    testID={`toggle-${widgetId}`}
                  >
                    <Feather name={isHidden ? "eye-off" : "eye"} size={14} color={isHidden ? dt.textMuted : dt.accent} />
                  </Pressable>
                  <Feather name={label.icon} size={14} color={isHidden ? dt.textMuted : dt.textSecondary} style={{ marginLeft: Spacing.sm }} />
                  <ThemedText
                    type="small"
                    style={{ flex: 1, marginLeft: Spacing.sm, color: isHidden ? dt.textMuted : dt.textPrimary, fontWeight: "500" }}
                    numberOfLines={1}
                  >
                    {label.en}
                  </ThemedText>
                  <View style={s.editorArrows}>
                    <Pressable
                      onPress={() => moveWidget(widgetId, "up")}
                      style={[s.editorArrowBtn, { opacity: index === 0 ? 0.3 : 1 }]}
                      disabled={index === 0}
                      testID={`move-up-${widgetId}`}
                    >
                      <Feather name="chevron-up" size={16} color={dt.textSecondary} />
                    </Pressable>
                    <Pressable
                      onPress={() => moveWidget(widgetId, "down")}
                      style={[s.editorArrowBtn, { opacity: index === widgetOrder.length - 1 ? 0.3 : 1 }]}
                      disabled={index === widgetOrder.length - 1}
                      testID={`move-down-${widgetId}`}
                    >
                      <Feather name="chevron-down" size={16} color={dt.textSecondary} />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        {widgetOrder.map((widgetId) => {
          if (hiddenWidgets.has(widgetId)) return null;
          return renderWidget(widgetId);
        })}
      </ScrollView>

      <QuickQuoteModal
        visible={quickQuoteVisible}
        onClose={() => setQuickQuoteVisible(false)}
        navigation={navigation}
      />
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  salesBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    marginTop: 2,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  heroCard: {
    marginHorizontal: Spacing.lg,
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  heroCardGradient: {
    padding: Spacing.lg,
    borderRadius: 21,
    overflow: "hidden",
  },
  heroCardHighlight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderTopLeftRadius: 21,
    borderTopRightRadius: 21,
  },
  heroCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
  },
  focusIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  quickQuoteCard: {
    marginHorizontal: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  quickQuoteIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  quickQuoteCta: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionCard: {
    marginHorizontal: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  glanceRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  glanceCard: {
    flex: 1,
    borderRadius: 18,
    padding: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  glanceIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  streakCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
  },
  aiIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  aiCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  activateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  vignetteTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: "rgba(0,0,0,0.22)",
    zIndex: 0,
  },
  vignetteBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: "rgba(0,0,0,0.10)",
    zIndex: 0,
  },
  editorCard: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  editorHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  editorRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  editorVisibilityBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  editorArrows: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  editorArrowBtn: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
  },
  modalTextArea: {
    height: 80,
    paddingTop: Spacing.sm,
    textAlignVertical: "top",
  },
  toggleBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  serviceTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: BorderRadius.full,
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  previewCard: {
    padding: Spacing.lg,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
  },
  priceInput: {
    fontSize: 48,
    fontWeight: "800",
    textAlign: "center",
    minWidth: 120,
  },
  aiLockedBadge: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: Spacing.md,
  },
});
