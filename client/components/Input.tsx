import React from "react";
import {
  View,
  StyleSheet,
  TextInputProps,
  Pressable,
} from "react-native";
import { TextInput as PaperTextInput } from "react-native-paper";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: keyof typeof Feather.glyphMap;
  rightIcon?: keyof typeof Feather.glyphMap;
  onRightIconPress?: () => void;
}

export function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  style,
  multiline,
  ...props
}: InputProps) {
  const { theme, isDark } = useTheme();

  return (
    <View style={styles.container}>
      <PaperTextInput
        label={label}
        mode="outlined"
        error={!!error}
        multiline={multiline}
        outlineColor={theme.border}
        activeOutlineColor={theme.primary}
        textColor={theme.text}
        placeholderTextColor={theme.textSecondary}
        outlineStyle={{ borderRadius: BorderRadius.xs }}
        contentStyle={[
          multiline ? styles.inputMultiline : undefined,
          style,
        ]}
        style={[
          styles.input,
          {
            backgroundColor: theme.inputBackground,
          },
          multiline ? styles.inputMultilineOuter : undefined,
        ]}
        theme={{
          colors: {
            onSurfaceVariant: theme.textSecondary,
          },
        }}
        left={
          leftIcon ? (
            <PaperTextInput.Icon
              icon={() => (
                <Feather name={leftIcon} size={20} color={theme.textSecondary} />
              )}
            />
          ) : undefined
        }
        right={
          rightIcon ? (
            <PaperTextInput.Icon
              icon={() => (
                <Feather name={rightIcon} size={20} color={theme.textSecondary} />
              )}
              onPress={onRightIconPress}
            />
          ) : undefined
        }
        {...props}
      />
      {error ? (
        <ThemedText
          type="small"
          style={[styles.error, { color: theme.error }]}
        >
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  input: {
    fontSize: 16,
  },
  inputMultiline: {
    paddingVertical: Spacing.md,
    textAlignVertical: "top",
  },
  inputMultilineOuter: {
    minHeight: Spacing.inputHeight * 2,
  },
  error: {
    marginTop: Spacing.xs,
  },
});
