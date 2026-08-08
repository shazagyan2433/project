import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileSearch, Send, Clock, CheckCircle2, XCircle, Plus, ChevronDown,
  Package, Calendar, Loader2,
} from "lucide-react";
import { useUserSectorKey, useSectorCategoryOptions } from "@/hooks/useSectorScope";
import { PageHeader } from "@/components/PageHeader";
import { isRawCategoryAllowedForSector, getDefaultSectorCategory, getSectorCategoryChips, isSupplierSectorAllowedForBuyer, type CatKey } from "@/lib/industries";
import { useRfqs, useCreateRfq, useSuppliers, type RfqStatus } from "@/hooks/useB2bData";
import { useTranslation } from "react-i18next";
import { useLocaleDir } from "@/lib/use-locale-dir";
import { PAGE_SURFACE_SM, PAGE_BTN_SUCCESS_XS, PAGE_BADGE_SUCCESS, PAGE_BADGE_WARNING, PAGE_BADGE_INFO, PAGE_BADGE_DANGER, PAGE_STAT_LABEL_SUCCESS, PAGE_BTN_SUCCESS, RFQ_BTN_CANCEL, RFQ_FIELD_INPUT, RFQ_FIELD_LABEL, RFQ_INLINE_PANEL, RFQ_MODAL_TITLE, RFQ_MODAL_SUBTITLE, RFQ_SUPPLIER_CHIP } from "@/lib/page-theme";
import { cn } from "@/lib/utils";

interface RFQ {
  id: string;
  product: string;
  qty: string;
  unit: string;
  cat: CatKey | string;
  suppliers: string[];
  status: RfqStatus;
  created: string;
  bestPrice?: string;
  deadline: string;
}

const STATUS_BADGE: Record<RfqStatus, string> = {
  pending:   PAGE_BADGE_WARNING,
  responded: PAGE_BADGE_INFO,
  approved:  PAGE_BADGE_SUCCESS,
  declined:  PAGE_BADGE_DANGER,
};

