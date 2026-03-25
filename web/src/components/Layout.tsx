import { useState, useEffect, useRef, useCallback } from "react";
import { AIToastProvider } from "../lib/aiToast";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AppStoreQR from "./AppStoreQR";
import { useAuth } from "../lib/auth";
import { useSubscription } from "../lib/subscription";
import { useTheme } from "../lib/theme";
import { useWalkthrough } from "../lib/walkthrough";
import { WalkthroughOverlay } from "./WalkthroughOverlay";
import AIChatBubble from "./AIChatBubble";
import NPSSurvey from "./NPSSurvey";
import {
  LayoutDashboard, FileText, Users, Briefcase, CalendarDays, Settings,
  Menu, X, Zap, Bell, Bot, TrendingUp, Target, Wand2, Crown, Lock,
  ArrowUpRight, Wrench, Inbox, Radio, Cpu, Link2, DollarSign, Building2,
  RefreshCw, CheckSquare, BarChart2, Star, Layers, BookOpen, Sliders,
  Clipboard, PlugZap, Moon, Sun, FolderOpen, MailOpen, Brain, UserCog,
  Search, Plus, ChevronRight, type LucideIcon,
} from "lucide-react";

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  pro?: boolean;
  beta?: boolean;
  shortcut?: string;
  description?: string;
}

interface NavSection {
  label: string | null;
  items: NavItem[];
  beta?: boolean;
}

/* ─── Navigation Structure ───────────────────────────────────────────────── */

const navSections: NavSection[] = [
  {
    label: null,
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, shortcut: "G H", description: "Your real-time command center — revenue at a glance, pipeline health, recent quotes, and team activity." },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/quotes", label: "Quotes", icon: FileText, shortcut: "G Q", description: "Create, send, and track professional cleaning quotes. See which are pending, accepted, or expired." },
      { to: "/customers", label: "Customers", icon: Users, pro: true, description: "Full contact history, quote history, job records, and notes for every client in one place." },
      { to: "/jobs", label: "Jobs", icon: Briefcase, pro: true, description: "Manage scheduled cleans, assign cleaners, track completion status, and mark jobs done." },
      { to: "/employees", label: "Team Members", icon: UserCog, description: "Add cleaners, manage availability, and keep track of your crew's schedule and assignments." },
      { to: "/calendar", label: "Schedule", icon: CalendarDays, pro: true, description: "Visual week-by-week calendar for all jobs. Publish the schedule and notify your cleaners with one click." },
      { to: "/commercial-quote", label: "Commercial Quote", icon: Building2, pro: true, description: "Build detailed multi-area quotes for offices, warehouses, and commercial properties." },
      { to: "/intake-requests", label: "Quote Requests", icon: Inbox, description: "Leads submitted through your website intake form — review, respond, or convert them to quotes." },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { to: "/pricing-logic", label: "Pricing Engine", icon: Brain, description: "AI-powered pricing logic based on your market, home size, and service type. Set your rates here." },
      { to: "/quote-preferences", label: "Quote Settings", icon: Sliders, description: "Control what appears on your quotes — service lines, terms, branding, and layout preferences." },
      { to: "/settings", label: "Price Settings", icon: Settings, description: "Set your base rates, add-on prices, discounts, and tax rules for all your cleaning services." },
      { to: "/closing-assistant", label: "Objection Assistant", icon: Zap, pro: true, description: "AI coach that gives you word-for-word responses to price pushback and sales objections." },
      { to: "/sales-strategy", label: "Sales Strategy", icon: Layers, pro: true, description: "Personalized playbooks and talking points to help you close more jobs at higher prices." },
      { to: "/walkthrough-ai", label: "Quote from Notes", icon: Wand2, description: "Paste your walkthrough notes and let AI generate a complete, ready-to-send quote instantly." },
      { to: "/ai-assistant", label: "Sales Assistant", icon: Bot, pro: true, description: "Your always-on AI business coach — ask anything about pricing, sales, operations, or growth." },
    ],
  },
  {
    label: "Growth",
    items: [
      { to: "/revenue", label: "Revenue", icon: DollarSign, pro: true, description: "Track total revenue, average job value, and month-over-month growth across your entire business." },
      { to: "/growth", label: "Growth Hub", icon: TrendingUp, pro: true, description: "Identify your biggest opportunities and get a clear, prioritized action plan for scaling revenue." },
      { to: "/follow-ups", label: "Follow-ups", icon: Bell, description: "Automated and manual follow-ups for quotes that haven't been answered yet. Never let a lead go cold." },
      { to: "/opportunities", label: "Opportunities", icon: Target, pro: true, description: "AI-identified upsell and cross-sell opportunities hidden inside your existing customer base." },
      { to: "/lead-finder", label: "Lead Radar", icon: Radio, pro: true, beta: true, description: "Discover new cleaning leads in your area based on your ideal customer profile and target criteria." },
      { to: "/lead-capture", label: "Lead Capture", icon: Link2, pro: true, description: "Embed a smart intake form on your website to capture and qualify new leads automatically." },
      { to: "/reactivation", label: "Reactivation", icon: RefreshCw, pro: true, description: "Re-engage past customers who haven't booked in a while with targeted, personalized outreach." },
      { to: "/email-sequences", label: "Email Sequences", icon: MailOpen, description: "Set up automated email campaigns for new leads, quote follow-ups, and win-back campaigns." },
      { to: "/reviews-referrals", label: "Reviews & Referrals", icon: Star, pro: true, description: "Request reviews, track your ratings, and manage your referral program all from one place." },
      { to: "/weekly-recap", label: "Weekly Recap", icon: BarChart2, pro: true, description: "AI-generated summary of your week — revenue, jobs completed, quotes sent, and what to improve next." },
      { to: "/tasks-queue", label: "Tasks Queue", icon: CheckSquare, pro: true, description: "Your prioritized business to-do list — AI-powered and always focused on what moves the needle most." },
    ],
  },
  {
    label: "Workspace",
    items: [
      { to: "/automations", label: "Automations", icon: Cpu, pro: true, description: "Set up rules that trigger emails, follow-ups, or notifications automatically based on events." },
      { to: "/file-library", label: "File Library", icon: FolderOpen, description: "Store and organize contracts, photos, invoices, and business documents in one secure place." },
      { to: "/toolkit", label: "Toolkit", icon: Wrench, description: "Calculators, templates, and tools to help you run your cleaning business more efficiently." },
      { to: "/pro-setup", label: "Setup Checklist", icon: Clipboard, description: "A step-by-step guide to getting your QuotePro account fully configured, branded, and live." },
    ],
  },
  {
    label: "Integrations",
    beta: true,
    items: [
      { to: "/qbo-settings", label: "QuickBooks Online", icon: BookOpen, pro: true, description: "Sync invoices, payments, and customer data between QuotePro and your QuickBooks account." },
      { to: "/jobber", label: "Jobber", icon: PlugZap, pro: true, description: "Import jobs and customer records from your Jobber account directly into QuotePro." },
    ],
  },
];

