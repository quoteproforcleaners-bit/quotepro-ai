import { useColorScheme as useSystemColorScheme } from "react-native";
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type DarkModePreference = "system" | "light" | "dark" | "auto";

const STORAGE_KEY = "darkModeSchedule";

function isEveningHours(): boolean {
  const hour = new Date().getHours();
  return hour >= 19 || hour < 6;
}

export function useColorScheme() {
  const systemScheme = useSystemColorScheme();
  const [preference, setPreference] = useState<DarkModePreference>("light");
  const [timeBasedDark, setTimeBasedDark] = useState(isEveningHours());

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (value === "system" || value === "light" || value === "dark" || value === "auto") {
        setPreference(value);
      }
    });
  }, []);

  useEffect(() => {
    if (preference !== "auto") return;

    setTimeBasedDark(isEveningHours());
    const interval = setInterval(() => {
      setTimeBasedDark(isEveningHours());
    }, 60000);

    return () => clearInterval(interval);
  }, [preference]);

  if (preference === "light") return "light";
  if (preference === "dark") return "dark";
  if (preference === "auto") return timeBasedDark ? "dark" : "light";
  return systemScheme ?? "light";
}

export function useDarkModePreference() {
  const [preference, setPreferenceState] = useState<DarkModePreference>("light");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (value === "system" || value === "light" || value === "dark" || value === "auto") {
        setPreferenceState(value);
      }
    });
  }, []);

  const setPreference = async (value: DarkModePreference) => {
    setPreferenceState(value);
    await AsyncStorage.setItem(STORAGE_KEY, value);
  };

  return { preference, setPreference };
}
