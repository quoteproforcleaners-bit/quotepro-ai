import { useState, useEffect, useRef, useCallback } from "react";
import { AIToastProvider } from "../lib/aiToast";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AppStoreQR from "./AppStoreQR";
import { useAuth } from "../lib/auth";
import { useSubscription } from "../lib/subscription";
import { useWalkthrough } from "../lib/walkthrough";
import { WalkthroughOverlay } from "./WalkthroughOverlay";
import AIChatBubble from "./AIChatBubble";
import NPSSurvey from "./NPSSurvey";
import {
  LayoutDashboard, FileText, Users, Briefcase, CalendarDays, Settings,
  Menu, X, Zap, Bell, Bot, TrendingUp, Target, Wand2, Crown, Lock,
  ArrowUpRight, Wrench, Inbox, Radio, Cpu, Link2, DollarSign, Building2,
  RefreshCw, CheckSquare, BarChart2, Star, Layers, BookOpen, Sliders,
  Clipboard, PlugZap, FolderOpen, MailOpen, Brain, UserCog, Globe,
  Search, Plus, ChevronRight, ChevronDown, LifeBuoy, CircleUser,
  Repeat2, TrendingDown, Gift, MapPin, type LucideIcon,
} from "lucide-react";
import { LocationSwitcher } from "./LocationSwitcher";
import { SupportModal } from "./SupportModal";
import UpgradeModal from "./UpgradeModal";
import QuoteUsageBanner from "./QuoteUsageBanner";
import { AnnualUpgradeBanner } from "./AnnualUpgradeBanner";

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  pro?: boolean;
  beta?: boolean;
  free?: boolean;
  shortcut?: string;
  description?: string;
}

interface NavSection {
  label: string | null;
  items: NavItem[];
  beta?: boolean;
}

/* ─── Navigation Structure ───────────────────────────────────────────────── */

const SETTINGS_NAV_KEY = "quotepro_nav_settings_open";

// PIPELINE — lead-to-quote workflow
const PIPELINE_NAV_ITEMS: NavItem[] = [
  { to: "/lead-capture",    label: "Lead Capture",    icon: Link2,       description: "Share your branded quote request link — customers submit details, you get instant leads." },
  { to: "/intake-requests", label: "Quote Requests",  icon: Inbox,       description: "View and manage quote requests submitted through your lead capture link." },
  { to: "/booking-widget",  label: "Booking Widget",  icon: Globe,       pro: true, description: "Embed a booking form on your own website — customers pick a service, date, and time without leaving your site." },
  { to: "/quotes",          label: "Quotes",          icon: FileText,    shortcut: "G Q", description: "Create, send, and track professional cleaning quotes. See which are pending, accepted, or expired." },
  { to: "/commercial-quote",label: "Commercial",      icon: Building2,   pro: true, description: "Build detailed multi-area quotes for offices, warehouses, and commercial properties." },
];

// OPERATIONS — day-to-day work management
const OPERATIONS_NAV_ITEMS: NavItem[] = [
  { to: "/customers",            label: "Customers",  icon: Users,        pro: true, description: "Full contact history, quote history, job records, and notes for every client in one place." },
  { to: "/jobs",                 label: "Jobs",       icon: Briefcase,    pro: true, description: "Manage scheduled cleans, assign cleaners, track completion status, and mark jobs done." },
  { to: "/recurring-schedules",  label: "Recurring",  icon: Repeat2,      pro: true, description: "Set up repeating cleans with automatic job generation and optional auto-charge billing." },
  { to: "/staff",                label: "Staff",      icon: UserCog,      pro: true, description: "Add cleaners, manage their PINs, share QR codes for mobile login, and track who's clocked in." },
  { to: "/calendar",             label: "Schedule",   icon: CalendarDays, pro: true, description: "Visual week-by-week calendar for all jobs. Publish the schedule and notify your cleaners with one click." },
  { to: "/locations",            label: "Locations",  icon: MapPin,       pro: true, description: "Manage multiple service areas from one account — assign staff, quotes, and jobs per location." },
];

// GROWTH — business intelligence + automation
const GROWTH_NAV_ITEMS: NavItem[] = [
  { to: "/follow-ups",       label: "Follow-Ups",        icon: Bell,       description: "Every quote that needs a follow-up, ranked by priority. Never let a lead go cold." },
  { to: "/autopilot",        label: "Autopilot",          icon: PlugZap,    pro: true, beta: true, description: "4-step AI pipeline: qualify leads, send quotes, follow up, and request reviews — all automatically." },
  { to: "/opportunities",    label: "Win-Back",           icon: Repeat2,    pro: true, description: "Re-engage past customers who went quiet — AI surfaces the best win-back opportunities." },
  { to: "/win-loss",         label: "Win/Loss Analysis",  icon: TrendingDown, pro: true, description: "See why prospects didn't book — automated follow-up emails collect feedback and surface pricing insights." },
  { to: "/revenue",          label: "Revenue",            icon: DollarSign, pro: true, description: "Full revenue reporting — monthly totals, job type breakdown, and trends vs. prior periods." },
  { to: "/reviews-referrals",label: "Reviews & Referrals",icon: Star,       pro: true, description: "Automate Google review requests and track referrals from your best customers." },
];

