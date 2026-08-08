import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2, Trophy, Target, Disc3, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { adminSubheader, adminSectionTitle } from "@/lib/admin-nav-styles";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  useAdminRewards,
  useSaveAdminRewards,
  type RewardTier,
  type RewardChallengeDef,
  type SpinPrizeDef,
  type RewardsConfig,
} from "@/hooks/useRewards";
import { EMPTY_REWARDS_CONFIG } from "@/lib/rewards-normalize";
import { cn } from "@/lib/utils";

const INPUT =
  "w-full rounded-xl px-3 py-2 bg-black/30 border border-white/10 text-white text-xs outline-none focus:border-cyan-500/50";

function emptyTier(): RewardTier {
  return {
    id: `tier-${Date.now()}`,
    key: "standard",
    minPoints: 0,
    color: "#94A3B8",
    icon: "🥉",
    perks: ["marketAccess"],
    sortOrder: 0,
    active: true,
  };
}

function emptyChallenge(): RewardChallengeDef {
  return {
    id: `challenge-${Date.now()}`,
    key: "custom",
    titleKu: "",
    titleAr: "",
    titleEn: "",
    points: 100,
    target: 5,
    icon: "target",
    color: "#3B82F6",
    sortOrder: 0,
    active: true,
  };
}

function emptySpinPrize(): SpinPrizeDef {
  return {
    id: `prize-${Date.now()}`,
    labelKu: "",
    labelAr: "",
    labelEn: "",
    points: 50,
    weight: 10,
    sortOrder: 0,
    active: true,
  };
}

function spinWeightPercent(prizes: SpinPrizeDef[], prizeId: string): number {
  const active = prizes.filter((p) => p.active && p.weight > 0);
  const total = active.reduce((s, p) => s + p.weight, 0);
  if (total <= 0) return 0;
  const p = active.find((x) => x.id === prizeId);
  return p ? Math.round((p.weight / total) * 100) : 0;
}

