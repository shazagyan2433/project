import { useState, useRef } from "react";
import { useSectorFilteredProducts } from "@/hooks/useSectorScope";
import { useCreateProduct, useUpdateProduct, useDeleteProduct } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/utils";
import { Plus, Search, Edit2, Trash2, AlertTriangle, X, PackageOpen, ImageOff, ImagePlus, WifiOff, DollarSign } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resizeImageToBase64 } from "@/lib/imageUtils";
import { ProductImage } from "@/components/ProductImage";
import { useAuth } from "@/contexts/AuthContext";
import { useOffline } from "@/hooks/useOffline";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import { useTranslation } from "react-i18next";
import { PAGE_MODAL, PAGE_MODAL_FOOTER, PAGE_MODAL_HEADER, PAGE_BTN_GHOST, PAGE_BTN_SUCCESS } from "@/lib/page-theme";
import { cn } from "@/lib/utils";

const LOW_STOCK_THRESHOLD = 5;

const productSchema = z.object({
  name: z.string().min(1, "Name required"),
  price: z.coerce.number().min(0, "Price must be 0+"),
  costPrice: z.coerce.number().min(0).optional(),
  stock: z.coerce.number().int().min(0, "Stock must be 0+"),
  unit: z.string().min(1, "Unit required"),
});

type ProductFormData = z.infer<typeof productSchema>;

