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

/* ── Demo data ─────────────────────────────────────────────────── */
const PROVINCES: Record<string, string> = {
  erbil:"هەولێر", sulaymaniyah:"سلێمانی", duhok:"دهۆک",
  halabja:"هەڵەبجە", kirkuk:"کەرکووک", baghdad:"بەغداد",
  basra:"بەسرە", mosul:"مووسڵ",
};

const HISTORY = [
  { id:"sh-c1", orderId:"ORD-P9K4XA", buyer:"فرۆشگای ئەمین",     fee:25_000, from:"erbil",        to:"sulaymaniyah", date:"١٣ی تیرمەه",items:8  },
  { id:"sh-c2", orderId:"ORD-M3G8ZB", buyer:"مارکێتی ئارام",      fee:18_000, from:"duhok",        to:"erbil",        date:"١٣ی تیرمەه",items:4  },
  { id:"sh-c3", orderId:"ORD-X1V4MP", buyer:"فرۆشگای ئاسمان",     fee:12_000, from:"sulaymaniyah", to:"halabja",      date:"١٢ی تیرمەه",items:3  },
  { id:"sh-c4", orderId:"ORD-R9T5DH", buyer:"دووکانی بەختیار",     fee:22_000, from:"erbil",        to:"duhok",        date:"١٢ی تیرمەه",items:6  },
  { id:"sh-c5", orderId:"ORD-L6B2KN", buyer:"هایپەری نوێ",         fee:45_000, from:"baghdad",      to:"basra",        date:"١١ی تیرمەه",items:15 },
  { id:"sh-c6", orderId:"ORD-C8Y6WQ", buyer:"گرووپی تاجر",         fee:28_000, from:"baghdad",      to:"mosul",        date:"١١ی تیرمەه",items:10 },
];

const totalHistoryFee = HISTORY.reduce((s, h) => s + h.fee, 0);

const WEEKLY_EARN = [
  { d:"دو", v:58_000 }, { d:"سێ", v:95_000 }, { d:"چو", v:42_000 },
  { d:"پێ", v:110_000 }, { d:"هە", v:87_000 }, { d:"شە", v:122_000 },
  { d:"یە", v:63_000 },
];
const maxW = Math.max(...WEEKLY_EARN.map(d => d.v));

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
  return (
    <PanelShell>
      <h1 className="text-sm font-extrabold text-white mb-4">مێژووی گەیاندنەکان</h1>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {isLoading ? [0,1,2].map(i => <MetricSkeleton key={i} />) : [
          { label:"کۆی گەیاندن", value:"١٤",    color:C.blue   },
          { label:"کۆیی دەستمووزی", value:`${(totalHistoryFee/1_000).toFixed(0)}K`, color:C.green  },
          { label:"ئەمجار",      value:"٦",    color:C.purple },
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
                    +{new Intl.NumberFormat("ku-IQ").format(h.fee)}
                    <span className="text-[9px] font-normal text-white/30 ms-0.5">د.ع</span>
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
  const weeklyTotal = WEEKLY_EARN.reduce((s, d) => s + d.v, 0);

  return (
    <PanelShell>
      <h1 className="text-sm font-extrabold text-white mb-4">دەستمووزەکانم</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {isLoading ? [0,1,2].map(i => <MetricSkeleton key={i} />) : [
          { label:"کۆیی دەستمووز — ئەمسەر", value:`${(totalHistoryFee/1_000).toFixed(0)}K`, color:C.green  },
          { label:"ئەمجار",                  value:`${(weeklyTotal/1_000).toFixed(0)}K`,      color:C.blue   },
          { label:"باشترین ڕۆژ",             value:"شەممە",                                   color:C.orange },
        ].map(m => (
          <div key={m.label} style={GLASS} className="p-4">
            <p className="text-2xl font-extrabold" style={{ color:m.color }}>{m.value}
              {m.label !== "باشترین ڕۆژ" && <span className="text-xs font-normal text-white/40 ms-1">د.ع</span>}
            </p>
            <p className="text-[10px] mt-1 font-semibold" style={{ color:C.muted }}>{m.label}</p>
          </div>
        ))}
      </div>

      {/* Weekly bar chart */}
      <div style={GLASS} className="p-4 mb-4">
        <h2 className="text-[12px] font-extrabold text-white mb-3">دەستمووزی هەفتەیی</h2>
        {isLoading
          ? <div className="animate-pulse rounded-xl" style={{ height:140, background:"rgba(255,255,255,0.03)" }} />
          : <div className="flex items-end gap-1.5" style={{ height:"140px" }} role="img" aria-label="هەفتەیی دەستمووز چارت">
              {WEEKLY_EARN.map(d => (
                <div key={d.d} className="flex-1 flex flex-col items-center justify-end gap-1">
                  <span className="text-[8px] font-bold" style={{ color:C.muted }}>
                    {d.v >= 1000 ? `${(d.v/1_000).toFixed(0)}K` : d.v}
                  </span>
                  <div className="w-full rounded-t-md transition-all"
                    style={{ height:`${(d.v/maxW)*110}px`, background:"linear-gradient(180deg,#10b981,#059669)" }} />
                  <span className="text-[8px]" style={{ color:"#475569" }}>{d.d}</span>
                </div>
              ))}
            </div>
        }
      </div>

      {/* Completed deliveries summary */}
      <div style={GLASS} className="p-4">
        <h2 className="text-[12px] font-extrabold text-white mb-3">فیشەکانی دەستمووز</h2>
        {isLoading
          ? <TableRowSkeleton rows={4} />
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
                  +{new Intl.NumberFormat("ku-IQ").format(h.fee)}
                  <span className="text-[9px] font-normal text-white/30 ms-0.5">د.ع</span>
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
