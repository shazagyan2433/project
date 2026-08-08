import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { isLocalDev } from "@/lib/local-dev";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Package, Users, Truck, TrendingUp, Zap,
  Globe, ChevronRight, Activity, DollarSign,
  MapPin, Route, Banknote, QrCode, CreditCard, CheckCircle2,
  Star, Award, Shield, Eye, Clock, Search, Filter,
  BarChart3, ArrowUpRight,
  AlertTriangle, Layers, X, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PAGE_BADGE_SUCCESS } from "@/lib/page-theme";
import { AdminVerificationTab } from "@/components/admin/AdminVerificationTab";
import { AdminContractsTab } from "@/components/admin/AdminContractsTab";
import { AdminSectorsTab } from "@/components/admin/AdminSectorsTab";
import { AdminRewardsTab } from "@/components/admin/AdminRewardsTab";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from "recharts";
import { LiveDriverTracking } from "@/components/LiveDriverTracking";
import type { TrackedDriver } from "@/lib/admin-types";
import { useAdminOverview, EMPTY_ADMIN_OVERVIEW, type AdminOverviewData } from "@/hooks/useAdminData";
import { adminTabActive, adminTabInactive } from "@/lib/admin-nav-styles";

const KURDISTAN_REGIONS = [
  { id: "duhok", name: { ku: "دهۆک", ar: "دهوك", en: "Duhok" }, x: 120, y: 80, routes: 4 },
  { id: "erbil", name: { ku: "هەولێر", ar: "أربيل", en: "Erbil" }, x: 240, y: 140, routes: 8 },
  { id: "sulaymaniyah", name: { ku: "سلێمانی", ar: "السليمانية", en: "Sulaymaniyah" }, x: 310, y: 230, routes: 6 },
  { id: "halabja", name: { ku: "هەڵەبجە", ar: "حلبجة", en: "Halabja" }, x: 350, y: 270, routes: 2 },
  { id: "kirkuk", name: { ku: "کەرکوک", ar: "كركوك", en: "Kirkuk" }, x: 235, y: 220, routes: 3 },
  { id: "mosul", name: { ku: "مووسڵ", ar: "الموصل", en: "Mosul" }, x: 155, y: 165, routes: 2 },
];

const DELIVERY_ROUTES = [
  { from: "duhok", to: "erbil" },
  { from: "erbil", to: "sulaymaniyah" },
  { from: "erbil", to: "kirkuk" },
  { from: "sulaymaniyah", to: "halabja" },
  { from: "kirkuk", to: "mosul" },
];

const VERIFICATION_STATUSES = [
  { key: "verified", label: { ku: "دڵنیاکراو", ar: "موثق", en: "Verified" }, color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/30", icon: CheckCircle2 },
  { key: "premium", label: { ku: "پریمیۆم", ar: "بريميوم", en: "Premium" }, color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/30", icon: Star },
  { key: "gold", label: { ku: "زێڕین", ar: "ذهبي", en: "Gold" }, color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/30", icon: Award },
  { key: "trusted", label: { ku: "متمانەپێکراو", ar: "موثوق", en: "Trusted" }, color: "text-violet-400", bg: "bg-violet-400/10 border-violet-400/30", icon: Shield },
];

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

function formatIQD(n: unknown): string {
  const num = Number(n);
  const safe = Number.isFinite(num) ? num : 0;
  if (safe >= 1_000_000_000) return `${(safe / 1_000_000_000).toFixed(1)}B IQD`;
  if (safe >= 1_000_000) return `${(safe / 1_000_000).toFixed(1)}M IQD`;
  if (safe >= 1_000) return `${(safe / 1_000).toFixed(0)}K IQD`;
  return `${safe.toFixed(0)} IQD`;
}

function StatCard({ title, value, sub, icon: Icon, glow, delay = 0 }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="relative rounded-2xl border border-white/5 bg-white/[0.03] backdrop-blur-sm p-5 overflow-hidden group hover:border-cyan-500/30 transition-all duration-300"
      style={{ boxShadow: glow ? `0 0 30px rgba(0,212,255,0.08)` : undefined }}
    >
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: "radial-gradient(circle at 50% 0%, rgba(0,212,255,0.05), transparent 70%)" }} />
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-xs text-slate-500 font-medium mb-1.5">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/10 bg-white/5">
          <Icon className="w-5 h-5 text-cyan-400" />
        </div>
      </div>
    </motion.div>
  );
}

