import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase,
  DollarSign,
  FileText,
  Send,
  Zap,
  Repeat,
  Bell,
  Calendar,
  PlayCircle,
  Star,
  TrendingUp,
  Check,
  ArrowRight,
  Clipboard,
  Info,
} from "lucide-react";
import { PageHeader, Card, ProgressBar, Button } from "../components/ui";
import { useSubscription } from "../lib/subscription";

const STORAGE_KEY = "quotepro_setup_checklist";

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  icon: typeof Briefcase;
  route: string;
  category: "essentials" | "features" | "growth";
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: "business_profile",
    title: "Complete your business profile",
    description: "Add your company name, logo, and service area so quotes look professional.",
    icon: Briefcase,
    route: "/settings",
    category: "essentials",
  },
  {
    id: "pricing",
    title: "Set your pricing",
    description: "Configure base rates, add-on prices, and frequency discounts for your market.",
    icon: DollarSign,
    route: "/settings",
    category: "essentials",
  },
  {
    id: "first_quote",
    title: "Create your first real quote",
    description: "Enter a real customer's info and generate a professional 3-tier quote.",
    icon: FileText,
    route: "/quotes/new",
    category: "essentials",
  },
  {
    id: "send_quote",
    title: "Send a quote to a customer",
    description: "Text or email a quote directly from the app to see how customers receive it.",
    icon: Send,
    route: "/quotes",
    category: "essentials",
  },
  {
    id: "ai_draft",
    title: "Try AI-generated messages",
    description: "Open a saved quote and generate an AI follow-up message for a customer.",
    icon: Zap,
    route: "/quotes",
    category: "features",
  },
  {
    id: "followup_queue",
    title: "Check your Follow-Up Queue",
    description: "See which customers need a follow-up and take action with one click.",
    icon: Repeat,
    route: "/follow-ups",
    category: "features",
  },
  {
    id: "notifications",
    title: "Enable daily notifications",
    description: "Get a morning reminder of who needs follow-up so no job slips through the cracks.",
    icon: Bell,
    route: "/settings",
    category: "growth",
  },
  {
    id: "calendar",
    title: "Connect Google Calendar",
    description: "Sync accepted quotes to your calendar so jobs are automatically scheduled.",
    icon: Calendar,
    route: "/settings",
    category: "growth",
  },
];

const CATEGORY_LABELS: Record<"essentials" | "features" | "growth", { title: string; icon: typeof PlayCircle }> = {
  essentials: { title: "Getting Started", icon: PlayCircle },
  features: { title: "Explore Pro Features", icon: Star },
  growth: { title: "Set Up for Growth", icon: TrendingUp },
};

export default function ProSetupChecklistPage() {
  const navigate = useNavigate();
  const { tier: subscriptionStatus } = useSubscription();
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setCompletedItems(new Set(parsed));
      }
    } catch {}
  }, []);

  const completedCount = completedItems.size;
  const totalCount = CHECKLIST_ITEMS.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  const toggleItem = (id: string) => {
    setCompletedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch {}
      return next;
    });
  };

  const statusMessage =
    subscriptionStatus === "trial"
      ? "Complete setup to get the most out of your trial"
      : subscriptionStatus === "active"
      ? "Pro subscription active"
      : "Complete setup to get the most out of QuotePro";

  const renderCategory = (category: "essentials" | "features" | "growth") => {
    const items = CHECKLIST_ITEMS.filter((i) => i.category === category);
    const catLabel = CATEGORY_LABELS[category];
    const CatIcon = catLabel.icon;
    const allDone = items.every((i) => completedItems.has(i.id));

    return (
      <div key={category} className="space-y-2">
        <div className="flex items-center gap-2 mb-3">
          <CatIcon className={`w-4 h-4 ${allDone ? "text-emerald-500" : "text-primary-600"}`} />
          <h3 className="text-sm font-bold text-slate-900 flex-1">{catLabel.title}</h3>
          {allDone && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
              <Check className="w-3 h-3" />
              Done
            </span>
          )}
        </div>
        {items.map((item) => {
          const done = completedItems.has(item.id);
          const ItemIcon = item.icon;
          return (
            <div
              key={item.id}
              className={`flex items-center gap-3 p-4 rounded-xl border transition-colors ${
                done ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200 bg-white"
              }`}
            >
              <button
                onClick={() => toggleItem(item.id)}
                className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  done ? "bg-emerald-500 border-emerald-500" : "border-slate-300 hover:border-primary-400"
                }`}
              >
                {done && <Check className="w-3.5 h-3.5 text-white" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${done ? "line-through text-slate-400" : "text-slate-900"}`}>
                  {item.title}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
              </div>
              <button
                onClick={() => navigate(item.route)}
                className="w-9 h-9 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0 hover:bg-primary-100 transition-colors"
              >
                <ArrowRight className="w-4 h-4 text-primary-600" />
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <PageHeader title="Pro Setup Guide" subtitle="Complete these steps to get the most from QuotePro" />

      <div className="flex flex-col items-center text-center p-6 rounded-2xl border border-primary-100 bg-primary-50/60 space-y-4">
        <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center">
          <Clipboard className="w-7 h-7 text-primary-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Setup Checklist</h2>
          <p className="text-sm text-slate-500 mt-1">{statusMessage}</p>
        </div>
        <div className="w-full space-y-1.5">
          <ProgressBar value={progressPercent} max={100} />
          <p className="text-sm text-slate-500">{completedCount} of {totalCount} steps complete</p>
        </div>
        {progressPercent === 100 && (
          <div className="flex items-center gap-2 text-emerald-600 font-semibold">
            <Check className="w-5 h-5" />
            All steps complete!
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-100">
        <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <p className="text-xs text-slate-600">
          Users who complete all steps are 4x more likely to close their first job with QuotePro.
        </p>
      </div>

      {renderCategory("essentials")}
      {renderCategory("features")}
      {renderCategory("growth")}
    </div>
  );
}
