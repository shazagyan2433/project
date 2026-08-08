/**
 * Single source of truth for sector → category mappings and sector → nav feature sets.
 * See .agents/memory/industry-context-refactor.md
 */

export type CatKey =
  | "electronic" | "stationery" | "babyCare"   | "cosmetics"    | "homeLiving"
  | "gaming"     | "food"       | "medicine"   | "clothing"     | "automotive"
  | "agriculture"| "construction"| "sports"    | "beauty"       | "cleaning"
  | "office"     | "technology" | "printing"   | "books"
  | "medicalSupplies" | "mobile" | "accessories" | "software"
  | "computer" | "pcParts"
  | "ticketsFlights" | "hotelsBooking" | "visasTours" | "travelInsurance" | "pensionTransport"
  | "officeSupplies" | "officeFurniture" | "officeServices" | "computerPrinting";

export const ALL_CAT_KEYS: CatKey[] = [
  "electronic", "stationery", "babyCare", "cosmetics", "homeLiving", "gaming",
  "food", "medicine", "clothing", "automotive", "agriculture", "construction",
  "sports", "beauty", "cleaning", "office", "technology", "printing", "books",
  "medicalSupplies", "mobile", "accessories", "software",
  "computer", "pcParts",
  "ticketsFlights", "hotelsBooking", "visasTours", "travelInsurance", "pensionTransport",
  "officeSupplies", "officeFurniture", "officeServices", "computerPrinting",
];

/** All onboarding sector keys (37) — must match `register.tsx` SECTORS. */
export const ONBOARDING_SECTOR_KEYS = [
  "distributor", "manufacturer", "hospital", "supermarket", "retail_shop", "restaurant", "hotel",
  "pharmacy", "delivery", "office", "agriculture", "food_beverage", "fmcg", "wholesale", "real_estate",
  "automotive", "technology", "electronics", "logistics", "fashion", "construction", "education",
  "healthcare", "finance", "beauty_salon", "gym_fitness", "clinic", "bakery", "printing",
  "travel_agency", "media", "telecom", "energy", "legal", "nursery", "laundry", "other",
] as const;

export type OnboardingSectorKey = typeof ONBOARDING_SECTOR_KEYS[number];

/**
 * Strict sector → allowed product categories. Zero cross-contamination.
 * Each sector only sees categories that match its onboarding business type.
 */
export const SECTOR_CATEGORY_MAP: Record<OnboardingSectorKey, CatKey[]> = {
  /* ── Enterprise / B2B ─────────────────────────────────────────── */
  distributor:   ["food", "cleaning", "cosmetics", "babyCare", "homeLiving", "stationery"],
  manufacturer:  ["construction", "agriculture", "automotive"],
  fmcg:          ["food", "cleaning", "cosmetics", "babyCare", "stationery"],
  wholesale:     ["food", "cleaning", "cosmetics", "homeLiving", "stationery", "babyCare"],
  finance:       ["stationery", "office", "electronic"],

  /* ── Retail & food service ─────────────────────────────────────── */
  supermarket:   ["food", "cleaning", "babyCare", "cosmetics", "homeLiving", "stationery"],
  restaurant:    ["food", "cleaning", "homeLiving"],
  hotel:         ["homeLiving", "cleaning", "food", "office"],
  food_beverage: ["food", "cleaning"],
  bakery:        ["food", "cleaning", "stationery"],
  retail_shop:   ["clothing", "cosmetics", "stationery", "gaming", "homeLiving", "electronic"],
  fashion:       ["clothing", "cosmetics", "beauty"],
  beauty_salon:  ["cosmetics", "beauty", "cleaning"],
  gym_fitness:   ["sports", "clothing", "cleaning"],
  laundry:       ["cleaning"],

  /* ── Healthcare — medical inventory only (no tech / office leak) ── */
  pharmacy:      ["medicine", "medicalSupplies", "babyCare", "cleaning"],
  hospital:      ["medicine", "medicalSupplies", "babyCare", "cleaning", "cosmetics"],
  clinic:        ["medicine", "medicalSupplies", "cleaning", "cosmetics"],
  healthcare:    ["medicine", "medicalSupplies", "babyCare", "cleaning", "cosmetics"],

  /* ── Logistics ─────────────────────────────────────────────────── */
  delivery:      ["cleaning", "automotive", "office"],
  logistics:     ["cleaning", "automotive", "office", "stationery"],

  /* ── Technology & electronics ─────────────────────────────────── */
  technology:    ["technology", "electronic", "mobile", "computer", "pcParts", "accessories", "software", "office", "stationery"],
  electronics:   ["mobile", "computer", "pcParts", "accessories"],
  telecom:       ["mobile", "accessories", "electronic", "technology"],
  media:         ["electronic", "printing", "stationery", "office", "software"],

  /* ── Industrial & trades ──────────────────────────────────────── */
  agriculture:   ["agriculture"],
  construction:  ["construction"],
  automotive:    ["automotive"],
  energy:        ["construction", "technology", "automotive"],
  printing:      ["printing", "computerPrinting", "officeSupplies", "stationery"],
  real_estate:   ["construction", "office"],

  /* ── Professional & services ──────────────────────────────────── */
  office:        ["officeSupplies", "officeFurniture", "officeServices", "computerPrinting"],
  education:     ["books", "stationery", "officeSupplies", "computerPrinting"],
  legal:         ["stationery", "books", "officeSupplies", "officeServices"],
  travel_agency: ["ticketsFlights", "hotelsBooking", "visasTours", "travelInsurance", "pensionTransport"],
  nursery:       ["agriculture", "homeLiving", "cleaning"],

  /* ── General (still scoped — not full catalog) ────────────────── */
  other:         ["food", "cleaning", "stationery", "homeLiving", "cosmetics"],
};

