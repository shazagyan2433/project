import type { AuthUser } from "@/contexts/AuthContext";
import { resolveDisplayUserName } from "@/lib/user-display";

const CACHED_USER_KEY = "pos_cached_user";

export const DEV_MOCK_ADMIN: AuthUser = {
  id: 1,
  name: "LinQi Admin",
  username: "admin",
  role: "admin",
  email: "admin@linqi.com",
  canViewProfit: true,
  canDeleteData: true,
  canEditStock: true,
  canAccessReports: true,
};

export const DEV_MOCK_MERCHANT: AuthUser = {
  id: 2,
  name: "LinQi Demo Store",
  username: "merchant",
  role: "staff",
  email: "merchant@linqi.com",
  sectorKey: "retail",
  storeName: "LinQi Demo Store",
  canViewProfit: true,
  canDeleteData: false,
  canEditStock: true,
  canAccessReports: true,
};

/** Vite dev server + localhost — admin routes bypass auth guards. */
export function isLocalDev(): boolean {
  if (!import.meta.env.DEV) return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0";
}

/** Persist and return a mock platform admin for local UI development. */
export function ensureDevAdminSession(): AuthUser {
  if (import.meta.env.PROD) {
    throw new Error("Dev admin session is disabled in production");
  }
  const raw = localStorage.getItem(CACHED_USER_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as AuthUser;
      if (parsed.role === "admin") return parsed;
    } catch {
      /* use default mock */
    }
  }
  localStorage.setItem(CACHED_USER_KEY, JSON.stringify(DEV_MOCK_ADMIN));
  return DEV_MOCK_ADMIN;
}

/** Persist and return a mock merchant for the main client application. */
export function ensureMerchantAppSession(): AuthUser {
  if (import.meta.env.PROD) {
    throw new Error("Dev merchant session is disabled in production");
  }
  const raw = localStorage.getItem(CACHED_USER_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as AuthUser;
      if (parsed.role === "supplier" || parsed.role === "staff") return parsed;
    } catch {
      /* use default mock */
    }
  }
  localStorage.setItem(CACHED_USER_KEY, JSON.stringify(DEV_MOCK_MERCHANT));
  localStorage.setItem("linqi_sector", DEV_MOCK_MERCHANT.sectorKey ?? "retail");
  if (!localStorage.getItem("pos_auth_token")) {
    localStorage.setItem("pos_auth_token", "dev-merchant-bypass");
  }
  return DEV_MOCK_MERCHANT;
}

/** @deprecated Use ensureMerchantAppSession */
export const ensureDevMerchantSession = ensureMerchantAppSession;

/** Production-friendly label for profile UI (strips legacy "Dev …" mock names). */
export function getDisplayUserName(user: AuthUser | null | undefined): string {
  return resolveDisplayUserName(user);
}
