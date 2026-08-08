/**
 * Shared Tailwind class strings for terminal-style pages.
 * Use alongside dashboard-tokens.ts CSS variables for inline colors.
 */

/** Soft dark-mode border — cards, chips, inputs */
const DARK_BORDER = "dark:border-slate-800/80";
const DARK_BORDER_SUBTLE = "dark:border-slate-800/60";

/** Primary page title — always readable in light + dark mode */
export const PAGE_TITLE = "text-slate-900 dark:text-slate-100 font-extrabold";

/** Page subtitle / description */
export const PAGE_SUBTITLE = "text-slate-700 dark:text-slate-300/80 text-xs font-medium";

/** Section heading */
export const PAGE_HEADING = "text-slate-900 dark:text-slate-100 font-bold";

/** Body text */
export const PAGE_BODY = "text-slate-900 dark:text-white/85";

/** Muted / secondary labels */
export const PAGE_MUTED = "text-slate-700 dark:text-slate-300";

/** Faint helper text */
export const PAGE_FAINT = "text-slate-700 dark:text-white/40";

/** Card / panel surface */
export const PAGE_SURFACE =
  `bg-white dark:bg-slate-900/60 border border-slate-200 ${DARK_BORDER} rounded-2xl shadow-sm dark:shadow-none`;

/** Compact surface (stat chips) */
export const PAGE_SURFACE_SM =
  `bg-white dark:bg-slate-900/50 border border-slate-200 ${DARK_BORDER} rounded-xl shadow-sm dark:shadow-none`;

/** Search / filter input */
export const PAGE_INPUT =
  "linqi-shell-input w-full rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 outline-none transition-all bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700";

/** Native select — solid surface, readable options in light mode */
export const PAGE_SELECT =
  `linqi-shell-select px-3 py-2.5 rounded-xl text-sm font-bold outline-none text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-950 border border-slate-200 ${DARK_BORDER} min-w-[140px] shadow-sm dark:shadow-none`;

/** Table header cell */
export const PAGE_TH =
  "text-start px-4 py-3.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-500";

/** Table row border */
export const PAGE_TR_BORDER =
  `border-b border-gray-100 ${DARK_BORDER_SUBTLE} hover:bg-slate-50 dark:hover:bg-slate-800/25 transition-colors`;

/** Filter chip inactive */
export const PAGE_CHIP =
  "px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border " +
  "bg-slate-100 text-slate-900 border-slate-200 hover:bg-slate-200/60 dark:bg-slate-800/90 dark:text-slate-100 dark:border-slate-700";

/** Inactive tab / filter chip — high contrast in dark mode */
export const PAGE_CHIP_INACTIVE =
  "border bg-slate-100 text-slate-900 border-slate-200 hover:bg-slate-200/60 dark:bg-slate-800/90 dark:text-slate-100 dark:border-slate-700";

export const PAGE_CHIP_ACTIVE_BLUE =
  "border bg-blue-500/15 text-blue-700 border-blue-500/40 dark:text-blue-300";

export const PAGE_CHIP_ACTIVE_GREEN =
  "border bg-emerald-500/15 text-emerald-700 border-emerald-500/40 dark:text-emerald-300";

export const PAGE_CHIP_ACTIVE_PURPLE =
  "border bg-violet-500/15 text-violet-700 border-violet-500/40 dark:text-violet-300";

export const PAGE_CHIP_ACTIVE_CYAN =
  "border bg-cyan-500/15 text-cyan-700 border-cyan-500/40 dark:text-cyan-300";

/** Product / card typography */
export const PAGE_CARD_TITLE = "text-slate-900 dark:text-white font-extrabold";
export const PAGE_CARD_DETAIL = "text-slate-700 dark:text-slate-300";
export const PAGE_CARD_LABEL = "text-slate-700 dark:text-slate-400 font-medium";

/** Icon on light surface */
export const PAGE_ICON = "text-slate-700 dark:text-slate-500";