function PayBadge({ method }: { method: string }) {
  if (method === "qr_payment") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-[10px] font-bold border border-violet-500/30"><QrCode className="w-2.5 h-2.5" /> QR</span>;
  if (method === "cash_on_delivery") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30"><Truck className="w-2.5 h-2.5" /> COD</span>;
  if (method === "debt") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/30"><CreditCard className="w-2.5 h-2.5" /> Debt</span>;
  return <span className={PAGE_BADGE_SUCCESS}><Banknote className="w-2.5 h-2.5" /> Cash</span>;
}

function KurdistanMap({ lang }: { lang: string }) {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPulse(p => (p + 1) % 3), 1200);
    return () => clearInterval(t);
  }, []);
  const getRegion = (id: string) => KURDISTAN_REGIONS.find(r => r.id === id);
  return (
    <div className="relative w-full h-72 rounded-2xl border border-white/5 bg-[#0a1628] overflow-hidden">
      <div className="absolute inset-0 opacity-10"
        style={{ backgroundImage: "radial-gradient(circle at 2px 2px, rgba(0,212,255,0.3) 1px, transparent 0)", backgroundSize: "24px 24px" }} />
      <div className="absolute top-3 start-3 text-xs text-cyan-400/60 font-mono uppercase tracking-wider">Kurdistan Region — Iraq</div>
      <svg viewBox="0 0 460 360" className="w-full h-full" style={{ direction: "ltr" }}>
        {DELIVERY_ROUTES.map((route, i) => {
          const from = getRegion(route.from);
          const to = getRegion(route.to);
          if (!from || !to) return null;
          return (
            <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y}
              stroke="rgba(0,212,255,0.25)" strokeWidth="1.5" strokeDasharray="6 4"
              className="animate-pulse" />
          );
        })}
        {KURDISTAN_REGIONS.map((region, i) => (
          <g key={region.id} onMouseEnter={() => setHoveredRegion(region.id)} onMouseLeave={() => setHoveredRegion(null)}>
            <circle cx={region.x} cy={region.y} r={pulse === i % 3 ? 20 : 16} fill="rgba(0,212,255,0.05)"
              stroke={hoveredRegion === region.id ? "rgba(0,212,255,0.8)" : "rgba(0,212,255,0.3)"}
              strokeWidth="1.5" className="transition-all duration-700 cursor-pointer" />
            <circle cx={region.x} cy={region.y} r={6} fill={hoveredRegion === region.id ? "#00d4ff" : "rgba(0,212,255,0.6)"} className="transition-all duration-300" />
            <circle cx={region.x} cy={region.y} r={3} fill="white" />
            <text x={region.x + 14} y={region.y + 4} fill="rgba(255,255,255,0.7)" fontSize="11" fontFamily="system-ui" style={{ userSelect: "none" }}>
              {region.name[lang as keyof typeof region.name] ?? region.name.en}
            </text>
            {hoveredRegion === region.id && (
              <g>
                <rect x={region.x - 30} y={region.y - 38} width={60} height={22} rx={4} fill="rgba(0,212,255,0.15)" stroke="rgba(0,212,255,0.4)" strokeWidth="1" />
                <text x={region.x} y={region.y - 23} fill="#00d4ff" fontSize="10" textAnchor="middle" fontFamily="system-ui">
                  {region.routes} routes
                </text>
              </g>
            )}
          </g>
        ))}
      </svg>
      <div className="absolute bottom-3 end-3 flex flex-col gap-1">
        {KURDISTAN_REGIONS.map(r => (
          <div key={r.id} className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span className="text-[10px] text-slate-400">{r.routes} routes</span>
          </div>
        )).slice(0, 4)}
      </div>
    </div>
  );
}

