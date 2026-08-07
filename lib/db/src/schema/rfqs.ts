import { pgTable, serial, text, timestamp, jsonb, integer } from "drizzle-orm/pg-core";

export const rfqsTable = pgTable("rfqs", {
  id: serial("id").primaryKey(),
  rfqCode: text("rfq_code").notNull().unique(),
  product: text("product").notNull(),
  quantity: text("quantity").notNull(),
  unit: text("unit").notNull(),
  category: text("category").notNull(),
  status: text("status", {
    enum: ["pending", "responded", "approved", "declined"],
  }).notNull().default("pending"),
  bestPrice: text("best_price"),
  deadline: timestamp("deadline"),
  sectorKey: text("sector_key").notNull(),
  suppliers: jsonb("suppliers").$type<string[]>().notNull().default([]),
  createdByUserId: integer("created_by_user_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Rfq = typeof rfqsTable.$inferSelect;
export type InsertRfq = typeof rfqsTable.$inferInsert;
