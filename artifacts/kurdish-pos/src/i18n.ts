/**
 * LinQi i18n configuration
 * ─────────────────────────────────────────────────────────────────────────────
 * Namespaces:
 *   • translation  — legacy flat namespace (backward-compat, default)
 *   • common       — brand, nav, top, theme, role, shared UI strings
 *   • auth         — authentication, registration, onboarding, validation
 *   • supplier     — POS, products, customers, sales, debts, reports, B2B
 *
 * Usage:
 *   // Default (backward-compat) — existing code unchanged
 *   const { t } = useTranslation();
 *   t("nav.dashboard");
 *
 *   // Namespaced — new code / components
 *   const { t } = useTranslation("common");
 *   t("nav.dashboard");
 *
 *   const { t } = useTranslation("auth");
 *   t("validation.emailRequired");
 *
 *   const { t } = useTranslation("supplier");
 *   t("dashboard.totalSales");
 */

import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// ── Legacy flat translations (default namespace — zero breaking changes) ───────
import enFlat from "./locales/en.json";
import kuFlat from "./locales/ku.json";
import arFlat from "./locales/ar.json";

// ── Namespaced: common ────────────────────────────────────────────────────────
import enCommon from "./locales/en/common.json";
import arCommon from "./locales/ar/common.json";
import kuCommon from "./locales/ku/common.json";

// ── Namespaced: auth ──────────────────────────────────────────────────────────
import enAuth from "./locales/en/auth.json";
import arAuth from "./locales/ar/auth.json";
import kuAuth from "./locales/ku/auth.json";

// ── Namespaced: supplier ──────────────────────────────────────────────────────
import enSupplier from "./locales/en/supplier.json";
import arSupplier from "./locales/ar/supplier.json";
import kuSupplier from "./locales/ku/supplier.json";

// ── Namespaced: dashboard ─────────────────────────────────────────────────────
import enDashboard from "./locales/en/dashboard.json";
import arDashboard from "./locales/ar/dashboard.json";
import kuDashboard from "./locales/ku/dashboard.json";

// ── Namespaced: admin ─────────────────────────────────────────────────────────
import enAdmin from "./locales/en/admin.json";
import arAdmin from "./locales/ar/admin.json";
import kuAdmin from "./locales/ku/admin.json";

// ── Namespaced: ui (inventory modals, notifications, portals, etc.) ───────────
import enUi from "./locales/en/ui.json";
import arUi from "./locales/ar/ui.json";
import kuUi from "./locales/ku/ui.json";

// ─── Restore persisted language choice ────────────────────────────────────────
const savedLang = localStorage.getItem("linqi_lang") || "ku";

// ─── Initialise i18next ───────────────────────────────────────────────────────
i18n.use(initReactI18next).init({
  resources: {
    en: {
      translation: enFlat,     // legacy — default namespace
      common:      enCommon,
      auth:        enAuth,
      supplier:    enSupplier,
      dashboard:   enDashboard,
      admin:       enAdmin,
      ui:          enUi,
    },
    ku: {
      translation: kuFlat,
      common:      kuCommon,
      auth:        kuAuth,
      supplier:    kuSupplier,
      dashboard:   kuDashboard,
      admin:       kuAdmin,
      ui:          kuUi,
    },
    ar: {
      translation: arFlat,
      common:      arCommon,
      auth:        arAuth,
      supplier:    arSupplier,
      dashboard:   arDashboard,
      admin:       arAdmin,
      ui:          arUi,
    },
  },

  lng:        savedLang,
  fallbackLng: "ku",

  // Default namespace keeps all existing t("…") calls working unchanged
  defaultNS: "translation",

  // Namespaces available for useTranslation("ns") calls
  ns: ["translation", "common", "auth", "supplier", "dashboard", "admin", "ui"],

  // Cross-namespace fallback so missing keys resolve from common / translation
  fallbackNS: ["common", "translation"],

  interpolation: {
    escapeValue: false,  // React already escapes
  },
});

export default i18n;
