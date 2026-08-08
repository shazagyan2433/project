import { useState, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, X, Zap, LogOut, SlidersHorizontal, MapPin,
  Store, ShieldCheck, Package, Sparkles, Star, Filter,
  Tag, Layers, ChevronDown, ChevronUp, ShoppingCart,
  Plus, Minus, Trash2, CheckCircle, ClipboardList,
  TrendingDown, BadgePercent,
} from "lucide-react";
import i18n from "@/i18n";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useUserSectorKey } from "@/hooks/useSectorScope";
import { isBuyerCategoryAllowedForSector } from "@/lib/industries";
import { cn } from "@/lib/utils";
import { PAGE_SELECT } from "@/lib/page-theme";

// ─── Types ───────────────────────────────────────────────────────────────────
interface VolumeTier {
  minQty: number;
  discountPct: number;
}

interface BuyerProduct {
  id: string;
  title: string;
  description: string;
  category: string;
  images: string[];
  supplierName: string;
  supplierProvince: string;
  standardPrice: number;
  wholesalePrice: number;
  promoPrice: number;
  volumeTiers: VolumeTier[];
  certifications: string;
  hasCert: boolean;
  unit: string;
  inStock: boolean;
  featured?: boolean;
}

interface CartItem {
  product: BuyerProduct;
  quantity: number;
  effectivePrice: number;
  appliedTier: VolumeTier | null;
  basePrice: number;
}

// ─── Iraq / Kurdistan Provinces ──────────────────────────────────────────────
const PROVINCES = [
  { id: "erbil",        ku: "هەولێر",    en: "Erbil",         ar: "أربيل"       },
  { id: "sulaymaniyah", ku: "سلێمانی",   en: "Sulaymaniyah",  ar: "السليمانية"  },
  { id: "duhok",        ku: "دهۆک",      en: "Duhok",         ar: "دهوك"        },
  { id: "halabja",      ku: "هەڵەبجە",   en: "Halabja",       ar: "حلبجة"       },
  { id: "kirkuk",       ku: "کەرکووک",   en: "Kirkuk",        ar: "كركوك"       },
  { id: "baghdad",      ku: "بەغداد",    en: "Baghdad",       ar: "بغداد"       },
  { id: "basra",        ku: "بەسرە",     en: "Basra",         ar: "البصرة"      },
  { id: "mosul",        ku: "مووسڵ",     en: "Mosul",         ar: "الموصل"      },
  { id: "najaf",        ku: "نەجەف",     en: "Najaf",         ar: "النجف"       },
  { id: "karbala",      ku: "کەربەلا",   en: "Karbala",       ar: "كربلاء"      },
  { id: "anbar",        ku: "ئەنبار",    en: "Anbar",         ar: "الأنبار"     },
  { id: "diyala",       ku: "دیالە",     en: "Diyala",        ar: "ديالى"       },
];

const CATEGORIES = [
  { id: "dairy",      ku: "شیرلێکراو",  en: "Dairy",         ar: "ألبان"        },
  { id: "food",       ku: "خواردن",     en: "Food",          ar: "مواد غذائية" },
  { id: "beverages",  ku: "خواردنەوە",  en: "Beverages",     ar: "مشروبات"     },
  { id: "cleaning",   ku: "پاکیزەیی",   en: "Cleaning",      ar: "منظفات"      },
  { id: "grains",     ku: "دەهات",      en: "Grains",        ar: "حبوب"        },
  { id: "health",     ku: "تەندروستی",  en: "Health",        ar: "صحة"         },
];

const DEMO_PRODUCTS: BuyerProduct[] = [];

