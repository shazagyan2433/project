import { db, platformSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";
import { DEFAULT_REWARDS_CONFIG } from "./rewards-defaults";
import { saveRewardsConfig } from "./rewards-service";

const CONFIG_KEY = "rewards_config";

/** Seed tier/challenge definitions only — user points stay at 0 until real events. */
export async function seedRewardsConfig(): Promise<void> {
  try {
    const [row] = await db
      .select()
      .from(platformSettingsTable)
      .where(eq(platformSettingsTable.key, CONFIG_KEY));

    if (!row?.value) {
      await saveRewardsConfig(DEFAULT_REWARDS_CONFIG);
      logger.info("Seeded default rewards config (tiers + challenges)");
    }
  } catch (err) {
    logger.warn({ err }, "Could not seed rewards config");
  }
}

export async function seedRewards(): Promise<void> {
  await seedRewardsConfig();
}
