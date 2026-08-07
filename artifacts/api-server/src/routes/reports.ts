import { Router, type IRouter } from "express";
import { db, salesTable, saleItemsTable, customersTable } from "@workspace/db";
import { eq, gte, lte, and } from "drizzle-orm";
import { loadPermissions } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/reports", loadPermissions, async (req, res): Promise<void> => {
  try {
    if (!req.userPermissions?.canAccessReports) {
      res.status(403).json({ message: "مافت نییە ڕاپۆرتەکان ببینیت" });
      return;
    }

    const showProfit = req.userPermissions?.canViewProfit ?? false;
    const { from, to } = req.query as { from?: string; to?: string };

    const conditions = [];
    if (from) conditions.push(gte(salesTable.createdAt, new Date(from)));
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      conditions.push(lte(salesTable.createdAt, toDate));
    }

    const allSales =
      conditions.length > 0
        ? await db.select().from(salesTable).where(and(...conditions)).orderBy(salesTable.createdAt)
        : await db.select().from(salesTable).orderBy(salesTable.createdAt);

    const salesWithDetails = [];
    let totalRevenue = 0;
    let totalCost = 0;

    for (const sale of allSales.reverse()) {
      const items = await db.select().from(saleItemsTable).where(eq(saleItemsTable.saleId, sale.id));

      let customerName: string | null = null;
      if (sale.customerId) {
        const [c] = await db.select().from(customersTable).where(eq(customersTable.id, sale.customerId));
        customerName = c?.name ?? null;
      }

      const saleRevenue = parseFloat(sale.totalAmount);
      const saleCost = items.reduce(
        (sum, i) => sum + parseFloat(i.costPrice ?? "0") * i.quantity,
        0
      );
      const saleProfit = saleRevenue - saleCost;

      totalRevenue += saleRevenue;
      totalCost += saleCost;

      salesWithDetails.push({
        id: sale.id,
        createdAt: sale.createdAt,
        customerId: sale.customerId,
        customerName,
        paymentType: sale.paymentType,
        totalAmount: saleRevenue,
        paidAmount: parseFloat(sale.paidAmount),
        cost: showProfit ? saleCost : null,
        profit: showProfit ? saleProfit : null,
        items: items.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          quantity: i.quantity,
          unitPrice: parseFloat(i.unitPrice),
          costPrice: showProfit ? parseFloat(i.costPrice ?? "0") : null,
          total: parseFloat(i.total),
          itemProfit: showProfit
            ? (parseFloat(i.unitPrice) - parseFloat(i.costPrice ?? "0")) * i.quantity
            : null,
        })),
      });
    }

    const totalProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    res.json({
      sales: salesWithDetails,
      summary: {
        salesCount: salesWithDetails.length,
        totalRevenue,
        totalCost: showProfit ? totalCost : null,
        totalProfit: showProfit ? totalProfit : null,
        profitMargin: showProfit ? parseFloat(profitMargin.toFixed(1)) : null,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get reports");
    res.status(500).json({ message: "هەڵەیەک ڕوویدا" });
  }
});

export default router;
