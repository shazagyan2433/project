import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authedFetch, fetchJsonArray, fetchSuppliersArray } from "@/lib/authedFetch";
import type { CatKey } from "@/lib/industries";

export interface ApiSupplier {
  id: number;
  name: string;
  city: string;
  governorate: string;
  address?: string;
  email?: string;
  sectorKey: string;
  sectorGroup: string;
  phone: string;
  verified: boolean;
  rating: number;
  deals: number;
  badge: string;
  color: string;
  products: string[];
  submittedAt?: string | null;
}

export type RfqStatus = "pending" | "responded" | "approved" | "declined";

export interface ApiRfq {
  id: string;
  product: string;
  qty: string;
  unit: string;
  cat: CatKey | string;
  suppliers: string[];
  status: RfqStatus;
  created: string;
  bestPrice?: string;
  deadline: string;
}

export interface ApiDelivery {
  id: number;
  orderId: string;
  driverId: number | null;
  status: "active" | "completed" | "cancelled";
  shopLat: string;
  shopLng: string;
  shopName: string;
  customerLat: string;
  customerLng: string;
  customerName: string;
  driverLat: string | null;
  driverLng: string | null;
  createdAt: string;
  updatedAt: string;
}

export function useSuppliers() {
  return useQuery({
    queryKey: ["suppliers"],
    queryFn: () => fetchSuppliersArray<ApiSupplier>(),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    retry: false,
  });
}

export function useSupplier(supplierId: number | null) {
  return useQuery({
    queryKey: ["suppliers", supplierId],
    queryFn: async () => {
      if (!supplierId) return null;
      const res = await authedFetch(`/api/suppliers/${supplierId}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch supplier");
      return (await res.json()) as ApiSupplier;
    },
    enabled: supplierId != null && supplierId > 0,
  });
}

export function useRfqs(sectorKey: string | null) {
  return useQuery({
    queryKey: ["rfqs", sectorKey],
    queryFn: async () => {
      const params = sectorKey ? `?sectorKey=${encodeURIComponent(sectorKey)}` : "";
      return fetchJsonArray<ApiRfq>(`/api/rfqs${params}`);
    },
    enabled: Boolean(sectorKey),
    placeholderData: [],
  });
}

export function useCreateRfq() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      product: string;
      quantity: string;
      unit: string;
      category?: string;
      sectorKey: string;
      suppliers?: string[];
      deadline?: string;
    }) => {
      const res = await authedFetch("/api/rfqs", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to create RFQ");
      return (await res.json()) as ApiRfq;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["rfqs", vars.sectorKey] });
    },
  });
}

export function useDeliveries() {
  return useQuery({
    queryKey: ["deliveries"],
    queryFn: () => fetchJsonArray<ApiDelivery>("/api/deliveries"),
    placeholderData: [],
  });
}

export function useSalesPrediction() {
  return useQuery({
    queryKey: ["sales-prediction"],
    queryFn: async () => {
      const res = await authedFetch("/api/sales-prediction");
      if (!res.ok) throw new Error("Failed to fetch sales prediction");
      return res.json() as Promise<{
        prediction: number;
        trend: "up" | "down" | "stable";
        days: Array<{ date: string; total: number }>;
        hasEnoughData: boolean;
      }>;
    },
  });
}

export type NotificationType = "sale" | "rfq" | "stock" | "delivery" | "cod_collected" | "system";

export interface ApiNotification {
  id: string;
  type: NotificationType;
  createdAt: string;
  payload: Record<string, unknown>;
}

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetchJsonArray<ApiNotification>("/api/notifications"),
    placeholderData: [],
    refetchInterval: 60_000,
  });
}
