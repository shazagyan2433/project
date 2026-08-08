import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { DEFAULT_RATE, useExchangeRate } from "@/hooks/useExchangeRate";
import {
  type AppCurrency,
  readStoredCurrency,
  formatMoneyIqd,
  iqdToDisplay,
  currencyLabelFor,
} from "@/lib/currency-format";

export type { AppCurrency };

const CURRENCY_KEY = "linqi_display_currency";
const CURRENCY_EVENT = "linqiCurrencyChanged";

interface CurrencyContextValue {
  /** Active display currency */
  currency: AppCurrency;
  setCurrency: (c: AppCurrency) => void;
  toggleCurrency: () => void;
  /** IQD per 1 USD */
  rate: number;
  setRate: (rate: number) => void;
  /** Convert an IQD base amount into the active display currency (numeric). */
  toDisplay: (amountIqd: number) => number;
  /** Format an IQD base amount for the active currency + locale. */
  formatMoney: (amountIqd: number, opts?: { compact?: boolean }) => string;
  /** Currency suffix/symbol for charts & labels (no amount). */
  currencyLabel: string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const { rate, setRate } = useExchangeRate();
  const [currency, setCurrencyState] = useState<AppCurrency>(readStoredCurrency);

  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<AppCurrency>).detail;
      if (detail === "USD" || detail === "IQD") setCurrencyState(detail);
    };
    window.addEventListener(CURRENCY_EVENT, onChange);
    return () => window.removeEventListener(CURRENCY_EVENT, onChange);
  }, []);

  const setCurrency = useCallback((c: AppCurrency) => {
    setCurrencyState(c);
    try {
      localStorage.setItem(CURRENCY_KEY, c);
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new CustomEvent<AppCurrency>(CURRENCY_EVENT, { detail: c }));
  }, []);

  const toggleCurrency = useCallback(() => {
    setCurrency(currency === "IQD" ? "USD" : "IQD");
  }, [currency, setCurrency]);

  const toDisplay = useCallback(
    (amountIqd: number) => iqdToDisplay(amountIqd, currency, rate > 0 ? rate : DEFAULT_RATE),
    [currency, rate],
  );

  const currencyLabel = useMemo(
    () => currencyLabelFor(currency, i18n.language),
    [currency, i18n.language],
  );

  const formatMoney = useCallback(
    (amountIqd: number, opts?: { compact?: boolean }) =>
      formatMoneyIqd(amountIqd, {
        currency,
        rate: rate > 0 ? rate : DEFAULT_RATE,
        lang: i18n.language,
        compact: opts?.compact,
      }),
    [currency, rate, i18n.language],
  );

  const value = useMemo<CurrencyContextValue>(
    () => ({
      currency,
      setCurrency,
      toggleCurrency,
      rate,
      setRate,
      toDisplay,
      formatMoney,
      currencyLabel,
    }),
    [currency, setCurrency, toggleCurrency, rate, setRate, toDisplay, formatMoney, currencyLabel],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error("useCurrency must be used within CurrencyProvider");
  }
  return ctx;
}

/** Safe hook for optional usage outside provider (returns null outside provider). */
export function useCurrencyOptional(): CurrencyContextValue | null {
  return useContext(CurrencyContext);
}
