import { useMemo } from "react";
import { motion } from "framer-motion";
import { DollarSign, TrendingUp, TrendingDown, ArrowUpRight, CreditCard, FileText } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/PageHeader";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useGetDashboard, useGetSales } from "@workspace/api-client-react";
import { useLocaleDir } from "@/lib/use-locale-dir";
import { C, chartTooltipStyle } from "./dashboard-tokens";
import { PAGE_TITLE, PAGE_SURFACE, PAGE_SURFACE_SM, PAGE_MUTED } from "@/lib/page-theme";

const Tip = ({
  active,
  payload,
  label,
  formatMoney,
}: {
  active?: boolean;
  payload?: Array<{ name: string; stroke?: string; fill?: string; value: number }>;
  label?: string;
  formatMoney: (amountIqd: number) => string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2 text-xs linqi-page-card" style={chartTooltipStyle(C.cyan)}>
      <p className="font-bold linqi-page-heading mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.stroke ?? p.fill }}>
          {p.name}: {formatMoney(p.value * 1_000_000)}
        </p>
      ))}
    </div>
  );
};

export default function Financial() {
  const { t, i18n } = useTranslation("common");
  const { dir } = useLocaleDir("common");
  const { formatMoney } = useCurrency();
  const { data: dashboard } = useGetDashboard();
  const { data: sales = [] } = useGetSales();

  const locale = i18n.language === "ar" ? "ar-IQ" : i18n.language === "en" ? "en-US" : "ku-IQ";

  const monthlyChart = useMemo(() => {
    const map: Record<string, number> = {};
    for (const sale of sales) {
      const key = new Date(sale.createdAt as string).toLocaleDateString(locale, { month: "short" });
      map[key] = (map[key] ?? 0) + parseFloat(String(sale.totalAmount ?? 0));
    }
    return Object.entries(map).map(([month, revenue]) => ({
      month,
      revenue: Math.round(revenue / 1_000_000),
      net: Math.round(revenue / 1_000_000 * 0.6),
    }));
  }, [sales, locale]);

  const weeklyCashflow = useMemo(() => {
    const weeks: Record<string, { in: number; out: number }> = {};
    for (const sale of sales.slice(0, 28)) {
      const weekNum = Math.ceil(new Date(sale.createdAt as string).getDate() / 7);
      const week = t("financial.week", { n: weekNum });
      if (!weeks[week]) weeks[week] = { in: 0, out: 0 };
      weeks[week].in += parseFloat(String(sale.paidAmount ?? 0)) / 1_000_000;
      const debt = parseFloat(String(sale.totalAmount ?? 0)) - parseFloat(String(sale.paidAmount ?? 0));
      if (debt > 0) weeks[week].out += debt / 1_000_000;
    }
    return Object.entries(weeks).map(([week, v]) => ({ week, in: Math.round(v.in), out: Math.round(v.out) }));
  }, [sales, t]);

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
          amount: formatMoney(total),
          status: isPaid ? t("financial.status.paid") : isPartial ? t("financial.status.pending") : t("financial.status.overdue"),
          color: isPaid ? "#34D399" : isPartial ? "#FBBF24" : "#F87171",
        };
      }),
    [sales, t, formatMoney],
  );

  const totalSales = dashboard?.totalSales ?? 0;
  const totalDebts = dashboard?.totalDebts ?? 0;
  const debtorCount = dashboard?.topDebtors?.length ?? 0;

  const KPIS = [
    { label: t("financial.kpi.totalRevenue"), value: formatMoney(totalSales), sub: t("financial.kpi.transactionCount", { count: sales.length }), color: "#06B6D4", Icon: TrendingUp },
    { label: t("financial.kpi.debt"), value: formatMoney(totalDebts), sub: t("financial.kpi.debtorCount", { count: debtorCount }), color: "#FBBF24", Icon: CreditCard },
    { label: t("financial.kpi.netProfit"), value: totalSales > 0 ? formatMoney(totalSales - totalDebts) : "—", sub: "—", color: "#34D399", Icon: ArrowUpRight },
    { label: t("financial.kpi.transactions"), value: String(sales.length), sub: t("financial.kpi.total"), color: "#F87171", Icon: TrendingDown },
  ];

  const hasChartData = monthlyChart.length > 0;

  return (
    <div dir={dir} className="space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "rgba(6,182,212,0.15)", border: "1px solid rgba(6,182,212,0.3)" }}>
          <DollarSign className="w-5 h-5" style={{ color: "#06B6D4" }} />
        </div>
        <div>
          <PageHeader id="financial" />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPIS.map((k, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className={`rounded-2xl p-4 ${PAGE_SURFACE_SM}`}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${k.color}18` }}>
              <k.Icon className="w-4 h-4" style={{ color: k.color }} />
            </div>
            <p className={`text-xl ${PAGE_TITLE}`}>{k.value}</p>
            <p className={`text-xs mt-0.5 ${PAGE_MUTED}`}>{k.label}</p>
            <p className="text-[10px] mt-1 font-semibold" style={{ color: k.color }}>{k.sub}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className={`lg:col-span-3 rounded-2xl p-5 ${PAGE_SURFACE}`}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <p className={`text-sm ${PAGE_TITLE}`}>{t("financial.chart.performance")}</p>
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
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="month" tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => formatMoney(v * 1_000_000, { compact: true })} />
                <Tooltip content={<Tip formatMoney={formatMoney} />} />
                <Area type="monotone" dataKey="revenue" name={t("financial.chart.revenue")} stroke="#06B6D4" fill="url(#revG)" strokeWidth={2} />
                <Area type="monotone" dataKey="net" name={t("financial.chart.net")} stroke="#34D399" fill="url(#netG)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className={`py-12 text-center text-sm ${PAGE_MUTED}`}>{t("emptyStates.noFinancialData")}</div>
          )}
        </div>

        <div className={`lg:col-span-2 rounded-2xl p-5 ${PAGE_SURFACE}`}>
          <div className="flex items-center gap-2 mb-4">
            <FileText className={`w-4 h-4 ${PAGE_MUTED}`} />
            <p className={`text-sm font-extrabold text-slate-800 dark:text-white/80`}>{t("financial.chart.invoices")}</p>
          </div>
          {invoices.length === 0 ? (
            <div className={`py-10 text-center text-sm ${PAGE_MUTED}`}>{t("emptyStates.noInvoices")}</div>
          ) : (
            <div className="space-y-2.5">
              {invoices.map((inv, i) => (
                <motion.div
                  key={inv.id}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className={`flex items-center gap-3 p-2.5 rounded-xl ${PAGE_SURFACE_SM}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold truncate ${PAGE_TITLE}`}>{inv.party}</p>
                    <p className={`text-[10px] ${PAGE_MUTED}`}>{inv.id}</p>
                  </div>
                  <div className="text-end shrink-0">
                    <p className={`text-xs font-extrabold ${PAGE_TITLE}`}>{inv.amount}</p>
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

      <div className={`rounded-2xl p-5 ${PAGE_SURFACE}`}>
        <p className={`text-sm font-extrabold mb-4 text-slate-800 dark:text-white/80`}>{t("financial.chart.cashflow")}</p>
        {weeklyCashflow.length > 0 ? (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={weeklyCashflow} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="week" tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => formatMoney(v * 1_000_000, { compact: true })} />
              <Tooltip content={<Tip formatMoney={formatMoney} />} />
              <Bar dataKey="in" name={t("financial.chart.in")} fill="#34D399" radius={[4, 4, 0, 0]} fillOpacity={0.75} />
              <Bar dataKey="out" name={t("financial.chart.out")} fill="#F87171" radius={[4, 4, 0, 0]} fillOpacity={0.75} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className={`py-10 text-center text-sm ${PAGE_MUTED}`}>{t("emptyStates.noFinancialData")}</div>
        )}
      </div>
    </div>
  );
}
