import { PaymentOptions, PaymentMethodOption, DEFAULT_PAYMENT_OPTIONS } from "@/types";

export const PAYMENT_METHOD_LABELS: Record<keyof PaymentOptions, { label: string; icon: string }> = {
  cash: { label: "Cash", icon: "dollar-sign" },
  check: { label: "Check", icon: "edit-3" },
  creditCard: { label: "Credit Card", icon: "credit-card" },
  venmo: { label: "Venmo", icon: "smartphone" },
  cashApp: { label: "Cash App", icon: "smartphone" },
  zelle: { label: "Zelle", icon: "send" },
  applePay: { label: "Apple Pay", icon: "smartphone" },
  ach: { label: "ACH / Bank Transfer", icon: "briefcase" },
  other: { label: "Other", icon: "more-horizontal" },
};

export function getPaymentOptions(raw: unknown): PaymentOptions {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_PAYMENT_OPTIONS };
  return { ...DEFAULT_PAYMENT_OPTIONS, ...(raw as Partial<PaymentOptions>) };
}

export function getEnabledPaymentMethods(options: PaymentOptions): { key: keyof PaymentOptions; label: string; method: PaymentMethodOption }[] {
  return (Object.keys(PAYMENT_METHOD_LABELS) as (keyof PaymentOptions)[])
    .filter((key) => options[key]?.enabled)
    .map((key) => ({
      key,
      label: options[key].label || PAYMENT_METHOD_LABELS[key].label,
      method: options[key],
    }));
}

export function formatPaymentOptionsForDisplay(options: PaymentOptions, venmoHandle?: string | null, cashappHandle?: string | null): string[] {
  const lines: string[] = [];
  const enabled = getEnabledPaymentMethods(options);
  for (const { key, label, method } of enabled) {
    let line = label;
    if (key === "venmo" && venmoHandle) line += ` (@${venmoHandle})`;
    if (key === "cashApp" && cashappHandle) line += ` ($${cashappHandle})`;
    if (method.handle && key !== "venmo" && key !== "cashApp") line += ` (${method.handle})`;
    if (method.feeNote) line += ` - ${method.feeNote}`;
    lines.push(line);
  }
  return lines;
}

export function formatPaymentOptionsForMessage(options: PaymentOptions, paymentNotes?: string | null, venmoHandle?: string | null, cashappHandle?: string | null): string {
  const methods = formatPaymentOptionsForDisplay(options, venmoHandle, cashappHandle);
  if (methods.length === 0) return "";
  let text = "Payment Methods Accepted:\n";
  text += methods.map((m) => `  - ${m}`).join("\n");
  if (paymentNotes) text += `\n\nNote: ${paymentNotes}`;
  return text;
}

export function formatPaymentOptionsForHTML(options: PaymentOptions, paymentNotes?: string | null, venmoHandle?: string | null, cashappHandle?: string | null, primaryColor?: string): string {
  const methods = formatPaymentOptionsForDisplay(options, venmoHandle, cashappHandle);
  if (methods.length === 0) return "";
  const color = primaryColor || "#2563EB";
  let html = `<div style="margin-top:24px;padding:16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">`;
  html += `<h3 style="margin:0 0 12px;font-size:14px;font-weight:600;color:${color};">Payment Methods Accepted</h3>`;
  html += `<ul style="margin:0;padding:0 0 0 18px;font-size:13px;color:#334155;">`;
  for (const m of methods) {
    html += `<li style="margin-bottom:4px;">${m}</li>`;
  }
  html += `</ul>`;
  if (paymentNotes) {
    html += `<p style="margin:12px 0 0;font-size:12px;color:#64748b;font-style:italic;">${paymentNotes}</p>`;
  }
  html += `</div>`;
  return html;
}
