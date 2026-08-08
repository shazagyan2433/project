import { useState, lazy, Suspense } from "react";
import { motion } from "framer-motion";
import {
  Truck, MapPin, Clock, Package, CheckCircle2, Circle,
  Loader, AlertTriangle, Navigation, Map, X,
} from "lucide-react";
import { useLiveTracking } from "@/hooks/useLiveTracking";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/PageHeader";
import { useDeliveries, type ApiDelivery } from "@/hooks/useB2bData";
import { useLocaleDir } from "@/lib/use-locale-dir";

// Lazy-load the map (Leaflet is heavy — only load when opened)
const LiveTrackingMap = lazy(() =>
  import("@/components/LiveTrackingMap").then((m) => ({ default: m.LiveTrackingMap }))
);

// ── Province centroids (WGS-84) ───────────────────────────────────────────────
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

const STEP_KEYS = ["received", "prepared", "shipped", "delivered"] as const;

type ShipmentView = {
  id: string;
  client: string;
  items: number;
  city: string;
  progress: number;
  total: number;
  urgent: boolean;
  shopLat: number;
  shopLng: number;
  customerLat: number;
  customerLng: number;
};

function deliveryToShipment(d: ApiDelivery): ShipmentView {
  const progress = d.status === "completed" ? 4 : d.status === "active" ? 2 : 0;
  return {
    id: d.orderId,
    client: d.shopName,
    items: 1,
    city: d.customerName,
    progress,
    total: 4,
    urgent: false,
    shopLat: parseFloat(d.shopLat),
    shopLng: parseFloat(d.shopLng),
    customerLat: parseFloat(d.customerLat),
    customerLng: parseFloat(d.customerLng),
  };
}

const DRIVER_STATUS_KEYS: Record<string, string> = {
  delivering: "logistics.driverStatus.delivering",
  idle: "logistics.driverStatus.idle",
  returning: "logistics.driverStatus.returning",
};

// ── Live status dot for driver rows ──────────────────────────────────────────
function LiveDot({ orderId }: { orderId: string | null }) {
  const pos = useLiveTracking(orderId);
  if (!orderId || !pos) return null;
  return (
    <span
      title="Live GPS"
      style={{
        display: "inline-block",
        width: 7,
        height: 7,
        borderRadius: "50%",
        background: "#10B981",
        boxShadow: "0 0 0 2px rgba(16,185,129,0.4)",
        animation: "pulse 1.5s infinite",
        verticalAlign: "middle",
        marginRight: 4,
      }}
    />
  );
}

// ── Map modal ─────────────────────────────────────────────────────────────────
interface MapModalProps {
  shipment: ShipmentView;
  driverName: string;
  onClose: () => void;
}

