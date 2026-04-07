import { Platform } from "react-native";

export const IOSColors = {
  blue: "#007AFF",
  green: "#34C759",
  orange: "#FF9500",
  red: "#FF3B30",
  purple: "#AF52DE",
  teal: "#5AC8FA",
  yellow: "#FFCC00",
  pink: "#FF2D55",
  indigo: "#5856D6",
  mint: "#00C7BE",
};

export const Radius = {
  xs: 8,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 20,
  "2xl": 24,
  card: 18,
  pill: 9999,
};

export const IOSTypography = {
  largeTitle: {
    fontSize: 34,
    lineHeight: 41,
    fontWeight: "700" as const,
    letterSpacing: 0.37,
  },
  title1: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700" as const,
    letterSpacing: 0.36,
  },
  title2: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700" as const,
    letterSpacing: 0.35,
  },
  title3: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: "600" as const,
    letterSpacing: 0.38,
  },
  headline: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600" as const,
    letterSpacing: -0.41,
  },
  body: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "400" as const,
    letterSpacing: -0.41,
  },
  callout: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "400" as const,
    letterSpacing: -0.32,
  },
  subhead: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "400" as const,
    letterSpacing: -0.24,
  },
  footnote: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400" as const,
    letterSpacing: -0.08,
  },
  caption1: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400" as const,
    letterSpacing: 0,
  },
  caption2: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: "400" as const,
    letterSpacing: 0.07,
  },
};

export const IOSShadow = Platform.select({
  ios: {
    card: {
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 2 },
    },
    cardMd: {
      shadowColor: "#000",
      shadowOpacity: 0.10,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 4 },
    },
    cardLg: {
      shadowColor: "#000",
      shadowOpacity: 0.14,
      shadowRadius: 32,
      shadowOffset: { width: 0, height: 8 },
    },
    hero: {
      shadowColor: "#007AFF",
      shadowOpacity: 0.22,
      shadowRadius: 28,
      shadowOffset: { width: 0, height: 10 },
    },
  },
  default: {
    card: {
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    cardMd: {
      shadowColor: "#000",
      shadowOpacity: 0.10,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    cardLg: {
      shadowColor: "#000",
      shadowOpacity: 0.14,
      shadowRadius: 32,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
    },
    hero: {
      shadowColor: "#007AFF",
      shadowOpacity: 0.22,
      shadowRadius: 28,
      shadowOffset: { width: 0, height: 10 },
      elevation: 10,
    },
  },
}) as {
  card: object;
  cardMd: object;
  cardLg: object;
  hero: object;
};
