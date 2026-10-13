import type { DeliveryZone } from "@/services/api";

/** Zone rate for the currency the shopper is browsing in. */
export const rateFor = (zone: DeliveryZone, currency: string) =>
  currency === "NGN"
    ? zone.priceNaira
    : currency === "GBP"
      ? zone.priceGbp
      : zone.priceUsd;

/** "1–3 business days", or "2 business days" when the range is a single value. */
export const formatEstimate = (zone: DeliveryZone) =>
  zone.minDays === zone.maxDays
    ? `${zone.maxDays} business day${zone.maxDays === 1 ? "" : "s"}`
    : `${zone.minDays}–${zone.maxDays} business days`;
