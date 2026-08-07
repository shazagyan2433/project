/* ─────────────────────────────────────────────────────────────────
   SKELETON LOADERS
   Tailwind animate-pulse skeletons for all dashboard widget types.
   Colors are tuned for the existing dark-glass terminal palette.
──────────────────────────────────────────────────────────────── */

/** Metric / KPI stat card skeleton */
export function MetricSkeleton() {
  return (
    <div
      className="animate-pulse rounded-2xl p-5"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.05)",
      }}
      aria-hidden="true"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-xl bg-white/[0.06]" />
        <div className="w-14 h-5 rounded-lg bg-white/[0.06]" />
      </div>
      <div className="w-20 h-2.5 rounded-full bg-white/[0.05] mb-2" />
      <div className="w-32 h-6 rounded-lg bg-white/[0.07] mb-2" />
      <div className="w-24 h-2 rounded-full bg-white/[0.04]" />
    </div>
  );
}

/** Bar / area chart placeholder */
export function ChartSkeleton({ height = 280 }: { height?: number }) {
  return (
    <div
      className="animate-pulse w-full rounded-xl overflow-hidden"
      style={{
        height,
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.05)",
      }}
      aria-hidden="true"
    >
      <div className="flex items-end h-full gap-1.5 p-4">
        {[60, 80, 50, 90, 70, 100, 65, 85, 75, 95, 55].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-md bg-white/[0.05]"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}

/** Table rows skeleton */
export function TableRowSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-2" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-3 py-3 rounded-xl"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          <div className="w-8 h-2.5 rounded-full bg-white/[0.06]" />
          <div className="flex-1 h-2.5 rounded-full bg-white/[0.05]" />
          <div className="w-16 h-2.5 rounded-full bg-white/[0.04]" />
          <div className="w-20 h-2.5 rounded-full bg-white/[0.05]" />
          <div className="w-14 h-2.5 rounded-full bg-white/[0.04]" />
        </div>
      ))}
    </div>
  );
}

/** Activity feed items skeleton */
export function ActivityItemSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-2" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-3 rounded-xl"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          <div className="w-8 h-8 rounded-lg bg-white/[0.06] shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-2.5 rounded-full bg-white/[0.06] w-3/4" />
            <div className="h-2 rounded-full bg-white/[0.04] w-1/2" />
          </div>
          <div className="w-12 h-5 rounded-md bg-white/[0.05]" />
        </div>
      ))}
    </div>
  );
}

/** Product card grid skeleton */
export function ProductCardSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 animate-pulse"
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl p-3 flex flex-col gap-2"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <div className="w-full aspect-square rounded-xl bg-white/[0.06]" />
          <div className="h-2.5 rounded-full bg-white/[0.05] w-3/4" />
          <div className="h-2 rounded-full bg-white/[0.04] w-1/2" />
          <div className="h-7 rounded-xl bg-white/[0.05] mt-1" />
        </div>
      ))}
    </div>
  );
}

/** Generic content block skeleton */
export function WidgetSkeleton({ height = 120 }: { height?: number }) {
  return (
    <div
      className="animate-pulse rounded-2xl p-5"
      style={{
        minHeight: height,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.05)",
      }}
      aria-hidden="true"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-white/[0.06]" />
        <div className="h-2.5 w-32 rounded-full bg-white/[0.05]" />
      </div>
      <div className="space-y-2">
        <div className="h-2.5 rounded-full bg-white/[0.04] w-full" />
        <div className="h-2.5 rounded-full bg-white/[0.04] w-4/5" />
        <div className="h-2.5 rounded-full bg-white/[0.04] w-2/3" />
      </div>
    </div>
  );
}
