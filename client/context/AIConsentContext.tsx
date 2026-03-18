import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { View, StyleSheet, Pressable, Modal, ScrollView } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/context/LanguageContext";
import { Spacing, BorderRadius } from "@/constants/theme";

const AI_CONSENT_KEY = "quotepro_ai_consent_granted";

interface AIConsentContextType {
  hasConsented: boolean;
  isLoading: boolean;
  requestConsent: () => Promise<boolean>;
  revokeConsent: () => void;
}

const AIConsentContext = createContext<AIConsentContextType>({
  hasConsented: false,
  isLoading: true,
  requestConsent: async () => false,
  revokeConsent: () => {},
});

export function useAIConsent() {
  return useContext(AIConsentContext);
}

export function AIConsentProvider({ children }: { children: ReactNode }) {
  const [hasConsented, setHasConsented] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null);
  const { theme, isDark } = useTheme();
  const { t } = useLanguage();

  const consent = t.aiConsent;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    AsyncStorage.getItem(AI_CONSENT_KEY).then((val) => {
      const consented = val === "true";
      setHasConsented(consented);
      setIsLoading(false);
      if (!consented) {
        timer = setTimeout(() => {
          setShowModal(true);
        }, 1200);
      }
    });
    return () => {
      if (timer !== null) clearTimeout(timer);
    };
  }, []);

  const requestConsent = useCallback(async (): Promise<boolean> => {
    if (hasConsented) return true;

    return new Promise<boolean>((resolve) => {
      setResolvePromise(() => resolve);
      setShowModal(true);
    });
  }, [hasConsented]);

  const handleAccept = useCallback(() => {
    setHasConsented(true);
    AsyncStorage.setItem(AI_CONSENT_KEY, "true");
    setShowModal(false);
    if (resolvePromise) {
      resolvePromise(true);
      setResolvePromise(null);
    }
  }, [resolvePromise]);

  const handleDecline = useCallback(() => {
    setShowModal(false);
    if (resolvePromise) {
      resolvePromise(false);
      setResolvePromise(null);
    }
  }, [resolvePromise]);

  const revokeConsent = useCallback(() => {
    setHasConsented(false);
    AsyncStorage.removeItem(AI_CONSENT_KEY);
  }, []);

  return (
    <AIConsentContext.Provider value={{ hasConsented, isLoading, requestConsent, revokeConsent }}>
      {children}
      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: theme.backgroundDefault }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={[styles.iconRow, { backgroundColor: theme.primary + "15" }]}>
                <Feather name="shield" size={28} color={theme.primary} />
              </View>

              <ThemedText type="h3" style={styles.title}>
                {consent.title}
              </ThemedText>

              <ThemedText type="body" style={[styles.description, { color: theme.textSecondary }]}>
                {consent.description}
              </ThemedText>

              <View style={[styles.dataSection, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", borderColor: theme.border }]}>
                <ThemedText type="subtitle" style={{ marginBottom: Spacing.sm }}>
                  {consent.dataSharedTitle}
                </ThemedText>
                {[
                  consent.dataItem1,
                  consent.dataItem2,
                  consent.dataItem3,
                  consent.dataItem4,
                ].map((item, i) => (
                  <View key={i} style={styles.dataRow}>
                    <Feather name="chevron-right" size={14} color={theme.primary} style={{ marginTop: 2 }} />
                    <ThemedText type="small" style={{ flex: 1, color: theme.textSecondary, marginLeft: Spacing.xs }}>
                      {item}
                    </ThemedText>
                  </View>
                ))}
              </View>

              <View style={[styles.dataSection, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", borderColor: theme.border }]}>
                <ThemedText type="subtitle" style={{ marginBottom: Spacing.sm }}>
                  {consent.providerTitle}
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {consent.providerDescription}
                </ThemedText>
              </View>

              <ThemedText type="caption" style={[styles.note, { color: theme.textSecondary }]}>
                {consent.privacyNote}
              </ThemedText>

              <Pressable
                style={[styles.acceptBtn, { backgroundColor: theme.primary }]}
                onPress={handleAccept}
                testID="button-ai-consent-accept"
              >
                <Feather name="check" size={18} color="#FFFFFF" />
                <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "700", marginLeft: Spacing.sm }}>
                  {consent.acceptButton}
                </ThemedText>
              </Pressable>

              <Pressable
                style={[styles.declineBtn, { borderColor: theme.border }]}
                onPress={handleDecline}
                testID="button-ai-consent-decline"
              >
                <ThemedText type="body" style={{ color: theme.textSecondary, fontWeight: "600" }}>
                  {consent.declineButton}
                </ThemedText>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </AIConsentContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  modal: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    maxHeight: "85%",
  },
  iconRow: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  description: {
    textAlign: "center",
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  dataSection: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  dataRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.xs,
  },
  note: {
    textAlign: "center",
    marginBottom: Spacing.lg,
    lineHeight: 18,
  },
  acceptBtn: {
    width: "100%",
    height: 52,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginBottom: Spacing.sm,
  },
  declineBtn: {
    width: "100%",
    height: 48,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
});