/* ─── Nav Translation Keys ────────────────────────────────────────────────── */

const NAV_LABEL_KEYS: Record<string, string> = {
  "/dashboard": "nav.dashboard",
  "/quotes": "nav.quotes",
  "/customers": "nav.customers",
  "/jobs": "nav.jobs",
  "/employees": "nav.team",
  "/calendar": "nav.schedule",
  "/commercial-quote": "nav.commercial",
  "/intake-requests": "nav.quoteRequests",
  "/pricing-logic": "nav.pricingEngine",
  "/quote-preferences": "nav.quoteSettings",
  "/settings": "nav.priceSettings",
  "/closing-assistant": "nav.objectionAssistant",
  "/sales-strategy": "nav.salesStrategy",
  "/walkthrough-ai": "nav.quoteFromNotes",
  "/ai-assistant": "nav.salesAssistant",
  "/revenue": "nav.revenue",
  "/growth": "nav.growthHub",
  "/follow-ups": "nav.followUps",
  "/opportunities": "nav.opportunities",
  "/lead-finder": "nav.leadRadar",
  "/lead-capture": "nav.leadCapture",
  "/reactivation": "nav.reactivation",
  "/email-sequences": "nav.emailSequences",
  "/reviews-referrals": "nav.reviewsReferrals",
  "/weekly-recap": "nav.weeklyRecap",
  "/tasks-queue": "nav.tasksQueue",
  "/automations": "nav.automations",
  "/file-library": "nav.fileLibrary",
  "/toolkit": "nav.toolkit",
  "/pro-setup": "nav.setupChecklist",
  "/qbo-settings": "nav.quickbooks",
  "/jobber": "nav.jobber",
};

