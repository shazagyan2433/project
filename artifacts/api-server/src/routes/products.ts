import { Router, type IRouter } from "express";
import { db, productsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { loadPermissions } from "../middlewares/auth";

const router: IRouter = Router();

function mapProduct(p: typeof productsTable.$inferSelect, showCostPrice: boolean) {
  return {
    id: p.id,
    name: p.name,
    price: parseFloat(p.price),
    costPrice: showCostPrice ? parseFloat(p.costPrice ?? "0") : null,
    stock: p.stock,
    unit: p.unit,
    category: p.category ?? null,
    barcode: p.barcode ?? null,
    image: p.image ?? null,
    supplier: p.supplier ?? null,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

router.get("/products", loadPermissions, async (req, res): Promise<void> => {
  try {
    const showCostPrice = req.userPermissions?.canViewProfit ?? false;
    const products = await db.select().from(productsTable).orderBy(productsTable.name);
    res.json(products.map((p) => mapProduct(p, showCostPrice)));
  } catch (err) {
    req.log.error({ err }, "Failed to get products");
    res.status(500).json({ message: "هەڵەیەک ڕوویدا" });
  }
});

router.get("/products/barcode/:code", loadPermissions, async (req, res): Promise<void> => {
  try {
    const showCostPrice = req.userPermissions?.canViewProfit ?? false;
    const code = String(req.params.code);
    const [product] = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.barcode, code));
    if (!product) { res.status(404).json({ message: "کاڵاکە نەدۆزرایەوە" }); return; }
    res.json(mapProduct(product, showCostPrice));
  } catch (err) {
    req.log.error({ err }, "Failed to get product by barcode");
    res.status(500).json({ message: "هەڵەیەک ڕوویدا" });
  }
});

router.post("/products", loadPermissions, async (req, res): Promise<void> => {
  try {
    if (!req.userPermissions?.canEditStock) {
      res.status(403).json({ message: "مافت نییە کاڵا زیاد بکەیت" });
      return;
    }
    const schema = z.object({
      name: z.string().min(1),
      price: z.number().positive(),
      costPrice: z.number().min(0).optional().default(0),
      stock: z.number().int().min(0),
      unit: z.string().min(1),
      category: z.string().nullable().optional(),
      barcode: z.string().nullable().optional(),
      image: z.string().nullable().optional(),
      supplier: z.string().nullable().optional(),
    });
    const body = schema.parse(req.body);
    const [product] = await db
      .insert(productsTable)
      .values({
        name: body.name,
        price: body.price.toString(),
        costPrice: (body.costPrice ?? 0).toString(),
        stock: body.stock,
        unit: body.unit,
        category: body.category ?? null,
        barcode: body.barcode ?? null,
        image: body.image ?? null,
        supplier: body.supplier ?? null,
      })
      .returning();
    const showCostPrice = req.userPermissions?.canViewProfit ?? false;
    res.status(201).json(mapProduct(product, showCostPrice));
  } catch (err) {
    req.log.error({ err }, "Failed to create product");
    res.status(400).json({ message: "داتاکان هەڵەن" });
  }
});

router.get("/products/:id", loadPermissions, async (req, res): Promise<void> => {
  try {
    const showCostPrice = req.userPermissions?.canViewProfit ?? false;
    const id = parseInt(String(req.params.id));
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, id));
    if (!product) { res.status(404).json({ message: "کاڵاکە نەدۆزرایەوە" }); return; }
    res.json(mapProduct(product, showCostPrice));
  } catch (err) {
    req.log.error({ err }, "Failed to get product");
    res.status(500).json({ message: "هەڵەیەک ڕوویدا" });
  }
});

router.put("/products/:id", loadPermissions, async (req, res): Promise<void> => {
  try {
    if (!req.userPermissions?.canEditStock) {
      res.status(403).json({ message: "مافت نییە کاڵا دەستکاری بکەیت" });
      return;
    }
    const showCostPrice = req.userPermissions?.canViewProfit ?? false;
    const id = parseInt(String(req.params.id));
    const schema = z.object({
      name: z.string().min(1).optional(),
      price: z.number().positive().optional(),
      costPrice: z.number().min(0).optional(),
      stock: z.number().int().min(0).optional(),
      unit: z.string().min(1).optional(),
      category: z.string().nullable().optional(),
      barcode: z.string().nullable().optional(),
      image: z.string().nullable().optional(),
      supplier: z.string().nullable().optional(),
    });
    const body = schema.parse(req.body);
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) updateData.name = body.name;
    if (body.price !== undefined) updateData.price = body.price.toString();
    if (body.costPrice !== undefined) updateData.costPrice = body.costPrice.toString();
    if (body.stock !== undefined) updateData.stock = body.stock;
    if (body.unit !== undefined) updateData.unit = body.unit;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.barcode !== undefined) updateData.barcode = body.barcode;
    if (body.image !== undefined) updateData.image = body.image;
    if (body.supplier !== undefined) updateData.supplier = body.supplier;

    const [product] = await db
      .update(productsTable)
      .set(updateData)
      .where(eq(productsTable.id, id))
      .returning();

    if (!product) { res.status(404).json({ message: "کاڵاکە نەدۆزرایەوە" }); return; }
    res.json(mapProduct(product, showCostPrice));
  } catch (err) {
    req.log.error({ err }, "Failed to update product");
    res.status(400).json({ message: "داتاکان هەڵەن" });
  }
});

router.delete("/products/:id", loadPermissions, async (req, res): Promise<void> => {
  try {
    if (!req.userPermissions?.canDeleteData) {
      res.status(403).json({ message: "مافت نییە کاڵا بسڕیتەوە" });
      return;
    }
    const id = parseInt(String(req.params.id));
    const [deleted] = await db.delete(productsTable).where(eq(productsTable.id, id)).returning();
    if (!deleted) { res.status(404).json({ message: "کاڵاکە نەدۆزرایەوە" }); return; }
    res.json({ message: "کاڵاکە سڕایەوە" });
  } catch (err) {
    req.log.error({ err }, "Failed to delete product");
    res.status(500).json({ message: "هەڵەیەک ڕوویدا" });
  }
});

export default router;
