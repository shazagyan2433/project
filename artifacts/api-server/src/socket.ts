import { Server as SocketIOServer } from "socket.io";
import type { Server as HttpServer } from "http";
import { db } from "@workspace/db";
import { deliveriesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./lib/logger";

export let io: SocketIOServer;

export interface DriverLocationPayload {
  orderId: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

export function initSocketIO(httpServer: HttpServer): SocketIOServer {
  const allowedOriginsEnv = process.env["ALLOWED_ORIGINS"];
  const corsOrigin = allowedOriginsEnv
    ? allowedOriginsEnv.split(",").map((o) => o.trim())
    : true;

  io = new SocketIOServer(httpServer, {
    cors: { origin: corsOrigin, credentials: true },
    path: "/socket.io",
    // Allow long-polling fallback for environments that block WebSocket upgrades
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {
    logger.debug({ socketId: socket.id }, "Socket connected");

    // ── Driver: join the room for their active order ──────────────
    socket.on("driver:join", ({ orderId }: { orderId: string }) => {
      if (!orderId) return;
      socket.join(`order:${orderId}`);
      logger.debug({ socketId: socket.id, orderId }, "Driver joined order room");
    });

    // ── Watcher (shopkeeper / logistics): subscribe to an order ───
    socket.on("tracking:watch", ({ orderId }: { orderId: string }) => {
      if (!orderId) return;
      socket.join(`order:${orderId}`);
      logger.debug({ socketId: socket.id, orderId }, "Watcher subscribed to order");
    });

    // ── Driver emits real-time GPS position ───────────────────────
    socket.on(
      "driver:location",
      async ({
        orderId,
        lat,
        lng,
        heading,
        speed,
      }: {
        orderId: string;
        lat: number;
        lng: number;
        heading?: number;
        speed?: number;
      }) => {
        if (!orderId || typeof lat !== "number" || typeof lng !== "number") return;

        const payload: DriverLocationPayload = {
          orderId,
          lat,
          lng,
          heading,
          speed,
          timestamp: Date.now(),
        };

        // Broadcast to every watcher in the room (not back to the driver)
        socket.to(`order:${orderId}`).emit("driver_location_update", payload);

        // Persist last known position
        try {
          await db
            .update(deliveriesTable)
            .set({
              driverLat: String(lat),
              driverLng: String(lng),
              ...(heading != null && { driverHeading: String(heading) }),
              ...(speed != null && { driverSpeed: String(speed) }),
              locationUpdatedAt: new Date(),
            })
            .where(eq(deliveriesTable.orderId, orderId));
        } catch (err) {
          logger.warn({ err, orderId }, "Failed to persist driver location");
        }
      },
    );

    socket.on("disconnect", (reason) => {
      logger.debug({ socketId: socket.id, reason }, "Socket disconnected");
    });
  });

  return io;
}
