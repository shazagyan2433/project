/* ─────────────────────────────────────────────────────────────────
   DRIVER PORTAL
   Role-tabbed wrapper around DriverDashboard.
   Tabs: Deliveries · History · Earnings
──────────────────────────────────────────────────────────────── */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Truck, History, Banknote,
  MapPin, ArrowRight, CheckCircle2, Package,
} from "lucide-react";
import i18n from "@/i18n";
import { useCurrency } from "@/contexts/CurrencyContext";
import DriverDashboard from "./driver-dashboard";
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

/* ── Demo data (empty until API wired) ─────────────────────────── */
const PROVINCES: Record<string, string> = {
  erbil:"هەولێر", sulaymaniyah:"سلێمانی", duhok:"دهۆک",
  halabja:"هەڵەبجە", kirkuk:"کەرکووک", baghdad:"بەغداد",
  basra:"بەسرە", mosul:"مووسڵ",
};

const HISTORY: Array<{ id: string; orderId: string; buyer: string; fee: number; from: string; to: string; date: string; items: number }> = [];

const WEEKLY_EARN: Array<{ d: string; v: number }> = [];

/* ── Shared panel shell ─────────────────────────────────────────── */
function PanelShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={BG}>
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex:0 }}>
        <div className="absolute inset-0" style={{ background:"radial-gradient(ellipse 60% 50% at 15% 50%,rgba(29,78,216,0.18) 0%,transparent 70%)" }} />
        <div className="absolute inset-0" style={{ background:"radial-gradient(ellipse 28% 28% at 65% 80%,rgba(16,185,129,0.07) 0%,transparent 60%)" }} />
      </div>
      <main className="relative z-10 flex-1 p-4 pb-24 max-w-4xl mx-auto w-full" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}

