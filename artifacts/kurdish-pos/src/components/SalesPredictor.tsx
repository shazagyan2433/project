import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Sparkles, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { authedFetch } from "@/lib/authedFetch";
import { useTranslation } from "react-i18next";

interface PredictionData {
  prediction: number;
  trend: "up" | "down" | "stable";
  slope: number;
  days: { date: string; total: number }[];
  hasEnoughData: boolean;
}

async function fetchSalesPrediction(): Promise<PredictionData> {
  const res = await authedFetch("/api/sales-prediction");
  if (!res.ok) throw new Error("Failed to fetch prediction");
  return res.json();
}

export default function SalesPredictor() {
  const { t } = useTranslation();
  const { data, isLoading, error } = useQuery<PredictionData>({
    queryKey: ["sales-prediction"],
    queryFn: fetchSalesPrediction,
    refetchInterval: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-3xl p-6 shadow-xl animate-pulse">
        <div className="h-6 w-48 bg-white/20 rounded-xl mb-4" />
        <div className="h-10 w-64 bg-white/20 rounded-xl mb-3" />
        <div className="h-4 w-80 bg-white/20 rounded-xl" />
      </div>
    );
  }

  if (error || !data) return null;

  const { prediction, trend, days, hasEnoughData } = data;

  const trendConfig = {
    up: {
      icon: TrendingUp,
      label: t("ai.trendUp"),
      barColor: "bg-emerald-400",
      badge: "bg-emerald-400/20 text-emerald-200",
    },
    down: {
      icon: TrendingDown,
      label: t("ai.trendDown"),
      barColor: "bg-rose-400",
      badge: "bg-rose-400/20 text-rose-200",
    },
    stable: {
      icon: Minus,
      label: t("ai.trendStable"),
      barColor: "bg-sky-400",
      badge: "bg-sky-400/20 text-sky-200",
    },
  };

  const cfg = trendConfig[trend];
  const TrendIcon = cfg.icon;

  const maxTotal = Math.max(...days.map((d) => d.total), 1);

  const getMessage = () => {
    if (!hasEnoughData) return t("ai.noDataPrediction");
    if (prediction === 0) return t("ai.zeroSales");
    return t("ai.tomorrowPrediction", { amount: formatCurrency(prediction) });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, duration: 0.45 }}
      className="bg-gradient-to-br from-indigo-500 via-violet-600 to-purple-700 rounded-3xl p-6 shadow-2xl shadow-violet-300/40 relative overflow-hidden"
    >
      <div className="absolute -top-10 -start-10 w-40 h-40 rounded-full bg-white/5" />
      <div className="absolute -bottom-8 -end-8 w-32 h-32 rounded-full bg-white/5" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">{t("ai.prediction")}</h2>
              <p className="text-white/60 text-xs">{t("ai.predictionSubtitle")}</p>
            </div>
          </div>

          <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${cfg.badge}`}>
            <TrendIcon className="w-3.5 h-3.5" />
            {cfg.label}
          </span>
        </div>

        <div className="mb-5">
          <p className="text-white/60 text-sm mb-1">{t("ai.tomorrow")}</p>
          <p className="text-white text-4xl font-extrabold tracking-tight">
            {hasEnoughData ? formatCurrency(prediction) : "---"}
          </p>
        </div>

        <p className="text-white/75 text-sm leading-relaxed mb-6">{getMessage()}</p>

        <div>
          <p className="text-white/50 text-xs mb-2">{t("ai.last7Days")}</p>
          <div className="flex items-end gap-1.5 h-14">
            {days.map((d, i) => {
              const height = maxTotal > 0 ? Math.max((d.total / maxTotal) * 100, 4) : 4;
              const isToday = i === days.length - 1;
              const dayLabel = new Date(d.date).toLocaleDateString(undefined, { weekday: "short" });
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-t-md transition-all duration-500 ${isToday ? "bg-white/80" : cfg.barColor + "/70"}`}
                    style={{ height: `${height}%` }}
                    title={`${dayLabel}: ${formatCurrency(d.total)}`}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex gap-1.5 mt-1">
            {days.map((d, i) => {
              const isToday = i === days.length - 1;
              const dayLabel = new Date(d.date).toLocaleDateString(undefined, { weekday: "short" });
              return (
                <div key={d.date} className={`flex-1 text-center text-[9px] font-medium ${isToday ? "text-white" : "text-white/40"}`}>
                  {isToday ? t("ai.today") : dayLabel}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
