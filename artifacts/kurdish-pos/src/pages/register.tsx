import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import {
  Check, ChevronDown, ChevronLeft, ChevronRight,
  Package, Truck, Share2, UtensilsCrossed, Building2,
  HeartPulse, ShoppingCart, Factory, Layers, MapPin,
  Mail, FileText, Lock, Eye, EyeOff, Upload, Clock,
  Briefcase, ShoppingBag, Phone, User, Globe,
  AlertCircle, CheckCircle2, Pill, ShieldCheck,
  Search, X,
  Wheat, Coffee, Warehouse, Home, Car, Monitor, Cpu,
  Route, Shirt, HardHat, GraduationCap, Activity,
  Landmark, Scissors, Dumbbell, Stethoscope, Cookie,
  Printer, Plane, Tv, Zap, Scale, Leaf, Wind, Signal,
  Sparkles, Gamepad2, PenLine, Heart,
} from "lucide-react";
import { StoreLocationField } from "@/components/StoreLocationField";
import { formatStoreAddress, isValidCoords, saveStoreLocationLocal } from "@/lib/store-location";
import {
  submitVerificationApplication,
  clearPendingReviewSession,
  getPendingReviewSession,
  findLocalVerification,
  migrateLegacyPendingReview,
  VERIFICATIONS_UPDATED_EVENT,
  type VerificationStatus,
} from "@/lib/verification-storage";
import { isValidBusinessName, isValidMobile } from "@/lib/business-profile";
import {
  ONBOARDING_RESET_KEY,
  clearLogoutEntryFlag,
  MERCHANT_APP_PATH,
  isBypassAuthToken,
  prepareMerchantSession,
  hardNavigate,
} from "@/lib/auth-session";
import { getAllowedCategoriesForSector, ALL_CAT_KEYS, type CatKey } from "@/lib/industries";
import { cn } from "@/lib/utils";
import { OnboardingAmbient } from "@/components/onboarding/OnboardingAmbient";

/* ─── Language switcher data ───────────────────────────────────────── */
const LANGUAGES = [
  { code: "ku", label: "کوردی" },
  { code: "ar", label: "العربية" },
  { code: "en", label: "English" },
];

/* ─── Phone prefixes ───────────────────────────────────────────────── */
const PHONE_PREFIXES = [
  { code: "+964", flag: "🇮🇶" },
  { code: "+90",  flag: "🇹🇷" },
  { code: "+98",  flag: "🇮🇷" },
  { code: "+1",   flag: "🇺🇸" },
  { code: "+44",  flag: "🇬🇧" },
];

/* ─── Governorates ─────────────────────────────────────────────────── */
const GOVERNORATES = [
  "erbil","sulaymaniyah","duhok","halabja","kirkuk",
  "baghdad","nineveh","basra","najaf","karbala",
  "anbar","babylon","diyala","qadisiyah","maysan",
  "muthanna","dhiqar","salahadin","wasit",
];

/* ─── Sector Config (data-driven, extensible) ──────────────────────── */
export type SectorGroup = "enterprise" | "retail" | "delivery" | "standard";

export interface SectorDef {
  key: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  group: SectorGroup;
  keywords?: string; // space-separated multilingual search terms (EN/AR/KU + aliases)
}

export const SECTORS: SectorDef[] = [
  // ── Existing sectors (identity preserved) ──────────────────────────
  { key: "distributor",   icon: Share2,          color: "#F59E0B", group: "enterprise", keywords: "distributor موزع دابەشکار wholesale distribution توزيع" },
  { key: "manufacturer",  icon: Factory,         color: "#EF4444", group: "enterprise", keywords: "manufacturer مصنع کارگە factory production تصنيع بەرهەمهێنان" },
  { key: "hospital",      icon: HeartPulse,      color: "#EC4899", group: "standard",   keywords: "hospital مستشفى نەخۆشخانە clinic عيادة کلینیک" },
  { key: "supermarket",   icon: ShoppingBag,     color: "#8B5CF6", group: "retail",     keywords: "supermarket سوبرماركت مارکێت grocery بقالة" },
  { key: "retail_shop",   icon: ShoppingCart,    color: "#A855F7", group: "standard",   keywords: "retail shop متجر دوكان فرۆشگا store تجزئة" },
  { key: "restaurant",    icon: UtensilsCrossed, color: "#F97316", group: "retail",     keywords: "restaurant مطعم چێشتخانە food cafe كافيه" },
  { key: "hotel",         icon: Building2,       color: "#06B6D4", group: "retail",     keywords: "hotel فندق هوتێل hospitality accommodation" },
  { key: "pharmacy",      icon: Pill,            color: "#22C55E", group: "standard",   keywords: "pharmacy صيدلية دەرمانسازی medicine دواخانە" },
  { key: "delivery",      icon: Truck,           color: "#10B981", group: "delivery",   keywords: "delivery توصيل گەیاندن courier shipping شحن" },
  { key: "office",        icon: Briefcase,       color: "#3B82F6", group: "standard",   keywords: "office مكتب نووسینگە business services خدمات" },
  // ── New sectors ────────────────────────────────────────────────────
  { key: "agriculture",   icon: Wheat,           color: "#84CC16", group: "standard",   keywords: "agriculture زراعة جێڵانی farming farm crops زراعی" },
  { key: "food_beverage", icon: Coffee,          color: "#CA8A04", group: "retail",     keywords: "food beverage غذاء مشروبات خواردن نوشیدنی cafe drinks" },
  { key: "fmcg",          icon: Package,         color: "#EA580C", group: "enterprise", keywords: "fmcg consumer goods سلع استهلاكية کاڵای بەکارهێنەر fast moving" },
  { key: "wholesale",     icon: Warehouse,       color: "#6366F1", group: "enterprise", keywords: "wholesale جملة کۆیی bulk distribution بازار warehouse" },
  { key: "real_estate",   icon: Home,            color: "#0EA5E9", group: "standard",   keywords: "real estate عقارات خانوبەرە property housing عقار" },
  { key: "automotive",    icon: Car,             color: "#DC2626", group: "standard",   keywords: "automotive سيارات ئۆتومۆبیل car vehicle garage سيارة" },
  { key: "technology",    icon: Monitor,         color: "#0891B2", group: "standard",   keywords: "technology تكنولوجيا تەکنەلۆجیا IT software tech" },
  { key: "electronics",   icon: Cpu,             color: "#7C3AED", group: "standard",   keywords: "electronics إلكترونيات ئەلێکترۆنیک devices gadgets" },
  { key: "logistics",     icon: Route,           color: "#059669", group: "delivery",   keywords: "logistics لوجستيات لۆجستیک supply chain transport freight" },
  { key: "fashion",       icon: Shirt,           color: "#DB2777", group: "retail",     keywords: "fashion موضة مۆدا clothing clothes textiles جل بەرگ" },
  { key: "construction",  icon: HardHat,         color: "#D97706", group: "standard",   keywords: "construction بناء بینیاسازی building contracting مقاول" },
  { key: "education",     icon: GraduationCap,   color: "#2563EB", group: "standard",   keywords: "education تعليم پەروەردە school training university" },
  { key: "healthcare",    icon: Activity,        color: "#E11D48", group: "standard",   keywords: "healthcare رعاية صحية تەندروستی medical health" },
  { key: "finance",       icon: Landmark,        color: "#16A34A", group: "enterprise", keywords: "finance مال دارایی banking investment accounting bank" },
  { key: "beauty_salon",  icon: Scissors,        color: "#BE185D", group: "retail",     keywords: "beauty salon صالون بیوتی سەلۆن hair barber نساء" },
  { key: "gym_fitness",   icon: Dumbbell,        color: "#EA580C", group: "retail",     keywords: "gym fitness رياضة ئەندام sport health center نادي" },
  { key: "clinic",        icon: Stethoscope,     color: "#10B981", group: "standard",   keywords: "clinic عيادة کلینیک doctor medical dental دندان" },
  { key: "bakery",        icon: Cookie,          color: "#B45309", group: "retail",     keywords: "bakery مخبز نانوایی bread pastry sweets حلويات" },
  { key: "printing",      icon: Printer,         color: "#64748B", group: "standard",   keywords: "printing طباعة چاپخانە press advertising design" },
  { key: "travel_agency", icon: Plane,           color: "#0284C7", group: "standard",   keywords: "travel سفر سیاحت tourism agency flights رحلة" },
  { key: "media",         icon: Tv,              color: "#7C3AED", group: "standard",   keywords: "media اعلام میدیا broadcasting advertising studio" },
  { key: "telecom",       icon: Signal,          color: "#0891B2", group: "standard",   keywords: "telecom اتصالات ئینتەرنێت internet mobile networks" },
  { key: "energy",        icon: Zap,             color: "#CA8A04", group: "standard",   keywords: "energy طاقة وزە electricity oil gas solar power" },
  { key: "legal",         icon: Scale,           color: "#6B7280", group: "standard",   keywords: "legal قانون یاسا law office attorney lawyer" },
  { key: "nursery",       icon: Leaf,            color: "#65A30D", group: "standard",   keywords: "nursery garden حديقة باخچە plants flowers زراعة" },
  { key: "laundry",       icon: Wind,            color: "#06B6D4", group: "retail",     keywords: "laundry مغسلة جامەشۆخانە dry cleaning غسيل" },
  { key: "other",         icon: Layers,          color: "#6B7280", group: "standard",   keywords: "other أخرى دیکە miscellaneous general عام" },
];

