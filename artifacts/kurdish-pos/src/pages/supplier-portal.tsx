/* ─────────────────────────────────────────────────────────────────
   SUPPLIER PORTAL
   Role-tabbed wrapper around SupplierCatalog.
   Tabs: Products · Orders · Inventory · Analytics · Finance
──────────────────────────────────────────────────────────────── */
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, ShoppingCart, Warehouse, BarChart3, DollarSign,
  TrendingUp, AlertTriangle, CheckCircle2, Clock,
} from "lucide-react";
import i18n from "@/i18n";
import { useCurrency } from "@/contexts/CurrencyContext";
import SupplierCatalog from "./supplier-catalog";
import { RoleTabBar, type RoleTab } from "@/components/RoleTabBar";
import {
  MetricSkeleton,
  TableRowSkeleton,
  ChartSkeleton,
} from "@/components/SkeletonLoader";

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
  red: "#ef4444",
  purple: "#8b5cf6",
};
const STATUS_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  "جێبەجێکرا": { bg: "rgba(16,185,129,0.10)",  color: "#34d399", border: "rgba(16,185,129,0.22)" },
  "بەرێوەیە":  { bg: "rgba(59,130,246,0.10)",   color: "#60a5fa", border: "rgba(59,130,246,0.22)" },
  "چاوەڕوانە": { bg: "rgba(234,179,8,0.10)",    color: "#fbbf24", border: "rgba(234,179,8,0.22)"  },
  "هەڵوەشا":   { bg: "rgba(239,68,68,0.10)",    color: "#f87171", border: "rgba(239,68,68,0.22)"  },
};

/* ── Demo data (financial lists empty until API wired) ─────────── */
const ORDERS: Array<{ id: string; buyer: string; items: number; amount: number; status: string; date: string }> = [];

const STOCK = [
  { name:"شیری سمارت — کارتۆن",  qty:450, min:100, unit:"کارتۆن", level:"کافی"   },
  { name:"کۆگای گەنمی تیرمەه",   qty:82,  min:200, unit:"تۆن",    level:"کەمبوو" },
  { name:"رووناکی پاک",           qty:31,  min:50,  unit:"تەنکە",  level:"فووری"  },
  { name:"شەکری سپی",            qty:720, min:300, unit:"کیلۆ",   level:"کافی"   },
  { name:"نووری ئەربیل",         qty:155, min:100, unit:"کارتۆن", level:"کافی"   },
  { name:"چای ئەحمەد",           qty:44,  min:100, unit:"قوتی",   level:"کەمبوو" },
  { name:"قاوەی گۆلدەن",         qty:18,  min:50,  unit:"قوتی",   level:"فووری"  },
];

const WEEK: Array<{ d: string; v: number }> = [];

const TXN: Array<{ id: string; type: string; amount: number; from: string; date: string; status: string }> = [];

/* ── Shared panel shell ─────────────────────────────────────────── */
function PanelShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={BG}>
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 50% at 15% 50%,rgba(29,78,216,0.18) 0%,transparent 70%)" }} />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 35% 30% at 85% 15%,rgba(6,182,212,0.10) 0%,transparent 65%)" }} />
      </div>
      <main className="relative z-10 flex-1 overflow-y-auto p-4 pb-24 max-w-4xl mx-auto w-full" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}

/* ── Metric mini-card ───────────────────────────────────────────── */
function MiniMetric({ label, value, sub, color, Icon }: {
  label: string; value: string; sub: string; color: string; Icon: React.ElementType;
}) {
  return (
    <div style={GLASS} className="p-4">
      <Icon className="w-4 h-4 mb-2" style={{ color }} aria-hidden="true" />
      <p className="text-xl font-extrabold" style={{ color }}>{value}</p>
      <p className="text-[10px] mt-0.5 font-semibold" style={{ color: C.muted }}>{label}</p>
      <p className="text-[9px] mt-0.5" style={{ color: C.muted }}>{sub}</p>
    </div>
  );
}

