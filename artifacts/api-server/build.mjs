import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import esbuildPluginPino from "esbuild-plugin-pino";
import { cp, rm } from "node:fs/promises";
import fs from "node:fs";

// Plugins (e.g. 'esbuild-plugin-pino') may use `require` to resolve dependencies
globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));

async function copyFrontendStatic(distDir) {
  const frontendCandidates = [
    path.resolve(artifactDir, "../kurdish-pos/dist/public"),
    path.resolve(artifactDir, "../kurdish-pos/dist"),
    path.resolve(process.cwd(), "artifacts/kurdish-pos/dist/public"),
    path.resolve(process.cwd(), "artifacts/kurdish-pos/dist"),
  ];

  console.log("[build] Looking for frontend SPA to copy into api-server/dist/public");
  for (const dir of frontendCandidates) {
    const index = path.join(dir, "index.html");
    console.log(
      `[build]   ${dir} → dir=${fs.existsSync(dir)} index.html=${fs.existsSync(index)}`,
    );
  }

  const source = frontendCandidates.find((dir) =>
    fs.existsSync(path.join(dir, "index.html")),
  );

  if (!source) {
    console.error("[build] FATAL: Frontend SPA not found — kurdish-pos build must run first");
    process.exit(1);
  }

  const target = path.join(distDir, "public");
  await rm(target, { recursive: true, force: true });
  await cp(source, target, { recursive: true });

  const targetIndex = path.join(target, "index.html");
  if (!fs.existsSync(targetIndex)) {
    console.error(`[build] FATAL: SPA copy failed — missing ${targetIndex}`);
    process.exit(1);
  }

  console.log(`[build] Copied SPA ${source} → ${target}`);
  console.log(`[build] Verified index.html at ${targetIndex}`);
}

async function buildAll() {
  const distDir = path.resolve(artifactDir, "dist");
  await rm(distDir, { recursive: true, force: true });

  await esbuild({
    entryPoints: [path.resolve(artifactDir, "src/index.ts")],
    platform: "node",
    bundle: true,
    format: "esm",
    outdir: distDir,
    outExtension: { ".js": ".mjs" },
    logLevel: "info",
    // Some packages may not be bundleable, so we externalize them, we can add more here as needed.
    // Some of the packages below may not be imported or installed, but we're adding them in case they are in the future.
    // Examples of unbundleable packages:
    // - uses native modules and loads them dynamically (e.g. sharp)
    // - use path traversal to read files (e.g. @google-cloud/secret-manager loads sibling .proto files)
    external: [
      // Local-dev only — must stay external + dynamically imported so Render/Postgres never requires it
      "@electric-sql/pglite",
      "@electric-sql/pglite/*",
      "drizzle-orm/pglite",
      "*.node",
      "sharp",
      "better-sqlite3",
      "sqlite3",
      "canvas",
      "bcrypt",
      "argon2",
      "fsevents",
      "re2",
      "farmhash",
      "xxhash-addon",
      "bufferutil",
      "utf-8-validate",
      "ssh2",
      "cpu-features",
      "dtrace-provider",
      "isolated-vm",
      "lightningcss",
      "pg-native",
      "oracledb",
      "mongodb-client-encryption",
      "nodemailer",
      "handlebars",
      "knex",
      "typeorm",
      "protobufjs",
      "onnxruntime-node",
      "@tensorflow/*",
      "@prisma/client",
      "@mikro-orm/*",
      "@grpc/*",
      "@swc/*",
      "@aws-sdk/*",
      "@azure/*",
      "@opentelemetry/*",
      "@google-cloud/*",
      "@google/*",
      "googleapis",
      "firebase-admin",
      "@parcel/watcher",
      "@sentry/profiling-node",
      "@tree-sitter/*",
      "aws-sdk",
      "classic-level",
      "dd-trace",
      "ffi-napi",
      "grpc",
      "hiredis",
      "kerberos",
      "leveldown",
      "miniflare",
      "mysql2",
      "newrelic",
      "odbc",
      "piscina",
      "realm",
      "ref-napi",
      "rocksdb",
      "sass-embedded",
      "sequelize",
      "serialport",
      "snappy",
      "tinypool",
      "usb",
      "workerd",
      "wrangler",
      "zeromq",
      "zeromq-prebuilt",
      "playwright",
      "puppeteer",
      "puppeteer-core",
      "electron",
    ],
    sourcemap: "linked",
    plugins: [
      // pino relies on workers to handle logging, instead of externalizing it we use a plugin to handle it
      esbuildPluginPino({ transports: ["pino-pretty"] })
    ],
    // Make sure packages that are cjs only (e.g. express) but are bundled continue to work in our esm output file
    banner: {
      js: `import { createRequire as __bannerCrReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';

globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);
    `,
    },
  });

  await copyFrontendStatic(distDir);
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
