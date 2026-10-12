// ─────────────────────────────────────────────────────────────────────────────
// Tax + Fee snapshotting for quotes.
//
// Central place that:
//   1. Reads the business's account-level taxFeesSettings.
//   2. Snapshots them onto the quote (so the quote is immutable to later
//      settings changes).
//   3. Computes convenience_fee_amount from the quote's current subtotal.
//   4. Persists tax_*, convenience_fee_*, and the resulting total.
// ─────────────────────────────────────────────────────────────────────────────

import { pool } from "../db";
import {
  snapshotFromBusinessSettings,
  computeQuoteTotals,
  type TaxFeesSettings,
  type QuoteTaxFeeSnapshot,
  type ComputedTotals,
} from "../../shared/taxFees";

export interface QuoteTaxFeeResult extends ComputedTotals {
  snapshot: QuoteTaxFeeSnapshot;
}

/**
 * Load business taxFeesSettings, snapshot them onto the quote, recompute
 * tax + fee + total from the quote's current subtotal, and persist.
 *
 * Idempotent — safe to call multiple times. Values rounded to cent.
 *
 * If the quote already has a non-default tax/fee snapshot (e.g. operator
 * overrode it for this quote), this respects the existing values rather
 * than re-snapshotting. Detection: if quote.tax_rate > 0 OR
 * quote.convenience_fee_value IS NOT NULL.
 */
export async function applyTaxFeesToQuote(
  quoteId: string,
  opts: { force?: boolean } = {},
): Promise<QuoteTaxFeeResult | null> {
  const { rows } = await pool.query(
    `SELECT q.id,
            q.business_id,
            q.subtotal,
            q.tax_rate,
            q.tax_label,
            q.tax_applies_to,
            q.convenience_fee_type,
            q.convenience_fee_value,
            q.convenience_fee_amount,
            q.convenience_fee_label,
            b.tax_fees_settings
       FROM quotes q
       JOIN businesses b ON b.id = q.business_id
      WHERE q.id = $1
      LIMIT 1`,
    [quoteId],
  );
  if (!rows[0]) return null;

  const row = rows[0];
  const subtotal = Number(row.subtotal) || 0;
  const businessSettings = (row.tax_fees_settings || null) as TaxFeesSettings | null;

  // Always re-snapshot from the business defaults. Per-quote overrides are
  // not exposed in the UI yet, so an "override-detection" heuristic here is
  // unsafe (e.g. an explicit override-to-zero would be misread as "no
  // override" and clobbered). We can layer in real overrides once a
  // dedicated boolean column or per-quote UI exists.
  void opts;
  const snapshot: QuoteTaxFeeSnapshot = snapshotFromBusinessSettings(businessSettings);

  const totals = computeQuoteTotals(subtotal, snapshot);
  snapshot.convenienceFeeAmount = totals.feeAmount;

  await pool.query(
    `UPDATE quotes SET
        tax_rate = $1,
        tax_label = $2,
        tax_applies_to = $3,
        tax = $4,
        convenience_fee_type = $5,
        convenience_fee_value = $6,
        convenience_fee_amount = $7,
        convenience_fee_label = $8,
        total = $9,
        updated_at = NOW()
      WHERE id = $10`,
    [
      snapshot.taxRate,
      snapshot.taxLabel,
      snapshot.taxAppliesTo,
      totals.taxAmount,
      snapshot.convenienceFeeType,
      snapshot.convenienceFeeValue,
      snapshot.convenienceFeeAmount,
      snapshot.convenienceFeeLabel,
      totals.total,
      quoteId,
    ],
  );

  return { ...totals, snapshot };
}

/**
 * Build Stripe Checkout line_items that itemize subtotal, fee, and tax
 * separately so the customer's receipt shows the breakdown.
 *
 * Returns a single base item if there is no tax/fee, otherwise multiple.
 * All amounts in cents.
 */
export function buildStripeLineItems(args: {
  baseName: string;
  baseDescription?: string;
  subtotal: number;
  feeAmount: number;
  feeLabel: string;
  taxAmount: number;
  taxLabel: string;
  currency?: string;
}): Array<{
  price_data: {
    currency: string;
    product_data: { name: string; description?: string };
    unit_amount: number;
  };
  quantity: number;
}> {
  const currency = args.currency || "usd";
  const items: Array<any> = [];
  const subCents = Math.round(Math.max(0, args.subtotal) * 100);
  const feeCents = Math.round(Math.max(0, args.feeAmount) * 100);
  const taxCents = Math.round(Math.max(0, args.taxAmount) * 100);

  if (subCents > 0 || (feeCents === 0 && taxCents === 0)) {
    items.push({
      price_data: {
        currency,
        product_data: {
          name: args.baseName,
          ...(args.baseDescription ? { description: args.baseDescription } : {}),
        },
        unit_amount: subCents,
      },
      quantity: 1,
    });
  }
  if (feeCents > 0) {
    items.push({
      price_data: {
        currency,
        product_data: { name: args.feeLabel || "Convenience Fee" },
        unit_amount: feeCents,
      },
      quantity: 1,
    });
  }
  if (taxCents > 0) {
    items.push({
      price_data: {
        currency,
        product_data: { name: args.taxLabel || "Sales Tax" },
        unit_amount: taxCents,
      },
      quantity: 1,
    });
  }
  return items;
}
