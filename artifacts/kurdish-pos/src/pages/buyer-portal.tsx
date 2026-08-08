/* ─────────────────────────────────────────────────────────────────
   BUYER PORTAL
   Role-tabbed wrapper around BuyerDashboard.
   Tabs: Marketplace · Orders · Payments · Profile
──────────────────────────────────────────────────────────────── */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Store, ClipboardList, CreditCard, User,
  CheckCircle2, Clock, MapPin,
} from "lucide-react";
import i18n from "@/i18n";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/contexts/AuthContext";
import BuyerDashboard from "./buyer-dashboard";
import { RoleTabBar, type RoleTab } from "@/components/RoleTabBar";
import { MetricSkeleton, TableRowSkeleton } from "@/components/SkeletonLoader";

/* ── Design tokens ────────────────────────────────────────────── */
const BG: React.CSSProperties = {
  background: "linear-gradient(160deg,#020C1C 0%,#041428 60%,#030E22 100%)",
};
const GLASS: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: "16px",
};
const C = {
  text: "var(--terminal-text,#f1f5f9)",
  muted: "#64748b",
  sub: "#94a3b8",
  green: "#10b981",
  blue: "#3b82f6",
  orange: "#f97316",
  purple: "#8b5cf6",
};
const STATUS_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  "جێبەجێکرا": { bg:"rgba(16,185,129,0.10)", color:"#34d399", border:"rgba(16,185,129,0.22)" },
  "بەرێوەیە":  { bg:"rgba(59,130,246,0.10)",  color:"#60a5fa", border:"rgba(59,130,246,0.22)" },
  "چاوەڕوانە": { bg:"rgba(234,179,8,0.10)",   color:"#fbbf24", border:"rgba(234,179,8,0.22)"  },
  "ڕەتکرایەوە":{ bg:"rgba(239,68,68,0.10)",   color:"#f87171", border:"rgba(239,68,68,0.22)"  },
};

/* ── Demo data (empty until API wired) ─────────────────────────── */
const BUYER_ORDERS: Array<{ id: string; supplier: string; items: number; amount: number; status: string; date: string }> = [];

const PAYMENTS: Array<{ id: string; amount: number; method: string; status: string; date: string }> = [];

/* ── Shared panel shell ─────────────────────────────────────────── */
function PanelShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={BG}>
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex:0 }}>
        <div className="absolute inset-0" style={{ background:"radial-gradient(ellipse 60% 50% at 15% 50%,rgba(29,78,216,0.2) 0%,transparent 70%)" }} />
        <div className="absolute inset-0" style={{ background:"radial-gradient(ellipse 40% 35% at 85% 15%,rgba(6,182,212,0.12) 0%,transparent 65%)" }} />
      </div>
      <main className="relative z-10 flex-1 p-4 pb-24 max-w-4xl mx-auto w-full" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}

