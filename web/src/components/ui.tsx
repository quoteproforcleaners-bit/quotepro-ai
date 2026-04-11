import { type ReactNode, useState, useEffect, useRef } from"react";
import { useNavigate } from"react-router-dom";
import {
 ArrowLeft,
 X,
 AlertCircle,
 FileText,
 Users,
 Briefcase,
 Inbox,
 ChevronRight,
 type LucideIcon,
} from"lucide-react";

export function PageHeader({
 title,
 subtitle,
 backTo,
 actions,
 badge,
}: {
 title: string;
 subtitle?: string;
 backTo?: string;
 actions?: ReactNode;
 badge?: ReactNode;
}) {
 const navigate = useNavigate();
 return (
 <div className="mb-6">
 {backTo ? (
 <button
 onClick={() => navigate(backTo)}
 className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 mb-3 transition-colors"
 >
 <ArrowLeft className="w-4 h-4"/>
 Back
 </button>
 ) : null}
 <div className="flex items-start justify-between gap-4">
 <div>
 <div className="flex items-center gap-3">
 <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
 {badge}
 </div>
 {subtitle ? (
 <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
 ) : null}
 </div>
 {actions ? <div className="flex items-center gap-2 shrink-0">{actions}</div> : null}
 </div>
 </div>
 );
}

export function Card({
 children,
 className ="",
 padding = true,
 variant ="default",
 onClick,
}: {
 children: ReactNode;
 className?: string;
 padding?: boolean;
 variant?:"default"|"glass"|"interactive"|"elevated";
 onClick?: () => void;
}) {
 const cls: Record<string, string> = {
  default:     "card-apple",
  glass:       "glass-card rounded-xl",
  interactive: "card-apple-clickable",
  elevated:    "card-apple",
 };
 return (
 <div
  onClick={onClick}
  className={`${cls[variant] ?? "card-apple"} ${padding ? "p-5 lg:p-6" : ""} ${className}`}
 >
 {children}
 </div>
 );
}

export function CardHeader({
 title,
 icon: Icon,
 actions,
 badge: badgeEl,
}: {
 title: string;
 icon?: LucideIcon;
 actions?: ReactNode;
 badge?: ReactNode;
}) {
 return (
 <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
 <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
 {Icon ? (
 <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "rgba(0,0,0,0.05)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
 <Icon style={{ width: "14px", height: "14px", color: "var(--t3)" }} />
 </div>
 ) : null}
 <h2 style={{ fontSize: "13px", fontWeight: 600, color: "var(--t1)", margin: 0 }}>{title}</h2>
 {badgeEl}
 </div>
 {actions}
 </div>
 );
}

export function HeroCard({
 children,
 variant ="blue",
 className ="",
}: {
 children: ReactNode;
 variant?:"blue"|"warm"|"emerald"|"violet"|"dark";
 className?: string;
}) {
 const gradients = {
 blue:"gradient-hero",
 warm:"gradient-hero-warm",
 emerald:"gradient-hero-emerald",
 violet:"gradient-hero-violet",
 dark:"glass-dark",
 };
 return (
 <div className={`${gradients[variant]} rounded-2xl p-6 lg:p-8 text-white relative overflow-hidden ${className}`}>
 <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.1)_0%,transparent_60%)]"/>
 <div className="relative z-10">{children}</div>
 </div>
 );
}

const PILL_MAP: Record<string, string> = {
 draft:               "pill-neutral",
 expired:             "pill-neutral",
 inactive:            "pill-neutral",
 snoozed:             "pill-neutral",
 neutral:             "pill-neutral",
 sent:                "pill-info",
 info:                "pill-info",
 clicked:             "pill-info",
 lead:                "pill-info",
 viewed:              "pill-info",
 scheduled:           "pill-info",
 en_route:            "pill-teal",
 pending:             "pill-warning",
 warning:             "pill-warning",
 cold:                "pill-warning",
 cooling:             "pill-warning",
 "changes-requested": "pill-warning",
 in_progress:         "pill-warning",
 final_touches:       "pill-warning",
 accepted:            "pill-success",
 completed:           "pill-success",
 active:              "pill-success",
 success:             "pill-success",
 done:                "pill-success",
 service_started:     "pill-success",
 declined:            "pill-danger",
 canceled:            "pill-danger",
 error:               "pill-danger",
 critical:            "pill-danger",
 pro:                 "pill-purple",
 live:                "pill-success",
};

