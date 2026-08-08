import { useState, useCallback, useRef, useEffect } from "react";
import { useGetCustomers, useCreateSale } from "@workspace/api-client-react";
import { useSectorFilteredProducts, useUserSectorKey } from "@/hooks/useSectorScope";
import { isRawCategoryAllowedForSector } from "@/lib/industries";
import { formatCurrency } from "@/lib/utils";
import { Search, ShoppingBag, Trash2, Plus, Minus, Receipt, UserSquare2, PackageOpen, CheckCircle2, AlertCircle, ScanLine, MessageCircle, DollarSign, Tag, Check, X as XIcon, Banknote, Truck, QrCode } from "lucide-react";
import { QRPaymentModal } from "@/components/QRPaymentModal";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { PrintReceipt } from "@/components/print-receipt";
import BarcodeScannerModal from "@/components/BarcodeScannerModal";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import { useTranslation } from "react-i18next";

interface CartItem {
  productId: number;
  name: string;
  price: number;
  quantity: number;
  unit: string;
}

export default function POS() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { rate, setRate, iqdToUsd } = useExchangeRate();
  const sectorKey = useUserSectorKey();
  const { data: products = [], isLoading: productsLoading } = useSectorFilteredProducts();
  const { data: customers = [] } = useGetCustomers();
  const createSaleMutation = useCreateSale();

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentType, setPaymentType] = useState<"cash" | "debt">("cash");
  const [customerId, setCustomerId] = useState<number | "">("");
  const [successSaleId, setSuccessSaleId] = useState<number | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  const [editingRate, setEditingRate] = useState(false);
  const [rateInput, setRateInput] = useState("");

  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [discountInput, setDiscountInput] = useState("");

  const [amountReceived, setAmountReceived] = useState("");

  type PaymentMethod = "cash" | "cash_on_delivery" | "qr_payment" | "debt";
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [qrModalOpen, setQrModalOpen] = useState(false);

  const derivedPaymentType = paymentMethod === "debt" ? "debt" : "cash";
  const amountReceivedRef = useRef<HTMLInputElement>(null);

  const filteredProducts = products.filter(
    (p) => p.name.includes(search) && p.stock > 0
  );

  const addToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast({ title: t("pos.stockWarning"), description: t("pos.stockLimit", { count: product.stock }), variant: "destructive" });
          return prev;
        }
        return prev.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { productId: product.id, name: product.name, price: product.price, quantity: 1, unit: product.unit }];
    });
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          const product = products.find((p) => p.id === productId);
          const newQ = item.quantity + delta;
          if (newQ > (product?.stock || 0)) {
            toast({ title: t("pos.stockWarning"), variant: "destructive" });
            return item;
          }
          if (newQ < 1) return null as any;
          return { ...item, quantity: newQ };
        }
        return item;
      }).filter(Boolean)
    );
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setCustomerId("");
    setPaymentType("cash");
    setPaymentMethod("cash");
    setSuccessSaleId(null);
    setDiscountInput("");
    setAmountReceived("");
    setQrModalOpen(false);
  };

  useEffect(() => {
    if (cart.length > 0 && derivedPaymentType === "cash" && !successSaleId) {
      const timer = setTimeout(() => amountReceivedRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [cart.length, derivedPaymentType, successSaleId]);

  const handleBarcodeScanned = useCallback(async (code: string) => {
    try {
      const res = await fetch(`/api/products/barcode/${encodeURIComponent(code)}`);
      if (!res.ok) {
        toast({ title: t("pos.barcodeNotFound"), description: `"${code}"`, variant: "destructive" });
        return;
      }
      const product = await res.json();
      if (!isRawCategoryAllowedForSector(product.category, sectorKey)) {
        toast({ title: t("pos.barcodeNotFound"), description: t("common.retryHint"), variant: "destructive" });
        return;
      }
      if (product.stock <= 0) {
        toast({ title: t("pos.stockEmpty"), description: product.name, variant: "destructive" });
        return;
      }
      addToCart(product);
      toast({ title: t("pos.addedToCart"), description: product.name });
    } catch {
      toast({ title: t("common.error"), description: t("common.retryHint"), variant: "destructive" });
    }
  }, [products, toast, t, sectorKey]);

  const rawTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const discountValue = (() => {
    const v = parseFloat(discountInput);
    if (isNaN(v) || v <= 0) return 0;
    if (discountType === "percent") return Math.round(rawTotal * Math.min(v, 100) / 100);
    return Math.min(v, rawTotal);
  })();

  const totalAmount = Math.max(0, rawTotal - discountValue);
  const receivedValue = parseFloat(amountReceived);
  const changeAmount = !isNaN(receivedValue) ? receivedValue - totalAmount : null;

  const formatPhoneForWhatsApp = (phone: string): string => {
    const digits = phone.replace(/\D/g, "");
    if (digits.startsWith("964")) return digits;
    if (digits.startsWith("07") && digits.length === 11) return "964" + digits.slice(1);
    if (digits.startsWith("7") && digits.length === 10) return "964" + digits;
    return digits;
  };

  const buildWhatsAppMessage = (): string => {
    const storeName = "LinQi";
    const line = "─────────────────";
    const itemLines = cart.map((item, i) =>
      `${i + 1}. ${item.name}\n   ${item.quantity} × ${formatCurrency(item.price)} = ${formatCurrency(item.price * item.quantity)}`
    ).join("\n");
    const payMethodLabel = paymentMethod === "qr_payment" ? `QR Pay 📲` : paymentMethod === "cash_on_delivery" ? `${t("pos.cashOnDelivery")} 🚚` : paymentMethod === "debt" ? `${t("dashboard.debtPayment")} 📋` : `${t("dashboard.cashPayment")} ✅`;
  const payLabel = payMethodLabel;
  const greeting = selectedCustomer ? `${t("pos.dearCustomer")} ${selectedCustomer.name},` : `${t("pos.dearCustomer")},`;
    const discountLine = discountValue > 0 ? [`🏷️ ${t("pos.discount")}: -${formatCurrency(discountValue)}`] : [];
    return [
      `🏪 *${storeName}*`,
      line,
      greeting,
      t("pos.whatsappGreeting"),
      ``,
      `🧾 *${t("pos.receiptNo")} #${successSaleId}*`,
      line,
      itemLines,
      line,
      ...discountLine,
      `💰 *${t("pos.total")}: ${formatCurrency(totalAmount)}*`,
      `💳 ${t("pos.paymentMethod")}: ${payLabel}`,
      line,
      t("pos.thankYou"),
      `${t("pos.comeBack")} ${storeName} 💙`,
    ].join("\n");
  };

  const handleWhatsApp = () => {
    const phone = selectedCustomer?.phone;
    const message = buildWhatsAppMessage();
    const encoded = encodeURIComponent(message);
    if (phone) {
      window.open(`https://wa.me/${formatPhoneForWhatsApp(phone)}?text=${encoded}`, "_blank");
    } else {
      window.open(`https://wa.me/?text=${encoded}`, "_blank");
    }
  };

  const selectedCustomer = customers.find((c) => c.id === Number(customerId));

  const submitSale = () => {
    createSaleMutation.mutate(
      {
        data: {
          paymentType: derivedPaymentType,
          paymentMethod: paymentMethod === "debt" ? "cash" : paymentMethod,
          customerId: customerId === "" ? undefined : Number(customerId),
          items: cart.map((item) => ({ productId: item.productId, quantity: item.quantity, unitPrice: item.price })),
          discountAmount: discountValue > 0 ? discountValue : undefined,
          exchangeRate: rate,
        } as any,
      },
      {
        onSuccess: (sale) => {
          setSuccessSaleId(sale.id);
          setQrModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ["/api/products"] });
          queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
          queryClient.invalidateQueries({ queryKey: ["/api/debts"] });
          queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
          queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
          queryClient.invalidateQueries({ queryKey: ["deliveries"] });
          queryClient.invalidateQueries({ queryKey: ["driver", "cod-deliveries"] });
          toast({
            title: t("pos.saleDone"),
            description:
              paymentMethod === "cash_on_delivery"
                ? t("pos.codPendingDelivery", { id: sale.id })
                : derivedPaymentType === "debt"
                  ? t("pos.debtRecorded", { amount: formatCurrency(totalAmount), name: selectedCustomer?.name })
                  : t("pos.receiptCreated", { id: sale.id }),
          });
        },
        onError: () => {
          setQrModalOpen(false);
          toast({ title: t("common.error"), description: t("common.retryHint"), variant: "destructive" });
        },
      }
    );
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast({ title: t("pos.emptyCart"), description: t("pos.addItem"), variant: "destructive" });
      return;
    }
    if (derivedPaymentType === "debt" && !customerId) {
      toast({ title: t("pos.noCustomer"), description: t("pos.selectCustomerForDebt"), variant: "destructive" });
      return;
    }
    if (paymentMethod === "qr_payment") {
      setQrModalOpen(true);
      return;
    }
    submitSale();
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col lg:flex-row gap-6 pb-2">
      <BarcodeScannerModal open={scannerOpen} onClose={() => setScannerOpen(false)} onScanned={handleBarcodeScanned} />
      <QRPaymentModal
        open={qrModalOpen}
        totalIQD={totalAmount}
        onConfirm={submitSale}
        onCancel={() => setQrModalOpen(false)}
      />

      {/* Products Grid */}
      <div className="flex-1 flex flex-col bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden min-h-0">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute end-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t("pos.searchProducts")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white pe-12 ps-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm"
              />
            </div>
            <button
              onClick={() => setScannerOpen(true)}
              title={t("pos.barcode")}
              className="shrink-0 flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-3 rounded-2xl font-bold text-sm transition-all shadow-sm hover:shadow-md active:scale-95"
            >
              <ScanLine className="w-5 h-5" />
              <span className="hidden sm:inline">{t("pos.barcode")}</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {productsLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <PackageOpen className="w-16 h-16 mb-4 opacity-20" />
              <p className="font-medium">{t("pos.noProducts")}</p>
              {search && (
                <button onClick={() => setSearch("")} className="mt-3 text-primary text-sm font-semibold hover:underline">
                  {t("pos.clearSearch")}
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map((product) => {
                const inCart = cart.find((i) => i.productId === product.id);
                return (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="relative bg-white border-2 border-slate-100 rounded-2xl p-4 text-right hover:border-primary hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 transition-all group"
                  >
                    {inCart && (
                      <span className="absolute top-2 start-2 bg-primary text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow">
                        {inCart.quantity}
                      </span>
                    )}
                    <div className="w-14 h-14 rounded-xl bg-slate-50 flex items-center justify-center mb-3 group-hover:bg-primary/5 transition-colors overflow-hidden shrink-0">
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <PackageOpen className="w-6 h-6 text-slate-400 group-hover:text-primary transition-colors" />
                      )}
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm line-clamp-1">{product.name}</h3>
                    <p className="text-primary font-black mt-1 text-sm">{formatCurrency(product.price)}</p>
                    <p className="text-xs text-blue-500 font-mono">≈ ${iqdToUsd(product.price).toFixed(2)}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {t("pos.stock")}: {product.stock} {product.unit}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Invoice / Checkout */}
      <div className="w-full lg:w-[420px] xl:w-[460px] flex flex-col bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden shrink-0 min-h-0">
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Receipt className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">{t("pos.newReceipt")}</h2>
          </div>
          {cart.length > 0 && (
            <button onClick={clearCart} className="text-xs text-slate-400 hover:text-white transition-colors">
              {t("pos.clear")}
            </button>
          )}
        </div>

        {/* Exchange Rate Bar */}
        <div className="px-4 py-2.5 bg-blue-950 border-b border-blue-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 text-blue-300 text-xs font-semibold">
            <DollarSign className="w-3.5 h-3.5" />
            {t("pos.exchangeRateLabel")}
          </div>
          {editingRate ? (
            <div className="flex items-center gap-1.5 flex-1 max-w-[200px]">
              <input
                type="number"
                value={rateInput}
                onChange={(e) => setRateInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const v = parseFloat(rateInput);
                    if (!isNaN(v) && v > 0) { setRate(v); setEditingRate(false); }
                  }
                  if (e.key === "Escape") setEditingRate(false);
                }}
                className="flex-1 bg-blue-900 border border-blue-700 text-white text-xs font-mono px-2 py-1 rounded-lg outline-none focus:border-blue-400 w-24"
                dir="ltr"
                autoFocus
                placeholder={rate.toString()}
              />
              <button onClick={() => { const v = parseFloat(rateInput); if (!isNaN(v) && v > 0) setRate(v); setEditingRate(false); }} className="w-6 h-6 flex items-center justify-center bg-blue-500 hover:bg-blue-400 rounded-md transition-colors">
                <Check className="w-3.5 h-3.5 text-white" />
              </button>
              <button onClick={() => setEditingRate(false)} className="w-6 h-6 flex items-center justify-center bg-blue-900 hover:bg-blue-800 rounded-md transition-colors">
                <XIcon className="w-3.5 h-3.5 text-blue-300" />
              </button>
            </div>
          ) : (
            <button onClick={() => { setRateInput(rate.toString()); setEditingRate(true); }} className="flex items-center gap-2 text-white text-xs font-mono bg-blue-800 hover:bg-blue-700 px-3 py-1 rounded-lg transition-colors">
              <span>١ $ = {rate.toLocaleString()} {t("common.currency")}</span>
              <span className="text-blue-400 text-[10px]">{t("pos.editRate")}</span>
            </button>
          )}
        </div>

        {/* Success State */}
        <AnimatePresence>
          {successSaleId && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex-1 flex flex-col items-center justify-center p-8 text-center"
            >
              <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-1">{t("pos.saleDone")}</h3>
              <p className="text-slate-500 mb-1">
                {t("pos.receiptNo")} <span className="font-mono font-bold text-slate-700">#{successSaleId}</span>
              </p>
              <p className="text-2xl font-black text-primary mt-2">{formatCurrency(totalAmount)}</p>
              {paymentMethod === "debt" && selectedCustomer && (
                <div className="mt-3 px-4 py-2 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-sm font-semibold">
                  {t("pos.debtRecordedFor", { name: selectedCustomer.name })}
                </div>
              )}
              <div className="mt-4 w-full space-y-2">
                <PrintReceipt
                  saleId={successSaleId}
                  items={cart.map((item) => ({ name: item.name, quantity: item.quantity, unitPrice: item.price, total: item.price * item.quantity, unit: item.unit }))}
                  totalAmount={totalAmount}
                  paymentType={paymentType}
                  customerName={selectedCustomer?.name ?? null}
                />
                <button
                  onClick={handleWhatsApp}
                  className="w-full flex items-center justify-center gap-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-green-200 hover:-translate-y-0.5 active:translate-y-0"
                >
                  <MessageCircle className="w-5 h-5" />
                  {selectedCustomer?.phone
                    ? t("pos.sendWhatsAppTo", { name: selectedCustomer.name })
                    : t("pos.sendWhatsApp")}
                </button>
              </div>
              <button onClick={clearCart} className="mt-3 w-full bg-primary hover:bg-primary/90 text-white py-3 rounded-xl font-bold transition-all">
                {t("pos.newReceiptBtn")}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cart */}
        {!successSaleId && (
          <>
            <div className="flex-1 overflow-y-auto p-3 bg-slate-50/30 min-h-0">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10">
                  <ShoppingBag className="w-14 h-14 mb-3 opacity-20" />
                  <p className="font-medium">{t("pos.cartEmpty")}</p>
                  <p className="text-xs mt-1 opacity-70">{t("pos.selectItem")}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence initial={false}>
                    {cart.map((item) => (
                      <motion.div
                        key={item.productId}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between"
                      >
                        <div className="flex-1 min-w-0 pe-3">
                          <h4 className="font-bold text-slate-800 text-sm line-clamp-1">{item.name}</h4>
                          <p className="text-xs text-primary font-semibold">
                            {formatCurrency(item.price)} × {item.quantity} = <span className="font-black">{formatCurrency(item.price * item.quantity)}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                            <button onClick={() => updateQuantity(item.productId, -1)} className="w-7 h-7 flex items-center justify-center bg-white rounded-md text-slate-600 shadow-sm hover:bg-slate-50 transition-colors">
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center font-bold font-mono text-sm">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.productId, 1)} className="w-7 h-7 flex items-center justify-center bg-white rounded-md text-slate-600 shadow-sm hover:bg-slate-50 transition-colors">
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <button onClick={() => removeFromCart(item.productId)} className="w-8 h-8 flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 p-4 bg-white space-y-4 shrink-0">
              {/* Customer */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <UserSquare2 className="w-4 h-4 text-primary" />
                  {t("pos.customer")}
                </label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium text-sm transition-all"
                >
                  <option value="">— {t("pos.generalCustomerOpt")} —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.totalDebt > 0 ? `(${t("pos.debt")}: ${formatCurrency(c.totalDebt)})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Method — LinQi Pay */}
              <div>
                <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-primary" />
                  {t("pos.paymentMethod")}
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { key: "cash" as const, icon: <Banknote className="w-4 h-4" />, label: t("pos.cashPayment"), color: "text-emerald-600", activeBg: "bg-emerald-50 border-emerald-300" },
                    { key: "cash_on_delivery" as const, icon: <Truck className="w-4 h-4" />, label: t("pos.cashOnDelivery"), color: "text-amber-600", activeBg: "bg-amber-50 border-amber-300" },
                    { key: "qr_payment" as const, icon: <QrCode className="w-4 h-4" />, label: "QR Pay (FIB)", color: "text-violet-600", activeBg: "bg-violet-50 border-violet-300" },
                    { key: "debt" as const, icon: <span className="text-sm">📋</span>, label: t("dashboard.debtPayment"), color: "text-rose-600", activeBg: "bg-rose-50 border-rose-300" },
                  ].map(({ key, icon, label, color, activeBg }) => (
                    <button
                      key={key}
                      onClick={() => { setPaymentMethod(key); setPaymentType(key === "debt" ? "debt" : "cash"); }}
                      className={`flex items-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold border-2 transition-all ${
                        paymentMethod === key
                          ? `${activeBg} ${color} shadow-sm`
                          : "border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700 bg-white"
                      }`}
                    >
                      <span className={paymentMethod === key ? color : "text-slate-400"}>{icon}</span>
                      {label}
                    </button>
                  ))}
                </div>
                {paymentMethod === "qr_payment" && (
                  <div className="mt-2 flex items-center gap-2 text-violet-600 text-xs font-semibold bg-violet-50 border border-violet-100 rounded-xl px-3 py-2">
                    <QrCode className="w-3.5 h-3.5 shrink-0" />
                    {t("pos.qrPayNote")}
                  </div>
                )}
                {paymentMethod === "cash_on_delivery" && (
                  <div className="mt-2 flex items-center gap-2 text-amber-600 text-xs font-semibold bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                    <Truck className="w-3.5 h-3.5 shrink-0" />
                    {t("pos.codNote")}
                  </div>
                )}
              </div>

              {paymentMethod === "debt" && !customerId && (
                <div className="flex items-center gap-2 text-amber-600 text-xs font-semibold bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {t("pos.selectCustomerForDebt")}
                </div>
              )}

              {paymentMethod === "debt" && selectedCustomer && (
                <div className="flex items-center gap-2 text-rose-600 text-xs font-semibold bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {t("pos.currentDebt")}: {formatCurrency(selectedCustomer.totalDebt)}
                  {cart.length > 0 && (
                    <span className="ms-auto font-black">→ {formatCurrency(selectedCustomer.totalDebt + totalAmount)}</span>
                  )}
                </div>
              )}

              {/* Discount */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-primary" />
                  {t("pos.discount")}
                </label>
                <div className="flex gap-2">
                  <div className="flex bg-slate-100 p-0.5 rounded-lg shrink-0">
                    <button onClick={() => setDiscountType("percent")} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${discountType === "percent" ? "bg-white text-primary shadow-sm" : "text-slate-500"}`}>%</button>
                    <button onClick={() => setDiscountType("fixed")} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${discountType === "fixed" ? "bg-white text-primary shadow-sm" : "text-slate-500"}`}>{t("common.currency")}</button>
                  </div>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      value={discountInput}
                      onChange={(e) => setDiscountInput(e.target.value)}
                      placeholder={discountType === "percent" ? "0%" : "0"}
                      min="0"
                      max={discountType === "percent" ? "100" : undefined}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono"
                      dir="ltr"
                    />
                    {discountValue > 0 && (
                      <span className="absolute end-2 top-1/2 -translate-y-1/2 text-xs text-emerald-600 font-bold">
                        -{formatCurrency(discountValue)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Total */}
              <div className="pt-3 border-t border-slate-100">
                <div className="flex justify-between items-center mb-1">
                  <div>
                    <p className="text-xs text-slate-500">{t("pos.itemCount", { count: cart.length })}</p>
                    <p className="text-slate-500 font-medium text-sm">
                      {discountValue > 0 ? t("pos.beforeDiscount") : t("pos.total")}
                    </p>
                  </div>
                  <span className={`font-black font-mono ${discountValue > 0 ? "text-xl text-slate-400 line-through" : "text-3xl text-slate-800"}`}>
                    {formatCurrency(rawTotal)}
                  </span>
                </div>
                {discountValue > 0 && (
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-sm font-bold text-emerald-600">{t("pos.afterDiscount")}</p>
                    <span className="text-3xl font-black text-slate-800 font-mono">{formatCurrency(totalAmount)}</span>
                  </div>
                )}
                <p className="text-xs text-blue-500 font-mono text-start mb-4">≈ ${iqdToUsd(totalAmount).toFixed(2)} USD</p>

                {/* Change Calculator */}
                {derivedPaymentType !== "debt" && paymentMethod !== "qr_payment" && (
                  <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      💵 {t("pos.amountReceived")}
                    </label>
                    <input
                      ref={amountReceivedRef}
                      type="number"
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(e.target.value)}
                      placeholder="0"
                      min="0"
                      dir="ltr"
                      className="w-full px-3 py-2.5 text-base font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-white"
                    />
                    {changeAmount !== null && (
                      <div className={`rounded-lg px-3 py-2.5 text-center ${changeAmount >= 0 ? "bg-emerald-50 border border-emerald-200" : "bg-rose-50 border border-rose-200"}`}>
                        {changeAmount >= 0 ? (
                          <p className="text-xl font-black text-emerald-600">{t("pos.change")}: {formatCurrency(changeAmount)}</p>
                        ) : (
                          <p className="text-xl font-black text-rose-600">{t("pos.remaining")}: {formatCurrency(Math.abs(changeAmount))}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={handleCheckout}
                  disabled={cart.length === 0 || createSaleMutation.isPending || (derivedPaymentType === "debt" && !customerId)}
                  className={`w-full py-4 rounded-xl font-bold text-base shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0 text-white ${
                    paymentMethod === "debt"
                      ? "bg-gradient-to-r from-rose-500 to-rose-600 shadow-rose-200"
                      : paymentMethod === "qr_payment"
                      ? "bg-gradient-to-r from-violet-500 to-violet-700 shadow-violet-200"
                      : paymentMethod === "cash_on_delivery"
                      ? "bg-gradient-to-r from-amber-500 to-amber-600 shadow-amber-200"
                      : "bg-gradient-to-r from-primary to-blue-600 shadow-primary/25"
                  }`}
                >
                  {createSaleMutation.isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t("common.processing")}
                    </span>
                  ) : paymentMethod === "debt" ? (
                    t("pos.recordDebt")
                  ) : paymentMethod === "qr_payment" ? (
                    <span className="flex items-center justify-center gap-2"><QrCode className="w-5 h-5" /> {t("pos.openQRPay")}</span>
                  ) : paymentMethod === "cash_on_delivery" ? (
                    <span className="flex items-center justify-center gap-2"><Truck className="w-5 h-5" /> {t("pos.confirmCOD")}</span>
                  ) : (
                    t("pos.checkoutCash")
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
