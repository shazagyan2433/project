/**
 * LiveTrackingMap
 * ----------------
 * Interactive Leaflet map showing:
 *   • Shop (pickup) — blue building marker
 *   • Customer (dropoff) — green pin marker
 *   • Driver — animated truck that updates in real-time
 *
 * Uses react-leaflet with OpenStreetMap tiles (no API key needed).
 */
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { useLiveTracking } from "@/hooks/useLiveTracking";

// Fix default marker icon paths broken by bundlers
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ── Custom DivIcon factories ──────────────────────────────────────────────────

function shopIcon() {
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width:36px;height:36px;border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        background:linear-gradient(135deg,#1D4ED8,#3B82F6);
        border:3px solid white;
        box-shadow:0 2px 12px rgba(59,130,246,0.6);
        display:flex;align-items:center;justify-content:center;
      ">
        <span style="transform:rotate(45deg);font-size:16px;line-height:1;">🏪</span>
      </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
}

function customerIcon() {
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width:36px;height:36px;border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        background:linear-gradient(135deg,#059669,#10B981);
        border:3px solid white;
        box-shadow:0 2px 12px rgba(16,185,129,0.6);
        display:flex;align-items:center;justify-content:center;
      ">
        <span style="transform:rotate(45deg);font-size:16px;line-height:1;">📍</span>
      </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
}

function driverIcon(heading?: number) {
  const rotation = heading ?? 0;
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width:44px;height:44px;border-radius:50%;
        background:linear-gradient(135deg,#7C3AED,#A855F7);
        border:3px solid white;
        box-shadow:0 0 0 4px rgba(168,85,247,0.35),0 4px 16px rgba(0,0,0,0.4);
        display:flex;align-items:center;justify-content:center;
        transform:rotate(${rotation}deg);
        transition:transform 0.6s ease;
      ">
        <span style="font-size:22px;transform:rotate(${-rotation}deg)">🛵</span>
      </div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });
}

// ── Auto-fit bounds when positions change ─────────────────────────────────────
function BoundsFitter({
  positions,
}: {
  positions: [number, number][];
}) {
  const map = useMap();
  const fittedRef = useRef(false);

  useEffect(() => {
    if (positions.length < 2) return;
    if (fittedRef.current) return; // only auto-fit on first render
    fittedRef.current = true;
    const bounds = L.latLngBounds(positions.map(([lat, lng]) => L.latLng(lat, lng)));
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 13 });
  }, [map, positions]);

  return null;
}

// ── Smooth driver marker movement ─────────────────────────────────────────────
function AnimatedDriverMarker({
  lat,
  lng,
  heading,
  label,
}: {
  lat: number;
  lng: number;
  heading?: number;
  label: string;
}) {
  const markerRef = useRef<L.Marker | null>(null);

  // Update icon when heading changes
  useEffect(() => {
    markerRef.current?.setIcon(driverIcon(heading));
  }, [heading]);

  // Smoothly animate position
  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    const start = marker.getLatLng();
    const end = L.latLng(lat, lng);
    if (start.distanceTo(end) < 1) return;

    const frames = 30;
    let frame = 0;
    const timer = setInterval(() => {
      frame++;
      const t = frame / frames;
      marker.setLatLng([
        start.lat + (end.lat - start.lat) * t,
        start.lng + (end.lng - start.lng) * t,
      ]);
      if (frame >= frames) clearInterval(timer);
    }, 33); // ~30fps over 1s

    return () => clearInterval(timer);
  }, [lat, lng]);

  return (
    <Marker
      ref={markerRef}
      position={[lat, lng]}
      icon={driverIcon(heading)}
    >
      <Popup>{label}</Popup>
    </Marker>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export interface TrackingMapProps {
  orderId: string;
  shopLat: number;
  shopLng: number;
  shopName: string;
  customerLat: number;
  customerLng: number;
  customerName: string;
  /** Optional: initial driver position (from DB last-known) */
  initialDriverLat?: number;
  initialDriverLng?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function LiveTrackingMap({
  orderId,
  shopLat,
  shopLng,
  shopName,
  customerLat,
  customerLng,
  customerName,
  initialDriverLat,
  initialDriverLng,
  className = "",
  style,
}: TrackingMapProps) {
  // Subscribe to real-time driver position
  const livePos = useLiveTracking(orderId);

  const driverLat = livePos?.lat ?? initialDriverLat ?? shopLat;
  const driverLng = livePos?.lng ?? initialDriverLng ?? shopLng;
  const driverHeading = livePos?.heading;

  const center: [number, number] = [
    (shopLat + customerLat) / 2,
    (shopLng + customerLng) / 2,
  ];

  const routeLine: [number, number][] = [
    [shopLat, shopLng],
    [driverLat, driverLng],
    [customerLat, customerLng],
  ];

  const allPositions: [number, number][] = [
    [shopLat, shopLng],
    [customerLat, customerLng],
  ];

  return (
    <MapContainer
      center={center}
      zoom={7}
      className={className}
      style={{ width: "100%", height: "100%", borderRadius: "inherit", ...style }}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <BoundsFitter positions={allPositions} />

      {/* Dashed route polyline */}
      <Polyline
        positions={[[shopLat, shopLng], [customerLat, customerLng]]}
        pathOptions={{
          color: "#3B82F6",
          weight: 3,
          opacity: 0.45,
          dashArray: "8 6",
        }}
      />

      {/* Covered portion (shop → driver) */}
      <Polyline
        positions={[[shopLat, shopLng], [driverLat, driverLng]]}
        pathOptions={{ color: "#10B981", weight: 4, opacity: 0.7 }}
      />

      {/* Shop marker */}
      <Marker position={[shopLat, shopLng]} icon={shopIcon()}>
        <Popup>
          <strong>🏪 {shopName}</strong>
          <br />
          <span style={{ fontSize: 11, color: "#64748b" }}>pickup / origin</span>
        </Popup>
      </Marker>

      {/* Customer marker */}
      <Marker position={[customerLat, customerLng]} icon={customerIcon()}>
        <Popup>
          <strong>📍 {customerName}</strong>
          <br />
          <span style={{ fontSize: 11, color: "#64748b" }}>dropoff / destination</span>
        </Popup>
      </Marker>

      {/* Animated driver marker */}
      <AnimatedDriverMarker
        lat={driverLat}
        lng={driverLng}
        heading={driverHeading}
        label={`🛵 شۆفێر — ${orderId}`}
      />

      {/* Live indicator */}
      {livePos && (
        <div
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            zIndex: 1000,
            background: "rgba(16,185,129,0.9)",
            color: "white",
            fontSize: 10,
            fontWeight: 700,
            padding: "3px 8px",
            borderRadius: 20,
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "white",
              display: "inline-block",
              animation: "pulse 1.5s infinite",
            }}
          />
          LIVE
        </div>
      )}
    </MapContainer>
  );
}
