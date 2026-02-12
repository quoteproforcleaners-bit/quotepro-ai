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
      style={[styles.container, { backgroundColor: `${theme.accent}12`, borderColor: theme.accent }]}
      testID="pro-banner"
    >
      <View style={[styles.icon, { backgroundColor: `${theme.accent}20` }]}>
        <Feather name="zap" size={16} color={theme.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText type="small" style={{ color: theme.text, fontWeight: "600" }}>
          QuotePro AI
        </ThemedText>
        <ThemedText type="caption" style={{ color: theme.accent, marginTop: 1 }}>
          {message || "Unlock AI messaging and direct sending"}
        </ThemedText>
      </View>
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
    borderWidth: 1.5,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  icon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
});
