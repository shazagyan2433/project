import { Router, type IRouter } from "express";
import { db, usersTable, businessRegistrationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { signToken, requireAuth } from "../middlewares/auth";
import { assertValidRegistration, initialRegistrationStatus } from "../lib/registration-policy";

const router: IRouter = Router();

function mapUser(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    name: u.name,
    username: u.username,
    role: u.role,
    canViewProfit: u.canViewProfit,
    canDeleteData: u.canDeleteData,
    canEditStock: u.canEditStock,
    canAccessReports: u.canAccessReports,
    email: u.email ?? undefined,
    phone: u.phone ?? undefined,
    avatarUrl: u.avatarUrl ?? undefined,
    storeName: u.storeName ?? undefined,
    storeAddress: u.storeAddress ?? undefined,
    storeLat: u.storeLat ?? undefined,
    storeLng: u.storeLng ?? undefined,
    taxNumber: u.taxNumber ?? undefined,
  };
}


/* ─── POST /auth/register ── create account + instant login ─── */
router.post("/auth/register", async (req, res): Promise<void> => {
  try {
    const schema = z.object({
      username:     z.string().min(1),
      password:     z.string().min(6),
      name:         z.string().min(1),
      sectorKey:    z.string().min(1),
      sectorGroup:  z.string().min(1),
      businessName: z.string().min(1),
      email:        z.string().optional().default(""),
      mobile:       z.string().optional().default(""),
      governorate:  z.string().optional().default(""),
      city:         z.string().optional().default(""),
      address:      z.string().optional().default(""),
      extraData:    z.record(z.unknown()).optional(),
    });
    const body = schema.parse(req.body);

    assertValidRegistration({
      businessName: body.businessName,
      mobile: body.mobile,
      sectorKey: body.sectorKey,
      sectorGroup: body.sectorGroup,
    });

    // Check username uniqueness
    const [existing] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.username, body.username));
    if (existing) {
      res.status(409).json({ message: "ئەم بەکارهێنەرە پێشتر تۆمارکراوە" });
      return;
    }

    const passwordHash = await bcrypt.hash(body.password, 10);

    // Create user record
    const [user] = await db.insert(usersTable).values({
      name: body.name,
      username: body.username,
      passwordHash,
      role: "staff",
      email: body.email || null,
      phone: body.mobile || null,
      canViewProfit: true,
      canDeleteData: false,
      canEditStock: true,
      canAccessReports: true,
    }).returning();

    const extra =
      body.extraData && typeof body.extraData === "object"
        ? (body.extraData as Record<string, unknown>)
        : null;
    const storeLat = typeof extra?.storeLat === "number" ? extra.storeLat : null;
    const storeLng = typeof extra?.storeLng === "number" ? extra.storeLng : null;

    let profileUser = user;
    if (body.businessName || body.address || storeLat != null || storeLng != null) {
      const [updated] = await db
        .update(usersTable)
        .set({
          storeName: body.businessName || null,
          storeAddress: body.address || null,
          storeLat,
          storeLng,
          updatedAt: new Date(),
        })
        .where(eq(usersTable.id, user.id))
        .returning();
      if (updated) profileUser = updated;
    }

    const regStatus = initialRegistrationStatus(body.sectorGroup, body.sectorKey);
    await db.insert(businessRegistrationsTable).values({
      sectorKey:    body.sectorKey,
      sectorGroup:  body.sectorGroup,
      businessName: body.businessName,
      email:        body.email || null,
      mobile:       body.mobile || "",
      governorate:  body.governorate || null,
      city:         body.city || null,
      address:      body.address || null,
      extraData:    body.extraData ?? null,
      status:       regStatus,
      reviewedAt:   regStatus === "approved" ? new Date() : null,
      reviewedBy:   regStatus === "approved" ? "auto" : null,
    }).catch(() => { /* non-fatal */ });

    const token = signToken({
      userId: profileUser.id,
      username: profileUser.username,
      role: profileUser.role as "admin" | "staff",
      name: profileUser.name,
    });

    res.status(201).json({
      token,
      user: mapUser(profileUser),
      sectorKey: body.sectorKey,
      message: "ئەکاونت بە سەرکەوتوویی چالاککرا",
    });
  } catch (err) {
    req.log.error({ err }, "Registration failed");
    const message = err instanceof Error ? err.message : "داتاکان هەڵەن";
    res.status(400).json({ message });
  }
});

