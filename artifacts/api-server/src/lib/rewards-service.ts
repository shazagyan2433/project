import {
  db,
  platformSettingsTable,
  loyaltyAccountsTable,
  usersTable,
} from "@workspace/db";
import { eq, desc, gt } from "drizzle-orm";
import {
  mergeRewardsConfig,
  type RewardsConfig,
  type RewardTierDef,
} from "./rewards-defaults";

const CONFIG_KEY = "rewards_config";

export async function loadRewardsConfig(): Promise<RewardsConfig> {
  const [row] = await db
    .select()
    .from(platformSettingsTable)
    .where(eq(platformSettingsTable.key, CONFIG_KEY));

  const merged = mergeRewardsConfig(row?.value as Partial<RewardsConfig> | undefined);
  return {
    tiers: merged.tiers.filter((t) => t.active !== false),
    challenges: merged.challenges.filter((c) => c.active !== false),
    spinPrizes: merged.spinPrizes.filter((p) => p.active !== false),
  };
}

export async function saveRewardsConfig(config: RewardsConfig): Promise<void> {
  const now = new Date();
  const [existing] = await db
    .select()
    .from(platformSettingsTable)
    .where(eq(platformSettingsTable.key, CONFIG_KEY));

  if (existing) {
    await db
      .update(platformSettingsTable)
      .set({ value: config, updatedAt: now })
      .where(eq(platformSettingsTable.key, CONFIG_KEY));
  } else {
    await db.insert(platformSettingsTable).values({
      key: CONFIG_KEY,
      value: config,
      updatedAt: now,
    });
  }
}

export async function loadRewardsConfigAdmin(): Promise<RewardsConfig> {
  const [row] = await db
    .select()
    .from(platformSettingsTable)
    .where(eq(platformSettingsTable.key, CONFIG_KEY));

  return mergeRewardsConfig(row?.value as Partial<RewardsConfig> | undefined);
}

export function resolveTier(points: number, tiers: RewardTierDef[]) {
  if (tiers.length === 0) {
    return { current: null, next: null, progressPercent: 0 };
  }
  const sorted = [...tiers].sort((a, b) => b.minPoints - a.minPoints);
  const current = sorted.find((t) => points >= t.minPoints) ?? sorted[sorted.length - 1];
  const asc = [...tiers].sort((a, b) => a.minPoints - b.minPoints);
  const currentIdx = asc.findIndex((t) => t.id === current.id);
  const next = currentIdx < asc.length - 1 ? asc[currentIdx + 1] : null;
  const progressPercent =
    next && next.minPoints > current.minPoints
      ? Math.min(
          100,
          ((points - current.minPoints) / (next.minPoints - current.minPoints)) * 100,
        )
      : 100;

  return { current, next, progressPercent };
}

export async function getOrCreateLoyaltyAccount(userId: number) {
  const [existing] = await db
    .select()
    .from(loyaltyAccountsTable)
    .where(eq(loyaltyAccountsTable.userId, userId));

  if (existing) return existing;

  const [created] = await db
    .insert(loyaltyAccountsTable)
    .values({
      userId,
      points: 0,
      challengeProgress: {},
      completedChallengeIds: [],
    })
    .returning();

  if (!created) throw new Error(`Failed to create loyalty account for user ${userId}`);
  return created;
}

export async function buildLeaderboard(limit = 10) {
  const rows = await db
    .select({
      userId: loyaltyAccountsTable.userId,
      points: loyaltyAccountsTable.points,
      name: usersTable.storeName,
      username: usersTable.name,
    })
    .from(loyaltyAccountsTable)
    .innerJoin(usersTable, eq(loyaltyAccountsTable.userId, usersTable.id))
    .where(gt(loyaltyAccountsTable.points, 0))
    .orderBy(desc(loyaltyAccountsTable.points))
    .limit(limit);

  if (rows.length === 0) return [];

  const config = await loadRewardsConfig();

  return rows.map((row, i) => {
    const { current } = resolveTier(row.points, config.tiers);
    return {
      rank: i + 1,
      userId: row.userId,
      name: row.name || row.username || `User #${row.userId}`,
      points: row.points,
      tierKey: current?.key ?? "standard",
      tierIcon: current?.icon ?? "🥉",
    };
  });
}

export function parseChallengeProgress(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const n = Number(v);
    if (Number.isFinite(n)) out[k] = n;
  }
  return out;
}

export function parseCompletedIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string");
}
