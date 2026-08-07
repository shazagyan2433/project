import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Sparkles, Target, AlertCircle, TrendingUp, Heart, Package, DollarSign, Users } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { authedFetch } from "@/lib/authedFetch";
import { useTranslation } from "react-i18next";

interface OverdueDebtor {
  id: number;
  name: string;
  phone: string;
  totalDebt: number;
  daysOverdue: number;
}

interface AIInsightsData {
  hasData: boolean;
  canViewProfit: boolean;
  healthScore: number | null;
  weeklyChangePercent: number;
  predictedWeekSales: number;
  predictedMonthlyProfit: number | null;
  restockProductName: string | null;
  restockProductStock: number;
  todaySales: number;
  dailyTarget: number;
  overdueDebtors: OverdueDebtor[];
}

async function fetchAIInsights(): Promise<AIInsightsData> {
  const res = await authedFetch("/api/ai-insights");
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

function HealthRing({ score }: { score: number }) {
  const radius = 38;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;
  const color = score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative w-24 h-24 shrink-0">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle
          cx="48" cy="48" r={radius} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-extrabold text-slate-800">{score}%</span>
      </div>
    </div>
  );
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
      <div className={`h-3 rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function AIInsightsCard() {
  const { t } = useTranslation();
  const { data, isLoading, error } = useQuery<AIInsightsData>({
    queryKey: ["ai-insights"],
    queryFn: fetchAIInsights,
    refetchInterval: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[0, 1].map((i) => (
          <div key={i} className="bg-white rounded-3xl p-6 shadow-xl border border-white/60 animate-pulse">
            <div className="h-5 w-40 bg-slate-100 rounded-xl mb-4" />
            <div className="h-10 w-56 bg-slate-100 rounded-xl mb-3" />
            <div className="h-4 w-full bg-slate-100 rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  if (error || !data) return null;

  if (data.canViewProfit) {
    const healthScore = data.healthScore ?? 0;
    const healthColor =
      healthScore >= 75 ? "text-emerald-600" : healthScore >= 50 ? "text-amber-600" : "text-red-600";
    const healthBg =
      healthScore >= 75 ? "from-emerald-50 to-teal-50 border-emerald-100" : healthScore >= 50 ? "from-amber-50 to-yellow-50 border-amber-100" : "from-red-50 to-rose-50 border-red-100";

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Business Health Score */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className={`bg-gradient-to-br ${healthBg} border rounded-3xl p-6 shadow-lg flex flex-col gap-4`}
        >
          <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
            <span className="text-lg">✨</span>
            <Heart className="w-4 h-4" />
            {t("ai.businessHealth")}
          </div>
          <div className="flex items-center gap-4">
            <HealthRing score={healthScore} />
            <div>
              <p className={`text-2xl font-extrabold ${healthColor}`}>
                {healthScore >= 75 ? t("ai.good") : healthScore >= 50 ? t("ai.average") : t("ai.needsImprovement")}
              </p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {healthScore >= 75 ? t("ai.healthGood") : healthScore >= 50 ? t("ai.healthAverage") : t("ai.healthLow")}
              </p>
            </div>
          </div>
        </motion.div>

        {/* AI Weekly Prediction */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100 rounded-3xl p-6 shadow-lg flex flex-col gap-3"
        >
          <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
            <span className="text-lg">✨</span>
            <TrendingUp className="w-4 h-4 text-violet-600" />
            {t("ai.aiPrediction")}
          </div>
          {data.hasData ? (
            <>
              <div>
                <p className="text-xs text-slate-500 mb-1">{t("ai.nextWeekSales")}</p>
                <p className="text-3xl font-extrabold text-violet-700">{formatCurrency(data.predictedWeekSales)}</p>
              </div>
              <div className={`inline-flex items-center gap-1.5 self-start px-3 py-1.5 rounded-full text-xs font-bold ${data.weeklyChangePercent >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                {data.weeklyChangePercent >= 0 ? "↑" : "↓"}
                {Math.abs(data.weeklyChangePercent)}% {t("ai.fromLastWeek")}
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                {data.weeklyChangePercent >= 0 ? t("ai.upTrend") : t("ai.downTrend")}
              </p>
              {data.restockProductName && (
                <div className="flex items-start gap-2 mt-1 p-3 bg-amber-50 border border-amber-100 rounded-2xl">
                  <Package className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">
                    {t("ai.restock", { name: data.restockProductName, count: data.restockProductStock })}
                  </p>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-500">{t("ai.noData")}</p>
          )}
        </motion.div>

        {/* Predicted Monthly Profit */}
        {data.predictedMonthlyProfit !== null ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-3xl p-6 shadow-lg flex flex-col gap-3"
          >
            <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
              <span className="text-lg">✨</span>
              <DollarSign className="w-4 h-4 text-blue-500" />
              {t("ai.predictedProfit")}
            </div>
            {data.hasData ? (
              <>
                <div>
                  <p className="text-xs text-slate-500 mb-1">{t("ai.thisMonthProfit")}</p>
                  <p className={`text-3xl font-extrabold ${data.predictedMonthlyProfit >= 0 ? "text-blue-600" : "text-rose-600"}`}>
                    {formatCurrency(data.predictedMonthlyProfit)}
                  </p>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{t("ai.monthlyProfitNote")}</p>
                <div className="mt-auto p-3 bg-white/60 rounded-2xl border border-blue-100">
                  <p className="text-xs text-slate-500 mb-1">{t("ai.avgMonthlyProfit")}</p>
                  <p className="font-bold text-blue-700">{formatCurrency(data.predictedMonthlyProfit)}</p>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500">{t("ai.noData")}</p>
            )}
          </motion.div>
        ) : null}
      </div>
    );
  }

  // ---- STAFF VIEW (no profit permission) ----
  const goalPct = data.dailyTarget > 0 ? Math.min(100, (data.todaySales / data.dailyTarget) * 100) : 0;
  const awayPct = Math.round(100 - goalPct);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Performance Goal */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 rounded-3xl p-6 shadow-lg flex flex-col gap-4"
      >
        <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
          <span className="text-lg">✨</span>
          <Target className="w-4 h-4 text-indigo-600" />
          {t("ai.dailyGoal")}
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-1">{t("ai.todaySales")}</p>
          <p className="text-3xl font-extrabold text-indigo-700">{formatCurrency(data.todaySales)}</p>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-slate-500">
            <span>{t("ai.goalProgress")}</span>
            <span className="font-bold">{Math.round(goalPct)}%</span>
          </div>
          <ProgressBar
            value={data.todaySales}
            max={data.dailyTarget}
            color={goalPct >= 100 ? "bg-emerald-500" : goalPct >= 60 ? "bg-indigo-500" : "bg-amber-500"}
          />
          <p className="text-xs text-slate-500">
            {t("ai.dailyTarget")}{" "}
            <span className="font-bold text-slate-700">{formatCurrency(data.dailyTarget)}</span>
          </p>
        </div>
        {goalPct >= 100 ? (
          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl">
            <p className="text-xs font-bold text-emerald-700">{t("ai.goalReached")}</p>
          </div>
        ) : (
          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl">
            <p className="text-xs text-indigo-700 leading-relaxed">
              {t("ai.goalAway", {
                pct: awayPct,
                amount: formatCurrency(Math.max(0, data.dailyTarget - data.todaySales)),
              })}
            </p>
          </div>
        )}
      </motion.div>

      {/* Overdue Customer Alerts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-100 rounded-3xl p-6 shadow-lg flex flex-col gap-3"
      >
        <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
          <span className="text-lg">✨</span>
          <AlertCircle className="w-4 h-4 text-rose-500" />
          {t("ai.customerAlerts")}
          {data.overdueDebtors.length > 0 && (
            <span className="ms-auto bg-rose-500 text-white text-xs font-black w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
              {data.overdueDebtors.length}
            </span>
          )}
        </div>

        {data.overdueDebtors.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-6 text-slate-400">
            <Users className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">{t("ai.noOverdueDebts")}</p>
          </div>
        ) : (
          <div className="space-y-2 overflow-y-auto max-h-52 pe-1">
            {data.overdueDebtors.map((d) => (
              <div key={d.id} className="flex items-center justify-between p-3 bg-white rounded-2xl border border-rose-100 shadow-sm gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-bold text-sm shrink-0">
                    {d.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 text-sm truncate">{d.name}</p>
                    <p className="text-xs text-rose-500 font-medium">{t("ai.daysOverdue", { count: d.daysOverdue })}</p>
                  </div>
                </div>
                <p className="font-black text-rose-600 text-sm shrink-0">{formatCurrency(d.totalDebt)}</p>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-slate-400 mt-auto">{t("ai.overdueNote")}</p>
      </motion.div>
    </div>
  );
}
