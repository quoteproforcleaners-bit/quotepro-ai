import { useEffect, useState, useCallback } from "react";
import { useColorScheme as useRNColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

type DarkModePreference = "system" | "light" | "dark" | "auto";
const STORAGE_KEY = "darkModeSchedule";

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const colorScheme = useRNColorScheme();

  if (hasHydrated) {
    return colorScheme;
  }

  return "light";
}

/**
 * Web stub for dark mode preference — persists choice to AsyncStorage
 */
export function useDarkModePreference() {
  const [preference, setPreferenceState] = useState<DarkModePreference>("system");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (value === "system" || value === "light" || value === "dark" || value === "auto") {
        setPreferenceState(value);
      }
    });
  }, []);

  const setPreference = useCallback(async (value: DarkModePreference) => {
    setPreferenceState(value);
    await AsyncStorage.setItem(STORAGE_KEY, value);
  }, []);

  return { preference, setPreference };
}
