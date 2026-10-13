import type { CurrencyCode } from "@/services/api";

const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: "₦",
  USD: "$",
  GBP: "£",
};

/**
 * Formats an amount in a specific currency, independent of what the shopper
 * is currently browsing in.
 *
 * Orders, returns and refunds are records of money that has already moved:
 * re-rendering a naira refund with a pound sign because the site currency
 * changed would misstate it.
 */
export const formatMoneyIn = (
  amount: number | string,
  currency: CurrencyCode | string,
): string => {
  const value = Number(amount);
  const symbol = CURRENCY_SYMBOLS[currency] ?? "";

  if (!Number.isFinite(value)) return `${symbol}0.00`;

  return `${symbol}${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};
