import { MD3DarkTheme, MD3LightTheme, configureFonts } from "react-native-paper";
import { Colors } from "@/constants/theme";

const fontConfig = {
  fontFamily: undefined,
};

export const PaperDarkTheme = {
  ...MD3DarkTheme,
  roundness: 16,
  colors: {
    ...MD3DarkTheme.colors,
    primary: Colors.dark.primary,
    onPrimary: "#FFFFFF",
    primaryContainer: Colors.dark.gradientPrimary,
    onPrimaryContainer: Colors.dark.primary,
    secondary: Colors.dark.accent,
    onSecondary: "#FFFFFF",
    secondaryContainer: Colors.dark.gradientAccent,
    onSecondaryContainer: Colors.dark.accent,
    background: Colors.dark.backgroundRoot,
    onBackground: Colors.dark.text,
    surface: Colors.dark.backgroundDefault,
    onSurface: Colors.dark.text,
    surfaceVariant: Colors.dark.backgroundSecondary,
    onSurfaceVariant: Colors.dark.textSecondary,
    outline: Colors.dark.border,
    outlineVariant: "rgba(255,255,255,0.08)",
    error: Colors.dark.error,
    onError: "#FFFFFF",
    elevation: {
      level0: "transparent",
      level1: Colors.dark.backgroundDefault,
      level2: Colors.dark.backgroundSecondary,
      level3: Colors.dark.backgroundTertiary,
      level4: Colors.dark.backgroundTertiary,
      level5: Colors.dark.backgroundTertiary,
    },
  },
  fonts: configureFonts({ config: fontConfig }),
};

export const PaperLightTheme = {
  ...MD3LightTheme,
  roundness: 16,
  colors: {
    ...MD3LightTheme.colors,
    primary: Colors.light.primary,
    onPrimary: "#FFFFFF",
    primaryContainer: Colors.light.gradientPrimary,
    onPrimaryContainer: Colors.light.primary,
    secondary: Colors.light.accent,
    onSecondary: "#FFFFFF",
    secondaryContainer: Colors.light.gradientAccent,
    onSecondaryContainer: Colors.light.accent,
    background: Colors.light.backgroundRoot,
    onBackground: Colors.light.text,
    surface: Colors.light.backgroundDefault,
    onSurface: Colors.light.text,
    surfaceVariant: Colors.light.backgroundSecondary,
    onSurfaceVariant: Colors.light.textSecondary,
    outline: Colors.light.border,
    outlineVariant: "rgba(0,0,0,0.06)",
    error: Colors.light.error,
    onError: "#FFFFFF",
    elevation: {
      level0: "transparent",
      level1: Colors.light.backgroundDefault,
      level2: Colors.light.backgroundSecondary,
      level3: Colors.light.backgroundTertiary,
      level4: Colors.light.backgroundTertiary,
      level5: Colors.light.backgroundTertiary,
    },
  },
  fonts: configureFonts({ config: fontConfig }),
};
