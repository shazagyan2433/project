import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, ShoppingBag, MessageSquare, AlertTriangle, CheckCircle2,
  Zap, Package, Truck, Star, Settings, Check, X,
} from "lucide-react";

type NType = "sale" | "rfq" | "stock" | "system" | "delivery" | "reward";

interface Notif {
  id: number; type: NType; title: string; body: string;
  time: string; read: boolean; icon: any; color: string;
}

const INITIAL: Notif[] = [
  { id: 1,  type: "sale",     title: "فرۆشتنی نوێ",          body: "سفارشی #LQ-9901 لەلایەن مارکێتی ئازادی — ٢٤.٥M IQD",         time: "١٠:٢٣", read: false, icon: ShoppingBag,  color: "#3B82F6" },
  { id: 2,  type: "rfq",      title: "وەڵامی RFQ",             body: "کۆمپانیای بەرز وەڵامی پێشنیازت دا: ١٨.٢M IQD بۆ رووغەن",     time: "٠٩:٤٧", read: false, icon: Zap,          color: "#F97316" },
  { id: 3,  type: "stock",    title: "هشیارکردنەوەی ستۆک",    body: "شیر پاستەریزەکراو: تەنها ٣ واحید مابێتەوە. دابینکرانە دەوێت", time: "٠٩:١٢", read: false, icon: AlertTriangle, color: "#EF4444" },
  { id: 4,  type: "delivery", title: "بارگیری گەیشت",          body: "#LQ-8823 بۆ سوپەرمارکێتی نوێ — کارەکە تەواو بوو",           time: "٠٨:٥٥", read: true,  icon: Truck,        color: "#10B981" },
  { id: 5,  type: "reward",   title: "خاڵی نوێ کەسبکرا",      body: "چالێنجی ئەمەی هەفتەت تەواو بوو — ٥٠٠ خاڵت بەخشرا",          time: "دوێنێ",  read: true,  icon: Star,         color: "#F59E0B" },
  { id: 6,  type: "system",   title: "نوێکردنەوەی سیستەم",    body: "LinQi v2.4 ئامادەیە — تازەترین تایبەتمەندییەکان زیادکراون",   time: "دوێنێ",  read: true,  icon: Settings,     color: "#A855F7" },
  { id: 7,  type: "sale",     title: "فرۆشتنی نوێ",           body: "سفارشی #LQ-9902 لەلایەن فرۆشگەی ستار — ٣٣.١M IQD",          time: "دوێنێ",  read: true,  icon: ShoppingBag,  color: "#3B82F6" },
  { id: 8,  type: "rfq",      title: "داواکاری RFQ نوێ",       body: "دابینکاری خێرا داواکاری ٤٥ تۆنی رووغەنی نەباتی کرد",        time: "یەکشەم", read: true,  icon: Package,      color: "#F97316" },
  { id: 9,  type: "stock",    title: "ستۆکی زیادکرا",          body: "٢٠٠ واحیدی ئاوی کانی وەرگیرا لە دابینکاری بەرز",            time: "یەکشەم", read: true,  icon: CheckCircle2, color: "#10B981" },
  { id: 10, type: "delivery", title: "شۆفێر دەستپێکرد",        body: "ئارام کەریم ٣ بارگیری ئامادەکرد — #LQ-8821, 8822, 8824",    time: "شەممە",  read: true,  icon: Truck,        color: "#06B6D4" },
];

const FILTERS: { key: NType | "all"; label: string; icon: any; color: string }[] = [
  { key: "all",      label: "هەموو",      icon: Bell,         color: "#94A3B8" },
  { key: "sale",     label: "فرۆشتن",    icon: ShoppingBag,  color: "#3B82F6" },
  { key: "rfq",      label: "RFQ",        icon: Zap,          color: "#F97316" },
  { key: "stock",    label: "کۆگا",       icon: AlertTriangle,color: "#EF4444" },
  { key: "delivery", label: "گەیاندن",   icon: Truck,        color: "#10B981" },
  { key: "reward",   label: "خەڵات",     icon: Star,         color: "#F59E0B" },
  { key: "system",   label: "سیستەم",    icon: Settings,     color: "#A855F7" },
];

export default function NotificationCenter() {
  const [notifs, setNotifs] = useState<Notif[]>(INITIAL);
  const [filter, setFilter] = useState<NType | "all">("all");

  const shown = filter === "all" ? notifs : notifs.filter(n => n.type === filter);
  const unreadCount = notifs.filter(n => !n.read).length;

  const markAllRead = () => setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  const markRead = (id: number) => setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  const dismiss = (id: number) => setNotifs(prev => prev.filter(n => n.id !== id));

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)" }}>
              <Bell className="w-5 h-5" style={{ color: "#EF4444" }} />
            </div>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -end-1 w-5 h-5 rounded-full text-[10px] font-extrabold text-white flex items-center justify-center"
                style={{ background: "#EF4444", boxShadow: "0 0 10px rgba(239,68,68,0.6)" }}>
                {unreadCount}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white">ئاگادارییەکان</h1>
            <p className="text-xs text-white/40">Notification Center</p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-all"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>
            <Check className="w-3.5 h-3.5" /> هەمووی خوێندراوە
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f => {
          const count = f.key === "all" ? notifs.filter(n=>!n.read).length : notifs.filter(n=>n.type===f.key && !n.read).length;
          return (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
              style={{ background: filter===f.key ? `${f.color}20` : "rgba(255,255,255,0.05)",
                       border: filter===f.key ? `1px solid ${f.color}40` : "1px solid rgba(255,255,255,0.08)",
                       color: filter===f.key ? f.color : "rgba(255,255,255,0.4)" }}>
              <f.icon className="w-3 h-3" />
              {f.label}
              {count > 0 && <span className="w-4 h-4 rounded-full text-[9px] font-extrabold text-white flex items-center justify-center" style={{ background: f.color }}>{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Notification List */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <AnimatePresence initial={false}>
          {shown.map((n, i) => (
            <motion.div key={n.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0 }} transition={{ delay: i * 0.04 }}
              className="flex items-start gap-4 px-5 py-4 relative group transition-colors hover:bg-white/[0.02] cursor-pointer"
              style={{ borderBottom: i < shown.length-1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                       background: n.read ? "transparent" : `${n.color}08` }}
              onClick={() => markRead(n.id)}>
              {/* Unread dot */}
              {!n.read && <span className="absolute start-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full" style={{ background: n.color }} />}

              {/* Icon */}
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: `${n.color}18`, border: `1px solid ${n.color}25` }}>
                <n.icon className="w-4 h-4" style={{ color: n.color }} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold truncate" style={{ color: n.read ? "rgba(255,255,255,0.7)" : "#ffffff" }}>{n.title}</p>
                  <span className="text-[10px] text-white/30 shrink-0">{n.time}</span>
                </div>
                <p className="text-xs text-white/45 mt-0.5 leading-relaxed">{n.body}</p>
              </div>

              {/* Dismiss */}
              <button onClick={e => { e.stopPropagation(); dismiss(n.id); }}
                className="w-6 h-6 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shrink-0 mt-0.5 text-white/30 hover:text-white/60 hover:bg-white/10">
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        {shown.length === 0 && (
          <div className="text-center py-14 text-white/25 text-sm">هیچ ئاگادارییەک نییە</div>
        )}
      </div>
    </div>
  );
}
