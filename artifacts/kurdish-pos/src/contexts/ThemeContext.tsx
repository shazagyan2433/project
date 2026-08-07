import { createContext, useContext, useEffect, useState, useCallback } from "react";

/* ══════════════════════════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════════════════════════ */
export type ColorMode = "light" | "dark";

export interface CustomColors {
  bg:     string;
  text:   string;
  accent: string;
}

export interface Preset {
  name:   string;
  label:  string;
  colors: CustomColors;
}

/* ══════════════════════════════════════════════════════════════════
   PRESETS
══════════════════════════════════════════════════════════════════ */
export const DARK_PRESETS: Preset[] = [
  { name: "terminal", label: "تێرمیناڵی شەو", colors: { bg: "#0b0f17", text: "#f1f5f9", accent: "#1A6AFF" } },
  { name: "purple",   label: "پەرپووری شەو",   colors: { bg: "#0d0b14", text: "#f0eeff", accent: "#8b5cf6" } },
  { name: "emerald",  label: "زەیتوونی شەو",   colors: { bg: "#091210", text: "#ecfdf5", accent: "#10b981" } },
  { name: "amber",    label: "زێرینی شەو",     colors: { bg: "#0f0d07", text: "#fffbeb", accent: "#f59e0b" } },
  { name: "crimson",  label: "سووری تیرە",      colors: { bg: "#120a0a", text: "#fff1f2", accent: "#ef4444" } },
];

export const LIGHT_PRESETS: Preset[] = [
  { name: "terminal", label: "تێرمیناڵی ڕووناک", colors: { bg: "#f1f5f9", text: "#0f172a", accent: "#1A6AFF" } },
  { name: "purple",   label: "پەرپووری ڕووناک", colors: { bg: "#f5f3ff", text: "#1e1b4b", accent: "#7c3aed" } },
  { name: "emerald",  label: "زەیتوونی ڕووناک", colors: { bg: "#ecfdf5", text: "#064e3b", accent: "#059669" } },
  { name: "amber",    label: "زێرینی ڕووناک",   colors: { bg: "#fffbeb", text: "#78350f", accent: "#d97706" } },
  { name: "crimson",  label: "سووری ڕووناک",    colors: { bg: "#fff1f2", text: "#881337", accent: "#dc2626" } },
];

/** @deprecated Use DARK_PRESETS — kept for settings imports */
export const PRESETS = DARK_PRESETS;

const STORAGE_KEY = "linqi_custom_colors";
const MODE_KEY    = "linqi_color_mode";
const PRESET_KEY  = "linqi_theme_preset";

function readColorMode(): ColorMode {
  try {
    const stored = localStorage.getItem(MODE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch { /* ignore */ }
  return "dark";
}

function presetsForMode(mode: ColorMode): Preset[] {
  return mode === "dark" ? DARK_PRESETS : LIGHT_PRESETS;
}

function defaultColorsForMode(mode: ColorMode): CustomColors {
  return { ...presetsForMode(mode)[0].colors };
}

function readStoredPresetName(): string {
  try {
    return localStorage.getItem(PRESET_KEY) ?? "terminal";
  } catch {
    return "terminal";
  }
}

function colorsForPreset(mode: ColorMode, name: string): CustomColors {
  const preset = presetsForMode(mode).find(p => p.name === name);
  return preset ? { ...preset.colors } : defaultColorsForMode(mode);
}

/* ══════════════════════════════════════════════════════════════════
   HEX → HSL  (for updating Tailwind's --primary)
══════════════════════════════════════════════════════════════════ */
function hexToHslStr(hex: string): string {
  try {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0, s = 0;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  } catch {
    return "217 100% 55%";
  }
}

/* ══════════════════════════════════════════════════════════════════
   DOM APPLICATION — sets all CSS custom properties on :root
══════════════════════════════════════════════════════════════════ */
export function applyColorsToDOM(c: CustomColors) {
  const root = document.documentElement;
  root.style.setProperty("--terminal-bg",          c.bg);
  root.style.setProperty("--terminal-text",        c.text);
  root.style.setProperty("--terminal-accent",      c.accent);
  root.style.setProperty("--terminal-accent-glow", c.accent + "38");
  const hsl = hexToHslStr(c.accent);
  root.style.setProperty("--primary",        hsl);
  root.style.setProperty("--ring",           hsl);
  root.style.setProperty("--sidebar-active", hsl);
}

function applyColorModeToDOM(mode: ColorMode) {
  const root = document.documentElement;
  if (mode === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

/* ══════════════════════════════════════════════════════════════════
   CONTEXT
══════════════════════════════════════════════════════════════════ */
interface ThemeContextValue {
  colors:      CustomColors;
  setColors:   (partial: Partial<CustomColors>) => void;
  applyPreset: (name: string) => void;
  presets:     Preset[];
  theme:       ColorMode;
  setTheme:    (mode: ColorMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors:      defaultColorsForMode("dark"),
  setColors:   () => {},
  applyPreset: () => {},
  presets:     DARK_PRESETS,
  theme:       "dark",
  setTheme:    () => {},
  toggleTheme: () => {},
});

/* ══════════════════════════════════════════════════════════════════
   PROVIDER
══════════════════════════════════════════════════════════════════ */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ColorMode>(readColorMode);

  const [colors, setColorsState] = useState<CustomColors>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...defaultColorsForMode(readColorMode()), ...JSON.parse(stored) };
      }
    } catch { /* ignore */ }
    return colorsForPreset(readColorMode(), readStoredPresetName());
  });

  useEffect(() => {
    applyColorModeToDOM(theme);
    localStorage.setItem(MODE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    applyColorsToDOM(colors);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
  }, [colors]);

  const setTheme = useCallback((mode: ColorMode) => {
    setThemeState(mode);
    const preset = readStoredPresetName();
    setColorsState(colorsForPreset(mode, preset));
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => {
      const next: ColorMode = prev === "dark" ? "light" : "dark";
      const preset = readStoredPresetName();
      setColorsState(colorsForPreset(next, preset));
      return next;
    });
  }, []);

  const setColors = useCallback((partial: Partial<CustomColors>) => {
    setColorsState(prev => ({ ...prev, ...partial }));
  }, []);

  const applyPreset = useCallback((name: string) => {
    localStorage.setItem(PRESET_KEY, name);
    setColorsState(colorsForPreset(theme, name));
  }, [theme]);

  return (
    <ThemeContext.Provider value={{
      colors,
      setColors,
      applyPreset,
      presets:     presetsForMode(theme),
      theme,
      setTheme,
      toggleTheme,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme       = () => useContext(ThemeContext);
export const useCustomTheme = useTheme;
