import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Save, DollarSign, RefreshCw } from "lucide-react";

// ─── Residential add-on defaults stored in localStorage ──────────────────────

export const ADDON_DEFAULTS_KEY = "residentialAddonDefaults";

export interface ResidentialAddonConfig {
  name: string;
  defaultPrice: number;
  enabled: boolean;
}

export const ADDON_DEFAULTS: ResidentialAddonConfig[] = [
  { name: "Inside Refrigerator",   defaultPrice: 35,  enabled: true  },
  { name: "Inside Oven",           defaultPrice: 35,  enabled: true  },
  { name: "Interior Windows",      defaultPrice: 40,  enabled: true  },
  { name: "Laundry (wash & fold)", defaultPrice: 25,  enabled: true  },
  { name: "Garage Sweep",          defaultPrice: 30,  enabled: false },
  { name: "Patio / Balcony",       defaultPrice: 25,  enabled: false },
  { name: "Inside Cabinets",       defaultPrice: 45,  enabled: true  },
  { name: "Wall Spot Cleaning",    defaultPrice: 30,  enabled: false },
];

export function readAddonDefaults(): ResidentialAddonConfig[] {
  try {
    const s = localStorage.getItem(ADDON_DEFAULTS_KEY);
    return s ? JSON.parse(s) : ADDON_DEFAULTS.map(a => ({ ...a }));
  } catch { return ADDON_DEFAULTS.map(a => ({ ...a })); }
}

import {
  PageHeader,
  Card,
  CardHeader,
  Spinner,
  Toggle,
  SectionLabel,
  Button,
  Textarea,
} from "../components/ui";
import { apiRequest } from "../lib/api";

interface QuotePreferences {
  showLogo: boolean;
  showCompanyName: boolean;
  showAddress: boolean;
  showPhone: boolean;
  showEmail: boolean;
  showSignatureLine: boolean;
  showEstimatedTime: boolean;
  showPaymentOptions: boolean;
  showBookingLink: boolean;
  showTerms: boolean;
  termsText: string;
  brandColor: string;
  defaultExpirationDays: number;
  goodDescription: string;
  betterDescription: string;
  bestDescription: string;
}

const defaultPreferences: QuotePreferences = {
  showLogo: true,
  showCompanyName: true,
  showAddress: true,
  showPhone: true,
  showEmail: true,
  showSignatureLine: false,
  showEstimatedTime: false,
  showPaymentOptions: true,
  showBookingLink: false,
  showTerms: false,
  termsText: "",
  brandColor: "#2563EB",
  defaultExpirationDays: 14,
  goodDescription: "Covers all the essentials — surfaces wiped, floors vacuumed and mopped, bathrooms and kitchen cleaned. Great for regular maintenance between deeper cleans.",
  betterDescription: "Everything in Good, plus more thorough attention throughout. Includes detailed work in bathrooms and kitchen, baseboards wiped, and a top-to-bottom tidy of every room.",
  bestDescription: "Our most comprehensive clean. Everything in Better, plus inside appliances, interior windows, detailed cabinet fronts, and any add-ons you selected — nothing is missed.",
};

const BRAND_COLORS = [
  "#2563EB", "#3B82F6", "#0EA5E9", "#06B6D4", "#14B8A6", "#10B981",
  "#22C55E", "#84CC16", "#EAB308", "#F59E0B", "#F97316", "#EF4444",
  "#DC2626", "#E11D48", "#EC4899", "#D946EF", "#A855F7", "#8B5CF6",
  "#6366F1", "#4F46E5", "#1E3A5F", "#1E293B", "#374151", "#6B7280",
];

const BUSINESS_INFO_TOGGLE_KEYS: { key: keyof QuotePreferences; labelKey: string; descKey: string }[] = [
  { key: "showLogo", labelKey: "quoteSettings.fields.showLogo", descKey: "quoteSettings.fields.showLogoDesc" },
  { key: "showCompanyName", labelKey: "quoteSettings.fields.showCompanyName", descKey: "quoteSettings.fields.showCompanyNameDesc" },
  { key: "showAddress", labelKey: "quoteSettings.fields.showAddress", descKey: "quoteSettings.fields.showAddressDesc" },
  { key: "showPhone", labelKey: "quoteSettings.fields.showPhone", descKey: "quoteSettings.fields.showPhoneDesc" },
  { key: "showEmail", labelKey: "quoteSettings.fields.showEmail", descKey: "quoteSettings.fields.showEmailDesc" },
];

