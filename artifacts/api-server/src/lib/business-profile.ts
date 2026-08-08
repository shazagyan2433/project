/** Must match `ONBOARDING_SECTOR_KEYS` in kurdish-pos industries.ts */
export const VALID_SECTOR_KEYS = new Set([
  "distributor", "manufacturer", "hospital", "supermarket", "retail_shop", "restaurant", "hotel",
  "pharmacy", "delivery", "office", "agriculture", "food_beverage", "fmcg", "wholesale", "real_estate",
  "automotive", "technology", "electronics", "logistics", "fashion", "construction", "education",
  "healthcare", "finance", "beauty_salon", "gym_fitness", "clinic", "bakery", "printing",
  "travel_agency", "media", "telecom", "energy", "legal", "nursery", "laundry", "other",
]);

const BLOCKED_BUSINESS_NAMES = new Set([
  "trutruy", "ghgjh", "gjhgjh", "sheza", "test", "testing", "asdf", "qwerty", "qwer",
  "abc", "xxx", "dummy", "fake", "sample", "user", "admin", "null", "undefined",
]);

export function normalizeBusinessName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function isValidSectorKey(sectorKey: string): boolean {
  return VALID_SECTOR_KEYS.has(sectorKey.trim().toLowerCase());
}

export function isValidBusinessName(name: string): boolean {
  const normalized = normalizeBusinessName(name);
  if (normalized.length < 3 || normalized.length > 120) return false;
  if (!/^\p{L}/u.test(normalized)) return false;

  const letters = [...normalized].filter((ch) => /\p{L}/u.test(ch));
  if (letters.length < 2) return false;

  const compact = normalized.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  if (BLOCKED_BUSINESS_NAMES.has(compact)) return false;
  if (/^(.)\1{2,}$/u.test(compact)) return false;
  if (/(.)\1{2,}/u.test(compact)) return false;

  const latinOnly = /^[\p{Script=Latin}\s.'-]+$/u.test(normalized);
  if (latinOnly && normalized.length < 6 && !/\s/.test(normalized)) {
    const vowels = (compact.match(/[aeiouy]/gi) ?? []).length;
    if (vowels === 0) return false;
    if (vowels / letters.length < 0.2) return false;
  }

  return true;
}

export function isValidMobile(mobile: string): boolean {
  const digits = normalizePhone(mobile);
  if (digits.length < 10 || digits.length > 15) return false;
  if (digits.startsWith("964")) return digits.length >= 12;
  if (digits.startsWith("0")) return digits.length >= 10 && digits.length <= 11;
  return digits.length >= 10;
}

export type BusinessRegistrationLike = {
  businessName: string;
  mobile?: string | null;
  sectorKey: string;
  sectorGroup: string;
  status?: string;
  extraData?: Record<string, unknown> | null;
};

export function isTestOrJunkRegistration(row: BusinessRegistrationLike): boolean {
  const extra = row.extraData ?? {};
  if (extra.isTest === true || extra.isTestData === true) return true;
  if (extra.accountType === "test" || extra.role === "test") return true;
  if (!isValidBusinessName(row.businessName)) return true;
  if (!row.mobile || !isValidMobile(row.mobile)) return true;
  if (!isValidSectorKey(row.sectorKey)) return true;
  return false;
}

export function isValidBusinessProfile(row: BusinessRegistrationLike): boolean {
  return (
    isValidBusinessName(row.businessName) &&
    Boolean(row.mobile && isValidMobile(row.mobile)) &&
    isValidSectorKey(row.sectorKey)
  );
}

export function validateRegistrationInput(input: {
  businessName: string;
  mobile?: string;
  sectorKey: string;
}): string | null {
  if (!isValidSectorKey(input.sectorKey)) {
    return "جۆری بزنس هەڵبژێردراوە نادروستە";
  }
  if (!isValidBusinessName(input.businessName)) {
    return "ناوی بزنس نادروستە — لانیکەم ٣ پیت و ناوێکی ڕاستەقینە بنووسە";
  }
  if (!input.mobile?.trim() || !isValidMobile(input.mobile)) {
    return "ژمارەی مۆبایل نادروستە (لانیکەم ١٠ ژمارە)";
  }
  return null;
}
