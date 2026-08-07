import { Router, type IRouter } from "express";
import { db, rfqsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

router.get("/rfqs", async (req, res): Promise<void> => {
  try {
    const sectorKey = typeof req.query.sectorKey === "string" ? req.query.sectorKey.trim() : "";

    const rows = sectorKey
      ? await db
          .select()
          .from(rfqsTable)
          .where(eq(rfqsTable.sectorKey, sectorKey))
          .orderBy(desc(rfqsTable.createdAt))
      : await db.select().from(rfqsTable).orderBy(desc(rfqsTable.createdAt));

    res.json(
      rows.map((r) => ({
        id: r.rfqCode,
        product: r.product,
        qty: r.quantity,
        unit: r.unit,
        cat: r.category,
        suppliers: r.suppliers ?? [],
        status: r.status,
        created: r.createdAt.toLocaleDateString("ku-IQ"),
        bestPrice: r.bestPrice ?? undefined,
        deadline: r.deadline
          ? r.deadline.toLocaleDateString("ku-IQ")
          : "",
      })),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to fetch RFQs");
    res.json([]);
  }
});

router.post("/rfqs", async (req, res): Promise<void> => {
  try {
    const schema = z.object({
      product: z.string().min(1),
      quantity: z.string().min(1),
      unit: z.string().min(1),
      category: z.string().optional(),
      sectorKey: z.string().min(1),
      suppliers: z.array(z.string()).optional(),
      deadline: z.string().optional(),
    });
    const body = schema.parse(req.body);
    const rfqCode = `RFQ-${Date.now()}`;

    const [row] = await db
      .insert(rfqsTable)
      .values({
        rfqCode,
        product: body.product,
        quantity: body.quantity,
        unit: body.unit,
        category: body.category ?? "food",
        sectorKey: body.sectorKey,
        suppliers: body.suppliers ?? [],
        deadline: body.deadline ? new Date(body.deadline) : undefined,
        createdByUserId: req.user?.userId,
      })
      .returning();

    res.status(201).json({
      id: row.rfqCode,
      product: row.product,
      qty: row.quantity,
      unit: row.unit,
      cat: row.category,
      suppliers: row.suppliers ?? [],
      status: row.status,
      created: row.createdAt.toLocaleDateString("ku-IQ"),
      deadline: row.deadline ? row.deadline.toLocaleDateString("ku-IQ") : "",
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create RFQ");
    res.status(400).json({ message: "داتاکان هەڵەن" });
  }
});

export default router;
