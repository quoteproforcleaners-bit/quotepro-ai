import { type ReactNode, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  X,
  AlertCircle,
  FileText,
  Users,
  Briefcase,
  Inbox,
  type LucideIcon,
} from "lucide-react";

export function PageHeader({
  title,
  subtitle,
  backTo,
  actions,
}: {
  title: string;
  subtitle?: string;
  backTo?: string;
  actions?: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <div className="mb-6">
      {backTo ? (
        <button
          onClick={() => navigate(backTo)}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      ) : null}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
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
  className = "",
  padding = true,
}: {
  children: ReactNode;
  className?: string;
  padding?: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] ${
        padding ? "p-5 lg:p-6" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  icon: Icon,
  actions,
}: {
  title: string;
  icon?: LucideIcon;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        {Icon ? <Icon className="w-4.5 h-4.5 text-slate-400" /> : null}
        <h2 className="font-semibold text-slate-900">{title}</h2>
      </div>
      {actions}
    </div>
  );
}

const badgeStyles: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  sent: "bg-blue-50 text-blue-700",
  viewed: "bg-violet-50 text-violet-700",
  accepted: "bg-emerald-50 text-emerald-700",
  declined: "bg-red-50 text-red-600",
  "changes-requested": "bg-amber-50 text-amber-700",
  expired: "bg-slate-100 text-slate-500",
  scheduled: "bg-blue-50 text-blue-700",
  in_progress: "bg-amber-50 text-amber-700",
  completed: "bg-emerald-50 text-emerald-700",
  canceled: "bg-red-50 text-red-600",
  active: "bg-emerald-50 text-emerald-700",
  inactive: "bg-slate-100 text-slate-500",
  lead: "bg-blue-50 text-blue-700",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  error: "bg-red-50 text-red-600",
  info: "bg-blue-50 text-blue-700",
  pro: "bg-violet-50 text-violet-700",
};

