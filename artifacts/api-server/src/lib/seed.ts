import { db, usersTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { logger } from "./logger";

export async function seedDefaultAdmin() {
  if (process.env.NODE_ENV === "production" && process.env.SEED_DEFAULT_ADMIN !== "true") {
    return;
  }

  try {
    const [existing] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(usersTable);

    if ((existing?.count ?? 0) > 0) return;

    const passwordHash = await bcrypt.hash("admin123", 12);
    await db.insert(usersTable).values({
      name: "بەڕێوەبەر",
      username: "admin",
      passwordHash,
      role: "admin",
    });

    logger.info("Default admin created: username=admin password=admin123");
  } catch (err) {
    logger.error({ err }, "Failed to seed admin");
  }
}
