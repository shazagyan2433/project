import { Router } from "express";
import { db } from "@workspace/db";
import { deliveriesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

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

// GET /api/deliveries — list all deliveries (active first)
router.get("/deliveries", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(deliveriesTable)
      .orderBy(deliveriesTable.updatedAt);

    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Failed to list deliveries");
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

  // Upsert: if the orderId already has an active delivery, return it
  const existing = await db
    .select()
    .from(deliveriesTable)
    .where(eq(deliveriesTable.orderId, data.orderId))
    .limit(1);

  if (existing.length > 0) {
    res.json(existing[0]);
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

  res.status(201).json(delivery);
});

// GET /api/deliveries/:orderId — fetch a delivery with its last known driver position
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

  res.json(rows[0]);
});

// PATCH /api/deliveries/:orderId/complete — mark delivery complete
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

  res.json(updated);
});

export default router;
