import fs from "node:fs";
import path from "node:path";
import type { Express } from "express";
import express from "express";
import { logger } from "./logger";

function candidateDirs(): string[] {
  const dirs: string[] = [];
  if (process.env["PUBLIC_STATIC_DIR"]) {
    dirs.push(path.resolve(process.env["PUBLIC_STATIC_DIR"]));
  }
  dirs.push(
    path.resolve(process.cwd(), "artifacts/kurdish-pos/dist/public"),
    path.resolve(process.cwd(), "public"),
    path.resolve(__dirname, "../../kurdish-pos/dist/public"),
    path.resolve(__dirname, "../public"),
  );
  return dirs;
}

export function resolvePublicStaticDir(): string | null {
  for (const dir of candidateDirs()) {
    if (fs.existsSync(path.join(dir, "index.html"))) {
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
    logger.warn("SPA static files not found — only /api will be served");
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

  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    if (req.path.startsWith("/api")) return next();
    if (req.path.startsWith("/socket.io")) return next();
    if (path.extname(req.path)) return next();

    res.sendFile(path.join(publicDir, "index.html"), (err) => {
      if (err) next(err);
    });
  });
}
