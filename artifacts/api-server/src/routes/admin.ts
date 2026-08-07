import { Router, type IRouter } from "express";
import {
  db,
  salesTable,
  saleItemsTable,
  customersTable,
  productsTable,
  usersTable,
  businessRegistrationsTable,
  deliveriesTable,
  rfqsTable,
  adminContractsTable,
  platformSettingsTable,
} from "@workspace/db";
import { requireAdmin } from "../middlewares/auth";
import { eq, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { DEFAULT_ADMIN_CATEGORIES, DEFAULT_ADMIN_SECTORS } from "../lib/admin-catalog-defaults";

const router: IRouter = Router();

const EMPTY_OVERVIEW = {
  totals: {
    salesVolume: 0,
    commission: 0,
    transactions: 0,
    customers: 0,
    products: 0,
    users: 0,
    registrations: 0,
  },
  byMethod: { cash: 0, qr_payment: 0, cash_on_delivery: 0, debt: 0 },
  chartData: [],
  topProducts: [],
  recentTransactions: [],
  customers: [],
  products: [],
  users: [],
  liveDrivers: [],
  rfqs: [],
};

function parseCoords(
  address?: string | null,
  extra?: Record<string, unknown> | null,
): { lat: number; lng: number } {
  if (extra && typeof extra.storeLat === "number" && typeof extra.storeLng === "number") {
    return { lat: extra.storeLat, lng: extra.storeLng };
  }
  const addr = address ?? "";
  const match = addr.match(/(-?\d+\.?\d*)\s*[,،]\s*(-?\d+\.?\d*)/);
  if (match) return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  return { lat: 0, lng: 0 };
}

function deriveVerificationRole(sectorGroup: string): "owner" | "buyer" | "supplier" {
  if (sectorGroup === "enterprise" || sectorGroup === "delivery") return "supplier";
  if (sectorGroup === "retail") return "buyer";
  return "owner";
}

function serializeVerification(row: typeof businessRegistrationsTable.$inferSelect) {
  const extra = (row.extraData ?? {}) as Record<string, unknown>;
  const { lat, lng } = parseCoords(row.address, extra);
  return {
    id: row.id,
    businessName: row.businessName,
    role: deriveVerificationRole(row.sectorGroup),
    sectorKey: row.sectorKey,
    sectorGroup: row.sectorGroup,
    email: row.email ?? undefined,
    mobile: row.mobile,
    governorate: row.governorate ?? undefined,
    city: row.city ?? undefined,
    address: row.address ?? undefined,
    lat,
    lng,
    status: row.status,
    rejectionReason: row.rejectionReason ?? undefined,
    submittedAt:
      row.submittedAt instanceof Date ? row.submittedAt.toISOString() : String(row.submittedAt),
    documents: [],
  };
}

function contractStatusFromDates(endDate: string): "active" | "expiring" | "expired" {
  const end = new Date(endDate);
  const now = new Date();
  if (end < now) return "expired";
  const days = (end.getTime() - now.getTime()) / 86400000;
  if (days <= 30) return "expiring";
  return "active";
}

function mapContractRow(row: typeof adminContractsTable.$inferSelect) {
  const content = (row.content ?? {}) as { ku?: string; ar?: string; en?: string };
  return {
    id: row.contractCode,
    userId: row.userId ?? undefined,
    userName: row.userName,
    type: row.type,
    status: row.status,
    signatureStatus: row.signatureStatus,
    startDate: row.startDate,
    endDate: row.endDate,
    content: {
      ku: content.ku ?? "",
      ar: content.ar ?? "",
      en: content.en ?? "",
    },
    firstPartyName: row.firstPartyName ?? undefined,
    secondPartyName: row.secondPartyName ?? undefined,
    idOrPhone: row.idOrPhone ?? undefined,
    amountOrTerms: row.amountOrTerms ?? undefined,
    customTerms: row.customTerms ?? undefined,
  };
}

async function buildLiveDrivers() {
  const drivers: Array<{
    id: string;
    name: string;
    phone: string;
    city: string;
    lat: number;
    lng: number;
    location_approved: boolean;
    online: boolean;
    vehicle: string;
    lastSeen: string;
  }> = [];

  const deliveries = await db.select().from(deliveriesTable).orderBy(desc(deliveriesTable.updatedAt));
  for (const d of deliveries) {
    const lat = d.driverLat ? parseFloat(d.driverLat) : parseFloat(d.shopLat);
    const lng = d.driverLng ? parseFloat(d.driverLng) : parseFloat(d.shopLng);
    if (!lat || !lng) continue;
    drivers.push({
      id: `del-${d.id}`,
      name: d.customerName || `Driver #${d.driverId ?? d.id}`,
      phone: "",
      city: "erbil",
      lat,
      lng,
      location_approved: Boolean(d.driverLat && d.driverLng),
      online: d.status === "active",
      vehicle: "Delivery",
      lastSeen: d.updatedAt?.toISOString?.() ?? "now",
    });
  }

  const deliveryRegs = await db
    .select()
    .from(businessRegistrationsTable)
    .where(eq(businessRegistrationsTable.sectorGroup, "delivery"));

  for (const reg of deliveryRegs) {
    const extra = (reg.extraData ?? {}) as Record<string, unknown>;
    const { lat, lng } = parseCoords(reg.address, extra);
    if (!lat && !lng) continue;
    drivers.push({
      id: `reg-${reg.id}`,
      name: reg.businessName,
      phone: reg.mobile ?? "",
      city: reg.governorate ?? reg.city ?? "erbil",
      lat,
      lng,
      location_approved: true,
      online: reg.status === "approved",
      vehicle: String(extra.numTrucks ?? "Fleet"),
      lastSeen: reg.submittedAt?.toISOString?.() ?? "",
    });
  }

  return drivers;
}

router.get("/admin/overview", requireAdmin, async (_req, res): Promise<void> => {
  try {
    const allSales = await db.select().from(salesTable);
    const allCustomers = await db.select().from(customersTable);
    const allProducts = await db.select().from(productsTable);
    const allUsers = await db.select().from(usersTable);
    const allItems = await db.select().from(saleItemsTable);
    const allRegistrations = await db.select().from(businessRegistrationsTable);
    const rfqRows = await db.select().from(rfqsTable).orderBy(desc(rfqsTable.createdAt)).limit(50);

    const totalSalesVolume = allSales.reduce((s, x) => s + parseFloat(x.totalAmount), 0);
    const totalCommission = allSales.reduce(
      (s, x) => s + parseFloat((x as { commissionAmount?: string }).commissionAmount ?? "0"),
      0,
    );

    const byMethod: Record<string, number> = { cash: 0, cash_on_delivery: 0, qr_payment: 0, debt: 0 };
    for (const s of allSales) {
      const m =
        (s as { paymentMethod?: string }).paymentMethod ??
        (s.paymentType === "debt" ? "debt" : "cash");
      byMethod[m] = (byMethod[m] ?? 0) + 1;
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentSales = allSales.filter((s) => new Date(s.createdAt) >= thirtyDaysAgo);

    const commissionByDay: Record<string, number> = {};
    const volumeByDay: Record<string, number> = {};
    for (const s of recentSales) {
      const day = new Date(s.createdAt).toISOString().slice(0, 10);
      commissionByDay[day] =
        (commissionByDay[day] ?? 0) +
        parseFloat((s as { commissionAmount?: string }).commissionAmount ?? "0");
      volumeByDay[day] = (volumeByDay[day] ?? 0) + parseFloat(s.totalAmount);
    }

    const chartData = Object.entries(volumeByDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([date, volume]) => ({
        date,
        volume,
        commission: commissionByDay[date] ?? 0,
      }));

    const topProducts: Record<number, { name: string; qty: number; revenue: number }> = {};
    for (const item of allItems) {
      if (!topProducts[item.productId]) {
        topProducts[item.productId] = { name: item.productName, qty: 0, revenue: 0 };
      }
      topProducts[item.productId].qty += item.quantity;
      topProducts[item.productId].revenue += parseFloat(item.total);
    }
    const topProductsList = Object.entries(topProducts)
      .map(([id, v]) => ({ id: Number(id), ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const recentTransactions = allSales
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20)
      .map((s) => ({
        id: s.id,
        totalAmount: parseFloat(s.totalAmount),
        paymentType: s.paymentType,
        paymentMethod: (s as { paymentMethod?: string }).paymentMethod ?? "cash",
        commissionAmount: parseFloat((s as { commissionAmount?: string }).commissionAmount ?? "0"),
        createdAt: s.createdAt,
        customerId: s.customerId,
      }));

    const liveDrivers = await buildLiveDrivers();

    const rfqs = rfqRows.map((r) => ({
      id: r.rfqCode,
      product: r.product,
      qty: r.quantity,
      unit: r.unit,
      status: r.status,
      sectorKey: r.sectorKey,
      created: r.createdAt.toLocaleDateString("ku-IQ"),
      suppliers: r.suppliers ?? [],
    }));

    res.json({
      totals: {
        salesVolume: totalSalesVolume,
        commission: totalCommission,
        transactions: allSales.length,
        customers: allCustomers.length,
        products: allProducts.length,
        users: allUsers.length,
        registrations: allRegistrations.length,
      },
      byMethod,
      chartData,
      topProducts: topProductsList,
      recentTransactions,
      customers: allCustomers.slice(0, 50).map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        address: c.address,
        createdAt: c.createdAt,
        totalPurchases: allSales
          .filter((s) => s.customerId === c.id)
          .reduce((sum, s) => sum + parseFloat(s.totalAmount), 0),
        transactionCount: allSales.filter((s) => s.customerId === c.id).length,
      })),
      products: allProducts.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        stock: p.stock,
        price: parseFloat(p.price),
        costPrice: parseFloat(p.costPrice),
        barcode: p.barcode,
      })),
      users: allUsers.map((u) => ({
        id: u.id,
        name: u.name,
        username: u.username,
        role: u.role,
        createdAt: u.createdAt,
      })),
      liveDrivers,
      rfqs,
    });
  } catch (err) {
    _req.log.error({ err }, "Admin overview failed");
    res.json(EMPTY_OVERVIEW);
  }
});