/* ── HISTORY tab ─────────────────────────────────────────────────── */
function HistoryPanel({ isLoading }: { isLoading: boolean }) {
  const { formatMoney } = useCurrency();

  return (
    <PanelShell>
      <h1 className="text-sm font-extrabold text-white mb-4">مێژووی گەیاندنەکان</h1>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {isLoading ? [0,1,2].map(i => <MetricSkeleton key={i} />) : [
          { label:"کۆی گەیاندن", value:"0", color:C.blue   },
          { label:"کۆیی دەستمووزی", value:formatMoney(0), color:C.green  },
          { label:"ئەمجار",      value:"0",    color:C.purple },
        ].map(m => (
          <div key={m.label} style={GLASS} className="p-4 text-center">
            <p className="text-2xl font-extrabold" style={{ color:m.color }}>{m.value}</p>
            <p className="text-[10px] font-semibold mt-1" style={{ color:C.muted }}>{m.label}</p>
          </div>
        ))}
      </div>

      <div style={GLASS} className="overflow-hidden" aria-live="polite">
        <div className="px-4 py-3" style={{ borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
          <h2 className="text-[12px] font-extrabold text-white">گەیاندنی تەواوبوو</h2>
        </div>
        {isLoading
          ? <div className="p-4"><TableRowSkeleton rows={5} /></div>
          : HISTORY.length === 0
            ? <div className="flex flex-col items-center py-16 gap-3">
                <History className="w-10 h-10" style={{ color:"rgba(16,185,129,0.35)" }} />
                <p className="text-white/40 text-sm font-semibold">هیچ گەیاندنێک نییە</p>
              </div>
            : HISTORY.map((h, idx) => (
              <div key={h.id}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.025]"
                style={{ borderBottom: idx < HISTORY.length-1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background:"rgba(16,185,129,0.14)", border:"1px solid rgba(16,185,129,0.28)" }}>
                  <CheckCircle2 className="w-3.5 h-3.5" style={{ color:"#34d399" }} aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-white truncate">{h.buyer}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[9px]" style={{ color:C.muted }}>{PROVINCES[h.from] ?? h.from}</span>
                    <ArrowRight className="w-2.5 h-2.5 shrink-0" style={{ color:C.muted }} aria-hidden="true" />
                    <span className="text-[9px]" style={{ color:C.muted }}>{PROVINCES[h.to] ?? h.to}</span>
                  </div>
                </div>
                <div className="text-end shrink-0">
                  <p className="text-[12px] font-extrabold tabular-nums" style={{ color:"#34d399" }}>
                    +{formatMoney(h.fee)}
                  </p>
                  <p className="text-[9px]" style={{ color:C.muted }}>{h.date}</p>
                </div>
              </div>
            ))
        }
      </div>
    </PanelShell>
  );
}

/* ── EARNINGS tab ───────────────────────────────────────────────── */
function EarningsPanel({ isLoading }: { isLoading: boolean }) {
  const { formatMoney } = useCurrency();
  const hasChartData = WEEKLY_EARN.length > 0;

  return (
    <PanelShell>
      <h1 className="text-sm font-extrabold text-white mb-4">دەستمووزەکانم</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {isLoading ? [0,1,2].map(i => <MetricSkeleton key={i} />) : [
          { label:"کۆیی دەستمووز — ئەمسەر", value:formatMoney(0), color:C.green  },
          { label:"ئەمجار",                  value:formatMoney(0), color:C.blue   },
          { label:"باشترین ڕۆژ",             value:"—",                                   color:C.orange },
        ].map(m => (
          <div key={m.label} style={GLASS} className="p-4">
            <p className="text-2xl font-extrabold" style={{ color:m.color }}>{m.value}</p>
            <p className="text-[10px] mt-1 font-semibold" style={{ color:C.muted }}>{m.label}</p>
          </div>
        ))}
      </div>

      {/* Weekly bar chart */}
      <div style={GLASS} className="p-4 mb-4">
        <h2 className="text-[12px] font-extrabold text-white mb-3">دەستمووزی هەفتەیی</h2>
        {isLoading
          ? <div className="animate-pulse rounded-xl" style={{ height:140, background:"rgba(255,255,255,0.03)" }} />
          : hasChartData
            ? <div className="flex items-end gap-1.5" style={{ height:"140px" }} role="img" aria-label="هەفتەیی دەستمووز چارت">
                {WEEKLY_EARN.map(d => {
                  const maxW = Math.max(...WEEKLY_EARN.map(x => x.v), 1);
                  return (
                    <div key={d.d} className="flex-1 flex flex-col items-center justify-end gap-1">
                      <span className="text-[8px] font-bold" style={{ color:C.muted }}>
                        {formatMoney(d.v, { compact: true })}
                      </span>
                      <div className="w-full rounded-t-md transition-all"
                        style={{ height:`${(d.v/maxW)*110}px`, background:"linear-gradient(180deg,#10b981,#059669)" }} />
                      <span className="text-[8px]" style={{ color:"#475569" }}>{d.d}</span>
                    </div>
                  );
                })}
              </div>
            : <div className="flex flex-col items-center py-12 gap-2">
                <Banknote className="w-8 h-8" style={{ color:"rgba(16,185,129,0.25)" }} />
                <p className="text-white/40 text-xs font-semibold">هیچ داتای دەستمووز نییە</p>
              </div>
        }
      </div>

      {/* Completed deliveries summary */}
      <div style={GLASS} className="p-4">
        <h2 className="text-[12px] font-extrabold text-white mb-3">فیشەکانی دەستمووز</h2>
        {isLoading
          ? <TableRowSkeleton rows={4} />
          : HISTORY.length === 0
            ? <p className="text-white/40 text-xs font-semibold py-6 text-center">هیچ فیشێک نییە</p>
            : HISTORY.slice(0, 4).map((h, idx) => (
              <div key={h.id} className="flex items-center gap-3 py-2"
                style={{ borderBottom: idx < 3 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  <Package className="w-3 h-3 shrink-0" style={{ color:C.muted }} aria-hidden="true" />
                  <p className="text-[10px] font-bold text-white truncate">{h.buyer}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <MapPin className="w-2.5 h-2.5" style={{ color:C.muted }} aria-hidden="true" />
                  <span className="text-[9px]" style={{ color:C.muted }}>{PROVINCES[h.to] ?? h.to}</span>
                </div>
                <p className="text-[11px] font-extrabold tabular-nums shrink-0" style={{ color:"#34d399" }}>
                  +{formatMoney(h.fee)}
                </p>
              </div>
            ))
        }
      </div>
    </PanelShell>
  );
}

/* ── Tab definitions ─────────────────────────────────────────────── */
const TABS: RoleTab[] = [
  { id:"deliveries", label:"Deliveries", labelKu:"گەیاندن",   labelAr:"التوصيلات", Icon:Truck    },
  { id:"history",    label:"History",    labelKu:"مێژوو",     labelAr:"السجل",     Icon:History  },
  { id:"earnings",   label:"Earnings",   labelKu:"دەستمووز",  labelAr:"الأرباح",   Icon:Banknote },
];

/* ── Portal entry ────────────────────────────────────────────────── */
export default function DriverPortal() {
  const [activeTab, setActiveTab] = useState("deliveries");
  const [isLoading, setIsLoading] = useState(false);
  const [lang, setLang]           = useState(i18n.language);

  useEffect(() => {
    const update = (l: string) => setLang(l);
    i18n.on("languageChanged", update);
    return () => { i18n.off("languageChanged", update); };
  }, []);

  useEffect(() => {
    if (activeTab === "deliveries") return;
    setIsLoading(true);
    const t = setTimeout(() => setIsLoading(false), 900);
    return () => clearTimeout(t);
  }, [activeTab]);

  return (
    <>
      <a href="#driver-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-[200] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:font-bold">
        داخلبوون بۆ ناوەرۆک
      </a>

      <div id="driver-main">
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
            {activeTab === "deliveries" && <DriverDashboard />}
            {activeTab === "history"    && <HistoryPanel  isLoading={isLoading} />}
            {activeTab === "earnings"   && <EarningsPanel isLoading={isLoading} />}
          </motion.div>
        </AnimatePresence>
      </div>

      <RoleTabBar
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        accentColor="#10b981"
        lang={lang}
      />
    </>
  );
}
