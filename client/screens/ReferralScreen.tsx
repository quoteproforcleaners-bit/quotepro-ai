import React, { useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Share,
  Platform,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";

interface ReferralData {
  referralCode: string;
  referralUrl: string;
  referredCount: number;
  paidReferrals: number;
  creditsEarned: number;
  pendingCredits: number;
  creditsRemaining: number;
}

export default function ReferralScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery<ReferralData>({
    queryKey: ["/api/referrals"],
    staleTime: 60_000,
  });

  const handleCopy = async () => {
    if (!data?.referralUrl) return;
    await Clipboard.setStringAsync(data.referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!data?.referralUrl) return;
    try {
      await Share.share({
        message: `Hey! I use QuotePro to generate cleaning quotes in seconds. Sign up with my link and we both get a free month:\n\n${data.referralUrl}`,
        url: data.referralUrl,
        title: "Get a free month of QuotePro",
      });
    } catch {}
  };

  return (
    <ThemedView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: headerHeight + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: "#1d4ed8" }]}>
          <View style={styles.heroIconRow}>
            <Feather name="gift" size={20} color="#fbbf24" />
            <ThemedText
              type="small"
              style={{ color: "rgba(191,219,254,0.9)", fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", marginLeft: Spacing.sm }}
            >
              Referral Program
            </ThemedText>
          </View>
          <ThemedText
            type="title"
            style={{ color: "white", marginTop: Spacing.sm, marginBottom: Spacing.sm, fontSize: 26 }}
          >
            Give a month,{"\n"}get a month.
          </ThemedText>
          <ThemedText type="body" style={{ color: "rgba(191,219,254,0.85)", lineHeight: 22 }}>
            Share your link. When a friend starts a paid plan, you both get a free month — automatically.
          </ThemedText>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {[
            { label: "Referred", value: data?.referredCount ?? 0, icon: "users" as const, color: "#2563eb" },
            { label: "Earned", value: data?.creditsEarned ?? 0, icon: "award" as const, color: "#7c3aed" },
            { label: "Pending", value: data?.pendingCredits ?? 0, icon: "clock" as const, color: "#f59e0b" },
          ].map((s) => (
            <View
              key={s.label}
              style={[styles.statCard, { backgroundColor: theme.cardBackground, borderColor: theme.border, flex: 1 }]}
            >
              <View style={[styles.statIcon, { backgroundColor: `${s.color}18` }]}>
                <Feather name={s.icon} size={16} color={s.color} />
              </View>
              <ThemedText
                type="title"
                style={{ fontSize: 22, fontWeight: "800", color: theme.text, marginTop: Spacing.xs }}
              >
                {isLoading ? "—" : s.value}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
                {s.label}
              </ThemedText>
            </View>
          ))}
        </View>

        {/* Referral link card */}
        <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <ThemedText type="body" style={{ fontWeight: "700", marginBottom: Spacing.md }}>
            Your referral link
          </ThemedText>

          <View style={[styles.linkBox, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
            <ThemedText
              type="small"
              style={{ color: theme.textSecondary, flex: 1, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" }}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {data?.referralUrl ?? "Loading..."}
            </ThemedText>
          </View>

          <View style={styles.actionRow}>
            <Pressable
              onPress={handleCopy}
              style={[
                styles.actionBtn,
                { backgroundColor: copied ? "#dcfce7" : "#2563eb", flex: 1 },
              ]}
              testID="button-copy-referral"
            >
              <Feather name={copied ? "check" : "copy"} size={15} color={copied ? "#16a34a" : "white"} />
              <ThemedText type="small" style={{ color: copied ? "#16a34a" : "white", fontWeight: "700", marginLeft: Spacing.xs }}>
                {copied ? "Copied!" : "Copy Link"}
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={handleShare}
              style={[styles.actionBtn, { backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border, flex: 1 }]}
              testID="button-share-referral"
            >
              <Feather name="share-2" size={15} color={theme.text} />
              <ThemedText type="small" style={{ color: theme.text, fontWeight: "700", marginLeft: Spacing.xs }}>
                Share
              </ThemedText>
            </Pressable>
          </View>

          <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
            Code: <ThemedText type="small" style={{ fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", fontWeight: "700", color: theme.text }}>{data?.referralCode ?? "—"}</ThemedText>
          </ThemedText>
        </View>

        {/* How it works */}
        <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <ThemedText type="body" style={{ fontWeight: "700", marginBottom: Spacing.lg }}>
            How it works
          </ThemedText>
          {[
            { step: "1", title: "Share your link", desc: "Send your unique link to a cleaning business owner you know.", color: "#2563eb" },
            { step: "2", title: "They sign up", desc: "Your friend starts a paid QuotePro plan using your link.", color: "#7c3aed" },
            { step: "3", title: "You both get a free month", desc: "After their first 30 days paid, you each get a free month.", color: "#059669" },
          ].map((item, i) => (
            <View key={item.step} style={[styles.stepRow, i < 2 && { marginBottom: Spacing.lg }]}>
              <View style={[styles.stepBadge, { backgroundColor: item.color }]}>
                <ThemedText type="small" style={{ color: "white", fontWeight: "800" }}>{item.step}</ThemedText>
              </View>
              <View style={{ flex: 1, marginLeft: Spacing.md }}>
                <ThemedText type="body" style={{ fontWeight: "700", marginBottom: 2 }}>{item.title}</ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary, lineHeight: 18 }}>{item.desc}</ThemedText>
              </View>
            </View>
          ))}
        </View>

        {/* Fine print */}
        <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center", paddingHorizontal: Spacing.xl, lineHeight: 18 }}>
          Credit applied after friend's 30-day paid subscription. Max 6 months total credit per account.
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  hero: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.xs,
  },
  heroIconRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  statCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    alignItems: "center",
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  linkBox: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  actionRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    flexShrink: 0,
  },
});
