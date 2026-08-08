import { Router, type IRouter } from "express";
import { db, businessRegistrationsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { serializeSupplier } from "../lib/serialize-supplier";
import { isDisplayableSupplier } from "../lib/listable-supplier";

const router: IRouter = Router();

router.get("/suppliers", async (_req, res): Promise<void> => {
  try {
    const rows = await db
      .select()
      .from(businessRegistrationsTable)
      .where(eq(businessRegistrationsTable.status, "approved"))
      .orderBy(desc(businessRegistrationsTable.submittedAt));

    const suppliers = rows
      .filter((reg) =>
        isDisplayableSupplier({
          businessName: reg.businessName,
          mobile: reg.mobile,
          sectorKey: reg.sectorKey,
          sectorGroup: reg.sectorGroup,
          status: reg.status,
          extraData: (reg.extraData ?? {}) as Record<string, unknown>,
        }),
      )
      .map(serializeSupplier);

    res.json(suppliers);
  } catch (err) {
    _req.log.error({ err }, "Failed to fetch suppliers");
    res.json([]);
  }
});

router.get("/suppliers/:id", async (req, res): Promise<void> => {
  const id = Number.parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ message: "Invalid supplier id" });
    return;
  }

  try {
    const [row] = await db
      .select()
      .from(businessRegistrationsTable)
      .where(
        and(
          eq(businessRegistrationsTable.id, id),
          eq(businessRegistrationsTable.status, "approved"),
        ),
      );

    if (!row) {
      res.status(404).json({ message: "Supplier not found" });
      return;
    }

    if (
      !isDisplayableSupplier({
        businessName: row.businessName,
        mobile: row.mobile,
        sectorKey: row.sectorKey,
        sectorGroup: row.sectorGroup,
        status: row.status,
        extraData: (row.extraData ?? {}) as Record<string, unknown>,
      })
    ) {
      res.status(404).json({ message: "Supplier not found" });
      return;
    }

    res.json(serializeSupplier(row));
  } catch (err) {
    req.log.error({ err }, "Failed to fetch supplier");
    res.status(500).json({ message: "Failed to fetch supplier" });
  }
});

export default router;
