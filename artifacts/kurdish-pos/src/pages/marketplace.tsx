import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSectorFilteredProducts, useUserSectorKey, useSectorCategoryOptions } from "@/hooks/useSectorScope";
import { usePageHeader } from "@/lib/page-headers";
import {
  Store, Search, ShieldCheck, BarChart2, PackageCheck,
  Star, MapPin, Phone, MessageSquare, ArrowUpRight,
  Filter, ChevronDown, Truck, CheckCircle2, Clock,
  Circle, TrendingUp, Package, Users, Zap, X,
} from "lucide-react";
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { useTranslation } from "react-i18next";
import { useLocaleDir } from "@/lib/use-locale-dir";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Link } from "wouter";
import { getSectorCategoryChips, normalizeCategoryKey, isProductAllowedForSector, isSupplierSectorAllowedForBuyer, getDefaultSectorCategory, type CatKey } from "@/lib/industries";
import { useGetSales } from "@workspace/api-client-react";
import { useSuppliers } from "@/hooks/useB2bData";
import {
  MarketplaceRequestModal,
  type MarketplaceRequestContext,
} from "@/components/marketplace/MarketplaceRequestModal";
import { cn } from "@/lib/utils";
import {
  PAGE_INPUT,
  PAGE_CHIP_INACTIVE,
  PAGE_CHIP_ACTIVE_BLUE,
  PAGE_CHIP_ACTIVE_GREEN,
  PAGE_CHIP_ACTIVE_PURPLE,
  PAGE_CHIP_ACTIVE_CYAN,
  PAGE_CARD_TITLE,
  PAGE_CARD_DETAIL,
  PAGE_CARD_LABEL,
  PAGE_MUTED as PAGE_MUTED_CLS,
} from "@/lib/page-theme";
import {
  BG,
  C,
  glassCard,
  chartTooltipStyle,
  heroGradient,
  PAGE_TEXT as TEXT,
  PAGE_MUTED as MUTED,
  PAGE_SUB as SUB,
} from "./dashboard-tokens";

/* ─────────────────────────────────────────────────────────────────── */
/*  ACCENT COLORS                                                       */
/* ─────────────────────────────────────────────────────────────────── */
const BLUE   = "#3b82f6";
const CYAN   = "#06b6d4";
const GREEN  = "#10b981";
const PURPLE = "#8b5cf6";
const ORANGE = "#f97316";

/** Readable metric/status text (switches with light/dark) */
const GREEN_TXT = C.green;
const CYAN_TXT  = C.cyan;
const BLUE_TXT  = C.blue;

const glass = glassCard;

const TAB_ACTIVE_CHIP = {
  catalog: PAGE_CHIP_ACTIVE_BLUE,
  sellers: PAGE_CHIP_ACTIVE_GREEN,
  analytics: PAGE_CHIP_ACTIVE_PURPLE,
  fulfillment: PAGE_CHIP_ACTIVE_CYAN,
} as const;

const fmt = (v: number, locale = "ku-IQ") => new Intl.NumberFormat(locale).format(v);

/* ── Category fallback images (Unsplash, keyed by CatKey) ──────────── */
const CAT_IMAGES: Partial<Record<CatKey, string[]>> = {
  food: [
    "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=480&h=320&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1603833665858-e61d17a86224?w=480&h=320&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1555243896-c709bfa0b564?w=480&h=320&fit=crop&auto=format",
  ],
  cleaning: [
    "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=480&h=320&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=480&h=320&fit=crop&auto=format",
  ],
  homeLiving: [
    "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=480&h=320&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=480&h=320&fit=crop&auto=format",
  ],
  clothing: [
    "https://images.unsplash.com/photo-1523381294911-8d3cead13475?w=480&h=320&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1558769132-cb1aea153895?w=480&h=320&fit=crop&auto=format",
  ],
  stationery: [
    "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=480&h=320&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=480&h=320&fit=crop&auto=format",
  ],
  electronic: [
    "https://images.unsplash.com/photo-1518770660439-4636190af475?w=480&h=320&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=480&h=320&fit=crop&auto=format",
  ],
  medicine: [
    "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=480&h=320&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=480&h=320&fit=crop&auto=format",
  ],
  medicalSupplies: [
    "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=480&h=320&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=480&h=320&fit=crop&auto=format",
  ],
  mobile: [
    "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=480&h=320&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=480&h=320&fit=crop&auto=format",
  ],
  accessories: [
    "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=480&h=320&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=480&h=320&fit=crop&auto=format",
  ],
  software: [
    "https://images.unsplash.com/photo-1518770660439-4636190af475?w=480&h=320&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=480&h=320&fit=crop&auto=format",
  ],
  computer: [
    "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=480&h=320&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=480&h=320&fit=crop&auto=format",
  ],
  pcParts: [
    "https://images.unsplash.com/photo-1591488320449-011701bb6704?w=480&h=320&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=480&h=320&fit=crop&auto=format",
  ],
  ticketsFlights: [
    "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=480&h=320&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=480&h=320&fit=crop&auto=format",
  ],
  hotelsBooking: [
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=480&h=320&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=480&h=320&fit=crop&auto=format",
  ],
  visasTours: [
    "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=480&h=320&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=480&h=320&fit=crop&auto=format",
  ],
  travelInsurance: [
    "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=480&h=320&fit=crop&auto=format",
  ],
  pensionTransport: [
    "https://images.unsplash.com/photo-1544620307-c4fd4fcadab5?w=480&h=320&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=480&h=320&fit=crop&auto=format",
  ],
  cosmetics: [
    "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=480&h=320&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=480&h=320&fit=crop&auto=format",
  ],
  technology: [
    "https://images.unsplash.com/photo-1518770660439-4636190af475?w=480&h=320&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=480&h=320&fit=crop&auto=format",
  ],
  agriculture: [
    "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=480&h=320&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=480&h=320&fit=crop&auto=format",
  ],
  construction: [
    "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=480&h=320&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=480&h=320&fit=crop&auto=format",
  ],
  automotive: [
    "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=480&h=320&fit=crop&auto=format",
  ],
};
const DEFAULT_IMAGES = [
  "https://images.unsplash.com/photo-1586495777744-4e6232bf2177?w=480&h=320&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1587831990711-23ca6441447b?w=480&h=320&fit=crop&auto=format",
];
function getCatImage(cat: CatKey, id: number): string {
  const arr = CAT_IMAGES[cat] ?? DEFAULT_IMAGES;
  return arr[id % arr.length];
}

