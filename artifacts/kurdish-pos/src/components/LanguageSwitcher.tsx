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
import { cn } from "@/lib/utils";

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
      data-open={open ? "true" : "false"}
      onClick={onClick}
      className={cn(
        "linqi-lang-trigger flex items-center gap-1.5 rounded-xl transition-all duration-150 select-none outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50",
        compact ? "px-2 py-1.5" : "px-2.5 py-1.5",
      )}
    >
      <Globe
        className={cn("shrink-0 w-3.5 h-3.5 transition-colors", open && "text-cyan-500 dark:text-cyan-400")}
        style={!open ? { color: "var(--shell-text-secondary)" } : undefined}
      />
      <span
        className="font-extrabold leading-none linqi-shell-heading"
        style={{
          fontFamily: "Vazirmatn, sans-serif",
          fontSize:   compact ? 11 : 11.5,
          letterSpacing: "0.01em",
        }}
      >
        {lang.short}
      </span>
      <motion.div
        animate={{ rotate: open ? 180 : 0 }}
        transition={{ duration: 0.18, ease: "easeInOut" }}
        className="flex items-center"
      >
        <ChevronDown
          className={cn("w-2.5 h-2.5 linqi-shell-muted", open && "text-cyan-500 dark:text-cyan-400")}
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
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 outline-none transition-all duration-120 relative linqi-dropdown-item",
        index < LANGS.length - 1 && "border-b border-[var(--shell-border)]",
      )}
      style={{ background: active ? `${lang.accent}14` : "transparent" }}
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
        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-base border"
        style={{
          background: active ? `${lang.accent}20` : "var(--shell-hover)",
          borderColor: active ? `${lang.accent}40` : "var(--shell-border)",
        }}
      >
        {lang.flag}
      </div>

      {/* Name + sample */}
      <div className="flex-1 min-w-0 text-start">
        <p
          className={cn(
            "text-[13px] font-extrabold leading-none mb-0.5 linqi-shell-heading",
            active && "opacity-100",
          )}
          style={{ fontFamily: "Vazirmatn, sans-serif" }}
        >
          {lang.native}
        </p>
        <p
          className="text-[10px] leading-none linqi-shell-muted"
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
  const { t } = useTranslation("common");
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 5, scale: 0.97 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      role="listbox"
      aria-label="Select language"
      className={cn(
        "absolute top-[calc(100%+8px)] w-[230px] rounded-2xl overflow-hidden linqi-dropdown",
        align === "end" ? "end-0" : "start-0",
      )}
      style={{ zIndex: 200 }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 linqi-dropdown-header">
        <Globe className="w-2.5 h-2.5 text-blue-400" />
        <span
          className="text-[9.5px] font-black uppercase tracking-[0.14em] linqi-shell-muted"
        >
          {t("language.select", { ns: "common" })}
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
        className="px-3 py-2 linqi-dropdown-footer bg-[var(--shell-hover)]"
      >
        <p
          className="text-[9px] text-center linqi-shell-muted"
          style={{ fontFamily: "Vazirmatn, sans-serif" }}
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
  const { i18n: i18nHook, t } = useTranslation("common");
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
          <Globe className="w-3 h-3 linqi-sidebar-label" />
          <span
            className="text-[9px] font-extrabold uppercase tracking-[0.15em] linqi-sidebar-label"
          >
            {t("language.select")}
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
                className={cn(
                  "flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-150 relative overflow-hidden border",
                  active
                    ? "text-slate-900 dark:text-white"
                    : "text-slate-900 dark:text-inherit linqi-shell-body border-[var(--shell-border)] hover:bg-slate-200/60 dark:hover:bg-[var(--shell-hover)] hover:text-slate-900 dark:hover:text-[var(--shell-text-primary)]",
                )}
                style={
                  active
                    ? {
                        background: `${lang.accent}20`,
                        borderColor: `${lang.accent}40`,
                        boxShadow: `0 0 12px ${lang.accent}20`,
                        fontFamily: "Vazirmatn, sans-serif",
                      }
                    : { fontFamily: "Vazirmatn, sans-serif" }
                }
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
