import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Palette, X, RotateCcw, Check } from "lucide-react";
import { useCustomTheme, PRESETS } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

/* ══════════════════════════════════════════════════════════════════
   THEME CUSTOMIZER — glassmorphic palette drawer
   Trigger: palette icon at bottom of sidebar
   Opens: slide-up drawer with preset chips + color pickers
══════════════════════════════════════════════════════════════════ */

const DEFAULT_COLORS = PRESETS[0].colors;

interface ColorRowProps {
  label:   string;
  sublabel: string;
  value:   string;
  onChange: (hex: string) => void;
}

function ColorRow({ label, sublabel, value, onChange }: ColorRowProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-extrabold leading-none mb-0.5 linqi-shell-heading" style={{ fontFamily: "Vazirmatn,sans-serif" }}>
          {label}
        </p>
        <p className="text-[9px] linqi-shell-muted" style={{ fontFamily: "Vazirmatn,sans-serif" }}>{sublabel}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[9px] font-mono font-bold uppercase tabular-nums linqi-shell-muted">
          {value.toUpperCase()}
        </span>
        {/* Color swatch — clicks through to hidden native picker */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="relative w-8 h-8 rounded-xl border-2 transition-all duration-200 overflow-hidden shrink-0 hover:scale-110"
          style={{
            background: value,
            borderColor: "var(--shell-border)",
            boxShadow: `0 0 14px ${value}55, inset 0 1px 0 rgba(255,255,255,0.18)`,
          }}
          title="کلیک بکە بۆ گۆڕین"
        >
          <input
            ref={inputRef}
            type="color"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            style={{ padding: 0, border: "none" }}
          />
        </button>
      </div>
    </div>
  );
}