const STATUS_META_KEYS: Record<RfqStatus, { labelKey: string; iconCls: string; Icon: typeof Clock }> = {
  pending:   { labelKey: "procurement.statusPending",  iconCls: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400", Icon: Clock        },
  responded: { labelKey: "procurement.statusResponded", iconCls: "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400", Icon: Send         },
  approved:  { labelKey: "procurement.statusApproved",     iconCls: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400", Icon: CheckCircle2 },
  declined:  { labelKey: "procurement.statusDeclined",    iconCls: "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400", Icon: XCircle      },
};

function NewRFQForm({
  onClose,
  sectorKey,
  supplierNames,
}: {
  onClose: () => void;
  sectorKey: string;
  supplierNames: string[];
}) {
  const { t } = useTranslation("common");
  const createRfq = useCreateRfq();
  const [product, setProduct] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [deadline, setDeadline] = useState("");
  const [selectedSuppliers, setSelectedSuppliers] = useState<Set<string>>(new Set());

  const chips = getSectorCategoryChips(sectorKey);
  const categoryOptions = useSectorCategoryOptions();
  const [category, setCategory] = useState<CatKey | "">(() => getDefaultSectorCategory(sectorKey) ?? "");

  useEffect(() => {
    if (!category || !chips.includes(category as CatKey)) {
      setCategory(getDefaultSectorCategory(sectorKey) ?? "");
    }
  }, [sectorKey, chips, category]);

  const toggleSupplier = (name: string) => {
    setSelectedSuppliers((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!product.trim() || !quantity.trim() || !unit.trim() || !category) return;
    try {
      await createRfq.mutateAsync({
        product: product.trim(),
        quantity: quantity.trim(),
        unit: unit.trim(),
        category: category as CatKey,
        sectorKey,
        suppliers: Array.from(selectedSuppliers),
        deadline: deadline || undefined,
      });
      onClose();
    } catch {
      /* mutation error — form stays open */
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={cn(RFQ_INLINE_PANEL, "p-5 space-y-4")}
    >
      <div className="flex items-center justify-between gap-3">
        <p className={RFQ_MODAL_TITLE}>{t("marketplace.requestModal.title")}</p>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 text-lg leading-none p-1"
          aria-label={t("common.close")}
        >
          ×
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={RFQ_FIELD_LABEL}>{t("marketplace.requestModal.product")}</label>
          <input
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            placeholder={t("marketplace.requestModal.productPlaceholder")}
            className={RFQ_FIELD_INPUT}
          />
        </div>
        <div>
          <label className={RFQ_FIELD_LABEL}>{t("marketplace.requestModal.quantity")}</label>
          <input
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="100"
            className={RFQ_FIELD_INPUT}
          />
        </div>
        <div>
          <label className={RFQ_FIELD_LABEL}>{t("marketplace.requestModal.unit")}</label>
          <input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder={t("marketplace.requestModal.unitPlaceholder")}
            className={RFQ_FIELD_INPUT}
          />
        </div>
        <div>
          <label className={RFQ_FIELD_LABEL}>{t("marketplace.catalog.categoriesLabel")}</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as CatKey)}
            className={RFQ_FIELD_INPUT}
            disabled={categoryOptions.length === 0}
          >
            {categoryOptions.map((opt) => (
              <option key={opt.key} value={opt.key}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={RFQ_FIELD_LABEL}>{t("marketplace.requestModal.deadline")}</label>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className={cn(RFQ_FIELD_INPUT, "linqi-rfq-date")}
          />
        </div>
      </div>
      <div>
        <label className={RFQ_FIELD_LABEL}>{t("marketplace.requestModal.suppliers")}</label>
        {supplierNames.length === 0 ? (
          <p className={RFQ_MODAL_SUBTITLE}>{t("emptyStates.noSuppliersForRfq")}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {supplierNames.map((s) => (
              <label key={s} className={RFQ_SUPPLIER_CHIP}>
                <input
                  type="checkbox"
                  className="accent-blue-600 dark:accent-blue-400"
                  checked={selectedSuppliers.has(s)}
                  onChange={() => toggleSupplier(s)}
                />
                {s}
              </label>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onClose} className={RFQ_BTN_CANCEL}>
          {t("common.cancel")}
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={createRfq.isPending || !product.trim() || !category}
          className={cn(PAGE_BTN_SUCCESS, "flex-1 py-2.5 text-sm justify-center")}
        >
          {createRfq.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          {t("marketplace.requestModal.submit")}
        </button>
      </div>
    </motion.div>
  );
}

export default function Procurement() {
  const { t } = useTranslation("common");
  const { t: tu } = useTranslation("ui");
  const { dir } = useLocaleDir("ui");
  const sectorKey = useUserSectorKey();
  const { data: rfqsRaw = [], isLoading } = useRfqs(sectorKey);
  const { data: suppliers = [] } = useSuppliers();

  const sectorRfqs = useMemo(
    () =>
      (rfqsRaw as RFQ[]).filter((r) => isRawCategoryAllowedForSector(r.cat as CatKey, sectorKey)),
    [rfqsRaw, sectorKey],
  );

  const supplierNames = useMemo(
    () =>
      suppliers
        .filter((s) => isSupplierSectorAllowedForBuyer(s.sectorKey, sectorKey))
        .map((s) => s.name),
    [suppliers, sectorKey],
  );

  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const SUMMARY = [
    { label: tu("procurement.totalRfqs"),       value: sectorRfqs.length.toString(),                                      color: "#A855F7" },
    { label: tu("procurement.pending"),      value: sectorRfqs.filter((r) => r.status === "pending").length.toString(),    color: "#F59E0B" },
    { label: tu("procurement.responded"),  value: sectorRfqs.filter((r) => r.status === "responded").length.toString(),  color: "#3B82F6" },
    { label: tu("procurement.approved"),    value: sectorRfqs.filter((r) => r.status === "approved").length.toString(),   color: "#10B981" },
  ];

  return (
    <div dir={dir} className="space-y-5 pb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.3)" }}
          >
            <FileSearch className="w-5 h-5" style={{ color: "#A855F7" }} />
          </div>
          <div>
            <PageHeader id="procurement" />
          </div>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all"
          style={{ background: "linear-gradient(135deg,#A855F7,#7C3AED)", boxShadow: "0 4px 16px rgba(168,85,247,0.3)" }}
        >
          <Plus className="w-4 h-4" /> {tu("procurement.newRfq")}
        </button>
      </div>

      <AnimatePresence>
        {showForm && sectorKey && (
          <NewRFQForm
            onClose={() => setShowForm(false)}
            sectorKey={sectorKey}
            supplierNames={supplierNames}
          />
        )}
      </AnimatePresence>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {SUMMARY.map((s, i) => (
          <div
            key={i}
            className="rounded-2xl p-4 text-center"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <p className="text-2xl font-extrabold text-white">{s.value}</p>
            <p className={cn("text-xs mt-0.5 font-semibold", s.color === "#10B981" ? PAGE_STAT_LABEL_SUCCESS : "")} style={s.color !== "#10B981" ? { color: s.color } : undefined}>{s.label}</p>
          </div>
        ))}
      </div>

      {isLoading && (
        <div className="py-20 text-center text-white/40">
          <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin opacity-50" />
        </div>
      )}

      {!isLoading && sectorRfqs.length === 0 && (
        <div className="text-center py-16">
          <FileSearch className="w-12 h-12 mx-auto mb-3 opacity-20 text-white" />
          <p className="text-sm font-semibold text-white/50">{t("emptyStates.noRfqs")}</p>
          <p className="text-xs text-white/25 mt-1">{t("emptyStates.noRfqsSubtitle")}</p>
        </div>
      )}

      <div className="space-y-3">
        {sectorRfqs.map((rfq, i) => {
          const meta = STATUS_META_KEYS[rfq.status];
          const statusLabel = tu(meta.labelKey);
          const isOpen = expanded === rfq.id;
          return (
            <motion.div
              key={rfq.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="rounded-2xl overflow-hidden"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <button
                className="w-full flex items-center gap-4 px-5 py-4 text-start"
                onClick={() => setExpanded(isOpen ? null : rfq.id)}
              >
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", meta.iconCls)}>
                  <meta.Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-white">{rfq.product}</p>
                    <span className={STATUS_BADGE[rfq.status]}>
                      {statusLabel}
                    </span>
                  </div>
                  <p className="text-xs text-white/40 mt-0.5">
                    {rfq.id} · {rfq.qty} {rfq.unit} · {tu("procurement.supplierCount", { count: rfq.suppliers.length })}
                  </p>
                </div>
                <div className="text-end shrink-0">
                  {rfq.bestPrice && <p className="text-sm font-extrabold text-white">{rfq.bestPrice}</p>}
                  {rfq.deadline && <p className="text-[10px] text-white/30">{tu("procurement.deadlineLabel", { date: rfq.deadline })}</p>}
                </div>
                <ChevronDown
                  className="w-4 h-4 text-white/30 shrink-0 transition-transform"
                  style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                />
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                    style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <p className="text-[10px] text-white/30 mb-1 uppercase font-bold tracking-wider">{tu("procurement.suppliers")}</p>
                        {rfq.suppliers.length === 0 ? (
                          <p className="text-xs text-white/30">—</p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {rfq.suppliers.map((s) => (
                              <span
                                key={s}
                                className="text-[11px] px-2 py-0.5 rounded-lg font-semibold"
                                style={{ background: "rgba(168,85,247,0.12)", color: "#C084FC" }}
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-start gap-3">
                        <div>
                          <p className="text-[10px] text-white/30 mb-1 uppercase font-bold tracking-wider">{tu("procurement.created")}</p>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 text-white/40" />
                            <span className="text-xs text-white/60">{rfq.created}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 items-end justify-end">
                        {rfq.status === "responded" && (
                          <>
                            <button
                              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-100 text-red-700 border border-red-200 hover:bg-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30 dark:hover:bg-red-500/25 transition-all duration-200"
                            >
                              {tu("procurement.decline")}
                            </button>
                            <button className={PAGE_BTN_SUCCESS_XS}>
                              {tu("procurement.approve")}
                            </button>
                          </>
                        )}
                        {rfq.status === "pending" && (
                          <button
                            className="px-3 py-1.5 rounded-xl text-xs font-bold"
                            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.1)" }}
                          >
                            {tu("procurement.cancel")}
                          </button>
                        )}
                        {rfq.status === "approved" && (
                          <button className={cn(PAGE_BTN_SUCCESS_XS, "flex items-center gap-1.5")}>
                            <Package className="w-3 h-3" /> {tu("procurement.manage")}
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