function TierModal({
  open,
  onClose,
  initial,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  initial?: RewardTier;
  onSave: (row: RewardTier) => void;
}) {
  const { t } = useTranslation("admin");
  const [row, setRow] = useState<RewardTier>(initial ?? emptyTier());

  useEffect(() => {
    if (open) setRow(initial ?? emptyTier());
  }, [open, initial]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="bg-[#0d1526] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold">
            {initial ? t("rewards.editTier") : t("rewards.newTier")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-xs">
          <select
            value={row.key}
            onChange={(e) => setRow({ ...row, key: e.target.value as RewardTier["key"] })}
            className={INPUT}
          >
            {(["standard", "silver", "gold", "diamond"] as const).map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <input
            type="number"
            value={row.minPoints}
            onChange={(e) => setRow({ ...row, minPoints: Number(e.target.value) })}
            placeholder={t("rewards.minPoints")}
            className={INPUT}
          />
          <input
            value={row.icon}
            onChange={(e) => setRow({ ...row, icon: e.target.value })}
            placeholder={t("rewards.iconEmoji")}
            className={INPUT}
          />
          <div className="flex items-center gap-2">
            <label className="text-slate-400">{t("rewards.color")}</label>
            <input
              type="color"
              value={row.color}
              onChange={(e) => setRow({ ...row, color: e.target.value })}
              className="w-10 h-8 rounded cursor-pointer"
            />
          </div>
          <input
            value={row.perks.join(", ")}
            onChange={(e) =>
              setRow({ ...row, perks: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })
            }
            placeholder={t("rewards.perkKeys")}
            className={INPUT}
          />
          <label className="flex items-center gap-2 text-slate-300">
            <input
              type="checkbox"
              checked={row.active}
              onChange={(e) => setRow({ ...row, active: e.target.checked })}
            />
            {t("rewards.active")}
          </label>
        </div>
        <DialogFooter className="mt-4 gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 border border-white/20">
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={() => { onSave(row); onClose(); }}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 text-white"
          >
            {t("common.save")}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChallengeModal({
  open,
  onClose,
  initial,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  initial?: RewardChallengeDef;
  onSave: (row: RewardChallengeDef) => void;
}) {
  const { t } = useTranslation("admin");
  const [row, setRow] = useState<RewardChallengeDef>(initial ?? emptyChallenge());

  useEffect(() => {
    if (open) setRow(initial ?? emptyChallenge());
  }, [open, initial]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="bg-[#0d1526] border-white/10 text-white max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold">
            {initial ? t("rewards.editChallenge") : t("rewards.newChallenge")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-xs">
          <input value={row.key} onChange={(e) => setRow({ ...row, key: e.target.value })}
            placeholder={t("rewards.challengeKey")} className={INPUT} />
          <input value={row.titleKu} onChange={(e) => setRow({ ...row, titleKu: e.target.value })}
            placeholder={t("rewards.titleKu")} dir="rtl" className={INPUT} />
          <input value={row.titleAr} onChange={(e) => setRow({ ...row, titleAr: e.target.value })}
            placeholder={t("rewards.titleAr")} dir="rtl" className={INPUT} />
          <input value={row.titleEn} onChange={(e) => setRow({ ...row, titleEn: e.target.value })}
            placeholder={t("rewards.titleEn")} className={INPUT} />
          <div className="grid grid-cols-2 gap-2">
            <input type="number" value={row.points} onChange={(e) => setRow({ ...row, points: Number(e.target.value) })}
              placeholder={t("rewards.points")} className={INPUT} />
            <input type="number" value={row.target} onChange={(e) => setRow({ ...row, target: Number(e.target.value) })}
              placeholder={t("rewards.target")} className={INPUT} />
          </div>
          <input value={row.icon} onChange={(e) => setRow({ ...row, icon: e.target.value })}
            placeholder={t("rewards.iconName")} className={INPUT} />
          <div className="flex items-center gap-2">
            <label className="text-slate-400">{t("rewards.color")}</label>
            <input type="color" value={row.color} onChange={(e) => setRow({ ...row, color: e.target.value })}
              className="w-10 h-8 rounded cursor-pointer" />
          </div>
          <label className="flex items-center gap-2 text-slate-300">
            <input type="checkbox" checked={row.active} onChange={(e) => setRow({ ...row, active: e.target.checked })} />
            {t("rewards.active")}
          </label>
        </div>
        <DialogFooter className="mt-4 gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 border border-white/20">
            {t("common.cancel")}
          </button>
          <button type="button" onClick={() => { onSave(row); onClose(); }}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 text-white">
            {t("common.save")}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SpinPrizeModal({
  open,
  onClose,
  initial,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  initial?: SpinPrizeDef;
  onSave: (row: SpinPrizeDef) => void;
}) {
  const { t } = useTranslation("admin");
  const [row, setRow] = useState<SpinPrizeDef>(initial ?? emptySpinPrize());

  useEffect(() => {
    if (open) setRow(initial ?? emptySpinPrize());
  }, [open, initial]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="bg-[#0d1526] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold">
            {initial ? t("rewards.editSpinPrize") : t("rewards.newSpinPrize")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-xs">
          <input value={row.id} onChange={(e) => setRow({ ...row, id: e.target.value })}
            placeholder={t("rewards.prizeId")} className={INPUT} dir="ltr" />
          <input value={row.labelKu} onChange={(e) => setRow({ ...row, labelKu: e.target.value })}
            placeholder={t("rewards.titleKu")} dir="rtl" className={INPUT} />
          <input value={row.labelAr} onChange={(e) => setRow({ ...row, labelAr: e.target.value })}
            placeholder={t("rewards.titleAr")} dir="rtl" className={INPUT} />
          <input value={row.labelEn} onChange={(e) => setRow({ ...row, labelEn: e.target.value })}
            placeholder={t("rewards.titleEn")} className={INPUT} />
          <div className="grid grid-cols-2 gap-2">
            <input type="number" min={0} value={row.points} onChange={(e) => setRow({ ...row, points: Number(e.target.value) })}
              placeholder={t("rewards.points")} className={INPUT} />
            <input type="number" min={0} value={row.weight} onChange={(e) => setRow({ ...row, weight: Number(e.target.value) })}
              placeholder={t("rewards.weight")} className={INPUT} />
          </div>
          <label className="flex items-center gap-2 text-slate-300">
            <input type="checkbox" checked={row.active} onChange={(e) => setRow({ ...row, active: e.target.checked })} />
            {t("rewards.active")}
          </label>
        </div>
        <DialogFooter className="mt-4 gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 border border-white/20">
            {t("common.cancel")}
          </button>
          <button type="button" onClick={() => { onSave(row); onClose(); }}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 text-white">
            {t("common.save")}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AdminRewardsTab() {
  const { t } = useTranslation("admin");
  const { toast } = useToast();
  const { data, isLoading, isFetching, isError, refetch } = useAdminRewards();
  const saveMutation = useSaveAdminRewards();
  const [local, setLocal] = useState<RewardsConfig | null>(null);
  const [tierModal, setTierModal] = useState<{ open: boolean; row?: RewardTier }>({ open: false });
  const [challengeModal, setChallengeModal] = useState<{ open: boolean; row?: RewardChallengeDef }>({ open: false });
  const [spinModal, setSpinModal] = useState<{ open: boolean; row?: SpinPrizeDef }>({ open: false });

  const config = local ?? data ?? EMPTY_REWARDS_CONFIG;

  const persist = (next: RewardsConfig) => {
    setLocal(next);
    saveMutation.mutate(next, {
      onSuccess: () => {
        toast({ title: t("rewards.saved"), description: t("rewards.savedHint") });
        setLocal(null);
      },
      onError: (err) => {
        toast({
          title: t("rewards.saveFailed"),
          description: err instanceof Error ? err.message : undefined,
          variant: "destructive",
        });
      },
    });
  };

  const upsertTier = (row: RewardTier) => {
    const exists = config.tiers.some((t) => t.id === row.id);
    persist({
      ...config,
      tiers: exists
        ? config.tiers.map((t) => (t.id === row.id ? row : t))
        : [...config.tiers, row],
    });
  };

  const upsertChallenge = (row: RewardChallengeDef) => {
    const exists = config.challenges.some((c) => c.id === row.id);
    persist({
      ...config,
      challenges: exists
        ? config.challenges.map((c) => (c.id === row.id ? row : c))
        : [...config.challenges, row],
    });
  };

  const upsertSpinPrize = (row: SpinPrizeDef) => {
    const exists = config.spinPrizes.some((p) => p.id === row.id);
    persist({
      ...config,
      spinPrizes: exists
        ? config.spinPrizes.map((p) => (p.id === row.id ? row : p))
        : [...config.spinPrizes, row],
    });
  };

  const spinTotalWeight = useMemo(
    () => config.spinPrizes.filter((p) => p.active).reduce((s, p) => s + p.weight, 0),
    [config.spinPrizes],
  );

  if (isLoading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        <p className="text-sm">{t("common.loading")}</p>
      </div>
    );
  }

  if (isError && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center max-w-md mx-auto">
        <AlertTriangle className="w-10 h-10 text-amber-400" />
        <p className="text-sm text-slate-300">{t("rewards.loadFailed")}</p>
        <button type="button" onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-white/10 border border-white/20 text-cyan-300">
          <RefreshCw className="w-3.5 h-3.5" /> {t("rewards.retry")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className={adminSectionTitle}>{t("rewards.title")}</h2>
          <p className={adminSubheader}>{t("rewards.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          {(isFetching || saveMutation.isPending) && (
            <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
          )}
          <button
            type="button"
            onClick={() => persist(config)}
            disabled={saveMutation.isPending}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-cyan-500 text-white disabled:opacity-50"
          >
            {saveMutation.isPending ? t("common.loading") : t("rewards.publish")}
          </button>
        </div>
      </div>

      {/* Tiers */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" /> {t("rewards.tiersSection")}
          </h3>
          <button type="button" onClick={() => setTierModal({ open: true })}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-white/5 border border-white/10 text-cyan-400">
            <Plus className="w-3 h-3" /> {t("rewards.newTier")}
          </button>
        </div>
        {config.tiers.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">{t("rewards.emptyTiers")}</p>
        ) : (
          <div className="space-y-2">
            {config.tiers.map((tier) => (
              <div key={tier.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xl">{tier.icon}</span>
                  <div>
                    <p className="text-sm font-bold text-white capitalize">{tier.key} · {tier.minPoints.toLocaleString()} {t("rewards.points")}</p>
                    <p className="text-[10px] text-slate-500">{tier.perks.join(", ")}</p>
                  </div>
                  {!tier.active && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">{t("rewards.inactive")}</span>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button type="button" onClick={() => setTierModal({ open: true, row: tier })}
                    className="p-2 rounded-lg border border-white/10 text-slate-400 hover:text-cyan-400"><Pencil className="w-3.5 h-3.5" /></button>
                  <button type="button" onClick={() => persist({ ...config, tiers: config.tiers.filter((t) => t.id !== tier.id) })}
                    className="p-2 rounded-lg border border-white/10 text-slate-400 hover:text-rose-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Challenges */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-400" /> {t("rewards.challengesSection")}
          </h3>
          <button type="button" onClick={() => setChallengeModal({ open: true })}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-white/5 border border-white/10 text-cyan-400">
            <Plus className="w-3 h-3" /> {t("rewards.newChallenge")}
          </button>
        </div>
        {config.challenges.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">{t("rewards.emptyChallenges")}</p>
        ) : (
          <div className="space-y-2">
            {config.challenges.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">{c.titleKu || c.key}</p>
                  <p className="text-[10px] text-slate-500">+{c.points} · {t("rewards.target")} {c.target}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button type="button" onClick={() => setChallengeModal({ open: true, row: c })}
                    className="p-2 rounded-lg border border-white/10 text-slate-400 hover:text-cyan-400"><Pencil className="w-3.5 h-3.5" /></button>
                  <button type="button" onClick={() => persist({ ...config, challenges: config.challenges.filter((x) => x.id !== c.id) })}
                    className="p-2 rounded-lg border border-white/10 text-slate-400 hover:text-rose-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Spin wheel */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Disc3 className="w-4 h-4 text-violet-400" /> {t("rewards.spinSection")}
          </h3>
          <button type="button" onClick={() => setSpinModal({ open: true })}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-white/5 border border-white/10 text-cyan-400">
            <Plus className="w-3 h-3" /> {t("rewards.newSpinPrize")}
          </button>
        </div>
        <p className="text-[10px] text-slate-500 mb-4">{t("rewards.spinHint")} · {t("rewards.totalWeight")}: {spinTotalWeight}</p>
        {config.spinPrizes.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">{t("rewards.emptySpin")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-white/10">
                  <th className="text-start py-2 pe-3">{t("rewards.prizeId")}</th>
                  <th className="text-start py-2 pe-3">{t("rewards.titleKu")}</th>
                  <th className="text-end py-2 pe-3">{t("rewards.points")}</th>
                  <th className="text-end py-2 pe-3">{t("rewards.weight")}</th>
                  <th className="text-end py-2 pe-3">%</th>
                  <th className="text-end py-2" />
                </tr>
              </thead>
              <tbody>
                {[...config.spinPrizes].sort((a, b) => a.sortOrder - b.sortOrder).map((p) => (
                  <tr key={p.id} className={cn("border-b border-white/5", !p.active && "opacity-50")}>
                    <td className="py-2.5 pe-3 font-mono text-slate-300">{p.id}</td>
                    <td className="py-2.5 pe-3 text-white">{p.labelKu || p.labelEn}</td>
                    <td className="py-2.5 pe-3 text-end tabular-nums">{p.points}</td>
                    <td className="py-2.5 pe-3 text-end tabular-nums">{p.weight}</td>
                    <td className="py-2.5 pe-3 text-end tabular-nums text-cyan-400">{spinWeightPercent(config.spinPrizes, p.id)}%</td>
                    <td className="py-2.5 text-end">
                      <div className="flex gap-1 justify-end">
                        <button type="button" onClick={() => setSpinModal({ open: true, row: p })}
                          className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-cyan-400"><Pencil className="w-3 h-3" /></button>
                        <button type="button" onClick={() => persist({ ...config, spinPrizes: config.spinPrizes.filter((x) => x.id !== p.id) })}
                          className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-rose-400"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <TierModal open={tierModal.open} initial={tierModal.row} onClose={() => setTierModal({ open: false })}
        onSave={upsertTier} />
      <ChallengeModal open={challengeModal.open} initial={challengeModal.row} onClose={() => setChallengeModal({ open: false })}
        onSave={upsertChallenge} />
      <SpinPrizeModal open={spinModal.open} initial={spinModal.row} onClose={() => setSpinModal({ open: false })}
        onSave={upsertSpinPrize} />
    </div>
  );
}
