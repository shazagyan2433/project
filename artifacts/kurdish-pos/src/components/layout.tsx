import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Menu, X, Zap,
  LogOut, Shield, Download, WifiOff,
  Globe, Store, Bot, Warehouse, Truck, Handshake, DollarSign, TrendingUp,
  BookOpen, FileSearch, Bell, Trophy, Search, Package, FileText,
  CheckCircle2, AlertCircle, Info, ChevronLeft, ChevronRight,
  Plus, ChevronDown, Settings, Home,
} from "lucide-react";
import { getSectorNavFeatures, type NavFeatureKey } from "@/lib/industries";
import { useUserSectorKey } from "@/hooks/useSectorScope";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useOffline } from "@/hooks/useOffline";
import { SidebarParticles } from "@/components/SidebarParticles";
import { ThemeCustomizer } from "@/components/ThemeCustomizer";
import { ThemeModeToggle } from "@/components/ThemeModeToggle";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { logoutToEntryScreen } from "@/lib/auth-session";
import { toast } from "@/hooks/use-toast";
import { useRouteBreadcrumb, useDocumentPageTitle } from "@/lib/page-headers";
import { useLocaleDir } from "@/lib/use-locale-dir";
import { resolveDisplayUserName, getUserRoleLabel } from "@/lib/user-display";
import { useNotifications } from "@/hooks/useB2bData";
import { useQueryClient } from "@tanstack/react-query";
import { socket } from "@/lib/socket";
import type { ApiNotification } from "@/lib/live-notifications";
import {
  formatNotificationText,
  formatNotificationTime,
  getNotificationVisual,
  loadReadNotificationIds,
  saveReadNotificationIds,
} from "@/lib/live-notifications";

/* ── Quick-action items ─────────────────────────────────────────── */
const QUICK_ACTIONS: Array<{ labelKey: string; href: string; color: string; feature: NavFeatureKey }> = [
  { labelKey: "top.newRfq",       href: "/marketplace",       color: "#3b82f6", feature: "marketplace" },
  { labelKey: "top.newOrder",     href: "/procurement",        color: "#10b981", feature: "procurement" },
  { labelKey: "top.findSupplier", href: "/supplier-directory", color: "#8b5cf6", feature: "supplier-directory" },
];

/* ════════════════════════════════════════════════════════════════════
   TOP HEADER
════════════════════════════════════════════════════════════════════ */
interface TopHeaderProps {
  searchRef: React.RefObject<HTMLInputElement | null>;
}