router.get("/admin/verifications", requireAdmin, async (_req, res): Promise<void> => {
  try {
    const rows = await db
      .select()
      .from(businessRegistrationsTable)
      .orderBy(desc(businessRegistrationsTable.submittedAt));
    res.json(rows.map(serializeVerification));
  } catch (err) {
    _req.log.error({ err }, "Failed to fetch admin verifications");
    res.json([]);
  }
});

router.get("/admin/contracts", requireAdmin, async (_req, res): Promise<void> => {
  try {
    const rows = await db.select().from(adminContractsTable).orderBy(desc(adminContractsTable.createdAt));
    res.json(rows.map(mapContractRow));
  } catch (err) {
    _req.log.error({ err }, "Failed to fetch contracts");
    res.json([]);
  }
});

router.post("/admin/contracts", requireAdmin, async (req, res): Promise<void> => {
  try {
    const schema = z.object({
      userId: z.number().optional().nullable(),
      userName: z.string().min(1),
      type: z.string().min(1),
      signatureStatus: z.enum(["signed", "pending", "unsigned"]).optional(),
      startDate: z.string().min(1),
      endDate: z.string().min(1),
      content: z.object({ ku: z.string(), ar: z.string(), en: z.string() }).optional(),
      firstPartyName: z.string().optional(),
      secondPartyName: z.string().optional(),
      idOrPhone: z.string().optional(),
      amountOrTerms: z.string().optional(),
      customTerms: z.string().optional(),
    });
    const body = schema.parse(req.body);
    const contractCode = `ctr-${Date.now()}`;
    const status = contractStatusFromDates(body.endDate);

    const [row] = await db
      .insert(adminContractsTable)
      .values({
        contractCode,
        userId: body.userId ?? null,
        userName: body.userName,
        type: body.type,
        status,
        signatureStatus: body.signatureStatus ?? "unsigned",
        startDate: body.startDate,
        endDate: body.endDate,
        content: body.content ?? { ku: "", ar: "", en: "" },
        firstPartyName: body.firstPartyName,
        secondPartyName: body.secondPartyName,
        idOrPhone: body.idOrPhone,
        amountOrTerms: body.amountOrTerms,
        customTerms: body.customTerms,
      })
      .returning();

    res.status(201).json(mapContractRow(row));
  } catch (err) {
    req.log.error({ err }, "Failed to create contract");
    res.status(400).json({ message: "داتاکان هەڵەن" });
  }
});

