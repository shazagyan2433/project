import { Router, type IRouter } from "express";
import { db, businessRegistrationsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "../middlewares/auth";
import { assertValidRegistration, initialRegistrationStatus } from "../lib/registration-policy";

const router: IRouter = Router();

/* ─── POST /registrations ─── public (no auth — new businesses register) ── */
router.post("/registrations", async (req, res): Promise<void> => {
  try {
    const schema = z.object({
      sectorKey:    z.string().min(1),
      sectorGroup:  z.string().min(1),
      businessName: z.string().min(1),
      email:        z.string().optional(),
      mobile:       z.string().optional(),
      governorate:  z.string().optional(),
      city:         z.string().optional(),
      address:      z.string().optional(),
      extraData:    z.record(z.unknown()).optional(),
    });
    const body = schema.parse(req.body);

    assertValidRegistration({
      businessName: body.businessName,
      mobile: body.mobile,
      sectorKey: body.sectorKey,
      sectorGroup: body.sectorGroup,
    });

    const regStatus = initialRegistrationStatus(body.sectorGroup, body.sectorKey);
    const [reg] = await db
      .insert(businessRegistrationsTable)
      .values({
        sectorKey:    body.sectorKey,
        sectorGroup:  body.sectorGroup,
        businessName: body.businessName,
        email:        body.email,
        mobile:       body.mobile ?? "",
        governorate:  body.governorate,
        city:         body.city,
        address:      body.address,
        extraData:    body.extraData ?? {},
        status:       regStatus,
        reviewedAt:   regStatus === "approved" ? new Date() : null,
        reviewedBy:   regStatus === "approved" ? "auto" : null,
      })
      .returning();
    res.status(201).json(reg);
  } catch (err) {
    req.log.error({ err }, "Failed to submit registration");
    const message = err instanceof Error ? err.message : "داتاکان هەڵەن";
    res.status(400).json({ message });
  }
});

/* ─── GET /admin/registrations ─── admin only ─────────────────────── */
router.get("/admin/registrations", requireAdmin, async (req, res): Promise<void> => {
  try {
    const rows = await db
      .select()
      .from(businessRegistrationsTable)
      .orderBy(desc(businessRegistrationsTable.submittedAt));
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch registrations");
    res.status(500).json({ message: "هەڵەیەک ڕوویدا" });
  }
});

/* ─── PATCH /admin/registrations/:id/status ─── admin only ─────────── */
router.patch("/admin/registrations/:id/status", requireAdmin, async (req, res): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id));
    const schema = z.object({
      status: z.enum(["pending", "approved", "rejected", "suspended", "more_docs_needed"]),
      rejectionReason: z.string().optional(),
      trustBadge: z.string().optional(),
    });
    const body = schema.parse(req.body);

    // Fetch existing to merge trustBadge into extraData
    const [existing] = await db
      .select()
      .from(businessRegistrationsTable)
      .where(eq(businessRegistrationsTable.id, id));
    if (!existing) { res.status(404).json({ message: "داواکاری نەدۆزرایەوە" }); return; }

    const updatedExtra = body.trustBadge
      ? { ...(existing.extraData as Record<string, unknown> ?? {}), trustBadge: body.trustBadge }
      : existing.extraData;

    const [reg] = await db
      .update(businessRegistrationsTable)
      .set({
        status:          body.status,
        rejectionReason: body.rejectionReason ?? null,
        extraData:       updatedExtra,
        reviewedAt:      new Date(),
        reviewedBy:      req.user?.name ?? req.user?.username,
      })
      .where(eq(businessRegistrationsTable.id, id))
      .returning();
    res.json(reg);
  } catch (err) {
    req.log.error({ err }, "Failed to update registration status");
    res.status(400).json({ message: "داتاکان هەڵەن" });
  }
});

export default router;
