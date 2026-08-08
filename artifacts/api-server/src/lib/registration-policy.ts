import { validateRegistrationInput } from "./business-profile";
import { isListableSupplier } from "./listable-supplier";

export function assertValidRegistration(input: {
  businessName: string;
  mobile?: string;
  sectorKey: string;
  sectorGroup: string;
}): void {
  const message = validateRegistrationInput({
    businessName: input.businessName,
    mobile: input.mobile,
    sectorKey: input.sectorKey,
  });
  if (message) {
    const err = new Error(message);
    (err as Error & { statusCode?: number }).statusCode = 400;
    throw err;
  }
}

/** B2B supplier sectors can be listed immediately; others await admin review. */
export function initialRegistrationStatus(sectorGroup: string, sectorKey: string): "approved" | "pending" {
  return isListableSupplier({ sectorGroup, sectorKey }) ? "approved" : "pending";
}
