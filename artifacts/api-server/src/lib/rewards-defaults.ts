export type RewardTierDef = {
  id: string;
  key: "standard" | "silver" | "gold" | "diamond";
  minPoints: number;
  color: string;
  icon: string;
  perks: string[];
  sortOrder: number;
  active: boolean;
};

export type RewardChallengeDef = {
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
};

export type SpinPrizeDef = {
  id: string;
  labelKu: string;
  labelAr: string;
  labelEn: string;
  points: number;
  /** Relative weight for random selection (higher = more likely). */
  weight: number;
  sortOrder: number;
  active: boolean;
};

export type RewardsConfig = {
  tiers: RewardTierDef[];
  challenges: RewardChallengeDef[];
  spinPrizes: SpinPrizeDef[];
};

const DEFAULT_TIERS: RewardTierDef[] = [
  {
    id: "tier-standard",
    key: "standard",
    minPoints: 0,
    color: "#94A3B8",
    icon: "🥉",
    perks: ["marketAccess", "tierAlerts"],
    sortOrder: 0,
    active: true,
  },
  {
    id: "tier-silver",
    key: "silver",
    minPoints: 1000,
    color: "#CBD5E1",
    icon: "🥈",
    perks: ["discount5", "rfqPriority"],
    sortOrder: 1,
    active: true,
  },
  {
    id: "tier-gold",
    key: "gold",
    minPoints: 5000,
    color: "#F59E0B",
    icon: "🥇",
    perks: ["discount12", "deliverySupport", "support247"],
    sortOrder: 2,
    active: true,
  },
  {
    id: "tier-diamond",
    key: "diamond",
    minPoints: 15000,
    color: "#06B6D4",
    icon: "💎",
    perks: ["discount20", "dedicatedManager", "earlyAccess"],
    sortOrder: 3,
    active: true,
  },
];

const DEFAULT_CHALLENGES: RewardChallengeDef[] = [
  {
    id: "challenge-orders",
    key: "orders",
    titleKu: "١٠ سفارشی ئەم هەفتەیە",
    titleAr: "١٠ طلبات هذا الأسبوع",
    titleEn: "10 orders this week",
    points: 500,
    target: 10,
    icon: "target",
    color: "#3B82F6",
    sortOrder: 0,
    active: true,
  },
  {
    id: "challenge-suppliers",
    key: "suppliers",
    titleKu: "زیادکردنی ٣ فرۆشیاری نوێ",
    titleAr: "إضافة ٣ موردين جدد",
    titleEn: "Onboard 3 new suppliers",
    points: 800,
    target: 3,
    icon: "users",
    color: "#10B981",
    sortOrder: 1,
    active: true,
  },
  {
    id: "challenge-delivery",
    key: "deliveryStars",
    titleKu: "کەسبکردنی ٥ ستار بۆ گەیاندن",
    titleAr: "اكسب ٥ نجوم للتوصيل",
    titleEn: "Earn 5 delivery stars",
    points: 300,
    target: 5,
    icon: "star",
    color: "#F59E0B",
    sortOrder: 2,
    active: true,
  },
  {
    id: "challenge-sales",
    key: "salesMilestone",
    titleKu: "ئامانجی فرۆشتنی ١M دینار",
    titleAr: "هدف مبيعات مليون دينار",
    titleEn: "1M IQD sales milestone",
    points: 1200,
    target: 1000,
    icon: "zap",
    color: "#A855F7",
    sortOrder: 3,
    active: true,
  },
];

export const DEFAULT_SPIN_PRIZES: SpinPrizeDef[] = [
  {
    id: "points50",
    labelKu: "+50 خاڵ",
    labelAr: "+50 نقطة",
    labelEn: "+50 pts",
    points: 50,
    weight: 28,
    sortOrder: 0,
    active: true,
  },
  {
    id: "discount5",
    labelKu: "داشکاندنی ٥٪",
    labelAr: "خصم ٥٪",
    labelEn: "5% off",
    points: 0,
    weight: 18,
    sortOrder: 1,
    active: true,
  },
  {
    id: "points100",
    labelKu: "+100 خاڵ",
    labelAr: "+100 نقطة",
    labelEn: "+100 pts",
    points: 100,
    weight: 22,
    sortOrder: 2,
    active: true,
  },
  {
    id: "points200",
    labelKu: "+200 خاڵ",
    labelAr: "+200 نقطة",
    labelEn: "+200 pts",
    points: 200,
    weight: 12,
    sortOrder: 3,
    active: true,
  },
  {
    id: "specialGift",
    labelKu: "دیاری تایبەت",
    labelAr: "هدية خاصة",
    labelEn: "Special gift",
    points: 0,
    weight: 10,
    sortOrder: 4,
    active: true,
  },
  {
    id: "spinAgain",
    labelKu: "دووبارە بسووڕێنە",
    labelAr: "أدر مرة أخرى",
    labelEn: "Spin again",
    points: 0,
    weight: 10,
    sortOrder: 5,
    active: true,
  },
];

export const DEFAULT_REWARDS_CONFIG: RewardsConfig = {
  tiers: DEFAULT_TIERS,
  challenges: DEFAULT_CHALLENGES,
  spinPrizes: DEFAULT_SPIN_PRIZES,
};

/** @deprecated Use DEFAULT_SPIN_PRIZES from config */
export const SPIN_PRIZES = DEFAULT_SPIN_PRIZES.map((p) => ({
  id: p.id,
  points: p.points,
}));

export function pickWeightedSpinPrize(
  prizes: SpinPrizeDef[],
): { prize: SpinPrizeDef; index: number } | null {
  const active = [...prizes]
    .filter((p) => p.active !== false && p.weight > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  if (active.length === 0) return null;
  const total = active.reduce((s, p) => s + p.weight, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < active.length; i++) {
    roll -= active[i].weight;
    if (roll <= 0) return { prize: active[i], index: i };
  }
  return { prize: active[active.length - 1], index: active.length - 1 };
}

/** Read stored master config only — defaults are seeded at boot, not merged at read time. */
export function mergeRewardsConfig(stored: Partial<RewardsConfig> | null | undefined): RewardsConfig {
  if (!stored) {
    return { tiers: [], challenges: [], spinPrizes: [] };
  }
  return {
    tiers: Array.isArray(stored.tiers) ? stored.tiers : [],
    challenges: Array.isArray(stored.challenges) ? stored.challenges : [],
    spinPrizes: Array.isArray(stored.spinPrizes) ? stored.spinPrizes : [],
  };
}
