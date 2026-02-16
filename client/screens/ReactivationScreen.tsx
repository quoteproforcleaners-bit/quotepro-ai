import React, { useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Modal,
  TextInput,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";

function useDesignTokens() {
  const { theme, isDark } = useTheme();
  return useMemo(() => ({
    surface: theme.cardBackground,
    surfaceSecondary: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
    border: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
    accent: theme.primary,
    accentSoft: isDark ? "rgba(100,160,255,0.12)" : "rgba(0,122,255,0.08)",
    textPrimary: theme.text,
    textSecondary: theme.textSecondary,
    overlay: isDark ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.5)",
  }), [theme, isDark]);
}

type Segment = "dormant" | "lost";
type Channel = "sms" | "email";

export default function ReactivationScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const queryClient = useQueryClient();
  const dt = useDesignTokens();

  const [segment, setSegment] = useState<Segment>("dormant");
  const [modalVisible, setModalVisible] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [campaignSegment, setCampaignSegment] = useState<Segment>("dormant");
  const [campaignChannel, setCampaignChannel] = useState<Channel>("sms");

  const dormantQuery = useQuery<any[]>({ queryKey: ["/api/opportunities/dormant"], enabled: segment === "dormant" });
  const lostQuery = useQuery<any[]>({ queryKey: ["/api/opportunities/lost"], enabled: segment === "lost" });

  const data = segment === "dormant" ? dormantQuery.data : lostQuery.data;
  const isLoading = segment === "dormant" ? dormantQuery.isLoading : lostQuery.isLoading;
  const isRefetching = segment === "dormant" ? dormantQuery.isRefetching : lostQuery.isRefetching;

  const totalDormant = dormantQuery.data?.length ?? 0;
  const estimatedValue = dormantQuery.data?.reduce((sum: number, c: any) => sum + (c.avgTicket ?? 0), 0) ?? 0;

  const handleReachOut = async (item: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await apiRequest("POST", "/api/growth-tasks", {
      type: "REACTIVATION",
      customerId: item.customerId ?? item.id,
      estimatedValue: item.avgTicket,
    });
    queryClient.invalidateQueries({ queryKey: ["/api/opportunities/dormant"] });
  };

  const handleRecover = async (item: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await apiRequest("POST", "/api/growth-tasks", {
      type: "ABANDONED_RECOVERY",
      customerId: item.customerId ?? item.id,
      quoteId: item.quoteId ?? item.id,
      estimatedValue: item.total,
    });
    queryClient.invalidateQueries({ queryKey: ["/api/opportunities/lost"] });
  };

  const handleCreateCampaign = async () => {
    if (!campaignName.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await apiRequest("POST", "/api/campaigns", {
      name: campaignName,
      segment: campaignSegment,
      channel: campaignChannel,
    });
    queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
    setModalVisible(false);
    setCampaignName("");
  };

  const refetch = () => {
    if (segment === "dormant") dormantQuery.refetch();
    else lostQuery.refetch();
  };

  const renderDormantItem = ({ item }: { item: any }) => (
    <Card style={styles.listCard}>
      <View style={styles.itemRow}>
        <View style={{ flex: 1 }}>
          <ThemedText type="subtitle">{item.customerName ?? item.name}</ThemedText>
          <ThemedText type="caption" style={{ color: dt.textSecondary }}>
            Last job: {item.lastJobDate ?? "N/A"}
          </ThemedText>
          <ThemedText type="small" style={{ color: dt.accent }}>
            Avg ticket: ${item.avgTicket?.toFixed(0) ?? "0"}
          </ThemedText>
        </View>
        <Pressable
          testID={`button-reach-out-${item.id}`}
          onPress={() => handleReachOut(item)}
          style={[styles.actionBtn, { backgroundColor: dt.accentSoft }]}
        >
          <Feather name="phone" size={14} color={dt.accent} />
          <ThemedText type="caption" style={{ color: dt.accent, marginLeft: 4 }}>Reach Out</ThemedText>
        </Pressable>
      </View>
    </Card>
  );

  const renderLostItem = ({ item }: { item: any }) => (
    <Card style={styles.listCard}>
      <View style={styles.itemRow}>
        <View style={{ flex: 1 }}>
          <ThemedText type="subtitle">{item.customerName ?? item.name}</ThemedText>
          <ThemedText type="caption" style={{ color: dt.textSecondary }}>
            Total: ${item.total?.toFixed(0) ?? "0"}
          </ThemedText>
          <View style={[styles.statusBadge, { backgroundColor: item.status === "expired" ? theme.warning + "20" : theme.error + "20" }]}>
            <ThemedText type="caption" style={{ color: item.status === "expired" ? theme.warning : theme.error }}>
              {item.status ?? "expired"}
            </ThemedText>
          </View>
        </View>
        <Pressable
          testID={`button-recover-${item.id}`}
          onPress={() => handleRecover(item)}
          style={[styles.actionBtn, { backgroundColor: theme.success + "15" }]}
        >
          <Feather name="refresh-cw" size={14} color={theme.success} />
          <ThemedText type="caption" style={{ color: theme.success, marginLeft: 4 }}>Recover</ThemedText>
        </Pressable>
      </View>
    </Card>
  );

  const SegmentOption = ({ label, value }: { label: string; value: Segment }) => (
    <Pressable
      testID={`tab-${value}`}
      onPress={() => setSegment(value)}
      style={[styles.segmentTab, segment === value ? { backgroundColor: dt.accent } : { backgroundColor: dt.surfaceSecondary }]}
    >
      <ThemedText type="small" style={{ color: segment === value ? "#FFFFFF" : dt.textPrimary }}>{label}</ThemedText>
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={data ?? []}
        keyExtractor={(item, i) => item.id?.toString() ?? i.toString()}
        renderItem={segment === "dormant" ? renderDormantItem : renderLostItem}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={dt.accent} />}
        contentContainerStyle={{ paddingTop: headerHeight + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl, paddingHorizontal: Spacing.lg }}
        ListHeaderComponent={
          <>
            <ThemedText type="small" style={{ color: dt.textSecondary, marginBottom: Spacing.md, lineHeight: 20 }}>
              Dormant customers haven't booked in a while. Lost quotes were sent but never accepted. Reach out to win them back and recover potential revenue.
            </ThemedText>
            <Card style={{...styles.summaryCard, borderColor: dt.border}}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <ThemedText type="h2" testID="text-dormant-count">{totalDormant}</ThemedText>
                  <ThemedText type="caption" style={{ color: dt.textSecondary }}>Dormant Customers</ThemedText>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: dt.border }]} />
                <View style={styles.summaryItem}>
                  <ThemedText type="h2" testID="text-recovery-value">${estimatedValue.toLocaleString()}</ThemedText>
                  <ThemedText type="caption" style={{ color: dt.textSecondary }}>Est. Recovery Value</ThemedText>
                </View>
              </View>
            </Card>
            <View style={styles.segmentRow}>
              <SegmentOption label="Dormant" value="dormant" />
              <SegmentOption label="Lost Quotes" value="lost" />
            </View>
          </>
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color={dt.accent} style={{ marginTop: Spacing["3xl"] }} />
          ) : (
            <View style={styles.emptyState}>
              <Feather name="users" size={48} color={dt.textSecondary} />
              <ThemedText type="subtitle" style={{ color: dt.textSecondary, marginTop: Spacing.md }}>
                {segment === "dormant" ? "No dormant customers found" : "No lost quotes found"}
              </ThemedText>
            </View>
          )
        }
      />

      <Pressable
        testID="fab-create-campaign"
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setModalVisible(true); }}
        style={[styles.fab, { backgroundColor: dt.accent, bottom: insets.bottom + Spacing.xl }]}
      >
        <Feather name="send" size={18} color="#FFFFFF" />
        <ThemedText type="caption" style={{ color: "#FFFFFF", marginTop: 2, fontSize: 10 }}>Campaign</ThemedText>
      </Pressable>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <View style={[styles.modalOverlay, { backgroundColor: dt.overlay, justifyContent: "flex-start", paddingTop: 100 }]}>
            <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
              <View style={styles.modalHeader}>
                <ThemedText type="h3">Create Campaign</ThemedText>
                <Pressable testID="button-close-modal" onPress={() => setModalVisible(false)}>
                  <Feather name="x" size={24} color={dt.textPrimary} />
                </Pressable>
              </View>

              <ThemedText type="small" style={{ color: dt.textSecondary, marginBottom: Spacing.sm }}>Campaign Name</ThemedText>
              <TextInput
                testID="input-campaign-name"
                value={campaignName}
                onChangeText={setCampaignName}
                placeholder="e.g. Spring Reactivation"
                placeholderTextColor={dt.textSecondary}
                style={[styles.input, { backgroundColor: theme.inputBackground, color: dt.textPrimary, borderColor: dt.border }]}
              />

              <ThemedText type="small" style={{ color: dt.textSecondary, marginBottom: Spacing.sm }}>Segment</ThemedText>
              <View style={styles.pickerRow}>
                {(["dormant", "lost"] as Segment[]).map((s) => (
                  <Pressable
                    key={s}
                    testID={`picker-segment-${s}`}
                    onPress={() => setCampaignSegment(s)}
                    style={[styles.pickerOption, campaignSegment === s ? { backgroundColor: dt.accentSoft, borderColor: dt.accent } : { borderColor: dt.border }]}
                  >
                    <ThemedText type="small" style={{ color: campaignSegment === s ? dt.accent : dt.textPrimary }}>
                      {s === "dormant" ? "Dormant" : "Lost Quotes"}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>

              <ThemedText type="small" style={{ color: dt.textSecondary, marginBottom: Spacing.sm }}>Channel</ThemedText>
              <View style={styles.pickerRow}>
                {(["sms", "email"] as Channel[]).map((ch) => (
                  <Pressable
                    key={ch}
                    testID={`picker-channel-${ch}`}
                    onPress={() => setCampaignChannel(ch)}
                    style={[styles.pickerOption, campaignChannel === ch ? { backgroundColor: dt.accentSoft, borderColor: dt.accent } : { borderColor: dt.border }]}
                  >
                    <Feather name={ch === "sms" ? "message-square" : "mail"} size={14} color={campaignChannel === ch ? dt.accent : dt.textSecondary} />
                    <ThemedText type="small" style={{ color: campaignChannel === ch ? dt.accent : dt.textPrimary, marginLeft: 6 }}>
                      {ch.toUpperCase()}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>

              <Pressable
                testID="button-create-campaign"
                onPress={handleCreateCampaign}
                style={[styles.createBtn, { backgroundColor: dt.accent }]}
              >
                <ThemedText type="subtitle" style={{ color: "#FFFFFF" }}>Create Campaign</ThemedText>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  summaryCard: { marginBottom: Spacing.lg, borderWidth: 1 },
  summaryRow: { flexDirection: "row", alignItems: "center" },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryDivider: { width: 1, height: 40 },
  segmentRow: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.lg },
  segmentTab: { flex: 1, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm, alignItems: "center" },
  listCard: { marginBottom: Spacing.sm },
  itemRow: { flexDirection: "row", alignItems: "center" },
  actionBtn: { flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.xs },
  statusBadge: { alignSelf: "flex-start", paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.xs, marginTop: 4 },
  emptyState: { alignItems: "center", justifyContent: "center", paddingTop: Spacing["5xl"] },
  fab: { position: "absolute", right: Spacing.lg, width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  modalOverlay: { flex: 1 },
  modalContent: { borderRadius: BorderRadius.xl, padding: Spacing.xl, marginHorizontal: Spacing.lg },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.xl },
  input: { borderWidth: 1, borderRadius: BorderRadius.xs, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: 16, marginBottom: Spacing.lg },
  pickerRow: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.lg },
  pickerOption: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: Spacing.sm, borderRadius: BorderRadius.xs, borderWidth: 1 },
  createBtn: { paddingVertical: Spacing.md, borderRadius: BorderRadius.sm, alignItems: "center", marginTop: Spacing.sm },
});