const SECTION_LABEL_KEYS: Record<string, string> = {
  Operations: "nav.sections.operations",
  Intelligence: "nav.sections.intelligence",
  Growth: "nav.sections.growth",
  Workspace: "nav.sections.workspace",
  Integrations: "nav.sections.integrations",
};

/* ─── Nav Tooltip ────────────────────────────────────────────────────────── */

const NAV_TOOLTIPS_KEY = "qp_nav_tooltips";

function NavItemWithTooltip({
  item, enabled, intakeNewCount, isPro, setSidebarOpen, t,
}: {
  item: NavItem; enabled: boolean; intakeNewCount: number;
  isPro: boolean; setSidebarOpen: (v: boolean) => void; t: (k: string) => string;
}) {
  const [tooltipTop, setTooltipTop] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const clear = () => { if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; } };

  const handleMouseEnter = () => {
    if (!enabled || !item.description) return;
    clear();
    timerRef.current = setTimeout(() => {
      if (wrapperRef.current) {
        const r = wrapperRef.current.getBoundingClientRect();
        setTooltipTop(r.top + r.height / 2);
      }
    }, 2000);
  };

  const handleMouseLeave = () => { clear(); setTooltipTop(null); };

  useEffect(() => () => clear(), []);

  const isDark = document.documentElement.classList.contains("dark");
  const bg = isDark ? "#27272a" : "#ffffff";
  const border = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";

  return (
    <div ref={wrapperRef} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <NavLink
        to={item.to}
        onClick={() => setSidebarOpen(false)}
        className={({ isActive }) => `nav-item w-full ${isActive ? "nav-item-active" : ""}`}
      >
        <item.icon className="shrink-0" style={{ width: "15px", height: "15px", opacity: 0.85 }} />
        <span className="flex-1 text-[13px]">{t(NAV_LABEL_KEYS[item.to] || item.label)}</span>
        {item.to === "/intake-requests" && intakeNewCount > 0 ? (
          <span className="flex items-center justify-center rounded-full bg-red-500 text-white font-bold leading-none"
            style={{ minWidth: "18px", height: "18px", fontSize: "10px", padding: "0 4px" }}>
            {intakeNewCount > 99 ? "99+" : intakeNewCount}
          </span>
        ) : null}
        {item.beta ? (
          <span className="px-1 py-0.5 rounded text-[8px] font-bold bg-rose-500 text-white uppercase tracking-wider leading-none">Beta</span>
        ) : null}
        {item.pro && !isPro ? (
          <Lock className="shrink-0" style={{ width: "12px", height: "12px", color: "#d4d4d8" }} />
        ) : null}
      </NavLink>

      {tooltipTop !== null && createPortal(
        <div
          onMouseEnter={clear}
          onMouseLeave={handleMouseLeave}
          style={{
            position: "fixed", left: 262, top: tooltipTop,
            transform: "translateY(-50%)", zIndex: 9999, width: 228,
            background: bg, border: `1px solid ${border}`,
            borderRadius: 12, padding: "10px 14px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)",
            animation: "navTooltipIn 0.15s ease-out",
          }}
        >
          <div style={{
            position: "absolute", left: -6, top: "50%", transform: "translateY(-50%)",
            width: 0, height: 0,
            borderTop: "5px solid transparent", borderBottom: "5px solid transparent",
            borderRight: `6px solid ${bg}`,
          }} />
          <p style={{ fontSize: "12px", fontWeight: 700, color: isDark ? "#fff" : "#18181b", marginBottom: "4px" }}>
            {item.label}
          </p>
          <p style={{ fontSize: "11.5px", color: isDark ? "#a1a1aa" : "#71717a", lineHeight: "1.55" }}>
            {item.description}
          </p>
        </div>,
        document.body
      )}
    </div>
  );
}

/* ─── Command Palette ─────────────────────────────────────────────────────── */

