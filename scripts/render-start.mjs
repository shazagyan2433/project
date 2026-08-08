/**
 * Render-safe start: bind HTTP ASAP; optionally push schema without blocking forever.
 * Usage: node scripts/render-start.mjs  (from repo root via `pnpm run render:start`)
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const serverEntry = path.join(root, "artifacts/api-server/dist/index.mjs");

const port = process.env.PORT ?? "3000";
console.log(`[render-start] PORT=${port} cwd=${process.cwd()}`);
console.log(`[render-start] starting ${serverEntry}`);

if (!process.env.DATABASE_URL) {
  console.error("[render-start] WARNING: DATABASE_URL is not set");
}
if (!process.env.SESSION_SECRET) {
  console.error("[render-start] WARNING: SESSION_SECRET is not set");
}

function startServer() {
  const child = spawn(process.execPath, ["--enable-source-maps", serverEntry], {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      console.error(`[render-start] server killed by ${signal}`);
      process.exit(1);
    }
    process.exit(code ?? 1);
  });
}

async function maybePushSchema() {
  if (!process.env.DATABASE_URL || process.env.SKIP_DB_PUSH === "true") {
    return;
  }

  console.log("[render-start] Attempting drizzle schema push (timeout 45s)...");
  await new Promise((resolve) => {
    const push = spawn(
      "pnpm",
      ["--filter", "@workspace/db", "run", "push"],
      { cwd: root, env: process.env, stdio: "inherit", shell: true },
    );

    const timer = setTimeout(() => {
      console.warn("[render-start] schema push timed out — continuing to start server");
      push.kill("SIGTERM");
      resolve(undefined);
    }, 45_000);

    push.on("exit", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        console.warn(`[render-start] schema push exited ${code} — starting server anyway`);
      } else {
        console.log("[render-start] schema push OK");
      }
      resolve(undefined);
    });
  });
}

// Start HTTP server first so Render port scan succeeds, then push schema in parallel
startServer();
void maybePushSchema();
