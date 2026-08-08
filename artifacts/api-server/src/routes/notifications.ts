import { Router, type IRouter } from "express";
import {
  db,
  salesTable,
  customersTable,
  rfqsTable,
  productsTable,
  deliveriesTable,
} from "@workspace/db";
import { desc, eq, and, lte, gt } from "drizzle-orm";

const router: IRouter = Router();

const LOW_STOCK_THRESHOLD = 10;

export type NotificationType = "sale" | "rfq" | "stock" | "delivery" | "cod_collected" | "system";

router.get("/notifications", async (req, res): Promise<void> => {
  try {
    const items: Array<{
      id: string;
      type: NotificationType;
      createdAt: string;
      payload: Record<string, unknown>;
    }> = [];

    const recentSales = await db
      .select()
      .from(salesTable)
      .orderBy(desc(salesTable.createdAt))
      .limit(8);

    for (const sale of recentSales) {
      let customerName: string | null = null;
      if (sale.customerId) {
        const [customer] = await db
          .select({ name: customersTable.name })
          .from(customersTable)
          .where(eq(customersTable.id, sale.customerId));
        customerName = customer?.name ?? null;
      }
      items.push({
        id: `sale-${sale.id}`,
        type: "sale",
        createdAt: sale.createdAt.toISOString(),
        payload: {
          saleId: sale.id,
          customerName,
          totalAmount: parseFloat(sale.totalAmount),
          paymentType: sale.paymentType,
        },
      });
    }

    const recentRfqs = await db
      .select()
      .from(rfqsTable)
      .orderBy(desc(rfqsTable.createdAt))
      .limit(8);

    for (const rfq of recentRfqs) {
      items.push({
        id: `rfq-${rfq.id}`,
        type: "rfq",
        createdAt: rfq.createdAt.toISOString(),
        payload: {
          rfqCode: rfq.rfqCode,
          product: rfq.product,
          quantity: rfq.quantity,
          unit: rfq.unit,
          status: rfq.status,
          bestPrice: rfq.bestPrice,
        },
      });
    }

    const lowStock = await db
      .select()
      .from(productsTable)
      .where(and(lte(productsTable.stock, LOW_STOCK_THRESHOLD), gt(productsTable.stock, 0)))
      .orderBy(productsTable.stock)
      .limit(8);

    for (const product of lowStock) {
      items.push({
        id: `stock-${product.id}`,
        type: "stock",
        createdAt: (product.updatedAt ?? product.createdAt).toISOString(),
        payload: {
          productId: product.id,
          productName: product.name,
          stock: product.stock,
          unit: product.unit,
        },
      });
    }

    const codCollected = await db
      .select({
        delivery: deliveriesTable,
        sale: salesTable,
      })
      .from(deliveriesTable)
      .innerJoin(salesTable, eq(deliveriesTable.saleId, salesTable.id))
      .where(eq(salesTable.paymentStatus, "paid_cod"))
      .orderBy(desc(deliveriesTable.codCollectedAt))
      .limit(8);

    for (const { delivery, sale } of codCollected) {
      if (!delivery.codCollectedAt) continue;
      items.push({
        id: `cod-${sale.id}-${delivery.id}`,
        type: "cod_collected",
        createdAt: delivery.codCollectedAt.toISOString(),
        payload: {
          orderId: delivery.orderId,
          saleId: sale.id,
          amount: parseFloat(sale.totalAmount),
          currency: delivery.currency ?? "IQD",
          driverId: delivery.driverId,
        },
      });
    }

    const recentDeliveries = await db
      .select()
      .from(deliveriesTable)
      .orderBy(desc(deliveriesTable.updatedAt))
      .limit(8);

    for (const delivery of recentDeliveries) {
      items.push({
        id: `delivery-${delivery.id}`,
        type: "delivery",
        createdAt: delivery.updatedAt.toISOString(),
        payload: {
          orderId: delivery.orderId,
          customerName: delivery.customerName,
          shopName: delivery.shopName,
          status: delivery.status,
        },
      });
    }

    items.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    res.json(items.slice(0, 30));
  } catch (err) {
    req.log.error({ err }, "Failed to fetch notifications");
    res.json([]);
  }
});

export default router;
