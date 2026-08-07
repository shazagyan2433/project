import { useMemo, useState, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { MapPin, Navigation, ShieldCheck, ShieldOff, Wifi, WifiOff, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CITY_COORDS,
  CITY_FILTERS,
  IRAQ_CENTER,
  IRAQ_ZOOM,
  getCityLabel,
  type CityId,
  type TrackedDriver,
} from "@/lib/admin-mock-data";

export type { CityId, TrackedDriver };
export { CITY_FILTERS, getCityLabel };

const LiveDriverMapInner = lazy(() => import("./LiveDriverMapInner"));

export function LiveDriverTracking({
  drivers = [],
  lang = "ku",
}: {
  drivers?: TrackedDriver[];
  lang?: string;
}) {
  const { t } = useTranslation("admin");
  const [city, setCity] = useState<CityId>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(
    () => (city === "all" ? drivers : drivers.filter(d => d.city === city)),
    [drivers, city],
  );

  /** Map only shows drivers who approved location sharing */
  const onMap = useMemo(
    () => filtered.filter(d => d.location_approved === true),
    [filtered],
  );

  const flyTarget = useMemo(() => {
    if (city === "all") return { lat: IRAQ_CENTER[0], lng: IRAQ_CENTER[1], zoom: IRAQ_ZOOM };
    const c = CITY_COORDS[city];
    return { lat: c.lat, lng: c.lng, zoom: c.zoom };
  }, [city]);

  const approvedCount = onMap.length;
  const onlineCount = filtered.filter(d => d.online).length;
  const pendingPerm = filtered.filter(d => !d.location_approved).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: t("drivers.inList"), value: filtered.length, icon: Truck, color: "#38bdf8" },
          { label: t("drivers.onMap"), value: approvedCount, icon: Navigation, color: "#34d399" },
          { label: t("drivers.online"), value: onlineCount, icon: Wifi, color: "#a78bfa" },
          { label: t("drivers.noGps"), value: pendingPerm, icon: ShieldOff, color: "#fbbf24" },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${s.color}18`, border: `1px solid ${s.color}33` }}>
              <s.icon className="w-3.5 h-3.5" style={{ color: s.color }} />
            </div>
            <div>
              <p className="text-lg font-extrabold text-white leading-none">{s.value}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1 max-w-full">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1 me-1">
          <MapPin className="w-3 h-3" />
          {t("drivers.city")}
        </span>
        {CITY_FILTERS.map(f => {
          const active = city === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setCity(f.id)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all duration-200 ease-out border",
                active
                  ? "bg-cyan-500 text-black border-cyan-300 shadow-lg shadow-cyan-500/50 ring-2 ring-cyan-400/50 scale-[1.02]"
                  : "bg-white/[0.05] text-white border-white/20 hover:bg-slate-700 hover:border-slate-500",
              )}
            >
              {getCityLabel(f.id, lang)}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <div className="xl:col-span-3 rounded-2xl border border-white/5 bg-[#0a1628] overflow-hidden relative" style={{ minHeight: 420 }}>
          <div className="absolute top-3 start-3 z-[1000] flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[10px] font-bold text-emerald-300">
              {t("drivers.liveGps")}
            </span>
          </div>
          <Suspense
            fallback={
              <div className="h-[420px] flex items-center justify-center text-slate-500 text-sm">
                {t("common.loadingMap")}
              </div>
            }
          >
            <LiveDriverMapInner
              drivers={onMap}
              flyTarget={flyTarget}
              selectedId={selectedId}
              onSelect={setSelectedId}
              lang={lang}
            />
          </Suspense>
        </div>

        <div className="xl:col-span-2 rounded-2xl border border-white/5 bg-white/[0.03] p-4 flex flex-col max-h-[420px]">
          <h3 className="text-sm font-bold text-white mb-3 shrink-0">
            {t("drivers.activeDrivers")}
            <span className="text-slate-500 font-normal ms-2 text-xs">({filtered.length})</span>
          </h3>
          <div className="space-y-2 overflow-y-auto flex-1 pe-1" style={{ scrollbarWidth: "thin" }}>
            {filtered.map(d => {
              const selected = selectedId === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(d.id);
                    if (d.location_approved) setCity(d.city);
                  }}
                  className={cn(
                    "w-full text-start flex items-center gap-3 p-3 rounded-xl border transition-all",
                    selected
                      ? "bg-cyan-500/10 border-cyan-500/40"
                      : "bg-white/[0.02] border-white/5 hover:border-cyan-500/20",
                  )}
                >
                  <div className="relative shrink-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white text-xs font-bold">
                      {d.name.charAt(0)}
                    </div>
                    <div
                      className={cn(
                        "absolute -bottom-0.5 -end-0.5 w-3 h-3 rounded-full border-2 border-[#0d1526]",
                        d.online ? "bg-emerald-400" : "bg-slate-600",
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{d.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {getCityLabel(d.city, lang)} · {d.vehicle}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {d.location_approved ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[9px] font-bold border border-emerald-500/20">
                        <ShieldCheck className="w-2.5 h-2.5" /> {t("drivers.gps")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 text-[9px] font-bold border border-amber-500/20">
                        <ShieldOff className="w-2.5 h-2.5" /> {t("drivers.noGpsBadge")}
                      </span>
                    )}
                    {d.online ? (
                      <span className="inline-flex items-center gap-0.5 text-[9px] text-emerald-400/80">
                        <Wifi className="w-2.5 h-2.5" /> {t("drivers.online")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-[9px] text-slate-500">
                        <WifiOff className="w-2.5 h-2.5" /> {t("drivers.offline")}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center py-10 text-slate-600 text-sm">
                {t("drivers.noDriversInCity")}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