router.post("/auth/login", async (req, res): Promise<void> => {
  try {
    const schema = z.object({
      username: z.string().min(1),
      password: z.string().min(1),
    });
    const body = schema.parse(req.body);

    const [user] = await db.select().from(usersTable).where(eq(usersTable.username, body.username));
    if (!user) {
      res.status(401).json({ message: "ناوی بەکارهێنەر یان وشەی نهێنی هەڵەیە" });
      return;
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ message: "ناوی بەکارهێنەر یان وشەی نهێنی هەڵەیە" });
      return;
    }

    const token = signToken({
      userId: user.id,
      username: user.username,
      role: user.role as "admin" | "staff",
      name: user.name,
    });

    res.json({ token, user: mapUser(user) });
  } catch (err) {
    req.log.error({ err }, "Login failed");
    res.status(400).json({ message: "داتاکان هەڵەن" });
  }
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
    if (!user) { res.status(404).json({ message: "بەکارهێنەر نەدۆزرایەوە" }); return; }
    res.json(mapUser(user));
  } catch (err) {
    req.log.error({ err }, "Failed to get current user");
    res.status(500).json({ message: "هەڵەیەک ڕوویدا" });
  }
});

/* ─── PATCH /auth/me ── update own profile / company fields ─── */
router.patch("/auth/me", requireAuth, async (req, res): Promise<void> => {
  try {
    const schema = z.object({
      name:         z.string().min(1).optional(),
      username:     z.string().min(3).optional(),
      email:        z.string().optional(),
      phone:        z.string().optional(),
      avatarUrl:    z.string().optional(),
      storeName:    z.string().optional(),
      storeAddress: z.string().optional(),
      storeLat:     z.number().optional(),
      storeLng:     z.number().optional(),
      taxNumber:    z.string().optional(),
    });
    const body = schema.parse(req.body);

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name         !== undefined) updateData.name         = body.name;
    if (body.username     !== undefined) updateData.username     = body.username;
    if (body.email        !== undefined) updateData.email        = body.email || null;
    if (body.phone        !== undefined) updateData.phone        = body.phone || null;
    if (body.avatarUrl    !== undefined) updateData.avatarUrl    = body.avatarUrl || null;
    if (body.storeName    !== undefined) updateData.storeName    = body.storeName || null;
    if (body.storeAddress !== undefined) updateData.storeAddress = body.storeAddress || null;
    if (body.storeLat     !== undefined) updateData.storeLat     = body.storeLat ?? null;
    if (body.storeLng     !== undefined) updateData.storeLng     = body.storeLng ?? null;
    if (body.taxNumber    !== undefined) updateData.taxNumber    = body.taxNumber || null;

    const [updated] = await db
      .update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, req.user!.userId))
      .returning();

    if (!updated) { res.status(404).json({ message: "بەکارهێنەر نەدۆزرایەوە" }); return; }
    res.json(mapUser(updated));
  } catch (err: unknown) {
    req.log.error({ err }, "Failed to update own profile");
    if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "23505") {
      res.status(409).json({ message: "ئەم ناوی بەکارهێنەرە پێشتر تۆمارکراوە" });
      return;
    }
    res.status(400).json({ message: "داتاکان هەڵەن" });
  }
});

/* ─── PATCH /auth/me/password ── change own password ─── */
router.patch("/auth/me/password", requireAuth, async (req, res): Promise<void> => {
  try {
    const schema = z.object({
      currentPassword: z.string().min(1),
      newPassword:     z.string().min(6),
    });
    const { currentPassword, newPassword } = schema.parse(req.body);

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
    if (!user) { res.status(404).json({ message: "بەکارهێنەر نەدۆزرایەوە" }); return; }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      res.status(401).json({ message: "وشەی نهێنی ئێستا هەڵەیە" });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db.update(usersTable).set({ passwordHash, updatedAt: new Date() }).where(eq(usersTable.id, req.user!.userId));

    res.json({ message: "وشەی نهێنی بە سەرکەوتوویی گۆڕدرا" });
  } catch (err) {
    req.log.error({ err }, "Failed to change password");
    res.status(400).json({ message: "داتاکان هەڵەن" });
  }
});

/* ─── POST /auth/portal/session — JWT for portal drivers (delivery API) ─── */
router.post("/auth/portal/session", async (req, res): Promise<void> => {
  try {
    const schema = z.object({
      portalUserId: z.number().int().positive(),
      role: z.enum(["driver", "buyer", "supplier"]),
      name: z.string().min(1),
    });
    const body = schema.parse(req.body);

    if (body.role !== "driver") {
      res.status(403).json({ message: "Portal session only supported for drivers" });
      return;
    }

    const token = signToken({
      userId: body.portalUserId,
      username: `portal-driver-${body.portalUserId}`,
      role: "driver",
      name: body.name,
    });

    res.json({
      token,
      user: {
        id: body.portalUserId,
        name: body.name,
        username: `portal-driver-${body.portalUserId}`,
        role: "driver",
      },
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create portal session");
    res.status(400).json({ message: "داتاکان هەڵەن" });
  }
});

export default router;
