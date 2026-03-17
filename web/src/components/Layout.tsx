import { useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useSubscription } from "../lib/subscription";
import {
  LayoutDashboard,
  FileText,
  Users,
  Briefcase,
  Settings,
  LogOut,
  Menu,
  X,
  Zap,
  Bell,
  Bot,
  TrendingUp,
  Target,
  Wand2,
  Crown,
  Lock,
  ArrowUpRight,
  Wrench,
  Inbox,
  Radio,
  Cpu,
  Link2,
  DollarSign,
  Building2,
  RefreshCw,
  CheckSquare,
  BarChart2,
  Star,
  Layers,
} from "lucide-react";

const PRO_ROUTES = [
  "/customers", "/jobs", "/growth", "/opportunities", "/ai-assistant",
  "/lead-finder", "/lead-capture", "/revenue", "/closing-assistant",
  "/commercial-quote", "/reactivation", "/automations", "/sales-strategy",
  "/weekly-recap", "/tasks-queue", "/reviews-referrals",
];

const navSections = [
  {
    label: null,
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Manage",
    items: [
      { to: "/quotes", label: "Quotes", icon: FileText },
      { to: "/commercial-quote", label: "Commercial Quote", icon: Building2, pro: true },
      { to: "/customers", label: "Customers", icon: Users, pro: true },
      { to: "/jobs", label: "Jobs", icon: Briefcase, pro: true },
    ],
  },
  {
    label: "Grow",
    items: [
      { to: "/revenue", label: "Revenue", icon: DollarSign, pro: true },
      { to: "/growth", label: "Growth Hub", icon: TrendingUp, pro: true },
      { to: "/weekly-recap", label: "Weekly Recap", icon: BarChart2, pro: true },
      { to: "/tasks-queue", label: "Tasks Queue", icon: CheckSquare, pro: true },
      { to: "/follow-ups", label: "Follow-ups", icon: Bell },
      { to: "/reactivation", label: "Reactivation", icon: RefreshCw, pro: true },
      { to: "/reviews-referrals", label: "Reviews & Referrals", icon: Star, pro: true },
      { to: "/lead-finder", label: "Lead Finder", icon: Radio, pro: true },
      { to: "/opportunities", label: "Opportunities", icon: Target, pro: true },
    ],
  },
  {
    label: "AI Tools",
    items: [
      { to: "/closing-assistant", label: "Closing Assistant", icon: Zap, pro: true },
      { to: "/sales-strategy", label: "Sales Strategy", icon: Layers, pro: true },
      { to: "/automations", label: "Automations Hub", icon: Cpu, pro: true },
      { to: "/ai-assistant", label: "Sales Assistant", icon: Bot, pro: true },
      { to: "/walkthrough-ai", label: "Quote from Notes", icon: Wand2 },
      { to: "/intake-requests", label: "Quote Requests", icon: Inbox },
      { to: "/lead-capture", label: "Lead Capture Link", icon: Link2, pro: true },
    ],
  },
  {
    label: "Resources",
    items: [
      { to: "/toolkit", label: "Toolkit", icon: Wrench },
    ],
  },
];

export function Layout() {
  const { user, business, logout } = useAuth();
  const { isPro } = useSubscription();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const initials =
    (user?.firstName?.[0] || "") + (user?.lastName?.[0] || "") || "U";

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {sidebarOpen ? (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-[260px] bg-white border-r border-slate-200/80 flex flex-col
          transform transition-transform duration-200 ease-in-out
          lg:translate-x-0 lg:static lg:z-auto
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-slate-100 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-sm shadow-primary-600/20">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg text-slate-900 tracking-tight">QuotePro</span>
          {isPro ? (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gradient-to-r from-amber-400 to-orange-500 text-white uppercase tracking-wider">Pro</span>
          ) : null}
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden p-1 text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-3 overflow-y-auto">
          {navSections.map((section, si) => (
            <div key={si} className={si > 0 ? "mt-5" : ""}>
              {section.label ? (
                <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {section.label}
                </p>
              ) : null}
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 group ${
                        isActive
                          ? "bg-primary-50 text-primary-700 shadow-sm shadow-primary-600/5"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`
                    }
                  >
                    <item.icon className="w-[18px] h-[18px] shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {item.pro && !isPro ? (
                      <Lock className="w-3.5 h-3.5 text-slate-300 group-hover:text-primary-400 transition-colors" />
                    ) : null}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {!isPro ? (
          <div className="mx-3 mb-3">
            <button
              onClick={() => navigate("/upgrade?source=sidebar")}
              className="w-full p-3 rounded-xl bg-gradient-to-br from-primary-600 via-primary-700 to-violet-700 text-white text-left relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.15),transparent_50%)] group-hover:opacity-75 transition-opacity" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-1">
                  <Crown className="w-4 h-4 text-amber-300" />
                  <span className="text-sm font-bold">Upgrade to Pro</span>
                </div>
                <p className="text-[11px] text-primary-200 leading-tight">
                  Unlimited quotes, AI tools, CRM, and more
                </p>
                <div className="flex items-center gap-1 mt-2 text-xs text-primary-200 font-medium">
                  <span>$19.99/mo</span>
                  <span className="text-primary-300">&middot;</span>
                  <span>7-day free trial</span>
                  <ArrowUpRight className="w-3 h-3 ml-auto" />
                </div>
              </div>
            </button>
          </div>
        ) : null}

        <div className="p-3 border-t border-slate-100 shrink-0">
          <NavLink
            to="/settings"
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 mb-1 ${
                isActive
                  ? "bg-primary-50 text-primary-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`
            }
          >
            <Settings className="w-[18px] h-[18px] shrink-0" />
            Settings
          </NavLink>

          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors cursor-default">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white flex items-center justify-center text-xs font-semibold shadow-sm">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate leading-tight">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-[11px] text-slate-500 truncate leading-tight">
                {business?.companyName || ""}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-[13px] text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white/80 backdrop-blur-md border-b border-slate-200/60 flex items-center px-4 lg:px-6 shrink-0 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
