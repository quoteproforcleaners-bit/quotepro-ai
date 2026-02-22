import { Platform } from "react-native";

const primaryLight = "#007AFF";
const primaryDark = "#2F7BFF";

export const Colors = {
  light: {
    text: "#0F172A",
    textSecondary: "#64748B",
    textMuted: "#94A3B8",
    buttonText: "#FFFFFF",
    tabIconDefault: "#64748B",
    tabIconSelected: primaryLight,
    link: primaryLight,
    primary: primaryLight,
    primaryDark: "#0062CC",
    primarySoft: "rgba(0, 122, 255, 0.08)",
    primaryText: "#0055CC",
    backgroundRoot: "#F8FAFC",
    backgroundDefault: "#FFFFFF",
    backgroundSecondary: "#F1F5F9",
    backgroundTertiary: "#E2E8F0",
    bg0: "#F8FAFC",
    bg1: "#F1F5F9",
    surface0: "#FFFFFF",
    surface1: "#F8FAFC",
    border: "#E2E8F0",
    divider: "#F1F5F9",
    surface2: "#EDF2F7",
    success: "#16A34A",
    successSoft: "rgba(22, 163, 74, 0.10)",
    successBorder: "rgba(22, 163, 74, 0.25)",
    warning: "#F59E0B",
    warningSoft: "rgba(245, 158, 11, 0.10)",
    warningBorder: "rgba(245, 158, 11, 0.25)",
    error: "#EF4444",
    accent: "#007AFF",
    brandGlow: "rgba(0, 122, 255, 0.12)",
    inputBackground: "#FFFFFF",
    cardBackground: "#FFFFFF",
    gradientSuccess: "#ECFDF5",
    gradientPrimary: "#EBF5FF",
    gradientWarning: "#F0F4F8",
    gradientAccent: "#EBF5FF",
    badgeBg: "#F1F5F9",
    badgeText: "#475569",
    badgeBorder: "#E2E8F0",
    overlay: "rgba(0,0,0,0.3)",
  },
  dark: {
    text: "#F5F7FF",
    textSecondary: "#C0CAE0",
    textMuted: "#8E9AB6",
    buttonText: "#FFFFFF",
    tabIconDefault: "#8E9AB6",
    tabIconSelected: primaryDark,
    link: primaryDark,
    primary: primaryDark,
    primaryDark: "#2467DE",
    primarySoft: "rgba(47, 123, 255, 0.14)",
    primaryText: "#DCE9FF",
    backgroundRoot: "#080F1A",
    backgroundDefault: "#0C1524",
    backgroundSecondary: "#0F1A2A",
    backgroundTertiary: "#172743",
    bg0: "#080F1A",
    bg1: "#121E31",
    surface0: "#0C1524",
    surface1: "#0F1A2A",
    surface2: "#131F33",
    surface3: "#172743",
    border: "#22314A",
    divider: "#1B2940",
    success: "#16A34A",
    successSoft: "rgba(22, 163, 74, 0.18)",
    successBorder: "rgba(22, 163, 74, 0.35)",
    warning: "#F8B84A",
    warningDeep: "#D97706",
    warningSoft: "rgba(248, 184, 74, 0.16)",
    warningBorder: "rgba(248, 184, 74, 0.45)",
    warningGlow: "rgba(248, 184, 74, 0.28)",
    error: "#EF4444",
    accent: "#2F7BFF",
    brandGlow: "rgba(47, 123, 255, 0.25)",
    brandSoft: "rgba(47, 123, 255, 0.14)",
    inputBackground: "#0C1524",
    cardBackground: "#0F1A2A",
    gradientSuccess: "rgba(22, 163, 74, 0.18)",
    gradientPrimary: "rgba(47, 123, 255, 0.12)",
    gradientWarning: "#1B2940",
    gradientAccent: "rgba(47, 123, 255, 0.12)",
    badgeBg: "#1B2940",
    badgeText: "#D7DEEA",
    badgeBorder: "#2A3B57",
    overlay: "rgba(0,0,0,0.6)",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  inputHeight: 48,
  buttonHeight: 52,
};

export const BorderRadius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  "2xl": 32,
  "3xl": 40,
  full: 9999,
};

export const Typography = {
  hero: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "700" as const,
  },
  h1: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "700" as const,
  },
  h2: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "700" as const,
  },
  h3: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "700" as const,
  },
  h4: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "500" as const,
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400" as const,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400" as const,
  },
  link: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "500" as const,
  },
};

export const Elevation = {
  e0: Platform.select({
    web: { boxShadow: "none" },
    default: {
      shadowColor: "#000",
      shadowOpacity: 0,
      shadowRadius: 0,
      shadowOffset: { width: 0, height: 0 },
      elevation: 0,
    },
  }) as any,
  e1: Platform.select({
    web: { boxShadow: "0px 6px 10px rgba(0,0,0,0.18)" },
    default: {
      shadowColor: "#000",
      shadowOpacity: 0.18,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2,
    },
  }) as any,
  e2: Platform.select({
    web: { boxShadow: "0px 10px 18px rgba(0,0,0,0.24)" },
    default: {
      shadowColor: "#000",
      shadowOpacity: 0.24,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 5,
    },
  }) as any,
  e3: Platform.select({
    web: { boxShadow: "0px 16px 28px rgba(0,0,0,0.30)" },
    default: {
      shadowColor: "#000",
      shadowOpacity: 0.30,
      shadowRadius: 28,
      shadowOffset: { width: 0, height: 16 },
      elevation: 8,
    },
  }) as any,
};

export const GlowEffects = {
  glowBlue: Platform.select({
    web: { boxShadow: "0px 10px 22px rgba(47,123,255,0.22)" },
    default: {
      shadowColor: "#2F7BFF",
      shadowOpacity: 0.22,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 10 },
    },
  }) as any,
  glowWarning: Platform.select({
    web: { boxShadow: "0px 10px 22px rgba(248,184,74,0.22)" },
    default: {
      shadowColor: "#F8B84A",
      shadowOpacity: 0.22,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 10 },
    },
  }) as any,
  glowWarningSubtle: Platform.select({
    web: { boxShadow: "0px 6px 16px rgba(248,184,74,0.16)" },
    default: {
      shadowColor: "#F8B84A",
      shadowOpacity: 0.16,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
    },
  }) as any,
  glowBlueSubtle: Platform.select({
    web: { boxShadow: "0px 6px 14px rgba(47,123,255,0.18)" },
    default: {
      shadowColor: "#2F7BFF",
      shadowOpacity: 0.18,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
    },
  }) as any,
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