export type NavFeatureKey =
  | "marketplace"
  | "ai-assistant"
  | "inventory"
  | "logistics"
  | "negotiation"
  | "financial"
  | "market-intel"
  | "supplier-directory"
  | "procurement";

export const ALL_NAV_FEATURES: NavFeatureKey[] = [
  "marketplace",
  "ai-assistant",
  "inventory",
  "logistics",
  "negotiation",
  "financial",
  "market-intel",
  "supplier-directory",
  "procurement",
];

const ENTERPRISE_NAV: NavFeatureKey[] = ALL_NAV_FEATURES;

const RETAIL_NAV: NavFeatureKey[] = [
  "marketplace",
  "ai-assistant",
  "inventory",
  "negotiation",
  "financial",
  "supplier-directory",
  "procurement",
];

const DELIVERY_NAV: NavFeatureKey[] = [
  "marketplace",
  "logistics",
  "inventory",
  "ai-assistant",
  "negotiation",
  "financial",
];

const STANDARD_NAV: NavFeatureKey[] = [
  "marketplace",
  "ai-assistant",
  "inventory",
  "financial",
  "supplier-directory",
  "procurement",
  "negotiation",
];

const SECTOR_NAV_MAP: Partial<Record<string, NavFeatureKey[]>> = {
  distributor:   ENTERPRISE_NAV,
  manufacturer:  ENTERPRISE_NAV,
  fmcg:          ENTERPRISE_NAV,
  wholesale:     ENTERPRISE_NAV,
  finance:       ENTERPRISE_NAV,
  supermarket:   RETAIL_NAV,
  restaurant:    RETAIL_NAV,
  hotel:         RETAIL_NAV,
  food_beverage: RETAIL_NAV,
  fashion:       RETAIL_NAV,
  beauty_salon:  RETAIL_NAV,
  gym_fitness:   RETAIL_NAV,
  bakery:        RETAIL_NAV,
  laundry:       RETAIL_NAV,
  delivery:      DELIVERY_NAV,
  logistics:     DELIVERY_NAV,
  hospital:      ["marketplace", "procurement", "supplier-directory", "inventory", "ai-assistant"],
  pharmacy:      ["marketplace", "procurement", "supplier-directory", "inventory"],
  clinic:        ["marketplace", "procurement", "supplier-directory", "inventory"],
  healthcare:    ["marketplace", "procurement", "supplier-directory", "inventory"],
  technology:    [...STANDARD_NAV, "market-intel"],
  electronics:   [...STANDARD_NAV, "market-intel"],
  telecom:       [...STANDARD_NAV, "market-intel"],
  media:         [...STANDARD_NAV, "market-intel"],
  retail_shop:   STANDARD_NAV,
  office:        STANDARD_NAV,
  agriculture:   STANDARD_NAV,
  real_estate:   STANDARD_NAV,
  automotive:    STANDARD_NAV,
  construction:  STANDARD_NAV,
  education:     STANDARD_NAV,
  printing:      STANDARD_NAV,
  travel_agency: STANDARD_NAV,
  energy:        STANDARD_NAV,
  legal:         STANDARD_NAV,
  nursery:       STANDARD_NAV,
  other:         ALL_NAV_FEATURES,
};