function OverviewTab({ data }: { data: AdminOverviewData }) {
  const { t } = useTranslation();
  const lang = i18n.language;
  const totals = data.totals ?? EMPTY_ADMIN_OVERVIEW.totals;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title={t("master.salesVolume")} value={formatIQD(totals.salesVolume)} icon={TrendingUp} glow delay={0} />
        <StatCard title={t("master.commission")} value={formatIQD(totals.commission)} sub="LinQi Revenue" icon={Zap} glow delay={0.05} />
        <StatCard title={t("master.transactions")} value={(totals.transactions ?? 0).toLocaleString()} icon={Activity} delay={0.1} />
        <StatCard title={t("master.buyers")} value={(totals.customers ?? 0).toLocaleString()} icon={Users} delay={0.15} />
        <StatCard title={t("master.products")} value={(totals.products ?? 0).toLocaleString()} icon={Package} delay={0.2} />
        <StatCard title={t("master.regions")} value={(totals.registrations ?? totals.users ?? 0).toLocaleString()} sub={t("master.registrations", { defaultValue: "Registrations" })} icon={MapPin} delay={0.25} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 rounded-2xl border border-white/5 bg-white/[0.03] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">{t("master.salesChart")}</h3>
              <p className="text-xs text-slate-500">{t("master.last14days")}</p>
            </div>
            <BarChart3 className="w-4 h-4 text-cyan-400" />
          </div>
          {data.chartData?.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data.chartData}>
                <defs>
                  <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="commGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 10 }} tickFormatter={v => v.slice(5)} />
                <YAxis tick={{ fill: "#64748b", fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                <Tooltip contentStyle={{ background: "#0d1526", border: "1px solid rgba(0,212,255,0.2)", borderRadius: 8, color: "#fff", fontSize: 12 }}
                  formatter={(val: any) => [formatIQD(Number(val)), ""]} labelFormatter={v => v} />
                <Area type="monotone" dataKey="volume" stroke="#00d4ff" strokeWidth={2} fill="url(#volumeGrad)" name={t("master.volume")} />
                <Area type="monotone" dataKey="commission" stroke="#a855f7" strokeWidth={2} fill="url(#commGrad)" name={t("master.commission")} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-600 text-sm">{t("master.noData")}</div>
          )}
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">
          <h3 className="text-sm font-bold text-white mb-4">{t("master.paymentBreakdown")}</h3>
          <div className="space-y-3">
            {[
              { key: "cash", label: "Cash", color: "#10b981", icon: Banknote },
              { key: "qr_payment", label: "QR Pay", color: "#a855f7", icon: QrCode },
              { key: "cash_on_delivery", label: "COD", color: "#f59e0b", icon: Truck },
              { key: "debt", label: "Debt", color: "#ef4444", icon: CreditCard },
            ].map(item => {
              const count = data.byMethod?.[item.key] ?? 0;
              const total = (totals.transactions ?? 0) || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={item.key}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <item.icon className="w-3 h-3" style={{ color: item.color }} />
                      <span className="text-xs text-slate-400">{item.label}</span>
                    </div>
                    <span className="text-xs font-bold text-white">{count} <span className="text-slate-500">({pct}%)</span></span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: 0.3 }}
                      className="h-full rounded-full" style={{ background: item.color }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 pt-4 border-t border-white/5">
            <h4 className="text-xs font-bold text-slate-400 mb-3">{t("master.recentActivity")}</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {(data.recentTransactions?.length ?? 0) === 0 ? (
                <p className="text-xs text-slate-600 py-4 text-center">{t("master.noData")}</p>
              ) : (
                data.recentTransactions?.slice(0, 8).map((tx: any) => (
                  <div key={tx.id} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <PayBadge method={tx.paymentMethod} />
                    </div>
                    <div className="text-end">
                      <p className="text-xs font-bold text-white">{formatIQD(tx.totalAmount)}</p>
                      <p className="text-[10px] text-slate-600">{new Date(tx.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">
          <h3 className="text-sm font-bold text-white mb-4">{t("master.topProducts")}</h3>
          <div className="space-y-2">
            {(data.topProducts?.length ?? 0) === 0 ? (
              <p className="text-sm text-slate-600 py-6 text-center">{t("master.noData")}</p>
            ) : (
              data.topProducts?.slice(0, 6).map((p: any, i: number) => (
                <div key={p.id} className="flex items-center gap-3 py-1.5">
                  <span className="w-5 text-xs text-slate-600 font-mono">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">{p.name}</p>
                    <p className="text-[10px] text-slate-500">{p.qty} units sold</p>
                  </div>
                  <span className="text-xs font-bold text-cyan-400">{formatIQD(p.revenue)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">
          <h3 className="text-sm font-bold text-white mb-1">{t("master.deliveryMap")}</h3>
          <p className="text-xs text-slate-500 mb-3">{t("master.activeRoutes")}</p>
          <KurdistanMap lang={lang} />
        </div>
      </div>
    </div>
  );
}

function SuppliersTab({ data }: { data: any }) {
  const { t } = useTranslation();
  const lang = i18n.language as "ku" | "en" | "ar";
  const [search, setSearch] = useState("");
  const [verificationMap, setVerificationMap] = useState<Record<number, string>>({});
  const products: any[] = data.products ?? [];
  const filtered = products.filter((p: any) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category ?? "").toLowerCase().includes(search.toLowerCase())
  );
  const categories = [...new Set(products.map((p: any) => p.category ?? "General"))];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title={t("master.totalProducts")} value={products.length} icon={Package} delay={0} />
        <StatCard title={t("master.categories")} value={categories.length} icon={Layers} delay={0.05} />
        <StatCard title={t("master.lowStock")} value={products.filter((p: any) => p.stock < 5).length} icon={AlertTriangle} delay={0.1} />
        <StatCard title={t("master.verified")} value={Object.values(verificationMap).filter(v => v !== "none").length} icon={CheckCircle2} delay={0.15} />
      </div>

      <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("master.searchProducts")}
              className="w-full bg-white/5 border border-white/10 rounded-xl ps-9 pe-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20" />
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-slate-400 text-sm hover:border-cyan-500/30 transition-colors">
            <Filter className="w-4 h-4" /> {t("master.filter")}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                {[t("master.product"), t("master.category"), t("master.stock"), t("master.price"), t("master.status"), t("master.verification")].map(h => (
                  <th key={h} className="px-4 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 20).map((product: any) => {
                const status = verificationMap[product.id] ?? "verified";
                const vInfo = VERIFICATION_STATUSES.find(v => v.key === status) ?? VERIFICATION_STATUSES[0];
                const VIcon = vInfo.icon;
                return (
                  <tr key={product.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-white text-xs">{product.name}</p>
                      {product.barcode && <p className="text-[10px] text-slate-600 font-mono">{product.barcode}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full bg-white/5 text-slate-400 text-[10px] border border-white/10">
                        {product.category ?? "General"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold ${product.stock < 5 ? "text-rose-400" : product.stock < 15 ? "text-amber-400" : "text-emerald-400"}`}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-cyan-400 font-mono">{Number(product.price).toLocaleString()} IQD</td>
                    <td className="px-4 py-3">
                      {product.stock === 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 text-[10px] border border-rose-500/20">Out of Stock</span>
                      ) : (
                        <span className={PAGE_BADGE_SUCCESS}>Active</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative">
                        <select value={status}
                          onChange={e => setVerificationMap(m => ({ ...m, [product.id]: e.target.value }))}
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full border cursor-pointer focus:outline-none appearance-none pr-5 ${vInfo.bg} ${vInfo.color}`}
                          style={{ background: "transparent" }}>
                          {VERIFICATION_STATUSES.map(v => (
                            <option key={v.key} value={v.key} className="text-xs">
                              {v.label[lang] ?? v.label.en}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-600">{t("master.noResults")}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function BuyersTab({ data }: { data: any }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const customers: any[] = data.customers ?? [];
  const filtered = customers.filter((c: any) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone ?? "").includes(search)
  );
  const topBuyers = [...customers].sort((a, b) => b.totalPurchases - a.totalPurchases).slice(0, 3);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title={t("master.totalBuyers")} value={customers.length} icon={Users} delay={0} />
        <StatCard title={t("master.activeBuyers")} value={customers.filter((c: any) => c.transactionCount > 0).length} icon={Activity} delay={0.05} />
        <StatCard title={t("master.topRevenue")} value={topBuyers[0] ? formatIQD(topBuyers[0].totalPurchases) : "—"} icon={TrendingUp} glow delay={0.1} />
        <StatCard title={t("master.avgPurchase")} value={customers.length > 0 ? formatIQD(customers.reduce((s: number, c: any) => s + c.totalPurchases, 0) / customers.length) : "—"} icon={DollarSign} delay={0.15} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 rounded-2xl border border-white/5 bg-white/[0.03] p-5">
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("master.searchBuyers")}
                className="w-full bg-white/5 border border-white/10 rounded-xl ps-9 pe-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  {[t("master.buyer"), t("master.phone"), t("master.purchases"), t("master.volume"), t("master.status")].map(h => (
                    <th key={h} className="px-4 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c: any) => (
                  <tr key={c.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-[10px] font-bold">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <p className="text-xs font-medium text-white">{c.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 font-mono">{c.phone}</td>
                    <td className="px-4 py-3 text-xs text-white font-bold">{c.transactionCount}</td>
                    <td className="px-4 py-3 text-xs text-cyan-400 font-bold">{formatIQD(c.totalPurchases)}</td>
                    <td className="px-4 py-3">
                      {c.transactionCount > 0 ? (
                        <span className={PAGE_BADGE_SUCCESS}>Active</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-500 text-[10px] border border-slate-500/20">Inactive</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-12 text-slate-600">{t("master.noResults")}</div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">
          <h3 className="text-sm font-bold text-white mb-4">{t("master.topBuyers")}</h3>
          <div className="space-y-4">
            {topBuyers.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">{t("master.noData")}</p>
            ) : (
              topBuyers.map((c: any, i: number) => (
                <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i === 0 ? "bg-amber-500/20 text-amber-400" : i === 1 ? "bg-slate-400/20 text-slate-400" : "bg-orange-700/20 text-orange-700"}`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{c.name}</p>
                    <p className="text-[10px] text-slate-500">{c.transactionCount} {t("master.orders")}</p>
                  </div>
                  <div className="text-end">
                    <p className="text-xs font-bold text-cyan-400">{formatIQD(c.totalPurchases)}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-white/5">
            <h4 className="text-xs font-bold text-slate-400 mb-3">{t("master.rfqTracker")}</h4>
            <div className="space-y-2">
              {(data.rfqs?.length ?? 0) === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">{t("master.noData")}</p>
              ) : (
                data.rfqs.map((rfq: any) => (
                  <div key={rfq.id} className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                    <p className="text-[11px] text-slate-300">{rfq.product}</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-500/20 text-blue-400 border border-blue-500/20">
                      {rfq.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DriversTab({ data }: { data: any }) {
  const { t } = useTranslation();
  const lang = i18n.language;
  const drivers: TrackedDriver[] = data.liveDrivers ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-extrabold text-white">
            {t("master.liveMap", { defaultValue: "Live Driver Tracking" })}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {t("master.deliveryNetwork", {
              defaultValue: "GPS positions only after drivers approve location sharing · markers stay stationary",
            })}
          </p>
        </div>
      </div>
      <LiveDriverTracking drivers={drivers} lang={lang} />
    </div>
  );
}

const TABS = [
  { id: "overview", icon: LayoutDashboard, labelKey: "master.overview" },
  { id: "verification", icon: Shield, labelKey: "master.verification" },
  { id: "contracts", icon: FileText, labelKey: "master.contracts" },
  { id: "sectors", icon: Layers, labelKey: "master.sectors" },
  { id: "rewards", icon: Award, labelKey: "master.rewards" },
  { id: "suppliers", icon: Package, labelKey: "master.suppliers" },
  { id: "buyers", icon: Users, labelKey: "master.buyers" },
  { id: "drivers", icon: Truck, labelKey: "master.drivers" },
];

export default function MasterAdminPanel() {
  const { isAdmin } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("overview");
  const { data = EMPTY_ADMIN_OVERVIEW, isLoading, isError, refetch } = useAdminOverview();

  if (!isLocalDev() && !isAdmin) {
    return (
      <div className="min-h-screen bg-[#070d1a] flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-rose-500/50 mx-auto mb-4" />
          <h2 className="text-white text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-slate-500 text-sm">This panel is restricted to platform owners.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative max-w-screen-2xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/[0.03] border border-white/5 mb-6 w-fit">
          {TABS.map(tab => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all duration-200",
                  isActive ? adminTabActive : adminTabInactive,
                )}>
                {isActive && (
                  <motion.div layoutId="activeTab" className="absolute inset-0 rounded-xl border border-cyan-400/40"
                    style={{ background: "linear-gradient(135deg, rgba(0,212,255,0.18), rgba(0,102,255,0.08))", boxShadow: "0 0 20px rgba(34,211,238,0.2)" }}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }} />
                )}
                <TabIcon className={cn("w-4 h-4 relative z-10", isActive ? "text-cyan-400" : "text-slate-200")} />
                <span className="relative z-10">{t(tab.labelKey)}</span>
              </button>
            );
          })}
        </div>

        {isError ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <p className="text-slate-400 text-sm">{t("common.loadError", { ns: "common", defaultValue: "Failed to load data" })}</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
            >
              {t("common.retry", { ns: "common", defaultValue: "Retry" })}
            </button>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-12 h-12 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-500 text-sm">{t("master.loading")}</p>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
              {activeTab === "overview" && <OverviewTab data={data} />}
              {activeTab === "verification" && <AdminVerificationTab />}
              {activeTab === "contracts" && <AdminContractsTab />}
              {activeTab === "sectors" && <AdminSectorsTab />}
              {activeTab === "rewards" && <AdminRewardsTab />}
              {activeTab === "suppliers" && <SuppliersTab data={data} />}
              {activeTab === "buyers" && <BuyersTab data={data} />}
              {activeTab === "drivers" && <DriversTab data={data} />}
            </motion.div>
          </AnimatePresence>
        )}
    </div>
  );
}
