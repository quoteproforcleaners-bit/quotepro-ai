import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useSubscription } from "@/context/SubscriptionContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useLanguage } from "@/context/LanguageContext";

interface ProBannerProps {
  message?: string;
}

export function ProBanner({ message }: ProBannerProps) {
  const { theme } = useTheme();
  const { isPro } = useSubscription();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { t } = useLanguage();

  if (isPro) return null;

  return (
    <Pressable
      onPress={() => navigation.navigate("Paywall")}
      style={[styles.container, { backgroundColor: '#009B82' }]}
      testID="pro-banner"
    >
      <View style={styles.icon}>
        <Feather name="zap" size={16} color="#FFFFFF" />
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText type="small" style={styles.title}>
          QuotePro AI
        </ThemedText>
        <ThemedText type="caption" style={styles.description}>
          {message || t.revenue.unlockAIBanner}
        </ThemedText>
      </View>
      <Feather name="chevron-right" size={16} color="rgba(255,255,255,0.8)" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  description: {
    color: "rgba(255,255,255,0.85)",
    marginTop: 1,
    fontSize: 12,
  },
});
