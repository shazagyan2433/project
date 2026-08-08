import { useState, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  BookOpen, Search, MapPin, Star, Shield, Phone, Package, Loader2,
  MessageSquare, Info,
} from "lucide-react";
import { useUserSectorKey } from "@/hooks/useSectorScope";
import { PageHeader } from "@/components/PageHeader";
import {
  MarketplaceRequestModal,
  type MarketplaceRequestContext,
} from "@/components/marketplace/MarketplaceRequestModal";
import {
  isSupplierSectorAllowedForBuyer,
  getPrimaryCategoryLabelForSector,
  getDefaultSectorCategory,
} from "@/lib/industries";
import { useSuppliers, type ApiSupplier } from "@/hooks/useB2bData";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { PAGE_INPUT, PAGE_SELECT, PAGE_MUTED, PAGE_ICON, PAGE_SURFACE } from "@/lib/page-theme";
import { C } from "./dashboard-tokens";

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className="w-3 h-3"
          style={{
            color: i <= Math.round(rating) ? "#F59E0B" : C.border,
            fill: i <= Math.round(rating) ? "#F59E0B" : "transparent",
          }}
        />
      ))}
      {rating > 0 && <span className={cn("text-[10px] ms-1", PAGE_MUTED)}>{rating}</span>}
    </div>
  );
}

function buildContactContext(s: ApiSupplier, buyerSectorKey: string | null): MarketplaceRequestContext | null {
  const cat = getDefaultSectorCategory(buyerSectorKey);
  if (!cat) return null;
  return {
    productName: "",
    supplierId: s.id,
    supplierName: s.name,
    supplierPhone: s.phone,
    unit: "دانە",
    category: cat,
    quantity: "1",
  };
}

