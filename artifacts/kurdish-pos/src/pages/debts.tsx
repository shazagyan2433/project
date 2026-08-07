import { useState } from "react";
import { useGetDebts, usePayDebt } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Search, Wallet, WifiOff } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useOffline } from "@/hooks/useOffline";
import { useTranslation } from "react-i18next";

export default function Debts() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isOffline = useOffline();
  const { data: debts, isLoading, isError } = useGetDebts();
  const payMutation = usePayDebt();

  const [search, setSearch] = useState("");
  const [payingDebt, setPayingDebt] = useState<any | null>(null);
  const [payAmount, setPayAmount] = useState("");

  const debtList = debts ?? [];
  const filteredDebts = debtList.filter(d =>
    d.customerName.includes(search) && d.status !== "paid"
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200">{t("debts.pending")}</span>;
      case "partial": return <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold border border-amber-200">{t("debts.partial")}</span>;
      case "paid": return <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200">{t("debts.paid")}</span>;
      default: return null;
    }
  };

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(payAmount);
    if (!amount || amount <= 0 || amount > payingDebt.remainingAmount) {
      toast({ title: t("debts.invalidAmount"), variant: "destructive" });
      return;
    }

    payMutation.mutate(
      { id: payingDebt.id, data: { amount } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/debts"] });
          queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
          toast({ title: t("debts.paymentReceived") });
          setPayingDebt(null);
          setPayAmount("");
        }
      }
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800">{t("debts.title")}</h1>
        <p className="text-slate-500 mt-1">{t("debts.subtitle")}</p>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder={t("debts.searchDebts")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-slate-700 placeholder:text-slate-400"
        />
      </div>

      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : isError ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400">
            <WifiOff className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg font-semibold text-slate-500">
              {isOffline ? t("common.offline") : t("common.error")}
            </p>
            <p className="text-sm mt-1 text-center">
              {isOffline ? t("common.offlineDataHint") : t("common.retryHint")}
            </p>
          </div>
        ) : filteredDebts.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400">
            <svg viewBox="0 0 200 160" className="w-32 h-32 mx-auto mb-3">
              <circle cx="100" cy="45" r="28" fill="#1A6AFF15" stroke="#1A6AFF30" strokeWidth="2" />
              <path d="M72 45 Q100 30 128 45" fill="none" stroke="#1A6AFF" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="88" cy="40" r="4" fill="#1A6AFF" opacity="0.6" />
              <circle cx="112" cy="40" r="4" fill="#1A6AFF" opacity="0.6" />
              <path d="M60 90 Q100 70 140 90 Q130 130 100 135 Q70 130 60 90Z" fill="#1A6AFF12" stroke="#1A6AFF25" strokeWidth="1.5" />
              <path d="M70 90 L50 110" stroke="#1A6AFF" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
              <path d="M130 90 L150 110" stroke="#1A6AFF" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
            </svg>
            <p className="text-lg">{t("debts.noDebts")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 hover:bg-primary/5 transition-colors">{t("debts.customer")}</th>
                  <th className="px-6 py-4 hover:bg-primary/5 transition-colors">{t("debts.receiptDate")}</th>
                  <th className="px-6 py-4 hover:bg-primary/5 transition-colors">{t("debts.original")}</th>
                  <th className="px-6 py-4 hover:bg-primary/5 transition-colors">{t("debts.remaining")}</th>
                  <th className="px-6 py-4 hover:bg-primary/5 transition-colors">{t("debts.status")}</th>
                  <th className="px-6 py-4 text-center hover:bg-primary/5 transition-colors">{t("common.action")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDebts.map((debt) => (
                  <tr key={debt.id} className="hover:bg-primary/5 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800">{debt.customerName}</p>
                      <p className="text-xs text-slate-500 font-mono mt-0.5" dir="ltr">{debt.customerPhone}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      <p className="font-mono">#{debt.saleId}</p>
                      <p className="text-xs">{formatDate(debt.createdAt)}</p>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-600">{formatCurrency(debt.originalAmount)}</td>
                    <td className="px-6 py-4 font-black text-rose-600">{formatCurrency(debt.remainingAmount)}</td>
                    <td className="px-6 py-4">{getStatusBadge(debt.status)}</td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => {
                          setPayingDebt(debt);
                          setPayAmount(debt.remainingAmount.toString());
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl font-bold transition-colors"
                      >
                        <Wallet className="w-4 h-4" />
                        {t("debts.receive")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {payingDebt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 bg-emerald-600 text-white">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Wallet className="w-6 h-6" />
                {t("debts.receiveDebt")}
              </h2>
            </div>
            <form onSubmit={handlePay} className="p-6 space-y-6">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex justify-between mb-2">
                  <span className="text-slate-500 text-sm">{t("debts.customer")}:</span>
                  <span className="font-bold">{payingDebt.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 text-sm">{t("debts.remaining")}:</span>
                  <span className="font-black text-rose-600">{formatCurrency(payingDebt.remainingAmount)}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-700">{t("debts.amountReceived")}</label>
                <div className="relative">
                  <input
                    type="number"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    max={payingDebt.remainingAmount}
                    className="w-full ps-4 pe-14 py-4 rounded-xl border-2 border-emerald-200 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-mono text-xl font-bold text-emerald-700 bg-emerald-50/30"
                    dir="ltr"
                    autoFocus
                  />
                  <span className="absolute end-4 top-1/2 -translate-y-1/2 text-emerald-600 font-bold text-sm">{t("common.currency")}</span>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button type="submit" disabled={payMutation.isPending} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold text-lg transition-all disabled:opacity-50 shadow-lg shadow-emerald-200">
                  {payMutation.isPending ? t("common.processing") : t("debts.confirm")}
                </button>
                <button type="button" onClick={() => setPayingDebt(null)} className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all">
                  {t("common.close")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
