import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "../locales/en.json";
import es from "../locales/es.json";
import pt from "../locales/pt.json";
import ru from "../locales/ru.json";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", nativeLabel: "English", flag: "🇺🇸" },
  { code: "es", label: "Spanish", nativeLabel: "Español", flag: "🇪🇸" },
  { code: "pt", label: "Portuguese", nativeLabel: "Português", flag: "🇧🇷" },
  { code: "ru", label: "Russian", nativeLabel: "Русский", flag: "🇷🇺" },
] as const;

export type LangCode = "en" | "es" | "pt" | "ru";

export const VALID_LANG_CODES: LangCode[] = ["en", "es", "pt", "ru"];

const LS_KEY = "qp_language";

function detectInitialLanguage(): LangCode {
  const saved = localStorage.getItem(LS_KEY) as LangCode | null;
  if (saved && VALID_LANG_CODES.includes(saved)) return saved;
  const browserLang = navigator.language.slice(0, 2) as LangCode;
  return VALID_LANG_CODES.includes(browserLang) ? browserLang : "en";
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
    pt: { translation: pt },
    ru: { translation: ru },
  },
  lng: detectInitialLanguage(),
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export function applyLanguage(lang: LangCode) {
  localStorage.setItem(LS_KEY, lang);
  i18n.changeLanguage(lang);
}

export default i18n;