function TopHeader({ searchRef }: TopHeaderProps) {
  const { t, i18n }                        = useTranslation();
  const { t: tu, dir }                     = useLocaleDir("ui");
  const { user, isAdmin }                  = useAuth();
  const { currency, setCurrency, formatMoney } = useCurrency();
  const { data: apiNotifs = [] }           = useNotifications();
  const displayName                        = resolveDisplayUserName(user, t);
  const roleLabel                          = getUserRoleLabel(user, t);
  const [location, navigate]               = useLocation();
  const [search,       setSearch]          = useState("");
  const [searchFocused, setSearchFocused]  = useState(false);
  const [notifOpen,    setNotifOpen]       = useState(false);
  const [profileOpen,  setProfileOpen]     = useState(false);
  const [quickOpen,    setQuickOpen]       = useState(false);
  const [readIds,      setReadIds]         = useState<Set<string>>(loadReadNotificationIds);
  const notifRef   = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const quickRef   = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  useEffect(() => {
    if (!isAdmin) return;

    socket.connect();
    socket.emit("admin:join");

    const onAdminNotification = (payload: ApiNotification) => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      if (payload.type === "cod_collected") {
        const { title, body } = formatNotificationText(payload, tu, formatMoney);
        toast({ title, description: body });
      }
    };

    socket.on("admin_notification", onAdminNotification);
    return () => {
      socket.off("admin_notification", onAdminNotification);
    };
  }, [isAdmin, qc, tu, formatMoney]);

  const headerNotifs = useMemo(
    () =>
      apiNotifs.slice(0, 8).map((n) => {
        const { title, body } = formatNotificationText(n, tu, formatMoney);
        const { icon, color } = getNotificationVisual(n.type);
        return {
          id: n.id,
          icon,
          color,
          dot: color,
          title,
          sub: body,
          time: formatNotificationTime(n.createdAt, i18n.language),
        };
      }),
    [apiNotifs, tu, formatMoney, i18n.language, currency],
  );

  const markNotifRead = useCallback((id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev).add(id);
      saveReadNotificationIds(next);
      return next;
    });
  }, []);

  const markAllNotifsRead = useCallback(() => {
    const next = new Set(apiNotifs.map((n) => n.id));
    setReadIds(next);
    saveReadNotificationIds(next);
  }, [apiNotifs]);

  const handleSignOut = useCallback(() => {
    toast({
      title: t("nav.logout"),
      description: t("auth.logoutSuccess", { defaultValue: "Signed out — opening registration…" }),
    });
    setProfileOpen(false);
    window.setTimeout(() => logoutToEntryScreen("onboarding"), 100);
  }, [t]);

  /* ── Close any open dropdown on outside click ── */
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (notifRef.current   && !notifRef.current.contains(e.target as Node))   setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      if (quickRef.current   && !quickRef.current.contains(e.target as Node))   setQuickOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── Cmd / Ctrl + K → focus search ── */
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [searchRef]);

  /* ── Breadcrumbs — nav labels (match sidebar); no sector suffix ── */
  const breadcrumb = useRouteBreadcrumb(location);

  const unread = headerNotifs.filter((n) => !readIds.has(n.id)).length;

  const sectorKey = useUserSectorKey();
  const navFeatures = getSectorNavFeatures(isAdmin ? null : sectorKey);
  const showQuickNav = (feat: NavFeatureKey) => !navFeatures || navFeatures.includes(feat);
  const quickActions = QUICK_ACTIONS.filter(a => showQuickNav(a.feature));

  /* ── Shared dropdown style ── */
  const dropdownPanelClass = cn(
    "absolute end-0 rounded-2xl overflow-hidden linqi-dropdown z-[999]",
    "bg-white dark:bg-slate-900",
    "border border-slate-200/80 dark:border-slate-700/80",
    "shadow-xl backdrop-blur-md",
    "isolate",
  );

  const dropdownStyle: React.CSSProperties = {
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
  };

  return (
    <div
      className="relative z-50 h-16 shrink-0 hidden lg:flex items-center w-full px-5 gap-3 linqi-top-header"
    >
      {/* ── Breadcrumb / page title ─────────────────────────────── */}
      <div className="flex items-center gap-1.5 shrink-0 min-w-0 max-w-[min(100%,320px)]">
        <button
          onClick={() => navigate("/")}
          className="w-6 h-6 flex items-center justify-center rounded-lg shrink-0 transition-colors hover:bg-[var(--shell-hover)] linqi-breadcrumb-muted"
          title="LinQi Dashboard"
        >
          <Home className="w-3.5 h-3.5" />
        </button>
        {breadcrumb.parent && (
          <>
            <span className="hidden xl:inline text-[11px] font-semibold truncate max-w-[120px] linqi-breadcrumb-muted">
              {breadcrumb.parent}
            </span>
            <ChevronRight className="hidden xl:inline w-3 h-3 shrink-0 linqi-breadcrumb-muted" />
          </>
        )}
        <span
          className="text-[14px] font-extrabold leading-tight linqi-breadcrumb-text truncate"
          style={{ fontFamily: "Vazirmatn,sans-serif" }}
        >
          {breadcrumb.label}
        </span>
      </div>

      {/* ── Search ─────────────────────────────────────────────── */}
      <div className="flex-1 max-w-xs relative">
        <Search
          className={cn(
            "absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none transition-colors",
            searchFocused ? "linqi-search-icon-focused" : "linqi-search-icon",
          )}
        />
        <input
          ref={searchRef}
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t("top.search")}
          className="w-full ps-9 pe-14 py-2 rounded-xl text-[12px] outline-none transition-all duration-200 linqi-shell-input"
          style={{ fontFamily: "Vazirmatn,sans-serif" }}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
        />
        {/* ⌘K badge */}
        {!searchFocused && !search && (
          <div
            className="absolute end-2.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 rounded-md px-1.5 py-0.5 select-none pointer-events-none linqi-icon-btn"
          >
            <span className="text-[9px] font-bold linqi-shell-muted" style={{ fontFamily: "ui-monospace,monospace" }}>⌘K</span>
          </div>
        )}
        {search && (
          <button
            type="button"
            onClick={() => { setSearch(""); searchRef.current?.focus(); }}
            className="absolute end-2.5 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center rounded-full transition-colors linqi-shell-muted hover:text-[var(--shell-text-primary)] bg-[var(--shell-hover)]"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        )}
      </div>

      {/* ── Right actions ──────────────────────────────────────── */}
      <div className="flex items-center gap-2 shrink-0 ms-auto relative z-50">

        {/* Quick action (+) */}
        <div ref={quickRef} className="relative z-[999]">
          <button
            onClick={() => { setQuickOpen(v => !v); setNotifOpen(false); setProfileOpen(false); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11.5px] font-extrabold transition-all duration-150"
            style={{
              background:  quickOpen ? "rgba(59,130,246,0.18)" : "rgba(59,130,246,0.10)",
              border:      "1px solid rgba(59,130,246,0.25)",
              color:       "#60a5fa",
              fontFamily:  "Vazirmatn,sans-serif",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(59,130,246,0.18)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = quickOpen ? "rgba(59,130,246,0.18)" : "rgba(59,130,246,0.10)"; }}
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden xl:inline">{t("top.quickAction")}</span>
          </button>

          <AnimatePresence>
            {quickOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className={cn(dropdownPanelClass, "top-[calc(100%+8px)] w-52")}
                style={dropdownStyle}
              >
                <div className="px-4 py-2.5 linqi-dropdown-header">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] linqi-shell-muted" style={{ fontFamily: "Vazirmatn,sans-serif" }}>
                    {t("top.quickAction")}
                  </p>
                </div>
                <div className="py-1">
                  {quickActions.map(({ labelKey, href, color }) => (
                    <button
                      key={href}
                      onClick={() => { navigate(href); setQuickOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 transition-all text-start linqi-dropdown-item linqi-shell-body"
                    >
                      <div className="w-5 h-5 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}20` }}>
                        <Plus className="w-3 h-3" style={{ color }} />
                      </div>
                      <span className="text-[12px] font-bold" style={{ fontFamily: "Vazirmatn,sans-serif" }}>
                        {t(labelKey)}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Divider */}
        <div className="h-5 w-px shrink-0 linqi-shell-divider" />

        {/* Language switcher */}
        <LanguageSwitcher variant="header" align="end" />

        {/* Global currency toggle — IQD ↔ USD */}
        <div
          className="flex items-center rounded-xl p-0.5 border border-[var(--shell-border)] bg-[var(--shell-hover)]"
          role="group"
          aria-label="Currency"
        >
          {(["IQD", "USD"] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCurrency(c)}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold transition-all",
                currency === c
                  ? "bg-[var(--terminal-accent)] text-white shadow-sm"
                  : "text-[var(--shell-text-secondary)] hover:text-[var(--shell-text-primary)]",
              )}
            >
              {c === "IQD" ? "د.ع" : "$"}
            </button>
          ))}
        </div>

        <ThemeModeToggle variant="header" />

        {/* Notification bell */}
        <div ref={notifRef} className="relative z-[999]">
          <button
            onClick={() => { setNotifOpen(v => !v); setQuickOpen(false); setProfileOpen(false); }}
            className={cn(
              "relative w-9 h-9 flex items-center justify-center rounded-full transition-all duration-150 linqi-header-icon-btn",
              notifOpen && "border-[color-mix(in_srgb,var(--terminal-accent)_35%,var(--shell-border))]",
            )}
          >
            <Bell className="w-[15px] h-[15px]" />
            {unread > 0 && (
              <span className="absolute top-1 end-1 min-w-[15px] h-[15px] flex items-center justify-center rounded-full text-[8px] font-extrabold text-white px-0.5"
                style={{ background: "#ef4444", boxShadow: "0 0 8px rgba(239,68,68,0.75)" }}>
                {unread}
              </span>
            )}
          </button>

          <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                dir={dir}
                className={cn(dropdownPanelClass, "top-[calc(100%+10px)] w-[340px]")}
                style={dropdownStyle}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 linqi-dropdown-header">
                  <div className="flex items-center gap-2">
                    <Bell className="w-3.5 h-3.5" style={{ color: "#60a5fa" }} />
                    <span className="text-[12px] font-extrabold linqi-shell-heading" style={{ fontFamily: "Vazirmatn,sans-serif" }}>{tu("notifications.title")}</span>
                    {unread > 0 && (
                      <span className="text-[9px] font-extrabold px-1.5 py-px rounded-full"
                        style={{ background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" }}>
                        {tu("notifications.newCount", { count: unread })}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={markAllNotifsRead}
                    className="text-[10px] font-bold transition-colors"
                    style={{ color: "rgba(96,165,250,0.7)", fontFamily: "Vazirmatn,sans-serif" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#60a5fa"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "rgba(96,165,250,0.7)"}
                  >
                    {tu("notifications.markAllRead")}
                  </button>
                </div>

                {/* List */}
                <div className="overflow-y-auto" style={{ maxHeight: "300px", scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.12) transparent" }}>
                  {headerNotifs.length === 0 ? (
                    <div className="px-4 py-10 text-center text-[11px] linqi-shell-muted" style={{ fontFamily: "Vazirmatn,sans-serif" }}>
                      {tu("notifications.empty")}
                    </div>
                  ) : (
                  headerNotifs.map((n, idx) => {
                    const Icon = n.icon;
                    const isRead = readIds.has(n.id);
                    return (
                      <motion.button key={n.id}
                        initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.04 }}
                        onClick={() => markNotifRead(n.id)}
                        className={cn(
                          "w-full flex items-start gap-3 px-4 py-3 text-start transition-all duration-150 linqi-dropdown-item",
                          !isRead && "bg-[color-mix(in_srgb,var(--terminal-accent)_3%,transparent)]",
                        )}
                        style={{ borderBottom: idx < headerNotifs.length - 1 ? "1px solid var(--shell-border)" : "none" }}
                      >
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                          style={{ background: `${n.color}15`, border: `1.5px solid ${n.color}28` }}>
                          <Icon className="w-3.5 h-3.5" style={{ color: n.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <p className={cn(
                              "text-[11px] font-extrabold leading-snug truncate linqi-shell-heading",
                              isRead && "opacity-60",
                            )}
                              style={{ fontFamily: "Vazirmatn,sans-serif" }}>
                              {n.title}
                            </p>
                            {!isRead && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: n.dot, boxShadow: `0 0 5px ${n.dot}` }} />}
                          </div>
                          <p className="text-[10px] mt-0.5 leading-relaxed linqi-shell-muted" style={{ fontFamily: "Vazirmatn,sans-serif" }}>{n.sub}</p>
                          <p className="text-[9px] mt-0.5 linqi-shell-muted opacity-70" style={{ fontFamily: "Vazirmatn,sans-serif" }}>{tu("notifications.timeAgo", { time: n.time })}</p>
                        </div>
                      </motion.button>
                    );
                  })
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2 linqi-dropdown-footer">
                  <button
                    type="button"
                    onClick={() => { setNotifOpen(false); navigate("/notifications"); }}
                    className="w-full text-center text-[10.5px] font-bold py-1.5 rounded-xl transition-all text-blue-500 hover:bg-blue-500/10 dark:text-blue-400"
                    style={{ fontFamily: "Vazirmatn,sans-serif" }}>
                    {tu("notifications.viewAll")}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Divider */}
        <div className="h-5 w-px shrink-0 linqi-shell-divider" />

        {/* Profile badge + dropdown */}
        <div ref={profileRef} className="relative z-[999]">
          <button
            onClick={() => { setProfileOpen(v => !v); setNotifOpen(false); setQuickOpen(false); }}
            className={cn(
              "flex items-center gap-2 ps-1 pe-2 py-1 rounded-full transition-all duration-150",
              "hover:bg-[var(--shell-hover)]",
              profileOpen && "bg-[var(--shell-hover)] border border-[var(--shell-border)]",
            )}
          >
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="absolute inset-0 rounded-full"
                style={{ boxShadow: "0 0 0 2px var(--terminal-accent), 0 0 10px var(--terminal-accent-glow)", borderRadius: "9999px" }} />
              <div className="w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-[12px] text-white relative z-10 select-none"
                style={{ background: "linear-gradient(135deg, var(--terminal-accent) 0%, color-mix(in srgb, var(--terminal-accent) 60%, #000) 100%)" }}>
                {displayName.charAt(0)?.toUpperCase() ?? "L"}
              </div>
            </div>
            {/* Name + chevron (xl+) */}
            <div className="hidden xl:flex items-center gap-1.5">
              <span className="text-[12px] font-extrabold max-w-[110px] truncate linqi-shell-heading" style={{ fontFamily: "Vazirmatn,sans-serif" }}>
                {displayName}
              </span>
              <ChevronDown className={cn("w-3 h-3 transition-transform duration-200 shrink-0 linqi-shell-muted", profileOpen && "rotate-180")} />
            </div>
          </button>

          {/* Profile dropdown */}
          <AnimatePresence>
            {profileOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className={cn(dropdownPanelClass, "top-[calc(100%+10px)] w-60")}
                style={dropdownStyle}
              >
                {/* User info */}
                <div className="px-4 pt-4 pb-3 linqi-dropdown-header">
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <div className="absolute inset-0 rounded-full"
                        style={{ boxShadow: "0 0 0 2px var(--terminal-accent), 0 0 10px var(--terminal-accent-glow)" }} />
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-sm text-white relative z-10"
                        style={{ background: "linear-gradient(135deg, var(--terminal-accent), color-mix(in srgb, var(--terminal-accent) 60%, #000))" }}>
                        {displayName.charAt(0)?.toUpperCase() ?? "L"}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-extrabold truncate leading-snug linqi-shell-heading" style={{ fontFamily: "Vazirmatn,sans-serif" }}>
                        {displayName}
                      </p>
                      <p className="text-[10px] font-bold mt-0.5 flex items-center gap-1"
                        style={{ color: "var(--terminal-accent)", fontFamily: "Vazirmatn,sans-serif" }}>
                        {user?.role === "admin" ? (
                          <><Shield className="w-2.5 h-2.5" />{roleLabel}</>
                        ) : roleLabel}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="py-1">
                  <button
                    onClick={() => { navigate("/settings"); setProfileOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 transition-all text-start linqi-dropdown-item linqi-shell-body"
                  >
                    <Settings className="w-4 h-4 shrink-0" />
                    <span className="text-[12px] font-bold" style={{ fontFamily: "Vazirmatn,sans-serif" }}>{t("top.settings")}</span>
                  </button>
                  <div className="mx-4 my-1 h-px linqi-shell-divider" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSignOut();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 transition-all text-start linqi-dropdown-item text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 active:scale-[0.98] active:opacity-90"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    <span className="text-[12px] font-bold" style={{ fontFamily: "Vazirmatn,sans-serif" }}>{t("nav.logout")}</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   LAYOUT (Global Dashboard Shell)
════════════════════════════════════════════════════════════════════ */
export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isAdmin } = useAuth();
  /* Subscribe so all routed pages re-render when USD/IQD toggle changes */
  useCurrency();
  const { t }                     = useTranslation();
  const displayName = resolveDisplayUserName(user, t);
  const roleLabel = getUserRoleLabel(user, t);
  const pageTitle = useRouteBreadcrumb(location).label;
  useDocumentPageTitle(location);
  const { canInstall, install }   = usePWAInstall();
  const isOffline                 = useOffline();
  const desktopSidebarRef         = useRef<HTMLElement>(null);
  const mobileSidebarRef          = useRef<HTMLElement>(null);
  const searchRef                 = useRef<HTMLInputElement>(null);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = useCallback(() => {
    if (signingOut) return;
    setSigningOut(true);
    setIsMobileMenuOpen(false);
    toast({
      title: t("nav.logout"),
      description: t("auth.logoutSuccess", { defaultValue: "Signed out — opening registration…" }),
    });
    window.setTimeout(() => logoutToEntryScreen("onboarding"), 100);
  }, [signingOut, t]);

  /* ── Sector-based nav filtering ── */
  const sectorKey = useUserSectorKey();
  const navFeatures = getSectorNavFeatures(isAdmin ? null : sectorKey);
  const showNav = (feat: NavFeatureKey) => !navFeatures || navFeatures.includes(feat);
  const hasB2bNav = !navFeatures || navFeatures.length > 0;

  /* ── Sidebar collapse state ── */
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("linqi_sidebar_collapsed") === "1"; }
    catch { return false; }
  });
  const toggleCollapsed = useCallback(() => {
    setCollapsed(v => {
      const next = !v;
      try { localStorage.setItem("linqi_sidebar_collapsed", next ? "1" : "0"); } catch {}
      return next;
    });
  }, []);

  /* ── RTL detection (for collapse chevron direction) ── */
  const [isRTL, setIsRTL] = useState(() => document.documentElement.dir === "rtl");
  useEffect(() => {
    const obs = new MutationObserver(() => setIsRTL(document.documentElement.dir === "rtl"));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["dir"] });
    return () => obs.disconnect();
  }, []);

  /* Collapse chevron: points toward the sidebar edge when expanded (to indicate "fold in"),
     and away from the edge when collapsed (to indicate "expand out"). */
  const CollapseIcon = collapsed
    ? (isRTL ? ChevronLeft  : ChevronRight)   // expand: RTL → left (←), LTR → right (→)
    : (isRTL ? ChevronRight : ChevronLeft);   // collapse: RTL → right (→), LTR → left (←)

  /* ── NavLink ───────────────────────────────────────────────────── */
  const NavLink = ({
    href, labelKey, icon: Icon,
  }: { href: string; labelKey: string; icon: React.ElementType }) => {
    const isActive = location === href;
    return (
      <Link href={href}>
        <div
          title={collapsed ? t(labelKey) : undefined}
          className={cn(
            "flex items-center rounded-xl transition-all duration-150 cursor-pointer group relative linqi-nav-item",
            collapsed ? "justify-center px-2 py-2.5 mx-1" : "gap-3 px-3.5 py-2.5",
            isActive ? "linqi-nav-active bg-primary shadow-lg shadow-primary/35" : "hover:bg-[var(--shell-hover)]"
          )}
          onClick={() => setIsMobileMenuOpen(false)}
        >
          {/* Active bar — hidden in collapsed mode */}
          {isActive && !collapsed && (
            <motion.div
              layoutId="active-nav-indicator"
              className="absolute start-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-white rounded-e-full"
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
            />
          )}
          <Icon
            className={cn(
              "linqi-nav-icon shrink-0 transition-colors",
              collapsed ? "w-5 h-5" : "w-[18px] h-[18px]",
              isActive
                ? "text-white"
                : "text-slate-900 dark:text-white/80 group-hover:text-slate-900 dark:group-hover:text-white",
            )}
            style={
              !isActive
                ? {
                    color: "var(--terminal-accent)",
                    filter: "drop-shadow(0 0 4px color-mix(in srgb, var(--terminal-accent) 50%, transparent))",
                  }
                : undefined
            }
          />
          {!collapsed && (
            <span
              className={cn(
                "linqi-nav-label truncate transition-colors text-[13px] font-bold leading-none",
                isActive
                  ? "text-white"
                  : "text-slate-900 dark:text-white/80 group-hover:text-slate-900 dark:group-hover:text-white",
              )}
              style={{
                fontFamily: "'Vazirmatn', sans-serif",
                textShadow: isActive ? "0 1px 8px rgba(0,0,0,0.4)" : undefined,
              }}
            >
              {t(labelKey)}
            </span>
          )}
        </div>
      </Link>
    );
  };

  /* ── Section header ───────────────────────────────────────────── */
  const SectionHeader = ({ icon: Icon, labelKey }: { icon: React.ElementType; labelKey: string }) =>
    collapsed ? (
      <div className="px-3 py-2.5">
        <div className="h-px rounded-full linqi-shell-divider" />
      </div>
    ) : (
      <div className="px-4 pt-4 pb-1">
        <p className="text-[9.5px] linqi-section-label font-extrabold uppercase tracking-[0.18em] flex items-center gap-1.5">
          <Icon className="w-2.5 h-2.5 shrink-0 text-slate-600 dark:text-[rgba(77,158,255,0.45)]" />
          {t(labelKey)}
        </p>
      </div>
    );

  /* ── Sidebar content (shared desktop + mobile) ─────────────────── */
  const SidebarContent = ({ forceExpanded = false }: { forceExpanded?: boolean }) => {
    const isCollapsed = collapsed && !forceExpanded;
    return (
      <>
        {/* Logo + collapse toggle */}
        <div
          className={cn(
            "flex items-center border-b linqi-shell-border-b shrink-0",
            isCollapsed ? "justify-center px-2 py-4" : "gap-3 px-5 py-[18px]"
          )}
        >
          {/* Icon */}
          <div className="relative shrink-0">
            <div className="absolute inset-0 bg-primary blur-lg opacity-40 rounded-xl" />
            <div className="relative p-2 rounded-xl border border-primary/25 backdrop-blur-sm bg-slate-100/80 dark:bg-slate-800/80 dark:border-slate-700/60">
              <Zap className="w-[18px] h-[18px] text-primary" />
            </div>
          </div>

          {!isCollapsed && (
            <>
              <div className="flex-1 min-w-0">
                <h1 className="text-[15px] font-extrabold linqi-brand-title leading-none tracking-wide">LinQi</h1>
                <p className="text-[9px] linqi-brand-sub mt-0.5 font-semibold tracking-widest uppercase">Terminal</p>
              </div>
              {/* Status dot */}
              <div className="shrink-0 w-1.5 h-1.5 rounded-full"
                style={{ background: "var(--terminal-accent)", boxShadow: "0 0 6px var(--terminal-accent)" }} />
            </>
          )}

          {/* Collapse toggle — desktop only (not rendered when forceExpanded = mobile) */}
          {!forceExpanded && (
            <button
              onClick={toggleCollapsed}
              title={t(collapsed ? "nav.expand" : "nav.collapse")}
              className={cn(
                "shrink-0 w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-150",
                "text-slate-700 hover:text-slate-900 hover:bg-slate-200/60",
                "dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-800",
                isCollapsed && "mt-0",
              )}
            >
              <CollapseIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav
          className={cn("flex-1 pt-2 overflow-y-auto overflow-x-hidden", isCollapsed ? "px-1" : "px-2.5")}
          style={{ scrollbarWidth: "none" }}
        >
          <NavLink href="/" labelKey="nav.dashboard" icon={LayoutDashboard} />

          {hasB2bNav && <SectionHeader icon={Globe} labelKey="nav.b2bTerminal" />}
          {showNav("marketplace")        && <NavLink href="/marketplace"        labelKey="nav.marketplace"       icon={Store}      />}
          {showNav("ai-assistant")       && <NavLink href="/ai-assistant"       labelKey="nav.linqiAssistant"    icon={Bot}        />}
          {showNav("inventory")          && <NavLink href="/inventory"          labelKey="nav.inventory"         icon={Warehouse}  />}
          {showNav("logistics")          && <NavLink href="/logistics"          labelKey="nav.logistics"         icon={Truck}      />}
          {showNav("negotiation")        && <NavLink href="/negotiation"        labelKey="nav.negotiation"       icon={Handshake}  />}
          {showNav("financial")          && <NavLink href="/financial"          labelKey="nav.financial"         icon={DollarSign} />}
          {showNav("market-intel")       && <NavLink href="/market-intel"       labelKey="nav.marketIntel"       icon={TrendingUp} />}
          {showNav("supplier-directory") && <NavLink href="/supplier-directory" labelKey="nav.supplierDirectory" icon={BookOpen}   />}
          {showNav("procurement")        && <NavLink href="/procurement"        labelKey="nav.procurement"       icon={FileSearch} />}

          <SectionHeader icon={Zap} labelKey="nav.tools" />
          <NavLink href="/notifications" labelKey="nav.notificationCenter" icon={Bell}   />
          <NavLink href="/rewards"       labelKey="nav.rewardsCenter"      icon={Trophy} />

          <div className="h-4" />
        </nav>

        {/* Language + Theme — hidden when collapsed */}
        {!isCollapsed && (
          <>
            <div className="px-2.5 pb-1">
              <ThemeModeToggle />
            </div>
            <LanguageSwitcher variant="sidebar" />
            <div className="px-2.5 pb-1">
              <ThemeCustomizer />
            </div>
          </>
        )}

        {/* User / logout footer */}
        <div className={cn("shrink-0", isCollapsed ? "p-2" : "p-4 space-y-2.5")}>
          {/* PWA install — hide when collapsed */}
          {canInstall && !isCollapsed && (
            <button
              onClick={install}
              className="w-full flex items-center justify-center gap-2 bg-primary/15 hover:bg-primary/25 border border-primary/25 text-primary py-2.5 rounded-xl font-bold text-sm transition-all group"
            >
              <Download className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
              {t("nav.installApp")}
            </button>
          )}

          {isCollapsed ? (
            /* Collapsed: avatar + logout icon only */
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                <div className="absolute inset-0 rounded-full" style={{ boxShadow: "0 0 0 2px var(--terminal-accent), 0 0 10px var(--terminal-accent-glow)" }} />
                <div className="w-9 h-9 rounded-full flex items-center justify-center font-extrabold text-sm text-white relative z-10"
                  style={{ background: "linear-gradient(135deg, var(--terminal-accent), color-mix(in srgb, var(--terminal-accent) 65%, #000))" }}>
                  {displayName.charAt(0)?.toUpperCase() ?? "?"}
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSignOut();
                }}
                title={t("nav.logout")}
                className="w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-90 active:opacity-80 text-slate-700 hover:text-rose-600 hover:bg-rose-500/10 dark:text-white/30"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Expanded: full user card */
            <div
              className="linqi-user-card rounded-2xl p-3.5 transition-all duration-300 cursor-default"
              style={{ borderTopColor: "var(--terminal-accent)" }}
            >
              <div className="flex items-center gap-3 mb-2.5">
                <div className="relative shrink-0">
                  <div className="absolute inset-0 rounded-full" style={{ boxShadow: "0 0 0 2px var(--terminal-accent), 0 0 12px 3px var(--terminal-accent-glow)" }} />
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-white text-sm relative z-10"
                    style={{ background: "linear-gradient(135deg, var(--terminal-accent) 0%, color-mix(in srgb, var(--terminal-accent) 65%, #000) 100%)", boxShadow: "0 2px 10px var(--terminal-accent-glow)" }}>
                    {displayName.charAt(0)?.toUpperCase() ?? "?"}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] truncate font-extrabold linqi-brand-title leading-snug" style={{ fontFamily: "Vazirmatn,sans-serif" }}>{displayName}</p>
                  <p className="text-[10px] flex items-center gap-1 mt-0.5 font-extrabold"
                    style={{ color: "var(--terminal-accent)", fontFamily: "Vazirmatn,sans-serif" }}>
                    {user?.role === "admin" ? (
                      <><Shield className="w-3 h-3 shrink-0" style={{ filter: "drop-shadow(0 0 4px var(--terminal-accent))" }} />{roleLabel}</>
                    ) : roleLabel}
                  </p>
                </div>
              </div>
              <div className="mb-2.5 rounded-full" style={{ height: "1px", background: "linear-gradient(90deg,transparent,var(--terminal-accent-glow),transparent)" }} />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSignOut();
                }}
                disabled={signingOut}
                className="w-full flex items-center justify-center gap-2 py-1.5 rounded-xl font-extrabold text-[11px] transition-all duration-200 active:scale-[0.97] active:opacity-85 disabled:opacity-70 text-slate-700 hover:text-rose-600 hover:bg-rose-500/10 dark:text-white/40"
              >
                <LogOut className="w-3.5 h-3.5" /> {t("nav.logout")}
              </button>
            </div>
          )}
        </div>
      </>
    );
  };

  /* ── Render ─────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen flex overflow-hidden linqi-app-root">

      {/* ── Desktop sidebar ──────────────────────────────────────── */}
      <aside
        ref={desktopSidebarRef}
        className="hidden lg:flex flex-col relative z-20 shrink-0 overflow-hidden linqi-sidebar"
        style={{
          width:           collapsed ? "72px" : "256px",
          transition:      "width 300ms cubic-bezier(0.4,0,0.2,1)",
          minWidth:        collapsed ? "72px" : "256px",
        }}
      >
        <SidebarParticles sidebarRef={desktopSidebarRef} />
        <div className="relative flex flex-col flex-1 min-h-0 overflow-hidden" style={{ zIndex: 10 }}>
          <SidebarContent forceExpanded={false} />
        </div>
      </aside>

      {/* ── Mobile top bar ───────────────────────────────────────── */}
      <div
        className="lg:hidden fixed top-0 inset-x-0 h-14 z-30 flex items-center justify-between gap-3 px-4 linqi-mobile-header"
      >
        {/* Mobile page title */}
        <div className="flex items-center gap-2 shrink-0 min-w-0 max-w-[38%]">
          <div className="p-1.5 rounded-lg border border-primary/20 shrink-0 bg-slate-100/80 dark:bg-slate-800/80 dark:border-slate-700/60">
            <Zap className="w-[18px] h-[18px] text-primary" />
          </div>
          <div className="min-w-0">
            <span
              className="block font-extrabold linqi-breadcrumb-text text-[14px] leading-tight truncate"
              style={{ fontFamily: "Vazirmatn,sans-serif" }}
            >
              {pageTitle}
            </span>
            <span className="block text-[9px] linqi-brand-sub font-semibold tracking-widest uppercase truncate">LinQi</span>
          </div>
        </div>

        {/* Mobile search (compact) */}
        <div className="flex-1 relative min-w-0">
          <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none linqi-search-icon" />
          <input
            type="text"
            placeholder={t("top.search")}
            className="w-full ps-8 pe-3 py-1.5 rounded-lg text-[12px] outline-none linqi-shell-input"
            style={{ fontFamily: "Vazirmatn,sans-serif" }}
          />
        </div>

        {/* Hamburger */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="shrink-0 p-2 -me-1 text-slate-700 hover:text-primary transition-colors rounded-lg hover:bg-slate-200/60 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* ── Mobile drawer ────────────────────────────────────────── */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-[3px] z-40 lg:hidden"
            />
            <motion.aside
              ref={mobileSidebarRef}
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.30 }}
              className="fixed top-0 bottom-0 end-0 w-[280px] flex flex-col z-50 overflow-hidden linqi-sidebar border-slate-800"
            >
              <SidebarParticles sidebarRef={mobileSidebarRef} />
              <div className="relative flex flex-col flex-1 min-h-0 overflow-hidden" style={{ zIndex: 10 }}>
                {/* Close btn */}
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="absolute top-4 start-4 z-10 p-1.5 linqi-shell-muted hover:text-[var(--shell-text-primary)] bg-[var(--shell-hover)] rounded-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <SidebarContent forceExpanded={true} />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main content ─────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 min-h-0 h-screen pt-14 lg:pt-0">

        {/* Offline banner */}
        <AnimatePresence>
          {isOffline && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}
              className="overflow-hidden shrink-0"
            >
              <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-[13px] font-bold">
                <WifiOff className="w-4 h-4 shrink-0" />
                <span>{t("common.offline")}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Desktop top header — z-50 so menus float above page content */}
        <div className="relative z-50 shrink-0">
          <TopHeader searchRef={searchRef} />
        </div>

        {/* Page content */}
        <div
          className="flex-1 overflow-y-auto overflow-x-hidden linqi-main-scroll"
          style={{ padding: "clamp(1rem, 2.5vw, 1.75rem)" }}
        >
          <motion.div
            key={location}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            className="max-w-[1440px] mx-auto min-h-full linqi-page"
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
