import { db, businessRegistrationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";
import { isTestOrJunkRegistration } from "./business-profile";

/**
 * Reject dev/test registrations (gibberish names, invalid phones, flagged test rows).
 * Runs once on API startup; safe to re-run (idempotent for already-rejected rows).
 */
export async function cleanupTestRegistrations(): Promise<number> {
  try {
    const rows = await db.select().from(businessRegistrationsTable);
    let cleaned = 0;

    for (const row of rows) {
      if (row.status === "rejected") continue;
      if (
        !isTestOrJunkRegistration({
          businessName: row.businessName,
          mobile: row.mobile,
          sectorKey: row.sectorKey,
          sectorGroup: row.sectorGroup,
          status: row.status,
          extraData: (row.extraData ?? {}) as Record<string, unknown>,
        })
      ) {
        continue;
      }

      const extra = { ...((row.extraData ?? {}) as Record<string, unknown>), isTest: true };
      await db
        .update(businessRegistrationsTable)
        .set({
          status: "rejected",
          rejectionReason: "auto:test_data_cleanup",
          extraData: extra,
          reviewedAt: new Date(),
          reviewedBy: "system_cleanup",
        })
        .where(eq(businessRegistrationsTable.id, row.id));
      cleaned++;
    }

    if (cleaned > 0) {
      logger.info({ cleaned }, "Rejected test/junk business registrations");
    }
    return cleaned;
  } catch (err) {
    logger.error({ err }, "Test registration cleanup failed");
    return 0;
  }
}
