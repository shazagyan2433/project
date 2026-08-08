import { createServer } from "http";
import app from "./app";
import { initSocketIO } from "./socket";
import { logger } from "./lib/logger";
import { seedDefaultAdmin } from "./lib/seed";
import { bootstrapDatabase } from "./lib/ensure-loyalty-schema";
import { seedRewards } from "./lib/seed-rewards";
import { cleanupTestRegistrations } from "./lib/cleanup-test-registrations";

const port = Number(process.env.PORT ?? process.env.API_PORT ?? 5001);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${process.env.PORT}"`);
}

// Create a plain HTTP server so Socket.io can share it with Express
const httpServer = createServer(app);
initSocketIO(httpServer);

httpServer.listen(port, "0.0.0.0", (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening (HTTP + Socket.io)");
  void bootstrapDatabase()
    .then(() => seedRewards())
    .then(() => seedDefaultAdmin())
    .then(() => cleanupTestRegistrations())
    .catch((err) => logger.error({ err }, "Startup bootstrap failed"));
});
