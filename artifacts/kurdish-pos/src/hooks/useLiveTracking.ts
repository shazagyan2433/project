/**
 * useLiveTracking
 * ----------------
 * For WATCHERS (shopkeeper / logistics): subscribes to driver
 * location updates for a given orderId via Socket.io.
 */
import { useEffect, useState } from "react";
import { socket } from "@/lib/socket";
import type { DriverLocationPayload } from "@/types/tracking";

export interface LivePosition {
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

export function useLiveTracking(orderId: string | null): LivePosition | null {
  const [position, setPosition] = useState<LivePosition | null>(null);

  useEffect(() => {
    if (!orderId) return;

    if (!socket.connected) socket.connect();

    socket.emit("tracking:watch", { orderId });

    const onUpdate = (payload: DriverLocationPayload) => {
      if (payload.orderId !== orderId) return;
      setPosition({
        lat: payload.lat,
        lng: payload.lng,
        heading: payload.heading,
        speed: payload.speed,
        timestamp: payload.timestamp,
      });
    };

    socket.on("driver_location_update", onUpdate);

    return () => {
      socket.off("driver_location_update", onUpdate);
    };
  }, [orderId]);

  return position;
}
