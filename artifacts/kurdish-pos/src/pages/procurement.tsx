import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileSearch, Send, Clock, CheckCircle2, XCircle, Plus, ChevronDown,
  Package, Calendar, Loader2,
} from "lucide-react";
import { useUserSectorKey, useSectorLabel } from "@/hooks/useSectorScope";
import { isRawCategoryAllowedForSector, getSectorCategoryChips, type CatKey } from "@/lib/industries";
import { useRfqs, useCreateRfq, useSuppliers, type RfqStatus } from "@/hooks/useB2bData";
import { useTranslation } from "react-i18next";

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

const STATUS_META: Record<RfqStatus, { label: string; color: string; bg: string; Icon: typeof Clock }> = {
  pending:   { label: "چاوەڕوانە",  color: "#FBBF24", bg: "rgba(251,191,36,0.12)",  Icon: Clock        },
  responded: { label: "وەڵامی هات", color: "#3B82F6", bg: "rgba(59,130,246,0.12)",  Icon: Send         },
  approved:  { label: "پەسەند",     color: "#34D399", bg: "rgba(52,211,153,0.12)",  Icon: CheckCircle2 },
  declined:  { label: "ڕەتکرا",    color: "#F87171", bg: "rgba(248,113,113,0.12)", Icon: XCircle      },
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
  const defaultCat = chips[0] ?? "food";

  const toggleSupplier = (name: string) => {
    setSelectedSuppliers((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!product.trim() || !quantity.trim() || !unit.trim()) return;
    try {
      await createRfq.mutateAsync({
        product: product.trim(),
        quantity: quantity.trim(),
        unit: unit.trim(),
        category: defaultCat,
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
      className="rounded-2xl p-5 space-y-4"
      style={{ background: "rgba(168,85,247,0.07)", border: "1px solid rgba(168,85,247,0.25)" }}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-extrabold text-white">داواکاریی نرخی نوێ (RFQ)</p>
        <button onClick={onClose} className="text-white/30 hover:text-white/60 text-lg leading-none">×</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block mb-1.5">ناوی بەرهەم</label>
          <input
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            placeholder="رووغەن، شەکر..."
            className="w-full px-3 py-2 rounded-xl text-sm text-white/80 placeholder-white/25 outline-none"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block mb-1.5">بڕی داواکراو</label>
          <input
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="١٠٠"
            className="w-full px-3 py-2 rounded-xl text-sm text-white/80 placeholder-white/25 outline-none"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block mb-1.5">یەکە</label>
          <input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="کارتۆن، کیس..."
            className="w-full px-3 py-2 rounded-xl text-sm text-white/80 placeholder-white/25 outline-none"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block mb-1.5">کاتی دوایی</label>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-sm text-white/80 outline-none"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}
          />
        </div>
      </div>
      <div>
        <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block mb-1.5">فرۆشیارەکان</label>
        {supplierNames.length === 0 ? (
          <p className="text-xs text-white/30">{t("emptyStates.noSuppliersForRfq")}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {supplierNames.map((s) => (
              <label key={s} className="flex items-center gap-1.5 text-xs text-white/60 cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-purple-500"
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
        <button
          onClick={onClose}
          className="flex-1 py-2 rounded-xl text-sm font-bold text-white/40"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          هەڵبژێرە
        </button>
        <button
          onClick={handleSubmit}
          disabled={createRfq.isPending || !product.trim()}
          className="flex-1 py-2 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ background: "linear-gradient(135deg,#A855F7,#7C3AED)" }}
        >
          {createRfq.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          ناردن
        </button>
      </div>
    </motion.div>
  );
}

export default function Procurement() {
  const { t } = useTranslation("common");
  const sectorLabel = useSectorLabel();
  const sectorKey = useUserSectorKey();
  const { data: rfqsRaw = [], isLoading } = useRfqs(sectorKey);
  const { data: suppliers = [] } = useSuppliers();

  const sectorRfqs = useMemo(
    () =>
      (rfqsRaw as RFQ[]).filter((r) => isRawCategoryAllowedForSector(r.cat as CatKey, sectorKey)),
    [rfqsRaw, sectorKey],
  );

  const supplierNames = useMemo(() => suppliers.map((s) => s.name), [suppliers]);

  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const SUMMARY = [
    { label: "کۆی RFQ",       value: sectorRfqs.length.toString(),                                      color: "#A855F7" },
    { label: "چاوەڕوان",      value: sectorRfqs.filter((r) => r.status === "pending").length.toString(),    color: "#F59E0B" },
    { label: "وەڵام هاتووە",  value: sectorRfqs.filter((r) => r.status === "responded").length.toString(),  color: "#3B82F6" },
    { label: "پەسەندکراو",    value: sectorRfqs.filter((r) => r.status === "approved").length.toString(),   color: "#10B981" },
  ];

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.3)" }}
          >
            <FileSearch className="w-5 h-5" style={{ color: "#A855F7" }} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white">{t("pageTitles.procurement", { sector: sectorLabel })}</h1>
            <p className="text-xs text-white/40">{t("pageTitles.procurementSubtitle", { sector: sectorLabel })}</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all"
          style={{ background: "linear-gradient(135deg,#A855F7,#7C3AED)", boxShadow: "0 4px 16px rgba(168,85,247,0.3)" }}
        >
          <Plus className="w-4 h-4" /> RFQ نوێ
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
            <p className="text-xs mt-0.5 font-semibold" style={{ color: s.color }}>{s.label}</p>
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
          const meta = STATUS_META[rfq.status];
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
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: meta.bg }}>
                  <meta.Icon className="w-4 h-4" style={{ color: meta.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-white">{rfq.product}</p>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-lg"
                      style={{ color: meta.color, background: meta.bg }}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <p className="text-xs text-white/40 mt-0.5">
                    {rfq.id} · {rfq.qty} {rfq.unit} · {rfq.suppliers.length} فرۆشیار
                  </p>
                </div>
                <div className="text-end shrink-0">
                  {rfq.bestPrice && <p className="text-sm font-extrabold text-white">{rfq.bestPrice}</p>}
                  {rfq.deadline && <p className="text-[10px] text-white/30">کاتی دوایی: {rfq.deadline}</p>}
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
                        <p className="text-[10px] text-white/30 mb-1 uppercase font-bold tracking-wider">فرۆشیارەکان</p>
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
                          <p className="text-[10px] text-white/30 mb-1 uppercase font-bold tracking-wider">دروستکراوە</p>
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
                              className="px-3 py-1.5 rounded-xl text-xs font-bold"
                              style={{ background: "rgba(248,113,113,0.1)", color: "#F87171", border: "1px solid rgba(248,113,113,0.2)" }}
                            >
                              ڕەتکردنەوە
                            </button>
                            <button
                              className="px-3 py-1.5 rounded-xl text-xs font-bold"
                              style={{ background: "rgba(52,211,153,0.1)", color: "#34D399", border: "1px solid rgba(52,211,153,0.2)" }}
                            >
                              پەسەندکردن
                            </button>
                          </>
                        )}
                        {rfq.status === "pending" && (
                          <button
                            className="px-3 py-1.5 rounded-xl text-xs font-bold"
                            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.1)" }}
                          >
                            هەڵوەشاندنەوە
                          </button>
                        )}
                        {rfq.status === "approved" && (
                          <button
                            className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5"
                            style={{ background: "rgba(52,211,153,0.1)", color: "#34D399", border: "1px solid rgba(52,211,153,0.2)" }}
                          >
                            <Package className="w-3 h-3" /> بەڕێوەبردن
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
