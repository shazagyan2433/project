import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import type { AuthUser } from "@/contexts/AuthContext";
import { Zap, Eye, EyeOff, LogIn, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { parseJsonResponse } from "@/lib/api-fallback";
import {
  applyOfflineAdminSession,
  isOfflineApiResponse,
  LOGIN_FETCH_TIMEOUT_MS,
} from "@/lib/local-auth";
import {
  AUTH_TOKEN_KEY,
  hardNavigate,
  hasAuthenticatedAppAccess,
  isBypassAuthToken,
} from "@/lib/auth-session";

export default function Login() {
  const { loginWithToken, user } = useAuth();
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const submitLockRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token || isBypassAuthToken(token) || !hasAuthenticatedAppAccess()) return;
    navigate(user.role === "admin" ? "/admin/dashboard" : "/dashboard");
  }, [user, navigate]);

  const finishOfflineAdminLogin = () => {
    const session = applyOfflineAdminSession(username, password);
    if (!session) return false;

    loginWithToken(session.token, session.user);
    setIsLoading(false);
    navigate("/admin/dashboard");

    // Hard fallback if the router does not navigate (e.g. auth guard race).
    window.setTimeout(() => {
      const path = window.location.pathname.replace(/\/$/, "") || "/";
      if (path === "/login" || path.endsWith("/login")) {
        hardNavigate("/admin/dashboard");
      }
    }, 150);

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLockRef.current) return;

    setError("");
    setIsLoading(true);
    submitLockRef.current = true;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), LOGIN_FETCH_TIMEOUT_MS);

    try {
      let res: Response | undefined;

      try {
        res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
          signal: controller.signal,
        });
      } catch {
        if (finishOfflineAdminLogin()) return;
        setError(t("auth.error"));
        return;
      }

      const body = await parseJsonResponse<{
        token?: string;
        user?: { role?: string };
        message?: string;
        offline?: boolean;
      }>(res);

      if (res.ok && body?.token && body.user) {
        loginWithToken(body.token, body.user as AuthUser);
        const target = body.user.role === "admin" ? "/admin/dashboard" : "/dashboard";
        setIsLoading(false);
        navigate(target);
        return;
      }

      if (isOfflineApiResponse(res, body)) {
        if (finishOfflineAdminLogin()) return;
        setError(body?.message ?? t("auth.error"));
        return;
      }

      setError(body?.message ?? t("auth.error"));
    } catch (err: unknown) {
      if (finishOfflineAdminLogin()) return;
      setError((err as Error).message ?? t("auth.error"));
    } finally {
      window.clearTimeout(timeoutId);
      submitLockRef.current = false;
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#0D1117] to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative mb-4">
              <div className="absolute inset-0 bg-primary blur-xl opacity-40 rounded-2xl" />
              <div className="relative p-4 bg-[#0D1117] rounded-2xl border border-primary/30">
                <Zap className="w-10 h-10 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">LinQi</h1>
            <p className="text-slate-400 text-sm mt-1">{t("brand.tagline")}</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                {t("auth.username")}
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                placeholder="admin"
                className="w-full bg-white/5 border border-white/10 text-white placeholder-slate-500 px-4 py-3.5 rounded-2xl outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                {t("auth.password")}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 text-white placeholder-slate-500 px-4 py-3.5 rounded-2xl outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all ltr:pr-12 rtl:pl-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute ltr:right-4 rtl:left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm font-medium px-4 py-3 rounded-xl text-center"
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-primary to-blue-400 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/25 hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0 mt-2"
            >
              {isLoading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> {t("auth.loading")}</>
              ) : (
                <><LogIn className="w-5 h-5" /> {t("auth.login")}</>
              )}
            </button>
          </form>

          <p className="text-center text-slate-500 text-xs mt-6">
            {t("auth.defaultAccount")}: <span className="text-slate-400 font-mono">admin / admin123</span>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
