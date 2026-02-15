import en, { type Translations } from "./en";
import es from "./es";

export type Language = "en" | "es";

const translations: Record<Language, Translations> = { en, es };

export function getTranslations(lang: Language): Translations {
  return translations[lang] || en;
}

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: "English",
  es: "Espa\u00f1ol",
};

export type { Translations };
