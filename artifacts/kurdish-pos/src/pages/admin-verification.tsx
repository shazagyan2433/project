import { useState, useCallback, useMemo } from "react";
import i18n from "@/i18n";
import { useLocaleDir } from "@/lib/use-locale-dir";
import { cn } from "@/lib/utils";
import { adminTabActive, adminTabInactive, adminBackLink, adminLangActive, adminLangInactive } from "@/lib/admin-nav-styles";
import {
  fetchVerificationsFromApi,
  getMergedVerifications,
  patchVerificationStatus,
  clearPendingReviewSession,
} from "@/lib/verification-storage";
import { EMPTY_ADMIN_OVERVIEW, type AdminOverviewData } from "@/hooks/useAdminData";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search, Filter, RefreshCw, CheckCircle2, XCircle, FileText, Clock,
  AlertTriangle, Layers, Truck, Share2, Factory, HeartPulse, ShoppingBag,
  UtensilsCrossed, Building2, ShoppingCart, Pill, Briefcase, X, MapPin,
  Check, Globe, User, Mail, Phone, Database, Star, Award, Shield,
  Package, Users, TrendingUp, DollarSign, Zap, Slash,
  Eye, Navigation2, Play, ChevronRight, Activity,
} from "lucide-react";

/* ══════════════════════════════════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════════════════════════════════ */
const API = import.meta.env.VITE_API_URL ?? "/api";
const tok = () => localStorage.getItem("pos_auth_token") ?? "";

const LANG_CODES = ["ku", "ar", "en"] as const;

const SM: Record<string, { icon: typeof Share2; color: string }> = {
  distributor:  { icon: Share2,          color: "#F59E0B" },
  manufacturer: { icon: Factory,         color: "#EF4444" },
  hospital:     { icon: HeartPulse,      color: "#EC4899" },
  supermarket:  { icon: ShoppingBag,     color: "#8B5CF6" },
  retail_shop:  { icon: ShoppingCart,    color: "#A855F7" },
  restaurant:   { icon: UtensilsCrossed, color: "#F97316" },
  hotel:        { icon: Building2,       color: "#06B6D4" },
  pharmacy:     { icon: Pill,            color: "#22C55E" },
  delivery:     { icon: Truck,           color: "#10B981" },
  office:       { icon: Briefcase,       color: "#3B82F6" },
  other:        { icon: Layers,          color: "#6B7280" },
};

const STATUS_CFG: Record<string, { color: string; bg: string; bd: string; icon: typeof Clock }> = {
  pending:          { color: "#FBBF24", bg: "rgba(245,158,11,0.12)", bd: "rgba(245,158,11,0.35)",   icon: Clock },
  approved:         { color: "#34D399", bg: "rgba(16,185,129,0.12)", bd: "rgba(16,185,129,0.35)",   icon: CheckCircle2 },
  rejected:         { color: "#F87171", bg: "rgba(239,68,68,0.12)",  bd: "rgba(239,68,68,0.35)",    icon: XCircle },
  suspended:        { color: "#94A3B8", bg: "rgba(100,116,139,0.12)",bd: "rgba(100,116,139,0.35)",  icon: Slash },
  more_docs_needed: { color: "#60A5FA", bg: "rgba(59,130,246,0.12)", bd: "rgba(59,130,246,0.35)",   icon: AlertTriangle },
};

const TRUST_BADGES = [
  { key: "verified", color: "#10B981", icon: CheckCircle2 },
  { key: "premium",  color: "#3B82F6", icon: Star },
  { key: "gold",     color: "#F59E0B", icon: Award },
  { key: "trusted",  color: "#8B5CF6", icon: Shield },
];

const GOV_COLORS: Record<string, string> = {
  erbil: "#3B82F6", sulaymaniyah: "#8B5CF6", duhok: "#06B6D4",
  kirkuk: "#F59E0B", halabja: "#EC4899", baghdad: "#EF4444",
};

const DOCS_BY_GROUP: Record<string, { key: string; required: boolean }[]> = {
  enterprise: [
    { key: "businessReg", required: true },
    { key: "license", required: true },
    { key: "nationalId", required: true },
    { key: "iso", required: false },
    { key: "catalog", required: false },
  ],
  retail:   [{ key: "nationalId", required: true }],
  delivery: [{ key: "nationalId", required: true }, { key: "businessReg", required: true }],
  standard: [{ key: "nationalId", required: true }],
};

const gl = {
  card: {
    background: "rgba(255,255,255,0.04)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 4px 32px rgba(0,0,0,0.5)",
  } as React.CSSProperties,
  input: {
    background: "rgba(0,0,0,0.3)",
    border: "1px solid rgba(255,255,255,0.10)",
    color: "#FFFFFF",
    borderRadius: "0.75rem",
  } as React.CSSProperties,
};