router.get("/admin/catalog", requireAdmin, async (_req, res): Promise<void> => {
  try {
    const sectorCounts = await db
      .select({
        sectorKey: businessRegistrationsTable.sectorKey,
        count: sql<number>`count(*)::int`,
      })
      .from(businessRegistrationsTable)
      .groupBy(businessRegistrationsTable.sectorKey);

    const categoryCounts = await db
      .select({
        category: productsTable.category,
        count: sql<number>`count(*)::int`,
      })
      .from(productsTable)
      .groupBy(productsTable.category);

    const countMap = new Map(sectorCounts.map((r) => [r.sectorKey, r.count]));
    const catCountMap = new Map(categoryCounts.map((r) => [r.category, r.count]));

    const [sectorSetting] = await db
      .select()
      .from(platformSettingsTable)
      .where(eq(platformSettingsTable.key, "admin_sectors"));
    const [catSetting] = await db
      .select()
      .from(platformSettingsTable)
      .where(eq(platformSettingsTable.key, "admin_categories"));

    const storedSectors = sectorSetting?.value as typeof DEFAULT_ADMIN_SECTORS | undefined;
    const storedCategories = catSetting?.value as typeof DEFAULT_ADMIN_CATEGORIES | undefined;

    const sectors = (storedSectors ?? DEFAULT_ADMIN_SECTORS).map((s) => ({
      ...s,
      registrationCount: countMap.get(s.key) ?? 0,
    }));

    const categories = (storedCategories ?? DEFAULT_ADMIN_CATEGORIES).map((c) => ({
      ...c,
      productCount: catCountMap.get(c.key) ?? 0,
    }));

    res.json({ sectors, categories });
  } catch (err) {
    _req.log.error({ err }, "Failed to fetch admin catalog");
    res.json({
      sectors: DEFAULT_ADMIN_SECTORS.map((s) => ({ ...s, registrationCount: 0 })),
      categories: DEFAULT_ADMIN_CATEGORIES.map((c) => ({ ...c, productCount: 0 })),
    });
  }
});

