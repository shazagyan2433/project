import { useMemo, useState, lazy, Suspense, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocaleDir } from "@/lib/use-locale-dir";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Filter, CheckCircle2, XCircle, Clock, AlertTriangle, Slash,
  Eye, FileText, MapPin, Phone, Mail, User, FileWarning,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  type VerificationRecord,
  type VerificationStatus,
} from "@/lib/admin-types";
import {
  useAdminVerifications,
  usePatchVerificationStatus,
} from "@/hooks/useAdminData";
import { cn } from "@/lib/utils";
import { adminTabActive, adminTabInactive, adminSubheader, adminSectionTitle } from "@/lib/admin-nav-styles";

const StoreLocationMap = lazy(() =>
  import("./StoreLocationMap").then(m => ({ default: m.StoreLocationMap })),
);

const STATUS_STYLE: Record<VerificationStatus, { color: string; bg: string; bd: string; icon: typeof Clock }> = {
  pending:          { color: "#FBBF24", bg: "rgba(245,158,11,0.12)", bd: "rgba(245,158,11,0.35)", icon: Clock },
  approved:         { color: "#34D399", bg: "rgba(16,185,129,0.12)", bd: "rgba(16,185,129,0.35)", icon: CheckCircle2 },
  rejected:         { color: "#F87171", bg: "rgba(239,68,68,0.12)", bd: "rgba(239,68,68,0.35)", icon: XCircle },
  suspended:        { color: "#94A3B8", bg: "rgba(100,116,139,0.12)", bd: "rgba(100,116,139,0.35)", icon: Slash },
  more_docs_needed: { color: "#60A5FA", bg: "rgba(59,130,246,0.12)", bd: "rgba(59,130,246,0.35)", icon: AlertTriangle },
};

function StatusBadge({ status }: { status: VerificationStatus }) {
  const { t } = useTranslation("admin");
  const c = STATUS_STYLE[status];
  const I = c.icon;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ background: c.bg, border: `1px solid ${c.bd}`, color: c.color }}>
      <I className="w-3 h-3" />{t(`verification.status.${status}`)}
    </span>
  );
}

