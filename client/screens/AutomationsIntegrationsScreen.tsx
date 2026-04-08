import React, { useState, useCallback } from "react";
import { ProGateOverlay, useProGate } from "@/components/ProGate";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput as RNTextInput,
  Switch,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ThemedText } from "@/components/ThemedText";
import { SectionHeader } from "@/components/SectionHeader";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";
import { useLanguage } from "@/context/LanguageContext";

const WEBHOOK_EVENT_TYPES = [
  "quote.created",
  "quote.sent",
  "quote.accepted",
  "quote.declined",
  "invoice_packet.created",
  "calendar_stub.created",
];

interface ApiKeyItem {
  id: string;
  keyPrefix: string;
  label: string | null;
  isActive: boolean;
  createdAt: string;
}

interface WebhookEndpointItem {
  id: string;
  url: string;
  isActive: boolean;
  enabledEvents: string[];
  createdAt: string;
}

interface WebhookEventItem {
  id: string;
  eventType: string;
  createdAt: string;
  deliveries?: {
    id: string;
    statusCode: number | null;
    attemptNumber: number;
    deliveredAt: string | null;
    nextRetryAt: string | null;
  }[];
}

interface QuickConnectService {
  id: string;
  name: string;
  icon: "zap" | "cpu" | "globe";
  description: string;
  setupSteps: string[];
  urlPlaceholder: string;
}

const QUICK_CONNECT_SERVICES: QuickConnectService[] = [
  {
    id: "zapier",
    name: "Zapier",
    icon: "zap",
    description: "Automatically send quote info to your other apps when things happen — like getting a new quote accepted.",
    setupSteps: [
      "Go to zapier.com and create a free account",
      "Create a new Zap and choose 'Webhooks by Zapier' as the trigger",
      "Select 'Catch Hook' and copy the webhook URL",
      "Paste the URL below and tap Connect",
    ],
    urlPlaceholder: "https://hooks.zapier.com/hooks/catch/...",
  },
  {
    id: "make",
    name: "Make (Integromat)",
    icon: "globe",
    description: "Connect QuotePro to hundreds of apps. Great for sending data to your CRM or accounting software.",
    setupSteps: [
      "Go to make.com and create a free account",
      "Create a new Scenario and add a 'Webhooks' module",
      "Select 'Custom webhook' and copy the URL",
      "Paste the URL below and tap Connect",
    ],
    urlPlaceholder: "https://hook.us1.make.com/...",
  },
];

