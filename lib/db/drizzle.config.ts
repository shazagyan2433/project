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
          url: process.env.DATABASE_URL!,
        },
      }),
});
