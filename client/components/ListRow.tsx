import React from "react";
import { View, Pressable, StyleSheet, ViewStyle } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { IOSTypography } from "@/styles/tokens";

interface ListRowProps {
  title: string;
  subtitle?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  chevron?: boolean;
  onPress?: () => void;
  showSeparator?: boolean;
  style?: ViewStyle;
  testID?: string;
}

export function ListRow({
  title,
  subtitle,
  left,
  right,
  chevron = true,
  onPress,
  showSeparator = true,
  style,
  testID,
}: ListRowProps) {
  const { theme } = useTheme();

  const content = (
    <View
      style={[
        styles.row,
        style,
      ]}
    >
      {left ? <View style={styles.left}>{left}</View> : null}
      <View style={styles.middle}>
        <ThemedText style={[styles.title, { color: theme.colorTextPrimary }]} numberOfLines={1}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText style={[styles.subtitle, { color: theme.colorTextSecondary }]} numberOfLines={1}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
      {chevron ? (
        <Feather name="chevron-right" size={16} color={theme.colorTextMuted} style={styles.chevron} />
      ) : null}
      {showSeparator ? (
        <View style={[styles.separator, { backgroundColor: theme.colorDivider }]} />
      ) : null}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
    >
      {content}
    </Pressable>
  );
}

interface ListGroupProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function ListGroup({ children, style }: ListGroupProps) {
  const { theme, isDark } = useTheme();
  return (
    <View
      style={[
        styles.group,
        {
          backgroundColor: isDark ? theme.surface1 : theme.surface0,
          borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)",
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

interface SectionLabelProps {
  title: string;
  style?: ViewStyle;
}

export function SectionLabel({ title, style }: SectionLabelProps) {
  const { theme } = useTheme();
  return (
    <ThemedText
      style={[
        styles.sectionLabel,
        { color: theme.colorTextMuted },
        style,
      ]}
    >
      {title.toUpperCase()}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 50,
    paddingHorizontal: 16,
    paddingVertical: 11,
    position: "relative",
  },
  left: {
    marginRight: 12,
  },
  middle: {
    flex: 1,
  },
  right: {
    marginLeft: 8,
  },
  chevron: {
    marginLeft: 4,
  },
  title: {
    ...IOSTypography.subhead,
    fontWeight: "400",
  },
  subtitle: {
    ...IOSTypography.caption1,
    marginTop: 1,
  },
  separator: {
    position: "absolute",
    bottom: 0,
    left: 16,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  group: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    paddingHorizontal: 4,
    marginBottom: 6,
    marginTop: 8,
  },
});
