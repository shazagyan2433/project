import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";

interface Feature {
  icon: React.ElementType;
  ku: string; en: string; ar: string;
  descKu: string; descEn: string; descAr: string;
}

interface Props {
  icon: React.ElementType;
  nameKu: string; nameEn: string; nameAr: string;
  descKu: string; descEn: string; descAr: string;
  accentColor: string;
  badge?: string;
  features: Feature[];
}

export function TerminalPlaceholder({
  icon: Icon, nameKu, nameEn, nameAr, descKu, descEn, descAr,
  accentColor, badge = "Coming Soon", features,
}: Props) {
  const { t } = useTranslation();
  const lang = i18n.language as "ku" | "ar" | "en";

  const name = lang === "ku" ? nameKu : lang === "ar" ? nameAr : nameEn;
  const desc = lang === "ku" ? descKu : lang === "ar" ? descAr : descEn;

  const card = {
    background: "rgba(255,255,255,0.06)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "1rem",
  } as const;

  return (
    <div className="min-h-full" dir={lang === "ku" || lang === "ar" ? "rtl" : "ltr"}>
      {/* Hero banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative overflow-hidden rounded-2xl mb-6 p-8"
        style={{
          background: `linear-gradient(135deg, ${accentColor}22 0%, rgba(8,13,30,0.95) 60%)`,
          border: `1px solid ${accentColor}35`,
          boxShadow: `0 8px 48px ${accentColor}18, 0 2px 0 ${accentColor}40 inset`,
        }}
      >
        {/* Background glow */}
        <div
          className="absolute -top-16 -end-16 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${accentColor}22, transparent 70%)` }}
        />

        <div className="relative flex items-start gap-5">
          {/* Icon */}
          <div
            className="shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${accentColor}30, ${accentColor}15)`,
              border: `1px solid ${accentColor}50`,
              boxShadow: `0 0 24px ${accentColor}30`,
            }}
          >
            <Icon className="w-8 h-8" style={{ color: accentColor, filter: `drop-shadow(0 0 8px ${accentColor})` }} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h1 className="text-2xl font-extrabold text-white" style={{ fontFamily: "Vazirmatn,sans-serif" }}>
                {name}
              </h1>
              <span
                className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-widest"
                style={{
                  background: `${accentColor}20`,
                  border: `1px solid ${accentColor}50`,
                  color: accentColor,
                  boxShadow: `0 0 12px ${accentColor}30`,
                }}
              >
                {badge}
              </span>
            </div>
            <p className="text-white/55 text-sm leading-relaxed max-w-xl" style={{ fontFamily: "Vazirmatn,sans-serif" }}>
              {desc}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Feature cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {features.map((f, i) => {
          const fName = lang === "ku" ? f.ku : lang === "ar" ? f.ar : f.en;
          const fDesc = lang === "ku" ? f.descKu : lang === "ar" ? f.descAr : f.descEn;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 + i * 0.06 }}
              className="p-5 rounded-2xl group cursor-default transition-all duration-300"
              style={{
                ...card,
                boxShadow: "0 4px 24px rgba(0,0,0,0.25)",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.09)";
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 36px rgba(0,0,0,0.35), 0 0 0 1px ${accentColor}30`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.06)";
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 24px rgba(0,0,0,0.25)";
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{
                  background: `${accentColor}18`,
                  border: `1px solid ${accentColor}35`,
                }}
              >
                <f.icon className="w-5 h-5" style={{ color: accentColor }} />
              </div>
              <h3 className="text-[14px] font-extrabold text-white mb-1.5" style={{ fontFamily: "Vazirmatn,sans-serif" }}>
                {fName}
              </h3>
              <p className="text-[12px] text-white/45 leading-relaxed" style={{ fontFamily: "Vazirmatn,sans-serif" }}>
                {fDesc}
              </p>

              {/* Coming-soon shimmer strip */}
              <div
                className="mt-4 h-0.5 rounded-full overflow-hidden"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg,transparent,${accentColor}80,transparent)` }}
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Bottom CTA strip */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-6 rounded-2xl p-5 flex items-center gap-4"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div
          className="w-2 h-2 rounded-full shrink-0 animate-pulse"
          style={{ background: accentColor, boxShadow: `0 0 8px ${accentColor}` }}
        />
        <p className="text-[12px] text-white/40 font-semibold" style={{ fontFamily: "Vazirmatn,sans-serif" }}>
          {lang === "ku"
            ? "ئەم بەشە لە ئێستادا لە بەرپرسانی LinQi خەریکی پەرەپێدانی بۆ گەیشتن بە ئیمکانیاتی نوێ"
            : lang === "ar"
            ? "هذا القسم قيد التطوير من قبل فريق LinQi لتقديم إمكانيات جديدة"
            : "This section is actively being developed by the LinQi team to deliver powerful new capabilities"
          }
        </p>
      </motion.div>
    </div>
  );
}
