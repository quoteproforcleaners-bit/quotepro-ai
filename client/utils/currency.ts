export type SupportedCurrency = "USD" | "CAD" | "GBP";

export const CURRENCIES: { code: SupportedCurrency; label: string; symbol: string }[] = [
  { code: "USD", label: "US Dollar (USD)", symbol: "$" },
  { code: "CAD", label: "Canadian Dollar (CAD)", symbol: "CA$" },
  { code: "GBP", label: "British Pound (GBP)", symbol: "£" },
];

export function getCurrencySymbol(currency: string = "USD"): string {
  return CURRENCIES.find((c) => c.code === currency)?.symbol ?? "$";
}

export function formatCurrency(amount: number, currency: string = "USD", options?: { decimals?: boolean }): string {
  const showDecimals = options?.decimals ?? false;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: showDecimals ? 2 : 0,
      maximumFractionDigits: showDecimals ? 2 : 0,
    }).format(amount);
  } catch {
    return `${getCurrencySymbol(currency)}${amount.toLocaleString()}`;
  }
}
