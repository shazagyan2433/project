import { Router, type IRouter } from "express";
import { db, businessRegistrationsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

const submitSchema = z.object({
  sectorKey: z.string().min(1),
  sectorGroup: z.string().min(1),
  businessName: z.string().min(1),
  email: z.string().optional(),
  mobile: z.string().optional(),
  governorate: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  extraData: z.record(z.unknown()).optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  name: z.string().optional(),
});

function serializeRow(row: typeof businessRegistrationsTable.$inferSelect) {
  return {
    ...row,
    submittedAt:
      row.submittedAt instanceof Date ? row.submittedAt.toISOString() : row.submittedAt,
    reviewedAt:
      row.reviewedAt instanceof Date ? row.reviewedAt.toISOString() : row.reviewedAt ?? undefined,
  };
}

/* ─── POST /verifications — public onboarding submit ─── */
router.post("/verifications", async (req, res): Promise<void> => {
  try {
    const body = submitSchema.parse(req.body);
    const extra: Record<string, unknown> = { ...(body.extraData ?? {}) };
    if (body.username) extra.username = body.username;
    if (body.name) extra.name = body.name;
    if (body.password) extra.hasCredentials = true;

    const [reg] = await db
      .insert(businessRegistrationsTable)
      .values({
        sectorKey: body.sectorKey,
        sectorGroup: body.sectorGroup,
        businessName: body.businessName,
        email: body.email,
        mobile: body.mobile ?? "",
        governorate: body.governorate,
        city: body.city,
        address: body.address,
        extraData: extra,
        status: "approved",
        reviewedAt: new Date(),
        reviewedBy: "auto",
      })
      .returning();

    res.status(201).json(serializeRow(reg));
  } catch (err) {
    req.log.error({ err }, "Failed to submit verification");
    res.status(400).json({ message: "داتاکان هەڵەن" });
  }
});

/* ─── GET /verifications — admin queue ─── */
router.get("/verifications", requireAdmin, async (req, res): Promise<void> => {
  try {
    const rows = await db
      .select()
      .from(businessRegistrationsTable)
      .orderBy(desc(businessRegistrationsTable.submittedAt));
    res.json(rows.map(serializeRow));
  } catch (err) {
    req.log.error({ err }, "Failed to fetch verifications");
    res.status(500).json({ message: "هەڵەیەک ڕوویدا" });
  }
});

/* ─── PATCH /verifications/:id/status — admin review ─── */
router.patch("/verifications/:id/status", requireAdmin, async (req, res): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id));
    const schema = z.object({
      status: z.enum(["pending", "approved", "rejected", "suspended", "more_docs_needed"]),
      rejectionReason: z.string().optional(),
      trustBadge: z.string().optional(),
    });
    const body = schema.parse(req.body);

    const [existing] = await db
      .select()
      .from(businessRegistrationsTable)
      .where(eq(businessRegistrationsTable.id, id));
    if (!existing) {
      res.status(404).json({ message: "داواکاری نەدۆزرایەوە" });
      return;
    }

    const updatedExtra = body.trustBadge
      ? { ...(existing.extraData as Record<string, unknown> ?? {}), trustBadge: body.trustBadge }
      : existing.extraData;

    const [reg] = await db
      .update(businessRegistrationsTable)
      .set({
        status: body.status,
        rejectionReason: body.rejectionReason ?? null,
        extraData: updatedExtra,
        reviewedAt: new Date(),
        reviewedBy: req.user?.name ?? req.user?.username,
      })
      .where(eq(businessRegistrationsTable.id, id))
      .returning();

    res.json(serializeRow(reg));
  } catch (err) {
    req.log.error({ err }, "Failed to update verification status");
    res.status(400).json({ message: "داتاکان هەڵەن" });
  }
});

export default router;
