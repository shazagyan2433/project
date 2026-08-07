/**
 * Central auth session keys and helpers for admin / merchant navigation.
 */

import { clearPendingReviewSession } from "@/lib/verification-storage";
import { ensureDevAdminSession, isLocalDev } from "@/lib/local-dev";

export const AUTH_TOKEN_KEY = "pos_auth_token";
export const CACHED_USER_KEY = "pos_cached_user";
export const ADMIN_TOKEN_KEY = "admin_token";
export const ADMIN_EXIT_KEY = "linqi_admin_exited";
export const MERCHANT_MODE_KEY = "linqi_merchant_mode";
export const ONBOARDING_RESET_KEY = "linqi_onboarding_reset";
export const MERCHANT_APP_PATH = "/dashboard";
export const USER_ROLE_KEY = "user_role";
export const MERCHANT_ROLE_BYPASS = "merchant";
export const LOGOUT_ENTRY_FLAG = "linqi_logout_entry";
export const LOGIN_ENTRY_PATH = "/login";
export const ONBOARDING_ENTRY_PATH = "/onboarding";
export const SUPER_ADMIN_PATH = "/admin/dashboard";

export const MERCHANT_APP_ALIASES = [MERCHANT_APP_PATH, "/merchant", "/app"] as const;

export function isMerchantAppPath(path: string): boolean {
  const normalized = path.replace(/\/$/, "") || "/";
  return (MERCHANT_APP_ALIASES as readonly string[]).includes(normalized);
}

export function setMerchantBypass() {
  try {
    localStorage.setItem(USER_ROLE_KEY, MERCHANT_ROLE_BYPASS);
  } catch {
    /* ignore */
  }
}

export function clearMerchantBypass() {
  try {
    localStorage.removeItem(USER_ROLE_KEY);
  } catch {
    /* ignore */
  }
}

export function isMerchantBypass(): boolean {
  try {
    return localStorage.getItem(USER_ROLE_KEY) === MERCHANT_ROLE_BYPASS;
  } catch {
    return false;
  }
}

export function clearAuthStorage() {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(CACHED_USER_KEY);
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export function markAdminExited() {
  try {
    sessionStorage.setItem(ADMIN_EXIT_KEY, "1");
    sessionStorage.removeItem(MERCHANT_MODE_KEY);
  } catch {
    /* ignore */
  }
}

export function markMerchantMode() {
  try {
    sessionStorage.setItem(MERCHANT_MODE_KEY, "1");
    sessionStorage.removeItem(ADMIN_EXIT_KEY);
  } catch {
    /* ignore */
  }
}

export function clearSessionFlags() {
  try {
    sessionStorage.removeItem(ADMIN_EXIT_KEY);
    sessionStorage.removeItem(MERCHANT_MODE_KEY);
  } catch {
    /* ignore */
  }
}

export function isAdminExited(): boolean {
  try {
    return sessionStorage.getItem(ADMIN_EXIT_KEY) === "1";
  } catch {
    return false;
  }
}

export function isMerchantMode(): boolean {
  try {
    return sessionStorage.getItem(MERCHANT_MODE_KEY) === "1";
  } catch {
    return false;
  }
}

export function exitAdminSession() {
  clearAuthStorage();
  markAdminExited();
}

export function hardNavigate(path: string) {
  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  const target = path.startsWith("/") ? `${base}${path}` : path;
  window.location.href = target;
}

/** Strip trailing slashes — `/login/` → `/login`, empty → `/`. */
export function normalizeAppPath(path: string): string {
  return path.replace(/\/$/, "") || "/";
}

/** Current in-app path (strips Vite `BASE_URL` prefix). */
export function getCurrentAppPath(): string {
  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  let path = window.location.pathname;
  if (base && path.startsWith(base)) {
    path = path.slice(base.length) || "/";
  }
  return normalizeAppPath(path);
}

export function isLoginEntryPath(path?: string): boolean {
  const normalized = normalizeAppPath(path ?? getCurrentAppPath());
  return normalized === LOGIN_ENTRY_PATH || normalized.endsWith(LOGIN_ENTRY_PATH);
}

export function isPublicEntryPath(path: string): boolean {
  const normalized = normalizeAppPath(path);
  return (
    normalized === "/" ||
    isLoginEntryPath(normalized) ||
    normalized === ONBOARDING_ENTRY_PATH ||
    normalized === "/register"
  );
}

const BYPASS_TOKENS = new Set([
  "mock_token",
  "local-fallback-token",
  "dev-local-bypass",
  "dev-merchant-bypass",
]);

export function isBypassAuthToken(token: string | null | undefined): boolean {
  return !token || BYPASS_TOKENS.has(token);
}

/** Cached platform admin from localStorage (offline / mock admin login). */
export function getCachedAdminUser(): { role: string } | null {
  const cached = localStorage.getItem(CACHED_USER_KEY);
  if (!cached) return null;
  try {
    const parsed = JSON.parse(cached) as { role?: string };
    if (parsed?.role !== "admin") return null;
    return { role: "admin" };
  } catch {
    return null;
  }
}

export function isCurrentlyOnAdminPath(): boolean {
  const normalized = getCurrentAppPath();
  return normalized === "/admin" || normalized.startsWith("/admin/");
}

/** True when the user finished onboarding or has a real API session (not dev bypass). */
export function hasAuthenticatedAppAccess(): boolean {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token && !isBypassAuthToken(token)) return true;

  const cached = localStorage.getItem(CACHED_USER_KEY);
  if (!cached) return false;
  try {
    const user = JSON.parse(cached) as { role?: string };
    return user?.role === "supplier" || user?.role === "buyer" || user?.role === "driver";
  } catch {
    return false;
  }
}