/** Onboarding aliases (e.g. legacy keys, Kurdish labels stored in localStorage). */
export const SECTOR_KEY_ALIASES: Record<string, string> = {
  factory:       "manufacturer",
  کارگە:         "manufacturer",
  distributor_alt: "distributor",
  دابەشکار:      "distributor",
  retail:        "retail_shop",
  shop:          "retail_shop",
  salon:         "beauty_salon",
  pharma:        "pharmacy",
  دەرمانسازی:    "pharmacy",
  hospital_clinic: "clinic",
  travel:        "travel_agency",
  tourism:       "travel_agency",
  گەشتوگوزار:    "travel_agency",
  "گەشتوگوزار و گەشتکردن": "travel_agency",
  نووسینگە:      "office",
  office_services: "office",
};

/** Maps buyer-catalog, API, and legacy category ids to canonical CatKey. */
export const CATEGORY_ALIASES: Record<string, CatKey> = {
  electronic: "electronic", electronics: "electronic", ئەلکترۆنی: "electronic",
  stationery: "stationery", نووسینگە: "stationery",
  babyCare: "babyCare", baby: "babyCare", منداڵ: "babyCare",
  cosmetics: "cosmetics", جوانکاری: "cosmetics", beauty_products: "cosmetics",
  homeLiving: "homeLiving", home: "homeLiving", ماڵداری: "homeLiving",
  gaming: "gaming", یاری: "gaming",
  food: "food", خۆراکی: "food", خواردن: "food", groceries: "food",
  dairy: "food", beverages: "food", grains: "food", بەهارات: "food",
  medicine: "medicine", دەرمان: "medicine", دەرمانی: "medicine", health: "medicine", pharma: "medicine",
  medicalSupplies: "medicalSupplies", medical: "medicalSupplies", پێداویستی_پزیشکی: "medicalSupplies",
  "پێداویستی پزیشکی": "medicalSupplies", medical_equipment: "medicalSupplies",
  mobile: "mobile", مۆبایل: "mobile", phones: "mobile", smartphone: "mobile",
  accessories: "accessories", ئێکسسوارات: "accessories", accessory: "accessories",
  software: "software", سۆفتوێر: "software", apps: "software",
  clothing: "clothing", جل: "clothing", fashion: "clothing",
  automotive: "automotive", ئۆتۆمۆبیل: "automotive",
  agriculture: "agriculture", کشتوکاڵ: "agriculture", زراعة: "agriculture",
  construction: "construction", بیناسازی: "construction",
  sports: "sports", وەرزش: "sports",
  beauty: "beauty",
  cleaning: "cleaning", پاکیژەکاری: "cleaning", پاکیزەیی: "cleaning",
  office: "office", ئۆفیس: "office",
  technology: "technology", تەکنەلۆجی: "technology", tech: "technology",
  printing: "printing", چاپ: "printing",
  books: "books", کتێب: "books",
  computer: "computer", کۆمپیوتەر: "computer", computers: "computer", pc: "computer",
  pcParts: "pcParts", pc_parts: "pcParts", "pc-parts": "pcParts", "پارچەکانی PC": "pcParts",
  ticketsFlights: "ticketsFlights", flights: "ticketsFlights", tickets: "ticketsFlights",
  "تکت و فڕۆکەوانی": "ticketsFlights",
  hotelsBooking: "hotelsBooking", hotels: "hotelsBooking", booking: "hotelsBooking",
  "هۆتێل و حجز": "hotelsBooking",
  visasTours: "visasTours", visas: "visasTours", tours: "visasTours",
  "ڤیزە و گەشتەکان": "visasTours",
  travelInsurance: "travelInsurance", insurance: "travelInsurance", تەئمین: "travelInsurance",
  pensionTransport: "pensionTransport", transport: "pensionTransport", pension: "pensionTransport",
  "پێنسیۆن و ترانسپۆرت": "pensionTransport",
  officeSupplies: "officeSupplies", "کەلوپەلی ئۆفیس": "officeSupplies", office_supplies: "officeSupplies",
  officeFurniture: "officeFurniture", سافڵایز: "officeFurniture", soft_furnishing: "officeFurniture",
  officeServices: "officeServices", "خزمەتگوزاری نووسینگە": "officeServices", office_services: "officeServices",
  computerPrinting: "computerPrinting", "کۆمپیوتەر و چاپ": "computerPrinting", computer_printing: "computerPrinting",
  general: "food",
};

