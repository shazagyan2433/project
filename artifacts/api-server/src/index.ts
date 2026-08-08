import { createServer } from "http";
import app from "./app";
import { initSocketIO } from "./socket";
import { logger } from "./lib/logger";
import { seedDefaultAdmin } from "./lib/seed";
import { bootstrapDatabase } from "./lib/ensure-loyalty-schema";
import { seedRewards } from "./lib/seed-rewards";
import { cleanupTestRegistrations } from "./lib/cleanup-test-registrations";

/**
 * Bind order for cloud hosts (Render, DO, etc.):
 * 1. Read process.env.PORT first (platform-injected)
 * 2. Listen on 0.0.0.0 immediately so port scanners succeed
 * 3. Run DB bootstrap AFTER listen (non-blocking)
 */
const rawPort = process.env.PORT ?? process.env.API_PORT ?? "3000";
const port = Number(rawPort);
const host = "0.0.0.0";

if (!Number.isFinite(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const httpServer = createServer(app);
initSocketIO(httpServer);

httpServer.listen(port, host, () => {
  logger.info(
    { host, port, nodeEnv: process.env.NODE_ENV, render: Boolean(process.env.RENDER) },
    "Server listening (HTTP + Socket.io)",
  );
  console.log(`[listen] http://${host}:${port} (PORT=${process.env.PORT ?? "(unset)"})`);

  // DB work must never delay the bind above
  void bootstrapDatabase()
    .then(() => seedRewards())
    .then(() => seedDefaultAdmin())
    .then(() => cleanupTestRegistrations())
    .catch((err) => logger.error({ err }, "Startup bootstrap failed"));
});

httpServer.on("error", (err) => {
  logger.error({ err, host, port }, "Error listening on port");
  process.exit(1);
});
