import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Express } from "express";
import express from "express";
import { logger } from "./logger";

const SPA_LOG_PREFIX = "[spa-static]";

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
  const cwd = process.cwd();

  const dirs: string[] = [];

  if (process.env["PUBLIC_STATIC_DIR"]) {
    dirs.push(path.resolve(process.env["PUBLIC_STATIC_DIR"]));
  }

  // Co-located SPA copied during api-server build (Render-safe — highest priority)
  dirs.push(path.join(distDir, "public"));

  // Render monorepo root (typical cwd: /opt/render/project/src)
  dirs.push(path.join(cwd, "artifacts/kurdish-pos/dist/public"));
  dirs.push(path.join(cwd, "artifacts/kurdish-pos/dist"));
  dirs.push(path.resolve(cwd, "artifacts/kurdish-pos/dist/public"));
  dirs.push(path.resolve(cwd, "artifacts/kurdish-pos/dist"));

  // Monorepo sibling from bundled dist
  dirs.push(path.join(serverRoot, "..", "kurdish-pos", "dist", "public"));
  dirs.push(path.join(serverRoot, "..", "kurdish-pos", "dist"));

  // When pnpm filter start sets cwd to artifacts/api-server
  dirs.push(path.resolve(cwd, "../kurdish-pos/dist/public"));
  dirs.push(path.resolve(cwd, "../kurdish-pos/dist"));

  // Legacy relative paths
  dirs.push(path.resolve(distDir, "..", "..", "kurdish-pos", "dist", "public"));
  dirs.push(path.resolve(distDir, "..", "..", "kurdish-pos", "dist"));

  return dirs;
}

function logCandidatePaths(candidates: string[]): void {
  console.log(`${SPA_LOG_PREFIX} process.cwd() = ${process.cwd()}`);
  console.log(`${SPA_LOG_PREFIX} __dirname (api dist) = ${apiDistDir()}`);
  console.log(`${SPA_LOG_PREFIX} NODE_ENV = ${process.env.NODE_ENV ?? "(unset)"}`);

  for (const dir of candidates) {
    const resolved = path.resolve(dir);
    const dirExists = fs.existsSync(resolved);
    const indexPath = path.join(resolved, "index.html");
    const indexExists = fs.existsSync(indexPath);
    console.log(
      `${SPA_LOG_PREFIX} candidate: ${resolved} | dir=${dirExists} index.html=${indexExists}`,
    );
  }
}

export function resolvePublicStaticDir(): string | null {
  const candidates = candidateDirs();
  logCandidatePaths(candidates);

  for (const dir of candidates) {
    const resolved = path.resolve(dir);
    if (hasSpaIndex(resolved)) {
      console.log(`${SPA_LOG_PREFIX} RESOLVED static dir: ${resolved}`);
      return resolved;
    }
  }

  console.error(`${SPA_LOG_PREFIX} FAILED — no directory with index.html found`);
  return null;
}

function shouldMountStatic(): boolean {
  // Always try in production; also mount when files exist (Render may omit NODE_ENV)
  if (process.env.NODE_ENV === "production") return true;
  if (process.env["PUBLIC_STATIC_DIR"]) return true;
  if (process.env["RENDER"]) return true;
  return false;
}

/**
 * Serve the built Vite SPA in production (same origin as API + Socket.io).
 */
export function mountPublicStatic(app: Express): void {
  if (!shouldMountStatic()) {
    console.log(
      `${SPA_LOG_PREFIX} skipping static mount (NODE_ENV=${process.env.NODE_ENV ?? "unset"})`,
    );
    return;
  }

  const publicDir = resolvePublicStaticDir();

  if (!publicDir) {
    logger.warn(
      { cwd: process.cwd(), distDir: apiDistDir(), nodeEnv: process.env.NODE_ENV },
      "SPA static files not found — only /api will be served",
    );
    return;
  }

  const indexHtml = path.join(publicDir, "index.html");
  const staticExists = fs.existsSync(publicDir);
  const indexExists = fs.existsSync(indexHtml);

  console.log(`${SPA_LOG_PREFIX} mounting express.static on: ${publicDir}`);
  console.log(`${SPA_LOG_PREFIX} fs.existsSync(publicDir) = ${staticExists}`);
  console.log(`${SPA_LOG_PREFIX} fs.existsSync(index.html) = ${indexExists}`);
  console.log(`${SPA_LOG_PREFIX} index.html path: ${indexHtml}`);

  if (!staticExists || !indexExists) {
    console.error(`${SPA_LOG_PREFIX} ABORT — verified path missing after resolve`);
    return;
  }

  logger.info({ publicDir, indexHtml }, "Serving frontend static files");

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

  // SPA fallback — Express 5 / path-to-regexp rejects bare "*" routes.
  // Use pathless middleware instead of app.get("*") or app.get("/*").
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    if (req.path.startsWith("/api")) return next();
    if (req.path.startsWith("/socket.io")) return next();
    if (path.extname(req.path)) return next();

    console.log(`${SPA_LOG_PREFIX} SPA fallback → ${indexHtml} for ${req.path}`);
    res.sendFile(indexHtml, (err) => {
      if (err) next(err);
    });
  });

  console.log(`${SPA_LOG_PREFIX} static middleware + SPA fallback registered OK`);
}
