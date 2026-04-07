import React from "react";
import { View, TextInput, StyleSheet, ViewStyle, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: ViewStyle;
  autoFocus?: boolean;
}

export function SearchBar({ value, onChangeText, placeholder = "Search", style, autoFocus }: SearchBarProps) {
  const { theme, isDark } = useTheme();
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
        },
        style,
      ]}
    >
      <Feather name="search" size={16} color={theme.colorTextMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colorTextMuted}
        autoFocus={autoFocus}
        autoCapitalize="none"
        autoCorrect={false}
        style={[
          styles.input,
          {
            color: theme.colorTextPrimary,
            fontFamily: Platform.OS === "ios" ? "System" : undefined,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
  },
});
