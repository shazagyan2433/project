import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireAdmin, requireAuth } from "../middlewares/auth";

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
    createdAt: u.createdAt,
  };
}

router.get("/users", requireAdmin, async (req, res): Promise<void> => {
  try {
    const users = await db.select().from(usersTable).orderBy(usersTable.name);
    res.json(users.map(mapUser));
  } catch (err) {
    req.log.error({ err }, "Failed to get users");
    res.status(500).json({ message: "هەڵەیەک ڕوویدا" });
  }
});

router.post("/users", requireAdmin, async (req, res): Promise<void> => {
  try {
    const schema = z.object({
      name: z.string().min(1),
      username: z.string().min(3),
      password: z.string().min(6),
      role: z.enum(["admin", "staff"]),
    });
    const body = schema.parse(req.body);
    const passwordHash = await bcrypt.hash(body.password, 12);

    const [user] = await db
      .insert(usersTable)
      .values({ name: body.name, username: body.username, passwordHash, role: body.role })
      .returning();

    res.status(201).json(mapUser(user));
  } catch (err: unknown) {
    req.log.error({ err }, "Failed to create user");
    if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "23505") {
      res.status(409).json({ message: "ئەم ناوی بەکارهێنەرە پێشتر تۆمارکراوە" });
      return;
    }
    res.status(400).json({ message: "داتاکان هەڵەن" });
  }
});

router.put("/users/:id", requireAdmin, async (req, res): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id));
    const schema = z.object({
      name: z.string().min(1).optional(),
      username: z.string().min(3).optional(),
      password: z.string().min(6).optional(),
      role: z.enum(["admin", "staff"]).optional(),
    });
    const body = schema.parse(req.body);

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name) updateData.name = body.name;
    if (body.username) updateData.username = body.username;
    if (body.password) updateData.passwordHash = await bcrypt.hash(body.password, 12);
    if (body.role) updateData.role = body.role;

    const [user] = await db.update(usersTable).set(updateData).where(eq(usersTable.id, id)).returning();
    if (!user) { res.status(404).json({ message: "بەکارهێنەر نەدۆزرایەوە" }); return; }
    res.json(mapUser(user));
  } catch (err: unknown) {
    req.log.error({ err }, "Failed to update user");
    if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "23505") {
      res.status(409).json({ message: "ئەم ناوی بەکارهێنەرە پێشتر تۆمارکراوە" });
      return;
    }
    res.status(400).json({ message: "داتاکان هەڵەن" });
  }
});

router.put("/users/:id/permissions", requireAdmin, async (req, res): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id));
    const schema = z.object({
      canViewProfit: z.boolean().optional(),
      canDeleteData: z.boolean().optional(),
      canEditStock: z.boolean().optional(),
      canAccessReports: z.boolean().optional(),
    });
    const body = schema.parse(req.body);

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.canViewProfit !== undefined) updateData.canViewProfit = body.canViewProfit;
    if (body.canDeleteData !== undefined) updateData.canDeleteData = body.canDeleteData;
    if (body.canEditStock !== undefined) updateData.canEditStock = body.canEditStock;
    if (body.canAccessReports !== undefined) updateData.canAccessReports = body.canAccessReports;

    const [user] = await db.update(usersTable).set(updateData).where(eq(usersTable.id, id)).returning();
    if (!user) { res.status(404).json({ message: "بەکارهێنەر نەدۆزرایەوە" }); return; }
    res.json(mapUser(user));
  } catch (err) {
    req.log.error({ err }, "Failed to update permissions");
    res.status(400).json({ message: "داتاکان هەڵەن" });
  }
});

router.delete("/users/:id", requireAdmin, async (req, res): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id));
    if (id === req.user!.userId) {
      res.status(400).json({ message: "ناتوانیت ئەکاونتی خۆت بسڕیتەوە" });
      return;
    }
    const [deleted] = await db.delete(usersTable).where(eq(usersTable.id, id)).returning();
    if (!deleted) { res.status(404).json({ message: "بەکارهێنەر نەدۆزرایەوە" }); return; }
    res.json({ message: "بەکارهێنەر سڕایەوە" });
  } catch (err) {
    req.log.error({ err }, "Failed to delete user");
    res.status(500).json({ message: "هەڵەیەک ڕوویدا" });
  }
});

router.get("/users/me", requireAuth, async (req, res): Promise<void> => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
    if (!user) { res.status(404).json({ message: "بەکارهێنەر نەدۆزرایەوە" }); return; }
    res.json(mapUser(user));
  } catch (err) {
    req.log.error({ err }, "Failed to get user");
    res.status(500).json({ message: "هەڵەیەک ڕوویدا" });
  }
});

export default router;
