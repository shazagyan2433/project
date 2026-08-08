import { Router, type IRouter } from "express";
import multer from "multer";
import { db, productsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { loadPermissions } from "../middlewares/auth";
import { parseDocumentText, EMPTY_IMPORT_MESSAGE } from "../lib/inventory-document-parser";
import { extractTextFromPdf, extractTextFromPlain } from "../lib/pdf-text";

const router: IRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 1 },
});

const createProductSchema = z.object({
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
    const body = createProductSchema.parse(req.body);
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

/** Fast text-only parse — client extracts PDF/text locally, sends JSON */
router.post("/products/import/parse-text", loadPermissions, async (req, res): Promise<void> => {
  try {
    if (!req.userPermissions?.canEditStock) {
      res.status(403).json({ message: "مافت نییە کاڵا زیاد بکەیت" });
      return;
    }

    const body = z.object({
      text: z.string().min(1).max(2_000_000),
      fileName: z.string().optional(),
    }).safeParse(req.body);

    if (!body.success) {
      res.status(400).json({ message: "دەقی فایل نادروستە" });
      return;
    }

    const parsed = parseDocumentText(body.data.text);
    const name = body.data.fileName ?? "document.txt";
    const isPdf = name.toLowerCase().endsWith(".pdf");
    const empty = parsed.items.length === 0;

    res.json({
      items: parsed.items,
      warnings: parsed.warnings,
      empty,
      message: empty ? (parsed.warnings[0] ?? EMPTY_IMPORT_MESSAGE) : undefined,
      meta: {
        fileName: name,
        mimeType: isPdf ? "application/pdf" : "text/plain",
        pages: 0,
        linesScanned: parsed.linesScanned,
        supplierHint: parsed.supplierHint,
        parseMs: parsed.parseMs,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Failed to parse import text");
    const message = err instanceof Error ? err.message : "پارسکردنی فایل سەرکەوتوو نەبوو";
    res.status(400).json({ message });
  }
});

/** Parse PDF / text catalog — returns draft rows only (nothing saved) */
router.post(
  "/products/import/parse",
  loadPermissions,
  (req, res, next) => {
    upload.single("file")(req, res, (err: unknown) => {
      if (err) {
        const message =
          err && typeof err === "object" && "code" in err && err.code === "LIMIT_FILE_SIZE"
            ? "فایلەکە زۆر گەورەیە (زیاتر لە 15MB)."
            : "هەڵە لە وەرگرتنی فایل";
        res.status(400).json({ message });
        return;
      }
      next();
    });
  },
  async (req, res): Promise<void> => {
    try {
      if (!req.userPermissions?.canEditStock) {
        res.status(403).json({ message: "مافت نییە کاڵا زیاد بکەیت" });
        return;
      }

      const file = req.file;
      if (!file) {
        res.status(400).json({ message: "فایل دیاری نەکراوە" });
        return;
      }

      const mime = file.mimetype || "";
      const name = file.originalname?.toLowerCase() ?? "";
      let text = "";
      let pages = 0;

      if (mime === "application/pdf" || name.endsWith(".pdf")) {
        const extracted = await extractTextFromPdf(file.buffer);
        text = extracted.text;
        pages = extracted.pages;
      } else if (
        mime.startsWith("text/") ||
        name.endsWith(".txt") ||
        name.endsWith(".csv")
      ) {
        text = extractTextFromPlain(file.buffer);
      } else {
        res.status(400).json({ message: "جۆری فایل پشتگیری ناکرێت. PDF، TXT، یان CSV بەکاربهێنە." });
        return;
      }

      const parsed = parseDocumentText(text);
      const empty = parsed.items.length === 0;

      res.json({
        items: parsed.items,
        warnings: parsed.warnings,
        empty,
        message: empty ? (parsed.warnings[0] ?? EMPTY_IMPORT_MESSAGE) : undefined,
        meta: {
          fileName: file.originalname,
          mimeType: mime,
          pages,
          linesScanned: parsed.linesScanned,
          supplierHint: parsed.supplierHint,
          parseMs: parsed.parseMs,
        },
      });
    } catch (err) {
      req.log.error({ err }, "Failed to parse import document");
      const message = err instanceof Error ? err.message : "پارسکردنی فایل سەرکەوتوو نەبوو";
      res.status(400).json({ message });
    }
  },
);

/** Batch insert products — only after user confirms preview */
router.post("/products/bulk", loadPermissions, async (req, res): Promise<void> => {
  try {
    if (!req.userPermissions?.canEditStock) {
      res.status(403).json({ message: "مافت نییە کاڵا زیاد بکەیت" });
      return;
    }

    const body = z.object({
      products: z.array(createProductSchema).min(1).max(500),
    }).parse(req.body);

    const inserted = await db.transaction(async (tx) => {
      const rows: (typeof productsTable.$inferSelect)[] = [];
      for (const p of body.products) {
        const [row] = await tx
          .insert(productsTable)
          .values({
            name: p.name.trim(),
            price: p.price.toString(),
            costPrice: (p.costPrice ?? 0).toString(),
            stock: p.stock,
            unit: p.unit,
            category: p.category ?? null,
            barcode: p.barcode ?? null,
            image: p.image ?? null,
            supplier: p.supplier ?? null,
          })
          .returning();
        rows.push(row);
      }
      return rows;
    });

    const showCostPrice = req.userPermissions?.canViewProfit ?? false;
    res.status(201).json({
      count: inserted.length,
      products: inserted.map((p) => mapProduct(p, showCostPrice)),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to bulk create products");
    if (err instanceof z.ZodError) {
      res.status(400).json({ message: "هەندێک ڕیز نادروستن", errors: err.flatten() });
      return;
    }
    res.status(400).json({ message: "هاوردەکردن سەرکەوتوو نەبوو" });
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
