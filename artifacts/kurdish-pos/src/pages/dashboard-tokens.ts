import type { CSSProperties } from "react";

/** Page / card surfaces — follow active color mode via CSS variables */
export const BG = "var(--terminal-bg)";

export const C = {
  text: "var(--terminal-text)",
  muted: "var(--shell-text-muted)",
  sub: "var(--shell-text-secondary)",
  border: "var(--shell-border)",
  glass: "var(--terminal-card)",
  glassHover: "var(--shell-hover)",
  rowHover: "color-mix(in srgb, var(--shell-text-muted) 10%, var(--shell-page-bg))",
  cyan: "var(--linqi-cyan)",
  orange: "var(--linqi-orange)",
  purple: "var(--linqi-purple)",
  green: "var(--linqi-green)",
  blue: "var(--linqi-blue)",
  red: "var(--linqi-red)",
};

/** Alias tokens used by terminal-style pages (marketplace, AI assistant, etc.) */
export const PAGE_TEXT = C.text;
export const PAGE_MUTED = C.muted;
export const PAGE_SUB = C.sub;

export function glassCard(accentOrExtra?: string | CSSProperties, extra?: CSSProperties): CSSProperties {
  const accent = typeof accentOrExtra === "string" ? accentOrExtra : undefined;
  const mergedExtra = typeof accentOrExtra === "object" ? accentOrExtra : extra;

  const base: CSSProperties = {
    background: C.glass,
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    border: `1px solid ${C.border}`,
    borderRadius: "16px",
    boxShadow: "var(--shell-shadow)",
    transition: "background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease",
    ...mergedExtra,
  };
  if (accent) {
    return {
      ...base,
      borderTop: `2px solid ${accent}`,
      boxShadow: `var(--shell-shadow), 0 4px 24px color-mix(in srgb, ${accent} 12%, transparent)`,
    };
  }
  return base;
}

/** Inactive filter / tab chip */
export function chipInactiveStyle(): CSSProperties {
  return {
    background: C.glass,
    color: C.sub,
    border: `1px solid ${C.border}`,
  };
}

/** Active filter / tab chip — defaults to bright accent text (readable in dark mode) */
export function chipActiveStyle(color: string, textColor?: string): CSSProperties {
  return {
    background: `color-mix(in srgb, ${color} 18%, var(--terminal-card))`,
    color: textColor ?? color,
    border: `1px solid color-mix(in srgb, ${color} 40%, var(--shell-border))`,
  };
}

/** Chart tooltip surface */
export function chartTooltipStyle(accent = "var(--linqi-blue)"): CSSProperties {
  return {
    background: "var(--shell-dropdown-bg)",
    border: `1px solid color-mix(in srgb, ${accent} 35%, var(--shell-border))`,
    borderRadius: "10px",
    padding: "10px 14px",
    backdropFilter: "blur(12px)",
    boxShadow: "var(--shell-shadow)",
  };
}

/** Hero banner gradient end — blends accent into page bg */
export function heroGradient(accent: string): string {
  return `linear-gradient(135deg, color-mix(in srgb, ${accent} 14%, transparent) 0%, color-mix(in srgb, var(--terminal-bg) 96%, transparent) 60%)`;
}

export function dashboardSectionCard(accent?: string): CSSProperties {
  const glow = accent ?? "var(--linqi-blue)";
  return {
    background:
      "linear-gradient(160deg, color-mix(in srgb, var(--terminal-card) 80%, transparent) 0%, color-mix(in srgb, var(--shell-page-bg) 50%, transparent) 100%)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    borderRadius: "16px",
    border: "1px solid color-mix(in srgb, var(--shell-border) 82%, transparent)",
    boxShadow: `
      inset 0 1px 0 color-mix(in srgb, white 6%, transparent),
      0 4px 32px color-mix(in srgb, ${glow} 6%, transparent),
      var(--shell-shadow)
    `,
    transition: "border-color 0.25s ease, box-shadow 0.25s ease",
  };
}

export const STATUS_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  completed:  { bg: "var(--linqi-success-bg)", color: "var(--linqi-green)", border: "var(--linqi-success-border)" },
  inProgress: { bg: "var(--linqi-info-bg)",    color: "var(--linqi-blue)",  border: "var(--linqi-info-border)" },
  pending:    { bg: "var(--linqi-warning-bg)", color: "var(--linqi-amber)", border: "var(--linqi-warning-border)" },
};
