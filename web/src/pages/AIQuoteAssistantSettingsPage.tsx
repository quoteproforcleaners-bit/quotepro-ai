import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowLeft, Cpu, Save } from "lucide-react";
import { apiPost } from "../lib/api";

const PURPLE = "#7C3AED";
const TONES = ["professional", "friendly", "concise"];

function ToggleRow({ label, description, value, onChange }: { label: string; description?: string; value: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
      <div>
        <p className="font-medium text-gray-900">{label}</p>
        {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={onChange}
        className={`relative w-11 h-6 rounded-full transition-colors ${value ? "bg-purple-600" : "bg-gray-200"}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? "translate-x-5" : ""}`} />
      </button>
    </div>
  );
}

export default function AIQuoteAssistantSettingsPage() {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data: serverSettings, isLoading } = useQuery<any>({ queryKey: ["/api/ai-assistant/settings"] });

  const [settings, setSettings] = useState<any>({
    enabled: false,
    autoReplyEnabled: true,
    businessTone: "professional",
    responseHoursOnly: false,
    requireHandoffOnDiscount: true,
    requireHandoffOnAngry: true,
    requireHandoffOnCommercial: true,
    requireHandoffOnLowConfidence: true,
    lowConfidenceThreshold: 70,
    allowFaqAutoAnswers: true,
    allowIntakeAutomation: true,
    autoCreateQuoteDraft: true,
    autoSendQuote: false,
  });

  useEffect(() => {
    if (serverSettings) setSettings((p: any) => ({ ...p, ...serverSettings }));
  }, [serverSettings]);

  const toggle = (key: string) => setSettings((p: any) => ({ ...p, [key]: !p[key] }));

  async function save() {
    setSaving(true);
    try {
      await apiPost("/api/ai-assistant/settings", settings);
      queryClient.invalidateQueries({ queryKey: ["/api/ai-assistant/settings"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/ai-quote-assistant" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <Cpu size={20} color={PURPLE} />
            <h1 className="text-xl font-bold text-gray-900">AI Assistant Settings</h1>
          </div>
          <p className="text-sm text-gray-500">Let AI handle common quote and FAQ conversations, then bring you in when a customer needs a human touch.</p>
        </div>
      </div>

      {/* General */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        <h2 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">General</h2>
        <ToggleRow label="Enable AI Quote Assistant" description="Turn on AI-powered automatic replies" value={settings.enabled} onChange={() => toggle("enabled")} />
        <ToggleRow label="Auto Reply" description="AI will automatically respond to inbound messages" value={settings.autoReplyEnabled} onChange={() => toggle("autoReplyEnabled")} />
      </div>

      {/* Tone */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        <h2 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">Tone</h2>
        {TONES.map((tone) => (
          <button
            key={tone}
            onClick={() => setSettings((p: any) => ({ ...p, businessTone: tone }))}
            className="w-full flex items-center justify-between py-3 border-b border-gray-100 last:border-0 text-left"
          >
            <span className="font-medium text-gray-800 capitalize">{tone}</span>
            {settings.businessTone === tone && <span className="w-4 h-4 rounded-full" style={{ backgroundColor: PURPLE }} />}
          </button>
        ))}
      </div>

      {/* Automation */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        <h2 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">Automation</h2>
        <ToggleRow label="FAQ Auto-Answers" description="Let AI answer common questions automatically" value={settings.allowFaqAutoAnswers} onChange={() => toggle("allowFaqAutoAnswers")} />
        <ToggleRow label="Quote Intake Automation" description="AI collects quote details through conversation" value={settings.allowIntakeAutomation} onChange={() => toggle("allowIntakeAutomation")} />
        <ToggleRow label="Auto-Create Quote Draft" description="When intake is complete, create a draft quote" value={settings.autoCreateQuoteDraft} onChange={() => toggle("autoCreateQuoteDraft")} />
        <ToggleRow label="Auto-Send Quote" description="Automatically send quote without owner review (not recommended for beta)" value={settings.autoSendQuote} onChange={() => toggle("autoSendQuote")} />
      </div>

      {/* Escalation */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <h2 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">Escalation Rules</h2>
        <ToggleRow label="Hand Off on Discount Request" value={settings.requireHandoffOnDiscount} onChange={() => toggle("requireHandoffOnDiscount")} />
        <ToggleRow label="Hand Off on Upset Customer" value={settings.requireHandoffOnAngry} onChange={() => toggle("requireHandoffOnAngry")} />
        <ToggleRow label="Hand Off on Commercial Request" value={settings.requireHandoffOnCommercial} onChange={() => toggle("requireHandoffOnCommercial")} />
        <ToggleRow label={`Hand Off on Low Confidence (${settings.lowConfidenceThreshold}%)`} value={settings.requireHandoffOnLowConfidence} onChange={() => toggle("requireHandoffOnLowConfidence")} />
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold transition-opacity"
        style={{ backgroundColor: PURPLE, opacity: saving ? 0.7 : 1 }}
      >
        <Save size={18} />
        {saved ? "Saved!" : saving ? "Saving..." : "Save Settings"}
      </button>
    </div>
  );
}
