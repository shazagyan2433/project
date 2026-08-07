/**
 * Singleton Socket.io client.
 * Connects once, reuses for every component that imports `socket`.
 */
import { io, Socket } from "socket.io-client";

// In development, Vite proxies /socket.io → 127.0.0.1:5001.
// In production, point at your deployed API origin.
const API_ORIGIN =
  typeof window !== "undefined" && import.meta.env.VITE_API_URL
    ? (import.meta.env.VITE_API_URL as string)
    : "";

export const socket: Socket = io(API_ORIGIN, {
  path: "/socket.io",
  transports: ["websocket", "polling"],
  autoConnect: false, // connect only when actually needed
});
