import { useEffect, useMemo, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { IRAQ_MAP_CENTER, DEFAULT_STORE_COORDS } from "@/lib/store-location";

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function storeIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#1d4ed8,#3b82f6);border:3px solid white;box-shadow:0 0 20px rgba(59,130,246,0.6);display:flex;align-items:center;justify-content:center;font-size:18px">🏪</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
}

function MapFlyTo({
  lat,
  lng,
  zoom,
  animate,
}: {
  lat: number;
  lng: number;
  zoom: number;
  animate?: boolean;
}) {
  const map = useMap();
  useEffect(() => {
    if (animate) {
      map.flyTo([lat, lng], zoom, { duration: 1.2, easeLinearity: 0.25 });
    } else {
      map.setView([lat, lng], zoom, { animate: true });
    }
  }, [lat, lng, zoom, animate, map]);
  return null;
}

function MapClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function DraggableStoreMarker({
  lat,
  lng,
  label,
  onDragEnd,
}: {
  lat: number;
  lng: number;
  label?: string;
  onDragEnd: (lat: number, lng: number) => void;
}) {
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    const current = marker.getLatLng();
    if (Math.abs(current.lat - lat) > 1e-6 || Math.abs(current.lng - lng) > 1e-6) {
      marker.setLatLng([lat, lng]);
    }
  }, [lat, lng]);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (!marker) return;
        const { lat: newLat, lng: newLng } = marker.getLatLng();
        onDragEnd(newLat, newLng);
      },
    }),
    [onDragEnd],
  );

  return (
    <Marker
      draggable={true}
      position={[lat, lng]}
      icon={storeIcon()}
      eventHandlers={eventHandlers}
      ref={markerRef}
    >
      {label ? <Popup>{label}</Popup> : null}
    </Marker>
  );
}

export function StoreLocationPicker({
  lat,
  lng,
  onChange,
  label,
  height = 280,
  interactive = true,
  mapZoom,
  flyToLocation = false,
}: {
  lat?: number | null;
  lng?: number | null;
  onChange?: (lat: number, lng: number) => void;
  label?: string;
  height?: number;
  /** When false, marker is read-only (admin preview). */
  interactive?: boolean;
  /** Override map zoom level (e.g. 16 after GPS lock). */
  mapZoom?: number;
  /** Smooth fly animation when coordinates change (GPS button). */
  flyToLocation?: boolean;
}) {
  const safeLat = Number.isFinite(lat) ? (lat as number) : DEFAULT_STORE_COORDS.lat;
  const safeLng = Number.isFinite(lng) ? (lng as number) : DEFAULT_STORE_COORDS.lng;
  const hasCustom = Number.isFinite(lat) && Number.isFinite(lng);
  const zoom = mapZoom ?? (hasCustom ? 14 : IRAQ_MAP_CENTER.zoom);

  const handlePick = (newLat: number, newLng: number) => {
    onChange?.(newLat, newLng);
  };

  return (
    <MapContainer
      center={[safeLat, safeLng]}
      zoom={zoom}
      style={{ width: "100%", height, borderRadius: 12 }}
      scrollWheelZoom={interactive}
    >
      <TileLayer attribution="© OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <MapFlyTo lat={safeLat} lng={safeLng} zoom={zoom} animate={flyToLocation} />
      {interactive && onChange ? (
        <>
          <MapClickHandler onPick={handlePick} />
          <DraggableStoreMarker lat={safeLat} lng={safeLng} label={label} onDragEnd={handlePick} />
        </>
      ) : (
        <Marker position={[safeLat, safeLng]} icon={storeIcon()}>
          {label ? <Popup>{label}</Popup> : null}
        </Marker>
      )}
    </MapContainer>
  );
}
