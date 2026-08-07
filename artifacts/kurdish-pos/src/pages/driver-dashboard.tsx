import { useState, useMemo, useEffect, lazy, Suspense } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Truck, MapPin, Package, LogOut, Zap, CheckCircle2,
  Navigation, Banknote, ChevronDown, Radio,
  ArrowRight, Box, LocateFixed, Layers, Star,
  CircleDot, ChevronRight, BadgeCheck, Wallet, Map as MapIcon, X, Loader,
} from "lucide-react";
import i18n from "@/i18n";
import { useDriverTracking } from "@/hooks/useDriverTracking";

// Lazy-load map (Leaflet is heavy)
const LiveTrackingMap = lazy(() =>
  import("@/components/LiveTrackingMap").then((m) => ({ default: m.LiveTrackingMap }))
);

// ─── Types ────────────────────────────────────────────────────────────────────
type DeliveryStatus = "picked_up" | "arrived" | "delivered";

interface Shipment {
  id: string;
  orderId: string;
  buyerName: string;
  supplierName: string;
  pickupProvince: string;
  deliveryProvince: string;
  deliveryFee: number;
  items: number;
  weight: string;
  createdAgo: string;
  priority: "normal" | "urgent";
}

// ─── Province centroids (WGS-84) for map tracking ────────────────────────────
const PROVINCE_COORDS: Record<string, [number, number]> = {
  erbil:        [36.1901, 44.0091],
  sulaymaniyah: [35.5560, 45.4350],
  duhok:        [36.8665, 42.9853],
  halabja:      [35.1787, 45.9862],
  kirkuk:       [35.4681, 44.3922],
  baghdad:      [33.3152, 44.3661],
  basra:        [30.5085, 47.7804],
  mosul:        [36.3400, 43.1320],
  najaf:        [31.9916, 44.3284],
  karbala:      [32.6169, 44.0285],
  anbar:        [33.4259, 43.3009],
  diyala:       [33.7732, 44.9484],
};
function getCoords(provinceId: string): [number, number] {
  return PROVINCE_COORDS[provinceId] ?? [36.1901, 44.0091];
}

// ─── Provinces ────────────────────────────────────────────────────────────────
const PROVINCES = [
  { id: "erbil",        ku: "هەولێر",    en: "Erbil",         ar: "أربيل"      },
  { id: "sulaymaniyah", ku: "سلێمانی",   en: "Sulaymaniyah",  ar: "السليمانية" },
  { id: "duhok",        ku: "دهۆک",      en: "Duhok",         ar: "دهوك"       },
  { id: "halabja",      ku: "هەڵەبجە",   en: "Halabja",       ar: "حلبجة"      },
  { id: "kirkuk",       ku: "کەرکووک",   en: "Kirkuk",        ar: "كركوك"      },
  { id: "baghdad",      ku: "بەغداد",    en: "Baghdad",       ar: "بغداد"      },
  { id: "basra",        ku: "بەسرە",     en: "Basra",         ar: "البصرة"     },
  { id: "mosul",        ku: "مووسڵ",     en: "Mosul",         ar: "الموصل"     },
  { id: "najaf",        ku: "نەجەف",     en: "Najaf",         ar: "النجف"      },
  { id: "karbala",      ku: "کەربەلا",   en: "Karbala",       ar: "كربلاء"     },
  { id: "anbar",        ku: "ئەنبار",    en: "Anbar",         ar: "الأنبار"    },
  { id: "diyala",       ku: "دیالە",     en: "Diyala",        ar: "ديالى"      },
];

function getProvinceName(id: string) {
  const lang = i18n.language;
  const p = PROVINCES.find(x => x.id === id);
  if (!p) return id;
  return lang === "ar" ? p.ar : lang === "en" ? p.en : p.ku;
}

const LANGUAGES = [
  { code: "ku", label: "کوردی" },
  { code: "ar", label: "العربية" },
  { code: "en", label: "EN" },
];

const STEPS: DeliveryStatus[] = ["picked_up", "arrived", "delivered"];

function nextStep(s: DeliveryStatus): DeliveryStatus | null {
  const i = STEPS.indexOf(s);
  return i < STEPS.length - 1 ? STEPS[i + 1] : null;
}

