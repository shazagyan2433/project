import { useMemo } from "react";
import { motion } from "framer-motion";
import { DollarSign, TrendingUp, TrendingDown, ArrowUpRight, CreditCard, FileText } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { useTranslation } from "react-i18next";
import { useSectorLabel } from "@/hooks/useSectorScope";
import { useGetDashboard, useGetSales } from "@workspace/api-client-react";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("ku-IQ", { maximumFractionDigits: 0 }).format(amount) + " د.ع";
}

const Tip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; stroke?: string; fill?: string; value: number }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2 text-xs" style={{ background: "rgba(8,13,30,0.95)", border: "1px solid rgba(255,255,255,0.1)" }}>
      <p className="font-bold text-white mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.stroke ?? p.fill }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export default function Financial() {
  const { t } = useTranslation("common");
  const sectorLabel = useSectorLabel();
  const { data: dashboard } = useGetDashboard();
  const { data: sales = [] } = useGetSales();

  const monthlyChart = useMemo(() => {
    const map: Record<string, number> = {};
    for (const sale of sales) {
      const key = new Date(sale.createdAt as string).toLocaleDateString("ku-IQ", { month: "short" });
      map[key] = (map[key] ?? 0) + parseFloat(String(sale.totalAmount ?? 0));
    }
    return Object.entries(map).map(([month, revenue]) => ({
      month,
      revenue: Math.round(revenue / 1_000_000),
      net: Math.round(revenue / 1_000_000 * 0.6),
    }));
  }, [sales]);

  const weeklyCashflow = useMemo(() => {
    const weeks: Record<string, { in: number; out: number }> = {};
    for (const sale of sales.slice(0, 28)) {
      const week = `ه${Math.ceil(new Date(sale.createdAt as string).getDate() / 7)}`;
      if (!weeks[week]) weeks[week] = { in: 0, out: 0 };
      weeks[week].in += parseFloat(String(sale.paidAmount ?? 0)) / 1_000_000;
      const debt = parseFloat(String(sale.totalAmount ?? 0)) - parseFloat(String(sale.paidAmount ?? 0));
      if (debt > 0) weeks[week].out += debt / 1_000_000;
    }
    return Object.entries(weeks).map(([week, v]) => ({ week, in: Math.round(v.in), out: Math.round(v.out) }));
  }, [sales]);

  const invoices = useMemo(
    () =>
      sales.slice(0, 8).map((sale) => {
        const total = parseFloat(String(sale.totalAmount ?? 0));
        const paid = parseFloat(String(sale.paidAmount ?? 0));
        const isPaid = paid >= total;
        const isPartial = paid > 0 && paid < total;
        return {
          id: `INV-${sale.id}`,
          party: sale.customerName ?? t("emptyStates.noCustomer"),
          amount: formatCurrency(total),
          status: isPaid ? "پارەدراو" : isPartial ? "چاوەڕوان" : "دواکەوتوو",
          color: isPaid ? "#34D399" : isPartial ? "#FBBF24" : "#F87171",
        };
      }),
    [sales, t],
  );

  const totalSales = dashboard?.totalSales ?? 0;
  const totalDebts = dashboard?.totalDebts ?? 0;
  const debtorCount = dashboard?.topDebtors?.length ?? 0;

  const KPIS = [
    { label: "کۆی داهات", value: formatCurrency(totalSales), sub: `${sales.length} مامەڵە`, color: "#06B6D4", Icon: TrendingUp },
    { label: "قەرزی کراوە", value: formatCurrency(totalDebts), sub: `${debtorCount} کڕیار`, color: "#FBBF24", Icon: CreditCard },
    { label: "قازانجی خالص", value: totalSales > 0 ? formatCurrency(totalSales - totalDebts) : "—", sub: "—", color: "#34D399", Icon: ArrowUpRight },
    { label: "مامەڵەکان", value: String(sales.length), sub: "کۆی گشتی", color: "#F87171", Icon: TrendingDown },
  ];

  const hasChartData = monthlyChart.length > 0;

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "rgba(6,182,212,0.15)", border: "1px solid rgba(6,182,212,0.3)" }}>
          <DollarSign className="w-5 h-5" style={{ color: "#06B6D4" }} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-white">{t("pageTitles.financial", { sector: sectorLabel })}</h1>
          <p className="text-xs text-white/40">{t("pageTitles.financialSubtitle", { sector: sectorLabel })}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPIS.map((k, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="rounded-2xl p-4"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${k.color}18` }}>
              <k.Icon className="w-4 h-4" style={{ color: k.color }} />
            </div>
            <p className="text-xl font-extrabold text-white">{k.value}</p>
            <p className="text-xs text-white/50 mt-0.5">{k.label}</p>
            <p className="text-[10px] mt-1 font-semibold" style={{ color: k.color }}>{k.sub}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            <p className="text-sm font-extrabold text-white">کارکردی دارایی</p>
          </div>
          {hasChartData ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={monthlyChart} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="revG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="netG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34D399" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#34D399" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<Tip />} />
                <Area type="monotone" dataKey="revenue" name="داهات" stroke="#06B6D4" fill="url(#revG)" strokeWidth={2} />
                <Area type="monotone" dataKey="net" name="خالص" stroke="#34D399" fill="url(#netG)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="py-12 text-center text-white/30 text-sm">{t("emptyStates.noFinancialData")}</div>
          )}
        </div>

        <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4 text-white/40" />
            <p className="text-sm font-extrabold text-white/80">ئینڤۆیسەکان</p>
          </div>
          {invoices.length === 0 ? (
            <div className="py-10 text-center text-white/30 text-sm">{t("emptyStates.noInvoices")}</div>
          ) : (
            <div className="space-y-2.5">
              {invoices.map((inv, i) => (
                <motion.div
                  key={inv.id}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-center gap-3 p-2.5 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{inv.party}</p>
                    <p className="text-[10px] text-white/30">{inv.id}</p>
                  </div>
                  <div className="text-end shrink-0">
                    <p className="text-xs font-extrabold text-white">{inv.amount}</p>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md" style={{ color: inv.color, background: `${inv.color}18` }}>
                      {inv.status}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <p className="text-sm font-extrabold text-white/80 mb-4">پارەهاتن / پارەدەرچوون (هەفتەیی)</p>
        {weeklyCashflow.length > 0 ? (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={weeklyCashflow} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="week" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<Tip />} />
              <Bar dataKey="in" name="هاتوو" fill="#34D399" radius={[4, 4, 0, 0]} fillOpacity={0.75} />
              <Bar dataKey="out" name="دەرچوو" fill="#F87171" radius={[4, 4, 0, 0]} fillOpacity={0.75} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="py-10 text-center text-white/30 text-sm">{t("emptyStates.noFinancialData")}</div>
        )}
      </div>
    </div>
  );
}
