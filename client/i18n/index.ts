import en, { type Translations } from "./en";
import es from "./es";
import pt from "./pt";
import ru from "./ru";

export type Language = "en" | "es" | "pt" | "ru";

const translations: Record<Language, Translations> = { en, es, pt, ru };

export function getTranslations(lang: Language): Translations {
  return translations[lang] || en;
}

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: "English",
  es: "Español",
  pt: "Português",
  ru: "Русский",
};

export type { Translations };