// ─── Demo shipments ───────────────────────────────────────────────────────────
const DEMO_SHIPMENTS: Shipment[] = [
  { id: "sh-1", orderId: "ORD-M4X92A", buyerName: "فرۆشگای ئەمین",       supplierName: "کۆمپانیای ئەڵبان",   pickupProvince: "erbil",        deliveryProvince: "sulaymaniyah", deliveryFee: 25000, items: 8,  weight: "120 کگ", createdAgo: "5",  priority: "urgent" },
  { id: "sh-2", orderId: "ORD-K7W3BZ", buyerName: "مارکێتی ئارام",       supplierName: "شیرکەتی دەشتاو",    pickupProvince: "duhok",        deliveryProvince: "erbil",        deliveryFee: 18000, items: 4,  weight: "60 کگ",  createdAgo: "12", priority: "normal" },
  { id: "sh-3", orderId: "ORD-P2Q8CV", buyerName: "سووپەرمارکێتی هەلالە", supplierName: "بازرگانی ئەمین",   pickupProvince: "sulaymaniyah", deliveryProvince: "kirkuk",       deliveryFee: 20000, items: 12, weight: "200 کگ", createdAgo: "18", priority: "normal" },
  { id: "sh-4", orderId: "ORD-R9T5DH", buyerName: "دووکانی بەختیار",      supplierName: "ئیمپۆرتی ئارام",  pickupProvince: "erbil",        deliveryProvince: "duhok",        deliveryFee: 22000, items: 6,  weight: "90 کگ",  createdAgo: "25", priority: "urgent" },
  { id: "sh-5", orderId: "ORD-N3F7GJ", buyerName: "مارکێتی سەردەم",      supplierName: "کەرزەی ئاوینتا",  pickupProvince: "kirkuk",       deliveryProvince: "baghdad",      deliveryFee: 35000, items: 20, weight: "350 کگ", createdAgo: "30", priority: "normal" },
  { id: "sh-6", orderId: "ORD-L6B2KN", buyerName: "هایپەری نوێ",          supplierName: "دیستریبیوتەری ماجد", pickupProvince: "baghdad",    deliveryProvince: "basra",        deliveryFee: 45000, items: 15, weight: "280 کگ", createdAgo: "42", priority: "normal" },
  { id: "sh-7", orderId: "ORD-X1V4MP", buyerName: "فرۆشگای ئاسمان",      supplierName: "ئیمپۆرتی دانا",   pickupProvince: "sulaymaniyah", deliveryProvince: "halabja",      deliveryFee: 12000, items: 3,  weight: "45 کگ",  createdAgo: "55", priority: "normal" },
  { id: "sh-8", orderId: "ORD-C8Y6WQ", buyerName: "گرووپی تاجر",          supplierName: "گرووپی ئەلفاتح",  pickupProvince: "baghdad",      deliveryProvince: "najaf",        deliveryFee: 28000, items: 10, weight: "160 کگ", createdAgo: "68", priority: "urgent" },
];

// ─── Delivery Map Modal ───────────────────────────────────────────────────────
function DeliveryMapModal({
  shipment,
  onClose,
}: {
  shipment: Shipment;
  onClose: () => void;
}) {
  const [shopLat, shopLng] = getCoords(shipment.pickupProvince);
  const [custLat, custLng] = getCoords(shipment.deliveryProvince);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 400,
        background: "rgba(2,12,28,0.88)",
        backdropFilter: "blur(14px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: "spring", bounce: 0.2 }}
        style={{
          width: "100%", maxWidth: 680,
          background: "rgba(4,20,40,0.98)",
          border: "1px solid rgba(59,130,246,0.3)",
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(59,130,246,0.1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: "14px 18px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "rgba(59,130,246,0.06)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: "rgba(59,130,246,0.2)", border: "1px solid rgba(59,130,246,0.35)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <MapIcon style={{ width: 15, height: 15, color: "#60A5FA" }} />
            </div>
            <div>
              <p style={{ color: "white", fontWeight: 800, fontSize: 13 }}>
                ردەکردنی زیندوو — {shipment.orderId}
              </p>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>
                {getProvinceName(shipment.pickupProvince)} → {getProvinceName(shipment.deliveryProvince)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: 8,
              background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "rgba(255,255,255,0.6)",
            }}
          >
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>

        {/* Map */}
        <div style={{ height: 400, position: "relative" }}>
          <Suspense fallback={
            <div style={{
              height: "100%", display: "flex", alignItems: "center",
              justifyContent: "center", color: "rgba(255,255,255,0.4)", fontSize: 13, gap: 8,
            }}>
              <Loader style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} />
              بارکردنی نەخشە...
            </div>
          }>
            <LiveTrackingMap
              orderId={shipment.orderId}
              shopLat={shopLat}
              shopLng={shopLng}
              shopName={shipment.supplierName}
              customerLat={custLat}
              customerLng={custLng}
              customerName={shipment.buyerName}
            />
          </Suspense>
        </div>

        {/* Legend */}
        <div style={{
          padding: "10px 18px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex", gap: 18, flexWrap: "wrap",
        }}>
          {[
            { icon: "🏪", label: "شوێنی وەرگرتن" },
            { icon: "📍", label: "شوێنی گەیاندن" },
            { icon: "🛵", label: "شوێنی ئێوە — زیندوو" },
          ].map((item) => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 13 }}>{item.icon}</span>
              <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 10 }}>{item.label}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Completion Overlay ───────────────────────────────────────────────────────
