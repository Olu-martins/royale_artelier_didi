/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useContext,
  useMemo,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api, { Product, StoreSettings } from "@/services/api";

const COUNTRY_CACHE_KEY = "user_country_code";
const CURRENCY_PREF_KEY = "preferred_currency";

export type CurrencyCode = "NGN" | "USD" | "GBP";

/**
 * Display metadata for each currency, in one place.
 *
 * The full name is what a shopper actually recognises — "NGN" alone reads as
 * a code rather than a choice — so pickers show the name and keep the code as
 * a secondary hint.
 */
export const CURRENCY_META: Record<
  CurrencyCode,
  { label: string; symbol: string }
> = {
  NGN: { label: "Naira", symbol: "₦" },
  USD: { label: "US Dollar", symbol: "$" },
  GBP: { label: "British Pound", symbol: "£" },
};

const CURRENCY_SYMBOLS: Record<string, string> = Object.fromEntries(
  Object.entries(CURRENCY_META).map(([code, meta]) => [code, meta.symbol]),
);

const ALL_CURRENCIES: CurrencyCode[] = ["NGN", "USD", "GBP"];

/** Rough USD→local fallbacks when a product is missing a currency column. */
const USD_TO: Record<Exclude<CurrencyCode, "USD">, number> = {
  NGN: 1550,
  GBP: 0.79,
};

interface CurrencyContextType {
  currency: CurrencyCode;
  currencySymbol: string;
  availableCurrencies: CurrencyCode[];
  setCurrency: (currency: CurrencyCode) => void;
  isCurrencyLocked: boolean;
  settings: StoreSettings | undefined;
  isLoading: boolean;
  getProductPrice: (product: Product) => number;
  formatPrice: (amount: number | string | null | undefined) => string;
  refetchSettings: () => void;
}

/** Locale per currency so grouping and symbol placement match the market. */
const LOCALE_BY_CURRENCY: Record<string, string> = {
  NGN: "en-NG",
  USD: "en-US",
  GBP: "en-GB",
};

const CurrencyContext = createContext<CurrencyContextType | undefined>(
  undefined,
);

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  const [availableCurrencies] = useState<CurrencyCode[]>(ALL_CURRENCIES);
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    if (typeof window === "undefined") return "NGN";
    const saved = window.localStorage.getItem(
      CURRENCY_PREF_KEY,
    ) as CurrencyCode | null;
    if (saved && ALL_CURRENCIES.includes(saved)) return saved;
    // Clear any obsolete preference (e.g. a removed currency code).
    if (saved) window.localStorage.setItem(CURRENCY_PREF_KEY, "NGN");
    return "NGN";
  });
  const [initialized, setInitialized] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.getSettings(),
    staleTime: 1000 * 60 * 10,
  });

  useEffect(() => {
    if (initialized) return;

    const savedCurrency =
      typeof window !== "undefined"
        ? (window.localStorage.getItem(
            CURRENCY_PREF_KEY,
          ) as CurrencyCode | null)
        : null;

    if (savedCurrency && ALL_CURRENCIES.includes(savedCurrency)) {
      setCurrencyState(savedCurrency);
      setInitialized(true);
      return;
    }

    const applyDefaultFromCountry = (countryCode: string | null) => {
      const normalizedCountry = (countryCode || "").trim().toUpperCase();
      if (normalizedCountry === "GB") setCurrencyState("GBP");
      else setCurrencyState("NGN");
      setInitialized(true);
    };

    const cachedCountry =
      typeof window !== "undefined"
        ? window.localStorage.getItem(COUNTRY_CACHE_KEY)
        : null;

    if (cachedCountry) {
      applyDefaultFromCountry(cachedCountry);
      return;
    }

    fetch("https://ipapi.co/country/")
      .then((res) => (res.ok ? res.text() : Promise.resolve("")))
      .then((countryCode) => {
        if (typeof window !== "undefined" && countryCode) {
          window.localStorage.setItem(COUNTRY_CACHE_KEY, countryCode.trim());
        }
        applyDefaultFromCountry(countryCode || null);
      })
      .catch(() => {
        applyDefaultFromCountry(null);
      });
  }, [initialized]);

  const setCurrency = (nextCurrency: CurrencyCode) => {
    if (!availableCurrencies.includes(nextCurrency)) {
      return;
    }
    setCurrencyState(nextCurrency);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(CURRENCY_PREF_KEY, nextCurrency);
    }
  };

  const isCurrencyLocked = availableCurrencies.length === 1;
  const currencySymbol = CURRENCY_SYMBOLS[currency] ?? currency;

  const getProductPrice = (product: Product) => {
    const usdBase = Number(product.priceUsd ?? product.price ?? 0);
    const ngn = Number(product.priceNaira ?? 0);
    const gbp = Number(product.priceGbp ?? 0);

    if (currency === "NGN") {
      if (ngn > 0) return ngn;
      if (usdBase > 0) return Number((usdBase * USD_TO.NGN).toFixed(2));
      return 0;
    }
    if (currency === "GBP") {
      if (gbp > 0) return gbp;
      if (usdBase > 0) return Number((usdBase * USD_TO.GBP).toFixed(2));
      return 0;
    }
    if (usdBase > 0) return usdBase;
    if (ngn > 0) return Number((ngn / USD_TO.NGN).toFixed(2));
    if (gbp > 0) return Number((gbp / USD_TO.GBP).toFixed(2));
    return 0;
  };

  const formatPrice = useMemo(
    () => (amount: number | string | null | undefined) => {
      const numeric =
        typeof amount === "number"
          ? amount
          : typeof amount === "string"
            ? Number(amount)
            : NaN;

      if (!Number.isFinite(numeric)) {
        return `${currencySymbol}0`;
      }

      try {
        return new Intl.NumberFormat(LOCALE_BY_CURRENCY[currency] ?? "en-US", {
          style: "currency",
          currency,
          minimumFractionDigits: currency === "NGN" ? 0 : 2,
          maximumFractionDigits: 2,
        }).format(numeric);
      } catch {
        return `${currencySymbol}${numeric.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      }
    },
    [currency, currencySymbol],
  );

  const refetchSettings = () =>
    queryClient.invalidateQueries({ queryKey: ["settings"] });

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        currencySymbol,
        availableCurrencies,
        setCurrency,
        isCurrencyLocked,
        settings,
        isLoading: isLoading || !initialized,
        getProductPrice,
        formatPrice,
        refetchSettings,
      }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
};

export { CurrencyContext };
