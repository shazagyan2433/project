import React, { useState, useMemo } from "react";
import { useGetSales } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Receipt, TrendingUp, CalendarDays, UserCircle2, ChevronDown, ChevronUp, Banknote, Truck, QrCode, CreditCard } from "lucide-react";
import { useTranslation } from "react-i18next";

type DateFilter = "all" | "today" | "week" | "month";

function PaymentMethodBadge({ method, paymentType }: { method?: string; paymentType: string }) {
  const { t } = useTranslation();
  const m = method ?? (paymentType === "debt" ? "debt" : "cash");
  if (m === "qr_payment") return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-bold border border-violet-200">
      <QrCode className="w-3 h-3" /> QR Pay
    </span>
  );
  if (m === "cash_on_delivery") return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold border border-amber-200">
      <Truck className="w-3 h-3" /> {t("pos.cashOnDelivery")}
    </span>
  );
  if (m === "debt") return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200">
      <CreditCard className="w-3 h-3" /> {t("dashboard.debtPayment")}
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200">
      <Banknote className="w-3 h-3" /> {t("dashboard.cashPayment")}
    </span>
  );
}

function getDateRange(filter: DateFilter): { from: Date } | null {
  const now = new Date();
  if (filter === "today") {
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { from };
  }
  if (filter === "week") {
    const from = new Date(now);
    from.setDate(now.getDate() - now.getDay());
    from.setHours(0, 0, 0, 0);
    return { from };
  }
  if (filter === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from };
  }
  return null;
}

export default function Sales() {
  const { t } = useTranslation();
  const { data: sales = [], isLoading } = useGetSales();
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const filteredSales = useMemo(() => {
    const range = getDateRange(dateFilter);
    if (!range) return sales;
    return sales.filter((s) => new Date(s.createdAt) >= range.from);
  }, [sales, dateFilter]);

  const totalRevenue = useMemo(
    () => filteredSales.reduce((sum, s) => sum + s.totalAmount, 0),
    [filteredSales]
  );
  const cashSales = filteredSales.filter((s) => s.paymentType === "cash");
  const debtSales = filteredSales.filter((s) => s.paymentType === "debt");

  const filterButtons: { key: DateFilter; labelKey: string }[] = [
    { key: "all", labelKey: "sales.all" },
    { key: "today", labelKey: "sales.today" },
    { key: "week", labelKey: "sales.thisWeek" },
    { key: "month", labelKey: "sales.thisMonth" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800">{t("sales.title")}</h1>
        <p className="text-slate-500 mt-1">{t("sales.subtitle")}</p>
      </div>

      {/* Date Filter Tabs */}
      <div className="flex gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 w-fit">
        {filterButtons.map((btn) => (
          <button
            key={btn.key}
            onClick={() => setDateFilter(btn.key)}
            className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              dateFilter === btn.key
                ? "bg-primary text-white shadow-lg shadow-primary/25"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            }`}
          >
            {btn.key !== "all" && <CalendarDays className="w-3.5 h-3.5" />}
            {t(btn.labelKey)}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <p className="text-xs text-slate-500 mb-1">{t("sales.totalSalesCount")}</p>
          <p className="text-2xl font-black text-slate-800">{filteredSales.length}</p>
          <p className="text-xs text-slate-400 mt-1">{t("sales.receipts")}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <p className="text-xs text-slate-500 mb-1">{t("sales.revenue")}</p>
          <p className="text-lg font-black text-emerald-600">{formatCurrency(totalRevenue)}</p>
          <p className="text-xs text-slate-400 mt-1">{t("sales.total")}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-sm bg-emerald-50/30">
          <p className="text-xs text-emerald-600 mb-1">{t("sales.cash")}</p>
          <p className="text-2xl font-black text-emerald-700">{cashSales.length}</p>
          <p className="text-xs text-emerald-500 mt-1">{t("sales.receipts")}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-rose-100 shadow-sm bg-rose-50/30">
          <p className="text-xs text-rose-600 mb-1">{t("sales.debt")}</p>
          <p className="text-2xl font-black text-rose-700">{debtSales.length}</p>
          <p className="text-xs text-rose-500 mt-1">{t("sales.receipts")}</p>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400">
            <Receipt className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">{t("sales.noSales")}</p>
            <p className="text-sm mt-1 opacity-70">
              {dateFilter !== "all" ? t("sales.noSalesForFilter") : t("sales.noSalesYet")}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">#</th>
                  <th className="px-6 py-4">{t("reports.date")}</th>
                  <th className="px-6 py-4">{t("dashboard.customer")}</th>
                  <th className="px-6 py-4">{t("dashboard.paymentType")}</th>
                  <th className="px-6 py-4">{t("sales.items")}</th>
                  <th className="px-6 py-4 text-start">{t("dashboard.total")}</th>
                  <th className="px-6 py-4 text-center">{t("sales.details")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSales.map((sale) => (
                  <React.Fragment key={sale.id}>
                    <tr className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-500">#{sale.id}</td>
                      <td className="px-6 py-4 text-slate-500 text-xs">{formatDate(sale.createdAt)}</td>
                      <td className="px-6 py-4">
                        {sale.customerName ? (
                          <div className="flex items-center gap-2">
                            <UserCircle2 className="w-4 h-4 text-primary shrink-0" />
                            <span className="font-semibold text-slate-700">{sale.customerName}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">{t("common.generalCustomer")}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <PaymentMethodBadge method={(sale as any).paymentMethod} paymentType={sale.paymentType} />
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        <span className="inline-flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg font-semibold text-xs">
                          <TrendingUp className="w-3 h-3" />
                          {t("sales.itemCount", { count: sale.items.length })}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-start font-black text-primary text-base">
                        {formatCurrency(sale.totalAmount)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => setExpandedId(expandedId === sale.id ? null : sale.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors border border-slate-200 hover:border-primary/30"
                        >
                          {expandedId === sale.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          {expandedId === sale.id ? t("common.close") : t("sales.view")}
                        </button>
                      </td>
                    </tr>
                    {expandedId === sale.id && (
                      <tr key={`${sale.id}-detail`} className="bg-slate-50/60">
                        <td colSpan={7} className="px-8 py-4">
                          <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm">
                            <table className="w-full text-sm text-right">
                              <thead className="bg-slate-100 text-slate-500 text-xs">
                                <tr>
                                  <th className="px-4 py-2 font-semibold">{t("products.productName")}</th>
                                  <th className="px-4 py-2 font-semibold">{t("sales.qty")}</th>
                                  <th className="px-4 py-2 font-semibold">{t("sales.unitPrice")}</th>
                                  <th className="px-4 py-2 font-semibold text-start">{t("sales.lineTotal")}</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {sale.items.map((item, idx) => (
                                  <tr key={idx}>
                                    <td className="px-4 py-2 font-bold text-slate-800">{item.productName}</td>
                                    <td className="px-4 py-2 text-slate-600">{item.quantity}</td>
                                    <td className="px-4 py-2 text-slate-600">{formatCurrency(item.unitPrice)}</td>
                                    <td className="px-4 py-2 text-start font-black text-primary">{formatCurrency(item.total)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {(sale.discountAmount || sale.exchangeRate) && (
                            <div className="flex flex-wrap gap-3 mt-3 px-1">
                              {sale.discountAmount && sale.discountAmount > 0 && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
                                  🏷️ {t("sales.discount")}: {formatCurrency(sale.discountAmount)}
                                </span>
                              )}
                              {sale.exchangeRate && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
                                  💱 {t("sales.exchangeRate")}: {sale.exchangeRate.toLocaleString()} {t("common.currency")}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
