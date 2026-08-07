import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, TrendingUp, TrendingDown, DollarSign, ShoppingBag, ChevronDown, ChevronUp, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import AccessDenied from "@/components/AccessDenied";
import { useTranslation } from "react-i18next";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("ku-IQ", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + " د.ع";
}

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("ku-IQ", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type FilterTab = "today" | "this_month" | "custom";

type ReportSummary = {
  salesCount: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number;
};

type SaleItem = {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  total: number;
  itemProfit: number;
};

type ReportSale = {
  id: number;
  createdAt: string;
  customerName: string | null;
  paymentType: string;
  totalAmount: number;
  paidAmount: number;
  cost: number;
  profit: number;
  items: SaleItem[];
};

type ReportData = {
  sales: ReportSale[];
  summary: ReportSummary;
};

function getDateRange(tab: FilterTab, customFrom: string, customTo: string) {
  const now = new Date();
  if (tab === "today") {
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().split("T")[0];
    return { from, to: from };
  }
  if (tab === "this_month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
    return { from, to };
  }
  return { from: customFrom, to: customTo };
}

function SummaryCard({ label, value, icon: Icon, color, sub }: {
  label: string; value: string; icon: React.ElementType; color: string; sub?: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <div className={`p-2 rounded-xl ${color}`}><Icon className="w-4 h-4" /></div>
      </div>
      <p className="text-xl font-black text-slate-900 leading-tight">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function Reports() {
  const { t } = useTranslation();
  const { isAdmin, permissions } = useAuth();
  const [activeTab, setActiveTab] = useState<FilterTab>("today");
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [customTo, setCustomTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [expandedSaleId, setExpandedSaleId] = useState<number | null>(null);

  const { from, to } = getDateRange(activeTab, customFrom, customTo);

  const { data, isLoading } = useQuery<ReportData>({
    queryKey: ["reports", from, to],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`${API_BASE}/api/reports?${params}`);
      if (!res.ok) throw new Error("Failed to fetch reports");
      return res.json();
    },
  });

  const summary = data?.summary;
  const sales = data?.sales ?? [];

  const tabs: { key: FilterTab; labelKey: string }[] = [
    { key: "today", labelKey: "reports.today" },
    { key: "this_month", labelKey: "reports.thisMonth" },
    { key: "custom", labelKey: "reports.custom" },
  ];

  if (!isAdmin && !permissions.canAccessReports) {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900">{t("reports.title")}</h1>
          <p className="text-slate-500 mt-1">{t("reports.subtitle")}</p>
        </div>
        <div className="p-3 bg-violet-100 rounded-2xl">
          <BarChart3 className="w-6 h-6 text-violet-600" />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 space-y-4">
        <div className="flex gap-2 flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                activeTab === tab.key
                  ? "bg-primary text-white shadow-md shadow-primary/30"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>

        {activeTab === "custom" && (
          <div className="flex gap-4 items-center flex-wrap pt-1">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <label className="text-sm text-slate-600 font-medium">{t("reports.from")}:</label>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600 font-medium">{t("reports.to")}:</label>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label={t("reports.totalRevenue")}
          value={summary ? formatCurrency(summary.totalRevenue) : "—"}
          icon={ShoppingBag}
          color="bg-blue-100 text-blue-600"
          sub={summary ? `${summary.salesCount} ${t("sales.receipts")}` : undefined}
        />
        <SummaryCard
          label={t("reports.totalCost")}
          value={summary ? formatCurrency(summary.totalCost) : "—"}
          icon={TrendingDown}
          color="bg-rose-100 text-rose-600"
        />
        <SummaryCard
          label={t("reports.totalProfit")}
          value={summary ? formatCurrency(summary.totalProfit) : "—"}
          icon={TrendingUp}
          color={summary && summary.totalProfit >= 0 ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"}
          sub={summary ? `${summary.profitMargin}% margin` : undefined}
        />
        <SummaryCard
          label={t("reports.salesCount")}
          value={summary ? String(summary.salesCount) : "—"}
          icon={DollarSign}
          color="bg-violet-100 text-violet-600"
          sub={
            summary && summary.salesCount > 0
              ? `${t("reports.avgSale")}: ${formatCurrency(summary.totalRevenue / summary.salesCount)}`
              : undefined
          }
        />
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-800">{t("reports.salesDetail")}</h2>
          <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full font-medium">
            {sales.length} {t("sales.receipts")}
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 flex justify-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sales.length === 0 ? (
          <div className="p-12 text-center">
            <BarChart3 className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">{t("reports.noSales")}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            <div className="grid grid-cols-6 gap-4 px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wide">
              <span>{t("dashboard.receiptNo")}</span>
              <span>{t("reports.date")}</span>
              <span>{t("dashboard.customer")}</span>
              <span>{t("reports.revenue")}</span>
              <span>{t("reports.profit")}</span>
              <span>{t("dashboard.paymentType")}</span>
            </div>

            {sales.map((sale) => {
              const isExpanded = expandedSaleId === sale.id;
              const profitPositive = sale.profit >= 0;
              return (
                <div key={sale.id}>
                  <button
                    className="w-full grid grid-cols-6 gap-4 px-6 py-4 text-sm hover:bg-slate-50 transition-colors text-right"
                    onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)}
                  >
                    <span className="font-bold text-primary">#{sale.id}</span>
                    <span className="text-slate-600">{formatDate(sale.createdAt)}</span>
                    <span className="text-slate-700 font-medium">{sale.customerName ?? "—"}</span>
                    <span className="font-semibold text-slate-800">{formatCurrency(sale.totalAmount)}</span>
                    <span className={`font-bold ${profitPositive ? "text-emerald-600" : "text-rose-600"}`}>
                      {profitPositive ? "+" : ""}{formatCurrency(sale.profit)}
                    </span>
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        sale.paymentType === "cash" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      }`}>
                        {sale.paymentType === "cash" ? t("dashboard.cashPayment") : t("dashboard.debtPayment")}
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="bg-slate-50 border-t border-slate-100 px-6 py-4">
                      <p className="text-xs font-bold text-slate-400 uppercase mb-3">{t("reports.saleItems")}</p>
                      <div className="space-y-2">
                        {sale.items.map((item, idx) => (
                          <div key={idx} className="bg-white rounded-xl px-4 py-3 flex items-center justify-between shadow-sm border border-slate-100">
                            <div>
                              <p className="font-semibold text-slate-800 text-sm">{item.productName}</p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {item.quantity} × {formatCurrency(item.unitPrice)} | {t("reports.cost")}: {formatCurrency(item.costPrice)}
                              </p>
                            </div>
                            <div className="text-start">
                              <p className="font-bold text-slate-900 text-sm">{formatCurrency(item.total)}</p>
                              <p className={`text-xs font-bold ${item.itemProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                {item.itemProfit >= 0 ? "+" : ""}{formatCurrency(item.itemProfit)} {t("reports.profit")}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between text-sm">
                        <span className="text-slate-500">{t("reports.totalCost")}:</span>
                        <span className="font-bold text-slate-700">{formatCurrency(sale.cost)}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