function MapModal({ shipment, driverName, onClose }: MapModalProps) {
  const { t } = useTranslation("common");
  const shopLat = shipment.shopLat;
  const shopLng = shipment.shopLng;
  const custLat = shipment.customerLat;
  const custLng = shipment.customerLng;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 500,
        background: "rgba(2,12,28,0.85)",
        backdropFilter: "blur(12px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", bounce: 0.18 }}
        style={{
          width: "100%", maxWidth: 720,
          background: "rgba(4,20,40,0.97)",
          border: "1px solid rgba(59,130,246,0.3)",
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: "14px 18px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: "rgba(59,130,246,0.2)",
              border: "1px solid rgba(59,130,246,0.35)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Map style={{ width: 15, height: 15, color: "#60A5FA" }} />
            </div>
            <div>
              <p style={{ color: "white", fontWeight: 800, fontSize: 13 }}>
                {t("logistics.map.title", { id: shipment.id })}
              </p>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>
                🛵 {driverName} &nbsp;·&nbsp; {shipment.client}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: 8,
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.12)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "rgba(255,255,255,0.6)",
            }}
          >
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>

        {/* Map */}
        <div style={{ height: 440, position: "relative" }}>
          <Suspense fallback={
            <div style={{
              height: "100%", display: "flex", alignItems: "center",
              justifyContent: "center", color: "rgba(255,255,255,0.4)", fontSize: 13,
            }}>
              <Loader style={{ width: 18, height: 18, marginRight: 8, animation: "spin 1s linear infinite" }} />
              {t("logistics.map.loading")}
            </div>
          }>
            <LiveTrackingMap
              orderId={shipment.id}
              shopLat={shopLat}
              shopLng={shopLng}
              shopName={shipment.client}
              customerLat={custLat}
              customerLng={custLng}
              customerName={shipment.city}
            />
          </Suspense>
        </div>

        {/* Footer legend */}
        <div style={{
          padding: "10px 18px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex", gap: 18, flexWrap: "wrap",
        }}>
          {[
            { icon: "🏪", label: t("logistics.map.pickup") },
            { icon: "📍", label: t("logistics.map.dropoff") },
            { icon: "🛵", label: t("logistics.map.driverLive") },
          ].map((item) => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 14 }}>{item.icon}</span>
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 10 }}>{item.label}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// ── Main Logistics page ───────────────────────────────────────────────────────
export default function Logistics() {
  const { t } = useTranslation("common");
  const { dir } = useLocaleDir("common");
  const { data: deliveries = [], isLoading } = useDeliveries();
  const shipments = deliveries.map(deliveryToShipment);
  const activeList = shipments.filter((s) => s.progress < s.total);
  const completedToday = deliveries.filter((d) => d.status === "completed").length;

  const STATS = [
    { label: t("logistics.stats.activeShipments"), value: String(activeList.length), color: "#3B82F6", sub: t("logistics.stats.onRoute") },
    { label: t("logistics.stats.totalDeliveries"), value: String(deliveries.length), color: "#10B981", sub: t("logistics.stats.registered") },
    { label: t("logistics.stats.pending"), value: String(deliveries.filter((d) => d.status === "active").length), color: "#F59E0B", sub: t("logistics.stats.active") },
    { label: t("logistics.stats.completed"), value: String(completedToday), color: "#A855F7", sub: t("logistics.stats.done") },
  ];

  const [activeShip, setActiveShip] = useState<string | null>(null);
  const [mapShipment, setMapShipment] = useState<ShipmentView | null>(null);
  const [mapDriverName, setMapDriverName] = useState("");

  const ship = shipments.find((s) => s.id === activeShip) ?? shipments[0];

  const openMap = (s: ShipmentView) => {
    setMapShipment(s);
    setMapDriverName(t("logistics.driver"));
  };

  const driverStatusMeta: Record<string, { color: string; Icon: React.ElementType }> = {
    delivering: { color: "#3B82F6", Icon: Truck },
    idle: { color: "#10B981", Icon: CheckCircle2 },
    returning: { color: "#F59E0B", Icon: Navigation },
  };

  return (
    <div dir={dir} className="space-y-6 pb-8">
      {/* Map modal */}
      {mapShipment && (
        <MapModal
          shipment={mapShipment}
          driverName={mapDriverName}
          onClose={() => setMapShipment(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)" }}
        >
          <Truck className="w-5 h-5" style={{ color: "#F59E0B" }} />
        </div>
        <div>
          <PageHeader
            id="logistics"
            titleClassName="text-2xl font-extrabold text-slate-900 dark:text-white"
            subtitleClassName="text-xs text-slate-600 dark:text-white/40"
          />
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="rounded-2xl p-4"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <p className="text-2xl font-extrabold text-white">{s.value}</p>
            <p className="text-xs text-white/50 mt-0.5">{s.label}</p>
            <p className="text-[10px] mt-1.5 font-semibold" style={{ color: s.color }}>{s.sub}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Shipment tracker */}
        <div
          className="lg:col-span-3 rounded-2xl p-5 space-y-4"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-extrabold text-white/80">{t("logistics.shipmentTracker")}</h2>
            <span className="text-[10px] text-white/30 font-mono">{t("logistics.live")}</span>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-white/30 text-sm">{t("common.loading")}</div>
          ) : shipments.length === 0 ? (
            <div className="py-12 text-center text-white/30 text-sm">{t("emptyStates.noShipments")}</div>
          ) : (
          <>
          <div className="flex flex-wrap gap-2">
            {shipments.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveShip(s.id)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                style={{
                  background: activeShip === s.id ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.05)",
                  border: activeShip === s.id ? "1px solid rgba(59,130,246,0.4)" : "1px solid rgba(255,255,255,0.08)",
                  color: activeShip === s.id ? "#60A5FA" : "rgba(255,255,255,0.45)",
                }}
              >
                {s.urgent && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />}
                {s.id}
              </button>
            ))}
          </div>

          {/* Active shipment detail */}
          {ship && (
          <div
            className="rounded-xl p-4 space-y-4"
            style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)" }}
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-sm font-bold text-white">{ship.client}</p>
                <p className="text-xs text-white/40">{ship.city} — {ship.items} {t("logistics.product")}</p>
              </div>
              <div className="flex items-center gap-2">
                {ship.urgent && (
                  <span
                    className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg"
                    style={{ background: "rgba(239,68,68,0.15)", color: "#F87171" }}
                  >
                    <AlertTriangle className="w-3 h-3" /> {t("logistics.urgent")}
                  </span>
                )}
                <button
                  onClick={() => openMap(ship)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all"
                  style={{
                    background: "linear-gradient(135deg,rgba(124,58,237,0.3),rgba(168,85,247,0.2))",
                    border: "1px solid rgba(168,85,247,0.4)",
                    color: "#C4B5FD",
                  }}
                >
                  <Map className="w-3 h-3" />
                  {t("logistics.liveGps")}
                </button>
              </div>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center gap-0">
              {STEP_KEYS.map((stepKey, i) => {
                const done = i < ship.progress;
                const active = i === ship.progress - 1;
                return (
                  <div key={i} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center gap-1.5">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
                        style={{
                          background: done ? "#3B82F6" : "rgba(255,255,255,0.08)",
                          border: done ? "2px solid #60A5FA" : "1.5px solid rgba(255,255,255,0.12)",
                        }}
                      >
                        {done
                          ? <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                          : active
                            ? <Loader className="w-3 h-3 text-blue-400 animate-spin" />
                            : <Circle className="w-3 h-3 text-white/20" />}
                      </div>
                      <span
                        className="text-[9px] text-center font-semibold whitespace-nowrap"
                        style={{ color: done ? "#93C5FD" : "rgba(255,255,255,0.25)" }}
                      >
                        {t(`logistics.steps.${stepKey}`)}
                      </span>
                    </div>
                    {i < STEP_KEYS.length - 1 && (
                      <div
                        className="flex-1 h-0.5 mx-1 rounded-full"
                        style={{ background: i < ship.progress - 1 ? "#3B82F6" : "rgba(255,255,255,0.08)" }}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Route chips */}
            <div className="flex items-center gap-2 text-[10px]">
              <MapPin className="w-3 h-3 shrink-0" style={{ color: "#3B82F6" }} />
              <span style={{ color: "rgba(255,255,255,0.5)" }}>{ship.client}</span>
              <span style={{ color: "rgba(255,255,255,0.25)" }}>→</span>
              <MapPin className="w-3 h-3 shrink-0" style={{ color: "#10B981" }} />
              <span style={{ color: "rgba(255,255,255,0.5)" }}>{ship.city}</span>
            </div>
          </div>
          )}
          </>
          )}
        </div>

        {/* Delivery list */}
        <div
          className="lg:col-span-2 rounded-2xl p-5 space-y-3"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <h2 className="text-sm font-extrabold text-white/80 mb-3">{t("logistics.deliveries")}</h2>
          {shipments.length === 0 ? (
            <p className="text-xs text-white/30 py-8 text-center">{t("emptyStates.noShipments")}</p>
          ) : (
            shipments.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-white/[0.03] cursor-pointer"
                style={{ border: "1px solid rgba(255,255,255,0.06)" }}
                onClick={() => {
                  setActiveShip(s.id);
                  openMap(s);
                }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-extrabold text-white shrink-0"
                  style={{ background: "linear-gradient(135deg,#3B82F680,#3B82F640)" }}
                >
                  {s.client.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate flex items-center gap-1">
                    <LiveDot orderId={s.id} />
                    {s.id}
                  </p>
                  <p className="text-[10px] text-white/40 truncate">{s.client}</p>
                </div>
                <div className="text-end shrink-0">
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-lg"
                    style={{
                      color: s.progress >= s.total ? "#10B981" : "#3B82F6",
                      background: s.progress >= s.total ? "rgba(16,185,129,0.15)" : "rgba(59,130,246,0.15)",
                    }}
                  >
                    {s.progress >= s.total ? t("logistics.arrived") : t("logistics.onRoute")}
                  </span>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
