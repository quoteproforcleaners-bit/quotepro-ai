import { useState, useEffect } from "react";
import {
  Calculator,
  FileText,
  MessageSquare,
  Sparkles,
  Download,
  Eye,
  Zap,
  TrendingUp,
  Users,
  DollarSign,
  ClipboardList,
  BarChart3,
  Unlock,
  Search,
  X,
} from "lucide-react";
import { LeadCaptureModal } from "../components/LeadCaptureModal";
import { trackEvent } from "../lib/analytics";

type Resource = {
  id: string;
  title: string;
  description: string;
  icon: typeof Calculator;
  category: "calculator" | "template" | "script" | "ai";
  buttonLabel: string;
  buttonAction: string;
  color: string;
  popular?: boolean;
};

const resources: Resource[] = [
  {
    id: "pricing-calculator",
    title: "Cleaning Pricing Calculator",
    description: "Calculate competitive rates for residential and commercial cleaning jobs based on square footage, room count, and service type.",
    icon: Calculator,
    category: "calculator",
    buttonLabel: "Download Template",
    buttonAction: "download",
    color: "from-blue-500 to-blue-600",
  },
  {
    id: "quote-template",
    title: "Professional Quote Templates",
    description: "Ready-to-use quote templates that make your business look professional. Includes Good/Better/Best tiered pricing layouts.",
    icon: FileText,
    category: "template",
    buttonLabel: "Download Template",
    buttonAction: "download",
    color: "from-emerald-500 to-emerald-600",
    popular: true,
  },
  {
    id: "sales-scripts",
    title: "Cleaning Sales Scripts",
    description: "Proven phone and in-person scripts for closing more cleaning jobs. Includes objection handling and upsell techniques.",
    icon: MessageSquare,
    category: "script",
    buttonLabel: "View Scripts",
    buttonAction: "view",
    color: "from-violet-500 to-violet-600",
  },
  {
    id: "ai-prompts",
    title: "AI Prompts for Cleaners",
    description: "Ready-to-use ChatGPT and AI prompts for writing bios, responding to leads, creating social posts, and handling complaints.",
    icon: Sparkles,
    category: "ai",
    buttonLabel: "Get AI Prompts",
    buttonAction: "download",
    color: "from-amber-500 to-orange-500",
    popular: true,
  },
  {
    id: "walkthrough-checklist",
    title: "Client Walkthrough Checklist",
    description: "Never miss a detail during property walkthroughs. Room-by-room checklist for accurate quoting every time.",
    icon: ClipboardList,
    category: "template",
    buttonLabel: "Download Resource",
    buttonAction: "download",
    color: "from-cyan-500 to-cyan-600",
  },
  {
    id: "growth-playbook",
    title: "Cleaning Business Growth Playbook",
    description: "A step-by-step guide to scaling your cleaning business from solo operator to team. Covers marketing, hiring, and systems.",
    icon: TrendingUp,
    category: "template",
    buttonLabel: "Download Resource",
    buttonAction: "download",
    color: "from-rose-500 to-rose-600",
  },
  {
    id: "client-onboarding",
    title: "Client Onboarding Kit",
    description: "Welcome packet, service agreement, and expectations sheet to onboard new cleaning clients professionally.",
    icon: Users,
    category: "template",
    buttonLabel: "Download Template",
    buttonAction: "download",
    color: "from-indigo-500 to-indigo-600",
  },
  {
    id: "profit-tracker",
    title: "Job Profit Tracker",
    description: "Track revenue, supplies cost, labor, and travel per job. Know your true profit margins at a glance.",
    icon: DollarSign,
    category: "calculator",
    buttonLabel: "Download Template",
    buttonAction: "download",
    color: "from-green-500 to-green-600",
  },
  {
    id: "follow-up-scripts",
    title: "Follow-Up & Upsell Scripts",
    description: "Text and email templates for following up on quotes, requesting reviews, and upselling recurring service packages.",
    icon: MessageSquare,
    category: "script",
    buttonLabel: "View Scripts",
    buttonAction: "view",
    color: "from-purple-500 to-purple-600",
  },
  {
    id: "kpi-dashboard",
    title: "Cleaning Business KPI Dashboard",
    description: "Track close rate, average ticket, customer lifetime value, and more. Pre-built spreadsheet with charts.",
    icon: BarChart3,
    category: "calculator",
    buttonLabel: "Download Resource",
    buttonAction: "download",
    color: "from-sky-500 to-sky-600",
  },
];

const categoryFilters = [
  { key: "all", label: "All Resources" },
  { key: "calculator", label: "Calculators" },
  { key: "template", label: "Templates" },
  { key: "script", label: "Scripts" },
  { key: "ai", label: "AI Tools" },
];

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="bg-amber-200/70 text-inherit rounded-sm px-0.5">{part}</mark>
    ) : (
      part
    )
  );
}

