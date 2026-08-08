import { Router, type IRouter } from "express";
import { z } from "zod";
import { db, loyaltyAccountsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import {
  buildLeaderboard,
  getOrCreateLoyaltyAccount,
  loadRewardsConfig,
  loadRewardsConfigAdmin,
  parseChallengeProgress,
  parseCompletedIds,
  resolveTier,
  saveRewardsConfig,
} from "../lib/rewards-service";
import { pickWeightedSpinPrize, mergeRewardsConfig } from "../lib/rewards-defaults";

const router: IRouter = Router();

const rewardsConfigSchema = z.object({
  tiers: z.array(
    z.object({
      id: z.string(),
      key: z.enum(["standard", "silver", "gold", "diamond"]),
      minPoints: z.number().int().min(0),
      color: z.string(),
      icon: z.string(),
      perks: z.array(z.string()),
      sortOrder: z.number().int(),
      active: z.boolean(),
    }),
  ),
  challenges: z.array(
    z.object({
      id: z.string(),
      key: z.string(),
      titleKu: z.string(),
      titleAr: z.string(),
      titleEn: z.string(),
      points: z.number().int().min(0),
      target: z.number().int().min(1),
      icon: z.string(),
      color: z.string(),
      sortOrder: z.number().int(),
      active: z.boolean(),
    }),
  ),
  spinPrizes: z
    .array(
      z.object({
        id: z.string(),
        labelKu: z.string(),
        labelAr: z.string(),
        labelEn: z.string(),
        points: z.number().int().min(0),
        weight: z.number().int().min(0),
        sortOrder: z.number().int(),
        active: z.boolean(),
      }),
    )
    .optional(),
});

router.get("/rewards/config", requireAuth, async (_req, res): Promise<void> => {
  try {
    const config = await loadRewardsConfig();
    res.json(config);
  } catch (err) {
    _req.log.error({ err }, "Failed to load rewards config");
    res.status(503).json({ message: "Rewards configuration unavailable" });
  }
});

router.get("/rewards/profile", requireAuth, async (req, res): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const [config, account] = await Promise.all([
      loadRewardsConfig(),
      getOrCreateLoyaltyAccount(userId),
    ]);

    const { current, next, progressPercent } = resolveTier(account.points, config.tiers);

    res.json({
      points: account.points,
      tierKey: current?.key ?? "standard",
      tierId: current?.id ?? "",
      tierIcon: current?.icon ?? "🥉",
      tierColor: current?.color ?? "#94A3B8",
      nextTierKey: next?.key ?? null,
      nextTierMin: next?.minPoints ?? null,
      progressPercent,
      pointsToNext: next ? Math.max(0, next.minPoints - account.points) : 0,
      spinAvailable: !account.lastSpinAt || Date.now() - account.lastSpinAt.getTime() > 86400000,
      lastSpinAt: account.lastSpinAt?.toISOString() ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to load rewards profile");
    res.status(500).json({ message: "Failed to load rewards profile" });
  }
});

router.get("/rewards/challenges", requireAuth, async (req, res): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const [config, account] = await Promise.all([
      loadRewardsConfig(),
      getOrCreateLoyaltyAccount(userId),
    ]);

    const progress = parseChallengeProgress(account.challengeProgress);
    const completed = new Set(parseCompletedIds(account.completedChallengeIds));

    const challenges = config.challenges
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((c) => {
        const done = Math.min(c.target, progress[c.id] ?? 0);
        return {
          id: c.id,
          key: c.key,
          titleKu: c.titleKu,
          titleAr: c.titleAr,
          titleEn: c.titleEn,
          points: c.points,
          target: c.target,
          done,
          completed: done >= c.target || completed.has(c.id),
          icon: c.icon,
          color: c.color,
        };
      });

    res.json(challenges);
  } catch (err) {
    req.log.error({ err }, "Failed to load challenges");
    res.status(500).json({ message: "Failed to load challenges" });
  }
});

router.get("/rewards/leaderboard", requireAuth, async (req, res): Promise<void> => {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const rows = await buildLeaderboard(limit);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Failed to load leaderboard");
    res.status(500).json({ message: "Failed to load leaderboard" });
  }
});

router.post("/rewards/spin", requireAuth, async (req, res): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const account = await getOrCreateLoyaltyAccount(userId);

    const cooldownMs = 86400000;
    if (account.lastSpinAt && Date.now() - account.lastSpinAt.getTime() < cooldownMs) {
      res.status(429).json({ message: "Spin not available yet" });
      return;
    }

    const config = await loadRewardsConfig();
    const picked = pickWeightedSpinPrize(config.spinPrizes);
    if (!picked) {
      res.status(503).json({ message: "Spin wheel not configured" });
      return;
    }
    const { prize, index: prizeIndex } = picked;
    const won = prize.points;
    const newPoints = account.points + won;
    const spinAgain = prize.id === "spinAgain";

    await db
      .update(loyaltyAccountsTable)
      .set({
        points: newPoints,
        lastSpinAt: spinAgain ? account.lastSpinAt : new Date(),
        updatedAt: new Date(),
      })
      .where(eq(loyaltyAccountsTable.userId, userId));

    res.json({
      prizeIndex,
      prizeId: prize.id,
      won,
      totalPoints: newPoints,
    });
  } catch (err) {
    req.log.error({ err }, "Spin failed");
    res.status(500).json({ message: "Spin failed" });
  }
});

router.get("/admin/rewards", requireAdmin, async (_req, res): Promise<void> => {
  try {
    const config = await loadRewardsConfigAdmin();
    res.json(config);
  } catch (err) {
    _req.log.error({ err }, "Failed to load admin rewards");
    res.status(503).json({ message: "Rewards configuration unavailable" });
  }
});

router.put("/admin/rewards", requireAdmin, async (req, res): Promise<void> => {
  try {
    const parsed = rewardsConfigSchema.parse(req.body);
    const body = mergeRewardsConfig(parsed);
    await saveRewardsConfig(body);
    res.json({ ok: true, config: body });
  } catch (err) {
    req.log.error({ err }, "Failed to save rewards config");
    res.status(400).json({ message: "Invalid rewards configuration" });
  }
});

router.patch("/admin/rewards/accounts/:userId", requireAdmin, async (req, res): Promise<void> => {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isFinite(userId)) {
      res.status(400).json({ message: "Invalid user id" });
      return;
    }

    const schema = z.object({
      points: z.number().int().min(0).optional(),
      challengeProgress: z.record(z.string(), z.number().int().min(0)).optional(),
    });
    const body = schema.parse(req.body);

    const account = await getOrCreateLoyaltyAccount(userId);
    const updates: Partial<typeof loyaltyAccountsTable.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (body.points !== undefined) updates.points = body.points;
    if (body.challengeProgress !== undefined) updates.challengeProgress = body.challengeProgress;

    await db
      .update(loyaltyAccountsTable)
      .set(updates)
      .where(eq(loyaltyAccountsTable.userId, userId));

    res.json({
      userId,
      points: body.points ?? account.points,
      challengeProgress: body.challengeProgress ?? parseChallengeProgress(account.challengeProgress),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to update loyalty account");
    res.status(400).json({ message: "Failed to update account" });
  }
});

export default router;
