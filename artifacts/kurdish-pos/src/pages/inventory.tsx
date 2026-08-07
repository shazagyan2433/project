import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useCreateProduct, useUpdateProduct, useDeleteProduct,
} from "@workspace/api-client-react";
import { useSectorFilteredProducts, useUserSectorKey, useSectorLabel } from "@/hooks/useSectorScope";
import { getSectorCategoryOptions, getSectorCategoryChips, type CatKey } from "@/lib/industries";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import { resizeImageToBase64 } from "@/lib/imageUtils";
import { ProductImage } from "@/components/ProductImage";
import { formatCurrency } from "@/lib/utils";
import {
  Warehouse, Package, AlertTriangle, TrendingDown, Search,
  CheckCircle2, Plus, Edit2, Trash2, X, ImageOff, ImagePlus,
  QrCode, RefreshCw, DollarSign, Loader2, ArrowUpRight, Store,
} from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

/* ─── Constants ─────────────────────────────────────────────────── */
const LOW_STOCK = 5;


const UNITS = ["دانە","کیلۆ","لیتر","کارتۆن","بۆکس","پاکەت","دەبە","کیسە","مەتر","گرام"];

const STATUS_FILTERS = [
  { v: "all", l: "هەموو" },
  { v: "ok",  l: "باش"   },
  { v: "low", l: "کەم"   },
  { v: "out", l: "بڕاوە" },
] as const;

/* ─── Schema ─────────────────────────────────────────────────────── */
const productSchema = z.object({
  name:      z.string().min(1, "ناوی کاڵا پێویستە"),
  category:  z.string().optional(),
  costPrice: z.coerce.number().min(0),
  price:     z.coerce.number().min(0, "نرخ پێویستە"),
  stock:     z.coerce.number().int().min(0),
  unit:      z.string().min(1),
  barcode:   z.string().optional(),
  supplier:  z.string().optional(),
});
type FormData = z.infer<typeof productSchema>;

/* ─── Helpers ────────────────────────────────────────────────────── */
function getStatus(stock: number) {
  if (stock === 0)        return "out";
  if (stock < LOW_STOCK)  return "low";
  return "ok";
}

function catLabel(key: string | null | undefined, options: Array<{ key: string; label: string }>) {
  return options.find(c => c.key === key)?.label ?? key ?? "—";
}

