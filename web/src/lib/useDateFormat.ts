import { useTranslation } from "react-i18next";

const LOCALE_MAP: Record<string, string> = {
  en: "en-US",
  es: "es-MX",
  pt: "pt-BR",
  ru: "ru-RU",
};

export function useDateFormat() {
  const { i18n } = useTranslation();
  const locale = LOCALE_MAP[i18n.language] || "en-US";

  const formatDate = (date: Date | string, options?: Intl.DateTimeFormatOptions) => {
    return new Date(date).toLocaleDateString(locale, options);
  };

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString(locale, {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatDateLong = (date: Date | string) => {
    return new Date(date).toLocaleDateString(locale, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateShort = (date: Date | string) => {
    return new Date(date).toLocaleDateString(locale);
  };

  return { formatDate, formatTime, formatDateLong, formatDateShort, locale };
}
