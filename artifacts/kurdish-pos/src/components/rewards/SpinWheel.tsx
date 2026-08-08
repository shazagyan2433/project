import { motion } from "framer-motion";
import type { SpinPrizeDef } from "@/hooks/useRewards";
import { spinPrizeLabel } from "@/hooks/useRewards";

const COLORS = ["#F59E0B", "#3B82F6", "#10B981", "#EF4444", "#A855F7", "#06B6D4", "#EC4899", "#14B8A6"];

const SIZE = 200;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = SIZE / 2 - 4;

function polar(angleDeg: number, radius: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) };
}

function slicePath(index: number, sliceCount: number) {
  const start = (index * 360) / sliceCount;
  const end = ((index + 1) * 360) / sliceCount;
  const p1 = polar(start, R);
  const p2 = polar(end, R);
  const large = end - start > 180 ? 1 : 0;
  return `M ${CX} ${CY} L ${p1.x} ${p1.y} A ${R} ${R} 0 ${large} 1 ${p2.x} ${p2.y} Z`;
}

export interface SpinWheelProps {
  angle: number;
  spinning: boolean;
  prizes: SpinPrizeDef[];
  lang: string;
}

export function SpinWheel({ angle, spinning, prizes, lang }: SpinWheelProps) {
  const slices = [...prizes]
    .filter((p) => p.active !== false)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const sliceCount = Math.max(slices.length, 1);

  return (
    <div className="relative h-[200px] w-[200px]">
      <motion.div
        className="h-full w-full"
        animate={{ rotate: angle }}
        transition={{ duration: spinning ? 2.5 : 0, ease: [0.17, 0.67, 0.35, 1] }}
      >
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full drop-shadow-lg">
          {slices.map((prize, i) => {
            const mid = (i + 0.5) * (360 / sliceCount);
            const labelPos = polar(mid, R * 0.58);
            const label = spinPrizeLabel(prize, lang);
            const words = label.split(/\s+/).filter(Boolean);
            return (
              <g key={prize.id}>
                <path
                  d={slicePath(i, sliceCount)}
                  fill={COLORS[i % COLORS.length]}
                  stroke="rgba(15,23,42,0.35)"
                  strokeWidth="1.5"
                />
                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  transform={`rotate(${mid}, ${labelPos.x}, ${labelPos.y})`}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#FFFFFF"
                  fontSize={words.length > 2 ? 7 : 8.5}
                  fontWeight="700"
                  style={{ fontFamily: "Vazirmatn, system-ui, sans-serif" }}
                >
                  {words.map((word, wi, arr) => (
                    <tspan
                      key={wi}
                      x={labelPos.x}
                      dy={wi === 0 ? -((arr.length - 1) * 5) : 10}
                    >
                      {word}
                    </tspan>
                  ))}
                </text>
              </g>
            );
          })}
          <circle cx={CX} cy={CY} r={R * 0.14} fill="#0f172a" stroke="#334155" strokeWidth="2" />
          <circle cx={CX} cy={CY} r={R * 0.08} fill="#f59e0b" />
        </svg>
      </motion.div>
      <div
        className="absolute top-0 left-1/2 z-10 h-5 w-4 -translate-x-1/2 -translate-y-0.5"
        style={{ clipPath: "polygon(50% 100%, 0 0, 100% 0)" }}
        aria-hidden
      >
        <div className="h-full w-full bg-white shadow-md" />
      </div>
    </div>
  );
}

/** Degrees to rotate so `prizeIndex` slice center lands under the top pointer. */
export function spinAngleForPrize(prizeIndex: number, sliceCount: number, currentAngle: number): number {
  const count = Math.max(sliceCount, 1);
  const sliceDeg = 360 / count;
  const sliceCenter = prizeIndex * sliceDeg + sliceDeg / 2;
  const landOn = 360 - sliceCenter;
  const base = currentAngle + 1440;
  return base + ((landOn - (base % 360) + 360) % 360);
}

export const SPIN_SLICE_COUNT = 6;

export const SPIN_PRIZE_IDS = [
  "points50",
  "discount5",
  "points100",
  "points200",
  "specialGift",
  "spinAgain",
] as const;