/* ─────────────────────────────────────────────────────────────────── */
/*  SUB-COMPONENTS                                                      */
/* ─────────────────────────────────────────────────────────────────── */

/* Ratings stars */
function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(s => (
        <Star key={s} className="w-3 h-3"
          fill={s <= Math.round(rating) ? ORANGE : "transparent"}
          style={{ color: s <= Math.round(rating) ? ORANGE : MUTED }} />
      ))}
      <span className="text-[10px] font-bold ms-1" style={{ color: ORANGE }}>{rating}</span>
    </div>
  );
}

/* Tooltip for charts */
function ChartTip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; color?: string; value: number; dataKey?: string }>; label?: string }) {
  const { formatMoney } = useCurrency();
  if (!active || !payload?.length) return null;
  return (
    <div style={chartTooltipStyle(BLUE)}>
      <p style={{ color: MUTED, fontSize: "10px", marginBottom: "6px" }}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-1.5" style={{ marginBottom: "2px" }}>
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span style={{ color: TEXT, fontSize: "12px", fontWeight: 700 }}>{p.name}:</span>
          <span style={{ color: p.color, fontSize: "12px", fontWeight: 800 }}>
            {p.dataKey === "sales" && typeof p.value === "number"
              ? formatMoney(p.value)
              : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── TAB 1: Product Catalog ────────────────────────────────────────── */
function CatalogTab({ onRequest }: { onRequest: (ctx: MarketplaceRequestContext) => void }) {
  const { t, i18n } = useTranslation("common");
  const { formatMoney } = useCurrency();
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState<CatKey | "all">("all");

  const numLocale = i18n.language === "en" ? "en-US" : i18n.language === "ar" ? "ar-IQ" : "ku-IQ";

  const { data: apiProductsRaw = [] } = useSectorFilteredProducts();
  const sectorKey = useUserSectorKey();
  const sectorCategoryOptions = useSectorCategoryOptions();
  const allowedCatKeys = useMemo(() => sectorCategoryOptions.map(o => o.key), [sectorCategoryOptions]);

  useEffect(() => {
    if (selectedCat !== "all" && !allowedCatKeys.includes(selectedCat)) {
      setSelectedCat("all");
    }
  }, [allowedCatKeys, selectedCat]);

  const liveProducts = useMemo(() => apiProductsRaw.flatMap(p => {
    const cat = normalizeCategoryKey(p.category);
    if (!cat || !isProductAllowedForSector(cat, sectorKey)) return [];
    return [{
      id:       p.id,
      name:     p.name,
      cat,
      price:    parseFloat(p.price as unknown as string),
      stock:    p.stock,
      unit:     p.unit,
      rating:   4.5,
      seller:   (p as { supplier?: string }).supplier || "LinQi",
      verified: p.stock > 0,
      image:    p.image ?? null,
    }];
  }), [apiProductsRaw, sectorKey]);

  /* API-only: never fill the grid with static mock products when sector has no data */
  const filtered = liveProducts.filter(p =>
    (selectedCat === "all" || p.cat === selectedCat) &&
    (search === "" || p.name.toLowerCase().includes(search.toLowerCase()) || p.seller.toLowerCase().includes(search.toLowerCase()))
  );

  const tCat = (k: CatKey | "all") =>
    k === "all"
      ? t("marketplace.catalog.allCategories")
      : sectorCategoryOptions.find(o => o.key === k)?.label ?? t(`marketplace.cats.${k}`);

  return (
    <div>
      {/* Search + filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t("marketplace.catalog.searchPlaceholder")}
            className={cn(PAGE_INPUT, "pe-10")}
            style={{ padding: "10px 40px 10px 14px", fontFamily: "Vazirmatn,sans-serif" }}
          />
        </div>
        {sectorKey && allowedCatKeys.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className={cn("text-[10px] font-bold uppercase tracking-wide px-0.5", PAGE_CARD_LABEL)}>
            {t("marketplace.catalog.categoriesLabel")}
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="w-4 h-4 shrink-0 text-slate-400 dark:text-slate-400" />
          {/* "All" — scoped to the user's sector ecosystem only */}
          <button key="all" onClick={() => setSelectedCat("all")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all",
              selectedCat === "all" ? PAGE_CHIP_ACTIVE_BLUE : PAGE_CHIP_INACTIVE,
            )}
            title={t("marketplace.catalog.sectorOnlyHint")}>
            {tCat("all")}
          </button>
          {sectorCategoryOptions.map(({ key, label }) => (
            <button key={key} onClick={() => setSelectedCat(key)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all",
                selectedCat === key ? PAGE_CHIP_ACTIVE_BLUE : PAGE_CHIP_INACTIVE,
              )}>
              {label}
            </button>
          ))}
          </div>
        </div>
        )}
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl overflow-hidden group"
            style={glass()}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = C.glassHover;
              (e.currentTarget as HTMLElement).style.borderColor = `${BLUE}30`;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = C.glass;
              (e.currentTarget as HTMLElement).style.borderColor = C.border;
            }}
          >
            {/* Product image */}
            <div className="relative h-36 overflow-hidden"
              style={{ borderBottom: `1px solid ${C.border}` }}>
              <img
                src={getCatImage(p.cat, p.id)}
                alt={p.name}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              />
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: "linear-gradient(to bottom, color-mix(in srgb, var(--terminal-bg) 50%, transparent) 0%, transparent 45%, color-mix(in srgb, var(--terminal-bg) 70%, transparent) 100%)" }} />

              {/* Category badge */}
              <div className="absolute top-2.5 start-2.5">
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-md backdrop-blur-sm"
                  style={{ background: "color-mix(in srgb, var(--terminal-bg) 80%, transparent)", color: SUB, border: `1px solid ${C.border}` }}>
                  {tCat(p.cat)}
                </span>
              </div>

              {/* Verified badge */}
              {p.verified && (
                <div className="absolute top-2.5 end-2.5 w-6 h-6 rounded-full flex items-center justify-center backdrop-blur-sm"
                  style={{ background: "rgba(16,185,129,0.25)", border: "1px solid rgba(16,185,129,0.4)" }}>
                  <ShieldCheck className="w-3.5 h-3.5" style={{ color: GREEN }} />
                </div>
              )}

              {/* Low stock badge */}
              {p.stock < 30 && (
                <div className="absolute bottom-2.5 end-2.5 text-[9px] font-bold px-2 py-0.5 rounded-md backdrop-blur-sm"
                  style={{ background: "rgba(249,115,22,0.25)", color: ORANGE, border: "1px solid rgba(249,115,22,0.35)" }}>
                  {t("marketplace.catalog.lowStock")}
                </div>
              )}
            </div>

            <div className="p-4">
              <h3 className={cn("text-[13px] mb-1 leading-snug", PAGE_CARD_TITLE)} style={{ fontFamily: "Vazirmatn,sans-serif" }}>
                {p.name}
              </h3>
              <p className={cn("text-[10px] mb-2", PAGE_CARD_DETAIL)}>{p.seller} · {p.unit}</p>
              <Stars rating={p.rating} />

              <div className="flex items-center justify-between mt-3 pt-3"
                style={{ borderTop: `1px solid ${C.border}` }}>
                <div>
                  <p className={cn("text-[10px] font-semibold", PAGE_CARD_LABEL)}>{t("marketplace.catalog.listPrice")}</p>
                  <p className="text-[15px] font-extrabold tabular-nums" style={{ color: CYAN }}>
                    {formatMoney(p.price)}
                  </p>
                </div>
                <button
                  type="button"
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all",
                    PAGE_CHIP_ACTIVE_BLUE,
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRequest({
                      productName: p.name,
                      supplierName: p.seller,
                      unit: p.unit,
                      category: p.cat,
                      price: p.price,
                      quantity: "1",
                    });
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).classList.add("dark:bg-blue-500/25"); }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).classList.remove("dark:bg-blue-500/25"); }}>
                  <MessageSquare className="w-3.5 h-3.5" />
                  {t("marketplace.catalog.request")}
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className={cn("py-20 text-center", PAGE_MUTED_CLS)}>
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-semibold" style={{ fontFamily: "Vazirmatn,sans-serif" }}>{t("marketplace.catalog.noResults")}</p>
        </div>
      )}
    </div>
  );
}

