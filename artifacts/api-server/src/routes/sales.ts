import { Router, type IRouter } from "express";
import { db, salesTable, saleItemsTable, productsTable, customersTable, debtsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const LINQI_COMMISSION_RATE = 0.025;

const router: IRouter = Router();

async function getSaleWithItems(saleId: number) {
  const [sale] = await db.select().from(salesTable).where(eq(salesTable.id, saleId));
  if (!sale) return null;
  const items = await db.select().from(saleItemsTable).where(eq(saleItemsTable.saleId, saleId));
  let customerName = null;
  if (sale.customerId) {
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, sale.customerId));
    customerName = customer?.name ?? null;
  }
  return {
    id: sale.id,
    customerId: sale.customerId,
    customerName,
    paymentType: sale.paymentType,
    paymentMethod: (sale as any).paymentMethod ?? "cash",
    totalAmount: parseFloat(sale.totalAmount),
    paidAmount: parseFloat(sale.paidAmount),
    discountAmount: sale.discountAmount ? parseFloat(sale.discountAmount) : null,
    exchangeRate: sale.exchangeRate ? parseFloat(sale.exchangeRate) : null,
    commissionAmount: (sale as any).commissionAmount ? parseFloat((sale as any).commissionAmount) : null,
    items: items.map((i) => ({
      productId: i.productId,
      productName: i.productName,
      quantity: i.quantity,
      unitPrice: parseFloat(i.unitPrice),
      costPrice: parseFloat(i.costPrice ?? "0"),
      total: parseFloat(i.total),
    })),
    createdAt: sale.createdAt,
  };
}

router.get("/sales", async (req, res): Promise<void> => {
  try {
    const allSales = await db.select().from(salesTable).orderBy(salesTable.createdAt);
    const result = [];
    for (const sale of allSales) {
      const full = await getSaleWithItems(sale.id);
      if (full) result.push(full);
    }
    res.json(result.reverse());
  } catch (err) {
    req.log.error({ err }, "Failed to get sales");
    res.status(500).json({ message: "هەڵەیەک ڕوویدا" });
  }
});

router.post("/sales", async (req, res): Promise<void> => {
  try {
    const schema = z.object({
      customerId: z.number().int().optional(),
      paymentType: z.enum(["cash", "debt"]),
      paymentMethod: z.enum(["cash", "cash_on_delivery", "qr_payment"]).optional().default("cash"),
      items: z.array(
        z.object({
          productId: z.number().int(),
          quantity: z.number().int().positive(),
          unitPrice: z.number().positive(),
        })
      ).min(1),
      discountAmount: z.number().min(0).optional(),
      exchangeRate: z.number().positive().optional(),
    });
    const body = schema.parse(req.body);

    let totalAmount = 0;
    const itemsToInsert: {
      productId: number;
      productName: string;
      quantity: number;
      unitPrice: number;
      costPrice: number;
      itemTotal: number;
      currentStock: number;
    }[] = [];

    for (const item of body.items) {
      const [product] = await db.select().from(productsTable).where(eq(productsTable.id, item.productId));
      if (!product) {
        res.status(400).json({ message: `کاڵای ژمارە ${item.productId} نەدۆزرایەوە` });
        return;
      }
      if (product.stock < item.quantity) {
        res.status(400).json({ message: `مەخزەنی کاڵای ${product.name} بەسەر نییە` });
        return;
      }
      const itemTotal = item.quantity * item.unitPrice;
      totalAmount += itemTotal;
      itemsToInsert.push({
        productId: item.productId,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        costPrice: parseFloat(product.costPrice ?? "0"),
        itemTotal,
        currentStock: product.stock,
      });
    }

    const discountAmount = body.discountAmount ?? 0;
    const finalTotal = Math.max(0, totalAmount - discountAmount);
    const paidAmount = body.paymentType === "cash" ? finalTotal : 0;
    const commissionAmount = Math.round(finalTotal * LINQI_COMMISSION_RATE * 100) / 100;

    const full = await db.transaction(async (tx) => {
      const [sale] = await tx
        .insert(salesTable)
        .values({
          customerId: body.customerId ?? null,
          paymentType: body.paymentType,
          paymentMethod: body.paymentMethod ?? "cash",
          totalAmount: finalTotal.toString(),
          paidAmount: paidAmount.toString(),
          discountAmount: discountAmount > 0 ? discountAmount.toString() : null,
          exchangeRate: body.exchangeRate ? body.exchangeRate.toString() : null,
          commissionAmount: commissionAmount.toString(),
        } as any)
        .returning();

      for (const item of itemsToInsert) {
        await tx.insert(saleItemsTable).values({
          saleId: sale.id,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toString(),
          costPrice: item.costPrice.toString(),
          total: item.itemTotal.toString(),
        });
        await tx
          .update(productsTable)
          .set({ stock: item.currentStock - item.quantity, updatedAt: new Date() })
          .where(eq(productsTable.id, item.productId));
      }

      if (body.paymentType === "debt" && body.customerId) {
        await tx.insert(debtsTable).values({
          customerId: body.customerId,
          saleId: sale.id,
          originalAmount: finalTotal.toString(),
          remainingAmount: finalTotal.toString(),
          status: "pending",
        });
      }

      return sale.id;
    });

    const result = await getSaleWithItems(full);
    res.status(201).json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to create sale");
    res.status(400).json({ message: "داتاکان هەڵەن" });
  }
});

router.get("/sales/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id));
    const full = await getSaleWithItems(id);
    if (!full) { res.status(404).json({ message: "پسوولەکە نەدۆزرایەوە" }); return; }
    res.json(full);
  } catch (err) {
    req.log.error({ err }, "Failed to get sale");
    res.status(500).json({ message: "هەڵەیەک ڕوویدا" });
  }
});

export default router;
