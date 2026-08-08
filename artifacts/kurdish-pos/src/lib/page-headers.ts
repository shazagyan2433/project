import { useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";

/** Canonical page ids — align with sidebar nav and route breadcrumbs. */
export type PageHeaderId =
  | "dashboard"
  | "marketplace"
  | "inventory"
  | "procurement"
  | "suppliers"
  | "marketIntel"
  | "logistics"
  | "financial"
  | "negotiation"
  | "aiAssistant"
  | "notifications"
  | "rewards"
  | "products"
  | "customers"
  | "pos"
  | "sales"
  | "debts"
  | "reports"
  | "history"
  | "settings";

type PageHeaderConfig = {
  titleKey: string;
  descriptionKey?: string;
  parentKey?: string;
};

/** Title + description translation keys for each page (no sector interpolation). */
export const PAGE_HEADERS: Record<PageHeaderId, PageHeaderConfig> = {
  dashboard:       { titleKey: "nav.dashboard",          descriptionKey: "pageDescriptions.dashboard" },
  marketplace:     { titleKey: "nav.marketplace",        descriptionKey: "pageDescriptions.marketplace",     parentKey: "nav.b2bTerminal" },
  inventory:       { titleKey: "nav.inventory",          descriptionKey: "pageDescriptions.inventory",       parentKey: "nav.b2bTerminal" },
  logistics:       { titleKey: "nav.logistics",          descriptionKey: "pageDescriptions.logistics",       parentKey: "nav.b2bTerminal" },
  negotiation:     { titleKey: "nav.negotiation",        descriptionKey: "pageDescriptions.negotiation",     parentKey: "nav.b2bTerminal" },
  financial:       { titleKey: "nav.financial",          descriptionKey: "pageDescriptions.financial",       parentKey: "nav.b2bTerminal" },
  marketIntel:     { titleKey: "nav.marketIntel",        descriptionKey: "pageDescriptions.marketIntel",     parentKey: "nav.b2bTerminal" },
  suppliers:       { titleKey: "nav.supplierDirectory",  descriptionKey: "pageDescriptions.suppliers",       parentKey: "nav.b2bTerminal" },
  procurement:     { titleKey: "nav.procurement",        descriptionKey: "pageDescriptions.procurement",     parentKey: "nav.b2bTerminal" },
  aiAssistant:     { titleKey: "nav.linqiAssistant",     descriptionKey: "pageDescriptions.aiAssistant",     parentKey: "nav.b2bTerminal" },
  notifications:   { titleKey: "nav.notificationCenter", parentKey: "nav.tools" },
  rewards:         { titleKey: "nav.rewardsCenter",      parentKey: "nav.tools" },
  products:        { titleKey: "nav.products" },
  customers:       { titleKey: "nav.customers" },
  pos:             { titleKey: "nav.pos" },
  sales:           { titleKey: "nav.sales" },
  debts:           { titleKey: "nav.debts" },
  reports:         { titleKey: "nav.reports" },
  history:         { titleKey: "nav.history" },
  settings:        { titleKey: "nav.settings",           descriptionKey: "pageDescriptions.settings" },
};

/** Route path → page id for breadcrumbs and document titles. */
export const ROUTE_TO_PAGE: Record<string, PageHeaderId> = {
  "/":                   "dashboard",
  "/dashboard":          "dashboard",
  "/marketplace":        "marketplace",
  "/ai-assistant":       "aiAssistant",
  "/inventory":          "inventory",
  "/logistics":          "logistics",
  "/negotiation":        "negotiation",
  "/financial":          "financial",
  "/market-intel":       "marketIntel",
  "/supplier-directory": "suppliers",
  "/procurement":        "procurement",
  "/notifications":      "notifications",
  "/rewards":            "rewards",
  "/products":           "products",
  "/customers":          "customers",
  "/pos":                "pos",
  "/sales":              "sales",
  "/debts":              "debts",
  "/reports":            "reports",
  "/history":            "history",
  "/settings":           "settings",
};

export function normalizeRoutePath(pathname: string): string {
  const base = pathname.split("?")[0].split("#")[0] || "/";
  if (base.length > 1 && base.endsWith("/")) return base.slice(0, -1);
  return base;
}

export function resolvePageHeaderId(pathname: string): PageHeaderId | null {
  const path = normalizeRoutePath(pathname);
  if (path.startsWith("/marketplace/seller/")) return "suppliers";
  return ROUTE_TO_PAGE[path] ?? null;
}

/** Localized page title + description — matches sidebar labels, no sector suffix. */
export function usePageHeader(id: PageHeaderId) {
  const { t } = useTranslation("common");
  const config = PAGE_HEADERS[id];

  return useMemo(() => ({
    title: t(config.titleKey),
    description: config.descriptionKey ? t(config.descriptionKey) : "",
    parent: config.parentKey ? t(config.parentKey) : undefined,
  }), [t, id, config.titleKey, config.descriptionKey, config.parentKey]);
}

/** Breadcrumb label for the top shell header. */
export function useRouteBreadcrumb(pathname: string) {
  const normalized = normalizeRoutePath(pathname);
  const pageId = resolvePageHeaderId(normalized);
  const header = usePageHeader(pageId ?? "dashboard");

  return useMemo(() => {
    if (pageId) {
      return { label: header.title, parent: header.parent };
    }
    const segment = normalized.replace(/^\//, "").split("/")[0] ?? "";
    return { label: segment || header.title };
  }, [pageId, header.title, header.parent, normalized]);
}

/** Keep browser tab title in sync with the active page. */
export function useDocumentPageTitle(pathname: string) {
  const { label } = useRouteBreadcrumb(pathname);

  useEffect(() => {
    document.title = label ? `${label} · LinQi` : "LinQi";
  }, [label]);
}
