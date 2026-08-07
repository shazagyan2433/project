import { motion } from "framer-motion";
import { Trophy, Star, Zap, Gift, Target, Users, Crown, Medal } from "lucide-react";
import { useState } from "react";

const TIERS = [
  { name: "سروشتی",  en: "Standard", min: 0,    max: 999,   color: "#94A3B8", icon: "🥉", perks: ["دەستگەیشتن بە بازاڕ","ئاگادارییی پایە"] },
  { name: "زیو",    en: "Silver",   min: 1000,  max: 4999,  color: "#94A3B8", icon: "🥈", perks: ["داشکاندنی ٥%","RFQ پێشیار"] },
  { name: "زێڕین",  en: "Gold",     min: 5000,  max: 14999, color: "#F59E0B", icon: "🥇", perks: ["داشکاندنی ١٢%","پاشکۆی گەیاندن","پشتیبانی ٢٤/٧"] },
  { name: "دیمەنت", en: "Diamond",  min: 15000, max: Infinity, color: "#06B6D4", icon: "💎", perks:["داشکاندنی ٢٠%","مەنەجەری تایبەت","دەستگەیشتنی زوو"] },
];

const CHALLENGES = [
  { title: "١٠ سفارشی ئەمەی هەفتە",     pts: 500,  done: 7,  total: 10, icon: Target,  color: "#3B82F6" },
  { title: "سیستەمیکردنی ٣ فرۆشیاری نوێ", pts: 800,  done: 1,  total: 3,  icon: Users,   color: "#10B981" },
  { title: "کەسبکردنی ٥ ستار بۆ گەیاندن", pts: 300,  done: 5,  total: 5,  icon: Star,    color: "#F59E0B" },
  { title: "تۆپی فرۆشتنی ١M دینار",      pts: 1200, done: 650, total: 1000, icon: Zap,   color: "#A855F7" },
];

const LEADERBOARD = [
  { rank: 1, name: "کۆمپانیای ستار",    pts: "٢٤،٥٠٠", tier: "دیمەنت", badge: "💎" },
  { rank: 2, name: "مارکێتی ئازادی",    pts: "١٨،٨٠٠", tier: "دیمەنت", badge: "💎" },
  { rank: 3, name: "دابینکاری خێرا",    pts: "١٣،٤٠٠", tier: "زێڕین",  badge: "🥇" },
  { rank: 4, name: "سوپەرمارکێتی نوێ", pts: "٩،٢٠٠",  tier: "زێڕین",  badge: "🥇" },
  { rank: 5, name: "فرۆشگەی بەرز",     pts: "٦،١٠٠",  tier: "زیو",   badge: "🥈" },
];

const MY_POINTS = 7_240;
const CURRENT_TIER = TIERS[2];
const NEXT_TIER = TIERS[3];
const progress = ((MY_POINTS - CURRENT_TIER.min) / (NEXT_TIER.min - CURRENT_TIER.min)) * 100;

