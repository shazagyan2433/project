import { Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

interface ThemeModeToggleProps {
  variant?: "sidebar" | "header";
  className?: string;
}

export function ThemeModeToggle({ variant = "sidebar", className }: ThemeModeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation("common");
  const isDark = theme === "dark";
  const label = isDark ? t("theme.light") : t("theme.dark");

  if (variant === "header") {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        title={label}
        aria-label={label}
        className={cn(
          "w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-150 linqi-header-icon-btn",
          className,
        )}
      >
        {isDark ? (
          <Sun className="w-4 h-4" style={{ color: "var(--shell-text-secondary)" }} />
        ) : (
          <Moon className="w-4 h-4" style={{ color: "var(--shell-text-secondary)" }} />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={label}
      aria-label={label}
      className={cn(
        "w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all duration-200 linqi-sidebar-theme-btn",
        className,
      )}
    >
      <div className="w-[18px] h-[18px] shrink-0 flex items-center justify-center">
        {isDark ? (
          <Sun className="w-[18px] h-[18px]" style={{ color: "var(--terminal-accent)" }} />
        ) : (
          <Moon className="w-[18px] h-[18px]" style={{ color: "var(--terminal-accent)" }} />
        )}
      </div>
      <span
        className="truncate text-[13px] font-bold leading-none linqi-sidebar-label text-slate-900 dark:text-inherit"
        style={{ fontFamily: "Vazirmatn, sans-serif" }}
      >
        {label}
      </span>
    </button>
  );
}
