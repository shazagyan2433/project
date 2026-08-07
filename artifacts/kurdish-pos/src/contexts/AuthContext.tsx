import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { parseStoreCoords } from "@/lib/store-location";
import {
  AUTH_TOKEN_KEY,
  ADMIN_TOKEN_KEY,
  CACHED_USER_KEY,
  clearAuthStorage,
  clearSessionFlags,
  clearMerchantBypass,
  isMerchantMode,
  isMerchantBypass,
  logoutToEntryScreen,
  hasAuthenticatedAppAccess,
  isBypassAuthToken,
  getCachedAdminUser,
  isCurrentlyOnAdminPath,
} from "@/lib/auth-session";
import { parseJsonResponse } from "@/lib/api-fallback";
import { isOfflineApiResponse, LOGIN_FETCH_TIMEOUT_MS } from "@/lib/local-auth";

export interface UserPermissions {
  canViewProfit: boolean;
  canDeleteData: boolean;
  canEditStock: boolean;
  canAccessReports: boolean;
}

export interface AuthUser {
  id: number;
  name: string;
  username: string;
  role: "admin" | "staff" | "supplier" | "buyer" | "driver";
  email?: string;
  phone?: string;
  avatarUrl?: string;
  storeName?: string;
  storeAddress?: string;
  storeLat?: number;
  storeLng?: number;
  taxNumber?: string;
  nationalId?: string;
  province?: string;
  sectorKey?: string;
  canViewProfit: boolean;
  canDeleteData: boolean;
  canEditStock: boolean;
  canAccessReports: boolean;
}

interface RegisterData {
  fullName: string;
  email: string;
  phone: string;
  nationalId: string;
  role: "supplier" | "buyer" | "driver";
  province?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  loginWithToken: (token: string, user: AuthUser) => void;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  permissions: UserPermissions;
  refreshUser: () => void;
}

const defaultPermissions: UserPermissions = {
  canViewProfit: false,
  canDeleteData: false,
  canEditStock: true,
  canAccessReports: true,
};

const AuthContext = createContext<AuthContextValue | null>(null);

const ONBOARDING_ROLES = new Set<AuthUser["role"]>(["supplier", "buyer", "driver"]);

function getPermissions(user: AuthUser | null): UserPermissions {
  if (!user) return defaultPermissions;
  if (user.role === "admin") {
    return { canViewProfit: true, canDeleteData: true, canEditStock: true, canAccessReports: true };
  }
  if (user.role === "supplier") {
    return { canViewProfit: true, canDeleteData: false, canEditStock: true, canAccessReports: true };
  }
  if (user.role === "buyer") {
    return { canViewProfit: false, canDeleteData: false, canEditStock: false, canAccessReports: false };
  }
  if (user.role === "driver") {
    return { canViewProfit: false, canDeleteData: false, canEditStock: false, canAccessReports: false };
  }
  return {
    canViewProfit: user.canViewProfit,
    canDeleteData: user.canDeleteData,
    canEditStock: user.canEditStock,
    canAccessReports: user.canAccessReports,
  };
}

function readCachedOnboardingUser(): AuthUser | null {
  const cached = localStorage.getItem(CACHED_USER_KEY);
  if (!cached) return null;
  try {
    const parsed = JSON.parse(cached) as AuthUser;
    return ONBOARDING_ROLES.has(parsed.role) ? parsed : null;
  } catch {
    return null;
  }
}

