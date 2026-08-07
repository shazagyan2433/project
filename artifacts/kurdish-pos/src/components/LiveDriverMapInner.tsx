/**
 * Leaflet map layer for LiveDriverTracking — loaded lazily.
 * Markers are stationary (actual GPS coords only). No simulated motion.
 */
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import {
  IRAQ_CENTER,
  IRAQ_ZOOM,
  getCityLabel,
  type TrackedDriver,
} from "@/lib/admin-mock-data";

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function driverPin(online: boolean) {
  const glow = online ? "rgba(16,185,129,0.55)" : "rgba(100,116,139,0.4)";
  const bg = online
    ? "linear-gradient(135deg,#059669,#10B981)"
    : "linear-gradient(135deg,#475569,#64748b)";
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width:40px;height:40px;border-radius:50%;
        background:${bg};
        border:3px solid white;
        box-shadow:0 0 0 4px ${glow},0 4px 14px rgba(0,0,0,0.45);
        display:flex;align-items:center;justify-content:center;
      ">
        <span style="font-size:18px;line-height:1">🛵</span>
      </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
}

function MapFlyTo({
  target,
}: {
  target: { lat: number; lng: number; zoom: number };
}) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([target.lat, target.lng], target.zoom, { duration: 1.1 });
  }, [map, target.lat, target.lng, target.zoom]);
  return null;
}

function FocusSelected({ driver }: { driver: TrackedDriver | null }) {
  const map = useMap();
  useEffect(() => {
    if (!driver) return;
    map.flyTo([driver.lat, driver.lng], 14, { duration: 0.85 });
  }, [map, driver?.id, driver?.lat, driver?.lng]);
  return null;
}

export default function LiveDriverMapInner({
  drivers,
  flyTarget,
  selectedId,
  onSelect,
  lang,
}: {
  drivers: TrackedDriver[];
  flyTarget: { lat: number; lng: number; zoom: number };
  selectedId: string | null;
  onSelect: (id: string) => void;
  lang: string;
}) {
  const selected = drivers.find(d => d.id === selectedId) ?? null;

  return (
    <MapContainer
      center={IRAQ_CENTER}
      zoom={IRAQ_ZOOM}
      style={{ width: "100%", height: 420 }}
      zoomControl
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapFlyTo target={flyTarget} />
      <FocusSelected driver={selected} />

      {drivers.map(d => (
        <Marker
          key={d.id}
          position={[d.lat, d.lng]}
          icon={driverPin(d.online)}
          eventHandlers={{
            click: () => onSelect(d.id),
          }}
        >
          <Popup>
            <strong>{d.name}</strong>
            <br />
            <span style={{ fontSize: 11, color: "#64748b" }}>
              {getCityLabel(d.city, lang)} · {d.vehicle}
            </span>
            <br />
            <span style={{ fontSize: 10, color: d.online ? "#10b981" : "#94a3b8" }}>
              {d.online ? "Online" : "Offline"} · GPS approved
            </span>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
