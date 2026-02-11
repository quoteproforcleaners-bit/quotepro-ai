import React from "react";
import { View, StyleSheet, Image, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { Input } from "@/components/Input";
import { SectionHeader } from "@/components/SectionHeader";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user, logout } = useAuth();
  const { businessProfile: profile, updateBusinessProfile } = useApp();

  const updateProfile = async (updates: Partial<typeof profile>) => {
    await updateBusinessProfile(updates);
    Haptics.selectionAsync();
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      updateProfile({ logoUri: result.assets[0].uri });
    }
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: tabBarHeight + Spacing.xl,
        },
      ]}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
    >
      <SectionHeader title="Business Profile" />

      <Pressable
        onPress={handlePickImage}
        style={[
          styles.logoContainer,
          { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
        ]}
      >
        {profile.logoUri ? (
          <Image source={{ uri: profile.logoUri }} style={styles.logo} />
        ) : (
          <View style={styles.logoPlaceholder}>
            <Image
              source={require("../../assets/images/business-avatar-default.png")}
              style={styles.defaultLogo}
            />
          </View>
        )}
        <View
          style={[styles.editBadge, { backgroundColor: theme.primary }]}
        >
          <Feather name="camera" size={14} color="#FFFFFF" />
        </View>
      </Pressable>

      <Input
        label="Company Name"
        value={profile.companyName}
        onChangeText={(v) => updateProfile({ companyName: v })}
        placeholder="Your cleaning company"
        leftIcon="briefcase"
      />

      <Input
        label="Email"
        value={profile.email}
        onChangeText={(v) => updateProfile({ email: v })}
        placeholder="contact@yourcompany.com"
        keyboardType="email-address"
        autoCapitalize="none"
        leftIcon="mail"
      />

      <Input
        label="Phone"
        value={profile.phone}
        onChangeText={(v) => updateProfile({ phone: v })}
        placeholder="(555) 123-4567"
        keyboardType="phone-pad"
        leftIcon="phone"
      />

      <Input
        label="Address"
        value={profile.address}
        onChangeText={(v) => updateProfile({ address: v })}
        placeholder="123 Main St, City, State"
        leftIcon="map-pin"
      />

      <SectionHeader title="Branding" subtitle="Customize your quote appearance" />

      <Input
        label="Sender Name"
        value={profile.senderName}
        onChangeText={(v) => updateProfile({ senderName: v })}
        placeholder="e.g., Mike"
        leftIcon="user"
      />

      <Input
        label="Sender Title"
        value={profile.senderTitle}
        onChangeText={(v) => updateProfile({ senderTitle: v })}
        placeholder="e.g., Owner"
        leftIcon="award"
      />

      <Input
        label="Booking Link"
        value={profile.bookingLink}
        onChangeText={(v) => updateProfile({ bookingLink: v })}
        placeholder="https://calendly.com/yourcompany"
        keyboardType="url"
        autoCapitalize="none"
        leftIcon="link"
      />

      <SectionHeader title="Pricing & Services" subtitle="Configure your rates and service options" />

      <Pressable
        onPress={() => navigation.navigate("PricingSettings")}
        style={[
          styles.settingsLink,
          { backgroundColor: theme.cardBackground, borderColor: theme.border },
        ]}
        testID="button-pricing-settings"
      >
        <View style={styles.settingsLinkContent}>
          <View style={[styles.settingsLinkIcon, { backgroundColor: `${theme.primary}15` }]}>
            <Feather name="dollar-sign" size={20} color={theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="body" style={{ fontWeight: "600" }}>
              Hourly Rates & Pricing
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Base rates, add-ons, and frequency discounts
            </ThemedText>
          </View>
          <Feather name="chevron-right" size={20} color={theme.textSecondary} />
        </View>
      </Pressable>

      <Pressable
        onPress={() => navigation.navigate("PricingSettings")}
        style={[
          styles.settingsLink,
          { backgroundColor: theme.cardBackground, borderColor: theme.border },
        ]}
        testID="button-service-types"
      >
        <View style={styles.settingsLinkContent}>
          <View style={[styles.settingsLinkIcon, { backgroundColor: `${theme.success}15` }]}>
            <Feather name="list" size={20} color={theme.success} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="body" style={{ fontWeight: "600" }}>
              Service Types
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Customize cleaning services and Good/Better/Best options
            </ThemedText>
          </View>
          <Feather name="chevron-right" size={20} color={theme.textSecondary} />
        </View>
      </Pressable>

      <SectionHeader title="Account" />

      {user ? (
        <View
          style={[
            styles.aboutCard,
            { backgroundColor: theme.cardBackground, borderColor: theme.border, marginBottom: Spacing.md },
          ]}
        >
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Signed in as
          </ThemedText>
          <ThemedText type="body" style={{ fontWeight: "600", marginTop: 2 }}>
            {user.email}
          </ThemedText>
        </View>
      ) : null}

      <Pressable
        onPress={logout}
        style={[
          styles.logoutButton,
          { backgroundColor: theme.error + "15", borderColor: theme.error + "30" },
        ]}
        testID="button-logout"
      >
        <Feather name="log-out" size={18} color={theme.error} />
        <ThemedText type="body" style={{ color: theme.error, fontWeight: "600", marginLeft: Spacing.sm }}>
          Sign Out
        </ThemedText>
      </Pressable>

      <SectionHeader title="About" />

      <View
        style={[
          styles.aboutCard,
          { backgroundColor: theme.cardBackground, borderColor: theme.border },
        ]}
      >
        <ThemedText type="body" style={{ fontWeight: "600" }}>
          QuotePro
        </ThemedText>
        <ThemedText
          type="small"
          style={[styles.version, { color: theme.textSecondary }]}
        >
          Version 1.0.0
        </ThemedText>
        <ThemedText
          type="small"
          style={{ color: theme.textSecondary, marginTop: Spacing.md }}
        >
          Professional quoting for residential cleaning businesses.
        </ThemedText>
      </View>
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
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.md,
    alignSelf: "center",
    marginBottom: Spacing["2xl"],
    overflow: "hidden",
    borderWidth: 1,
    position: "relative",
  },
  logo: {
    width: "100%",
    height: "100%",
  },
  logoPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  defaultLogo: {
    width: 60,
    height: 60,
  },
  editBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  version: {
    marginTop: 2,
  },
  aboutCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing["2xl"],
  },
  settingsLink: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  settingsLinkContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  settingsLinkIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