export default function AutomationsIntegrationsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { width: screenWidth } = useWindowDimensions();
  const useMaxWidth = screenWidth > 600;
  const { theme } = useTheme();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { hasAccess, isLoading: subLoading } = useProGate("pro");

  const [showNewKeyModal, setShowNewKeyModal] = useState(false);
  const [newKeyRaw, setNewKeyRaw] = useState<string | null>(null);
  const [generatingKey, setGeneratingKey] = useState(false);

  const [showAddWebhookModal, setShowAddWebhookModal] = useState(false);
  const [webhookUrlInput, setWebhookUrlInput] = useState("");
  const [webhookEvents, setWebhookEvents] = useState<string[]>([...WEBHOOK_EVENT_TYPES]);
  const [addingWebhook, setAddingWebhook] = useState(false);
  const [webhookUrlWarning, setWebhookUrlWarning] = useState<string | null>(null);

  const [showEventDetailModal, setShowEventDetailModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<WebhookEventItem | null>(null);
  const [testingEndpointId, setTestingEndpointId] = useState<string | null>(null);

  const [showQuickConnect, setShowQuickConnect] = useState<string | null>(null);
  const [quickConnectUrl, setQuickConnectUrl] = useState("");
  const [quickConnecting, setQuickConnecting] = useState(false);

  const [showAdvanced, setShowAdvanced] = useState(false);

  const { data: apiKeys = [], refetch: refetchKeys } = useQuery<ApiKeyItem[]>({
    queryKey: ["/api/api-keys"],
  });

  const { data: endpoints = [], refetch: refetchEndpoints } = useQuery<WebhookEndpointItem[]>({
    queryKey: ["/api/webhook-endpoints"],
  });

  const { data: events = [], refetch: refetchEvents } = useQuery<WebhookEventItem[]>({
    queryKey: ["/api/webhook-events"],
  });

  const handleGenerateKey = useCallback(async () => {
    setGeneratingKey(true);
    try {
      const res = await apiRequest("POST", "/api/api-keys");
      const data = await res.json();
      setNewKeyRaw(data.rawKey);
      setShowNewKeyModal(true);
      refetchKeys();
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.warn("Failed to generate API key:", e);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setGeneratingKey(false);
    }
  }, [refetchKeys]);

  const handleDeactivateKey = useCallback(async (id: string) => {
    try {
      await apiRequest("DELETE", `/api/api-keys/${id}`);
      refetchKeys();
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.warn("Failed to deactivate key:", e);
    }
  }, [refetchKeys]);

  const handleCopyKey = useCallback(async () => {
    if (newKeyRaw) {
      await Clipboard.setStringAsync(newKeyRaw);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [newKeyRaw]);

  const validateWebhookUrl = (url: string) => {
    if (url.startsWith("http://")) {
      setWebhookUrlWarning(t.automations.httpWarning);
    } else {
      setWebhookUrlWarning(null);
    }
  };

  const handleAddWebhook = useCallback(async () => {
    if (!webhookUrlInput.trim()) return;
    setAddingWebhook(true);
    try {
      await apiRequest("POST", "/api/webhook-endpoints", {
        url: webhookUrlInput.trim(),
        enabledEvents: webhookEvents,
      });
      setShowAddWebhookModal(false);
      setWebhookUrlInput("");
      setWebhookEvents([...WEBHOOK_EVENT_TYPES]);
      setWebhookUrlWarning(null);
      refetchEndpoints();
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.warn("Failed to add webhook:", e);
    } finally {
      setAddingWebhook(false);
    }
  }, [webhookUrlInput, webhookEvents, refetchEndpoints, t]);

  const handleToggleEndpoint = useCallback(async (id: string, isActive: boolean) => {
    try {
      await apiRequest("PATCH", `/api/webhook-endpoints/${id}`, { isActive: !isActive });
      refetchEndpoints();
    } catch (e) {
      console.warn("Failed to toggle endpoint:", e);
    }
  }, [refetchEndpoints]);

  const handleTestEndpoint = useCallback(async (id: string) => {
    setTestingEndpointId(id);
    try {
      await apiRequest("POST", `/api/webhook-endpoints/${id}/test`);
      refetchEvents();
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.warn("Failed to test endpoint:", e);
    } finally {
      setTestingEndpointId(null);
    }
  }, [refetchEvents]);

  const handleDeleteEndpoint = useCallback(async (id: string) => {
    try {
      await apiRequest("DELETE", `/api/webhook-endpoints/${id}`);
      refetchEndpoints();
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.warn("Failed to delete endpoint:", e);
    }
  }, [refetchEndpoints]);

  const handleViewEventDetail = (ev: WebhookEventItem) => {
    setSelectedEvent(ev);
    setShowEventDetailModal(true);
  };

  const handleQuickConnect = useCallback(async (service: QuickConnectService) => {
    const url = quickConnectUrl.trim();
    if (!url) return;
    if (!url.startsWith("https://") && !url.startsWith("http://")) return;
    setQuickConnecting(true);
    try {
      const hasKey = apiKeys.some((k) => k.isActive);
      if (!hasKey) {
        await apiRequest("POST", "/api/api-keys", { label: `${service.name} Connection` });
        await refetchKeys();
      }

      await apiRequest("POST", "/api/webhook-endpoints", {
        url,
        enabledEvents: [...WEBHOOK_EVENT_TYPES],
      });
      refetchEndpoints();
      setShowQuickConnect(null);
      setQuickConnectUrl("");
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.warn("Failed to quick connect:", e);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setQuickConnecting(false);
    }
  }, [quickConnectUrl, apiKeys, refetchKeys, refetchEndpoints]);

  const formatDate = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 60_000) return t.automations.justNow;
    if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m ago`;
    if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h ago`;
    return date.toLocaleDateString();
  };

  const getDeliveryStatus = (ev: WebhookEventItem) => {
    if (!ev.deliveries || ev.deliveries.length === 0) return "pending";
    const latest = ev.deliveries[ev.deliveries.length - 1];
    if (latest.deliveredAt && latest.statusCode && latest.statusCode >= 200 && latest.statusCode < 300) return "delivered";
    if (latest.nextRetryAt) return "retrying";
    return "failed";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered": return theme.success;
      case "retrying": return theme.warning;
      case "failed": return theme.error;
      default: return theme.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "delivered": return t.automations.delivered;
      case "retrying": return t.automations.retrying;
      case "failed": return t.automations.failed;
      default: return t.automations.pending;
    }
  };

  const isServiceConnected = (serviceId: string) => {
    return endpoints.some((ep) => {
      const url = ep.url.toLowerCase();
      if (serviceId === "zapier") return url.includes("zapier.com") || url.includes("hooks.zapier");
      if (serviceId === "make") return url.includes("make.com") || url.includes("integromat");
      return false;
    });
  };

  const activeConnections = endpoints.filter((ep) => ep.isActive).length;

  if (subLoading || !hasAccess) {
    return <ProGateOverlay featureName="Advanced Integrations" minTier="pro" isLoading={subLoading} />;
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: insets.bottom + Spacing.xl,
        },
        useMaxWidth ? { maxWidth: 560, alignSelf: "center" as const, width: "100%" } : undefined,
      ]}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.statusCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        <View style={[styles.statusIcon, { backgroundColor: activeConnections > 0 ? `${theme.success}15` : `${theme.textSecondary}15` }]}>
          <Feather name={activeConnections > 0 ? "check-circle" : "link"} size={20} color={activeConnections > 0 ? theme.success : theme.textSecondary} />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText type="body" style={{ fontWeight: "600" }}>
            {activeConnections > 0 ? t.automations.connectionsActive.replace("{{count}}", String(activeConnections)) : t.automations.noConnectionsYet}
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
            {activeConnections > 0 ? t.automations.connectionsActiveDesc : t.automations.noConnectionsYetDesc}
          </ThemedText>
        </View>
      </View>

      <SectionHeader title={t.automations.quickConnectTitle} />

      {QUICK_CONNECT_SERVICES.map((service) => {
        const connected = isServiceConnected(service.id);
        const isExpanded = showQuickConnect === service.id;

        return (
          <View key={service.id} style={[styles.serviceCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <Pressable
              onPress={() => {
                if (connected) return;
                setShowQuickConnect(isExpanded ? null : service.id);
                setQuickConnectUrl("");
              }}
              style={styles.serviceHeader}
              testID={`button-connect-${service.id}`}
            >
              <View style={[styles.serviceIcon, { backgroundColor: connected ? `${theme.success}15` : `${theme.primary}15` }]}>
                <Feather name={connected ? "check" : service.icon} size={20} color={connected ? theme.success : theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="body" style={{ fontWeight: "600" }}>
                  {service.name}
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
                  {connected ? t.automations.connected : service.description}
                </ThemedText>
              </View>
              {connected ? (
                <View style={[styles.connectedBadge, { backgroundColor: `${theme.success}15` }]}>
                  <ThemedText type="caption" style={{ color: theme.success, fontWeight: "600" }}>
                    {t.automations.connected}
                  </ThemedText>
                </View>
              ) : (
                <Feather name={isExpanded ? "chevron-up" : "chevron-right"} size={20} color={theme.textSecondary} />
              )}
            </Pressable>

            {isExpanded ? (
              <View style={[styles.setupArea, { borderTopColor: theme.border }]}>
                <ThemedText type="small" style={{ fontWeight: "600", marginBottom: Spacing.sm }}>
                  {t.automations.howToSetUp}
                </ThemedText>
                {service.setupSteps.map((step, idx) => (
                  <View key={idx} style={styles.stepRow}>
                    <View style={[styles.stepNumber, { backgroundColor: `${theme.primary}15` }]}>
                      <ThemedText type="caption" style={{ color: theme.primary, fontWeight: "700" }}>
                        {idx + 1}
                      </ThemedText>
                    </View>
                    <ThemedText type="small" style={{ flex: 1, color: theme.textSecondary }}>
                      {step}
                    </ThemedText>
                  </View>
                ))}

                <RNTextInput
                  value={quickConnectUrl}
                  onChangeText={setQuickConnectUrl}
                  placeholder={service.urlPlaceholder}
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.urlInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundDefault }]}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  testID={`input-quick-connect-${service.id}`}
                />

                <Pressable
                  onPress={() => handleQuickConnect(service)}
                  style={[styles.connectBtn, { backgroundColor: theme.primary, opacity: quickConnectUrl.trim().length > 0 ? 1 : 0.5 }]}
                  disabled={quickConnectUrl.trim().length === 0 || quickConnecting}
                  testID={`button-save-quick-connect-${service.id}`}
                >
                  {quickConnecting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                      {t.automations.connectNow}
                    </ThemedText>
                  )}
                </Pressable>
              </View>
            ) : null}
          </View>
        );
      })}

      <View style={[styles.helpCard, { backgroundColor: `${theme.primary}08`, borderColor: `${theme.primary}20` }]}>
        <Feather name="info" size={16} color={theme.primary} />
        <View style={{ flex: 1, marginLeft: Spacing.sm }}>
          <ThemedText type="small" style={{ fontWeight: "600", marginBottom: 4 }}>
            {t.automations.whatHappensTitle}
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            {t.automations.whatHappensBody}
          </ThemedText>
        </View>
      </View>

      {endpoints.length > 0 ? (
        <>
          <SectionHeader title={t.automations.yourConnectionsTitle} />
          <View style={[styles.listCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            {endpoints.map((ep, idx) => (
              <View
                key={ep.id}
                style={[
                  styles.endpointRow,
                  idx < endpoints.length - 1 ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border } : undefined,
                ]}
              >
                <View style={{ flex: 1 }}>
                  <ThemedText type="small" style={{ fontWeight: "600" }} numberOfLines={1}>
                    {ep.url}
                  </ThemedText>
                  <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
                    {(ep.enabledEvents || []).length} {t.automations.eventsEnabled}
                  </ThemedText>
                </View>
                <View style={styles.endpointActions}>
                  <Switch
                    value={ep.isActive}
                    onValueChange={() => handleToggleEndpoint(ep.id, ep.isActive)}
                    trackColor={{ false: theme.border, true: theme.primary }}
                    thumbColor="#FFFFFF"
                    testID={`switch-endpoint-${ep.id}`}
                  />
                  <Pressable
                    onPress={() => handleTestEndpoint(ep.id)}
                    style={[styles.testBtn, { borderColor: theme.border }]}
                    testID={`button-test-endpoint-${ep.id}`}
                  >
                    {testingEndpointId === ep.id ? (
                      <ActivityIndicator size="small" color={theme.primary} />
                    ) : (
                      <ThemedText type="caption" style={{ color: theme.primary, fontWeight: "600" }}>
                        {t.automations.test}
                      </ThemedText>
                    )}
                  </Pressable>
                  <Pressable
                    onPress={() => handleDeleteEndpoint(ep.id)}
                    testID={`button-delete-endpoint-${ep.id}`}
                  >
                    <Feather name="trash-2" size={16} color={theme.error} />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </>
      ) : null}

      {events.length > 0 ? (
        <>
          <SectionHeader title={t.automations.recentActivityTitle} />
          <View style={[styles.listCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            {events.slice(0, 5).map((ev, idx) => {
              const status = getDeliveryStatus(ev);
              const statusColor = getStatusColor(status);
              return (
                <Pressable
                  key={ev.id}
                  onPress={() => handleViewEventDetail(ev)}
                  style={[
                    styles.eventRow,
                    idx < Math.min(events.length, 5) - 1 ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border } : undefined,
                  ]}
                  testID={`button-event-${ev.id}`}
                >
                  <View style={{ flex: 1 }}>
                    <ThemedText type="small" style={{ fontWeight: "600" }}>
                      {ev.eventType}
                    </ThemedText>
                    <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                      {formatDate(ev.createdAt)}
                    </ThemedText>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <ThemedText type="caption" style={{ color: statusColor, fontWeight: "600" }}>
                      {getStatusLabel(status)}
                    </ThemedText>
                  </View>
                  <Feather name="chevron-right" size={16} color={theme.textSecondary} style={{ marginLeft: Spacing.sm }} />
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}

      <Pressable
        onPress={() => setShowAdvanced(!showAdvanced)}
        style={[styles.advancedToggle, { borderColor: theme.border }]}
        testID="button-toggle-advanced"
      >
        <ThemedText type="small" style={{ color: theme.textSecondary, fontWeight: "600" }}>
          {t.automations.advancedSettings}
        </ThemedText>
        <Feather name={showAdvanced ? "chevron-up" : "chevron-down"} size={16} color={theme.textSecondary} />
      </Pressable>

      {showAdvanced ? (
        <View style={styles.advancedSection}>
          <SectionHeader
            title={t.automations.apiKeysTitle}
            rightAction={
              <Pressable
                onPress={handleGenerateKey}
                style={[styles.headerAction, { backgroundColor: `${theme.primary}15` }]}
                testID="button-generate-api-key"
              >
                {generatingKey ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <>
                    <Feather name="plus" size={14} color={theme.primary} />
                    <ThemedText type="small" style={{ color: theme.primary, fontWeight: "600", marginLeft: 4 }}>
                      {t.automations.generateKey}
                    </ThemedText>
                  </>
                )}
              </Pressable>
            }
          />

          {apiKeys.length > 0 ? (
            <View style={[styles.listCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              {apiKeys.map((key, idx) => (
                <View
                  key={key.id}
                  style={[
                    styles.listRow,
                    idx < apiKeys.length - 1 ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border } : undefined,
                  ]}
                >
                  <View style={[styles.keyIcon, { backgroundColor: key.isActive ? `${theme.success}15` : `${theme.textSecondary}15` }]}>
                    <Feather name="key" size={16} color={key.isActive ? theme.success : theme.textSecondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="body" style={{ fontWeight: "600", fontFamily: "monospace" }}>
                      {"****" + key.keyPrefix}
                    </ThemedText>
                    <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                      {key.isActive ? t.automations.active : t.automations.inactive} {formatDate(key.createdAt)}
                    </ThemedText>
                  </View>
                  {key.isActive ? (
                    <Pressable
                      onPress={() => handleDeactivateKey(key.id)}
                      testID={`button-deactivate-key-${key.id}`}
                    >
                      <ThemedText type="small" style={{ color: theme.error }}>
                        {t.automations.revoke}
                      </ThemedText>
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </View>
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <Feather name="key" size={24} color={theme.textSecondary} />
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm, textAlign: "center" }}>
                {t.automations.noApiKeys}
              </ThemedText>
            </View>
          )}

          <SectionHeader
            title={t.automations.webhookEndpointsTitle}
            rightAction={
              <Pressable
                onPress={() => setShowAddWebhookModal(true)}
                style={[styles.headerAction, { backgroundColor: `${theme.primary}15` }]}
                testID="button-add-webhook"
              >
                <Feather name="plus" size={14} color={theme.primary} />
                <ThemedText type="small" style={{ color: theme.primary, fontWeight: "600", marginLeft: 4 }}>
                  {t.automations.addEndpoint}
                </ThemedText>
              </Pressable>
            }
          />

          {endpoints.length > 0 ? (
            <View style={[styles.listCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              {endpoints.map((ep, idx) => (
                <View
                  key={ep.id}
                  style={[
                    styles.endpointRow,
                    idx < endpoints.length - 1 ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border } : undefined,
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <ThemedText type="small" style={{ fontWeight: "600" }} numberOfLines={1}>
                      {ep.url}
                    </ThemedText>
                    <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
                      {(ep.enabledEvents || []).length} {t.automations.eventsEnabled}
                    </ThemedText>
                  </View>
                  <View style={styles.endpointActions}>
                    <Switch
                      value={ep.isActive}
                      onValueChange={() => handleToggleEndpoint(ep.id, ep.isActive)}
                      trackColor={{ false: theme.border, true: theme.primary }}
                      thumbColor="#FFFFFF"
                    />
                    <Pressable
                      onPress={() => handleTestEndpoint(ep.id)}
                      style={[styles.testBtn, { borderColor: theme.border }]}
                    >
                      {testingEndpointId === ep.id ? (
                        <ActivityIndicator size="small" color={theme.primary} />
                      ) : (
                        <ThemedText type="caption" style={{ color: theme.primary, fontWeight: "600" }}>
                          {t.automations.test}
                        </ThemedText>
                      )}
                    </Pressable>
                    <Pressable onPress={() => handleDeleteEndpoint(ep.id)}>
                      <Feather name="trash-2" size={16} color={theme.error} />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <Feather name="globe" size={24} color={theme.textSecondary} />
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm, textAlign: "center" }}>
                {t.automations.noWebhooks}
              </ThemedText>
            </View>
          )}

          {events.length > 0 ? (
            <>
              <SectionHeader title={t.automations.eventLogTitle} />
              <View style={[styles.listCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                {events.map((ev, idx) => {
                  const status = getDeliveryStatus(ev);
                  const statusColor = getStatusColor(status);
                  return (
                    <Pressable
                      key={ev.id}
                      onPress={() => handleViewEventDetail(ev)}
                      style={[
                        styles.eventRow,
                        idx < events.length - 1 ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border } : undefined,
                      ]}
                      testID={`button-event-adv-${ev.id}`}
                    >
                      <View style={{ flex: 1 }}>
                        <ThemedText type="small" style={{ fontWeight: "600" }}>
                          {ev.eventType}
                        </ThemedText>
                        <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                          {formatDate(ev.createdAt)}
                        </ThemedText>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
                        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                        <ThemedText type="caption" style={{ color: statusColor, fontWeight: "600" }}>
                          {getStatusLabel(status)}
                        </ThemedText>
                      </View>
                      <Feather name="chevron-right" size={16} color={theme.textSecondary} style={{ marginLeft: Spacing.sm }} />
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}
        </View>
      ) : null}

      <Modal visible={showNewKeyModal} transparent animationType="fade" onRequestClose={() => { setShowNewKeyModal(false); setNewKeyRaw(null); }}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
            <View style={[styles.modalIcon, { backgroundColor: `${theme.success}15` }]}>
              <Feather name="check-circle" size={28} color={theme.success} />
            </View>
            <ThemedText type="h4" style={{ textAlign: "center", marginTop: Spacing.md }}>
              {t.automations.keyGenerated}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}>
              {t.automations.keyGeneratedDesc}
            </ThemedText>
            <View style={[styles.keyDisplay, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
              <ThemedText type="small" style={{ fontFamily: "monospace", flex: 1 }} numberOfLines={1}>
                {newKeyRaw || ""}
              </ThemedText>
              <Pressable onPress={handleCopyKey} testID="button-copy-api-key">
                <Feather name="copy" size={18} color={theme.primary} />
              </Pressable>
            </View>
            <Pressable
              onPress={() => { setShowNewKeyModal(false); setNewKeyRaw(null); }}
              style={[styles.modalBtn, { backgroundColor: theme.primary }]}
              testID="button-dismiss-key-modal"
            >
              <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                {t.common.done}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={showAddWebhookModal} transparent animationType="fade" onRequestClose={() => setShowAddWebhookModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
            <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>
              {t.automations.addWebhookEndpoint}
            </ThemedText>

            <ThemedText type="small" style={{ fontWeight: "600", marginBottom: Spacing.xs }}>
              {t.automations.endpointUrl}
            </ThemedText>
            <RNTextInput
              value={webhookUrlInput}
              onChangeText={(text) => {
                setWebhookUrlInput(text);
                if (text.trim().length > 0) validateWebhookUrl(text);
              }}
              placeholder="https://hooks.zapier.com/..."
              placeholderTextColor={theme.textSecondary}
              style={[styles.urlInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundDefault }]}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              testID="input-webhook-url"
            />
            {webhookUrlWarning ? (
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: Spacing.xs }}>
                <Feather name="alert-triangle" size={12} color={theme.warning} />
                <ThemedText type="caption" style={{ color: theme.warning, marginLeft: 4 }}>
                  {webhookUrlWarning}
                </ThemedText>
              </View>
            ) : null}

            <ThemedText type="small" style={{ fontWeight: "600", marginTop: Spacing.lg, marginBottom: Spacing.sm }}>
              {t.automations.enabledEvents}
            </ThemedText>
            {WEBHOOK_EVENT_TYPES.map((evt) => (
              <Pressable
                key={evt}
                onPress={() => {
                  setWebhookEvents((prev) =>
                    prev.includes(evt) ? prev.filter((e) => e !== evt) : [...prev, evt]
                  );
                }}
                style={styles.eventToggleRow}
              >
                <Feather
                  name={webhookEvents.includes(evt) ? "check-square" : "square"}
                  size={18}
                  color={webhookEvents.includes(evt) ? theme.primary : theme.textSecondary}
                />
                <ThemedText type="small" style={{ marginLeft: Spacing.sm }}>
                  {evt}
                </ThemedText>
              </Pressable>
            ))}

            <View style={{ flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.lg }}>
              <Pressable
                onPress={() => { setShowAddWebhookModal(false); setWebhookUrlWarning(null); }}
                style={[styles.modalBtn, { backgroundColor: theme.backgroundDefault, flex: 1 }]}
              >
                <ThemedText type="body" style={{ textAlign: "center" }}>
                  {t.common.cancel}
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={handleAddWebhook}
                style={[styles.modalBtn, { backgroundColor: theme.primary, flex: 1, opacity: webhookUrlInput.trim().length > 0 ? 1 : 0.5 }]}
                disabled={webhookUrlInput.trim().length === 0 || addingWebhook}
                testID="button-save-webhook"
              >
                {addingWebhook ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600", textAlign: "center" }}>
                    {t.common.save}
                  </ThemedText>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showEventDetailModal} transparent animationType="fade" onRequestClose={() => setShowEventDetailModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
            <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>
              {t.automations.eventDetail}
            </ThemedText>
            {selectedEvent ? (
              <>
                <View style={[styles.detailRow, { borderBottomColor: theme.border }]}>
                  <ThemedText type="caption" style={{ color: theme.textSecondary }}>{t.automations.eventType}</ThemedText>
                  <ThemedText type="small" style={{ fontWeight: "600" }}>{selectedEvent.eventType}</ThemedText>
                </View>
                <View style={[styles.detailRow, { borderBottomColor: theme.border }]}>
                  <ThemedText type="caption" style={{ color: theme.textSecondary }}>{t.automations.createdAt}</ThemedText>
                  <ThemedText type="small">{new Date(selectedEvent.createdAt).toLocaleString()}</ThemedText>
                </View>
                {selectedEvent.deliveries && selectedEvent.deliveries.length > 0 ? (
                  <>
                    <ThemedText type="small" style={{ fontWeight: "600", marginTop: Spacing.md, marginBottom: Spacing.sm }}>
                      {t.automations.deliveryAttempts}
                    </ThemedText>
                    {selectedEvent.deliveries.map((d) => (
                      <View key={d.id} style={[styles.deliveryRow, { backgroundColor: theme.backgroundSecondary }]}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.sm }}>
                          <ThemedText type="caption" style={{ fontWeight: "600" }}>
                            #{d.attemptNumber}
                          </ThemedText>
                          <View style={[
                            styles.statusBadge,
                            { backgroundColor: d.deliveredAt ? `${theme.success}15` : `${theme.error}15` },
                          ]}>
                            <ThemedText type="caption" style={{
                              color: d.deliveredAt ? theme.success : theme.error,
                              fontWeight: "600",
                            }}>
                              {d.statusCode || "---"}
                            </ThemedText>
                          </View>
                        </View>
                        {d.nextRetryAt ? (
                          <ThemedText type="caption" style={{ color: theme.warning }}>
                            {t.automations.retryAt} {new Date(d.nextRetryAt).toLocaleTimeString()}
                          </ThemedText>
                        ) : null}
                      </View>
                    ))}
                  </>
                ) : (
                  <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
                    {t.automations.noDeliveries}
                  </ThemedText>
                )}
              </>
            ) : null}
            <Pressable
              onPress={() => setShowEventDetailModal(false)}
              style={[styles.modalBtn, { backgroundColor: theme.primary, marginTop: Spacing.lg }]}
              testID="button-close-event-detail"
            >
              <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                {t.common.close}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  serviceCard: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: Spacing.md,
  },
  serviceHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  serviceIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  connectedBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  setupArea: {
    padding: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  connectBtn: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    marginTop: Spacing.md,
  },
  helpCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  advancedToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  advancedSection: {
    marginTop: Spacing.sm,
  },
  headerAction: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  listCard: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: Spacing.md,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  keyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCard: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    padding: Spacing.xl,
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  endpointRow: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  endpointActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  testBtn: {
    borderWidth: 1,
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  modalContent: {
    width: "100%",
    maxWidth: 420,
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
  },
  modalIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  keyDisplay: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  modalBtn: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  urlInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 14,
    marginTop: Spacing.sm,
  },
  eventToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.xs,
  },
  detailRow: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  deliveryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.sm,
    borderRadius: BorderRadius.xs,
    marginBottom: Spacing.xs,
  },
});
