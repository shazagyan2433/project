---
name: Register Refactor
description: Details on the sector-driven 3-step registration flow and its constraints
---

## Architecture
- `artifacts/kurdish-pos/src/pages/register.tsx` — complete rewrite; data-driven `SECTORS` array (11 entries), 4 group types: enterprise/retail/delivery/standard
- Pending review stored in localStorage key `pos_pending_review` as `{ sectorKey, businessName, submittedAt }`. Checked on mount; if present, shows PendingReviewScreen instead of form.
- No AuthContext changes required — pending users never get a user object.

## Step flow
1. Sector grid (pick 1 of 11)
2. Dynamic details form (fields vary by group)
3. Dynamic uploads (docs vary by group)
4. Submit → PendingReviewScreen (persisted via localStorage)

## Locale editing constraint
**Why:** The `edit` tool fails on RTL Unicode locale files (Kurdish/Arabic characters cause non-unique match errors).
**How to apply:** Always update locale `onboard` sections using Node.js: `node -e "const fs=require('fs'); ... JSON.parse/JSON.stringify"` pattern.

## Group → field mapping
- `enterprise` (distributor, manufacturer): company name, license#, manager, email, mobile, whatsapp, country/gov/city, GPS, product categories, brands, capacity, delivery area
- `retail` (supermarket, restaurant, hotel): business name, manager, email, mobile, GPS, lead-time slider
- `delivery`: company name, reg#, mobile, national ID, truck sizes (checkboxes), coverage area, num trucks
- `standard` (hospital, retail_shop, pharmacy, office, other): business name, manager, email, mobile, GPS