function readCachedMerchantUser(): AuthUser | null {
  const cached = localStorage.getItem(CACHED_USER_KEY);
  if (!cached) return null;
  try {
    const parsed = JSON.parse(cached) as AuthUser;
    if (parsed.role === "staff" || ONBOARDING_ROLES.has(parsed.role)) return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

function readCachedAdminUser(): AuthUser | null {
  const admin = getCachedAdminUser();
  if (!admin) return null;
  try {
    return JSON.parse(localStorage.getItem(CACHED_USER_KEY) ?? "") as AuthUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(AUTH_TOKEN_KEY));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setAuthTokenGetter(() => localStorage.getItem(AUTH_TOKEN_KEY));
  }, []);

  const fetchMe = (tok: string) => {
    setIsLoading(true);
    return fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${tok}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error("invalid token");
        return r.json();
      })
      .then((u) => {
        const coords = parseStoreCoords(u.storeAddress);
        if (!u.storeLat && coords) {
          u.storeLat = coords.lat;
          u.storeLng = coords.lng;
        }
        setUser(u);
        localStorage.setItem(CACHED_USER_KEY, JSON.stringify(u));
      })
      .catch(() => {
        const admin = readCachedAdminUser();
        if (admin) {
          setUser(admin);
          return;
        }
        if (isCurrentlyOnAdminPath()) {
          clearAuthStorage();
          setToken(null);
          setUser(null);
          return;
        }
        const cached =
          readCachedOnboardingUser() ??
          ((isMerchantBypass() || isMerchantMode()) ? readCachedMerchantUser() : null);
        if (cached) {
          setUser(cached);
          return;
        }
        clearAuthStorage();
        setToken(null);
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    const onAdminPath = isCurrentlyOnAdminPath();
    const adminCached = readCachedAdminUser();
    const adminToken =
      localStorage.getItem(ADMIN_TOKEN_KEY) ??
      (adminCached ? localStorage.getItem(AUTH_TOKEN_KEY) : null);

    if (adminCached && adminToken) {
      setUser(adminCached);
      setToken(adminToken);
      if (!isBypassAuthToken(adminToken)) {
        fetchMe(adminToken);
      } else {
        setIsLoading(false);
      }
      return;
    }

    if (token && isBypassAuthToken(token)) {
      if (adminCached) {
        setUser(adminCached);
        setToken(localStorage.getItem(AUTH_TOKEN_KEY));
        setIsLoading(false);
        return;
      }
      clearAuthStorage();
      clearMerchantBypass();
      setToken(null);
      setUser(null);
      setIsLoading(false);
      return;
    }

    if (
      !onAdminPath &&
      (isMerchantBypass() || isMerchantMode()) &&
      hasAuthenticatedAppAccess()
    ) {
      const cached = readCachedOnboardingUser() ?? readCachedMerchantUser();
      if (cached) {
        setUser(cached);
        setToken(localStorage.getItem(AUTH_TOKEN_KEY));
        setIsLoading(false);
        return;
      }
    }

    if (!token) {
      if (!onAdminPath) {
        const cached = readCachedOnboardingUser();
        setUser(cached);
      } else {
        setUser(null);
      }
      setIsLoading(false);
      return;
    }

    fetchMe(token);
  }, [token]);

  const refreshUser = useCallback(() => {
    const tok = localStorage.getItem(AUTH_TOKEN_KEY);
    if (tok && !isBypassAuthToken(tok)) fetchMe(tok);
  }, []);

  const applySession = useCallback((tok: string, u: AuthUser) => {
    localStorage.setItem(AUTH_TOKEN_KEY, tok);
    localStorage.setItem(CACHED_USER_KEY, JSON.stringify(u));
    if (u.role === "admin") {
      localStorage.setItem(ADMIN_TOKEN_KEY, tok);
      clearMerchantBypass();
    }
    clearSessionFlags();
    setToken(tok);
    setUser(u);
  }, []);

  const loginWithToken = useCallback((tok: string, u: AuthUser) => {
    applySession(tok, u);
  }, [applySession]);

  const login = useCallback(async (username: string, password: string) => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), LOGIN_FETCH_TIMEOUT_MS);
    let res: Response | undefined;

    try {
      res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        signal: controller.signal,
      });
    } catch {
      /* network error / timeout */
    } finally {
      window.clearTimeout(timeoutId);
    }

    if (res) {
      const body = await parseJsonResponse<{
        token?: string;
        user?: AuthUser;
        message?: string;
        offline?: boolean;
      }>(res);

      if (res.ok && body?.token && body?.user) {
        applySession(body.token, body.user);
        return;
      }

      if (isOfflineApiResponse(res, body)) {
        throw new Error(body?.message ?? "API server unavailable — check that the API is running.");
      }

      throw new Error(body?.message ?? "هەڵەیەک ڕوویدا");
    }

    throw new Error("API server unavailable — check that the API is running.");
  }, [applySession]);

  const register = useCallback(async (data: RegisterData) => {
    const sectorKey = localStorage.getItem("linqi_sector") ?? undefined;
    const newUser: AuthUser = {
      id: Date.now(),
      name: data.fullName,
      username: data.email,
      role: data.role,
      email: data.email,
      phone: data.phone,
      nationalId: data.nationalId,
      province: data.province,
      sectorKey,
      canViewProfit: data.role === "supplier",
      canDeleteData: false,
      canEditStock: data.role === "supplier",
      canAccessReports: data.role === "supplier",
    };
    localStorage.setItem(CACHED_USER_KEY, JSON.stringify(newUser));
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    logoutToEntryScreen("onboarding");
  }, []);

  const permissions = getPermissions(user);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, loginWithToken, register, logout, isAdmin: user?.role === "admin", permissions, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
