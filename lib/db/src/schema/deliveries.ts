import { pgTable, serial, integer, text, decimal, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const deliveriesTable = pgTable("deliveries", {
  id: serial("id").primaryKey(),
  orderId: text("order_id").notNull().unique(),
  saleId: integer("sale_id"),
  driverId: integer("driver_id"),
  status: text("status", { enum: ["active", "completed", "cancelled"] })
    .notNull()
    .default("active"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }),
  currency: text("currency").notNull().default("IQD"),
  // Pickup (shop) coordinates
  shopLat: decimal("shop_lat", { precision: 10, scale: 7 }).notNull(),
  shopLng: decimal("shop_lng", { precision: 10, scale: 7 }).notNull(),
  shopName: text("shop_name").notNull(),
  // Dropoff (customer) coordinates
  customerLat: decimal("customer_lat", { precision: 10, scale: 7 }).notNull(),
  customerLng: decimal("customer_lng", { precision: 10, scale: 7 }).notNull(),
  customerName: text("customer_name").notNull(),
  // Driver's last known GPS position
  driverLat: decimal("driver_lat", { precision: 10, scale: 7 }),
  driverLng: decimal("driver_lng", { precision: 10, scale: 7 }),
  driverHeading: decimal("driver_heading", { precision: 6, scale: 2 }),
  driverSpeed: decimal("driver_speed", { precision: 8, scale: 2 }),
  locationUpdatedAt: timestamp("location_updated_at"),
  codCollectedAt: timestamp("cod_collected_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertDeliverySchema = createInsertSchema(deliveriesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDelivery = z.infer<typeof insertDeliverySchema>;
export type Delivery = typeof deliveriesTable.$inferSelect;
