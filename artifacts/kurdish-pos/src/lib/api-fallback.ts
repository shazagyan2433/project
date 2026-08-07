/**
 * Safe API helpers — persist locally when the live API / PostgreSQL backend is unreachable.
 */

import type { AuthUser } from "@/contexts/AuthContext";
import { DEV_MOCK_ADMIN } from "@/lib/local-dev";

const CACHED_USER_KEY = "pos_cached_user";
const CACHED_USERS_LIST_KEY = "pos_cached_users";

export interface CachedAppUser {
  id: number;
  name: string;
  username: string;
  role: "admin" | "staff";
  canViewProfit: boolean;
  canDeleteData: boolean;
  canEditStock: boolean;
  canAccessReports: boolean;
  createdAt: string;
}

export type SafeFetchResult<T> = {
  ok: boolean;
  status: number;
  data?: T;
  message?: string;
  networkError?: boolean;
};

/** Parse response body as JSON without throwing on empty or invalid bodies. */
export async function parseJsonResponse<T>(res: Response): Promise<T | undefined> {
  try {
    const text = await res.text();
    if (!text.trim()) return undefined;
    return JSON.parse(text) as T;
  } catch {
    return undefined;
  }
}

/** Fetch with auth headers and safe JSON parsing (text-first). */
export async function fetchWithSafeJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<SafeFetchResult<T>> {
  const token = localStorage.getItem("pos_auth_token");
  try {
    const res = await fetch(input, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {}),
      },
    });
    const parsed = await parseJsonResponse<T | { message?: string; offline?: boolean }>(res);
    if (!res.ok) {
      const isOfflineProxy =
        res.status === 503 &&
        parsed &&
        typeof parsed === "object" &&
        "offline" in parsed &&
        parsed.offline === true;
      if (isOfflineProxy) {
        return { ok: false, status: res.status, message: "API offline", networkError: true };
      }
      const message =
        parsed && typeof parsed === "object" && "message" in parsed && parsed.message
          ? String(parsed.message)
          : `Request failed (${res.status})`;
      return { ok: false, status: res.status, message };
    }
    return { ok: true, status: res.status, data: parsed as T | undefined };
  } catch {
    return { ok: false, status: 0, message: "Network error", networkError: true };
  }
}

function defaultCachedUsers(): CachedAppUser[] {
  if (import.meta.env.PROD) return [];
  return [{
    id: DEV_MOCK_ADMIN.id,
    name: DEV_MOCK_ADMIN.name,
    username: DEV_MOCK_ADMIN.username,
    role: "admin",
    canViewProfit: true,
    canDeleteData: true,
    canEditStock: true,
    canAccessReports: true,
    createdAt: new Date().toISOString(),
  }];
}

export function getCachedUsers(): CachedAppUser[] {
  const raw = localStorage.getItem(CACHED_USERS_LIST_KEY);
  if (!raw) return defaultCachedUsers();
  try {
    const parsed = JSON.parse(raw) as CachedAppUser[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : defaultCachedUsers();
  } catch {
    return defaultCachedUsers();
  }
}

export function setCachedUsers(users: CachedAppUser[]): void {
  localStorage.setItem(CACHED_USERS_LIST_KEY, JSON.stringify(users));
}

export function addCachedUser(
  input: Pick<CachedAppUser, "name" | "username" | "role"> & Partial<CachedAppUser>,
): CachedAppUser {
  const role = input.role;
  const user: CachedAppUser = {
    id: input.id ?? Date.now(),
    name: input.name,
    username: input.username,
    role,
    canViewProfit: input.canViewProfit ?? role === "admin",
    canDeleteData: input.canDeleteData ?? role === "admin",
    canEditStock: input.canEditStock ?? role === "admin",
    canAccessReports: input.canAccessReports ?? role === "admin",
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
  const users = getCachedUsers();
  setCachedUsers([...users, user]);
  return user;
}

export function updateCachedUser(id: number, patch: Partial<CachedAppUser>): CachedAppUser | undefined {
  const users = getCachedUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return undefined;
  const updated = { ...users[idx], ...patch };
  users[idx] = updated;
  setCachedUsers(users);
  return updated;
}

export function removeCachedUser(id: number): void {
  setCachedUsers(getCachedUsers().filter(u => u.id !== id));
}

/** True when we should fall back to local cache instead of surfacing an error. */
export function shouldUseUsersFallback(result: SafeFetchResult<unknown>): boolean {
  if (import.meta.env.PROD) return false;
  if (result.networkError) return true;
  if (result.ok) return false;
  if (result.status === 400 || result.status === 409) return false;
  return true;
}

export function mergeCachedUser(updates: Partial<AuthUser>): AuthUser {
  const raw = localStorage.getItem(CACHED_USER_KEY);
  let current: Partial<AuthUser> = {};
  if (raw) {
    try {
      current = JSON.parse(raw) as AuthUser;
    } catch {
      /* ignore */
    }
  }
  const merged = { ...current, ...updates } as AuthUser;
  localStorage.setItem(CACHED_USER_KEY, JSON.stringify(merged));
  return merged;
}

export async function safeFetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
  fallback?: T,
): Promise<T | undefined> {
  const result = await fetchWithSafeJson<T>(input, init);
  if (!result.ok) return fallback;
  return result.data ?? fallback;
}
