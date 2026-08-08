import { useCallback, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileUp, Sparkles, AlertTriangle, CheckCircle2, Trash2, Plus,
  Loader2, X, FileText, Wand2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useLocaleDir } from "@/lib/use-locale-dir";
import {
  PAGE_MODAL, PAGE_BTN_SUCCESS, PAGE_BTN_GHOST, PAGE_SURFACE, PAGE_TH,
  PAGE_MODAL_FOOTER,
  PAGE_INPUT, PAGE_SELECT, PAGE_BADGE_WARNING, PAGE_BADGE_SUCCESS, PAGE_MUTED,
  PAGE_TR_BORDER, PAGE_BTN_SUCCESS_LG,
} from "@/lib/page-theme";
import {
  bulkCreateProducts,
  parseInventoryDocument,
  toPreviewRow,
  validateImportRow,
  ImportApiError,
  type ImportPreviewRow,
} from "@/lib/inventory-import";

const UNITS = ["دانە", "کیلۆ", "لیتر", "کارتۆن", "بۆکس", "پاکەت", "دەبە", "کیسە", "مەتر", "گرام"];

const PARSE_STEP_KEYS = ["receive", "extract", "analyze", "ready"] as const;

function parseStepIndex(progress: number): number {
  if (progress < 8) return 0;
  if (progress < 88) return 1;
  if (progress < 98) return 2;
  return 3;
}

type Step = "upload" | "parsing" | "preview" | "error";

interface BulkImportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
  categoryOptions: Array<{ key: string; label: string }>;
  canViewProfit: boolean;
}

