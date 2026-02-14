import React, { ReactNode } from "react";
import { StyleSheet, ViewStyle, StyleProp } from "react-native";
import { Button as PaperButton } from "react-native-paper";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

type ButtonMode = "contained" | "outlined" | "text";

interface ButtonProps {
  onPress?: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  mode?: ButtonMode;
  loading?: boolean;
  icon?: string;
  compact?: boolean;
  testID?: string;
}

export function Button({
  onPress,
  children,
  style,
  disabled = false,
  mode = "contained",
  loading = false,
  icon,
  compact = false,
  testID,
}: ButtonProps) {
  const { theme } = useTheme();

  const buttonColors =
    mode === "contained"
      ? { buttonColor: theme.primary, textColor: theme.buttonText }
      : mode === "outlined"
        ? { buttonColor: "transparent", textColor: theme.primary }
        : { buttonColor: "transparent", textColor: theme.primary };

  return (
    <PaperButton
      mode={mode}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      loading={loading}
      icon={icon}
      compact={compact}
      testID={testID}
      buttonColor={buttonColors.buttonColor}
      textColor={buttonColors.textColor}
      contentStyle={[
        styles.content,
        compact ? undefined : { height: Spacing.buttonHeight },
      ]}
      style={[
        styles.button,
        mode === "outlined" ? { borderColor: theme.primary } : undefined,
        style,
      ]}
      labelStyle={styles.label}
    >
      {children}
    </PaperButton>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: BorderRadius.full,
  },
  content: {
    paddingHorizontal: Spacing.md,
  },
  label: {
    fontWeight: "600",
    fontSize: 16,
    letterSpacing: 0.2,
  },
});
