import { Router, type IRouter } from "express";
import { db, businessRegistrationsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

const BADGE_META: Record<string, { badge: string; color: string }> = {
  gold:    { badge: "زێڕین",  color: "#F59E0B" },
  silver:  { badge: "زیو",    color: "#94A3B8" },
  diamond: { badge: "دیمەنت", color: "#06B6D4" },
  natural: { badge: "سروشتی", color: "#6B7280" },
};

router.get("/suppliers", async (_req, res): Promise<void> => {
  try {
    const rows = await db
      .select()
      .from(businessRegistrationsTable)
      .where(eq(businessRegistrationsTable.status, "approved"))
      .orderBy(desc(businessRegistrationsTable.submittedAt));

    const suppliers = rows.map((reg) => {
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
        sectorKey: reg.sectorKey,
        sectorGroup: reg.sectorGroup,
        phone: reg.mobile,
        verified: reg.status === "approved",
        rating: typeof extra.rating === "number" ? extra.rating : Number(extra.rating) || 0,
        deals: typeof extra.deals === "number" ? extra.deals : Number(extra.deals) || 0,
        badge: meta.badge,
        color: meta.color,
        products,
      };
    });

    res.json(suppliers);
  } catch (err) {
    _req.log.error({ err }, "Failed to fetch suppliers");
    res.json([]);
  }
});

export default router;