function CompletionOverlay({
  shipment,
  onDone,
}: {
  shipment: Shipment;
  onDone: () => void;
}) {
  const { t } = useTranslation();

  useEffect(() => {
    const timer = setTimeout(onDone, 3800);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <motion.div
      key="completion-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-center justify-center px-6"
      style={{ background: "rgba(1,7,18,0.92)", backdropFilter: "blur(12px)" }}
      onClick={onDone}
    >
      {/* outer glow rings */}
      {[1, 2, 3].map(i => (
        <motion.div
          key={i}
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1 + i * 0.45, opacity: 0 }}
          transition={{ delay: 0.15 + i * 0.12, duration: 1.4, ease: "easeOut" }}
          className="absolute rounded-full"
          style={{
            width: 140, height: 140,
            border: `${4 - i}px solid rgba(59,130,246,${0.7 - i * 0.18})`,
            boxShadow: `0 0 ${20 + i * 20}px rgba(59,130,246,${0.5 - i * 0.12})`,
          }}
        />
      ))}

      {/* Main card */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ type: "spring", bounce: 0.32, duration: 0.55 }}
        className="relative w-full max-w-xs rounded-3xl text-center overflow-hidden"
        style={{
          background: "linear-gradient(160deg,#041428 0%,#020C1C 100%)",
          border: "1px solid rgba(59,130,246,0.35)",
          boxShadow: "0 0 60px rgba(59,130,246,0.25), 0 24px 60px rgba(0,0,0,0.6)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top electric blue glow band */}
        <div className="absolute top-0 inset-x-0 h-32 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%,rgba(59,130,246,0.3) 0%,transparent 70%)" }} />

        <div className="relative px-6 pt-10 pb-8 flex flex-col items-center gap-4">
          {/* Animated check */}
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", bounce: 0.5, delay: 0.1 }}
            className="w-20 h-20 rounded-2xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg,rgba(29,78,216,0.4),rgba(59,130,246,0.25))",
              border: "2px solid rgba(59,130,246,0.6)",
              boxShadow: "0 0 40px rgba(59,130,246,0.5), 0 0 80px rgba(59,130,246,0.2)",
            }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", bounce: 0.6, delay: 0.25 }}
            >
              <BadgeCheck className="w-10 h-10" style={{ color: "rgba(147,197,253,1)" }} />
            </motion.div>
          </motion.div>

          {/* Text */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col items-center gap-1.5"
          >
            <h2 className="text-white font-extrabold text-xl leading-tight">{t("driver.completedTitle")}</h2>
            <p className="text-white/45 text-xs">{shipment.orderId}</p>
            <p className="text-white/35 text-xs">
              {getProvinceName(shipment.pickupProvince)} → {getProvinceName(shipment.deliveryProvince)}
            </p>
          </motion.div>

          {/* Earnings badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.45, type: "spring", bounce: 0.4 }}
            className="flex items-center gap-2.5 px-5 py-3 rounded-2xl"
            style={{
              background: "rgba(110,231,183,0.1)",
              border: "1px solid rgba(16,185,129,0.3)",
              boxShadow: "0 0 20px rgba(16,185,129,0.1)",
            }}
          >
            <Wallet className="w-5 h-5" style={{ color: "rgba(110,231,183,0.9)" }} />
            <div className="text-left">
              <p className="text-[9px] text-white/40 uppercase tracking-wide">{t("driver.earned")}</p>
              <p className="text-lg font-extrabold" style={{ color: "rgba(110,231,183,1)" }}>
                {shipment.deliveryFee.toLocaleString()} IQD
              </p>
            </div>
          </motion.div>

          {/* Dismiss hint */}
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
            className="text-[10px] text-white/20"
          >
            {t("driver.tapToDismiss")}
          </motion.p>
        </div>

        {/* Progress bar auto-dismiss */}
        <motion.div
          initial={{ width: "100%" }} animate={{ width: "0%" }}
          transition={{ duration: 3.8, ease: "linear" }}
          className="h-0.5 absolute bottom-0 inset-x-0"
          style={{ background: "linear-gradient(90deg,#3B82F6,#1D4ED8)" }}
        />
      </motion.div>
    </motion.div>
  );
}

