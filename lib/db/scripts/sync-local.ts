/**
 * Push Drizzle schema into the local PGlite file DB (no Postgres required).
 * Skipped when DATABASE_URL points to a real Postgres instance.
 */
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { pushSchema } from "drizzle-kit/api";
import * as schema from "../src/schema/index.ts";

const dbUrl = process.env.DATABASE_URL;
if (dbUrl && dbUrl !== "pglite" && dbUrl !== "local" && !dbUrl.startsWith("file:")) {
  console.info("[db:sync-local] DATABASE_URL is set — skipping PGlite bootstrap.");
  process.exit(0);
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

const dataDir = process.env.PGLITE_DATA_DIR
  ? path.resolve(process.env.PGLITE_DATA_DIR)
  : path.join(repoRoot, ".data", "linqi-pglite");

fs.mkdirSync(dataDir, { recursive: true });

const client = new PGlite(dataDir);
const db = drizzle(client, { schema });

const { apply } = await pushSchema(schema, db as never);
await apply();

console.info(`[db:sync-local] Schema synced to ${dataDir}`);
await client.close();
