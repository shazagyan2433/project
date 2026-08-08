import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { C } from "@/pages/dashboard-tokens";

type DashboardEmptyStateProps = {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  accent?: string;
  compact?: boolean;
};

export function DashboardEmptyState({
  icon: Icon,
  title,
  subtitle,
  accent = "var(--linqi-blue)",
  compact = false,
}: DashboardEmptyStateProps) {
  const py = compact ? "py-8" : "py-14";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`relative flex flex-col items-center justify-center text-center ${py} px-6 rounded-2xl overflow-hidden`}
      style={{
        background:
          "linear-gradient(145deg, color-mix(in srgb, var(--terminal-card) 88%, transparent), color-mix(in srgb, var(--shell-page-bg) 40%, transparent))",
        border: "1px dashed color-mix(in srgb, var(--shell-border) 70%, transparent)",
        boxShadow: "inset 0 1px 0 color-mix(in srgb, white 6%, transparent)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background: `radial-gradient(ellipse 70% 60% at 50% 0%, color-mix(in srgb, ${accent} 14%, transparent), transparent 70%)`,
        }}
      />

      <div className="relative mb-4">
        <div
          className="absolute inset-0 rounded-2xl blur-2xl opacity-50 scale-110"
          style={{ background: `color-mix(in srgb, ${accent} 35%, transparent)` }}
        />
        <div
          className="relative w-14 h-14 rounded-2xl flex items-center justify-center backdrop-blur-md"
          style={{
            background: `color-mix(in srgb, ${accent} 12%, var(--terminal-card))`,
            border: `1px solid color-mix(in srgb, ${accent} 28%, var(--shell-border))`,
            boxShadow: `0 0 32px color-mix(in srgb, ${accent} 18%, transparent), inset 0 1px 0 color-mix(in srgb, white 10%, transparent)`,
          }}
        >
          <Icon className="w-6 h-6" style={{ color: accent }} strokeWidth={1.75} />
        </div>
      </div>

      <p className="relative text-[13px] font-extrabold tracking-tight mb-1" style={{ color: C.text }}>
        {title}
      </p>
      {subtitle && (
        <p className="relative text-[11px] leading-relaxed max-w-[260px]" style={{ color: C.muted }}>
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}