/* ─── Truck size options (delivery sector) ─────────────────────────── */
const TRUCK_SIZES = ["ئەتیکۆ", "ترێلە", "پیکاب", "کیا", "ماتۆڕی بار"];

/* ─── Glass style tokens ───────────────────────────────────────────── */
const glass = {
  card: {
    background: "rgba(255,255,255,0.08)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    border: "1px solid rgba(255,255,255,0.15)",
    boxShadow: "0 8px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.12)",
  } as React.CSSProperties,
  input: {
    background: "rgba(0,0,0,0.22)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "#FFFFFF",
  } as React.CSSProperties,
  inputFocusBorder: "1px solid rgba(99,179,255,0.7)",
  inputFocusShadow: "0 0 0 3px rgba(59,130,246,0.2)",
};

/* ─── Hex → RGB helper ─────────────────────────────────────────────── */
function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}

/* ─── Progress Tracker ─────────────────────────────────────────────── */
function ProgressBar({ step, total }: { step: number; total: number }) {
  const { t } = useTranslation();
  const labels = [t("onboard.step1Label"), t("onboard.step2Label"), t("onboard.step3Label")];
  return (
    <div className="px-6 pt-5 pb-4">
      <div className="flex items-start justify-between relative">
        <div className="absolute top-4 start-8 end-8 h-px z-0" style={{ background:"rgba(255,255,255,0.12)" }}>
          <motion.div className="h-full rounded-full" style={{ background:"linear-gradient(90deg,#3B82F6,#60A5FA)", width:`${((step-1)/(total-1))*100}%` }} transition={{ duration:0.4 }} />
        </div>
        {Array.from({ length: total }, (_,i) => {
          const n=i+1, done=n<step, active=n===step;
          return (
            <div key={n} className="flex flex-col items-center z-10 flex-1">
              <motion.div layout className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 ${
                done ? "border-blue-400 bg-blue-500 text-white" :
                active ? "border-blue-400 text-blue-300" : "text-white/30"
              }`} style={active ? { background:"rgba(59,130,246,0.2)" } : done ? {} : { background:"rgba(255,255,255,0.05)", borderColor:"rgba(255,255,255,0.12)" }}>
                {done ? <Check className="w-4 h-4" /> : <span>{n}</span>}
              </motion.div>
              <p className={`text-[10px] mt-1.5 text-center font-medium leading-tight max-w-[64px] ${active?"text-blue-300":done?"text-blue-400/70":"text-white/30"}`}>
                {labels[i]}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Shared form primitives ───────────────────────────────────────── */
function Input({ label, error, icon: Icon, type = "text", hint, ...props }: any) {
  const [show, setShow] = useState(false);
  const isPass = type === "password";
  return (
    <div>
      {label && <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color:"#E2E8F0", letterSpacing:"0.06em" }}>{label}</label>}
      {hint && <p className="text-[11px] mb-1.5" style={{ color:"#64748B" }}>{hint}</p>}
      <div className="relative">
        {Icon && <Icon className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color:"#94A3B8" }} />}
        <input type={isPass?(show?"text":"password"):type} {...props}
          className={`w-full py-2.5 rounded-xl outline-none transition-all text-sm text-white placeholder-[#94A3B8] ${error?"ring-2 ring-red-500/60":""} ${Icon?"ps-9":"ps-3.5"} ${isPass?"pe-10":"pe-3.5"}`}
          style={{ ...glass.input, borderRadius:"0.75rem" }}
          onFocus={e=>{ e.currentTarget.style.border=glass.inputFocusBorder; e.currentTarget.style.boxShadow=glass.inputFocusShadow; }}
          onBlur={e=>{ e.currentTarget.style.border="1px solid rgba(255,255,255,0.12)"; e.currentTarget.style.boxShadow="none"; }}
        />
        {isPass && (
          <button type="button" onClick={()=>setShow(v=>!v)} className="absolute end-3 top-1/2 -translate-y-1/2" style={{ color:"#94A3B8" }}>
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {error && <p className="text-[11px] text-red-400 mt-1">{error}</p>}
    </div>
  );
}

function GSelect({ label, error, children, ...props }: any) {
  return (
    <div>
      {label && <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color:"#E2E8F0", letterSpacing:"0.06em" }}>{label}</label>}
      <div className="relative">
        <select {...props} className="w-full appearance-none ps-3.5 pe-9 py-2.5 rounded-xl outline-none transition-all text-sm cursor-pointer linqi-shell-select text-slate-900 dark:text-white"
          style={{ ...glass.input, borderRadius:"0.75rem" }}
          onFocus={e=>{ e.currentTarget.style.border=glass.inputFocusBorder; e.currentTarget.style.boxShadow=glass.inputFocusShadow; }}
          onBlur={e=>{ e.currentTarget.style.border="1px solid rgba(255,255,255,0.12)"; e.currentTarget.style.boxShadow="none"; }}>
          {children}
        </select>
        <ChevronDown className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color:"#94A3B8" }} />
      </div>
      {error && <p className="text-[11px] text-red-400 mt-1">{error}</p>}
    </div>
  );
}


function PrimaryBtn({ children, disabled, ...props }: any) {
  return (
    <button {...props} disabled={disabled}
      className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-sm transition-all"
      style={{ background:disabled?"rgba(59,130,246,0.3)":"linear-gradient(135deg,#2563EB,#3B82F6)", color:"#FFFFFF",
        boxShadow:disabled?"none":"0 4px 20px rgba(37,99,235,0.5)", border:"1px solid rgba(99,179,255,0.3)", letterSpacing:"0.02em" }}>
      {children}
    </button>
  );
}

function SecondaryBtn({ children, ...props }: any) {
  return (
    <button {...props} className="flex items-center justify-center gap-2 flex-1 py-3 rounded-xl font-semibold text-sm transition-all"
      style={{ background:"rgba(255,255,255,0.06)", color:"#CBD5E1", border:"1px solid rgba(255,255,255,0.12)" }}>
      {children}
    </button>
  );
}

/* ─── Phone input with prefix ──────────────────────────────────────── */
function PhoneInput({ label, value, onChange, error }: { label: string; value: string; onChange: (v: string) => void; error?: string }) {
  const [prefix, setPrefix] = useState("+964");
  const [showPrefix, setShowPrefix] = useState(false);
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color:"#E2E8F0", letterSpacing:"0.06em" }}>{label}</label>
      <div className="flex gap-2 relative">
        <button type="button" onClick={()=>setShowPrefix(v=>!v)}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all min-w-[80px]"
          style={{ ...glass.input, color:"#FFFFFF", borderRadius:"0.75rem" }}>
          <span>{PHONE_PREFIXES.find(p=>p.code===prefix)?.flag}</span>
          <span className="text-xs font-mono">{prefix}</span>
          <ChevronDown className="w-3 h-3 ms-auto" style={{ color:"#94A3B8" }} />
        </button>
        <AnimatePresence>
          {showPrefix && (
            <motion.div initial={{opacity:0,y:-6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}}
              className="absolute top-full start-0 mt-1 rounded-xl py-1 z-50 min-w-[130px] overflow-hidden"
              style={{ background:"rgba(6,18,36,0.95)", border:"1px solid rgba(255,255,255,0.15)", backdropFilter:"blur(12px)", boxShadow:"0 8px 32px rgba(0,0,0,0.5)" }}>
              {PHONE_PREFIXES.map(p=>(
                <button key={p.code} type="button" onClick={()=>{setPrefix(p.code);setShowPrefix(false);}}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-all hover:bg-white/10" style={{ color:"#E2E8F0" }}>
                  <span>{p.flag}</span><span className="font-mono">{p.code}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        <input type="tel" value={value} onChange={e=>onChange(e.target.value)} dir="ltr"
          className="flex-1 ps-3.5 pe-3.5 py-2.5 rounded-xl text-sm text-white placeholder-[#94A3B8] outline-none transition-all"
          style={glass.input} placeholder="750 000 0000"
          onFocus={e=>{e.currentTarget.style.border=glass.inputFocusBorder;e.currentTarget.style.boxShadow=glass.inputFocusShadow;}}
          onBlur={e=>{e.currentTarget.style.border="1px solid rgba(255,255,255,0.12)";e.currentTarget.style.boxShadow="none";}} />
      </div>
      {error && <p className="text-[11px] text-red-400 mt-1">{error}</p>}
    </div>
  );
}

/* ─── Upload Box ───────────────────────────────────────────────────── */
function UploadBox({
  label,
  hint,
  required,
  icon: Icon = Upload,
  file,
  onFileChange,
  showError,
}: {
  label: string;
  hint: string;
  required?: boolean;
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  file: File | null;
  onFileChange: (file: File | null) => void;
  showError?: boolean;
}) {
  const { t } = useTranslation();
  const missing = required && !file && showError;

  return (
    <label
      className={cn(
        "flex flex-col items-center gap-2 p-4 rounded-xl text-center cursor-pointer transition-all",
        "bg-white/[0.04] border-2 border-dashed",
        file ? "border-blue-400/60" : missing ? "border-red-400/50" : "border-white/15",
        "hover:border-blue-400/50",
      )}
    >
      <input
        type="file"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
        onChange={e => onFileChange(e.target.files?.[0] ?? null)}
      />
      <div
        className={cn(
          "w-9 h-9 rounded-xl flex items-center justify-center",
          file ? "bg-blue-500/25" : "bg-white/[0.07]",
        )}
      >
        {file ? <Check className="w-5 h-5 text-blue-400" /> : <Icon className="w-5 h-5 text-white/35" />}
      </div>
      <p className={cn("text-[11px] font-semibold leading-tight", file ? "text-blue-400" : "text-white/60")}>
        {file ? file.name : label}
      </p>
      <p className="text-[10px] text-white/30">{hint}</p>
      {required && !file && (
        <span
          className={cn(
            "text-[9px] px-1.5 py-0.5 rounded-full font-bold border",
            missing
              ? "bg-red-500/20 text-red-300 border-red-400/30"
              : "bg-amber-500/15 text-amber-200 border-amber-400/25",
          )}
        >
          ✱ {t("onboard.required")}
        </span>
      )}
    </label>
  );
}

/* ─── Delivery Area Radio ──────────────────────────────────────────── */
function DeliveryAreaSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useTranslation();
  const opts = [
    { v: "inner", label: t("onboard.deliveryAreaInner") },
    { v: "outer", label: t("onboard.deliveryAreaOuter") },
    { v: "both",  label: t("onboard.deliveryAreaBoth") },
  ];
  return (
    <div className="flex gap-2">
      {opts.map(o => (
        <button key={o.v} type="button" onClick={()=>onChange(o.v)}
          className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all"
          style={value===o.v ? { background:"rgba(59,130,246,0.3)", border:"1.5px solid rgba(99,179,255,0.7)", color:"#FFFFFF" }
            : { background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.12)", color:"rgba(255,255,255,0.55)" }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/* STEP 1: Sector Grid                                                 */
/* ═══════════════════════════════════════════════════════════════════ */
function StepSector({ selected, onSelect }: { selected: string; onSelect: (k: string) => void }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SECTORS;
    return SECTORS.filter(s => {
      const name = t(`onboard.sector_${s.key}`).toLowerCase();
      const kw = (s.keywords ?? "").toLowerCase();
      return name.includes(q) || kw.includes(q);
    });
  }, [query, t]);

  return (
    <div className="px-5 pb-6 space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-extrabold" style={{ color:"#FFFFFF" }}>{t("onboard.sectorTitle")}</h2>
        <p className="text-sm mt-1" style={{ color:"#94A3B8" }}>{t("onboard.sectorSub")}</p>
      </div>

      {/* ── Premium search bar ── */}
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none transition-colors"
          style={{ color: searchFocused ? "#60A5FA" : "#64748B" }} />
        <input
          ref={searchRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t("onboard.sectorSearch")}
          className="w-full ps-9 pe-9 py-2.5 rounded-xl text-sm text-white placeholder-[#64748B] outline-none transition-all"
          style={{ ...glass.input, borderRadius: "0.75rem" }}
          onFocus={e => {
            setSearchFocused(true);
            e.currentTarget.style.border = glass.inputFocusBorder;
            e.currentTarget.style.boxShadow = glass.inputFocusShadow;
          }}
          onBlur={e => {
            setSearchFocused(false);
            e.currentTarget.style.border = "1px solid rgba(255,255,255,0.12)";
            e.currentTarget.style.boxShadow = "none";
          }}
        />
        <AnimatePresence>
          {query && (
            <motion.button
              initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }}
              type="button" onClick={() => { setQuery(""); searchRef.current?.focus(); }}
              className="absolute end-2.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full transition-colors"
              style={{ background: "rgba(255,255,255,0.1)", color: "#94A3B8" }}>
              <X className="w-3 h-3" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* ── Sector grid ── */}
      <div
        className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 overflow-y-auto"
        style={{ maxHeight: "360px", scrollbarWidth: "thin", scrollbarColor: "rgba(99,179,255,0.25) transparent" }}>
        {filtered.length === 0 ? (
          <div className="col-span-3 sm:col-span-4 flex flex-col items-center justify-center py-8 gap-2" style={{ color: "#4B5563" }}>
            <Search className="w-7 h-7 opacity-40" />
            <p className="text-xs">{t("onboard.sectorNoResults")}</p>
          </div>
        ) : filtered.map(({ key, icon: Icon, color }) => {
          const sel = selected === key;
          return (
            <motion.button key={key} type="button" onClick={() => onSelect(key)}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.94 }}
              className="relative flex flex-col items-center gap-2 p-3 rounded-2xl text-center transition-all cursor-pointer"
              style={sel ? {
                background: `rgba(${hexToRgb(color)},0.18)`, border: `2px solid ${color}`,
                boxShadow: `0 0 18px rgba(${hexToRgb(color)},0.3)`,
              } : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}>
              {sel && (
                <div className="absolute top-1.5 end-1.5 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: color }}>
                  <Check className="w-2.5 h-2.5 text-white" />
                </div>
              )}
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `rgba(${hexToRgb(color)},${sel ? 0.3 : 0.15})` }}>
                <Icon className="w-5 h-5" style={{ color: sel ? color : "rgba(255,255,255,0.6)" }} />
              </div>
              <span className="text-[10px] font-semibold leading-tight" style={{ color: sel ? "#FFFFFF" : "rgba(255,255,255,0.55)" }}>
                {t(`onboard.sector_${key}`)}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Category definitions: unique contextual icon + soft accent ────── */
const CATEGORY_DEFS: Record<CatKey, { Icon: React.ComponentType<{className?:string;style?:React.CSSProperties}>; color: string }> = {
  electronic:       { Icon: Monitor,         color: "#60A5FA" },
  stationery:       { Icon: PenLine,         color: "#A78BFA" },
  babyCare:         { Icon: Heart,           color: "#F9A8D4" },
  cosmetics:        { Icon: Sparkles,        color: "#F472B6" },
  homeLiving:       { Icon: Home,            color: "#34D399" },
  gaming:           { Icon: Gamepad2,        color: "#818CF8" },
  food:             { Icon: UtensilsCrossed, color: "#FB923C" },
  medicine:         { Icon: Pill,            color: "#4ADE80" },
  clothing:         { Icon: Shirt,           color: "#E879F9" },
  automotive:       { Icon: Car,             color: "#F87171" },
  agriculture:      { Icon: Wheat,           color: "#A3E635" },
  construction:     { Icon: HardHat,         color: "#FCD34D" },
  sports:           { Icon: Dumbbell,        color: "#FDBA74" },
  beauty:           { Icon: Scissors,        color: "#FDA4AF" },
  cleaning:         { Icon: Wind,            color: "#67E8F9" },
  office:           { Icon: Briefcase,       color: "#93C5FD" },
  technology:       { Icon: Cpu,             color: "#38BDF8" },
  printing:         { Icon: Printer,         color: "#94A3B8" },
  books:            { Icon: GraduationCap,   color: "#C4B5FD" },
  medicalSupplies:  { Icon: Stethoscope,     color: "#34D399" },
  mobile:           { Icon: Phone,           color: "#60A5FA" },
  accessories:      { Icon: Sparkles,        color: "#A78BFA" },
  software:         { Icon: Cpu,             color: "#22D3EE" },
  computer:         { Icon: Monitor,         color: "#60A5FA" },
  pcParts:          { Icon: Cpu,             color: "#38BDF8" },
  ticketsFlights:   { Icon: Plane,           color: "#38BDF8" },
  hotelsBooking:    { Icon: Building2,       color: "#818CF8" },
  visasTours:       { Icon: Globe,           color: "#34D399" },
  travelInsurance:  { Icon: ShieldCheck,     color: "#FBBF24" },
  pensionTransport: { Icon: Route,           color: "#F97316" },
  officeSupplies:   { Icon: Briefcase,       color: "#93C5FD" },
  officeFurniture:  { Icon: Home,            color: "#C4B5FD" },
  officeServices:   { Icon: FileText,        color: "#67E8F9" },
  computerPrinting: { Icon: Printer,         color: "#94A3B8" },
};

/* ─── Product Category Tag Input ──────────────────────────────────── */
function ProductTagInput({
  label, value, onChange, sectorKey,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  sectorKey?: string;
}) {
  const { t } = useTranslation();
  const [inputVal, setInputVal] = useState("");
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* All presets (label + def) — re-derived when locale switches */
  const allPresets = useMemo(
    () => ALL_CAT_KEYS.map(k => ({
      key: k,
      label: t(`onboard.productCat_${k}`),
      Icon: CATEGORY_DEFS[k].Icon,
      color: CATEGORY_DEFS[k].color,
    })),
    [t]
  );

  /* Reverse-lookup: translated label → def (for colouring existing tags) */
  const labelToPreset = useMemo(() => {
    const m: Record<string, typeof allPresets[0]> = {};
    for (const p of allPresets) m[p.label] = p;
    return m;
  }, [allPresets]);

  /* Active keys: sector-filtered only — NEVER fall back to ALL_CAT_KEYS */
  const activePresets = useMemo(() => {
    const keys = getAllowedCategoriesForSector(sectorKey);
    if (!keys?.length) return [];
    return keys.map(k => allPresets.find(p => p.key === k)!).filter(Boolean);
  }, [sectorKey, allPresets]);

  const isSectorFiltered = (getAllowedCategoriesForSector(sectorKey)?.length ?? 0) > 0;

  const filtered = activePresets.filter(
    o => !value.includes(o.label) && o.label.toLowerCase().includes(inputVal.toLowerCase())
  );

  const trimmed = inputVal.trim();
  const isCustom =
    !isSectorFiltered &&
    trimmed !== "" &&
    !allPresets.some(o => o.label.toLowerCase() === trimmed.toLowerCase()) &&
    !value.includes(trimmed);

  const addTag = (tag: string) => {
    const t2 = tag.trim();
    if (!t2 || value.includes(t2)) return;
    onChange([...value, t2]);
    setInputVal("");
    inputRef.current?.focus();
  };

  const removeTag = (tag: string) => onChange(value.filter(v => v !== tag));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (isSectorFiltered) {
        const match = filtered[0];
        if (match) addTag(match.label);
      } else if (inputVal.trim()) {
        addTag(inputVal);
      }
    } else if (e.key === "Backspace" && inputVal === "" && value.length > 0) {
      removeTag(value[value.length - 1]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showDrop = open && (filtered.length > 0 || (isCustom && !isSectorFiltered));

  return (
    <div ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
          style={{ color: "#E2E8F0", letterSpacing: "0.06em" }}>
          {label}
        </label>
      )}

      {/* ── Pill / input box ── */}
      <div
        onClick={() => { inputRef.current?.focus(); setOpen(true); }}
        className="rounded-xl transition-all cursor-text"
        style={{
          ...glass.input, borderRadius: "0.75rem",
          minHeight: "44px", padding: "6px 10px",
          display: "flex", flexWrap: "wrap", alignItems: "center", gap: "5px",
          ...(focused ? { border: glass.inputFocusBorder, boxShadow: glass.inputFocusShadow } : {}),
        }}
      >
        {value.map(tag => {
          const def = labelToPreset[tag];
          const tc = def?.color ?? "#60A5FA";
          return (
            <span key={tag}
              className="flex items-center gap-1.5 ps-2 pe-1.5 py-1 rounded-full text-xs font-semibold"
              style={{ background: `${tc}1A`, border: `1px solid ${tc}50`, color: "#FFFFFF" }}>
              {def && <def.Icon className="w-2.5 h-2.5 flex-shrink-0" style={{ color: tc }} />}
              {tag}
              <button
                type="button"
                onMouseDown={e => { e.stopPropagation(); e.preventDefault(); removeTag(tag); }}
                className="flex items-center justify-center w-3.5 h-3.5 rounded-full transition-colors hover:bg-white/20 flex-shrink-0"
                style={{ color: "rgba(255,255,255,0.55)" }}
                aria-label={`Remove ${tag}`}
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          );
        })}
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={e => { setInputVal(e.target.value); setOpen(true); }}
          onFocus={() => { setFocused(true); setOpen(true); }}
          onBlur={() => { setFocused(false); setTimeout(() => setOpen(false), 160); }}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? t("onboard.productCategoriesPh") : ""}
          className="flex-1 bg-transparent outline-none text-sm text-white placeholder-[#94A3B8]"
          style={{ minWidth: "90px" }}
        />
        <ChevronDown
          className="w-4 h-4 ms-auto flex-shrink-0 pointer-events-none transition-transform duration-200"
          style={{ color: "#94A3B8", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </div>

      {/* ── Dropdown ── */}
      <AnimatePresence>
        {showDrop && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="mt-1.5 rounded-xl overflow-hidden"
            style={{
              background: "rgba(5,14,30,0.98)",
              border: "1px solid rgba(255,255,255,0.11)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              boxShadow: "0 16px 48px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.06)",
              zIndex: 50,
              position: "relative",
            }}
          >
            {/* Sector context badge */}
            {isSectorFiltered && filtered.length > 0 && (
              <div className="flex items-center gap-2 px-3.5 py-2"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(59,130,246,0.15)", color: "#60A5FA", border: "1px solid rgba(99,179,255,0.2)" }}>
                  {t(`onboard.sector_${sectorKey}`)}
                </span>
                <span className="text-[10px]" style={{ color: "#334155" }}>
                  {filtered.length} {filtered.length === 1 ? "category" : "categories"}
                </span>
              </div>
            )}

            {/* Options list */}
            <div className="py-1 max-h-60 overflow-y-auto"
              style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(99,179,255,0.18) transparent" }}>
              {filtered.map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  onMouseDown={e => { e.preventDefault(); addTag(opt.label); }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm transition-all text-start"
                  style={{ color: "#E2E8F0" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.055)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  {/* Icon badge */}
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
                    style={{ background: `${opt.color}14`, border: `1px solid ${opt.color}28` }}>
                    <opt.Icon className="w-3.5 h-3.5" style={{ color: opt.color }} />
                  </span>
                  <span className="flex-1 leading-snug">{opt.label}</span>
                </button>
              ))}
            </div>

            {/* Custom entry row */}
            {isCustom && (
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <button
                  type="button"
                  onMouseDown={e => { e.preventDefault(); addTag(inputVal); }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm transition-all text-start"
                  style={{ color: "#94A3B8" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold"
                    style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(99,179,255,0.22)", color: "#60A5FA" }}>
                    +
                  </span>
                  <span className="flex-1 leading-snug">
                    {t("onboard.addCustomCategory")}{" "}
                    <span className="font-semibold" style={{ color: "#CBD5E1" }}>&ldquo;{trimmed}&rdquo;</span>
                  </span>
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/* STEP 2: Dynamic Details form                                         */
/* ═══════════════════════════════════════════════════════════════════ */
function StepDetails({ group, sectorKey, data, setData, errors, onNext }: { group: SectorGroup; sectorKey: string; data: any; setData: any; errors: Record<string,string>; onNext: ()=>void }) {
  const { t } = useTranslation();

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) =>
    setData((d: any) => ({ ...d, [k]: e.target.value }));
  const setV = (k: string) => (v: string) => setData((d: any) => ({ ...d, [k]: v }));
  const setStoreLocation = (lat: number, lng: number) =>
    setData((d: any) => ({ ...d, storeLat: lat, storeLng: lng }));

  const storeLocationField = (
    <StoreLocationField
      label={t("onboard.address")}
      address={data.address || ""}
      lat={typeof data.storeLat === "number" ? data.storeLat : undefined}
      lng={typeof data.storeLng === "number" ? data.storeLng : undefined}
      onAddressChange={setV("address")}
      onLocationChange={setStoreLocation}
      glass={glass}
    />
  );

  return (
    <div className="px-6 pb-6 space-y-3.5">
      <div>
        <h2 className="text-lg font-bold" style={{ color:"#FFFFFF" }}>{t("onboard.detailsTitle")}</h2>
        <p className="text-sm mt-0.5" style={{ color:"#94A3B8" }}>{t("onboard.detailsSub")}</p>
      </div>

      {/* ── ENTERPRISE (Distributor / Manufacturer) ── */}
      {group === "enterprise" && (<>
        <Input label={t("onboard.companyName")} icon={FileText} value={data.companyName||""} onChange={set("companyName")} error={errors.companyName} placeholder={t("onboard.companyNamePh")} />
        <Input label={t("onboard.licenseNumber")} icon={FileText} value={data.licenseNumber||""} onChange={set("licenseNumber")} error={errors.licenseNumber} placeholder="TRD-2024-XXXXX" dir="ltr" />
        <Input label={t("onboard.managerName")} icon={User} value={data.managerName||""} onChange={set("managerName")} error={errors.managerName} placeholder={t("onboard.managerNamePh")} />
        <Input label={t("onboard.email")} icon={Mail} type="email" value={data.email||""} onChange={set("email")} error={errors.email} placeholder="info@company.com" dir="ltr" />
        <PhoneInput label={t("onboard.mobile")} value={data.mobile||""} onChange={setV("mobile")} error={errors.mobile} />
        <PhoneInput label={t("onboard.whatsapp")} value={data.whatsapp||""} onChange={setV("whatsapp")} />
        <div className="grid grid-cols-2 gap-3">
          <GSelect label={t("onboard.governorate")} value={data.governorate||""} onChange={set("governorate")} error={errors.governorate}>
            <option value="" disabled>{t("onboard.select")}</option>
            {GOVERNORATES.map(k=><option key={k} value={k}>{t(`register.provinces.${k}`)}</option>)}
          </GSelect>
          <Input label={t("onboard.city")} icon={MapPin} value={data.city||""} onChange={set("city")} error={errors.city} placeholder={t("onboard.cityPh")} />
        </div>
        {storeLocationField}
        <ProductTagInput
          label={t("onboard.productCategories")}
          value={Array.isArray(data.productCategories) ? data.productCategories : []}
          onChange={v => setData((d: any) => ({ ...d, productCategories: v }))}
          sectorKey={sectorKey}
        />
        <div>
          <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color:"#E2E8F0", letterSpacing:"0.06em" }}>
            {t("onboard.deliveryArea")}
          </label>
          <DeliveryAreaSelect value={data.deliveryArea||""} onChange={setV("deliveryArea")} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label={t("onboard.password")} icon={Lock} type="password" value={data.password||""} onChange={set("password")} error={errors.password} placeholder="••••••••" />
          <Input label={t("onboard.confirmPassword")} icon={Lock} type="password" value={data.confirmPassword||""} onChange={set("confirmPassword")} error={errors.confirmPassword} placeholder="••••••••" />
        </div>
      </>)}

      {/* ── RETAIL (Supermarket / Restaurant / Hotel) ── */}
      {group === "retail" && (<>
        <Input label={t("onboard.businessName")} icon={FileText} value={data.businessName||""} onChange={set("businessName")} error={errors.businessName} placeholder={t("onboard.businessNamePh")} />
        <Input label={t("onboard.managerName")} icon={User} value={data.managerName||""} onChange={set("managerName")} error={errors.managerName} placeholder={t("onboard.managerNamePh")} />
        <Input label={t("onboard.email")} icon={Mail} type="email" value={data.email||""} onChange={set("email")} error={errors.email} placeholder="info@business.com" dir="ltr" />
        <PhoneInput label={t("onboard.mobile")} value={data.mobile||""} onChange={setV("mobile")} error={errors.mobile} />
        {storeLocationField}
        <div className="grid grid-cols-2 gap-3">
          <Input label={t("onboard.password")} icon={Lock} type="password" value={data.password||""} onChange={set("password")} error={errors.password} placeholder="••••••••" />
          <Input label={t("onboard.confirmPassword")} icon={Lock} type="password" value={data.confirmPassword||""} onChange={set("confirmPassword")} error={errors.confirmPassword} placeholder="••••••••" />
        </div>
      </>)}

      {/* ── DELIVERY ── */}
      {group === "delivery" && (<>
        <Input label={t("onboard.companyName")} icon={FileText} value={data.companyName||""} onChange={set("companyName")} error={errors.companyName} placeholder={t("onboard.companyNamePh")} />
        <Input label={t("onboard.companyReg")} icon={FileText} value={data.companyReg||""} onChange={set("companyReg")} error={errors.companyReg} placeholder="REG-XXXXX" dir="ltr" />
        <PhoneInput label={t("onboard.mobile")} value={data.mobile||""} onChange={setV("mobile")} error={errors.mobile} />
        <Input label={t("onboard.nationalId")} icon={User} value={data.nationalId||""} onChange={set("nationalId")} error={errors.nationalId} placeholder="XXXXXXXXXXXXX" dir="ltr" />
        <div>
          <label className="block text-xs font-semibold mb-2.5 uppercase tracking-wide" style={{ color:"#E2E8F0", letterSpacing:"0.06em" }}>
            {t("onboard.truckSizes")}
          </label>
          <div className="flex flex-wrap gap-2">
            {TRUCK_SIZES.map(ts => {
              const checked = (data.truckSizes||[]).includes(ts);
              return (
                <button key={ts} type="button"
                  onClick={()=>setData((d:any)=>({...d,truckSizes:checked?(d.truckSizes||[]).filter((x:string)=>x!==ts):[...(d.truckSizes||[]),ts]}))}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={checked ? { background:"rgba(16,185,129,0.25)", border:"1.5px solid rgba(52,211,153,0.6)", color:"#FFFFFF" }
                    : { background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.12)", color:"rgba(255,255,255,0.55)" }}>
                  {checked && <Check className="inline w-3 h-3 me-1" />}{ts}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color:"#E2E8F0", letterSpacing:"0.06em" }}>
            {t("onboard.coverageArea")}
          </label>
          <DeliveryAreaSelect value={data.coverageArea||""} onChange={setV("coverageArea")} />
        </div>
        <Input label={t("onboard.numTrucks")} icon={Truck} type="number" value={data.numTrucks||""} onChange={set("numTrucks")} placeholder="1" dir="ltr" />
        <div className="grid grid-cols-2 gap-3">
          <Input label={t("onboard.password")} icon={Lock} type="password" value={data.password||""} onChange={set("password")} error={errors.password} placeholder="••••••••" />
          <Input label={t("onboard.confirmPassword")} icon={Lock} type="password" value={data.confirmPassword||""} onChange={set("confirmPassword")} error={errors.confirmPassword} placeholder="••••••••" />
        </div>
      </>)}

      {/* ── STANDARD (Hospital / Retail / Pharmacy / Office / Other) ── */}
      {group === "standard" && (<>
        <Input label={t("onboard.businessName")} icon={FileText} value={data.businessName||""} onChange={set("businessName")} error={errors.businessName} placeholder={t("onboard.businessNamePh")} />
        <Input label={t("onboard.managerName")} icon={User} value={data.managerName||""} onChange={set("managerName")} error={errors.managerName} placeholder={t("onboard.managerNamePh")} />
        <Input label={t("onboard.email")} icon={Mail} type="email" value={data.email||""} onChange={set("email")} error={errors.email} placeholder="info@business.com" dir="ltr" />
        <PhoneInput label={t("onboard.mobile")} value={data.mobile||""} onChange={setV("mobile")} error={errors.mobile} />
        {storeLocationField}
        <div className="grid grid-cols-2 gap-3">
          <Input label={t("onboard.password")} icon={Lock} type="password" value={data.password||""} onChange={set("password")} error={errors.password} placeholder="••••••••" />
          <Input label={t("onboard.confirmPassword")} icon={Lock} type="password" value={data.confirmPassword||""} onChange={set("confirmPassword")} error={errors.confirmPassword} placeholder="••••••••" />
        </div>
      </>)}

      <PrimaryBtn type="button" onClick={onNext}>
        {t("onboard.continue")} <ChevronRight className="w-4 h-4" />
      </PrimaryBtn>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/* STEP 3: Dynamic Uploads                                             */
/* ═══════════════════════════════════════════════════════════════════ */
function StepUploads({
  onSubmit,
  onBack,
  isLoading,
  submitError,
}: {
  onSubmit: () => void;
  onBack: () => void;
  isLoading: boolean;
  submitError?: string;
}) {
  const { t } = useTranslation();
  const formatHint = t("onboard.uploadDocFormats");

  const uploadDocs = [
    { key: "nationalId", label: t("onboard.uploadDocNationalId"), icon: User },
    { key: "passport", label: t("onboard.uploadDocPassport"), icon: FileText },
    { key: "businessLicense", label: t("onboard.uploadDocBusinessLicense"), icon: FileText },
  ] as const;

  const [files, setFiles] = useState<Record<(typeof uploadDocs)[number]["key"], File | null>>({
    nationalId: null,
    passport: null,
    businessLicense: null,
  });
  const [showUploadError, setShowUploadError] = useState(false);

  const handleContinue = () => {
    const hasAny = uploadDocs.some(doc => files[doc.key]);
    if (!hasAny) {
      setShowUploadError(true);
      return;
    }
    setShowUploadError(false);
    onSubmit();
  };

  return (
    <div className="px-6 pb-6 space-y-4">
      <div>
        <h2 className="text-lg font-bold" style={{ color:"#FFFFFF" }}>{t("onboard.uploadsTitle")}</h2>
        <p className="text-sm mt-0.5" style={{ color:"#94A3B8" }}>{t("onboard.uploadsSub")}</p>
      </div>

      <div className="rounded-2xl p-4 flex items-start gap-3 border bg-emerald-800 border-emerald-600/50 text-emerald-100 dark:!bg-emerald-950/50 dark:!border-emerald-500/30">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-900/40 text-emerald-300">
          <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-300" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-sm font-bold leading-snug text-emerald-100">
            {t("onboard.uploadsRequiredBody")}
          </p>
          <p className="text-xs mt-1 font-medium leading-relaxed text-emerald-200">
            {t("onboard.uploadsRequiredSubtitle")}
          </p>
        </div>
      </div>

      {showUploadError && (
        <div
          className="rounded-xl p-3 flex items-start gap-2.5"
          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.35)" }}
        >
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#F87171" }} />
          <p className="text-xs leading-relaxed" style={{ color: "#FCA5A5" }}>{t("onboard.uploadsMissingDocs")}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {uploadDocs.map(doc => (
          <UploadBox
            key={doc.key}
            label={doc.label}
            hint={formatHint}
            icon={doc.icon}
            file={files[doc.key]}
            onFileChange={file => {
              setFiles(prev => ({ ...prev, [doc.key]: file }));
              if (file) setShowUploadError(false);
            }}
            showError={showUploadError && !files[doc.key]}
          />
        ))}
      </div>

      {submitError && (
        <div
          className="rounded-xl p-3 flex items-start gap-2.5"
          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.35)" }}
        >
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#F87171" }} />
          <p className="text-xs leading-relaxed" style={{ color: "#FCA5A5" }}>{submitError}</p>
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <SecondaryBtn type="button" onClick={onBack} disabled={isLoading}>
          <ChevronLeft className="w-4 h-4" /> {t("onboard.back")}
        </SecondaryBtn>
        <PrimaryBtn
          type="button"
          onClick={handleContinue}
          disabled={isLoading}
          style={{ flex: 2 }}
        >
          {isLoading ? (
            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{t("onboard.submitting")}</>
          ) : (
            <>{t("onboard.uploadsNextStep")} <ChevronRight className="w-4 h-4" /></>
          )}
        </PrimaryBtn>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/* PENDING REVIEW LOCK SCREEN                                          */
/* ═══════════════════════════════════════════════════════════════════ */
function PendingReviewScreen({
  sectorKey,
  businessName,
  verificationId,
  onReset,
}: {
  sectorKey: string;
  businessName: string;
  verificationId?: number;
  onReset: () => void;
}) {
  const { t } = useTranslation();
  const sector = SECTORS.find(s => s.key === sectorKey);
  const SectorIcon = sector?.icon ?? Package;
  const color = sector?.color ?? "#3B82F6";
  const [status, setStatus] = useState<VerificationStatus>("pending");
  const [rejectionReason, setRejectionReason] = useState<string | undefined>();

  useEffect(() => {
    const syncStatus = () => {
      migrateLegacyPendingReview();
      const id = verificationId ?? getPendingReviewSession()?.verificationId;
      if (!id) return;
      const row = findLocalVerification(id);
      if (row) {
        setStatus(row.status);
        setRejectionReason(row.rejectionReason);
      }
    };
    syncStatus();
    const timer = window.setInterval(syncStatus, 3000);
    window.addEventListener(VERIFICATIONS_UPDATED_EVENT, syncStatus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener(VERIFICATIONS_UPDATED_EVENT, syncStatus);
    };
  }, [verificationId]);

  const isApproved = status === "approved";
  const isRejected = status === "rejected" || status === "suspended";
  const statusColor = isApproved ? "#34D399" : isRejected ? "#F87171" : "#FBBF24";
  const statusLabel = isApproved
    ? t("onboard.approvedStatus")
    : isRejected
      ? t("onboard.rejectedStatus")
      : t("onboard.pendingStatus");

  const steps = [
    { label: t("onboard.stepReceived"), done: true },
    { label: t("onboard.stepDocs"), done: isApproved || isRejected },
    { label: t("onboard.stepGps"), done: isApproved },
    { label: t("onboard.stepActivation"), done: isApproved },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-6 pb-8 flex flex-col items-center">
      <motion.div
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 180, damping: 14 }}
        className="w-24 h-24 rounded-full flex items-center justify-center mb-5 mt-2 relative"
        style={{
          background: isApproved ? "rgba(16,185,129,0.15)" : isRejected ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)",
          border: `2px solid ${statusColor}80`,
          boxShadow: `0 0 48px ${statusColor}40`,
        }}
      >
        {isApproved ? (
          <CheckCircle2 className="w-12 h-12" style={{ color: statusColor }} />
        ) : isRejected ? (
          <AlertCircle className="w-12 h-12" style={{ color: statusColor }} />
        ) : (
          <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
            <Lock className="w-12 h-12" style={{ color: statusColor }} />
          </motion.div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex items-center gap-2 px-4 py-1.5 rounded-full mb-3"
        style={{ background: `${statusColor}26`, border: `1px solid ${statusColor}66` }}
      >
        {!isApproved && !isRejected && <Clock className="w-3.5 h-3.5" style={{ color: statusColor }} />}
        <span className="text-xs font-bold" style={{ color: statusColor }}>{statusLabel}</span>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="text-center mb-4">
        <h2 className="text-xl font-extrabold text-white mb-1">
          {isApproved ? t("onboard.approvedTitle") : isRejected ? t("onboard.rejectedTitle") : t("onboard.pendingTitle")}
        </h2>
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `rgba(${hexToRgb(color)},0.2)` }}>
            <SectorIcon className="w-3.5 h-3.5" style={{ color }} />
          </div>
          <span className="text-sm font-semibold" style={{ color: "#60A5FA" }}>
            {businessName || t(`onboard.sector_${sectorKey}`)}
          </span>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: "#94A3B8" }}>
          {isApproved
            ? t("onboard.approvedMsg")
            : isRejected
              ? rejectionReason || t("onboard.rejectedMsg")
              : t("onboard.pendingMsg")}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="w-full rounded-2xl p-4 mb-4 space-y-3"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-3">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${step.done ? "" : "opacity-40"}`}
              style={
                step.done
                  ? { background: "rgba(16,185,129,0.2)", border: "1px solid rgba(52,211,153,0.5)" }
                  : { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)" }
              }
            >
              {step.done
                ? <Check className="w-3.5 h-3.5" style={{ color: "#34D399" }} />
                : <span className="text-[10px] font-bold" style={{ color: "rgba(255,255,255,0.4)" }}>{i + 1}</span>}
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold" style={{ color: step.done ? "#FFFFFF" : "rgba(255,255,255,0.4)" }}>
                {step.label}
              </p>
              {!step.done && i === 1 && !isRejected && (
                <motion.div
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-[10px] mt-0.5"
                  style={{ color: "#F59E0B" }}
                >
                  ● {t("onboard.inProgress")}
                </motion.div>
              )}
            </div>
          </div>
        ))}
      </motion.div>

      {isApproved && (
        <motion.a
          href="/login"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full mb-3 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white"
          style={{ background: "linear-gradient(135deg,#10B981,#059669)", boxShadow: "0 8px 24px rgba(16,185,129,0.35)" }}
        >
          {t("onboard.goToLogin")}
        </motion.a>
      )}

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="w-full rounded-2xl p-4 flex items-start gap-3"
        style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}
      >
        <Globe className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#60A5FA" }} />
        <div>
          <p className="text-xs font-bold text-white mb-0.5">{t("onboard.pendingContact")}</p>
          <p className="text-xs" style={{ color: "#93C5FD" }}>{t("onboard.pendingNote")}</p>
          <p className="text-xs font-mono mt-1" style={{ color: "#60A5FA" }}>support@linqi.app</p>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="w-full mt-3">
        <button
          type="button"
          onClick={onReset}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all hover:bg-white/10 active:scale-[0.98]"
          style={{ background: "rgba(255,255,255,0.06)", color: "#CBD5E1", border: "1px solid rgba(255,255,255,0.15)" }}
        >
          <ChevronLeft className="w-4 h-4" />
          {t("onboard.backToStart")}
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/* MAIN REGISTER COMPONENT                                             */
/* ═══════════════════════════════════════════════════════════════════ */
const TOKEN_KEY = "pos_auth_token";

export default function Register() {
  const { t } = useTranslation();
  const [lang, setLang] = useState(i18n.language);
  const [, navigate] = useLocation();

  /* Clear legacy pending-review lock screen — onboarding always goes to dashboard */
  migrateLegacyPendingReview();
  clearPendingReviewSession();

  const [step, setStep] = useState(1);        // 1=sector, 2=details, 3=uploads
  const [sectorKey, setSectorKey] = useState("");
  const [details, setDetails] = useState<Record<string,any>>({});
  const [errors, setErrors] = useState<Record<string,string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [dir, setDir] = useState(1);

  const sector = SECTORS.find(s=>s.key===sectorKey);
  const group: SectorGroup = sector?.group ?? "standard";

  const switchLang = (code: string) => {
    i18n.changeLanguage(code); setLang(code);
    document.documentElement.dir = code==="ku"||code==="ar" ? "rtl" : "ltr";
    document.documentElement.lang = code;
  };

  const handleReset = () => {
    clearPendingReviewSession();
    setStep(1);
    setSectorKey("");
    setDetails({});
    setErrors({});
    setDir(1);
  };

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token && !isBypassAuthToken(token)) {
      hardNavigate(MERCHANT_APP_PATH);
      return;
    }
    try {
      if (sessionStorage.getItem(ONBOARDING_RESET_KEY) === "1") {
        sessionStorage.removeItem(ONBOARDING_RESET_KEY);
        clearLogoutEntryFlag();
        handleReset();
      }
    } catch {
      /* ignore */
    }
  }, []);


  /* ── Validation ── */
  const validateDetails = (): Record<string,string> => {
    const e: Record<string,string> = {};
    const req = t("onboard.errRequired");
    const checkName = (field: "companyName" | "businessName", value?: string) => {
      if (!value?.trim()) {
        e[field] = req;
        return;
      }
      if (!isValidBusinessName(value)) e[field] = t("onboard.errBusinessName");
    };
    const checkPhone = (value?: string) => {
      if (!value?.trim()) {
        e.mobile = req;
        return;
      }
      if (!isValidMobile(value)) e.mobile = t("onboard.errPhone");
    };
    if (group==="enterprise") {
      checkName("companyName", details.companyName);
      if (!details.licenseNumber?.trim()) e.licenseNumber = req;
      if (!details.managerName?.trim()) e.managerName = req;
      if (!details.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email)) e.email = t("onboard.errEmail");
      checkPhone(details.mobile);
    }
    if (group==="retail") {
      checkName("businessName", details.businessName);
      if (!details.managerName?.trim()) e.managerName = req;
      checkPhone(details.mobile);
    }
    if (group==="delivery") {
      checkName("companyName", details.companyName);
      if (!details.companyReg?.trim()) e.companyReg = req;
      checkPhone(details.mobile);
      if (!details.nationalId?.trim()) e.nationalId = req;
    }
    if (group==="standard") {
      checkName("businessName", details.businessName);
      if (!details.managerName?.trim()) e.managerName = req;
      checkPhone(details.mobile);
    }
    if (!details.password || details.password.length < 6) e.password = t("onboard.errPassword");
    if (details.password !== details.confirmPassword) e.confirmPassword = t("onboard.errMatch");
    return e;
  };

  const handleNextSector = () => {
    if (!sectorKey) return;
    setDir(1); setStep(2);
  };

  const handleNextDetails = () => {
    const e = validateDetails();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({}); setDir(1); setStep(3);
  };

  /* ── Build active user object (shared between submit & skip) ── */
  const buildActiveUser = () => {
    const businessName = details.companyName || details.businessName || "";
    const sec = SECTORS.find(s => s.key === sectorKey);
    return {
      id: Date.now(),
      name: businessName || details.managerName || "کاربەر",
      username: details.email || details.mobile || businessName || "user",
      role: "staff" as const,
      email: details.email || "",
      phone: details.mobile || "",
      canViewProfit: true,
      canDeleteData: false,
      canEditStock: true,
      canAccessReports: true,
      sectorKey,
      sectorGroup: sec?.group ?? "standard",
    };
  };

  /* ── Instant login helper: stores session and hard-navigates to dashboard ── */
  const completeLogin = (token: string, user: object) => {
    prepareMerchantSession();
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem("pos_cached_user", JSON.stringify(user));
    localStorage.setItem("linqi_sector", sectorKey);
    clearPendingReviewSession();
    try {
      sessionStorage.removeItem(ONBOARDING_RESET_KEY);
    } catch {
      /* ignore */
    }
    hardNavigate(MERCHANT_APP_PATH);
  };

  const attemptLogin = async (loginUsername: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: loginUsername,
          password: details.password as string,
        }),
      });
      if (!res.ok) return null;
      const data = await res.json() as { token?: string; user?: object };
      if (!data.token || !data.user) return null;
      return data;
    } catch {
      return null;
    }
  };

  /* ── Submit registration (documents required on step 3) ── */

  const handleSubmit = async () => {
    const detailErrors = validateDetails();
    if (Object.keys(detailErrors).length) {
      setErrors(detailErrors);
      setDir(-1);
      setStep(2);
      return;
    }

    if (!sectorKey) {
      setErrors({
        submit: t("onboard.submitError", { defaultValue: "Could not complete registration. Please try again." }),
      });
      return;
    }

    setIsLoading(true);
    setErrors((prev) => {
      const { submit: _omit, ...rest } = prev;
      return rest;
    });

    const businessName = (details.companyName || details.businessName || "").trim();
    const sec = SECTORS.find(s => s.key === sectorKey);
    const username = (details.email || details.mobile || businessName || "user").trim();
    const name = businessName || details.managerName || "کاربەر";
    const password = details.password as string;

    const storeLat = typeof details.storeLat === "number" ? details.storeLat : undefined;
    const storeLng = typeof details.storeLng === "number" ? details.storeLng : undefined;
    const addressText = (details.address as string) || "";
    const address = isValidCoords(storeLat, storeLng)
      ? formatStoreAddress(storeLat!, storeLng!, addressText)
      : addressText;

    const extraData = (({ password: _p, confirmPassword: _c, brands: _b, ...rest }) => rest)(details);

    const verificationPayload = {
      sectorKey,
      sectorGroup: sec?.group ?? "standard",
      businessName: businessName || name,
      email: details.email || "",
      mobile: details.mobile || "",
      governorate: details.governorate || "",
      city: details.city || "",
      address,
      extraData,
      username,
      password,
      name,
    };

    const registerBody = {
      username,
      password,
      name,
      sectorKey,
      sectorGroup: sec?.group ?? "standard",
      businessName: businessName || name,
      email: details.email || "",
      mobile: details.mobile || "",
      governorate: details.governorate || "",
      city: details.city || "",
      address,
      extraData,
    };

    const finishWithSession = (token: string, user: object) => {
      if (isValidCoords(storeLat, storeLng)) {
        saveStoreLocationLocal((user as { id?: number }).id ?? username, storeLat!, storeLng!, address);
      }
      void submitVerificationApplication(verificationPayload).catch(() => {
        /* optional — uploads are not required */
      });
      completeLogin(token, user);
    };

    const finishWithLocalSession = () => {
      const user = buildActiveUser();
      finishWithSession(`onboarding-${user.id}`, user);
    };

    try {
      let res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerBody),
      });

      const altUsername = details.mobile
        ? `${username}_${String(details.mobile).replace(/\D/g, "")}`
        : username;

      if (res.status === 409 && details.mobile) {
        res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...registerBody, username: altUsername }),
        });
      }

      if (res.ok) {
        const data = await res.json() as {
          token?: string;
          user?: object;
          sectorKey?: string;
        };

        if (data.token && data.user) {
          finishWithSession(data.token, data.user);
          return;
        }

        const loginData = await attemptLogin(res.status === 409 ? altUsername : username);
        if (loginData?.token && loginData.user) {
          finishWithSession(loginData.token, loginData.user);
          return;
        }
      }
    } catch {
      /* network — try login or local session below */
    }

    const loginData = await attemptLogin(username);
    if (loginData?.token && loginData.user) {
      finishWithSession(loginData.token, loginData.user);
      return;
    }

    if (details.mobile) {
      const altLogin = await attemptLogin(`${username}_${String(details.mobile).replace(/\D/g, "")}`);
      if (altLogin?.token && altLogin.user) {
        finishWithSession(altLogin.token, altLogin.user);
        return;
      }
    }

    /* API unavailable or account conflict — still enter dashboard (skip pending review) */
    finishWithLocalSession();
  };

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 40 : -40, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -40 : 40, opacity: 0 }),
  };

  /* ── HEADER ── */
  const header = (
    <div className="flex items-center justify-between px-5 pt-4 pb-2">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background:"rgba(59,130,246,0.2)", border:"1px solid rgba(99,179,255,0.3)" }}>
          <span className="text-sm font-black" style={{ background:"linear-gradient(135deg,#60A5FA,#A78BFA)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>L</span>
        </div>
        <div>
          <p className="text-sm font-black leading-none" style={{ color:"#FFFFFF", letterSpacing:"-0.02em" }}>LinQi</p>
          <p className="text-[10px] font-medium leading-none mt-0.5" style={{ color:"rgba(255,255,255,0.4)" }}>PLATFORM</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {LANGUAGES.map(l=>(
          <button key={l.code} type="button" onClick={()=>switchLang(l.code)}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
            style={lang===l.code ? { background:"rgba(59,130,246,0.3)", color:"#FFFFFF", border:"1px solid rgba(99,179,255,0.4)" }
              : { background:"transparent", color:"rgba(255,255,255,0.45)", border:"1px solid transparent" }}>
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <OnboardingAmbient step={step} />

      <div className="relative z-10 w-full max-w-lg">
        <AnimatePresence mode="wait">
            <motion.div key="form"
              initial={{ opacity:0, scale:0.96 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0 }}
              transition={{ type:"spring", stiffness:200, damping:22 }}
              className="rounded-3xl overflow-hidden" style={glass.card}>
              {header}

              {step <= 3 && <ProgressBar step={step} total={3} />}

              <AnimatePresence mode="wait" custom={dir}>
                {step === 1 && (
                  <motion.div key="s1" custom={dir} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration:0.22 }}>
                    <StepSector selected={sectorKey} onSelect={(k)=>{setSectorKey(k);}} />
                    <div className="px-5 pb-6 -mt-2">
                      <PrimaryBtn type="button" disabled={!sectorKey} onClick={handleNextSector}>
                        {t("onboard.continue")} <ChevronRight className="w-4 h-4" />
                      </PrimaryBtn>
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div key="s2" custom={dir} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration:0.22 }}>
                    <div className="px-6 pb-1 -mt-1">
                      <button type="button" onClick={()=>{setDir(-1);setStep(1);}}
                        className="flex items-center gap-1.5 text-xs font-semibold transition-all hover:opacity-80"
                        style={{ color:"#94A3B8" }}>
                        <ChevronLeft className="w-3.5 h-3.5" /> {t("onboard.back")}
                      </button>
                    </div>
                    <StepDetails group={group} sectorKey={sectorKey} data={details} setData={setDetails} errors={errors} onNext={handleNextDetails} />
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div key="s3" custom={dir} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration:0.22 }}>
                    <StepUploads
                      onSubmit={handleSubmit}
                      onBack={() => { setDir(-1); setStep(2); }}
                      isLoading={isLoading}
                      submitError={errors.submit}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
