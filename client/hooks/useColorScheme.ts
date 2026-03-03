import { useColorScheme as useSystemColorScheme } from "react-native";
import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type DarkModePreference = "system" | "light" | "dark" | "auto";

const STORAGE_KEY = "darkModeSchedule";

function isEveningHours(): boolean {
  const hour = new Date().getHours();
  return hour >= 19 || hour < 6;
}

type Listener = (pref: DarkModePreference) => void;
const listeners = new Set<Listener>();
let cachedPreference: DarkModePreference | null = null;

AsyncStorage.getItem(STORAGE_KEY).then((value) => {
  if (value === "system" || value === "light" || value === "dark" || value === "auto") {
    cachedPreference = value;
    listeners.forEach((l) => l(value));
  }
});

function notifyListeners(pref: DarkModePreference) {
  cachedPreference = pref;
  listeners.forEach((l) => l(pref));
}

export function useColorScheme() {
  const systemScheme = useSystemColorScheme();
  const [preference, setPreference] = useState<DarkModePreference>(cachedPreference ?? "system");
  const [timeBasedDark, setTimeBasedDark] = useState(isEveningHours());

  useEffect(() => {
    const listener: Listener = (pref) => setPreference(pref);
    listeners.add(listener);
    if (cachedPreference && cachedPreference !== preference) {
      setPreference(cachedPreference);
    }
    return () => { listeners.delete(listener); };
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
  const [preference, setPreferenceState] = useState<DarkModePreference>(cachedPreference ?? "system");

  useEffect(() => {
    const listener: Listener = (pref) => setPreferenceState(pref);
    listeners.add(listener);
    if (cachedPreference && cachedPreference !== preference) {
      setPreferenceState(cachedPreference);
    }
    return () => { listeners.delete(listener); };
  }, []);

  const setPreference = useCallback(async (value: DarkModePreference) => {
    setPreferenceState(value);
    await AsyncStorage.setItem(STORAGE_KEY, value);
    notifyListeners(value);
  }, []);

  return { preference, setPreference };
}
