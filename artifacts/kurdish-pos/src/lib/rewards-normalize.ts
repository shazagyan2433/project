import type { RewardsConfig } from "@/hooks/useRewards";

/** Empty master config — used only before API data arrives (not mock rules). */
export const EMPTY_REWARDS_CONFIG: RewardsConfig = {
  tiers: [],
  challenges: [],
  spinPrizes: [],
};

/** Parse API JSON without injecting local demo tiers/challenges/spin slices. */
export function normalizeRewardsConfig(raw: unknown): RewardsConfig {
  const data = raw && typeof raw === "object" ? (raw as Partial<RewardsConfig>) : {};
  return {
    tiers: Array.isArray(data.tiers) ? data.tiers : [],
    challenges: Array.isArray(data.challenges) ? data.challenges : [],
    spinPrizes: Array.isArray(data.spinPrizes) ? data.spinPrizes : [],
  };
}

export class RewardsApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "RewardsApiError";
  }
}

async function rewardsJson<T>(res: Response, label: string): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = (body as { message?: string }).message ?? `${label} failed (${res.status})`;
    throw new RewardsApiError(msg, res.status);
  }
  return (await res.json()) as T;
}

export async function fetchRewardsConfig(res: Response) {
  return normalizeRewardsConfig(await rewardsJson(res, "Rewards config"));
}

export async function fetchRewardsProfile(res: Response) {
  return rewardsJson<import("@/hooks/useRewards").RewardsProfile>(res, "Rewards profile");
}

export async function fetchRewardsChallenges(res: Response) {
  const data = await rewardsJson<import("@/hooks/useRewards").RewardChallenge[]>(res, "Rewards challenges");
  return Array.isArray(data) ? data : [];
}
