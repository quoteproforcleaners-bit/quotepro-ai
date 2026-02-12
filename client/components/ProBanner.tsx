import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { CommonActions, useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { Spacing, BorderRadius } from "@/constants/theme";

interface ProBannerProps {
  message?: string;
}

export function ProBanner({ message }: ProBannerProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();

  if (user?.subscriptionTier === "pro") return null;

  return (
    <Pressable
      onPress={() => {
        navigation.dispatch(
          CommonActions.navigate({
            name: "Main",
            params: {
              screen: "SettingsTab",
            },
          })
        );
      }}
      style={[styles.container, { backgroundColor: `${theme.accent}08`, borderColor: `${theme.accent}25` }]}
      testID="pro-banner"
    >
      <View style={[styles.icon, { backgroundColor: `${theme.accent}15` }]}>
        <Feather name="zap" size={16} color={theme.accent} />
      </View>
      <ThemedText type="small" style={{ flex: 1, color: theme.textSecondary }}>
        {message || "Unlock AI messaging and direct sending with Pro"}
      </ThemedText>
      <Feather name="chevron-right" size={16} color={theme.accent} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  icon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
