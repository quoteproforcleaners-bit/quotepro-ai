import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./auth";
import { apiRequest } from "./api";
import { applyLanguage, type LangCode } from "./i18n";

export function useLanguage() {
  const { t } = useTranslation();
  const { business, refresh } = useAuth();
  const queryClient = useQueryClient();

  const appLanguage: LangCode = (business?.appLanguage as LangCode) || "en";
  const outboundLanguage: LangCode = (business?.commLanguage as LangCode) || "en";

  const setAppLanguage = useCallback(
    async (lang: LangCode) => {
      applyLanguage(lang);
      apiRequest("PUT", "/api/settings/language", {
        appLanguage: lang,
        commLanguage: outboundLanguage,
      }).then(() => {
        refresh();
        queryClient.invalidateQueries({ queryKey: ["/api/business"] });
      }).catch(() => {});
    },
    [outboundLanguage, queryClient, refresh]
  );

  const setOutboundLanguage = useCallback(
    async (lang: LangCode) => {
      apiRequest("PUT", "/api/settings/language", {
        appLanguage: appLanguage,
        commLanguage: lang,
      }).then(() => {
        refresh();
        queryClient.invalidateQueries({ queryKey: ["/api/business"] });
      }).catch(() => {});
    },
    [appLanguage, queryClient, refresh]
  );

  return {
    t,
    appLanguage,
    outboundLanguage,
    setAppLanguage,
    setOutboundLanguage,
  };
}