// TOOLS — AI-powered aids (collapsible)
const TOOLS_NAV_ITEMS: NavItem[] = [
  { to: "/quote-doctor",      label: "Quote Doctor",     icon: Zap,      free: true, description: "Free AI tool — paste any cleaning quote and get an optimized version that converts more jobs." },
  { to: "/walkthrough-ai",    label: "Voice-to-Quote",   icon: Wand2,               description: "Paste your walkthrough notes and let AI generate a complete, ready-to-send quote instantly." },
  { to: "/ai-assistant",      label: "Sales Assistant",  icon: Bot,      pro: true,  description: "Your always-on AI business coach — ask anything about pricing, sales, operations, or growth." },
  { to: "/closing-assistant", label: "Handle Objections",icon: Target,   pro: true,  description: "AI coach that gives you word-for-word responses to price pushback and sales objections." },
  { to: "/automations",       label: "Automations",      icon: Cpu,      pro: true,  description: "Set up automated follow-ups, review requests, and customer sequences that run on autopilot." },
  { to: "/email-sequences",   label: "Email Sequences",  icon: MailOpen, pro: true,  description: "Drip campaigns and one-off emails — automated sequences that nurture leads into booked jobs." },
  { to: "/toolkit",           label: "Toolkit",          icon: Wrench,              description: "Calculators, scripts, templates, and reference tools for running a professional cleaning business." },
];

// SETTINGS — configuration (hidden at bottom, collapsible)
const SETTINGS_NAV_ITEMS: NavItem[] = [
  { to: "/settings",          label: "Price Settings",  icon: Settings,   description: "Set your base rates, add-on prices, discounts, and tax rules for all your cleaning services." },
  { to: "/quote-preferences", label: "Quote Settings",  icon: Sliders,    description: "Control what appears on your quotes — service lines, terms, branding, and layout preferences." },
  { to: "/pricing-logic",     label: "Pricing Engine",  icon: Brain,      description: "AI-powered pricing logic based on your market, home size, and service type. Set your rates here." },
  { to: "/sales-strategy",    label: "Sales Strategy",  icon: Layers,     pro: true, description: "Personalized playbooks and talking points to help you close more jobs at higher prices." },
  { to: "/employees",         label: "Team Members",    icon: UserCog,    description: "Add cleaners, manage availability, and keep track of your crew's schedule and assignments." },
  { to: "/team",              label: "Field Status",    icon: Radio,      description: "Live kanban view of today's field assignments — see who's checked in, en route, or completed." },
  { to: "/file-library",      label: "File Library",    icon: FolderOpen, description: "Store and manage your contracts, before/after photos, and cleaning checklists in one place." },
  { to: "/qbo-settings",      label: "QuickBooks",      icon: PlugZap,    description: "Sync your quotes, invoices, and payments directly to QuickBooks Online." },
  { to: "/account-settings",  label: "Account",         icon: CircleUser, description: "Manage your profile, password, notification preferences, and billing information." },
];

// All nav items for command palette
const navSections: NavSection[] = [
  { label: "Pipeline",    items: PIPELINE_NAV_ITEMS },
  { label: "Operations",  items: OPERATIONS_NAV_ITEMS },
  { label: "Growth",      items: GROWTH_NAV_ITEMS },
  { label: "Tools",       items: TOOLS_NAV_ITEMS },
  { label: "Settings",    items: SETTINGS_NAV_ITEMS },
];

/* ─── Nav Translation Keys ────────────────────────────────────────────────── */

