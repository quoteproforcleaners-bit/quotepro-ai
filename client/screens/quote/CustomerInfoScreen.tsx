import React from "react";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Input } from "@/components/Input";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { CustomerInfo } from "@/types";

interface Props {
  data: CustomerInfo;
  onUpdate: (data: CustomerInfo) => void;
}

export default function CustomerInfoScreen({ data, onUpdate }: Props) {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();

  const updateField = <K extends keyof CustomerInfo>(
    key: K,
    value: CustomerInfo[K]
  ) => {
    onUpdate({ ...data, [key]: value });
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: insets.bottom + Spacing.xl,
        },
      ]}
    >
      <View style={styles.header}>
        <ThemedText type="h3">Customer Information</ThemedText>
        <ThemedText
          type="small"
          style={[styles.subtitle, { color: theme.textSecondary }]}
        >
          Enter the customer details for this quote.
        </ThemedText>
      </View>

      <Input
        label="Customer Name"
        value={data.name}
        onChangeText={(v) => updateField("name", v)}
        placeholder="John Smith"
        leftIcon="user"
        autoFocus
      />

      <Input
        label="Phone (Optional)"
        value={data.phone}
        onChangeText={(v) => updateField("phone", v)}
        placeholder="(555) 123-4567"
        keyboardType="phone-pad"
        leftIcon="phone"
      />

      <Input
        label="Email (Optional)"
        value={data.email}
        onChangeText={(v) => updateField("email", v)}
        placeholder="customer@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
        leftIcon="mail"
      />

      <Input
        label="Property Address (Optional)"
        value={data.address}
        onChangeText={(v) => updateField("address", v)}
        placeholder="123 Main St, City, State"
        leftIcon="map-pin"
      />

      <Input
        label="Preferred Date (Optional)"
        value={data.datePreference}
        onChangeText={(v) => updateField("datePreference", v)}
        placeholder="e.g., Next Tuesday"
        leftIcon="calendar"
      />
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
  header: {
    marginBottom: Spacing.xl,
  },
  subtitle: {
    marginTop: Spacing.xs,
  },
});