/** Kurdish supplier-directory category labels → CatKey (or logistics service). */
export const SUPPLIER_CATEGORY_MAP: Record<string, CatKey | "logistics_service"> = {
  "خۆراکی":     "food",
  "خواردنەوە":  "food",
  "پاکیژەکاری": "cleaning",
  "بەهارات":    "food",
  "دەرمانی":    "medicine",
  "گەیاندن":    "logistics_service",
};

export const CATEGORY_LABELS_KU: Record<CatKey, string> = {
  food: "خۆراکی", cleaning: "پاککەرەوە", medicine: "دەرمان", electronic: "ئەلکترۆنی",
  clothing: "جل و بەرگ", cosmetics: "جوانکاری", homeLiving: "ماڵداری", babyCare: "شیر و منداڵ",
  stationery: "نووسینگە", agriculture: "کشتوکاڵ", automotive: "ئۆتۆمۆبیل",
  construction: "بیناسازی", sports: "وەرزش", beauty: "ژینگە", office: "ئۆفیس",
  technology: "تەکنەلۆجی", gaming: "یاری", books: "کتێب", printing: "چاپ",
  medicalSupplies: "پێداویستی پزیشکی", mobile: "مۆبایل", accessories: "ئێکسسوارات", software: "سۆفتوێر",
  computer: "کۆمپیوتەر", pcParts: "پارچەکانی PC",
  ticketsFlights: "تکت و فڕۆکەوانی", hotelsBooking: "هۆتێل و حجز",
  visasTours: "ڤیزە و گەشتەکان", travelInsurance: "تەئمین", pensionTransport: "پێنسیۆن و ترانسپۆرت",
  officeSupplies: "کەلوپەلی ئۆفیس", officeFurniture: "سافڵایز",
  officeServices: "خزمەتگوزاری نووسینگە", computerPrinting: "کۆمپیوتەر و چاپ",
};

/** null sectorKey → full nav access (admin / unscoped). */
export function getSectorNavFeatures(sectorKey: string | null): NavFeatureKey[] | null {
  if (sectorKey === null) return null;
  const key = normalizeSectorKey(sectorKey);
  if (!key) return ALL_NAV_FEATURES;
  return SECTOR_NAV_MAP[key] ?? ALL_NAV_FEATURES;
}

export function isNavFeatureAllowed(
  feature: NavFeatureKey,
  features: NavFeatureKey[] | null,
): boolean {
  return !features || features.includes(feature);
}