export function ThemeCustomizer() {
  const { colors, setColors, applyPreset, presets } = useCustomTheme();
  const [open,   setOpen]   = useState(false);
  const [saved,  setSaved]  = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  /* Close on outside click */
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    setTimeout(() => document.addEventListener("mousedown", handler), 50);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  /* Flash "saved" checkmark */
  function handleSave() {
    setSaved(true);
    setTimeout(() => { setSaved(false); setOpen(false); }, 900);
  }

  function handleReset() {
    applyPreset("terminal");
  }

  return (
    <div ref={drawerRef} className="relative w-full px-2.5 pb-1">

      {/* ── Trigger button ─────────────────────────────────────── */}
      <button
        data-open={open ? "true" : "false"}
        onClick={() => setOpen(v => !v)}
        className="linqi-theme-customizer-trigger w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all duration-200 group"
      >
        <div className="w-[18px] h-[18px] shrink-0 flex items-center justify-center">
          <Palette
            className="w-[18px] h-[18px] transition-colors"
            style={{
              color: open ? "var(--terminal-accent)" : "color-mix(in srgb, var(--terminal-accent) 70%, transparent)",
              filter: open ? `drop-shadow(0 0 4px var(--terminal-accent))` : undefined,
            }}
          />
        </div>
        <span
          className="truncate transition-colors text-[13px] font-bold linqi-shell-body text-slate-900 dark:text-inherit"
          style={{ fontFamily: "Vazirmatn,sans-serif" }}
        >
          ڕێکخستنی ڕەنگەکان
        </span>
      </button>

      {/* ── Palette drawer (slides up) ─────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{   opacity: 0, y: 8,   scale: 0.98 }}
            transition={{ duration: 0.18, type: "spring", stiffness: 360, damping: 28 }}
            dir="rtl"
            className="linqi-theme-customizer-panel absolute bottom-[calc(100%+8px)] start-0 end-0 rounded-2xl overflow-hidden"
            style={{ zIndex: 50 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 linqi-dropdown-header">
              <div className="flex items-center gap-2">
                <Palette className="w-3.5 h-3.5" style={{ color: "var(--terminal-accent)" }} />
                <span className="text-[12px] font-extrabold linqi-shell-heading"
                  style={{ fontFamily: "Vazirmatn,sans-serif" }}>
                  ڕێکخستنی ڕەنگەکانی پانێڵ
                </span>
              </div>
              <button onClick={() => setOpen(false)}
                className="w-6 h-6 flex items-center justify-center rounded-lg transition-all linqi-shell-muted hover:text-[var(--shell-text-primary)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-4 space-y-5">

              {/* Presets */}
              <div>
                <p className="text-[9px] uppercase tracking-[0.18em] font-extrabold mb-3 linqi-shell-muted"
                  style={{ fontFamily: "Vazirmatn,sans-serif" }}>
                  تیمەکانی ئامادە
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {presets.map(preset => {
                    const isActive = colors.accent === preset.colors.accent
                                  && colors.bg     === preset.colors.bg;
                    return (
                      <button
                        key={preset.name}
                        onClick={() => applyPreset(preset.name)}
                        title={preset.label}
                        className="flex flex-col items-center gap-1.5 group"
                      >
                        {/* Color stack preview */}
                        <div
                          className={cn(
                            "relative w-9 h-9 rounded-xl overflow-hidden transition-all duration-200 border-2",
                            !isActive && "border-[var(--shell-border)] hover:scale-105",
                          )}
                          style={{
                            background:  preset.colors.bg,
                            borderColor: isActive ? preset.colors.accent : undefined,
                            boxShadow:   isActive ? `0 0 14px ${preset.colors.accent}55` : "none",
                            transform:   isActive ? "scale(1.08)" : "scale(1)",
                          }}
                        >
                          {/* Accent stripe at bottom */}
                          <div className="absolute bottom-0 inset-x-0 h-2"
                            style={{ background: preset.colors.accent }} />
                          {/* Text preview dot */}
                          <div className="absolute top-1.5 start-1.5 w-1 h-1 rounded-full"
                            style={{ background: preset.colors.text, opacity: 0.6 }} />
                          {/* Active checkmark */}
                          {isActive && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Check className="w-3.5 h-3.5" style={{ color: preset.colors.accent, filter: `drop-shadow(0 0 4px ${preset.colors.accent})` }} />
                            </div>
                          )}
                        </div>
                        <span className="text-[8px] font-bold text-center leading-snug linqi-shell-muted"
                          style={{
                            color: isActive ? "var(--terminal-accent)" : undefined,
                            fontFamily: "Vazirmatn,sans-serif",
                            maxWidth: "38px",
                          }}>
                          {preset.label.split("ی")[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Divider */}
              <div className="h-px linqi-shell-divider" />

              {/* Custom color pickers */}
              <div>
                <p className="text-[9px] uppercase tracking-[0.18em] font-extrabold mb-3.5 linqi-shell-muted"
                  style={{ fontFamily: "Vazirmatn,sans-serif" }}>
                  ڕەنگی تایبەت
                </p>
                <div className="space-y-3.5">
                  <ColorRow
                    label="ڕەنگی باکگراوند"
                    sublabel="پشتی سەرەکی رووکارەکە"
                    value={colors.bg}
                    onChange={v => setColors({ bg: v })}
                  />
                  <ColorRow
                    label="ڕەنگی دەق"
                    sublabel="دەق و ناوەڕۆکی سەرەکی"
                    value={colors.text}
                    onChange={v => setColors({ text: v })}
                  />
                  <ColorRow
                    label="ڕەنگی سەرەکی و براند"
                    sublabel="دوگمەی چالاک، تاوان، براند"
                    value={colors.accent}
                    onChange={v => setColors({ accent: v })}
                  />
                </div>
              </div>

              {/* Divider */}
              <div className="h-px linqi-shell-divider" />

              {/* Live preview strip */}
              <div className="rounded-xl overflow-hidden border border-[var(--shell-border)] h-9"
                style={{ background: colors.bg }}>
                <div className="h-full flex items-center px-3 gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: colors.accent, boxShadow: `0 0 6px ${colors.accent}` }} />
                  <span className="text-[10px] font-extrabold" style={{ color: colors.text, fontFamily: "Vazirmatn,sans-serif" }}>
                    پێشبینی زیندوو
                  </span>
                  <div className="flex-1" />
                  <div className="px-2 py-0.5 rounded-lg text-[9px] font-extrabold"
                    style={{ background: colors.accent + "22", color: colors.accent, border: `1px solid ${colors.accent}44` }}>
                    چالاک
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-extrabold transition-all flex-1 linqi-shell-muted hover:text-[var(--shell-text-primary)] bg-[var(--shell-hover)] border border-[var(--shell-border)]"
                  style={{ fontFamily: "Vazirmatn,sans-serif" }}
                >
                  <RotateCcw className="w-3 h-3" />
                  گەڕانەوە
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-extrabold transition-all flex-1 justify-center"
                  style={{
                    background: saved ? "rgba(16,185,129,0.15)" : "var(--terminal-accent)",
                    border:     `1px solid ${saved ? "rgba(16,185,129,0.3)" : "transparent"}`,
                    color:      saved ? "#34d399" : "#fff",
                    fontFamily: "Vazirmatn,sans-serif",
                    boxShadow:  saved ? "none" : `0 4px 16px var(--terminal-accent)55`,
                  }}
                >
                  {saved
                    ? <><Check className="w-3 h-3" /> پاشەکەوتکرا</>
                    : "جێبەجێکردن"
                  }
                </button>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
