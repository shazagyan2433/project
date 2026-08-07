import { Router, type IRouter } from "express";
import { db, customersTable, debtsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

router.get("/customers", async (req, res): Promise<void> => {
  try {
    const customers = await db.select().from(customersTable).orderBy(customersTable.name);
    const result = [];
    for (const c of customers) {
      const debts = await db
        .select({ total: sql<string>`coalesce(sum(${debtsTable.remainingAmount}), 0)` })
        .from(debtsTable)
        .where(eq(debtsTable.customerId, c.id));
      const totalDebt = parseFloat(debts[0]?.total ?? "0");
      result.push({
        id: c.id,
        name: c.name,
        phone: c.phone,
        address: c.address,
        totalDebt,
        createdAt: c.createdAt,
      });
    }
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to get customers");
    res.status(500).json({ message: "هەڵەیەک ڕوویدا" });
  }
});

router.post("/customers", async (req, res): Promise<void> => {
  try {
    const schema = z.object({
      name: z.string().min(1),
      phone: z.string().min(1),
      address: z.string().optional(),
    });
    const body = schema.parse(req.body);
    const [customer] = await db
      .insert(customersTable)
      .values({
        name: body.name,
        phone: body.phone,
        address: body.address ?? null,
      })
      .returning();
    res.status(201).json({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      totalDebt: 0,
      createdAt: customer.createdAt,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create customer");
    res.status(400).json({ message: "داتاکان هەڵەن" });
  }
});

router.get("/customers/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id));
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, id));
    if (!customer) { res.status(404).json({ message: "کڕیارەکە نەدۆزرایەوە" }); return; }
    const debts = await db
      .select({ total: sql<string>`coalesce(sum(${debtsTable.remainingAmount}), 0)` })
      .from(debtsTable)
      .where(eq(debtsTable.customerId, id));
    const totalDebt = parseFloat(debts[0]?.total ?? "0");
    res.json({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      totalDebt,
      createdAt: customer.createdAt,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get customer");
    res.status(500).json({ message: "هەڵەیەک ڕوویدا" });
  }
});

router.put("/customers/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id));
    const schema = z.object({
      name: z.string().min(1).optional(),
      phone: z.string().min(1).optional(),
      address: z.string().optional(),
    });
    const body = schema.parse(req.body);
    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.address !== undefined) updateData.address = body.address;

    const [customer] = await db
      .update(customersTable)
      .set(updateData)
      .where(eq(customersTable.id, id))
      .returning();
    if (!customer) { res.status(404).json({ message: "کڕیارەکە نەدۆزرایەوە" }); return; }

    const debts = await db
      .select({ total: sql<string>`coalesce(sum(${debtsTable.remainingAmount}), 0)` })
      .from(debtsTable)
      .where(eq(debtsTable.customerId, id));
    const totalDebt = parseFloat(debts[0]?.total ?? "0");

    res.json({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      totalDebt,
      createdAt: customer.createdAt,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to update customer");
    res.status(400).json({ message: "داتاکان هەڵەن" });
  }
});

export default router;