export default function ToolkitPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingResource, setPendingResource] = useState<Resource | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [unlockedResources, setUnlockedResources] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("toolkit_unlocked");
      return saved ? new Set(JSON.parse(saved)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });
  const [sessionUnlocked, setSessionUnlocked] = useState(() => {
    try {
      return sessionStorage.getItem("toolkit_session_unlocked") === "true";
    } catch {
      return false;
    }
  });
  const [stickyVisible, setStickyVisible] = useState(false);

  useEffect(() => {
    trackEvent("toolkit_page_view", { page: "/toolkit", source: "web" });
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollEl = document.querySelector("main");
      if (!scrollEl) return;
      const scrollPct = scrollEl.scrollTop / (scrollEl.scrollHeight - scrollEl.clientHeight);
      setStickyVisible(scrollPct >= 0.3);
    };
    const main = document.querySelector("main");
    if (main) {
      main.addEventListener("scroll", handleScroll, { passive: true });
      return () => main.removeEventListener("scroll", handleScroll);
    }
  }, []);

  const filtered = resources.filter((r) => {
    const matchesCategory = activeCategory === "all" || r.category === activeCategory;
    if (!searchQuery.trim()) return matchesCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      r.title.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const markUnlocked = (resourceId: string) => {
    const next = new Set(unlockedResources);
    next.add(resourceId);
    setUnlockedResources(next);
    try {
      localStorage.setItem("toolkit_unlocked", JSON.stringify([...next]));
    } catch {}
  };

  const handleResourceClick = (resource: Resource) => {
    const eventName = resource.category === "calculator" ? "calculator_click" : "template_download";
    trackEvent(eventName, {
      page: "/toolkit",
      resource_name: resource.title,
      resource_type: resource.category,
      source: "web",
    });

    if (sessionUnlocked || unlockedResources.has(resource.id)) {
      markUnlocked(resource.id);
      showToast(`"${resource.title}" is ready — check your email for the full resource.`);
      return;
    }
    setPendingResource(resource);
    setModalOpen(true);
  };

  const handleLeadCaptured = () => {
    trackEvent("toolkit_email_signup", {
      page: "/toolkit",
      resource_name: pendingResource?.title || "sticky_bar",
      resource_type: pendingResource?.category || "general",
      source: "web",
    });

    setSessionUnlocked(true);
    try {
      sessionStorage.setItem("toolkit_session_unlocked", "true");
    } catch {}

    if (pendingResource) {
      markUnlocked(pendingResource.id);
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setPendingResource(null);
  };

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-md shadow-primary-600/20">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Cleaning Business Toolkit</h1>
            <p className="text-sm text-slate-500">Free resources to help you win more jobs and grow your cleaning business</p>
          </div>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search calculators, templates, scripts..."
          className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
        />
        {searchQuery ? (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {categoryFilters.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 ${
              activeCategory === cat.key
                ? "bg-primary-600 text-white shadow-md shadow-primary-600/20"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">No resources match "{searchQuery}"</p>
          <button onClick={() => { setSearchQuery(""); setActiveCategory("all"); }} className="mt-2 text-sm text-primary-600 hover:text-primary-700 font-medium">Clear search</button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map((resource, i) => (
          <div
            key={resource.id}
            className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden hover:shadow-lg hover:border-slate-300/80 transition-all duration-300 group"
            style={{ animationDelay: `${i * 50}ms`, animation: "fadeIn 0.4s ease-out forwards", opacity: 0 }}
          >
            <div className="p-5">
              <div className="flex items-start gap-4 mb-3">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${resource.color} flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-300`}>
                  <resource.icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900 text-[15px] leading-tight">{highlightText(resource.title, searchQuery)}</h3>
                    {resource.popular ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 uppercase tracking-wider shrink-0">Popular</span>
                    ) : null}
                  </div>
                </div>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed mb-4">{highlightText(resource.description, searchQuery)}</p>
              <button
                onClick={() => handleResourceClick(resource)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.98] transition-all duration-150"
              >
                {resource.buttonAction === "view" ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {resource.buttonLabel}
              </button>
            </div>
          </div>
        ))}
      </div>

      <LeadCaptureModal
        open={modalOpen}
        onClose={handleModalClose}
        onSuccess={handleLeadCaptured}
        resourceTitle={pendingResource?.title || ""}
      />

      {stickyVisible && !sessionUnlocked ? (
        <div
          className="fixed bottom-0 left-0 right-0 z-[90] transition-all duration-300"
          style={{
            animation: "slideUp 0.35s ease-out",
          }}
        >
          <div className="bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]">
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
              <p className="text-sm font-medium text-slate-700 hidden sm:block">
                Get the Free Cleaning Business Toolkit
              </p>
              <p className="text-sm font-medium text-slate-700 sm:hidden">
                Free Cleaning Toolkit
              </p>
              <button
                onClick={() => {
                  trackEvent("quotepro_trial_click", { page: "/toolkit", source: "sticky_bar" });
                  setPendingResource(null);
                  setModalOpen(true);
                }}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-primary-600 text-white hover:bg-primary-700 active:scale-[0.97] transition-all duration-150 shadow-sm shadow-primary-600/20 shrink-0"
              >
                <Unlock className="w-4 h-4" />
                Unlock Free Tools
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-xl bg-slate-900 text-white text-sm font-medium shadow-xl max-w-md text-center"
          style={{ animation: "slideUp 0.3s ease-out" }}
        >
          {toast}
        </div>
      ) : null}
    </div>
  );
}
