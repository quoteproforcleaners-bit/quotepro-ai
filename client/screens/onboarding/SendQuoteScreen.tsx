import React, { useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Input } from "@/components/Input";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface Props {
  selectedTierPrice: number;
  selectedTierName: string;
  businessName: string;
  onSend: (contact: { name: string; email: string; phone: string }) => void;
  onSkip: () => void;
  onBack: () => void;
}

export default function SendQuoteScreen({ selectedTierPrice, selectedTierName, businessName, onSend, onSkip, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const canSend = name.trim().length > 0 && (email.trim().length > 0 || phone.trim().length > 0);

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing["3xl"] }]}
    >
      <Pressable onPress={onBack} style={styles.backBtn} hitSlop={12}>
        <Feather name="arrow-left" size={22} color={theme.text} />
      </Pressable>

      <ThemedText type="caption" style={{ color: theme.primary, fontWeight: "600", marginBottom: Spacing.xs }}>
        STEP 5 OF 7
      </ThemedText>
      <ThemedText type="h2" style={{ marginBottom: Spacing.xs }}>Send It</ThemedText>
      <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.xl }}>
        Your quote is ready. Who's it for?
      </ThemedText>

      <View style={[styles.quoteSummary, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", borderColor: theme.border }]}>
        <View style={styles.summaryRow}>
          <ThemedText type="body" style={{ color: theme.textSecondary }}>Service</ThemedText>
          <ThemedText type="subtitle">{selectedTierName}</ThemedText>
        </View>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <View style={styles.summaryRow}>
          <ThemedText type="body" style={{ color: theme.textSecondary }}>Price</ThemedText>
          <ThemedText type="h3" style={{ color: theme.primary }}>${selectedTierPrice}</ThemedText>
        </View>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <View style={styles.summaryRow}>
          <ThemedText type="body" style={{ color: theme.textSecondary }}>From</ThemedText>
          <ThemedText type="subtitle">{businessName}</ThemedText>
        </View>
      </View>

      <ThemedText type="subtitle" style={{ marginTop: Spacing.xl, marginBottom: Spacing.sm }}>Customer Info</ThemedText>

      <Input
        label="Name"
        value={name}
        onChangeText={setName}
        placeholder="Jane Smith"
        leftIcon="user"
      />

      <Input
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="jane@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
        leftIcon="mail"
      />

      <Input
        label="Phone (optional)"
        value={phone}
        onChangeText={setPhone}
        placeholder="(555) 123-4567"
        keyboardType="phone-pad"
        leftIcon="phone"
      />

      <Pressable
        testID="button-send-quote"
        onPress={() => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onSend({ name: name.trim(), email: email.trim(), phone: phone.trim() });
        }}
        style={[styles.sendBtn, { backgroundColor: theme.primary, opacity: canSend ? 1 : 0.5 }]}
        disabled={!canSend}
      >
        <Feather name="send" size={18} color="#FFFFFF" />
        <ThemedText type="subtitle" style={{ color: "#FFFFFF", fontWeight: "700" }}>Send Quote</ThemedText>
      </Pressable>

      <Pressable onPress={onSkip} style={styles.skipBtn}>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>Skip and send later</ThemedText>
      </Pressable>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.xl },
  backBtn: { marginBottom: Spacing.lg },
  quoteSummary: { padding: Spacing.lg, borderRadius: BorderRadius.sm, borderWidth: 1 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: Spacing.xs },
  divider: { height: 1, marginVertical: Spacing.sm },
  sendBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.sm, height: 56, borderRadius: BorderRadius.md, marginTop: Spacing.xl },
  skipBtn: { alignItems: "center", padding: Spacing.md },
});
