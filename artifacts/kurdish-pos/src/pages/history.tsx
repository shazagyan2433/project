import React, { useState, useMemo } from "react";
import { useGetSales } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  History, CalendarDays, UserCircle2, ChevronDown, ChevronUp,
  Package, ShoppingBag, Banknote, Truck, QrCode, CreditCard,
  TrendingUp, ClipboardList, BadgeCheck
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";

type DateFilter = "all" | "today" | "week" | "month";
type LedgerTab = "sales" | "purchase";

function getDateRange(filter: DateFilter) {
  const now = new Date();
  if (filter === "today") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (filter === "week") {
    const d = new Date(now);
    d.setDate(now.getDate() - now.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (filter === "month") {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return null;
}

function PaymentMethodBadge({ method }: { method: string }) {
  const { t } = useTranslation();
  if (method === "qr_payment") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-bold border border-violet-200">
        <QrCode className="w-3 h-3" /> QR Pay
      </span>
    );
  }
  if (method === "cash_on_delivery") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold border border-amber-200">
        <Truck className="w-3 h-3" /> {t("pos.cashOnDelivery")}
      </span>
    );
  }
  if (method === "debt" || method === null) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200">
        <CreditCard className="w-3 h-3" /> {t("dashboard.debtPayment")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200">
      <Banknote className="w-3 h-3" /> {t("dashboard.cashPayment")}
    </span>
  );
}

