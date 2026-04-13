import i18n from "./i18n";

export const LOCALE_MAP: Record<string, string> = {
  en: "en-US",
  es: "es-MX",
  pt: "pt-BR",
  ru: "ru-RU",
};

export function getLocale(): string {
  return LOCALE_MAP[i18n.language] || "en-US";
}

export function fmtDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  return new Date(date).toLocaleDateString(getLocale(), options);
}

export function fmtTime(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  return new Date(date).toLocaleTimeString(getLocale(), options ?? { hour: "numeric", minute: "2-digit" });
}
