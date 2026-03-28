type BadgeVariant = "live" | "success" | "warning" | "error" | "info" | "neutral";

interface StatusBadgeProps {
  label: string;
  variant: BadgeVariant;
  showDot?: boolean;
}

export default function StatusBadge({ label, variant, showDot = true }: StatusBadgeProps) {
  return (
    <span className={`status-badge status-badge-${variant}`}>
      {showDot && <span className="status-badge-dot" />}
      {label}
    </span>
  );
}
