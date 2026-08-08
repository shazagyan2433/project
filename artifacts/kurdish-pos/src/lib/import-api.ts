import { API_HEALTH_PATH } from "./api-config";

export type ImportApiErrorKind = "network" | "auth" | "validation" | "empty" | "server";

export class ImportApiError extends Error {
  readonly kind: ImportApiErrorKind;

  constructor(message: string, kind: ImportApiErrorKind) {
    super(message);
    this.name = "ImportApiError";
    this.kind = kind;
  }
}

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";
const MAX_TEXT_CHARS = 1_500_000;
const DEFAULT_TIMEOUT_MS = 90_000;

function authHeaders(extra?: HeadersInit): HeadersInit {
  const token = localStorage.getItem("pos_auth_token");
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

function buildApiUrl(path: string): string {
  const base = API_BASE.replace(/\/$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (base.endsWith("/api") && normalized.startsWith("/api/")) {
    return `${base}${normalized.slice(4)}`;
  }
  return `${base}${normalized}`;
}

function isNetworkFailure(err: unknown): boolean {
  if (err instanceof TypeError) return true;
  if (err instanceof DOMException && err.name === "AbortError") return true;
  return false;
}

export async function probeImportApiHealth(timeoutMs = 4000): Promise<boolean> {
  try {
    const res = await fetch(API_HEALTH_PATH, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchImportJson<T>(
  path: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<T> {
  const timeoutMs = init.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(buildApiUrl(path), {
      ...init,
      signal: controller.signal,
    });

    const data = await res.json().catch(() => ({}));
    const message =
      typeof data.message === "string" ? data.message : undefined;

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new ImportApiError(
          message ?? "مافت نییە یان پێویستت بە چوونەژوورەوەیە",
          "auth",
        );
      }
      if (res.status === 413) {
        throw new ImportApiError(
          message ?? "فایلەکە زۆر گەورەیە. فایلی بچووکتر بەکاربهێنە.",
          "validation",
        );
      }
      throw new ImportApiError(
        message ?? "داواکاری سەرکەوتوو نەبوو",
        "server",
      );
    }

    if (data.offline === true) {
      throw new ImportApiError(
        "سێرڤەری API بەردەست نییە. دڵنیابە کە سێرڤەر کارا دەبێت (pnpm dev).",
        "network",
      );
    }

    return data as T;
  } catch (err) {
    if (err instanceof ImportApiError) throw err;

    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ImportApiError(
        "کاتی داواکاری بەسەرچوو. فایلەکە زۆر گەورە یان سێرڤەر هێواشە — دووبارە هەوڵ بدەرەوە.",
        "network",
      );
    }

    if (isNetworkFailure(err)) {
      throw new ImportApiError(
        "ناتوانرێت پەیوەندی بە سێرڤەرەوە بکرێت. دڵنیابە کە سێرڤەر کارا دەبێت و دووبارە هەوڵ بدەرەوە.",
        "network",
      );
    }

    throw new ImportApiError("هەڵەی نەناسراو ڕوویدا", "server");
  } finally {
    clearTimeout(timer);
  }
}

export function truncateImportText(text: string): string {
  if (text.length <= MAX_TEXT_CHARS) return text;
  return text.slice(0, MAX_TEXT_CHARS);
}

export { authHeaders, buildApiUrl, API_BASE };
