---
name: Global Dashboard Shell Refactor
description: Key decisions and patterns from the layout.tsx rewrite — collapsible sidebar, Cmd+K search, RTL-aware collapse icon, profile/quick-action dropdowns.
---

## Collapsible Sidebar
- Width animates via **inline style** (`style={{ width: collapsed ? "72px" : "256px", transition: "width 300ms ..." }}`), NOT Tailwind class swap — Tailwind discrete classes don't animate.
- Collapse state persisted to `localStorage` key `linqi_sidebar_collapsed`.
- `forceExpanded` prop on `SidebarContent` keeps the mobile drawer always expanded (collapsed only applies on desktop).
- When collapsed: NavLinks show icon only + `title` tooltip; SectionHeaders render a thin `<hr>`; Language/Theme customizer hidden; user card collapses to avatar + logout icon only.

## RTL-Aware Collapse Chevron
- MutationObserver watches `document.documentElement.dir` attribute → `isRTL` state.
- **Why:** In RTL, sidebar is on the RIGHT (first flex child in `dir="rtl"` flows right-to-left). Collapse arrow must point toward the sidebar edge.
- Formula: `collapsed ? (isRTL ? ChevronLeft : ChevronRight) : (isRTL ? ChevronRight : ChevronLeft)`

## TopHeader Features
- **Breadcrumb:** `useMemo` over `ROUTE_MAP` keyed by `location` → `{ label, parent? }`. Computes on location change.
- **Cmd/Ctrl+K:** `keydown` listener on `window`, calls `searchRef.current?.focus()`. `searchRef` created in `Layout`, passed as prop to `TopHeader`.
- **⌘K badge:** Shown in search input when blurred and empty; animates out on focus.
- **Quick action dropdown:** `+` button, opens dropdown with New RFQ/New Order/Find Supplier quick-nav links. Refs + click-outside handler for close.
- **Profile dropdown:** Click avatar → animated dropdown with user info + Settings + Logout. Uses same click-outside pattern.
- All three dropdowns (notif/quick/profile) are mutually exclusive — opening one closes others.

## Responsive Patterns
- Mobile top bar (< lg) includes its own search input — no dependency on desktop TopHeader.
- Main content: `overflow-x-hidden` on both the scroll container and `<main>`.
- Page content wrapper uses `clamp(1rem, 2.5vw, 1.75rem)` for fluid padding.
- `max-w-[1440px]` replaces `max-w-7xl` for wider display support.

## Inner Component Pattern
- `NavLink`, `SectionHeader`, `SidebarContent` are defined **inside** `Layout` to close over `location`, `t`, `isAdmin`, `setIsMobileMenuOpen`, `collapsed`, `isRTL`.
- This causes redefinition each render but is the existing pattern and acceptable for these small components.
- **Why not lift to module scope:** they need access to too many Layout-local values; a context would add complexity.
