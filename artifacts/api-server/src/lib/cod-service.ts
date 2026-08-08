import { db, salesTable, deliveriesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { io } from "../socket";

export const COD_ORDER_PREFIX = "SALE-";

export function saleOrderId(saleId: number): string {
  return `${COD_ORDER_PREFIX}${saleId}`;
}

export function parseSaleIdFromOrderId(orderId: string): number | null {
  if (!orderId.startsWith(COD_ORDER_PREFIX)) return null;
  const id = Number(orderId.slice(COD_ORDER_PREFIX.length));
  return Number.isFinite(id) && id > 0 ? id : null;
}

export type CodCollectResult = {
  saleId: number;
  orderId: string;
  amount: number;
  currency: string;
  driverId: number;
  driverName: string;
  collectedAt: string;
};

export class CodError extends Error {
  constructor(
    readonly code: "NOT_FOUND" | "NOT_COD" | "ALREADY_COLLECTED" | "CANCELLED" | "SALE_NOT_FOUND",
    message: string,
  ) {
    super(message);
    this.name = "CodError";
  }
}

export async function createCodDelivery(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  params: {
    saleId: number;
    totalAmount: number;
    currency?: string;
    shopLat: number;
    shopLng: number;
    shopName: string;
    customerLat: number;
    customerLng: number;
    customerName: string;
    driverId?: number;
  },
) {
  const orderId = saleOrderId(params.saleId);
  const [delivery] = await tx
    .insert(deliveriesTable)
    .values({
      orderId,
      saleId: params.saleId,
      driverId: params.driverId ?? null,
      status: "active",
      totalAmount: params.totalAmount.toString(),
      currency: params.currency ?? "IQD",
      shopLat: String(params.shopLat),
      shopLng: String(params.shopLng),
      shopName: params.shopName,
      customerLat: String(params.customerLat),
      customerLng: String(params.customerLng),
      customerName: params.customerName,
    })
    .returning();

  return delivery;
}

export async function collectCodPayment(
  orderId: string,
  driverId: number,
  driverName: string,
): Promise<CodCollectResult> {
  return db.transaction(async (tx) => {
    const [delivery] = await tx
      .select()
      .from(deliveriesTable)
      .where(eq(deliveriesTable.orderId, orderId));

    if (!delivery) {
      throw new CodError("NOT_FOUND", "Delivery not found");
    }
    if (delivery.status === "cancelled") {
      throw new CodError("CANCELLED", "Delivery was cancelled");
    }
    if (delivery.codCollectedAt) {
      throw new CodError("ALREADY_COLLECTED", "Cash already collected for this order");
    }

    const saleId = delivery.saleId ?? parseSaleIdFromOrderId(orderId);
    if (!saleId) {
      throw new CodError("SALE_NOT_FOUND", "Linked sale not found");
    }

    const [sale] = await tx.select().from(salesTable).where(eq(salesTable.id, saleId));
    if (!sale) {
      throw new CodError("SALE_NOT_FOUND", "Sale not found");
    }
    if (sale.paymentMethod !== "cash_on_delivery") {
      throw new CodError("NOT_COD", "Order is not cash on delivery");
    }
    if (sale.paymentStatus === "paid_cod") {
      throw new CodError("ALREADY_COLLECTED", "Payment already recorded");
    }

    const now = new Date();
    const amount = parseFloat(sale.totalAmount);
    const currency = delivery.currency ?? "IQD";

    await tx
      .update(deliveriesTable)
      .set({
        status: "completed",
        driverId,
        codCollectedAt: now,
        updatedAt: now,
      })
      .where(eq(deliveriesTable.id, delivery.id));

    await tx
      .update(salesTable)
      .set({
        orderStatus: "delivered",
        paymentStatus: "paid_cod",
        paidAmount: sale.totalAmount,
        paidAt: now,
        collectedByDriverId: driverId,
      })
      .where(eq(salesTable.id, saleId));

    return {
      saleId,
      orderId,
      amount,
      currency,
      driverId,
      driverName,
      collectedAt: now.toISOString(),
    };
  });
}

export function emitCodCollectedNotification(
  socketIo: typeof io | undefined,
  data: CodCollectResult,
) {
  if (!socketIo) return;
  socketIo.to("admin").emit("admin_notification", {
    id: `cod-${data.saleId}-${Date.now()}`,
    type: "cod_collected",
    createdAt: data.collectedAt,
    payload: {
      orderId: data.orderId,
      saleId: data.saleId,
      amount: data.amount,
      currency: data.currency,
      driverId: data.driverId,
      driverName: data.driverName,
    },
  });
}
