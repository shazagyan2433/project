import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Menu, X, Zap,
  LogOut, Shield, Download, WifiOff,
  Globe, Store, Bot, Warehouse, Truck, Handshake, DollarSign, TrendingUp,
  BookOpen, FileSearch, Bell, Trophy, Search, Package, FileText,
  CheckCircle2, AlertCircle, Info, ChevronLeft, ChevronRight,
  Plus, ChevronDown, Settings, Home,
} from "lucide-react";
import { getSectorNavFeatures, normalizeSectorKey, type NavFeatureKey } from "@/lib/industries";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useOffline } from "@/hooks/useOffline";
import { SidebarParticles } from "@/components/SidebarParticles";
import { ThemeCustomizer } from "@/components/ThemeCustomizer";
import { ThemeModeToggle } from "@/components/ThemeModeToggle";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { logoutToEntryScreen } from "@/lib/auth-session";
import { getDisplayUserName } from "@/lib/local-dev";
import { toast } from "@/hooks/use-toast";

/* ── Notification data (loaded from API — empty until notifications endpoint exists) ── */
const NOTIFS: Array<{
  id: number;
  icon: typeof FileText;
  color: string;
  dot: string;
  title: string;
  sub: string;
  time: string;
}> = [];

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
  const { t }                              = useTranslation();
  const { user, isAdmin }                  = useAuth();
  const displayName                        = getDisplayUserName(user);
  const [location, navigate]               = useLocation();
  const [search,       setSearch]          = useState("");
  const [searchFocused, setSearchFocused]  = useState(false);
  const [notifOpen,    setNotifOpen]       = useState(false);
  const [profileOpen,  setProfileOpen]     = useState(false);
  const [quickOpen,    setQuickOpen]       = useState(false);
  const [readIds,      setReadIds]         = useState<Set<number>>(new Set());
  const notifRef   = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const quickRef   = useRef<HTMLDivElement>(null);

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

  /* ── Breadcrumbs ── */
  const sectorLabel = (() => {
    try {
      const key = normalizeSectorKey(
        user?.sectorKey ?? (typeof window !== "undefined" ? localStorage.getItem("linqi_sector") : null),
      );
      if (!key) return "";
      return t(`onboard.sector_${key}`, { ns: "auth", defaultValue: key });
    } catch {
      return "";
    }
  })();

  const breadcrumb = useMemo(() => {
    const map: Record<string, { label: string; parent?: string }> = {
      "/":                         { label: sectorLabel ? t("pageTitles.dashboard", { sector: sectorLabel }) : t("nav.dashboard") },
      "/marketplace":              { label: sectorLabel ? t("pageTitles.marketplace", { sector: sectorLabel }) : t("nav.marketplace"),        parent: t("nav.b2bTerminal") },
      "/ai-assistant":             { label: sectorLabel ? t("pageTitles.aiAssistant", { sector: sectorLabel }) : t("nav.linqiAssistant"),     parent: t("nav.b2bTerminal") },
      "/inventory":                { label: sectorLabel ? t("pageTitles.inventory", { sector: sectorLabel }) : t("nav.inventory"),          parent: t("nav.b2bTerminal") },
      "/logistics":                { label: sectorLabel ? t("pageTitles.logistics", { sector: sectorLabel }) : t("nav.logistics"),          parent: t("nav.b2bTerminal") },
      "/negotiation":              { label: sectorLabel ? t("pageTitles.negotiation", { sector: sectorLabel }) : t("nav.negotiation"),        parent: t("nav.b2bTerminal") },
      "/financial":                { label: sectorLabel ? t("pageTitles.financial", { sector: sectorLabel }) : t("nav.financial"),          parent: t("nav.b2bTerminal") },
      "/market-intel":             { label: sectorLabel ? t("pageTitles.marketIntel", { sector: sectorLabel }) : t("nav.marketIntel"),        parent: t("nav.b2bTerminal") },
      "/supplier-directory":       { label: sectorLabel ? t("pageTitles.suppliers", { sector: sectorLabel }) : t("nav.supplierDirectory"),  parent: t("nav.b2bTerminal") },
      "/procurement":              { label: sectorLabel ? t("pageTitles.procurement", { sector: sectorLabel }) : t("nav.procurement"),        parent: t("nav.b2bTerminal") },
      "/notifications":            { label: t("nav.notificationCenter"), parent: t("nav.tools") },
      "/rewards":                  { label: t("nav.rewardsCenter"),      parent: t("nav.tools") },
      "/dashboard":                { label: sectorLabel ? t("pageTitles.dashboard", { sector: sectorLabel }) : t("nav.dashboard") },
      "/products":                 { label: t("nav.products",  { defaultValue: "Products"  }) },
      "/customers":                { label: t("nav.customers", { defaultValue: "Customers" }) },
      "/pos":                      { label: t("nav.pos",       { defaultValue: "POS"       }) },
      "/sales":                    { label: t("nav.sales",     { defaultValue: "Sales"     }) },
      "/debts":                    { label: t("nav.debts",     { defaultValue: "Debts"     }) },
      "/reports":                  { label: t("nav.reports",   { defaultValue: "Reports"   }) },
      "/history":                  { label: t("nav.history",   { defaultValue: "History"   }) },
      "/settings":                 { label: t("top.settings", { defaultValue: "ڕێکخستنەکان" }) },
    };
    return map[location] ?? { label: location.replace("/", "") };
  }, [t, location, sectorLabel]);

  const unread = NOTIFS.filter(n => !readIds.has(n.id)).length;

  const sectorKey = normalizeSectorKey(
    user?.sectorKey ?? (typeof window !== "undefined" ? localStorage.getItem("linqi_sector") : null),
  );
  const navFeatures = getSectorNavFeatures(isAdmin ? null : sectorKey);
  const showQuickNav = (feat: NavFeatureKey) => !navFeatures || navFeatures.includes(feat);
  const quickActions = QUICK_ACTIONS.filter(a => showQuickNav(a.feature));

  /* ── Shared dropdown style ── */
  const dropdownStyle: React.CSSProperties = {
    backdropFilter:       "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    zIndex: 100,
  };

  return (
    <div
      className="h-16 shrink-0 hidden lg:flex items-center w-full px-5 gap-3 linqi-top-header"
      style={{ zIndex: 5 }}
    >
      {/* ── Breadcrumb ─────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 shrink-0 min-w-0 max-w-[220px]">
        <button
          onClick={() => navigate("/")}
          className="w-6 h-6 flex items-center justify-center rounded-lg shrink-0 transition-colors hover:bg-[var(--shell-hover)] linqi-breadcrumb-muted"
          title="LinQi Dashboard"
        >
          <Home className="w-3.5 h-3.5" />
        </button>
        {breadcrumb.parent && (
          <>
            <span className="text-[11px] font-semibold truncate linqi-breadcrumb-muted">
              {breadcrumb.parent}
            </span>
            <ChevronRight className="w-3 h-3 shrink-0 linqi-breadcrumb-muted" />
          </>
        )}
        <span className="text-[12px] font-extrabold truncate linqi-breadcrumb-text" style={{ fontFamily: "Vazirmatn,sans-serif" }}>
          {breadcrumb.label}
        </span>
      </div>

      {/* ── Search ─────────────────────────────────────────────── */}
      <div className="flex-1 max-w-xs relative">
        <Search
          className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none transition-colors"
          style={{ color: searchFocused ? "rgba(96,165,250,0.7)" : "rgba(255,255,255,0.20)" }}
        />
        <input
          ref={searchRef}
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t("top.search")}
          className="w-full ps-9 pe-14 py-2 rounded-xl text-[12px] outline-none transition-all duration-200 linqi-shell-input"
          style={{ fontFamily: "Vazirmatn,sans-serif" }}
          onFocus={e => {
            setSearchFocused(true);
            e.currentTarget.style.border      = "1px solid rgba(59,130,246,0.45)";
            e.currentTarget.style.background   = "rgba(255,255,255,0.065)";
            e.currentTarget.style.boxShadow    = "0 0 0 3px rgba(59,130,246,0.10)";
          }}
          onBlur={e => {
            setSearchFocused(false);
            e.currentTarget.style.border     = "1px solid rgba(255,255,255,0.07)";
            e.currentTarget.style.background  = "rgba(255,255,255,0.040)";
            e.currentTarget.style.boxShadow   = "none";
          }}
        />
        {/* ⌘K badge */}
        {!searchFocused && !search && (
          <div
            className="absolute end-2.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 rounded-md px-1.5 py-0.5 select-none pointer-events-none"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}
          >
            <span className="text-[9px] font-bold" style={{ color: "rgba(255,255,255,0.28)", fontFamily: "ui-monospace,monospace" }}>⌘K</span>
          </div>
        )}
        {search && (
          <button
            type="button"
            onClick={() => { setSearch(""); searchRef.current?.focus(); }}
            className="absolute end-2.5 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center rounded-full transition-colors"
            style={{ color: "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.10)" }}
          >
            <X className="w-2.5 h-2.5" />
          </button>
        )}
      </div>

      {/* ── Right actions ──────────────────────────────────────── */}
      <div className="flex items-center gap-2 shrink-0 ms-auto">

        {/* Quick action (+) */}
        <div ref={quickRef} className="relative">
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
                className="absolute top-[calc(100%+8px)] end-0 w-52 rounded-2xl overflow-hidden linqi-dropdown"
              >
                <div className="px-4 py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.14em]" style={{ color: "rgba(255,255,255,0.30)", fontFamily: "Vazirmatn,sans-serif" }}>
                    {t("top.quickAction")}
                  </p>
                </div>
                <div className="py-1">
                  {quickActions.map(({ labelKey, href, color }) => (
                    <button
                      key={href}
                      onClick={() => { navigate(href); setQuickOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 transition-all text-start"
                      style={{ background: "transparent" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                    >
                      <div className="w-5 h-5 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}20` }}>
                        <Plus className="w-3 h-3" style={{ color }} />
                      </div>
                      <span className="text-[12px] font-bold" style={{ color: "rgba(255,255,255,0.75)", fontFamily: "Vazirmatn,sans-serif" }}>
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
        <div className="h-5 w-px shrink-0" style={{ background: "rgba(255,255,255,0.08)" }} />

        {/* Language switcher */}
        <LanguageSwitcher variant="header" align="end" />

        <ThemeModeToggle variant="header" />

        {/* Notification bell */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => { setNotifOpen(v => !v); setQuickOpen(false); setProfileOpen(false); }}
            className="relative w-9 h-9 flex items-center justify-center rounded-full transition-all duration-150"
            style={{ background: notifOpen ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.09)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(59,130,246,0.30)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = notifOpen ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.05)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.09)"; }}
          >
            <Bell className="w-[15px] h-[15px]" style={{ color: "rgba(255,255,255,0.55)" }} />
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
                dir="rtl"
                className="absolute top-[calc(100%+10px)] end-0 w-[340px] rounded-2xl overflow-hidden linqi-dropdown"
                style={dropdownStyle}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-center gap-2">
                    <Bell className="w-3.5 h-3.5" style={{ color: "#60a5fa" }} />
                    <span className="text-[12px] font-extrabold text-white" style={{ fontFamily: "Vazirmatn,sans-serif" }}>ئاگادارکردنەوەکان</span>
                    {unread > 0 && (
                      <span className="text-[9px] font-extrabold px-1.5 py-px rounded-full"
                        style={{ background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" }}>
                        {unread} نوێ
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setReadIds(new Set(NOTIFS.map(n => n.id)))}
                    className="text-[10px] font-bold transition-colors"
                    style={{ color: "rgba(96,165,250,0.7)", fontFamily: "Vazirmatn,sans-serif" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#60a5fa"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "rgba(96,165,250,0.7)"}
                  >
                    هەموو بخوێنەوە
                  </button>
                </div>

                {/* List */}
                <div className="overflow-y-auto" style={{ maxHeight: "300px", scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.12) transparent" }}>
                  {NOTIFS.length === 0 ? (
                    <div className="px-4 py-10 text-center text-[11px] text-white/30" style={{ fontFamily: "Vazirmatn,sans-serif" }}>
                      {t("emptyStates.noNotifications", { ns: "common", defaultValue: "هیچ ئاگادارکردنەوەیەک نییە" })}
                    </div>
                  ) : (
                  NOTIFS.map((n, idx) => {
                    const Icon = n.icon;
                    const isRead = readIds.has(n.id);
                    return (
                      <motion.button key={n.id}
                        initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.04 }}
                        onClick={() => setReadIds(prev => new Set([...prev, n.id]))}
                        className="w-full flex items-start gap-3 px-4 py-3 text-start transition-all duration-150"
                        style={{ borderBottom: idx < NOTIFS.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", background: isRead ? "transparent" : "rgba(59,130,246,0.03)" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = isRead ? "transparent" : "rgba(59,130,246,0.03)"}
                      >
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                          style={{ background: `${n.color}15`, border: `1.5px solid ${n.color}28` }}>
                          <Icon className="w-3.5 h-3.5" style={{ color: n.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <p className="text-[11px] font-extrabold leading-snug truncate"
                              style={{ color: isRead ? "rgba(255,255,255,0.50)" : "rgba(255,255,255,0.88)", fontFamily: "Vazirmatn,sans-serif" }}>
                              {n.title}
                            </p>
                            {!isRead && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: n.dot, boxShadow: `0 0 5px ${n.dot}` }} />}
                          </div>
                          <p className="text-[10px] mt-0.5 leading-relaxed" style={{ color: "rgba(255,255,255,0.32)", fontFamily: "Vazirmatn,sans-serif" }}>{n.sub}</p>
                          <p className="text-[9px] mt-0.5" style={{ color: "rgba(255,255,255,0.20)", fontFamily: "Vazirmatn,sans-serif" }}>{n.time} پێش ئێستا</p>
                        </div>
                      </motion.button>
                    );
                  })
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <button className="w-full text-center text-[10.5px] font-bold py-1.5 rounded-xl transition-all"
                    style={{ color: "rgba(96,165,250,0.60)", fontFamily: "Vazirmatn,sans-serif" }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = "#60a5fa"; el.style.background = "rgba(59,130,246,0.07)"; }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = "rgba(96,165,250,0.60)"; el.style.background = "transparent"; }}>
                    هەموو ئاگادارکردنەوەکان ببینە
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Divider */}
        <div className="h-5 w-px shrink-0" style={{ background: "rgba(255,255,255,0.08)" }} />

        {/* Profile badge + dropdown */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => { setProfileOpen(v => !v); setNotifOpen(false); setQuickOpen(false); }}
            className="flex items-center gap-2 ps-1 pe-2 py-1 rounded-full transition-all duration-150"
            style={{
              background: profileOpen ? "rgba(255,255,255,0.08)" : "transparent",
              border: "1px solid " + (profileOpen ? "rgba(255,255,255,0.12)" : "transparent"),
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.10)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = profileOpen ? "rgba(255,255,255,0.08)" : "transparent"; (e.currentTarget as HTMLElement).style.borderColor = profileOpen ? "rgba(255,255,255,0.12)" : "transparent"; }}
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
              <span className="text-[12px] font-extrabold max-w-[110px] truncate"
                style={{ color: "#f1f5f9", fontFamily: "Vazirmatn,sans-serif" }}>
                {displayName}
              </span>
              <ChevronDown className={cn("w-3 h-3 transition-transform duration-200 shrink-0", profileOpen && "rotate-180")}
                style={{ color: "rgba(255,255,255,0.30)" }} />
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
                className="absolute top-[calc(100%+10px)] end-0 w-60 rounded-2xl overflow-hidden linqi-dropdown"
                style={dropdownStyle}
              >
                {/* User info */}
                <div className="px-4 pt-4 pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
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
                      <p className="text-[12.5px] font-extrabold truncate leading-snug" style={{ color: "#f1f5f9", fontFamily: "Vazirmatn,sans-serif" }}>
                        {displayName}
                      </p>
                      <p className="text-[10px] font-bold mt-0.5 flex items-center gap-1"
                        style={{ color: "var(--terminal-accent)", fontFamily: "Vazirmatn,sans-serif" }}>
                        {user?.role === "admin" ? (
                          <><Shield className="w-2.5 h-2.5" />{t("role.admin")}</>
                        ) : t("role.staff")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="py-1">
                  <button
                    onClick={() => { navigate("/settings"); setProfileOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 transition-all text-start"
                    style={{ background: "transparent", color: "rgba(255,255,255,0.60)" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.85)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.60)"; }}
                  >
                    <Settings className="w-4 h-4 shrink-0" />
                    <span className="text-[12px] font-bold" style={{ fontFamily: "Vazirmatn,sans-serif" }}>{t("top.settings")}</span>
                  </button>
                  <div className="mx-4 my-1" style={{ height: "1px", background: "rgba(255,255,255,0.05)" }} />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSignOut();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 transition-all text-start active:scale-[0.98] active:opacity-90"
                    style={{ background: "transparent", color: "rgba(248,113,113,0.70)" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.08)"; (e.currentTarget as HTMLElement).style.color = "#f87171"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "rgba(248,113,113,0.70)"; }}
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
  const displayName = getDisplayUserName(user);
  const { canInstall, install }   = usePWAInstall();
  const isOffline                 = useOffline();
  const desktopSidebarRef         = useRef<HTMLElement>(null);
  const mobileSidebarRef          = useRef<HTMLElement>(null);
  const searchRef                 = useRef<HTMLInputElement>(null);
  const { t }                     = useTranslation();
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
  const sectorKey = normalizeSectorKey(
    user?.sectorKey ?? (typeof window !== "undefined" ? localStorage.getItem("linqi_sector") : null),
  );
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
              isActive ? "text-white" : "text-white/60 group-hover:text-white dark:group-hover:text-white",
            )}
            style={!isActive ? { color: "var(--terminal-accent)", filter: "drop-shadow(0 0 4px color-mix(in srgb, var(--terminal-accent) 50%, transparent))" } : undefined}
          />
          {!collapsed && (
            <span
              className={cn(
                "truncate transition-colors text-[13px] font-bold leading-none",
                isActive ? "text-white" : "text-white/80 group-hover:text-white",
              )}
              style={{ fontFamily: "'Vazirmatn', sans-serif", textShadow: isActive ? "0 1px 8px rgba(0,0,0,0.4)" : undefined }}
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
        <div className="h-px rounded-full" style={{ background: "rgba(255,255,255,0.06)" }} />
      </div>
    ) : (
      <div className="px-4 pt-4 pb-1">
        <p className="text-[9.5px] linqi-section-label font-extrabold uppercase tracking-[0.18em] flex items-center gap-1.5">
          <Icon className="w-2.5 h-2.5 shrink-0" style={{ color: "rgba(77,158,255,0.45)" }} />
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
            "flex items-center border-b border-white/[0.07] shrink-0",
            isCollapsed ? "justify-center px-2 py-4" : "gap-3 px-5 py-[18px]"
          )}
        >
          {/* Icon */}
          <div className="relative shrink-0">
            <div className="absolute inset-0 bg-primary blur-lg opacity-40 rounded-xl" />
            <div className="relative p-2 bg-white/10 rounded-xl border border-primary/25 backdrop-blur-sm">
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
                "text-white/25 hover:text-white/60 hover:bg-white/10",
                isCollapsed && "mt-0"
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
                className="w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-90 active:opacity-80"
                style={{ color: signingOut ? "#F87171" : "rgba(255,255,255,0.30)", background: signingOut ? "rgba(239,68,68,0.18)" : "transparent" }}
                onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.color = "#F87171"; b.style.background = "rgba(239,68,68,0.12)"; }}
                onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.color = "rgba(255,255,255,0.30)"; b.style.background = "transparent"; }}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Expanded: full user card */
            <div
              className="rounded-2xl p-3.5 transition-all duration-300 cursor-default"
              style={{
                background:           "rgba(255,255,255,0.045)",
                backdropFilter:       "blur(14px)",
                WebkitBackdropFilter: "blur(14px)",
                border:               "1px solid rgba(255,255,255,0.10)",
                borderTopColor:       "var(--terminal-accent)",
                boxShadow:            "0 4px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.07)",
              }}
              onMouseEnter={e => { const d = e.currentTarget as HTMLDivElement; d.style.transform = "scale(1.02) translateY(-1px)"; d.style.boxShadow = "0 8px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.10)"; }}
              onMouseLeave={e => { const d = e.currentTarget as HTMLDivElement; d.style.transform = "scale(1) translateY(0)"; d.style.boxShadow = "0 4px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.07)"; }}
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
                  <p className="text-[13px] truncate font-extrabold text-white leading-snug" style={{ fontFamily: "Vazirmatn,sans-serif" }}>{displayName}</p>
                  <p className="text-[10px] flex items-center gap-1 mt-0.5 font-extrabold"
                    style={{ color: "var(--terminal-accent)", fontFamily: "Vazirmatn,sans-serif" }}>
                    {user?.role === "admin" ? (
                      <><Shield className="w-3 h-3 shrink-0" style={{ filter: "drop-shadow(0 0 4px var(--terminal-accent))" }} />{t("role.admin")}</>
                    ) : t("role.staff")}
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
                className="w-full flex items-center justify-center gap-2 py-1.5 rounded-xl font-extrabold text-[11px] transition-all duration-200 active:scale-[0.97] active:opacity-85 disabled:opacity-70"
                style={{
                  color: signingOut ? "#F87171" : "rgba(255,255,255,0.38)",
                  background: signingOut ? "rgba(239,68,68,0.14)" : "transparent",
                  border: signingOut ? "1px solid rgba(239,68,68,0.25)" : "1px solid transparent",
                  letterSpacing: "0.03em",
                  fontFamily: "Vazirmatn,sans-serif",
                }}
                onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.color = "#F87171"; b.style.background = "rgba(239,68,68,0.10)"; b.style.border = "1px solid rgba(239,68,68,0.20)"; }}
                onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.color = "rgba(255,255,255,0.38)"; b.style.background = "transparent"; b.style.border = "1px solid transparent"; }}
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
          backdropFilter:  "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
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
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="p-1.5 bg-white/10 rounded-lg border border-primary/20 shrink-0">
            <Zap className="w-[18px] h-[18px] text-primary" />
          </div>
          <span className="font-extrabold linqi-brand-title text-[15px]">LinQi</span>
        </div>

        {/* Mobile search (compact) */}
        <div className="flex-1 relative min-w-0">
          <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "rgba(255,255,255,0.25)" }} />
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
          className="shrink-0 p-2 -me-1 text-white/60 hover:text-primary transition-colors rounded-lg hover:bg-white/10"
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
              className="fixed top-0 bottom-0 end-0 w-[280px] flex flex-col z-50 shadow-2xl overflow-hidden linqi-sidebar"
              style={{ backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}
            >
              <SidebarParticles sidebarRef={mobileSidebarRef} />
              <div className="relative flex flex-col flex-1 min-h-0 overflow-hidden" style={{ zIndex: 10 }}>
                {/* Close btn */}
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="absolute top-4 start-4 z-10 p-1.5 text-white/40 hover:text-white bg-white/8 rounded-full transition-colors"
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
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden pt-14 lg:pt-0">

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

        {/* Desktop top header */}
        <TopHeader searchRef={searchRef} />

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
            className="max-w-[1440px] mx-auto min-h-full"
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
