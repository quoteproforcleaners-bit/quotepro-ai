import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Zap,
  RotateCcw,
  Users,
  Star,
  Gift,
  Calendar,
  TrendingUp,
  Loader2,
} from "lucide-react";
import {
  PageHeader,
  Card,
  CardHeader,
  Spinner,
  Toggle,
  SectionLabel,
} from "../components/ui";
import { ProGate } from "../components/ProGate";
import { apiRequest } from "../lib/api";

interface AutomationSettings {
  marketingModeEnabled: boolean;
  abandonedQuoteRecovery: boolean;
  weeklyReactivation: boolean;
  reviewRequestWorkflow: boolean;
  referralAskWorkflow: boolean;
  rebookNudges: boolean;
  upsellTriggers: boolean;
  maxSendsPerDay: number;
  quietHoursStart: string;
  quietHoursEnd: string;
  maxFollowUpsPerQuote: number;
  rebookNudgeDaysMin: number;
  rebookNudgeDaysMax: number;
  deepCleanIntervalMonths: number;
}

const defaultSettings: AutomationSettings = {
  marketingModeEnabled: false,
  abandonedQuoteRecovery: true,
  weeklyReactivation: true,
  reviewRequestWorkflow: true,
  referralAskWorkflow: false,
  rebookNudges: true,
  upsellTriggers: false,
  maxSendsPerDay: 50,
  quietHoursStart: "20:00",
  quietHoursEnd: "08:00",
  maxFollowUpsPerQuote: 3,
  rebookNudgeDaysMin: 14,
  rebookNudgeDaysMax: 45,
  deepCleanIntervalMonths: 6,
};

const AUTOMATIONS: {
  key: keyof AutomationSettings;
  icon: typeof RotateCcw;
  label: string;
  description: string;
}[] = [
  { key: "abandonedQuoteRecovery", icon: RotateCcw, label: "Abandoned Quote Recovery", description: "Automatically follow up with leads whose quotes went cold — most deals close within 48 hours of a nudge." },
  { key: "weeklyReactivation", icon: Users, label: "Win-Back Campaigns", description: "Send a personalized message to customers who haven't booked in 60+ days to bring them back." },
  { key: "reviewRequestWorkflow", icon: Star, label: "Review Request Workflow", description: "Request a Google review 24 hours after every completed job while the experience is still fresh." },
  { key: "referralAskWorkflow", icon: Gift, label: "Referral Ask Workflow", description: "Automatically ask satisfied customers to refer a friend — your best source of high-quality leads." },
  { key: "rebookNudges", icon: Calendar, label: "Rebook Nudges", description: "Remind customers to schedule their next cleaning when their usual interval approaches." },
  { key: "upsellTriggers", icon: TrendingUp, label: "Upsell Triggers", description: "Suggest add-on services (deep clean, inside fridge, etc.) to customers most likely to upgrade." },
];

function AutomationsContent() {
  const queryClient = useQueryClient();
  const { data: serverSettings, isLoading } = useQuery<AutomationSettings>({
    queryKey: ["/api/growth-automation-settings"],
  });

  const [settings, setSettings] = useState<AutomationSettings>(defaultSettings);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (serverSettings) setSettings({ ...defaultSettings, ...serverSettings });
  }, [serverSettings]);

  const updateSetting = async (key: keyof AutomationSettings, value: any) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    setSaving(key);
    try {
      await apiRequest("PUT", "/api/growth-automation-settings", { ...(serverSettings || {}), ...updated });
      queryClient.invalidateQueries({ queryKey: ["/api/growth-automation-settings"] });
    } catch {
      setSettings(settings);
    } finally {
      setSaving(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">Growth Autopilot</p>
              <p className="text-sm text-slate-500 mt-0.5">
                When enabled, QuotePro runs your follow-ups, win-backs, review requests, and rebooking nudges automatically.
              </p>
            </div>
          </div>
          <div className="flex-shrink-0">
            {saving === "marketingModeEnabled" ? (
              <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />
            ) : (
              <Toggle
                checked={settings.marketingModeEnabled}
                onChange={(v) => updateSetting("marketingModeEnabled", v)}
              />
            )}
          </div>
        </div>
      </Card>

      <div>
        <SectionLabel>Automations</SectionLabel>
        <div className="mt-3 space-y-2">
          {AUTOMATIONS.map((auto) => {
            const Icon = auto.icon;
            const isEnabled = settings[auto.key] as boolean;
            return (
              <Card key={auto.key}>
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4.5 h-4.5 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 text-sm">{auto.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{auto.description}</p>
                  </div>
                  <div className="flex-shrink-0">
                    {saving === auto.key ? (
                      <Loader2 className="w-4 h-4 text-primary-500 animate-spin" />
                    ) : (
                      <Toggle
                        checked={isEnabled}
                        onChange={(v) => updateSetting(auto.key, v)}
                      />
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <Card>
        <CardHeader title="Delivery Settings" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Max Sends Per Day</label>
            <input
              type="number"
              value={settings.maxSendsPerDay}
              onChange={(e) => updateSetting("maxSendsPerDay", parseInt(e.target.value) || 50)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Max Follow-ups Per Quote</label>
            <input
              type="number"
              value={settings.maxFollowUpsPerQuote}
              onChange={(e) => updateSetting("maxFollowUpsPerQuote", parseInt(e.target.value) || 3)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Quiet Hours Start</label>
            <input
              type="time"
              value={settings.quietHoursStart}
              onChange={(e) => updateSetting("quietHoursStart", e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Quiet Hours End</label>
            <input
              type="time"
              value={settings.quietHoursEnd}
              onChange={(e) => updateSetting("quietHoursEnd", e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Rebook Nudge Min Days</label>
            <input
              type="number"
              value={settings.rebookNudgeDaysMin}
              onChange={(e) => updateSetting("rebookNudgeDaysMin", parseInt(e.target.value) || 14)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Rebook Nudge Max Days</label>
            <input
              type="number"
              value={settings.rebookNudgeDaysMax}
              onChange={(e) => updateSetting("rebookNudgeDaysMax", parseInt(e.target.value) || 45)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function AutomationsHubPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Automations Hub"
        subtitle="Configure your growth automation engine"
      />
      <ProGate feature="Automations">
        <AutomationsContent />
      </ProGate>
    </div>
  );
}
