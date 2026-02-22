import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getTranslations, type Language, type Translations } from "@/i18n";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  communicationLanguage: Language;
  setCommunicationLanguage: (lang: Language) => Promise<void>;
  t: Translations;
  tc: Translations;
}

const STORAGE_KEY = "@quotepro_language";
const COMM_STORAGE_KEY = "@quotepro_comm_language";

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLang] = useState<Language>("en");
  const [communicationLang, setCommLang] = useState<Language>("en");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(COMM_STORAGE_KEY),
    ]).then(([stored, commStored]) => {
      if (stored === "en" || stored === "es" || stored === "pt" || stored === "ru") {
        setLang(stored);
      }
      if (commStored === "en" || commStored === "es" || commStored === "pt" || commStored === "ru") {
        setCommLang(commStored);
      } else if (stored === "en" || stored === "es" || stored === "pt" || stored === "ru") {
        setCommLang(stored);
      }
      setIsLoaded(true);
    }).catch(() => setIsLoaded(true));
  }, []);

  const setLanguage = useCallback(async (lang: Language) => {
    setLang(lang);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, lang);
    } catch {}
  }, []);

  const setCommunicationLanguage = useCallback(async (lang: Language) => {
    setCommLang(lang);
    try {
      await AsyncStorage.setItem(COMM_STORAGE_KEY, lang);
    } catch {}
  }, []);

  const t = getTranslations(language);
  const tc = getTranslations(communicationLang);

  if (!isLoaded) return null;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, communicationLanguage: communicationLang, setCommunicationLanguage, t, tc }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
