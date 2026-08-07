import type { AuthUser } from "@/contexts/AuthContext";
import { clearSessionFlags } from "@/lib/auth-session";
import { DEV_MOCK_ADMIN } from "@/lib/local-dev";

/** Token used when the API is unreachable and local admin credentials are accepted. */
export const MOCK_ADMIN_TOKEN = "mock_token";

/** Legacy token — still recognized for existing sessions. */
export const LOCAL_FALLBACK_TOKEN = "local-fallback-token";

const LOCAL_USERS: Record<string, { password: string; user: AuthUser }> = {
  admin: {
    password: "admin123",
    user: DEV_MOCK_ADMIN,
  },
};

export const LOGIN_FETCH_TIMEOUT_MS = 5000;

export function isLocalFallbackToken(token: string | null | undefined): boolean {
  return (
    token === MOCK_ADMIN_TOKEN ||
    token === LOCAL_FALLBACK_TOKEN ||
    token === "dev-local-bypass" ||
    token === "dev-merchant-bypass"
  );
}

/** Validate hardcoded offline credentials (e.g. admin / admin123). */
export function tryLocalFallbackLogin(
  username: string,
  password: string,
): { token: string; user: AuthUser } | null {
  const key = username.trim().toLowerCase();
  const entry = LOCAL_USERS[key];
  if (!entry || entry.password !== password) return null;
  return { token: MOCK_ADMIN_TOKEN, user: { ...entry.user } };
}

/**
 * Persist mock admin session for offline login — sets admin_token and auth keys.
 * Returns the session payload when credentials match; otherwise null.
 */
export function applyOfflineAdminSession(
  username: string,
  password: string,
): { token: string; user: AuthUser } | null {
  const local = tryLocalFallbackLogin(username, password);
  if (!local) return null;

  localStorage.setItem("pos_auth_token", MOCK_ADMIN_TOKEN);
  localStorage.setItem("admin_token", MOCK_ADMIN_TOKEN);
  localStorage.setItem("pos_cached_user", JSON.stringify(local.user));
  clearSessionFlags();

  return { token: MOCK_ADMIN_TOKEN, user: local.user };
}

export function isOfflineApiResponse(
  res: Response | undefined,
  body?: { offline?: boolean },
): boolean {
  if (!res) return true;
  return res.status === 503 || body?.offline === true;
}