const NAV_LABEL_KEYS: Record<string, string> = {
  "/dashboard":         "nav.dashboard",
  "/quotes":            "nav.quotes",
  "/customers":         "nav.customers",
  "/jobs":              "nav.jobs",
  "/employees":         "nav.team",
  "/staff":             "nav.staff",
  "/calendar":          "nav.schedule",
  "/commercial-quote":  "nav.commercial",
  "/intake-requests":   "nav.quoteRequests",
  "/pricing-logic":     "nav.pricingEngine",
  "/quote-preferences": "nav.quoteSettings",
  "/settings":          "nav.priceSettings",
  "/closing-assistant": "nav.objectionAssistant",
  "/sales-strategy":    "nav.salesStrategy",
  "/walkthrough-ai":    "nav.quoteFromNotes",
  "/ai-assistant":      "nav.salesAssistant",
  "/revenue":           "nav.revenue",
  "/growth":            "nav.growthHub",
  "/follow-ups":        "nav.followUps",
  "/opportunities":     "nav.opportunities",
  "/lead-finder":       "nav.leadRadar",
  "/lead-capture":      "nav.leadCapture",
  "/booking-widget":    "nav.bookingWidget",
  "/reactivation":      "nav.reactivation",
  "/win-loss":          "Win/Loss Analysis",
  "/referral":          "Refer & Earn",
  "/email-sequences":   "nav.emailSequences",
  "/reviews-referrals": "nav.reviewsReferrals",
  "/weekly-recap":      "nav.weeklyRecap",
  "/tasks-queue":       "nav.tasksQueue",
  "/automations":       "nav.automations",
  "/file-library":      "nav.fileLibrary",
  "/toolkit":           "nav.toolkit",
  "/pro-setup":         "nav.setupChecklist",
  "/qbo-settings":      "nav.quickbooks",
};

const SECTION_LABEL_KEYS: Record<string, string> = {
  Operations: "nav.sections.operations",
  Intelligence: "nav.sections.intelligence",
  Growth: "nav.sections.growth",
  Workspace: "nav.sections.workspace",
  Integrations: "nav.sections.integrations",
};

/* ─── Section label ──────────────────────────────────────────────────────── */

function SectionLabel({ label }: { label: string }) {
  return (
    <p style={{
      fontSize: "10px",
      fontWeight: 600,
      color: "var(--t4)",
      letterSpacing: ".08em",
      textTransform: "uppercase",
      padding: "0 10px",
      margin: "0 0 2px",
      userSelect: "none",
    }}>
      {label}
    </p>
  );
}

function CollapsibleSectionLabel({
  label, open, onToggle,
}: { label: string; open: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-1 group"
      style={{ background: "none", border: "none", cursor: "pointer", padding: "0 10px 2px", marginBottom: "2px" }}
    >
      <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--t4)", letterSpacing: ".08em", textTransform: "uppercase", flex: 1, textAlign: "left" }}>
        {label}
      </span>
      <ChevronDown
        style={{
          width: "11px", height: "11px", color: "var(--t4)",
          transform: open ? "rotate(0deg)" : "rotate(-90deg)",
          transition: "transform 0.18s ease",
        }}
      />
    </button>
  );
}

function NavDivider() {
  return (
    <div style={{ margin: "10px 2px", borderTop: "1px solid rgba(0,0,0,0.06)" }} />
  );
}

/* ─── Nav Tooltip ────────────────────────────────────────────────────────── */

const NAV_TOOLTIPS_KEY = "qp_nav_tooltips";