const ALL_CMD_ITEMS = [
  { label: "New Quote", icon: Plus, path: "/quotes/new", group: "Actions", color: "#2563eb" },
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard", group: "Navigate" },
  { label: "Quotes", icon: FileText, path: "/quotes", group: "Navigate" },
  { label: "Customers", icon: Users, path: "/customers", group: "Navigate" },
  { label: "Jobs", icon: Briefcase, path: "/jobs", group: "Navigate" },
  { label: "Team Members", icon: UserCog, path: "/employees", group: "Navigate" },
  { label: "Schedule", icon: CalendarDays, path: "/calendar", group: "Navigate" },
  { label: "Pricing Engine", icon: Brain, path: "/pricing-logic", group: "Navigate" },
  { label: "Follow-ups", icon: Bell, path: "/follow-ups", group: "Navigate" },
  { label: "Revenue", icon: DollarSign, path: "/revenue", group: "Navigate" },
  { label: "Growth Hub", icon: TrendingUp, path: "/growth", group: "Navigate" },
  { label: "Lead Radar", icon: Radio, path: "/lead-finder", group: "Navigate" },
  { label: "Opportunities", icon: Target, path: "/opportunities", group: "Navigate" },
  { label: "Automations", icon: Cpu, path: "/automations", group: "Navigate" },
  { label: "Sales Assistant", icon: Bot, path: "/ai-assistant", group: "Navigate" },
  { label: "Quote from Notes", icon: Wand2, path: "/walkthrough-ai", group: "Navigate" },
  { label: "Account Settings", icon: Settings, path: "/account-settings", group: "Navigate" },
];

