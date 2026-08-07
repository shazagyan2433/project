/**
 * useDriverTracking
 * ------------------
 * For the DRIVER side: watches the device GPS and emits
 * `driver:location` events to the Socket.io server for a given orderId.
 * Falls back to simulated movement if Geolocation is unavailable.
 */
import { useEffect, useRef, useCallback } from "react";
import { socket } from "@/lib/socket";

interface DriverTrackingOptions {
  orderId: string | null;
  /** If true, GPS is active and being transmitted */
  active: boolean;
  /** Pickup coords (used as sim start) */
  shopLat: number;
  shopLng: number;
  /** Dropoff coords (used as sim end) */
  customerLat: number;
  customerLng: number;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function useDriverTracking({
  orderId,
  active,
  shopLat,
  shopLng,
  customerLat,
  customerLng,
}: DriverTrackingOptions) {
  const watchIdRef = useRef<number | null>(null);
  const simTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const simProgressRef = useRef(0);

  const emit = useCallback(
    (lat: number, lng: number, heading?: number, speed?: number) => {
      if (!orderId) return;
      socket.emit("driver:location", { orderId, lat, lng, heading, speed });
    },
    [orderId],
  );

  const stopAll = useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (simTimerRef.current != null) {
      clearInterval(simTimerRef.current);
      simTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!orderId || !active) {
      stopAll();
      return;
    }

    // Ensure socket is connected and in the right room
    if (!socket.connected) socket.connect();
    socket.emit("driver:join", { orderId });

    if ("geolocation" in navigator) {
      // Real GPS
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          emit(
            pos.coords.latitude,
            pos.coords.longitude,
            pos.coords.heading ?? undefined,
            pos.coords.speed ?? undefined,
          );
        },
        (err) => {
          console.warn("[GPS] watchPosition error", err);
          startSimulation();
        },
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 2_000 },
      );
    } else {
      startSimulation();
    }

    function startSimulation() {
      simProgressRef.current = 0;
      simTimerRef.current = setInterval(() => {
        simProgressRef.current = Math.min(simProgressRef.current + 0.008, 1);
        const t = simProgressRef.current;
        const lat = lerp(shopLat, customerLat, t);
        const lng = lerp(shopLng, customerLng, t);
        // rough heading: north=0, east=90
        const dLat = customerLat - shopLat;
        const dLng = customerLng - shopLng;
        const heading = ((Math.atan2(dLng, dLat) * 180) / Math.PI + 360) % 360;
        emit(lat, lng, heading, 40);
        if (t >= 1) {
          clearInterval(simTimerRef.current!);
          simTimerRef.current = null;
        }
      }, 2_000);
    }

    return stopAll;
  }, [orderId, active, shopLat, shopLng, customerLat, customerLng, emit, stopAll]);
}
