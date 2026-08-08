import { pgTable, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const loyaltyAccountsTable = pgTable("loyalty_accounts", {
  userId: integer("user_id")
    .primaryKey()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  points: integer("points").notNull().default(0),
  challengeProgress: jsonb("challenge_progress").notNull().default({}),
  completedChallengeIds: jsonb("completed_challenge_ids").notNull().default([]),
  lastSpinAt: timestamp("last_spin_at"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type LoyaltyAccount = typeof loyaltyAccountsTable.$inferSelect;
