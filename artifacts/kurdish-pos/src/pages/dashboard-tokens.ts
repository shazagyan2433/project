import type { CSSProperties } from "react";

export const BG = "#0b0f17";

export const C = {
  text: "#f1f5f9",
  muted: "#64748b",
  sub: "#94a3b8",
  border: "rgba(255,255,255,0.06)",
  glass: "rgba(255,255,255,0.03)",
  glassHover: "rgba(255,255,255,0.06)",
  cyan: "#06b6d4",
  orange: "#f97316",
  purple: "#8b5cf6",
  green: "#10b981",
  blue: "#3b82f6",
  red: "#ef4444",
};

export function glassCard(accent?: string): CSSProperties {
  const base: CSSProperties = {
    background: C.glass,
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    border: `1px solid ${C.border}`,
    borderRadius: "16px",
    transition: "background 0.15s ease",
  };
  if (accent) {
    return {
      ...base,
      borderTop: `2px solid ${accent}`,
      boxShadow: `0 4px 24px ${accent}14`,
    };
  }
  return base;
}

export const STATUS_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  "جێبەجێکرا": { bg: "rgba(16,185,129,0.12)", color: "#34d399", border: "rgba(16,185,129,0.25)" },
  "بەرێوەیە":  { bg: "rgba(59,130,246,0.12)",  color: "#60a5fa", border: "rgba(59,130,246,0.25)" },
  "چاوەڕوانە": { bg: "rgba(234,179,8,0.12)",   color: "#fbbf24", border: "rgba(234,179,8,0.25)" },
};
