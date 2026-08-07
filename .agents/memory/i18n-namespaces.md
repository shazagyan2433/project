---
name: i18n Namespace System
description: LinQi multilingual system — namespace layout, locale files, helpers, and LanguageSwitcher component.
---

## Rule
The i18n system uses 4 namespaces loaded in src/i18n.ts:
- translation — legacy flat namespace (default; zero breaking changes to existing code)
- common — brand, nav, top, theme, role, shared UI strings
- auth — login, register, onboarding, verify, validation messages
- supplier — POS, products, customers, sales, debts, reports, B2B features

## Locale file structure
src/locales/{en,ar,ku}.json               ← legacy flat (translation ns)
src/locales/en/{common,auth,supplier}.json
src/locales/ar/{common,auth,supplier}.json
src/locales/ku/{common,auth,supplier}.json

## Key files
- src/i18n.ts — initialises all 4 namespaces; restores from localStorage "linqi_lang"
- src/lib/i18n-helpers.ts — formatDate, formatNumber, formatCurrency, formatCurrencyCompact, formatTime, formatRelativeTime, toEasternNumerals, getDirection, VALIDATION_MESSAGES
- src/components/LanguageSwitcher.tsx — Framer Motion dropdown (variant="header"|"sidebar"); exports applyLanguage(code) for non-React contexts

## Kurdish date format
"١٤ی تەمموزی ٢٠٢٦" — Eastern Arabic-Indic numerals + ezafe "ی" + Sorani month names (KU_MONTHS map in i18n-helpers.ts)

## Arabic date format
Intl.DateTimeFormat('ar-IQ', { year:'numeric', month:'long', day:'numeric' })

## Currency
en: "IQD 250,000"  |  ar/ku: "٢٥٠٬٠٠٠ د.ع"  — formatCurrency(amount, "IQD", locale)

**Why:** Old flat namespace had ~1000 keys in one file. Splitting into common/auth/supplier adds structure without any migration cost — all existing t() calls continue to work on the default "translation" namespace.

**How to apply:** New components use useTranslation("common"), useTranslation("auth"), or useTranslation("supplier"). Existing components keep useTranslation() unchanged.