function NavItemWithTooltip({
  item, enabled, intakeNewCount, quoteResponseCount, isPro, setSidebarOpen, t,
}: {
  item: NavItem; enabled: boolean; intakeNewCount: number; quoteResponseCount: number;
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

  const isQuoteDoctor = item.to === "/quote-doctor";

  return (
    <div ref={wrapperRef} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <NavLink
        to={item.to}
        onClick={() => setSidebarOpen(false)}
        className={({ isActive }) => `nav-item w-full ${isActive ? "nav-item-active" : ""}`}
      >
        {/* Icon square */}
        <span
          className="nav-icon-sq"
          style={isQuoteDoctor ? { color: "#059669" } : undefined}
        >
          <item.icon style={{ width: "13px", height: "13px" }} />
        </span>

        <span
          className="flex-1"
          style={{
            fontSize: "13px",
            ...(isQuoteDoctor ? { color: "#059669", fontWeight: 600 } : {}),
          }}
        >
          {t(NAV_LABEL_KEYS[item.to] || item.label)}
        </span>

        {/* Free tag */}
        {item.free ? (
          <span className="nav-new-tag" style={{ background: "rgba(16,185,129,0.12)", color: "#059669" }}>
            FREE
          </span>
        ) : null}
        {/* Beta tag */}
        {item.beta ? (
          <span className="nav-new-tag" style={{ background: "rgba(245,158,11,0.10)", color: "#d97706" }}>
            BETA
          </span>
        ) : null}

        {/* Notification count badges */}
        {item.to === "/quotes" && quoteResponseCount > 0 ? (
          <span className="nav-badge" style={{ background: "rgba(239,68,68,0.12)", color: "#dc2626" }}>
            {quoteResponseCount > 99 ? "99+" : quoteResponseCount}
          </span>
        ) : null}
        {item.to === "/intake-requests" && intakeNewCount > 0 ? (
          <span className="nav-badge" style={{ background: "rgba(239,68,68,0.12)", color: "#dc2626" }}>
            {intakeNewCount > 99 ? "99+" : intakeNewCount}
          </span>
        ) : null}

        {/* Pro lock */}
        {item.pro && !isPro ? (
          <Lock className="shrink-0" style={{ width: "11px", height: "11px", color: "var(--t4)" }} />
        ) : null}
      </NavLink>

      {tooltipTop !== null && createPortal(
        <div
          onMouseEnter={clear}
          onMouseLeave={handleMouseLeave}
          style={{
            position: "fixed", left: 270, top: tooltipTop,
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
  { label: "New Quote",          icon: Plus,            path: "/quotes/new",        group: "Actions",  color: "#2563eb" },
  { label: "Dashboard",          icon: LayoutDashboard, path: "/dashboard",         group: "Navigate" },
  { label: "Lead Capture",       icon: Link2,           path: "/lead-capture",      group: "Navigate" },
  { label: "Quote Requests",     icon: Inbox,           path: "/intake-requests",   group: "Navigate" },
  { label: "Booking Widget",     icon: Globe,           path: "/booking-widget",    group: "Navigate" },
  { label: "Quotes",             icon: FileText,        path: "/quotes",            group: "Navigate" },
  { label: "Commercial Quote",   icon: Building2,       path: "/commercial-quote",  group: "Navigate" },
  { label: "Customers",          icon: Users,           path: "/customers",         group: "Navigate" },
  { label: "Jobs",               icon: Briefcase,       path: "/jobs",              group: "Navigate" },
  { label: "Schedule",           icon: CalendarDays,    path: "/calendar",          group: "Navigate" },
  { label: "Follow-Ups",         icon: Bell,            path: "/follow-ups",        group: "Navigate" },
  { label: "Autopilot",          icon: PlugZap,         path: "/autopilot",         group: "Navigate" },
  { label: "Win-Back",           icon: Repeat2,         path: "/opportunities",     group: "Navigate" },
  { label: "Win/Loss Analysis",  icon: TrendingDown,    path: "/win-loss",          group: "Navigate" },
  { label: "Refer & Earn",       icon: Gift,            path: "/referral",          group: "Navigate" },
  { label: "Revenue",            icon: DollarSign,      path: "/revenue",           group: "Navigate" },
  { label: "Reviews & Referrals",icon: Star,            path: "/reviews-referrals", group: "Navigate" },
  { label: "Quote Doctor",       icon: Zap,             path: "/quote-doctor",      group: "Navigate" },
  { label: "Voice-to-Quote",     icon: Wand2,           path: "/walkthrough-ai",    group: "Navigate" },
  { label: "Sales Assistant",    icon: Bot,             path: "/ai-assistant",      group: "Navigate" },
  { label: "Handle Objections",  icon: Target,          path: "/closing-assistant", group: "Navigate" },
  { label: "Automations",        icon: Cpu,             path: "/automations",       group: "Navigate" },
  { label: "Pricing Engine",     icon: Brain,           path: "/pricing-logic",     group: "Navigate" },
  { label: "Account Settings",   icon: Settings,        path: "/account-settings",  group: "Navigate" },
  { label: "Team Members",       icon: UserCog,         path: "/employees",         group: "Navigate" },
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
  "/follow-ups": "Follow-Ups", "/revenue": "Revenue", "/growth": "Growth Hub",
  "/opportunities": "Win-Back", "/lead-finder": "Lead Finder",
  "/lead-capture": "Lead Capture", "/booking-widget": "Booking Widget", "/reactivation": "Win-Back",
  "/email-sequences": "Email Sequences", "/reviews-referrals": "Reviews & Referrals",
  "/weekly-recap": "Weekly Recap", "/tasks-queue": "Tasks Queue",
  "/autopilot": "Autopilot", "/automations": "Automations", "/ai-assistant": "Sales Assistant",
  "/walkthrough-ai": "Voice-to-Quote", "/intake-requests": "Quote Requests",
  "/closing-assistant": "Handle Objections", "/sales-strategy": "Sales Strategy",
  "/commercial-quote": "Commercial Quote", "/file-library": "File Library",
  "/toolkit": "Toolkit", "/pro-setup": "Setup Checklist",
  "/account-settings": "Account Settings", "/qbo-settings": "QuickBooks",
};

const PRO_ROUTES = [
  "/customers", "/jobs", "/calendar", "/growth", "/opportunities", "/ai-assistant",
  "/lead-finder", "/lead-capture", "/booking-widget", "/revenue", "/closing-assistant",
  "/commercial-quote", "/reactivation", "/win-loss", "/automations", "/sales-strategy",
  "/weekly-recap", "/tasks-queue", "/reviews-referrals", "/qbo-settings",
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

/* ─── Sidebar nav helper ─────────────────────────────────────────────────── */

function renderNavItems(
  items: NavItem[],
  props: {
    enabled: boolean;
    intakeNewCount: number;
    quoteResponseCount: number;
    isPro: boolean;
    setSidebarOpen: (v: boolean) => void;
    t: (k: string) => string;
  }
) {
  return items.map((item) => (
    <NavItemWithTooltip key={item.to} item={item} {...props} />
  ));
}

export function Layout() {
  const { user, business } = useAuth();
  const { isPro } = useSubscription();
  const { isCompleted, isDismissed, startTour, resetTour } = useWalkthrough();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(() => {
    try { return localStorage.getItem(SETTINGS_NAV_KEY) === "true"; } catch { return false; }
  });
  const [toolsOpen, setToolsOpen] = useState(() => {
    try { return localStorage.getItem("quotepro_nav_tools_open") === "true"; } catch { return false; }
  });
  const [navTooltipsEnabled, setNavTooltipsEnabled] = useState(() => {
    try { return localStorage.getItem(NAV_TOOLTIPS_KEY) !== "false"; } catch { return true; }
  });

  const toggleSettingsNav = () => {
    setSettingsOpen((prev) => {
      const next = !prev;
      try { localStorage.setItem(SETTINGS_NAV_KEY, String(next)); } catch {}
      return next;
    });
  };

  const toggleToolsNav = () => {
    setToolsOpen((prev) => {
      const next = !prev;
      try { localStorage.setItem("quotepro_nav_tools_open", String(next)); } catch {}
      return next;
    });
  };
  const mainRef = useRef<HTMLElement>(null);

  const { data: intakeCount } = useQuery<{ count: number; newCount: number; reviewCount: number }>({
    queryKey: ["/api/intake-requests/count"],
    refetchInterval: 60_000,
  });
  const intakeNewCount = intakeCount?.count ?? 0; // count = pending + needs_review (both need attention)

  const { data: quoteCountData } = useQuery<{ count: number }>({
    queryKey: ["/api/quotes/count"],
    refetchInterval: 120_000,
  });
  const quoteCount = quoteCountData?.count ?? 0;
  const featureUnlocked = quoteCount >= 5;

  const QP_QUOTES_CHECKED_KEY = "qp_quotes_last_checked";
  const [lastQuotesChecked] = useState<string>(() => {
    try { return localStorage.getItem(QP_QUOTES_CHECKED_KEY) || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); } catch { return new Date(0).toISOString(); }
  });
  const { data: quoteResponseData, refetch: refetchResponseCount } = useQuery<{ count: number }>({
    queryKey: ["/api/quotes/response-count", lastQuotesChecked],
    queryFn: async () => {
      const res = await fetch(`/api/quotes/response-count?since=${encodeURIComponent(lastQuotesChecked)}`, { credentials: "include" });
      if (!res.ok) return { count: 0 };
      return res.json();
    },
    refetchInterval: 60_000,
  });
  const quoteResponseCount = quoteResponseData?.count ?? 0;

  useEffect(() => {
    if (location.pathname === "/quotes" || location.pathname.startsWith("/quotes/")) {
      try {
        const now = new Date().toISOString();
        localStorage.setItem(QP_QUOTES_CHECKED_KEY, now);
        refetchResponseCount();
      } catch {}
    }
  }, [location.pathname]);

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

  const navItemProps = {
    enabled: navTooltipsEnabled,
    intakeNewCount,
    quoteResponseCount,
    isPro,
    setSidebarOpen,
    t,
  };

  return (
    <AIToastProvider>
      {/* ── App window chrome ── */}
      <div
        style={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: "var(--r14)",
          overflow: "hidden",
          boxShadow: "var(--shadow-window)",
          background: "var(--sys-bg)",
        }}
      >
        {/* ── TITLEBAR (full-width, spans sidebar + content) ── */}
        <div
          style={{
            height: "44px",
            background: "rgba(235,235,240,0.85)",
            backdropFilter: "saturate(200%) blur(30px)",
            WebkitBackdropFilter: "saturate(200%) blur(30px)",
            borderBottom: "0.5px solid var(--border)",
            display: "flex",
            alignItems: "center",
            paddingLeft: "16px",
            paddingRight: "10px",
            position: "relative",
            flexShrink: 0,
          }}
        >
          {/* Traffic lights */}
          <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
            {(["#ff5f57", "#febc2e", "#28c840"] as const).map((color) => (
              <div
                key={color}
                style={{
                  width: "12px", height: "12px", borderRadius: "50%",
                  background: color,
                  boxShadow: "0 0 0 0.5px rgba(0,0,0,0.12)",
                  cursor: "default",
                  transition: "filter .12s",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.filter = "brightness(0.88)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.filter = ""; }}
              />
            ))}
          </div>

          {/* Mobile hamburger */}
          <button
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
            style={{
              marginLeft: "10px", background: "none", border: "none",
              cursor: "pointer", padding: "4px", borderRadius: "6px",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--t3)",
            }}
          >
            <Menu style={{ width: "16px", height: "16px" }} />
          </button>

          {/* Centered page title */}
          <span
            style={{
              position: "absolute", left: "50%", transform: "translateX(-50%)",
              fontSize: "13px", fontWeight: 600, color: "var(--t2)",
              letterSpacing: "-0.2px", whiteSpace: "nowrap", pointerEvents: "none",
            }}
          >
            {currentTitle}
          </span>

          {/* Right icon buttons */}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "2px" }}>
            {[
              { icon: Search, onClick: () => setCmdOpen(true),            title: "Search (⌘K)" },
              { icon: Plus,   onClick: () => navigate("/quotes/new"),     title: "New Quote"   },
              { icon: Bell,   onClick: () => {},                          title: "Notifications" },
            ].map(({ icon: Icon, onClick, title }) => (
              <button
                key={title}
                onClick={onClick}
                title={title}
                style={{
                  width: "28px", height: "22px", borderRadius: "6px",
                  background: "none", border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--t3)", transition: "background .1s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.07)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
              >
                <Icon style={{ width: "13px", height: "13px" }} />
              </button>
            ))}
          </div>
        </div>

        {/* ── Body row: sidebar + content ── */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* Mobile overlay */}
          {sidebarOpen ? (
            <div
              className="fixed inset-0 z-40 lg:hidden"
              style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }}
              onClick={() => setSidebarOpen(false)}
            />
          ) : null}

          {/* ── SIDEBAR ── */}
          <aside
            className={`
              fixed inset-y-0 left-0 z-50 flex flex-col
              transform transition-transform duration-200 ease-out
              lg:translate-x-0 lg:static lg:z-auto
              ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
            `}
            style={{
              width: "214px",
              background: "var(--sidebar-blur)",
              backdropFilter: "saturate(200%) blur(30px)",
              WebkitBackdropFilter: "saturate(200%) blur(30px)",
              borderRight: "0.5px solid var(--border)",
              flexShrink: 0,
            }}
          >
            {/* ── App identity block ── */}
            <div style={{ padding: "14px 12px 10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                <div
                  style={{
                    width: "36px", height: "36px", borderRadius: "9px",
                    background: "linear-gradient(150deg, #007aff 0%, #32ade6 60%, #5ac8fa 100%)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                    boxShadow: "0 1px 4px rgba(0,0,0,0.18), 0 0 0 0.5px rgba(0,0,0,0.08)",
                  }}
                >
                  <Zap style={{ width: "18px", height: "18px", color: "white" }} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "-0.25px", color: "var(--t1)", lineHeight: 1.25, margin: 0 }}>
                    QuotePro
                  </p>
                  <p style={{ fontSize: "10px", color: "var(--t4)", lineHeight: 1.3, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {user?.email || business?.companyName || "My Account"}
                  </p>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="lg:hidden"
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--t4)", padding: "2px", borderRadius: "4px", flexShrink: 0 }}
                >
                  <X style={{ width: "14px", height: "14px" }} />
                </button>
              </div>
            </div>

            {/* ── Search field ── */}
            <div style={{ padding: "0 10px 8px" }}>
              <button
                onClick={() => setCmdOpen(true)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: "7px",
                  padding: "5px 10px", borderRadius: "var(--r8)",
                  background: "rgba(0,0,0,0.06)", border: "none",
                  cursor: "pointer", fontSize: "12px", color: "var(--t3)",
                  textAlign: "left", transition: "background .1s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.09)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.06)"; }}
              >
                <Search style={{ width: "13px", height: "13px", flexShrink: 0 }} />
                <span style={{ flex: 1 }}>Search</span>
                <span style={{ fontSize: "10px", color: "var(--t4)", opacity: 0.8 }}>⌘K</span>
              </button>
            </div>

            {/* ── Navigation ── */}
            <nav style={{ flex: 1, padding: "2px 8px 8px", overflowY: "auto" }}>

              {/* Dashboard */}
              <div style={{ marginBottom: "4px" }}>
                <NavItemWithTooltip
                  item={{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, shortcut: "G H", description: "Your real-time command center — jobs today, pipeline health, and the most important actions." }}
                  {...navItemProps}
                />
              </div>

              <NavDivider />

              {/* Pipeline */}
              <div style={{ marginBottom: "4px" }}>
                <SectionLabel label="Pipeline" />
                {renderNavItems(PIPELINE_NAV_ITEMS, navItemProps)}
              </div>

              <NavDivider />

              {/* Operations */}
              <div style={{ marginBottom: "4px" }}>
                <SectionLabel label="Operations" />
                {renderNavItems(OPERATIONS_NAV_ITEMS, navItemProps)}
              </div>

              <NavDivider />

              {/* Growth */}
              <div style={{ marginBottom: "4px" }}>
                <SectionLabel label="Growth" />
                {renderNavItems(GROWTH_NAV_ITEMS, navItemProps)}
              </div>

              <NavDivider />

              {/* Tools — collapsible */}
              <div style={{ marginBottom: "4px" }}>
                <CollapsibleSectionLabel label="Tools" open={toolsOpen} onToggle={toggleToolsNav} />
                {toolsOpen ? (
                  <div>
                    {renderNavItems(TOOLS_NAV_ITEMS, navItemProps)}
                  </div>
                ) : null}
              </div>

            </nav>

            {/* ── Sidebar footer ── */}
            <div style={{ flexShrink: 0 }}>

              {/* Progressive feature disclosure */}
              {!featureUnlocked ? (
                <div style={{ padding: "0 10px 8px" }}>
                  <div style={{
                    borderRadius: "10px", padding: "10px 12px",
                    background: "linear-gradient(135deg, rgba(59,130,246,0.06), rgba(99,102,241,0.06))",
                    border: "1px solid rgba(99,102,241,0.15)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                      <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#6366f1", flexShrink: 0 }} />
                      <span style={{ fontSize: "10px", fontWeight: 700, color: "#818cf8" }}>More features unlock soon</span>
                    </div>
                    <div style={{ display: "flex", gap: "3px", marginBottom: "6px" }}>
                      {[...Array(5)].map((_, i) => (
                        <div key={i} style={{
                          flex: 1, height: "3px", borderRadius: "2px",
                          background: i < quoteCount ? "#6366f1" : "rgba(99,102,241,0.12)",
                          transition: "background 0.3s",
                        }} />
                      ))}
                    </div>
                    <p style={{ fontSize: "10px", color: "#94a3b8", lineHeight: 1.5, margin: 0 }}>
                      {quoteCount === 0
                        ? "Send your first quote to get started"
                        : `${5 - quoteCount} more quote${5 - quoteCount !== 1 ? "s" : ""} to unlock Growth, AI & Automations`}
                    </p>
                  </div>
                </div>
              ) : null}

              {/* Settings — collapsible */}
              <div style={{ padding: "0 8px 2px" }}>
                <button
                  onClick={toggleSettingsNav}
                  className="nav-item w-full"
                  style={{ color: settingsOpen ? "var(--t2)" : "var(--t4)" }}
                >
                  <span className="nav-icon-sq">
                    <Settings style={{ width: "13px", height: "13px" }} />
                  </span>
                  <span style={{ fontSize: "12.5px", flex: 1 }}>Settings</span>
                  <ChevronDown style={{
                    width: "11px", height: "11px", color: "var(--t4)",
                    transform: settingsOpen ? "rotate(0deg)" : "rotate(-90deg)",
                    transition: "transform 0.18s ease",
                  }} />
                </button>
                {settingsOpen ? (
                  <div style={{ marginTop: "2px", marginBottom: "2px" }}>
                    {renderNavItems(SETTINGS_NAV_ITEMS, navItemProps)}
                  </div>
                ) : null}
              </div>

              {/* Product Tour + Help */}
              <div style={{ padding: "0 8px 4px" }}>
                <NavLink
                  to="/referral"
                  className={({ isActive }: { isActive: boolean }) => `nav-item${isActive ? " nav-item-active" : ""}`}
                  onClick={() => setSidebarOpen(false)}
                  style={{ color: "var(--t4)" }}
                >
                  <span className="nav-icon-sq"><Gift style={{ width: "13px", height: "13px", color: "#16a34a" }} /></span>
                  <span style={{ fontSize: "12.5px", color: "#16a34a", fontWeight: 600 }}>Refer &amp; Earn</span>
                </NavLink>
                <button onClick={() => { resetTour(); setSidebarOpen(false); }} className="nav-item w-full" style={{ color: "var(--t4)" }}>
                  <span className="nav-icon-sq"><BookOpen style={{ width: "13px", height: "13px" }} /></span>
                  <span style={{ fontSize: "12.5px" }}>{t("nav.productTour")}</span>
                </button>
                <button onClick={() => { setSupportOpen(true); setSidebarOpen(false); }} className="nav-item w-full" style={{ color: "var(--t4)" }}>
                  <span className="nav-icon-sq"><LifeBuoy style={{ width: "13px", height: "13px" }} /></span>
                  <span style={{ fontSize: "12.5px" }}>Help &amp; Support</span>
                </button>
              </div>

              <AppStoreQR />

              {/* Upgrade CTA */}
              {!isPro ? (
                <div style={{ padding: "0 10px 10px" }}>
                  <button
                    onClick={() => navigate("/upgrade?source=sidebar")}
                    style={{
                      width: "100%", padding: "12px 14px", borderRadius: "12px",
                      background: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 60%, #2563eb 100%)",
                      border: "none", cursor: "pointer", textAlign: "left",
                      transition: "opacity .1s",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.88"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                      <Crown style={{ width: "13px", height: "13px", color: "#fbbf24" }} />
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "white" }}>Upgrade to Growth</span>
                    </div>
                    <p style={{ fontSize: "10px", color: "rgba(147,197,253,0.9)", margin: "0 0 6px", lineHeight: 1.45 }}>
                      Unlimited quotes, AI tools, CRM &amp; more
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", fontWeight: 600, color: "rgba(147,197,253,0.8)" }}>
                      <span>From $19/mo</span>
                      <span style={{ opacity: 0.5 }}>·</span>
                      <span>7-day free trial</span>
                      <ArrowUpRight style={{ width: "10px", height: "10px", marginLeft: "auto" }} />
                    </div>
                  </button>
                </div>
              ) : null}

              {/* ── User row ── */}
              <div style={{ borderTop: "0.5px solid var(--sep)", padding: "8px 10px 10px" }}>
                <button
                  onClick={() => { navigate("/account-settings"); setSidebarOpen(false); }}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: "8px",
                    padding: "5px 6px", borderRadius: "var(--r8)",
                    background: "none", border: "none", cursor: "pointer", textAlign: "left",
                    transition: "background .1s",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.05)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
                >
                  <div style={{
                    width: "28px", height: "28px", borderRadius: "50%",
                    background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "10px", fontWeight: 700, color: "white", flexShrink: 0,
                  }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "12px", fontWeight: 500, color: "var(--t1)", lineHeight: 1.25, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {user?.firstName} {user?.lastName}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#28cd41", flexShrink: 0 }} />
                      <p style={{ fontSize: "10px", color: "var(--t4)", lineHeight: 1.3, margin: 0 }}>
                        {isPro ? "Pro plan · active" : "Free plan · active"}
                      </p>
                    </div>
                  </div>
                </button>
              </div>

            </div>
          </aside>

          {/* ── Main content area ── */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--win-bg)" }}>

            {/* ── CONTENT TOOLBAR ── */}
            <div
              style={{
                height: "44px",
                background: "rgba(245,245,245,0.90)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                borderBottom: "0.5px solid var(--sep)",
                display: "flex",
                alignItems: "center",
                padding: "0 20px",
                flexShrink: 0,
                gap: "8px",
              }}
            >
              {/* Page title */}
              <span style={{ fontSize: "14px", fontWeight: 600, letterSpacing: "-0.3px", color: "var(--t1)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {currentTitle}
              </span>

              {/* Location switcher (only for multi-location Pro users) */}
              <div className="hidden md:block">
                <LocationSwitcher />
              </div>

              {/* Ghost: search ⌘K */}
              <button
                onClick={() => setCmdOpen(true)}
                className="hidden lg:flex items-center gap-1.5"
                style={{
                  background: "rgba(0,0,0,0.055)", color: "var(--t2)",
                  borderRadius: "var(--r6)", padding: "5px 12px", fontSize: "12px",
                  border: "none", cursor: "pointer", transition: "background .1s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.085)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.055)"; }}
              >
                <Search style={{ width: "12px", height: "12px" }} />
                <span>Search</span>
                <kbd style={{ fontSize: "10px", marginLeft: "4px", opacity: 0.55, fontFamily: "system-ui" }}>⌘K</kbd>
              </button>

              {/* Primary: New Quote */}
              <button
                onClick={() => { navigate("/quotes/new"); setSidebarOpen(false); }}
                className="hidden sm:flex items-center gap-1.5"
                style={{
                  background: "var(--blue)", color: "white",
                  borderRadius: "var(--r6)", padding: "5px 12px",
                  fontSize: "12px", fontWeight: 600,
                  border: "none", cursor: "pointer",
                  boxShadow: "var(--shadow-btn-blue)",
                  transition: "background .1s, transform .1s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "var(--blue-d)";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-0.5px)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "var(--blue)";
                  (e.currentTarget as HTMLElement).style.transform = "";
                }}
              >
                <Plus style={{ width: "12px", height: "12px" }} />
                New Quote
              </button>
            </div>

            {/* ── Scrollable content ── */}
            <main ref={mainRef} className="flex-1 overflow-y-auto" style={{ padding: "28px 24px 40px" }}>
              <TrialCountdownBanner />
              <AnnualUpgradeBanner />
              <QuoteUsageBanner />
              <div className="max-w-7xl mx-auto animate-fade-in">
                <Outlet />
              </div>
            </main>

          </div>
        </div>
      </div>

      {/* ── Overlays (outside window chrome so they cover full viewport) ── */}
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
      <WalkthroughOverlay />
      {location.pathname !== "/ai-assistant" && <AIChatBubble />}
      <NPSSurvey />
      {supportOpen && <SupportModal onClose={() => setSupportOpen(false)} />}
      <UpgradeModal />
    </AIToastProvider>
  );
}
