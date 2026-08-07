/** Default sector/category catalog — synced with onboarding `SECTORS` keys. */
export const DEFAULT_ADMIN_SECTORS = [
  { key: "distributor", nameKu: "دابەشکار", nameAr: "موزع", nameEn: "Distributor", group: "enterprise", color: "#F59E0B", categories: ["food", "cleaning", "cosmetics"] },
  { key: "manufacturer", nameKu: "کارگە", nameAr: "مصنع", nameEn: "Manufacturer", group: "enterprise", color: "#EF4444", categories: ["construction", "agriculture"] },
  { key: "supermarket", nameKu: "سوپەرمارکێت", nameAr: "سوبرماركت", nameEn: "Supermarket", group: "retail", color: "#8B5CF6", categories: ["food", "cleaning", "babyCare"] },
  { key: "restaurant", nameKu: "چێشتخانە", nameAr: "مطعم", nameEn: "Restaurant", group: "retail", color: "#F97316", categories: ["food", "cleaning"] },
  { key: "pharmacy", nameKu: "دەرمانسازی", nameAr: "صيدلية", nameEn: "Pharmacy", group: "standard", color: "#22C55E", categories: ["medicine"] },
  { key: "delivery", nameKu: "گەیاندن", nameAr: "توصيل", nameEn: "Delivery", group: "delivery", color: "#10B981", categories: ["cleaning", "automotive"] },
  { key: "retail_shop", nameKu: "دوکانی فرۆشتن", nameAr: "متجر", nameEn: "Retail Shop", group: "standard", color: "#A855F7", categories: ["clothing", "cosmetics"] },
  { key: "other", nameKu: "دیکە", nameAr: "أخرى", nameEn: "Other", group: "standard", color: "#6B7280", categories: ["food", "cleaning"] },
] as const;

export const DEFAULT_ADMIN_CATEGORIES = [
  { key: "food", nameKu: "خواردن", nameAr: "طعام", nameEn: "Food" },
  { key: "cleaning", nameKu: "پاککەرەوە", nameAr: "تنظيف", nameEn: "Cleaning" },
  { key: "electronic", nameKu: "ئەلیکترۆنی", nameAr: "إلكترونيات", nameEn: "Electronics" },
  { key: "medicine", nameKu: "دەرمان", nameAr: "دواء", nameEn: "Medicine" },
  { key: "cosmetics", nameKu: "کۆسمەتیک", nameAr: "مستحضرات", nameEn: "Cosmetics" },
  { key: "clothing", nameKu: "جل و بەرگ", nameAr: "ملابس", nameEn: "Clothing" },
  { key: "construction", nameKu: "بیناسازی", nameAr: "بناء", nameEn: "Construction" },
  { key: "agriculture", nameKu: "جێڵانی", nameAr: "زراعة", nameEn: "Agriculture" },
  { key: "automotive", nameKu: "ئۆتۆمۆبیل", nameAr: "سيارات", nameEn: "Automotive" },
  { key: "stationery", nameKu: "کەرەستەی نووسین", nameAr: "قرطاسية", nameEn: "Stationery" },
  { key: "office", nameKu: "نووسینگە", nameAr: "مكتب", nameEn: "Office" },
  { key: "books", nameKu: "کتێب", nameAr: "كتب", nameEn: "Books" },
] as const;
