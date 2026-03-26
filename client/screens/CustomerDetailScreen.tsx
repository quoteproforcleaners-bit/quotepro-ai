import React, { useState, useEffect, useLayoutEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Linking,
  ActivityIndicator,
  Modal,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight, HeaderButton } from "@react-navigation/elements";
import { useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as SMS from "expo-sms";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { SectionHeader } from "@/components/SectionHeader";
import { useApp } from "@/context/AppContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { useLanguage } from "@/context/LanguageContext";
import { useCurrency } from "@/context/CurrencyContext";
import { formatCurrency } from "@/utils/currency";
import { ProGate } from "@/components/ProGate";
import { useAIConsent } from "@/context/AIConsentContext";

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  tags: string[];
  leadSource: string | null;
  status: string;
  isVip?: boolean;
  createdAt: string;
}

export default function CustomerDetailScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { width: screenWidth } = useWindowDimensions();
  const useMaxWidth = screenWidth > 600;
  const route = useRoute();
  const { customerId } = route.params as { customerId: string };
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const { businessProfile } = useApp();

  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const { isPro } = useSubscription();
  const { requestConsent } = useAIConsent();
  const { communicationLanguage, t } = useLanguage();
  const { currency } = useCurrency();
  const [showCommForm, setShowCommForm] = useState(false);
  const [commChannel, setCommChannel] = useState<string>("phone");
  const [commSubject, setCommSubject] = useState("");
  const [commContent, setCommContent] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [aiDrafting, setAiDrafting] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);

  const { data: customer, isLoading } = useQuery<Customer>({
    queryKey: ["/api/customers", customerId],
  });

  const { data: customerQuotes = [] } = useQuery({
    queryKey: ["/api/quotes", { customerId }],
    queryFn: async () => {
      const url = new URL("/api/quotes", getApiUrl());
      url.searchParams.set("customerId", customerId);
      const res = await fetch(url, { credentials: "include" });
      return res.json();
    },
  });

  const { data: customerJobs = [] } = useQuery({
    queryKey: ["/api/jobs", { customerId }],
    queryFn: async () => {
      const url = new URL("/api/jobs", getApiUrl());
      url.searchParams.set("customerId", customerId);
      const res = await fetch(url, { credentials: "include" });
      return res.json();
    },
  });

  const { data: customerComms = [] } = useQuery<any[]>({
    queryKey: ["/api/communications", { customerId }],
    queryFn: async () => {
      const url = new URL("/api/communications", getApiUrl());
      url.searchParams.set("customerId", customerId);
      const res = await fetch(url, { credentials: "include" });
      return res.json();
    },
  });

  const { data: campaignsList = [] } = useQuery<any[]>({
    queryKey: ["/api/campaigns"],
  });

  useEffect(() => {
    if (customer) {
      setFirstName(customer.firstName || "");
      setLastName(customer.lastName || "");
      setPhone(customer.phone || "");
      setEmail(customer.email || "");
      setAddress(customer.address || "");
      setNotes(customer.notes || "");
    }
  }, [customer]);

  useLayoutEffect(() => {
    const fullName = customer
      ? `${customer.firstName} ${customer.lastName}`.trim()
      : "Customer";
    navigation.setOptions({
      headerTitle: fullName,
      headerRight: () => (
        <HeaderButton
          onPress={() => setIsEditing((prev) => !prev)}
          testID="edit-customer-btn"
        >
          <Feather
            name={isEditing ? "check" : "edit-2"}
            size={20}
            color={theme.primary}
          />
        </HeaderButton>
      ),
    });
  }, [navigation, customer, isEditing, theme]);

  const updateMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("PUT", `/api/customers/${customerId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers", customerId] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/customers/${customerId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      navigation.goBack();
    },
  });

  const commMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/communications", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/communications", { customerId }] });
      queryClient.invalidateQueries({ queryKey: ["/api/communications"] });
    },
  });

  const parseErrorMessage = (error: any, fallback: string) => {
    try {
      const msg = error?.message || "";
      const jsonStart = msg.indexOf("{");
      if (jsonStart >= 0) {
        const parsed = JSON.parse(msg.slice(jsonStart));
        return parsed.message || fallback;
      }
      return msg || fallback;
    } catch {
      return error?.message || fallback;
    }
  };

  const sendEmailMutation = useMutation({
    mutationFn: async (data: { to: string; subject: string; body: string; customerId: string }) => {
      const res = await apiRequest("POST", "/api/send/email", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/communications", { customerId }] });
      queryClient.invalidateQueries({ queryKey: ["/api/communications"] });
      Alert.alert("Sent", "Email sent successfully");
    },
    onError: (error: any) => {
      Alert.alert("Error", parseErrorMessage(error, "Failed to send email"));
    },
  });

  const sendSmsMutation = useMutation({
    mutationFn: async (data: { to: string; body: string; customerId: string }) => {
      const isAvailable = await SMS.isAvailableAsync();
      if (!isAvailable) {
        throw new Error("Text messaging is not available on this device.");
      }
      const { result } = await SMS.sendSMSAsync([data.to], data.body);
      if (result === "sent") {
        await apiRequest("POST", "/api/communications", {
          customerId: data.customerId,
          channel: "sms",
          content: data.body,
          direction: "outbound",
        });
      }
      return { success: true, result };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/communications", { customerId }] });
      queryClient.invalidateQueries({ queryKey: ["/api/communications"] });
    },
    onError: (error: any) => {
      Alert.alert("Error", parseErrorMessage(error, "Could not open Messages"));
    },
  });

  const handleSaveEdit = () => {
    updateMutation.mutate({ firstName, lastName, phone, email, address });
    setIsEditing(false);
  };

  const handleSaveNotes = () => {
    updateMutation.mutate({ notes });
  };

  const handleStatusChange = (status: string) => {
    updateMutation.mutate({ status });
  };

  const handleAiDraft = async () => {
    if (!customer || aiDrafting) return;
    const consented = await requestConsent();
    if (!consented) return;
    setAiDrafting(true);
    try {
      const res = await apiRequest("POST", "/api/ai/communication-draft", {
        type: commChannel,
        purpose: "initial_quote",
        customerName: `${customer.firstName} ${customer.lastName}`.trim(),
        companyName: businessProfile.companyName,
        senderName: businessProfile.senderName || businessProfile.companyName,
        bookingLink: businessProfile.bookingLink || undefined,
        language: communicationLanguage,
      });
      const data = await res.json();
      if (data.draft) {
        let draft = data.draft;
        if (commChannel === "email" && draft.startsWith("Subject:")) {
          const lines = draft.split("\n");
          const subjectLine = lines[0].replace("Subject:", "").trim();
          setCommSubject(subjectLine);
          draft = lines.slice(1).join("\n").trim();
        }
        setCommContent(draft);
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not generate draft");
    } finally {
      setAiDrafting(false);
    }
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    setShowDeleteModal(false);
    deleteMutation.mutate();
  };

  const handleCall = () => {
    if (customer?.phone) {
      Linking.openURL(`tel:${customer.phone}`);
    }
  };

  const handleEmail = () => {
    if (customer?.email) {
      Linking.openURL(`mailto:${customer.email}`);
    }
  };

  const statusColors: Record<string, string> = {
    lead: theme.warning,
    active: theme.primary,
    inactive: theme.textSecondary,
  };

  if (isLoading) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </View>
    );
  }

  if (!customer) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      >
        <View style={styles.loadingContainer}>
          <ThemedText type="body">{"Customer not found"}</ThemedText>
        </View>
      </View>
    );
  }

  const fullName = `${customer.firstName} ${customer.lastName}`.trim();
  const tags: string[] = Array.isArray(customer.tags) ? customer.tags : [];

  return (
    <ProGate featureName="Customer Details">
      <View
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
        testID="customer-detail"
      >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xl + 80,
          },
          ...(useMaxWidth ? [{ maxWidth: 560, alignSelf: "center" as const, width: "100%" as const }] : []),
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        {isEditing ? (
          <View
            style={[
              styles.card,
              { backgroundColor: theme.cardBackground, borderColor: theme.border },
            ]}
          >
            <Input
              label="First Name"
              value={firstName}
              onChangeText={setFirstName}
              testID="input-first-name"
            />
            <Input
              label="Last Name"
              value={lastName}
              onChangeText={setLastName}
              testID="input-last-name"
            />
            <Input
              label="Phone"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              testID="input-phone"
            />
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              testID="input-email"
            />
            <Input
              label="Address"
              value={address}
              onChangeText={setAddress}
              testID="input-address"
            />
            <View testID="save-customer-btn">
              <Button onPress={handleSaveEdit}>
                {"Save Changes"}
              </Button>
            </View>
          </View>
        ) : (
          <View
            style={[
              styles.card,
              { backgroundColor: theme.cardBackground, borderColor: theme.border },
            ]}
          >
            <View style={styles.nameRow}>
              <ThemedText type="h3" testID="customer-name">
                {fullName}
              </ThemedText>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: `${statusColors[customer.status] || theme.textSecondary}15`,
                  },
                ]}
              >
                <ThemedText
                  type="caption"
                  style={{
                    color: statusColors[customer.status] || theme.textSecondary,
                    fontWeight: "600",
                  }}
                >
                  {customer.status.charAt(0).toUpperCase() +
                    customer.status.slice(1)}
                </ThemedText>
              </View>
              {customer.isVip ? (
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: "#F59E0B20", marginLeft: Spacing.xs },
                  ]}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Feather name="award" size={12} color="#F59E0B" style={{ marginRight: 2 }} />
                    <ThemedText
                      type="caption"
                      style={{ color: "#F59E0B", fontWeight: "600" }}
                    >
                      {t.customers.vip}
                    </ThemedText>
                  </View>
                </View>
              ) : null}
            </View>

            {customer.phone ? (
              <Pressable
                onPress={handleCall}
                style={styles.contactRow}
                testID="customer-phone"
              >
                <Feather
                  name="phone"
                  size={16}
                  color={theme.primary}
                  style={styles.contactIcon}
                />
                <ThemedText type="body" style={{ color: theme.primary }}>
                  {customer.phone}
                </ThemedText>
              </Pressable>
            ) : null}

            {customer.email ? (
              <Pressable
                onPress={handleEmail}
                style={styles.contactRow}
                testID="customer-email"
              >
                <Feather
                  name="mail"
                  size={16}
                  color={theme.primary}
                  style={styles.contactIcon}
                />
                <ThemedText type="body" style={{ color: theme.primary }}>
                  {customer.email}
                </ThemedText>
              </Pressable>
            ) : null}

            {customer.address ? (
              <View style={styles.contactRow}>
                <Feather
                  name="map-pin"
                  size={16}
                  color={theme.textSecondary}
                  style={styles.contactIcon}
                />
                <ThemedText
                  type="small"
                  style={{ color: theme.textSecondary, flex: 1 }}
                >
                  {customer.address}
                </ThemedText>
              </View>
            ) : null}
          </View>
        )}

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            updateMutation.mutate({ isVip: !customer.isVip });
          }}
          style={[
            styles.vipToggle,
            { backgroundColor: theme.cardBackground, borderColor: theme.border },
          ]}
          testID="toggle-vip-btn"
        >
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <Feather name="award" size={18} color="#F59E0B" style={{ marginRight: Spacing.sm }} />
            <ThemedText type="body" style={{ fontWeight: "500" }}>
              {t.customers.vipCustomer}
            </ThemedText>
          </View>
          <Feather
            name={customer.isVip ? "check-circle" : "circle"}
            size={22}
            color={customer.isVip ? "#F59E0B" : theme.textSecondary}
          />
        </Pressable>

        <View style={styles.quickActions}>
          <Pressable
            onPress={() => {
              const fullName = `${customer.firstName} ${customer.lastName}`.trim();
              navigation.navigate("QuoteCalculator", {
                prefillCustomer: {
                  name: fullName,
                  phone: customer.phone || "",
                  email: customer.email || "",
                  address: customer.address || "",
                  customerId,
                },
              });
            }}
            style={[styles.quickActionButton, { backgroundColor: `${theme.primary}15` }]}
            testID="quick-new-quote"
          >
            <Feather name="file-plus" size={18} color={theme.primary} />
            <ThemedText type="caption" style={{ color: theme.primary, fontWeight: "600", marginTop: 4 }}>
              {"New Quote"}
            </ThemedText>
          </Pressable>
          {customer.email ? (
            <Pressable
              onPress={() => {
                setShowCommForm(true);
                setCommChannel("email");
              }}
              style={[styles.quickActionButton, { backgroundColor: `${theme.success}15` }]}
              testID="quick-email"
            >
              <Feather name="mail" size={18} color={theme.success} />
              <ThemedText type="caption" style={{ color: theme.success, fontWeight: "600", marginTop: 4 }}>
                {"Email"}
              </ThemedText>
            </Pressable>
          ) : null}
          {customer.phone ? (
            <Pressable
              onPress={() => {
                setShowCommForm(true);
                setCommChannel("sms");
              }}
              style={[styles.quickActionButton, { backgroundColor: `${theme.warning}15` }]}
              testID="quick-sms"
            >
              <Feather name="message-square" size={18} color={theme.warning} />
              <ThemedText type="caption" style={{ color: theme.warning, fontWeight: "600", marginTop: 4 }}>
                {"SMS"}
              </ThemedText>
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => setShowCampaignModal(true)}
            style={[styles.quickActionButton, { backgroundColor: `${theme.primary}15` }]}
            testID="quick-campaign"
          >
            <Feather name="send" size={18} color={theme.primary} />
            <ThemedText type="caption" style={{ color: theme.primary, fontWeight: "600", marginTop: 4 }}>
              {"Campaign"}
            </ThemedText>
          </Pressable>
        </View>

        <SectionHeader title="Status" />
        <View style={styles.statusButtons}>
          {["lead", "active", "inactive"].map((status) => (
            <Pressable
              key={status}
              onPress={() => handleStatusChange(status)}
              style={[
                styles.statusButton,
                {
                  backgroundColor:
                    customer.status === status
                      ? statusColors[status]
                      : theme.backgroundSecondary,
                },
              ]}
              testID={`status-${status}-btn`}
            >
              <ThemedText
                type="small"
                style={{
                  color:
                    customer.status === status ? "#FFFFFF" : theme.text,
                  fontWeight: customer.status === status ? "600" : "400",
                  textTransform: "capitalize",
                }}
              >
                {status}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        {customer.leadSource ? (
          <>
            <SectionHeader title="Lead Source" />
            <View
              style={[
                styles.card,
                { backgroundColor: theme.cardBackground, borderColor: theme.border },
              ]}
            >
              <View style={styles.contactRow}>
                <Feather
                  name="target"
                  size={16}
                  color={theme.textSecondary}
                  style={styles.contactIcon}
                />
                <ThemedText type="body">{customer.leadSource}</ThemedText>
              </View>
            </View>
          </>
        ) : null}

        {tags.length > 0 ? (
          <>
            <SectionHeader title="Tags" />
            <View style={styles.tagsContainer}>
              {tags.map((tag: string, index: number) => (
                <View
                  key={`${tag}-${index}`}
                  style={[
                    styles.tag,
                    { backgroundColor: `${theme.primary}15` },
                  ]}
                >
                  <ThemedText
                    type="caption"
                    style={{ color: theme.primary, fontWeight: "500" }}
                  >
                    {tag}
                  </ThemedText>
                </View>
              ))}
            </View>
          </>
        ) : null}

        <SectionHeader title="Notes" />
        <Input
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
          placeholder="Add notes about this customer..."
          style={styles.notesInput}
          testID="input-notes"
        />
        {notes !== (customer.notes || "") ? (
          <Button onPress={handleSaveNotes}>
            {"Save Notes"}
          </Button>
        ) : null}

        <SectionHeader
          title="Quotes"
          subtitle={
            customerQuotes.length > 0
              ? `${customerQuotes.length} quote${customerQuotes.length !== 1 ? "s" : ""}`
              : undefined
          }
        />
        {customerQuotes.length > 0 ? (
          <View>
            {customerQuotes.map((q: any) => (
              <Pressable
                key={q.id}
                onPress={() =>
                  navigation.navigate("QuoteDetail", { quoteId: q.id })
                }
                style={[
                  styles.listItem,
                  { backgroundColor: theme.cardBackground, borderColor: theme.border },
                ]}
                testID={`quote-item-${q.id}`}
              >
                <View style={styles.listItemContent}>
                  <ThemedText type="body" style={{ fontWeight: "500" }}>
                    {q.total ? formatCurrency(Number(q.total), currency, { decimals: true }) : "No total"}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textSecondary }}
                  >
                    {new Date(q.createdAt).toLocaleDateString()}
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.miniStatusBadge,
                    {
                      backgroundColor: `${
                        q.status === "accepted"
                          ? theme.success
                          : q.status === "sent"
                            ? theme.primary
                            : theme.warning
                      }15`,
                    },
                  ]}
                >
                  <ThemedText
                    type="caption"
                    style={{
                      color:
                        q.status === "accepted"
                          ? theme.success
                          : q.status === "sent"
                            ? theme.primary
                            : theme.warning,
                      fontWeight: "600",
                      textTransform: "capitalize",
                    }}
                  >
                    {q.status}
                  </ThemedText>
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {"No quotes yet"}
          </ThemedText>
        )}

        <SectionHeader
          title="Jobs"
          subtitle={
            customerJobs.length > 0
              ? `${customerJobs.length} job${customerJobs.length !== 1 ? "s" : ""}`
              : undefined
          }
        />
        {customerJobs.length > 0 ? (
          <View>
            {customerJobs.map((j: any) => (
              <Pressable
                key={j.id}
                style={[
                  styles.listItem,
                  { backgroundColor: theme.cardBackground, borderColor: theme.border },
                ]}
                testID={`job-item-${j.id}`}
              >
                <View style={styles.listItemContent}>
                  <ThemedText type="body" style={{ fontWeight: "500" }}>
                    {j.jobType
                      ? j.jobType.charAt(0).toUpperCase() + j.jobType.slice(1)
                      : "Job"}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textSecondary }}
                  >
                    {new Date(j.startDatetime).toLocaleDateString()}
                  </ThemedText>
                </View>
                <View style={styles.listItemRight}>
                  {j.total ? (
                    <ThemedText type="small" style={{ fontWeight: "500" }}>
                      {formatCurrency(Number(j.total), currency, { decimals: true })}
                    </ThemedText>
                  ) : null}
                  <View
                    style={[
                      styles.miniStatusBadge,
                      {
                        backgroundColor: `${
                          j.status === "completed"
                            ? theme.success
                            : j.status === "in_progress"
                              ? theme.primary
                              : theme.warning
                        }15`,
                      },
                    ]}
                  >
                    <ThemedText
                      type="caption"
                      style={{
                        color:
                          j.status === "completed"
                            ? theme.success
                            : j.status === "in_progress"
                              ? theme.primary
                              : theme.warning,
                        fontWeight: "600",
                        textTransform: "capitalize",
                      }}
                    >
                      {j.status}
                    </ThemedText>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {"No jobs yet"}
          </ThemedText>
        )}

        <SectionHeader
          title="Communications"
          subtitle={
            customerComms.length > 0
              ? `${customerComms.length} communication${customerComms.length !== 1 ? "s" : ""}`
              : undefined
          }
        />
        <Pressable
          onPress={() => setShowCommForm((prev) => !prev)}
          style={[
            styles.commToggleButton,
            { backgroundColor: `${theme.primary}15` },
          ]}
          testID="log-comm-btn"
        >
          <Feather name={showCommForm ? "x" : "plus"} size={16} color={theme.primary} />
          <ThemedText
            type="small"
            style={{ color: theme.primary, fontWeight: "600", marginLeft: Spacing.xs }}
          >
            {showCommForm ? "Cancel" : "Log Communication"}
          </ThemedText>
        </Pressable>

        {showCommForm ? (
          <View
            style={[
              styles.card,
              { backgroundColor: theme.cardBackground, borderColor: theme.border },
            ]}
          >
            <ThemedText type="small" style={{ fontWeight: "600", marginBottom: Spacing.xs }}>
              {"Channel"}
            </ThemedText>
            <View style={styles.commChannelRow}>
              {([
                { key: "email", icon: "mail" as const, label: "Email" },
                { key: "sms", icon: "message-square" as const, label: "SMS" },
                { key: "phone", icon: "phone" as const, label: "Phone" },
              ] as const).map((ch) => (
                <Pressable
                  key={ch.key}
                  onPress={() => setCommChannel(ch.key)}
                  style={[
                    styles.commChannelButton,
                    {
                      backgroundColor:
                        commChannel === ch.key
                          ? theme.primary
                          : theme.backgroundSecondary,
                    },
                  ]}
                  testID={`comm-channel-${ch.key}`}
                >
                  <Feather
                    name={ch.icon}
                    size={14}
                    color={commChannel === ch.key ? "#FFFFFF" : theme.text}
                  />
                  <ThemedText
                    type="caption"
                    style={{
                      color: commChannel === ch.key ? "#FFFFFF" : theme.text,
                      marginLeft: 4,
                      fontWeight: commChannel === ch.key ? "600" : "400",
                    }}
                  >
                    {ch.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
            <Input
              label="Subject"
              value={commSubject}
              onChangeText={setCommSubject}
              placeholder="Subject or title..."
              testID="input-comm-subject"
            />
            <Input
              label="Content / Notes"
              value={commContent}
              onChangeText={setCommContent}
              placeholder="Details about this communication..."
              multiline
              numberOfLines={3}
              testID="input-comm-content"
            />
            {(commChannel === "email" || commChannel === "sms") && isPro ? (
              <Pressable
                onPress={handleAiDraft}
                disabled={aiDrafting}
                style={[
                  styles.aiDraftBtn,
                  { backgroundColor: `${theme.accent}15`, borderColor: `${theme.accent}30` },
                ]}
                testID="button-ai-draft"
              >
                {aiDrafting ? (
                  <ActivityIndicator size="small" color={theme.accent} />
                ) : (
                  <>
                    <Feather name="zap" size={14} color={theme.accent} />
                    <ThemedText type="small" style={{ color: theme.accent, fontWeight: "600", marginLeft: 6 }}>
                      AI Draft
                    </ThemedText>
                  </>
                )}
              </Pressable>
            ) : null}
            {(commChannel === "email" || commChannel === "sms") && !isPro ? (
              <Pressable
                onPress={() => navigation.navigate("Paywall")}
                style={[
                  styles.aiDraftBtn,
                  { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
                ]}
                testID="button-ai-draft-locked"
              >
                <Feather name="lock" size={14} color={theme.textSecondary} />
                <ThemedText type="small" style={{ color: theme.textSecondary, fontWeight: "600", marginLeft: 6 }}>
                  AI Draft (Pro)
                </ThemedText>
              </Pressable>
            ) : null}
            <View testID="submit-comm-btn">
              <Button
                onPress={() => {
                  const resetForm = () => {
                    setShowCommForm(false);
                    setCommChannel("phone");
                    setCommSubject("");
                    setCommContent("");
                  };

                  if (commChannel === "email" && customer.email) {
                    const emailBody = businessProfile.emailSignature
                      ? `${commContent}\n\n${businessProfile.emailSignature}`
                      : commContent;
                    sendEmailMutation.mutate(
                      { to: customer.email, subject: commSubject, body: emailBody, customerId },
                      { onSuccess: resetForm }
                    );
                  } else if (commChannel === "sms" && customer.phone) {
                    const smsBody = businessProfile.smsSignature
                      ? `${commContent}\n\n${businessProfile.smsSignature}`
                      : commContent;
                    sendSmsMutation.mutate(
                      { to: customer.phone, body: smsBody, customerId },
                      { onSuccess: resetForm }
                    );
                  } else {
                    commMutation.mutate(
                      { customerId, channel: commChannel, subject: commSubject, content: commContent },
                      { onSuccess: resetForm }
                    );
                  }
                }}
                disabled={sendEmailMutation.isPending || sendSmsMutation.isPending || commMutation.isPending}
              >
                {commChannel === "email" ? "Send Email" : commChannel === "sms" ? "Send SMS" : "Log Call"}
              </Button>
            </View>
          </View>
        ) : null}

        {customerComms.length > 0 ? (
          <View>
            {customerComms.map((comm: any) => {
              const channelIcon: Record<string, string> = {
                email: "mail",
                sms: "message-square",
                phone: "phone",
              };
              return (
                <View
                  key={comm.id}
                  style={[
                    styles.listItem,
                    { backgroundColor: theme.cardBackground, borderColor: theme.border },
                  ]}
                >
                  <Feather
                    name={(channelIcon[comm.channel] || "message-square") as any}
                    size={18}
                    color={theme.primary}
                    style={{ marginRight: Spacing.sm }}
                  />
                  <View style={styles.listItemContent}>
                    <ThemedText type="body" style={{ fontWeight: "500" }}>
                      {comm.subject || comm.channel}
                    </ThemedText>
                    {comm.content ? (
                      <ThemedText
                        type="caption"
                        style={{ color: theme.textSecondary }}
                        numberOfLines={1}
                      >
                        {comm.content}
                      </ThemedText>
                    ) : null}
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textSecondary }}
                    >
                      {new Date(comm.createdAt).toLocaleDateString()}
                    </ThemedText>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {"No communications yet"}
          </ThemedText>
        )}

        <SectionHeader title="Danger Zone" />
        <Pressable
          onPress={handleDelete}
          style={[
            styles.deleteButton,
            { backgroundColor: `${theme.error}15` },
          ]}
          testID="delete-customer-btn"
        >
          <Feather name="trash-2" size={18} color={theme.error} />
          <ThemedText
            type="body"
            style={{ color: theme.error, marginLeft: Spacing.sm, fontWeight: "500" }}
          >
            {"Delete Customer"}
          </ThemedText>
        </Pressable>
      </ScrollView>

      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowDeleteModal(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundRoot }]}>
            <View style={[styles.modalIconContainer, { backgroundColor: `${theme.error}15` }]}>
              <Feather name="alert-triangle" size={28} color={theme.error} />
            </View>
            <ThemedText type="h3" style={styles.modalTitle}>
              Delete Customer?
            </ThemedText>
            <ThemedText type="body" style={[styles.modalMessage, { color: theme.textSecondary }]}>
              This will permanently delete this customer and all their associated data. This cannot be undone.
            </ThemedText>
            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => setShowDeleteModal(false)}
                style={[styles.modalButton, { backgroundColor: theme.backgroundSecondary }]}
                testID="cancel-delete-btn"
              >
                <ThemedText type="body" style={{ fontWeight: "600" }}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                onPress={confirmDelete}
                style={[styles.modalButton, { backgroundColor: theme.error }]}
                testID="confirm-delete-btn"
              >
                <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>Delete</ThemedText>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
      <Modal visible={showCampaignModal} transparent animationType="slide" onRequestClose={() => setShowCampaignModal(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: theme.backgroundDefault, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: Spacing.xl, maxHeight: "60%" }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.lg }}>
              <ThemedText type="h3">Add to Campaign</ThemedText>
              <Pressable onPress={() => setShowCampaignModal(false)} hitSlop={8}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>
            {campaignsList.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 32 }}>
                <Feather name="send" size={40} color={theme.textSecondary} />
                <ThemedText type="subtitle" style={{ color: theme.textSecondary, marginTop: 12 }}>No campaigns yet</ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 4 }}>Create a campaign from the Growth tab first</ThemedText>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {campaignsList.map((campaign: any) => {
                  const existingIds: string[] = Array.isArray(campaign.customerIds) ? campaign.customerIds : [];
                  const isAdded = existingIds.includes(customerId.toString());
                  return (
                    <Pressable
                      key={campaign.id}
                      onPress={async () => {
                        if (isAdded) return;
                        try {
                          const newIds = [...existingIds, customerId.toString()];
                          await apiRequest("PUT", `/api/campaigns/${campaign.id}`, { customerIds: newIds });
                          queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
                        } catch (e) {
                          Alert.alert("Error", "Failed to add to campaign");
                        }
                      }}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingVertical: Spacing.md,
                        borderBottomWidth: 1,
                        borderBottomColor: theme.border,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <ThemedText type="subtitle">{campaign.name}</ThemedText>
                        <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                          {campaign.channel?.toUpperCase()}
                        </ThemedText>
                      </View>
                      {isAdded ? (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Feather name="check-circle" size={16} color={theme.success} />
                          <ThemedText type="caption" style={{ color: theme.success, fontWeight: "600" }}>Added</ThemedText>
                        </View>
                      ) : (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Feather name="plus-circle" size={16} color={theme.primary} />
                          <ThemedText type="caption" style={{ color: theme.primary, fontWeight: "600" }}>Add</ThemedText>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
      </View>
    </ProGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  vipToggle: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  quickActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  quickActionButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  contactIcon: {
    marginRight: Spacing.sm,
  },
  statusButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  statusButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  tag: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  listItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  listItemContent: {
    flex: 1,
    gap: 2,
  },
  listItemRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  miniStatusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
  },
  commToggleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  commChannelRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  aiDraftBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  commChannelButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  modalContent: {
    width: "100%",
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    alignItems: "center",
  },
  modalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  modalTitle: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  modalMessage: {
    textAlign: "center",
    marginBottom: Spacing.xl,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: "row",
    gap: Spacing.md,
    width: "100%",
  },
  modalButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
});
