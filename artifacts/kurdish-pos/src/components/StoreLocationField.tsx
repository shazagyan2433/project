import { useCallback, useState } from "react";
import { MapPin, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { StoreLocationPicker } from "@/components/StoreLocationPicker";
import { DEFAULT_STORE_COORDS, formatStoreAddress, isValidCoords } from "@/lib/store-location";

type GlassInput = {
  input: React.CSSProperties;
  inputFocusBorder: string;
  inputFocusShadow: string;
};

const defaultGlass: GlassInput = {
  input: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
  },
  inputFocusBorder: "1px solid rgba(99,179,255,0.55)",
  inputFocusShadow: "0 0 0 3px rgba(59,130,246,0.15)",
};

const GPS_ZOOM = 16;
const DEFAULT_ZOOM = 6;

function stripCoordsFromAddress(text?: string): string {
  if (!text?.trim()) return "";
  return text.replace(/^-?\d+\.\d+\s*[,،]\s*-?\d+\.\d+\s*(—\s*)?/u, "").trim();
}

function hasCustomCoords(lat?: number | null, lng?: number | null): boolean {
  return isValidCoords(lat, lng);
}

export function StoreLocationField({
  label,
  address,
  lat,
  lng,
  onAddressChange,
  onLocationChange,
  glass = defaultGlass,
  mapHeight = 260,
}: {
  label: string;
  address: string;
  lat?: number | null;
  lng?: number | null;
  onAddressChange: (value: string) => void;
  onLocationChange: (lat: number, lng: number) => void;
  glass?: GlassInput;
  mapHeight?: number;
}) {
  const { t } = useTranslation();
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsOk, setGpsOk] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [mapZoom, setMapZoom] = useState(hasCustomCoords(lat, lng) ? 14 : DEFAULT_ZOOM);
  const [flyToLocation, setFlyToLocation] = useState(false);

  const displayLat = isValidCoords(lat, lng) ? lat! : DEFAULT_STORE_COORDS.lat;
  const displayLng = isValidCoords(lat, lng) ? lng! : DEFAULT_STORE_COORDS.lng;

  const applyLocation = useCallback(
    (newLat: number, newLng: number, opts?: { fly?: boolean; zoom?: number }) => {
      onLocationChange(newLat, newLng);
      const labelText = stripCoordsFromAddress(address);
      onAddressChange(formatStoreAddress(newLat, newLng, labelText || undefined));
      if (opts?.zoom) setMapZoom(opts.zoom);
      if (opts?.fly) setFlyToLocation(true);
    },
    [address, onAddressChange, onLocationChange],
  );

  const useGps = () => {
    setGpsError(null);

    if (!navigator.geolocation) {
      setGpsError(t("onboard.gpsUnsupported", { defaultValue: "This browser does not support geolocation" }));
      applyLocation(DEFAULT_STORE_COORDS.lat, DEFAULT_STORE_COORDS.lng, { zoom: 12, fly: true });
      return;
    }

    setGpsLoading(true);
    setFlyToLocation(false);

    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        applyLocation(latitude, longitude, { fly: true, zoom: GPS_ZOOM });
        setGpsOk(true);
        setGpsLoading(false);
        setTimeout(() => setGpsOk(false), 2500);
      },
      () => {
        setGpsLoading(false);
        setGpsError(
          t("onboard.gpsFallback", {
            defaultValue: "Location unavailable — using default map coordinates. Drag the marker or tap the map.",
          }),
        );
        applyLocation(DEFAULT_STORE_COORDS.lat, DEFAULT_STORE_COORDS.lng, { fly: true, zoom: 12 });
      },
      { timeout: 12000, enableHighAccuracy: true, maximumAge: 0 },
    );
  };

  const handleMapChange = (newLat: number, newLng: number) => {
    setFlyToLocation(false);
    setMapZoom(GPS_ZOOM);
    applyLocation(newLat, newLng);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: "#E2E8F0", letterSpacing: "0.06em" }}
        >
          {label}
        </label>
        <button
          type="button"
          onClick={useGps}
          disabled={gpsLoading}
          className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border border-white/10 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 disabled:opacity-50 active:scale-95 transition-transform"
        >
          {gpsOk ? <Check className="w-3 h-3 text-emerald-400" /> : <MapPin className="w-3 h-3" />}
          {gpsLoading ? t("onboard.gpsFetching") : t("onboard.gpsUse", { defaultValue: "GPS" })}
        </button>
      </div>

      {gpsError && (
        <p className="text-[10px] text-amber-400/90 leading-relaxed">{gpsError}</p>
      )}

      <p className="text-[10px] text-slate-500">
        {t("onboard.mapHint", { defaultValue: "Click the map or drag the marker to set your store location." })}
      </p>

      <StoreLocationPicker
        lat={displayLat}
        lng={displayLng}
        onChange={handleMapChange}
        label={address || label}
        height={mapHeight}
        interactive
        mapZoom={mapZoom}
        flyToLocation={flyToLocation}
      />

      <input
        type="text"
        value={address}
        onChange={e => onAddressChange(e.target.value)}
        placeholder={t("onboard.addressPh")}
        className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder-[#94A3B8] outline-none transition-all"
        style={{ ...glass.input, borderRadius: "0.75rem" }}
        onFocus={e => {
          e.currentTarget.style.border = glass.inputFocusBorder;
          e.currentTarget.style.boxShadow = glass.inputFocusShadow;
        }}
        onBlur={e => {
          e.currentTarget.style.border = "1px solid rgba(255,255,255,0.12)";
          e.currentTarget.style.boxShadow = "none";
        }}
      />

      <div className="grid grid-cols-2 gap-2" dir="ltr">
        <label className="space-y-1">
          <span className="text-[9px] uppercase tracking-wide text-slate-500 font-semibold">Latitude</span>
          <input
            type="text"
            readOnly
            value={displayLat.toFixed(5)}
            className="w-full px-2.5 py-1.5 rounded-lg text-[11px] font-mono text-slate-300 bg-white/5 border border-white/10"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[9px] uppercase tracking-wide text-slate-500 font-semibold">Longitude</span>
          <input
            type="text"
            readOnly
            value={displayLng.toFixed(5)}
            className="w-full px-2.5 py-1.5 rounded-lg text-[11px] font-mono text-slate-300 bg-white/5 border border-white/10"
          />
        </label>
      </div>
    </div>
  );
}
