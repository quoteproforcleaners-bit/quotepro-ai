import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Save } from "lucide-react";
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

const BUSINESS_INFO_TOGGLES: { key: keyof QuotePreferences; label: string; description: string }[] = [
  { key: "showLogo", label: "Show Logo", description: "Display your business logo on the quote" },
  { key: "showCompanyName", label: "Show Company Name", description: "Display your company name at the top" },
  { key: "showAddress", label: "Show Company Address", description: "Include your business address on the quote" },
  { key: "showPhone", label: "Show Phone Number", description: "Display your phone number for customer contact" },
  { key: "showEmail", label: "Show Email", description: "Include your email address on the quote" },
];

const QUOTE_DETAIL_TOGGLES: { key: keyof QuotePreferences; label: string; description: string }[] = [
  { key: "showSignatureLine", label: "Show Signature Line", description: "Add a line for the customer to sign" },
  { key: "showEstimatedTime", label: "Show Estimated Time", description: "Display estimated time to complete the job" },
  { key: "showPaymentOptions", label: "Show Payment Options", description: "List accepted payment methods on the quote" },
  { key: "showBookingLink", label: "Show Booking Link", description: "Include a link for customers to book directly" },
  { key: "showTerms", label: "Show Terms & Conditions", description: "Display your terms and conditions text" },
];

const EXPIRATION_OPTIONS = [
  { days: 7, label: "7 days" },
  { days: 14, label: "14 days" },
  { days: 30, label: "30 days" },
  { days: 0, label: "No expiration" },
];

export default function QuotePreferencesPage() {
  const queryClient = useQueryClient();

  const { data: serverPrefs, isLoading } = useQuery<QuotePreferences>({
    queryKey: ["/api/quote-preferences"],
  });

  const [prefs, setPrefs] = useState<QuotePreferences>(defaultPreferences);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

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
          title="Quote Preferences"
          subtitle="Customize what appears on your customer-facing quotes"
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
              {saving ? "Saving..." : savedFlash ? "Saved!" : "Save Changes"}
            </Button>
          </div>
        )}
      </div>

      <div>
        <SectionLabel>Business Info on Quote</SectionLabel>
        <Card className="mt-3 divide-y divide-slate-100 p-0">
          {BUSINESS_INFO_TOGGLES.map((toggle) => (
            <div key={toggle.key} className="flex items-center justify-between gap-4 px-4 py-3.5">
              <div>
                <p className="text-sm font-medium text-slate-900">{toggle.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{toggle.description}</p>
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
        <SectionLabel>Quote Details</SectionLabel>
        <Card className="mt-3 divide-y divide-slate-100 p-0">
          {QUOTE_DETAIL_TOGGLES.map((toggle) => (
            <div key={toggle.key} className="flex items-center justify-between gap-4 px-4 py-3.5">
              <div>
                <p className="text-sm font-medium text-slate-900">{toggle.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{toggle.description}</p>
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
        <SectionLabel>Brand Color</SectionLabel>
        <Card className="mt-3 space-y-4">
          <p className="text-sm text-slate-500">
            Set a brand color that appears on your customer-facing quotes.
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
        <SectionLabel>Service Tier Descriptions</SectionLabel>
        <Card className="mt-3 space-y-5">
          <p className="text-sm text-slate-500">
            These descriptions appear on your customer-facing quote page under each option. Use 1–3 sentences to explain what's included so customers can choose with confidence.
          </p>
          {(
            [
              { key: "goodDescription" as const, label: "Good", color: "#64748B" },
              { key: "betterDescription" as const, label: "Better", color: "#2563EB" },
              { key: "bestDescription" as const, label: "Best", color: "#059669" },
            ]
          ).map(({ key, label, color }) => (
            <div key={key}>
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold text-white"
                  style={{ backgroundColor: color }}
                >
                  {label}
                </span>
              </div>
              <Textarea
                value={prefs[key]}
                onChange={(e) => updatePref(key, e.target.value)}
                placeholder={`Describe what's included in the ${label} option...`}
                rows={3}
              />
            </div>
          ))}
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
        <SectionLabel>Quote Expiration</SectionLabel>
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
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      )}
    </div>
  );
}
