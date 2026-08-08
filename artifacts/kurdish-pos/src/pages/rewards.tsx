import { useState } from "react";
import { motion } from "framer-motion";
import {
  Trophy, Star, Zap, Target, Users, Crown, Loader2, AlertTriangle, type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/PageHeader";
import { useLocaleDir } from "@/lib/use-locale-dir";
import {
  useRewardsConfig,
  useRewardsProfile,
  useChallenges,
  useRewardsLeaderboard,
  useSpinWheel,
  challengeTitle,
  spinPrizeLabel,
  type TierKey,
} from "@/hooks/useRewards";
import { SpinWheel, spinAngleForPrize } from "@/components/rewards/SpinWheel";
import { cn } from "@/lib/utils";

const TIER_NAME_KEYS: Record<TierKey, string> = {
  standard: "rewards.tierStandard",
  silver: "rewards.tierSilver",
  gold: "rewards.tierGold",
  diamond: "rewards.tierDiamond",
};

const CHALLENGE_ICONS: Record<string, LucideIcon> = {
  target: Target,
  users: Users,
  star: Star,
  zap: Zap,
};

const CARD =
  "rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm " +
  "dark:border-slate-700/60 dark:bg-slate-900/80 dark:shadow-lg dark:backdrop-blur-sm";

const CARD_TITLE = "text-sm font-extrabold tracking-tight text-slate-900 dark:text-white";
const CARD_HEADING = "text-lg font-extrabold text-slate-900 dark:text-white";
const CARD_LABEL = "text-xs font-semibold text-slate-600 dark:text-slate-300";
const CARD_META = "text-[10px] font-medium text-slate-600 dark:text-slate-300";
const CARD_BODY = "text-[11px] font-semibold text-slate-900 dark:text-white";

const TIER_CARD =
  "rounded-2xl border border-slate-200/80 bg-white p-4 text-center shadow-sm transition-colors " +
  "dark:border-slate-700/60 dark:bg-slate-900/80 dark:shadow-none";
const TIER_CARD_ACTIVE =
  "border-amber-500/70 bg-amber-50/90 ring-1 ring-amber-500/40 dark:bg-slate-800/90";

export default function RewardsCenter() {
  const { t, i18n } = useTranslation("ui");
  const { dir } = useLocaleDir("ui");
  const lang = i18n.language;

  const { data: config, isLoading: configLoading, isError: configError } = useRewardsConfig();
  const { data: profile, isLoading: profileLoading, isError: profileError } = useRewardsProfile();
  const { data: challenges = [], isLoading: challengesLoading } = useChallenges();
  const { data: leaderboard = [] } = useRewardsLeaderboard(10);
  const spinMutation = useSpinWheel();

  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [lastPrizeId, setLastPrizeId] = useState<string | null>(null);
  const [lastWon, setLastWon] = useState<number | null>(null);

  if (configLoading || profileLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-600 dark:text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm">{t("common.loading", { ns: "common" })}</p>
      </div>
    );
  }

  if (configError || profileError || !config || !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-center max-w-md mx-auto">
        <AlertTriangle className="w-10 h-10 text-amber-500" />
        <p className="text-sm text-slate-700 dark:text-slate-300">{t("common.loadError", { ns: "common" })}</p>
      </div>
    );
  }

  const tiers = [...config.tiers].sort((a, b) => a.sortOrder - b.sortOrder);
  const spinPrizes = config.spinPrizes ?? [];
  const activeSpinCount = spinPrizes.filter((p) => p.active !== false).length || 1;
  const tierName = (key: TierKey) => t(TIER_NAME_KEYS[key]);

  const spin = async () => {
    if (spinning || !profile.spinAvailable) return;
    setSpinning(true);
    setLastWon(null);
    setLastPrizeId(null);
    try {
      const result = await spinMutation.mutateAsync();
      setAngle(spinAngleForPrize(result.prizeIndex, activeSpinCount, angle));
      setTimeout(() => {
        setLastPrizeId(result.prizeId);
        setLastWon(result.won);
        setSpinning(false);
      }, 2500);
    } catch {
      setSpinning(false);
    }
  };

  const currentTier = tiers.find((tier) => tier.key === profile.tierKey) ?? tiers[0];
  const nextTier = tiers.find((tier) => tier.minPoints > profile.points);
  const progress = profile.progressPercent ?? 0;

  return (
    <div dir={dir} className="space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-500/40 bg-amber-100 dark:bg-amber-500/20">
          <Trophy className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <PageHeader id="rewards" showDescription={false} />
          <p className="text-xs font-medium text-slate-600 dark:text-slate-300 linqi-page-header-subtitle">
            {t("rewards.subtitle")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Tier progress */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(CARD, "flex flex-col items-center text-center")}
        >
          <span className="mb-2 text-5xl drop-shadow-sm">{profile.tierIcon ?? currentTier?.icon}</span>
          <p className={CARD_HEADING}>{tierName(profile.tierKey ?? "standard")}</p>
          <p className={cn(CARD_LABEL, "mb-4")}>{t("rewards.currentTierLabel")}</p>
          <div className="mb-1.5 w-full">
            <div className="mb-1 flex justify-between gap-2 text-[10px]">
              <span className={CARD_BODY}>
                {profile.points.toLocaleString()} {t("rewards.points")}
              </span>
              {nextTier && (
                <span className={CARD_META}>
                  {nextTier.minPoints.toLocaleString()} → {tierName(nextTier.key)}
                </span>
              )}
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, progress)}%` }}
                transition={{ delay: 0.3, duration: 1.1 }}
                className="h-full rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${currentTier?.color ?? "#F59E0B"}, ${nextTier?.color ?? "#06B6D4"})`,
                }}
              />
            </div>
          </div>
          {nextTier && (
            <p className={cn(CARD_META, "mt-1")}>
              {t("rewards.pointsToNext", {
                count: profile.pointsToNext.toLocaleString(),
                tier: tierName(nextTier.key),
              })}{" "}
              {nextTier.icon}
            </p>
          )}
        </motion.div>

        {/* Spin wheel */}
        <div className={cn(CARD, "flex flex-col items-center justify-center gap-4")}>
          <p className={CARD_TITLE}>{t("rewards.spinWheel")}</p>
          <SpinWheel angle={angle} spinning={spinning} prizes={spinPrizes} lang={lang} />
          <button
            type="button"
            onClick={spin}
            disabled={spinning || !profile.spinAvailable}
            className={cn(
              "rounded-xl px-6 py-2.5 text-sm font-extrabold text-white transition-all",
              spinning || !profile.spinAvailable
                ? "cursor-not-allowed bg-slate-600 opacity-70"
                : "bg-gradient-to-br from-amber-500 to-rose-600 hover:brightness-110",
            )}
          >
            {spinning ? t("rewards.spinning") : t("rewards.spinBtn")}
          </button>
          {lastPrizeId != null && (
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {lastWon != null && lastWon > 0
                ? t("rewards.spinWon", { count: lastWon })
                : t("rewards.spinPrizeWon", {
                    prize: spinPrizes.find((p) => p.id === lastPrizeId)
                      ? spinPrizeLabel(spinPrizes.find((p) => p.id === lastPrizeId)!, lang)
                      : t(`rewards.spinPrizes.${lastPrizeId}`),
                  })}
            </p>
          )}
          {!profile.spinAvailable && !spinning && (
            <p className={CARD_META}>{t("rewards.spinCooldown")}</p>
          )}
        </div>

        {/* Weekly challenges */}
        <div className={cn(CARD, "space-y-3")}>
          <p className={cn(CARD_TITLE, "mb-1")}>{t("rewards.weeklyChallenge")}</p>
          {challengesLoading ? (
            <p className={CARD_LABEL}>{t("common.loading", { ns: "common" })}</p>
          ) : challenges.length === 0 ? (
            <p className={CARD_LABEL}>{t("rewards.noChallenges")}</p>
          ) : (
            challenges.map((c) => {
              const Icon = CHALLENGE_ICONS[c.icon] ?? Target;
              const pct = c.target > 0 ? Math.min(100, (c.done / c.target) * 100) : 0;
              return (
                <div key={c.id} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: c.color }} />
                      <span className={cn(CARD_BODY, "truncate")}>
                        {challengeTitle(c, lang)}
                      </span>
                    </div>
                    <span className="shrink-0 text-[10px] font-extrabold" style={{ color: c.color }}>
                      +{c.points}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: c.color }}
                    />
                  </div>
                  <p className={CARD_META}>
                    {t("rewards.challengeProgress", { done: c.done, total: c.target })}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Tier perks */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiers.map((tier) => {
          const active = tier.key === profile.tierKey;
          return (
            <div
              key={tier.id}
              className={cn(TIER_CARD, active && TIER_CARD_ACTIVE)}
            >
              <span className="text-2xl">{tier.icon}</span>
              <p
                className="mt-1.5 text-sm font-extrabold text-slate-900 dark:text-white"
                style={{ color: tier.color }}
              >
                {tierName(tier.key)}
              </p>
              <p className={cn(CARD_META, "mb-2")}>
                {t("rewards.pointsMin", { min: tier.minPoints.toLocaleString() })}
              </p>
              {tier.perks.map((p) => (
                <p key={p} className={cn(CARD_LABEL, "leading-tight")}>
                  {t(`rewards.perks.${p}`, { defaultValue: p })}
                </p>
              ))}
            </div>
          );
        })}
      </div>

      {/* Leaderboard */}
      <div className={cn("overflow-hidden p-0", CARD)}>
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <Crown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <p className={CARD_TITLE}>{t("rewards.leaderboard")}</p>
        </div>
        {leaderboard.length === 0 ? (
          <p className={cn(CARD_LABEL, "px-5 py-8 text-center text-slate-600 dark:text-slate-400")}>
            {t("rewards.emptyLeaderboard")}
          </p>
        ) : (
          <table className="w-full">
            <tbody>
              {leaderboard.map((row) => (
                <tr
                  key={row.userId}
                  className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                >
                  <td className="px-5 py-3 text-center">
                    {row.rank <= 3 ? (
                      <span className="text-lg">{["🥇", "🥈", "🥉"][row.rank - 1]}</span>
                    ) : (
                      <span className="text-sm font-extrabold text-slate-500 dark:text-slate-500">#{row.rank}</span>
                    )}
                  </td>
                  <td className={cn("px-4 py-3 text-sm font-bold", CARD_BODY)}>{row.name}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm">{row.tierIcon}</span>{" "}
                    <span className={CARD_META}>{tierName(row.tierKey)}</span>
                  </td>
                  <td className="px-5 py-3 text-end">
                    <span className={cn("text-sm font-extrabold", CARD_BODY)}>
                      {row.points.toLocaleString()}
                    </span>{" "}
                    <span className={CARD_META}>{t("rewards.points")}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
