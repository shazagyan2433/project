---
name: Industry Context Refactor
description: Shared industry/sector module, typed sectorKey on AuthUser, sidebar nav filtering by sector, marketplace i18n and industry-aware product/category isolation.
---

## Rule
`src/lib/industries.ts` is the single source of truth for sector→category mappings and sector→nav feature sets. Never duplicate SECTOR_CATEGORY_MAP or NavFeatureKey lists in other files.

**Why:** Before this refactor, sector logic was split across register.tsx (SECTOR_CATEGORY_MAP), dashboard.tsx and dashboard-market.tsx ((user as any)?.sectorKey fallbacks), and layout.tsx (hardcoded links for all sectors). Centralizing prevents drift.

**How to apply:**
- Import `SECTOR_CATEGORY_MAP`, `CatKey`, `getSectorNavFeatures`, `NavFeatureKey` from `@/lib/industries`.
- `AuthUser.sectorKey?: string` — set by `register()` reading `linqi_sector` from localStorage; persisted in `pos_cached_user`. API-authenticated users (admin/staff) won't have it → sidebar shows all links (null → full access).
- `layout.tsx` computes `navFeatures = getSectorNavFeatures(isAdmin ? null : sectorKey)` in the Layout scope; `showNav(feat)` guards each B2B nav link.
- `marketplace.tsx` derives visible category chips from `SECTOR_CATEGORY_MAP[sectorKey]`; product `cat` fields are `CatKey` strings (not localized strings); `tCat(k)` maps to `t("marketplace.cats.k")`.
- All marketplace UI strings live under `marketplace.*` key in `common.json` (all three locales: en/ar/ku). Added via Node.js JSON parse/write script.
- Chart data keys use English internal keys (`sales`/`requests`) while recharts `dataKey` props reference those; month abbreviations in ANALYTICS_DATA remain Kurdish (static demo data).
- `dashboard.tsx` uses typed `user?.sectorKey` (no cast) now that AuthUser has the field.
