import React, { useState, useCallback, useRef } from "react";
import { View, StyleSheet, Pressable, FlatList } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Input } from "@/components/Input";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { CustomerInfo } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";

interface Props {
  data: CustomerInfo;
  onUpdate: (data: CustomerInfo) => void;
}

export default function CustomerInfoScreen({ data, onUpdate }: Props) {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [nameQuery, setNameQuery] = useState("");
  const selectedRef = useRef(false);

  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ["/api/customers"],
  });

  const filteredCustomers = useCallback(() => {
    if (!nameQuery || nameQuery.length < 2 || selectedRef.current) return [];
    const q = nameQuery.toLowerCase();
    return customers.filter((c: any) => {
      const fullName = `${c.firstName || ""} ${c.lastName || ""}`.trim().toLowerCase();
      return fullName.includes(q);
    }).slice(0, 5);
  }, [nameQuery, customers]);

  const handleNameChange = (v: string) => {
    selectedRef.current = false;
    setNameQuery(v);
    setShowSuggestions(true);
    onUpdate({ ...data, name: v });
  };

  const handleSelectCustomer = (customer: any) => {
    selectedRef.current = true;
    const fullName = `${customer.firstName || ""} ${customer.lastName || ""}`.trim();
    setNameQuery(fullName);
    setShowSuggestions(false);
    onUpdate({
      ...data,
      name: fullName,
      phone: customer.phone || data.phone,
      email: customer.email || data.email,
      address: customer.address || data.address,
    });
  };

  const updateField = <K extends keyof CustomerInfo>(
    key: K,
    value: CustomerInfo[K]
  ) => {
    onUpdate({ ...data, [key]: value });
  };

  const suggestions = filteredCustomers();

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
      keyboardShouldPersistTaps="handled"
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

      <View style={{ zIndex: 10 }}>
        <Input
          label="Customer Name"
          value={data.name}
          onChangeText={handleNameChange}
          placeholder="Start typing to search existing customers..."
          leftIcon="user"
          autoFocus
          testID="input-customer-name"
        />

        {showSuggestions && suggestions.length > 0 ? (
          <View style={[styles.suggestionsContainer, {
            backgroundColor: theme.backgroundSecondary,
            borderColor: theme.border,
          }]}>
            {suggestions.map((customer: any, index: number) => {
              const fullName = `${customer.firstName || ""} ${customer.lastName || ""}`.trim();
              return (
                <Pressable
                  key={customer.id}
                  style={[
                    styles.suggestionItem,
                    index < suggestions.length - 1 ? { borderBottomWidth: 1, borderBottomColor: theme.border } : null,
                  ]}
                  onPress={() => handleSelectCustomer(customer)}
                  testID={`suggestion-customer-${index}`}
                >
                  <View style={[styles.suggestionIcon, { backgroundColor: `${theme.primary}15` }]}>
                    <Feather name="user" size={14} color={theme.primary} />
                  </View>
                  <View style={styles.suggestionText}>
                    <ThemedText type="body" style={{ fontSize: 14, fontWeight: "600" }}>{fullName}</ThemedText>
                    {customer.email || customer.phone ? (
                      <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 12 }}>
                        {[customer.email, customer.phone].filter(Boolean).join(" · ")}
                      </ThemedText>
                    ) : null}
                  </View>
                  <Feather name="chevron-right" size={16} color={theme.textSecondary} />
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>

      <Input
        label="Phone (Optional)"
        value={data.phone}
        onChangeText={(v) => updateField("phone", v)}
        placeholder="(555) 123-4567"
        keyboardType="phone-pad"
        leftIcon="phone"
        testID="input-customer-phone"
      />

      <Input
        label="Email (Optional)"
        value={data.email}
        onChangeText={(v) => updateField("email", v)}
        placeholder="customer@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
        leftIcon="mail"
        testID="input-customer-email"
      />

      <Input
        label="Property Address (Optional)"
        value={data.address}
        onChangeText={(v) => updateField("address", v)}
        placeholder="123 Main St, City, State"
        leftIcon="map-pin"
        testID="input-customer-address"
      />

      <Input
        label="Preferred Date (Optional)"
        value={data.datePreference}
        onChangeText={(v) => updateField("datePreference", v)}
        placeholder="e.g., Next Tuesday"
        leftIcon="calendar"
        testID="input-customer-date"
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
  suggestionsContainer: {
    marginTop: -8,
    marginBottom: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  suggestionIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  suggestionText: {
    flex: 1,
    gap: 2,
  },
});
