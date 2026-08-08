/** Dev API port — must match api-server and Vite proxy target */
export const DEV_API_PORT = 5001;

/** Dev Vite port when running `pnpm dev` from the repo root */
export const DEV_WEB_PORT = 5173;

export const API_HEALTH_PATH = "/api/healthz";

export async function probeApiHealth(timeoutMs = 2500): Promise<boolean> {
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

export function isDevOfflineMode(): boolean {
  return import.meta.env.DEV && !import.meta.env.VITE_API_URL;
}