export function Badge({
 status,
 label,
 dot,
 size ="md",
}: {
 status: string;
 label?: string;
 dot?: boolean;
 size?:"sm"|"md";
}) {
 const pillClass = PILL_MAP[status] ?? "pill-neutral";
 const text = label || (status ? status.replace(/[-_]/g, " ") : "");
 return (
  <span
   className={`pill-apple ${pillClass}`}
   style={size === "sm" ? { padding: "1.5px 6px", fontSize: "9px" } : undefined}
  >
   {dot ? (
    <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "currentColor", opacity: 0.7, display: "inline-block", marginRight: "3px", verticalAlign: "middle" }} />
   ) : null}
   {text}
  </span>
 );
}

export function Button({
 children,
 variant ="primary",
 size ="md",
 icon: Icon,
 iconRight: IconRight,
 onClick,
 disabled,
 loading,
 type ="button",
 className ="",
 glow,
}: {
 children: ReactNode;
 variant?:"primary"|"secondary"|"ghost"|"danger"|"success"|"warning";
 size?:"xs"|"sm"|"md"|"lg";
 icon?: LucideIcon;
 iconRight?: LucideIcon;
 onClick?: () => void;
 disabled?: boolean;
 loading?: boolean;
 type?:"button"|"submit";
 className?: string;
 glow?: boolean;
}) {
 const variantCls: Record<string, string> = {
  primary:   "btn-primary-apple",
  secondary: "btn-secondary-apple",
  ghost:     "btn-secondary-apple",
  danger:    "btn-danger-apple",
  success:   "btn-success-apple",
  warning:   "btn-danger-apple",
 };
 const sizeSt: React.CSSProperties = size === "xs"
  ? { padding: "3px 8px",  fontSize: "11px" }
  : size === "sm"
  ? { padding: "4px 10px", fontSize: "11px" }
  : size === "lg"
  ? { padding: "7px 16px", fontSize: "13px" }
  : { padding: "5px 12px", fontSize: "12px" };
 const iconSz = size === "xs" || size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5";
 return (
  <button
   type={type}
   onClick={onClick}
   disabled={disabled || loading}
   className={`btn-apple ${variantCls[variant] ?? "btn-secondary-apple"} ${glow ? "animate-pulse-glow" : ""} ${className}`}
   style={sizeSt}
  >
   {loading ? (
    <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"/>
   ) : Icon ? (
    <Icon className={iconSz} />
   ) : null}
   {children}
   {IconRight ? <IconRight className={iconSz}/> : null}
  </button>
 );
}

