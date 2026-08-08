import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useCreateProduct, useUpdateProduct, useDeleteProduct,
} from "@workspace/api-client-react";
import { useSectorFilteredProducts, useUserSectorKey, useSectorCategoryOptions } from "@/hooks/useSectorScope";
import { PageHeader } from "@/components/PageHeader";
import { isRawCategoryAllowedForSector, getDefaultSectorCategory, type CatKey } from "@/lib/industries";
import { useTranslation } from "react-i18next";
import { useLocaleDir } from "@/lib/use-locale-dir";
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
  QrCode, RefreshCw, DollarSign, Loader2, ArrowUpRight, Store, FileUp,
} from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";
import {
  PAGE_INPUT, PAGE_SELECT, PAGE_CHIP, PAGE_SURFACE, PAGE_TH, PAGE_SURFACE_SM, PAGE_MUTED, PAGE_ICON,
  PAGE_MODAL, PAGE_BTN_SUCCESS, PAGE_BTN_SUCCESS_LG, PAGE_BTN_SUCCESS_OUTLINE, PAGE_BTN_GHOST_LG,
  PAGE_MODAL_FOOTER,
  PAGE_BTN_ICON, PAGE_BADGE_SUCCESS, PAGE_BADGE_WARNING, PAGE_BADGE_DANGER, PAGE_TEXT_SUCCESS,
  PAGE_ICON_SUCCESS, PAGE_ICON_SUCCESS_SM, PAGE_STAT_ICON_SUCCESS, PAGE_STAT_ICON_WARNING,
  PAGE_STAT_ICON_DANGER, PAGE_STAT_ICON_INFO, PAGE_STAT_LABEL_SUCCESS, PAGE_TR_BORDER, PAGE_TAG, PAGE_TAG_MONO,
  PAGE_BTN_GHOST,
} from "@/lib/page-theme";
import { BulkImportModal } from "@/components/inventory/BulkImportModal";

/* ─── Constants ─────────────────────────────────────────────────── */
const LOW_STOCK = 5;


const UNIT_KEYS = ["piece", "kg", "liter", "carton", "box", "pack", "dozen", "bag", "meter", "gram"] as const;

const STATUS_FILTER_KEYS = [
  { v: "all", k: "inventory.filterAll" },
  { v: "ok",  k: "inventory.filterOk"  },
  { v: "low", k: "inventory.filterLow" },
  { v: "out", k: "inventory.filterOut" },
] as const;

/* ─── Schema (messages resolved at runtime) ─────────────────────── */
function buildProductSchema(t: (key: string) => string) {
  return z.object({
    name:      z.string().min(1, t("inventory.nameRequired")),
    category:  z.string().optional(),
    costPrice: z.coerce.number().min(0),
    price:     z.coerce.number().min(0, t("inventory.priceRequired")),
    stock:     z.coerce.number().int().min(0),
    unit:      z.string().min(1),
    barcode:   z.string().optional(),
    supplier:  z.string().optional(),
  });
}
type FormData = z.infer<ReturnType<typeof buildProductSchema>>;

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
  const { t } = useTranslation("ui");
  const config = {
    ok:  { label: t("inventory.inStock"),  className: PAGE_BADGE_SUCCESS },
    low: { label: t("inventory.lowStock"), className: PAGE_BADGE_WARNING },
    out: { label: t("inventory.outOfStock"), className: PAGE_BADGE_DANGER },
  }[getStatus(stock)];
  return <span className={config.className}>{config.label}</span>;
}

