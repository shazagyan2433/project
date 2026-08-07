import { pgTable, serial, text, timestamp, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["admin", "staff"] }).notNull().default("staff"),
  canViewProfit: boolean("can_view_profit").notNull().default(false),
  canDeleteData: boolean("can_delete_data").notNull().default(false),
  canEditStock: boolean("can_edit_stock").notNull().default(true),
  canAccessReports: boolean("can_access_reports").notNull().default(true),
  // Profile extras
  email: text("email"),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
  // Store / company info
  storeName: text("store_name"),
  storeAddress: text("store_address"),
  storeLat: real("store_lat"),
  storeLng: real("store_lng"),
  taxNumber: text("tax_number"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