/** Modal overlay panel */
export const PAGE_MODAL =
  `linqi-page-modal bg-white dark:bg-slate-900 border border-slate-200 ${DARK_BORDER} rounded-2xl shadow-xl dark:shadow-none`;

/** Modal header row — border only, inherits panel background */
export const PAGE_MODAL_HEADER =
  "flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0";

/** Modal footer — seamless with body; no contrasting background strip */
export const PAGE_MODAL_FOOTER =
  "linqi-modal-footer flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 shrink-0";

/* ── RFQ / price-request forms (modal + inline) ─────────────────── */

/** Dialog shell — solid surfaces, no terminal tint */
export const RFQ_MODAL_PANEL =
  "bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-xl text-gray-900 dark:text-slate-100";

/** Inline RFQ card on procurement page */
export const RFQ_INLINE_PANEL =
  "bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-sm dark:shadow-none";

export const RFQ_FIELD_LABEL =
  "text-[10px] font-bold uppercase tracking-wider block mb-1.5 text-gray-500 dark:text-slate-400";

export const RFQ_FIELD_INPUT =
  "w-full px-3 py-2 rounded-xl text-sm outline-none transition-[border-color,box-shadow] " +
  "bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 " +
  "border border-gray-300 dark:border-slate-700 " +
  "placeholder:text-gray-400 dark:placeholder:text-slate-500 " +
  "focus:border-blue-500 dark:focus:border-blue-400/55 focus:ring-2 focus:ring-blue-500/15 dark:focus:ring-blue-400/10";

export const RFQ_SUPPLIER_PANEL =
  "flex flex-wrap gap-2 max-h-28 overflow-y-auto p-3 rounded-xl " +
  "border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/80";

export const RFQ_SUPPLIER_CHIP =
  "flex items-center gap-1.5 text-xs text-gray-700 dark:text-slate-300 cursor-pointer px-2 py-1 rounded-lg " +
  "hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors";

export const RFQ_HINT_BOX =
  "text-xs px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-800 " +
  "bg-gray-50 dark:bg-slate-950 text-gray-500 dark:text-slate-400";

export const RFQ_BTN_CANCEL =
  "flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors " +
  "text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 " +
  "bg-transparent hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 " +
  "disabled:opacity-50 disabled:pointer-events-none";

export const RFQ_MODAL_SUBTITLE = "text-xs text-gray-500 dark:text-slate-400";

export const RFQ_MODAL_TITLE = "text-lg font-extrabold text-gray-900 dark:text-slate-100";

/** Inline table/category tag */
export const PAGE_TAG =
  `text-[11px] font-medium px-2 py-1 rounded-lg whitespace-nowrap bg-slate-100 dark:bg-slate-900/80 text-slate-700 dark:text-slate-400 border border-slate-200 ${DARK_BORDER}`;

/** Monospace chip (barcode, SKU) */
export const PAGE_TAG_MONO =
  `font-mono text-[10px] px-2 py-1 rounded-lg flex items-center gap-1 w-fit bg-slate-100 dark:bg-slate-900/80 text-slate-700 dark:text-slate-400 border border-slate-200 ${DARK_BORDER}`;

/* ── Success / emerald action buttons ───────────────────────────── */

const BTN_SUCCESS_BASE =
  "linqi-btn-success inline-flex items-center justify-center gap-2 rounded-xl font-bold " +
  "transition-all duration-200 ease-out active:scale-[0.98] " +
  "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md hover:shadow-lg " +
  "dark:bg-emerald-500/20 dark:text-emerald-300 dark:border dark:border-emerald-500/30 " +
  "dark:hover:bg-emerald-500/30 dark:shadow-[0_0_20px_rgba(16,185,129,0.12)] " +
  "dark:hover:shadow-[0_0_24px_rgba(16,185,129,0.22)] " +
  "disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none";

