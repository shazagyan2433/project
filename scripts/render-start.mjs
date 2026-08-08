/**
 * Render-safe start: bind HTTP immediately; schema push is optional & never blocks.
 * Usage: node scripts/render-start.mjs  (via `pnpm run render:start`)
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

/** Append sslmode=require for managed Postgres when missing. */
function envWithSsl(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  const url = env.DATABASE_URL;
  if (!url) return env;

  const needsSsl =
    env.DATABASE_SSL === "true" ||
    env.DATABASE_SSL === "1" ||
    /\.render\.com|\.railway\.app|\.supabase\.co|\.neon\.tech/i.test(url);

  if (needsSsl) {
    env.DATABASE_SSL = env.DATABASE_SSL || "true";
    if (!/[?&]sslmode=/i.test(url)) {
      env.DATABASE_URL = url + (url.includes("?") ? "&" : "?") + "sslmode=require";
    }
  }
  return env;
}

function startServer() {
  const child = spawn(process.execPath, ["--enable-source-maps", serverEntry], {
    cwd: root,
    env: envWithSsl(),
    stdio: "inherit",
  });

  const shutdown = (signal) => {
    try {
      child.kill(signal);
    } catch {
      /* ignore */
    }
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  child.on("exit", (code, signal) => {
    if (signal) {
      console.error(`[render-start] server killed by ${signal}`);
      process.exit(1);
    }
    process.exit(code ?? 1);
  });
}

/**
 * Fire-and-forget schema push. Never awaited before listen.
 * Disabled by default on Render unless RUN_DB_PUSH=true (schema should be applied once manually or via API bootstrap).
 */
function maybePushSchemaInBackground() {
  const onRender = Boolean(process.env.RENDER);
  const skip =
    process.env.SKIP_DB_PUSH === "true" ||
    !process.env.DATABASE_URL ||
    (onRender && process.env.RUN_DB_PUSH !== "true");

  if (skip) {
    console.log(
      "[render-start] Skipping drizzle push on startup" +
        (onRender ? " (set RUN_DB_PUSH=true to enable background push)" : ""),
    );
    return;
  }

  console.log("[render-start] Starting background drizzle push (will not block HTTP)...");
  const push = spawn(
    "pnpm",
    ["--filter", "@workspace/db", "run", "push"],
    { cwd: root, env: envWithSsl(), stdio: "inherit", shell: true },
  );

  const timer = setTimeout(() => {
    console.warn("[render-start] drizzle push timed out — killing push process (server keeps running)");
    try {
      push.kill("SIGTERM");
    } catch {
      /* ignore */
    }
  }, Number(process.env.DB_PUSH_TIMEOUT_MS ?? 45_000));

  push.on("exit", (code) => {
    clearTimeout(timer);
    if (code === 0) {
      console.log("[render-start] schema push OK");
    } else {
      console.warn(
        `[render-start] WARNING: schema push exited with code ${code} — HTTP server continues`,
      );
    }
  });

  push.on("error", (err) => {
    clearTimeout(timer);
    console.warn(`[render-start] WARNING: schema push failed to start: ${err.message}`);
  });
}

// Bind HTTP first — critical for Render port detection
startServer();
maybePushSchemaInBackground();
