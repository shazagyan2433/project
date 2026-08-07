import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("ku-IQ", {
    style: "currency",
    currency: "IQD",
    maximumFractionDigits: 0,
  }).format(amount).replace("IQD", "د.ع");
}

export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("ku-IQ", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