export function BulkImportModal({
  open,
  onClose,
  onSuccess,
  categoryOptions,
  canViewProfit,
}: BulkImportModalProps) {
  const { t } = useTranslation("ui");
  const { dir } = useLocaleDir("ui");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [rows, setRows] = useState<ImportPreviewRow[]>([]);
  const [parseError, setParseError] = useState("");
  const [parseErrorKind, setParseErrorKind] = useState<"network" | "empty" | "validation" | "auth" | "server" | null>(null);
  const [saving, setSaving] = useState(false);
  const [parseProgress, setParseProgress] = useState(0);
  const [parseLabel, setParseLabel] = useState("");
  const [meta, setMeta] = useState<{
    pages: number;
    linesScanned: number;
    supplierHint: string | null;
    parseMs?: number;
    extractMs?: number;
  } | null>(null);

  const reset = useCallback(() => {
    setStep("upload");
    setFileName("");
    setWarnings([]);
    setRows([]);
    setParseError("");
    setParseErrorKind(null);
    setSaving(false);
    setParseProgress(0);
    setParseLabel("");
    setMeta(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = async (file: File) => {
    setParseError("");
    setParseErrorKind(null);
    setStep("parsing");
    setFileName(file.name);
    setParseProgress(2);
    setParseLabel(t("bulkImport.steps.receive"));
    try {
      const result = await parseInventoryDocument(file, (progress, label) => {
        setParseProgress(progress);
        setParseLabel(label);
      });
      setWarnings(result.warnings);
      setMeta({
        pages: result.meta.pages,
        linesScanned: result.meta.linesScanned,
        supplierHint: result.meta.supplierHint,
        parseMs: result.meta.parseMs,
        extractMs: result.meta.extractMs,
      });
      setRows(result.items.map((i) => toPreviewRow(i)));
      setStep("preview");
    } catch (e) {
      if (e instanceof ImportApiError) {
        setParseError(e.message);
        setParseErrorKind(e.kind);
      } else {
        setParseError(e instanceof Error ? e.message : t("bulkImport.fileFailed"));
        setParseErrorKind("server");
      }
      setStep("error");
    }
  };

  const retryUpload = () => {
    setParseError("");
    setParseErrorKind(null);
    setParseProgress(0);
    setParseLabel("");
    setStep("upload");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const updateRow = (id: string, patch: Partial<ImportPreviewRow>) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, ...patch };
        next.errors = validateImportRow(next);
        return next;
      }),
    );
  };

  const removeRow = (id: string) => setRows((prev) => prev.filter((r) => r.id !== id));

  const addBlankRow = () => {
    setRows((prev) => [
      ...prev,
      toPreviewRow({
        name: "",
        category: null,
        costPrice: 0,
        price: 0,
        stock: 0,
        unit: t("inventory.defaultUnit"),
        barcode: null,
        supplier: meta?.supplierHint ?? null,
        confidence: 1,
      }),
    ]);
  };

  const stats = useMemo(() => {
    const valid = rows.filter((r) => r.errors.length === 0).length;
    return { total: rows.length, valid, invalid: rows.length - valid };
  }, [rows]);

  const handleConfirm = async () => {
    const validRows = rows.filter((r) => r.errors.length === 0);
    if (validRows.length === 0) return;

    setSaving(true);
    try {
      const res = await bulkCreateProducts(
        validRows.map((r) => ({
          name: r.name,
          price: r.price,
          costPrice: r.costPrice,
          stock: r.stock,
          unit: r.unit,
          category: r.category || null,
          barcode: r.barcode || null,
          supplier: r.supplier || null,
        })),
      );
      onSuccess(res.count);
      handleClose();
    } catch (e) {
      if (e instanceof ImportApiError) {
        setParseError(e.message);
        setParseErrorKind(e.kind);
      } else {
        setParseError(e instanceof Error ? e.message : t("bulkImport.fileFailed"));
        setParseErrorKind("server");
      }
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)" }}
        onClick={(e) => { if (e.target === e.currentTarget && !saving) handleClose(); }}
      >
        <motion.div
          className={cn(
            "w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl overflow-hidden",
            PAGE_MODAL,
          )}
          initial={{ scale: 0.96, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 16 }}
          dir={dir}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-gray-200 dark:border-slate-800/50 shrink-0">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-violet-100 text-violet-600 border border-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/30">
                <Wand2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                  {t("bulkImport.title")}
                </h2>
                <p className={cn("text-xs mt-0.5", PAGE_MUTED)}>
                  {t("bulkImport.subtitle")}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 min-h-0">
            {parseError && step !== "error" && (
              <div className="flex items-start gap-2 rounded-xl px-4 py-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300 text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{parseError}</span>
              </div>
            )}

            {step === "error" && (
              <div className="flex flex-col items-center justify-center py-10 gap-5 max-w-md mx-auto w-full">
                <div
                  className={cn(
                    "w-16 h-16 rounded-2xl flex items-center justify-center border",
                    parseErrorKind === "empty"
                      ? "bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-300"
                      : "bg-red-50 border-red-200 text-red-500 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-300",
                  )}
                >
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {parseErrorKind === "empty" ? t("bulkImport.fileNotRecognized") : t("bulkImport.fileFailed")}
                  </p>
                  <p className={cn("text-sm", PAGE_MUTED)}>{parseError}</p>
                  {fileName && (
                    <p className={cn("text-xs", PAGE_MUTED)}>{fileName}</p>
                  )}
                  {parseErrorKind === "network" && (
                    <p className={cn("text-xs", PAGE_MUTED)}>
                      {t("bulkImport.networkHint")}
                    </p>
                  )}
                </div>
                <button type="button" onClick={retryUpload} className={cn(PAGE_BTN_SUCCESS, "text-sm")}>
                  <FileUp className="w-4 h-4" />
                  {t("bulkImport.retryFile")}
                </button>
              </div>
            )}

            {step === "upload" && (
              <div className="space-y-4">
                <div
                  className={cn(
                    PAGE_SURFACE,
                    "relative flex flex-col items-center justify-center gap-3 py-14 px-6 border-2 border-dashed cursor-pointer transition-colors",
                    "border-slate-200 dark:border-slate-700/50 hover:border-primary/40 dark:hover:border-primary/30",
                  )}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const f = e.dataTransfer.files?.[0];
                    if (f) handleFile(f);
                  }}
                >
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-primary/10 text-primary border border-primary/20">
                    <FileUp className="w-7 h-7" />
                  </div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {t("bulkImport.dropHint")}
                  </p>
                  <p className={cn("text-xs text-center max-w-md", PAGE_MUTED)}>
                    {t("bulkImport.dropDetail")}
                  </p>
                  <span className={cn(PAGE_BTN_SUCCESS, "text-xs mt-2")}>
                    <Sparkles className="w-3.5 h-3.5" />
                    {t("bulkImport.selectFile")}
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.txt,.csv,application/pdf,text/plain,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(f);
                    }}
                  />
                </div>
                <div className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <FileText className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>
                    {t("bulkImport.noDbWrite")}
                  </p>
                </div>
              </div>
            )}

            {step === "parsing" && (
              <div className="flex flex-col items-center justify-center py-12 gap-6 max-w-md mx-auto w-full">
                <div className="relative w-14 h-14">
                  <div className="absolute inset-0 rounded-2xl bg-primary/10 border border-primary/20" />
                  <Loader2 className="absolute inset-0 m-auto w-7 h-7 animate-spin text-primary" />
                </div>

                <div className="text-center space-y-1">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {parseLabel || t("bulkImport.parsing")}
                  </p>
                  <p className={cn("text-xs", PAGE_MUTED)}>{fileName}</p>
                </div>

                <div className="w-full space-y-2">
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-violet-500"
                      initial={{ width: "0%" }}
                      animate={{ width: `${parseProgress}%` }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                    />
                  </div>
                  <p className={cn("text-[11px] text-center tabular-nums", PAGE_MUTED)}>
                    {parseProgress}%
                  </p>
                </div>

                <ol className="w-full space-y-2">
                  {PARSE_STEP_KEYS.map((key, i) => {
                    const activeIdx = parseStepIndex(parseProgress);
                    const done = i < activeIdx;
                    const active = i === activeIdx;
                    return (
                      <li
                        key={key}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3 py-2 text-xs transition-colors",
                          done && "text-emerald-600 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-500/10",
                          active && "text-primary bg-primary/5 dark:bg-primary/10 font-semibold",
                          !done && !active && "text-slate-400 dark:text-slate-500",
                        )}
                      >
                        <span
                          className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center shrink-0 border text-[10px] font-bold",
                            done && "border-emerald-300 bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/20",
                            active && "border-primary/40 bg-primary/10",
                            !done && !active && "border-slate-200 dark:border-slate-700",
                          )}
                        >
                          {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                        </span>
                        <span>{t(`bulkImport.steps.${key}`)}</span>
                        {active && <Loader2 className="w-3.5 h-3.5 animate-spin ml-auto shrink-0" />}
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}

            {step === "preview" && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={PAGE_BADGE_SUCCESS}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {t("bulkImport.readyRows", { count: stats.valid })}
                  </span>
                  {stats.invalid > 0 && (
                    <span className={PAGE_BADGE_WARNING}>
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {t("bulkImport.invalidRows", { count: stats.invalid })}
                    </span>
                  )}
                  {fileName && (
                    <span className={cn("text-xs px-2 py-1 rounded-lg", PAGE_MUTED, "bg-slate-100 dark:bg-slate-800/50")}>
                      {fileName}
                      {meta?.pages ? ` · ${t("bulkImport.pages", { count: meta.pages })}` : ""}
                      {meta?.linesScanned ? ` · ${meta.linesScanned} ڕیز` : ""}
                      {meta?.extractMs != null ? ` · ${meta.extractMs}ms دەق` : ""}
                      {meta?.parseMs != null ? ` · ${meta.parseMs}ms پارس` : ""}
                    </span>
                  )}
                </div>

                {warnings.length > 0 && (
                  <div className="rounded-xl px-4 py-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/25 text-amber-800 dark:text-amber-200 text-xs space-y-1">
                    {warnings.map((w) => <p key={w}>{w}</p>)}
                  </div>
                )}

                <div className={cn(PAGE_SURFACE, "overflow-hidden")}>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px]">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-slate-800/50">
                          {[
                            t("bulkImport.columns.name"),
                            t("bulkImport.columns.category"),
                            ...(canViewProfit ? [t("bulkImport.columns.cost")] : []),
                            t("bulkImport.columns.price"),
                            t("bulkImport.columns.stock"),
                            t("bulkImport.columns.unit"),
                            t("bulkImport.columns.barcode"),
                            t("bulkImport.columns.supplier"),
                            "",
                          ].map((h) => (
                            <th key={h || "act"} className={PAGE_TH}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, i) => (
                          <tr
                            key={row.id}
                            className={cn(
                              PAGE_TR_BORDER,
                              row.errors.length > 0 && "bg-red-50/80 dark:bg-red-500/5",
                              i === rows.length - 1 && "border-b-0",
                            )}
                          >
                            <td className="px-2 py-2 min-w-[160px]">
                              <input
                                value={row.name}
                                onChange={(e) => updateRow(row.id, { name: e.target.value })}
                                className={cn(PAGE_INPUT, "py-1.5 text-xs", row.errors.length > 0 && "!border-red-400")}
                              />
                            </td>
                            <td className="px-2 py-2 min-w-[120px]">
                              <select
                                value={row.category ?? ""}
                                onChange={(e) => updateRow(row.id, { category: e.target.value })}
                                className={cn(PAGE_SELECT, "py-1.5 text-xs min-w-0 w-full font-normal")}
                              >
                                <option value="">—</option>
                                {categoryOptions.map((c) => (
                                  <option key={c.key} value={c.key}>{c.label}</option>
                                ))}
                              </select>
                            </td>
                            {canViewProfit && (
                              <td className="px-2 py-2 w-24">
                                <input
                                  type="number"
                                  min={0}
                                  value={row.costPrice}
                                  onChange={(e) => updateRow(row.id, { costPrice: Number(e.target.value) })}
                                  className={cn(PAGE_INPUT, "py-1.5 text-xs font-mono")}
                                  dir="ltr"
                                />
                              </td>
                            )}
                            <td className="px-2 py-2 w-28">
                              <input
                                type="number"
                                min={0}
                                step="any"
                                value={row.price}
                                onChange={(e) => updateRow(row.id, { price: Number(e.target.value) })}
                                className={cn(PAGE_INPUT, "py-1.5 text-xs font-mono", row.errors.some(e => e.includes("price")) && "!border-red-400")}
                                dir="ltr"
                              />
                            </td>
                            <td className="px-2 py-2 w-20">
                              <input
                                type="number"
                                min={0}
                                value={row.stock}
                                onChange={(e) => updateRow(row.id, { stock: Number(e.target.value) })}
                                className={cn(PAGE_INPUT, "py-1.5 text-xs font-mono")}
                                dir="ltr"
                              />
                            </td>
                            <td className="px-2 py-2 w-24">
                              <select
                                value={row.unit}
                                onChange={(e) => updateRow(row.id, { unit: e.target.value })}
                                className={cn(PAGE_SELECT, "py-1.5 text-xs min-w-0 w-full font-normal")}
                              >
                                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                              </select>
                            </td>
                            <td className="px-2 py-2 w-28">
                              <input
                                value={row.barcode ?? ""}
                                onChange={(e) => updateRow(row.id, { barcode: e.target.value })}
                                className={cn(PAGE_INPUT, "py-1.5 text-xs font-mono")}
                                dir="ltr"
                              />
                            </td>
                            <td className="px-2 py-2 min-w-[120px]">
                              <input
                                value={row.supplier ?? ""}
                                onChange={(e) => updateRow(row.id, { supplier: e.target.value })}
                                className={cn(PAGE_INPUT, "py-1.5 text-xs")}
                              />
                            </td>
                            <td className="px-2 py-2">
                              <button
                                type="button"
                                onClick={() => removeRow(row.id)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                title={t("common.delete", { ns: "common" })}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <button type="button" onClick={addBlankRow} className={cn(PAGE_BTN_GHOST, "text-xs")}>
                  <Plus className="w-3.5 h-3.5" />
                  {t("bulkImport.addBlankRow")}
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={PAGE_MODAL_FOOTER}>
            <button type="button" onClick={handleClose} disabled={saving} className={PAGE_BTN_GHOST}>
              {t("bulkImport.close")}
            </button>
            {step === "preview" && (
              <button
                type="button"
                disabled={saving || stats.valid === 0}
                onClick={handleConfirm}
                className={cn(PAGE_BTN_SUCCESS_LG, "max-w-xs")}
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> {t("bulkImport.saving")}</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4" /> {t("bulkImport.confirmSave", { count: stats.valid })}</>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
