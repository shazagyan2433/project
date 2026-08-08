import { defineConfig } from "drizzle-kit";
import path from "path";

const useLocal =
  process.env.USE_LOCAL_DB === "true" ||
  process.env.USE_LOCAL_DB === "1" ||
  !process.env.DATABASE_URL ||
  process.env.DATABASE_URL === "pglite" ||
  process.env.DATABASE_URL === "local";

if (!useLocal && !process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set, or run with USE_LOCAL_DB=true for PGlite.");
}

/**
 * Ensure managed Postgres URLs negotiate SSL (Render, Railway, Supabase, Neon).
 * drizzle-kit uses the connection string; sslmode=require is the portable fix.
 */
function resolvePostgresUrl(raw: string): string {
  let url = raw.trim();
  const forceSsl =
    process.env.DATABASE_SSL === "true" ||
    process.env.DATABASE_SSL === "1" ||
    /\.render\.com|\.railway\.app|\.supabase\.co|\.neon\.tech/i.test(url) ||
    /[?&]sslmode=(require|verify-full|verify-ca)/i.test(url);

  if (forceSsl && !/[?&]sslmode=/i.test(url)) {
    url += (url.includes("?") ? "&" : "?") + "sslmode=require";
  }
  // Prefer insecure TLS verify for managed providers (matches runtime Pool ssl.rejectUnauthorized: false)
  if (forceSsl && !/[?&]ssl=/i.test(url) && !/sslmode=disable/i.test(url)) {
    // node-postgres respects sslmode; rejectUnauthorized is handled when app Pool sets DATABASE_SSL
  }
  return url;
}

export default defineConfig({
  schema: "./src/schema/*.ts",
  dialect: "postgresql",
  ...(useLocal
    ? {
        driver: "pglite",
        dbCredentials: {
          url: process.env.PGLITE_DATA_DIR ?? path.join(__dirname, ".data/linqi-pglite"),
        },
      }
    : {
        dbCredentials: {
          url: resolvePostgresUrl(process.env.DATABASE_URL!),
        },
      }),
});