export default function HistoryPage() {
  const { t } = useTranslation();
  const { data: sales = [], isLoading } = useGetSales();
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<LedgerTab>("sales");

  const filteredSales = useMemo(() => {
    const from = getDateRange(dateFilter);
    const base = from ? sales.filter((s) => new Date(s.createdAt) >= from) : sales;
    if (activeTab === "sales") return base;
    return base.filter((s) => s.paymentType === "debt" || (s as any).paymentMethod === "cash_on_delivery" || (s as any).paymentMethod === "qr_payment");
  }, [sales, dateFilter, activeTab]);

  const totalVolume = useMemo(() => filteredSales.reduce((sum, s) => sum + s.totalAmount, 0), [filteredSales]);
  const totalItems = useMemo(() => filteredSales.reduce((sum, s) => sum + s.items.reduce((a, i) => a + i.quantity, 0), 0), [filteredSales]);

  const filterBtns: { key: DateFilter; label: string }[] = [
    { key: "all", label: t("sales.all") },
    { key: "today", label: t("sales.today") },
    { key: "week", label: t("sales.thisWeek") },
    { key: "month", label: t("sales.thisMonth") },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 flex items-center gap-3">
          <History className="w-8 h-8 text-primary" />
          {t("history.title")}
        </h1>
        <p className="text-slate-500 mt-1">{t("history.subtitle")}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-1.5 bg-white p-1 rounded-2xl shadow-sm border border-slate-100 w-fit">
          {filterBtns.map((btn) => (
            <button
              key={btn.key}
              onClick={() => setDateFilter(btn.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                dateFilter === btn.key
                  ? "bg-primary text-white shadow-md shadow-primary/25"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              {btn.key !== "all" && <CalendarDays className="w-3.5 h-3.5" />}
              {btn.label}
            </button>
          ))}
        </div>

        <div className="flex bg-white border border-slate-200 rounded-2xl p-1 shadow-sm gap-1">
          <button
            onClick={() => setActiveTab("sales")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === "sales" ? "bg-primary text-white shadow" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            {t("history.salesLedger")}
          </button>
          <button
            onClick={() => setActiveTab("purchase")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === "purchase" ? "bg-primary text-white shadow" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            {t("history.purchaseLedger")}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <p className="text-xs text-slate-500 mb-1">{t("history.totalTransactions")}</p>
          <p className="text-2xl font-black text-slate-800">{filteredSales.length}</p>
          <p className="text-xs text-slate-400 mt-1">{t("sales.receipts")}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <p className="text-xs text-slate-500 mb-1">{t("history.totalVolume")}</p>
          <p className="text-base font-black text-emerald-600">{formatCurrency(totalVolume)}</p>
          <p className="text-xs text-slate-400 mt-1">{t("history.iqd")}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-violet-100 shadow-sm bg-violet-50/30">
          <p className="text-xs text-violet-600 mb-1">{t("history.qrTransactions")}</p>
          <p className="text-2xl font-black text-violet-700">
            {filteredSales.filter((s) => (s as any).paymentMethod === "qr_payment").length}
          </p>
          <p className="text-xs text-violet-500 mt-1">QR Pay</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-amber-100 shadow-sm bg-amber-50/30">
          <p className="text-xs text-amber-600 mb-1">{t("history.codTransactions")}</p>
          <p className="text-2xl font-black text-amber-700">
            {filteredSales.filter((s) => (s as any).paymentMethod === "cash_on_delivery").length}
          </p>
          <p className="text-xs text-amber-500 mt-1">{t("pos.cashOnDelivery")}</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400">
            <History className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">{t("history.noRecords")}</p>
            <p className="text-sm mt-1 opacity-70">{t("history.noRecordsHint")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5 text-xs font-bold">#</th>
                  <th className="px-5 py-3.5 text-xs font-bold">{t("reports.date")}</th>
                  <th className="px-5 py-3.5 text-xs font-bold">{t("history.customerSupplier")}</th>
                  <th className="px-5 py-3.5 text-xs font-bold">{t("history.products")}</th>
                  <th className="px-5 py-3.5 text-xs font-bold">{t("history.totalQty")}</th>
                  <th className="px-5 py-3.5 text-xs font-bold">{t("pos.paymentMethod")}</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-start">{t("history.finalAmount")}</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-center">{t("sales.details")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSales.map((sale) => {
                  const totalQty = sale.items.reduce((a, i) => a + i.quantity, 0);
                  const method = (sale as any).paymentMethod ?? (sale.paymentType === "debt" ? "debt" : "cash");
                  return (
                    <React.Fragment key={sale.id}>
                      <tr className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-3.5 font-mono font-bold text-slate-400 text-xs">#{sale.id}</td>
                        <td className="px-5 py-3.5 text-slate-500 text-xs whitespace-nowrap">{formatDate(sale.createdAt)}</td>
                        <td className="px-5 py-3.5">
                          {sale.customerName ? (
                            <div className="flex items-center gap-1.5">
                              <UserCircle2 className="w-4 h-4 text-primary shrink-0" />
                              <span className="font-bold text-slate-800 text-sm">{sale.customerName}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs">{t("common.generalCustomer")}</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex flex-col gap-0.5">
                            {sale.items.slice(0, 2).map((item, idx) => (
                              <div key={idx} className="flex items-center gap-1 text-xs">
                                <Package className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="text-slate-700 font-medium truncate max-w-[120px]">{item.productName}</span>
                              </div>
                            ))}
                            {sale.items.length > 2 && (
                              <span className="text-xs text-slate-400">+{sale.items.length - 2} {t("history.more")}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg font-bold text-slate-600 text-xs">
                            <TrendingUp className="w-3 h-3" /> {totalQty}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <PaymentMethodBadge method={method} />
                        </td>
                        <td className="px-5 py-3.5 text-start font-black text-primary">
                          {formatCurrency(sale.totalAmount)}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <button
                            onClick={() => setExpandedId(expandedId === sale.id ? null : sale.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors border border-slate-200 hover:border-primary/30"
                          >
                            {expandedId === sale.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            {expandedId === sale.id ? t("common.close") : t("sales.view")}
                          </button>
                        </td>
                      </tr>
                      <AnimatePresence>
                        {expandedId === sale.id && (
                          <tr key={`${sale.id}-detail`}>
                            <td colSpan={8} className="p-0">
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="px-6 py-4 bg-slate-50/60">
                                  <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm">
                                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                                      <BadgeCheck className="w-4 h-4 text-primary" />
                                      <span className="text-sm font-bold text-slate-700">{t("history.transactionDetail")}</span>
                                      <span className="ms-auto text-xs text-slate-400 font-mono">#{sale.id}</span>
                                    </div>
                                    <table className="w-full text-sm text-right">
                                      <thead className="bg-slate-50 text-slate-500 text-xs">
                                        <tr>
                                          <th className="px-4 py-2 font-semibold">{t("products.productName")}</th>
                                          <th className="px-4 py-2 font-semibold">{t("history.exactQty")}</th>
                                          <th className="px-4 py-2 font-semibold">{t("sales.unitPrice")}</th>
                                          <th className="px-4 py-2 font-semibold text-start">{t("history.finalAmount")}</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {sale.items.map((item, idx) => (
                                          <tr key={idx} className="hover:bg-slate-50/60">
                                            <td className="px-4 py-2.5 font-bold text-slate-800">{item.productName}</td>
                                            <td className="px-4 py-2.5 text-slate-600 font-mono font-bold">{item.quantity}</td>
                                            <td className="px-4 py-2.5 text-slate-500">{formatCurrency(item.unitPrice)}</td>
                                            <td className="px-4 py-2.5 text-start font-black text-primary">{formatCurrency(item.total)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                    <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                                      <div className="flex flex-wrap gap-2">
                                        <PaymentMethodBadge method={method} />
                                        {sale.discountAmount && sale.discountAmount > 0 && (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
                                            🏷️ {t("sales.discount")}: {formatCurrency(sale.discountAmount)}
                                          </span>
                                        )}
                                        {sale.exchangeRate && (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
                                            💱 {sale.exchangeRate.toLocaleString()} {t("common.currency")}
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-start">
                                        <p className="text-xs text-slate-400">{t("history.finalAmount")}</p>
                                        <p className="text-lg font-black text-primary">{formatCurrency(sale.totalAmount)}</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            </td>
                          </tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
