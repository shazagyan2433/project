import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatMoneyIqd } from "./currency-format";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format IQD base amounts using the global USD/IQD display toggle. */
export function formatCurrency(amount: number) {
  const lang =
    (typeof document !== "undefined" && document.documentElement.lang?.slice(0, 2)) || "ku";
  return formatMoneyIqd(amount, { lang });
}

export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("ku-IQ", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
