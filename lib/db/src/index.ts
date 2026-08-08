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
  const url = process.env.DATABASE_URL;
  const sslEnabled =
    process.env.DATABASE_SSL === "true" ||
    process.env.DATABASE_SSL === "1" ||
    /[?&]sslmode=(require|verify-full|verify-ca)/i.test(url) ||
    /\.render\.com|\.railway\.app|\.supabase\.co/i.test(url);
  pool = new Pool({
    connectionString: url,
    ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
    // Fail fast on connect so HTTP bootstrap isn't blocked by hung sockets
    connectionTimeoutMillis: Number(process.env.PG_CONNECT_TIMEOUT_MS ?? 10_000),
  });
  console.info(`[db] Using PostgreSQL (ssl=${sslEnabled})`);
}

export const db = pgliteClient
  ? drizzlePglite(pgliteClient, { schema })
  : drizzlePg(pool!, { schema });

export { pool, pgliteClient };
export * from "./schema";