export function Input({
 label,
 error,
 helper,
 ...props
}: {
 label?: string;
 error?: string;
 helper?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
 return (
  <div>
   {label ? (
    <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "var(--t2)", marginBottom: "5px" }}>
     {label}
    </label>
   ) : null}
   <input
    {...props}
    className={`input-apple ${error ? "input-apple-error" : ""} ${props.className ?? ""}`}
   />
   {helper && !error ? (
    <p style={{ fontSize: "11px", color: "var(--t4)", marginTop: "4px" }}>{helper}</p>
   ) : null}
   {error ? (
    <p style={{ fontSize: "11px", color: "var(--red)", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
     <AlertCircle style={{ width: "12px", height: "12px" }}/>
     {error}
    </p>
   ) : null}
  </div>
 );
}

export function Textarea({
 label,
 error,
 ...props
}: {
 label?: string;
 error?: string;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
 return (
  <div>
   {label ? (
    <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "var(--t2)", marginBottom: "5px" }}>
     {label}
    </label>
   ) : null}
   <textarea
    {...props}
    className={`input-apple ${error ? "input-apple-error" : ""} ${props.className ?? ""}`}
    style={{ resize: "none", ...(props.style ?? {}) }}
   />
   {error ? (
    <p style={{ fontSize: "11px", color: "var(--red)", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
     <AlertCircle style={{ width: "12px", height: "12px" }}/>
     {error}
    </p>
   ) : null}
  </div>
 );
}

export function Select({
 label,
 options,
 ...props
}: {
 label?: string;
 options: Array<{ value: string; label: string }>;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
 return (
  <div>
   {label ? (
    <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "var(--t2)", marginBottom: "5px" }}>
     {label}
    </label>
   ) : null}
   <select
    {...props}
    className={`input-apple ${props.className ?? ""}`}
    style={{ cursor: "pointer", ...(props.style ?? {}) }}
   >
    {options.map((o) => (
     <option key={o.value} value={o.value}>
      {o.label}
     </option>
    ))}
   </select>
  </div>
 );
}

export function Tabs({
 tabs,
 active,
 onChange,
 counts,
}: {
 tabs: (string | { id: string; label: string })[];
 active: string;
 onChange: (tab: string) => void;
 counts?: Record<string, number>;
}) {
 return (
 <div className="flex items-center gap-1 overflow-x-auto pb-px">
 {tabs.map((t) => {
 const id = typeof t ==="string"? t : t.id;
 const label = typeof t === "string" ? t.replace(/[-_]/g, " ") : t.label;
 return (
 <button
 key={id}
 onClick={() => onChange(id)}
 className={`px-3.5 py-2 rounded-lg text-sm font-medium capitalize whitespace-nowrap transition-all duration-150 ${
 active === id
 ?"bg-primary-50 text-primary-700 shadow-sm"
 :"text-slate-500 hover:bg-slate-50 hover:text-slate-700"
 }`}
 >
 {label}
 {counts && counts[id] !== undefined ? (
 <span
 className={`ml-1.5 text-xs ${
 active === id ?"text-primary-500":"text-slate-400"
 }`}
 >
 {counts[id]}
 </span>
 ) : null}
 </button>
 );
 })}
 </div>
 );
}

export function SegmentedControl({
 segments,
 active,
 onChange,
}: {
 segments: Array<{ value: string; label: string; icon?: LucideIcon }>;
 active: string;
 onChange: (value: string) => void;
}) {
 return (
  <div className="seg-ctrl-apple">
   {segments.map((s) => (
    <button
     key={s.value}
     onClick={() => onChange(s.value)}
     className={`seg-btn-apple ${active === s.value ? "seg-btn-apple-active" : ""}`}
    >
     {s.icon ? <s.icon style={{ width: "12px", height: "12px" }}/> : null}
     {s.label}
    </button>
   ))}
  </div>
 );
}

export function EmptyState({
 icon: Icon = Inbox,
 title,
 description,
 action,
}: {
 icon?: LucideIcon;
 title: string;
 description?: string;
 action?: ReactNode;
}) {
 return (
 <div className="flex flex-col items-center justify-center py-16 px-6">
 <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
 <Icon className="w-6 h-6 text-slate-400"/>
 </div>
 <p className="text-sm font-medium text-slate-900 mb-1">{title}</p>
 {description ? (
 <p className="text-sm text-slate-500 text-center max-w-sm">{description}</p>
 ) : null}
 {action ? <div className="mt-4">{action}</div> : null}
 </div>
 );
}

export function Spinner({ size ="md"}: { size?:"sm"|"md"|"lg"}) {
 const sizes = { sm:"w-4 h-4 border-2", md:"w-6 h-6 border-2", lg:"w-8 h-8 border-3"};
 return (
 <div className="flex items-center justify-center py-12">
 <div
 className={`${sizes[size]} border-primary-600 border-t-transparent rounded-full animate-spin`}
 />
 </div>
 );
}

export function StatCard({
 label,
 value,
 icon: Icon,
 trend,
 subtitle,
 color ="primary",
 onClick,
}: {
 label: string;
 value: string | number;
 icon: LucideIcon;
 trend?: { value: number; label: string };
 subtitle?: string;
 color?:"primary"|"violet"|"emerald"|"amber"|"red"|"cyan";
 onClick?: () => void;
}) {
 const iconBg: Record<string, string> = {
  primary: "rgba(0,122,255,0.10)",
  violet:  "rgba(88,86,214,0.10)",
  emerald: "rgba(40,205,65,0.10)",
  amber:   "rgba(255,149,0,0.10)",
  red:     "rgba(255,59,48,0.10)",
  cyan:    "rgba(90,200,250,0.13)",
 };
 const iconColor: Record<string, string> = {
  primary: "var(--blue)",
  violet:  "var(--indigo, #5856d6)",
  emerald: "var(--green)",
  amber:   "var(--orange)",
  red:     "var(--red)",
  cyan:    "var(--teal, #5ac8fa)",
 };
 const bg = iconBg[color]    ?? iconBg.primary;
 const ic = iconColor[color] ?? "var(--blue)";
 return (
  <div
   className={onClick ? "card-apple-clickable" : "card-apple"}
   style={{ padding: "14px 16px", cursor: onClick ? "pointer" : undefined }}
   onClick={onClick}
  >
   <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
    <div style={{ flex: 1, minWidth: 0 }}>
     <p style={{ fontSize: "11px", color: "var(--t3)", fontWeight: 400, margin: "0 0 6px" }}>{label}</p>
     <p style={{ fontSize: "22px", fontWeight: 700, letterSpacing: "-0.8px", fontVariantNumeric: "tabular-nums", color: "var(--t1)", margin: 0, lineHeight: 1.1 }}>
      {value}
     </p>
     {subtitle ? (
      <p style={{ fontSize: "11px", color: "var(--t4)", margin: "4px 0 0" }}>{subtitle}</p>
     ) : null}
     {trend ? (
      <p style={{ fontSize: "10px", fontWeight: 600, margin: "4px 0 0", color: trend.value >= 0 ? "var(--green)" : "var(--red)" }}>
       {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}% {trend.label}
      </p>
     ) : null}
    </div>
    <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: ic }}>
     <Icon style={{ width: "15px", height: "15px" }} />
    </div>
   </div>
  </div>
 );
}