/* ─── Sub-components ────────────────────────────────────────────── */
function StatusBadge({ stock }: { stock: number }) {
  const s = {
    ok:  { label: "ئامادەیە",  color: "#34D399", bg: "rgba(52,211,153,0.12)"  },
    low: { label: "ستۆکی کەم", color: "#FBBF24", bg: "rgba(251,191,36,0.12)"  },
    out: { label: "بڕاوەتەوە", color: "#F87171", bg: "rgba(248,113,113,0.12)" },
  }[getStatus(stock)];
  return (
    <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap"
      style={{ color: s.color, background: s.bg }}>
      {s.label}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
export default function Inventory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isAdmin, permissions } = useAuth();
  const { rate, usdToIqd, iqdToUsd } = useExchangeRate();
  const { t } = useTranslation("common");
  const sectorLabel = useSectorLabel();

  const sectorKey = useUserSectorKey();
  const sectorCategories = getSectorCategoryOptions(sectorKey);
  const sectorCategoryChips = getSectorCategoryChips(sectorKey);

  const { data: products = [], isLoading, refetch } = useSectorFilteredProducts();
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation  = useDeleteProduct();

  /* ─── Local UI state ──────────────────────────────────────────── */
  const [search,       setSearch]       = useState("");
  const [catFilter,    setCatFilter]    = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all"|"ok"|"low"|"out">("all");
  const [isModalOpen,  setIsModalOpen]  = useState(false);
  const [editingId,    setEditingId]    = useState<number | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageProcessing, setImageProcessing] = useState(false);
  const [usdInput,     setUsdInput]     = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (catFilter !== "all" && !sectorCategoryChips.includes(catFilter as CatKey)) {
      setCatFilter("all");
    }
  }, [sectorCategoryChips, catFilter]);

  const form = useForm<FormData>({
    resolver: zodResolver(productSchema),
    defaultValues: { name: "", category: "", costPrice: 0, price: 0, stock: 0, unit: "دانە", barcode: "", supplier: "" },
  });

  /* ─── Derived data ────────────────────────────────────────────── */
  const total    = products.length;
  const outCount = products.filter(p => p.stock === 0).length;
  const lowCount = products.filter(p => p.stock > 0 && p.stock < LOW_STOCK).length;
  const okCount  = products.filter(p => p.stock >= LOW_STOCK).length;

  const usedCatKeys = sectorCategoryChips.filter(k =>
    products.some(p => p.category === k),
  );

  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    const matchSearch  = p.name.toLowerCase().includes(q) || (p.barcode ?? "").toLowerCase().includes(q);
    const matchCat     = catFilter    === "all" || p.category === catFilter;
    const matchStatus  = statusFilter === "all" || getStatus(p.stock) === statusFilter;
    return matchSearch && matchCat && matchStatus;
  });

  /* ─── Permissions ─────────────────────────────────────────────── */
  const canEdit      = isAdmin || permissions.canEditStock;
  const canDelete    = isAdmin || permissions.canDeleteData;
  const canViewProfit = isAdmin || permissions.canViewProfit;
  const isPending    = createMutation.isPending || updateMutation.isPending;

  /* ─── Handlers ────────────────────────────────────────────────── */
  const openAdd = () => {
    setEditingId(null);
    setImagePreview(null);
    setUsdInput("");
    form.reset({ name: "", category: "", costPrice: 0, price: 0, stock: 0, unit: "دانە", barcode: "", supplier: "" });
    setIsModalOpen(true);
  };

  const openEdit = (p: any) => {
    setEditingId(p.id);
    setImagePreview(p.image ?? null);
    const iqd = parseFloat(p.price);
    setUsdInput(iqd > 0 ? iqdToUsd(iqd).toFixed(2) : "");
    form.reset({
      name:      p.name,
      category:  p.category ?? "",
      costPrice: parseFloat(p.costPrice ?? "0"),
      price:     parseFloat(p.price),
      stock:     p.stock,
      unit:      p.unit,
      barcode:   p.barcode  ?? "",
      supplier:  p.supplier ?? "",
    });
    setIsModalOpen(true);
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageProcessing(true);
    try {
      const b64 = await resizeImageToBase64(file);
      setImagePreview(b64);
    } catch {
      toast({ title: "وێنە نەتوانرا باربکرێت", variant: "destructive" });
    } finally {
      setImageProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = (id: number, name: string) => {
    if (!confirm(`دڵنیای لە سڕینەوەی "${name}"؟`)) return;
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/products"] });
        toast({ title: "کاڵاکە سڕایەوە" });
      },
    });
  };

  const onSubmit = (data: FormData) => {
    const payload: any = {
      ...data,
      image:    imagePreview ?? null,
      category: data.category  || null,
      barcode:  data.barcode   || null,
      supplier: data.supplier  || null,
    };
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/products"] });

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload }, {
        onSuccess: () => { invalidate(); toast({ title: "کاڵاکە نوێکرایەوە" }); setIsModalOpen(false); },
      });
    } else {
      createMutation.mutate({ data: payload }, {
        onSuccess: () => { invalidate(); toast({ title: "کاڵای نوێ زیادکرا ✓" }); setIsModalOpen(false); },
      });
    }
  };

  /* ─── Shared input style ──────────────────────────────────────── */
  const inputCls = "w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all text-white/85";
  const inputSty = (err?: boolean): React.CSSProperties => ({
    background: "rgba(255,255,255,0.05)",
    border: `1px solid ${err ? "#F87171" : "rgba(255,255,255,0.1)"}`,
  });

  /* ─── Render ──────────────────────────────────────────────────── */
  return (
    <div className="space-y-6 pb-8" dir="rtl">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)" }}>
            <Warehouse className="w-5 h-5" style={{ color: "#10B981" }} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white">{t("pageTitles.inventory", { sector: sectorLabel })}</h1>
            <p className="text-xs text-white/40">{t("pageTitles.inventorySubtitle", { sector: sectorLabel })}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-white/10"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}
            title="نوێکردنەوە">
            <RefreshCw className="w-4 h-4" />
          </button>
          {canEdit && (
            <button onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:brightness-110"
              style={{ background: "rgba(16,185,129,0.2)", border: "1px solid rgba(16,185,129,0.4)", color: "#34D399" }}>
              <Plus className="w-4 h-4" />
              زیادکردنی کاڵای نوێ
            </button>
          )}
        </div>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "کۆی کاڵا",   value: total,    sub: "SKU تۆمارکراو",          icon: Package,      color: "#3B82F6", bg: "rgba(59,130,246,0.12)"   },
          { label: "بڕاوەتەوە",  value: outCount, sub: "پێویستی دابینکردنە",     icon: TrendingDown, color: "#EF4444", bg: "rgba(239,68,68,0.12)"    },
          { label: "ستۆکی کەم",  value: lowCount, sub: "لەژێر ئاستی هشیارکەر",  icon: AlertTriangle,color: "#F59E0B", bg: "rgba(245,158,11,0.12)"   },
          { label: "باش",         value: okCount,  sub: `${total > 0 ? Math.round(okCount / total * 100) : 0}% ئامادەیە`, icon: CheckCircle2, color: "#10B981", bg: "rgba(16,185,129,0.12)" },
        ].map((s, i) => (
          <motion.div key={i}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className="rounded-2xl p-4"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: s.bg }}>
                <s.icon className="w-[18px] h-[18px]" style={{ color: s.color }} />
              </div>
              <ArrowUpRight className="w-4 h-4 text-white/15" />
            </div>
            <p className="text-2xl font-extrabold text-white">{s.value.toLocaleString()}</p>
            <p className="text-[11px] text-white/50 mt-0.5">{s.label}</p>
            <p className="text-[10px] mt-1" style={{ color: s.color }}>{s.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Filters ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        {/* Search */}
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="گەڕان بە ناو، دابینکەر، یان بارکۆد..."
            className="w-full ps-9 pe-4 py-2.5 rounded-xl text-sm text-white/80 placeholder-white/25 outline-none"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }} />
        </div>
        {/* Category dropdown */}
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl text-sm font-bold outline-none min-w-[160px]"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: catFilter !== "all" ? "#60A5FA" : "rgba(255,255,255,0.4)",
          }}>
          <option value="all">هەموو کاتاگۆریەکان</option>
          {sectorCategories.map(c => (
            <option key={c.key} value={c.key}>{c.label}</option>
          ))}
        </select>
        {/* Status pills */}
        <div className="flex gap-2">
          {STATUS_FILTERS.map(({ v, l }) => (
            <button key={v} onClick={() => setStatusFilter(v)}
              className="px-3 py-2 rounded-xl text-xs font-bold transition-all"
              style={{
                background: statusFilter === v ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.05)",
                border:     statusFilter === v ? "1px solid rgba(59,130,246,0.4)" : "1px solid rgba(255,255,255,0.08)",
                color:      statusFilter === v ? "#60A5FA" : "rgba(255,255,255,0.4)",
              }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* ── Product Table ────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        className="rounded-2xl overflow-hidden"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-7 h-7 animate-spin text-white/30" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  {["وێنە","ناوی کاڵا","کاتاگۆری","بارکۆد",
                    ...(canViewProfit ? ["نرخی کۆ"] : []),
                    "نرخی فرۆشتن","بڕ / یەکە","دۆخ","کردار"].map(h => (
                    <th key={h} className="text-start px-4 py-3.5 text-[10px] font-extrabold uppercase tracking-wider text-white/25">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, i) => (
                  <tr key={item.id}
                    style={{ borderBottom: i < filtered.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
                    className="hover:bg-white/[0.025] transition-colors group">
                    {/* Image */}
                    <td className="px-4 py-3 w-14">
                      <ProductImage src={item.image} size="sm" />
                    </td>
                    {/* Name + supplier */}
                    <td className="px-4 py-3 min-w-[160px]">
                      <p className="text-sm font-semibold text-white/85 leading-snug">{item.name}</p>
                      {(item as any).supplier && (
                        <p className="text-[10px] text-white/30 mt-0.5 flex items-center gap-1">
                          <Store className="w-2.5 h-2.5" />
                          {(item as any).supplier}
                        </p>
                      )}
                    </td>
                    {/* Category */}
                    <td className="px-4 py-3">
                      {item.category ? (
                        <span className="text-[11px] font-medium text-white/50 px-2 py-1 rounded-lg whitespace-nowrap"
                          style={{ background: "rgba(255,255,255,0.05)" }}>
                          {catLabel(item.category, sectorCategories)}
                        </span>
                      ) : <span className="text-white/20 text-xs">—</span>}
                    </td>
                    {/* Barcode */}
                    <td className="px-4 py-3">
                      {item.barcode ? (
                        <span className="font-mono text-[10px] text-white/40 bg-white/5 px-2 py-1 rounded-lg flex items-center gap-1 w-fit">
                          <QrCode className="w-2.5 h-2.5 shrink-0" />
                          {item.barcode}
                        </span>
                      ) : <span className="text-white/20 text-xs">—</span>}
                    </td>
                    {/* Cost price (admin only) */}
                    {canViewProfit && (
                      <td className="px-4 py-3">
                        <span className="text-sm text-white/40 font-mono">
                          {item.costPrice != null ? formatCurrency(item.costPrice) : "—"}
                        </span>
                      </td>
                    )}
                    {/* Retail price */}
                    <td className="px-4 py-3">
                      <span className="text-sm font-bold tabular-nums" style={{ color: "#34D399" }}>
                        {formatCurrency(item.price)}
                      </span>
                    </td>
                    {/* Stock bar */}
                    <td className="px-4 py-3 min-w-[120px]">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                          <div className="h-full rounded-full transition-all" style={{
                            width: `${Math.min(100, (item.stock / Math.max(item.stock, LOW_STOCK * 4)) * 100)}%`,
                            background: item.stock === 0 ? "#EF4444" : item.stock < LOW_STOCK ? "#F59E0B" : "#10B981",
                          }} />
                        </div>
                        <span className="text-sm font-bold text-white/70 tabular-nums">{item.stock.toLocaleString()}</span>
                        <span className="text-[10px] text-white/30">{item.unit}</span>
                      </div>
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusBadge stock={item.stock} />
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canEdit && (
                          <button onClick={() => openEdit(item)}
                            className="p-1.5 rounded-lg transition-all hover:scale-110"
                            style={{ color: "#60A5FA", background: "rgba(59,130,246,0.1)" }}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => handleDelete(item.id, item.name)}
                            className="p-1.5 rounded-lg transition-all hover:scale-110"
                            style={{ color: "#F87171", background: "rgba(248,113,113,0.1)" }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filtered.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Package className="w-12 h-12 text-white/10" />
                <p className="text-sm text-white/30">
                  {search || catFilter !== "all" || statusFilter !== "all"
                    ? "هیچ کاڵایەک بە ئەم فلتەرە نەدۆزرایەوە"
                    : "هێشتا هیچ کاڵایەک زیاد نەکراوە"}
                </p>
                {canEdit && !search && catFilter === "all" && statusFilter === "all" && (
                  <button onClick={openAdd}
                    className="text-xs font-bold px-5 py-2.5 rounded-xl mt-1 transition-all hover:brightness-110"
                    style={{ background: "rgba(16,185,129,0.15)", color: "#34D399", border: "1px solid rgba(16,185,129,0.3)" }}>
                    + زیادکردنی کاڵای یەکەم
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* ═══ Add / Edit Modal ═══════════════════════════════════════ */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(10px)" }}
            onClick={e => { if (e.target === e.currentTarget) setIsModalOpen(false); }}>

            <motion.div
              className="w-full max-w-lg max-h-[92vh] flex flex-col rounded-3xl overflow-hidden"
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              style={{ background: "#0d1526", border: "1px solid rgba(255,255,255,0.1)" }}>

              {/* Modal header */}
              <div className="flex items-center justify-between px-6 py-4 shrink-0"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)" }}>
                    <Package className="w-4 h-4" style={{ color: "#10B981" }} />
                  </div>
                  <h2 className="text-base font-extrabold text-white">
                    {editingId ? "دەستکاری کاڵا" : "زیادکردنی کاڵای نوێ"}
                  </h2>
                </div>
                <button onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:bg-white/10"
                  style={{ color: "rgba(255,255,255,0.4)" }}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable form body */}
              <form onSubmit={form.handleSubmit(onSubmit)} className="overflow-y-auto px-6 py-5 space-y-4" dir="rtl">

                {/* ── Image ───────────────────────────────────── */}
                <div>
                  <label className="block text-[11px] font-bold mb-2 text-white/40 uppercase tracking-wider">وێنەی کاڵا</label>
                  <div className="flex items-center gap-4">
                    {imagePreview ? (
                      <div className="relative shrink-0">
                        <img src={imagePreview} alt="" className="w-20 h-20 rounded-2xl object-cover"
                          style={{ border: "1px solid rgba(16,185,129,0.3)" }} />
                        <button type="button" onClick={() => setImagePreview(null)}
                          className="absolute -top-1.5 -end-1.5 w-5 h-5 rounded-full flex items-center justify-center shadow"
                          style={{ background: "#EF4444" }}>
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-2xl flex items-center justify-center shrink-0"
                        style={{ background: "rgba(255,255,255,0.03)", border: "2px dashed rgba(255,255,255,0.1)" }}>
                        <ImageOff className="w-6 h-6 text-white/15" />
                      </div>
                    )}
                    <div className="flex-1">
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" id="inv-img-input" />
                      <label htmlFor="inv-img-input"
                        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all hover:brightness-110"
                        style={{ background: "rgba(16,185,129,0.08)", border: "1px dashed rgba(16,185,129,0.3)", color: "#34D399" }}>
                        {imageProcessing
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <ImagePlus className="w-4 h-4" />}
                        {imageProcessing ? "پرۆسەکردن..." : imagePreview ? "گۆڕینی وێنە" : "هەڵبژاردنی وێنە"}
                      </label>
                      <p className="text-[10px] text-white/25 text-center mt-1.5">PNG · JPG · WEBP — زیاتر نەبێت لە 2MB</p>
                    </div>
                  </div>
                </div>

                {/* ── Name + Category ──────────────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold mb-1.5 text-white/40 uppercase tracking-wider">ناوی کاڵا *</label>
                    <input {...form.register("name")} placeholder="بۆ نموونە: شەکری سپی ١کگ"
                      className={inputCls} style={inputSty(!!form.formState.errors.name)} />
                    {form.formState.errors.name && (
                      <p className="text-[10px] text-red-400 mt-1">{form.formState.errors.name.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold mb-1.5 text-white/40 uppercase tracking-wider">جۆری بەش</label>
                    <select {...form.register("category")} className={inputCls} style={inputSty()}>
                      <option value="">— بەش نەدیارکراوە</option>
                      {sectorCategories.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                    </select>
                  </div>
                </div>

                {/* ── USD Converter ────────────────────────────── */}
                <div className="rounded-xl p-3" style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)" }}>
                  <label className="flex items-center gap-1.5 text-[11px] font-bold mb-2 text-blue-400/80">
                    <DollarSign className="w-3 h-3" />
                    بەرانبەرکردنی دۆلار — ١$ = {rate.toLocaleString()} د.ع
                  </label>
                  <input type="number" step="0.01" value={usdInput} dir="ltr"
                    placeholder="0.00 $"
                    onChange={e => {
                      setUsdInput(e.target.value);
                      const usd = parseFloat(e.target.value);
                      if (!isNaN(usd) && usd >= 0) form.setValue("price", usdToIqd(usd));
                    }}
                    className="w-full px-3 py-2 rounded-lg text-sm font-mono outline-none transition-all text-white/80"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(59,130,246,0.2)" }} />
                </div>

                {/* ── Prices ───────────────────────────────────── */}
                <div className={`grid gap-3 ${canViewProfit ? "grid-cols-2" : "grid-cols-1"}`}>
                  {canViewProfit && (
                    <div>
                      <label className="block text-[11px] font-bold mb-1.5 text-white/40 uppercase tracking-wider">نرخی کۆ (خەرجی)</label>
                      <input type="number" step="any" {...form.register("costPrice")}
                        className={inputCls} style={inputSty()} dir="ltr" />
                    </div>
                  )}
                  <div>
                    <label className="block text-[11px] font-bold mb-1.5 text-white/40 uppercase tracking-wider">نرخی فرۆشتن *</label>
                    <input type="number" step="any" {...form.register("price")}
                      onChange={e => {
                        form.setValue("price", parseFloat(e.target.value) || 0);
                        const iqd = parseFloat(e.target.value);
                        if (!isNaN(iqd) && iqd > 0) setUsdInput(iqdToUsd(iqd).toFixed(2));
                        else setUsdInput("");
                      }}
                      className={inputCls + " font-mono"} dir="ltr"
                      style={{ background: "rgba(16,185,129,0.06)", border: `1px solid ${form.formState.errors.price ? "#F87171" : "rgba(16,185,129,0.25)"}`, color: "#34D399" }} />
                    {form.formState.errors.price && (
                      <p className="text-[10px] text-red-400 mt-1">{form.formState.errors.price.message}</p>
                    )}
                  </div>
                </div>

                {/* ── Stock + Unit ─────────────────────────────── */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold mb-1.5 text-white/40 uppercase tracking-wider">بڕی کۆگا *</label>
                    <input type="number" {...form.register("stock")}
                      className={inputCls + " font-mono"} style={inputSty(!!form.formState.errors.stock)} dir="ltr" />
                    {form.formState.errors.stock && (
                      <p className="text-[10px] text-red-400 mt-1">{form.formState.errors.stock.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold mb-1.5 text-white/40 uppercase tracking-wider">یەکە</label>
                    <select {...form.register("unit")} className={inputCls} style={inputSty()}>
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>

                {/* ── Barcode + Supplier ───────────────────────── */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="flex items-center gap-1.5 text-[11px] font-bold mb-1.5 text-white/40 uppercase tracking-wider">
                      <QrCode className="w-3 h-3" /> بارکۆد / SKU
                    </label>
                    <input {...form.register("barcode")} placeholder="بۆ نموونە: 6009876543210"
                      className={inputCls + " font-mono"} style={inputSty()} dir="ltr" />
                  </div>
                  <div>
                    <label className="flex items-center gap-1.5 text-[11px] font-bold mb-1.5 text-white/40 uppercase tracking-wider">
                      <Store className="w-3 h-3" /> ناوی دابینکەر
                    </label>
                    <input {...form.register("supplier")} placeholder="ناوی فرۆشیار"
                      className={inputCls} style={inputSty()} />
                  </div>
                </div>

                {/* ── Submit ───────────────────────────────────── */}
                <div className="flex gap-3 pt-2 pb-1">
                  <button type="submit" disabled={isPending || imageProcessing}
                    className="flex-1 py-3 rounded-xl font-extrabold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 hover:brightness-110"
                    style={{ background: "rgba(16,185,129,0.2)", border: "1px solid rgba(16,185,129,0.4)", color: "#34D399" }}>
                    {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    {editingId ? "پاشەکەوتکردن" : "زیادکردنی کاڵا"}
                  </button>
                  <button type="button" onClick={() => setIsModalOpen(false)}
                    className="px-6 py-3 rounded-xl font-bold text-sm transition-all hover:bg-white/10"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}>
                    داخستن
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
