import { useMemo } from "react";
import { Link, useLocation, useParams } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowLeft, BookOpen, Loader2, MapPin, MessageSquare, Package,
  Phone, Shield, Star, Store,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { MarketplaceRequestModal, type MarketplaceRequestContext } from "@/components/marketplace/MarketplaceRequestModal";
import { useSupplier } from "@/hooks/useB2bData";
import { getPrimaryCategoryLabelForSector, getDefaultSectorCategory } from "@/lib/industries";
import { useUserSectorKey } from "@/hooks/useSectorScope";
import { cn } from "@/lib/utils";
import { PAGE_MUTED, PAGE_SURFACE } from "@/lib/page-theme";
import { useState } from "react";

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className="w-3.5 h-3.5"
          style={{
            color: i <= Math.round(rating) ? "#F59E0B" : "var(--shell-border)",
            fill: i <= Math.round(rating) ? "#F59E0B" : "transparent",
          }}
        />
      ))}
    </div>
  );
}

export default function SupplierProfilePage() {
  const { t } = useTranslation("common");
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const supplierId = Number.parseInt(params.id ?? "", 10);
  const { data: supplier, isLoading, isError } = useSupplier(
    Number.isFinite(supplierId) && supplierId > 0 ? supplierId : null,
  );

  const [requestOpen, setRequestOpen] = useState(false);
  const [requestContext, setRequestContext] = useState<MarketplaceRequestContext | null>(null);

  const categoryLabel = useMemo(
    () => (supplier ? getPrimaryCategoryLabelForSector(supplier.sectorKey) : ""),
    [supplier],
  );

  const buyerSectorKey = useUserSectorKey();

  const openContact = () => {
    if (!supplier) return;
    const cat = getDefaultSectorCategory(buyerSectorKey);
    if (!cat) return;
    setRequestContext({
      productName: "",
      supplierId: supplier.id,
      supplierName: supplier.name,
      supplierPhone: supplier.phone,
      unit: "دانە",
      category: cat,
      quantity: "1",
    });
    setRequestOpen(true);
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center linqi-page-muted">
        <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin opacity-50" />
        <p className="text-sm">{t("common.loading")}</p>
      </div>
    );
  }

  if (isError || !supplier) {
    return (
      <div className={cn("text-center py-16 rounded-2xl", PAGE_SURFACE)}>
        <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20 linqi-page-muted" />
        <p className="text-sm font-semibold linqi-page-heading">{t("supplierProfile.notFound")}</p>
        <button
          type="button"
          onClick={() => navigate("/supplier-directory")}
          className="mt-4 inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl linqi-page-card"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {t("supplierProfile.backToDirectory")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <button
        type="button"
        onClick={() => navigate("/supplier-directory")}
        className="inline-flex items-center gap-2 text-xs font-bold linqi-page-muted hover:linqi-page-heading transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {t("supplierProfile.backToDirectory")}
      </button>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("rounded-2xl p-6 linqi-page-card")}
      >
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-extrabold shrink-0 linqi-page-heading"
            style={{
              background: `linear-gradient(135deg,${supplier.color}60,${supplier.color}30)`,
              border: `1px solid ${supplier.color}30`,
            }}
          >
            {supplier.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-lg font-extrabold linqi-page-heading">{supplier.name}</h1>
              {supplier.verified && (
                <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              )}
              {supplier.badge && (
                <span
                  className="text-[10px] font-extrabold px-2 py-1 rounded-lg"
                  style={{
                    color: supplier.color,
                    background: `${supplier.color}15`,
                    border: `1px solid ${supplier.color}25`,
                  }}
                >
                  {supplier.badge}
                </span>
              )}
            </div>
            {supplier.rating > 0 ? <Stars rating={supplier.rating} /> : null}
            <p className={cn("text-xs mt-2", PAGE_MUTED)}>{categoryLabel}</p>
          </div>
        </div>

        <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 text-sm", PAGE_MUTED)}>
          {(supplier.city || supplier.governorate) && (
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                {[supplier.city, supplier.governorate].filter(Boolean).join(" · ")}
                {supplier.address ? ` — ${supplier.address}` : ""}
              </span>
            </div>
          )}
          {supplier.phone && (
            <a href={`tel:${supplier.phone}`} className="flex items-center gap-2 hover:linqi-page-heading transition-colors">
              <Phone className="w-4 h-4 shrink-0" />
              {supplier.phone}
            </a>
          )}
          {supplier.email && (
            <a href={`mailto:${supplier.email}`} className="flex items-center gap-2 hover:linqi-page-heading transition-colors sm:col-span-2">
              {supplier.email}
            </a>
          )}
          {supplier.deals > 0 && (
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 shrink-0" />
              {t("emptyStates.dealsCount", { count: supplier.deals })}
            </div>
          )}
        </div>

        {supplier.products.length > 0 && (
          <div className="mt-6">
            <h2 className="text-xs font-extrabold uppercase tracking-wide linqi-page-muted mb-2">
              {t("supplierProfile.products")}
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {supplier.products.map((p) => (
                <span key={p} className={cn("text-[10px] px-2 py-0.5 rounded-lg font-semibold linqi-page-card", PAGE_MUTED)}>
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mt-6">
          <button
            type="button"
            onClick={openContact}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
            style={{ background: "rgba(20,184,166,0.12)", color: "#2DD4BF", border: "1px solid rgba(20,184,166,0.25)" }}
          >
            <MessageSquare className="w-4 h-4" />
            {t("emptyStates.contactSupplier")}
          </button>
          {supplier.phone && (
            <a
              href={`tel:${supplier.phone}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold linqi-page-card transition-all"
            >
              <Phone className="w-4 h-4" />
              {t("supplierProfile.call")}
            </a>
          )}
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold linqi-page-card transition-all"
          >
            <Store className="w-4 h-4" />
            {t("supplierProfile.viewCatalog")}
          </Link>
        </div>
      </motion.div>

      <MarketplaceRequestModal
        open={requestOpen}
        onClose={() => { setRequestOpen(false); setRequestContext(null); }}
        initial={requestContext}
      />
    </div>
  );
}