/* ── ORDERS tab ─────────────────────────────────────────────────── */
function OrdersPanel({ isLoading }: { isLoading: boolean }) {
  const [filter, setFilter] = useState("گشتی");
  const { formatMoney } = useCurrency();
  const statuses = ["گشتی","جێبەجێکرا","بەرێوەیە","چاوەڕوانە","هەڵوەشا"];
  const rows = filter === "گشتی" ? ORDERS : ORDERS.filter(o => o.status === filter);

  return (
    <PanelShell>
      <h1 className="text-sm font-extrabold text-white mb-4">داواکارییەکان</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {isLoading ? [0,1,2,3].map(i => <MetricSkeleton key={i} />) : [
          { label:"داواکاری گشتی",      value:"0", sub:"ئەمسەر",    color:C.blue,   Icon:ShoppingCart },
          { label:"داهاتی گشتی",        value:formatMoney(0), sub:"", color:C.green,  Icon:DollarSign   },
          { label:"چاوەڕوانی تەسلیم",   value:"0",  sub:"داواکاری",  color:C.orange, Icon:Clock        },
          { label:"جێبەجێکراو",         value:"0", sub:"داواکاری",  color:C.purple, Icon:CheckCircle2 },
        ].map(m => <MiniMetric key={m.label} {...m} />)}
      </div>

      {/* Status filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3" role="tablist" aria-label="فلتەری بەرپرسیار">
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
                <CheckCircle2 className="w-10 h-10" style={{ color:"rgba(16,185,129,0.35)" }} />
                <p className="text-white/40 text-sm font-semibold">هیچ داواکارییەک نەدۆزرایەوە</p>
              </div>
            : rows.map((o, idx) => {
                const ss = STATUS_STYLE[o.status] ?? STATUS_STYLE["چاوەڕوانە"];
                return (
                  <div key={o.id}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.025] focus-within:bg-white/[0.02]"
                    style={{ borderBottom: idx < rows.length-1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                    <div className="shrink-0">
                      <p className="text-[10px] font-mono font-bold" style={{ color:C.muted }}>#{o.id}</p>
                      <p className="text-[9px]" style={{ color:"#475569" }}>{o.date}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-white truncate">{o.buyer}</p>
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

/* ── INVENTORY tab ──────────────────────────────────────────────── */
function InventoryPanel({ isLoading }: { isLoading: boolean }) {
  const levelColor: Record<string,{ bg:string;color:string;border:string }> = {
    "کافی":   { bg:"rgba(16,185,129,0.10)",  color:"#34d399", border:"rgba(16,185,129,0.25)" },
    "کەمبوو": { bg:"rgba(234,179,8,0.10)",   color:"#fbbf24", border:"rgba(234,179,8,0.25)"  },
    "فووری":  { bg:"rgba(239,68,68,0.10)",   color:"#f87171", border:"rgba(239,68,68,0.25)"  },
  };
  const urgent = STOCK.filter(s => s.level === "فووری").length;
  const low    = STOCK.filter(s => s.level === "کەمبوو").length;
  const ok     = STOCK.length - urgent - low;

  return (
    <PanelShell>
      <h1 className="text-sm font-extrabold text-white mb-4">بەرپرسیاری ئەنبار</h1>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {isLoading ? [0,1,2].map(i => <MetricSkeleton key={i} />) : [
          { label:"فووری", value:urgent, color:C.red    },
          { label:"کەمبوو",value:low,    color:C.orange },
          { label:"کافی",  value:ok,     color:C.green  },
        ].map(m => (
          <div key={m.label} style={GLASS} className="p-4 text-center">
            <p className="text-2xl font-extrabold" style={{ color:m.color }}>{m.value}</p>
            <p className="text-[10px] font-semibold mt-1" style={{ color:C.muted }}>{m.label}</p>
          </div>
        ))}
      </div>

      <div style={GLASS} className="overflow-hidden" aria-live="polite">
        <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
          <Warehouse className="w-4 h-4" style={{ color:C.purple }} aria-hidden="true" />
          <h2 className="text-[12px] font-extrabold text-white">سەرنج و ئەنبار</h2>
        </div>
        {isLoading
          ? <div className="p-4"><TableRowSkeleton rows={6} /></div>
          : STOCK.map((item, idx) => {
              const pct = Math.min(100, Math.round((item.qty / (item.min * 3)) * 100));
              const lc  = levelColor[item.level];
              const barColor = item.level === "فووری" ? C.red : item.level === "کەمبوو" ? C.orange : C.green;
              return (
                <div key={item.name} className="px-4 py-3"
                  style={{ borderBottom: idx < STOCK.length-1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {item.level === "فووری" && (
                        <AlertTriangle className="w-3 h-3 shrink-0" style={{ color:"#f87171" }} aria-label="فووری" />
                      )}
                      <p className="text-[11px] font-bold text-white truncate">{item.name}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-extrabold tabular-nums" style={{ color:C.sub }}>
                        {item.qty} <span className="font-normal text-[9px]">{item.unit}</span>
                      </span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
                        style={{ background:lc.bg, color:lc.color, border:`1px solid ${lc.border}` }}>
                        {item.level}
                      </span>
                    </div>
                  </div>
                  <div className="w-full rounded-full overflow-hidden" style={{ height:"3px", background:"rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full transition-all duration-700" style={{ width:`${pct}%`, background:barColor }} />
                  </div>
                  <p className="text-[9px] mt-1" style={{ color:"#475569" }}>کەمترین: {item.min} {item.unit}</p>
                </div>
              );
            })
        }
      </div>
    </PanelShell>
  );
}

/* ── ANALYTICS tab ──────────────────────────────────────────────── */
function AnalyticsPanel({ isLoading }: { isLoading: boolean }) {
  const { formatMoney } = useCurrency();
  const hasChartData = WEEK.length > 0;

  return (
    <PanelShell>
      <h1 className="text-sm font-extrabold text-white mb-4">شیکاریی فرۆشەکان</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {isLoading ? [0,1,2,3].map(i => <MetricSkeleton key={i} />) : [
          { label:"داهاتی ئەمسەر",       value:formatMoney(0), sub:"",  color:C.green,  Icon:TrendingUp  },
          { label:"بازارگەری ئەمسەر",   value:"0",   sub:"داواکاری",color:C.blue,  Icon:ShoppingCart},
          { label:"کڕیاری چالاک",       value:"0",    sub:"کڕیار",  color:C.purple, Icon:CheckCircle2},
          { label:"گەشەی مانگانە",      value:"0%",  sub:"پێوانه", color:C.orange, Icon:BarChart3   },
        ].map(m => <MiniMetric key={m.label} {...m} />)}
      </div>

      <div style={GLASS} className="p-4 mb-4">
        <h2 className="text-[12px] font-extrabold text-white mb-3">داهاتی ئەمجار — هەفتەیی</h2>
        {isLoading
          ? <ChartSkeleton height={160} />
          : hasChartData
            ? <div className="flex items-end gap-1.5" style={{ height:"160px" }} aria-label="هەفتەیی داهات چارت" role="img">
                {WEEK.map(d => {
                  const maxV = Math.max(...WEEK.map(x => x.v), 1);
                  return (
                    <div key={d.d} className="flex-1 flex flex-col items-center justify-end gap-1">
                      <span className="text-[8px] font-bold" style={{ color:C.muted }}>{formatMoney(d.v, { compact: true })}</span>
                      <div className="w-full rounded-t-md" style={{ height:`${(d.v/maxV)*130}px`, background:"linear-gradient(180deg,#3b82f6,#1d4ed8)" }} />
                      <span className="text-[8px]" style={{ color:"#475569" }}>{d.d}</span>
                    </div>
                  );
                })}
              </div>
            : <div className="flex flex-col items-center py-12 gap-2">
                <BarChart3 className="w-8 h-8" style={{ color:"rgba(59,130,246,0.25)" }} />
                <p className="text-white/40 text-xs font-semibold">هیچ داتای داهات نییە</p>
              </div>
        }
      </div>

      <div style={GLASS} className="p-4">
        <h2 className="text-[12px] font-extrabold text-white mb-3">باشترین بەرهەمەکان</h2>
        {isLoading
          ? <TableRowSkeleton rows={4} />
          : <p className="text-white/40 text-xs font-semibold py-6 text-center">هیچ داتای فرۆش نییە</p>
        }
      </div>
    </PanelShell>
  );
}

/* ── FINANCE tab ────────────────────────────────────────────────── */
function FinancePanel({ isLoading }: { isLoading: boolean }) {
  const { formatMoney } = useCurrency();

  return (
    <PanelShell>
      <h1 className="text-sm font-extrabold text-white mb-4">دارایی</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {isLoading ? [0,1,2].map(i => <MetricSkeleton key={i} />) : [
          { label:"دەستی گشتی مانگانە", value:formatMoney(0), color:C.green  },
          { label:"چاوەڕوانی پارەدان",  value:formatMoney(0), color:C.orange },
          { label:"دەرهێنانی پێشوو",    value:formatMoney(0), color:C.purple },
        ].map(m => (
          <div key={m.label} style={GLASS} className="p-4">
            <p className="text-2xl font-extrabold" style={{ color:m.color }}>
              {m.value}
            </p>
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
          : TXN.length === 0
            ? <div className="flex flex-col items-center py-16 gap-3">
                <DollarSign className="w-10 h-10" style={{ color:"rgba(16,185,129,0.35)" }} />
                <p className="text-white/40 text-sm font-semibold">هیچ مامەڵەیەک نییە</p>
              </div>
            : TXN.map((tx, idx) => {
              const ss  = STATUS_STYLE[tx.status] ?? STATUS_STYLE["چاوەڕوانە"];
              const isC = tx.type === "وەرگرتن";
              return (
                <div key={tx.id}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.025]"
                  style={{ borderBottom: idx < TXN.length-1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: isC ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.12)", border:`1px solid ${isC ? "rgba(16,185,129,0.3)":"rgba(239,68,68,0.25)"}` }}>
                    <DollarSign className="w-3.5 h-3.5" style={{ color: isC ? "#34d399":"#f87171" }} aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-white truncate">{tx.from}</p>
                    <p className="text-[9px]" style={{ color:C.muted }}>{tx.id} · {tx.date}</p>
                  </div>
                  <div className="text-end shrink-0">
                    <p className="text-[12px] font-extrabold tabular-nums" style={{ color: isC ? "#34d399":"#f87171" }}>
                      {isC ? "+" : "−"}{formatMoney(tx.amount)}
                    </p>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
                      style={{ background:ss.bg, color:ss.color, border:`1px solid ${ss.border}` }}>
                      {tx.status}
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

/* ── Tab definitions ────────────────────────────────────────────── */
const TABS: RoleTab[] = [
  { id:"products",  label:"Products",  labelKu:"بەرهەم",   labelAr:"المنتجات", Icon:Package      },
  { id:"orders",    label:"Orders",    labelKu:"داواکاری", labelAr:"الطلبات",  Icon:ShoppingCart  },
  { id:"inventory", label:"Inventory", labelKu:"ئەنبار",   labelAr:"المخزون",  Icon:Warehouse     },
  { id:"analytics", label:"Analytics", labelKu:"شیکاری",   labelAr:"التحليلات",Icon:BarChart3     },
  { id:"finance",   label:"Finance",   labelKu:"دارایی",   labelAr:"المالية",  Icon:DollarSign    },
];

/* ── Portal entry ────────────────────────────────────────────────── */
export default function SupplierPortal() {
  const [activeTab, setActiveTab] = useState("products");
  const [isLoading, setIsLoading] = useState(false);
  const [lang, setLang]           = useState(i18n.language);
  const mainRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const update = (l: string) => setLang(l);
    i18n.on("languageChanged", update);
    return () => { i18n.off("languageChanged", update); };
  }, []);

  /* Simulate data fetch on tab switch */
  useEffect(() => {
    if (activeTab === "products") return;
    setIsLoading(true);
    const t = setTimeout(() => setIsLoading(false), 900);
    return () => clearTimeout(t);
  }, [activeTab]);

  /* Skip navigation link */
  return (
    <>
      {/* Skip link — WCAG 2.4.1 */}
      <a href="#supplier-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-[200] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:font-bold focus:shadow-lg">
        داخلبوون بۆ ناوەرۆک
      </a>

      <div id="supplier-main">
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
            {activeTab === "products"  && <SupplierCatalog />}
            {activeTab === "orders"    && <OrdersPanel    isLoading={isLoading} />}
            {activeTab === "inventory" && <InventoryPanel isLoading={isLoading} />}
            {activeTab === "analytics" && <AnalyticsPanel isLoading={isLoading} />}
            {activeTab === "finance"   && <FinancePanel   isLoading={isLoading} />}
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
