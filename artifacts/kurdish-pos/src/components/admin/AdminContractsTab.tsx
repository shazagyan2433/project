import { useMemo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  FileText, Download, Eye, Send, Plus, CheckCircle2, Clock, XCircle, Search, User, Building2,
} from "lucide-react";
import { downloadContractAsPdf, downloadContractPdfFromPreview } from "@/lib/contract-pdf";
import { ContractPrintDocument } from "@/components/admin/ContractPrintDocument";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { AdminContract, ContractStatus, SignatureStatus } from "@/lib/admin-types";
import {
  useAdminContracts,
  useCreateAdminContract,
  useAdminVerifications,
} from "@/hooks/useAdminData";
import {
  buildContractContent,
  buildStructuredContractDocument,
  getContractTypeLabel,
  type ContractFormFields,
} from "@/lib/contract-templates";
import { adminSubheader, adminSectionTitle, adminTabInactive, adminLangActive, adminLangInactive } from "@/lib/admin-nav-styles";
import { cn } from "@/lib/utils";

const CONTRACT_TYPE_KEYS = [
  "buyer_agreement",
  "supplier_agreement",
  "enterprise_license",
  "delivery_partner",
] as const;

const STATUS_STYLE: Record<ContractStatus, { color: string; bg: string; bd: string }> = {
  active:    { color: "#34D399", bg: "rgba(16,185,129,0.12)", bd: "rgba(16,185,129,0.35)" },
  expiring:  { color: "#FBBF24", bg: "rgba(245,158,11,0.12)", bd: "rgba(245,158,11,0.35)" },
  expired:   { color: "#F87171", bg: "rgba(239,68,68,0.12)", bd: "rgba(239,68,68,0.35)" },
};

const SIG_STYLE: Record<SignatureStatus, { color: string; icon: typeof CheckCircle2 }> = {
  signed:   { color: "#34D399", icon: CheckCircle2 },
  pending:  { color: "#FBBF24", icon: Clock },
  unsigned: { color: "#94A3B8", icon: XCircle },
};

const INPUT_CLASS =
  "w-full mt-1 rounded-xl px-3 py-2 bg-black/30 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-500/40 placeholder:text-slate-600";

const LABEL_CLASS = "text-[10px] font-bold text-slate-200 uppercase tracking-wider";

type PartyMode = "registered" | "custom";
type ContentLang = "ku" | "ar" | "en";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className={LABEL_CLASS}>{children}</label>;
}

