import React, { useState } from "react";
import { View, StyleSheet, Image, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { BusinessProfile } from "@/types";

interface Props {
  navigation: NativeStackNavigationProp<any>;
  profile: BusinessProfile;
  onUpdate: (profile: BusinessProfile) => void;
}

export default function BusinessProfileScreen({
  navigation,
  profile,
  onUpdate,
}: Props) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [companyName, setCompanyName] = useState(profile.companyName);
  const [email, setEmail] = useState(profile.email);
  const [phone, setPhone] = useState(profile.phone);
  const [address, setAddress] = useState(profile.address);
  const [logoUri, setLogoUri] = useState<string | null>(profile.logoUri);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setLogoUri(result.assets[0].uri);
    }
  };

  const handleNext = () => {
    onUpdate({
      ...profile,
      companyName,
      email,
      phone,
      address,
      logoUri,
    });
    navigation.navigate("OnboardingPricing");
  };

  const handleSkip = () => {
    navigation.navigate("OnboardingPricing");
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + Spacing.xl,
          paddingBottom: insets.bottom + Spacing.xl,
        },
      ]}
    >
      <View style={styles.header}>
        <ThemedText type="hero" style={styles.title}>
          Welcome to QuotePro
        </ThemedText>
        <ThemedText
          type="body"
          style={[styles.subtitle, { color: theme.textSecondary }]}
        >
          Let's set up your business profile to create professional quotes.
        </ThemedText>
      </View>

      <Pressable
        onPress={handlePickImage}
        style={[
          styles.logoContainer,
          { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
        ]}
      >
        {logoUri ? (
          <Image source={{ uri: logoUri }} style={styles.logo} />
        ) : (
          <View style={styles.logoPlaceholder}>
            <Feather name="camera" size={32} color={theme.textSecondary} />
            <ThemedText
              type="small"
              style={[styles.logoText, { color: theme.textSecondary }]}
            >
              Add Logo
            </ThemedText>
          </View>
        )}
      </Pressable>

      <Input
        label="Company Name"
        value={companyName}
        onChangeText={setCompanyName}
        placeholder="Your cleaning company"
        leftIcon="briefcase"
      />

      <Input
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="contact@yourcompany.com"
        keyboardType="email-address"
        autoCapitalize="none"
        leftIcon="mail"
      />

      <Input
        label="Phone"
        value={phone}
        onChangeText={setPhone}
        placeholder="(555) 123-4567"
        keyboardType="phone-pad"
        leftIcon="phone"
      />

      <Input
        label="Address"
        value={address}
        onChangeText={setAddress}
        placeholder="123 Main St, City, State"
        leftIcon="map-pin"
      />

      <View style={styles.actions}>
        <Button onPress={handleNext} style={styles.nextButton}>
          Next
        </Button>
        <Pressable onPress={handleSkip} style={styles.skipButton}>
          <ThemedText type="link" style={{ color: theme.textSecondary }}>
            Skip for now
          </ThemedText>
        </Pressable>
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
  header: {
    marginBottom: Spacing["3xl"],
  },
  title: {
    marginBottom: Spacing.sm,
  },
  subtitle: {},
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: BorderRadius.md,
    alignSelf: "center",
    marginBottom: Spacing["2xl"],
    overflow: "hidden",
    borderWidth: 2,
    borderStyle: "dashed",
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
  logoText: {
    marginTop: Spacing.xs,
  },
  actions: {
    marginTop: Spacing.xl,
  },
  nextButton: {
    marginBottom: Spacing.md,
  },
  skipButton: {
    alignItems: "center",
    padding: Spacing.md,
  },
});
