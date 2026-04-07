import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { IOSShadow } from "@/styles/tokens";

type NavProp = NativeStackNavigationProp<any>;

interface MenuItem {
  key: string;
  label: string;
  subtitle: string;
  icon: keyof typeof Feather.glyphMap;
  iconColor: string;
  iconBg: string;
  screen: string;
}

export default function MoreMenuScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<NavProp>();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();

  const items: MenuItem[] = [
    {
      key: "quoteDoctor",
      label: "Quote Doctor",
      subtitle: "AI-powered quote analysis",
      icon: "zap",
      iconColor: "#10b981",
      iconBg: "#10b98118",
      screen: "QuoteDoctor",
    },
    {
      key: "growth",
      label: "Growth & Reports",
      subtitle: "Revenue trends and insights",
      icon: "bar-chart-2",
      iconColor: theme.primary,
      iconBg: `${theme.primary}18`,
      screen: "GrowthDashboard",
    },
    {
      key: "leadRadar",
      label: "Lead Radar",
      subtitle: "Find leads in your area",
      icon: "radio",
      iconColor: theme.primary,
      iconBg: `${theme.primary}18`,
      screen: "LeadFinder",
    },
    {
      key: "settings",
      label: "Settings",
      subtitle: "Account, billing, preferences",
      icon: "settings",
      iconColor: theme.primary,
      iconBg: `${theme.primary}18`,
      screen: "Settings",
    },
  ];

  const handlePress = (screen: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    navigation.navigate(screen);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.md,
        paddingBottom: tabBarHeight + Spacing.xl,
        paddingHorizontal: Spacing.lg,
        gap: Spacing.xs,
      }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
        FEATURES
      </Text>

      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.cardBackground,
            borderColor: theme.border,
          },
          IOSShadow.card,
        ]}
      >
        {items.map((item, index) => (
          <View key={item.key}>
            <Pressable
              onPress={() => handlePress(item.screen)}
              style={({ pressed }) => [
                styles.row,
                pressed && { backgroundColor: `${theme.primary}08` },
              ]}
              testID={`more-menu-${item.key}`}
            >
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: item.iconBg },
                ]}
              >
                <Feather name={item.icon} size={20} color={item.iconColor} />
              </View>

              <View style={styles.labelContainer}>
                <Text style={[styles.label, { color: theme.text }]}>
                  {item.label}
                </Text>
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                  {item.subtitle}
                </Text>
              </View>

              <Feather name="chevron-right" size={18} color={theme.textSecondary} />
            </Pressable>

            {index < items.length - 1 && (
              <View style={[styles.separator, { backgroundColor: theme.border }]} />
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  labelContainer: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "400",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 76,
  },
});
