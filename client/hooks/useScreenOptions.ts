import { Platform } from "react-native";
import { NativeStackNavigationOptions } from "@react-navigation/native-stack";

import { useTheme } from "@/hooks/useTheme";

interface UseScreenOptionsParams {
  transparent?: boolean;
}

export function useScreenOptions({
  transparent = true,
}: UseScreenOptionsParams = {}): NativeStackNavigationOptions {
  const { theme, isDark } = useTheme();

  return {
    headerTitleAlign: "center",
    headerTransparent: transparent,
    ...(Platform.OS === "ios" ? { headerBlurEffect: isDark ? "dark" : "light" } : {}),
    headerTintColor: theme.text,
    headerStyle: {
      backgroundColor: Platform.select({
        ios: transparent ? undefined : theme.backgroundRoot,
        android: theme.backgroundRoot,
        web: theme.backgroundRoot,
      }),
    },
    gestureEnabled: true,
    gestureDirection: "horizontal",
    fullScreenGestureEnabled: true,
    animation: "slide_from_right",
    animationDuration: 300,
    contentStyle: {
      backgroundColor: theme.backgroundRoot,
    },
  };
}