/* ── ORDERS tab ─────────────────────────────────────────────────── */
function OrdersPanel({ isLoading }: { isLoading: boolean }) {
  const [filter, setFilter] = useState("گشتی");
  const { formatMoney } = useCurrency();
  const statuses = ["گشتی","جێبەجێکرا","بەرێوەیە","چاوەڕوانە"];
  const rows = filter === "گشتی" ? BUYER_ORDERS : BUYER_ORDERS.filter(o => o.status === filter);

  return (
    <PanelShell>
      <h1 className="text-sm font-extrabold text-white mb-4">داواکارییەکانم</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {isLoading ? [0,1,2,3].map(i => <MetricSkeleton key={i} />) : [
          { label:"کۆی داواکاری", value:"0",    color:C.blue,   icon:ClipboardList },
          { label:"کۆیی خەرجی",  value:formatMoney(0), color:C.green,  icon:CreditCard    },
          { label:"بەرێوەیە",    value:"0",     color:C.orange, icon:Clock         },
          { label:"جێبەجێکراو",  value:"0",    color:C.purple, icon:CheckCircle2  },
        ].map(m => (
          <div key={m.label} style={GLASS} className="p-4">
            <m.icon className="w-4 h-4 mb-2" style={{ color:m.color }} aria-hidden="true" />
            <p className="text-xl font-extrabold" style={{ color:m.color }}>{m.value}</p>
            <p className="text-[10px] mt-0.5 font-semibold" style={{ color:C.muted }}>{m.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3" role="tablist" aria-label="فلتەری داواکاری">
        {statuses.map(s => (
          <button key={s} role="tab" aria-selected={filter === s}
            onClick={() => setFilter(s)}
            className="px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            style={filter === s
              ? { background:"rgba(59,130,246,0.18)", color:"rgba(147,197,253,1)", border:"1px solid rgba(59,130,246,0.4)" }
              : { background:"rgba(255,255,255,0.04)", color:"rgba(148,163,184,0.7)", border:"1px solid rgba(255,255,255,0.07)" }}>
            {s}
          </button>
        ))}
      </div>

      <div style={GLASS} className="overflow-hidden" aria-live="polite">
        {isLoading
          ? <div className="p-4"><TableRowSkeleton rows={5} /></div>
          : rows.length === 0
            ? <div className="flex flex-col items-center py-16 gap-3">
                <ClipboardList className="w-10 h-10" style={{ color:"rgba(59,130,246,0.35)" }} />
                <p className="text-white/40 text-sm font-semibold">هیچ داواکارییەک نییە</p>
              </div>
            : rows.map((o, idx) => {
              const ss = STATUS_STYLE[o.status] ?? STATUS_STYLE["چاوەڕوانە"];
              return (
                <div key={o.id}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.025]"
                  style={{ borderBottom: idx < rows.length-1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                  <div className="shrink-0">
                    <p className="text-[10px] font-mono font-bold" style={{ color:C.muted }}>#{o.id}</p>
                    <p className="text-[9px]" style={{ color:"#475569" }}>{o.date}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-white truncate">{o.supplier}</p>
                    <p className="text-[9px]" style={{ color:C.muted }}>{o.items} دانە</p>
                  </div>
                  <div className="text-end shrink-0 space-y-0.5">
                    <p className="text-[12px] font-extrabold tabular-nums" style={{ color:"#34d399" }}>
                      {formatMoney(o.amount)}
                    </p>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold"
                      style={{ background:ss.bg, color:ss.color, border:`1px solid ${ss.border}` }}>
                      {o.status}
                    </span>
                  </div>
                </div>
              );
            })
        }
      </div>
    </PanelShell>
  );
}

/* ── PAYMENTS tab ───────────────────────────────────────────────── */
function PaymentsPanel({ isLoading }: { isLoading: boolean }) {
  const { formatMoney } = useCurrency();
  const methodColor = (m: string) =>
    m === "کارت"
      ? { bg:"rgba(124,58,237,0.12)", color:"rgba(167,139,250,0.9)", border:"rgba(124,58,237,0.3)" }
      : { bg:"rgba(16,185,129,0.10)", color:"#34d399",                border:"rgba(16,185,129,0.25)" };

  return (
    <PanelShell>
      <h1 className="text-sm font-extrabold text-white mb-4">مێژووی پارەدان</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {isLoading ? [0,1,2].map(i => <MetricSkeleton key={i} />) : [
          { label:"کۆیی پارەی دراو",    value:formatMoney(0), color:C.green  },
          { label:"کارتی کرێدیت",       value:"0", color:C.purple },
          { label:"چاوەڕوانی تەسدیق",   value:"0",     color:C.orange },
        ].map(m => (
          <div key={m.label} style={GLASS} className="p-4">
            <p className="text-2xl font-extrabold" style={{ color:m.color }}>{m.value}</p>
            <p className="text-[10px] mt-1 font-semibold" style={{ color:C.muted }}>{m.label}</p>
          </div>
        ))}
      </div>

      <div style={GLASS} className="overflow-hidden" aria-live="polite">
        <div className="px-4 py-3" style={{ borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
          <h2 className="text-[12px] font-extrabold text-white">مامەڵەکان</h2>
        </div>
        {isLoading
          ? <div className="p-4"><TableRowSkeleton rows={5} /></div>
          : PAYMENTS.length === 0
            ? <div className="flex flex-col items-center py-16 gap-3">
                <CreditCard className="w-10 h-10" style={{ color:"rgba(16,185,129,0.35)" }} />
                <p className="text-white/40 text-sm font-semibold">هیچ مامەڵەیەک نییە</p>
              </div>
            : PAYMENTS.map((p, idx) => {
              const ss = STATUS_STYLE[p.status] ?? STATUS_STYLE["چاوەڕوانە"];
              const mc = methodColor(p.method);
              return (
                <div key={p.id}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.025]"
                  style={{ borderBottom: idx < PAYMENTS.length-1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-mono font-bold" style={{ color:C.muted }}>#{p.id}</p>
                    <p className="text-[9px]" style={{ color:"#475569" }}>{p.date}</p>
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
                    style={{ background:mc.bg, color:mc.color, border:`1px solid ${mc.border}` }}>
                    {p.method}
                  </span>
                  <div className="text-end shrink-0 space-y-0.5">
                    <p className="text-[12px] font-extrabold tabular-nums" style={{ color:"#34d399" }}>
                      {formatMoney(p.amount)}
                    </p>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
                      style={{ background:ss.bg, color:ss.color, border:`1px solid ${ss.border}` }}>
                      {p.status}
                    </span>
                  </div>
                </div>
              );
            })
        }
      </div>
    </PanelShell>
  );
}

/* ── PROFILE tab ────────────────────────────────────────────────── */
function ProfilePanel() {
  const { user, logout } = useAuth();
  if (!user) return null;

  const fields = [
    { label:"ناو",       value: user.name                          },
    { label:"ئیمەیل",   value: user.email   ?? "—"                },
    { label:"مۆبایل",   value: user.phone   ?? "—"                },
    { label:"پارێزگا",  value: user.province ?? "—"               },
    { label:"ئیدی نیشتمانی", value: user.nationalId ?? "—"       },
    { label:"ڕۆڵ",      value: user.role                           },
  ];

  return (
    <PanelShell>
      <h1 className="text-sm font-extrabold text-white mb-4">پڕۆفایلی من</h1>

      <div style={GLASS} className="p-5 mb-4">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-extrabold text-xl text-white shrink-0"
            style={{ background:"linear-gradient(135deg,#1d4ed8,#3b82f6)", boxShadow:"0 0 20px rgba(59,130,246,0.35)" }}>
            {user.name.charAt(0)}
          </div>
          <div>
            <p className="text-base font-extrabold text-white">{user.name}</p>
            <p className="text-xs mt-0.5" style={{ color:C.muted }}>{user.email}</p>
          </div>
        </div>

        <div className="space-y-3">
          {fields.map(f => (
            <div key={f.label} className="flex items-center justify-between py-2"
              style={{ borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
              <span className="text-[11px] font-semibold" style={{ color:C.muted }}>{f.label}</span>
              <span className="text-[11px] font-bold text-white">{f.value}</span>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={logout}
        aria-label="دەرچوون لە هەژمار"
        className="w-full py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
        style={{ background:"rgba(239,68,68,0.10)", color:"rgba(252,165,165,0.85)", border:"1px solid rgba(239,68,68,0.22)" }}
        onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.20)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "rgba(239,68,68,0.10)"; }}
      >
        دەرچوون
      </button>
    </PanelShell>
  );
}

/* ── Tab definitions ─────────────────────────────────────────────── */
const TABS: RoleTab[] = [
  { id:"marketplace", label:"Marketplace", labelKu:"بازاڕ",    labelAr:"السوق",    Icon:Store        },
  { id:"orders",      label:"Orders",      labelKu:"داواکاری", labelAr:"الطلبات",  Icon:ClipboardList },
  { id:"payments",    label:"Payments",    labelKu:"پارەدان",  labelAr:"المدفوعات",Icon:CreditCard    },
  { id:"profile",     label:"Profile",     labelKu:"پڕۆفایل",  labelAr:"الملف",    Icon:User          },
];

/* ── Portal entry ────────────────────────────────────────────────── */
export default function BuyerPortal() {
  const [activeTab, setActiveTab] = useState("marketplace");
  const [isLoading, setIsLoading] = useState(false);
  const [lang, setLang]           = useState(i18n.language);

  useEffect(() => {
    const update = (l: string) => setLang(l);
    i18n.on("languageChanged", update);
    return () => { i18n.off("languageChanged", update); };
  }, []);

  useEffect(() => {
    if (activeTab === "marketplace" || activeTab === "profile") return;
    setIsLoading(true);
    const t = setTimeout(() => setIsLoading(false), 900);
    return () => clearTimeout(t);
  }, [activeTab]);

  return (
    <>
      <a href="#buyer-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-[200] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:font-bold">
        داخلبوون بۆ ناوەرۆک
      </a>

      <div id="buyer-main">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            role="tabpanel"
            id={`rolepanel-${activeTab}`}
            aria-labelledby={`roletab-${activeTab}`}
            tabIndex={-1}
          >
            {activeTab === "marketplace" && <BuyerDashboard />}
            {activeTab === "orders"      && <OrdersPanel   isLoading={isLoading} />}
            {activeTab === "payments"    && <PaymentsPanel isLoading={isLoading} />}
            {activeTab === "profile"     && <ProfilePanel />}
          </motion.div>
        </AnimatePresence>
      </div>

      <RoleTabBar
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        accentColor="#3b82f6"
        lang={lang}
      />
    </>
  );
}
