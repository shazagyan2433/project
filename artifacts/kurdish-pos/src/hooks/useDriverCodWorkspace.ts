import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  acceptDriverDelivery,
  collectCodCash,
  ensureDriverPortalSession,
  fetchDriverCodDeliveries,
  type DriverCodDelivery,
} from "@/lib/cod-delivery";

export type DriverStep = "picked_up" | "arrived" | "delivered";

export interface DriverShipmentView {
  id: string;
  orderId: string;
  buyerName: string;
  supplierName: string;
  pickupProvince: string;
  deliveryProvince: string;
  deliveryFee: number;
  currency: string;
  items: number;
  weight: string;
  createdAgo: string;
  priority: "normal" | "urgent";
  codCollected: boolean;
}

function deliveryToShipment(d: DriverCodDelivery): DriverShipmentView {
  return {
    id: d.orderId,
    orderId: d.orderId,
    buyerName: d.customerName,
    supplierName: d.shopName,
    pickupProvince: "erbil",
    deliveryProvince: "erbil",
    deliveryFee: d.totalAmount,
    currency: d.currency,
    items: 1,
    weight: "—",
    createdAgo: "",
    priority: "normal",
    codCollected: d.codCollected,
  };
}

export function useDriverCodWorkspace() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [sessionReady, setSessionReady] = useState(false);
  const [activeStatuses, setActiveStatuses] = useState<Map<string, DriverStep>>(new Map());
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [collectingOrderId, setCollectingOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== "driver") return;
    ensureDriverPortalSession(user).finally(() => setSessionReady(true));
  }, [user]);

  const { data: deliveries = [], isLoading, refetch } = useQuery({
    queryKey: ["driver", "cod-deliveries"],
    queryFn: fetchDriverCodDeliveries,
    enabled: sessionReady && user?.role === "driver",
    refetchInterval: 30_000,
  });

  useEffect(() => {
    const nextStatuses = new Map<string, DriverStep>();
    const nextCompleted = new Set<string>();

    for (const d of deliveries) {
      if (d.codCollected || d.status === "completed") {
        nextCompleted.add(d.orderId);
        continue;
      }
      if (d.driverId != null) {
        nextStatuses.set(d.orderId, "picked_up");
      }
    }

    setActiveStatuses(nextStatuses);
    setCompletedIds(nextCompleted);
  }, [deliveries]);

  const shipments = useMemo(() => deliveries.map(deliveryToShipment), [deliveries]);

  const available = useMemo(
    () => shipments.filter((s) => !activeStatuses.has(s.id) && !completedIds.has(s.id)),
    [shipments, activeStatuses, completedIds],
  );

  const activeShipments = useMemo(
    () => shipments.filter((s) => activeStatuses.has(s.id)),
    [shipments, activeStatuses],
  );

  const acceptShipment = useCallback(
    async (orderId: string) => {
      await acceptDriverDelivery(orderId);
      setActiveStatuses((prev) => new Map([...prev, [orderId, "picked_up"]]));
      await refetch();
    },
    [refetch],
  );

  const advanceStatus = useCallback((orderId: string) => {
    const current = activeStatuses.get(orderId);
    if (!current) return null;
    if (current === "picked_up") {
      setActiveStatuses((prev) => new Map([...prev, [orderId, "arrived"]]));
      return "arrived" as DriverStep;
    }
    if (current === "arrived") {
      setActiveStatuses((prev) => new Map([...prev, [orderId, "delivered"]]));
      return "delivered" as DriverStep;
    }
    return null;
  }, [activeStatuses]);

  const collectCash = useCallback(
    async (orderId: string) => {
      if (collectingOrderId) return null;
      setCollectingOrderId(orderId);
      try {
        const result = await collectCodCash(orderId);
        setCompletedIds((prev) => new Set([...prev, orderId]));
        setActiveStatuses((prev) => {
          const m = new Map(prev);
          m.delete(orderId);
          return m;
        });
        qc.invalidateQueries({ queryKey: ["notifications"] });
        qc.invalidateQueries({ queryKey: ["deliveries"] });
        qc.invalidateQueries({ queryKey: ["driver", "cod-deliveries"] });
        await refetch();
        return result;
      } finally {
        setCollectingOrderId(null);
      }
    },
    [collectingOrderId, qc, refetch],
  );

  const totalEarned = useMemo(
    () => deliveries.filter((d) => d.codCollected).reduce((sum, d) => sum + d.totalAmount, 0),
    [deliveries],
  );

  return {
    isLoading,
    available,
    activeShipments,
    activeStatuses,
    completedIds,
    collectingOrderId,
    totalEarned,
    acceptShipment,
    advanceStatus,
    collectCash,
    refetch,
  };
}
