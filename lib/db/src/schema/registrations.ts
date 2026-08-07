import { pgTable, serial, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const businessRegistrationsTable = pgTable("business_registrations", {
  id: serial("id").primaryKey(),
  sectorKey:       text("sector_key").notNull(),
  sectorGroup:     text("sector_group").notNull(),
  businessName:    text("business_name").notNull(),
  email:           text("email"),
  mobile:          text("mobile").notNull().default(""),
  governorate:     text("governorate"),
  city:            text("city"),
  address:         text("address"),
  extraData:       jsonb("extra_data"),
  status: text("status", {
    enum: ["pending", "approved", "rejected", "suspended", "more_docs_needed"],
  }).notNull().default("pending"),
  rejectionReason: text("rejection_reason"),
  submittedAt:     timestamp("submitted_at").notNull().defaultNow(),
  reviewedAt:      timestamp("reviewed_at"),
  reviewedBy:      text("reviewed_by"),
});

export type BusinessRegistration = typeof businessRegistrationsTable.$inferSelect;
export type InsertBusinessRegistration = typeof businessRegistrationsTable.$inferInsert;