/* ══════════════════════════════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════════════════════════════ */
interface Registration {
  id: number;
  sectorKey: string;
  sectorGroup: string;
  businessName: string;
  email?: string;
  mobile: string;
  governorate?: string;
  city?: string;
  address?: string;
  extraData?: Record<string, any>;
  status: "pending" | "approved" | "rejected" | "suspended" | "more_docs_needed";
  rejectionReason?: string;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

/* ══════════════════════════════════════════════════════════════════════
   API HELPERS
══════════════════════════════════════════════════════════════════════ */
const fetchRegs = async (): Promise<Registration[]> => {
  try {
    const apiRows = await fetchVerificationsFromApi(tok());
    return getMergedVerifications(apiRows) as Registration[];
  } catch {
    return getMergedVerifications([]) as Registration[];
  }
};

const fetchOverview = async (): Promise<AdminOverviewData> => {
  try {
    const res = await fetch(`${API}/admin/overview`, { headers: { Authorization: `Bearer ${tok()}` } });
    if (!res.ok) return EMPTY_ADMIN_OVERVIEW;
    const json = (await res.json()) as Partial<AdminOverviewData>;
    return {
      ...EMPTY_ADMIN_OVERVIEW,
      ...json,
      totals: { ...EMPTY_ADMIN_OVERVIEW.totals, ...(json.totals ?? {}) },
      liveDrivers: json.liveDrivers ?? [],
      rfqs: json.rfqs ?? [],
    };
  } catch {
    return EMPTY_ADMIN_OVERVIEW;
  }
};

/* ══════════════════════════════════════════════════════════════════════
   UTILS
══════════════════════════════════════════════════════════════════════ */
function parseCoords(address?: string): [number, number] {
  if (!address) return [36.1911, 44.0092];
  const m = address.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
  return m ? [parseFloat(m[1]), parseFloat(m[2])] : [36.1911, 44.0092];
}
function fmtIQD(n: number) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B IQD`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M IQD`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K IQD`;
  return `${n.toFixed(0)} IQD`;
}

/* ══════════════════════════════════════════════════════════════════════
   ATOMS
══════════════════════════════════════════════════════════════════════ */
function StatusBadge({ status }: { status: string }) {
  const { t } = useLocaleDir("admin");
  const c = STATUS_CFG[status] ?? STATUS_CFG.pending;
  const I = c.icon;
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold whitespace-nowrap"
      style={{ background: c.bg, border: `1px solid ${c.bd}`, color: c.color }}>
      <I className="w-3 h-3" />{t(`verification.status.${status}`, { defaultValue: status })}
    </span>
  );
}

function SectorChip({ sectorKey }: { sectorKey: string }) {
  const { t } = useLocaleDir("admin");
  const m = SM[sectorKey] ?? SM.other;
  const I = m.icon;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold"
      style={{ background: `${m.color}1A`, border: `1px solid ${m.color}40`, color: m.color }}>
      <I className="w-3 h-3" />{t(`console.sectors.${sectorKey}`, { defaultValue: sectorKey })}
    </span>
  );
}

function GovChip({ gov }: { gov?: string }) {
  const { t } = useLocaleDir("admin");
  if (!gov) return null;
  const key = gov.toLowerCase();
  const color = GOV_COLORS[key] ?? "#64748B";
  const label = t(`console.governorates.${key}`, { defaultValue: gov });
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold"
      style={{ background: `${color}15`, border: `1px solid ${color}35`, color }}>
      <MapPin className="w-2.5 h-2.5" />{label}
    </span>
  );
}

function TrustPill({ badge }: { badge: string }) {
  const { t } = useLocaleDir("admin");
  const b = TRUST_BADGES.find(x => x.key === badge);
  if (!b) return null;
  const I = b.icon;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black"
      style={{ background: `${b.color}22`, border: `1px solid ${b.color}55`, color: b.color }}>
      <I className="w-3 h-3" />{t(`console.trustBadges.${badge}`, { defaultValue: badge })}
    </span>
  );
}

function DocDots({ sectorGroup }: { sectorGroup: string }) {
  const docs = DOCS_BY_GROUP[sectorGroup] ?? DOCS_BY_GROUP.standard;
  const uploaded = docs.filter(d => d.required).length;
  const pct = Math.round((uploaded / docs.length) * 100);
  const color = pct === 100 ? "#10B981" : pct >= 60 ? "#F59E0B" : "#EF4444";
  return (
    <div className="flex items-center gap-1">
      {docs.map((d, i) => (
        <div key={i} className="w-2.5 h-2.5 rounded-full transition-all"
          style={{ background: i < uploaded ? color : "rgba(255,255,255,0.10)" }} />
      ))}
      <span className="text-[10px] font-bold ms-1" style={{ color }}>{pct}%</span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   METRIC CARD
══════════════════════════════════════════════════════════════════════ */
function MetricCard({ title, value, sub, icon: I, color, trend, delay = 0 }: {
  title: string; value: string; sub?: string; icon: any; color: string;
  trend?: "up" | "down"; delay?: number;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.4 }}
      className="flex-1 min-w-[200px] rounded-2xl p-5 relative overflow-hidden cursor-default"
      style={{ ...gl.card, boxShadow: `0 0 40px ${color}08, 0 4px 24px rgba(0,0,0,0.5)` }}>
      <div className="absolute -top-10 -end-10 w-32 h-32 rounded-full blur-3xl opacity-[0.15]"
        style={{ background: color }} />
      <div className="flex items-start justify-between mb-4 relative z-10">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
          style={{ background: `${color}20`, border: `1px solid ${color}40` }}>
          <I className="w-5 h-5" style={{ color }} />
        </div>
        {trend && (
          <div className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg"
            style={trend === "up"
              ? { background: "rgba(16,185,129,0.15)", color: "#34D399" }
              : { background: "rgba(239,68,68,0.15)", color: "#F87171" }}>
            {trend === "up" ? <TrendingUp className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
            {trend === "up" ? "+12.4%" : "-2.1%"}
          </div>
        )}
      </div>
      <p className="text-2xl font-black text-white mb-0.5 relative z-10">{value}</p>
      {sub && <p className="text-[11px] relative z-10 mb-1" style={{ color: "#64748B" }}>{sub}</p>}
      <p className="text-[11px] font-semibold relative z-10" style={{ color: "#475569" }}>{title}</p>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   LEAFLET MAP (embedded via srcDoc — zero package deps)
══════════════════════════════════════════════════════════════════════ */
function LeafletMap({ lat, lng, label }: { lat: number; lng: number; label?: string }) {
  const { t } = useLocaleDir("admin");
  const safeLabel = (label ?? t("console.businessLocation")).replace(/['"<>]/g, " ");
  const html = `<!DOCTYPE html><html><head>
  <meta charset="utf-8"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>*{margin:0;padding:0}html,body{height:100%;background:#050d1a}#map{height:100%}</style>
  </head><body><div id="map"></div><script>
  const m=L.map('map',{zoomControl:true}).setView([${lat},${lng}],15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OSM',maxZoom:19}).addTo(m);
  const icon=L.divIcon({className:'',
    html:'<div style="width:38px;height:38px;background:#3B82F6;border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 24px rgba(59,130,246,0.8);font-size:18px">📍</div>',
    iconSize:[38,38],iconAnchor:[19,19]});
  L.marker([${lat},${lng}],{icon}).addTo(m).bindPopup('<b>${safeLabel}</b>').openPopup();
  </script></body></html>`;
  return (
    <iframe srcDoc={html} width="100%" style={{ height: 260, border: 0, borderRadius: "0.875rem", display: "block" }}
      title="GPS" sandbox="allow-scripts" />
  );
}

/* ══════════════════════════════════════════════════════════════════════
   SECTOR FIELDS GRID
══════════════════════════════════════════════════════════════════════ */
const SKIP_KEYS = new Set(["password", "confirmPassword", "trustBadge"]);

function SectorFields({ extraData }: { extraData?: Record<string, unknown> }) {
  const { t } = useLocaleDir("admin");
  if (!extraData) return <p className="text-xs text-white/20 py-4 text-center">{t("console.noExtraData")}</p>;
  const entries = Object.entries(extraData).filter(([k, v]) => !SKIP_KEYS.has(k) && v !== null && v !== undefined && v !== "");
  if (!entries.length) return <p className="text-xs text-white/20 py-4 text-center">{t("console.noExtraData")}</p>;
  return (
    <div className="grid grid-cols-2 gap-2">
      {entries.map(([k, v]) => (
        <div key={k} className="p-3 rounded-xl"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: "#3B82F6" }}>
            {t(`console.fields.${k}`, { defaultValue: k })}
          </p>
          <p className="text-xs font-semibold text-white break-all">
            {Array.isArray(v) ? v.join(" · ") : String(v)}
          </p>
        </div>
      ))}
    </div>
  );
}

function DocMatrix({ sectorGroup }: { sectorGroup: string }) {
  const { t } = useLocaleDir("admin");
  const docs = DOCS_BY_GROUP[sectorGroup] ?? DOCS_BY_GROUP.standard;
  return (
    <div className="space-y-2">
      {docs.map(({ key, required }, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl"
          style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${required ? "rgba(16,185,129,0.25)" : "rgba(255,255,255,0.06)"}` }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: required ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.05)" }}>
            <FileText className="w-4 h-4" style={{ color: required ? "#34D399" : "#334155" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white">{t(`console.docTypes.${key}`)}</p>
            <p className="text-[10px]" style={{ color: "#475569" }}>{required ? t("console.required") : t("console.optional")}</p>
          </div>
          <span className={`text-[10px] font-bold flex items-center gap-1 shrink-0 ${required ? "text-emerald-400" : "text-slate-600"}`}>
            {required ? <><Check className="w-3 h-3" />{t("console.uploaded")}</> : t("console.notUploadedShort")}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   REVIEW MODAL
══════════════════════════════════════════════════════════════════════ */
function ReviewModal({ reg, onClose, onUpdate }: {
  reg: Registration;
  onClose: () => void;
  onUpdate: (id: number, status: string, reason?: string, badge?: string) => Promise<void>;
}) {
  const { t, rtl, dir } = useLocaleDir("admin");
  const [tab, setTab] = useState<"creds" | "docs" | "map">("creds");
  const [action, setAction] = useState("");
  const [badge, setBadge] = useState("verified");
  const [reason, setReason] = useState(reg.rejectionReason ?? "");
  const [saving, setSaving] = useState(false);
  const sm = SM[reg.sectorKey] ?? SM.other;
  const SIcon = sm.icon;
  const [lat, lng] = parseCoords(reg.address);
  const trustBadge = reg.extraData?.trustBadge as string | undefined;

  const confirm = async () => {
    if (!action) return;
    setSaving(true);
    try {
      await onUpdate(reg.id, action, action === "rejected" ? reason : undefined, action === "approved" ? badge : undefined);
    } finally {
      setSaving(false);
      setAction("");
    }
  };

  const MODAL_TABS = [
    { key: "creds" as const, labelKey: "console.modalTabs.creds", icon: User },
    { key: "docs"  as const, labelKey: "console.modalTabs.docs", icon: FileText },
    { key: "map"   as const, labelKey: "console.modalTabs.map", icon: MapPin },
  ];
  const ACTIONS = [
    { key: "approved",         icon: CheckCircle2, color: "#10B981", labelKey: "console.actions.approved" },
    { key: "rejected",         icon: XCircle,      color: "#EF4444", labelKey: "console.actions.rejected" },
    { key: "more_docs_needed", icon: FileText,     color: "#3B82F6", labelKey: "console.actions.more_docs_needed" },
    { key: "suspended",        icon: Slash,        color: "#64748B", labelKey: "console.actions.suspended" },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-end"
      style={{ background: "rgba(2,8,20,0.75)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div
        initial={{ x: rtl ? "-100%" : "100%" }} animate={{ x: 0 }} exit={{ x: rtl ? "-100%" : "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        dir={dir}
        className={`h-full w-full max-w-[520px] flex flex-col border-white/10 ${rtl ? "border-r rounded-e-3xl" : "border-l rounded-s-3xl"}`}
        style={{ background: "rgba(5,13,26,0.97)", borderWidth: rtl ? "0 1px 0 0" : "0 0 0 1px" }}>

        {/* ── Header ── */}
        <div className="flex items-center gap-4 px-6 py-5 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="w-13 h-13 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${sm.color}20`, border: `2px solid ${sm.color}40`, width: 52, height: 52 }}>
            <SIcon className="w-6 h-6" style={{ color: sm.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-black text-white truncate leading-tight">{reg.businessName}</h2>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <SectorChip sectorKey={reg.sectorKey} />
              <StatusBadge status={reg.status} />
              {trustBadge && <TrustPill badge={trustBadge} />}
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors flex-shrink-0"
            style={{ color: "#475569" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Quick strip ── */}
        <div className="grid grid-cols-3 flex-shrink-0"
          style={{ background: "rgba(0,0,0,0.25)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          {[
            { icon: Mail,  v: reg.email   || "—" },
            { icon: Phone, v: reg.mobile  || "—" },
            { icon: MapPin,v: [reg.governorate, reg.city].filter(Boolean).join(" · ") || "—" },
          ].map(({ icon: I, v }, i) => (
            <div key={i} className="flex items-center gap-1.5 px-3 py-2.5"
              style={{ borderRight: i < 2 ? "1px solid rgba(255,255,255,0.05)" : undefined }}>
              <I className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#3B82F6" }} />
              <span className="text-[11px] text-white/50 truncate">{v}</span>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 px-4 py-3 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          {MODAL_TABS.map(({ key, labelKey, icon: TI }) => (
            <button key={key} onClick={() => setTab(key)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-semibold transition-all"
              style={tab === key
                ? { background: "rgba(59,130,246,0.2)", color: "#FFFFFF", border: "1px solid rgba(99,179,255,0.45)" }
                : { background: "transparent", color: "#475569", border: "1px solid transparent" }}>
              <TI className="w-3.5 h-3.5" />{t(labelKey)}
            </button>
          ))}
        </div>

        {/* ── Tab body ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <AnimatePresence mode="wait">
            {tab === "creds" && (
              <motion.div key="cr" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#3B82F6" }}>
                  {t("console.sectorInfo")}
                </p>
                <SectorFields extraData={reg.extraData} />
                {reg.reviewedAt && (
                  <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="text-[11px]" style={{ color: "#475569" }}>
                      {t("console.reviewedAt", {
                        date: new Date(reg.reviewedAt).toLocaleDateString(),
                        by: reg.reviewedBy ?? "—",
                      })}
                    </p>
                    {reg.rejectionReason && (
                      <p className="text-[11px] mt-1 text-red-400">{reg.rejectionReason}</p>
                    )}
                  </div>
                )}
              </motion.div>
            )}
            {tab === "docs" && (
              <motion.div key="dc" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: "#3B82F6" }}>{t("verification.documents")}</p>
                <DocMatrix sectorGroup={reg.sectorGroup} />
                <div className="p-3 rounded-xl flex items-start gap-2.5"
                  style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#FBBF24" }} />
                  <p className="text-[11px]" style={{ color: "#FDE68A" }}>{t("console.docsTeamNote")}</p>
                </div>
              </motion.div>
            )}
            {tab === "map" && (
              <motion.div key="mp" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: "#3B82F6" }}>{t("verification.storeLocation")}</p>
                <LeafletMap lat={lat} lng={lng} label={reg.businessName} />
                {reg.address && (
                  <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="text-[11px] text-white/40 break-all">{reg.address}</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Action panel ── */}
        <div className="flex-shrink-0 px-5 pt-4 pb-3 space-y-3"
          style={{ borderTop: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.3)" }}>
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#475569" }}>
            {t("console.adminActions")}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {ACTIONS.map(({ key, icon: AI, color, labelKey }) => (
              <button key={key} onClick={() => setAction(action === key ? "" : key)}
                className="flex items-center gap-2 p-2.5 rounded-xl text-[11px] font-semibold transition-all text-start"
                style={action === key
                  ? { background: `${color}22`, border: `1.5px solid ${color}65`, color: "#FFFFFF", boxShadow: `0 0 14px ${color}20` }
                  : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#64748B" }}>
                <AI className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />{t(labelKey)}
              </button>
            ))}
          </div>

          <AnimatePresence>
            {action === "approved" && (
              <motion.div key="bdg" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2 pt-1" style={{ color: "#F59E0B" }}>
                  {t("console.selectTrustBadge")}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {TRUST_BADGES.map(b => {
                    const BI = b.icon;
                    return (
                      <button key={b.key} onClick={() => setBadge(b.key)}
                        className="flex items-center gap-2 p-2.5 rounded-xl text-xs font-bold transition-all"
                        style={badge === b.key
                          ? { background: `${b.color}25`, border: `2px solid ${b.color}70`, color: b.color, boxShadow: `0 0 18px ${b.color}30` }
                          : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", color: "#475569" }}>
                        <BI className="w-3.5 h-3.5" style={{ color: badge === b.key ? b.color : "#475569" }} />
                        {t(`console.trustBadges.${b.key}`)}
                        {badge === b.key && <Check className="w-3 h-3 ms-auto" />}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
            {action === "rejected" && (
              <motion.div key="rsn" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
                  placeholder={t("console.rejectPlaceholder")}
                  className="w-full px-3 py-2.5 rounded-xl text-xs text-white placeholder-[#334155] resize-none outline-none mt-1"
                  style={{ ...gl.input }} />
              </motion.div>
            )}
          </AnimatePresence>

          {action && (
            <motion.button initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              onClick={confirm} disabled={saving}
              className="w-full py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all"
              style={{
                background: action === "approved" ? "linear-gradient(135deg,#059669,#10B981)"
                  : action === "rejected" ? "linear-gradient(135deg,#DC2626,#EF4444)"
                  : action === "more_docs_needed" ? "linear-gradient(135deg,#1D4ED8,#3B82F6)"
                  : "linear-gradient(135deg,#1E293B,#334155)",
                color: "#FFFFFF", boxShadow: "0 6px 24px rgba(0,0,0,0.6)",
              }}>
              {saving
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{t("console.executing")}</>
                : <><Check className="w-4 h-4" />{t("console.confirmAction")}</>}
            </motion.button>
          )}
        </div>

        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.35)" }}>
          <p className="text-[10px]" style={{ color: "#1E293B" }}>
            {t("verification.idLabel")} #{reg.id} · {new Date(reg.submittedAt).toLocaleDateString()}
          </p>
          <button onClick={onClose} className="text-[11px] font-semibold px-3 py-1.5 rounded-xl transition-colors hover:bg-white/8"
            style={{ color: "#334155" }}>{t("console.close")}</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   TAB 1: VERIFICATION QUEUE
══════════════════════════════════════════════════════════════════════ */
function VerifQueue({ regs, loading, onReview }: {
  regs: Registration[]; loading: boolean;
  onReview: (r: Registration) => void;
}) {
  const { t } = useLocaleDir("admin");
  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState("all");
  const [sectorF, setSectorF] = useState("all");

  const filtered = useMemo(() => regs.filter(r => {
    const q = search.toLowerCase();
    return (
      (!q || r.businessName.toLowerCase().includes(q) || r.mobile.includes(q)) &&
      (statusF === "all" || r.status === statusF) &&
      (sectorF === "all" || r.sectorKey === sectorF)
    );
  }), [regs, search, statusF, sectorF]);

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex gap-3 flex-wrap p-4 rounded-2xl" style={gl.card}>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#475569" }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t("console.queue.searchPlaceholder")}
            className="w-full ps-9 pe-3 py-2.5 rounded-xl text-sm text-white placeholder-[#334155] outline-none"
            style={{ ...gl.input }} />
        </div>
        <div className="relative">
          <Filter className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "#475569" }} />
          <select value={statusF} onChange={e => setStatusF(e.target.value)}
            className="appearance-none ps-9 pe-4 py-2.5 rounded-xl text-sm outline-none cursor-pointer linqi-shell-select text-slate-900 dark:text-white"
            style={{ ...gl.input }}>
            {["all","pending","approved","rejected","suspended","more_docs_needed"].map(s => (
              <option key={s} value={s}>
                {s === "all" ? t("console.queue.allStatuses") : t(`verification.status.${s}`, { defaultValue: s })}
              </option>
            ))}
          </select>
        </div>
        <div className="relative">
          <Layers className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "#475569" }} />
          <select value={sectorF} onChange={e => setSectorF(e.target.value)}
            className="appearance-none ps-9 pe-4 py-2.5 rounded-xl text-sm outline-none cursor-pointer linqi-shell-select text-slate-900 dark:text-white"
            style={{ ...gl.input }}>
            <option value="all">{t("console.queue.allSectors")}</option>
            {Object.keys(SM).map(k => (
              <option key={k} value={k}>{t(`console.sectors.${k}`)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={gl.card}>
        <div className="grid px-5 py-3 text-[10px] font-black uppercase tracking-widest"
          style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 120px", borderBottom: "1px solid rgba(255,255,255,0.07)", color: "#334155" }}>
          <span>{t("console.queue.colBusiness")}</span><span>{t("console.queue.colSector")}</span><span>{t("console.queue.colGovernorate")}</span>
          <span>{t("console.queue.colDocs")}</span><span>{t("console.queue.colStatus")}</span><span />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Database className="w-10 h-10" style={{ color: "rgba(255,255,255,0.08)" }} />
            <p className="text-sm" style={{ color: "#334155" }}>{t("console.queue.noRequests")}</p>
          </div>
        ) : (
          <>
            {filtered.map((r, i) => {
              const m = SM[r.sectorKey] ?? SM.other;
              const SI = m.icon;
              return (
                <motion.div key={r.id}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.025 }}
                  className="grid px-5 py-4 items-center transition-colors"
                  style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 120px", borderBottom: i < filtered.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(59,130,246,0.04)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${m.color}15`, border: `1px solid ${m.color}30` }}>
                      <SI className="w-4 h-4" style={{ color: m.color }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{r.businessName}</p>
                      <p className="text-[10px] truncate" style={{ color: "#334155" }}>{r.email || r.mobile}</p>
                    </div>
                  </div>
                  <SectorChip sectorKey={r.sectorKey} />
                  <GovChip gov={r.governorate} />
                  <DocDots sectorGroup={r.sectorGroup} />
                  <StatusBadge status={r.status} />
                  <button onClick={() => onReview(r)}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                    style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(99,179,255,0.35)", color: "#93C5FD" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(59,130,246,0.28)"; e.currentTarget.style.color = "#FFFFFF"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(59,130,246,0.15)"; e.currentTarget.style.color = "#93C5FD"; }}>
                    <Eye className="w-3.5 h-3.5" />{t("console.reviewBasic")}
                  </button>
                </motion.div>
              );
            })}
            <div className="px-5 py-3 flex justify-between"
              style={{ borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.25)" }}>
              <p className="text-[10px]" style={{ color: "#1E293B" }}>{t("console.resultsFooter", { filtered: filtered.length, total: regs.length })}</p>
              <p className="text-[10px]" style={{ color: "#0F172A" }}>{t("console.queueFooter")}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   TAB 2: SUPPLIERS LEDGER
══════════════════════════════════════════════════════════════════════ */
function SuppliersLedger({ data }: { data: AdminOverviewData }) {
  const { t } = useLocaleDir("admin");
  const products = data.products ?? [];
  const cats = useMemo(() => [...new Set(products.map(p => p.category ?? "General"))], [products]);

  const stats = [
    { labelKey: "console.suppliers.totalProducts", value: products.length, color: "#3B82F6", icon: Package },
    { labelKey: "console.suppliers.categories", value: cats.length, color: "#8B5CF6", icon: Layers },
    { labelKey: "console.suppliers.lowStock", value: products.filter(p => p.stock < 5).length, color: "#EF4444", icon: AlertTriangle },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {stats.map(({ labelKey, value, color, icon: I }) => (
          <div key={labelKey} className="rounded-2xl p-4 flex items-center gap-3 relative overflow-hidden" style={gl.card}>
            <div className="absolute -top-6 -end-6 w-16 h-16 rounded-full blur-2xl opacity-15" style={{ background: color }} />
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}20` }}>
              <I className="w-5 h-5" style={{ color }} />
            </div>
            <div>
              <p className="text-2xl font-black text-white">{value}</p>
              <p className="text-[10px]" style={{ color: "#475569" }}>{t(labelKey)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl overflow-hidden" style={gl.card}>
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div>
            <h3 className="text-sm font-black text-white">{t("console.suppliers.ledgerTitle")}</h3>
            <p className="text-[11px]" style={{ color: "#334155" }}>{t("console.suppliers.ledgerSub")}</p>
          </div>
          <span className="text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1"
            style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(99,179,255,0.3)", color: "#60A5FA" }}>
            <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full bg-blue-400" />{t("console.live")}
          </span>
        </div>
        <div className="grid px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest"
          style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr", borderBottom: "1px solid rgba(255,255,255,0.05)", color: "#1E293B" }}>
          <span>{t("console.suppliers.colProduct")}</span><span>{t("console.suppliers.colCategory")}</span><span>{t("console.suppliers.colStock")}</span><span>{t("console.suppliers.colPrice")}</span>
        </div>
        {products.length === 0 ? (
          <div className="py-14 text-center">
            <Package className="w-10 h-10 mx-auto mb-2" style={{ color: "rgba(255,255,255,0.08)" }} />
            <p className="text-sm" style={{ color: "#334155" }}>{t("console.suppliers.noProducts")}</p>
          </div>
        ) : products.slice(0, 14).map((p, i) => (
          <div key={p.id}
            className="grid px-5 py-3.5 items-center transition-colors cursor-default"
            style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr", borderBottom: i < Math.min(products.length, 14) - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(59,130,246,0.04)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <div>
              <p className="text-sm font-semibold text-white truncate">{p.name}</p>
            </div>
            <span className="text-xs" style={{ color: "#475569" }}>{p.category ?? "General"}</span>
            <span className={`text-xs font-bold ${p.stock < 5 ? "text-red-400" : p.stock < 20 ? "text-amber-400" : "text-emerald-400"}`}>
              {p.stock} {t("console.suppliers.unitPcs")}
            </span>
            <span className="text-xs font-bold" style={{ color: "#60A5FA" }}>
              {Number(p.price).toLocaleString()} IQD
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   TAB 3: BUYERS HUB
══════════════════════════════════════════════════════════════════════ */
function BuyersHub({ data }: { data: AdminOverviewData }) {
  const { t } = useLocaleDir("admin");
  const customers = data.customers ?? [];
  const rfqs = data.rfqs ?? [];
  const openRfqs = rfqs.filter((r) => r.status === "open" || r.status === "pending").length;

  const stats = [
    { labelKey: "console.buyers.totalBuyers", value: customers.length, color: "#10B981", icon: Users },
    { labelKey: "console.buyers.activeRfqs", value: openRfqs, color: "#F59E0B", icon: FileText },
    { labelKey: "console.buyers.avgLeadTime", value: rfqs.length > 0 ? `${rfqs.length}` : "0", color: "#3B82F6", icon: Truck },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {stats.map(({ labelKey, value, color, icon: I }) => (
          <div key={labelKey} className="rounded-2xl p-4 flex items-center gap-3 relative overflow-hidden" style={gl.card}>
            <div className="absolute -top-6 -end-6 w-16 h-16 rounded-full blur-2xl opacity-15" style={{ background: color }} />
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}20` }}>
              <I className="w-5 h-5" style={{ color }} />
            </div>
            <div>
              <p className="text-2xl font-black text-white">{value}</p>
              <p className="text-[10px]" style={{ color: "#475569" }}>{t(labelKey)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl overflow-hidden" style={gl.card}>
        <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <h3 className="text-sm font-black text-white">{t("console.buyers.rfqTitle")}</h3>
          <p className="text-[11px] mt-0.5" style={{ color: "#334155" }}>{t("console.buyers.rfqSub")}</p>
        </div>
        {rfqs.length === 0 ? (
          <div className="py-14 text-center">
            <FileText className="w-10 h-10 mx-auto mb-2" style={{ color: "rgba(255,255,255,0.08)" }} />
            <p className="text-sm" style={{ color: "#334155" }}>{t("common.noData", { defaultValue: "No data yet" })}</p>
          </div>
        ) : (
          rfqs.map((rfq, i) => {
            const sm = SM[rfq.sectorKey] ?? SM.other;
            const SI = sm.icon;
            const isOpen = rfq.status === "open" || rfq.status === "pending";
            return (
              <div key={rfq.id} className="flex items-center gap-4 px-5 py-4 transition-colors cursor-default"
                style={{ borderBottom: i < rfqs.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${sm.color}15`, border: `1px solid ${sm.color}30` }}>
                  <SI className="w-4 h-4" style={{ color: sm.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">{rfq.product}</p>
                  <p className="text-xs" style={{ color: "#475569" }}>{rfq.qty} {rfq.unit}</p>
                </div>
                <div className="text-center flex-shrink-0">
                  <p className="text-sm font-bold text-white">{rfq.suppliers?.length ?? 0}</p>
                  <p className="text-[10px]" style={{ color: "#334155" }}>{t("console.suppliers", { defaultValue: "Suppliers" })}</p>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${isOpen ? "text-amber-400 bg-amber-400/10 border border-amber-400/20" : "text-emerald-400 bg-emerald-400/10 border border-emerald-400/20"}`}>
                  {isOpen ? t("console.buyers.rfqOpen") : t("console.buyers.rfqAwarded")}
                </span>
              </div>
            );
          })
        )}
      </div>

      {customers.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={gl.card}>
          <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <h3 className="text-sm font-black text-white">{t("console.buyers.ledgerTitle")}</h3>
          </div>
          {customers.slice(0, 10).map((c, i) => (
            <div key={c.id} className="flex items-center gap-3 px-5 py-3.5 transition-colors"
              style={{ borderBottom: i < Math.min(customers.length, 10) - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                style={{ background: "linear-gradient(135deg,#1D4ED8,#7C3AED)" }}>
                {c.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{c.name}</p>
                <p className="text-[10px]" style={{ color: "#334155" }}>{c.phone ?? "—"}</p>
              </div>
              {c.totalPurchases > 0 && (
                <p className="text-xs font-bold" style={{ color: "#F59E0B" }}>{c.totalPurchases.toLocaleString()} IQD</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   TAB 4: LOGISTICS TRACKER
══════════════════════════════════════════════════════════════════════ */
function LogisticsTracker({
  deliveryRegs,
  liveDrivers,
}: {
  deliveryRegs: Registration[];
  liveDrivers: AdminOverviewData["liveDrivers"];
}) {
  const { t } = useLocaleDir("admin");

  const totalVehicles = deliveryRegs.reduce((sum, r) => {
    const n = Number(r.extraData?.numTrucks ?? 0);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
  const activeDrivers = liveDrivers.filter((d) => d.online).length;
  const coverageGovs = new Set(
    deliveryRegs.map((r) => r.governorate).filter(Boolean),
  ).size;

  const truckTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of deliveryRegs) {
      const sizes = r.extraData?.truckSizes;
      if (Array.isArray(sizes)) {
        for (const size of sizes) {
          const key = String(size);
          counts[key] = (counts[key] ?? 0) + 1;
        }
      }
    }
    return Object.entries(counts).map(([key, count]) => ({ key, count }));
  }, [deliveryRegs]);

  const stats = [
    { labelKey: "console.logistics.totalVehicles", value: totalVehicles, color: "#3B82F6", icon: Truck },
    { labelKey: "console.logistics.activeRoutes", value: activeDrivers, color: "#10B981", icon: Navigation2 },
    { labelKey: "console.logistics.deliveryCompanies", value: deliveryRegs.length, color: "#8B5CF6", icon: Share2 },
    { labelKey: "console.logistics.coverageGovs", value: coverageGovs, color: "#F59E0B", icon: Globe },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        {stats.map(({ labelKey, value, color, icon: I }) => (
          <div key={labelKey} className="rounded-2xl p-4 flex items-center gap-2.5 relative overflow-hidden" style={gl.card}>
            <div className="absolute -top-6 -end-6 w-16 h-16 rounded-full blur-2xl opacity-15" style={{ background: color }} />
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}20` }}>
              <I className="w-4 h-4" style={{ color }} />
            </div>
            <div>
              <p className="text-xl font-black text-white">{value}</p>
              <p className="text-[10px]" style={{ color: "#475569" }}>{t(labelKey)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl p-5" style={gl.card}>
          <h3 className="text-sm font-black text-white mb-1">{t("console.logistics.truckTypesTitle")}</h3>
          <p className="text-[11px] mb-4" style={{ color: "#334155" }}>{t("console.logistics.truckTypesSub")}</p>
          {truckTypeCounts.length === 0 ? (
            <p className="text-sm py-8 text-center" style={{ color: "#334155" }}>{t("common.noData", { defaultValue: "No data yet" })}</p>
          ) : (
            <div className="space-y-4">
              {truckTypeCounts.map((tr) => (
                <div key={tr.key} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-white">{tr.key}</span>
                    <span className="font-semibold" style={{ color: "#3B82F6" }}>{tr.count} {t("console.vehicles")}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl p-5" style={gl.card}>
          <h3 className="text-sm font-black text-white mb-1">{t("console.logistics.routesTitle")}</h3>
          <p className="text-[11px] mb-4" style={{ color: "#334155" }}>{t("console.logistics.routesSub")}</p>
          {liveDrivers.length === 0 ? (
            <p className="text-sm py-8 text-center" style={{ color: "#334155" }}>{t("common.noData", { defaultValue: "No data yet" })}</p>
          ) : (
            <div className="space-y-2.5">
              {liveDrivers.slice(0, 8).map((d) => (
                <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl transition-colors"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <motion.div
                    animate={d.online ? { opacity: [1, 0.35, 1], scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: d.online ? "#10B981" : "#64748B" }} />
                  <p className="flex-1 text-xs font-semibold text-white truncate">{d.name}</p>
                  <span className="text-[10px] font-bold" style={{ color: "#475569" }}>{d.city}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {deliveryRegs.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={gl.card}>
          <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <h3 className="text-sm font-black text-white">{t("console.logistics.registeredTitle")}</h3>
            <p className="text-[11px] mt-0.5" style={{ color: "#334155" }}>{t("console.logistics.registeredSub")}</p>
          </div>
          {deliveryRegs.map((r, i) => (
            <div key={r.id} className="flex items-center gap-4 px-5 py-4 transition-colors"
              style={{ borderBottom: i < deliveryRegs.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(16,185,129,0.04)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)" }}>
                <Truck className="w-4 h-4" style={{ color: "#10B981" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">{r.businessName}</p>
                <p className="text-[10px]" style={{ color: "#334155" }}>
                  {r.extraData?.numTrucks && `${r.extraData.numTrucks} ${t("console.vehicles")}`}
                  {r.extraData?.truckSizes && Array.isArray(r.extraData.truckSizes) && ` · ${r.extraData.truckSizes.join(", ")}`}
                </p>
              </div>
              <GovChip gov={r.governorate} />
              <StatusBadge status={r.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MAIN — LinQi Central Admin Console
══════════════════════════════════════════════════════════════════════ */
export default function AdminVerification() {
  const queryClient = useQueryClient();
  const { t, lang, rtl, dir, i18n: i18nInst } = useLocaleDir("admin");
  const [tab, setTab] = useState<"queue" | "suppliers" | "buyers" | "logistics">("queue");
  const [selected, setSelected] = useState<Registration | null>(null);

  const { data: regs = [], isLoading: regsLoading, refetch } = useQuery({
    queryKey: ["admin-regs"],
    queryFn: fetchRegs,
    refetchInterval: 15000,
  });

  const { data: overview = EMPTY_ADMIN_OVERVIEW } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: fetchOverview,
    refetchInterval: 60000,
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, status, reason, badge }: { id: number; status: string; reason?: string; badge?: string }) => {
      const updated = await patchVerificationStatus(
        id,
        status as Registration["status"],
        reason,
        badge,
        tok(),
      );
      if (!updated) throw new Error("Failed");
      return updated as Registration;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-regs"] }),
  });

  const handleUpdate = useCallback(async (id: number, status: string, reason?: string, badge?: string) => {
    const updated = await updateMut.mutateAsync({ id, status, reason, badge });
    setSelected(prev => prev?.id === id ? { ...prev, ...updated } : prev);
  }, [updateMut]);

  const switchLang = (code: string) => {
    i18nInst.changeLanguage(code);
    localStorage.setItem("linqi_lang", code);
    document.documentElement.dir = code === "ku" || code === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = code;
  };

  /* Derived metrics */
  const pending      = regs.filter(r => r.status === "pending").length;
  const approved     = regs.filter(r => r.status === "approved").length;
  const activeSects  = new Set(regs.map(r => r.sectorKey)).size;
  const deliveryRegs = useMemo(() => regs.filter(r => r.sectorKey === "delivery"), [regs]);
  const totalRev     = overview.totals.salesVolume ?? 0;
  const commission   = overview.totals.commission ?? 0;
  const openRfqs     = overview.rfqs.filter((r) => r.status === "open" || r.status === "pending").length;

  const TABS = [
    { key: "queue"     as const, labelKey: "console.tabs.queue", icon: FileText,  badge: pending },
    { key: "suppliers" as const, labelKey: "console.tabs.suppliers", icon: Package, badge: overview.products.length },
    { key: "buyers"    as const, labelKey: "console.tabs.buyers", icon: Users, badge: openRfqs },
    { key: "logistics" as const, labelKey: "console.tabs.logistics", icon: Truck, badge: overview.liveDrivers.length },
  ];

  return (
    <div className="relative text-white" dir={dir}>
      {/* Page toolbar — actions only (branding lives in AdminLayout) */}
      <div className="relative z-10 max-w-screen-2xl mx-auto px-4 sm:px-6 pt-4 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            clearPendingReviewSession();
            window.location.href = "/register";
          }}
          className={adminBackLink}
        >
          <ChevronRight className={cn("w-3.5 h-3.5 shrink-0", rtl ? "" : "rotate-180")} />
          <span className="hidden sm:inline">{t("console.backToRegister")}</span>
        </button>

        <div className="flex items-center gap-0.5 p-1 rounded-xl bg-white/5 border border-white/10">
          {LANG_CODES.map(code => (
            <button
              key={code}
              type="button"
              onClick={() => switchLang(code)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border",
                lang === code ? adminLangActive : adminLangInactive,
              )}
            >
              {t(`lang.${code}`)}
            </button>
          ))}
        </div>

        <button type="button" onClick={() => refetch()}
          className="w-8 h-8 rounded-xl border flex items-center justify-center flex-shrink-0"
          style={{ border: "1px solid rgba(255,255,255,0.08)", color: "#94A3B8" }}>
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* ── MAIN CONTENT ───────────────────────────────────────────── */}
      <main className="relative z-10 max-w-screen-2xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6">

        {/* 4 Metric cards */}
        <div className="flex gap-4 flex-wrap">
          <MetricCard
            title={t("console.metrics.nationalSales")}
            value={totalRev > 0 ? fmtIQD(totalRev) : "—"}
            sub={t("console.metrics.nationalSalesSub")}
            icon={DollarSign} color="#3B82F6" trend="up" delay={0} />
          <MetricCard
            title={t("console.metrics.platformRevenue")}
            value={commission > 0 ? fmtIQD(commission) : "—"}
            sub={t("console.metrics.platformRevenueSub")}
            icon={TrendingUp} color="#10B981" trend="up" delay={0.07} />
          <MetricCard
            title={t("console.metrics.activeSectors")}
            value={activeSects > 0 ? t("console.metrics.activeSectorsValue", { count: activeSects }) : "0"}
            sub={t("console.metrics.activeSectorsSub")}
            icon={Layers} color="#8B5CF6" delay={0.14} />
          <MetricCard
            title={t("console.metrics.verifiedPending")}
            value={t("console.metrics.verifiedCount", { count: approved })}
            sub={t("console.metrics.pendingCount", { count: pending })}
            icon={CheckCircle2} color="#F59E0B"
            trend={pending > 3 ? "down" : "up"} delay={0.21} />
        </div>

        {/* Tab navigation */}
        <div className="flex items-center gap-1 p-1 rounded-2xl w-fit"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          {TABS.map(({ key, labelKey, icon: TI, badge }) => (
            <button key={key} onClick={() => setTab(key)}
              className={cn(
                "relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all border",
                tab === key ? adminTabActive : adminTabInactive,
              )}>
              <TI className={cn("w-4 h-4", tab === key ? "text-cyan-400" : "text-slate-200")} />
              <span className="hidden sm:inline">{t(labelKey)}</span>
              {badge > 0 && (
                <motion.span animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute -top-1.5 -end-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black"
                  style={{ background: "#EF4444", color: "#FFFFFF" }}>
                  {badge}
                </motion.span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
            {tab === "queue"     && <VerifQueue regs={regs} loading={regsLoading} onReview={setSelected} />}
            {tab === "suppliers" && <SuppliersLedger data={overview} />}
            {tab === "buyers"    && <BuyersHub data={overview} />}
            {tab === "logistics" && <LogisticsTracker deliveryRegs={deliveryRegs} liveDrivers={overview.liveDrivers} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Review Modal */}
      <AnimatePresence>
        {selected && (
          <ReviewModal reg={selected} onClose={() => setSelected(null)} onUpdate={handleUpdate} />
        )}
      </AnimatePresence>
    </div>
  );
}
