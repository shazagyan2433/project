/**
 * Geographic helpers for live driver map — no mock business data.
 */
export type { CityId, TrackedDriver } from "@/lib/admin-types";

export const CITY_COORDS: Record<
  Exclude<import("@/lib/admin-types").CityId, "all">,
  { lat: number; lng: number; zoom: number; label: { ku: string; ar: string; en: string } }
> = {
  sulaymaniyah: { lat: 35.5560, lng: 45.4350, zoom: 12, label: { ku: "سلێمانی", ar: "السليمانية", en: "Sulaymaniyah" } },
  erbil:        { lat: 36.1901, lng: 44.0091, zoom: 12, label: { ku: "هەولێر", ar: "أربيل", en: "Erbil" } },
  duhok:        { lat: 36.8665, lng: 42.9853, zoom: 12, label: { ku: "دهۆک", ar: "دهوك", en: "Duhok" } },
  halabja:      { lat: 35.1787, lng: 45.9862, zoom: 12, label: { ku: "هەڵەبجە", ar: "حلبجة", en: "Halabja" } },
  kirkuk:       { lat: 35.4681, lng: 44.3922, zoom: 12, label: { ku: "کەرکووک", ar: "كركوك", en: "Kirkuk" } },
  baghdad:      { lat: 33.3152, lng: 44.3661, zoom: 11, label: { ku: "بەغداد", ar: "بغداد", en: "Baghdad" } },
  basra:        { lat: 30.5085, lng: 47.7804, zoom: 11, label: { ku: "بەسرە", ar: "البصرة", en: "Basra" } },
  najaf:        { lat: 32.0003, lng: 44.3354, zoom: 12, label: { ku: "نەجەف", ar: "النجف", en: "Najaf" } },
  karbala:      { lat: 32.6160, lng: 44.0249, zoom: 12, label: { ku: "کەربەلا", ar: "كربلاء", en: "Karbala" } },
  nineveh:      { lat: 36.3350, lng: 43.1189, zoom: 11, label: { ku: "نەینەوا / موسڵ", ar: "نينوى / الموصل", en: "Nineveh / Mosul" } },
  anbar:        { lat: 33.4206, lng: 43.3079, zoom: 11, label: { ku: "ئەنبار", ar: "الأنبار", en: "Anbar" } },
  babylon:      { lat: 32.4833, lng: 44.4333, zoom: 12, label: { ku: "بابل", ar: "بابل", en: "Babylon" } },
  diyala:       { lat: 33.7481, lng: 44.6431, zoom: 12, label: { ku: "دیالە", ar: "ديالى", en: "Diyala" } },
  wasit:        { lat: 32.5128, lng: 45.8182, zoom: 12, label: { ku: "واسیت / کوت", ar: "واسط / الكوت", en: "Wasit / Kut" } },
  qadisiyah:    { lat: 31.9892, lng: 44.9247, zoom: 12, label: { ku: "قادسیە / دیوانیە", ar: "القادسية / الديوانية", en: "Qadisiyah / Diwaniyah" } },
  dhiqar:       { lat: 31.0429, lng: 46.2572, zoom: 12, label: { ku: "زیقاڕ / ناسریە", ar: "ذي قار / الناصرية", en: "Dhi Qar / Nasiriyah" } },
  maysan:       { lat: 31.8356, lng: 47.1448, zoom: 12, label: { ku: "مەیسان / میسان", ar: "ميسان / العمارة", en: "Maysan / Amarah" } },
  muthanna:     { lat: 31.3319, lng: 45.2944, zoom: 12, label: { ku: "مونسنیە / سەماوە", ar: "المثنى / السماوة", en: "Muthanna / Samawah" } },
  salahadin:    { lat: 34.5976, lng: 43.6780, zoom: 12, label: { ku: "سەڵاحەدین", ar: "صلاح الدين", en: "Salah al-Din" } },
};

export const IRAQ_CENTER: [number, number] = [33.15, 43.75];
export const IRAQ_ZOOM = 6;

export const CITY_FILTERS: { id: import("@/lib/admin-types").CityId; label: { ku: string; ar: string; en: string } }[] = [
  { id: "all", label: { ku: "هەموو", ar: "الكل", en: "All" } },
  { id: "sulaymaniyah", label: CITY_COORDS.sulaymaniyah.label },
  { id: "erbil", label: CITY_COORDS.erbil.label },
  { id: "duhok", label: CITY_COORDS.duhok.label },
  { id: "halabja", label: CITY_COORDS.halabja.label },
  { id: "kirkuk", label: CITY_COORDS.kirkuk.label },
  { id: "baghdad", label: CITY_COORDS.baghdad.label },
  { id: "basra", label: CITY_COORDS.basra.label },
  { id: "najaf", label: CITY_COORDS.najaf.label },
  { id: "karbala", label: CITY_COORDS.karbala.label },
  { id: "nineveh", label: CITY_COORDS.nineveh.label },
  { id: "anbar", label: CITY_COORDS.anbar.label },
  { id: "babylon", label: CITY_COORDS.babylon.label },
  { id: "diyala", label: CITY_COORDS.diyala.label },
  { id: "wasit", label: CITY_COORDS.wasit.label },
  { id: "qadisiyah", label: CITY_COORDS.qadisiyah.label },
  { id: "dhiqar", label: CITY_COORDS.dhiqar.label },
  { id: "maysan", label: CITY_COORDS.maysan.label },
  { id: "muthanna", label: CITY_COORDS.muthanna.label },
  { id: "salahadin", label: CITY_COORDS.salahadin.label },
];

export function getCityLabel(id: import("@/lib/admin-types").CityId, lang: string): string {
  const entry = CITY_FILTERS.find(c => c.id === id);
  if (!entry) return id;
  if (lang === "ar") return entry.label.ar;
  if (lang === "en") return entry.label.en;
  return entry.label.ku;
}