function DocumentPreviewModal({
  open,
  onClose,
  doc,
}: {
  open: boolean;
  onClose: () => void;
  doc: { label: string; type: string; url: string } | null;
}) {
  if (!doc) return null;
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-4xl bg-[#0d1526] border-white/10 text-white p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-white/5">
          <DialogTitle className="text-sm font-bold flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            {doc.label}
          </DialogTitle>
        </DialogHeader>
        <div className="p-4 min-h-[320px] max-h-[70vh] overflow-auto bg-black/30">
          {doc.type === "image" ? (
            <img src={doc.url} alt={doc.label} className="max-w-full mx-auto rounded-lg" />
          ) : (
            <iframe src={doc.url} title={doc.label} className="w-full h-[60vh] rounded-lg border border-white/10" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReviewPanel({
  record,
  onAction,
  onPreviewDoc,
}: {
  record: VerificationRecord;
  onAction: (id: number, action: VerificationStatus, reason?: string) => void;
  onPreviewDoc: (doc: VerificationRecord["documents"][0]) => void;
}) {
  const { t } = useTranslation("admin");
  const [reason, setReason] = useState(record.rejectionReason ?? "");

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 space-y-4"
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-base font-extrabold text-white">{record.businessName}</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {t(`verification.roles.${record.role}`, { defaultValue: record.role })} · {record.sectorKey} · {record.city ?? record.governorate}
          </p>
        </div>
        <StatusBadge status={record.status} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        {record.email && (
          <div className="flex items-center gap-2 text-slate-400">
            <Mail className="w-3.5 h-3.5 shrink-0" /><span>{record.email}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-slate-400">
          <Phone className="w-3.5 h-3.5 shrink-0" /><span>{record.mobile}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <User className="w-3.5 h-3.5 shrink-0" /><span>{t("verification.idLabel")} #{record.id}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>{new Date(record.submittedAt).toLocaleDateString()}</span>
        </div>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">{t("verification.documents")}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {record.documents.map(doc => (
            <button
              key={doc.id}
              type="button"
              disabled={!doc.uploaded || !doc.url}
              onClick={() => doc.uploaded && doc.url && onPreviewDoc(doc)}
              className="flex items-center gap-2 p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:border-cyan-500/30 transition-colors disabled:opacity-40 text-start"
            >
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
                {doc.uploaded ? <FileText className="w-4 h-4 text-cyan-400" /> : <FileWarning className="w-4 h-4 text-amber-400" />}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">{doc.label}</p>
                <p className="text-[10px] text-slate-500">{doc.uploaded ? t("verification.preview") : t("verification.notUploaded")}</p>
              </div>
              {doc.uploaded && <Eye className="w-3.5 h-3.5 text-slate-500 shrink-0 ms-auto" />}
            </button>
          ))}
        </div>
      </div>

      {Number.isFinite(record.lat) && Number.isFinite(record.lng) && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {t("verification.storeLocation")}
          </p>
          <Suspense fallback={<div className="h-[260px] rounded-xl bg-white/5 flex items-center justify-center text-slate-500 text-sm">{t("common.loadingMap")}</div>}>
            <StoreLocationMap lat={record.lat} lng={record.lng} label={record.businessName} />
          </Suspense>
        </div>
      )}

      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">{t("verification.notes")}</p>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          rows={2}
          placeholder={t("verification.notesPlaceholder")}
          className="w-full rounded-xl px-3 py-2 text-xs bg-black/30 border border-white/10 text-white placeholder:text-slate-600 resize-none focus:outline-none focus:border-cyan-500/40"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => onAction(record.id, "approved")}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25">
          <CheckCircle2 className="w-3.5 h-3.5" /> {t("verification.approve")}
        </button>
        <button type="button" onClick={() => onAction(record.id, "rejected", reason)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500/25">
          <XCircle className="w-3.5 h-3.5" /> {t("verification.reject")}
        </button>
        <button type="button" onClick={() => onAction(record.id, "suspended")}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-500/15 text-slate-300 border border-slate-500/30 hover:bg-slate-500/25">
          <Slash className="w-3.5 h-3.5" /> {t("verification.suspend")}
        </button>
        {record.status === "suspended" && (
          <button type="button" onClick={() => onAction(record.id, "approved")}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/25">
            <CheckCircle2 className="w-3.5 h-3.5" /> {t("verification.reactivate")}
          </button>
        )}
        <button type="button" onClick={() => onAction(record.id, "more_docs_needed", reason)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25">
          <AlertTriangle className="w-3.5 h-3.5" /> {t("verification.requestDocs")}
        </button>
      </div>
    </motion.div>
  );
}

export function AdminVerificationTab() {
  const { t } = useTranslation("admin");
  const { dir } = useLocaleDir("admin");
  const { data: records = [], isLoading } = useAdminVerifications();
  const patchStatus = usePatchVerificationStatus();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<VerificationStatus | "all">("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ label: string; type: string; url: string } | null>(null);

  useEffect(() => {
    if (records.length && selectedId === null) {
      setSelectedId(records[0].id);
    }
  }, [records, selectedId]);

  const filtered = useMemo(() => {
    return records.filter(r => {
      const matchSearch =
        r.businessName.includes(search) ||
        r.mobile.includes(search) ||
        (r.email?.includes(search) ?? false);
      const matchStatus = statusFilter === "all" || r.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [records, search, statusFilter]);

  const selected = records.find(r => r.id === selectedId);

  const handleAction = (id: number, action: VerificationStatus, reason?: string) => {
    patchStatus.mutate({ id, status: action, rejectionReason: reason });
  };

  return (
    <div className="space-y-4" dir={dir}>
      <div>
        <h2 className={adminSectionTitle}>{t("verification.title")}</h2>
        <p className={adminSubheader}>{t("verification.subtitle")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t("verification.searchPlaceholder")}
            className="w-full ps-9 pe-3 py-2 rounded-xl text-xs bg-white/[0.03] border border-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/40"
          />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-slate-500 me-1" />
          {(["all", "pending", "approved", "rejected", "suspended", "more_docs_needed"] as const).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-colors",
                statusFilter === s
                  ? adminTabActive
                  : adminTabInactive + " bg-white/[0.03] border-white/10",
              )}
            >
              {s === "all" ? t("common.all") : t(`verification.status.${s}`)}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <p className="text-center text-slate-500 text-sm py-6">{t("common.loading")}</p>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <div className="xl:col-span-2 space-y-2 max-h-[640px] overflow-y-auto pe-1">
          {filtered.map(r => (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelectedId(r.id)}
              className={`w-full text-start p-3 rounded-xl border transition-all ${
                selectedId === r.id
                  ? "bg-cyan-500/10 border-cyan-500/40"
                  : "bg-white/[0.02] border-white/5 hover:border-cyan-500/20"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-xs font-bold text-white truncate">{r.businessName}</p>
                <StatusBadge status={r.status} />
              </div>
              <p className="text-[10px] text-slate-500">
                {t(`verification.roles.${r.role}`, { defaultValue: r.role })} · {r.mobile}
              </p>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-slate-600 text-sm py-10">{t("verification.noRecords")}</p>
          )}
        </div>

        <div className="xl:col-span-3">
          <AnimatePresence mode="wait">
            {selected ? (
              <ReviewPanel
                key={selected.id}
                record={selected}
                onAction={handleAction}
                onPreviewDoc={doc => setPreviewDoc(doc)}
              />
            ) : (
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-10 text-center text-slate-500 text-sm">
                {t("common.selectRecord")}
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <DocumentPreviewModal
        open={previewDoc !== null}
        onClose={() => setPreviewDoc(null)}
        doc={previewDoc}
      />
    </div>
  );
}
