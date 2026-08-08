import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, ShoppingBag, AlertTriangle, Check, X, Loader2,
  Zap, Truck, Star, Settings,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/PageHeader";
import { useLocaleDir } from "@/lib/use-locale-dir";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useNotifications } from "@/hooks/useB2bData";
import {
  type LiveNotificationType,
  formatNotificationText,
  formatNotificationTime,
  getNotificationVisual,
  loadReadNotificationIds,
  saveReadNotificationIds,
} from "@/lib/live-notifications";

type NType = LiveNotificationType | "all";

const FILTER_KEYS: Array<{ key: NType; icon: typeof Bell; color: string }> = [
  { key: "all",      icon: Bell,         color: "#94A3B8" },
  { key: "sale",     icon: ShoppingBag,  color: "#3B82F6" },
  { key: "rfq",      icon: Zap,          color: "#F97316" },
  { key: "stock",    icon: AlertTriangle,color: "#EF4444" },
  { key: "delivery", icon: Truck,        color: "#10B981" },
  { key: "reward",   icon: Star,         color: "#F59E0B" },
  { key: "system",   icon: Settings,     color: "#A855F7" },
];

export default function NotificationCenter() {
  const { t, i18n } = useTranslation("ui");
  const { dir } = useLocaleDir("ui");
  const { formatMoney } = useCurrency();
  const { data: apiNotifs = [], isLoading } = useNotifications();

  const [readIds, setReadIds] = useState<Set<string>>(loadReadNotificationIds);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<NType>("all");

  const persistRead = useCallback((next: Set<string>) => {
    setReadIds(next);
    saveReadNotificationIds(next);
  }, []);

  const notifs = useMemo(
    () =>
      apiNotifs
        .filter((n) => !dismissed.has(n.id))
        .map((n) => {
          const { title, body } = formatNotificationText(n, t, formatMoney);
          const { icon, color } = getNotificationVisual(n.type);
          return {
            id: n.id,
            type: n.type,
            title,
            body,
            time: formatNotificationTime(n.createdAt, i18n.language),
            read: readIds.has(n.id),
            icon,
            color,
          };
        }),
    [apiNotifs, dismissed, readIds, t, formatMoney, i18n.language],
  );

  const shown = filter === "all" ? notifs : notifs.filter((n) => n.type === filter);
  const unreadCount = notifs.filter((n) => !n.read).length;

  const markAllRead = () => persistRead(new Set(apiNotifs.map((n) => n.id)));
  const markRead = (id: string) => persistRead(new Set(readIds).add(id));
  const dismiss = (id: string) => setDismissed((prev) => new Set(prev).add(id));

  return (
    <div dir={dir} className="space-y-5 pb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)" }}>
              <Bell className="w-5 h-5" style={{ color: "#EF4444" }} />
            </div>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -end-1 w-5 h-5 rounded-full text-[10px] font-extrabold text-white flex items-center justify-center"
                style={{ background: "#EF4444", boxShadow: "0 0 10px rgba(239,68,68,0.6)" }}>
                {unreadCount}
              </span>
            )}
          </div>
          <div>
            <PageHeader id="notifications" showDescription={false} />
            <p className="text-xs text-slate-500 dark:text-white/40 linqi-page-header-subtitle">{t("notifications.subtitle")}</p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-all linqi-page-card"
            style={{ border: "1px solid var(--shell-border)" }}>
            <Check className="w-3.5 h-3.5" /> {t("notifications.markAllRead")}
          </button>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {FILTER_KEYS.map((f) => {
          const count = f.key === "all" ? notifs.filter((n) => !n.read).length : notifs.filter((n) => n.type === f.key && !n.read).length;
          const label = f.key === "all" ? t("notifications.filters.all") : t(`notifications.filters.${f.key}`);
          return (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all linqi-page-card"
              style={{
                background: filter === f.key ? `${f.color}20` : undefined,
                border: filter === f.key ? `1px solid ${f.color}40` : "1px solid var(--shell-border)",
                color: filter === f.key ? f.color : undefined,
              }}>
              <f.icon className="w-3 h-3" />
              {label}
              {count > 0 && <span className="w-4 h-4 rounded-full text-[9px] font-extrabold text-white flex items-center justify-center" style={{ background: f.color }}>{count}</span>}
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl overflow-hidden linqi-page-card" style={{ border: "1px solid var(--shell-border)" }}>
        {isLoading ? (
          <div className="py-16 flex flex-col items-center gap-3 text-slate-500 dark:text-white/40">
            <Loader2 className="w-8 h-8 animate-spin opacity-50" />
            <p className="text-sm">{t("common.loading", { ns: "common" })}</p>
          </div>
        ) : (
        <AnimatePresence initial={false}>
          {shown.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500 dark:text-white/40">{t("notifications.empty")}</p>
          ) : shown.map((n, i) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => markRead(n.id)}
              className="flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-colors group relative"
              style={{
                background: n.read ? "transparent" : "rgba(255,255,255,0.02)",
                borderBottom: "1px solid var(--shell-border)",
              }}
            >
              {!n.read && <div className="absolute start-0 top-1/2 -translate-y-1/2 w-0.5 h-8 rounded-e-full" style={{ background: n.color }} />}
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: `${n.color}18`, border: `1px solid ${n.color}30` }}>
                <n.icon className="w-4 h-4" style={{ color: n.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-[13px] font-bold linqi-page-heading truncate">{n.title}</p>
                  <span className="text-[10px] linqi-page-muted shrink-0">{n.time}</span>
                </div>
                <p className="text-[12px] linqi-page-muted leading-relaxed">{n.body}</p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); dismiss(n.id); }}
                className="opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 rounded-lg flex items-center justify-center shrink-0 linqi-page-card"
              >
                <X className="w-3.5 h-3.5 linqi-page-muted" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        )}
      </div>
    </div>
  );
}
