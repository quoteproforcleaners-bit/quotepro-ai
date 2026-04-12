import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Globe, CheckCircle } from "lucide-react";
import { SUPPORTED_LANGUAGES, applyLanguage, type LangCode } from "../lib/i18n";
import { apiPut } from "../lib/api";
import { useAuth } from "../lib/auth";

export default function LanguagePickerModal() {
  const { t, i18n } = useTranslation();
  const { business, refresh } = useAuth();
  const [selected, setSelected] = useState<LangCode>(
    (business?.appLanguage as LangCode) || (i18n.language as LangCode) || "en"
  );
  const [saving, setSaving] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const showModal =
    !dismissed &&
    !!business &&
    business.onboardingComplete === true &&
    !business.languageSelected;

  if (!showModal) return null;

  const handleContinue = async () => {
    setSaving(true);
    applyLanguage(selected);
    try {
      await apiPut("/api/settings/language", {
        appLanguage: selected,
        commLanguage: selected,
        languageSelected: true,
      });
      await refresh();
    } catch {
    } finally {
      setSaving(false);
      setDismissed(true);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center mb-4">
            <Globe className="w-7 h-7 text-primary-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">{t("onboarding.welcome")}</h2>
          <p className="text-slate-500 text-base">{t("onboarding.subtitle")}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setSelected(lang.code)}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all text-left ${
                selected === lang.code
                  ? "border-primary-500 bg-primary-50"
                  : "border-slate-200 bg-white hover:border-primary-200 hover:bg-slate-50"
              }`}
            >
              <span className="text-2xl leading-none">{lang.flag}</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-900 text-sm leading-tight">{lang.nativeLabel}</div>
                <div className="text-xs text-slate-500 leading-tight">{lang.label}</div>
              </div>
              {selected === lang.code && (
                <CheckCircle className="w-4 h-4 text-primary-600 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>

        <p className="text-xs text-slate-400 text-center mb-6">{t("onboarding.hint")}</p>

        <button
          onClick={handleContinue}
          disabled={saving}
          className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-60"
        >
          {saving ? "..." : t("onboarding.continue")}
        </button>
      </div>
    </div>
  );
}
