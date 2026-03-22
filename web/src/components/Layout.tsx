import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import AppStoreQR from "./AppStoreQR";
import { useAuth } from "../lib/auth";
import { useSubscription } from "../lib/subscription";
import { useTheme } from "../lib/theme";
import { useWalkthrough } from "../lib/walkthrough";
import { WalkthroughOverlay } from "./WalkthroughOverlay";
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
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, shortcut: "G H" },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/quotes", label: "Quotes", icon: FileText, shortcut: "G Q" },
      { to: "/customers", label: "Customers", icon: Users, pro: true },
      { to: "/jobs", label: "Jobs", icon: Briefcase, pro: true },
      { to: "/employees", label: "Team Members", icon: UserCog },
      { to: "/calendar", label: "Schedule", icon: CalendarDays, pro: true },
      { to: "/commercial-quote", label: "Commercial Quote", icon: Building2, pro: true },
      { to: "/intake-requests", label: "Quote Requests", icon: Inbox },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { to: "/pricing-logic", label: "Pricing Engine", icon: Brain },
      { to: "/quote-preferences", label: "Quote Settings", icon: Sliders },
      { to: "/settings", label: "Price Settings", icon: Settings },
      { to: "/closing-assistant", label: "Objection Assistant", icon: Zap, pro: true },
      { to: "/sales-strategy", label: "Sales Strategy", icon: Layers, pro: true },
      { to: "/walkthrough-ai", label: "Quote from Notes", icon: Wand2 },
      { to: "/ai-assistant", label: "Sales Assistant", icon: Bot, pro: true },
    ],
  },
  {
    label: "Growth",
    items: [
      { to: "/revenue", label: "Revenue", icon: DollarSign, pro: true },
      { to: "/growth", label: "Growth Hub", icon: TrendingUp, pro: true },
      { to: "/follow-ups", label: "Follow-ups", icon: Bell },
      { to: "/opportunities", label: "Opportunities", icon: Target, pro: true },
      { to: "/lead-finder", label: "Lead Radar", icon: Radio, pro: true, beta: true },
      { to: "/lead-capture", label: "Lead Capture", icon: Link2, pro: true },
      { to: "/reactivation", label: "Reactivation", icon: RefreshCw, pro: true },
      { to: "/email-sequences", label: "Email Sequences", icon: MailOpen },
      { to: "/reviews-referrals", label: "Reviews & Referrals", icon: Star, pro: true },
      { to: "/weekly-recap", label: "Weekly Recap", icon: BarChart2, pro: true },
      { to: "/tasks-queue", label: "Tasks Queue", icon: CheckSquare, pro: true },
    ],
  },
  {
    label: "Workspace",
    items: [
      { to: "/automations", label: "Automations", icon: Cpu, pro: true },
      { to: "/file-library", label: "File Library", icon: FolderOpen },
      { to: "/toolkit", label: "Toolkit", icon: Wrench },
      { to: "/pro-setup", label: "Setup Checklist", icon: Clipboard },
    ],
  },
  {
    label: "Integrations",
    beta: true,
    items: [
      { to: "/qbo-settings", label: "QuickBooks Online", icon: BookOpen, pro: true },
      { to: "/jobber", label: "Jobber", icon: PlugZap, pro: true },
    ],
  },
];

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

export function Layout() {
  const { user, business } = useAuth();
  const { isPro } = useSubscription();
  const { theme, toggleTheme } = useTheme();
  const { isCompleted, isDismissed, startTour, resetTour } = useWalkthrough();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  const { data: intakeCount } = useQuery<{ count: number; newCount: number; reviewCount: number }>({
    queryKey: ["/api/intake-requests/count"],
    refetchInterval: 60_000,
  });
  const intakeNewCount = intakeCount?.newCount ?? 0;

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [location.pathname]);

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
          <span className="font-bold text-[15px] tracking-tight" style={{ color: "#09090b" }}>
            QuotePro
          </span>
          <span
            className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)", color: "white", letterSpacing: "0.08em" }}
          >
            AI
          </span>
          {isPro ? (
            <span
              className="ml-auto text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white" }}
            >
              Pro
            </span>
          ) : null}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden ml-auto p-1 rounded-md text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Command palette trigger */}
        <div className="px-3 pt-3 pb-2 shrink-0">
          <button
            onClick={() => setCmdOpen(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors text-left group"
            style={{ background: "#F4F4F5", border: "1px solid rgba(0,0,0,0.06)" }}
          >
            <Search className="w-3.5 h-3.5 shrink-0" style={{ color: "#a1a1aa" }} />
            <span className="flex-1 text-[12.5px]" style={{ color: "#a1a1aa" }}>Search or jump to...</span>
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
                  {section.label}
                  {section.beta ? (
                    <span className="px-1 py-0.5 rounded text-[8px] font-bold bg-rose-500 text-white uppercase tracking-wider leading-none">Beta</span>
                  ) : null}
                </p>
              ) : null}
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `nav-item w-full ${isActive ? "nav-item-active" : ""}`
                    }
                  >
                    <item.icon
                      className="shrink-0"
                      style={{ width: "15px", height: "15px", opacity: 0.85 }}
                    />
                    <span className="flex-1 text-[13px]">{item.label}</span>
                    {item.to === "/intake-requests" && intakeNewCount > 0 ? (
                      <span
                        className="flex items-center justify-center rounded-full bg-red-500 text-white font-bold leading-none"
                        style={{ minWidth: "18px", height: "18px", fontSize: "10px", padding: "0 4px" }}
                      >
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
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Product Tour */}
        <div className="px-3 pb-1 shrink-0">
          <button
            onClick={() => { resetTour(); setSidebarOpen(false); }}
            className="nav-item w-full"
            style={{ color: "#a1a1aa" }}
          >
            <BookOpen style={{ width: "14px", height: "14px" }} />
            <span style={{ fontSize: "12.5px" }}>Product Tour</span>
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
            <button
              onClick={(e) => { e.stopPropagation(); toggleTheme(); }}
              className="p-1.5 rounded-md transition-colors shrink-0"
              style={{ color: "#a1a1aa" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#52525b"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#a1a1aa"; }}
              title={theme === "dark" ? "Light mode" : "Dark mode"}
            >
              {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
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
          <div className="max-w-7xl mx-auto animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Command Palette */}
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />

      <WalkthroughOverlay />
    </div>
  );
}
