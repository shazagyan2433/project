import { pgTable, serial, integer, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const adminContractsTable = pgTable("admin_contracts", {
  id: serial("id").primaryKey(),
  contractCode: text("contract_code").notNull().unique(),
  userId: integer("user_id"),
  userName: text("user_name").notNull(),
  type: text("type").notNull(),
  status: text("status", { enum: ["active", "expiring", "expired"] }).notNull().default("active"),
  signatureStatus: text("signature_status", {
    enum: ["signed", "pending", "unsigned"],
  }).notNull().default("unsigned"),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  content: jsonb("content"),
  firstPartyName: text("first_party_name"),
  secondPartyName: text("second_party_name"),
  idOrPhone: text("id_or_phone"),
  amountOrTerms: text("amount_or_terms"),
  customTerms: text("custom_terms"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type AdminContractRow = typeof adminContractsTable.$inferSelect;
export type InsertAdminContract = typeof adminContractsTable.$inferInsert;
