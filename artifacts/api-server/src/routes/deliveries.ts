import { Router } from "express";
import { db } from "@workspace/db";
import { deliveriesTable, salesTable } from "@workspace/db";
import { and, eq, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, requireDriver } from "../middlewares/auth";
import {
  CodError,
  collectCodPayment,
  emitCodCollectedNotification,
} from "../lib/cod-service";
import { io } from "../socket";

const router = Router();

const createDeliverySchema = z.object({
  orderId: z.string().min(1),
  shopLat: z.number(),
  shopLng: z.number(),
  shopName: z.string().min(1),
  customerLat: z.number(),
  customerLng: z.number(),
  customerName: z.string().min(1),
  driverId: z.number().optional(),
});

function serializeDelivery(row: typeof deliveriesTable.$inferSelect) {
  return {
    ...row,
    totalAmount: row.totalAmount ? parseFloat(row.totalAmount) : null,
    isCod: row.saleId != null,
    codCollected: row.codCollectedAt != null,
  };
}

// GET /api/deliveries — list all deliveries
router.get("/deliveries", async (req, res) => {
  try {
    const rows = await db.select().from(deliveriesTable).orderBy(deliveriesTable.updatedAt);
    res.json(rows.map(serializeDelivery));
  } catch (err) {
    req.log.error({ err }, "Failed to list deliveries");
    res.status(500).json({ message: "هەڵەیەک ڕوویدا" });
  }
});

// GET /api/driver/deliveries — COD deliveries for driver workspace
router.get("/driver/deliveries", requireAuth, async (req, res) => {
  try {
    const driverId = req.user!.userId;
    const rows = await db
      .select({
        delivery: deliveriesTable,
        sale: salesTable,
      })
      .from(deliveriesTable)
      .innerJoin(salesTable, eq(deliveriesTable.saleId, salesTable.id))
      .where(
        and(
          eq(salesTable.paymentMethod, "cash_on_delivery"),
          or(
            isNull(deliveriesTable.driverId),
            eq(deliveriesTable.driverId, driverId),
          ),
        ),
      )
      .orderBy(deliveriesTable.updatedAt);

    res.json(
      rows.map(({ delivery, sale }) => ({
        ...serializeDelivery(delivery),
        saleId: sale.id,
        paymentStatus: sale.paymentStatus,
        orderStatus: sale.orderStatus,
        totalAmount: parseFloat(sale.totalAmount),
        currency: delivery.currency ?? "IQD",
      })),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list driver deliveries");
    res.status(500).json({ message: "هەڵەیەک ڕوویدا" });
  }
});

// POST /api/deliveries — create a delivery session
router.post("/deliveries", async (req, res) => {
  const parsed = createDeliverySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    return;
  }

  const data = parsed.data;

  const existing = await db
    .select()
    .from(deliveriesTable)
    .where(eq(deliveriesTable.orderId, data.orderId))
    .limit(1);

  if (existing.length > 0) {
    res.json(serializeDelivery(existing[0]));
    return;
  }

  const [delivery] = await db
    .insert(deliveriesTable)
    .values({
      orderId: data.orderId,
      shopLat: String(data.shopLat),
      shopLng: String(data.shopLng),
      shopName: data.shopName,
      customerLat: String(data.customerLat),
      customerLng: String(data.customerLng),
      customerName: data.customerName,
      ...(data.driverId != null && { driverId: data.driverId }),
    })
    .returning();

  res.status(201).json(serializeDelivery(delivery));
});

// GET /api/deliveries/:orderId
router.get("/deliveries/:orderId", async (req, res) => {
  const { orderId } = req.params;
  const rows = await db
    .select()
    .from(deliveriesTable)
    .where(eq(deliveriesTable.orderId, orderId))
    .limit(1);

  if (rows.length === 0) {
    res.status(404).json({ error: "Delivery not found" });
    return;
  }

  res.json(serializeDelivery(rows[0]));
});

// POST /api/deliveries/:orderId/accept — driver accepts assignment
router.post("/deliveries/:orderId/accept", requireDriver, async (req, res) => {
  try {
    const { orderId } = req.params;
    const driverId = req.user!.userId;

    const [existing] = await db
      .select()
      .from(deliveriesTable)
      .where(eq(deliveriesTable.orderId, orderId));

    if (!existing) {
      res.status(404).json({ message: "Delivery not found" });
      return;
    }
    if (existing.codCollectedAt) {
      res.status(409).json({ message: "Delivery already completed" });
      return;
    }
    if (existing.driverId != null && existing.driverId !== driverId) {
      res.status(403).json({ message: "Assigned to another driver" });
      return;
    }

    const [updated] = await db
      .update(deliveriesTable)
      .set({ driverId, updatedAt: new Date() })
      .where(eq(deliveriesTable.orderId, orderId))
      .returning();

    res.json(serializeDelivery(updated));
  } catch (err) {
    req.log.error({ err }, "Failed to accept delivery");
    res.status(500).json({ message: "هەڵەیەک ڕوویدا" });
  }
});

// POST /api/deliveries/:orderId/collect-cod — atomic deliver + cash collection
router.post("/deliveries/:orderId/collect-cod", requireDriver, async (req, res) => {
  try {
    const { orderId } = req.params;
    const driverId = req.user!.userId;
    const driverName = req.user!.name;

    const result = await collectCodPayment(orderId, driverId, driverName);
    emitCodCollectedNotification(io, result);

    res.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof CodError) {
      const status =
        err.code === "NOT_FOUND" || err.code === "SALE_NOT_FOUND"
          ? 404
          : err.code === "ALREADY_COLLECTED"
            ? 409
            : err.code === "NOT_COD"
              ? 400
              : 400;
      res.status(status).json({ message: err.message, code: err.code });
      return;
    }
    req.log.error({ err }, "Failed to collect COD");
    res.status(500).json({ message: "هەڵەیەک ڕوویدا" });
  }
});

// PATCH /api/deliveries/:orderId/complete — mark delivery complete (non-COD)
router.patch("/deliveries/:orderId/complete", async (req, res) => {
  const { orderId } = req.params;
  const [updated] = await db
    .update(deliveriesTable)
    .set({ status: "completed", updatedAt: new Date() })
    .where(eq(deliveriesTable.orderId, orderId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Delivery not found" });
    return;
  }

  res.json(serializeDelivery(updated));
});

export default router;
