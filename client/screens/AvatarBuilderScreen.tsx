import React, { useState } from "react";
import { View, StyleSheet, Pressable, ScrollView, TextInput as RNTextInput, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useNavigation } from "@react-navigation/native";
import { ThemedText } from "@/components/ThemedText";
import { SectionHeader } from "@/components/SectionHeader";
import { ProfileAvatar, AVATAR_COLORS, AVATAR_ICONS } from "@/components/ProfileAvatar";
import { useTheme } from "@/hooks/useTheme";
import { useApp } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { AvatarConfig } from "@/types";

export default function AvatarBuilderScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { width: screenWidth } = useWindowDimensions();
  const useMaxWidth = screenWidth > 600;
  const { businessProfile, updateBusinessProfile } = useApp();
  const { t } = useLanguage();

  const existing = businessProfile.avatarConfig;
  const [avatarStyle, setAvatarStyle] = useState<"initials" | "icon">(existing?.style || "initials");
  const [selectedColor, setSelectedColor] = useState(existing?.backgroundColor || AVATAR_COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState(existing?.icon || "user");
  const [initials, setInitials] = useState(existing?.initials || "");

  const currentConfig: AvatarConfig = {
    style: avatarStyle,
    backgroundColor: selectedColor,
    icon: avatarStyle === "icon" ? selectedIcon : undefined,
    initials: avatarStyle === "initials" ? (initials || undefined) : undefined,
  };

  const handleSave = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await updateBusinessProfile({ avatarConfig: currentConfig });
    navigation.goBack();
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{ paddingTop: headerHeight + Spacing.lg, paddingBottom: insets.bottom + Spacing.xl, ...(useMaxWidth ? { maxWidth: 560, alignSelf: "center" as const, width: "100%" } : undefined) }}
    >
      <View style={styles.previewContainer}>
        <ProfileAvatar
          config={currentConfig}
          size={100}
          fallbackInitials={businessProfile.companyName}
        />
        <ThemedText type="caption" style={[styles.previewLabel, { color: theme.textSecondary }]}>
          {t.settings.avatarSubtitle}
        </ThemedText>
      </View>

      <SectionHeader title={t.settings.chooseStyle} />
      <View style={styles.styleRow}>
        {(["initials", "icon"] as const).map((s) => (
          <Pressable
            key={s}
            onPress={() => {
              setAvatarStyle(s);
              Haptics.selectionAsync();
            }}
            style={[
              styles.styleOption,
              {
                backgroundColor: avatarStyle === s ? theme.primary : theme.backgroundSecondary,
                borderColor: avatarStyle === s ? theme.primary : theme.border,
              },
            ]}
          >
            <Feather
              name={s === "initials" ? "type" : "image"}
              size={18}
              color={avatarStyle === s ? "#FFFFFF" : theme.textSecondary}
            />
            <ThemedText
              type="body"
              style={{
                color: avatarStyle === s ? "#FFFFFF" : theme.text,
                fontWeight: "600",
                marginLeft: 8,
              }}
            >
              {s === "initials" ? t.settings.initialsStyle : t.settings.iconStyle}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      {avatarStyle === "initials" ? (
        <>
          <SectionHeader title={t.settings.enterInitials} />
          <View style={[styles.initialsInputContainer, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
            <RNTextInput
              value={initials}
              onChangeText={(v) => setInitials(v.toUpperCase().slice(0, 3))}
              placeholder={t.settings.initialsPlaceholder}
              placeholderTextColor={theme.textMuted}
              maxLength={3}
              autoCapitalize="characters"
              style={[styles.initialsInput, { color: theme.text }]}
            />
          </View>
        </>
      ) : (
        <>
          <SectionHeader title={t.settings.chooseIcon} />
          <View style={styles.iconGrid}>
            {AVATAR_ICONS.map((icon) => (
              <Pressable
                key={icon.name}
                onPress={() => {
                  setSelectedIcon(icon.name);
                  Haptics.selectionAsync();
                }}
                style={[
                  styles.iconCell,
                  {
                    backgroundColor: selectedIcon === icon.name ? selectedColor : theme.backgroundSecondary,
                    borderColor: selectedIcon === icon.name ? selectedColor : theme.border,
                  },
                ]}
              >
                <Feather
                  name={icon.name}
                  size={22}
                  color={selectedIcon === icon.name ? "#FFFFFF" : theme.textSecondary}
                />
              </Pressable>
            ))}
          </View>
        </>
      )}

      <SectionHeader title={t.settings.chooseColor} />
      <View style={styles.colorGrid}>
        {AVATAR_COLORS.map((color) => (
          <Pressable
            key={color}
            onPress={() => {
              setSelectedColor(color);
              Haptics.selectionAsync();
            }}
            style={[
              styles.colorCell,
              { backgroundColor: color },
              selectedColor === color && styles.colorCellSelected,
            ]}
          >
            {selectedColor === color ? (
              <Feather name="check" size={18} color="#FFFFFF" />
            ) : null}
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={handleSave}
        style={[styles.saveButton, { backgroundColor: theme.primary }]}
        testID="button-save-avatar"
      >
        <Feather name="check" size={18} color="#FFFFFF" />
        <ThemedText type="body" style={styles.saveButtonText}>
          {t.settings.saveAvatar}
        </ThemedText>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  previewContainer: {
    alignItems: "center",
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  previewLabel: {
    marginTop: Spacing.sm,
  },
  styleRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  styleOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  initialsInputContainer: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  initialsInput: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 4,
  },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  iconCell: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  colorCell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  colorCellSelected: {
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.6)",
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: Spacing.lg,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    gap: 8,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