/* ── TAB 2: Verified Sellers ───────────────────────────────────────── */
function SellersTab({ onRequest }: { onRequest: (ctx: MarketplaceRequestContext) => void }) {
  const { t } = useTranslation("common");
  const [contactId, setContactId] = useState<number | null>(null);
  const sectorKey = useUserSectorKey();
  const { data: apiSuppliers = [], isLoading } = useSuppliers();
  const sectorSellers = useMemo(
    () =>
      apiSuppliers
        .filter((s) => isSupplierSectorAllowedForBuyer(s.sectorKey, sectorKey))
        .map((s) => ({
          id: s.id,
          name: s.name,
          region: s.city || s.governorate || "—",
          founded: "",
          products: s.products.length,
          rating: s.rating,
          orders: s.deals > 0 ? String(s.deals) : "—",
          badgeKey: (s.badge === "زێڕین" ? "goldPartner" : "silverPartner") as "goldPartner" | "silverPartner",
          phone: s.phone,
          specialties: getSectorCategoryChips(s.sectorKey),
        })),
    [apiSuppliers, sectorKey],
  );

  return (
    <div>
      {isLoading ? (
        <div className={cn("py-20 text-center", PAGE_MUTED_CLS)}>
          <p className="text-sm font-semibold">{t("common.loading")}</p>
        </div>
      ) : sectorSellers.length === 0 ? (
        <div className={cn("py-20 text-center", PAGE_MUTED_CLS)}>
          <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-semibold" style={{ fontFamily: "Vazirmatn,sans-serif" }}>{t("emptyStates.noSuppliers")}</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {sectorSellers.map((s, i) => (
          <motion.div key={s.id}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="p-5 rounded-2xl" style={glass()}>
            <div className="flex items-start gap-4 mb-4">
              {/* Avatar */}
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 font-extrabold text-lg text-blue-600 dark:text-blue-300"
                style={{
                  background: `${BLUE}18`, border: `1.5px solid ${BLUE}35`,
                  fontFamily: "Vazirmatn,sans-serif",
                }}>
                {s.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className={cn("text-[13px]", PAGE_CARD_TITLE)} style={{ fontFamily: "Vazirmatn,sans-serif" }}>
                    {s.name}
                  </h3>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: s.badgeKey === "goldPartner" ? "rgba(245,158,11,0.15)" : "rgba(148,163,184,0.12)",
                      color:      s.badgeKey === "goldPartner" ? "var(--linqi-amber)" : "var(--shell-text-muted)",
                      border:     `1px solid ${s.badgeKey === "goldPartner" ? "rgba(245,158,11,0.30)" : "rgba(148,163,184,0.20)"}`,
                    }}>
                    {t(`marketplace.sellers.${s.badgeKey}`)}
                  </span>
                </div>
                <div className={cn("flex items-center gap-3 text-[10px]", PAGE_CARD_DETAIL)}>
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{s.region}</span>
                  <span>{t("marketplace.sellers.founded")} {s.founded}</span>
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: t("marketplace.sellers.products"), value: String(s.products) },
                { label: t("marketplace.sellers.orders"),   value: s.orders           },
                { label: t("marketplace.sellers.rating"),   value: `★ ${s.rating}`   },
              ].map(stat => (
                <div key={stat.label} className="p-2.5 rounded-xl text-center"
                  style={{ background: C.glassHover, border: `1px solid ${C.border}` }}>
                  <p className={cn("text-[13px] font-extrabold mb-0.5", PAGE_CARD_TITLE)}>{stat.value}</p>
                  <p className={cn("text-[9px]", PAGE_CARD_LABEL)}>{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Specialties */}
            <div className="flex items-center gap-1.5 flex-wrap mb-4">
              <span className={cn("text-[9.5px] font-bold uppercase tracking-wide", PAGE_CARD_LABEL)}>
                {t("marketplace.sellers.specialties")}:
              </span>
              {s.specialties.filter(sp => isProductAllowedForSector(sp, sectorKey)).map((sp, idx) => (
                <span key={idx} className={cn("text-[9px] font-bold px-2 py-0.5 rounded-md", PAGE_CHIP_ACTIVE_BLUE)}>
                  {t(`marketplace.cats.${sp}`)}
                </span>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const category = s.specialties.find(sp => isProductAllowedForSector(sp, sectorKey))
                    ?? getDefaultSectorCategory(sectorKey);
                  if (!category) return;
                  onRequest({
                    productName: "",
                    supplierName: s.name,
                    unit: "دانە",
                    category,
                    quantity: "1",
                  });
                }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold transition-all",
                  PAGE_CHIP_ACTIVE_BLUE,
                )}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).classList.add("dark:bg-blue-500/25"); }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).classList.remove("dark:bg-blue-500/25"); }}>
                <MessageSquare className="w-3.5 h-3.5" />
                {t("marketplace.catalog.request")}
              </button>
              <button
                type="button"
                onClick={() => setContactId(contactId === s.id ? null : s.id)}
                className={cn(
                  "flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all min-w-[7rem]",
                  PAGE_CHIP_INACTIVE,
                )}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).classList.add("dark:bg-slate-700/80"); }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).classList.remove("dark:bg-slate-700/80"); }}>
                <Phone className="w-3.5 h-3.5" />
                {t("marketplace.sellers.contact")}
              </button>
              <Link
                href="/procurement"
                title={t("marketplace.sellers.viewProcurement")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all",
                  PAGE_CHIP_INACTIVE,
                )}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).classList.add("dark:bg-slate-700/80"); }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).classList.remove("dark:bg-slate-700/80"); }}>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Contact reveal */}
            <AnimatePresence>
              {contactId === s.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                  className="overflow-hidden">
                  <div className="mt-3 flex items-center justify-between p-3 rounded-xl"
                    style={{ background: `${GREEN}08`, border: `1px solid ${GREEN}20` }}>
                    <span className="text-[12px] font-bold" style={{ color: GREEN_TXT, fontFamily: "Vazirmatn,sans-serif" }}>
                      {s.phone}
                    </span>
                    <button onClick={() => setContactId(null)} className="text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
      )}
    </div>
  );
}