export function ProgressBar({
 value,
 max = 100,
 color ="primary",
 size ="md",
 showLabel,
 striped,
 className ="",
}: {
 value: number;
 max?: number;
 color?:"primary"|"emerald"|"amber"|"red"|"violet";
 size?:"sm"|"md"|"lg";
 showLabel?: boolean;
 striped?: boolean;
 className?: string;
}) {
 const pct = Math.min(Math.max((value / max) * 100, 0), 100);
 const colors = {
 primary:"bg-primary-500",
 emerald:"bg-emerald-500",
 amber:"bg-amber-500",
 red:"bg-red-500",
 violet:"bg-violet-500",
 };
 const sizes = { sm:"h-1.5", md:"h-2.5", lg:"h-4"};
 return (
 <div className={className}>
 {showLabel ? (
 <div className="flex justify-between mb-1">
 <span className="text-xs text-slate-500">{Math.round(pct)}%</span>
 </div>
 ) : null}
 <div className={`${sizes[size]} bg-slate-100 rounded-full overflow-hidden`}>
 <div
 className={`h-full rounded-full ${colors[color]} transition-all duration-700 ease-out ${striped ?"animate-progress-stripe":""}`}
 style={{ width: `${pct}%` }}
 />
 </div>
 </div>
 );
}

