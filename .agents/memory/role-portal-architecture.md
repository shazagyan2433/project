---
name: Role Portal Architecture
description: How role-specific dashboards are structured (supplier/buyer/driver portals with tab navigation)
---

## Rule
Role portals (Supplier, Buyer, Driver) use a wrapper-page approach: each has a `*-portal.tsx` that imports the original page as the "default" tab and adds extra tab panels. A fixed bottom `RoleTabBar` provides navigation.

**Why:** The original role pages (supplier-catalog.tsx, buyer-dashboard.tsx, driver-dashboard.tsx) are 1000+ lines each with their own full-page layouts. Modifying them inline risked breaking existing styling. Portal wrappers keep those files untouched except for one `paddingBottom: "72px"` addition to their root divs (to prevent the fixed tab bar from covering content).

**How to apply:**
- Add new tabs to portals by editing `*-portal.tsx` — never touch the original role page for tab structure.
- The `paddingBottom: "72px"` on the root div of each original role page is intentional; do not remove it.
- `RoleTabBar` uses roving tabindex + ArrowLeft/Right keyboard nav (WCAG 2.2 AA).
- `SkeletonLoader.tsx` exports: MetricSkeleton, ChartSkeleton, TableRowSkeleton, ActivityItemSkeleton, ProductCardSkeleton, WidgetSkeleton.
- `PriorityWidgets.tsx` auto-hides when all insights are dismissed and all tasks completed.

## File map
- `src/components/RoleTabBar.tsx` — fixed bottom tab bar, WCAG keyboard nav
- `src/components/SkeletonLoader.tsx` — animate-pulse skeleton components
- `src/components/PriorityWidgets.tsx` — AI insights + pending tasks widget
- `src/pages/supplier-portal.tsx` — Supplier portal (Products/Orders/Inventory/Analytics/Finance)
- `src/pages/buyer-portal.tsx` — Buyer portal (Marketplace/Orders/Payments/Profile)
- `src/pages/driver-portal.tsx` — Driver portal (Deliveries/History/Earnings)
- `src/pages/dashboard.tsx` — Admin dashboard with AdminQuickNav + PriorityWidgets header
