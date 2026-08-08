import type { businessRegistrationsTable } from "@workspace/db";

const BADGE_META: Record<string, { badge: string; color: string }> = {
  gold:    { badge: "زێڕین",  color: "#F59E0B" },
  silver:  { badge: "زیو",    color: "#94A3B8" },
  diamond: { badge: "دیمەنت", color: "#06B6D4" },
  natural: { badge: "سروشتی", color: "#6B7280" },
};

export function serializeSupplier(reg: typeof businessRegistrationsTable.$inferSelect) {
  const extra = (reg.extraData ?? {}) as Record<string, unknown>;
  const trustKey = String(extra.trustBadge ?? extra.badge ?? "silver").toLowerCase();
  const meta = BADGE_META[trustKey] ?? BADGE_META.silver;
  const products = Array.isArray(extra.products)
    ? (extra.products as unknown[]).map(String)
    : [];

  return {
    id: reg.id,
    name: reg.businessName,
    city: reg.city ?? reg.governorate ?? "",
    governorate: reg.governorate ?? "",
    address: reg.address ?? "",
    email: reg.email ?? "",
    sectorKey: reg.sectorKey,
    sectorGroup: reg.sectorGroup,
    phone: reg.mobile,
    verified: reg.status === "approved",
    rating: typeof extra.rating === "number" ? extra.rating : Number(extra.rating) || 0,
    deals: typeof extra.deals === "number" ? extra.deals : Number(extra.deals) || 0,
    badge: meta.badge,
    color: meta.color,
    products,
    submittedAt: reg.submittedAt?.toISOString?.() ?? null,
  };
}
