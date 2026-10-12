// ─────────────────────────────────────────────────────────────────────────────
// Sales Tax + Convenience Fee — pure compute helpers shared by server, web,
// and the customer-facing instant-quote.html template.
// ─────────────────────────────────────────────────────────────────────────────

export type TaxAppliesTo = "subtotal" | "subtotal_plus_fee";
export type FeeType = "flat" | "percentage";
export type FeeAppliesTo = "all" | "card_only";

export interface TaxFeesSettings {
  tax: {
    enabled: boolean;
    rate: number;
    label: string;
    appliesTo: TaxAppliesTo;
  };
  fee: {
    enabled: boolean;
    type: FeeType;
    value: number;
    label: string;
    appliesTo: FeeAppliesTo;
    helperText: string;
  };
}

export interface QuoteTaxFeeSnapshot {
  taxRate: number;
  taxLabel: string;
  taxAppliesTo: TaxAppliesTo;
  convenienceFeeType: FeeType | null;
  convenienceFeeValue: number | null;
  convenienceFeeAmount: number;
  convenienceFeeLabel: string;
}

export interface ComputedTotals {
  subtotal: number;
  feeAmount: number;
  taxAmount: number;
  total: number;
}

export const DEFAULT_TAX_FEES: TaxFeesSettings = {
  tax: { enabled: false, rate: 0, label: "Sales Tax", appliesTo: "subtotal" },
  fee: {
    enabled: false,
    type: "percentage",
    value: 0,
    label: "Convenience Fee",
    appliesTo: "card_only",
    helperText: "",
  },
};

function round2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function computeFeeAmount(
  subtotal: number,
  type: FeeType | null | undefined,
  value: number | null | undefined,
): number {
  if (!type || !value || value <= 0) return 0;
  const sub = Math.max(0, Number(subtotal) || 0);
  if (type === "flat") return Math.max(0, Number(value) || 0);
  // percentage
  return Math.max(0, sub * (Number(value) / 100));
}

export function computeTaxAmount(
  subtotal: number,
  rate: number,
  appliesTo: TaxAppliesTo,
  feeAmount: number,
): number {
  const r = Number(rate) || 0;
  if (r <= 0) return 0;
  const base =
    appliesTo === "subtotal_plus_fee"
      ? Math.max(0, Number(subtotal) || 0) + Math.max(0, Number(feeAmount) || 0)
      : Math.max(0, Number(subtotal) || 0);
  return Math.max(0, base * r);
}

/**
 * Build a quote-level snapshot from the business's account-level defaults.
 * Called when a quote is created so each quote captures the rates at that
 * point in time and is immutable to later settings changes.
 */
export function snapshotFromBusinessSettings(
  s: Partial<TaxFeesSettings> | null | undefined,
): QuoteTaxFeeSnapshot {
  const tax = { ...DEFAULT_TAX_FEES.tax, ...((s && s.tax) || {}) };
  const fee = { ...DEFAULT_TAX_FEES.fee, ...((s && s.fee) || {}) };
  return {
    taxRate: tax.enabled ? Math.max(0, Number(tax.rate) || 0) : 0,
    taxLabel: tax.label || "Sales Tax",
    taxAppliesTo: tax.appliesTo === "subtotal_plus_fee" ? "subtotal_plus_fee" : "subtotal",
    convenienceFeeType: fee.enabled ? (fee.type === "flat" ? "flat" : "percentage") : null,
    convenienceFeeValue: fee.enabled ? Math.max(0, Number(fee.value) || 0) : null,
    convenienceFeeAmount: 0,
    convenienceFeeLabel: fee.label || "Convenience Fee",
  };
}

/**
 * Compute final totals from a subtotal + a tax/fee snapshot.
 * Returns rounded-to-cent values suitable for persistence and display.
 */
export function computeQuoteTotals(
  subtotal: number,
  snap: Partial<QuoteTaxFeeSnapshot>,
): ComputedTotals {
  // IMPORTANT: round each component before composing the total. The
  // customer-facing instant-quote.html does the same thing in JS, so any
  // change here must be mirrored there to keep the displayed total === the
  // persisted/charged total to the cent.
  const safeSub = round2(Math.max(0, Number(subtotal) || 0));
  const feeAmount = round2(
    computeFeeAmount(
      safeSub,
      snap.convenienceFeeType ?? null,
      snap.convenienceFeeValue ?? 0,
    ),
  );
  const taxAmount = round2(
    computeTaxAmount(
      safeSub,
      snap.taxRate ?? 0,
      snap.taxAppliesTo ?? "subtotal",
      feeAmount,
    ),
  );
  return {
    subtotal: safeSub,
    feeAmount,
    taxAmount,
    total: round2(safeSub + feeAmount + taxAmount),
  };
}
