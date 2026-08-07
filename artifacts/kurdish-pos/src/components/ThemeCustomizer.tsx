import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Palette, X, RotateCcw, Check } from "lucide-react";
import { useCustomTheme, PRESETS } from "@/contexts/ThemeContext";

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
        <p className="text-[11px] font-extrabold leading-none mb-0.5" style={{ color: "#f1f5f9", fontFamily: "Vazirmatn,sans-serif" }}>
          {label}
        </p>
        <p className="text-[9px]" style={{ color: "#64748b", fontFamily: "Vazirmatn,sans-serif" }}>{sublabel}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[9px] font-mono font-bold uppercase tabular-nums"
          style={{ color: "#64748b" }}>
          {value.toUpperCase()}
        </span>
        {/* Color swatch — clicks through to hidden native picker */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="relative w-8 h-8 rounded-xl border-2 transition-all duration-200 overflow-hidden shrink-0"
          style={{
            background: value,
            borderColor: "rgba(255,255,255,0.15)",
            boxShadow: `0 0 14px ${value}55, inset 0 1px 0 rgba(255,255,255,0.18)`,
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1.12)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
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
    <div ref={drawerRef} className="relative w-full">

      {/* ── Trigger button ─────────────────────────────────────── */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all duration-200 group"
        style={{
          background:  open ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.03)",
          border:      open ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(255,255,255,0.06)",
          boxShadow:   open ? `0 0 14px var(--terminal-accent)22` : "none",
        }}
        onMouseEnter={e => {
          if (!open) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.055)";
        }}
        onMouseLeave={e => {
          if (!open) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
        }}
      >
        <div className="w-[18px] h-[18px] shrink-0 flex items-center justify-center">
          <Palette
            className="w-[18px] h-[18px] transition-colors"
            style={{ color: open ? "var(--terminal-accent)" : "rgba(77,158,255,0.7)", filter: open ? `drop-shadow(0 0 4px var(--terminal-accent))` : undefined }}
          />
        </div>
        <span
          className="truncate transition-colors text-[13px] font-bold"
          style={{ fontFamily: "Vazirmatn,sans-serif", color: open ? "#f1f5f9" : "rgba(255,255,255,0.80)" }}
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
            className="absolute bottom-[calc(100%+8px)] start-0 end-0 rounded-2xl overflow-hidden"
            style={{
              background:           "rgba(10,13,20,0.97)",
              backdropFilter:       "blur(32px)",
              WebkitBackdropFilter: "blur(32px)",
              border:               "1px solid rgba(255,255,255,0.09)",
              boxShadow:            `0 -8px 40px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04), 0 0 24px var(--terminal-accent)18`,
              zIndex: 50,
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2">
                <Palette className="w-3.5 h-3.5" style={{ color: "var(--terminal-accent)" }} />
                <span className="text-[12px] font-extrabold text-white"
                  style={{ fontFamily: "Vazirmatn,sans-serif" }}>
                  ڕێکخستنی ڕەنگەکانی پانێڵ
                </span>
              </div>
              <button onClick={() => setOpen(false)}
                className="w-6 h-6 flex items-center justify-center rounded-lg transition-all"
                style={{ color: "#64748b" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#f1f5f9"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#64748b"; }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-4 space-y-5">

              {/* Presets */}
              <div>
                <p className="text-[9px] uppercase tracking-[0.18em] font-extrabold mb-3"
                  style={{ color: "#475569", fontFamily: "Vazirmatn,sans-serif" }}>
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
                        <div className="relative w-9 h-9 rounded-xl overflow-hidden transition-all duration-200"
                          style={{
                            background:  preset.colors.bg,
                            border:      isActive ? `2px solid ${preset.colors.accent}` : "2px solid rgba(255,255,255,0.08)",
                            boxShadow:   isActive ? `0 0 14px ${preset.colors.accent}55` : "none",
                            transform:   isActive ? "scale(1.08)" : "scale(1)",
                          }}
                          onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.transform = "scale(1.06)"; }}
                          onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
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
                        <span className="text-[8px] font-bold text-center leading-snug"
                          style={{ color: isActive ? "var(--terminal-accent)" : "#475569", fontFamily: "Vazirmatn,sans-serif", maxWidth: "38px" }}>
                          {preset.label.split("ی")[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: "1px", background: "rgba(255,255,255,0.05)" }} />

              {/* Custom color pickers */}
              <div>
                <p className="text-[9px] uppercase tracking-[0.18em] font-extrabold mb-3.5"
                  style={{ color: "#475569", fontFamily: "Vazirmatn,sans-serif" }}>
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
              <div style={{ height: "1px", background: "rgba(255,255,255,0.05)" }} />

              {/* Live preview strip */}
              <div className="rounded-xl overflow-hidden"
                style={{ border: "1px solid rgba(255,255,255,0.06)", height: "36px", background: colors.bg }}>
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
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-extrabold transition-all flex-1"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border:     "1px solid rgba(255,255,255,0.07)",
                    color:      "#64748b",
                    fontFamily: "Vazirmatn,sans-serif",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#f1f5f9"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#64748b"; }}
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