export function Badge({
  status,
  label,
  dot,
}: {
  status: string;
  label?: string;
  dot?: boolean;
}) {
  const style = badgeStyles[status] || badgeStyles.draft;
  const text = label || status.replace(/[-_]/g, " ");
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${style}`}
    >
      {dot ? <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" /> : null}
      {text}
    </span>
  );
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  icon: Icon,
  onClick,
  disabled,
  loading,
  type = "button",
  className = "",
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  icon?: LucideIcon;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  const variants = {
    primary:
      "bg-primary-600 hover:bg-primary-700 text-white shadow-sm shadow-primary-600/10",
    secondary:
      "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm",
    ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
    danger: "bg-red-600 hover:bg-red-700 text-white shadow-sm",
    success: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm",
  };
  const sizes = {
    sm: "h-8 px-3 text-xs gap-1.5",
    md: "h-9 px-4 text-sm gap-2",
    lg: "h-11 px-5 text-sm gap-2",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : Icon ? (
        <Icon className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} />
      ) : null}
      {children}
    </button>
  );
}

export function Input({
  label,
  error,
  ...props
}: {
  label?: string;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      {label ? (
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
        </label>
      ) : null}
      <input
        {...props}
        className={`w-full h-11 px-3.5 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 ${
          error
            ? "border-red-300 focus:ring-red-500/20 focus:border-red-500"
            : "border-slate-200 hover:border-slate-300"
        } ${props.className || ""}`}
      />
      {error ? (
        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
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
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
        </label>
      ) : null}
      <select
        {...props}
        className={`w-full h-11 px-3 rounded-lg border border-slate-200 hover:border-slate-300 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white ${
          props.className || ""
        }`}
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
  tabs: string[];
  active: string;
  onChange: (tab: string) => void;
  counts?: Record<string, number>;
}) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-px">
      {tabs.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`px-3.5 py-2 rounded-lg text-sm font-medium capitalize whitespace-nowrap transition-all duration-150 ${
            active === t
              ? "bg-primary-50 text-primary-700 shadow-sm"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
          }`}
        >
          {t.replace(/[-_]/g, " ")}
          {counts && counts[t] !== undefined ? (
            <span
              className={`ml-1.5 text-xs ${
                active === t ? "text-primary-500" : "text-slate-400"
              }`}
            >
              {counts[t]}
            </span>
          ) : null}
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
        <Icon className="w-6 h-6 text-slate-400" />
      </div>
      <p className="text-sm font-medium text-slate-900 mb-1">{title}</p>
      {description ? (
        <p className="text-sm text-slate-500 text-center max-w-sm">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Spinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "w-4 h-4 border-2", md: "w-6 h-6 border-2", lg: "w-8 h-8 border-3" };
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
  color = "primary",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  subtitle?: string;
  color?: "primary" | "violet" | "emerald" | "amber" | "red";
}) {
  const colors = {
    primary: "bg-primary-50 text-primary-600",
    violet: "bg-violet-50 text-violet-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
  };
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-500 mb-2">{label}</p>
          <p className="text-2xl font-bold text-slate-900 tracking-tight">{value}</p>
          {subtitle ? (
            <p className="text-xs text-slate-400 mt-1.5">{subtitle}</p>
          ) : null}
          {trend ? (
            <p
              className={`text-xs font-medium mt-1.5 ${
                trend.value >= 0 ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {trend.value >= 0 ? "+" : ""}
              {trend.value}% {trend.label}
            </p>
          ) : null}
        </div>
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colors[color]}`}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </Card>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const sizes = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`relative bg-white rounded-2xl shadow-2xl w-full ${sizes[size]} animate-slide-up max-h-[85vh] flex flex-col`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}

export function Alert({
  variant = "info",
  icon: Icon,
  title,
  description,
  action,
}: {
  variant?: "info" | "warning" | "error" | "success";
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  const styles = {
    info: "bg-blue-50 border-blue-100",
    warning: "bg-amber-50 border-amber-100",
    error: "bg-red-50 border-red-100",
    success: "bg-emerald-50 border-emerald-100",
  };
  const iconColors = {
    info: "text-blue-600 bg-blue-100",
    warning: "text-amber-600 bg-amber-100",
    error: "text-red-600 bg-red-100",
    success: "text-emerald-600 bg-emerald-100",
  };
  const titleColors = {
    info: "text-blue-900",
    warning: "text-amber-900",
    error: "text-red-900",
    success: "text-emerald-900",
  };
  const descColors = {
    info: "text-blue-700",
    warning: "text-amber-700",
    error: "text-red-700",
    success: "text-emerald-700",
  };
  return (
    <div className={`rounded-xl border p-4 ${styles[variant]}`}>
      <div className="flex gap-3">
        {Icon ? (
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconColors[variant]}`}
          >
            <Icon className="w-4.5 h-4.5" />
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
    align?: "left" | "right" | "center";
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
        title={emptyTitle || "No data found"}
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
                  col.align === "right" ? "text-right" : "text-left"
                } ${col.hidden || ""}`}
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
                  ? "hover:bg-slate-50/80 cursor-pointer"
                  : ""
              }`}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-5 py-3.5 ${
                    col.align === "right" ? "text-right" : "text-left"
                  } ${col.hidden || ""}`}
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
        placeholder={placeholder || "Search..."}
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
  confirmLabel = "Confirm",
  variant = "danger",
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: "danger" | "primary";
  loading?: boolean;
}) {
  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-slate-600 mb-6">{description}</p>
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant={variant === "danger" ? "danger" : "primary"}
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
  variant = "success",
  onClose,
}: {
  message: string;
  variant?: "success" | "error" | "info";
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const styles = {
    success: "bg-emerald-600",
    error: "bg-red-600",
    info: "bg-primary-600",
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
      <div
        className={`${styles[variant]} text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2`}
      >
        {message}
        <button onClick={onClose} className="ml-1 opacity-70 hover:opacity-100">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
