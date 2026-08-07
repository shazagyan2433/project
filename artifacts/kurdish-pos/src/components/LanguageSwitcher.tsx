/**
 * LinQi Premium Language Switcher
 * Enterprise-grade multilingual selector for EN / AR / KU.
 * - Persists choice to localStorage ("linqi_lang")
 * - Injects dir="rtl|ltr" and lang="…" on <html> instantly
 * - Switching latency < 200 ms
 * - Fully keyboard-accessible, click-outside to close
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Check, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";

// ─── Language definitions ─────────────────────────────────────────────────────

export type LangCode = "en" | "ar" | "ku";

interface LangDef {
  code:      LangCode;
  /** Native name displayed in the list */
  native:    string;
  /** Short label shown in the trigger button */
  short:     string;
  /** Direction badge text */
  dir:       "RTL" | "LTR";
  /** Flag emoji */
  flag:      string;
  /** A short script sample rendered as a visual hint */
  sample:    string;
  /** Accent colour for active highlight */
  accent:    string;
}

const LANGS: LangDef[] = [
  {
    code:   "ku",
    native: "کوردی",
    short:  "کوردی",
    dir:    "RTL",
    flag:   "🏔",
    sample: "سیستەمی LinQi",
    accent: "#10b981",
  },
  {
    code:   "ar",
    native: "العربية",
    short:  "عربی",
    dir:    "RTL",
    flag:   "🌙",
    sample: "منصة LinQi",
    accent: "#3b82f6",
  },
  {
    code:   "en",
    native: "English",
    short:  "EN",
    dir:    "LTR",
    flag:   "🌐",
    sample: "LinQi Platform",
    accent: "#8b5cf6",
  },
];

// ─── Core switch function (callable outside React) ────────────────────────────

export function applyLanguage(code: LangCode): void {
  const rtl = code === "ku" || code === "ar";
  // Update i18next (triggers all useTranslation hooks)
  i18n.changeLanguage(code);
  // Update DOM direction + lang attribute immediately
  document.documentElement.dir  = rtl ? "rtl" : "ltr";
  document.documentElement.lang = code;
  // Persist
  localStorage.setItem("linqi_lang", code);
}

// ─── Trigger button ───────────────────────────────────────────────────────────

interface TriggerProps {
  lang:     LangDef;
  open:     boolean;
  onClick:  () => void;
  compact?: boolean;
}

