import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  Store, Plus, X, Upload, ShieldCheck, Package, LogOut,
  Edit3, Camera, Award, Zap, Trash2,
  ImageOff, CheckCircle2, AlertTriangle, ShoppingCart,
  Warehouse, Pencil, Check, Tag, Sparkles, ToggleLeft,
  ToggleRight, ChevronDown, ChevronUp, DollarSign, Layers,
} from "lucide-react";
import i18n from "@/i18n";

// ─── Types ──────────────────────────────────────────────────────────────────
interface VolumeTier {
  minQty: number;
  discountPct: number;
}

interface Product {
  id: string;
  title: string;
  description: string;
  images: string[];
  certifications: string;
  hasCert: boolean;
  stock: number;
  unit: string;
  // Pricing
  standardPrice: number;
  wholesalePrice: number;
  promoPrice: number;
  volumeTiers: VolumeTier[];
  createdAt: number;
}

interface Promotion {
  id: string;
  name: string;
  discountPct: number;
  active: boolean;
  productIds: string[];
  createdAt: number;
}

interface StoreProfile {
  name: string;
  description: string;
  avatar: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const LOW_STOCK_THRESHOLD = 500;
const SIMULATE_SALE_AMOUNT = 2000;

// ─── LocalStorage helpers ────────────────────────────────────────────────────
const PRODUCTS_KEY    = "supplier_catalog_products";
const PROFILE_KEY     = "supplier_store_profile";
const PROMOTIONS_KEY  = "supplier_catalog_promotions";

function loadProducts(): Product[] {
  try {
    const raw = localStorage.getItem(PRODUCTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Product[];
      // Migrate old products missing pricing fields
      return parsed.map(p => ({
        ...p,
        standardPrice: p.standardPrice ?? 0,
        wholesalePrice: p.wholesalePrice ?? 0,
        promoPrice: p.promoPrice ?? 0,
        volumeTiers: p.volumeTiers ?? [],
      }));
    }
  } catch {}
  return [
    {
      id: "demo-1",
      title: "شیری سمارت — کارتۆن",
      description: "شیری پاستۆرکراو، ١٢ دانە لە هەر کارتۆنێکدا",
      images: [],
      certifications: "ISO 9001",
      hasCert: true,
      stock: 10000,
      unit: "کارتۆن",
      standardPrice: 25000,
      wholesalePrice: 22000,
      promoPrice: 20000,
      volumeTiers: [{ minQty: 100, discountPct: 10 }, { minQty: 500, discountPct: 15 }],
      createdAt: Date.now() - 86400000,
    },
    {
      id: "demo-2",
      title: "ئاوی مادێرال — بوتڵ",
      description: "ئاوی خواردنەوەی سروشتی",
      images: [],
      certifications: "",
      hasCert: false,
      stock: 420,
      unit: "بوتڵ",
      standardPrice: 1500,
      wholesalePrice: 1200,
      promoPrice: 0,
      volumeTiers: [{ minQty: 200, discountPct: 8 }],
      createdAt: Date.now() - 172800000,
    },
    {
      id: "demo-3",
      title: "شەکری سپی — کیلۆ",
      description: "شەکری سپی یەکجار خاوی خالص",
      images: [],
      certifications: "",
      hasCert: false,
      stock: 0,
      unit: "کیلۆ",
      standardPrice: 3000,
      wholesalePrice: 2500,
      promoPrice: 0,
      volumeTiers: [],
      createdAt: Date.now() - 259200000,
    },
  ];
}

function saveProducts(p: Product[]) { localStorage.setItem(PRODUCTS_KEY, JSON.stringify(p)); }

function loadPromotions(): Promotion[] {
  try { return JSON.parse(localStorage.getItem(PROMOTIONS_KEY) ?? "[]"); } catch { return []; }
}
function savePromotions(p: Promotion[]) { localStorage.setItem(PROMOTIONS_KEY, JSON.stringify(p)); }

function loadProfile(fallbackName: string): StoreProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { name: fallbackName, description: "", avatar: "" };
}
function saveProfile(p: StoreProfile) { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); }

// ─── Language switcher ───────────────────────────────────────────────────────
const LANGUAGES = [
  { code: "ku", label: "کوردی" },
  { code: "ar", label: "العربية" },
  { code: "en", label: "EN" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const INPUT_BASE: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "white",
  borderRadius: "14px",
  outline: "none",
  width: "100%",
  padding: "10px 14px",
  fontSize: "14px",
  transition: "border 0.2s ease, box-shadow 0.2s ease",
};
function focusStyle(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.currentTarget.style.border = "1px solid rgba(59,130,246,0.6)";
  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.12)";
}
function blurStyle(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.currentTarget.style.border = "1px solid rgba(255,255,255,0.10)";
  e.currentTarget.style.boxShadow = "none";
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function fmtPrice(n: number) {
  if (!n) return "—";
  return n.toLocaleString();
}

// ════════════════════════════════════════════════════════════════════════════
// Stock Badge
// ════════════════════════════════════════════════════════════════════════════
function StockBadge({ stock }: { stock: number }) {
  const { t } = useTranslation();
  if (stock === 0) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ background: "rgba(239,68,68,0.2)", color: "rgba(252,165,165,1)", border: "1px solid rgba(239,68,68,0.4)" }}>
      <X className="w-2.5 h-2.5" />{t("inventory.outOfStock")}
    </span>
  );
  if (stock < LOW_STOCK_THRESHOLD) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ background: "rgba(234,179,8,0.15)", color: "rgba(253,224,71,1)", border: "1px solid rgba(234,179,8,0.35)" }}>
      <AlertTriangle className="w-2.5 h-2.5" />{t("inventory.lowStock")}
    </span>
  );
  return null;
}

