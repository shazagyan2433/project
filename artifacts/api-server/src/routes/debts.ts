import { Router, type IRouter } from "express";
import { db, debtsTable, customersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

router.get("/debts", async (req, res): Promise<void> => {
  try {
    const debts = await db.select().from(debtsTable).orderBy(debtsTable.createdAt);
    const result = [];
    for (const d of debts) {
      const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, d.customerId));
      result.push({
        id: d.id,
        customerId: d.customerId,
        customerName: customer?.name ?? "نامەعلوم",
        customerPhone: customer?.phone ?? "",
        saleId: d.saleId,
        originalAmount: parseFloat(d.originalAmount),
        remainingAmount: parseFloat(d.remainingAmount),
        status: d.status,
        createdAt: d.createdAt,
      });
    }
    res.json(result.reverse());
  } catch (err) {
    req.log.error({ err }, "Failed to get debts");
    res.status(500).json({ message: "هەڵەیەک ڕوویدا" });
  }
});

router.post("/debts/:id/pay", async (req, res): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id));
    const schema = z.object({ amount: z.number().positive() });
    const body = schema.parse(req.body);

    const [debt] = await db.select().from(debtsTable).where(eq(debtsTable.id, id));
    if (!debt) { res.status(404).json({ message: "قەرزەکە نەدۆزرایەوە" }); return; }
    if (debt.status === "paid") { res.status(400).json({ message: "قەرزەکە پێشتر دراوەتەوە" }); return; }

    const remaining = parseFloat(debt.remainingAmount);
    const payment = Math.min(body.amount, remaining);
    const newRemaining = remaining - payment;
    const newStatus = newRemaining <= 0 ? "paid" : "partial";

    const [updated] = await db
      .update(debtsTable)
      .set({
        remainingAmount: newRemaining.toString(),
        status: newStatus,
      })
      .where(eq(debtsTable.id, id))
      .returning();

    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, updated.customerId));
    res.json({
      id: updated.id,
      customerId: updated.customerId,
      customerName: customer?.name ?? "نامەعلوم",
      customerPhone: customer?.phone ?? "",
      saleId: updated.saleId,
      originalAmount: parseFloat(updated.originalAmount),
      remainingAmount: parseFloat(updated.remainingAmount),
      status: updated.status,
      createdAt: updated.createdAt,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to pay debt");
    res.status(400).json({ message: "هەڵەیەک ڕوویدا" });
  }
});

export default router;