// ─── Status Stepper ───────────────────────────────────────────────────────────
function StatusStepper({
  status,
  onAdvance,
}: {
  status: DeliveryStatus;
  onAdvance: () => void;
}) {
  const { t } = useTranslation();

  const steps: { key: DeliveryStatus; label: string; icon: React.ReactNode }[] = [
    { key: "picked_up", label: t("driver.statusPickedUp"),  icon: <Box className="w-3 h-3" /> },
    { key: "arrived",   label: t("driver.statusArrived"),   icon: <LocateFixed className="w-3 h-3" /> },
    { key: "delivered", label: t("driver.statusDelivered"), icon: <BadgeCheck className="w-3 h-3" /> },
  ];

  const currentIdx = STEPS.indexOf(status);
  const next = nextStep(status);

  const nextLabels: Record<DeliveryStatus, string> = {
    picked_up: t("driver.advanceToArrived"),
    arrived:   t("driver.advanceToDelivered"),
    delivered: "",
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Step nodes */}
      <div className="flex items-center gap-1">
        {steps.map((step, i) => {
          const done    = i <= currentIdx;
          const current = i === currentIdx;
          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              {/* Node */}
              <div className="flex flex-col items-center gap-1 shrink-0">
                <motion.div
                  animate={
                    current
                      ? { scale: [1, 1.1, 1], boxShadow: ["0 0 0px rgba(59,130,246,0)", "0 0 14px rgba(59,130,246,0.7)", "0 0 8px rgba(59,130,246,0.4)"] }
                      : {}
                  }
                  transition={{ repeat: current ? Infinity : 0, duration: 2, ease: "easeInOut" }}
                  className="w-7 h-7 rounded-xl flex items-center justify-center transition-all"
                  style={{
                    background: done
                      ? current
                        ? "linear-gradient(135deg,#1D4ED8,#3B82F6)"
                        : "rgba(16,185,129,0.25)"
                      : "rgba(255,255,255,0.06)",
                    border: done
                      ? current
                        ? "1.5px solid rgba(59,130,246,0.8)"
                        : "1.5px solid rgba(16,185,129,0.5)"
                      : "1.5px solid rgba(255,255,255,0.1)",
                    color: done
                      ? current ? "rgba(255,255,255,1)" : "rgba(110,231,183,0.9)"
                      : "rgba(255,255,255,0.2)",
                  }}
                >
                  {step.icon}
                </motion.div>
                <span
                  className="text-[8px] font-semibold text-center leading-tight max-w-[52px]"
                  style={{
                    color: done
                      ? current ? "rgba(147,197,253,0.95)" : "rgba(110,231,183,0.75)"
                      : "rgba(255,255,255,0.2)",
                  }}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector */}
              {i < steps.length - 1 && (
                <div className="flex-1 mx-1 mb-4 h-0.5 relative overflow-hidden rounded-full"
                  style={{ background: "rgba(255,255,255,0.08)" }}>
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: i < currentIdx ? "100%" : "0%" }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    style={{ background: "linear-gradient(90deg,rgba(16,185,129,0.6),rgba(59,130,246,0.5))" }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Advance button */}
      {next && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          whileHover={{ scale: 1.01 }}
          onClick={onAdvance}
          className="w-full py-2.5 rounded-xl font-bold text-[12px] flex items-center justify-center gap-2 transition-all"
          style={
            next === "delivered"
              ? {
                  background: "linear-gradient(135deg,#059669 0%,#10B981 100%)",
                  color: "white",
                  boxShadow: "0 0 18px rgba(16,185,129,0.4), 0 3px 12px rgba(0,0,0,0.3)",
                }
              : {
                  background: "linear-gradient(135deg,#1D4ED8 0%,#3B82F6 100%)",
                  color: "white",
                  boxShadow: "0 0 14px rgba(59,130,246,0.35), 0 3px 10px rgba(0,0,0,0.25)",
                }
          }
        >
          {next === "delivered" ? (
            <BadgeCheck className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
          {nextLabels[status]}
        </motion.button>
      )}
    </div>
  );
}

// ─── Active Delivery Card ─────────────────────────────────────────────────────
function ActiveDeliveryCard({
  shipment,
  status,
  onAdvance,
  onOpenMap,
}: {
  shipment: Shipment;
  status: DeliveryStatus;
  onAdvance: (id: string) => void;
  onOpenMap: (shipment: Shipment) => void;
}) {
  const { t } = useTranslation();

  const statusColors: Record<DeliveryStatus, { bg: string; border: string; glow: string }> = {
    picked_up: { bg: "rgba(29,78,216,0.08)",   border: "rgba(59,130,246,0.35)",   glow: "rgba(59,130,246,0.12)"  },
    arrived:   { bg: "rgba(124,58,237,0.08)",  border: "rgba(124,58,237,0.35)",   glow: "rgba(124,58,237,0.1)"   },
    delivered: { bg: "rgba(16,185,129,0.08)",  border: "rgba(16,185,129,0.35)",   glow: "rgba(16,185,129,0.12)"  },
  };
  const col = statusColors[status];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.93, y: -10 }}
      transition={{ type: "spring", bounce: 0.18, duration: 0.42 }}
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: `linear-gradient(145deg, ${col.bg} 0%, rgba(2,12,28,0.6) 100%)`,
        border: `1px solid ${col.border}`,
        boxShadow: `0 4px 24px rgba(0,0,0,0.25), 0 0 24px ${col.glow}`,
      }}
    >
      {/* Header */}
      <div className="px-3.5 pt-3 pb-2 flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[12px] font-extrabold tracking-wide" style={{ color: "rgba(147,197,253,0.95)" }}>
              {shipment.orderId}
            </span>
            {shipment.priority === "urgent" && (
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-extrabold uppercase"
                style={{ background: "rgba(251,191,36,0.15)", color: "rgba(251,191,36,1)", border: "1px solid rgba(251,191,36,0.3)" }}>
                <Star className="w-2 h-2" />{t("driver.urgent")}
              </span>
            )}
          </div>
          <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>
            {shipment.createdAgo} {t("driver.minsAgo")}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0 px-2 py-1 rounded-xl"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <Banknote className="w-3 h-3" style={{ color: "rgba(110,231,183,0.9)" }} />
          <span className="text-xs font-extrabold" style={{ color: "rgba(110,231,183,1)" }}>
            {shipment.deliveryFee.toLocaleString()}
          </span>
          <span className="text-[8px]" style={{ color: "rgba(255,255,255,0.3)" }}>IQD</span>
        </div>
      </div>

      {/* Route strip */}
      <div className="mx-3.5 mb-2.5 rounded-xl p-2.5 flex items-center gap-2"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-0.5">
            <Box className="w-2.5 h-2.5 shrink-0" style={{ color: "rgba(147,197,253,0.7)" }} />
            <span className="text-[8px] font-bold uppercase tracking-wide" style={{ color: "rgba(147,197,253,0.6)" }}>
              {t("driver.pickup")}
            </span>
          </div>
          <p className="text-[11px] font-bold text-white truncate">{shipment.supplierName}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <MapPin className="w-2.5 h-2.5 shrink-0" style={{ color: "rgba(147,197,253,0.5)" }} />
            <span className="text-[9px]" style={{ color: "rgba(147,197,253,0.7)" }}>{getProvinceName(shipment.pickupProvince)}</span>
          </div>
        </div>
        <div className="shrink-0">
          <div className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.25)" }}>
            <ArrowRight className="w-3 h-3" style={{ color: "rgba(147,197,253,0.8)" }} />
          </div>
        </div>
        <div className="flex-1 min-w-0 text-right rtl:text-left">
          <div className="flex items-center justify-end rtl:justify-start gap-1 mb-0.5">
            <span className="text-[8px] font-bold uppercase tracking-wide" style={{ color: "rgba(110,231,183,0.6)" }}>
              {t("driver.delivery")}
            </span>
            <LocateFixed className="w-2.5 h-2.5 shrink-0" style={{ color: "rgba(110,231,183,0.7)" }} />
          </div>
          <p className="text-[11px] font-bold text-white truncate">{shipment.buyerName}</p>
          <div className="flex items-center justify-end rtl:justify-start gap-1 mt-0.5">
            <span className="text-[9px]" style={{ color: "rgba(110,231,183,0.7)" }}>{getProvinceName(shipment.deliveryProvince)}</span>
            <MapPin className="w-2.5 h-2.5 shrink-0" style={{ color: "rgba(110,231,183,0.5)" }} />
          </div>
        </div>
      </div>

      {/* Meta */}
      <div className="px-3.5 flex items-center gap-2 mb-2.5">
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
          <Package className="w-2.5 h-2.5" style={{ color: "rgba(167,139,250,0.7)" }} />
          <span className="text-[9px] font-semibold" style={{ color: "rgba(167,139,250,0.8)" }}>
            {shipment.items} {t("driver.items")}
          </span>
        </div>
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
          <Layers className="w-2.5 h-2.5" style={{ color: "rgba(251,191,36,0.6)" }} />
          <span className="text-[9px] font-semibold" style={{ color: "rgba(251,191,36,0.75)" }}>{shipment.weight}</span>
        </div>
      </div>

      {/* Status Stepper + Map button */}
      <div className="px-3.5 pb-3.5 border-t"
        style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <div className="flex items-center justify-between mt-3 mb-2.5">
          <p className="text-[9px] font-bold uppercase tracking-widest"
            style={{ color: "rgba(255,255,255,0.3)" }}>
            {t("driver.deliveryStatus")}
          </p>
          <button
            onClick={() => onOpenMap(shipment)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all"
            style={{
              background: "rgba(124,58,237,0.18)",
              border: "1px solid rgba(168,85,247,0.35)",
              color: "rgba(196,181,253,0.95)",
            }}
          >
            <MapIcon className="w-2.5 h-2.5" />
            نەخشە
          </button>
        </div>
        <StatusStepper status={status} onAdvance={() => onAdvance(shipment.id)} />
      </div>
    </motion.div>
  );
}