/* ── TAB 3: Sales Analytics ────────────────────────────────────────── */
function AnalyticsTab() {
  const { t, i18n } = useTranslation("common");
  const { formatMoney } = useCurrency();
  const [metric, setMetric] = useState<"sales" | "requests">("sales");
  const numLocale = i18n.language === "en" ? "en-US" : i18n.language === "ar" ? "ar-IQ" : "ku-IQ";
  const { data: sales = [] } = useGetSales();

  const analyticsData = useMemo(() => {
    const monthMap: Record<string, { sales: number; requests: number }> = {};
    for (const sale of sales) {
      const d = new Date(sale.createdAt as string);
      const key = d.toLocaleDateString(numLocale, { month: "short" });
      if (!monthMap[key]) monthMap[key] = { sales: 0, requests: 0 };
      monthMap[key].sales += parseFloat(String(sale.totalAmount ?? 0));
      monthMap[key].requests += 1;
    }
    return Object.entries(monthMap).map(([month, v]) => ({
      month,
      sales: Math.round(v.sales),
      requests: v.requests,
    }));
  }, [sales, numLocale]);

  const totalSales = sales.reduce((sum, s) => sum + parseFloat(String(s.totalAmount ?? 0)), 0);
  const hasData = analyticsData.length > 0;

  const KPI = [
    { labelKey: "monthlySales",  value: hasData ? formatMoney(totalSales) : formatMoney(0), subKey: "vsLastMonth",      color: CYAN   },
    { labelKey: "newRequests",   value: String(sales.length),                       subKey: "thisYear",          color: PURPLE },
    { labelKey: "activePartners",value: "0",                                        subKey: "companiesPartners", color: GREEN  },
    { labelKey: "fulfillmentRate",value: hasData ? "—" : "0%",                    subKey: "yearlyAvg",         color: ORANGE },
  ];

  if (!hasData) {
    return (
      <div className={cn("py-20 text-center", PAGE_MUTED_CLS)}>
        <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm font-semibold" style={{ fontFamily: "Vazirmatn,sans-serif" }}>{t("emptyStates.noAnalytics")}</p>
      </div>
    );
  }

  return (
    <div>
      {/* KPI chips */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {KPI.map((k, i) => (
          <motion.div key={k.labelKey}
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="p-4 rounded-2xl relative overflow-hidden"
            style={glass({ borderTop: `2px solid ${k.color}` })}>
            <div style={{
              position: "absolute", top: "-20px", insetInlineEnd: "-12px", width: "70px",
              height: "70px", borderRadius: "50%",
              background: `radial-gradient(circle, ${k.color}22, transparent 70%)`,
              filter: "blur(14px)", pointerEvents: "none",
            }} />
            <p className={cn("text-[10px] font-semibold mb-1", PAGE_CARD_LABEL)}>
              {t(`marketplace.analytics.kpi.${k.labelKey}`)}
            </p>
            <p className={cn("text-2xl font-extrabold mb-0.5", PAGE_CARD_TITLE)}>{k.value}</p>
            <p className="text-[10px]" style={{ color: k.color }}>
              {t(`marketplace.analytics.kpiSub.${k.subKey}`)}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Chart panel */}
      <div className="p-5 rounded-2xl mb-5" style={glass()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className={cn("text-[14px]", PAGE_CARD_TITLE)} style={{ fontFamily: "Vazirmatn,sans-serif" }}>
              {t("marketplace.analytics.title")}
            </h3>
            <p className={cn("text-[10px] mt-0.5", PAGE_CARD_DETAIL)}>{t("marketplace.analytics.subtitle")}</p>
          </div>
          <div className="flex items-center gap-0.5 rounded-lg p-0.5 border bg-slate-100 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700">
            {(["sales", "requests"] as const).map(m => (
              <button key={m} onClick={() => setMetric(m)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-[11px] font-bold transition-all",
                  metric === m ? PAGE_CHIP_ACTIVE_BLUE : "text-slate-600 dark:text-slate-300",
                )}>
                {t(`marketplace.analytics.metric${m === "sales" ? "Sales" : "Requests"}`)}
              </button>
            ))}
          </div>
        </div>

        <div style={{ height: "260px" }} dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={analyticsData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="mktGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={metric === "sales" ? CYAN : PURPLE} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={metric === "sales" ? CYAN : PURPLE} stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={C.border} />
              <XAxis dataKey="month" axisLine={false} tickLine={false}
                tick={{ fill: MUTED, fontSize: 10, fontWeight: 600 }} dy={6} />
              <YAxis axisLine={false} tickLine={false}
                tick={{ fill: MUTED, fontSize: 10 }} width={36}
                tickFormatter={v => metric === "sales" ? formatMoney(v, { compact: true }) : `${v}`} />
              <Tooltip content={<ChartTip />} />
              <Area type="monotone"
                dataKey={metric}
                name={t(`marketplace.analytics.metric${metric === "sales" ? "Sales" : "Requests"}`)}
                stroke={metric === "sales" ? CYAN : PURPLE}
                strokeWidth={2} fill="url(#mktGrad)"
                activeDot={{ r: 5, fill: metric === "sales" ? CYAN : PURPLE, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bar chart: monthly comparison */}
      <div className="p-5 rounded-2xl" style={glass()}>
        <h3 className={cn("text-[13px] mb-4", PAGE_CARD_TITLE)} style={{ fontFamily: "Vazirmatn,sans-serif" }}>
          {t("marketplace.analytics.barTitle")}
        </h3>
        <div style={{ height: "200px" }} dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analyticsData} margin={{ top: 2, right: 8, left: 0, bottom: 0 }}
              barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={C.border} />
              <XAxis dataKey="month" axisLine={false} tickLine={false}
                tick={{ fill: MUTED, fontSize: 9, fontWeight: 600 }} dy={4} />
              <YAxis axisLine={false} tickLine={false}
                tick={{ fill: MUTED, fontSize: 9 }} width={32}
                tickFormatter={v => formatMoney(v, { compact: true })} />
              <Tooltip content={<ChartTip />} />
              <Bar dataKey="sales"    name={t("marketplace.analytics.metricSales")}    fill={CYAN}     radius={[4,4,0,0]} fillOpacity={0.7} />
              <Bar dataKey="requests" name={t("marketplace.analytics.metricRequests")} fill={PURPLE}   radius={[4,4,0,0]} fillOpacity={0.6} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* ── TAB 4: Order Fulfillment ──────────────────────────────────────── */
function FulfillmentTab() {
  const { t, i18n } = useTranslation("common");
  const { formatMoney } = useCurrency();
  const [expanded, setExpanded] = useState<string | null>(null);
  const numLocale = i18n.language === "en" ? "en-US" : i18n.language === "ar" ? "ar-IQ" : "ku-IQ";
  const { data: sales = [], isLoading } = useGetSales();

  const orders = useMemo(
    () =>
      sales.map((sale) => {
        const items = (sale as { items?: Array<{ productName: string; quantity: number }> }).items ?? [];
        const itemLabel = items.map((i) => `${i.productName} × ${i.quantity}`).join(", ") || "—";
        const paid = parseFloat(String(sale.paidAmount ?? 0));
        const total = parseFloat(String(sale.totalAmount ?? 0));
        const steps = paid >= total ? 5 : paid > 0 ? 3 : 1;
        return {
          id: `ORD-${sale.id}`,
          buyer: (sale as { customerName?: string }).customerName ?? t("emptyStates.noCustomer"),
          seller: "—",
          items: itemLabel,
          amount: total,
          eta: new Date(sale.createdAt as string).toLocaleDateString(numLocale),
          steps,
        };
      }),
    [sales, numLocale, t],
  );

  const ORDER_STEPS = [
    { labelKey: "registered", icon: CheckCircle2 },
    { labelKey: "approved",   icon: CheckCircle2 },
    { labelKey: "preparing",  icon: Package       },
    { labelKey: "shipping",   icon: Truck         },
    { labelKey: "delivered",  icon: CheckCircle2 },
  ];

  if (isLoading) {
    return (
      <div className={cn("py-20 text-center", PAGE_MUTED_CLS)}>
        <p className="text-sm">{t("common.loading")}</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className={cn("py-20 text-center", PAGE_MUTED_CLS)}>
        <PackageCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm font-semibold" style={{ fontFamily: "Vazirmatn,sans-serif" }}>{t("emptyStates.noOrders")}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6 p-4 rounded-2xl"
        style={{ background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.15)" }}>
        <Truck className="w-5 h-5 shrink-0" style={{ color: CYAN }} />
        <p className="text-[12px] font-semibold" style={{ color: CYAN_TXT, fontFamily: "Vazirmatn,sans-serif" }}>
          {t("marketplace.fulfillment.info", { count: orders.length })}
        </p>
      </div>

      <div className="space-y-4">
        {orders.map((order, oi) => {
          const isOpen = expanded === order.id;
          return (
            <motion.div key={order.id}
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: oi * 0.07 }}
              className="rounded-2xl overflow-hidden"
              style={glass(isOpen ? { borderColor: `${CYAN}30` } : {})}>

              {/* Header row — always visible */}
              <button className="w-full flex items-center gap-4 p-4 text-start transition-colors"
                style={{ background: isOpen ? "rgba(6,182,212,0.05)" : "transparent" }}
                onClick={() => setExpanded(isOpen ? null : order.id)}>

                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(6,182,212,0.10)", border: "1px solid rgba(6,182,212,0.22)" }}>
                  <Truck className="w-5 h-5" style={{ color: CYAN }} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[11px] font-mono font-bold" style={{ color: CYAN }}>
                      #{order.id}
                    </span>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: order.steps >= 4 ? "rgba(16,185,129,0.12)" : "rgba(59,130,246,0.12)",
                        color:      order.steps >= 4 ? GREEN_TXT : BLUE_TXT,
                        border:     `1px solid ${order.steps >= 4 ? "rgba(16,185,129,0.22)" : "rgba(59,130,246,0.22)"}`,
                      }}>
                      {order.steps >= 4 ? t("marketplace.fulfillment.delivered") : t("marketplace.fulfillment.inTransit")}
                    </span>
                  </div>
                  <p className={cn("text-[12px] font-bold truncate", PAGE_CARD_TITLE)} style={{ fontFamily: "Vazirmatn,sans-serif" }}>
                    {order.buyer} → {order.seller}
                  </p>
                  <p className={cn("text-[10px] truncate", PAGE_CARD_DETAIL)}>{order.items}</p>
                </div>

                <div className="text-end shrink-0">
                  <p className="text-[12px] font-extrabold tabular-nums" style={{ color: CYAN }}>
                    {formatMoney(order.amount)}
                  </p>
                  <p className={cn("text-[10px]", PAGE_CARD_LABEL)}>{t("marketplace.fulfillment.eta")}: {order.eta}</p>
                </div>

                <ChevronDown className={cn(
                  "w-4 h-4 shrink-0 transition-transform text-slate-400 dark:text-slate-400",
                  isOpen && "rotate-180",
                )} />
              </button>

              {/* Expanded pipeline */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}
                    className="overflow-hidden">
                    <div className="px-5 pb-5 pt-1"
                      style={{ borderTop: `1px solid ${C.border}` }}>

                      {/* Step pipeline */}
                      <div className="flex items-center gap-0 mt-4 overflow-x-auto pb-2">
                        {ORDER_STEPS.map((step, si) => {
                          const done   = si <  order.steps;
                          const active = si === order.steps - 1;
                          const StepIcon = step.icon;
                          return (
                            <div key={si} className="flex items-center">
                              <div className="flex flex-col items-center gap-1.5 shrink-0 w-20">
                                <div className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
                                  style={{
                                    background: done
                                      ? active ? `${CYAN}22` : `${GREEN}18`
                                      : C.glassHover,
                                    border: done
                                      ? active ? `1.5px solid ${CYAN}55` : `1.5px solid ${GREEN}40`
                                      : `1.5px solid ${C.border}`,
                                    boxShadow: active ? `0 0 14px ${CYAN}35` : "none",
                                  }}>
                                  <StepIcon className="w-4 h-4" style={{
                                    color: done ? (active ? CYAN : GREEN) : MUTED,
                                  }} />
                                </div>
                                <span className="text-[9px] font-bold text-center leading-tight"
                                  style={{
                                    color: done ? (active ? CYAN : GREEN) : MUTED,
                                    fontFamily: "Vazirmatn,sans-serif",
                                  }}>
                                  {t(`marketplace.fulfillment.steps.${step.labelKey}`)}
                                </span>
                              </div>
                              {/* Connector */}
                              {si < ORDER_STEPS.length - 1 && (
                                <div className="h-0.5 w-6 shrink-0 rounded-full mx-0.5"
                                  style={{
                                    background: si < order.steps - 1
                                      ? `linear-gradient(90deg, ${GREEN}, ${si === order.steps - 2 ? CYAN : GREEN})`
                                      : C.border,
                                  }} />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Order detail strip */}
                      <div className="mt-4 grid grid-cols-3 gap-3">
                        {[
                          { labelKey: "buyer",  value: order.buyer  },
                          { labelKey: "seller", value: order.seller },
                          { labelKey: "eta",    value: order.eta    },
                        ].map(d => (
                          <div key={d.labelKey} className="p-3 rounded-xl"
                            style={{ background: C.glassHover, border: `1px solid ${C.border}` }}>
                            <p className={cn("text-[9px] mb-0.5", PAGE_CARD_LABEL)}>
                              {t(`marketplace.fulfillment.${d.labelKey}`)}
                            </p>
                            <p className={cn("text-[11px] font-bold", PAGE_CARD_TITLE)} style={{ fontFamily: "Vazirmatn,sans-serif" }}>
                              {d.value}
                            </p>
                          </div>
                        ))}
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

/* ─────────────────────────────────────────────────────────────────── */
/*  ROOT PAGE                                                           */
/* ─────────────────────────────────────────────────────────────────── */
export default function Marketplace() {
  const { t } = useTranslation("common");
  const { dir } = useLocaleDir("common");
  const { title, description } = usePageHeader("marketplace");
  const [activeTab, setActiveTab] = useState<"catalog" | "sellers" | "analytics" | "fulfillment">("catalog");
  const [requestContext, setRequestContext] = useState<MarketplaceRequestContext | null>(null);

  const openRequest = (ctx: MarketplaceRequestContext) => setRequestContext(ctx);
  const closeRequest = () => setRequestContext(null);

  const TABS = [
    { id: "catalog"     as const, labelKey: "marketplace.tabs.catalog",     icon: Package,       color: BLUE   },
    { id: "sellers"     as const, labelKey: "marketplace.tabs.sellers",     icon: ShieldCheck,   color: GREEN  },
    { id: "analytics"   as const, labelKey: "marketplace.tabs.analytics",   icon: BarChart2,     color: PURPLE },
    { id: "fulfillment" as const, labelKey: "marketplace.tabs.fulfillment", icon: PackageCheck,  color: CYAN   },
  ];

  return (
    <div dir={dir} className="linqi-page" style={{ background: BG, minHeight: "100%" }}>

      {/* ── Page Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-2xl mb-6 p-6"
        style={{
          background: heroGradient(BLUE),
          border: `1px solid ${BLUE}30`,
          boxShadow: `0 8px 48px ${BLUE}14`,
        }}>
        <div style={{
          position: "absolute", top: "-40px", insetInlineEnd: "-30px",
          width: "180px", height: "180px", borderRadius: "50%",
          background: `radial-gradient(circle, ${BLUE}20, transparent 70%)`,
          filter: "blur(24px)", pointerEvents: "none",
        }} />

        <div className="relative flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: `${BLUE}22`, border: `1.5px solid ${BLUE}45`, boxShadow: `0 0 24px ${BLUE}28` }}>
            <Store className="w-7 h-7 text-blue-600 dark:text-blue-300" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold mb-0.5 text-slate-900 dark:text-slate-100 linqi-page-header-title" style={{ fontFamily: "Vazirmatn,sans-serif" }}>
              {title}
            </h1>
            <p className="text-sm linqi-page-subtitle linqi-page-header-subtitle" style={{ fontFamily: "Vazirmatn,sans-serif" }}>
              {description}
            </p>
          </div>

          {/* Live indicator */}
          <div className="me-auto ms-auto" />
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl shrink-0"
            style={{ background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.2)" }}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
                style={{ background: GREEN }} />
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: GREEN }} />
            </span>
            <span className="text-[11px] font-bold" style={{ color: GREEN_TXT }}>{t("marketplace.live")}</span>
          </div>
        </div>
      </motion.div>

      {/* ── Sub-tab nav ── */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        {TABS.map(tab => {
          const TIcon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-bold transition-all shrink-0",
                active ? TAB_ACTIVE_CHIP[tab.id] : PAGE_CHIP_INACTIVE,
              )}>
              <TIcon className="w-4 h-4" />
              <span style={{ fontFamily: "Vazirmatn,sans-serif" }}>{t(tab.labelKey)}</span>
            </button>
          );
        })}
      </div>

      {/* ── Active tab content ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22 }}>
          {activeTab === "catalog"     && <CatalogTab onRequest={openRequest} />}
          {activeTab === "sellers"     && <SellersTab onRequest={openRequest} />}
          {activeTab === "analytics"   && <AnalyticsTab />}
          {activeTab === "fulfillment" && <FulfillmentTab />}
        </motion.div>
      </AnimatePresence>

      <MarketplaceRequestModal
        open={requestContext !== null}
        onClose={closeRequest}
        initial={requestContext}
      />

    </div>
  );
}