/* ═══════════════════════════════════════════════════════════════════ */
export default function Inventory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isAdmin, permissions } = useAuth();
  const { rate, usdToIqd, iqdToUsd } = useExchangeRate();
  const { t, i18n } = useTranslation("ui");
  const { t: tCat } = useTranslation();
  const { dir } = useLocaleDir("ui");
  const productSchema = useMemo(() => buildProductSchema(t), [t, i18n.language]);
  const unitOptions = useMemo(
    () => UNIT_KEYS.map(key => ({ key, label: t(`inventory.units.${key}`) })),
    [t, i18n.language],
  );

  const sectorKey = useUserSectorKey();
  const sectorCategories = useSectorCategoryOptions();
  const sectorCategoryChips = useMemo(
    () => sectorCategories.map((c) => c.key),
    [sectorCategories],
  );

  const { data: products = [], isLoading, refetch } = useSectorFilteredProducts();
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation  = useDeleteProduct();

  /* ─── Local UI state ──────────────────────────────────────────── */
  const [search,       setSearch]       = useState("");
  const [catFilter,    setCatFilter]    = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all"|"ok"|"low"|"out">("all");
  const [isModalOpen,  setIsModalOpen]  = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
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
    defaultValues: { name: "", category: "", costPrice: 0, price: 0, stock: 0, unit: t("inventory.defaultUnit"), barcode: "", supplier: "" },
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
    const defaultCat = getDefaultSectorCategory(sectorKey) ?? "";
    form.reset({
      name: "", category: defaultCat, costPrice: 0, price: 0, stock: 0,
      unit: t("inventory.defaultUnit"), barcode: "", supplier: "",
    });
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
      toast({ title: t("inventory.imageUploadFailed"), variant: "destructive" });
    } finally {
      setImageProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = (id: number, name: string) => {
    if (!confirm(t("inventory.deleteNamedConfirm", { name }))) return;
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/products"] });
        toast({ title: t("inventory.deleted") });
      },
    });
  };

  const onSubmit = (data: FormData) => {
    if (!data.category || !isRawCategoryAllowedForSector(data.category, sectorKey)) {
      toast({ title: t("inventory.categoryRequired", { defaultValue: "Select a category for your business sector" }), variant: "destructive" });
      return;
    }
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
        onSuccess: () => { invalidate(); toast({ title: t("inventory.saveUpdated") }); setIsModalOpen(false); },
      });
    } else {
      createMutation.mutate({ data: payload }, {
        onSuccess: () => { invalidate(); toast({ title: t("inventory.saveCreated") }); setIsModalOpen(false); },
      });
    }
  };

  const fieldCls = (err?: boolean) =>
    cn(PAGE_INPUT, "py-2.5", err && "!border-red-400 dark:!border-red-400");

  /* ─── Render ──────────────────────────────────────────────────── */
  return (
    <div className="space-y-6 pb-8" dir={dir}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className={PAGE_ICON_SUCCESS}>
            <Warehouse className="w-5 h-5" />
          </div>
          <div>
            <PageHeader id="inventory" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()}
            className={PAGE_BTN_ICON}
            title={t("inventory.refresh")}>
            <RefreshCw className="w-4 h-4" />
          </button>
          {canEdit && (
            <>
              <button
                type="button"
                onClick={() => setIsBulkImportOpen(true)}
                className={cn(PAGE_BTN_GHOST, "text-xs px-3 py-2.5")}
              >
                <FileUp className="w-4 h-4" />
                {t("inventory.bulkImport")}
              </button>
              <button onClick={openAdd} className={PAGE_BTN_SUCCESS}>
                <Plus className="w-4 h-4" />
                {t("inventory.addProduct")}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: t("inventory.kpiTotal"),   value: total,    sub: t("inventory.kpiTotalSub"),          icon: Package,      iconCls: PAGE_STAT_ICON_INFO,    labelCls: "text-blue-600 dark:text-blue-400 font-semibold text-[10px]" },
          { label: t("inventory.kpiOut"),  value: outCount, sub: t("inventory.kpiOutSub"),     icon: TrendingDown, iconCls: PAGE_STAT_ICON_DANGER,  labelCls: "text-red-600 dark:text-red-400 font-semibold text-[10px]" },
          { label: t("inventory.kpiLow"),  value: lowCount, sub: t("inventory.kpiLowSub"),  icon: AlertTriangle,iconCls: PAGE_STAT_ICON_WARNING, labelCls: "text-amber-600 dark:text-amber-400 font-semibold text-[10px]" },
          { label: t("inventory.kpiOk"),         value: okCount,  sub: t("inventory.kpiOkSub", { pct: total > 0 ? Math.round(okCount / total * 100) : 0 }), icon: CheckCircle2, iconCls: PAGE_STAT_ICON_SUCCESS, labelCls: PAGE_STAT_LABEL_SUCCESS },
        ].map((s, i) => (
          <motion.div key={i}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className={cn(PAGE_SURFACE_SM, "p-4 rounded-2xl")}>
            <div className="flex items-center justify-between mb-3">
              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", s.iconCls)}>
                <s.icon className="w-[18px] h-[18px]" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-300 dark:text-white/15" />
            </div>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{s.value.toLocaleString()}</p>
            <p className="text-[11px] text-slate-500 dark:text-white/50 mt-0.5">{s.label}</p>
            <p className={cn("mt-1", s.labelCls)}>{s.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Filters ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        {/* Search */}
        <div className="flex-1 min-w-[200px] relative">
          <Search className={cn("absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none", PAGE_ICON)} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t("inventory.searchPlaceholder")}
            className={cn(PAGE_INPUT, "ps-9 pe-4 py-2.5")} />
        </div>
        {/* Category dropdown */}
        <select
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
          className={cn(PAGE_SELECT, catFilter !== "all" && "text-primary border-primary/30")}
        >
          <option value="all">{t("inventory.allCategories")}</option>
          {sectorCategories.map(c => (
            <option key={c.key} value={c.key}>{c.label}</option>
          ))}
        </select>
        {/* Status pills */}
        <div className="flex gap-2">
          {STATUS_FILTER_KEYS.map(({ v, k }) => (
            <button
              key={v}
              onClick={() => setStatusFilter(v)}
              className={cn(
                "px-3 py-2 rounded-xl text-xs font-bold transition-all border",
                statusFilter === v
                  ? "bg-primary/15 text-primary border-primary/40 dark:border-primary/25"
                  : PAGE_CHIP,
              )}
            >
              {t(k)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Product Table ────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        className={cn(PAGE_SURFACE, "overflow-hidden")}>
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-7 h-7 animate-spin text-slate-400 dark:text-slate-500" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-800/80">
                  {[
                    t("inventory.colImage"),
                    t("inventory.colName"),
                    t("inventory.colCategory"),
                    t("inventory.colBarcode"),
                    ...(canViewProfit ? [t("inventory.colCost")] : []),
                    t("inventory.colSale"),
                    t("inventory.colStock"),
                    t("inventory.colStatus"),
                    t("inventory.colActions"),
                  ].map(h => (
                    <th key={h} className={PAGE_TH}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, i) => (
                  <tr key={item.id}
                    className={cn(PAGE_TR_BORDER, "group", i === filtered.length - 1 && "border-b-0")}
                    >
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
                        <span className={PAGE_TAG}>
                          {catLabel(item.category, sectorCategories)}
                        </span>
                      ) : <span className="text-slate-400 dark:text-slate-600 text-xs">—</span>}
                    </td>
                    {/* Barcode */}
                    <td className="px-4 py-3">
                      {item.barcode ? (
                        <span className={PAGE_TAG_MONO}>
                          <QrCode className="w-2.5 h-2.5 shrink-0" />
                          {item.barcode}
                        </span>
                      ) : <span className="text-slate-400 dark:text-slate-600 text-xs">—</span>}
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
                      <span className={cn("text-sm", PAGE_TEXT_SUCCESS)}>
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
                    ? t("inventory.emptyFiltered")
                    : t("inventory.emptyNone")}
                </p>
                {canEdit && !search && catFilter === "all" && statusFilter === "all" && (
                  <button onClick={openAdd} className={cn(PAGE_BTN_SUCCESS, "text-xs mt-1")}>
                    {t("inventory.addFirst")}
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
              className={cn("w-full max-w-lg max-h-[92vh] flex flex-col rounded-3xl overflow-hidden", PAGE_MODAL)}
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-6 py-4 shrink-0 border-b border-gray-200 dark:border-slate-800/80">
                <div className="flex items-center gap-3">
                  <div className={PAGE_ICON_SUCCESS_SM}>
                    <Package className="w-4 h-4" />
                  </div>
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                    {editingId ? t("inventory.editProduct") : t("inventory.addProduct")}
                  </h2>
                </div>
                <button onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:bg-gray-100 dark:hover:bg-white/10 text-slate-400 dark:text-white/40">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable form body */}
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0 overflow-hidden" dir={dir}>
              <div className="overflow-y-auto px-6 py-5 space-y-4 flex-1 min-h-0">

                {/* ── Image ───────────────────────────────────── */}
                <div>
                  <label className="block text-[11px] font-bold mb-2 text-white/40 uppercase tracking-wider">{t("inventory.productImage")}</label>
                  <div className="flex items-center gap-4">
                    {imagePreview ? (
                      <div className="relative shrink-0">
                        <img src={imagePreview} alt="" className="w-20 h-20 rounded-2xl object-cover border border-emerald-300 dark:border-emerald-500/30" />
                        <button type="button" onClick={() => setImagePreview(null)}
                          className="absolute -top-1.5 -end-1.5 w-5 h-5 rounded-full flex items-center justify-center shadow"
                          style={{ background: "#EF4444" }}>
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-2xl flex items-center justify-center shrink-0 border-2 border-dashed border-gray-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950">
                        <ImageOff className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                      </div>
                    )}
                    <div className="flex-1">
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" id="inv-img-input" />
                      <label htmlFor="inv-img-input"
                        className={cn(PAGE_BTN_SUCCESS_OUTLINE, "w-full py-2.5 cursor-pointer")}>
                        {imageProcessing
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <ImagePlus className="w-4 h-4" />}
                        {imageProcessing ? t("inventory.imageProcessing") : imagePreview ? t("inventory.changeImage") : t("inventory.selectImage")}
                      </label>
                      <p className="text-[10px] text-white/25 text-center mt-1.5">{t("inventory.imageHint")}</p>
                    </div>
                  </div>
                </div>

                {/* ── Name + Category ──────────────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold mb-1.5 text-white/40 uppercase tracking-wider">{t("inventory.name")} *</label>
                    <input {...form.register("name")} placeholder={t("inventory.namePlaceholder")}
                      className={fieldCls(!!form.formState.errors.name)} />
                    {form.formState.errors.name && (
                      <p className="text-[10px] text-red-400 mt-1">{form.formState.errors.name.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold mb-1.5 text-white/40 uppercase tracking-wider">{t("inventory.categorySection")}</label>
                    <select {...form.register("category")} className={cn(PAGE_SELECT, "w-full font-normal")}>
                      <option value="">{t("inventory.uncategorized")}</option>
                      {sectorCategories.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                    </select>
                  </div>
                </div>

                {/* ── USD Converter ────────────────────────────── */}
                <div className="rounded-xl p-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
                  <label className="flex items-center gap-1.5 text-[11px] font-bold mb-2 text-blue-400/80">
                    <DollarSign className="w-3 h-3" />
                    {t("inventory.usdConverter", { rate: rate.toLocaleString() })}
                  </label>
                  <input type="number" step="0.01" value={usdInput}
                    placeholder="0.00 $"
                    onChange={e => {
                      setUsdInput(e.target.value);
                      const usd = parseFloat(e.target.value);
                      if (!isNaN(usd) && usd >= 0) form.setValue("price", usdToIqd(usd));
                    }}
                    className={cn(PAGE_INPUT, "font-mono")}
                    dir="ltr" />
                </div>

                {/* ── Prices ───────────────────────────────────── */}
                <div className={`grid gap-3 ${canViewProfit ? "grid-cols-2" : "grid-cols-1"}`}>
                  {canViewProfit && (
                    <div>
                      <label className="block text-[11px] font-bold mb-1.5 text-white/40 uppercase tracking-wider">{t("inventory.costPrice")}</label>
                      <input type="number" step="any" {...form.register("costPrice")}
                        className={cn(fieldCls(), "font-mono")} dir="ltr" />
                    </div>
                  )}
                  <div>
                    <label className="block text-[11px] font-bold mb-1.5 text-white/40 uppercase tracking-wider">{t("inventory.salePrice")} *</label>
                    <input type="number" step="any" {...form.register("price")}
                      onChange={e => {
                        form.setValue("price", parseFloat(e.target.value) || 0);
                        const iqd = parseFloat(e.target.value);
                        if (!isNaN(iqd) && iqd > 0) setUsdInput(iqdToUsd(iqd).toFixed(2));
                        else setUsdInput("");
                      }}
                      className={cn(
                        fieldCls(!!form.formState.errors.price),
                        "font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/25",
                        form.formState.errors.price && "!border-red-400 dark:!border-red-400"
                      )} dir="ltr" />
                    {form.formState.errors.price && (
                      <p className="text-[10px] text-red-400 mt-1">{form.formState.errors.price.message}</p>
                    )}
                  </div>
                </div>

                {/* ── Stock + Unit ─────────────────────────────── */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold mb-1.5 text-white/40 uppercase tracking-wider">{t("inventory.stock")} *</label>
                    <input type="number" {...form.register("stock")}
                      className={cn(fieldCls(!!form.formState.errors.stock), "font-mono")} dir="ltr" />
                    {form.formState.errors.stock && (
                      <p className="text-[10px] text-red-400 mt-1">{form.formState.errors.stock.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold mb-1.5 text-white/40 uppercase tracking-wider">{t("inventory.unit")}</label>
                    <select {...form.register("unit")} className={cn(PAGE_SELECT, "w-full font-normal")}>
                      {unitOptions.map(u => <option key={u.key} value={u.label}>{u.label}</option>)}
                    </select>
                  </div>
                </div>

                {/* ── Barcode + Supplier ───────────────────────── */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="flex items-center gap-1.5 text-[11px] font-bold mb-1.5 text-white/40 uppercase tracking-wider">
                      <QrCode className="w-3 h-3" /> {t("inventory.barcodeSku")}
                    </label>
                    <input {...form.register("barcode")} placeholder={t("inventory.barcodePlaceholder")}
                      className={cn(fieldCls(), "font-mono")} dir="ltr" />
                  </div>
                  <div>
                    <label className="flex items-center gap-1.5 text-[11px] font-bold mb-1.5 text-white/40 uppercase tracking-wider">
                      <Store className="w-3 h-3" /> {t("inventory.supplierName")}
                    </label>
                    <input {...form.register("supplier")} placeholder={t("inventory.supplierPlaceholder")}
                      className={fieldCls()} />
                  </div>
                </div>

              </div>

                {/* Footer actions */}
                <div className={cn(PAGE_MODAL_FOOTER, "justify-end")}>
                  <button type="button" onClick={() => setIsModalOpen(false)}
                    className={PAGE_BTN_GHOST_LG}>
                    {t("inventory.close")}
                  </button>
                  <button type="submit" disabled={isPending || imageProcessing}
                    className={cn(PAGE_BTN_SUCCESS_LG, "max-w-xs")}>
                    {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    {editingId ? t("inventory.save") : t("inventory.saveProduct")}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BulkImportModal
        open={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        categoryOptions={sectorCategories}
        canViewProfit={canViewProfit}
        onSuccess={(count) => {
          queryClient.invalidateQueries({ queryKey: ["/api/products"] });
          toast({ title: t("inventory.importSuccess", { count }) });
        }}
      />
    </div>
  );
}