// ─── Available Shipment Card ──────────────────────────────────────────────────
function AvailableCard({
  shipment,
  onAccept,
}: {
  shipment: Shipment;
  onAccept: (id: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92, y: -8 }}
      transition={{ type: "spring", bounce: 0.18, duration: 0.4 }}
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: shipment.priority === "urgent"
          ? "1px solid rgba(251,191,36,0.3)"
          : "1px solid rgba(255,255,255,0.09)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
      }}
    >
      {/* Header */}
      <div className="px-3.5 pt-3 pb-2 flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-extrabold tracking-wide" style={{ color: "rgba(147,197,253,0.95)" }}>
              {shipment.orderId}
            </span>
            {shipment.priority === "urgent" && (
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-extrabold uppercase"
                style={{ background: "rgba(251,191,36,0.15)", color: "rgba(251,191,36,1)", border: "1px solid rgba(251,191,36,0.3)" }}>
                <Star className="w-2 h-2" />{t("driver.urgent")}
              </span>
            )}
          </div>
          <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>
            {shipment.createdAgo} {t("driver.minsAgo")}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0 px-2 py-1 rounded-xl"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <Banknote className="w-3 h-3" style={{ color: "rgba(110,231,183,0.9)" }} />
          <span className="text-xs font-extrabold" style={{ color: "rgba(110,231,183,1)" }}>
            {shipment.deliveryFee.toLocaleString()}
          </span>
          <span className="text-[8px]" style={{ color: "rgba(255,255,255,0.3)" }}>IQD</span>
        </div>
      </div>

      {/* Route */}
      <div className="mx-3.5 mb-2.5 rounded-xl p-2.5 flex items-center gap-2"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-0.5">
            <Box className="w-2.5 h-2.5 shrink-0" style={{ color: "rgba(147,197,253,0.7)" }} />
            <span className="text-[8px] font-bold uppercase tracking-wide" style={{ color: "rgba(147,197,253,0.6)" }}>
              {t("driver.pickup")}
            </span>
          </div>
          <p className="text-[11px] font-bold text-white truncate">{shipment.supplierName}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <MapPin className="w-2.5 h-2.5 shrink-0" style={{ color: "rgba(147,197,253,0.5)" }} />
            <span className="text-[9px]" style={{ color: "rgba(147,197,253,0.7)" }}>{getProvinceName(shipment.pickupProvince)}</span>
          </div>
        </div>
        <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
          style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.25)" }}>
          <ArrowRight className="w-3 h-3" style={{ color: "rgba(147,197,253,0.8)" }} />
        </div>
        <div className="flex-1 min-w-0 text-right rtl:text-left">
          <div className="flex items-center justify-end rtl:justify-start gap-1 mb-0.5">
            <span className="text-[8px] font-bold uppercase tracking-wide" style={{ color: "rgba(110,231,183,0.6)" }}>
              {t("driver.delivery")}
            </span>
            <LocateFixed className="w-2.5 h-2.5 shrink-0" style={{ color: "rgba(110,231,183,0.7)" }} />
          </div>
          <p className="text-[11px] font-bold text-white truncate">{shipment.buyerName}</p>
          <div className="flex items-center justify-end rtl:justify-start gap-1 mt-0.5">
            <span className="text-[9px]" style={{ color: "rgba(110,231,183,0.7)" }}>{getProvinceName(shipment.deliveryProvince)}</span>
            <MapPin className="w-2.5 h-2.5 shrink-0" style={{ color: "rgba(110,231,183,0.5)" }} />
          </div>
        </div>
      </div>

      {/* Meta + Accept */}
      <div className="px-3.5 pb-3 flex items-center gap-2">
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
          <Package className="w-2.5 h-2.5" style={{ color: "rgba(167,139,250,0.7)" }} />
          <span className="text-[9px] font-semibold" style={{ color: "rgba(167,139,250,0.8)" }}>
            {shipment.items} {t("driver.items")}
          </span>
        </div>
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
          <Layers className="w-2.5 h-2.5" style={{ color: "rgba(251,191,36,0.6)" }} />
          <span className="text-[9px] font-semibold" style={{ color: "rgba(251,191,36,0.75)" }}>{shipment.weight}</span>
        </div>
        <div className="flex-1" />
        <motion.button
          whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }}
          onClick={() => onAccept(shipment.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition-all"
          style={{
            background: "linear-gradient(135deg,#1D4ED8 0%,#3B82F6 100%)",
            color: "white",
            boxShadow: "0 0 14px rgba(59,130,246,0.35), 0 2px 8px rgba(0,0,0,0.25)",
          }}
        >
          <CheckCircle2 className="w-3 h-3" />
          {t("driver.accept")}
        </motion.button>
      </div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Main Driver Dashboard
// ════════════════════════════════════════════════════════════════════════════
export default function DriverDashboard() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();

  const [isOnline, setIsOnline]         = useState(true);
  const [currentLang, setCurrentLang]   = useState(i18n.language);
  const [selectedProvince, setSelectedProvince] = useState(user?.province ?? "erbil");

  // shipmentId → status
  const [activeStatuses, setActiveStatuses] = useState<Map<string, DeliveryStatus>>(new Map());
  // completed shipments (ids)
  const [completedIds, setCompletedIds]     = useState<Set<string>>(new Set());
  // overlay state
  const [completedShipment, setCompletedShipment] = useState<Shipment | null>(null);
  // map modal
  const [mapShipment, setMapShipment] = useState<Shipment | null>(null);

  const changeLang = (code: string) => {
    i18n.changeLanguage(code);
    setCurrentLang(code);
    const rtl = code === "ku" || code === "ar";
    document.documentElement.dir  = rtl ? "rtl" : "ltr";
    document.documentElement.lang = code;
  };

  const handleAccept = (id: string) => {
    const shipment = DEMO_SHIPMENTS.find(s => s.id === id);
    if (!shipment) return;
    setActiveStatuses(prev => new Map([...prev, [id, "picked_up"]]));
    toast({
      title: t("driver.acceptedTitle"),
      description: `${shipment.orderId} — ${getProvinceName(shipment.pickupProvince)} → ${getProvinceName(shipment.deliveryProvince)}`,
    });
  };

  const handleAdvanceStatus = (id: string) => {
    const current = activeStatuses.get(id);
    if (!current) return;
    const next = nextStep(current);
    if (!next) return;

    if (next === "delivered") {
      // Move to delivered first, then show overlay
      setActiveStatuses(prev => new Map([...prev, [id, "delivered"]]));
      const shipment = DEMO_SHIPMENTS.find(s => s.id === id)!;
      // Short delay so stepper animates to delivered state before overlay
      setTimeout(() => {
        setCompletedShipment(shipment);
      }, 400);
    } else {
      setActiveStatuses(prev => new Map([...prev, [id, next]]));
    }
  };

  const handleOverlayDone = () => {
    if (completedShipment) {
      setCompletedIds(prev => new Set([...prev, completedShipment.id]));
      setActiveStatuses(prev => {
        const m = new Map(prev);
        m.delete(completedShipment.id);
        return m;
      });
      setCompletedShipment(null);
    }
  };

  const available = useMemo(
    () => DEMO_SHIPMENTS.filter(s => !activeStatuses.has(s.id) && !completedIds.has(s.id)),
    [activeStatuses, completedIds]
  );

  const activeShipments = useMemo(
    () => DEMO_SHIPMENTS.filter(s => activeStatuses.has(s.id)),
    [activeStatuses]
  );

  const totalEarned = useMemo(
    () => DEMO_SHIPMENTS.filter(s => completedIds.has(s.id)).reduce((sum, s) => sum + s.deliveryFee, 0),
    [completedIds]
  );

  const provinceOptions = PROVINCES.map(p => ({ value: p.id, label: getProvinceName(p.id) }));

  // ── GPS transmitter: stream driver position to Socket.io for the first active shipment ──
  const firstActive = activeShipments[0] ?? null;
  const [fShopLat, fShopLng]     = firstActive ? getCoords(firstActive.pickupProvince)   : [0, 0];
  const [fCustLat, fCustLng]     = firstActive ? getCoords(firstActive.deliveryProvince) : [0, 0];
  useDriverTracking({
    orderId:     firstActive?.orderId ?? null,
    active:      isOnline && firstActive != null,
    shopLat:     fShopLat,
    shopLng:     fShopLng,
    customerLat: fCustLat,
    customerLng: fCustLng,
  });

  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(160deg,#020C1C 0%,#041428 60%,#030E22 100%)", paddingBottom: "72px" }}>

      {/* Ambient glows */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 50% at 15% 50%,rgba(29,78,216,0.18) 0%,transparent 70%)" }} />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 35% 30% at 85% 20%,rgba(6,182,212,0.1) 0%,transparent 65%)" }} />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 28% 28% at 65% 80%,rgba(16,185,129,0.07) 0%,transparent 60%)" }} />
      </div>

      {/* ── Header ───────────────────────────────────────────────── */}
      <header className="relative z-20 px-4 sm:px-6 py-3.5 shrink-0"
        style={{ background: "rgba(2,12,28,0.8)", borderBottom: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(20px)" }}>
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg,#1D4ED8,#3B82F6)", boxShadow: "0 0 14px rgba(59,130,246,0.4)" }}>
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-extrabold text-base tracking-tight">LinQi</span>
            <span className="hidden sm:block text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ background: "rgba(59,130,246,0.15)", color: "rgba(147,197,253,0.9)", border: "1px solid rgba(59,130,246,0.25)" }}>
              {t("role.driver")}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Lang switcher */}
            <div className="flex items-center gap-1">
              {LANGUAGES.map(l => (
                <button key={l.code} onClick={() => changeLang(l.code)}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: currentLang === l.code ? "rgba(59,130,246,0.22)" : "transparent",
                    color:      currentLang === l.code ? "rgba(147,197,253,1)"   : "rgba(255,255,255,0.45)",
                    border:     currentLang === l.code ? "1px solid rgba(59,130,246,0.4)" : "1px solid transparent",
                  }}>
                  {l.label}
                </button>
              ))}
            </div>

            {/* Province selector */}
            <div className="relative">
              <MapPin className="w-3 h-3 absolute ltr:left-2.5 rtl:right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: "rgba(110,231,183,0.7)" }} />
              <select value={selectedProvince} onChange={e => setSelectedProvince(e.target.value)}
                className="appearance-none ltr:pl-7 rtl:pr-7 ltr:pr-7 rtl:pl-7 py-1.5 rounded-xl text-xs font-semibold cursor-pointer"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(110,231,183,0.9)", outline: "none" }}>
                {provinceOptions.map(p => (
                  <option key={p.value} value={p.value} style={{ background: "#0a1629" }}>{p.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute ltr:right-2 rtl:left-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none"
                style={{ color: "rgba(110,231,183,0.5)" }} />
            </div>

            {/* Online toggle */}
            <button onClick={() => setIsOnline(v => !v)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
              style={
                isOnline
                  ? { background: "rgba(16,185,129,0.15)", color: "rgba(110,231,183,1)", border: "1px solid rgba(16,185,129,0.35)", boxShadow: "0 0 12px rgba(16,185,129,0.12)" }
                  : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.1)" }
              }>
              <div className="relative w-4 h-4 flex items-center justify-center">
                <Radio className="w-3.5 h-3.5" />
                {isOnline && (
                  <motion.span
                    animate={{ scale: [1, 1.8, 1], opacity: [0.8, 0, 0.8] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    className="absolute inset-0 rounded-full"
                    style={{ background: "rgba(16,185,129,0.4)" }}
                  />
                )}
              </div>
              {isOnline ? t("driver.online") : t("driver.offline")}
              <div className="w-7 h-4 rounded-full relative transition-colors"
                style={{ background: isOnline ? "rgba(16,185,129,0.4)" : "rgba(255,255,255,0.1)" }}>
                <motion.div
                  animate={{ x: isOnline ? (i18n.dir() === "rtl" ? -14 : 14) : 2 }}
                  transition={{ type: "spring", stiffness: 400, damping: 26 }}
                  className="absolute top-0.5 w-3 h-3 rounded-full"
                  style={{
                    background: isOnline ? "rgba(110,231,183,1)" : "rgba(255,255,255,0.4)",
                    [i18n.dir() === "rtl" ? "right" : "left"]: 2,
                  }}
                />
              </div>
            </button>

            {user && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-bold"
                  style={{ background: "rgba(59,130,246,0.25)", color: "rgba(147,197,253,1)" }}>
                  {user.name.charAt(0)}
                </div>
                <span className="text-white/65 text-xs font-medium truncate max-w-[90px]">{user.name}</span>
              </div>
            )}

            <button onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{ background: "rgba(239,68,68,0.1)", color: "rgba(252,165,165,0.85)", border: "1px solid rgba(239,68,68,0.2)" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.22)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; }}>
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t("nav.logout")}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main ─────────────────────────────────────────────────── */}
      <main className="relative z-10 flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">

        {/* ── Stats hero ───────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
          className="rounded-3xl overflow-hidden relative"
          style={{
            background: "linear-gradient(135deg,rgba(29,78,216,0.22) 0%,rgba(6,182,212,0.1) 60%,rgba(16,185,129,0.08) 100%)",
            border: "1px solid rgba(59,130,246,0.22)",
            boxShadow: "0 8px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
          }}>
          <div className="absolute inset-0 opacity-[0.07]"
            style={{ backgroundImage: "repeating-linear-gradient(45deg,rgba(255,255,255,.15) 0,rgba(255,255,255,.15) 1px,transparent 0,transparent 50%)", backgroundSize: "14px 14px" }} />
          <div className="relative px-5 sm:px-8 py-5 flex flex-wrap items-center gap-4 justify-between">
            <div>
              <h1 className="text-white font-extrabold text-xl sm:text-2xl leading-tight">
                {t("driver.welcome")}{user?.name ? `, ${user.name.split(" ")[0]}` : ""}! 🚚
              </h1>
              <p className="text-white/50 text-sm mt-0.5">{t("driver.welcomeSubtitle")}</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex flex-col items-center px-4 py-2.5 rounded-2xl"
                style={{ background: "rgba(59,130,246,0.14)", border: "1px solid rgba(59,130,246,0.25)" }}>
                <span className="text-white font-extrabold text-xl leading-none">{available.length}</span>
                <span className="text-[10px] mt-0.5" style={{ color: "rgba(147,197,253,0.8)" }}>{t("driver.available")}</span>
              </div>
              <div className="flex flex-col items-center px-4 py-2.5 rounded-2xl"
                style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)" }}>
                <span className="font-extrabold text-xl leading-none" style={{ color: "rgba(110,231,183,1)" }}>{activeShipments.length}</span>
                <span className="text-[10px] mt-0.5" style={{ color: "rgba(110,231,183,0.7)" }}>{t("driver.inProgressShort")}</span>
              </div>
              <div className="flex flex-col items-center px-4 py-2.5 rounded-2xl"
                style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.22)" }}>
                <span className="font-extrabold text-xl leading-none" style={{ color: "rgba(251,191,36,1)" }}>{completedIds.size}</span>
                <span className="text-[10px] mt-0.5" style={{ color: "rgba(251,191,36,0.7)" }}>{t("driver.completedShort")}</span>
              </div>
              {totalEarned > 0 && (
                <div className="flex flex-col items-center px-4 py-2.5 rounded-2xl"
                  style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.22)" }}>
                  <span className="font-extrabold text-lg leading-none" style={{ color: "rgba(196,181,253,1)" }}>
                    {totalEarned.toLocaleString()}
                  </span>
                  <span className="text-[10px] mt-0.5" style={{ color: "rgba(196,181,253,0.7)" }}>IQD {t("driver.earned")}</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── Offline banner ───────────────────────────────────── */}
        <AnimatePresence>
          {!isOnline && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="rounded-2xl px-4 py-3 flex items-center gap-3"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <Radio className="w-4 h-4 shrink-0" style={{ color: "rgba(252,165,165,0.9)" }} />
                <p className="text-sm font-semibold" style={{ color: "rgba(252,165,165,0.9)" }}>
                  {t("driver.offlineBanner")}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── My Active Deliveries ─────────────────────────────── */}
        <AnimatePresence>
          {activeShipments.length > 0 && (
            <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full"
                  style={{ background: "rgba(110,231,183,1)", boxShadow: "0 0 8px rgba(16,185,129,0.9)" }} />
                <h2 className="text-white font-extrabold text-sm">{t("driver.myActiveDeliveries")}</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(16,185,129,0.15)", color: "rgba(110,231,183,0.9)", border: "1px solid rgba(16,185,129,0.25)" }}>
                  {activeShipments.length}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <AnimatePresence>
                  {activeShipments.map(s => (
                    <ActiveDeliveryCard
                      key={s.id}
                      shipment={s}
                      status={activeStatuses.get(s.id)!}
                      onAdvance={handleAdvanceStatus}
                      onOpenMap={setMapShipment}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* ── Available shipments ──────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4" style={{ color: "rgba(147,197,253,0.8)" }} />
              <h2 className="text-white font-extrabold text-sm">{t("driver.availableShipments")}</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: "rgba(59,130,246,0.15)", color: "rgba(147,197,253,0.9)", border: "1px solid rgba(59,130,246,0.25)" }}>
                {available.length}
              </span>
            </div>
            {!isOnline && (
              <span className="text-[10px] font-semibold" style={{ color: "rgba(252,165,165,0.7)" }}>
                {t("driver.goOnlineToAccept")}
              </span>
            )}
          </div>

          {available.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="rounded-3xl flex flex-col items-center justify-center py-16 gap-4"
              style={{ background: "rgba(255,255,255,0.02)", border: "2px dashed rgba(255,255,255,0.07)" }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)" }}>
                <CheckCircle2 className="w-7 h-7" style={{ color: "rgba(110,231,183,0.4)" }} />
              </div>
              <div className="text-center">
                <p className="text-white/50 font-semibold text-sm">{t("driver.allAccepted")}</p>
                <p className="text-white/25 text-xs mt-1">{t("driver.allAcceptedSubtitle")}</p>
              </div>
            </motion.div>
          ) : (
            <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <AnimatePresence>
                {available.map((s, i) => (
                  <motion.div key={s.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, type: "spring", bounce: 0.18 }}>
                    <AvailableCard
                      shipment={s}
                      onAccept={isOnline ? handleAccept : () => {
                        toast({ title: t("driver.mustBeOnline"), variant: "destructive" });
                      }}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </section>

        <div className="h-4" />
      </main>

      {/* ── Completion Overlay ───────────────────────────────────── */}
      <AnimatePresence>
        {completedShipment && (
          <CompletionOverlay
            shipment={completedShipment}
            onDone={handleOverlayDone}
          />
        )}
      </AnimatePresence>

      {/* ── Live Tracking Map Modal ──────────────────────────────── */}
      <AnimatePresence>
        {mapShipment && (
          <DeliveryMapModal
            shipment={mapShipment}
            onClose={() => setMapShipment(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