// ════════════════════════════════════════════════════════════════════════════
// Product Card
// ════════════════════════════════════════════════════════════════════════════
function ProductCard({
  product, promotions, onDelete, onUpdateStock,
}: {
  product: Product;
  promotions: Promotion[];
  onDelete: (id: string) => void;
  onUpdateStock: (id: string, newStock: number) => void;
}) {
  const { t } = useTranslation();
  const [editingStock, setEditingStock] = useState(false);
  const [stockInput, setStockInput] = useState(String(product.stock));
  const [saleAlert, setSaleAlert] = useState<string | null>(null);
  const [showPricing, setShowPricing] = useState(false);

  const isOutOfStock = product.stock === 0;
  const isLowStock   = product.stock > 0 && product.stock < LOW_STOCK_THRESHOLD;

  // Active promotions for this product
  const activePromos = promotions.filter(pr => pr.active && pr.productIds.includes(product.id));
  const topPromo = activePromos[0] ?? null;

  const handleSimulateSale = () => {
    if (isOutOfStock) return;
    const deduct = Math.min(SIMULATE_SALE_AMOUNT, product.stock);
    const newStock = product.stock - deduct;
    onUpdateStock(product.id, newStock);
    setSaleAlert(t("inventory.saleSimulated", { count: deduct }));
    setTimeout(() => setSaleAlert(null), 3000);
  };

  const commitStockEdit = () => {
    const val = parseInt(stockInput, 10);
    if (!isNaN(val) && val >= 0) onUpdateStock(product.id, val);
    else setStockInput(String(product.stock));
    setEditingStock(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.92, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{    opacity: 0, scale: 0.88, y: 8  }}
      transition={{ type: "spring", bounce: 0.25, duration: 0.45 }}
      className="relative rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: isOutOfStock
          ? "1px solid rgba(239,68,68,0.35)"
          : isLowStock
            ? "1px solid rgba(234,179,8,0.3)"
            : topPromo
              ? "1px solid rgba(59,130,246,0.4)"
              : "1px solid rgba(255,255,255,0.09)",
        boxShadow: topPromo ? "0 0 16px rgba(59,130,246,0.18)" : "0 4px 24px rgba(0,0,0,0.25)",
      }}
    >
      {/* Image */}
      <div className="relative w-full aspect-[4/3] bg-white/5 flex items-center justify-center overflow-hidden">
        {product.images[0]
          ? <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
          : <ImageOff className="w-10 h-10 text-white/20" />
        }

        {/* Out of stock overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)" }}>
            <span className="text-red-400 font-extrabold text-xs text-center px-2">{t("inventory.outOfStock")}</span>
          </div>
        )}

        {/* Active Promotion badge — top-right electric-blue glow */}
        {topPromo && (
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="absolute top-1.5 ltr:right-1.5 rtl:left-1.5 flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-extrabold"
            style={{
              background: "linear-gradient(135deg, #1D4ED8 0%, #2563EB 60%, #3B82F6 100%)",
              color: "white",
              boxShadow: "0 0 10px rgba(59,130,246,0.7), 0 0 20px rgba(59,130,246,0.3)",
              backdropFilter: "blur(8px)",
            }}
          >
            <Sparkles className="w-2.5 h-2.5" />
            -{topPromo.discountPct}% OFF
          </motion.div>
        )}

        {product.hasCert && (
          <div className="absolute top-2 ltr:right-2 rtl:left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
            style={{ background: "rgba(16,185,129,0.85)", color: "white", backdropFilter: "blur(8px)" }}
          >
            <ShieldCheck className="w-3 h-3" />{t("catalog.certified")}
          </div>
        )}
        {product.images.length > 1 && (
          <div className="absolute bottom-2 ltr:right-2 rtl:left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{ background: "rgba(0,0,0,0.55)", color: "rgba(200,220,255,0.9)" }}>
            +{product.images.length - 1}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        <p className="text-white font-bold text-sm leading-snug line-clamp-2">{product.title}</p>
        {product.description && (
          <p className="text-white/55 text-xs leading-relaxed line-clamp-2">{product.description}</p>
        )}
        {product.certifications && (
          <p className="text-xs flex items-center gap-1" style={{ color: "rgba(110,231,183,0.85)" }}>
            <Award className="w-3 h-3 shrink-0" />
            <span className="line-clamp-1">{product.certifications}</span>
          </p>
        )}

        {/* Active promo tag */}
        {topPromo && (
          <div className="flex items-center gap-1 flex-wrap">
            {activePromos.map(pr => (
              <span key={pr.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
                style={{ background: "rgba(59,130,246,0.18)", color: "rgba(147,197,253,1)", border: "1px solid rgba(59,130,246,0.35)" }}>
                <Tag className="w-2 h-2" />{pr.name}
              </span>
            ))}
          </div>
        )}

        {/* ── Pricing toggle ───────────────────────────────────────── */}
        <button
          onClick={() => setShowPricing(v => !v)}
          className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-colors"
          style={{ background: "rgba(255,255,255,0.04)", color: "rgba(147,197,253,0.8)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <span className="flex items-center gap-1.5">
            <DollarSign className="w-3 h-3" />
            {t("pricing.showPricing")}
          </span>
          {showPricing ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        <AnimatePresence>
          {showPricing && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="rounded-xl p-2.5 flex flex-col gap-2"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                {/* Price rows */}
                {[
                  { label: t("pricing.standardPrice"), value: product.standardPrice, color: "rgba(147,197,253,1)" },
                  { label: t("pricing.wholesalePrice"), value: product.wholesalePrice, color: "rgba(110,231,183,0.9)" },
                  { label: t("pricing.promoPrice"), value: product.promoPrice, color: "rgba(251,191,36,0.9)" },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-white/50 shrink-0">{row.label}</span>
                    <span className="text-[11px] font-bold" style={{ color: row.value ? row.color : "rgba(255,255,255,0.2)" }}>
                      {row.value ? `${fmtPrice(row.value)} ${t("common.currency")}` : "—"}
                    </span>
                  </div>
                ))}

                {/* Volume tiers */}
                {product.volumeTiers.length > 0 && (
                  <div className="mt-1 pt-1.5 border-t border-white/[0.06]">
                    <p className="text-[9px] font-bold flex items-center gap-1 mb-1" style={{ color: "rgba(167,139,250,0.9)" }}>
                      <Layers className="w-2.5 h-2.5" />
                      {t("pricing.volumePricing")}
                    </p>
                    {product.volumeTiers.map((tier, i) => (
                      <div key={i} className="flex items-center justify-between text-[9px] py-0.5">
                        <span className="text-white/45">&gt; {tier.minQty.toLocaleString()} {product.unit}</span>
                        <span className="font-bold" style={{ color: "rgba(167,139,250,0.9)" }}>-{tier.discountPct}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Stock section ─────────────────────────────────────────── */}
        <div className="rounded-xl p-2.5 flex flex-col gap-2"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center justify-between gap-1 flex-wrap">
            <span className="text-[10px] font-semibold flex items-center gap-1" style={{ color: "rgba(147,197,253,0.8)" }}>
              <Warehouse className="w-3 h-3" />{t("inventory.availableQty")}
            </span>
            <StockBadge stock={product.stock} />
          </div>

          <div className="flex items-center gap-1.5">
            {editingStock ? (
              <>
                <input type="number" min={0} value={stockInput}
                  onChange={e => setStockInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") commitStockEdit(); if (e.key === "Escape") { setEditingStock(false); setStockInput(String(product.stock)); } }}
                  autoFocus
                  className="flex-1 text-center text-sm font-bold rounded-lg px-2 py-1"
                  style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.5)", color: "white", outline: "none", minWidth: 0 }}
                />
                <span className="text-white/40 text-[10px] shrink-0">{product.unit}</span>
                <button onClick={commitStockEdit} className="w-6 h-6 flex items-center justify-center rounded-lg shrink-0"
                  style={{ background: "rgba(16,185,129,0.2)", color: "rgba(110,231,183,1)" }}>
                  <Check className="w-3 h-3" />
                </button>
              </>
            ) : (
              <>
                <span className="flex-1 text-center text-base font-extrabold"
                  style={{ color: isOutOfStock ? "rgba(252,165,165,1)" : isLowStock ? "rgba(253,224,71,1)" : "rgba(147,197,253,1)" }}>
                  {product.stock.toLocaleString()}
                </span>
                <span className="text-white/40 text-[10px] shrink-0">{product.unit}</span>
                <button onClick={() => { setEditingStock(true); setStockInput(String(product.stock)); }}
                  className="w-6 h-6 flex items-center justify-center rounded-lg shrink-0 transition-colors hover:bg-white/10"
                  style={{ color: "rgba(147,197,253,0.7)" }}>
                  <Pencil className="w-3 h-3" />
                </button>
              </>
            )}
          </div>

          <motion.button whileTap={isOutOfStock ? {} : { scale: 0.96 }}
            onClick={handleSimulateSale} disabled={isOutOfStock}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-bold transition-all"
            style={{
              background: isOutOfStock ? "rgba(255,255,255,0.04)" : "rgba(59,130,246,0.15)",
              color: isOutOfStock ? "rgba(255,255,255,0.25)" : "rgba(147,197,253,1)",
              border: isOutOfStock ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(59,130,246,0.3)",
              cursor: isOutOfStock ? "not-allowed" : "pointer",
            }}>
            <ShoppingCart className="w-3 h-3" />
            {t("inventory.simulateSale", { count: SIMULATE_SALE_AMOUNT.toLocaleString() })}
          </motion.button>

          <AnimatePresence>
            {saleAlert && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="text-[10px] font-semibold flex items-center gap-1 px-2 py-1 rounded-lg"
                style={{ background: "rgba(59,130,246,0.15)", color: "rgba(147,197,253,1)", border: "1px solid rgba(59,130,246,0.25)" }}>
                <CheckCircle2 className="w-3 h-3 shrink-0" />{saleAlert}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Delete */}
      <button onClick={() => onDelete(product.id)}
        className="absolute top-2 ltr:left-2 rtl:right-2 w-7 h-7 flex items-center justify-center rounded-full transition-all"
        style={{ background: "rgba(239,68,68,0.15)", color: "rgba(252,165,165,0.9)" }}
        onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,0.4)")}
        onMouseLeave={e => (e.currentTarget.style.background = "rgba(239,68,68,0.15)")}>
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Add Product Modal
// ════════════════════════════════════════════════════════════════════════════
function AddProductModal({ onClose, onAdd }: { onClose: () => void; onAdd: (p: Product) => void }) {
  const { t } = useTranslation();
  const [title, setTitle]         = useState("");
  const [description, setDesc]    = useState("");
  const [certifications, setCert] = useState("");
  const [images, setImages]       = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [stock, setStock]         = useState("10000");
  const [unit, setUnit]           = useState("");
  const [standardPrice, setStandardPrice]   = useState("");
  const [wholesalePrice, setWholesalePrice] = useState("");
  const [promoPrice, setPromoPrice]         = useState("");
  const [volumeTiers, setVolumeTiers]       = useState<VolumeTier[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files) return;
    setUploading(true);
    const results: string[] = [];
    for (const f of Array.from(files)) {
      if (!f.type.startsWith("image/")) continue;
      results.push(await fileToDataUrl(f));
    }
    setImages(prev => [...prev, ...results].slice(0, 6));
    setUploading(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }, [handleFiles]);
  const removeImage = (idx: number) => setImages(prev => prev.filter((_, i) => i !== idx));

  const addTier = () => setVolumeTiers(prev => [...prev, { minQty: 100, discountPct: 5 }]);
  const updateTier = (idx: number, field: keyof VolumeTier, val: string) => {
    setVolumeTiers(prev => prev.map((t, i) => i === idx ? { ...t, [field]: parseInt(val, 10) || 0 } : t));
  };
  const removeTier = (idx: number) => setVolumeTiers(prev => prev.filter((_, i) => i !== idx));

  const px = (v: string) => parseInt(v, 10) || 0;

  const submit = () => {
    if (!title.trim()) return;
    onAdd({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: title.trim(),
      description: description.trim(),
      certifications: certifications.trim(),
      hasCert: certifications.trim().length > 0,
      images,
      stock: px(stock),
      unit: unit.trim() || t("inventory.defaultUnit"),
      standardPrice: px(standardPrice),
      wholesalePrice: px(wholesalePrice),
      promoPrice: px(promoPrice),
      volumeTiers,
      createdAt: Date.now(),
    });
    onClose();
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ background: "rgba(2,12,28,0.85)", backdropFilter: "blur(12px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div
        initial={{ scale: 0.92, y: 24 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 16 }}
        transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl flex flex-col"
        style={{
          background: "linear-gradient(160deg, rgba(10,22,45,0.98) 0%, rgba(7,16,36,0.98) 100%)",
          border: "1px solid rgba(59,130,246,0.18)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
        }}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/[0.07]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(59,130,246,0.18)" }}>
              <Package className="w-4 h-4 text-blue-400" />
            </div>
            <span className="text-white font-bold text-base">{t("catalog.addProduct")}</span>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors">
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-5">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-white mb-1.5">{t("catalog.productTitle")} *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder={t("catalog.productTitlePlaceholder")}
              style={INPUT_BASE} onFocus={focusStyle} onBlur={blurStyle} />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-white mb-1.5">{t("catalog.productDescription")}</label>
            <textarea value={description} onChange={e => setDesc(e.target.value)}
              placeholder={t("catalog.productDescriptionPlaceholder")} rows={2}
              style={{ ...INPUT_BASE, resize: "none" }} onFocus={focusStyle} onBlur={blurStyle} />
          </div>

          {/* ── Pricing Section ──────────────────────────────────────── */}
          <div className="rounded-2xl p-4 flex flex-col gap-3"
            style={{ background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.15)" }}>
            <p className="text-xs font-bold flex items-center gap-2 text-white">
              <DollarSign className="w-3.5 h-3.5 text-blue-400" />
              {t("pricing.sectionTitle")}
            </p>

            {/* 3-col price grid */}
            <div className="grid grid-cols-1 gap-2.5">
              {[
                { label: t("pricing.standardPrice"), val: standardPrice, set: setStandardPrice, color: "rgba(147,197,253,0.7)" },
                { label: t("pricing.wholesalePrice"), val: wholesalePrice, set: setWholesalePrice, color: "rgba(110,231,183,0.7)" },
                { label: t("pricing.promoPrice"),     val: promoPrice,     set: setPromoPrice,     color: "rgba(251,191,36,0.7)" },
              ].map(({ label, val, set, color }) => (
                <div key={label}>
                  <label className="block text-[10px] font-semibold mb-1" style={{ color }}>{label}</label>
                  <div className="relative">
                    <input type="number" min={0} value={val} onChange={e => set(e.target.value)}
                      placeholder="0"
                      style={{ ...INPUT_BASE, paddingRight: "52px" }}
                      onFocus={focusStyle} onBlur={blurStyle} />
                    <span className="absolute ltr:right-3 rtl:left-3 top-1/2 -translate-y-1/2 text-[11px] text-white/35 pointer-events-none">
                      {t("common.currency")}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Volume tiers */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-bold flex items-center gap-1.5" style={{ color: "rgba(167,139,250,0.9)" }}>
                  <Layers className="w-3 h-3" />{t("pricing.volumePricing")}
                </label>
                <button onClick={addTier}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors"
                  style={{ background: "rgba(167,139,250,0.12)", color: "rgba(167,139,250,0.9)", border: "1px solid rgba(167,139,250,0.25)" }}>
                  <Plus className="w-2.5 h-2.5" />{t("pricing.addTier")}
                </button>
              </div>
              {volumeTiers.length === 0 && (
                <p className="text-[10px] text-white/30 italic">{t("pricing.noTiers")}</p>
              )}
              {volumeTiers.map((tier, i) => (
                <div key={i} className="flex items-center gap-2 mb-2">
                  <div className="flex-1 relative">
                    <input type="number" min={1} value={tier.minQty || ""}
                      onChange={e => updateTier(i, "minQty", e.target.value)}
                      placeholder={t("pricing.minQtyPlaceholder")}
                      className="w-full text-sm rounded-xl px-3 py-2"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white", outline: "none" }} />
                  </div>
                  <div className="w-20 relative">
                    <input type="number" min={1} max={100} value={tier.discountPct || ""}
                      onChange={e => updateTier(i, "discountPct", e.target.value)}
                      placeholder="%"
                      className="w-full text-sm rounded-xl px-3 py-2 pr-7"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white", outline: "none" }} />
                    <span className="absolute ltr:right-2.5 rtl:left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-white/35">%</span>
                  </div>
                  <button onClick={() => removeTier(i)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg shrink-0 transition-colors hover:bg-red-500/20"
                    style={{ color: "rgba(252,165,165,0.7)" }}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Stock & Unit */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-white mb-1.5 flex items-center gap-1.5">
                <Warehouse className="w-3.5 h-3.5 text-blue-400" />{t("inventory.initialStock")}
              </label>
              <input type="number" min={0} value={stock} onChange={e => setStock(e.target.value)}
                style={INPUT_BASE} onFocus={focusStyle} onBlur={blurStyle} />
            </div>
            <div className="w-28">
              <label className="block text-xs font-semibold text-white mb-1.5">{t("inventory.unit")}</label>
              <input value={unit} onChange={e => setUnit(e.target.value)}
                placeholder={t("inventory.unitPlaceholder")}
                style={INPUT_BASE} onFocus={focusStyle} onBlur={blurStyle} />
            </div>
          </div>

          {/* Photos */}
          <div>
            <label className="block text-xs font-semibold text-white mb-1.5">{t("catalog.uploadPhotos")}</label>
            <div className="rounded-2xl border-2 border-dashed flex flex-col items-center gap-2 py-4 px-4 cursor-pointer transition-all"
              style={{ borderColor: "rgba(59,130,246,0.3)", background: "rgba(59,130,246,0.04)" }}
              onClick={() => fileRef.current?.click()} onDrop={handleDrop} onDragOver={e => e.preventDefault()}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(59,130,246,0.6)")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(59,130,246,0.3)")}>
              <Upload className="w-5 h-5 text-blue-400" />
              <p className="text-white/70 text-xs text-center">{t("catalog.uploadHint")}</p>
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
                onChange={e => handleFiles(e.target.files)} />
            </div>
            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                {images.map((img, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden"
                    style={{ border: "1px solid rgba(255,255,255,0.09)" }}>
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full bg-black/60 hover:bg-red-500/80 transition-colors">
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {uploading && <p className="text-xs text-blue-400 mt-1.5">{t("catalog.uploading")}</p>}
          </div>

          {/* Certifications */}
          <div>
            <label className="block text-xs font-semibold text-white mb-1.5 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />{t("catalog.certifications")}
            </label>
            <input value={certifications} onChange={e => setCert(e.target.value)}
              placeholder={t("catalog.certificationsPlaceholder")}
              style={INPUT_BASE} onFocus={focusStyle} onBlur={blurStyle} />
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 pt-2 flex gap-2.5">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl font-semibold text-sm"
            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.08)" }}>
            {t("common.cancel")}
          </button>
          <button onClick={submit} disabled={!title.trim()}
            className="flex-[2] py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
            style={{
              background: title.trim() ? "linear-gradient(135deg, #1D4ED8 0%, #3B82F6 100%)" : "rgba(59,130,246,0.15)",
              color: title.trim() ? "white" : "rgba(255,255,255,0.4)",
              boxShadow: title.trim() ? "0 0 16px rgba(59,130,246,0.4)" : "none",
            }}>
            <Plus className="w-4 h-4" />{t("catalog.addProduct")}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Add / Edit Promotion Modal
// ════════════════════════════════════════════════════════════════════════════
function AddPromoModal({
  products, onClose, onAdd,
}: {
  products: Product[];
  onClose: () => void;
  onAdd: (p: Promotion) => void;
}) {
  const { t } = useTranslation();
  const [name, setName]           = useState("");
  const [discountPct, setDiscount]= useState("15");
  const [selectedIds, setSelected]= useState<string[]>([]);
  const [applyAll, setApplyAll]   = useState(false);

  const toggleProduct = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const submit = () => {
    if (!name.trim() || !discountPct) return;
    onAdd({
      id: `promo-${Date.now()}`,
      name: name.trim(),
      discountPct: parseInt(discountPct, 10) || 15,
      active: true,
      productIds: applyAll ? products.map(p => p.id) : selectedIds,
      createdAt: Date.now(),
    });
    onClose();
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ background: "rgba(2,12,28,0.88)", backdropFilter: "blur(14px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div
        initial={{ scale: 0.92, y: 24 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 16 }}
        transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl flex flex-col"
        style={{
          background: "linear-gradient(160deg, rgba(10,22,45,0.98) 0%, rgba(7,16,36,0.98) 100%)",
          border: "1px solid rgba(59,130,246,0.2)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6), 0 0 40px rgba(29,78,216,0.12)",
        }}>
        <div className="flex items-center justify-between p-5 border-b border-white/[0.07]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #1D4ED8, #3B82F6)", boxShadow: "0 0 10px rgba(59,130,246,0.4)" }}>
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-base">{t("pricing.createPromo")}</span>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/10">
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-white mb-1.5">{t("pricing.promoName")}</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder={t("pricing.promoNamePlaceholder")}
              style={INPUT_BASE} onFocus={focusStyle} onBlur={blurStyle} />
          </div>

          {/* Discount % */}
          <div>
            <label className="block text-xs font-semibold text-white mb-1.5">{t("pricing.discountPct")}</label>
            <div className="relative">
              <input type="number" min={1} max={99} value={discountPct} onChange={e => setDiscount(e.target.value)}
                style={{ ...INPUT_BASE, paddingRight: "40px" }}
                onFocus={focusStyle} onBlur={blurStyle} />
              <span className="absolute ltr:right-3.5 rtl:left-3.5 top-1/2 -translate-y-1/2 text-white/40 font-bold pointer-events-none">%</span>
            </div>
            {/* Preview badge */}
            {discountPct && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-white/40">{t("pricing.badgePreview")}:</span>
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold"
                  style={{
                    background: "linear-gradient(135deg, #1D4ED8, #3B82F6)",
                    color: "white",
                    boxShadow: "0 0 8px rgba(59,130,246,0.6)",
                  }}>
                  <Sparkles className="w-2.5 h-2.5" />
                  -{discountPct}% OFF
                </span>
              </div>
            )}
          </div>

          {/* Apply to products */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-white">{t("pricing.selectProducts")}</label>
              <button onClick={() => setApplyAll(v => !v)}
                className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors"
                style={{
                  background: applyAll ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.05)",
                  color: applyAll ? "rgba(147,197,253,1)" : "rgba(255,255,255,0.5)",
                  border: applyAll ? "1px solid rgba(59,130,246,0.4)" : "1px solid rgba(255,255,255,0.08)",
                }}>
                {applyAll ? <CheckCircle2 className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                {t("pricing.applyToAll")}
              </button>
            </div>

            {!applyAll && (
              <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                {products.map(p => {
                  const checked = selectedIds.includes(p.id);
                  return (
                    <button key={p.id} onClick={() => toggleProduct(p.id)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all"
                      style={{
                        background: checked ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.03)",
                        border: checked ? "1px solid rgba(59,130,246,0.35)" : "1px solid rgba(255,255,255,0.07)",
                      }}>
                      <div className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                        style={{ background: checked ? "rgba(59,130,246,0.8)" : "rgba(255,255,255,0.08)", border: checked ? "none" : "1px solid rgba(255,255,255,0.15)" }}>
                        {checked && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <span className="text-xs text-white/80 line-clamp-1 flex-1">{p.title}</span>
                      <span className="text-[10px] shrink-0" style={{ color: "rgba(110,231,183,0.7)" }}>
                        {p.standardPrice ? `${fmtPrice(p.standardPrice)} ${t("common.currency")}` : ""}
                      </span>
                    </button>
                  );
                })}
                {products.length === 0 && <p className="text-xs text-white/30 italic py-2 text-center">{t("catalog.emptyTitle")}</p>}
              </div>
            )}
          </div>
        </div>

        <div className="p-5 pt-2 flex gap-2.5">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl text-sm font-semibold"
            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.08)" }}>
            {t("common.cancel")}
          </button>
          <button onClick={submit}
            disabled={!name.trim() || (!applyAll && selectedIds.length === 0)}
            className="flex-[2] py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
            style={{
              background: (name.trim() && (applyAll || selectedIds.length > 0))
                ? "linear-gradient(135deg, #1D4ED8, #3B82F6)"
                : "rgba(59,130,246,0.12)",
              color: (name.trim() && (applyAll || selectedIds.length > 0)) ? "white" : "rgba(255,255,255,0.35)",
              boxShadow: (name.trim() && (applyAll || selectedIds.length > 0)) ? "0 0 16px rgba(59,130,246,0.4)" : "none",
            }}>
            <Sparkles className="w-4 h-4" />{t("pricing.launchPromo")}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Promotion Card
// ════════════════════════════════════════════════════════════════════════════
function PromoCard({
  promo, products, onToggle, onDelete,
}: {
  promo: Promotion;
  products: Product[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useTranslation();
  const appliedProducts = products.filter(p => promo.productIds.includes(p.id));

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
      className="rounded-2xl p-4 flex items-start gap-4"
      style={{
        background: promo.active ? "rgba(29,78,216,0.08)" : "rgba(255,255,255,0.03)",
        border: promo.active ? "1px solid rgba(59,130,246,0.3)" : "1px solid rgba(255,255,255,0.08)",
        boxShadow: promo.active ? "0 0 20px rgba(59,130,246,0.1)" : "none",
      }}>
      {/* Discount badge */}
      <div className="shrink-0 w-14 h-14 rounded-2xl flex flex-col items-center justify-center"
        style={{
          background: promo.active
            ? "linear-gradient(135deg, #1D4ED8 0%, #3B82F6 100%)"
            : "rgba(255,255,255,0.05)",
          boxShadow: promo.active ? "0 0 14px rgba(59,130,246,0.5)" : "none",
        }}>
        <span className="text-lg font-extrabold" style={{ color: promo.active ? "white" : "rgba(255,255,255,0.35)" }}>
          -{promo.discountPct}%
        </span>
        <span className="text-[8px] font-bold" style={{ color: promo.active ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.25)" }}>OFF</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-white font-bold text-sm">{promo.name}</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
            style={{
              background: promo.active ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.06)",
              color: promo.active ? "rgba(110,231,183,1)" : "rgba(255,255,255,0.35)",
              border: promo.active ? "1px solid rgba(16,185,129,0.3)" : "1px solid rgba(255,255,255,0.1)",
            }}>
            {promo.active ? t("pricing.activePromo") : t("pricing.inactivePromo")}
          </span>
        </div>
        <p className="text-white/45 text-xs mt-0.5">
          {t("pricing.appliedTo", { count: appliedProducts.length })}
        </p>
        {appliedProducts.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {appliedProducts.slice(0, 3).map(p => (
              <span key={p.id} className="text-[9px] px-1.5 py-0.5 rounded-full"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
                {p.title.slice(0, 18)}{p.title.length > 18 ? "…" : ""}
              </span>
            ))}
            {appliedProducts.length > 3 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}>
                +{appliedProducts.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button onClick={() => onToggle(promo.id)}
          className="transition-colors" title={promo.active ? t("pricing.deactivate") : t("pricing.activate")}>
          {promo.active
            ? <ToggleRight className="w-6 h-6" style={{ color: "rgba(59,130,246,0.9)" }} />
            : <ToggleLeft className="w-6 h-6" style={{ color: "rgba(255,255,255,0.3)" }} />
          }
        </button>
        <button onClick={() => onDelete(promo.id)}
          className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-red-500/20"
          style={{ color: "rgba(252,165,165,0.6)" }}>
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Edit Profile Modal (unchanged logic)
// ════════════════════════════════════════════════════════════════════════════
function EditProfileModal({ profile, onClose, onSave }: { profile: StoreProfile; onClose: () => void; onSave: (p: StoreProfile) => void }) {
  const { t } = useTranslation();
  const [name, setName]     = useState(profile.name);
  const [desc, setDesc]     = useState(profile.description);
  const [avatar, setAvatar] = useState(profile.avatar);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAvatar = async (files: FileList | null) => {
    if (!files?.[0]) return;
    setAvatar(await fileToDataUrl(files[0]));
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ background: "rgba(2,12,28,0.85)", backdropFilter: "blur(12px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div
        initial={{ scale: 0.92, y: 24 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 16 }}
        transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
        className="w-full max-w-md rounded-3xl flex flex-col"
        style={{
          background: "linear-gradient(160deg, rgba(10,22,45,0.98) 0%, rgba(7,16,36,0.98) 100%)",
          border: "1px solid rgba(59,130,246,0.18)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
        }}>
        <div className="flex items-center justify-between p-5 border-b border-white/[0.07]">
          <span className="text-white font-bold text-base">{t("catalog.editStore")}</span>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/10">
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div className="flex flex-col items-center gap-2">
            <div className="relative w-20 h-20 rounded-2xl flex items-center justify-center cursor-pointer overflow-hidden"
              style={{ background: "rgba(59,130,246,0.12)", border: "2px dashed rgba(59,130,246,0.4)" }}
              onClick={() => fileRef.current?.click()}>
              {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : <Camera className="w-7 h-7 text-blue-400" />}
              <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
                <Camera className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-xs text-white/40">{t("catalog.tapToChangeLogo")}</p>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handleAvatar(e.target.files)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white mb-1.5">{t("catalog.storeName")}</label>
            <input value={name} onChange={e => setName(e.target.value)} style={INPUT_BASE} onFocus={focusStyle} onBlur={blurStyle} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white mb-1.5">{t("catalog.storeDescription")}</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3}
              style={{ ...INPUT_BASE, resize: "none" }} onFocus={focusStyle} onBlur={blurStyle}
              placeholder={t("catalog.storeDescriptionPlaceholder")} />
          </div>
        </div>
        <div className="p-5 pt-0 flex gap-2.5">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl text-sm font-semibold"
            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.08)" }}>
            {t("common.cancel")}
          </button>
          <button onClick={() => { onSave({ name, description: desc, avatar }); onClose(); }}
            className="flex-[2] py-3 rounded-2xl text-sm font-bold"
            style={{ background: "linear-gradient(135deg, #1D4ED8, #3B82F6)", color: "white", boxShadow: "0 0 14px rgba(59,130,246,0.4)" }}>
            {t("common.save")}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Main Supplier Catalog Page
// ════════════════════════════════════════════════════════════════════════════
export default function SupplierCatalog() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  const [products,    setProducts]    = useState<Product[]>(loadProducts);
  const [promotions,  setPromotions]  = useState<Promotion[]>(loadPromotions);
  const [profile,     setProfile]     = useState<StoreProfile>(() => loadProfile(user?.name ?? "My Store"));
  const [showAdd,     setShowAdd]     = useState(false);
  const [showEdit,    setShowEdit]    = useState(false);
  const [showAddPromo,setShowAddPromo]= useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [currentLang, setCurrentLang] = useState(i18n.language);

  const changeLang = (code: string) => {
    i18n.changeLanguage(code);
    setCurrentLang(code);
    const rtl = code === "ku" || code === "ar";
    document.documentElement.dir  = rtl ? "rtl" : "ltr";
    document.documentElement.lang = code;
  };

  const handleAddProduct = (p: Product) => {
    const updated = [p, ...products];
    setProducts(updated); saveProducts(updated);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2500);
  };

  const handleDeleteProduct = (id: string) => {
    const updated = products.filter(p => p.id !== id);
    setProducts(updated); saveProducts(updated);
    // Remove from promotions too
    const updatedPromos = promotions.map(pr => ({ ...pr, productIds: pr.productIds.filter(pid => pid !== id) }));
    setPromotions(updatedPromos); savePromotions(updatedPromos);
  };

  const handleUpdateStock = (id: string, newStock: number) => {
    const updated = products.map(p => p.id === id ? { ...p, stock: newStock } : p);
    setProducts(updated); saveProducts(updated);
  };

  const handleSaveProfile = (p: StoreProfile) => { setProfile(p); saveProfile(p); };

  const handleAddPromo = (p: Promotion) => {
    const updated = [p, ...promotions];
    setPromotions(updated); savePromotions(updated);
  };

  const handleTogglePromo = (id: string) => {
    const updated = promotions.map(p => p.id === id ? { ...p, active: !p.active } : p);
    setPromotions(updated); savePromotions(updated);
  };

  const handleDeletePromo = (id: string) => {
    const updated = promotions.filter(p => p.id !== id);
    setPromotions(updated); savePromotions(updated);
  };

  const outOfStockCount = products.filter(p => p.stock === 0).length;
  const lowStockCount   = products.filter(p => p.stock > 0 && p.stock < LOW_STOCK_THRESHOLD).length;
  const activePromoCount = promotions.filter(p => p.active).length;

  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(160deg, #020C1C 0%, #041428 60%, #030E22 100%)", paddingBottom: "72px" }}>

      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 50% at 15% 50%, rgba(29,78,216,0.22) 0%, transparent 70%)" }} />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 40% 35% at 90% 10%, rgba(6,182,212,0.14) 0%, transparent 70%)" }} />
      </div>

      {/* ── Top nav ──────────────────────────────────────────────────── */}
      <header className="relative z-10 flex items-center justify-between px-4 sm:px-6 py-3.5 shrink-0"
        style={{ background: "rgba(2,12,28,0.7)", borderBottom: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(20px)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #1D4ED8, #3B82F6)", boxShadow: "0 0 14px rgba(59,130,246,0.4)" }}>
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-extrabold text-base tracking-tight">LinQi</span>
          <span className="hidden sm:block text-xs px-2 py-0.5 rounded-full font-semibold"
            style={{ background: "rgba(59,130,246,0.15)", color: "rgba(147,197,253,0.9)", border: "1px solid rgba(59,130,246,0.25)" }}>
            {t("role.supplier")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {LANGUAGES.map(l => (
              <button key={l.code} onClick={() => changeLang(l.code)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: currentLang === l.code ? "rgba(59,130,246,0.22)" : "transparent",
                  color:      currentLang === l.code ? "rgba(147,197,253,1)" : "rgba(255,255,255,0.45)",
                  border:     currentLang === l.code ? "1px solid rgba(59,130,246,0.4)" : "1px solid transparent",
                }}>{l.label}</button>
            ))}
          </div>
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

      {/* ── Page body ────────────────────────────────────────────────── */}
      <main className="relative z-10 flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">

        {/* Store Profile */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="rounded-3xl overflow-hidden"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.09)", boxShadow: "0 8px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)" }}>
          <div className="h-16 w-full relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, #1D4ED8 0%, #2563EB 40%, #0EA5E9 100%)" }}>
            <div className="absolute inset-0 opacity-20"
              style={{ backgroundImage: "repeating-linear-gradient(45deg,rgba(255,255,255,.1) 0,rgba(255,255,255,.1) 1px,transparent 0,transparent 50%)", backgroundSize: "12px 12px" }} />
          </div>
          <div className="px-5 pb-5">
            <div className="flex items-end gap-4 -mt-8">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 border-2"
                style={{ background: "rgba(29,78,216,0.25)", borderColor: "rgba(59,130,246,0.4)", boxShadow: "0 4px 14px rgba(0,0,0,0.4)" }}>
                {profile.avatar ? <img src={profile.avatar} alt="store" className="w-full h-full object-cover" /> : <Store className="w-7 h-7 text-blue-400" />}
              </div>
              <div className="flex-1 min-w-0 pt-8">
                <h1 className="text-white font-extrabold text-lg leading-tight truncate">{profile.name}</h1>
                {profile.description
                  ? <p className="text-white/50 text-xs mt-0.5 line-clamp-2">{profile.description}</p>
                  : <p className="text-white/30 text-xs mt-0.5 italic">{t("catalog.addStoreDesc")}</p>
                }
              </div>
              <button onClick={() => setShowEdit(true)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all mt-8"
                style={{ background: "rgba(59,130,246,0.14)", color: "rgba(147,197,253,0.9)", border: "1px solid rgba(59,130,246,0.25)" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(59,130,246,0.28)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(59,130,246,0.14)"; }}>
                <Edit3 className="w-3.5 h-3.5" />{t("catalog.editStore")}
              </button>
            </div>
            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-white/[0.06]">
              <div className="flex items-center gap-1.5"><Package className="w-4 h-4 text-blue-400" />
                <span className="text-white font-bold text-sm">{products.length}</span>
                <span className="text-white/50 text-xs">{t("catalog.products")}</span>
              </div>
              <div className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-white font-bold text-sm">{products.filter(p => p.hasCert).length}</span>
                <span className="text-white/50 text-xs">{t("catalog.certified")}</span>
              </div>
              {activePromoCount > 0 && (
                <div className="flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-blue-400" />
                  <span className="text-white font-bold text-sm">{activePromoCount}</span>
                  <span className="text-white/50 text-xs">{t("pricing.activePromos")}</span>
                </div>
              )}
              {outOfStockCount > 0 && (
                <div className="flex items-center gap-1.5"><X className="w-4 h-4 text-red-400" />
                  <span className="text-red-300 font-bold text-sm">{outOfStockCount}</span>
                  <span className="text-white/50 text-xs">{t("inventory.outOfStock")}</span>
                </div>
              )}
              {lowStockCount > 0 && (
                <div className="flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-300 font-bold text-sm">{lowStockCount}</span>
                  <span className="text-white/50 text-xs">{t("inventory.lowStock")}</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Inventory alert banner */}
        <AnimatePresence>
          {(outOfStockCount > 0 || lowStockCount > 0) && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="rounded-2xl px-4 py-3 flex items-start gap-3"
              style={{
                background: outOfStockCount > 0 ? "rgba(239,68,68,0.08)" : "rgba(234,179,8,0.08)",
                border: outOfStockCount > 0 ? "1px solid rgba(239,68,68,0.25)" : "1px solid rgba(234,179,8,0.25)",
              }}>
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: outOfStockCount > 0 ? "rgba(252,165,165,1)" : "rgba(253,224,71,1)" }} />
              <div>
                {outOfStockCount > 0 && <p className="text-xs font-bold text-red-300">{t("inventory.outOfStockAlert", { count: outOfStockCount })}</p>}
                {lowStockCount > 0 && <p className="text-xs font-semibold text-yellow-300 mt-0.5">{t("inventory.lowStockAlert", { count: lowStockCount, threshold: LOW_STOCK_THRESHOLD })}</p>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Promotions Section ──────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-3xl overflow-hidden"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(59,130,246,0.15)" }}>
          {/* Section header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]"
            style={{ background: "rgba(29,78,216,0.06)" }}>
            <div>
              <h2 className="text-white font-extrabold text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                {t("pricing.promotionsTitle")}
              </h2>
              <p className="text-white/40 text-xs mt-0.5">{t("pricing.promotionsSubtitle")}</p>
            </div>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => setShowAddPromo(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-sm"
              style={{
                background: "linear-gradient(135deg, #1D4ED8, #3B82F6)",
                color: "white",
                boxShadow: "0 0 14px rgba(59,130,246,0.35)",
                border: "1px solid rgba(99,179,255,0.25)",
              }}>
              <Plus className="w-4 h-4" />{t("pricing.createPromo")}
            </motion.button>
          </div>

          <div className="p-4 flex flex-col gap-3">
            {promotions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)" }}>
                  <Tag className="w-7 h-7 text-blue-400/50" />
                </div>
                <p className="text-white/40 text-sm font-semibold">{t("pricing.noPromos")}</p>
                <p className="text-white/25 text-xs">{t("pricing.noPromosSubtitle")}</p>
              </div>
            ) : (
              <AnimatePresence>
                {promotions.map(pr => (
                  <PromoCard key={pr.id} promo={pr} products={products} onToggle={handleTogglePromo} onDelete={handleDeletePromo} />
                ))}
              </AnimatePresence>
            )}
          </div>
        </motion.div>

        {/* ── Catalog section ────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white font-extrabold text-base">{t("catalog.myProducts")}</h2>
              <p className="text-white/45 text-xs mt-0.5">{t("catalog.myProductsSubtitle")}</p>
            </div>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm"
              style={{
                background: "linear-gradient(135deg, #1D4ED8 0%, #2563EB 60%, #3B82F6 100%)",
                color: "white",
                boxShadow: "0 0 18px rgba(59,130,246,0.4), 0 4px 12px rgba(0,0,0,0.3)",
                border: "1px solid rgba(99,179,255,0.3)",
              }}>
              <Plus className="w-4 h-4" />{t("catalog.addProduct")}
            </motion.button>
          </div>

          <AnimatePresence>
            {showSuccess && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="flex items-center gap-2.5 px-4 py-3 rounded-2xl text-sm font-semibold"
                style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", color: "rgba(110,231,183,1)" }}>
                <CheckCircle2 className="w-4 h-4 shrink-0" />{t("catalog.productAdded")}
              </motion.div>
            )}
          </AnimatePresence>

          {products.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="rounded-3xl flex flex-col items-center justify-center py-20 gap-4"
              style={{ background: "rgba(255,255,255,0.02)", border: "2px dashed rgba(255,255,255,0.08)" }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)" }}>
                <Package className="w-8 h-8 text-blue-400/60" />
              </div>
              <div className="text-center">
                <p className="text-white/60 font-semibold text-sm">{t("catalog.emptyTitle")}</p>
                <p className="text-white/30 text-xs mt-1">{t("catalog.emptySubtitle")}</p>
              </div>
              <button onClick={() => setShowAdd(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm"
                style={{ background: "rgba(59,130,246,0.18)", color: "rgba(147,197,253,1)", border: "1px solid rgba(59,130,246,0.3)" }}>
                <Plus className="w-4 h-4" />{t("catalog.addFirstProduct")}
              </button>
            </motion.div>
          ) : (
            <motion.div layout className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              <AnimatePresence>
                {products.map(p => (
                  <ProductCard key={p.id} product={p} promotions={promotions}
                    onDelete={handleDeleteProduct} onUpdateStock={handleUpdateStock} />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {showAdd      && <AddProductModal  onClose={() => setShowAdd(false)} onAdd={handleAddProduct} />}
        {showEdit     && <EditProfileModal profile={profile} onClose={() => setShowEdit(false)} onSave={handleSaveProfile} />}
        {showAddPromo && <AddPromoModal    products={products} onClose={() => setShowAddPromo(false)} onAdd={handleAddPromo} />}
      </AnimatePresence>
    </div>
  );
}
