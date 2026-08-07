import { useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import {
  LayoutDashboard, Shield, UserCog, LogOut, ArrowLeft, ClipboardList,
  RefreshCw, Camera, UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { mergeCachedUser } from "@/lib/api-fallback";
import { resizeImageFile } from "@/lib/image-resize";
import { adminTabActive, adminTabInactive, adminLangActive, adminLangInactive } from "@/lib/admin-nav-styles";
import { ensureMerchantAppSession } from "@/lib/local-dev";
import {
  exitAdminSession,
  hardNavigate,
  prepareOnboardingSession,
  prepareMerchantSession,
  navigateToMerchantApp,
  MERCHANT_APP_PATH,
} from "@/lib/auth-session";

const LOGO_BOX = "w-10 h-10 min-w-10 min-h-10 max-w-10 max-h-10";

const ADMIN_LINKS = [
  { href: "/admin/dashboard",          labelKey: "nav.masterAdmin", icon: LayoutDashboard },
  { href: "/admin/verification-queue", labelKey: "verify.title",    icon: ClipboardList },
  { href: "/admin/users",              labelKey: "nav.users",       icon: UserCog },
] as const;

const LANG_CODES = ["ku", "ar", "en"] as const;

function AdminBrandLogo() {
  const { user, token, loginWithToken } = useAuth();
  const { t } = useTranslation("admin");
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!user || !token) return;
    setUploading(true);
    try {
      const avatarUrl = await resizeImageFile(file, 256);

      try {
        const res = await fetch("/api/auth/me", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ avatarUrl }),
        });
        if (res.ok) {
          const updated = await res.json();
          loginWithToken(token, { ...user, ...updated });
        } else {
          throw new Error("api failed");
        }
      } catch {
        const merged = mergeCachedUser({ ...user, avatarUrl });
        loginWithToken(token, merged);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      disabled={uploading}
      className={cn(
        "group relative shrink-0 rounded-xl overflow-hidden border border-cyan-500/20",
        "hover:border-cyan-400/50 transition-colors disabled:opacity-60",
        LOGO_BOX,
      )}
      style={{ background: "linear-gradient(135deg, #00d4ff, #0066ff)", boxShadow: "0 0 20px rgba(0,212,255,0.35)" }}
      title={t("common.uploadLogo", { defaultValue: "Upload logo / avatar" })}
    >
      {user?.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt=""
          className="absolute inset-0 block w-full h-full max-w-full max-h-full object-cover object-center"
        />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center">
          <Shield className="w-4 h-4 text-white shrink-0" />
        </span>
      )}
      <span className="absolute inset-0 z-10 flex items-center justify-center bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <Camera className="w-3.5 h-3.5 text-white shrink-0" />
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </button>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const { user, logout, loginWithToken } = useAuth();
  const { t } = useTranslation();
  const { t: ta } = useTranslation("admin");
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const lang = i18n.language;
  const isDashboard = location === "/admin/dashboard" || location === "/admin";

  const switchLang = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem("linqi_lang", code);
    const rtl = code === "ku" || code === "ar";
    document.documentElement.dir = rtl ? "rtl" : "ltr";
    document.documentElement.lang = code;
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    } finally {
      setRefreshing(false);
    }
  };

  const handleSwitchToApp = () => {
    try {
      prepareMerchantSession();
      const user = ensureMerchantAppSession();
      loginWithToken(
        localStorage.getItem("pos_auth_token") ?? "dev-merchant-bypass",
        user,
      );
      navigate(MERCHANT_APP_PATH);
    } catch {
      navigateToMerchantApp();
      return;
    }
    window.setTimeout(() => {
      const path = window.location.pathname;
      if (path.startsWith("/admin")) {
        hardNavigate(MERCHANT_APP_PATH);
      }
    }, 50);
  };

  const handleGoToOnboarding = () => {
    try {
      prepareOnboardingSession();
      logout();
    } catch {
      prepareOnboardingSession();
    }
    hardNavigate("/onboarding");
  };

  const handleExitAdmin = () => {
    try {
      exitAdminSession();
      logout();
    } catch {
      exitAdminSession();
    }
    hardNavigate("/login");
  };

  return (
    <div className="min-h-screen bg-[#070d1a] text-white flex flex-col" dir={document.documentElement.dir}>
      <header className="shrink-0 border-b border-white/5 bg-[#0a0f1e]/90 backdrop-blur-xl z-20 overflow-hidden">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 min-h-14 max-h-14 h-14 flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 overflow-hidden">
            <AdminBrandLogo />
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="text-[10px] text-cyan-400/80 font-mono uppercase tracking-widest leading-none truncate">
                LINQI ADMIN
              </p>
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="text-sm font-bold text-white leading-tight truncate shrink min-w-0">
                  {t("nav.adminSection", { defaultValue: "بەڕێوەبەر" })}
                </h1>
                <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
                  <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider whitespace-nowrap">
                    {ta("common.ownerAccess")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
            {ADMIN_LINKS.map(({ href, labelKey, icon: Icon }) => {
              const active = location === href || (href === "/admin/dashboard" && location === "/admin");
              return (
                <Link key={href} href={href}>
                  <span
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border",
                      active ? "bg-cyan-500 text-white font-semibold shadow-lg shadow-cyan-500/30 border border-cyan-400/60" : adminTabInactive,
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {t(labelKey)}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
              {LANG_CODES.map(code => (
                <button
                  key={code}
                  type="button"
                  onClick={() => switchLang(code)}
                  className={cn(
                    "px-2 py-1 rounded-lg text-xs font-semibold transition-all border",
                    lang === code ? adminLangActive : adminLangInactive,
                  )}
                >
                  {ta(`lang.${code}`)}
                </button>
              ))}
            </div>

            {isDashboard && (
              <button
                type="button"
                onClick={() => handleRefresh()}
                disabled={refreshing}
                className="w-8 h-8 rounded-xl border border-white/10 flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-colors disabled:opacity-50"
                title={t("master.refresh", { defaultValue: "Refresh" })}
              >
                <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
              </button>
            )}

            <button
              type="button"
              onClick={handleGoToOnboarding}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-slate-300 text-xs font-bold hover:bg-white/10 hover:text-white transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t("admin.userRegistration", { defaultValue: "User Registration" })}</span>
            </button>

            <button
              type="button"
              onClick={handleSwitchToApp}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-slate-300 text-xs font-bold hover:bg-white/10 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t("admin.backToApp", { defaultValue: "Merchant App" })}</span>
            </button>

            <span className="hidden xl:inline text-xs text-slate-500 max-w-[100px] truncate">{user?.name}</span>

            <button
              type="button"
              onClick={handleExitAdmin}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title={t("nav.logout")}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        <nav className="lg:hidden flex items-center gap-1 px-4 py-2 border-t border-white/5 overflow-x-auto">
          {ADMIN_LINKS.map(({ href, labelKey, icon: Icon }) => {
            const active = location === href || (href === "/admin/dashboard" && location === "/admin");
            return (
              <Link key={href} href={href}>
                <span
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all border",
                    active ? "bg-cyan-500 text-white font-semibold border border-cyan-400/60 shadow-lg shadow-cyan-500/25" : adminTabInactive + " bg-white/[0.04]",
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t(labelKey)}
                </span>
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="flex-1 min-h-0">
        {children}
      </main>
    </div>
  );
}
