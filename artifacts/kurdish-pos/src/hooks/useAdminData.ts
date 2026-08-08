import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authedFetch, fetchJsonArray } from "@/lib/authedFetch";
import type {
  AdminContract,
  AdminCategoryRow,
  AdminSectorRow,
  VerificationRecord,
  VerificationStatus,
  TrackedDriver,
} from "@/lib/admin-types";

export interface AdminOverviewTotals {
  salesVolume: number;
  commission: number;
  transactions: number;
  customers: number;
  products: number;
  users: number;
  registrations?: number;
}

export interface AdminOverviewData {
  totals: AdminOverviewTotals;
  byMethod: Record<string, number>;
  chartData: Array<{ date: string; volume: number; commission: number }>;
  topProducts: Array<{ id: number; name: string; qty: number; revenue: number }>;
  recentTransactions: Array<{
    id: number;
    totalAmount: number;
    paymentMethod: string;
    createdAt: string;
  }>;
  customers: Array<{
    id: number;
    name: string;
    phone?: string;
    totalPurchases: number;
    transactionCount: number;
  }>;
  products: Array<{
    id: number;
    name: string;
    category?: string;
    stock: number;
    price: number;
    barcode?: string;
  }>;
  users: Array<{ id: number; name: string; username: string; role: string }>;
  liveDrivers: TrackedDriver[];
  rfqs: Array<{
    id: string;
    product: string;
    qty: string;
    unit: string;
    status: string;
    sectorKey: string;
    created: string;
    suppliers: string[];
  }>;
}

export const EMPTY_ADMIN_OVERVIEW: AdminOverviewData = {
  totals: {
    salesVolume: 0,
    commission: 0,
    transactions: 0,
    customers: 0,
    products: 0,
    users: 0,
    registrations: 0,
  },
  byMethod: { cash: 0, qr_payment: 0, cash_on_delivery: 0, debt: 0 },
  chartData: [],
  topProducts: [],
  recentTransactions: [],
  customers: [],
  products: [],
  users: [],
  liveDrivers: [],
  rfqs: [],
};

export function useAdminOverview() {
  return useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const res = await authedFetch("/api/admin/overview");
      if (!res.ok) {
        throw new Error(`Admin overview failed (${res.status})`);
      }
      const json = (await res.json()) as Partial<AdminOverviewData>;
      return {
        ...EMPTY_ADMIN_OVERVIEW,
        ...json,
        totals: { ...EMPTY_ADMIN_OVERVIEW.totals, ...(json.totals ?? {}) },
        byMethod: { ...EMPTY_ADMIN_OVERVIEW.byMethod, ...(json.byMethod ?? {}) },
        liveDrivers: (json.liveDrivers as TrackedDriver[] | undefined) ?? [],
        rfqs: json.rfqs ?? [],
      };
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
  });
}

export function useAdminVerifications() {
  return useQuery({
    queryKey: ["admin-verifications"],
    queryFn: () => fetchJsonArray<VerificationRecord>("/api/admin/verifications"),
    placeholderData: [],
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

export function usePatchVerificationStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      rejectionReason,
    }: {
      id: number;
      status: VerificationStatus;
      rejectionReason?: string;
    }) => {
      const res = await authedFetch(`/api/verifications/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, rejectionReason }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-verifications"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
  });
}

export function useAdminContracts() {
  return useQuery({
    queryKey: ["admin-contracts"],
    queryFn: () => fetchJsonArray<AdminContract>("/api/admin/contracts"),
    placeholderData: [],
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useCreateAdminContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: Omit<AdminContract, "id">) => {
      const res = await authedFetch("/api/admin/contracts", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to create contract");
      return (await res.json()) as AdminContract;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-contracts"] });
    },
  });
}

export interface AdminCatalogData {
  sectors: Array<AdminSectorRow & { registrationCount?: number }>;
  categories: Array<AdminCategoryRow & { productCount?: number }>;
}

export function useAdminCatalog() {
  return useQuery({
    queryKey: ["admin-catalog"],
    queryFn: async () => {
      try {
        const res = await authedFetch("/api/admin/catalog");
        if (!res.ok) return { sectors: [], categories: [] };
        return (await res.json()) as AdminCatalogData;
      } catch {
        return { sectors: [], categories: [] };
      }
    },
    placeholderData: { sectors: [], categories: [] },
    staleTime: 60_000,
  });
}

export function useSaveAdminCatalog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { sectors: AdminSectorRow[]; categories: AdminCategoryRow[] }) => {
      const res = await authedFetch("/api/admin/catalog", {
        method: "PUT",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to save catalog");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-catalog"] });
    },
  });
}
