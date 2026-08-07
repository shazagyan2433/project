import { useState, useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";
import {
  ShoppingBag, ShoppingCart, Bell, Users, ArrowUpRight, ArrowDownRight,
  Activity, RefreshCw, BarChart3, Globe, PackageCheck, AlertTriangle,
  TrendingUp, ReceiptText, Pill, HeartPulse, UtensilsCrossed,
  Building2, Truck, Briefcase, BedDouble, Navigation, Stethoscope,
  ClipboardList, FileText,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useGetDashboard } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { normalizeSectorKey, filterSectorTaggedItems, type CatKey } from "@/lib/industries";
import { useSectorLabel } from "@/hooks/useSectorScope";
import { BG, C, glassCard, STATUS_STYLE } from "./dashboard-tokens";

/* ══════════════════════════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════════════════════════ */
interface MetricCard {
  labelKey: string;
  subKey:   string;
  value:  string;
  badge:  string;
  up:     boolean | null;
  icon:   LucideIcon;
  accent: string;
}
interface ActivityItem {
  id:     string;
  label:  string;
  party:  string;
  amount: number;
  status: string;
  time:   string;
  Icon:   LucideIcon;
}
interface TopItem {
  name: string;
  sold: number;
  unit: string;
  pct:  number;
  cat?: CatKey;
}
interface StockAlert {
  name:   string;
  qty:    number;
  unit:   string;
  urgent: boolean;
  cat?: CatKey;
}
interface RecentRow {
  id:     number;
  party:  string;
  count:  number;
  total:  number;
  method: string;
  time:   string;
}
interface ChartPoint  { date: string; line1: number; line2: number }

interface SectorData {
  gradient:     [string, string];
  accent:       string;
  HeaderIcon:   LucideIcon;
  metrics:      MetricCard[];
  activity:     ActivityItem[];
  chartUnitType: "money" | "count";
  chartData:    ChartPoint[];
  topItems:     TopItem[];
  alerts:       StockAlert[];
  rows:         RecentRow[];
}

/* ══════════════════════════════════════════════════════════════════
   SHARED CHART DATES  (static Kurdish – sample axis labels)
══════════════════════════════════════════════════════════════════ */
const DATES = [
  "١ی ئایار","٥ی ئایار","١٠ی ئایار","١٥ی ئایار","٢٠ی ئایار",
  "٢٥ی ئایار","١ی حوزەیران","٧ی حوزەیران","١٤ی حوزەیران",
  "٢١ی حوزەیران","٢٧ی حوزەیران",
];

/* ══════════════════════════════════════════════════════════════════
   SECTOR DATA  (structural labels removed – come from i18n)
══════════════════════════════════════════════════════════════════ */

const PHARMA: SectorData = {
  gradient:  ["#10b981", "#06b6d4"],
  accent:    "#10b981",
  HeaderIcon: HeartPulse,
  metrics: [
    { labelKey: "sectors.pharma.m0.label", subKey: "sectors.pharma.m0.sub", value: "٨٬٤٢٠٬٠٠٠ د.ع", badge: "+١٨٪",    up: true,  icon: Pill,          accent: "#10b981" },
    { labelKey: "sectors.pharma.m1.label", subKey: "sectors.pharma.m1.sub", value: "٩٤",            badge: "+١١ ئەمرۆ",up: true,  icon: Users,         accent: C.cyan    },
    { labelKey: "sectors.pharma.m2.label", subKey: "sectors.pharma.m2.sub", value: "٣",             badge: "٢ فووری",  up: false, icon: Bell,          accent: C.orange  },
    { labelKey: "sectors.pharma.m3.label", subKey: "sectors.pharma.m3.sub", value: "٢٧",            badge: "٦ تازە",   up: null,  icon: ClipboardList, accent: C.purple  },
  ],
  activity: [
    { id: "RX-7741",  label: "فرۆشی نوسخەی پزیشک",           party: "ئەحمەد کەریم",   amount: 185_000, status: "جێبەجێکرا", time: "٩:١٤ پ.ن", Icon: Pill         },
    { id: "ALT-0091", label: "ئاگادارکردنی بەسەرچوونی دەرمان", party: "ئامۆکسیسیلین", amount: 0,       status: "چاوەڕوانە", time: "٨:٥٧ پ.ن", Icon: AlertTriangle},
    { id: "RX-7740",  label: "فرۆشی دەرمانی کرۆنیک",          party: "سارا محەمەد",   amount: 320_000, status: "جێبەجێکرا", time: "٨:٤٥ پ.ن", Icon: Pill         },
    { id: "RET-0044", label: "گەرانەوەی دەرمانی خراپ",         party: "کاریم عەلی",    amount: 45_000,  status: "بەرێوەیە",  time: "٨:٣٠ پ.ن", Icon: ReceiptText  },
    { id: "STK-0109", label: "وەرگرتنی بارگەی تازە",           party: "بریکارە پزیشکییە ڕێپێدراوەکان", amount: 0, status: "جێبەجێکرا", time: "٧:٤٨ پ.ن", Icon: PackageCheck},
    { id: "RX-7739",  label: "فرۆشی پێداویستی پزیشکی",         party: "نازدار ئەمین",  amount: 240_000, status: "جێبەجێکرا", time: "٧:٢٠ پ.ن", Icon: Stethoscope  },
  ],
  chartUnitType: "money" as const,
  chartData: DATES.map((date, i) => ({ date, line1: [480_000,720_000,610_000,890_000,770_000,1_050_000,930_000,1_180_000,1_020_000,1_380_000,1_540_000][i], line2: [600_000,600_000,650_000,650_000,750_000,750_000,900_000,900_000,1_000_000,1_000_000,1_100_000][i] })),
  topItems: [
    { name: "کۆگای دەرمانی سەرەکی (ئامۆکسیسیلین)", sold: 842, unit: "پاکێج", pct: 100 },
    { name: "حەبی کرۆنیک (مێتفۆرمین)",              sold: 614, unit: "دانە",  pct: 73  },
    { name: "سیرۆپی منداڵانە (نوروفێن)",             sold: 531, unit: "شووشە", pct: 63  },
    { name: "کریمی پێستی تایبەت",                    sold: 412, unit: "تیوب",  pct: 49  },
    { name: "دەرمانی تانسیۆن (لیسینۆپریل)",          sold: 389, unit: "دانە",  pct: 46  },
  ],
  alerts: [
    { name: "ئینسولینی سریعەکان",       qty: 3,  unit: "قوتی",   urgent: true  },
    { name: "کریمی ئانتیبیۆتیک تایبەت", qty: 7,  unit: "تیوب",  urgent: true  },
    { name: "ئامۆکسیسیلین ٥٠٠mg",       qty: 14, unit: "پاکێج", urgent: false },
    { name: "سیروم IV 1000ml",           qty: 9,  unit: "کارتۆن", urgent: false },
  ],
  rows: [
    { id: 7741, party: "ئەحمەد کەریم", count: 4, total: 185_000, method: "نەقد", time: "٩:١٤" },
    { id: 7740, party: "سارا محەمەد",  count: 7, total: 320_000, method: "نەقد", time: "٨:٤٥" },
    { id: 7739, party: "نازدار ئەمین", count: 5, total: 240_000, method: "بیمە", time: "٧:٢٠" },
    { id: 7738, party: "هاوژین بەکر",  count: 3, total: 175_000, method: "نەقد", time: "٦:٥٥" },
    { id: 7737, party: "ڕێزان حسێن",  count: 2, total: 98_000,  method: "نەقد", time: "٦:٣٠" },
    { id: 7736, party: "کڕیاری گشتی", count: 6, total: 210_000, method: "کارت", time: "٦:٠٥" },
  ],
};

const RESTAURANT: SectorData = {
  gradient:  ["#f97316", "#eab308"],
  accent:    "#f97316",
  HeaderIcon: UtensilsCrossed,
  metrics: [
    { labelKey: "sectors.restaurant.m0.label", subKey: "sectors.restaurant.m0.sub", value: "٣٬٢٤٠٬٠٠٠ د.ع", badge: "+٢٢٪",     up: true,  icon: TrendingUp,    accent: "#f97316" },
    { labelKey: "sectors.restaurant.m1.label", subKey: "sectors.restaurant.m1.sub", value: "٨٧",             badge: "+١٤ ئەمرۆ",up: true,  icon: ClipboardList, accent: C.cyan    },
    { labelKey: "sectors.restaurant.m2.label", subKey: "sectors.restaurant.m2.sub", value: "١٢ / ١٨",        badge: "٦٦٪",       up: null,  icon: BedDouble,     accent: C.purple  },
    { labelKey: "sectors.restaurant.m3.label", subKey: "sectors.restaurant.m3.sub", value: "٤",              badge: "تازەکرا",   up: null,  icon: FileText,      accent: C.green   },
  ],
  activity: [
    { id: "ORD-5521", label: "داواکاری نوێی میز ٧",   party: "میز ٧ · ٤ کەس",  amount: 185_000, status: "بەرێوەیە",  time: "٩:١٤ پ.ن", Icon: UtensilsCrossed },
    { id: "ORD-5520", label: "تەواوبوونی سیفارش",     party: "میز ٣ · ٢ کەس",  amount: 320_000, status: "جێبەجێکرا", time: "٩:٠٢ پ.ن", Icon: PackageCheck    },
    { id: "ORD-5519", label: "داواکاری بیردەری",       party: "ئەحمەد کەریم",   amount: 0,       status: "چاوەڕوانە", time: "٨:٤٥ پ.ن", Icon: ClipboardList   },
    { id: "RET-0077", label: "گەرانەوەی خوراک",        party: "میز ١١",          amount: 45_000,  status: "بەرێوەیە",  time: "٨:٣٠ پ.ن", Icon: ReceiptText     },
    { id: "ORD-5518", label: "فرۆشی تەیبۆت",          party: "هاوژین بەکر",    amount: 240_000, status: "جێبەجێکرا", time: "٨:١٥ پ.ن", Icon: ShoppingBag     },
    { id: "ORD-5517", label: "تەواوبوونی سیفارش",     party: "میز ٢ · ٣ کەس",  amount: 410_000, status: "جێبەجێکرا", time: "٧:٥٠ پ.ن", Icon: PackageCheck    },
  ],
  chartUnitType: "money" as const,
  chartData: DATES.map((date, i) => ({ date, line1: [820_000,1_240_000,950_000,1_580_000,1_310_000,1_920_000,1_700_000,2_180_000,1_880_000,2_490_000,3_240_000][i], line2: [1_000_000,1_000_000,1_200_000,1_200_000,1_400_000,1_400_000,1_600_000,1_600_000,1_800_000,1_800_000,2_000_000][i] })),
  topItems: [
    { name: "تکەی مرچی تایبەت",    sold: 324, unit: "پلات", pct: 100 },
    { name: "مەنسەف کوردی",        sold: 287, unit: "پلات", pct: 89  },
    { name: "سوپای جووجە و سەوزە", sold: 241, unit: "کاسە", pct: 74  },
    { name: "دووپیازەی گۆشت",      sold: 198, unit: "پلات", pct: 61  },
    { name: "بریانی ئەربیلی",      sold: 176, unit: "پلات", pct: 54  },
  ],
  alerts: [
    { name: "گۆشتی مرچ",     qty: 2, unit: "کیلۆ", urgent: true  },
    { name: "دانەوانەی سپی", qty: 5, unit: "کیلۆ", urgent: true  },
    { name: "رووناک",         qty: 3, unit: "لیتر", urgent: false },
    { name: "دووگمە",         qty: 8, unit: "کیلۆ", urgent: false },
  ],
  rows: [
    { id: 5521, party: "میز ٧ · ٤ کەس", count: 4, total: 185_000, method: "چاوەڕوانە", time: "٩:١٤" },
    { id: 5520, party: "میز ٣ · ٢ کەس", count: 3, total: 320_000, method: "نەقد",       time: "٩:٠٢" },
    { id: 5518, party: "هاوژین بەکر",    count: 2, total: 240_000, method: "نەقد",       time: "٨:١٥" },
    { id: 5517, party: "میز ٢ · ٣ کەس", count: 5, total: 410_000, method: "کارت",       time: "٧:٥٠" },
    { id: 5516, party: "میز ٩ · ١ کەس", count: 2, total: 98_000,  method: "نەقد",       time: "٧:٢٠" },
    { id: 5515, party: "میز ١ · ٦ کەس", count: 6, total: 580_000, method: "نەقد",       time: "٦:٤٥" },
  ],
};

const HOTEL: SectorData = {
  gradient:  ["#06b6d4", "#3b82f6"],
  accent:    "#06b6d4",
  HeaderIcon: Building2,
  metrics: [
    { labelKey: "sectors.hotel.m0.label", subKey: "sectors.hotel.m0.sub", value: "٦٬٨٠٠٬٠٠٠ د.ع", badge: "+١٥٪",     up: true,  icon: TrendingUp, accent: C.cyan   },
    { labelKey: "sectors.hotel.m1.label", subKey: "sectors.hotel.m1.sub", value: "٤٢ / ٦٠",       badge: "٧٠٪",       up: null,  icon: BedDouble,  accent: C.blue   },
    { labelKey: "sectors.hotel.m2.label", subKey: "sectors.hotel.m2.sub", value: "٨٧",             badge: "+١٢ ئەمرۆ",up: true,  icon: Users,      accent: C.green  },
    { labelKey: "sectors.hotel.m3.label", subKey: "sectors.hotel.m3.sub", value: "١٤",             badge: "٤ فووری",   up: null,  icon: Bell,       accent: C.orange },
  ],
  activity: [
    { id: "RES-2241", label: "جێگیربوونی نوێ",         party: "ئەحمەد کەریم — ژوری ٣٠٤", amount: 850_000,   status: "جێبەجێکرا", time: "٩:١٤ پ.ن", Icon: BedDouble    },
    { id: "CHK-0091", label: "چوونەدەرەوەی مێوان",      party: "سارا محەمەد — ژوری ٢١٢",  amount: 0,         status: "جێبەجێکرا", time: "٩:٠٠ پ.ن", Icon: Navigation   },
    { id: "SRV-0441", label: "داواکاری خزمەتی ژووری",  party: "ژوری ٤٠١",                amount: 145_000,   status: "بەرێوەیە",  time: "٨:٤٥ پ.ن", Icon: Bell         },
    { id: "RES-2240", label: "جێگیربوونی ئۆنلاین",      party: "کاریم عەلی — ٣ شەو",     amount: 1_200_000, status: "چاوەڕوانە", time: "٨:٣٠ پ.ن", Icon: ClipboardList },
    { id: "CLN-0055", label: "داواکاری پاکیزەکردن",     party: "ژوری ١١٠ — ١١٥",         amount: 0,         status: "جێبەجێکرا", time: "٧:٤٨ پ.ن", Icon: PackageCheck  },
    { id: "SRV-0440", label: "فرۆشی ڕستۆران هۆتێل",    party: "میز ٥ — ٤ مێوان",        amount: 380_000,   status: "جێبەجێکرا", time: "٧:٢٠ پ.ن", Icon: UtensilsCrossed },
  ],
  chartUnitType: "money" as const,
  chartData: DATES.map((date, i) => ({ date, line1: [3_200_000,4_800_000,4_100_000,5_700_000,5_100_000,6_400_000,5_800_000,7_200_000,6_500_000,7_900_000,6_800_000][i], line2: [4_000_000,4_000_000,4_500_000,4_500_000,5_000_000,5_000_000,6_000_000,6_000_000,7_000_000,7_000_000,7_500_000][i] })),
  topItems: [
    { name: "ژووری دووکەسی دیلاکس",    sold: 142, unit: "شەو", pct: 100 },
    { name: "ژووری تاکەکەسی ستاندارد", sold: 118, unit: "شەو", pct: 83  },
    { name: "سوویت ئەوەلی VIP",        sold: 64,  unit: "شەو", pct: 45  },
    { name: "ژووری خێزانی",            sold: 51,  unit: "شەو", pct: 36  },
    { name: "ژووری دیلاکس پانۆرامی",  sold: 38,  unit: "شەو", pct: 27  },
  ],
  alerts: [
    { name: "ژووری ٢٠٤ — تابلت شکاو",      qty: 1, unit: "کێشە", urgent: true  },
    { name: "ژووری ٣١١ — کلیل نەخۆش",      qty: 1, unit: "کێشە", urgent: true  },
    { name: "ژووری ١٠٥ — جل نییە",          qty: 3, unit: "بەند",  urgent: false },
    { name: "ژووری ٤٠٨ — گەرمکەر کار نابات",qty: 1, unit: "کێشە", urgent: false },
  ],
  rows: [
    { id: 2241, party: "ئەحمەد کەریم", count: 3, total: 850_000,   method: "کارت",    time: "٩:١٤" },
    { id: 2240, party: "کاریم عەلی",   count: 3, total: 1_200_000, method: "ئۆنلاین", time: "٨:٣٠" },
    { id: 2239, party: "نازدار ئەمین", count: 2, total: 680_000,   method: "نەقد",    time: "٧:٠٠" },
    { id: 2238, party: "هاوژین بەکر",  count: 5, total: 2_100_000, method: "کارت",    time: "دوێنێ" },
    { id: 2237, party: "ڕێزان حسێن",  count: 1, total: 350_000,   method: "نەقد",    time: "دوێنێ" },
    { id: 2236, party: "VIP تور گروپ",count: 7, total: 4_200_000, method: "کارت",    time: "دوێنێ" },
  ],
};

const OFFICE: SectorData = {
  gradient:  ["#3b82f6", "#8b5cf6"],
  accent:    "#3b82f6",
  HeaderIcon: Briefcase,
  metrics: [
    { labelKey: "sectors.office.m0.label", subKey: "sectors.office.m0.sub", value: "٥٬١٨٠٬٠٠٠ د.ع", badge: "+١٠٪",      up: true,  icon: TrendingUp, accent: C.blue   },
    { labelKey: "sectors.office.m1.label", subKey: "sectors.office.m1.sub", value: "٣٨",             badge: "+٤ ئەمسەر", up: true,  icon: Users,      accent: C.purple },
    { labelKey: "sectors.office.m2.label", subKey: "sectors.office.m2.sub", value: "١٢",             badge: "٣ تازە",    up: null,  icon: FileText,   accent: C.orange },
    { labelKey: "sectors.office.m3.label", subKey: "sectors.office.m3.sub", value: "٦٬٤٠٠٬٠٠٠ د.ع", badge: "٨ کۆمپانیا",up: false, icon: Bell,       accent: C.red    },
  ],
  activity: [
    { id: "B2B-4421", label: "سیفارشی کۆمارەیی",  party: "شیرکەتی ئەڵفا",  amount: 2_400_000, status: "جێبەجێکرا", time: "٩:١٤ پ.ن", Icon: Briefcase    },
    { id: "RFQ-0881", label: "داواکاری نرخی تازە", party: "کۆمپانیای بێتا",  amount: 0,         status: "چاوەڕوانە", time: "٨:٥٧ پ.ن", Icon: FileText     },
    { id: "DLV-0221", label: "گەیاندنی سیفارش",    party: "گروپی گاما",      amount: 1_750_000, status: "جێبەجێکرا", time: "٨:٣٠ پ.ن", Icon: Truck        },
    { id: "B2B-4420", label: "پارەدانی قەرز",       party: "دەلتا تریدینگ",  amount: 3_200_000, status: "جێبەجێکرا", time: "٨:١٥ پ.ن", Icon: ReceiptText  },
    { id: "RFQ-0880", label: "داواکاری B2B گەورە",  party: "کریم کۆمپانی",   amount: 0,         status: "چاوەڕوانە", time: "٧:٤٨ پ.ن", Icon: ClipboardList},
    { id: "B2B-4419", label: "فرۆشی کۆمارەیی",     party: "ئەربیل تریدینگ",  amount: 980_000,   status: "جێبەجێکرا", time: "٧:٢٠ پ.ن", Icon: Briefcase    },
  ],
  chartUnitType: "money" as const,
  chartData: DATES.map((date, i) => ({ date, line1: [1_800_000,2_600_000,2_200_000,3_400_000,3_100_000,4_200_000,3_800_000,4_700_000,4_200_000,5_100_000,5_180_000][i], line2: [2_000_000,2_000_000,2_500_000,2_500_000,3_000_000,3_000_000,3_500_000,3_500_000,4_000_000,4_000_000,4_500_000][i] })),
  topItems: [
    { name: "کاغەزی چاپی A4 (ریم)",       sold: 512, unit: "کارتۆن", pct: 100 },
    { name: "تۆنەری چاپەری لیزەر",        sold: 384, unit: "دانە",   pct: 75  },
    { name: "کەرەستەی نووسینی پرۆفیشنەل", sold: 297, unit: "ستۆک",  pct: 58  },
    { name: "فایلینگی تایبەت (A4)",         sold: 241, unit: "دانە",   pct: 47  },
    { name: "چاپەری ئۆفیس (HP LaserJet)", sold: 48,  unit: "دانە",   pct: 9   },
  ],
  alerts: [
    { name: "کاغەزی A4 ٨٠gm",  qty: 5,  unit: "ریم",  urgent: true  },
    { name: "تۆنەری HP 85A",   qty: 3,  unit: "دانە", urgent: true  },
    { name: "فایلینگی دووردی", qty: 8,  unit: "دانە", urgent: false },
    { name: "ستایپلەری تایبەت",qty: 12, unit: "دانە", urgent: false },
  ],
  rows: [
    { id: 4421, party: "شیرکەتی ئەڵفا",  count: 12, total: 2_400_000, method: "قەرز", time: "٩:١٤" },
    { id: 4420, party: "دەلتا تریدینگ",  count: 8,  total: 3_200_000, method: "کارت", time: "٨:١٥" },
    { id: 4419, party: "ئەربیل تریدینگ", count: 5,  total: 980_000,   method: "نەقد", time: "٧:٢٠" },
    { id: 4418, party: "کریم کۆمپانی",   count: 18, total: 1_750_000, method: "قەرز", time: "٦:٤٠" },
    { id: 4417, party: "گروپی گاما",     count: 7,  total: 4_100_000, method: "کارت", time: "٦:١٠" },
    { id: 4416, party: "کۆمپانیای بێتا", count: 24, total: 5_800_000, method: "قەرز", time: "دوێنێ" },
  ],
};

const DELIVERY_DATA: SectorData = {
  gradient:  ["#10b981", "#06b6d4"],
  accent:    "#10b981",
  HeaderIcon: Truck,
  metrics: [
    { labelKey: "sectors.delivery.m0.label", subKey: "sectors.delivery.m0.sub", value: "٦٢",   badge: "+١٨٪",      up: true,  icon: PackageCheck, accent: "#10b981" },
    { labelKey: "sectors.delivery.m1.label", subKey: "sectors.delivery.m1.sub", value: "١٤",   badge: "٢ بەردەست",up: null,  icon: Navigation,   accent: C.cyan   },
    { labelKey: "sectors.delivery.m2.label", subKey: "sectors.delivery.m2.sub", value: "٨",    badge: "٤ شۆفێر",  up: null,  icon: Truck,        accent: C.blue   },
    { labelKey: "sectors.delivery.m3.label", subKey: "sectors.delivery.m3.sub", value: "٩٤٪",  badge: "+٢٪",       up: true,  icon: TrendingUp,   accent: C.purple },
  ],
  activity: [
    { id: "DLV-8841", label: "گەیاندنی تەواوکرا",      party: "ئەحمەد کەریم — سەگمانی ٢", amount: 145_000, status: "جێبەجێکرا", time: "٩:٢٢ پ.ن", Icon: PackageCheck  },
    { id: "DLV-8840", label: "گەیاندن لە ڕێگایە",      party: "سارا محەمەد — سەگمانی ٥",  amount: 85_000,  status: "بەرێوەیە",  time: "٩:١٠ پ.ن", Icon: Truck         },
    { id: "DLV-8839", label: "داواکاری گەیاندنی تازە",  party: "کاریم عەلی — ناوچەی A",    amount: 0,       status: "چاوەڕوانە", time: "٨:٥٧ پ.ن", Icon: ClipboardList  },
    { id: "DLV-8838", label: "گەیاندنی شیرکەتی",       party: "شیرکەتی ئەڵفا",             amount: 420_000, status: "جێبەجێکرا", time: "٨:٣٠ پ.ن", Icon: Briefcase      },
    { id: "DLV-8837", label: "ئەرخسرانی بارستە",       party: "شۆفێری ٣ — کرکوک",         amount: 0,       status: "بەرێوەیە",  time: "٧:٤٥ پ.ن", Icon: Navigation     },
    { id: "DLV-8836", label: "تەواوبوونی مەسیر",       party: "شۆفێری ١ — سلێمانی",       amount: 890_000, status: "جێبەجێکرا", time: "٧:٢٠ پ.ن", Icon: PackageCheck   },
  ],
  chartUnitType: "count" as const,
  chartData: DATES.map((date, i) => ({ date, line1: [28,42,35,54,48,61,57,68,63,74,62][i], line2: [40,40,45,45,50,50,55,55,60,60,65][i] })),
  topItems: [
    { name: "ئەحمەد حسێن — ئەربیل",  sold: 284, unit: "گەیاندن", pct: 100 },
    { name: "کاریم عەلی — سلێمانی",  sold: 247, unit: "گەیاندن", pct: 87  },
    { name: "هاوژین بەکر — دهۆک",   sold: 198, unit: "گەیاندن", pct: 70  },
    { name: "ڕێزان محەمەد — کرکوک", sold: 165, unit: "گەیاندن", pct: 58  },
    { name: "سارا ئەمین — ئەربیل",  sold: 142, unit: "گەیاندن", pct: 50  },
  ],
  alerts: [
    { name: "شۆفێری ٣ — پاتری کەم",      qty: 18, unit: "٪",            urgent: true  },
    { name: "مەسیری دهۆک — کێشەی ڕێگا", qty: 1,  unit: "ئاگادارکردن",  urgent: true  },
    { name: "ئۆتۆمبێلی ٢ — پیخانی",      qty: 1,  unit: "کێشە",          urgent: false },
    { name: "ئۆتۆمبێلی ٥ — خزمەت",      qty: 1,  unit: "ڕۆژ",           urgent: false },
  ],
  rows: [
    { id: 8841, party: "ئەحمەد کەریم",   count: 3,  total: 145_000, method: "نەقد",    time: "٩:٢٢" },
    { id: 8840, party: "سارا محەمەد",    count: 1,  total: 85_000,  method: "ئۆنلاین", time: "٩:١٠" },
    { id: 8838, party: "شیرکەتی ئەڵفا",  count: 8,  total: 420_000, method: "قەرز",    time: "٨:٣٠" },
    { id: 8836, party: "مەسیری سلێمانی", count: 12, total: 890_000, method: "کارت",    time: "٧:٢٠" },
    { id: 8835, party: "نازدار ئەمین",   count: 2,  total: 98_000,  method: "نەقد",    time: "٦:٥٠" },
    { id: 8834, party: "گروپی گاما",     count: 6,  total: 380_000, method: "قەرز",    time: "٦:٢٠" },
  ],
};

const VIOLET = "#8B5CF6";
const MARKET_DATA: SectorData = {
  gradient:  [VIOLET, C.cyan],
  accent:    VIOLET,
  HeaderIcon: ShoppingBag,
  metrics: [
    { labelKey: "sectors.market.m0.label", subKey: "sectors.market.m0.sub", value: "٣٬٠٧٠٬٠٠٠ د.ع", badge: "+٣٩٪",      up: true,  icon: TrendingUp,  accent: VIOLET   },
    { labelKey: "sectors.market.m1.label", subKey: "sectors.market.m1.sub", value: "١٤٧",            badge: "+١٢ ئەمرۆ",up: true,  icon: Users,       accent: C.cyan   },
    { labelKey: "sectors.market.m2.label", subKey: "sectors.market.m2.sub", value: "٤",              badge: "٢ فووری",   up: false, icon: Bell,        accent: C.orange },
    { labelKey: "sectors.market.m3.label", subKey: "sectors.market.m3.sub", value: "١٨",             badge: "٥ تازە",    up: null,  icon: ShoppingBag, accent: C.green  },
  ],
  activity: [
    { id: "POS-4421", label: "کڕینی سووپەرمارکێت",        party: "ئەحمەد کەریم",  amount: 185_000, status: "جێبەجێکرا", time: "٩:١٤ پ.ن", Icon: ShoppingCart },
    { id: "ALT-0032", label: "ئاگادارکردنی کەمبوونی کاڵا", party: "کاڵای باسماتی", amount: 0,       status: "چاوەڕوانە", time: "٨:٥٧ پ.ن", Icon: AlertTriangle},
    { id: "POS-4420", label: "فرۆشی نەقد",                party: "سارا محەمەد",   amount: 320_000, status: "جێبەجێکرا", time: "٨:٤٥ پ.ن", Icon: ShoppingCart },
    { id: "RET-0114", label: "داواکاری گەرانەوە",          party: "کاریم عەلی",    amount: 45_000,  status: "بەرێوەیە",  time: "٨:٣٠ پ.ن", Icon: ReceiptText  },
    { id: "STK-0221", label: "بارکردنی کاڵای تازە",        party: "کۆگای سەرەکی",  amount: 0,       status: "جێبەجێکرا", time: "٧:٤٨ پ.ن", Icon: PackageCheck },
    { id: "POS-4419", label: "کڕینی داواکاری",             party: "نازدار ئەمین",  amount: 240_000, status: "جێبەجێکرا", time: "٧:٢٠ پ.ن", Icon: ShoppingCart },
  ],
  chartUnitType: "money" as const,
  chartData: DATES.map((date, i) => ({ date, line1: [980_000,1_450_000,1_100_000,1_780_000,1_520_000,2_100_000,1_850_000,2_350_000,1_990_000,2_640_000,3_070_000][i], line2: [1_200_000,1_200_000,1_300_000,1_300_000,1_500_000,1_500_000,1_800_000,1_800_000,2_000_000,2_000_000,2_200_000][i] })),
  topItems: [
    { name: "برنجی پاکستانی ٢٥ کیلۆ",  sold: 284, unit: "بوخچە", pct: 100, cat: "food" },
    { name: "شەکری سپی ١٠ کیلۆ",       sold: 217, unit: "بوخچە", pct: 76,  cat: "food" },
    { name: "رووناکی خواردنی لیتری",    sold: 198, unit: "شووشە", pct: 70,  cat: "food" },
    { name: "ئاوی ناوچینی ١٫٥ لیتری",  sold: 432, unit: "دانە",  pct: 85,  cat: "food" },
    { name: "چێشتی ئامادە (کانێ)",      sold: 156, unit: "کارتۆن",pct: 55,  cat: "food" },
  ],
  alerts: [
    { name: "برنجی باسماتی ٥ کیلۆ", qty: 4,  unit: "بوخچە",  urgent: true,  cat: "food" },
    { name: "شیری پرۆتێین UHT",     qty: 8,  unit: "دانە",   urgent: true,  cat: "food" },
    { name: "چاکلێتی کیندرلی",      qty: 12, unit: "کارتۆن", urgent: false, cat: "food" },
    { name: "مازۆت ١٠٠٠ مل",       qty: 6,  unit: "شووشە",  urgent: false, cat: "cosmetics" },
  ],
  rows: [
    { id: 4421, party: "ئەحمەد کەریم", count: 7,  total: 185_000, method: "نەقد", time: "٩:١٤" },
    { id: 4420, party: "سارا محەمەد",  count: 12, total: 320_000, method: "نەقد", time: "٨:٤٥" },
    { id: 4419, party: "نازدار ئەمین", count: 5,  total: 240_000, method: "قەرز", time: "٧:٢٠" },
    { id: 4418, party: "هاوژین بەکر",  count: 9,  total: 175_000, method: "نەقد", time: "٦:٥٥" },
    { id: 4417, party: "ڕێزان حسێن",  count: 3,  total: 98_000,  method: "نەقد", time: "٦:٣٠" },
    { id: 4416, party: "کڕیاری گشتی", count: 6,  total: 210_000, method: "کارت", time: "٦:٠٥" },
  ],
};

function getSectorData(sector: string): SectorData {
  const key = normalizeSectorKey(sector) ?? sector;
  switch (key) {
    case "pharmacy":
    case "hospital":
    case "clinic":
    case "healthcare":
      return PHARMA;
    case "restaurant":
    case "bakery":
    case "food_beverage":
      return RESTAURANT;
    case "hotel":
      return HOTEL;
    case "office":
    case "printing":
    case "legal":
    case "education":
      return OFFICE;
    case "delivery":
    case "logistics":
      return DELIVERY_DATA;
    default:
      return MARKET_DATA;
  }
}

function getSectorKey(sector: string): string {
  const key = normalizeSectorKey(sector) ?? sector;
  switch (key) {
    case "pharmacy":
    case "hospital":
    case "clinic":
    case "healthcare":
      return "pharma";
    case "restaurant":
    case "bakery":
    case "food_beverage":
      return "restaurant";
    case "hotel":      return "hotel";
    case "office":
    case "printing":
    case "legal":
    case "education":
      return "office";
    case "delivery":
    case "logistics":
      return "delivery";
    default:           return "market";
  }
}

/* ══════════════════════════════════════════════════════════════════
   SHARED UI ATOMS
══════════════════════════════════════════════════════════════════ */
function PulseDot({ color, size = "h-2 w-2" }: { color: string; size?: string }) {
  return (
    <span className={`relative flex ${size}`}>
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50" style={{ background: color }} />
      <span className="relative inline-flex rounded-full h-full w-full" style={{ background: color }} />
    </span>
  );
}

function DynChartTooltip({ active, payload, label, unitType }: {
  active?: boolean; payload?: any[]; label?: string; unitType: "money" | "count";
}) {
  const { t: td, i18n } = useTranslation("dashboard");
  const numLocale = i18n.language === "en" ? "en-US" : i18n.language === "ar" ? "ar-IQ" : "ku-IQ";
  const unitLabel = unitType === "count" ? td("chart.deliveryUnit") : td("currency.iqd");
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "rgba(11,15,23,0.97)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: "12px", padding: "12px 16px", backdropFilter: "blur(16px)", boxShadow: "0 8px 32px rgba(0,0,0,0.75)" }}>
      <p style={{ color: C.muted, fontSize: "11px", marginBottom: "8px", fontWeight: 600 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2" style={{ marginBottom: "3px" }}>
          <div className="w-2 h-2 rounded-full" style={{ background: p.color, flexShrink: 0 }} />
          <p style={{ color: p.color, fontWeight: 700, fontSize: "13px" }}>
            {p.name}:{" "}
            <span style={{ color: C.text }}>
              {new Intl.NumberFormat(numLocale).format(p.value)}
            </span>{" "}
            <span style={{ color: C.muted, fontSize: "11px" }}>{unitLabel}</span>
          </p>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════ */
export default function MarketDashboard() {
  const { user }                   = useAuth();
  const { data: apiStats }         = useGetDashboard();
  const { t: td, i18n }            = useTranslation("dashboard");
  const { t: tc }                  = useTranslation("common");
  const sectorLabel                = useSectorLabel();
  const [currency, setCurrency]    = useState<"IQD" | "USD">("IQD");
  type ChartRange = "week" | "month" | "year";
  const [chartRange, setChartRange]= useState<ChartRange>("month");
  const [now]                      = useState(new Date());

  const sector: string =
    normalizeSectorKey((user as { sectorKey?: string })?.sectorKey) ??
    normalizeSectorKey(localStorage.getItem("linqi_sector")) ??
    "other";

  const cfgRaw   = getSectorData(sector);
  const cfg      = useMemo(() => ({
    ...cfgRaw,
    topItems: filterSectorTaggedItems(cfgRaw.topItems, sector),
    alerts:   filterSectorTaggedItems(cfgRaw.alerts, sector),
  }), [cfgRaw, sector]);
  const sk       = getSectorKey(sector);
  const isEn     = i18n.language === "en";
  const dateLocale = i18n.language === "en" ? "en-US" : i18n.language === "ar" ? "ar-IQ" : "ku-IQ";

  const RATE = 1_310;
  const fmtMoney = (v: number) =>
    currency === "IQD"
      ? isEn
        ? "IQD " + new Intl.NumberFormat("en-US").format(v)
        : new Intl.NumberFormat("ku-IQ").format(v) + "\u00A0د.ع"
      : "$" + new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(v / RATE);

  const fmtNum = (v: number) =>
    new Intl.NumberFormat(isEn ? "en-US" : "ku-IQ").format(v);

  const timeStr = now.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString(dateLocale, { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const [accentA, accentB] = cfg.gradient;

  const timeRanges: { key: ChartRange; label: string }[] = [
    { key: "week",  label: td("timeRange.week")  },
    { key: "month", label: td("timeRange.month") },
    { key: "year",  label: td("timeRange.year")  },
  ];

  /* Status & payment translators */
  const tStatus = (s: string) => {
    const map: Record<string, string> = {
      "جێبەجێکرا": td("status.completed"),
      "بەرێوەیە":  td("status.inProgress"),
      "چاوەڕوانە": td("status.pending"),
    };
    return map[s] ?? s;
  };

  const tPayment = (m: string) => {
    const map: Record<string, string> = {
      "نەقد":      td("payment.cash"),
      "قەرز":      td("payment.debt"),
      "بیمە":      td("payment.insurance"),
      "چاوەڕوانە": td("payment.pending"),
      "کارت":      td("payment.card"),
      "ئۆنلاین":   td("payment.online"),
    };
    return map[m] ?? m;
  };

  const methodColor = (m: string) => {
    if (m === "نەقد")      return { bg: "rgba(16,185,129,0.10)",  col: "#34d399", bdr: "rgba(16,185,129,0.20)" };
    if (m === "قەرز")      return { bg: "rgba(239,68,68,0.10)",   col: "#f87171", bdr: "rgba(239,68,68,0.20)"  };
    if (m === "بیمە")      return { bg: "rgba(139,92,246,0.10)",  col: "#a78bfa", bdr: "rgba(139,92,246,0.20)" };
    if (m === "چاوەڕوانە") return { bg: "rgba(234,179,8,0.10)",   col: "#fbbf24", bdr: "rgba(234,179,8,0.20)"  };
    return { bg: "rgba(59,130,246,0.10)", col: "#60a5fa", bdr: "rgba(59,130,246,0.20)" };
  };

  return (
    <div style={{ background: BG, minHeight: "100%" }}>

      {/* ══ HEADER ══════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32 }}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
        style={{ padding: "22px 28px 18px", background: "rgba(255,255,255,0.015)", borderBottom: "1px solid rgba(255,255,255,0.05)", marginBottom: "28px" }}
      >
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: `${cfg.accent}1a`, border: `1.5px solid ${cfg.accent}4d`, boxShadow: `0 0 20px ${cfg.accent}1e` }}>
            <cfg.HeaderIcon className="w-5 h-5" style={{ color: cfg.accent }} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <PulseDot color={C.green} size="h-2 w-2" />
              <span className="text-[11px] font-bold" style={{ color: C.green }}>{td(`sectors.${sk}.statusText`)}</span>
              <span style={{ color: C.muted, fontSize: "10px" }}>· {timeStr}</span>
            </div>
            <h1 className="text-lg font-extrabold leading-tight" style={{ color: C.text }}>
              {tc("pageTitles.dashboard", { sector: sectorLabel })}
            </h1>
            <p className="text-[10px] mt-0.5" style={{ color: C.muted }}>{dateStr}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-0.5 rounded-xl p-1"
            style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}` }}>
            {(["IQD", "USD"] as const).map(c => (
              <button key={c} onClick={() => setCurrency(c)}
                className="px-3 py-1.5 rounded-lg text-[11px] font-extrabold transition-all duration-200"
                style={currency === c
                  ? { background: `${cfg.accent}2e`, color: cfg.accent, border: `1px solid ${cfg.accent}59` }
                  : { color: C.muted, border: "1px solid transparent" }}>
                {c}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
            style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}` }}>
            <Globe className="w-3.5 h-3.5" style={{ color: cfg.accent }} />
            <span className="text-[11px] font-semibold" style={{ color: C.sub }}>{td("header.iraqIQD")}</span>
          </div>
          <button className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}` }}>
            <RefreshCw className="w-3.5 h-3.5" style={{ color: C.muted }} />
          </button>
        </div>
      </motion.div>

      <div style={{ padding: "0 28px 36px" }}>

        {/* ══ METRIC CARDS ════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-7">
          {cfg.metrics.map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div key={card.labelKey}
                initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07, duration: 0.36, type: "spring", stiffness: 220, damping: 22 }}
                className="relative overflow-hidden cursor-default"
                style={glassCard(card.accent)}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = C.glassHover; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = C.glass; }}
              >
                <div style={{ position: "absolute", top: "-28px", insetInlineEnd: "-18px", width: "90px", height: "90px", borderRadius: "50%", background: `radial-gradient(circle, ${card.accent}22, transparent 70%)`, filter: "blur(16px)", pointerEvents: "none" }} />
                <div className="p-5 relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: `${card.accent}15`, border: `1.5px solid ${card.accent}30` }}>
                      <Icon className="w-5 h-5" style={{ color: card.accent }} />
                    </div>
                    {card.up === true && (
                      <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold"
                        style={{ background: "rgba(16,185,129,0.10)", color: "#34d399", border: "1px solid rgba(16,185,129,0.20)" }}>
                        <ArrowUpRight className="w-3 h-3" />{card.badge}
                      </div>
                    )}
                    {card.up === false && (
                      <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold"
                        style={{ background: "rgba(239,68,68,0.10)", color: "#f87171", border: "1px solid rgba(239,68,68,0.20)" }}>
                        <AlertTriangle className="w-3 h-3" />{card.badge}
                      </div>
                    )}
                    {card.up === null && (
                      <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold"
                        style={{ background: `${cfg.accent}14`, color: cfg.accent, border: `1px solid ${cfg.accent}2e` }}>
                        <Activity className="w-3 h-3" />{card.badge}
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] font-semibold mb-1.5 tracking-wide" style={{ color: C.muted }}>{td(card.labelKey)}</p>
                  <p className="text-[22px] font-extrabold leading-none mb-1.5 tracking-tight" style={{ color: C.text }}>{card.value}</p>
                  <p className="text-[10px]" style={{ color: C.muted }}>{td(card.subKey)}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ══ MID: Activity + Chart ═══════════════════════════════════ */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 mb-7">

          {/* Activity Feed */}
          <motion.div
            initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.28, duration: 0.38 }}
            className="xl:col-span-2 flex flex-col"
            style={{ ...glassCard(), padding: "20px" }}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: `${cfg.accent}1a`, border: `1px solid ${cfg.accent}40` }}>
                  <Activity className="w-4 h-4" style={{ color: cfg.accent }} />
                </div>
                <div>
                  <h2 className="text-[13px] font-extrabold leading-none" style={{ color: C.text }}>{td(`sectors.${sk}.activity.title`)}</h2>
                  <p className="text-[10px] mt-0.5" style={{ color: C.muted }}>{td(`sectors.${sk}.activity.sub`)}</p>
                </div>
              </div>
              <PulseDot color={C.green} size="h-2.5 w-2.5" />
            </div>
            <div className="space-y-2 overflow-y-auto" style={{ maxHeight: "380px" }}>
              {cfg.activity.map((act, idx) => {
                const ss = STATUS_STYLE[act.status] ?? STATUS_STYLE["چاوەڕوانە"];
                const accentColor =
                  act.status === "جێبەجێکرا" ? cfg.accent :
                  act.status === "بەرێوەیە"  ? C.blue    : C.orange;
                return (
                  <motion.div key={act.id}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.32 + idx * 0.04 }}
                    className="flex items-center gap-3 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.022)", border: "1px solid rgba(255,255,255,0.05)", padding: "10px 12px" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.045)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.022)"; }}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${accentColor}14`, border: `1px solid ${accentColor}28` }}>
                      <act.Icon className="w-3.5 h-3.5" style={{ color: accentColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p className="text-[11px] font-bold truncate" style={{ color: C.text }}>{act.label}</p>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0"
                          style={{ background: ss.bg, color: ss.color, border: `1px solid ${ss.border}` }}>
                          {tStatus(act.status)}
                        </span>
                      </div>
                      <p className="text-[10px] truncate mb-1" style={{ color: C.muted }}>{act.party}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono font-semibold" style={{ color: "rgba(100,116,139,0.85)" }}>#{act.id}</span>
                        <div className="flex items-center gap-1.5">
                          {act.amount > 0 && (
                            <span className="text-[10px] font-extrabold tabular-nums" style={{ color: cfg.accent }}>
                              {fmtMoney(act.amount)}
                            </span>
                          )}
                          <span className="text-[9px]" style={{ color: C.muted }}>· {act.time}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Chart */}
          <motion.div
            initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.33, duration: 0.38 }}
            className="xl:col-span-3"
            style={{ ...glassCard(), padding: "20px" }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: `${cfg.accent}1a`, border: `1px solid ${cfg.accent}40` }}>
                  <BarChart3 className="w-4 h-4" style={{ color: cfg.accent }} />
                </div>
                <div>
                  <h2 className="text-[13px] font-extrabold leading-none" style={{ color: C.text }}>{td(`sectors.${sk}.chart.title`)}</h2>
                  <p className="text-[10px] mt-0.5" style={{ color: C.muted }}>{td(`sectors.${sk}.chart.sub`)}</p>
                </div>
              </div>
              <div className="flex items-center gap-0.5 rounded-lg p-0.5"
                style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}` }}>
                {timeRanges.map(r => (
                  <button key={r.key} onClick={() => setChartRange(r.key)}
                    className="px-2.5 py-1 rounded-md text-[10px] font-bold transition-all"
                    style={chartRange === r.key
                      ? { background: `${cfg.accent}33`, color: cfg.accent, border: `1px solid ${cfg.accent}59` }
                      : { color: C.muted, border: "1px solid transparent" }}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-5 mb-4">
              {[
                { color: cfg.accent, label: td(`sectors.${sk}.chart.line1`) },
                { color: accentB,    label: td(`sectors.${sk}.chart.line2`) },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className="w-6 h-0.5 rounded-full" style={{ background: l.color }} />
                  <span className="text-[10px] font-semibold" style={{ color: C.muted }}>{l.label}</span>
                </div>
              ))}
            </div>
            <div style={{ height: "290px" }} dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cfg.chartData} margin={{ top: 4, right: 6, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gL1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={cfg.accent} stopOpacity={0.28} />
                      <stop offset="95%" stopColor={cfg.accent} stopOpacity={0}    />
                    </linearGradient>
                    <linearGradient id="gL2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={accentB} stopOpacity={0.18} />
                      <stop offset="95%" stopColor={accentB} stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: C.muted, fontSize: 9, fontWeight: 600 }} dy={6} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: C.muted, fontSize: 9, fontWeight: 600 }}
                    tickFormatter={v => cfg.chartUnitType === "count"
                      ? String(v)
                      : `${(v / 1_000_000).toFixed(1)}M`}
                    width={40} />
                  <Tooltip content={<DynChartTooltip unitType={cfg.chartUnitType} />} />
                  <Area type="monotone" dataKey="line1" name={td(`sectors.${sk}.chart.line1`)} stroke={cfg.accent} strokeWidth={2} fill="url(#gL1)" activeDot={{ r: 4, fill: cfg.accent, strokeWidth: 0 }} />
                  <Area type="monotone" dataKey="line2" name={td(`sectors.${sk}.chart.line2`)} stroke={accentB}   strokeWidth={2} fill="url(#gL2)" activeDot={{ r: 4, fill: accentB,    strokeWidth: 0 }} strokeDasharray="5 3" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* ══ BOTTOM: Top Items + Table ════════════════════════════════ */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Top items + Alerts */}
          <motion.div
            initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.48, duration: 0.38 }}
            style={{ ...glassCard(cfg.accent), padding: "20px" }}
          >
            {/* Top items */}
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${cfg.accent}1a`, border: `1px solid ${cfg.accent}40` }}>
                <TrendingUp className="w-4 h-4" style={{ color: cfg.accent }} />
              </div>
              <div>
                <h2 className="text-[13px] font-extrabold leading-none" style={{ color: C.text }}>{td(`sectors.${sk}.top.title`)}</h2>
                <p className="text-[10px] mt-0.5" style={{ color: C.muted }}>{td(`sectors.${sk}.top.sub`)}</p>
              </div>
            </div>
            <div className="space-y-2.5 mb-5">
              {cfg.topItems.map((item, i) => (
                <div key={item.name} className="rounded-xl"
                  style={{ background: "rgba(255,255,255,0.022)", border: "1px solid rgba(255,255,255,0.05)", padding: "10px 12px" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.022)"; }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center font-extrabold text-[10px] shrink-0"
                        style={{ background: i === 0 ? "rgba(234,179,8,0.15)" : i === 1 ? "rgba(148,163,184,0.12)" : "rgba(255,255,255,0.06)", color: i === 0 ? "#fbbf24" : i === 1 ? "#94a3b8" : C.muted, border: i === 0 ? "1px solid rgba(234,179,8,0.25)" : `1px solid ${C.border}` }}>
                        {i + 1}
                      </div>
                      <p className="text-[10px] font-bold leading-snug" style={{ color: C.text }}>{item.name}</p>
                    </div>
                    <span className="text-[10px] font-extrabold tabular-nums shrink-0 ms-2" style={{ color: cfg.accent }}>
                      {fmtNum(item.sold)}&nbsp;
                      <span style={{ color: C.muted, fontWeight: 400, fontSize: "9px" }}>{item.unit}</span>
                    </span>
                  </div>
                  <div className="w-full rounded-full overflow-hidden" style={{ height: "3px", background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${item.pct}%`, background: `linear-gradient(90deg,${cfg.accent},${accentB})` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Alerts */}
            <div className="flex items-center gap-2 mb-3">
              <Bell className="w-3.5 h-3.5" style={{ color: C.orange }} />
              <h3 className="text-[11px] font-extrabold" style={{ color: C.orange }}>{td(`sectors.${sk}.alerts.title`)}</h3>
            </div>
            <div className="space-y-1.5">
              {cfg.alerts.map(item => (
                <div key={item.name} className="flex items-center justify-between rounded-lg px-3 py-2"
                  style={{ background: item.urgent ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.022)", border: `1px solid ${item.urgent ? "rgba(239,68,68,0.18)" : "rgba(255,255,255,0.05)"}` }}>
                  <div className="flex items-center gap-2">
                    {item.urgent && <AlertTriangle className="w-3 h-3 shrink-0" style={{ color: "#f87171" }} />}
                    <span className="text-[10px] font-semibold" style={{ color: item.urgent ? "#f87171" : C.sub }}>{item.name}</span>
                  </div>
                  <span className="text-[10px] font-extrabold shrink-0 ms-2" style={{ color: item.urgent ? "#f87171" : C.muted }}>
                    {item.qty}&nbsp;<span style={{ fontWeight: 400, fontSize: "9px" }}>{item.unit}</span>
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Table */}
          <motion.div
            initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.53, duration: 0.38 }}
            className="xl:col-span-2"
            style={{ ...glassCard(), padding: "20px" }}
          >
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${accentB}1a`, border: `1px solid ${accentB}40` }}>
                <PackageCheck className="w-4 h-4" style={{ color: accentB }} />
              </div>
              <div>
                <h2 className="text-[13px] font-extrabold leading-none" style={{ color: C.text }}>{td(`sectors.${sk}.table.title`)}</h2>
                <p className="text-[10px] mt-0.5" style={{ color: C.muted }}>{td(`sectors.${sk}.table.sub`)}</p>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl" style={{ border: "1px solid rgba(255,255,255,0.05)" }}>
              <table className="w-full">
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    {[
                      td("table.id"),
                      td(`sectors.${sk}.table.colParty`),
                      td(`sectors.${sk}.table.colCount`),
                      td(`sectors.${sk}.table.colMethod`),
                      td("table.total"),
                      td("table.time"),
                    ].map(h => (
                      <th key={h} className="px-3 py-3 text-start font-bold uppercase tracking-wide"
                        style={{ color: C.muted, fontSize: "9px" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cfg.rows.map((row, idx) => {
                    const mc = methodColor(row.method);
                    return (
                      <tr key={row.id}
                        style={{ borderBottom: idx < cfg.rows.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.025)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                      >
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5">
                            <PulseDot color={C.green} size="h-1.5 w-1.5" />
                            <span className="font-mono font-bold" style={{ color: C.muted, fontSize: "10px" }}>#{row.id}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 font-bold" style={{ color: C.text, fontSize: "11px" }}>{row.party}</td>
                        <td className="px-3 py-3" style={{ color: C.sub, fontSize: "10px" }}>{row.count} {td(`sectors.${sk}.table.colCount`)}</td>
                        <td className="px-3 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md font-bold"
                            style={{ fontSize: "9px", background: mc.bg, color: mc.col, border: `1px solid ${mc.bdr}` }}>
                            {tPayment(row.method)}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className="font-extrabold tabular-nums" style={{ color: cfg.accent, fontSize: "11px" }}>
                            {fmtMoney(row.total)}
                          </span>
                        </td>
                        <td className="px-3 py-3" style={{ color: C.muted, fontSize: "10px" }}>{row.time}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
