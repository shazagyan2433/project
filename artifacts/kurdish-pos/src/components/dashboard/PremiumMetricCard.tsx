import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { C } from "@/pages/dashboard-tokens";

type PremiumMetricCardProps = {
  label: string;
  value: string;
  sub: string;
  icon: LucideIcon;
  accent: string;
  index: number;
  isEmpty?: boolean;
};

export function PremiumMetricCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
  index,
  isEmpty = false,
}: PremiumMetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.36, type: "spring", stiffness: 220, damping: 22 }}
      className="group relative overflow-hidden rounded-2xl cursor-default backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5"
      style={{
        background:
          "linear-gradient(160deg, color-mix(in srgb, var(--terminal-card) 78%, transparent) 0%, color-mix(in srgb, var(--shell-page-bg) 55%, transparent) 100%)",
        border: "1px solid color-mix(in srgb, var(--shell-border) 82%, transparent)",
        boxShadow: `
          inset 0 1px 0 color-mix(in srgb, white 7%, transparent),
          0 4px 28px color-mix(in srgb, ${accent} 10%, transparent),
          var(--shell-shadow)
        `,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = `color-mix(in srgb, ${accent} 38%, var(--shell-border))`;
        el.style.boxShadow = `
          inset 0 1px 0 color-mix(in srgb, white 9%, transparent),
          0 8px 36px color-mix(in srgb, ${accent} 18%, transparent),
          var(--shell-shadow)
        `;
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = "color-mix(in srgb, var(--shell-border) 82%, transparent)";
        el.style.boxShadow = `
          inset 0 1px 0 color-mix(in srgb, white 7%, transparent),
          0 4px 28px color-mix(in srgb, ${accent} 10%, transparent),
          var(--shell-shadow)
        `;
      }}
    >
      <div
        className="pointer-events-none absolute -top-10 -end-8 h-28 w-28 rounded-full blur-2xl opacity-60 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: `radial-gradient(circle, color-mix(in srgb, ${accent} 28%, transparent), transparent 70%)` }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, color-mix(in srgb, ${accent} 55%, transparent), transparent)` }}
      />

      <div className="relative z-10 p-5">
        <div className="flex items-start justify-between mb-4">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center backdrop-blur-sm transition-transform duration-300 group-hover:scale-105"
            style={{
              background: `color-mix(in srgb, ${accent} 14%, transparent)`,
              border: `1.5px solid color-mix(in srgb, ${accent} 32%, transparent)`,
              boxShadow: `0 0 20px color-mix(in srgb, ${accent} 12%, transparent)`,
            }}
          >
            <Icon className="w-5 h-5" style={{ color: accent }} strokeWidth={2} />
          </div>
          {isEmpty && (
            <span
              className="text-[9px] font-bold px-2 py-0.5 rounded-full"
              style={{
                background: "color-mix(in srgb, var(--shell-text-muted) 12%, transparent)",
                color: C.muted,
                border: "1px solid color-mix(in srgb, var(--shell-border) 60%, transparent)",
              }}
            >
              —
            </span>
          )}
        </div>
        <p className="text-[10px] font-semibold mb-1.5 tracking-wide uppercase" style={{ color: C.muted }}>
          {label}
        </p>
        <p
          className="text-[22px] font-extrabold leading-none mb-1.5 tracking-tight tabular-nums"
          style={{ color: isEmpty ? C.muted : C.text }}
        >
          {value}
        </p>
        <p className="text-[10px] leading-snug" style={{ color: C.muted }}>
          {sub}
        </p>
      </div>
    </motion.div>
  );
}