export default function RewardsCenter() {
  const [spinning, setSpinning] = useState(false);
  const [angle, setAngle] = useState(0);

  const spin = () => {
    if (spinning) return;
    setSpinning(true);
    const newAngle = angle + 1440 + Math.floor(Math.random() * 360);
    setAngle(newAngle);
    setTimeout(() => setSpinning(false), 2500);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "rgba(234,179,8,0.15)", border: "1px solid rgba(234,179,8,0.3)" }}>
          <Trophy className="w-5 h-5" style={{ color: "#EAB308" }} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-white">خەڵاتەکان</h1>
          <p className="text-xs text-white/40">B2B Loyalty & Rewards</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* My Level */}
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl p-5 flex flex-col items-center text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <span className="text-5xl mb-2">{CURRENT_TIER.icon}</span>
          <p className="text-white font-extrabold text-lg">{CURRENT_TIER.name}</p>
          <p className="text-white/40 text-xs mb-4">{CURRENT_TIER.en} Tier</p>
          <div className="w-full mb-1.5">
            <div className="flex justify-between text-[10px] text-white/40 mb-1">
              <span>{MY_POINTS.toLocaleString()} خاڵ</span>
              <span>{NEXT_TIER.min.toLocaleString()} → {NEXT_TIER.name}</span>
            </div>
            <div className="h-3 rounded-full bg-white/8 overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, progress)}%` }} transition={{ delay: 0.4, duration: 1.2 }}
                className="h-full rounded-full" style={{ background: `linear-gradient(90deg,${CURRENT_TIER.color},${NEXT_TIER.color})` }} />
            </div>
          </div>
          <p className="text-[10px] text-white/30 mt-1">{(NEXT_TIER.min - MY_POINTS).toLocaleString()} خاڵ تا {NEXT_TIER.name} {NEXT_TIER.icon}</p>
        </motion.div>

        {/* Spin Wheel */}
        <div className="rounded-2xl p-5 flex flex-col items-center justify-center gap-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <p className="text-sm font-extrabold text-white">گەڕانی چەرخ</p>
          <div className="relative w-32 h-32">
            <motion.div className="w-32 h-32 rounded-full" style={{ background: "conic-gradient(#F59E0B 0deg 60deg, #3B82F6 60deg 120deg, #10B981 120deg 180deg, #EF4444 180deg 240deg, #A855F7 240deg 300deg, #06B6D4 300deg 360deg)", border: "3px solid rgba(255,255,255,0.15)" }}
              animate={{ rotate: angle }} transition={{ duration: 2.5, ease: [0.17, 0.67, 0.35, 1] }}>
              {["٥٠٠","١٠٠","٣٠٠","بۆش","٨٠٠","٢٠٠"].map((label, i) => (
                <div key={i} className="absolute inset-0 flex items-center justify-center text-[9px] font-extrabold text-white" style={{ transform: `rotate(${i * 60 + 30}deg)`, transformOrigin: "center", top: -36 }}>
                  {label}
                </div>
              ))}
            </motion.div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-3 h-4 bg-white rounded-sm shadow-lg" style={{ clipPath: "polygon(50% 100%, 0 0, 100% 0)" }} />
          </div>
          <button onClick={spin} disabled={spinning}
            className="px-6 py-2.5 rounded-xl font-extrabold text-sm text-white transition-all"
            style={{ background: spinning ? "rgba(255,255,255,0.1)" : "linear-gradient(135deg,#F59E0B,#EF4444)", opacity: spinning ? 0.6 : 1 }}>
            {spinning ? "دەگەڕێت..." : "بگەڕێنە ✦"}
          </button>
        </div>

        {/* Weekly Challenges */}
        <div className="rounded-2xl p-5 space-y-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <p className="text-sm font-extrabold text-white mb-3">چالێنجی ئەمەی هەفتە</p>
          {CHALLENGES.map((c, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <c.icon className="w-3.5 h-3.5 shrink-0" style={{ color: c.color }} />
                  <span className="text-[11px] text-white/75">{c.title}</span>
                </div>
                <span className="text-[10px] font-bold" style={{ color: c.color }}>+{c.pts}</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/8">
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100,(c.done/c.total)*100)}%`, background: c.color }} />
              </div>
              <p className="text-[9px] text-white/30">{c.done} / {c.total}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tiers Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {TIERS.map((t, i) => (
          <div key={i} className="rounded-2xl p-4 text-center" style={{
            background: t.name === CURRENT_TIER.name ? `${t.color}15` : "rgba(255,255,255,0.03)",
            border: `1px solid ${t.name === CURRENT_TIER.name ? `${t.color}35` : "rgba(255,255,255,0.07)"}` }}>
            <span className="text-2xl">{t.icon}</span>
            <p className="text-sm font-extrabold mt-1.5" style={{ color: t.color }}>{t.name}</p>
            <p className="text-[9px] text-white/30 mb-2">{t.min.toLocaleString()}+ خاڵ</p>
            {t.perks.map((p, j) => <p key={j} className="text-[10px] text-white/50 leading-tight">{p}</p>)}
          </div>
        ))}
      </div>

      {/* Leaderboard */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <Crown className="w-4 h-4 text-yellow-400" />
          <p className="text-sm font-extrabold text-white/80">خشتەی پلەبەندی</p>
        </div>
        <table className="w-full">
          <tbody>
            {LEADERBOARD.map((row, i) => (
              <tr key={i} style={{ borderBottom: i < LEADERBOARD.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
                className="hover:bg-white/[0.02] transition-colors">
                <td className="px-5 py-3 text-center">
                  {row.rank <= 3
                    ? <span className="text-lg">{["🥇","🥈","🥉"][row.rank-1]}</span>
                    : <span className="text-sm font-extrabold text-white/30">#{row.rank}</span>}
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-white/85">{row.name}</td>
                <td className="px-4 py-3 text-center"><span className="text-sm">{row.badge}</span> <span className="text-xs text-white/40">{row.tier}</span></td>
                <td className="px-5 py-3 text-end text-sm font-extrabold text-white">{row.pts} <span className="text-white/30 text-xs font-normal">خاڵ</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
