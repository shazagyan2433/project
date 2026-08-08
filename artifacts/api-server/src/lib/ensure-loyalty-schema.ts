import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

/** Idempotent — safe on every API boot (PGlite or Postgres). */
export async function ensureLoyaltySchema(): Promise<void> {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS loyalty_accounts (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        points INTEGER NOT NULL DEFAULT 0,
        challenge_progress JSONB NOT NULL DEFAULT '{}'::jsonb,
        completed_challenge_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
        last_spin_at TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
  } catch (err) {
    logger.warn({ err }, "loyalty_accounts schema ensure skipped (users table may not exist yet)");
  }
}

export async function bootstrapDatabase(): Promise<void> {
  await ensureLoyaltySchema();
}
