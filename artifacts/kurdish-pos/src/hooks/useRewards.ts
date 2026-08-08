import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authedFetch, fetchJsonArray } from "@/lib/authedFetch";
import {
  normalizeRewardsConfig,
  fetchRewardsConfig,
  fetchRewardsProfile,
  fetchRewardsChallenges,
} from "@/lib/rewards-normalize";

export type TierKey = "standard" | "silver" | "gold" | "diamond";

export interface RewardTier {
  id: string;
  key: TierKey;
  minPoints: number;
  color: string;
  icon: string;
  perks: string[];
  sortOrder: number;
  active: boolean;
}

export interface RewardChallengeDef {
  id: string;
  key: string;
  titleKu: string;
  titleAr: string;
  titleEn: string;
  points: number;
  target: number;
  icon: string;
  color: string;
  sortOrder: number;
  active: boolean;
}

export interface RewardChallenge extends RewardChallengeDef {
  done: number;
  completed: boolean;
}

export interface SpinPrizeDef {
  id: string;
  labelKu: string;
  labelAr: string;
  labelEn: string;
  points: number;
  weight: number;
  sortOrder: number;
  active: boolean;
}

export interface RewardsConfig {
  tiers: RewardTier[];
  challenges: RewardChallengeDef[];
  spinPrizes: SpinPrizeDef[];
}

export interface RewardsProfile {
  points: number;
  tierKey: TierKey;
  tierId: string;
  tierIcon: string;
  tierColor: string;
  nextTierKey: TierKey | null;
  nextTierMin: number | null;
  progressPercent: number;
  pointsToNext: number;
  spinAvailable: boolean;
  lastSpinAt: string | null;
}

export interface LeaderboardRow {
  rank: number;
  userId: number;
  name: string;
  points: number;
  tierKey: TierKey;
  tierIcon: string;
}

export function useRewardsConfig() {
  return useQuery({
    queryKey: ["rewards", "config"],
    queryFn: async () => {
      const res = await authedFetch("/api/rewards/config");
      return fetchRewardsConfig(res);
    },
    staleTime: 30_000,
    retry: 1,
  });
}

export function useRewardsProfile() {
  return useQuery({
    queryKey: ["rewards", "profile"],
    queryFn: async () => {
      const res = await authedFetch("/api/rewards/profile");
      return fetchRewardsProfile(res);
    },
    staleTime: 15_000,
    retry: 1,
  });
}

export function useChallenges() {
  return useQuery({
    queryKey: ["rewards", "challenges"],
    queryFn: async () => {
      const res = await authedFetch("/api/rewards/challenges");
      return fetchRewardsChallenges(res);
    },
    staleTime: 15_000,
    retry: 1,
  });
}

export function useRewardsLeaderboard(limit = 10) {
  return useQuery({
    queryKey: ["rewards", "leaderboard", limit],
    queryFn: () => fetchJsonArray<LeaderboardRow>(`/api/rewards/leaderboard?limit=${limit}`),
    staleTime: 30_000,
    retry: 1,
  });
}

export function useSpinWheel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await authedFetch("/api/rewards/spin", { method: "POST" });
      if (res.status === 429) throw new Error("spin_cooldown");
      if (!res.ok) throw new Error("spin_failed");
      return (await res.json()) as {
        prizeIndex: number;
        prizeId: string;
        won: number;
        totalPoints: number;
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rewards"] });
    },
  });
}

export function useAdminRewards() {
  return useQuery({
    queryKey: ["admin", "rewards"],
    queryFn: async () => {
      const res = await authedFetch("/api/admin/rewards");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { message?: string }).message ?? `Admin rewards failed (${res.status})`);
      }
      return normalizeRewardsConfig(await res.json());
    },
    staleTime: 10_000,
    retry: 1,
  });
}

export function useSaveAdminRewards() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (config: RewardsConfig) => {
      const res = await authedFetch("/api/admin/rewards", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? "Failed to save rewards");
      }
      return (await res.json()) as { ok: boolean; config: RewardsConfig };
    },
    onSuccess: (_data, variables) => {
      qc.setQueryData(["admin", "rewards"], variables);
      qc.invalidateQueries({ queryKey: ["rewards"] });
    },
  });
}

export function spinPrizeLabel(
  p: Pick<SpinPrizeDef, "labelKu" | "labelAr" | "labelEn" | "id">,
  lang: string,
): string {
  if (lang.startsWith("ku")) return p.labelKu || p.id;
  if (lang.startsWith("ar")) return p.labelAr || p.id;
  return p.labelEn || p.id;
}

export function challengeTitle(
  c: Pick<RewardChallenge, "titleKu" | "titleAr" | "titleEn" | "key">,
  lang: string,
): string {
  if (lang.startsWith("ku")) return c.titleKu;
  if (lang.startsWith("ar")) return c.titleAr;
  return c.titleEn;
}