const BUYER_CATALOG_KEY = "buyer_product_catalog";
function loadCatalog(): BuyerProduct[] {
  try {
    const raw = localStorage.getItem(BUYER_CATALOG_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

// ─── Language helpers ─────────────────────────────────────────────────────────
const LANGUAGES = [
  { code: "ku", label: "کوردی" },
  { code: "ar", label: "العربية" },
  { code: "en", label: "EN" },
];

function getProvinceName(provinceId: string) {
  const lang = i18n.language;
  const found = PROVINCES.find(p => p.id === provinceId);
  if (!found) return provinceId;
  return lang === "ar" ? found.ar : lang === "en" ? found.en : found.ku;
}

function getCategoryName(categoryId: string) {
  const lang = i18n.language;
  const found = CATEGORIES.find(c => c.id === categoryId);
  if (!found) return categoryId;
  return lang === "ar" ? found.ar : lang === "en" ? found.en : found.ku;
}

// ─── Cart pricing logic ───────────────────────────────────────────────────────
function getBasePrice(product: BuyerProduct): number {
  if (product.promoPrice > 0) return product.promoPrice;
  if (product.wholesalePrice > 0) return product.wholesalePrice;
  return product.standardPrice;
}

function computeEffectivePrice(product: BuyerProduct, qty: number): { price: number; tier: VolumeTier | null } {
  const base = getBasePrice(product);
  const applicable = product.volumeTiers
    .filter(t => qty >= t.minQty)
    .sort((a, b) => b.discountPct - a.discountPct);
  if (applicable.length > 0) {
    return { price: Math.round(base * (1 - applicable[0].discountPct / 100)), tier: applicable[0] };
  }
  return { price: base, tier: null };
}

// ─── Cart Drawer ─────────────────────────────────────────────────────────────
function CartDrawer({
  cart,
  open,
  onClose,
  onUpdateQty,
  onRemove,
  onPlaceOrder,
}: {
  cart: CartItem[];
  open: boolean;
  onClose: () => void;
  onUpdateQty: (productId: string, qty: number) => void;
  onRemove: (productId: string) => void;
  onPlaceOrder: () => void;
}) {
  const { t } = useTranslation();
  const { formatMoney } = useCurrency();

  const subtotal = cart.reduce((s, ci) => s + ci.effectivePrice * ci.quantity, 0);
  const originalTotal = cart.reduce((s, ci) => s + ci.basePrice * ci.quantity, 0);
  const totalSaved = originalTotal - subtotal;

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="drawer"
            initial={{ x: i18n.dir() === "rtl" ? "-100%" : "100%" }}
            animate={{ x: 0 }}
            exit={{ x: i18n.dir() === "rtl" ? "-100%" : "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="fixed top-0 ltr:right-0 rtl:left-0 h-full z-50 flex flex-col w-full max-w-sm sm:max-w-md"
            style={{
              background: "linear-gradient(180deg, #041020 0%, #020C1C 100%)",
              borderLeft: "1px solid rgba(59,130,246,0.2)",
              borderRight: "1px solid rgba(59,130,246,0.2)",
              boxShadow: "-8px 0 40px rgba(0,0,0,0.5), 0 0 60px rgba(29,78,216,0.08)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 shrink-0"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg,#1D4ED8,#3B82F6)", boxShadow: "0 0 14px rgba(59,130,246,0.4)" }}>
                  <ShoppingCart className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-white font-extrabold text-sm">{t("cart.title")}</h2>
                  <p className="text-white/40 text-[10px]">
                    {cart.length} {t("cart.items")}
                  </p>
                </div>
              </div>
              <button onClick={onClose}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors hover:bg-white/10"
                style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
                <X className="w-4 h-4 text-white/60" />
              </button>
            </div>

            {/* Cart items */}
            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2.5">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 py-16">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)" }}>
                    <ShoppingCart className="w-8 h-8 text-blue-400/40" />
                  </div>
                  <p className="text-white/35 text-sm font-medium text-center">{t("cart.empty")}</p>
                </div>
              ) : (
                cart.map(ci => (
                  <motion.div
                    key={ci.product.id}
                    layout
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="rounded-2xl p-3 flex flex-col gap-2"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: ci.appliedTier
                        ? "1px solid rgba(167,139,250,0.25)"
                        : "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-bold leading-snug line-clamp-2">{ci.product.title}</p>
                        <p className="text-white/40 text-[10px] mt-0.5">{ci.product.supplierName}</p>
                      </div>
                      <button onClick={() => onRemove(ci.product.id)}
                        className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors hover:bg-red-500/20"
                        style={{ border: "1px solid rgba(239,68,68,0.2)" }}>
                        <Trash2 className="w-3 h-3" style={{ color: "rgba(252,165,165,0.7)" }} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      {/* Qty controls */}
                      <div className="flex items-center gap-1.5 rounded-xl overflow-hidden"
                        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                        <button
                          onClick={() => onUpdateQty(ci.product.id, ci.quantity - 1)}
                          className="w-8 h-8 flex items-center justify-center transition-colors hover:bg-white/10"
                          disabled={ci.quantity <= 1}
                          style={{ opacity: ci.quantity <= 1 ? 0.35 : 1 }}
                        >
                          <Minus className="w-3 h-3 text-white/70" />
                        </button>
                        <span className="text-white font-bold text-sm w-8 text-center">{ci.quantity}</span>
                        <button
                          onClick={() => onUpdateQty(ci.product.id, ci.quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center transition-colors hover:bg-white/10"
                        >
                          <Plus className="w-3 h-3 text-white/70" />
                        </button>
                      </div>

                      {/* Price */}
                      <div className="text-right">
                        <p className="text-[11px] font-extrabold" style={{ color: "rgba(147,197,253,1)" }}>
                          {formatMoney(ci.effectivePrice * ci.quantity)}
                        </p>
                        <p className="text-[9px] text-white/35">
                          {formatMoney(ci.effectivePrice)} × {ci.quantity}
                        </p>
                      </div>
                    </div>

                    {/* Volume tier badge */}
                    {ci.appliedTier && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-xl"
                        style={{ background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.2)" }}
                      >
                        <BadgePercent className="w-3 h-3 shrink-0" style={{ color: "rgba(167,139,250,0.9)" }} />
                        <span className="text-[9px] font-bold" style={{ color: "rgba(167,139,250,0.9)" }}>
                          {t("cart.bulkDiscount")} -{ci.appliedTier.discountPct}% {t("cart.appliedLabel")}
                          {" "}(≥{ci.appliedTier.minQty} {ci.product.unit})
                        </span>
                      </motion.div>
                    )}
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer summary + checkout */}
            {cart.length > 0 && (
              <div className="px-5 py-4 shrink-0 flex flex-col gap-3"
                style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                {/* Savings */}
                {totalSaved > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between px-3 py-2 rounded-xl"
                    style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}
                  >
                    <div className="flex items-center gap-1.5">
                      <TrendingDown className="w-3.5 h-3.5" style={{ color: "rgba(110,231,183,0.9)" }} />
                      <span className="text-[11px] font-bold" style={{ color: "rgba(110,231,183,0.9)" }}>
                        {t("cart.totalSaved")}
                      </span>
                    </div>
                    <span className="text-[12px] font-extrabold" style={{ color: "rgba(110,231,183,1)" }}>
                      -{formatMoney(totalSaved)}
                    </span>
                  </motion.div>
                )}

                {/* Totals */}
                <div className="flex flex-col gap-1.5">
                  {totalSaved > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-white/35 text-[11px]">{t("cart.originalTotal")}</span>
                      <span className="text-white/30 text-[11px] line-through">{formatMoney(originalTotal)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-sm font-semibold">{t("cart.finalTotal")}</span>
                    <span className="text-white font-extrabold text-lg" style={{ color: "rgba(147,197,253,1)" }}>
                      {formatMoney(subtotal)}
                    </span>
                  </div>
                </div>

                {/* Place Order button */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ scale: 1.01 }}
                  onClick={onPlaceOrder}
                  className="w-full py-3.5 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2.5 transition-all"
                  style={{
                    background: "linear-gradient(135deg, #1D4ED8 0%, #2563EB 50%, #3B82F6 100%)",
                    boxShadow: "0 0 24px rgba(59,130,246,0.4), 0 4px 16px rgba(0,0,0,0.3)",
                    color: "white",
                  }}
                >
                  <ClipboardList className="w-4.5 h-4.5" />
                  {t("cart.placeOrder")}
                </motion.button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Order Confirmation Modal ─────────────────────────────────────────────────
function OrderConfirmModal({
  open,
  cart,
  onClose,
}: {
  open: boolean;
  cart: CartItem[];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { formatMoney } = useCurrency();
  const total = cart.reduce((s, ci) => s + ci.effectivePrice * ci.quantity, 0);
  const orderId = useMemo(() => `ORD-${Date.now().toString(36).toUpperCase()}`, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="modal-bg"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60]"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
          />
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ type: "spring", bounce: 0.3, duration: 0.45 }}
            className="fixed inset-0 z-[61] flex items-center justify-center px-4"
          >
            <div className="w-full max-w-sm rounded-3xl overflow-hidden"
              style={{
                background: "linear-gradient(160deg, #041428 0%, #020C1C 100%)",
                border: "1px solid rgba(59,130,246,0.3)",
                boxShadow: "0 24px 80px rgba(0,0,0,0.6), 0 0 60px rgba(29,78,216,0.15)",
              }}>
              {/* Success header */}
              <div className="flex flex-col items-center py-8 px-6 gap-3"
                style={{ background: "linear-gradient(180deg, rgba(16,185,129,0.12) 0%, transparent 100%)" }}>
                <motion.div
                  initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", bounce: 0.5, delay: 0.15 }}
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, rgba(16,185,129,0.3), rgba(5,150,105,0.2))",
                    border: "2px solid rgba(16,185,129,0.5)",
                    boxShadow: "0 0 30px rgba(16,185,129,0.25)",
                  }}
                >
                  <CheckCircle className="w-8 h-8" style={{ color: "rgba(110,231,183,1)" }} />
                </motion.div>
                <div className="text-center">
                  <h3 className="text-white font-extrabold text-lg">{t("cart.orderSuccess")}</h3>
                  <p className="text-white/45 text-xs mt-1">{t("cart.orderSuccessSubtitle")}</p>
                </div>
                <div className="px-3 py-1 rounded-full text-[11px] font-bold"
                  style={{ background: "rgba(59,130,246,0.15)", color: "rgba(147,197,253,0.9)", border: "1px solid rgba(59,130,246,0.25)" }}>
                  {t("cart.orderId")}: {orderId}
                </div>
              </div>

              {/* Order summary */}
              <div className="px-5 pb-2 flex flex-col gap-1.5">
                <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-1">{t("cart.orderSummary")}</p>
                <div className="rounded-2xl overflow-hidden flex flex-col gap-px"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  {cart.map((ci, i) => (
                    <div key={ci.product.id}
                      className="flex items-center justify-between px-3 py-2 gap-2"
                      style={{ background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent" }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-[11px] font-semibold truncate">{ci.product.title}</p>
                        <p className="text-white/35 text-[9px]">×{ci.quantity} {ci.product.unit}</p>
                      </div>
                      <p className="text-[11px] font-bold shrink-0" style={{ color: "rgba(147,197,253,0.9)" }}>
                        {formatMoney(ci.effectivePrice * ci.quantity)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total + close */}
              <div className="px-5 pt-3 pb-6 flex flex-col gap-3">
                <div className="flex items-center justify-between px-3 py-2.5 rounded-2xl"
                  style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)" }}>
                  <span className="text-white/70 text-sm font-semibold">{t("cart.finalTotal")}</span>
                  <span className="font-extrabold text-base" style={{ color: "rgba(147,197,253,1)" }}>
                    {formatMoney(total)}
                  </span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
                  <ClipboardList className="w-3.5 h-3.5 shrink-0" style={{ color: "rgba(251,191,36,0.9)" }} />
                  <p className="text-[10px]" style={{ color: "rgba(251,191,36,0.8)" }}>
                    {t("cart.orderLocked")}
                  </p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={onClose}
                  className="w-full py-3 rounded-2xl font-bold text-sm"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    color: "rgba(255,255,255,0.8)",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}>
                  {t("cart.continueShopping")}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({
  product,
  cartQty,
  onAddToCart,
  onUpdateQty,
}: {
  product: BuyerProduct;
  cartQty: number;
  onAddToCart: (product: BuyerProduct, qty: number) => void;
  onUpdateQty: (productId: string, qty: number) => void;
}) {
  const { t } = useTranslation();
  const { formatMoney, currencyLabel } = useCurrency();
  const [showPricing, setShowPricing] = useState(false);
  const [inputQty, setInputQty] = useState(1);
  const [showQtySelector, setShowQtySelector] = useState(false);

  const hasPromo = product.promoPrice > 0;
  const discountPct = hasPromo
    ? Math.round((1 - product.promoPrice / product.standardPrice) * 100)
    : 0;

  const { price: effectivePrice, tier: activeTier } = computeEffectivePrice(product, inputQty);
  const basePrice = getBasePrice(product);
  const volumeSaving = inputQty > 0 ? (basePrice - effectivePrice) * inputQty : 0;

  const nextTier = product.volumeTiers
    .filter(t => t.minQty > inputQty)
    .sort((a, b) => a.minQty - b.minQty)[0];

  function handleAddOrUpdate() {
    if (cartQty > 0) {
      onUpdateQty(product.id, inputQty);
    } else {
      onAddToCart(product, inputQty);
    }
    setShowQtySelector(false);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.93, y: 14 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 8 }}
      transition={{ type: "spring", bounce: 0.22, duration: 0.42 }}
      className="rounded-2xl overflow-hidden flex flex-col relative"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: cartQty > 0
          ? "1px solid rgba(59,130,246,0.5)"
          : hasPromo
          ? "1px solid rgba(59,130,246,0.35)"
          : "1px solid rgba(255,255,255,0.09)",
        boxShadow: cartQty > 0
          ? "0 4px 24px rgba(0,0,0,0.25), 0 0 20px rgba(59,130,246,0.18)"
          : hasPromo
          ? "0 4px 24px rgba(0,0,0,0.25), 0 0 16px rgba(59,130,246,0.12)"
          : "0 4px 24px rgba(0,0,0,0.25)",
      }}
    >
      {/* In-cart badge */}
      {cartQty > 0 && (
        <motion.div
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          className="absolute top-2 ltr:right-2 rtl:left-2 z-10 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold text-white"
          style={{ background: "linear-gradient(135deg,#1D4ED8,#3B82F6)", boxShadow: "0 0 10px rgba(59,130,246,0.6)" }}
        >
          {cartQty}
        </motion.div>
      )}

      {/* Image area */}
      <div className="relative w-full aspect-[4/3] bg-white/5 flex items-center justify-center overflow-hidden">
        {product.images[0]
          ? <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
          : (
            <div className="flex flex-col items-center gap-2">
              <Package className="w-10 h-10 text-white/15" />
            </div>
          )
        }
        {hasPromo && (
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, type: "spring", bounce: 0.4 }}
            className="absolute top-2 ltr:left-2 rtl:right-2 flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-extrabold"
            style={{
              background: "linear-gradient(135deg, #1D4ED8 0%, #3B82F6 100%)",
              color: "white",
              boxShadow: "0 0 10px rgba(59,130,246,0.7), 0 0 20px rgba(59,130,246,0.3)",
            }}
          >
            <Sparkles className="w-2.5 h-2.5" />
            -{discountPct}% OFF
          </motion.div>
        )}
        {product.hasCert && (
          <div className="absolute bottom-2 ltr:left-2 rtl:right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold"
            style={{ background: "rgba(16,185,129,0.85)", color: "white", backdropFilter: "blur(6px)" }}>
            <ShieldCheck className="w-2.5 h-2.5" />
          </div>
        )}
        <div className="absolute bottom-2 ltr:right-2 rtl:left-2 px-2 py-0.5 rounded-full text-[9px] font-bold"
          style={{ background: "rgba(0,0,0,0.6)", color: "rgba(147,197,253,0.9)", backdropFilter: "blur(8px)" }}>
          {getCategoryName(product.category)}
        </div>
      </div>

      {/* Body */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        <h3 className="text-white font-bold text-sm leading-snug line-clamp-2">{product.title}</h3>
        {product.description && (
          <p className="text-white/45 text-[11px] leading-relaxed line-clamp-2">{product.description}</p>
        )}

        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <Store className="w-3 h-3 shrink-0" style={{ color: "rgba(147,197,253,0.7)" }} />
            <span className="text-[11px] font-semibold truncate" style={{ color: "rgba(147,197,253,0.85)" }}>
              {product.supplierName}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3 h-3 shrink-0" style={{ color: "rgba(110,231,183,0.65)" }} />
            <span className="text-[10px] truncate" style={{ color: "rgba(110,231,183,0.75)" }}>
              {getProvinceName(product.supplierProvince)}
            </span>
          </div>
        </div>

        {/* Price summary */}
        <div className="flex items-center justify-between gap-1.5 flex-wrap">
          <div>
            {hasPromo ? (
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-base font-extrabold" style={{ color: "rgba(147,197,253,1)" }}>
                  {formatMoney(product.promoPrice)}
                </span>
                <span className="text-[10px] text-white/30 line-through">{formatMoney(product.standardPrice)}</span>
              </div>
            ) : (
              <span className="text-base font-extrabold" style={{ color: "rgba(147,197,253,1)" }}>
                {formatMoney(product.standardPrice)}
              </span>
            )}
            <span className="text-[9px] text-white/35 block">{currencyLabel} / {product.unit}</span>
          </div>
          {product.wholesalePrice > 0 && (
            <div className="text-right">
              <span className="text-[11px] font-bold" style={{ color: "rgba(110,231,183,0.85)" }}>
                {formatMoney(product.wholesalePrice)}
              </span>
              <span className="text-[9px] text-white/30 block">{t("buyer.wholesaleShort")}</span>
            </div>
          )}
        </div>

        {/* Pricing details toggle */}
        <button
          onClick={() => setShowPricing(v => !v)}
          className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-xl text-[10px] font-semibold transition-colors"
          style={{ background: "rgba(255,255,255,0.04)", color: "rgba(147,197,253,0.7)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <span className="flex items-center gap-1.5">
            <Layers className="w-3 h-3" />
            {t("buyer.viewPricingDetails")}
          </span>
          {showPricing ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        <AnimatePresence>
          {showPricing && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="rounded-xl p-2.5 flex flex-col gap-1.5"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                {[
                  { label: t("pricing.standardPrice"),  value: product.standardPrice,  color: "rgba(147,197,253,1)"   },
                  { label: t("pricing.wholesalePrice"),  value: product.wholesalePrice, color: "rgba(110,231,183,0.9)" },
                  { label: t("pricing.promoPrice"),      value: product.promoPrice,     color: "rgba(251,191,36,0.9)"  },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="text-[10px] text-white/45">{row.label}</span>
                    <span className="text-[11px] font-bold" style={{ color: row.value ? row.color : "rgba(255,255,255,0.2)" }}>
                      {row.value ? formatMoney(row.value) : "—"}
                    </span>
                  </div>
                ))}
                {product.volumeTiers.length > 0 && (
                  <div className="mt-1 pt-1.5 border-t border-white/[0.06]">
                    <p className="text-[9px] font-bold mb-1 flex items-center gap-1" style={{ color: "rgba(167,139,250,0.9)" }}>
                      <Layers className="w-2.5 h-2.5" />{t("pricing.volumePricing")}
                    </p>
                    {product.volumeTiers.map((tier, i) => (
                      <div key={i} className="flex items-center justify-between text-[9px] py-0.5">
                        <span className="text-white/40">&gt; {tier.minQty.toLocaleString()} {product.unit}</span>
                        <span className="font-bold" style={{ color: "rgba(167,139,250,0.9)" }}>-{tier.discountPct}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Quantity Selector & Add to Cart ── */}
        <AnimatePresence mode="wait">
          {showQtySelector ? (
            <motion.div
              key="qty-selector"
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex flex-col gap-2 mt-1 p-2.5 rounded-xl"
                style={{ background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.2)" }}>
                {/* Qty row */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-white/50 flex-1">{t("cart.quantity")}</span>
                  <div className="flex items-center gap-1 rounded-xl overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}>
                    <button
                      onClick={() => setInputQty(q => Math.max(1, q - 1))}
                      className="w-7 h-7 flex items-center justify-center hover:bg-white/10 transition-colors"
                      disabled={inputQty <= 1}
                      style={{ opacity: inputQty <= 1 ? 0.35 : 1 }}
                    >
                      <Minus className="w-2.5 h-2.5 text-white/70" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={inputQty}
                      onChange={e => {
                        const v = parseInt(e.target.value);
                        if (!isNaN(v) && v >= 1) setInputQty(v);
                      }}
                      className="w-12 text-center text-white font-bold text-sm bg-transparent outline-none"
                      style={{ appearance: "textfield" } as React.CSSProperties}
                    />
                    <button
                      onClick={() => setInputQty(q => q + 1)}
                      className="w-7 h-7 flex items-center justify-center hover:bg-white/10 transition-colors"
                    >
                      <Plus className="w-2.5 h-2.5 text-white/70" />
                    </button>
                  </div>
                </div>

                {/* Dynamic price */}
                <div className="rounded-lg px-2.5 py-2 flex items-center justify-between"
                  style={{ background: "rgba(255,255,255,0.04)" }}>
                  <div>
                    <p className="text-[10px] text-white/40">{t("cart.effectivePrice")}</p>
                    <p className="text-sm font-extrabold" style={{ color: activeTier ? "rgba(167,139,250,1)" : "rgba(147,197,253,1)" }}>
                      {formatMoney(effectivePrice)}
                      <span className="text-[9px] text-white/30 font-normal ml-1">/ {product.unit}</span>
                    </p>
                    {activeTier && (
                      <p className="text-[9px]" style={{ color: "rgba(167,139,250,0.8)" }}>
                        -{activeTier.discountPct}% {t("cart.bulkDiscount")}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-white/40">{t("cart.lineTotal")}</p>
                    <p className="text-sm font-extrabold" style={{ color: "rgba(110,231,183,1)" }}>
                      {formatMoney(effectivePrice * inputQty)}
                    </p>
                    {volumeSaving > 0 && (
                      <p className="text-[9px]" style={{ color: "rgba(110,231,183,0.75)" }}>
                        -{formatMoney(volumeSaving)} {t("cart.saved")}
                      </p>
                    )}
                  </div>
                </div>

                {/* Next tier hint */}
                {nextTier && (
                  <p className="text-[9px] flex items-center gap-1" style={{ color: "rgba(167,139,250,0.65)" }}>
                    <BadgePercent className="w-2.5 h-2.5" />
                    {t("cart.nextTierHint", { qty: nextTier.minQty, pct: nextTier.discountPct, unit: product.unit })}
                  </p>
                )}

                {/* Action buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowQtySelector(false); setInputQty(1); }}
                    className="flex-1 py-1.5 rounded-xl text-[11px] font-semibold transition-colors"
                    style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    {t("common.cancel")}
                  </button>
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={handleAddOrUpdate}
                    className="flex-[2] py-1.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all"
                    style={{
                      background: "linear-gradient(135deg,#1D4ED8,#3B82F6)",
                      color: "white",
                      boxShadow: "0 0 12px rgba(59,130,246,0.35)",
                    }}
                  >
                    <ShoppingCart className="w-3 h-3" />
                    {cartQty > 0 ? t("cart.updateCart") : t("cart.addToCart")}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.button
              key="add-btn"
              whileTap={{ scale: 0.96 }}
              onClick={() => { setInputQty(cartQty > 0 ? cartQty : 1); setShowQtySelector(true); }}
              className="mt-auto w-full py-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all"
              style={
                cartQty > 0
                  ? {
                      background: "rgba(59,130,246,0.18)",
                      color: "rgba(147,197,253,1)",
                      border: "1px solid rgba(59,130,246,0.4)",
                    }
                  : {
                      background: "rgba(255,255,255,0.06)",
                      color: "rgba(255,255,255,0.6)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }
              }
            >
              <ShoppingCart className="w-3 h-3" />
              {cartQty > 0 ? `${t("cart.inCart")} (${cartQty})` : t("cart.addToCart")}
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Custom Select ────────────────────────────────────────────────────────────
function FilterSelect({
  value, onChange, placeholder, options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={cn(
          PAGE_SELECT,
          "appearance-none w-full pl-3 pr-8 py-2.5 text-xs font-semibold min-w-0",
          value && "text-primary border-primary/30 bg-blue-50 dark:bg-blue-500/15"
        )}
      >
        <option value="">{placeholder}</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown className="absolute ltr:right-2.5 rtl:left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none text-slate-400 dark:text-blue-300/50" />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Main Buyer Dashboard
// ════════════════════════════════════════════════════════════════════════════
export default function BuyerDashboard() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const sectorKey = useUserSectorKey();

  const products = useMemo(
    () => loadCatalog().filter(p => isBuyerCategoryAllowedForSector(p.category, sectorKey)),
    [sectorKey],
  );
  const [query,           setQuery]         = useState("");
  const [filterCategory,  setFilterCategory]= useState("");
  const [filterSupplier,  setFilterSupplier]= useState("");
  const [filterProvince,  setFilterProvince]= useState("");
  const [showFilters,     setShowFilters]   = useState(false);
  const [currentLang,     setCurrentLang]   = useState(i18n.language);

  // ── Cart state ──────────────────────────────────────────────────────────
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [orderConfirmOpen, setOrderConfirmOpen] = useState(false);
  const [confirmedCart, setConfirmedCart] = useState<CartItem[]>([]);

  const cartCount = cart.reduce((s, ci) => s + ci.quantity, 0);

  const addToCart = useCallback((product: BuyerProduct, qty: number) => {
    const { price, tier } = computeEffectivePrice(product, qty);
    setCart(prev => {
      const existing = prev.find(ci => ci.product.id === product.id);
      if (existing) {
        return prev.map(ci => ci.product.id === product.id
          ? { ...ci, quantity: qty, effectivePrice: price, appliedTier: tier }
          : ci
        );
      }
      return [...prev, { product, quantity: qty, effectivePrice: price, appliedTier: tier, basePrice: getBasePrice(product) }];
    });
  }, []);

  const updateCartQty = useCallback((productId: string, qty: number) => {
    setCart(prev => prev.map(ci => {
      if (ci.product.id !== productId) return ci;
      const { price, tier } = computeEffectivePrice(ci.product, qty);
      return { ...ci, quantity: qty, effectivePrice: price, appliedTier: tier };
    }));
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart(prev => prev.filter(ci => ci.product.id !== productId));
  }, []);

  const handlePlaceOrder = useCallback(() => {
    setConfirmedCart([...cart]);
    setCart([]);
    setCartOpen(false);
    setOrderConfirmOpen(true);
  }, [cart]);

  const handleOrderConfirmClose = useCallback(() => {
    setOrderConfirmOpen(false);
    setConfirmedCart([]);
  }, []);

  // ── Language ────────────────────────────────────────────────────────────
  const changeLang = (code: string) => {
    i18n.changeLanguage(code);
    setCurrentLang(code);
    const rtl = code === "ku" || code === "ar";
    document.documentElement.dir  = rtl ? "rtl" : "ltr";
    document.documentElement.lang = code;
  };

  // ── Filters ─────────────────────────────────────────────────────────────
  const supplierOptions = useMemo(() => {
    const names = [...new Set(products.map(p => p.supplierName))].sort();
    return names.map(n => ({ value: n, label: n }));
  }, [products]);

  const categoryOptions = useMemo(() => {
    const ids = [...new Set(products.map(p => p.category))];
    return ids.map(id => ({ value: id, label: getCategoryName(id) }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, currentLang]);

  const provinceOptions = useMemo(() => {
    const ids = [...new Set(products.map(p => p.supplierProvince))];
    return ids.map(id => ({ value: id, label: getProvinceName(id) }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, currentLang]);

  const activeFilterCount = [filterCategory, filterSupplier, filterProvince].filter(Boolean).length;

  const filtered = useMemo(() => {
    return products.filter(p => {
      const q = query.toLowerCase();
      const matchQuery = !q
        || p.title.toLowerCase().includes(q)
        || p.description.toLowerCase().includes(q)
        || p.supplierName.toLowerCase().includes(q);
      const matchCat  = !filterCategory || p.category === filterCategory;
      const matchSup  = !filterSupplier || p.supplierName === filterSupplier;
      const matchProv = !filterProvince || p.supplierProvince === filterProvince;
      return matchQuery && matchCat && matchSup && matchProv;
    });
  }, [products, query, filterCategory, filterSupplier, filterProvince]);

  const clearFilters = () => {
    setQuery(""); setFilterCategory(""); setFilterSupplier(""); setFilterProvince("");
  };

  const hasActiveFilters = query || filterCategory || filterSupplier || filterProvince;

  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(160deg, #020C1C 0%, #041428 60%, #030E22 100%)", paddingBottom: "72px" }}>

      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 50% at 15% 50%, rgba(29,78,216,0.2) 0%, transparent 70%)" }} />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 40% 35% at 85% 15%, rgba(6,182,212,0.12) 0%, transparent 65%)" }} />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 30% 30% at 70% 80%, rgba(124,58,237,0.08) 0%, transparent 60%)" }} />
      </div>

      {/* ── Header ────────────────────────────────────────────────── */}
      <header className="relative z-20 flex items-center justify-between px-4 sm:px-6 py-3.5 shrink-0"
        style={{ background: "rgba(2,12,28,0.75)", borderBottom: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(20px)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #1D4ED8, #3B82F6)", boxShadow: "0 0 14px rgba(59,130,246,0.4)" }}>
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-extrabold text-base tracking-tight">LinQi</span>
          <span className="hidden sm:block text-xs px-2 py-0.5 rounded-full font-semibold"
            style={{ background: "rgba(59,130,246,0.15)", color: "rgba(147,197,253,0.9)", border: "1px solid rgba(59,130,246,0.25)" }}>
            {t("role.buyer")}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Lang switcher */}
          <div className="flex items-center gap-1">
            {LANGUAGES.map(l => (
              <button key={l.code} onClick={() => changeLang(l.code)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: currentLang === l.code ? "rgba(59,130,246,0.22)" : "transparent",
                  color:      currentLang === l.code ? "rgba(147,197,253,1)"   : "rgba(255,255,255,0.45)",
                  border:     currentLang === l.code ? "1px solid rgba(59,130,246,0.4)" : "1px solid transparent",
                }}>
                {l.label}
              </button>
            ))}
          </div>

          {/* Cart button */}
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={() => setCartOpen(true)}
            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: cartCount > 0 ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.06)",
              color: cartCount > 0 ? "rgba(147,197,253,1)" : "rgba(255,255,255,0.55)",
              border: cartCount > 0 ? "1px solid rgba(59,130,246,0.4)" : "1px solid rgba(255,255,255,0.1)",
              boxShadow: cartCount > 0 ? "0 0 14px rgba(59,130,246,0.2)" : "none",
            }}
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden sm:inline">{t("cart.title")}</span>
            {cartCount > 0 && (
              <motion.span
                key={cartCount}
                initial={{ scale: 0.5 }} animate={{ scale: 1 }}
                transition={{ type: "spring", bounce: 0.5 }}
                className="absolute -top-1.5 ltr:-right-1.5 rtl:-left-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-extrabold text-white"
                style={{ background: "linear-gradient(135deg,#1D4ED8,#3B82F6)", boxShadow: "0 0 8px rgba(59,130,246,0.6)" }}
              >
                {cartCount}
              </motion.span>
            )}
          </motion.button>

          {/* User chip */}
          {user && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-bold"
                style={{ background: "rgba(59,130,246,0.25)", color: "rgba(147,197,253,1)" }}>
                {user.name.charAt(0)}
              </div>
              <span className="text-white/65 text-xs font-medium truncate max-w-[100px]">{user.name}</span>
            </div>
          )}

          <button onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{ background: "rgba(239,68,68,0.1)", color: "rgba(252,165,165,0.85)", border: "1px solid rgba(239,68,68,0.2)" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.22)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; }}>
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t("nav.logout")}</span>
          </button>
        </div>
      </header>

      {/* ── Main ──────────────────────────────────────────────────── */}
      <main className="relative z-10 flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">

        {/* Welcome hero */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="rounded-3xl overflow-hidden relative"
          style={{
            background: "linear-gradient(135deg, rgba(29,78,216,0.25) 0%, rgba(6,182,212,0.12) 60%, rgba(124,58,237,0.1) 100%)",
            border: "1px solid rgba(59,130,246,0.25)",
            boxShadow: "0 8px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)",
          }}>
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: "repeating-linear-gradient(45deg,rgba(255,255,255,.12) 0,rgba(255,255,255,.12) 1px,transparent 0,transparent 50%)", backgroundSize: "14px 14px" }} />
          <div className="relative px-5 sm:px-8 py-6 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-white font-extrabold text-xl sm:text-2xl leading-tight">
                {t("buyer.welcome")}{user?.name ? `, ${user.name.split(" ")[0]}` : ""}! 👋
              </h1>
              <p className="text-white/55 text-sm mt-1">{t("buyer.welcomeSubtitle")}</p>
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-blue-400" />
                  <span className="text-white font-bold text-sm">{products.length}</span>
                  <span className="text-white/45 text-xs">{t("buyer.totalProducts")}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-emerald-400" />
                  <span className="text-white font-bold text-sm">{supplierOptions.length}</span>
                  <span className="text-white/45 text-xs">{t("buyer.suppliers")}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  <span className="text-white font-bold text-sm">{products.filter(p => p.promoPrice > 0).length}</span>
                  <span className="text-white/45 text-xs">{t("buyer.offersAvailable")}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {/* Cart summary chip in hero */}
              {cartCount > 0 && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                  onClick={() => setCartOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl"
                  style={{
                    background: "rgba(59,130,246,0.18)",
                    border: "1px solid rgba(59,130,246,0.4)",
                    color: "rgba(147,197,253,1)",
                    boxShadow: "0 0 20px rgba(59,130,246,0.2)",
                  }}
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span className="text-sm font-bold">{cartCount} {t("cart.items")}</span>
                </motion.button>
              )}
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(59,130,246,0.2)", border: "1px solid rgba(59,130,246,0.35)", boxShadow: "0 0 20px rgba(59,130,246,0.2)" }}>
                <Star className="w-7 h-7 text-blue-400" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Search & Filter Bar ──────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="flex flex-col gap-3 sticky top-3 z-20">
          <div className="flex items-center gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute ltr:left-3.5 rtl:right-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: "rgba(147,197,253,0.6)" }} />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={t("buyer.searchPlaceholder")}
                className="w-full ltr:pl-10 rtl:pr-10 ltr:pr-10 rtl:pl-10 py-3 rounded-2xl text-sm"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: query ? "1px solid rgba(59,130,246,0.45)" : "1px solid rgba(255,255,255,0.1)",
                  color: "white",
                  outline: "none",
                  backdropFilter: "blur(16px)",
                  boxShadow: query ? "0 0 0 3px rgba(59,130,246,0.1)" : "none",
                  transition: "border 0.2s, box-shadow 0.2s",
                }}
              />
              {query && (
                <button onClick={() => setQuery("")}
                  className="absolute ltr:right-3 rtl:left-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/10">
                  <X className="w-3 h-3 text-white/50" />
                </button>
              )}
            </div>

            <motion.button whileTap={{ scale: 0.95 }}
              onClick={() => setShowFilters(v => !v)}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold relative shrink-0"
              style={{
                background: showFilters || activeFilterCount > 0 ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.06)",
                border: showFilters || activeFilterCount > 0 ? "1px solid rgba(59,130,246,0.4)" : "1px solid rgba(255,255,255,0.1)",
                color: showFilters || activeFilterCount > 0 ? "rgba(147,197,253,1)" : "rgba(255,255,255,0.6)",
                backdropFilter: "blur(16px)",
              }}>
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">{t("buyer.filters")}</span>
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ background: "linear-gradient(135deg, #1D4ED8, #3B82F6)", boxShadow: "0 0 8px rgba(59,130,246,0.5)" }}>
                  {activeFilterCount}
                </span>
              )}
            </motion.button>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-2xl p-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(59,130,246,0.15)", backdropFilter: "blur(16px)" }}>
                  <div>
                    <label className="block text-[10px] font-bold mb-1.5 flex items-center gap-1"
                      style={{ color: "rgba(147,197,253,0.7)" }}>
                      <Tag className="w-3 h-3" />{t("buyer.filterCategory")}
                    </label>
                    <FilterSelect value={filterCategory} onChange={setFilterCategory} placeholder={t("buyer.allCategories")} options={categoryOptions} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold mb-1.5 flex items-center gap-1"
                      style={{ color: "rgba(110,231,183,0.7)" }}>
                      <Store className="w-3 h-3" />{t("buyer.filterSupplier")}
                    </label>
                    <FilterSelect value={filterSupplier} onChange={setFilterSupplier} placeholder={t("buyer.allSuppliers")} options={supplierOptions} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold mb-1.5 flex items-center gap-1"
                      style={{ color: "rgba(167,139,250,0.7)" }}>
                      <MapPin className="w-3 h-3" />{t("buyer.filterProvince")}
                    </label>
                    <FilterSelect value={filterProvince} onChange={setFilterProvince} placeholder={t("buyer.allProvinces")} options={provinceOptions} />
                  </div>
                  {hasActiveFilters && (
                    <div className="sm:col-span-3 flex justify-end">
                      <button onClick={clearFilters}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
                        style={{ background: "rgba(239,68,68,0.1)", color: "rgba(252,165,165,0.85)", border: "1px solid rgba(239,68,68,0.2)" }}>
                        <X className="w-3 h-3" />{t("buyer.clearFilters")}
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Results summary ──────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5" style={{ color: "rgba(147,197,253,0.6)" }} />
            <span className="text-white/50 text-xs">
              {t("buyer.showingProducts", { count: filtered.length, total: products.length })}
            </span>
          </div>
          {hasActiveFilters && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {filterCategory && (
                <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: "rgba(59,130,246,0.15)", color: "rgba(147,197,253,0.9)", border: "1px solid rgba(59,130,246,0.3)" }}>
                  <Tag className="w-2.5 h-2.5" />{getCategoryName(filterCategory)}
                  <button onClick={() => setFilterCategory("")}><X className="w-2 h-2" /></button>
                </span>
              )}
              {filterSupplier && (
                <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: "rgba(16,185,129,0.12)", color: "rgba(110,231,183,0.9)", border: "1px solid rgba(16,185,129,0.25)" }}>
                  <Store className="w-2.5 h-2.5" />{filterSupplier}
                  <button onClick={() => setFilterSupplier("")}><X className="w-2 h-2" /></button>
                </span>
              )}
              {filterProvince && (
                <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: "rgba(124,58,237,0.12)", color: "rgba(167,139,250,0.9)", border: "1px solid rgba(124,58,237,0.25)" }}>
                  <MapPin className="w-2.5 h-2.5" />{getProvinceName(filterProvince)}
                  <button onClick={() => setFilterProvince("")}><X className="w-2 h-2" /></button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Product Grid ─────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-3xl flex flex-col items-center justify-center py-24 gap-4"
            style={{ background: "rgba(255,255,255,0.02)", border: "2px dashed rgba(255,255,255,0.07)" }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)" }}>
              <Search className="w-8 h-8 text-blue-400/40" />
            </div>
            <div className="text-center">
              <p className="text-white/50 font-semibold text-sm">{t("buyer.noResults")}</p>
              <p className="text-white/25 text-xs mt-1">{t("buyer.noResultsSubtitle")}</p>
            </div>
            {hasActiveFilters && (
              <button onClick={clearFilters}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
                style={{ background: "rgba(59,130,246,0.15)", color: "rgba(147,197,253,1)", border: "1px solid rgba(59,130,246,0.3)" }}>
                <X className="w-3.5 h-3.5" />{t("buyer.clearFilters")}
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div layout className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            <AnimatePresence>
              {filtered.map((p, i) => {
                const ci = cart.find(c => c.product.id === p.id);
                return (
                  <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03, type: "spring", bounce: 0.2 }}>
                    <ProductCard
                      product={p}
                      cartQty={ci?.quantity ?? 0}
                      onAddToCart={addToCart}
                      onUpdateQty={updateCartQty}
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </main>

      {/* ── Cart Drawer ───────────────────────────────────────────── */}
      <CartDrawer
        cart={cart}
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onUpdateQty={updateCartQty}
        onRemove={removeFromCart}
        onPlaceOrder={handlePlaceOrder}
      />

      {/* ── Order Confirmation Modal ──────────────────────────────── */}
      <OrderConfirmModal
        open={orderConfirmOpen}
        cart={confirmedCart}
        onClose={handleOrderConfirmClose}
      />
    </div>
  );
}