const QUOTE_DETAIL_TOGGLE_KEYS: { key: keyof QuotePreferences; labelKey: string; descKey: string }[] = [
  { key: "showSignatureLine", labelKey: "quoteSettings.fields.showSignature", descKey: "quoteSettings.fields.showSignatureDesc" },
  { key: "showEstimatedTime", labelKey: "quoteSettings.fields.showEstimatedTime", descKey: "quoteSettings.fields.showEstimatedTimeDesc" },
  { key: "showPaymentOptions", labelKey: "quoteSettings.fields.showPaymentOptions", descKey: "quoteSettings.fields.showPaymentOptionsDesc" },
  { key: "showBookingLink", labelKey: "quoteSettings.fields.showBookingLink", descKey: "quoteSettings.fields.showBookingLinkDesc" },
  { key: "showTerms", labelKey: "quoteSettings.fields.showTerms", descKey: "quoteSettings.fields.showTermsDesc" },
];

export default function QuotePreferencesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: serverPrefs, isLoading } = useQuery<QuotePreferences>({
    queryKey: ["/api/quote-preferences"],
  });

  const [prefs, setPrefs] = useState<QuotePreferences>(defaultPreferences);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const [addonConfigs, setAddonConfigs] = useState<ResidentialAddonConfig[]>(() => readAddonDefaults());

  const saveAddon = (idx: number, patch: Partial<ResidentialAddonConfig>) => {
    setAddonConfigs((prev) => {
      const next = prev.map((a, i) => (i === idx ? { ...a, ...patch } : a));
      localStorage.setItem(ADDON_DEFAULTS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const resetAddons = () => {
    const fresh = ADDON_DEFAULTS.map(a => ({ ...a }));
    setAddonConfigs(fresh);
    localStorage.removeItem(ADDON_DEFAULTS_KEY);
  };

  useEffect(() => {
    if (serverPrefs) {
      setPrefs({ ...defaultPreferences, ...serverPrefs });
      setHasChanges(false);
    }
  }, [serverPrefs]);

  const updatePref = (key: keyof QuotePreferences, value: any) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiRequest("PUT", "/api/quote-preferences", prefs);
      queryClient.invalidateQueries({ queryKey: ["/api/quote-preferences"] });
      setHasChanges(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch {}
    setSaving(false);
  };

  const EXPIRATION_OPTIONS = [
    { days: 7, label: t("quoteSettings.expiration.7") },
    { days: 14, label: t("quoteSettings.expiration.14") },
    { days: 30, label: t("quoteSettings.expiration.30") },
    { days: 0, label: t("quoteSettings.expiration.0") },
  ];

  const SERVICE_TIERS = [
    { key: "goodDescription" as const, labelKey: "quoteSettings.tiers.good", color: "#64748B" },
    { key: "betterDescription" as const, labelKey: "quoteSettings.tiers.better", color: "#2563EB" },
    { key: "bestDescription" as const, labelKey: "quoteSettings.tiers.best", color: "#059669" },
  ];

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 pb-24">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title={t("quoteSettings.heading")}
          subtitle={t("quoteSettings.subheading")}
        />
        {hasChanges && (
          <div className="flex-shrink-0 pt-1">
            <Button
              variant="primary"
              icon={saving ? undefined : savedFlash ? Check : Save}
              onClick={handleSave}
              disabled={saving}
              size="sm"
            >
              {saving ? t("quoteSettings.saving") : savedFlash ? t("quoteSettings.saved") : t("quoteSettings.save")}
            </Button>
          </div>
        )}
      </div>

      <div>
        <SectionLabel>{t("quoteSettings.sections.businessInfo")}</SectionLabel>
        <Card className="mt-3 divide-y divide-slate-100 p-0">
          {BUSINESS_INFO_TOGGLE_KEYS.map((toggle) => (
            <div key={toggle.key} className="flex items-center justify-between gap-4 px-4 py-3.5">
              <div>
                <p className="text-sm font-medium text-slate-900">{t(toggle.labelKey)}</p>
                <p className="text-xs text-slate-500 mt-0.5">{t(toggle.descKey)}</p>
              </div>
              <Toggle
                checked={prefs[toggle.key] as boolean}
                onChange={(v) => updatePref(toggle.key, v)}
              />
            </div>
          ))}
        </Card>
      </div>

      <div>
        <SectionLabel>{t("quoteSettings.sections.quoteDetails")}</SectionLabel>
        <Card className="mt-3 divide-y divide-slate-100 p-0">
          {QUOTE_DETAIL_TOGGLE_KEYS.map((toggle) => (
            <div key={toggle.key} className="flex items-center justify-between gap-4 px-4 py-3.5">
              <div>
                <p className="text-sm font-medium text-slate-900">{t(toggle.labelKey)}</p>
                <p className="text-xs text-slate-500 mt-0.5">{t(toggle.descKey)}</p>
              </div>
              <Toggle
                checked={prefs[toggle.key] as boolean}
                onChange={(v) => updatePref(toggle.key, v)}
              />
            </div>
          ))}
        </Card>
      </div>

      <div>
        <SectionLabel>{t("quoteSettings.sections.brandColor")}</SectionLabel>
        <Card className="mt-3 space-y-4">
          <p className="text-sm text-slate-500">
            {t("quoteSettings.sections.brandColorDesc")}
          </p>
          <div className="flex flex-wrap gap-2">
            {BRAND_COLORS.map((color) => {
              const isSelected = prefs.brandColor.toUpperCase() === color.toUpperCase();
              return (
                <button
                  key={color}
                  onClick={() => updatePref("brandColor", color)}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                  style={{
                    backgroundColor: color,
                    boxShadow: isSelected ? `0 0 0 3px white, 0 0 0 5px ${color}` : undefined,
                  }}
                >
                  {isSelected && <Check className="w-4 h-4 text-white" />}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={prefs.brandColor}
              onChange={(e) => updatePref("brandColor", e.target.value)}
              placeholder="#2563EB"
              className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 uppercase"
            />
            <div
              className="w-10 h-10 rounded-lg border border-slate-200 flex-shrink-0"
              style={{ backgroundColor: prefs.brandColor || "#2563EB" }}
            />
          </div>
        </Card>
      </div>

      <div>
        <SectionLabel>{t("quoteSettings.sections.serviceTiers")}</SectionLabel>
        <Card className="mt-3 space-y-5">
          <p className="text-sm text-slate-500">
            {t("quoteSettings.sections.serviceTiersDesc")}
          </p>
          {SERVICE_TIERS.map(({ key, labelKey, color }) => (
            <div key={key}>
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold text-white"
                  style={{ backgroundColor: color }}
                >
                  {t(labelKey)}
                </span>
              </div>
              <Textarea
                value={prefs[key]}
                onChange={(e) => updatePref(key, e.target.value)}
                placeholder={`${t(labelKey)}...`}
                rows={3}
              />
            </div>
          ))}
        </Card>
      </div>

      <div>
        <SectionLabel>{t("quoteSettings.sections.addOns")}</SectionLabel>
        <Card className="mt-3">
          <CardHeader title={t("quoteSettings.sections.addOnPrices")} icon={DollarSign} />
          <div className="px-5 pb-5 space-y-4">
            <p className="text-sm text-slate-500">
              {t("quoteSettings.sections.addOnPricesDesc")}
            </p>
            <div className="space-y-3">
              {addonConfigs.map((addon, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => saveAddon(idx, { enabled: !addon.enabled })}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                      addon.enabled
                        ? "border-primary-500 bg-primary-500"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {addon.enabled && <Check className="w-3 h-3 text-white" />}
                  </button>
                  <input
                    type="text"
                    value={addon.name}
                    maxLength={32}
                    onChange={(e) => saveAddon(idx, { name: e.target.value })}
                    className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Add-on name"
                  />
                  <div className="relative shrink-0">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                    <input
                      type="number"
                      min={0}
                      max={999}
                      step={5}
                      value={addon.defaultPrice}
                      onChange={(e) => saveAddon(idx, { defaultPrice: Math.max(0, parseInt(e.target.value) || 0) })}
                      className="w-20 pl-6 pr-2 py-1.5 text-sm text-center border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-semibold"
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={resetAddons}
                className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-primary-600 font-medium transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> {t("quoteSettings.resetAddons")}
              </button>
              <span className="text-xs text-slate-400">Stored locally per device</span>
            </div>
          </div>
        </Card>
      </div>

      <div>
        <SectionLabel>Default Terms</SectionLabel>
        <Card className="mt-3 space-y-2">
          <p className="text-sm text-slate-500">
            Custom terms and conditions text that appears on your quotes when enabled.
          </p>
          <Textarea
            value={prefs.termsText}
            onChange={(e) => updatePref("termsText", e.target.value)}
            placeholder="Enter your terms and conditions..."
            rows={5}
          />
        </Card>
      </div>

      <div>
        <SectionLabel>{t("quoteSettings.expiration.label")}</SectionLabel>
        <Card className="mt-3 space-y-3">
          <p className="text-sm text-slate-500">
            Set a default expiration period for new quotes. Expired quotes are automatically marked and shown to customers.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {EXPIRATION_OPTIONS.map(({ days, label }) => {
              const isSelected = prefs.defaultExpirationDays === days;
              return (
                <button
                  key={days}
                  onClick={() => updatePref("defaultExpirationDays", days)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                    isSelected
                      ? "border-primary-500 bg-primary-50 text-primary-700"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span>{label}</span>
                  {isSelected && <Check className="w-4 h-4 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      {hasChanges && (
        <div className="fixed bottom-6 right-6">
          <Button variant="primary" icon={saving ? undefined : Save} onClick={handleSave} disabled={saving}>
            {saving ? t("quoteSettings.saving") : t("quoteSettings.save")}
          </Button>
        </div>
      )}
    </div>
  );
}
