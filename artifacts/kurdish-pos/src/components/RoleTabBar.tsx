/* ─────────────────────────────────────────────────────────────────
   ROLE TAB BAR
   Fixed bottom navigation for role-specific portals.
   WCAG 2.2 AA: role="tablist", role="tab", aria-selected,
   ArrowLeft/Right keyboard navigation, focus-visible ring.
──────────────────────────────────────────────────────────────── */
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

export interface RoleTab {
  id: string;
  /** English label (fallback) */
  label: string;
  /** Kurdish Sorani */
  labelKu: string;
  /** Arabic */
  labelAr: string;
  Icon: LucideIcon;
  /** Optional notification count */
  badge?: number;
}

interface RoleTabBarProps {
  tabs: RoleTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  accentColor?: string;
  lang?: string;
}

export function RoleTabBar({
  tabs,
  activeTab,
  onTabChange,
  accentColor = "#3b82f6",
  lang = "ku",
}: RoleTabBarProps) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const activeIndex = tabs.findIndex(t => t.id === activeTab);

  const getLabel = (tab: RoleTab) => {
    if (lang === "ar") return tab.labelAr;
    if (lang === "en") return tab.label;
    return tab.labelKu;
  };

  /* Roving tabindex keyboard navigation (WCAG 2.2 § 4.1.2) */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const focused = document.activeElement;
      const isOnTab = tabRefs.current.some(r => r === focused);
      if (!isOnTab) return;

      const len = tabs.length;
      let next = activeIndex;

      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        next = (activeIndex + 1) % len;
        e.preventDefault();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        next = (activeIndex - 1 + len) % len;
        e.preventDefault();
      } else if (e.key === "Home") {
        next = 0;
        e.preventDefault();
      } else if (e.key === "End") {
        next = len - 1;
        e.preventDefault();
      }

      if (next !== activeIndex) {
        onTabChange(tabs[next].id);
        tabRefs.current[next]?.focus();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeIndex, tabs, onTabChange]);

  return (
    <nav
      role="tablist"
      aria-label="Role navigation"
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around"
      style={{
        background: "rgba(2,12,28,0.94)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 -4px 32px rgba(0,0,0,0.45)",
        height: "64px",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {tabs.map((tab, i) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            ref={el => { tabRefs.current[i] = el; }}
            role="tab"
            id={`roletab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`rolepanel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onTabChange(tab.id)}
            className={[
              "relative flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent",
            ].join(" ")}
            style={{
              flex: 1,
              color: isActive ? accentColor : "rgba(100,116,139,0.75)",
              minWidth: 0,
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {/* Active pill indicator */}
            {isActive && (
              <motion.span
                layoutId="roletab-indicator"
                className="absolute inset-0 rounded-xl"
                style={{
                  background: `${accentColor}18`,
                  border: `1px solid ${accentColor}35`,
                }}
                transition={{ type: "spring", bounce: 0.18, duration: 0.32 }}
                aria-hidden="true"
              />
            )}

            {/* Icon + badge */}
            <span className="relative z-10 flex items-center justify-center w-5 h-5">
              <tab.Icon className="w-[18px] h-[18px]" aria-hidden="true" />
              {(tab.badge ?? 0) > 0 && (
                <span
                  className="absolute -top-1 -end-1.5 min-w-[14px] h-3.5 px-0.5 rounded-full text-[8px] font-extrabold flex items-center justify-center"
                  style={{ background: accentColor, color: "#fff" }}
                  aria-label={`${tab.badge} notifications`}
                >
                  {tab.badge! > 9 ? "9+" : tab.badge}
                </span>
              )}
            </span>

            {/* Label */}
            <span className="relative z-10 text-[9px] font-bold leading-none truncate w-full text-center px-1">
              {getLabel(tab)}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
