import path from "node:path";
import fs from "node:fs";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const useLocalPglite =
  process.env.USE_LOCAL_DB === "true" ||
  process.env.USE_LOCAL_DB === "1" ||
  process.env.DATABASE_URL === "pglite" ||
  process.env.DATABASE_URL === "local";

function resolvePgliteDir(): string {
  if (process.env.PGLITE_DATA_DIR) {
    return path.resolve(process.env.PGLITE_DATA_DIR);
  }
  return path.resolve(process.cwd(), ".data", "linqi-pglite");
}

let pool: pg.Pool | undefined;
let pgliteClient: PGlite | undefined;

if (useLocalPglite && !process.env.DATABASE_URL?.startsWith("postgres")) {
  const dataDir = resolvePgliteDir();
  fs.mkdirSync(dataDir, { recursive: true });
  pgliteClient = new PGlite(dataDir);
  console.info(`[db] Using local PGlite database at ${dataDir}`);
} else if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. For local dev without Postgres, run the API with USE_LOCAL_DB=true (PGlite fallback).",
  );
} else {
  const sslEnabled = process.env.DATABASE_SSL === "true";
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
  });
}

export const db = pgliteClient
  ? drizzlePglite(pgliteClient, { schema })
  : drizzlePg(pool!, { schema });

export { pool, pgliteClient };
export * from "./schema";