export default function Products() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isAdmin, permissions } = useAuth();
  const isOffline = useOffline();
  const { rate, usdToIqd, iqdToUsd } = useExchangeRate();
  const { data: products, isLoading, isError } = useSectorFilteredProducts();
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();

  const [search, setSearch] = useState("");
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageProcessing, setImageProcessing] = useState(false);
  const [usdPriceInput, setUsdPriceInput] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const productList = products ?? [];
  const lowStockCount = productList.filter(p => p.stock < LOW_STOCK_THRESHOLD).length;

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: { name: "", price: 0, costPrice: 0, stock: 0, unit: "دانە" },
  });

  const filteredProducts = productList.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) &&
    (!showLowStockOnly || p.stock < LOW_STOCK_THRESHOLD)
  );

  const openAddModal = () => {
    setEditingId(null);
    setImagePreview(null);
    setUsdPriceInput("");
    form.reset({ name: "", price: 0, costPrice: 0, stock: 0, unit: "دانە" });
    setIsModalOpen(true);
  };

  const openEditModal = (product: any) => {
    setEditingId(product.id);
    setImagePreview(product.image ?? null);
    const iqd = parseFloat(product.price);
    setUsdPriceInput(iqd > 0 ? iqdToUsd(iqd).toFixed(2) : "");
    form.reset({ name: product.name, price: product.price, costPrice: product.costPrice ?? 0, stock: product.stock, unit: product.unit });
    setIsModalOpen(true);
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: t("products.imageTypeError"), variant: "destructive" });
      return;
    }
    setImageProcessing(true);
    try {
      const base64 = await resizeImageToBase64(file);
      setImagePreview(base64);
    } catch {
      toast({ title: t("products.imageUploadError"), variant: "destructive" });
    } finally {
      setImageProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = (id: number) => {
    if (confirm(t("products.confirmDelete"))) {
      deleteMutation.mutate(
        { id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/products"] });
            toast({ title: t("products.deleted") });
          }
        }
      );
    }
  };

  const onSubmit = (data: ProductFormData) => {
    const payload = { ...data, image: imagePreview ?? null };
    if (editingId) {
      updateMutation.mutate(
        { id: editingId, data: payload },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/products"] });
            toast({ title: t("products.updated") });
            setIsModalOpen(false);
          },
        }
      );
    } else {
      createMutation.mutate(
        { data: payload },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/products"] });
            toast({ title: t("products.added") });
            setIsModalOpen(false);
          },
        }
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800">{t("products.title")}</h1>
          <p className="text-slate-500 mt-1">{t("products.subtitle")}</p>
        </div>
        {(isAdmin || permissions.canEditStock) && (
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/30 transition-all font-semibold"
          >
            <Plus className="w-5 h-5" />
            {t("products.addProduct")}
          </button>
        )}
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder={t("products.searchProducts")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-slate-700 placeholder:text-slate-400"
          />
          {search && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
                {t("products.found", { count: filteredProducts.length })}
              </span>
              <button onClick={() => setSearch("")} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        {lowStockCount > 0 && (
          <button
            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            className={`flex items-center gap-2 px-4 py-3 rounded-2xl border font-bold text-sm transition-all ${
              showLowStockOnly
                ? "bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-200"
                : "bg-white text-rose-600 border-rose-200 hover:bg-rose-50"
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            {t("products.lowStock")}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-black ${showLowStockOnly ? "bg-white/20 text-white" : "bg-rose-100 text-rose-700"}`}>
              {lowStockCount}
            </span>
          </button>
        )}
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
        ) : filteredProducts.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400">
            <PackageOpen className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg">{t("products.noProducts")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 w-12">{t("products.image")}</th>
                  <th className="px-6 py-4 hover:bg-primary/5 transition-colors">{t("products.productName")}</th>
                  <th className="px-6 py-4 hover:bg-primary/5 transition-colors">{t("products.price")}</th>
                  <th className="px-6 py-4 hover:bg-primary/5 transition-colors">{t("products.stock")}</th>
                  <th className="px-6 py-4 hover:bg-primary/5 transition-colors">{t("products.unit")}</th>
                  <th className="px-6 py-4 text-center hover:bg-primary/5 transition-colors">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-primary/5 transition-colors group">
                    <td className="px-4 py-3">
                      <ProductImage src={product.image} size="sm" />
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-800">
                      <div className="flex items-center gap-2">
                        {product.name}
                        {product.stock < LOW_STOCK_THRESHOLD && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 text-xs font-bold border border-rose-200">
                            <AlertTriangle className="w-3 h-3" />
                            {product.stock === 0 ? t("products.outOfStock") : t("products.lowStockBadge")}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-primary">{formatCurrency(product.price)}</td>
                    <td className="px-6 py-4">
                      {product.stock === 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold bg-slate-100 text-slate-500 text-xs">
                          <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />
                          {t("products.outOfStock")}
                        </span>
                      ) : product.stock < LOW_STOCK_THRESHOLD ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {product.stock}
                        </span>
                      ) : product.stock <= 10 ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg font-bold bg-amber-50 text-amber-700">
                          {product.stock}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg font-bold bg-emerald-50 text-emerald-700">
                          {product.stock}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-500">{product.unit}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {(isAdmin || permissions.canEditStock) && (
                          <button onClick={() => openEditModal(product)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {(isAdmin || permissions.canDeleteData) && (
                          <button onClick={() => handleDelete(product.id)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={cn("w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col", PAGE_MODAL)}>
            <div className={cn(PAGE_MODAL_HEADER, "items-center")}>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{editingId ? t("products.editProduct") : t("products.addProductTitle")}</h2>
            </div>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
              {/* Image Upload */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-700">{t("products.productImage")}</label>
                <div className="flex items-center gap-4">
                  {imagePreview ? (
                    <div className="relative shrink-0">
                      <img src={imagePreview} alt={t("products.imagePreview")} className="w-20 h-20 rounded-2xl object-cover border-2 border-primary/20 shadow-sm" />
                      <button
                        type="button"
                        onClick={() => setImagePreview(null)}
                        className="absolute -top-2 -end-2 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center shadow hover:bg-rose-600 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center shrink-0">
                      <ImageOff className="w-6 h-6 text-slate-300" />
                    </div>
                  )}
                  <div className="flex-1">
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" id="product-image-input" />
                    <label
                      htmlFor="product-image-input"
                      className={`flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl border-2 border-dashed cursor-pointer transition-all text-sm font-semibold ${
                        imageProcessing
                          ? "border-primary/30 bg-primary/5 text-primary/50 cursor-wait"
                          : "border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:border-primary/50"
                      }`}
                    >
                      {imageProcessing ? (
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <ImagePlus className="w-4 h-4" />
                      )}
                      {imageProcessing ? t("products.processing") : imagePreview ? t("products.changeImage") : t("products.selectImage")}
                    </label>
                    <p className="text-xs text-slate-400 mt-1.5 text-center">{t("products.imageHint")}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5 text-slate-700">{t("products.productName")}</label>
                <input {...form.register("name")} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" />
                {form.formState.errors.name && <p className="text-rose-500 text-xs mt-1">{form.formState.errors.name.message}</p>}
              </div>

              {/* USD Price Converter */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                <label className="block text-xs font-bold mb-1.5 text-blue-700 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5" />
                  {t("products.usdConverter", { rate: rate.toLocaleString() })}
                </label>
                <input
                  type="number"
                  placeholder={t("products.usdPlaceholder")}
                  value={usdPriceInput}
                  onChange={(e) => {
                    setUsdPriceInput(e.target.value);
                    const usd = parseFloat(e.target.value);
                    if (!isNaN(usd) && usd >= 0) form.setValue("price", usdToIqd(usd));
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-blue-200 bg-white focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none transition-all font-mono text-sm"
                  dir="ltr"
                  step="0.01"
                />
              </div>

              <div className={`grid gap-4 ${(isAdmin || permissions.canViewProfit) ? "grid-cols-2" : "grid-cols-1"}`}>
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-slate-700">{t("products.sellingPrice")}</label>
                  <input
                    type="number"
                    {...form.register("price")}
                    onChange={(e) => {
                      form.setValue("price", parseFloat(e.target.value) || 0);
                      const iqd = parseFloat(e.target.value);
                      if (!isNaN(iqd) && iqd > 0) setUsdPriceInput(iqdToUsd(iqd).toFixed(2));
                      else setUsdPriceInput("");
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono"
                  />
                  {form.formState.errors.price && <p className="text-rose-500 text-xs mt-1">{form.formState.errors.price.message}</p>}
                </div>
                {(isAdmin || permissions.canViewProfit) && (
                  <div>
                    <label className="block text-sm font-semibold mb-1.5 text-slate-700">{t("products.costPrice")}</label>
                    <input type="number" {...form.register("costPrice")} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono" />
                    {form.formState.errors.costPrice && <p className="text-rose-500 text-xs mt-1">{form.formState.errors.costPrice.message}</p>}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-slate-700">{t("products.stockQty")}</label>
                <input type="number" {...form.register("stock")} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono" />
                {form.formState.errors.stock && <p className="text-rose-500 text-xs mt-1">{form.formState.errors.stock.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-slate-700">{t("products.unitLabel")}</label>
                <input {...form.register("unit")} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" />
              </div>
            </div>
              <div className={cn(PAGE_MODAL_FOOTER, "justify-end")}>
                <button type="button" onClick={() => setIsModalOpen(false)} className={PAGE_BTN_GHOST}>
                  {t("common.close")}
                </button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending || imageProcessing} className={cn(PAGE_BTN_SUCCESS, "px-6")}>
                  {editingId ? t("products.save") : t("products.add")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