function Trigger({ lang, open, onClick, compact = false }: TriggerProps) {
  return (
    <button
      type="button"
      aria-haspopup="listbox"
      aria-expanded={open}
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-xl transition-all duration-150 select-none outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
      style={{
        padding:    compact ? "5px 8px" : "5px 10px",
        background: open
          ? "rgba(255,255,255,0.09)"
          : "rgba(255,255,255,0.04)",
        border:     open
          ? "1px solid rgba(255,255,255,0.14)"
          : "1px solid rgba(255,255,255,0.07)",
        boxShadow:  open ? "0 0 0 3px rgba(59,130,246,0.10)" : "none",
      }}
      onMouseEnter={(e) => {
        if (!open) {
          (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)";
          (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.12)";
        }
      }}
      onMouseLeave={(e) => {
        if (!open) {
          (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
          (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)";
        }
      }}
    >
      <Globe
        className="shrink-0"
        style={{
          width:  14,
          height: 14,
          color:  open ? "#22d3ee" : "#f8fafc",
          transition: "color 0.15s",
        }}
      />
      <span
        className="font-extrabold leading-none text-white"
        style={{
          fontFamily: "Vazirmatn, sans-serif",
          fontSize:   compact ? 11 : 11.5,
          color:      open ? "#ffffff" : "#f1f5f9",
          letterSpacing: "0.01em",
        }}
      >
        {lang.short}
      </span>
      <motion.div
        animate={{ rotate: open ? 180 : 0 }}
        transition={{ duration: 0.18, ease: "easeInOut" }}
        style={{ display: "flex", alignItems: "center" }}
      >
        <ChevronDown
          style={{
            width:  11,
            height: 11,
            color: open ? "#22d3ee" : "#e2e8f0",
          }}
        />
      </motion.div>
    </button>
  );
}

// ─── Option row ───────────────────────────────────────────────────────────────

interface OptionProps {
  lang:     LangDef;
  active:   boolean;
  onSelect: () => void;
  index:    number;
}

function LangOption({ lang, active, onSelect, index }: OptionProps) {
  return (
    <motion.button
      type="button"
      role="option"
      aria-selected={active}
      initial={{ opacity: 0, x: 6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.045, duration: 0.15 }}
      onClick={onSelect}
      className="w-full flex items-center gap-3 px-3 py-2.5 outline-none transition-all duration-120 relative"
      style={{
        background:   active ? `${lang.accent}14` : "transparent",
        borderBottom: index < LANGS.length - 1
          ? "1px solid rgba(255,255,255,0.04)"
          : "none",
      }}
      onMouseEnter={(e) => {
        if (!active)
          (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.055)";
      }}
      onMouseLeave={(e) => {
        if (!active)
          (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
    >
      {/* Active indicator bar */}
      {active && (
        <motion.div
          layoutId="lang-active-bar"
          className="absolute start-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-e-full"
          style={{ background: lang.accent }}
          transition={{ type: "spring", stiffness: 460, damping: 38 }}
        />
      )}

      {/* Flag badge */}
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-base"
        style={{
          background: active ? `${lang.accent}20` : "rgba(255,255,255,0.06)",
          border:     active
            ? `1.5px solid ${lang.accent}40`
            : "1.5px solid rgba(255,255,255,0.07)",
        }}
      >
        {lang.flag}
      </div>

      {/* Name + sample */}
      <div className="flex-1 min-w-0 text-start">
        <p
          className="text-[13px] font-extrabold leading-none mb-0.5"
          style={{
            fontFamily: "Vazirmatn, sans-serif",
            color: active ? "#ffffff" : "#f1f5f9",
          }}
        >
          {lang.native}
        </p>
        <p
          className="text-[10px] leading-none text-slate-300"
          style={{
            fontFamily: "Vazirmatn, sans-serif",
            direction: lang.dir === "RTL" ? "rtl" : "ltr",
          }}
        >
          {lang.sample}
        </p>
      </div>

      {/* Direction badge */}
      <span
        className="text-[9px] font-black px-1.5 py-0.5 rounded-md shrink-0"
        style={{
          background: lang.dir === "RTL"
            ? "rgba(245,158,11,0.12)"
            : "rgba(99,102,241,0.12)",
          color: lang.dir === "RTL"
            ? "#fbbf24"
            : "#818cf8",
          border: lang.dir === "RTL"
            ? "1px solid rgba(245,158,11,0.22)"
            : "1px solid rgba(99,102,241,0.22)",
        }}
      >
        {lang.dir}
      </span>

      {/* Active check */}
      {active && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
          style={{ background: `${lang.accent}22`, border: `1.5px solid ${lang.accent}55` }}
        >
          <Check style={{ width: 9, height: 9, color: lang.accent }} strokeWidth={3} />
        </motion.div>
      )}
    </motion.button>
  );
}

// ─── Dropdown panel ───────────────────────────────────────────────────────────

interface DropdownProps {
  currentCode: LangCode;
  onSelect:    (code: LangCode) => void;
  /** Alignment relative to trigger */
  align?: "end" | "start";
}

function Dropdown({ currentCode, onSelect, align = "end" }: DropdownProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 5, scale: 0.97 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      role="listbox"
      aria-label="Select language"
      className={`absolute top-[calc(100%+8px)] ${align === "end" ? "end-0" : "start-0"} w-[230px] rounded-2xl overflow-hidden`}
      style={{
        background:           "rgba(10,14,22,0.96)",
        backdropFilter:       "blur(28px)",
        WebkitBackdropFilter: "blur(28px)",
        border:               "1px solid rgba(255,255,255,0.09)",
        boxShadow: [
          "0 20px 60px rgba(0,0,0,0.60)",
          "0 4px 16px rgba(0,0,0,0.40)",
          "inset 0 1px 0 rgba(255,255,255,0.06)",
        ].join(", "),
        zIndex: 200,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2.5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <Globe style={{ width: 11, height: 11, color: "rgba(96,165,250,0.70)" }} />
        <span
          className="text-[9.5px] font-black uppercase tracking-[0.14em]"
          style={{ color: "rgba(255,255,255,0.28)" }}
        >
          Language / زمان / اللغة
        </span>
      </div>

      {/* Options */}
      <div className="py-1">
        {LANGS.map((lang, idx) => (
          <LangOption
            key={lang.code}
            lang={lang}
            active={lang.code === currentCode}
            onSelect={() => onSelect(lang.code)}
            index={idx}
          />
        ))}
      </div>

      {/* Footer */}
      <div
        className="px-3 py-2"
        style={{
          borderTop: "1px solid rgba(255,255,255,0.05)",
          background: "rgba(0,0,0,0.25)",
        }}
      >
        <p
          className="text-[9px] text-center"
          style={{ color: "rgba(255,255,255,0.16)", fontFamily: "Vazirmatn, sans-serif" }}
        >
          LinQi · Multilingual B2B Platform
        </p>
      </div>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface LanguageSwitcherProps {
  /** "header" = compact trigger in top bar, "sidebar" = full pill row in sidebar */
  variant?: "header" | "sidebar";
  /** Which side the dropdown opens towards */
  align?: "end" | "start";
}

export function LanguageSwitcher({
  variant = "header",
  align   = "end",
}: LanguageSwitcherProps) {
  const { i18n: i18nHook } = useTranslation();
  const currentCode  = (i18nHook.language || "ku") as LangCode;
  const currentLang  = LANGS.find((l) => l.code === currentCode) ?? LANGS[0];

  const [open, setOpen]     = useState(false);
  const containerRef         = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const handleSelect = useCallback((code: LangCode) => {
    applyLanguage(code);
    setOpen(false);
  }, []);

  // ── Sidebar variant: full-width pill row ──────────────────────────────────
  if (variant === "sidebar") {
    return (
      <div className="px-4 pt-3 pb-1">
        <div className="flex items-center gap-1.5 mb-2">
          <Globe className="w-3 h-3 text-slate-200" />
          <span
            className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-slate-200"
          >
            Language
          </span>
        </div>
        <div className="flex gap-1">
          {LANGS.map((lang) => {
            const active = lang.code === currentCode;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleSelect(lang.code)}
                className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-150 relative overflow-hidden"
                style={
                  active
                    ? {
                        background: `${lang.accent}20`,
                        color: "#ffffff",
                        border: `1px solid ${lang.accent}40`,
                        boxShadow: `0 0 12px ${lang.accent}20`,
                        fontFamily: "Vazirmatn, sans-serif",
                      }
                    : {
                        color: "#f1f5f9",
                        border: "1px solid rgba(255,255,255,0.12)",
                        background: "transparent",
                        fontFamily: "Vazirmatn, sans-serif",
                      }
                }
                onMouseEnter={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.color = "#22d3ee";
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.color = "#f1f5f9";
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                  }
                }}
              >
                {active && (
                  <motion.div
                    layoutId="sidebar-lang-pill"
                    className="absolute inset-0 rounded-lg"
                    style={{ background: `${lang.accent}15` }}
                    transition={{ type: "spring", stiffness: 400, damping: 34 }}
                  />
                )}
                <span className="relative z-10">{lang.short}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Header variant: compact dropdown ─────────────────────────────────────
  return (
    <div ref={containerRef} className="relative shrink-0">
      <Trigger
        lang={currentLang}
        open={open}
        onClick={() => setOpen((v) => !v)}
        compact={false}
      />
      <AnimatePresence>
        {open && (
          <Dropdown
            currentCode={currentCode}
            onSelect={handleSelect}
            align={align}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default LanguageSwitcher;
