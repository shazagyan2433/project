/** Iraq map defaults — Sulaymaniyah / central Iraq */
export const IRAQ_MAP_CENTER = { lat: 33.3152, lng: 44.3661, zoom: 6 };
export const DEFAULT_STORE_COORDS = { lat: 35.556, lng: 45.435 };

const STORAGE_KEY = "linqi_store_locations";

export interface StoreCoords {
  lat: number;
  lng: number;
}

export interface StoredStoreLocation extends StoreCoords {
  address?: string;
  updatedAt?: number;
}

/** Parse lat/lng from address strings like "36.1911, 44.0092 — ناونیشان" */
export function parseStoreCoords(source?: string | null): StoreCoords | null {
  if (!source?.trim()) return null;
  const m = source.match(/(-?\d+\.\d+)\s*[,،]\s*(-?\d+\.\d+)/);
  if (!m) return null;
  const lat = parseFloat(m[1]);
  const lng = parseFloat(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export function formatStoreAddress(lat: number, lng: number, label?: string): string {
  const coords = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  const text = label?.trim();
  return text ? `${coords} — ${text}` : coords;
}

export function isValidCoords(lat?: number | null, lng?: number | null): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng);
}

export function saveStoreLocationLocal(
  userId: number | string,
  lat: number,
  lng: number,
  address?: string,
): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all: Record<string, StoredStoreLocation> = raw ? JSON.parse(raw) : {};
    all[String(userId)] = { lat, lng, address, updatedAt: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* localStorage unavailable */
  }
}

export function loadStoreLocationLocal(userId?: number | string): StoredStoreLocation | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const all = JSON.parse(raw) as Record<string, StoredStoreLocation>;
    return all[String(userId)] ?? null;
  } catch {
    return null;
  }
}

export function resolveStoreCoords(user?: {
  id?: number;
  storeAddress?: string;
  storeLat?: number;
  storeLng?: number;
}): StoreCoords {
  if (isValidCoords(user?.storeLat, user?.storeLng)) {
    return { lat: user!.storeLat!, lng: user!.storeLng! };
  }
  const fromAddress = parseStoreCoords(user?.storeAddress);
  if (fromAddress) return fromAddress;
  const local = user?.id ? loadStoreLocationLocal(user.id) : null;
  if (local && isValidCoords(local.lat, local.lng)) {
    return { lat: local.lat, lng: local.lng };
  }
  return { ...DEFAULT_STORE_COORDS };
}
