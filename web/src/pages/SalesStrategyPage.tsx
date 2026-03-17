import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase,
  Smile,
  Award,
  Zap,
  MessageCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
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

type ProfileKey = "professional" | "friendly" | "premium" | "urgent";

interface StrategyData {
  selectedProfile: ProfileKey;
  escalationEnabled: boolean;
}

const PROFILES: {
  key: ProfileKey;
  icon: typeof Briefcase;
  color: string;
  label: string;
  description: string;
  preview: string;
}[] = [
  {
    key: "professional",
    icon: Briefcase,
    color: "#007AFF",
    label: "Professional",
    description: "Formal, polished communications that build trust",
    preview: "Hi Sarah, following up on the cleaning quote I sent over. I'd love to schedule a time that works for you — let me know if you have any questions.",
  },
  {
    key: "friendly",
    icon: Smile,
    color: "#2F7BFF",
    label: "Friendly",
    description: "Warm and approachable, like talking to a neighbor",
    preview: "Hey Sarah! Just checking in on that cleaning quote — would love to get your home sparkling! Let me know if you want to chat.",
  },
  {
    key: "premium",
    icon: Award,
    color: "#8B5CF6",
    label: "Premium",
    description: "Elevated and exclusive, for high-value clients",
    preview: "Sarah, I wanted to personally follow up on your cleaning proposal. Our team specializes in white-glove service and I'm confident we'll exceed your expectations.",
  },
  {
    key: "urgent",
    icon: Zap,
    color: "#F59E0B",
    label: "Urgent",
    description: "Creates urgency with time-sensitive messaging",
    preview: "Sarah — our schedule is filling up fast! I have a spot available this week that would be perfect for your home. Want to lock it in?",
  },
];

const ESCALATION_STAGES = [
  { label: "Soft Touch", tone: "Gentle", example: "Just a friendly reminder about your cleaning quote — happy to answer any questions!", color: "#2F7BFF" },
  { label: "Value Add", tone: "Helpful", example: "Still interested? We just wrapped up a home nearby and the results were amazing. Here's what's included in your quote...", color: "#2467DE" },
  { label: "Urgency", tone: "Time-Sensitive", example: "Our availability this month is almost gone. I'd hate for you to miss out — can we confirm your spot?", color: "#F59E0B" },
  { label: "Final Notice", tone: "Direct", example: "This will be my last follow-up. Your quote expires soon — let me know if you'd like to move forward.", color: "#EF4444" },
];

function SalesStrategyContent() {
  const queryClient = useQueryClient();
  const { data: serverStrategy, isLoading } = useQuery<StrategyData>({
    queryKey: ["/api/sales-strategy"],
  });

  const [selectedProfile, setSelectedProfile] = useState<ProfileKey>("professional");
  const [escalationEnabled, setEscalationEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (serverStrategy) {
      setSelectedProfile(serverStrategy.selectedProfile ?? "professional");
      setEscalationEnabled(serverStrategy.escalationEnabled ?? false);
    }
  }, [serverStrategy]);

  const saveStrategy = async (profile: ProfileKey, escalation: boolean) => {
    setSaving(true);
    try {
      await apiRequest("PUT", "/api/sales-strategy", {
        selectedProfile: profile,
        escalationEnabled: escalation,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-strategy"] });
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const handleSelectProfile = (key: ProfileKey) => {
    setSelectedProfile(key);
    saveStrategy(key, escalationEnabled);
  };

  const handleToggleEscalation = (val: boolean) => {
    setEscalationEnabled(val);
    saveStrategy(selectedProfile, val);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  const activeMeta = PROFILES.find((p) => p.key === selectedProfile) ?? PROFILES[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <div>
          <SectionLabel>Sales Profile</SectionLabel>
          <p className="text-sm text-slate-500 mt-1 mb-3">
            Choose the communication style that best represents your brand.
          </p>
          <div className="space-y-2">
            {PROFILES.map((profile) => {
              const Icon = profile.icon;
              const isSelected = selectedProfile === profile.key;
              return (
                <button
                  key={profile.key}
                  onClick={() => handleSelectProfile(profile.key)}
                  className={`w-full flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-colors ${
                    isSelected
                      ? "border-current bg-opacity-5"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                  style={isSelected ? { borderColor: profile.color, backgroundColor: profile.color + "08" } : undefined}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: profile.color + "18" }}
                  >
                    <Icon className="w-5 h-5" style={{ color: profile.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 text-sm">{profile.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{profile.description}</p>
                    {isSelected && (
                      <div
                        className="mt-2 p-2 rounded-lg text-xs italic"
                        style={{ backgroundColor: profile.color + "0A", color: "#475569" }}
                      >
                        "{profile.preview}"
                      </div>
                    )}
                  </div>
                  <div
                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ borderColor: isSelected ? profile.color : "#CBD5E1" }}
                  >
                    {isSelected && (
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: profile.color }}
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <Card>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <p className="font-medium text-slate-900 text-sm">Auto-Escalation Engine</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatically escalate follow-up intensity when quotes go unanswered
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {saving && <Loader2 className="w-4 h-4 text-primary-500 animate-spin" />}
              <Toggle checked={escalationEnabled} onChange={handleToggleEscalation} />
            </div>
          </div>

          {escalationEnabled && (
            <div className="mt-4 space-y-0 border-t border-slate-100 pt-4">
              {ESCALATION_STAGES.map((stage, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                      style={{ backgroundColor: stage.color }}
                    />
                    {idx < ESCALATION_STAGES.length - 1 && (
                      <div className="w-0.5 flex-1 mt-1" style={{ backgroundColor: "#E2E8F0" }} />
                    )}
                  </div>
                  <div
                    className="flex-1 pb-4 pl-3 border-l-2 mb-2"
                    style={{ borderColor: stage.color }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-slate-900">
                        Stage {idx + 1}: {stage.label}
                      </span>
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: stage.color + "18", color: stage.color }}
                      >
                        {stage.tone}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 italic">"{stage.example}"</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div>
        <Card>
          <CardHeader title="Message Preview" icon={MessageCircle} />
          <div
            className="rounded-xl p-4 mb-4"
            style={{ backgroundColor: activeMeta.color + "0A", borderColor: activeMeta.color + "30", border: "1px solid" }}
          >
            <p className="text-sm text-slate-700 italic">"{activeMeta.preview}"</p>
          </div>
          <div className="flex items-center justify-between">
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
              style={{ backgroundColor: activeMeta.color + "18", color: activeMeta.color }}
            >
              <activeMeta.icon className="w-3.5 h-3.5" />
              {activeMeta.label}
            </div>
            <p className="text-xs text-slate-400">
              {escalationEnabled ? "Escalation: On" : "Escalation: Off"}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function SalesStrategyPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Sales Strategy"
        subtitle="Configure your AI-powered sales communication style"
      />
      <ProGate feature="Sales Strategy">
        <SalesStrategyContent />
      </ProGate>
    </div>
  );
}
