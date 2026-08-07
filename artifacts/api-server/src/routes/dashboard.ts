import { Router, type IRouter } from "express";
import { db, productsTable, customersTable, salesTable, debtsTable, saleItemsTable } from "@workspace/db";
import { eq, sql, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/dashboard", async (req, res) => {
  try {
    const productsResult = await db.select({ count: sql<number>`count(*)::int` }).from(productsTable);
    const totalProducts = productsResult[0]?.count ?? 0;

    const customersResult = await db.select({ count: sql<number>`count(*)::int` }).from(customersTable);
    const totalCustomers = customersResult[0]?.count ?? 0;

    const salesResult = await db.select({ total: sql<string>`coalesce(sum(${salesTable.totalAmount}), 0)` }).from(salesTable);
    const totalSales = parseFloat(salesResult[0]?.total ?? "0");

    const debtsResult = await db.select({ total: sql<string>`coalesce(sum(${debtsTable.remainingAmount}), 0)` }).from(debtsTable);
    const totalDebts = parseFloat(debtsResult[0]?.total ?? "0");

    const recentSalesRaw = await db.select().from(salesTable).orderBy(desc(salesTable.createdAt)).limit(5);
    const recentSales = [];
    for (const sale of recentSalesRaw) {
      const items = await db.select().from(saleItemsTable).where(eq(saleItemsTable.saleId, sale.id));
      let customerName = null;
      if (sale.customerId) {
        const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, sale.customerId));
        customerName = customer?.name ?? null;
      }
      recentSales.push({
        id: sale.id,
        customerId: sale.customerId,
        customerName,
        paymentType: sale.paymentType,
        totalAmount: parseFloat(sale.totalAmount),
        paidAmount: parseFloat(sale.paidAmount),
        items: items.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          quantity: i.quantity,
          unitPrice: parseFloat(i.unitPrice),
          total: parseFloat(i.total),
        })),
        createdAt: sale.createdAt,
      });
    }

    const topDebtorsRaw = await db.select().from(customersTable);
    const topDebtorsWithDebt = [];
    for (const c of topDebtorsRaw) {
      const debts = await db
        .select({ total: sql<string>`coalesce(sum(${debtsTable.remainingAmount}), 0)` })
        .from(debtsTable)
        .where(eq(debtsTable.customerId, c.id));
      const totalDebt = parseFloat(debts[0]?.total ?? "0");
      if (totalDebt > 0) {
        topDebtorsWithDebt.push({
          id: c.id,
          name: c.name,
          phone: c.phone,
          address: c.address,
          totalDebt,
          createdAt: c.createdAt,
        });
      }
    }
    topDebtorsWithDebt.sort((a, b) => b.totalDebt - a.totalDebt);
    const topDebtors = topDebtorsWithDebt.slice(0, 5);

    res.json({
      totalSales,
      totalDebts,
      totalCustomers,
      totalProducts,
      recentSales,
      topDebtors,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get dashboard");
    res.status(500).json({ message: "هەڵەیەک ڕوویدا" });
  }
});

export default router;
