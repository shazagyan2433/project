import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Flame, BarChart2, Search } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from "recharts";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/PageHeader";
import { useGetProducts, useGetSales } from "@workspace/api-client-react";
import { useSalesPrediction } from "@/hooks/useB2bData";
import { useLocaleDir } from "@/lib/use-locale-dir";

const Tip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; stroke?: string; value: number }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2 text-xs" style={{ background: "rgba(8,13,30,0.95)", border: "1px solid rgba(255,255,255,0.1)" }}>
      <p className="font-bold text-white mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.stroke }}>{p.name}: {p.value?.toLocaleString()} IQD</p>
      ))}
    </div>
  );
};

export default function MarketIntel() {
  const { t, i18n } = useTranslation("common");
  const { dir } = useLocaleDir("common");
  const locale = i18n.language === "ar" ? "ar-IQ" : i18n.language === "en" ? "en-US" : "ku-IQ";
  const [tab, setTab] = useState<"price" | "region">("price");
  const { data: products = [] } = useGetProducts();
  const { data: sales = [] } = useGetSales();
  const { data: prediction } = useSalesPrediction();

  const demandScores = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const sale of sales) {
      for (const item of sale.items ?? []) {
        const name = item.productName ?? "";
        if (!name) continue;
        counts[name] = (counts[name] ?? 0) + item.quantity;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, score]) => ({
        name,
        score: Math.min(100, score * 10),
        delta: prediction?.trend === "up" ? "+↑" : prediction?.trend === "down" ? "↓" : "—",
        up: prediction?.trend !== "down",
      }));
  }, [sales, prediction]);

  const priceTrend = useMemo(() => {
    const map: Record<string, number> = {};
    for (const sale of sales.slice(0, 30)) {
      const key = new Date(sale.createdAt as string).toLocaleDateString(locale, { month: "short", day: "numeric" });
      map[key] = (map[key] ?? 0) + parseFloat(String(sale.totalAmount ?? 0));
    }
    return Object.entries(map).map(([d, total]) => ({ d, total: Math.round(total) }));
  }, [sales, locale]);

  const hasData = products.length > 0 || sales.length > 0;

  if (!hasData) {
    return (
      <div dir={dir} className="space-y-6 pb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "rgba(249,115,22,0.15)", border: "1px solid rgba(249,115,22,0.3)" }}>
            <BarChart2 className="w-5 h-5" style={{ color: "#F97316" }} />
          </div>
          <div>
            <PageHeader
              id="marketIntel"
              titleClassName="text-2xl font-extrabold text-slate-900 dark:text-white"
              subtitleClassName="text-xs text-slate-600 dark:text-white/40"
            />
          </div>
        </div>
        <div className="py-20 text-center">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-20 text-white" />
          <p className="text-sm font-semibold text-white/50">{t("emptyStates.noMarketIntel")}</p>
          <p className="text-xs text-white/25 mt-1">{t("emptyStates.noMarketIntelSubtitle")}</p>
        </div>
      </div>
    );
  }

  return (
    <div dir={dir} className="space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "rgba(249,115,22,0.15)", border: "1px solid rgba(249,115,22,0.3)" }}>
          <BarChart2 className="w-5 h-5" style={{ color: "#F97316" }} />
        </div>
        <div>
          <PageHeader
            id="marketIntel"
            titleClassName="text-2xl font-extrabold text-slate-900 dark:text-white"
            subtitleClassName="text-xs text-slate-600 dark:text-white/40"
          />
        </div>
      </div>

      {demandScores.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {demandScores.map((d, i) => (
            <motion.div
              key={d.name}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="rounded-2xl p-4 relative overflow-hidden"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-white/80 truncate">{d.name}</p>
                <span className="text-[10px] font-bold" style={{ color: d.up ? "#34D399" : "#F87171" }}>{d.delta}</span>
              </div>
              <p className="text-2xl font-extrabold text-white">{d.score}</p>
              <p className="text-[10px] text-white/30 mt-0.5">{t("marketIntel.demandScore")}</p>
              <div className="mt-2 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                <div className="h-full rounded-full" style={{ width: `${d.score}%`, background: "#F97316" }} />
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex gap-2 mb-4">
          {(["price", "region"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
              style={{
                background: tab === k ? "rgba(249,115,22,0.15)" : "rgba(255,255,255,0.04)",
                color: tab === k ? "#FB923C" : "rgba(255,255,255,0.4)",
                border: tab === k ? "1px solid rgba(249,115,22,0.3)" : "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {k === "price" ? t("marketIntel.tabs.price") : t("marketIntel.tabs.region")}
            </button>
          ))}
        </div>

        {tab === "price" && priceTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={priceTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="d" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<Tip />} />
              <Line type="monotone" dataKey="total" name={t("marketIntel.chart.sales")} stroke="#F97316" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : tab === "region" ? (
          <div className="py-12 text-center text-white/30 text-sm">{t("emptyStates.noMarketIntelSubtitle")}</div>
        ) : (
          <div className="py-12 text-center text-white/30 text-sm">{t("emptyStates.noMarketIntel")}</div>
        )}
      </div>

      {prediction?.hasEnoughData && (
        <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)" }}>
          {prediction.trend === "up" ? <TrendingUp className="w-5 h-5 text-orange-400" /> : <TrendingDown className="w-5 h-5 text-red-400" />}
          <div>
            <p className="text-xs font-bold text-white">{t("marketIntel.prediction.title")}</p>
            <p className="text-sm text-white/60">{prediction.prediction.toLocaleString(locale)}{t("financial.currencySuffix")}</p>
          </div>
          <Flame className="w-4 h-4 text-orange-400 ms-auto" />
        </div>
      )}
    </div>
  );
}
