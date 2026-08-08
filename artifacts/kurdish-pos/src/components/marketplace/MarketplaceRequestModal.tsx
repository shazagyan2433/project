import { useEffect, useState } from "react";
import { Loader2, MessageSquare, Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useUserSectorKey, useSectorCategoryOptions } from "@/hooks/useSectorScope";
import { useCreateRfq, useSuppliers } from "@/hooks/useB2bData";
import { getDefaultSectorCategory, isSupplierSectorAllowedForBuyer, type CatKey } from "@/lib/industries";
import { cn } from "@/lib/utils";
import { useLocaleDir } from "@/lib/use-locale-dir";
import {
  PAGE_BTN_SUCCESS,
  RFQ_BTN_CANCEL,
  RFQ_FIELD_INPUT,
  RFQ_FIELD_LABEL,
  RFQ_HINT_BOX,
  RFQ_MODAL_PANEL,
  RFQ_MODAL_SUBTITLE,
  RFQ_MODAL_TITLE,
  RFQ_SUPPLIER_CHIP,
  RFQ_SUPPLIER_PANEL,
} from "@/lib/page-theme";

export interface MarketplaceRequestContext {
  productName: string;
  supplierId?: number;
  supplierName?: string;
  supplierPhone?: string;
  unit?: string;
  category?: CatKey;
  price?: number;
  quantity?: string;
}

interface MarketplaceRequestModalProps {
  open: boolean;
  onClose: () => void;
  initial: MarketplaceRequestContext | null;
}

export function MarketplaceRequestModal({
  open,
  onClose,
  initial,
}: MarketplaceRequestModalProps) {
  const { t } = useTranslation("common");
  const { dir, rtl } = useLocaleDir("common");
  const { toast } = useToast();
  const sectorKey = useUserSectorKey();
  const categoryOptions = useSectorCategoryOptions();
  const createRfq = useCreateRfq();
  const { data: suppliers = [] } = useSuppliers();

  const [product, setProduct] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [deadline, setDeadline] = useState("");
  const [selectedSuppliers, setSelectedSuppliers] = useState<Set<string>>(new Set());
  const [category, setCategory] = useState<CatKey | "">("");

  useEffect(() => {
    if (!open) return;
    const fallback = initial?.category ?? getDefaultSectorCategory(sectorKey) ?? "";
    setCategory(fallback);
  }, [open, initial?.category, sectorKey]);

  const supplierNames = suppliers
    .filter((s) => isSupplierSectorAllowedForBuyer(s.sectorKey, sectorKey))
    .map((s) => s.name);

  useEffect(() => {
    if (!open || !initial) return;
    setProduct(initial.productName ?? "");
    setQuantity(initial.quantity ?? "1");
    setUnit(initial.unit ?? "دانە");
    setDeadline("");
    const pre = new Set<string>();
    if (initial.supplierName) pre.add(initial.supplierName);
    setSelectedSuppliers(pre);
  }, [open, initial]);

  const toggleSupplier = (name: string) => {
    setSelectedSuppliers((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleClose = () => {
    if (!createRfq.isPending) onClose();
  };

  const handleSubmit = async () => {
    if (!product.trim() || !quantity.trim() || !unit.trim() || !sectorKey || !category) return;
    try {
      await createRfq.mutateAsync({
        product: product.trim(),
        quantity: quantity.trim(),
        unit: unit.trim(),
        category,
        sectorKey,
        suppliers: Array.from(selectedSuppliers),
        deadline: deadline || undefined,
      });
      toast({
        title: t("marketplace.requestModal.successTitle"),
        description: t("marketplace.requestModal.successBody"),
      });
      onClose();
    } catch {
      toast({
        title: t("marketplace.requestModal.errorTitle"),
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent
        className={cn(
          RFQ_MODAL_PANEL,
          "linqi-rfq-modal max-w-lg sm:max-w-xl gap-4 p-6",
          "border-gray-200 dark:border-slate-800",
        )}
        dir={dir}
        onPointerDownOutside={(e) => createRfq.isPending && e.preventDefault()}
      >
        <DialogHeader className={cn(rtl ? "text-right" : "text-left", "space-y-2")}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/25">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className={RFQ_MODAL_TITLE}>
                {t("marketplace.requestModal.title")}
              </DialogTitle>
              <DialogDescription className={cn("mt-0.5", RFQ_MODAL_SUBTITLE)}>
                {initial?.supplierName
                  ? t("marketplace.requestModal.subtitleSupplier", {
                      supplier: initial.supplierName,
                    })
                  : t("marketplace.requestModal.subtitle")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
          <div className="sm:col-span-2">
            <label className={RFQ_FIELD_LABEL}>
              {t("marketplace.requestModal.product")}
            </label>
            <input
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              className={RFQ_FIELD_INPUT}
              placeholder={t("marketplace.requestModal.productPlaceholder")}
            />
          </div>
          <div>
            <label className={RFQ_FIELD_LABEL}>
              {t("marketplace.requestModal.quantity")}
            </label>
            <input
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className={RFQ_FIELD_INPUT}
              placeholder="10"
            />
          </div>
          <div>
            <label className={RFQ_FIELD_LABEL}>
              {t("marketplace.requestModal.unit")}
            </label>
            <input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className={RFQ_FIELD_INPUT}
              placeholder={t("marketplace.requestModal.unitPlaceholder")}
            />
          </div>
          <div>
            <label className={RFQ_FIELD_LABEL}>
              {t("marketplace.catalog.categoriesLabel")}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as CatKey)}
              className={RFQ_FIELD_INPUT}
              disabled={categoryOptions.length === 0}
            >
              {categoryOptions.length === 0 ? (
                <option value="">—</option>
              ) : (
                categoryOptions.map((opt) => (
                  <option key={opt.key} value={opt.key}>{opt.label}</option>
                ))
              )}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={RFQ_FIELD_LABEL}>
              {t("marketplace.requestModal.deadline")}
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className={cn(RFQ_FIELD_INPUT, "linqi-rfq-date")}
            />
          </div>
        </div>

        {initial?.price != null && initial.price > 0 && (
          <p className={RFQ_HINT_BOX}>
            {t("marketplace.requestModal.listPriceHint")}{" "}
            <span className="font-bold text-gray-800 dark:text-slate-200">
              {initial.price.toLocaleString()} {t("common.currency")}
            </span>
          </p>
        )}

        <div>
          <label className={RFQ_FIELD_LABEL}>
            {t("marketplace.requestModal.suppliers")}
          </label>
          {supplierNames.length === 0 ? (
            <p className={RFQ_MODAL_SUBTITLE}>{t("emptyStates.noSuppliersForRfq")}</p>
          ) : (
            <div className={RFQ_SUPPLIER_PANEL}>
              {supplierNames.map((name) => (
                <label key={name} className={RFQ_SUPPLIER_CHIP}>
                  <input
                    type="checkbox"
                    className="accent-blue-600 dark:accent-blue-400"
                    checked={selectedSuppliers.has(name)}
                    onChange={() => toggleSupplier(name)}
                  />
                  {name}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={handleClose}
            disabled={createRfq.isPending}
            className={RFQ_BTN_CANCEL}
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={createRfq.isPending || !product.trim() || !quantity.trim() || !unit.trim() || !category}
            className={cn(PAGE_BTN_SUCCESS, "flex-1 py-2.5 text-sm justify-center")}
          >
            {createRfq.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {t("marketplace.requestModal.submit")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
