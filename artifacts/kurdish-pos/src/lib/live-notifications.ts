import type { TFunction } from "i18next";
import {
  Bell,
  ShoppingBag,
  Zap,
  AlertTriangle,
  Truck,
  Star,
  Settings,
  Banknote,
  type LucideIcon,
} from "lucide-react";

export type LiveNotificationType = "sale" | "rfq" | "stock" | "delivery" | "cod_collected" | "system" | "reward";

export interface ApiNotification {
  id: string;
  type: LiveNotificationType;
  createdAt: string;
  payload: Record<string, unknown>;
}

const ICONS: Record<LiveNotificationType, LucideIcon> = {
  sale: ShoppingBag,
  rfq: Zap,
  stock: AlertTriangle,
  delivery: Truck,
  cod_collected: Banknote,
  reward: Star,
  system: Settings,
};

const COLORS: Record<LiveNotificationType, string> = {
  sale: "#3B82F6",
  rfq: "#F97316",
  stock: "#EF4444",
  delivery: "#10B981",
  cod_collected: "#059669",
  reward: "#F59E0B",
  system: "#A855F7",
};

export function getNotificationVisual(type: LiveNotificationType) {
  return { icon: ICONS[type] ?? Bell, color: COLORS[type] ?? "#94A3B8" };
}

export function formatNotificationTime(iso: string, lang: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const now = Date.now();
  const diffMin = Math.floor((now - date.getTime()) / 60_000);
  const locale = lang === "en" ? "en-US" : lang === "ar" ? "ar-IQ" : "ku-IQ";

  if (diffMin < 1) {
    if (lang === "en") return "just now";
    if (lang === "ar") return "الآن";
    return "ئێستا";
  }
  if (diffMin < 60) return String(diffMin);
  if (diffMin < 24 * 60) {
    return date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString(locale, { month: "short", day: "numeric" });
}

export function formatNotificationText(
  n: ApiNotification,
  t: TFunction,
  formatMoney: (amountIqd: number) => string,
): { title: string; body: string } {
  const p = n.payload;

  switch (n.type) {
    case "sale":
      return {
        title: t("notifications.live.sale.title"),
        body: t("notifications.live.sale.body", {
          id: p.saleId,
          customer: p.customerName ?? t("emptyStates.noCustomer", { ns: "common", defaultValue: "—" }),
          amount: formatMoney(Number(p.totalAmount ?? 0)),
        }),
      };
    case "rfq": {
      const status = String(p.status ?? "pending");
      if (status === "responded" || status === "approved") {
        return {
          title: t("notifications.live.rfqResponse.title"),
          body: t("notifications.live.rfqResponse.body", {
            code: p.rfqCode,
            product: p.product,
            price: p.bestPrice ? String(p.bestPrice) : "—",
          }),
        };
      }
      return {
        title: t("notifications.live.rfq.title"),
        body: t("notifications.live.rfq.body", {
          code: p.rfqCode,
          product: p.product,
          qty: p.quantity,
          unit: p.unit,
        }),
      };
    }
    case "stock":
      return {
        title: t("notifications.live.stock.title"),
        body: t("notifications.live.stock.body", {
          product: p.productName,
          stock: p.stock,
          unit: p.unit,
        }),
      };
    case "delivery": {
      const status = String(p.status ?? "active");
      if (status === "completed") {
        return {
          title: t("notifications.live.deliveryDone.title"),
          body: t("notifications.live.deliveryDone.body", {
            orderId: p.orderId,
            customer: p.customerName,
          }),
        };
      }
      return {
        title: t("notifications.live.delivery.title"),
        body: t("notifications.live.delivery.body", {
          orderId: p.orderId,
          customer: p.customerName,
          shop: p.shopName,
        }),
      };
    }
    case "cod_collected":
      return {
        title: t("notifications.live.codCollected.title"),
        body: t("notifications.live.codCollected.body", {
          orderId: p.orderId ?? p.saleId,
          amount: formatMoney(Number(p.amount ?? 0)),
          currency: p.currency ?? "IQD",
        }),
      };
    default:
      return {
        title: t("notifications.live.system.title"),
        body: t("notifications.live.system.body"),
      };
  }
}

const READ_KEY = "linqi_read_notification_ids";

export function loadReadNotificationIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x) => typeof x === "string"));
  } catch {
    return new Set();
  }
}

export function saveReadNotificationIds(ids: Set<string>): void {
  try {
    localStorage.setItem(READ_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
}
