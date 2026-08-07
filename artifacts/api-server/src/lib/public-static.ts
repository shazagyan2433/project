import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Express } from "express";
import express from "express";
import { logger } from "./logger";

/**
 * Bundled output lives in `artifacts/api-server/dist/index.mjs`, so `__dirname`
 * is that `dist` folder. All SPA paths are resolved from there first.
 */
function apiDistDir(): string {
  if (typeof __dirname !== "undefined") {
    return __dirname;
  }
  return path.dirname(fileURLToPath(import.meta.url));
}

function apiServerRoot(): string {
  return path.join(apiDistDir(), "..");
}

function hasSpaIndex(dir: string): boolean {
  return fs.existsSync(path.join(dir, "index.html"));
}

function candidateDirs(): string[] {
  const distDir = apiDistDir();
  const serverRoot = apiServerRoot();
  const dirs: string[] = [];

  if (process.env["PUBLIC_STATIC_DIR"]) {
    dirs.push(path.resolve(process.env["PUBLIC_STATIC_DIR"]));
  }

  // Co-located SPA copied during api-server build (Render-safe)
  dirs.push(path.join(distDir, "public"));

  // Monorepo sibling — Vite outDir is `kurdish-pos/dist/public`
  dirs.push(path.join(serverRoot, "..", "kurdish-pos", "dist", "public"));
  dirs.push(path.join(serverRoot, "..", "kurdish-pos", "dist"));

  // When process cwd is the monorepo root
  dirs.push(path.resolve(process.cwd(), "artifacts/kurdish-pos/dist/public"));
  dirs.push(path.resolve(process.cwd(), "artifacts/kurdish-pos/dist"));

  // When process cwd is `artifacts/api-server` (pnpm filter start)
  dirs.push(path.resolve(process.cwd(), "../kurdish-pos/dist/public"));
  dirs.push(path.resolve(process.cwd(), "../kurdish-pos/dist"));

  return dirs;
}

export function resolvePublicStaticDir(): string | null {
  for (const dir of candidateDirs()) {
    if (hasSpaIndex(dir)) {
      return dir;
    }
  }
  return null;
}

/**
 * Serve the built Vite SPA in production (same origin as API + Socket.io).
 */
export function mountPublicStatic(app: Express): void {
  if (process.env.NODE_ENV !== "production") return;

  const publicDir = resolvePublicStaticDir();

  if (!publicDir) {
    if (process.env.NODE_ENV === "production") {
      logger.warn(
        { candidates: candidateDirs(), cwd: process.cwd(), distDir: apiDistDir() },
        "SPA static files not found — only /api will be served",
      );
    }
    return;
  }

  logger.info({ publicDir }, "Serving frontend static files");

  app.use(
    express.static(publicDir, {
      index: false,
      maxAge: "1h",
      setHeaders(res, filePath) {
        if (filePath.endsWith("index.html")) {
          res.setHeader("Cache-Control", "no-cache");
        }
      },
    }),
  );

  // SPA fallback — non-API routes without a file extension get index.html
  app.get(/.*/, (req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    if (req.path.startsWith("/api")) return next();
    if (req.path.startsWith("/socket.io")) return next();
    if (path.extname(req.path)) return next();

    res.sendFile(path.join(publicDir, "index.html"), (err) => {
      if (err) next(err);
    });
  });
}
