import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Modal,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { FAB } from "@/components/FAB";
import { EmptyState } from "@/components/EmptyState";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { SegmentedControl } from "@/components/SegmentedControl";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ProBanner } from "@/components/ProBanner";
import { ProGate } from "@/components/ProGate";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useLanguage } from "@/context/LanguageContext";

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
  createdAt: string;
}

type StatusFilter = "all" | "lead" | "active" | "inactive";

export default function CustomersScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const filterOptions: { label: string; value: StatusFilter }[] = [
    { label: t.common.all, value: "all" },
    { label: t.customers.leads, value: "lead" },
    { label: t.customers.active, value: "active" },
    { label: t.customers.inactive, value: "inactive" },
  ];

  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(searchText);
    }, 300);
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchText]);

  const buildQueryKey = useCallback(() => {
    const params: string[] = ["/api/customers"];
    const queryParams: string[] = [];
    if (debouncedSearch) {
      queryParams.push(`search=${encodeURIComponent(debouncedSearch)}`);
    }
    if (statusFilter !== "all") {
      queryParams.push(`status=${statusFilter}`);
    }
    if (queryParams.length > 0) {
      params[0] = `/api/customers?${queryParams.join("&")}`;
    }
    return params;
  }, [debouncedSearch, statusFilter]);

  const {
    data: customers = [],
    isLoading,
    refetch,
  } = useQuery<Customer[]>({
    queryKey: buildQueryKey(),
  });

  const createMutation = useMutation({
    mutationFn: async (data: {
      firstName: string;
      lastName: string;
      phone: string;
      email: string;
      address: string;
    }) => {
      const res = await apiRequest("POST", "/api/customers", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      resetForm();
      setModalVisible(false);
    },
  });

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setPhone("");
    setEmail("");
    setAddress("");
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleAddCustomer = () => {
    setModalVisible(true);
  };

  const handleSaveCustomer = () => {
    if (!firstName.trim() || !lastName.trim()) return;
    createMutation.mutate({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
    });
  };

  const handleCustomerPress = (customer: Customer) => {
    navigation.navigate("CustomerDetail", { customerId: customer.id });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "lead":
        return theme.warning;
      case "active":
        return theme.success;
      case "inactive":
        return theme.error;
      default:
        return theme.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "lead":
        return t.customers.lead;
      case "active":
        return t.customers.active;
      case "inactive":
        return t.customers.inactive;
      default:
        return status;
    }
  };

  const renderCustomerItem = ({ item }: { item: Customer }) => {
    const statusColor = getStatusColor(item.status);
    return (
      <Card
        onPress={() => handleCustomerPress(item)}
        style={styles.customerCard}
      >
        <Pressable
          testID={`customer-row-${item.id}`}
          onPress={() => handleCustomerPress(item)}
          style={styles.customerRow}
        >
          <View style={styles.customerInfo}>
            <View style={styles.nameRow}>
              <ThemedText type="h4" style={styles.customerName}>
                {item.firstName} {item.lastName}
              </ThemedText>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: `${statusColor}20` },
                ]}
              >
                <ThemedText
                  type="caption"
                  style={[styles.statusText, { color: statusColor }]}
                >
                  {getStatusLabel(item.status)}
                </ThemedText>
              </View>
            </View>
            {item.phone ? (
              <View style={styles.detailRow}>
                <Feather
                  name="phone"
                  size={14}
                  color={theme.textSecondary}
                  style={styles.detailIcon}
                />
                <ThemedText
                  type="small"
                  style={{ color: theme.textSecondary }}
                >
                  {item.phone}
                </ThemedText>
              </View>
            ) : null}
            {item.email ? (
              <View style={styles.detailRow}>
                <Feather
                  name="mail"
                  size={14}
                  color={theme.textSecondary}
                  style={styles.detailIcon}
                />
                <ThemedText
                  type="small"
                  style={{ color: theme.textSecondary }}
                >
                  {item.email}
                </ThemedText>
              </View>
            ) : null}
          </View>
          <Feather name="chevron-right" size={20} color={theme.textSecondary} />
        </Pressable>
      </Card>
    );
  };

  const renderHeader = () => (
    <View>
      <ProBanner message={t.customers.aiFollowUpBanner} />
      <Input
        testID="search-input"
        placeholder={t.customers.searchPlaceholder}
        value={searchText}
        onChangeText={setSearchText}
        leftIcon="search"
        rightIcon={searchText.length > 0 ? "x" : undefined}
        onRightIconPress={() => setSearchText("")}
      />
      <View style={styles.filterContainer}>
        <SegmentedControl
          options={filterOptions}
          value={statusFilter}
          onChange={setStatusFilter}
        />
      </View>
    </View>
  );

  const renderEmpty = () =>
    isLoading ? (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    ) : (
      <EmptyState
        icon="users"
        iconColor={theme.primary}
        title={t.customers.noCustomers}
        description={t.customers.addDescription}
        actionLabel={t.customers.addCustomer}
        onAction={handleAddCustomer}
      />
    );

  return (
    <ProGate featureName="Customer Management">
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        testID="customers-list"
        data={customers}
        keyExtractor={(item) => item.id}
        renderItem={renderCustomerItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: tabBarHeight + Spacing.xl + 80,
          },
          customers.length === 0 ? styles.emptyContent : null,
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
      <FAB onPress={handleAddCustomer} testID="add-customer-fab" />

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: theme.backgroundRoot },
          ]}
        >
          <View style={styles.modalHeader}>
            <Pressable
              testID="modal-close-button"
              onPress={() => {
                resetForm();
                setModalVisible(false);
              }}
            >
              <ThemedText type="body" style={{ color: theme.primary }}>
                {t.common.cancel}
              </ThemedText>
            </Pressable>
            <ThemedText type="h4">{t.customers.newCustomer}</ThemedText>
            <View style={{ width: 60 }} />
          </View>
          <KeyboardAwareScrollViewCompat
            contentContainerStyle={styles.modalContent}
          >
            <Input
              testID="input-first-name"
              label={t.customers.firstName}
              placeholder={t.customers.firstNamePlaceholder}
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
            />
            <Input
              testID="input-last-name"
              label={t.customers.lastName}
              placeholder={t.customers.lastNamePlaceholder}
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
            />
            <Input
              testID="input-phone"
              label={t.customers.phone}
              placeholder={t.customers.phonePlaceholder}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              leftIcon="phone"
            />
            <Input
              testID="input-email"
              label={t.customers.email}
              placeholder={t.customers.emailPlaceholder}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon="mail"
            />
            <Input
              testID="input-address"
              label={t.customers.address}
              placeholder={t.customers.addressPlaceholder}
              value={address}
              onChangeText={setAddress}
              leftIcon="map-pin"
            />
            <Button
              onPress={handleSaveCustomer}
              disabled={
                !firstName.trim() ||
                !lastName.trim() ||
                createMutation.isPending
              }
              style={styles.saveButton}
            >
              {createMutation.isPending ? t.common.saving : t.customers.saveCustomer}
            </Button>
          </KeyboardAwareScrollViewCompat>
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
  emptyContent: {
    flexGrow: 1,
  },
  filterContainer: {
    marginBottom: Spacing.lg,
  },
  customerCard: {
    marginBottom: Spacing.sm,
    padding: Spacing.lg,
  },
  customerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  customerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  customerName: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontWeight: "600",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  detailIcon: {
    marginRight: Spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["4xl"],
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  modalContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing["4xl"],
  },
  saveButton: {
    marginTop: Spacing.lg,
  },
});
