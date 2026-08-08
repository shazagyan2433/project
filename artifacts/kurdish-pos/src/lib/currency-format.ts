/**
 * Central IQD→display currency conversion + formatting.
 * Amounts throughout the app are stored/treated as IQD base units.
 */
import { DEFAULT_RATE } from "@/hooks/useExchangeRate";

export type AppCurrency = "IQD" | "USD";

const CURRENCY_KEY = "linqi_display_currency";
const RATE_KEY = "iqd_usd_exchange_rate";

export function readStoredCurrency(): AppCurrency {
  try {
    const v = localStorage.getItem(CURRENCY_KEY);
    if (v === "USD" || v === "IQD") return v;
  } catch {
    /* ignore */
  }
  return "IQD";
}

export function readStoredRate(): number {
  try {
    const stored = localStorage.getItem(RATE_KEY);
    const parsed = stored ? parseFloat(stored) : NaN;
    if (!isNaN(parsed) && parsed > 0) return parsed;
  } catch {
    /* ignore */
  }
  return DEFAULT_RATE;
}

export function iqdToDisplay(amountIqd: number, currency: AppCurrency = readStoredCurrency(), rate: number = readStoredRate()): number {
  const n = Number(amountIqd);
  if (!Number.isFinite(n)) return 0;
  if (currency === "USD") return n / (rate > 0 ? rate : DEFAULT_RATE);
  return n;
}

export function currencyLabelFor(currency: AppCurrency, lang: string): string {
  if (currency === "USD") {
    if (lang === "ar") return "دولار";
    if (lang === "en") return "$";
    return "دۆلار";
  }
  if (lang === "en") return "IQD";
  return "د.ع";
}

/** Format an IQD base amount using the active (or provided) display currency. */
export function formatMoneyIqd(
  amountIqd: number,
  opts?: {
    currency?: AppCurrency;
    rate?: number;
    lang?: string;
    compact?: boolean;
  },
): string {
  const currency = opts?.currency ?? readStoredCurrency();
  const rate = opts?.rate ?? readStoredRate();
  const lang = opts?.lang ?? ((typeof document !== "undefined" ? document.documentElement.lang?.slice(0, 2) : "ku") || "ku");
  const display = iqdToDisplay(amountIqd, currency, rate);
  const isEn = lang === "en";
  const locale = isEn ? "en-US" : lang === "ar" ? "ar-IQ" : "ku-IQ";
  const isUsd = currency === "USD";
  const label = currencyLabelFor(currency, lang);

  if (opts?.compact) {
    const abs = Math.abs(display);
    const divisor = abs >= 1_000_000 ? 1_000_000 : abs >= 1_000 ? 1_000 : 1;
    const suffix = abs >= 1_000_000 ? "M" : abs >= 1_000 ? "K" : "";
    const compact = display / divisor;
    const num = new Intl.NumberFormat(isEn ? "en-US" : "ar-IQ", {
      maximumFractionDigits: isUsd ? 2 : compact % 1 === 0 ? 0 : 1,
    }).format(compact);
    if (isEn) return isUsd ? `$${num}${suffix}` : `IQD ${num}${suffix}`;
    return `${num}${suffix}\u00A0${label}`;
  }

  const num = new Intl.NumberFormat(locale, {
    minimumFractionDigits: isUsd ? 2 : 0,
    maximumFractionDigits: isUsd ? 2 : 0,
  }).format(display);

  if (isEn) return isUsd ? `$${num}` : `IQD ${num}`;
  return `${num}\u00A0${label}`;
}
