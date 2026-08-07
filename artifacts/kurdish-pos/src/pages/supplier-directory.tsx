import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { BookOpen, Search, MapPin, Star, Shield, ChevronRight, Phone, Package, Loader2 } from "lucide-react";
import { useUserSectorKey, useSectorLabel } from "@/hooks/useSectorScope";
import { isSupplierSectorAllowedForBuyer, getPrimaryCategoryLabelForSector } from "@/lib/industries";
import { useSuppliers } from "@/hooks/useB2bData";
import { useTranslation } from "react-i18next";

const ALL_CATS_LABEL = "هەموو";
const ALL_CITIES_LABEL = "هەموو شار";

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className="w-3 h-3"
          style={{
            color: i <= Math.round(rating) ? "#F59E0B" : "rgba(255,255,255,0.15)",
            fill: i <= Math.round(rating) ? "#F59E0B" : "transparent",
          }}
        />
      ))}
      {rating > 0 && <span className="text-[10px] text-white/50 ms-1">{rating}</span>}
    </div>
  );
}

export default function SupplierDirectory() {
  const { t } = useTranslation("common");
  const sectorLabel = useSectorLabel();
  const sectorKey = useUserSectorKey();
  const { data: apiSuppliers = [], isLoading } = useSuppliers();
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState(ALL_CATS_LABEL);
  const [city, setCity] = useState(ALL_CITIES_LABEL);

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
    return [ALL_CATS_LABEL, ...Array.from(cats)];
  }, [sectorSuppliers]);

  const cities = useMemo(() => {
    const set = new Set(sectorSuppliers.map((s) => s.city).filter(Boolean));
    return [ALL_CITIES_LABEL, ...Array.from(set)];
  }, [sectorSuppliers]);

  const filtered = sectorSuppliers.filter((s) => {
    const matchSearch =
      search === "" ||
      s.name.includes(search) ||
      s.products.some((p) => p.includes(search));
    const matchCat = cat === ALL_CATS_LABEL || s.category === cat;
    const matchCity = city === ALL_CITIES_LABEL || s.city === city;
    return matchSearch && matchCat && matchCity;
  });

  const verifiedCount = sectorSuppliers.filter((s) => s.verified).length;

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
          <h1 className="text-2xl font-extrabold text-white">{t("pageTitles.suppliers", { sector: sectorLabel })}</h1>
          <p className="text-xs text-white/40">{t("pageTitles.suppliersSubtitle", { sector: sectorLabel })}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("emptyStates.searchSuppliers")}
            className="w-full ps-9 pe-4 py-2.5 rounded-xl text-sm text-white/80 placeholder-white/25 outline-none"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
          />
        </div>
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          className="px-3 py-2.5 rounded-xl text-sm text-white/70 outline-none"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {visibleCats.map((c) => (
            <option key={c} value={c} style={{ background: "#0d1526" }}>{c}</option>
          ))}
        </select>
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="px-3 py-2.5 rounded-xl text-sm text-white/70 outline-none"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {cities.map((c) => (
            <option key={c} value={c} style={{ background: "#0d1526" }}>{c}</option>
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
        <span
          className="px-3 py-1.5 rounded-xl font-bold"
          style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {sectorSuppliers.length} {t("emptyStates.totalSuppliers")}
        </span>
      </div>

      {isLoading && (
        <div className="py-20 text-center text-white/40">
          <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin opacity-50" />
          <p className="text-sm">{t("common.loading", { defaultValue: "بارکردن…" })}</p>
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-14">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20 text-white" />
          <p className="text-sm font-semibold text-white/50">{t("emptyStates.noSuppliers")}</p>
          <p className="text-xs text-white/25 mt-1">{t("emptyStates.noSuppliersSubtitle")}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="rounded-2xl p-5 cursor-pointer group transition-all hover:scale-[1.01]"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-extrabold text-lg shrink-0"
                  style={{ background: `linear-gradient(135deg,${s.color}60,${s.color}30)`, border: `1px solid ${s.color}30` }}
                >
                  {s.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-extrabold text-white">{s.name}</p>
                    {s.verified && <Shield className="w-3.5 h-3.5" style={{ color: "#34D399" }} />}
                  </div>
                  {s.rating > 0 ? <Stars rating={s.rating} /> : <p className="text-[10px] text-white/30">—</p>}
                </div>
              </div>
              <span
                className="text-[10px] font-extrabold px-2 py-1 rounded-lg shrink-0"
                style={{ color: s.color, background: `${s.color}15`, border: `1px solid ${s.color}25` }}
              >
                {s.badge}
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-white/45 mb-3">
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
              {s.deals > 0 && <span>{s.deals} مامەڵە</span>}
            </div>

            {s.products.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {s.products.map((p) => (
                  <span
                    key={p}
                    className="text-[10px] px-2 py-0.5 rounded-lg font-semibold"
                    style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.55)" }}
                  >
                    {p}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between">
              {s.phone ? (
                <span className="text-[11px] text-white/35 flex items-center gap-1.5">
                  <Phone className="w-3 h-3" />{s.phone}
                </span>
              ) : (
                <span className="text-[11px] text-white/25">—</span>
              )}
              <button
                className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl transition-all"
                style={{ background: "rgba(20,184,166,0.1)", color: "#2DD4BF", border: "1px solid rgba(20,184,166,0.2)" }}
              >
                پەیوەندی <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