export function hasAdminApiSession(): boolean {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token || isBypassAuthToken(token)) return false;
  const cached = localStorage.getItem(CACHED_USER_KEY);
  if (!cached) return Boolean(localStorage.getItem(ADMIN_TOKEN_KEY));
  try {
    const user = JSON.parse(cached) as { role?: string };
    return user?.role === "admin";
  } catch {
    return Boolean(localStorage.getItem(ADMIN_TOKEN_KEY));
  }
}

/** Clear admin auth and onboarding wizard state before showing public registration. */
export function prepareOnboardingSession() {
  clearAuthStorage();
  clearMerchantBypass();
  markAdminExited();
  clearPendingReviewSession();
  try {
    localStorage.removeItem("linqi_sector");
    sessionStorage.setItem(ONBOARDING_RESET_KEY, "1");
  } catch {
    /* ignore */
  }
}

/** Reset session and hard-navigate to the onboarding wizard. */
export function navigateToOnboarding() {
  prepareOnboardingSession();
  hardNavigate("/onboarding");
}

/** Switch to the main client application (merchant dashboard). */
export function prepareMerchantSession() {
  markMerchantMode();
  setMerchantBypass();
  try {
    sessionStorage.removeItem(ONBOARDING_RESET_KEY);
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export function navigateToMerchantApp() {
  prepareMerchantSession();
  hardNavigate(MERCHANT_APP_PATH);
}

/** Full terminal logout — clears auth, role bypass, and onboarding state. */
export function performTerminalLogout() {
  clearAuthStorage();
  clearMerchantBypass();
  clearSessionFlags();
  clearPendingReviewSession();
  markAdminExited();

  const localKeys = [
    "user_token",
    "user_role",
    "onboarding_session",
    "linqi_sector",
    "pos_cached_users",
    "pending_verifications",
    "pos_pending_review",
  ];

  try {
    for (const key of localKeys) {
      localStorage.removeItem(key);
    }
    sessionStorage.removeItem(ONBOARDING_RESET_KEY);
    sessionStorage.setItem(LOGOUT_ENTRY_FLAG, "1");
  } catch {
    /* ignore */
  }
}

export function isLogoutEntry(): boolean {
  try {
    return sessionStorage.getItem(LOGOUT_ENTRY_FLAG) === "1";
  } catch {
    return false;
  }
}

export function clearLogoutEntryFlag() {
  try {
    sessionStorage.removeItem(LOGOUT_ENTRY_FLAG);
  } catch {
    /* ignore */
  }
}

/** Sign out and open login / onboarding for a fresh session. */
export function logoutToEntryScreen(entry: "login" | "onboarding" = "onboarding") {
  performTerminalLogout();
  try {
    sessionStorage.setItem(ONBOARDING_RESET_KEY, "1");
  } catch {
    /* ignore */
  }
  hardNavigate(entry === "login" ? LOGIN_ENTRY_PATH : ONBOARDING_ENTRY_PATH);
}

function hasAdminSession(): boolean {
  const raw = localStorage.getItem(CACHED_USER_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { role?: string };
      if (parsed.role === "admin") return true;
    } catch {
      /* ignore */
    }
  }
  return Boolean(localStorage.getItem(ADMIN_TOKEN_KEY));
}

/** Leave merchant mode and open the Super Admin console. */
export function navigateToSuperAdminPanel(): void {
  clearMerchantBypass();
  clearSessionFlags();
  try {
    sessionStorage.removeItem(LOGOUT_ENTRY_FLAG);
  } catch {
    /* ignore */
  }

  if (!hasAdminSession()) {
    if (isLocalDev()) {
      const admin = ensureDevAdminSession();
      const token = localStorage.getItem(AUTH_TOKEN_KEY) ?? "dev-local-bypass";
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      localStorage.setItem(ADMIN_TOKEN_KEY, token);
      localStorage.setItem(CACHED_USER_KEY, JSON.stringify(admin));
    } else {
      hardNavigate(LOGIN_ENTRY_PATH);
      return;
    }
  }

  hardNavigate(SUPER_ADMIN_PATH);
}
