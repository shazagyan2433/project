import { createContext, useContext, useEffect, useState } from "react";

/* ══════════════════════════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════════════════════════ */
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
export const PRESETS: Preset[] = [
  { name: "terminal", label: "تێرمیناڵی شەو", colors: { bg: "#0b0f17", text: "#f1f5f9", accent: "#1A6AFF" } },
  { name: "purple",   label: "پەرپووری شەو",   colors: { bg: "#0d0b14", text: "#f0eeff", accent: "#8b5cf6" } },
  { name: "emerald",  label: "زەیتوونی شەو",   colors: { bg: "#091210", text: "#ecfdf5", accent: "#10b981" } },
  { name: "amber",    label: "زێرینی شەو",     colors: { bg: "#0f0d07", text: "#fffbeb", accent: "#f59e0b" } },
  { name: "crimson",  label: "سووری تیرە",      colors: { bg: "#120a0a", text: "#fff1f2", accent: "#ef4444" } },
];

const DEFAULT_COLORS = PRESETS[0].colors;
const STORAGE_KEY    = "linqi_custom_colors";

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
  /* Override Tailwind primary so bg-primary / text-primary / border-primary
     all update automatically without any class changes */
  const hsl = hexToHslStr(c.accent);
  root.style.setProperty("--primary",        hsl);
  root.style.setProperty("--ring",           hsl);
  root.style.setProperty("--sidebar-active", hsl);
}

/* ══════════════════════════════════════════════════════════════════
   CONTEXT
══════════════════════════════════════════════════════════════════ */
interface ThemeContextValue {
  colors:      CustomColors;
  setColors:   (partial: Partial<CustomColors>) => void;
  applyPreset: (name: string) => void;
  presets:     Preset[];
  /* Legacy light/dark toggle kept for compatibility */
  theme:       "dark";
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors:      DEFAULT_COLORS,
  setColors:   () => {},
  applyPreset: () => {},
  presets:     PRESETS,
  theme:       "dark",
  toggleTheme: () => {},
});

/* ══════════════════════════════════════════════════════════════════
   PROVIDER
══════════════════════════════════════════════════════════════════ */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [colors, setColorsState] = useState<CustomColors>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return { ...DEFAULT_COLORS, ...JSON.parse(stored) };
    } catch { /* ignore */ }
    return DEFAULT_COLORS;
  });

  /* Apply to DOM and persist on every color change */
  useEffect(() => {
    applyColorsToDOM(colors);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
  }, [colors]);

  /* Ensure dark class always present (app is terminal-dark) */
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  const setColors = (partial: Partial<CustomColors>) =>
    setColorsState(prev => ({ ...prev, ...partial }));

  const applyPreset = (name: string) => {
    const preset = PRESETS.find(p => p.name === name);
    if (preset) setColorsState(preset.colors);
  };

  return (
    <ThemeContext.Provider value={{
      colors,
      setColors,
      applyPreset,
      presets:     PRESETS,
      theme:       "dark",
      toggleTheme: () => {},
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme       = () => useContext(ThemeContext);
export const useCustomTheme = useTheme;
