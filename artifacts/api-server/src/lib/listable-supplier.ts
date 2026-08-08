import {
  isTestOrJunkRegistration,
  isValidBusinessProfile,
  type BusinessRegistrationLike,
} from "./business-profile";

/** Sector groups that represent B2B sellers listed in the public supplier directory. */
const LISTABLE_SECTOR_GROUPS = new Set(["enterprise", "delivery"]);

export function isListableSupplier(row: {
  sectorGroup: string;
  sectorKey: string;
  status?: string;
}): boolean {
  if (row.status && row.status !== "approved") return false;
  return LISTABLE_SECTOR_GROUPS.has(row.sectorGroup);
}

/** Approved B2B profile with valid name, phone, and sector — excludes test/junk rows. */
export function isDisplayableSupplier(row: BusinessRegistrationLike): boolean {
  if (row.status && row.status !== "approved") return false;
  if (isTestOrJunkRegistration(row)) return false;
  if (!isValidBusinessProfile(row)) return false;
  return isListableSupplier(row);
}
