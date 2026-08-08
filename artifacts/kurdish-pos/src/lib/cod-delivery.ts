import { authedFetch } from "@/lib/authedFetch";
import { isLocalFallbackToken } from "@/lib/local-auth";
import type { AuthUser } from "@/contexts/AuthContext";

const AUTH_TOKEN_KEY = "pos_auth_token";

/** Issue a driver JWT so delivery API calls are authorized. */
export async function ensureDriverPortalSession(user: AuthUser): Promise<void> {
  if (user.role !== "driver") return;

  const existing = localStorage.getItem(AUTH_TOKEN_KEY);
  if (existing && !isLocalFallbackToken(existing)) return;

  const res = await fetch("/api/auth/portal/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      portalUserId: user.id,
      role: "driver",
      name: user.name,
    }),
  });

  if (!res.ok) return;

  const body = (await res.json()) as { token?: string };
  if (body.token) {
    localStorage.setItem(AUTH_TOKEN_KEY, body.token);
  }
}

export interface DriverCodDelivery {
  id: number;
  orderId: string;
  saleId: number;
  driverId: number | null;
  status: "active" | "completed" | "cancelled";
  shopLat: string;
  shopLng: string;
  shopName: string;
  customerLat: string;
  customerLng: string;
  customerName: string;
  totalAmount: number;
  currency: string;
  paymentStatus: string;
  orderStatus: string;
  codCollected: boolean;
  isCod: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function fetchDriverCodDeliveries(): Promise<DriverCodDelivery[]> {
  const res = await authedFetch("/api/driver/deliveries");
  if (!res.ok) throw new Error(`Driver deliveries failed (${res.status})`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function acceptDriverDelivery(orderId: string): Promise<void> {
  const res = await authedFetch(`/api/deliveries/${encodeURIComponent(orderId)}/accept`, {
    method: "POST",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message ?? "Accept failed");
  }
}

export async function collectCodCash(orderId: string): Promise<{
  saleId: number;
  amount: number;
  currency: string;
}> {
  const res = await authedFetch(`/api/deliveries/${encodeURIComponent(orderId)}/collect-cod`, {
    method: "POST",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((body as { message?: string }).message ?? "Collect failed");
  }
  return body as { saleId: number; amount: number; currency: string };
}