export function Timeline({
 items,
}: {
 items: Array<{
 icon?: LucideIcon;
 iconColor?: string;
 iconBg?: string;
 title: string;
 description?: string;
 time?: string;
 active?: boolean;
 }>;
}) {
 return (
 <div className="space-y-0">
 {items.map((item, i) => {
 const Icon = item.icon;
 return (
 <div key={i} className="flex gap-3 relative">
 {i < items.length - 1 ? (
 <div className="absolute left-[15px] top-[32px] bottom-0 w-0.5 bg-slate-100"/>
 ) : null}
 <div
 className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${
 item.active
 ? (item.iconBg ||"bg-primary-100") +""+ (item.iconColor ||"text-primary-600")
 :"bg-slate-100 text-slate-400"
 }`}
 >
 {Icon ? <Icon className="w-3.5 h-3.5"/> : <div className="w-2 h-2 rounded-full bg-current"/>}
 </div>
 <div className={`flex-1 pb-6 ${i === items.length - 1 ?"pb-0":""}`}>
 <p className={`text-sm font-medium ${item.active ?"text-slate-900":"text-slate-400"}`}>
 {item.title}
 </p>
 {item.description ? (
 <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
 ) : null}
 {item.time ? (
 <p className="text-xs text-slate-400 mt-0.5">{item.time}</p>
 ) : null}
 </div>
 </div>
 );
 })}
 </div>
 );
}

function getAvatarColorClass(name: string): string {
 if (!name) return "avatar-af";
 const parts = name.trim().split(/\s+/);
 const lastName = parts.length > 1 ? parts[parts.length - 1] : parts[0];
 const first = (lastName?.[0] ?? "A").toUpperCase();
 if (first <= "F") return "avatar-af";
 if (first <= "L") return "avatar-gl";
 if (first <= "R") return "avatar-mr";
 return "avatar-sz";
}

export function Avatar({
 name,
 size ="md",
 src,
 className ="",
}: {
 name: string;
 size?:"xs"|"sm"|"md"|"lg"|"xl";
 src?: string;
 className?: string;
}) {
 const initials = name.split(" ").map(n => n[0]).filter(Boolean).join("").toUpperCase().slice(0, 2);
 const sizeSt: React.CSSProperties = {
  xs: { width: "24px", height: "24px", fontSize: "9px"  },
  sm: { width: "32px", height: "32px", fontSize: "11px" },
  md: { width: "34px", height: "34px", fontSize: "12px" },
  lg: { width: "48px", height: "48px", fontSize: "15px" },
  xl: { width: "64px", height: "64px", fontSize: "18px" },
 }[size];
 if (src) {
  return (
   <img src={src} alt={name} style={{ ...sizeSt, borderRadius: "50%", objectFit: "cover" }} className={className} />
  );
 }
 return (
  <div className={`avatar-apple ${getAvatarColorClass(name)} ${className}`} style={sizeSt}>
   {initials}
  </div>
 );
}

export function MetricRing({
 value,
 max = 100,
 size = 80,
 strokeWidth = 6,
 color ="primary",
 children,
}: {
 value: number;
 max?: number;
 size?: number;
 strokeWidth?: number;
 color?:"primary"|"emerald"|"amber"|"red"|"violet";
 children?: ReactNode;
}) {
 const r = (size - strokeWidth) / 2;
 const circ = 2 * Math.PI * r;
 const pct = Math.min(value / max, 1);
 const offset = circ * (1 - pct);
 const colors = {
 primary:"#2563eb",
 emerald:"#059669",
 amber:"#d97706",
 red:"#dc2626",
 violet:"#7c3aed",
 };
 return (
 <div className="relative inline-flex items-center justify-center">
 <svg width={size} height={size} className="-rotate-90">
 <circle
 cx={size / 2}
 cy={size / 2}
 r={r}
 fill="none"
 stroke="#f1f5f9"
 strokeWidth={strokeWidth}
 />
 <circle
 cx={size / 2}
 cy={size / 2}
 r={r}
 fill="none"
 stroke={colors[color]}
 strokeWidth={strokeWidth}
 strokeDasharray={circ}
 strokeDashoffset={offset}
 strokeLinecap="round"
 className="transition-all duration-1000 ease-out"
 />
 </svg>
 <div className="absolute inset-0 flex items-center justify-center">
 {children}
 </div>
 </div>
 );
}

export function Toggle({
 checked,
 onChange,
 label,
 description,
}: {
 checked: boolean;
 onChange: (v: boolean) => void;
 label?: string;
 description?: string;
}) {
 return (
  <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
   <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={`toggle-apple-track ${checked ? "toggle-apple-track-on" : "toggle-apple-track-off"}`}
   >
    <span className={`toggle-apple-thumb ${checked ? "toggle-apple-thumb-on" : "toggle-apple-thumb-off"}`} />
   </button>
   {label ? (
    <div>
     <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--t2)" }}>{label}</span>
     {description ? (
      <p style={{ fontSize: "11px", color: "var(--t4)", margin: "2px 0 0" }}>{description}</p>
     ) : null}
    </div>
   ) : null}
  </label>
 );
}

export function Modal({
 open,
 onClose,
 title,
 children,
 size ="md",
 actions,
}: {
 open: boolean;
 onClose: () => void;
 title: string;
 children: ReactNode;
 size?:"sm"|"md"|"lg"|"xl"|"full";
 actions?: ReactNode;
}) {
 const sizes = {
 sm:"max-w-md",
 md:"max-w-lg",
 lg:"max-w-2xl",
 xl:"max-w-4xl",
 full:"max-w-6xl",
 };

 if (!open) return null;

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
 <div
 className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
 onClick={onClose}
 />
 <div
 className={`relative bg-white rounded-2xl shadow-2xl w-full ${sizes[size]} animate-scale-in max-h-[85vh] flex flex-col`}
 >
 <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
 <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
 <button
 onClick={onClose}
 className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
 >
 <X className="w-4 h-4"/>
 </button>
 </div>
 <div className="overflow-y-auto p-6 flex-1">{children}</div>
 {actions ? (
 <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 shrink-0">
 {actions}
 </div>
 ) : null}
 </div>
 </div>
 );
}

export function Alert({
 variant ="info",
 icon: Icon,
 title,
 description,
 action,
}: {
 variant?:"info"|"warning"|"error"|"success";
 icon?: LucideIcon;
 title: string;
 description?: string;
 action?: ReactNode;
}) {
 const styles = {
 info:"bg-blue-50 border-blue-100",
 warning:"bg-amber-50 border-amber-100",
 error:"bg-red-50 border-red-100",
 success:"bg-emerald-50 border-emerald-100",
 };
 const iconColors = {
 info:"text-blue-600 bg-blue-100",
 warning:"text-amber-600 bg-amber-100",
 error:"text-red-600 bg-red-100",
 success:"text-emerald-600 bg-emerald-100",
 };
 const titleColors = {
 info:"text-blue-900",
 warning:"text-amber-900",
 error:"text-red-900",
 success:"text-emerald-900",
 };
 const descColors = {
 info:"text-blue-700",
 warning:"text-amber-700",
 error:"text-red-700",
 success:"text-emerald-700",
 };
 return (
 <div className={`rounded-xl border p-4 ${styles[variant]}`}>
 <div className="flex gap-3">
 {Icon ? (
 <div
 className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconColors[variant]}`}
 >
 <Icon className="w-4.5 h-4.5"/>
 </div>
 ) : null}
 <div className="flex-1 min-w-0">
 <h3 className={`text-sm font-semibold ${titleColors[variant]}`}>{title}</h3>
 {description ? (
 <p className={`text-sm mt-0.5 ${descColors[variant]}`}>{description}</p>
 ) : null}
 {action ? <div className="mt-2">{action}</div> : null}
 </div>
 </div>
 </div>
 );
}

export function DataTable({
 columns,
 data,
 onRowClick,
 emptyIcon,
 emptyTitle,
 emptyDescription,
}: {
 columns: Array<{
 key: string;
 label: string;
 align?:"left"|"right"|"center";
 hidden?: string;
 render?: (row: any) => ReactNode;
 }>;
 data: any[];
 onRowClick?: (row: any) => void;
 emptyIcon?: LucideIcon;
 emptyTitle?: string;
 emptyDescription?: string;
}) {
 if (data.length === 0) {
 return (
 <EmptyState
 icon={emptyIcon}
 title={emptyTitle ||"No data found"}
 description={emptyDescription}
 />
 );
 }

 return (
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b border-slate-100">
 {columns.map((col) => (
 <th
 key={col.key}
 className={`px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider ${
 col.align ==="right"?"text-right":"text-left"
 } ${col.hidden ||""}`}
 >
 {col.label}
 </th>
 ))}
 </tr>
 </thead>
 <tbody>
 {data.map((row: any, i: number) => (
 <tr
 key={row.id || i}
 onClick={() => onRowClick?.(row)}
 className={`border-b border-slate-50 transition-colors ${
 onRowClick
 ?"hover:bg-slate-50/80 cursor-pointer"
 :""
 }`}
 >
 {columns.map((col) => (
 <td
 key={col.key}
 className={`px-5 py-3.5 ${
 col.align ==="right"?"text-right":"text-left"
 } ${col.hidden ||""}`}
 >
 {col.render ? col.render(row) : row[col.key]}
 </td>
 ))}
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 );
}

export function SearchInput({
 value,
 onChange,
 placeholder,
}: {
 value: string;
 onChange: (v: string) => void;
 placeholder?: string;
}) {
 return (
 <div className="relative">
 <svg
 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
 fill="none"
 stroke="currentColor"
 viewBox="0 0 24 24"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={2}
 d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
 />
 </svg>
 <input
 value={value}
 onChange={(e) => onChange(e.target.value)}
 placeholder={placeholder ||"Search..."}
 className="w-full h-10 pl-10 pr-4 rounded-lg border border-slate-200 hover:border-slate-300 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white"
 />
 </div>
 );
}

export function ConfirmModal({
 open,
 onClose,
 onConfirm,
 title,
 description,
 confirmLabel ="Confirm",
 variant ="danger",
 loading,
}: {
 open: boolean;
 onClose: () => void;
 onConfirm: () => void;
 title: string;
 description: string;
 confirmLabel?: string;
 variant?:"danger"|"primary";
 loading?: boolean;
}) {
 if (!open) return null;
 return (
 <Modal open={open} onClose={onClose} title={title} size="sm">
 <p className="text-sm text-slate-600 mb-6">{description}</p>
 <div className="flex justify-end gap-3">
 <Button variant="secondary"onClick={onClose}>
 Cancel
 </Button>
 <Button
 variant={variant ==="danger"?"danger":"primary"}
 onClick={onConfirm}
 loading={loading}
 >
 {confirmLabel}
 </Button>
 </div>
 </Modal>
 );
}

export function Toast({
 message,
 variant ="success",
 onClose,
}: {
 message: string;
 variant?:"success"|"error"|"info";
 onClose: () => void;
}) {
 useEffect(() => {
 const timer = setTimeout(onClose, 3000);
 return () => clearTimeout(timer);
 }, [onClose]);

 const styles = {
 success:"bg-emerald-600",
 error:"bg-red-600",
 info:"bg-primary-600",
 };

 return (
 <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
 <div
 className={`${styles[variant]} text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2`}
 >
 {message}
 <button onClick={onClose} className="ml-1 opacity-70 hover:opacity-100">
 <X className="w-3.5 h-3.5"/>
 </button>
 </div>
 </div>
 );
}

export function InfoRow({
 label,
 value,
 icon: Icon,
 action,
}: {
 label: string;
 value: ReactNode;
 icon?: LucideIcon;
 action?: ReactNode;
}) {
 return (
 <div className="flex items-center justify-between py-2.5">
 <div className="flex items-center gap-2 text-sm text-slate-500">
 {Icon ? <Icon className="w-4 h-4"/> : null}
 {label}
 </div>
 <div className="flex items-center gap-2">
 <span className="text-sm font-medium text-slate-900">{value}</span>
 {action}
 </div>
 </div>
 );
}

export function Divider({ className =""}: { className?: string }) {
 return <div className={`border-t border-slate-100 ${className}`} />;
}

export function SectionLabel({ children }: { children: ReactNode }) {
 return (
 <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
 {children}
 </h3>
 );
}

export function ActionRow({
 icon: Icon,
 label,
 description,
 action,
 onClick,
 variant ="default",
}: {
 icon: LucideIcon;
 label: string;
 description?: string;
 action?: ReactNode;
 onClick?: () => void;
 variant?:"default"|"success"|"warning"|"danger"|"violet";
}) {
 const iconColors = {
 default:"bg-slate-100 text-slate-600",
 success:"bg-emerald-50 text-emerald-600",
 warning:"bg-amber-50 text-amber-600",
 danger:"bg-red-50 text-red-600",
 violet:"bg-violet-50 text-violet-600",
 };
 return (
 <div
 onClick={onClick}
 className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
 onClick ?"hover:bg-slate-50 cursor-pointer":""
 }`}
 >
 <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconColors[variant]}`}>
 <Icon className="w-4.5 h-4.5"/>
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-sm font-medium text-slate-900">{label}</p>
 {description ? (
 <p className="text-xs text-slate-500 mt-0.5">{description}</p>
 ) : null}
 </div>
 {action ? action : onClick ? <ChevronRight className="w-4 h-4 text-slate-400"/> : null}
 </div>
 );
}

export function Skeleton({
 width,
 height = 16,
 className ="",
}: {
 width?: string | number;
 height?: number;
 className?: string;
}) {
 return (
 <div
 className={`bg-slate-200 rounded animate-pulse ${className}`}
 style={{ width: width ||"100%", height }}
 />
 );
}

export function FunnelBar({
 label,
 count,
 total,
 color,
 icon: Icon,
}: {
 label: string;
 count: number;
 total: number;
 color: string;
 icon: LucideIcon;
}) {
 const pct = total > 0 ? Math.max((count / total) * 100, count > 0 ? 8 : 0) : 0;
 return (
 <div>
 <div className="flex items-center justify-between mb-1.5">
 <div className="flex items-center gap-2">
 <Icon className={`w-3.5 h-3.5 ${color.replace("bg-","text-")}`} />
 <span className="text-sm text-slate-600">{label}</span>
 </div>
 <span className="text-sm font-semibold text-slate-900 stat-number">{count}</span>
 </div>
 <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
 <div
 className={`h-full rounded-full ${color} transition-all duration-700 ease-out`}
 style={{ width: `${pct}%` }}
 />
 </div>
 </div>
 );
}