export default function SupplierDirectory() {
  const { t } = useTranslation("common");
  const [, navigate] = useLocation();
  const sectorKey = useUserSectorKey();
  const { data, isLoading, isError, isSuccess } = useSuppliers();
  const apiSuppliers = isSuccess ? (data ?? []) : [];
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("__all__");
  const [city, setCity] = useState("__all__");
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestContext, setRequestContext] = useState<MarketplaceRequestContext | null>(null);

  const sectorSuppliers = useMemo(
    () =>
      apiSuppliers
        .filter((s) => isSupplierSectorAllowedForBuyer(s.sectorKey, sectorKey))
        .map((s) => ({
          ...s,
          category: getPrimaryCategoryLabelForSector(s.sectorKey),
        })),
    [apiSuppliers, sectorKey],
  );

  const visibleCats = useMemo(() => {
    const cats = new Set(sectorSuppliers.map((s) => s.category).filter(Boolean));
    return ["__all__", ...Array.from(cats)];
  }, [sectorSuppliers]);

  const cities = useMemo(() => {
    const set = new Set(sectorSuppliers.map((s) => s.city).filter(Boolean));
    return ["__all__", ...Array.from(set)];
  }, [sectorSuppliers]);

  const filtered = sectorSuppliers.filter((s) => {
    const q = search.trim().toLowerCase();
    const matchSearch =
      q === "" ||
      s.name.toLowerCase().includes(q) ||
      s.products.some((p) => p.toLowerCase().includes(q));
    const matchCat = cat === "__all__" || s.category === cat;
    const matchCity = city === "__all__" || s.city === city;
    return matchSearch && matchCat && matchCity;
  });

  const verifiedCount = isSuccess ? sectorSuppliers.filter((s) => s.verified).length : 0;
  const totalCount = isSuccess ? sectorSuppliers.length : 0;
  const showEmptyState = !isLoading && (!isSuccess || isError || sectorSuppliers.length === 0);
  const showFilterEmpty =
    isSuccess && !isError && sectorSuppliers.length > 0 && filtered.length === 0;

  const openContact = useCallback((s: ApiSupplier) => {
    const ctx = buildContactContext(s, sectorKey);
    if (!ctx) return;
    setRequestContext(ctx);
    setRequestOpen(true);
  }, [sectorKey]);

  const openProfile = useCallback(
    (s: ApiSupplier) => {
      navigate(`/marketplace/seller/${s.id}`);
    },
    [navigate],
  );

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{ background: "rgba(20,184,166,0.15)", border: "1px solid rgba(20,184,166,0.3)" }}
        >
          <BookOpen className="w-5 h-5" style={{ color: "#14B8A6" }} />
        </div>
        <div>
          <PageHeader id="suppliers" />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className={cn("absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4", PAGE_ICON)} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("emptyStates.searchSuppliers")}
            className={cn(PAGE_INPUT, "ps-9 pe-4 py-2.5")}
          />
        </div>
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          className={cn(PAGE_SELECT, "font-normal")}
        >
          {visibleCats.map((c) => (
            <option key={c} value={c}>
              {c === "__all__" ? t("emptyStates.filterAllCategories") : c}
            </option>
          ))}
        </select>
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className={cn(PAGE_SELECT, "font-normal")}
        >
          {cities.map((c) => (
            <option key={c} value={c}>
              {c === "__all__" ? t("emptyStates.filterAllCities") : c}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-3 text-xs">
        <span
          className="px-3 py-1.5 rounded-xl font-bold"
          style={{ background: "rgba(20,184,166,0.1)", color: "#2DD4BF", border: "1px solid rgba(20,184,166,0.2)" }}
        >
          {verifiedCount} {t("emptyStates.verifiedCount")}
        </span>
        <span className={cn("px-3 py-1.5 rounded-xl font-bold linqi-page-card", PAGE_MUTED)}>
          {totalCount} {t("emptyStates.totalSuppliers")}
        </span>
      </div>

      {isLoading && (
        <div className="py-20 text-center linqi-page-muted">
          <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin opacity-50" />
          <p className="text-sm">{t("common.loading")}</p>
        </div>
      )}

      {showEmptyState && (
        <div className={cn("text-center py-14 rounded-2xl", PAGE_SURFACE)}>
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20 linqi-page-muted" />
          <p className="text-sm font-semibold linqi-page-heading">{t("emptyStates.noSuppliers")}</p>
        </div>
      )}

      {showFilterEmpty && (
        <div className={cn("text-center py-14 rounded-2xl", PAGE_SURFACE)}>
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20 linqi-page-muted" />
          <p className="text-sm font-semibold linqi-page-heading">{t("emptyStates.noSuppliersFilter")}</p>
          <p className="text-xs linqi-page-muted mt-1">{t("emptyStates.noSuppliersFilterSubtitle")}</p>
        </div>
      )}

      {isSuccess && !isError && filtered.length > 0 && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className={cn("rounded-2xl p-5 group transition-all hover:scale-[1.01] linqi-page-card")}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center font-extrabold text-lg shrink-0 linqi-page-heading"
                  style={{ background: `linear-gradient(135deg,${s.color}60,${s.color}30)`, border: `1px solid ${s.color}30` }}
                >
                  {s.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-extrabold linqi-page-heading truncate">{s.name}</p>
                    {s.verified && <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                  </div>
                  {s.rating > 0 ? <Stars rating={s.rating} /> : <p className={cn("text-[10px]", PAGE_MUTED)}>—</p>}
                </div>
              </div>
              {s.badge && (
                <span
                  className="text-[10px] font-extrabold px-2 py-1 rounded-lg shrink-0"
                  style={{ color: s.color, background: `${s.color}15`, border: `1px solid ${s.color}25` }}
                >
                  {s.badge}
                </span>
              )}
            </div>

            <div className={cn("flex items-center gap-4 text-xs mb-3 flex-wrap", PAGE_MUTED)}>
              {s.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />{s.city}
                </span>
              )}
              {s.category && (
                <span className="flex items-center gap-1">
                  <Package className="w-3 h-3" />{s.category}
                </span>
              )}
              {s.deals > 0 && <span>{t("emptyStates.dealsCount", { count: s.deals })}</span>}
            </div>

            {s.products.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {s.products.map((p) => (
                  <span
                    key={p}
                    className={cn("text-[10px] px-2 py-0.5 rounded-lg font-semibold linqi-page-card", PAGE_MUTED)}
                  >
                    {p}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between gap-3 flex-wrap">
              {s.phone ? (
                <a
                  href={`tel:${s.phone}`}
                  className={cn("text-[11px] flex items-center gap-1.5 hover:linqi-page-heading transition-colors", PAGE_MUTED)}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Phone className="w-3 h-3" />{s.phone}
                </a>
              ) : (
                <span className={cn("text-[11px]", PAGE_MUTED)}>—</span>
              )}
              <div className="flex items-center gap-2 ms-auto">
                <button
                  type="button"
                  onClick={() => openContact(s)}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all"
                  style={{ background: "rgba(20,184,166,0.1)", color: "#2DD4BF", border: "1px solid rgba(20,184,166,0.2)" }}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  {t("emptyStates.contactSupplier")}
                </button>
                <button
                  type="button"
                  onClick={() => openProfile(s)}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all linqi-page-card"
                >
                  <Info className="w-3.5 h-3.5" />
                  {t("supplierProfile.viewInfo")}
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      )}

      <MarketplaceRequestModal
        open={requestOpen}
        onClose={() => { setRequestOpen(false); setRequestContext(null); }}
        initial={requestContext}
      />
    </div>
  );
}