/** Resolve onboarding sector from auth user or `linqi_sector` localStorage. */
export function resolveUserSectorKey(userSectorKey?: string | null): string | null {
  const fromUser = userSectorKey?.trim();
  if (fromUser) return fromUser;
  try {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("linqi_sector");
      if (stored?.trim()) return stored.trim();
      // Legacy / alternate keys some sessions may persist
      const alt =
        localStorage.getItem("linqi_business_sector") ||
        localStorage.getItem("businessSector");
      if (alt?.trim()) return alt.trim();
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** Normalize sector keys / aliases to canonical onboarding keys. */
export function normalizeSectorKey(sectorKey: string | null | undefined): OnboardingSectorKey | null {
  if (!sectorKey?.trim()) return null;
  const raw = sectorKey.trim();
  const alias = SECTOR_KEY_ALIASES[raw];
  const candidate = alias ?? raw;
  if ((ONBOARDING_SECTOR_KEYS as readonly string[]).includes(candidate)) {
    return candidate as OnboardingSectorKey;
  }
  const lower = candidate.toLowerCase();
  if ((ONBOARDING_SECTOR_KEYS as readonly string[]).includes(lower)) {
    return lower as OnboardingSectorKey;
  }
  return null;
}

/** Categories that must never appear for healthcare / pharmacy merchants. */
export const HEALTHCARE_EXCLUDED_CATS: readonly CatKey[] = [
  "technology",
  "electronic",
  "mobile",
  "accessories",
  "software",
  "gaming",
  "office",
  "stationery",
  "printing",
  "books",
  "automotive",
  "construction",
  "agriculture",
  "clothing",
] as const;

const HEALTHCARE_SECTORS = new Set<OnboardingSectorKey>([
  "pharmacy",
  "hospital",
  "clinic",
  "healthcare",
]);

/** Strict allowlist for inventory / marketplace category UI — never falls back to ALL_CAT_KEYS. */
export function getStrictSectorCategories(sectorKey: string | null | undefined): CatKey[] {
  const key = normalizeSectorKey(sectorKey);
  if (!key) return [];
  const mapped = SECTOR_CATEGORY_MAP[key];
  if (!mapped?.length) return [];
  let keys = mapped.filter((k): k is CatKey => (ALL_CAT_KEYS as string[]).includes(k));
  if (HEALTHCARE_SECTORS.has(key)) {
    keys = keys.filter(k => !HEALTHCARE_EXCLUDED_CATS.includes(k));
  }
  // Pharmacy: absolute purge of tech / non-medical leftovers
  if (key === "pharmacy") {
    keys = keys.filter(
      k =>
        k === "medicine" ||
        k === "medicalSupplies" ||
        k === "babyCare" ||
        k === "cleaning",
    );
  }
  // Electronics retail: only device / parts ecosystem
  if (key === "electronics") {
    keys = keys.filter(k =>
      k === "mobile" || k === "computer" || k === "pcParts" || k === "accessories",
    );
  }
  // Travel agency: only tourism service categories
  if (key === "travel_agency") {
    keys = keys.filter(k =>
      k === "ticketsFlights" ||
      k === "hotelsBooking" ||
      k === "visasTours" ||
      k === "travelInsurance" ||
      k === "pensionTransport",
    );
  }
  // Office / services: only office ecosystem categories
  if (key === "office") {
    keys = keys.filter(k =>
      k === "officeSupplies" ||
      k === "officeFurniture" ||
      k === "officeServices" ||
      k === "computerPrinting",
    );
  }
  return keys;
}

/** First allowed category for a sector — never falls back to cross-sector defaults. */
export function getDefaultSectorCategory(sectorKey: string | null | undefined): CatKey | null {
  const chips = getStrictSectorCategories(sectorKey);
  return chips[0] ?? null;
}

/** Category chip keys for UI filters — only explicitly mapped sector categories. */
export function getSectorCategoryChips(sectorKey: string | null | undefined): CatKey[] {
  return getStrictSectorCategories(sectorKey);
}

/** Allowed marketplace categories for a sector; null when sector is unknown / unset. */
export function getAllowedCategoriesForSector(sectorKey: string | null | undefined): CatKey[] | null {
  const key = normalizeSectorKey(sectorKey);
  if (!key) return null;
  return getStrictSectorCategories(key);
}

/** Category dropdown options scoped to the user's sector — no static fallback list. */
export function getSectorCategoryOptions(
  sectorKey: string | null | undefined,
  labelFn?: (key: CatKey) => string,
): Array<{ key: CatKey; label: string }> {
  return getStrictSectorCategories(sectorKey).map(k => ({
    key: k,
    label: labelFn?.(k) ?? CATEGORY_LABELS_KU[k] ?? k,
  }));
}

/** Map arbitrary category strings (API, localStorage, i18n) to CatKey. */
export function normalizeCategoryKey(raw: string | null | undefined): CatKey | null {
  if (!raw?.trim()) return null;
  const key = raw.trim();
  if ((ALL_CAT_KEYS as string[]).includes(key)) return key as CatKey;
  const alias = CATEGORY_ALIASES[key];
  if (alias) return alias;
  const lower = key.toLowerCase();
  if ((ALL_CAT_KEYS as string[]).includes(lower)) return lower as CatKey;
  const lowerAlias = CATEGORY_ALIASES[lower];
  if (lowerAlias) return lowerAlias;
  return null;
}

/** Strict sector gate for product/catalog rows.
 *  Known sector with no matching categories → deny (empty list).
 *  Unknown / unset sectorKey → deny for merchant safety (no cross-sector mock fill).
 *  Pass `null` only from admin / unscoped callers that intentionally want all data.
 */
export function isProductAllowedForSector(
  cat: CatKey,
  sectorKey: string | null | undefined,
): boolean {
  const key = normalizeSectorKey(sectorKey);
  if (!key) return false;
  const allowed = getStrictSectorCategories(key);
  if (!allowed.length) return false;
  return allowed.includes(cat);
}

/** Strict sector gate using a raw category string (API / legacy ids). */
export function isRawCategoryAllowedForSector(
  rawCategory: string | null | undefined,
  sectorKey: string | null | undefined,
): boolean {
  const key = normalizeSectorKey(sectorKey);
  if (!key) return false;
  const cat = normalizeCategoryKey(rawCategory);
  if (!cat) return false;
  return isProductAllowedForSector(cat, key);
}

/** Filter arbitrary lists by sector + category field accessor. Empty when sector unknown. */
export function filterBySectorCategory<T>(
  items: T[],
  sectorKey: string | null | undefined,
  getCategory: (item: T) => string | null | undefined,
): T[] {
  const key = normalizeSectorKey(sectorKey);
  if (!key) return [];
  return items.filter(item => isRawCategoryAllowedForSector(getCategory(item), key));
}

/** Filter API product rows (`category` field) for the current sector. Empty when no matches. */
export function filterProductsBySector<T extends { category?: string | null }>(
  products: T[],
  sectorKey: string | null | undefined,
): T[] {
  const key = normalizeSectorKey(sectorKey);
  if (!key) return [];
  return filterBySectorCategory(products, key, p => p.category ?? null);
}

/** True when a seller row matches the user's sector via any specialty category. */
export function isSellerAllowedForSector(
  specialties: CatKey[],
  sectorKey: string | null | undefined,
): boolean {
  const key = normalizeSectorKey(sectorKey);
  if (!key) return false;
  return specialties.some(sp => isProductAllowedForSector(sp, key));
}

/** Supplier-directory row gate (includes logistics-only suppliers). */
export function isSupplierAllowedForSector(
  supplierCategoryLabel: string,
  sectorKey: string | null | undefined,
): boolean {
  const key = normalizeSectorKey(sectorKey);
  if (!key) return false;
  const mapped = SUPPLIER_CATEGORY_MAP[supplierCategoryLabel];
  if (mapped === "logistics_service") {
    return ["delivery", "logistics"].includes(key);
  }
  if (!mapped) return false;
  return isProductAllowedForSector(mapped, key);
}

/** API supplier row gate — match buyer sector to supplier onboarding sector. */
export function isSupplierSectorAllowedForBuyer(
  supplierSectorKey: string,
  buyerSectorKey: string | null | undefined,
): boolean {
  const buyerKey = normalizeSectorKey(buyerSectorKey);
  if (!buyerKey) return false;
  const supplierKey = normalizeSectorKey(supplierSectorKey);
  if (!supplierKey) return false;
  if (supplierKey === "delivery" || supplierKey === "logistics") {
    return buyerKey === "delivery" || buyerKey === "logistics";
  }
  const supplierCats = getSectorCategoryChips(supplierKey);
  if (!supplierCats.length) return false;
  return supplierCats.some((cat) => isProductAllowedForSector(cat, buyerKey));
}

/** Primary Kurdish category label for a supplier's sector. */
export function getPrimaryCategoryLabelForSector(sectorKey: string): string {
  const key = normalizeSectorKey(sectorKey);
  if (!key) return "";
  const chips = getSectorCategoryChips(key);
  if (!chips.length) return "";
  return CATEGORY_LABELS_KU[chips[0]] ?? chips[0];
}

/** Buyer-catalog category id → allowed for sector. */
export function isBuyerCategoryAllowedForSector(
  buyerCategoryId: string,
  sectorKey: string | null | undefined,
): boolean {
  const cat = normalizeCategoryKey(buyerCategoryId);
  if (!cat) return false;
  return isProductAllowedForSector(cat, sectorKey);
}

/** Dashboard widgets tagged with optional `cat` — strip cross-sector demo rows. */
export function filterSectorTaggedItems<T extends { cat?: CatKey }>(
  items: T[],
  sectorKey: string | null | undefined,
): T[] {
  const key = normalizeSectorKey(sectorKey);
  if (!key) return items;
  return items.filter(item => {
    if (!item.cat) return true;
    return isProductAllowedForSector(item.cat, key);
  });
}