function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query.trim()
    ? ALL_CMD_ITEMS.filter((item) =>
        item.label.toLowerCase().includes(query.toLowerCase()) ||
        item.group.toLowerCase().includes(query.toLowerCase())
      )
    : ALL_CMD_ITEMS;

  const groups = [...new Set(filtered.map((i) => i.group))];

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  const handleSelect = useCallback((path: string) => {
    navigate(path);
    onClose();
  }, [navigate, onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setSelected((s) => Math.min(s + 1, filtered.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
      if (e.key === "Enter" && filtered[selected]) { handleSelect(filtered[selected].path); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, selected, filtered, handleSelect, onClose]);

  if (!open) return null;

  let globalIdx = -1;

  return (
    <div className="cmd-overlay" onClick={onClose}>
      <div className="cmd-palette mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 border-b border-zinc-100" style={{ borderBottomColor: "rgba(0,0,0,0.07)" }}>
          <Search className="w-4 h-4 text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            className="cmd-input px-0"
            placeholder="Search or jump to..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ borderBottom: "none", padding: "15px 0" }}
          />
        </div>
        <div className="cmd-results">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-zinc-400">No results for "{query}"</div>
          ) : (
            groups.map((group) => {
              const items = filtered.filter((i) => i.group === group);
              return (
                <div key={group}>
                  <div className="cmd-group-label">{group}</div>
                  {items.map((item) => {
                    globalIdx++;
                    const idx = globalIdx;
                    const isSelected = selected === idx;
                    return (
                      <div
                        key={item.path}
                        className={`cmd-item ${isSelected ? "cmd-item-selected" : ""}`}
                        onMouseEnter={() => setSelected(idx)}
                        onClick={() => handleSelect(item.path)}
                      >
                        <div className="cmd-item-icon" style={item.color ? { background: `${item.color}15`, color: item.color } : {}}>
                          <item.icon className="w-4 h-4" />
                        </div>
                        <span>{item.label}</span>
                        {isSelected ? (
                          <span className="ml-auto">
                            <ChevronRight className="w-3.5 h-3.5 text-zinc-300" />
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
        <div className="cmd-footer">
          <span className="cmd-kbd">↑↓</span> navigate
          <span className="cmd-kbd ml-1">↵</span> open
          <span className="cmd-kbd ml-1">Esc</span> close
          <span className="ml-auto opacity-60">QuotePro AI</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Layout ─────────────────────────────────────────────────────────────── */

const ROUTE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard", "/quotes": "Quotes", "/quotes/new": "New Quote",
  "/customers": "Customers", "/jobs": "Jobs", "/employees": "Team Members",
  "/calendar": "Schedule", "/pricing-logic": "Pricing Engine",
  "/settings": "Price Settings", "/quote-preferences": "Quote Settings",
  "/follow-ups": "Follow-ups", "/revenue": "Revenue", "/growth": "Growth Hub",
  "/opportunities": "Opportunities", "/lead-finder": "Lead Radar",
  "/lead-capture": "Lead Capture", "/reactivation": "Reactivation",
  "/email-sequences": "Email Sequences", "/reviews-referrals": "Reviews & Referrals",
  "/weekly-recap": "Weekly Recap", "/tasks-queue": "Tasks Queue",
  "/automations": "Automations", "/ai-assistant": "Sales Assistant",
  "/walkthrough-ai": "Quote from Notes", "/intake-requests": "Quote Requests",
  "/closing-assistant": "Objection Assistant", "/sales-strategy": "Sales Strategy",
  "/commercial-quote": "Commercial Quote", "/file-library": "File Library",
  "/toolkit": "Toolkit", "/pro-setup": "Setup Checklist",
  "/account-settings": "Account Settings", "/qbo-settings": "QuickBooks",
  "/jobber": "Jobber",
};

const PRO_ROUTES = [
  "/customers", "/jobs", "/calendar", "/growth", "/opportunities", "/ai-assistant",
  "/lead-finder", "/lead-capture", "/revenue", "/closing-assistant",
  "/commercial-quote", "/reactivation", "/automations", "/sales-strategy",
  "/weekly-recap", "/tasks-queue", "/reviews-referrals", "/qbo-settings", "/jobber",
];

/* ─── Trial Countdown Banner ─────────────────────────────────────────────── */

function TrialCountdownBanner() {
  const { isInFreeTrial, freeTrialDaysLeft, startCheckout } = useSubscription();
  const [dismissed, setDismissed] = useState(false);

  if (!isInFreeTrial || dismissed) return null;

  const isUrgent = freeTrialDaysLeft <= 2;
  const isWarning = freeTrialDaysLeft <= 7;

  const bg = isUrgent
    ? "bg-red-50 border-red-200"
    : isWarning
      ? "bg-amber-50 border-amber-200"
      : "bg-blue-50 border-blue-200";
  const textColor = isUrgent ? "text-red-800" : isWarning ? "text-amber-800" : "text-blue-800";
  const btnColor = isUrgent ? "bg-red-600 hover:bg-red-700" : isWarning ? "bg-amber-600 hover:bg-amber-700" : "bg-blue-600 hover:bg-blue-700";

  const label = freeTrialDaysLeft === 0
    ? "Your free trial ends today"
    : freeTrialDaysLeft === 1
      ? "1 day left in your free trial"
      : `${freeTrialDaysLeft} days left in your free trial`;

  return (
    <div className={`mb-6 px-4 py-3 border rounded-xl flex items-center justify-between gap-4 ${bg}`}>
      <div className="flex items-center gap-2">
        <Zap className={`w-4 h-4 flex-shrink-0 ${textColor}`} />
        <span className={`text-sm font-medium ${textColor}`}>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => startCheckout("growth", "monthly")}
          className={`text-xs font-semibold text-white px-3 py-1.5 rounded-lg transition-colors ${btnColor}`}
        >
          Upgrade now
        </button>
        <button
          onClick={() => setDismissed(true)}
          className={`${textColor} opacity-60 hover:opacity-100 transition-opacity`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function Layout() {
  const { user, business } = useAuth();
  const { isPro } = useSubscription();
  const { theme, toggleTheme } = useTheme();
  const { isCompleted, isDismissed, startTour, resetTour } = useWalkthrough();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [navTooltipsEnabled, setNavTooltipsEnabled] = useState(() => {
    try { return localStorage.getItem(NAV_TOOLTIPS_KEY) !== "false"; } catch { return true; }
  });
  const mainRef = useRef<HTMLElement>(null);

  const { data: intakeCount } = useQuery<{ count: number; newCount: number; reviewCount: number }>({
    queryKey: ["/api/intake-requests/count"],
    refetchInterval: 60_000,
  });
  const intakeNewCount = intakeCount?.newCount ?? 0;

  const { data: quoteCountData } = useQuery<{ count: number }>({
    queryKey: ["/api/quotes/count"],
    refetchInterval: 120_000,
  });
  const quoteCount = quoteCountData?.count ?? 0;
  const featureUnlocked = quoteCount >= 5;

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [location.pathname]);

  useEffect(() => {
    const handler = () => {
      try { setNavTooltipsEnabled(localStorage.getItem(NAV_TOOLTIPS_KEY) !== "false"); } catch {}
    };
    window.addEventListener("qp-nav-tooltip-change", handler);
    return () => window.removeEventListener("qp-nav-tooltip-change", handler);
  }, []);

  useEffect(() => {
    if (!isCompleted && !isDismissed && location.pathname === "/dashboard") {
      const timer = setTimeout(() => startTour(), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const initials =
    (user?.firstName?.[0] || "") + (user?.lastName?.[0] || "") || "U";

  const currentTitle = ROUTE_TITLES[location.pathname] ||
    (location.pathname.startsWith("/quotes/") ? "Quote" : "QuotePro");

  return (
    <AIToastProvider>
    <div className="min-h-screen flex bg-[#F5F4F1] dark:bg-[#0A0A0F]">
      {/* Mobile overlay */}
      {sidebarOpen ? (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      {/* ── Sidebar ── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col bg-white dark:bg-zinc-900
          transform transition-transform duration-200 ease-out
          lg:translate-x-0 lg:static lg:z-auto
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        style={{
          width: "248px",
          borderRight: "1px solid rgba(0,0,0,0.07)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 shrink-0" style={{ height: "56px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #1d4ed8, #2563eb)" }}
          >
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-[15px] tracking-tight text-zinc-900 dark:text-white">
            QuotePro
          </span>
          <span
            className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)", color: "white", letterSpacing: "0.08em" }}
          >
            AI
          </span>
          <div className="flex items-center gap-1.5 ml-auto">
            {isPro ? (
              <span
                className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white" }}
              >
                Pro
              </span>
            ) : null}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-md transition-colors"
              style={{ color: "#a1a1aa" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#52525b"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#a1a1aa"; }}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 rounded-md text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Command palette trigger */}
        <div className="px-3 pt-3 pb-2 shrink-0">
          <button
            onClick={() => setCmdOpen(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors text-left group"
            style={{ background: "#F4F4F5", border: "1px solid rgba(0,0,0,0.06)" }}
          >
            <Search className="w-3.5 h-3.5 shrink-0" style={{ color: "#a1a1aa" }} />
            <span className="flex-1 text-[12.5px]" style={{ color: "#a1a1aa" }}>{t("common.searchOrJump")}</span>
            <div className="flex items-center gap-0.5">
              <kbd className="cmd-kbd">⌘</kbd>
              <kbd className="cmd-kbd">K</kbd>
            </div>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 pb-3 overflow-y-auto" style={{ paddingTop: "4px" }}>
          {navSections.map((section, si) => (
            <div key={si} className={si > 0 ? "mt-5" : ""}>
              {section.label ? (
                <p
                  className="px-3 mb-1 flex items-center gap-1.5"
                  style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "#a1a1aa" }}
                >
                  {t(SECTION_LABEL_KEYS[section.label] || section.label)}
                  {section.beta ? (
                    <span className="px-1 py-0.5 rounded text-[8px] font-bold bg-rose-500 text-white uppercase tracking-wider leading-none">Beta</span>
                  ) : null}
                </p>
              ) : null}
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavItemWithTooltip
                    key={item.to}
                    item={item}
                    enabled={navTooltipsEnabled}
                    intakeNewCount={intakeNewCount}
                    isPro={isPro}
                    setSidebarOpen={setSidebarOpen}
                    t={t}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Progressive feature disclosure */}
        {!featureUnlocked && (
          <div className="px-3 pb-2 shrink-0">
            <div
              className="rounded-xl p-3"
              style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.08), rgba(99,102,241,0.08))", border: "1px solid rgba(99,102,241,0.2)" }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#6366f1", flexShrink: 0 }} />
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#a5b4fc" }}>More features unlock soon</span>
              </div>
              <div className="flex gap-1 mb-1.5">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1, height: "3px", borderRadius: "2px",
                      background: i < quoteCount ? "#6366f1" : "rgba(99,102,241,0.15)",
                      transition: "background 0.3s",
                    }}
                  />
                ))}
              </div>
              <p style={{ fontSize: "10.5px", color: "#94a3b8", lineHeight: 1.5 }}>
                {quoteCount === 0
                  ? "Send your first quote to get started"
                  : `${5 - quoteCount} more quote${5 - quoteCount !== 1 ? "s" : ""} to unlock Growth, Automations & AI`}
              </p>
            </div>
          </div>
        )}

        {/* Product Tour */}
        <div className="px-3 pb-1 shrink-0">
          <button
            onClick={() => { resetTour(); setSidebarOpen(false); }}
            className="nav-item w-full"
            style={{ color: "#a1a1aa" }}
          >
            <BookOpen style={{ width: "14px", height: "14px" }} />
            <span style={{ fontSize: "12.5px" }}>{t("nav.productTour")}</span>
          </button>
        </div>

        <AppStoreQR />

        {/* Upgrade CTA */}
        {!isPro ? (
          <div className="px-3 pb-3 shrink-0">
            <button
              onClick={() => navigate("/upgrade?source=sidebar")}
              className="w-full p-3.5 rounded-xl text-left relative overflow-hidden group"
              style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 60%, #2563eb 100%)" }}
            >
              <div
                className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: "radial-gradient(circle at 80% 20%, rgba(255,255,255,0.12), transparent 60%)" }}
              />
              <div className="relative">
                <div className="flex items-center gap-2 mb-1">
                  <Crown className="w-3.5 h-3.5" style={{ color: "#fbbf24" }} />
                  <span className="text-[13px] font-bold text-white">Upgrade to Growth</span>
                </div>
                <p className="text-[11px] leading-relaxed" style={{ color: "rgba(147,197,253,0.9)" }}>
                  Unlimited quotes, AI tools, CRM &amp; more
                </p>
                <div className="flex items-center gap-1 mt-2 text-[11px] font-semibold" style={{ color: "rgba(147,197,253,0.8)" }}>
                  <span>From $19/mo</span>
                  <span style={{ opacity: 0.5 }}>&middot;</span>
                  <span>7-day free trial</span>
                  <ArrowUpRight className="w-3 h-3 ml-auto" />
                </div>
              </div>
            </button>
          </div>
        ) : null}

        {/* User Profile */}
        <div className="px-3 pb-3 shrink-0" style={{ borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: "12px" }}>
          <button
            onClick={() => { navigate("/account-settings"); setSidebarOpen(false); }}
            className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg transition-colors text-left group"
            style={{ hover: {} }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.04)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; }}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
              style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)" }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] font-semibold truncate leading-tight" style={{ color: "#18181b" }}>
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-[11px] truncate leading-tight" style={{ color: "#a1a1aa" }}>
                {business?.companyName || ""}
              </p>
            </div>
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header
          className="flex items-center px-4 lg:px-6 shrink-0 sticky top-0 z-30 gap-3"
          style={{
            height: "56px",
            background: "rgba(245,244,241,0.85)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderBottom: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          {/* Mobile hamburger */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 -ml-1.5 rounded-lg transition-colors"
            style={{ color: "#71717a" }}
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Page title (mobile) */}
          <span className="lg:hidden text-[14px] font-semibold" style={{ color: "#18181b" }}>
            {currentTitle}
          </span>

          {/* Search trigger (desktop) */}
          <button
            onClick={() => setCmdOpen(true)}
            className="hidden lg:flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-colors"
            style={{
              background: "rgba(0,0,0,0.04)",
              border: "1px solid rgba(0,0,0,0.07)",
              color: "#a1a1aa",
              minWidth: "200px",
            }}
          >
            <Search className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[12.5px] flex-1 text-left">Search...</span>
            <div className="flex items-center gap-0.5 ml-2">
              <kbd className="cmd-kbd">⌘K</kbd>
            </div>
          </button>

          <div className="flex-1" />

          {/* Quick actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/quotes/new")}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-[13px] font-semibold transition-all active:scale-[0.97]"
              style={{ background: "#2563eb" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#1d4ed8"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#2563eb"; }}
            >
              <Plus className="w-3.5 h-3.5" />
              New Quote
            </button>
            <button
              className="p-2 rounded-lg transition-colors relative"
              style={{ color: "#71717a" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#18181b"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#71717a"; }}
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Content */}
        <main ref={mainRef} className="flex-1 overflow-y-auto" style={{ padding: "28px 24px 40px" }}>
          <TrialCountdownBanner />
          <div className="max-w-7xl mx-auto animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Command Palette */}
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />

      <WalkthroughOverlay />

      {/* AI chat bubble — hidden on the full AI assistant page */}
      {location.pathname !== "/ai-assistant" && <AIChatBubble />}
      <NPSSurvey />
    </div>
    </AIToastProvider>
  );
}
