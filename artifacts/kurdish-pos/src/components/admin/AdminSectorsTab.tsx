import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { adminSubheader, adminSectionTitle } from "@/lib/admin-nav-styles";
import { Plus, Pencil, Trash2, Layers, Tag } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { AdminSectorRow, AdminCategoryRow } from "@/lib/admin-types";
import { useAdminCatalog, useSaveAdminCatalog } from "@/hooks/useAdminData";

const GROUP_KEYS = ["enterprise", "retail", "standard", "delivery"] as const;

function SectorFormModal({
  open,
  onClose,
  initial,
  categories,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  initial?: AdminSectorRow;
  categories: AdminCategoryRow[];
  onSave: (row: AdminSectorRow) => void;
}) {
  const { t } = useTranslation("admin");
  const [key, setKey] = useState(initial?.key ?? "");
  const [nameKu, setNameKu] = useState(initial?.nameKu ?? "");
  const [nameAr, setNameAr] = useState(initial?.nameAr ?? "");
  const [nameEn, setNameEn] = useState(initial?.nameEn ?? "");
  const [group, setGroup] = useState(initial?.group ?? "standard");
  const [color, setColor] = useState(initial?.color ?? "#3B82F6");
  const [selectedCats, setSelectedCats] = useState<string[]>(initial?.categories ?? []);

  const toggleCat = (k: string) => {
    setSelectedCats(prev => prev.includes(k) ? prev.filter(c => c !== k) : [...prev, k]);
  };

  const handleSave = () => {
    if (!key.trim() || !nameKu.trim()) return;
    onSave({
      key: key.trim(),
      nameKu,
      nameAr,
      nameEn,
      group,
      color,
      categories: selectedCats,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-[#0d1526] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold">
            {initial ? t("sectors.editSector") : t("sectors.newSector")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-xs">
          <input value={key} onChange={e => setKey(e.target.value)} disabled={!!initial}
            placeholder={t("sectors.keyPlaceholder")} className="w-full rounded-xl px-3 py-2 bg-black/30 border border-white/10 text-white disabled:opacity-50" />
          <input value={nameKu} onChange={e => setNameKu(e.target.value)} placeholder={t("sectors.nameKuPlaceholder")}
            className="w-full rounded-xl px-3 py-2 bg-black/30 border border-white/10 text-white" dir="rtl" />
          <input value={nameAr} onChange={e => setNameAr(e.target.value)} placeholder={t("sectors.nameArPlaceholder")}
            className="w-full rounded-xl px-3 py-2 bg-black/30 border border-white/10 text-white" dir="rtl" />
          <input value={nameEn} onChange={e => setNameEn(e.target.value)} placeholder={t("sectors.nameEnPlaceholder")}
            className="w-full rounded-xl px-3 py-2 bg-black/30 border border-white/10 text-white" />
          <select value={group} onChange={e => setGroup(e.target.value)}
            className="w-full rounded-xl px-3 py-2 bg-black/30 border border-white/10 text-white">
            {GROUP_KEYS.map(g => <option key={g} value={g}>{t(`sectors.groups.${g}`)}</option>)}
          </select>
          <div className="flex items-center gap-2">
            <label className="text-slate-500">{t("sectors.color")}</label>
            <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-10 h-8 rounded cursor-pointer" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 mb-2">{t("sectors.categories")}</p>
            <div className="flex flex-wrap gap-1.5">
              {categories.map(c => (
                <button key={c.key} type="button" onClick={() => toggleCat(c.key)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                    selectedCats.includes(c.key)
                      ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/40"
                      : "bg-white/5 text-slate-400 border-white/10"
                  }`}>
                  {c.nameKu}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter className="mt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 border border-white/10">{t("common.cancel")}</button>
          <button type="button" onClick={handleSave} className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 text-white">{t("common.save")}</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CategoryFormModal({
  open,
  onClose,
  initial,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  initial?: AdminCategoryRow;
  onSave: (row: AdminCategoryRow) => void;
}) {
  const { t } = useTranslation("admin");
  const [key, setKey] = useState(initial?.key ?? "");
  const [nameKu, setNameKu] = useState(initial?.nameKu ?? "");
  const [nameAr, setNameAr] = useState(initial?.nameAr ?? "");
  const [nameEn, setNameEn] = useState(initial?.nameEn ?? "");

  const handleSave = () => {
    if (!key.trim() || !nameKu.trim()) return;
    onSave({ key: key.trim(), nameKu, nameAr, nameEn });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-[#0d1526] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold">{initial ? t("sectors.editCategory") : t("sectors.newCategory")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-xs">
          <input value={key} onChange={e => setKey(e.target.value)} disabled={!!initial} placeholder={t("sectors.keyPlaceholder")}
            className="w-full rounded-xl px-3 py-2 bg-black/30 border border-white/10 text-white disabled:opacity-50" />
          <input value={nameKu} onChange={e => setNameKu(e.target.value)} placeholder={t("sectors.nameKuPlaceholder")} dir="rtl"
            className="w-full rounded-xl px-3 py-2 bg-black/30 border border-white/10 text-white" />
          <input value={nameAr} onChange={e => setNameAr(e.target.value)} placeholder={t("sectors.nameArPlaceholder")} dir="rtl"
            className="w-full rounded-xl px-3 py-2 bg-black/30 border border-white/10 text-white" />
          <input value={nameEn} onChange={e => setNameEn(e.target.value)} placeholder={t("sectors.nameEnPlaceholder")}
            className="w-full rounded-xl px-3 py-2 bg-black/30 border border-white/10 text-white" />
        </div>
        <DialogFooter className="mt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 border border-white/10">{t("common.cancel")}</button>
          <button type="button" onClick={handleSave} className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 text-white">{t("common.save")}</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AdminSectorsTab() {
  const { t } = useTranslation("admin");
  const { data: catalog, isLoading } = useAdminCatalog();
  const saveCatalog = useSaveAdminCatalog();
  const [sectors, setSectors] = useState<AdminSectorRow[]>([]);
  const [categories, setCategories] = useState<AdminCategoryRow[]>([]);
  const [sectorModal, setSectorModal] = useState<{ open: boolean; row?: AdminSectorRow }>({ open: false });
  const [catModal, setCatModal] = useState<{ open: boolean; row?: AdminCategoryRow }>({ open: false });

  useEffect(() => {
    if (catalog) {
      setSectors(catalog.sectors ?? []);
      setCategories(catalog.categories ?? []);
    }
  }, [catalog]);

  const persist = (nextSectors: AdminSectorRow[], nextCategories: AdminCategoryRow[]) => {
    saveCatalog.mutate({ sectors: nextSectors, categories: nextCategories });
  };

  const deleteSector = (key: string) => {
    const nextSectors = sectors.filter(s => s.key !== key);
    setSectors(nextSectors);
    persist(nextSectors, categories);
  };
  const deleteCategory = (key: string) => {
    const nextCategories = categories.filter(c => c.key !== key);
    const nextSectors = sectors.map(s => ({
      ...s,
      categories: s.categories.filter(c => c !== key),
    }));
    setCategories(nextCategories);
    setSectors(nextSectors);
    persist(nextSectors, nextCategories);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className={adminSectionTitle}>{t("sectors.title")}</h2>
        <p className={adminSubheader}>{t("sectors.subtitle")}</p>
      </div>

      {isLoading && (
        <p className="text-center text-slate-500 text-sm py-6">{t("common.loading")}</p>
      )}

      {!isLoading && sectors.length === 0 && categories.length === 0 && (
        <p className="text-center text-slate-500 text-sm py-6">{t("sectors.noData", { defaultValue: "No sectors or categories yet" })}</p>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" /> {t("sectors.sectors")}
            </h3>
            <button type="button" onClick={() => setSectorModal({ open: true })}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
              <Plus className="w-3 h-3" /> {t("common.add")}
            </button>
          </div>
          <div className="space-y-2">
            {sectors.map(s => (
              <div key={s.key} className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.02]">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: s.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white">{s.nameKu}</p>
                  <p className="text-[10px] text-slate-500">
                    {s.nameEn} · {t(`sectors.groups.${s.group}`, { defaultValue: s.group })} · {t("sectors.categoryCount", { count: s.categories.length })}
                  </p>
                </div>
                <button type="button" onClick={() => setSectorModal({ open: true, row: s })}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 border border-transparent hover:border-cyan-500/30">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => deleteSector(s.key)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 border border-transparent hover:border-rose-500/30">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Tag className="w-4 h-4 text-violet-400" /> {t("sectors.categories")}
            </h3>
            <button type="button" onClick={() => setCatModal({ open: true })}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-bold bg-violet-500/15 text-violet-400 border border-violet-500/30">
              <Plus className="w-3 h-3" /> {t("common.add")}
            </button>
          </div>
          <div className="space-y-2">
            {categories.map(c => (
              <div key={c.key} className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.02]">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white">{c.nameKu}</p>
                  <p className="text-[10px] text-slate-500">{c.nameAr} · {c.nameEn}</p>
                </div>
                <button type="button" onClick={() => setCatModal({ open: true, row: c })}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-violet-400 border border-transparent hover:border-violet-500/30">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => deleteCategory(c.key)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 border border-transparent hover:border-rose-500/30">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <SectorFormModal
        open={sectorModal.open}
        onClose={() => setSectorModal({ open: false })}
        initial={sectorModal.row}
        categories={categories}
        onSave={row => {
          const nextSectors = sectorModal.row
            ? sectors.map(s => (s.key === row.key ? row : s))
            : [...sectors, row];
          setSectors(nextSectors);
          persist(nextSectors, categories);
        }}
      />
      <CategoryFormModal
        open={catModal.open}
        onClose={() => setCatModal({ open: false })}
        initial={catModal.row}
        onSave={row => {
          const nextCategories = catModal.row
            ? categories.map(c => (c.key === row.key ? row : c))
            : [...categories, row];
          setCategories(nextCategories);
          persist(sectors, nextCategories);
        }}
      />
    </div>
  );
}