/** Primary green CTA — header actions, add/create */
export const PAGE_BTN_SUCCESS = `${BTN_SUCCESS_BASE} px-4 py-2.5 text-sm`;

/** Modal submit / full-width save */
export const PAGE_BTN_SUCCESS_LG = `${BTN_SUCCESS_BASE} flex-1 py-3 text-sm font-extrabold`;

/** Compact inline action (approve, manage) */
export const PAGE_BTN_SUCCESS_XS = `${BTN_SUCCESS_BASE} px-3 py-1.5 text-xs rounded-xl`;

/** Dashed upload / secondary success outline */
export const PAGE_BTN_SUCCESS_OUTLINE =
  "linqi-btn-success-outline inline-flex items-center justify-center gap-2 rounded-xl text-sm font-bold " +
  "transition-all duration-200 ease-out active:scale-[0.98] " +
  "border-2 border-dashed border-emerald-300 bg-emerald-50 text-emerald-700 " +
  "hover:bg-emerald-100 hover:border-emerald-400 " +
  "dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300 " +
  "dark:hover:bg-emerald-500/20 dark:hover:border-emerald-500/50";

/** Ghost / cancel secondary — modal close & cancel actions */
export const PAGE_BTN_GHOST =
  "linqi-btn-ghost inline-flex items-center justify-center gap-2 rounded-xl text-sm font-bold " +
  "transition-all duration-200 ease-out active:scale-[0.98] " +
  "text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 " +
  "bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60 px-4 py-2.5";

export const PAGE_BTN_GHOST_LG = `${PAGE_BTN_GHOST} px-6 py-3`;

/** Icon-only utility (refresh, etc.) */
export const PAGE_BTN_ICON =
  "linqi-btn-icon w-9 h-9 rounded-xl flex items-center justify-center " +
  "transition-all duration-200 ease-out active:scale-[0.95] " +
  "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200/60 hover:text-slate-900 " +
  `dark:bg-slate-900/80 dark:text-slate-500 ${DARK_BORDER} dark:hover:bg-slate-800/60 dark:hover:text-slate-300`;

/* ── Status badges ─────────────────────────────────────────────── */

export const PAGE_BADGE_SUCCESS =
  "linqi-badge-success inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap " +
  "bg-emerald-100 text-emerald-800 border border-emerald-200 " +
  "dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30";

export const PAGE_BADGE_WARNING =
  "linqi-badge-warning inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap " +
  "bg-amber-100 text-amber-800 border border-amber-200 " +
  "dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30";

export const PAGE_BADGE_DANGER =
  "linqi-badge-danger inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap " +
  "bg-red-100 text-red-800 border border-red-200 " +
  "dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30";

export const PAGE_BADGE_INFO =
  "linqi-badge-info inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap " +
  "bg-blue-100 text-blue-800 border border-blue-200 " +
  "dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30";

/** High-contrast success text (prices, metrics) */
export const PAGE_TEXT_SUCCESS = "text-emerald-600 dark:text-emerald-400 font-bold tabular-nums";

/** Success icon container — page headers */
export const PAGE_ICON_SUCCESS =
  "linqi-icon-success w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 " +
  "bg-emerald-100 text-emerald-600 border border-emerald-200 " +
  "dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30";

export const PAGE_ICON_SUCCESS_SM =
  "linqi-icon-success w-8 h-8 rounded-xl flex items-center justify-center shrink-0 " +
  "bg-emerald-100 text-emerald-600 border border-emerald-200 " +
  "dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30";

/** KPI / stat icon tile */
export const PAGE_STAT_ICON_SUCCESS =
  "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400";

export const PAGE_STAT_ICON_WARNING =
  "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400";

export const PAGE_STAT_ICON_DANGER =
  "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400";

export const PAGE_STAT_ICON_INFO =
  "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400";

/** Accent label under KPI values */
export const PAGE_STAT_LABEL_SUCCESS = "text-emerald-600 dark:text-emerald-400 font-semibold text-[10px]";
