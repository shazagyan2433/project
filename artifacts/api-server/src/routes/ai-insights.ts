import { Router, type IRouter } from "express";
import { db, salesTable, saleItemsTable, productsTable, debtsTable, customersTable } from "@workspace/db";
import { gte, sql, eq } from "drizzle-orm";
import { loadPermissions, requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

function linearRegression(ys: number[]): { slope: number; intercept: number } {
  const n = ys.length;
  const xs = ys.map((_, i) => i);
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((acc, x, i) => acc + x * ys[i], 0);
  const sumX2 = xs.reduce((acc, x) => acc + x * x, 0);
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n };
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

router.get("/ai-insights", requireAuth, loadPermissions, async (req, res) => {
  try {
    const showProfit = req.userPermissions?.canViewProfit ?? false;
    const now = new Date();

    // ---- 30-day daily sales series ----
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const salesRows = await db
      .select({
        day: sql<string>`date_trunc('day', ${salesTable.createdAt})::date::text`,
        total: sql<string>`coalesce(sum(${salesTable.totalAmount}), 0)`,
      })
      .from(salesTable)
      .where(gte(salesTable.createdAt, thirtyDaysAgo))
      .groupBy(sql`date_trunc('day', ${salesTable.createdAt})`)
      .orderBy(sql`date_trunc('day', ${salesTable.createdAt})`);

    const dailyMap: Record<string, number> = {};
    for (const r of salesRows) dailyMap[r.day] = parseFloat(r.total);

    const days30: number[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days30.push(dailyMap[key] ?? 0);
    }

    const hasData = days30.some((v) => v > 0);
    const avgDaily = days30.reduce((a, b) => a + b, 0) / 30;
    const { slope, intercept } = linearRegression(days30);

    // ---- Today's sales ----
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todaySalesRows = await db
      .select({ total: sql<string>`coalesce(sum(${salesTable.totalAmount}), 0)` })
      .from(salesTable)
      .where(gte(salesTable.createdAt, todayStart));
    const todaySales = parseFloat(todaySalesRows[0]?.total ?? "0");

    // ---- Daily target = 30-day average ----
    const dailyTarget = Math.max(avgDaily, 0);

    // ---- Predicted next 7 days total (indices 30..36) ----
    let predictedWeek = 0;
    for (let i = 30; i < 37; i++) {
      predictedWeek += Math.max(0, slope * i + intercept);
    }

    // ---- Last 7 days total ----
    const last7Total = days30.slice(-7).reduce((a, b) => a + b, 0);
    const weeklyChangePercent =
      last7Total > 0 ? Math.round(((predictedWeek - last7Total) / last7Total) * 100) : 0;

    // ---- Overdue debtors ----
    const thirtyDaysAgoDebt = new Date();
    thirtyDaysAgoDebt.setDate(thirtyDaysAgoDebt.getDate() - 30);

    const overdueDebtsRows = await db
      .select({
        customerId: debtsTable.customerId,
        remainingAmount: debtsTable.remainingAmount,
        createdAt: debtsTable.createdAt,
        status: debtsTable.status,
      })
      .from(debtsTable)
      .where(
        sql`${debtsTable.createdAt} <= ${thirtyDaysAgoDebt.toISOString()} AND ${debtsTable.status} != 'paid'`
      );

    const overdueMap: Record<number, number> = {};
    for (const d of overdueDebtsRows) {
      const cid = d.customerId!;
      overdueMap[cid] = (overdueMap[cid] ?? 0) + parseFloat(d.remainingAmount);
    }

    const overdueDebtors: { id: number; name: string; phone: string; totalDebt: number; daysOverdue: number }[] = [];
    for (const [cidStr, totalDebt] of Object.entries(overdueMap)) {
      const cid = parseInt(cidStr);
      const [cust] = await db
        .select({ name: customersTable.name, phone: customersTable.phone })
        .from(customersTable)
        .where(eq(customersTable.id, cid));
      if (cust) {
        const debtsForCustomer = overdueDebtsRows.filter((d) => d.customerId === cid);
        if (debtsForCustomer.length === 0) continue;
        const oldestDebt = debtsForCustomer.reduce((oldest, d) => {
          return new Date(d.createdAt) < new Date(oldest.createdAt) ? d : oldest;
        });
        const daysOverdue = Math.floor(
          (now.getTime() - new Date(oldestDebt.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        );
        overdueDebtors.push({ id: cid, name: cust.name, phone: cust.phone, totalDebt, daysOverdue });
      }
    }
    overdueDebtors.sort((a, b) => b.totalDebt - a.totalDebt);

    // ---- Product to restock ----
    const soldProductsRows = await db
      .select({
        productId: saleItemsTable.productId,
        totalSold: sql<string>`sum(${saleItemsTable.quantity})`,
      })
      .from(saleItemsTable)
      .innerJoin(salesTable, eq(saleItemsTable.saleId, salesTable.id))
      .where(gte(salesTable.createdAt, thirtyDaysAgo))
      .groupBy(saleItemsTable.productId)
      .orderBy(sql`sum(${saleItemsTable.quantity}) desc`)
      .limit(10);

    let restockProductName: string | null = null;
    let restockProductStock = 0;
    for (const sp of soldProductsRows) {
      if (sp.productId == null) continue;
      const [prod] = await db
        .select({ name: productsTable.name, stock: productsTable.stock })
        .from(productsTable)
        .where(eq(productsTable.id, sp.productId));
      if (prod && prod.stock < 10) {
        restockProductName = prod.name;
        restockProductStock = prod.stock;
        break;
      }
    }

    // ---- Profit fields (only computed if user has canViewProfit) ----
    let predictedMonthlyProfit: number | null = null;
    let healthScore: number | null = null;

    if (showProfit) {
      const profitRows = await db
        .select({
          revenue: sql<string>`coalesce(sum(${saleItemsTable.total}), 0)`,
          cost: sql<string>`coalesce(sum(${saleItemsTable.costPrice} * ${saleItemsTable.quantity}), 0)`,
        })
        .from(saleItemsTable)
        .innerJoin(salesTable, eq(saleItemsTable.saleId, salesTable.id))
        .where(gte(salesTable.createdAt, thirtyDaysAgo));

      const revenue30 = parseFloat(profitRows[0]?.revenue ?? "0");
      const cost30 = parseFloat(profitRows[0]?.cost ?? "0");
      const profit30 = revenue30 - cost30;
      const daysWithData = days30.filter((v) => v > 0).length || 1;
      predictedMonthlyProfit = Math.round((profit30 / daysWithData) * 30);

      // Business Health Score
      let salesScore = 40;
      if (hasData && avgDaily > 0) {
        const momentum = slope / avgDaily;
        salesScore = Math.round(Math.min(40, Math.max(0, 20 + momentum * 100)));
      } else if (!hasData) {
        salesScore = 20;
      }

      const totalSalesAllTime = await db
        .select({ total: sql<string>`coalesce(sum(${salesTable.totalAmount}), 0)` })
        .from(salesTable);
      const totalDebts = await db
        .select({ total: sql<string>`coalesce(sum(${debtsTable.remainingAmount}), 0)` })
        .from(debtsTable);
      const salesVal = parseFloat(totalSalesAllTime[0]?.total ?? "0");
      const debtVal = parseFloat(totalDebts[0]?.total ?? "0");
      const debtRatio = salesVal > 0 ? debtVal / salesVal : 0;
      const debtScore = Math.round(Math.max(0, 30 - debtRatio * 60));

      const lowStockCount = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(productsTable)
        .where(sql`${productsTable.stock} < 5`);
      const totalProdsCount = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(productsTable);
      const ls = lowStockCount[0]?.count ?? 0;
      const tp = Math.max(1, totalProdsCount[0]?.count ?? 0);
      const stockScore = Math.round(Math.max(0, 30 * (1 - ls / tp)));

      healthScore = Math.min(100, salesScore + debtScore + stockScore);
    }

    res.json({
      hasData,
      canViewProfit: showProfit,
      // Profit-gated fields (null when no permission)
      healthScore,
      predictedMonthlyProfit,
      // Sales fields (always returned)
      weeklyChangePercent,
      predictedWeekSales: Math.round(predictedWeek),
      restockProductName,
      restockProductStock,
      // Staff fields
      todaySales: Math.round(todaySales),
      dailyTarget: Math.round(dailyTarget),
      overdueDebtors: overdueDebtors.slice(0, 5),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get AI insights");
    res.status(500).json({ message: "هەڵەیەک ڕوویدا" });
  }
});

export default router;