function LangToggle({
  lang,
  onChange,
}: {
  lang: ContentLang;
  onChange: (l: ContentLang) => void;
}) {
  const { t } = useTranslation("admin");
  return (
    <div className="flex gap-2">
      {(["ku", "ar", "en"] as const).map(l => (
        <button
          key={l}
          type="button"
          onClick={() => onChange(l)}
          className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
            lang === l ? adminLangActive : `${adminLangInactive} bg-white/5 border-white/10`
          }`}
        >
          {t(`lang.${l}`)}
        </button>
      ))}
    </div>
  );
}

function ContractViewerModal({
  open,
  onClose,
  contract,
}: {
  open: boolean;
  onClose: () => void;
  contract: AdminContract | null;
}) {
  const { t, i18n: i18nInstance } = useTranslation("admin");
  const [viewLang, setViewLang] = useState<ContentLang>(
    (i18nInstance.language as ContentLang) || "ku",
  );
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    if (!open || !contract) return;
    const lng = i18nInstance.language;
    const nextLang: ContentLang = lng === "ar" || lng === "en" ? lng : "ku";
    setViewLang(prev => (prev === nextLang ? prev : nextLang));
  }, [open, contract?.id, i18nInstance.language]);

  const structured = contract ? buildStructuredContractDocument(contract, viewLang) : null;

  const handlePdfDownload = async () => {
    if (!contract) return;
    setPdfLoading(true);
    try {
      await downloadContractPdfFromPreview(contract.id, viewLang);
    } catch (err) {
      console.error("PDF download failed:", err);
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={isOpen => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent className="max-w-4xl z-[100] bg-[#0d1526] border-white/10 text-white p-0 gap-0 overflow-hidden">
        {contract && structured ? (
          <>
            <div className="contract-no-print px-6 pt-6 pb-4 border-b border-white/5">
              <DialogHeader className="space-y-1">
                <DialogTitle className="text-sm font-bold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  {contract.userName} — {getContractTypeLabel(contract.type, viewLang)}
                </DialogTitle>
              </DialogHeader>

              <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
                <LangToggle lang={viewLang} onChange={setViewLang} />
                <button
                  type="button"
                  onClick={() => handlePdfDownload()}
                  disabled={pdfLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 text-white hover:bg-cyan-400 shadow-lg shadow-cyan-500/20 disabled:opacity-60"
                >
                  <Download className="w-4 h-4" />
                  {pdfLoading ? t("contracts.print.generating") : t("contracts.print.printSave")}
                </button>
              </div>
            </div>

            <div className="px-4 py-4 max-h-[65vh] overflow-y-auto bg-[#0a0f1e]">
              <ContractPrintDocument doc={structured} lang={viewLang} />
            </div>
          </>
        ) : (
          <div className="px-6 py-12 text-center text-slate-500 text-sm">
            {t("common.loading")}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CreateContractModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (c: AdminContract) => void;
}) {
  const { t, i18n: i18nInstance } = useTranslation("admin");
  const { data: registeredUsers = [] } = useAdminVerifications();

  const [partyMode, setPartyMode] = useState<PartyMode>("registered");
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(registeredUsers[0]?.id ?? null);
  const [firstPartyName, setFirstPartyName] = useState(t("common.defaultFirstParty"));
  const [secondPartyName, setSecondPartyName] = useState("");
  const [idOrPhone, setIdOrPhone] = useState("");
  const [amountOrTerms, setAmountOrTerms] = useState("");
  const [customTerms, setCustomTerms] = useState("");
  const [type, setType] = useState<string>("buyer_agreement");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
  );

  useEffect(() => {
    if (!open) return;
    setPartyMode("registered");
    setUserSearch("");
    const first = registeredUsers[0];
    setSelectedUserId(first?.id ?? null);
    setFirstPartyName(t("common.defaultFirstParty"));
    setSecondPartyName(first?.businessName ?? "");
    setIdOrPhone(first?.mobile ?? "");
    setAmountOrTerms("");
    setCustomTerms("");
    setType("buyer_agreement");
    setStartDate(new Date().toISOString().slice(0, 10));
    setEndDate(new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10));
  }, [open, i18nInstance.language]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return registeredUsers;
    return registeredUsers.filter(
      u =>
        u.businessName.toLowerCase().includes(q) ||
        u.mobile.includes(q) ||
        (u.email?.toLowerCase().includes(q) ?? false),
    );
  }, [registeredUsers, userSearch]);

  const selectRegisteredUser = (id: number) => {
    const user = registeredUsers.find(u => u.id === id);
    if (!user) return;
    setSelectedUserId(id);
    setSecondPartyName(user.businessName);
    setIdOrPhone(user.mobile);
    setUserSearch(user.businessName);
  };

  const switchToCustom = () => {
    setPartyMode("custom");
    setSelectedUserId(null);
    setSecondPartyName("");
    setIdOrPhone("");
    setUserSearch("");
  };

  const switchToRegistered = () => {
    setPartyMode("registered");
    const first = filteredUsers[0] ?? registeredUsers[0];
    if (first) selectRegisteredUser(first.id);
  };

  const canCreate = secondPartyName.trim().length > 0;

  const handleCreate = () => {
    if (!canCreate) return;

    const fields: ContractFormFields = {
      firstPartyName: firstPartyName.trim() || t("common.defaultFirstParty"),
      secondPartyName: secondPartyName.trim(),
      idOrPhone: idOrPhone.trim(),
      amountOrTerms: amountOrTerms.trim(),
      customTerms: customTerms.trim(),
      type,
      startDate,
      endDate,
    };

    const contract: AdminContract = {
      id: `ctr-${Date.now()}`,
      userId: partyMode === "registered" ? selectedUserId : null,
      userName: fields.secondPartyName,
      type,
      status: "active",
      signatureStatus: "pending",
      startDate,
      endDate,
      content: buildContractContent(fields),
      firstPartyName: fields.firstPartyName,
      secondPartyName: fields.secondPartyName,
      idOrPhone: fields.idOrPhone,
      amountOrTerms: fields.amountOrTerms,
      customTerms: fields.customTerms,
    };
    onCreate(contract);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-[#0d1526] border-white/10 text-white max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold">{t("contracts.createTitle")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div>
            <FieldLabel>{t("contracts.partySection")}</FieldLabel>
            <div className="flex gap-2 mt-1">
              <button
                type="button"
                onClick={switchToRegistered}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                  partyMode === "registered"
                    ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/40"
                    : `${adminTabInactive} bg-white/5 border-white/10`
                }`}
              >
                <User className="w-3.5 h-3.5" />
                {t("contracts.modeRegistered")}
              </button>
              <button
                type="button"
                onClick={switchToCustom}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                  partyMode === "custom"
                    ? "bg-violet-500/20 text-violet-400 border-violet-500/40"
                    : `${adminTabInactive} bg-white/5 border-white/10`
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                {t("contracts.modeCustom")}
              </button>
            </div>
          </div>

          {partyMode === "registered" ? (
            <div>
              <FieldLabel>{t("contracts.searchUsers")}</FieldLabel>
              <div className="relative mt-1">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder={t("contracts.searchPlaceholder")}
                  className={`${INPUT_CLASS} ps-9`}
                  dir="auto"
                />
              </div>
              <div className="mt-2 max-h-28 overflow-y-auto rounded-xl border border-white/10 bg-black/20 divide-y divide-white/5">
                {filteredUsers.map(u => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => selectRegisteredUser(u.id)}
                    className={`w-full text-start px-3 py-2 text-xs transition-colors ${
                      selectedUserId === u.id
                        ? "bg-cyan-500/15 text-cyan-300"
                        : "text-slate-300 hover:bg-white/5"
                    }`}
                  >
                    <span className="font-bold">{u.businessName}</span>
                    <span className="text-slate-500 ms-2">{u.mobile}</span>
                  </button>
                ))}
                {filteredUsers.length === 0 && (
                  <p className="px-3 py-3 text-xs text-slate-500 text-center">{t("common.noResults")}</p>
                )}
              </div>
            </div>
          ) : (
            <div>
              <FieldLabel>{t("contracts.partyCompanyName")}</FieldLabel>
              <input
                value={secondPartyName}
                onChange={e => setSecondPartyName(e.target.value)}
                placeholder={t("contracts.partyCompanyPlaceholder")}
                className={INPUT_CLASS}
                dir="auto"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <FieldLabel>{t("contracts.firstParty")}</FieldLabel>
              <input
                value={firstPartyName}
                onChange={e => setFirstPartyName(e.target.value)}
                placeholder={t("contracts.firstPartyPlaceholder")}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <FieldLabel>{t("contracts.secondParty")}</FieldLabel>
              <input
                value={secondPartyName}
                onChange={e => setSecondPartyName(e.target.value)}
                placeholder={t("contracts.secondPartyPlaceholder")}
                className={INPUT_CLASS}
                dir="auto"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <FieldLabel>{t("contracts.idOrPhone")}</FieldLabel>
              <input
                value={idOrPhone}
                onChange={e => setIdOrPhone(e.target.value)}
                placeholder={t("contracts.idOrPhonePlaceholder")}
                className={INPUT_CLASS}
                dir="ltr"
              />
            </div>
            <div>
              <FieldLabel>{t("contracts.amountTerms")}</FieldLabel>
              <input
                value={amountOrTerms}
                onChange={e => setAmountOrTerms(e.target.value)}
                placeholder={t("contracts.amountTermsPlaceholder")}
                className={INPUT_CLASS}
                dir="auto"
              />
            </div>
          </div>

          <div>
            <FieldLabel>{t("contracts.contractType")}</FieldLabel>
            <select value={type} onChange={e => setType(e.target.value)} className={INPUT_CLASS}>
              {CONTRACT_TYPE_KEYS.map(key => (
                <option key={key} value={key}>{t(`contracts.types.${key}`)}</option>
              ))}
            </select>
          </div>

          <div>
            <FieldLabel>{t("contracts.customTerms")}</FieldLabel>
            <textarea
              value={customTerms}
              onChange={e => setCustomTerms(e.target.value)}
              rows={4}
              placeholder={t("contracts.customTermsPlaceholder")}
              className={`${INPUT_CLASS} resize-y min-h-[96px]`}
              dir="auto"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>{t("contracts.startDate")}</FieldLabel>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <FieldLabel>{t("contracts.endDate")}</FieldLabel>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4 gap-2 sm:gap-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 border border-white/10 hover:bg-white/5"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!canCreate}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 text-white hover:bg-cyan-400 disabled:opacity-40 disabled:pointer-events-none"
          >
            {t("common.create")}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AdminContractsTab() {
  const { t, i18n: i18nInstance } = useTranslation("admin");
  const { data: contracts = [], isLoading } = useAdminContracts();
  const createContract = useCreateAdminContract();
  const [selectedContract, setSelectedContract] = useState<AdminContract | null>(null);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [reminderSent, setReminderSent] = useState<string | null>(null);
  const [rowPdfId, setRowPdfId] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...contracts].sort((a, b) => b.startDate.localeCompare(a.startDate)),
    [contracts],
  );

  const openContractPreview = (contract: AdminContract) => {
    setSelectedContract(contract);
    setIsContractModalOpen(true);
  };

  const closeContractPreview = () => {
    setIsContractModalOpen(false);
    setSelectedContract(null);
  };

  const handleDownload = async (c: AdminContract) => {
    const lng = i18nInstance.language;
    const contentLang: ContentLang = lng === "ar" || lng === "en" ? lng : "ku";
    setRowPdfId(c.id);
    try {
      if (isContractModalOpen && selectedContract?.id === c.id) {
        await downloadContractPdfFromPreview(c.id, contentLang);
      } else {
        await downloadContractAsPdf(c, contentLang);
      }
    } catch (err) {
      console.error("PDF download failed:", err);
    } finally {
      setRowPdfId(null);
    }
  };

  const handleReminder = (id: string) => {
    setReminderSent(id);
    setTimeout(() => setReminderSent(null), 2500);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className={adminSectionTitle}>{t("contracts.title")}</h2>
          <p className={adminSubheader}>{t("contracts.subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 text-white hover:bg-cyan-400 shadow-lg shadow-cyan-500/20"
        >
          <Plus className="w-3.5 h-3.5" /> {t("contracts.newContract")}
        </button>
      </div>

      <div className="rounded-2xl border border-white/5 bg-white/[0.03] overflow-hidden">
        {isLoading ? (
          <p className="text-center text-slate-500 text-sm py-12">{t("common.loading")}</p>
        ) : sorted.length === 0 ? (
          <p className="text-center text-slate-500 text-sm py-12">{t("contracts.noData", { defaultValue: "No contracts yet" })}</p>
        ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/5 text-slate-200 text-[10px] font-semibold uppercase tracking-wider">
              <th className="px-4 py-3 text-start">{t("contracts.tableUser")}</th>
              <th className="px-4 py-3 text-start">{t("contracts.tableType")}</th>
              <th className="px-4 py-3 text-start">{t("contracts.tableTerm")}</th>
              <th className="px-4 py-3 text-start">{t("contracts.tableStatus")}</th>
              <th className="px-4 py-3 text-start">{t("contracts.tableSignature")}</th>
              <th className="px-4 py-3 text-end">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(c => {
              const st = STATUS_STYLE[c.status];
              const sig = SIG_STYLE[c.signatureStatus];
              const SigIcon = sig.icon;
              return (
                <tr key={c.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-bold text-white">{c.userName}</td>
                  <td className="px-4 py-3 text-slate-400">{getContractTypeLabel(c.type)}</td>
                  <td className="px-4 py-3 text-slate-400 font-mono text-[10px]">
                    {c.startDate} — {c.endDate}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{ background: st.bg, border: `1px solid ${st.bd}`, color: st.color }}
                    >
                      {t(`contracts.status.${c.status}`)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{ color: sig.color }}
                    >
                      <SigIcon className="w-3 h-3" />
                      {t(`contracts.signature.${c.signatureStatus}`)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleDownload(c)}
                        disabled={rowPdfId === c.id}
                        className="p-2 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:border-cyan-500/30 disabled:opacity-50"
                        title={t("common.download")}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={e => {
                          e.preventDefault();
                          e.stopPropagation();
                          openContractPreview(c);
                        }}
                        className="p-2 rounded-lg border border-white/10 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30"
                        title={t("common.preview")}
                        aria-label={t("common.preview")}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {c.signatureStatus !== "signed" && (
                        <button
                          type="button"
                          onClick={() => handleReminder(c.id)}
                          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-amber-500/30 text-amber-400 text-[10px] font-bold hover:bg-amber-500/10"
                        >
                          <Send className="w-3 h-3" />
                          {reminderSent === c.id ? t("common.sent") : t("contracts.reminder")}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        )}
      </div>

      <ContractViewerModal
        open={isContractModalOpen}
        onClose={closeContractPreview}
        contract={selectedContract}
      />
      <CreateContractModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={c => createContract.mutate(c)}
      />
    </div>
  );
}
