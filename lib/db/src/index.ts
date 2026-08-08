import path from "node:path";
import fs from "node:fs";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import pg from "pg";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import * as schema from "./schema";

const { Pool } = pg;

type AppSchema = typeof schema;
export type AppDatabase =
  | NodePgDatabase<AppSchema>
  | PgliteDatabase<AppSchema>;

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
/** Present only when running local PGlite — typed loosely so production never imports PGlite. */
let pgliteClient: { close?: () => Promise<void> } | undefined;

/**
 * Production (Render/DO): PostgreSQL only — never loads `@electric-sql/pglite`.
 * Local: dynamic-import PGlite when USE_LOCAL_DB is set.
 */
async function createDb(): Promise<AppDatabase> {
  const wantsPglite =
    useLocalPglite && !process.env.DATABASE_URL?.startsWith("postgres");

  if (wantsPglite) {
    try {
      const [{ PGlite }, { drizzle: drizzlePglite }] = await Promise.all([
        import("@electric-sql/pglite"),
        import("drizzle-orm/pglite"),
      ]);
      const dataDir = resolvePgliteDir();
      fs.mkdirSync(dataDir, { recursive: true });
      const client = new PGlite(dataDir);
      pgliteClient = client;
      console.info(`[db] Using local PGlite database at ${dataDir}`);
      return drizzlePglite(client, { schema });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(
        `USE_LOCAL_DB requires @electric-sql/pglite, but it failed to load (${message}). ` +
          `Install it or set DATABASE_URL to a PostgreSQL connection string.`,
      );
    }
  }

  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set. For local dev without Postgres, run the API with USE_LOCAL_DB=true (PGlite fallback).",
    );
  }

  const url = process.env.DATABASE_URL;
  const sslEnabled =
    process.env.DATABASE_SSL === "true" ||
    process.env.DATABASE_SSL === "1" ||
    /[?&]sslmode=(require|verify-full|verify-ca)/i.test(url) ||
    /\.render\.com|\.railway\.app|\.supabase\.co/i.test(url);

  pool = new Pool({
    connectionString: url,
    ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: Number(process.env.PG_CONNECT_TIMEOUT_MS ?? 10_000),
  });
  console.info(`[db] Using PostgreSQL (ssl=${sslEnabled})`);
  return drizzlePg(pool, { schema });
}

export const db: AppDatabase = await createDb();
export { pool, pgliteClient };
export * from "./schema";