router.put("/admin/catalog", requireAdmin, async (req, res): Promise<void> => {
  try {
    const schema = z.object({
      sectors: z.array(
        z.object({
          key: z.string(),
          nameKu: z.string(),
          nameAr: z.string(),
          nameEn: z.string(),
          group: z.string(),
          color: z.string(),
          categories: z.array(z.string()),
        }),
      ),
      categories: z.array(
        z.object({
          key: z.string(),
          nameKu: z.string(),
          nameAr: z.string(),
          nameEn: z.string(),
        }),
      ),
    });
    const body = schema.parse(req.body);

    const now = new Date();
    const [existingSectors] = await db
      .select()
      .from(platformSettingsTable)
      .where(eq(platformSettingsTable.key, "admin_sectors"));
    if (existingSectors) {
      await db
        .update(platformSettingsTable)
        .set({ value: body.sectors, updatedAt: now })
        .where(eq(platformSettingsTable.key, "admin_sectors"));
    } else {
      await db.insert(platformSettingsTable).values({ key: "admin_sectors", value: body.sectors, updatedAt: now });
    }

    const [existingCats] = await db
      .select()
      .from(platformSettingsTable)
      .where(eq(platformSettingsTable.key, "admin_categories"));
    if (existingCats) {
      await db
        .update(platformSettingsTable)
        .set({ value: body.categories, updatedAt: now })
        .where(eq(platformSettingsTable.key, "admin_categories"));
    } else {
      await db.insert(platformSettingsTable).values({ key: "admin_categories", value: body.categories, updatedAt: now });
    }

    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to save admin catalog");
    res.status(400).json({ message: "داتاکان هەڵەن" });
  }
});

export default router;
