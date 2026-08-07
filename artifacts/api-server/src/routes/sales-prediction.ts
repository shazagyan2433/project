import { Router, type IRouter } from "express";
import { db, salesTable } from "@workspace/db";
import { gte, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/sales-prediction", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const rows = await db
      .select({
        day: sql<string>`date_trunc('day', ${salesTable.createdAt})::date::text`,
        total: sql<string>`coalesce(sum(${salesTable.totalAmount}), 0)`,
      })
      .from(salesTable)
      .where(gte(salesTable.createdAt, sevenDaysAgo))
      .groupBy(sql`date_trunc('day', ${salesTable.createdAt})`)
      .orderBy(sql`date_trunc('day', ${salesTable.createdAt})`);

    // Build a full 7-day series (fill gaps with 0)
    const dailyMap: Record<string, number> = {};
    for (const row of rows) {
      dailyMap[row.day] = parseFloat(row.total);
    }

    const days: { date: string; total: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ date: key, total: dailyMap[key] ?? 0 });
    }

    // Simple linear regression (least squares) over the 7 data points
    const n = days.length;
    const xs = days.map((_, i) => i);
    const ys = days.map((d) => d.total);

    const sumX = xs.reduce((a, b) => a + b, 0);
    const sumY = ys.reduce((a, b) => a + b, 0);
    const sumXY = xs.reduce((acc, x, i) => acc + x * ys[i], 0);
    const sumX2 = xs.reduce((acc, x) => acc + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Predict for day index 7 (tomorrow)
    const rawPrediction = slope * n + intercept;
    const prediction = Math.max(0, rawPrediction);

    const avgSales = sumY / n;
    const trend: "up" | "down" | "stable" =
      slope > avgSales * 0.05
        ? "up"
        : slope < -avgSales * 0.05
          ? "down"
          : "stable";

    res.json({
      prediction: parseFloat(prediction.toFixed(0)),
      trend,
      slope: parseFloat(slope.toFixed(2)),
      days,
      hasEnoughData: ys.some((y) => y > 0),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get sales prediction");
    res.status(500).json({ message: "هەڵەیەک ڕوویدا" });
  }
});

export default router;
